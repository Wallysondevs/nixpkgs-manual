# Compilação Cruzada {#chap-cross}

## Introdução {#sec-cross-intro}

"Compilação cruzada" significa compilar um programa em uma máquina para outro tipo de máquina. Um uso típico da compilação cruzada é compilar programas para dispositivos embarcados que não possuem poder computacional e memória para compilar seus próprios programas, mas é útil em muitos outros contextos: produzir artefatos de bootstrap confiáveis no Hydra para plataformas sem hardware de construção físico, usar máquinas rápidas (por exemplo, x86_64) para construir para arquiteturas mais lentas populares em roteadores e switches (por exemplo, mips/powerpc), e distinguir rigorosamente os ambientes de tempo de construção dos ambientes de tempo de execução, mesmo ao desenvolver e implantar na mesma máquina. O Nixpkgs adota a opinião de que os pacotes devem ser escritos com a compilação cruzada em mente, e o Nixpkgs deve ser avaliado de forma semelhante (minimizando casos especiais específicos de compilação cruzada), quer se esteja ou não compilando cruzadamente.

Para um tutorial prático, consulte o [guia de compilação cruzada em nix.dev](https://nix.dev/tutorials/cross-compilation).

Este capítulo será organizado em três partes. Primeiro, descreverá os fundamentos de como empacotar software de forma a suportar a compilação cruzada. Segundo, descreverá como usar o Nixpkgs ao compilar cruzadamente. Terceiro, descreverá a infraestrutura interna que suporta a compilação cruzada.

## Empacotamento de forma amigável à compilação cruzada {#sec-cross-packaging}

### Parâmetros de plataforma {#ssec-cross-platform-parameters}

O Nixpkgs segue as [convenções do GNU autoconf](https://gcc.gnu.org/onlinedocs/gccint/Configure-Terms.html). Distinguimos entre 3 tipos de plataformas ao construir uma derivation: _build_, _host_ e _target_. Em resumo, _build_ é a plataforma na qual um pacote está sendo construído, _host_ é a plataforma na qual ele será executado. O terceiro atributo, _target_, é relevante apenas para certos compiladores e ferramentas de construção específicos.

No Nixpkgs, essas três plataformas são definidas como conjuntos de atributos sob os nomes `buildPlatform`, `hostPlatform` e `targetPlatform`. Elas são sempre definidas como atributos no ambiente padrão. Isso significa que se pode acessá-las assim:

```nix
{
  stdenv,
  fooDep,
  barDep,
  ...
}:
{
  # ...stdenv.buildPlatform...
}
```

`buildPlatform`

: A "plataforma de construção" é a plataforma na qual um pacote é construído. Uma vez que alguém tem um pacote construído, ou um pacote binário pré-construído, a plataforma de construção não deve importar e pode ser ignorada.

`hostPlatform`

: A "plataforma host" é a plataforma na qual um pacote será executado. Esta é a plataforma mais simples de entender, mas também a que tem o pior nome.

`targetPlatform`

: O atributo "plataforma target" é, ao contrário dos outros dois atributos, não fundamental para o processo de construção de software. Em vez disso, é relevante apenas para compatibilidade com a construção de certos compiladores e ferramentas de construção específicos. Pode ser ignorado com segurança para todos os outros pacotes.

: O processo de construção de certos compiladores é escrito de tal forma que o compilador resultante de uma única construção pode, por si só, produzir binários apenas para uma única plataforma. A tarefa de especificar esta única "plataforma target" é, portanto, empurrada para o tempo de construção do compilador. A causa raiz disso é que o compilador (que será executado no host) e a biblioteca/runtime padrão (que será executada no target) são construídos por um único processo de construção.

: Não há necessidade fundamental de pensar em um único target com antecedência. Se a ferramenta suporta backends modulares ou plugáveis, tanto a necessidade de especificar o target no tempo de construção quanto a restrição de ter apenas um único target desaparecem. Um exemplo de tal ferramenta é o LLVM.

: Embora a existência de uma "plataforma target" seja discutivelmente um erro histórico, é um erro comum: exemplos de ferramentas que sofrem com isso são GCC, Binutils, GHC e Autoconf. O Nixpkgs tenta evitar compartilhar o erro sempre que possível. Ainda assim, como o conceito de plataforma target está tão enraizado, é melhor suportá-lo como está.

O esquema exato que esses campos seguem é um pouco mal definido devido a uma evolução longa e convoluta, mas isso está sendo lentamente limpo. Você pode ver exemplos dos usados na prática em `lib.systems.examples`; observe como eles não são muito consistentes. Por enquanto, aqui estão alguns campos que você pode contar que eles contêm:

`system`

: Este é um atalho de dois componentes para a plataforma. Exemplos seriam "x86_64-darwin" e "i686-linux"; veja `lib.systems.doubles` para mais. O primeiro componente corresponde à arquitetura da CPU da plataforma e o segundo ao sistema operacional da plataforma (`[cpu]-[os]`). Este formato tem suporte embutido no Nix, como a string impura `builtins.currentSystem`.

`config`

: Este é um atalho de 3 ou 4 componentes para a plataforma. Exemplos seriam `x86_64-unknown-linux-gnu` e `aarch64-apple-darwin14`. Este é um formato padrão chamado "LLVM target triple", pois foi pioneiro no LLVM. Na forma de 4 partes, isso corresponde a `[cpu]-[vendor]-[os]-[abi]`. Este formato é estritamente mais informativo do que o "Nix host double", como o formato anterior poderia ser analogamente denominado. Isso precisa de um nome melhor do que `config`!

`parsed`

: Esta é uma representação Nix de um LLVM target triple analisado com componentes na lista branca. Isso pode ser especificado diretamente, ou realmente analisado a partir do `config`. Veja `lib.systems.parse` para a representação exata.

`libc`

: Esta é uma string que identifica a biblioteca C padrão usada. Identificadores válidos incluem "glibc" para GNU libc, "libSystem" para Libsystem do Darwin e "uclibc" para µClibc. Provavelmente deveria ser refatorado para usar o sistema de módulos, como `parse`.

`is*`

: Esses predicados são definidos em `lib.systems.inspect` e aplicados a cada plataforma. Eles são superiores aos do `stdenv`, pois forçam o usuário a ser explícito sobre qual plataforma está inspecionando. Por favor, use-os em vez daqueles.

`platform`

: Este é, francamente, um depósito de configurações ad-hoc (é um conjunto de atributos). Veja `lib.systems.platforms` para exemplos — há, esperançosamente, um que funcionará literalmente para cada plataforma que está funcionando. Por favor, ajude-nos a triar essas flags e dar-lhes melhores lugares!

Usando esses atributos, o processo de construção de um pacote pode mudar dependendo da situação.

### Teoria da categorização de dependências {#ssec-cross-dependency-categorization}

::: {.note}
Esta é uma descrição bastante filosófica que não é muito específica do Nixpkgs. Para uma visão geral de todos os atributos relevantes dados a `mkDerivation`, consulte [](#ssec-stdenv-dependencies). Para uma descrição de como tudo é implementado, consulte [](#ssec-cross-dependency-implementation).
:::

Nesta seção, exploramos a relação entre as dependências de tempo de execução e de tempo de construção e as 3 plataformas Autoconf.

Uma dependência de tempo de execução entre dois pacotes exige que suas plataformas host correspondam. Isso é diretamente implicado pelo significado de "plataforma host" e "dependência de tempo de execução": A dependência do pacote existe enquanto ambos os pacotes estão sendo executados em uma única plataforma host.

Uma dependência de tempo de construção, no entanto, tem uma mudança nas plataformas entre o pacote dependente e o pacote dependido. "Dependência de tempo de construção" significa que, para construir o pacote dependente, precisamos ser capazes de executar o pacote dependido. A plataforma de construção do pacote dependente é, portanto, igual à plataforma host do pacote dependido.

Se tanto a dependência quanto os pacotes dependentes não forem compiladores ou outras ferramentas de produção de código de máquina, terminamos. E, de fato, `buildInputs` e `nativeBuildInputs` cobriram esses casos mais simples por muitos anos. Mas se a dependência produz código de máquina, talvez precisemos nos preocupar também com sua plataforma target. Em princípio, essa plataforma target pode ser qualquer uma das plataformas de construção, host ou target do pacote dependente, mas proibimos dependências de uma plataforma "posterior" para uma plataforma anterior para limitar a confusão, pois nunca vimos um uso legítimo para elas.

Finalmente, se o pacote dependente for um compilador ou outra ferramenta de produção de código de máquina, ele pode precisar de dependências que são executadas no "tempo de emissão". Isso é para compiladores que (lamentavelmente) insistem em ser construídos junto com as bibliotecas padrão de suas linguagens-fonte. Assumindo build != host != target, uma dependência de tempo de execução da biblioteca padrão não pode ser executada no tempo de construção ou tempo de execução do compilador, mas apenas no tempo de execução do código emitido pelo compilador.

Juntando tudo isso, significa que temos tipos de dependência da forma `X → E`, o que significa que a dependência é executada em `X` e emite código para `E`; cada um de `X` e `E` pode ser `build`, `host` ou `target`, e `E` pode ser `*` para indicar que a dependência não é um pacote tipo compilador.

Os tipos de dependência descrevem as relações que um pacote tem com cada uma de suas dependências transitivas. Você poderia pensar em anexar um ou mais tipos de dependência a cada um dos parâmetros formais no topo do arquivo `.nix` de um pacote, bem como a todos os *seus* parâmetros formais, e assim por diante. Triplas como `(foo, bar, baz)`, por outro lado, são uma propriedade de uma derivation instanciada — você anexaria uma tripla `(mips-linux, mips-linux, sparc-solaris)` a um arquivo `.drv` em `/nix/store`.

Apenas nove tipos de dependência importam na prática:

#### Tipos de dependência possíveis {#possible-dependency-types}

| Tipo de dependência   | Plataforma host da dependência | Plataforma target da dependência |
|-----------------------|--------------------------------|----------------------------------|
| `build → *`           | `build`                        | (nenhum)                         |
| `build → build`       | `build`                        | `build`                          |
| `build → host`        | `build`                        | `host`                           |
| `build → target`      | `build`                        | `target`                         |
| `host → *`            | `host`                         | (nenhum)                         |
| `host → host`         | `host`                         | `host`                           |
| `host → target`       | `host`                         | `target`                         |
| `target → *`          | `target`                       | (nenhum)                         |
| `target → target`     | `target`                       | `target`                         |

Vamos usar `g++` como exemplo para tornar esta tabela mais clara. `g++` é um compilador C++ escrito em C. Suponha que estamos construindo `g++` com uma tripla de plataforma `(build, host, target)` de `(foo, bar, baz)`. Isso significa que estamos usando uma máquina `foo` para construir uma cópia de `g++` que será executada em uma máquina `bar` e emitirá binários para a máquina `baz`.

*   `g++` se vincula à biblioteca C `glibc` da plataforma host, que é uma dependência "host→ *" com uma tripla de `(bar, bar, *)`. Como é uma biblioteca, não um compilador, não tem "target".

*   Como `g++` é escrito em C, o compilador `gcc` usado para compilá-lo é uma dependência "build→ host" de `g++` com uma tripla de `(foo, foo, bar)`. Este compilador é executado na plataforma de construção e emite código para a plataforma host.

*   `gcc` se vincula à biblioteca C `glibc` da plataforma de construção, que é uma dependência "build→ *" com uma tripla de `(foo, foo, *)`. Como é uma biblioteca, não um compilador, não tem "target".

*   Este `gcc` é ele próprio compilado por uma cópia *anterior* de `gcc`. Esta cópia anterior de `gcc` é uma dependência "build→ build" de `g++` com uma tripla de `(foo, foo, foo)`. Este "`gcc` inicial" é executado na plataforma de construção e emite código para a plataforma de construção.

*   `g++` é empacotado com `libgcc`, que inclui uma coleção de rotinas de máquina target para tratamento de exceções e emulação de ponto flutuante por software. `libgcc` seria uma dependência "target→ *" com a tripla `(foo, baz, *)`, porque consiste em código de máquina que é vinculado à saída do compilador que estamos construindo. É uma biblioteca, não um compilador, então não tem um target próprio.

*   `libgcc` é escrito em C e compilado com `gcc`. O `gcc` que o compila será uma dependência "build→ target" com a tripla `(foo, foo, baz)`. Ele é compilado *e executado* no tempo de construção de `g++` (na plataforma `foo`), mas deve emitir código para a plataforma `baz`.

*   `g++` permite código assembly inline, então depende do acesso a uma cópia do montador `gas`. Isso seria uma dependência "host→ target" com a tripla `(foo, bar, baz)`.

*   `g++` (e `gcc`) incluem uma biblioteca `libgccjit.so`, que envolve o compilador em uma biblioteca para criar um compilador just-in-time. No nixpkgs, esta biblioteca está no pacote `libgccjit`; se C++ exigisse que os programas tivessem acesso a um JIT, `g++` precisaria adicionar uma dependência "target→ target" para `libgccjit` com a tripla `(foo, baz, baz)`. Isso garantiria que o compilador seja fornecido com uma cópia de `libgccjit` que tanto executa quanto gera código para a plataforma `baz`.

*   Se o próprio `g++` se vinculasse a `libgccjit.so` (por exemplo, para permitir expressões C++ avaliadas em tempo de compilação), então o pacote `libgccjit` usado para fornecer essa funcionalidade seria uma dependência "host→ host" de `g++`: é código que é executado no `host` e emite código para execução no `host`.

### Receitas de empacotamento cruzado {#ssec-cross-cookbook}

Alguns problemas frequentemente encontrados ao empacotar para compilação cruzada devem ser respondidos aqui. Idealmente, as informações acima são exaustivas, então esta seção não pode fornecer nenhuma informação nova, mas é ridículo e cruel esperar que todos se esforcem para entender a interação de muitos recursos apenas para encontrar a mesma resposta para o mesmo problema comum. Sinta-se à vontade para adicionar a esta lista!

#### Como testar a compilação cruzada usando emulação? {#cross-qa-emulation}

Cada plataforma elaborada expõe uma função `emulator` em seu atributo `hostPlatform` que retorna o caminho para um emulador capaz de executar binários para essa plataforma. O despacho é definido em `lib/systems/default.nix` e seleciona:

- um wrapper de execução no-op, quando a plataforma de construção já pode executar os binários da plataforma host
- `wine` para targets Windows
- `qemu-user` para targets Linux estrangeiros em um builder Linux
- `wasmtime` para WASI
- `nodejs-slim` para GHCJS
- `mmix` para MMIX

`emulator` é uma função do conjunto de pacotes; `emulatorAvailable` é um predicado da mesma forma que informa se um emulador existe. Use-os a partir de uma expressão `nix` em vez de invocar `qemu` manualmente, por exemplo, dentro de uma derivation `checkPhase` ou `passthru.tests`:

```nix
stdenv.mkDerivation {
  # ...
  doCheck = stdenv.hostPlatform.emulatorAvailable buildPackages;
  checkPhase = ''
    ${stdenv.hostPlatform.emulator buildPackages} ./my-binary --self-test
  '';
}
```

Para executar um binário compilado cruzadamente fora do sandbox Nix, construa-o e invoque o emulador a partir de um shell. Esta também é uma maneira rápida de verificar a tabela de despacho acima:

```ShellSession
$ nix-build '<nixpkgs>' -A pkgsCross.aarch64-multiplatform.hello # Should be available in cache.nixos.org
```

Para obter um caminho para um emulador, dado um `crossSystem.config` (por exemplo, com `aarch64-linux`):

```ShellSession
$ nix-instantiate --eval --strict -E \
    '(import <nixpkgs> { crossSystem.config = "aarch64-unknown-linux-gnu"; }).stdenv.hostPlatform.emulator (import <nixpkgs> {})'
"/nix/store/.../bin/qemu-aarch64"
```

E especificamente para `aarch64-linux`, e muitas outras plataformas, você tem todos eles disponíveis no pacote `qemu`, o que significa que você pode simplesmente executar:

```ShellSession
$ nix-shell -p qemu --run 'qemu-aarch64 ./result/bin/hello'
Hello, world!
```

O mesmo padrão funciona para outros targets, substituindo o atributo `pkgsCross.*` e o pacote do emulador (por exemplo, `wine` para `pkgsCross.mingwW64`).

#### Meu pacote falha ao encontrar um comando binutils (`cc`/`ar`/`ld` etc.) {#cross-qa-fails-to-find-binutils}
Muitos pacotes assumem que um binutils sem prefixo (`cc`/`ar`/`ld` etc.) está disponível, mas o Nix não fornece um. Ele fornece apenas um com prefixo, assim como faz para todos os outros programas binutils. Pode ser necessário aplicar um patch no pacote para corrigir o sistema de construção para usar um prefixo. Por exemplo, em vez de `cc`, use `${stdenv.cc.targetPrefix}cc`.

```nix
{ makeFlags = [ "CC=${stdenv.cc.targetPrefix}cc" ]; }
```

#### Como evitar compilar um compilador cruzado GCC a partir do código-fonte? {#cross-qa-avoid-compiling-gcc-cross-compiler}
Em máquinas menos potentes, pode ser inconveniente compilar um pacote cruzadamente apenas para descobrir que o GCC precisa ser compilado a partir do código-fonte, o que pode levar várias horas. O Nixpkgs mantém um [jobset limitado relacionado a compilação cruzada no Hydra](https://hydra.nixos.org/jobset/nixpkgs/cross-trunk), que testa a compilação cruzada para várias plataformas a partir das plataformas de construção "x86_64-linux", "aarch64-linux" e "aarch64-darwin". Veja `pkgs/top-level/release-cross.nix` para a lista completa de plataformas target e pacotes. Por exemplo, a seguinte invocação busca o GCC pré-compilado para `armv6l-unknown-linux-gnueabihf` e constrói o GNU Hello a partir do código-fonte.

```ShellSession
$ nix-build '<nixpkgs>' -A pkgsCross.raspberryPi.hello
```

#### E se o sistema de compilação do meu pacote precisar compilar um programa C para ser executado no ambiente de compilação? {#cross-qa-build-c-program-in-build-environment}

Adicione o seguinte à sua invocação `mkDerivation`.

```nix
{ depsBuildBuild = [ buildPackages.stdenv.cc ]; }
```

#### A suíte de testes do meu pacote precisa executar código da plataforma host. {#cross-testsuite-runs-host-code}

Adicione o seguinte à sua invocação `mkDerivation`.

```nix
{ doCheck = stdenv.buildPlatform.canExecute stdenv.hostPlatform; }
```

#### Pacote usando Meson precisa executar binários para a plataforma host durante a compilação. {#cross-meson-runs-host-code}

Adicione `mesonEmulatorHook` a `nativeBuildInputs` condicionalmente, se os binários target puderem ser executados.

Ex:

```nix
{
  nativeBuildInputs = [
    meson
  ]
  ++ lib.optionals (!stdenv.buildPlatform.canExecute stdenv.hostPlatform) [ mesonEmulatorHook ];
}
```

Exemplo de um erro que isso corrige.

`[Errno 8] Exec format error: './gdk3-scan'`

#### Usando `-static` fora de uma plataforma `isStatic`. {#cross-static-on-non-static-platform}

Adicione `stdenv.cc.libc.static` (saída estática do glibc) a `buildInputs` condicionalmente, se `hostPlatform` usar `glibc`.


Ex:

```nix
{
  buildInputs = lib.optionals (stdenv.hostPlatform.libc == "glibc") [ stdenv.cc.libc.static ];
}
```

Exemplos de erros que isso corrige.

`cannot find -lm: No such file or directory`

`cannot find -lc: No such file or directory`

::: {.note}
No momento da escrita, presume-se que o problema ocorre apenas no `glibc` porque ele divide as bibliotecas estáticas em uma saída diferente.

::: {.note}
Você pode querer considerar o uso de `stdenvAdapters.makeStatic` ou `pkgsStatic` ou uma plataforma `isStatic = true`.

## Compilando pacotes cruzados {#sec-cross-usage}

O Nixpkgs pode ser instanciado apenas com `localSystem`, caso em que não há compilação cruzada e tudo é construído por e para esse sistema, ou também com `crossSystem`, caso em que os pacotes são executados neste último, mas toda a construção acontece no primeiro. Ambos os parâmetros aceitam o mesmo esquema que as 3 plataformas (build, host e target) definidas na seção anterior. Como mencionado acima, `lib.systems.examples` possui algumas plataformas que são usadas como argumentos para esses parâmetros na prática. Você pode usá-las programaticamente ou na linha de comando:

```ShellSession
$ nix-build '<nixpkgs>' --arg crossSystem '(import <nixpkgs/lib>).systems.examples.fooBarBaz' -A whatever
```

::: {.note}
Eventualmente, gostaríamos de tornar esses exemplos de plataforma uma conveniência desnecessária para que

```ShellSession
$ nix-build '<nixpkgs>' --arg crossSystem '{ config = "<arch>-<os>-<vendor>-<abi>"; }' -A whatever
```

funcione na grande maioria dos casos. O problema hoje são as dependências em outros tipos de configuração que não recebem padrões adequados. Contamos com os exemplos para definir grosseiramente esses parâmetros de configuração de alguma maneira vagamente sensata em nome dos usuários. O problema [\#34274](https://github.com/NixOS/nixpkgs/issues/34274) rastreia essa inconveniência, juntamente com sua causa raiz em opções de configuração desatualizadas.
:::

Embora se possa passar ambos os parâmetros na íntegra, há muita lógica para preencher campos ausentes. Conforme discutido na seção anterior, apenas um de `system`, `config` e `parsed` é necessário para inferir os outros dois. Além disso, `libc` será inferido de `parse`. Finalmente, `localSystem.system` também é inferido _impuramente_ com base na avaliação da plataforma. Isso significa que muitas vezes não é necessário passar `localSystem` de forma alguma, como no exemplo de linha de comando no parágrafo anterior.

::: {.note}
Muitas fontes (manual, wiki, etc.) provavelmente mencionam a passagem de `system`, `platform`, juntamente com o `crossSystem` opcional para o Nixpkgs: `import <nixpkgs> { system = ..; platform = ..; crossSystem = ..; }`. A passagem desses dois em vez de `localSystem` ainda é suportada para compatibilidade, mas é desencorajada. De fato, grande parte da inferência que fazemos para esses parâmetros é motivada tanto pela compatibilidade quanto pela conveniência.
:::

Poder-se-ia pensar que `localSystem` e `crossSystem` se sobrepõem horrivelmente com as três `*Platforms` (`buildPlatform`, `hostPlatform` e `targetPlatform`; veja `stage.nix` ou o manual). Na verdade, esses identificadores não são usados propositalmente aqui para traçar uma distinção sutil, mas importante: Embora a granularidade de ter 3 plataformas seja necessária para *construir* pacotes adequadamente, é um exagero para especificar a *intenção* do usuário ao fazer um plano de construção ou conjunto de pacotes. Uma dicotomia simples "construir vs implantar" é adequada: o princípio da janela deslizante descrito na seção anterior mostra como interpolar entre esses dois "pontos finais" para obter a tripla de 3 plataformas para cada estágio de bootstrapping. Isso significa que para qualquer pacote em um determinado conjunto de pacotes, mesmo aqueles não vinculados no nível superior, mas apenas acessíveis via dependências ou `buildPackages`, as três plataformas serão definidas como uma de `localSystem` ou `crossSystem`, com a primeira substituindo a última à medida que se percorre as dependências de tempo de construção. Uma última diferença simples é que `crossSystem` deve ser nulo quando não se deseja compilar cruzadamente, enquanto as `*Platform`s são sempre não nulas. `localSystem` é sempre não nulo.

## Infraestrutura de compilação cruzada {#sec-cross-infra}

### Implementação de dependências {#ssec-cross-dependency-implementation}

As categorias de dependências desenvolvidas em [](#ssec-cross-dependency-categorization) são especificadas como listas de derivations dadas a `mkDerivation`, conforme documentado em [](#ssec-stdenv-dependencies). Em resumo, cada lista de dependências para `host → target` é chamada `deps<theirHost><theirTarget>` (onde os valores `theirHost` e `theirTarget` são `build`, `host` ou `target`), com exceções para compatibilidade retroativa de que `depsBuildHost` é chamado `nativeBuildInputs` e `depsHostTarget` é chamado `buildInputs`. O Nixpkgs agora está estruturado de forma que cada `deps<theirHost><theirTarget>` seja automaticamente retirado de `pkgs<theirHost><theirTarget>`. (Esses `pkgs<theirHost><theirTarget>`s são bastante novos, então não há caso especial para `nativeBuildInputs` e `buildInputs`.) Por exemplo, `pkgsBuildHost.gcc` deve ser usado no tempo de construção, enquanto `pkgsHostTarget.openssl` deve ser usado no tempo de execução.

Conjuntos de pacotes adjacentes são definidos como atributos `pkgs<theirHost><theirTarget>`, onde "their" representa o novo conjunto de atributos, e "our" representa o conjunto de pacotes "atual". Abaixo está uma tabela de estágios adjacentes e seus aliases. Veja [](#variables-specifying-dependencies) para exemplos de uso.

| Conjunto de pacotes adjacentes         | Plataforma host deles | Plataforma target deles |
|----------------------------------------|-----------------------|-------------------------|
| `pkgsBuildBuild`                       | Nossa plataforma build | Nossa plataforma build  |
| `pkgsBuildHost` ou `buildPackages`     | Nossa plataforma build | Nossa plataforma host   |
| `pkgsBuildTarget`                      | Nossa plataforma build | Nossa plataforma target |
| `pkgsHostHost`                         | Nossa plataforma host | Nossa plataforma host   |
| `pkgsHostTarget` ou `pkgs`             | Nossa plataforma host | Nossa plataforma target |
| `pkgsTargetTarget` ou `targetPackages` | Nossa plataforma target | Nossa plataforma target |

Agora, durante a maior parte da história do Nixpkgs, não havia atributos `pkgs<theirHost><theirTarget>`, e a maioria dos pacotes não foi refatorada para usá-los explicitamente. Antes disso, havia apenas `buildPackages`, `pkgs` e `targetPackages`. Estes são agora redefinidos como aliases para `pkgsBuildHost`, `pkgsHostTarget` e `pkgsTargetTarget`. É aceitável, até recomendado, usá-los para mostrar que apenas sua plataforma host importa. Ou seja, use `buildPackages` onde qualquer um de `pkgsBuild*` serviria, e `targetPackages` quando qualquer um de `pkgsTarget*` serviria (se tivéssemos mais do que apenas `pkgsTargetTarget`).

Mas antes disso, havia apenas `pkgs`, embora `buildInputs` e `nativeBuildInputs` existissem. (A compilação cruzada mal funcionava, e eles foram implementados com alguns hacks em `mkDerivation` para sobrescrever dependências.) O que isso significa é que a vasta maioria dos pacotes não usa nenhum conjunto de pacotes explícito para preencher suas dependências, apenas usando o que `callPackage` lhes dá, mesmo que eles classifiquem corretamente suas dependências nas múltiplas listas descritas acima. E, de fato, pedir que os usuários classifiquem suas dependências _e_ as retirem do conjunto de atributos correto é muito oneroso e redundante, então a abordagem recomendada (por enquanto) é continuar apenas categorizando por lista e não usando um conjunto de pacotes explícito.

Para que isso funcione, "emendamos" os seis conjuntos de pacotes `pkgs<theirHost><theirTarget>` e fazemos com que `callPackage` realmente pegue seus argumentos a partir disso. Isso é atualmente implementado em `pkgs/top-level/splice.nix`. `mkDerivation` então, para cada atributo de dependência, extrai a derivation correta da emenda. Essa emenda pode ser ignorada quando não se está compilando cruzadamente, pois os conjuntos de pacotes são os mesmos, mas ainda é um pouco lento para compilação cruzada. Gostaríamos de fazer algo melhor, mas ainda não encontramos nada.

### Bootstrapping {#ssec-bootstrapping}

Cada um dos conjuntos de pacotes descritos acima vem de um único estágio de bootstrapping. Enquanto `pkgs/top-level/default.nix` coordena a composição dos estágios em um nível alto, `pkgs/top-level/stage.nix` "amarra o nó" (cria o ponto fixo) de cada estágio. Os conjuntos de pacotes são definidos por estágio, no entanto, então eles podem ser pensados como arestas entre estágios (os nós) em um grafo. Composições como `pkgsBuildTarget.targetPackages` podem ser pensadas como caminhos para este grafo.

Embora existam muitos conjuntos de pacotes, e, portanto, muitas arestas, os estágios também podem ser organizados em uma cadeia linear. Em outras palavras, muitas das arestas são redundantes no que diz respeito à conectividade. Isso depende do tipo de bootstrapping que fazemos. Atualmente, para compilação cruzada, é:

1.  `(native, native, native)`

2.  `(native, native, foreign)`

3.  `(native, foreign, foreign)`

Em cada estágio, `pkgsBuildHost` refere-se ao estágio anterior, `pkgsBuildBuild` refere-se ao estágio anterior a esse, e `pkgsHostTarget` refere-se ao estágio atual, e `pkgsTargetTarget` refere-se ao próximo estágio. Quando não há estágio anterior ou próximo, eles se referem ao estágio atual. Observe como todas as invariantes em relação ao mapeamento entre as plataformas build host e target das dependências e dos pacotes dependentes são preservadas. `pkgsBuildTarget` e `pkgsHostHost` são mais complexos, pois o estágio que atende aos requisitos nem sempre é uma cadeia fixa de "anteriores" e "próximos" (módulo as auto-referências "saturantes" nas extremidades). Nós apenas tratamos cada um de forma especial. Todas as arestas primárias são implementadas em `pkgs/stdenv/booter.nix`, e os aliases secundários em `pkgs/top-level/stage.nix`.

::: {.note}
Os estágios nativos são inicializados de maneiras legadas que antecedem a implementação cruzada atual. É por isso que os estágios de inicialização que levam aos estágios finais são ignorados no parágrafo anterior.
:::

Se olharmos para as 3 triplas de plataforma, podemos ver que elas se sobrepõem de tal forma que poderíamos juntá-las em uma cadeia como:
```
(native, native, native, foreign, foreign)
```

Se imaginarmos as auto-referências saturantes no final sendo substituídas por estágios infinitos, e então sobrepusermos essas triplas de plataforma, chegamos à tupla infinita:
```
(native..., native, native, native, foreign, foreign, foreign...)
```
Pode-se então imaginar qualquer sequência de plataformas de tal forma que existam estágios de bootstrap com suas 3 plataformas determinadas por "deslizar uma janela" que é a tupla de 3 através da sequência. Este foi o modelo original para bootstrapping. Sem uma plataforma target (assumindo um mundo melhor onde todos os compiladores são multi-target e todas as bibliotecas padrão são construídas em sua própria derivation), isso é suficiente. Por outro lado, se alguém deseja compilar cruzadamente "mais rápido", com um estágio de bootstrapping "Canadian Cross" onde `build != host != target`, mais estágios de bootstrapping são necessários, pois nenhuma janela deslizante fornece o conjunto de pacotes `pkgsBuildTarget` irritante, já que ele pula o "host" do estágio Canadian Cross.


::: {.note}
É muito melhor referir-se a `buildPackages` do que a `targetPackages`, ou, de forma mais ampla, a conjuntos de pacotes que não mencionam "target". Há três razões para isso.

Primeiro, é porque os estágios de bootstrapping não têm um `targetPackages` único. Por exemplo, um conjunto de pacotes `(x86-linux, x86-linux, arm-linux)` e `(x86-linux, x86-linux, x86-windows)` ambos têm um conjunto de pacotes `(x86-linux, x86-linux, x86-linux)`. Como não há um `targetPackages` canônico para tal conjunto de pacotes nativo (`build == host == target`), definimos seus `targetPackages`.

Segundo, é porque esta é uma fonte frequente de "recursões infinitas" / ciclos difíceis de seguir. Quando apenas conjuntos de pacotes que não mencionam target são usados, o conjunto de pacotes forma um grafo acíclico direcionado. Isso significa que todos os ciclos existentes estão confinados a um estágio. Isso significa que eles são muito menores e mais fáceis de seguir no código ou em um rastreamento de pilha. Também significa que eles estão presentes em construções nativas e cruzadas, e, portanto, mais propensos a serem detectados por CI e outros usuários.

Terceiro, é porque tudo o que menciona target existe apenas para acomodar compiladores com sistemas de construção ruins que insistem que o próprio compilador e a biblioteca padrão sejam construídos juntos. Claro que isso é ruim porque derivations maiores significam reconstruções mais longas. Também é problemático porque tende a tornar as bibliotecas padrão menos parecidas com outras bibliotecas do que poderiam ser, complicando o código e os sistemas de construção. Por causa dos outros problemas, e por causa dessas desvantagens inatas, os compiladores deveriam ser empacotados de outra forma, sempre que possível.
:::

::: {.note}
Se alguém explorar o Nixpkgs, verá derivations com nomes como `gccCross`. Tais derivations `*Cross` são um resquício de antes de distinguirmos adequadamente entre as plataformas host e target — a derivation com "Cross" no nome cobria o caso `build = host != target`, enquanto a outra cobria `host = target`, com a plataforma de construção sendo a mesma ou não, dependendo se estava usando seu `.__spliced.buildHost` ou `.__spliced.hostTarget`.
:::