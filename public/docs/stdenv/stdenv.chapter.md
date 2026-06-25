# O Ambiente Padrão {#chap-stdenv}

O ambiente de construção padrão na coleção de pacotes Nix fornece um ambiente para construir pacotes Unix que realiza muitas tarefas de construção comuns automaticamente. Na verdade, para pacotes Unix que usam a interface de construção padrão `./configure; make; make install`, você não precisa escrever um script de construção; o ambiente padrão faz tudo automaticamente. Se o `stdenv` não fizer o que você precisa automaticamente, você pode facilmente personalizar ou sobrescrever as várias fases de construção.

## Usando `stdenv` {#sec-using-stdenv}

Para construir um pacote com o ambiente padrão, você usa a função `stdenv.mkDerivation`, em vez da função primitiva embutida `derivation`, por exemplo.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  src = fetchurl {
    url = "http://example.org/libfoo-1.2.3.tar.bz2";
    hash = "sha256-tWxU/LANbQE32my+9AXyt3nCT7NBVfJ45CX757EMT3Q=";
  };
}
```

(`stdenv` precisa estar no escopo, então se você escrever isso em uma expressão Nix separada de `pkgs/all-packages.nix`, você precisa passá-lo como um argumento de função.) Especificar um `name` e um `src` é o mínimo absoluto que o Nix exige. Para conveniência, você também pode usar os atributos `pname` e `version` e `mkDerivation` definirá automaticamente `name` como `"${pname}-${version}"` por padrão.
**Desde [RFC 0035](https://github.com/NixOS/rfcs/pull/35), isso é preferível para pacotes no Nixpkgs**, pois nos permite reutilizar a versão facilmente:

```nix
stdenv.mkDerivation (finalAttrs: {
  pname = "libfoo";
  version = "1.2.3";
  src = fetchurl {
    url = "http://example.org/libfoo-source-${finalAttrs.version}.tar.bz2";
    hash = "sha256-tWxU/LANbQE32my+9AXyt3nCT7NBVfJ45CX757EMT3Q=";
  };
})
```

Muitos pacotes têm dependências que não são fornecidas no ambiente padrão. Geralmente é suficiente especificar essas dependências no atributo `buildInputs`:

```nix
stdenv.mkDerivation {
  pname = "libfoo";
  version = "1.2.3";
  # ...
  buildInputs = [
    libbar
    perl
    ncurses
  ];
}
```

Este atributo garante que os subdiretórios `bin` desses pacotes apareçam na variável de ambiente `PATH` durante a construção, que seus subdiretórios `include` sejam pesquisados pelo compilador C, e assim por diante. (Veja [](#ssec-setup-hooks) para detalhes.)

Frequentemente é necessário sobrescrever ou modificar algum aspecto da construção. Para facilitar isso, o ambiente padrão divide a construção do pacote em várias *fases*, todas as quais podem ser sobrescritas ou modificadas individualmente: descompactar as fontes, aplicar patches, configurar, construir e instalar. (Existem outras; veja [](#sec-stdenv-phases).) Por exemplo, um pacote que não fornece um makefile, mas que precisa ser compilado "manualmente", poderia ser tratado assim:

```nix
stdenv.mkDerivation {
  pname = "fnord";
  version = "4.5";

  # ...

  buildPhase = ''
    runHook preBuild

    gcc foo.c -o foo

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    cp foo $out/bin

    runHook postInstall
  '';
}
```

(Observe o uso de literais de string no estilo `''`, que são muito convenientes para grandes fragmentos de script de várias linhas porque não precisam de escape de `"` e `\`, e porque a indentação é removida de forma inteligente.)

Existem muitos outros atributos para personalizar a construção. Estes estão listados em [](#ssec-stdenv-attributes).

Embora o ambiente padrão forneça um construtor genérico, você ainda pode fornecer seu próprio script de construção:

```nix
stdenv.mkDerivation {
  pname = "libfoo";
  version = "1.2.3";
  # ...
  builder = ./builder.sh;
}
```

onde `stdenv` configura o ambiente automaticamente (por exemplo, redefinindo `PATH` e preenchendo-o a partir das entradas de construção). Se desejar, você pode usar o construtor genérico do `stdenv`:

```bash
buildPhase() {
  echo "... this is my custom build phase ..."
  gcc foo.c -o foo
}

installPhase() {
  mkdir -p $out/bin
  cp foo $out/bin
}

genericBuild
```

### Construindo um pacote `stdenv` em `nix-shell` {#sec-building-stdenv-package-in-nix-shell}

Para construir um pacote `stdenv` em um [`nix-shell`](https://nixos.org/manual/nix/unstable/command-ref/nix-shell.html), entre em um shell, encontre as [fases](#sec-stdenv-phases) que deseja construir e, em seguida, invoque `genericBuild` manualmente:

Vá para um diretório vazio, invoque `nix-shell` com o pacote desejado e, de dentro do shell, defina as variáveis de saída para um diretório gravável:

```bash
cd "$(mktemp -d)"
nix-shell '<nixpkgs>' -A some_package
export out=$(pwd)/out
```

Em seguida, invoque as partes desejadas da construção.
Primeiro, execute as fases que geram uma cópia funcional das fontes, o que mudará o diretório para as fontes para você:

```bash
phases="${prePhases[*]:-} unpackPhase patchPhase" genericBuild
```

Então, execute mais fases até que a falha seja atingida.
Se a falha estiver na fase de construção ou verificação, as seguintes fases seriam necessárias:

```bash
phases="${preConfigurePhases[*]:-} configurePhase ${preBuildPhases[*]:-} buildPhase checkPhase" genericBuild
```

Use este comando para executar todas as fases de instalação:
```bash
phases="${preInstallPhases[*]:-} installPhase ${preFixupPhases[*]:-} fixupPhase installCheckPhase" genericBuild
```

Uma única fase pode ser executada novamente quantas vezes forem necessárias para examinar a falha, assim:

```bash
phases="buildPhase" genericBuild
```

Para modificar uma [fase](#sec-stdenv-phases), primeiro imprima-a com

```bash
echo "$buildPhase"
```

Ou, se estiver vazio, por exemplo, se estiver usando uma função:

```bash
type buildPhase
```

então altere-o em um editor de texto e cole-o de volta no terminal.

::: {.note}
Este método pode apresentar algumas inconsistências em variáveis de ambiente e comportamento em comparação com uma construção normal dentro do [sandbox de construção do Nix](https://nixos.org/manual/nix/unstable/language/derivations#builder-execution).
A seguir, uma lista não exaustiva de tais diferenças:

- `TMP`, `TMPDIR` e variáveis semelhantes provavelmente apontam para diretórios não vazios com os quais a construção pode entrar em conflito.
- Os caminhos de armazenamento de saída não são graváveis, então as variáveis para as saídas precisam ser sobrescritas para caminhos graváveis.
- Outras variáveis de ambiente podem ser inconsistentes com um `nix-build` devido ao script de inicialização do `nix-shell` ou devido ao uso do `nix-shell` sem a opção `--pure`.

Se a construção falhar de forma diferente dentro do shell do que no sandbox, considere usar [`breakpointHook`](#breakpointhook) e invocar `nix-build` em vez disso.
A opção [`--keep-failed`](https://nixos.org/manual/nix/unstable/command-ref/conf-file#conf-keep-failed) para `nix-build` também pode ser útil para examinar o diretório de construção de uma construção falha.
:::

## Ferramentas fornecidas por `stdenv` {#sec-tools-of-stdenv}

O ambiente padrão fornece os seguintes pacotes:

- O Compilador C GNU, configurado com suporte a C e C++.
- GNU coreutils (contém algumas dezenas de comandos Unix padrão).
- GNU findutils (contém `find`).
- GNU diffutils (contém `diff`, `cmp`).
- GNU `sed`.
- GNU `grep`.
- GNU `awk`.
- GNU `tar`.
- `gzip`, `bzip2` e `xz`.
- GNU Make.
- Bash. Este é o shell usado para todos os construtores na coleção de pacotes Nix. Não usar `/bin/sh` remove uma grande fonte de problemas de portabilidade.
- O comando `patch`.

No Linux, o `stdenv` também inclui o utilitário `patchelf`.

## Especificando dependências {#ssec-stdenv-dependencies}

Sistemas de construção frequentemente exigem mais dependências do que apenas o que o `stdenv` fornece. Esta seção descreve os atributos aceitos por `stdenv.mkDerivation` que podem ser usados para tornar essas dependências disponíveis para o sistema de construção.

### Visão Geral {#ssec-stdenv-dependencies-overview}

Uma referência completa dos diferentes tipos de dependências é fornecida em [](#ssec-stdenv-dependencies-reference), mas aqui está uma visão geral das mais comuns.
Ela deve cobrir a maioria dos casos de uso.

Adicione dependências a `nativeBuildInputs` se elas forem executadas durante a construção:
- aquelas que são necessárias no `$PATH` durante a construção, por exemplo `cmake` e `pkg-config`
- [setup hooks](#ssec-setup-hooks), por exemplo [`makeWrapper`](#fun-makeWrapper)
- interpretadores necessários por [`patchShebangs`](#patch-shebangs.sh) para scripts de construção (com a flag `--build`), o que pode ser o caso para, por exemplo, `perl`

Adicione dependências a `buildInputs` se elas forem copiadas ou linkadas para a saída final ou usadas em tempo de execução:
- bibliotecas usadas por compiladores, por exemplo `zlib`,
- interpretadores necessários por [`patchShebangs`](#patch-shebangs.sh) para scripts que são instalados, o que pode ser o caso para, por exemplo, `perl`

::: {.note}
Esses critérios são independentes.

Por exemplo, software que usa Wayland geralmente precisa da biblioteca `wayland` em tempo de execução, então `wayland` deve ser adicionado a `buildInputs`.
Mas também executa o programa `wayland-scanner` como parte da construção para gerar código, então `wayland` também deve ser adicionado a `nativeBuildInputs`.
:::

As dependências necessárias apenas para executar testes são classificadas de forma semelhante entre nativas (executadas durante a construção) e não nativas (executadas em tempo de execução):
- `nativeCheckInputs` para ferramentas de teste necessárias no `$PATH` (como `ctest`) e [setup hooks](#ssec-setup-hooks) (por exemplo [`pytestCheckHook`](#python))
- `checkInputs` para bibliotecas linkadas em executáveis de teste (por exemplo, o pacote OCaml `qcheck`)

Essas dependências são injetadas apenas quando [`doCheck`](#var-stdenv-doCheck) é definido como `true`.

#### Exemplo {#ssec-stdenv-dependencies-overview-example}

Considere, por exemplo, esta derivação simplificada para `solo5`, uma ferramenta de sandboxing:
```nix
stdenv.mkDerivation (finalAttrs: {
  pname = "solo5";
  version = "0.7.5";

  src = fetchurl {
    url = "https://github.com/Solo5/solo5/releases/download/v${finalAttrs.version}/solo5-v${finalAttrs.version}.tar.gz";
    hash = "sha256-viwrS9lnaU8sTGuzK/+L/PlMM/xRRtgVuK5pixVeDEw=";
  };

  nativeBuildInputs = [
    makeWrapper
    pkg-config
  ];

  buildInputs = [ libseccomp ];

  postInstall = ''
    substituteInPlace $out/bin/solo5-virtio-mkimage \
      --replace-fail "/usr/lib/syslinux" "${syslinux}/share/syslinux" \
      --replace-fail "/usr/share/syslinux" "${syslinux}/share/syslinux" \
      --replace-fail "cp " "cp --no-preserve=mode "

    wrapProgram $out/bin/solo5-virtio-mkimage \
      --prefix PATH : ${
        lib.makeBinPath [
          dosfstools
          mtools
          parted
          syslinux
        ]
      }
  '';

  doCheck = true;
  nativeCheckInputs = [
    util-linux
    qemu
  ];
  # `checkPhase` elided
})
```

- `makeWrapper` é um setup hook, ou seja, um script shell carregado pelo construtor genérico do `stdenv`.
  Ele é, portanto, executado durante a construção e deve ser adicionado a `nativeBuildInputs`.
- `pkg-config` é uma ferramenta de construção que o script de configuração do `solo5` espera estar no `$PATH` durante a construção:
  portanto, deve ser adicionado a `nativeBuildInputs`.
- `libseccomp` é uma biblioteca linkada em `$out/bin/solo5-elftool`.
  Como é usada em tempo de execução, deve ser adicionada a `buildInputs`.
- Os testes precisam de `qemu` e `getopt` (do `util-linux`) no `$PATH`, estes devem ser adicionados a `nativeCheckInputs`.
- Algumas dependências são injetadas diretamente no código shell das fases: `syslinux`, `dosfstools`, `mtools` e `parted`.
Neste caso específico, elas acabarão na saída da derivação (`$out` aqui).
Como o Nix marca as dependências cujo caminho absoluto está presente na saída como dependências de tempo de execução, adicioná-las a `buildInputs` não é necessário.

Para casos mais complexos, como bibliotecas linkadas em um executável que é então executado como parte do sistema de construção, veja [](#ssec-stdenv-dependencies-reference).

### Referência {#ssec-stdenv-dependencies-reference}

Conforme descrito no manual do Nix, quase qualquer caminho de armazenamento `*.drv` em um conjunto de atributos de uma derivação induzirá uma dependência nessa derivação. `mkDerivation`, no entanto, aceita alguns atributos destinados a incluir todas as dependências de um pacote. Isso é feito tanto para estrutura e consistência, quanto para que outras configurações possam ocorrer. Por exemplo, certas dependências precisam que seus diretórios `bin` sejam adicionados ao `PATH`. Isso é embutido, mas outras configurações são feitas através de um mecanismo plugável que funciona em conjunto com esses atributos de dependência. Veja [](#ssec-setup-hooks) para detalhes.

As dependências podem ser divididas ao longo desses eixos: suas plataformas de host e destino em relação às da nova derivação. As distinções de plataforma são motivadas pela compilação cruzada; veja [](#chap-cross) para saber exatamente o que cada plataforma significa. [^footnote-stdenv-ignored-build-platform] Mas mesmo que não se esteja fazendo compilação cruzada, as plataformas implicam se uma dependência é necessária em tempo de execução ou em tempo de construção.

A extensão do `PATH` com dependências, aludida acima, prossegue de acordo apenas com as plataformas relativas. O processo é realizado apenas para dependências cuja plataforma de host corresponde à plataforma de construção da nova derivação, ou seja, dependências que são executadas na plataforma onde a nova derivação será construída. [^footnote-stdenv-native-dependencies-in-path] Para cada dependência \<dep\> dessas dependências, `dep/bin`, se presente, é adicionado à variável de ambiente `PATH`.

### Propagação de dependências {#ssec-stdenv-dependencies-propagated}

Dependências propagadas são disponibilizadas para todas as dependências a jusante.
Isso é particularmente útil para linguagens interpretadas, onde todas as dependências transitivas precisam estar presentes no mesmo ambiente.
Portanto, é usado para a infraestrutura Python no Nixpkgs.

:::{.note}
Dependências propagadas devem ser usadas com cautela, pois obscurecem as entradas de construção reais das derivações dependentes e causam efeitos colaterais através de setup hooks.
Isso pode levar a dependências conflitantes que não podem ser facilmente resolvidas.
:::

:::{.example}
# Uma dependência propagada

```nix
with import <nixpkgs> { };
let
  bar = stdenv.mkDerivation {
    name = "bar";
    dontUnpack = true;
    # `hello` é também disponibilizado para dependentes, como `foo`
    propagatedBuildInputs = [ hello ];
    postInstall = "mkdir $out";
  };
  foo = stdenv.mkDerivation {
    name = "foo";
    dontUnpack = true;
    # `bar` é uma dependência direta, que implicitamente inclui o `hello` propagado
    buildInputs = [ bar ];
    # O binário `hello` está disponível!
    postInstall = "hello > $out";
  };
in
foo
```
:::

A propagação de dependências leva em consideração a compilação cruzada, o que significa que as dependências que cruzam os limites da plataforma são ajustadas corretamente.

Para determinar as regras exatas para a propagação de dependências, começamos atribuindo a cada dependência um par de números ternários (`-1` para `build`, `0` para `host` e `1` para `target`) representando seu [tipo de dependência](#possible-dependency-types), que captura como suas plataformas de host e destino são cada uma "deslocadas" das plataformas de host e destino da derivação dependente. A tabela a seguir resume as diferentes combinações que podem ser obtidas:

| Tipo de dependência | nome do atributo      | deslocamento | propósito típico                               |
| ----------------- | ------------------- | -------- | --------------------------------------------- |
| `build → build`   | `depsBuildBuild`    | `-1, -1` | compiladores para auxiliares de construção    |
| `build → host`    | `nativeBuildInputs` | `-1, 0`  | ferramentas de construção, compiladores, setup hooks |
| `build → target`  | `depsBuildTarget`   | `-1, 1`  | compiladores para construir stdlibs para rodar no destino |
| `host → host`     | `depsHostHost`      | `0, 0`   | compiladores para construir código C em tempo de execução (raro) |
| `host → target`   | `buildInputs`       | `0, 1`   | bibliotecas                                   |
| `target → target` | `depsTargetTarget`  | `1, 1`   | stdlibs para rodar no destino                 |

Algoritmicamente, percorremos as entradas propagadas, acumulando as dependências propagadas de cada dependência propagada e ajustando-as para levar em conta a "mudança de perspectiva" descrita pelos deslocamentos de plataforma da dependência atual. Isso resulta em uma espécie de fecho transitivo da relação de dependência, com os deslocamentos sendo aproximadamente somados quando dois links de dependência são combinados. Também removemos dependências transitivas cujos deslocamentos combinados excedem os limites, o que pode ser visto como um filtro sobre esse fecho transitivo, removendo dependências que são flagrantemente absurdas.

Podemos definir o processo precisamente com [Dedução Natural](https://en.wikipedia.org/wiki/Natural_deduction) usando as regras de inferência abaixo. Isso provavelmente parece um pouco obtuso, mas o código bash que realmente o implementa também é! [^footnote-stdenv-find-inputs-location] Eles são confusos de maneiras muito diferentes, então... esperamos que, se algo não fizer sentido em uma apresentação, faça na outra!

**Definições:**

`dep(h_offset, t_offset, X, Y)`
:    O pacote X tem uma dependência direta em Y em uma posição com deslocamento de host `h_offset` e deslocamento de destino `t_offset`.

     Por exemplo, `nativeBuildInputs = [ Y ]` significa `dep(-1, 0, X, Y)`.

`propagated-dep(h_offset, t_offset, X, Y)`
:    O pacote X tem uma dependência propagada em Y em uma posição com deslocamento de host `h_offset` e deslocamento de destino `t_offset`.

     Por exemplo, `depsBuildTargetPropagated = [ Y ]` significa `propagated-dep(-1, 1, X, Y)`.

`mapOffset(h, t, i) = offs`
:    Em um pacote X com uma dependência em Y em uma posição com deslocamento de host `h` e deslocamento de destino `t`, a dependência transitiva Z de Y em uma posição com deslocamento `i` é mapeada para o deslocamento `offs` em X.


::: {.example}
# Tabela verdade de `mapOffset(h, t, i)`

`x` significa que a dependência foi descartada porque `h + i ∉ {-1, 0, 1}`.

<!-- This is written as an ascii art table because the CSS was introducing so much space it was unreadable and doesn't support double lines -->

```
  h |   t  || i=-1 |  i=0 |  i=1
----|------||------|------|-----
 -1 |  -1  ||   x  |  -1  |  -1
 -1 |   0  ||   x  |  -1  |   0
 -1 |   1  ||   x  |  -1  |   1
  0 |   0  ||  -1  |   0  |   0
  0 |   1  ||  -1  |   0  |   1
  1 |   1  ||   0  |   1  |   x
```

:::

```
let mapOffset(h, t, i) = i + (if i <= 0 then h else t - 1)

propagated-dep(h0, t0, A, B)
propagated-dep(h1, t1, B, C)
h0 + h1 in {-1, 0, 1}
h0 + t1 in {-1, 0, 1}
-------------------------------------- Transitive property
propagated-dep(mapOffset(h0, t0, h1),
               mapOffset(h0, t0, t1),
               A, C)
```

```
let mapOffset(h, t, i) = i + (if i <= 0 then h else t - 1)

dep(h0, t0, A, B)
propagated-dep(h1, t1, B, C)
h0 + h1 in {-1, 0, 1}
h0 + t1 in {-1, 0, 1}
----------------------------- Take immediate dependencies' propagated dependencies
propagated-dep(mapOffset(h0, t0, h1),
               mapOffset(h0, t0, t1),
               A, C)
```

```
propagated-dep(h, t, A, B)
----------------------------- Propagated dependencies count as dependencies
dep(h, t, A, B)
```

Alguma explicação desta monstruosidade é necessária. No caso comum de `nativeBuildInputs` ou `buildInputs`, o deslocamento de destino de uma dependência é um maior que o deslocamento de host: `t = h + 1`. Isso significa que:

```
let f(h, t, i) = i + (if i <= 0 then h else t - 1)
let f(h, h + 1, i) = i + (if i <= 0 then h else (h + 1) - 1)
let f(h, h + 1, i) = i + (if i <= 0 then h else h)
let f(h, h + 1, i) = i + h
```

É aqui que entra o "semelhante a uma soma" de cima: podemos simplesmente somar todos os deslocamentos de host para obter o deslocamento de host da dependência transitiva. O deslocamento de destino da dependência transitiva é o deslocamento de host + 1, assim como era com as dependências compostas para formar esta transitiva; ele pode ser ignorado, pois não adiciona nenhuma nova informação.

Devido às verificações de limites, os casos incomuns são `h = t` (`depsBuildBuild`, etc) e `h + 2 = t` (`depsBuildTarget`).

No primeiro caso, a motivação para `mapOffset` é que, como suas plataformas de host e destino são as mesmas, nenhuma dependência transitiva dela deve ser capaz de "descobrir" um deslocamento maior do que seus deslocamentos de destino reduzidos. `mapOffset` efetivamente "achata" todos os deslocamentos de suas dependências transitivas para que nenhum seja maior do que o deslocamento de destino do pacote `h = t` original.

No outro caso, `h + 1` (0) é ignorado entre os deslocamentos de host (-1) e destino (1). Em vez de achatar os deslocamentos, precisamos "separá-los" para que nenhum deslocamento de dependência transitiva seja 0.

No geral, o tema unificador aqui é que a propagação não deve introduzir dependências transitivas envolvendo plataformas das quais o pacote dependente não tem conhecimento. \[Pode-se imaginar o pacote dependente solicitando dependências com as plataformas que ele conhece; outras plataformas ele não sabe como solicitar. A descrição da plataforma nesse cenário é um tipo de capacidade inforjável.\] A verificação de limites de deslocamento e a definição de `mapOffset` juntas garantem que este seja o caso. Descobrir um novo deslocamento é descobrir uma nova plataforma, e como essas plataformas não estavam na "especificação" da derivação do pacote que precisa, elas não podem ser relevantes. De uma perspectiva de capacidade, podemos imaginar que as plataformas de host e destino de um pacote são as capacidades que um pacote requer, e o pacote dependente deve fornecer a capacidade à dependência.

#### Variáveis que especificam dependências {#variables-specifying-dependencies}

##### `depsBuildBuild` {#var-stdenv-depsBuildBuild}

Uma lista de dependências cujas plataformas de host e destino são a plataforma de construção da nova derivação. São programas e bibliotecas usados em tempo de construção que produzem programas e bibliotecas também usados em tempo de construção. Se a dependência não se importa com a plataforma de destino (ou seja, não é um compilador ou ferramenta similar), coloque-a em `nativeBuildInputs` em vez disso. O uso mais comum disso é `buildPackages.stdenv.cc` (o compilador para `buildPackages`, o que significa que ele vem do conjunto de pacotes `buildPackages.buildPackages = pkgsBuildBuild`), o compilador C padrão para esta função. Esse exemplo aparece mais do que se poderia pensar em bibliotecas C antigas e comumente usadas.

Como esses pacotes podem ser executados em tempo de construção, eles são sempre adicionados ao `PATH`, conforme descrito acima. Mas como esses pacotes só têm garantia de serem executados nesse momento, eles não devem persistir como dependências de tempo de execução. Isso não é atualmente imposto, mas poderia ser no futuro.

##### `nativeBuildInputs` {#var-stdenv-nativeBuildInputs}

Uma lista de dependências cuja plataforma de host é a plataforma de construção da nova derivação, e a plataforma de destino é a plataforma de host da nova derivação. São programas e bibliotecas usados em tempo de construção que, se forem um compilador ou ferramenta similar, produzem código para ser executado em tempo de execução — ou seja, ferramentas usadas para construir a nova derivação. Se a dependência não se importa com a plataforma de destino (ou seja, não é um compilador ou ferramenta similar), coloque-a aqui, em vez de em `depsBuildBuild` ou `depsBuildTarget`. Isso poderia ser chamado de `depsBuildHost`, mas `nativeBuildInputs` é usado por continuidade histórica.

Como esses pacotes podem ser executados em tempo de construção, eles são adicionados ao `PATH`, conforme descrito acima. Mas como esses pacotes só têm garantia de serem executados nesse momento, eles não devem persistir como dependências de tempo de execução. Isso não é atualmente imposto, mas poderia ser no futuro.

##### `depsBuildTarget` {#var-stdenv-depsBuildTarget}

Uma lista de dependências cuja plataforma de host é a plataforma de construção da nova derivação, e a plataforma de destino é a plataforma de destino da nova derivação. São programas usados em tempo de construção que produzem código para ser executado com o código produzido pelo pacote dependente. Mais comumente, são ferramentas usadas para construir o tempo de execução ou a biblioteca padrão que o compilador atualmente em construção injetará em qualquer código que ele compile. Em muitos casos, o compilador atualmente em construção é ele próprio empregado para essa tarefa, mas quando esse compilador não será executado (ou seja, suas plataformas de construção e host diferem), isso não é possível. Outras vezes, o compilador depende de alguma outra ferramenta, como binutils, que é sempre construída separadamente para que a dependência seja incondicional.

Este é um conceito um tanto confuso de se entender, e por uma boa razão. Como o único tipo de dependência onde os deslocamentos de plataforma, `-1` e `1`, não são inteiros adjacentes, requer pensar em um estágio de bootstrapping *dois* afastado do atual. Ele e seu caso de uso andam de mãos dadas e ambos são considerados má prática: tente não precisar desse tipo de dependência e tente evitar construir bibliotecas padrão e tempos de execução na mesma derivação em que o compilador produz código usando-os. Em vez disso, esforce-se para construí-los como uma biblioteca normal, usando o compilador recém-construído assim como uma biblioteca normal faria. Em suma, não use este atributo a menos que você esteja empacotando um compilador e tenha certeza de que ele é necessário.

Como esses pacotes podem ser executados em tempo de construção, eles são adicionados ao `PATH`, conforme descrito acima. Mas como esses pacotes só têm garantia de serem executados nesse momento, eles não devem persistir como dependências de tempo de execução. Isso não é atualmente imposto, mas poderia ser no futuro.

##### `depsHostHost` {#var-stdenv-depsHostHost}

Uma lista de dependências cujas plataformas de host e destino correspondem à plataforma de host da nova derivação. Na prática, isso geralmente seriam ferramentas usadas por compiladores para macros ou um sistema de metaprogramação, ou bibliotecas usadas pelas próprias macros ou código de metaprogramação. É sempre preferível usar uma dependência `depsBuildBuild` na derivação sendo construída em vez de uma `depsHostHost` na ferramenta que está realizando a construção para este propósito.

##### `buildInputs` {#var-stdenv-buildInputs}

Uma lista de dependências cuja plataforma de host e plataforma de destino correspondem às da nova derivação. Isso seria chamado de `depsHostTarget`, mas é por continuidade histórica. Se a dependência não se importa com a plataforma de destino (ou seja, não é um compilador ou ferramenta similar), coloque-a aqui, em vez de em `depsBuildBuild`.

Estes são frequentemente programas e bibliotecas usados pela nova derivação em tempo de *execução*, mas nem sempre é o caso. Por exemplo, o código de máquina em uma biblioteca estaticamente linkada é usado apenas em tempo de execução, mas a derivação que contém a biblioteca é necessária apenas em tempo de construção. Mesmo no caso dinâmico, a biblioteca também pode ser necessária em tempo de construção para satisfazer o linker.

##### `depsTargetTarget` {#var-stdenv-depsTargetTarget}

Uma lista de dependências cuja plataforma de host corresponde à plataforma de destino da nova derivação. São pacotes que são executados na plataforma de destino, por exemplo, a biblioteca padrão ou dependências de tempo de execução da biblioteca padrão que um compilador insiste em conhecer. É má prática em quase todos os casos para um pacote depender de outro de um estágio futuro \[estágio futuro correspondendo a um deslocamento positivo\]. Não use este atributo a menos que você esteja empacotando um compilador e tenha certeza de que ele é necessário.

##### `depsBuildBuildPropagated` {#var-stdenv-depsBuildBuildPropagated}

O equivalente propagado de `depsBuildBuild`. Isso talvez nunca devesse ser usado, mas está incluído por consistência \[veja abaixo para os outros\].

##### `propagatedNativeBuildInputs` {#var-stdenv-propagatedNativeBuildInputs}

O equivalente propagado de `nativeBuildInputs`. Isso seria chamado de `depsBuildHostPropagated`, mas é por continuidade histórica. Por exemplo, se o pacote `Y` tem `propagatedNativeBuildInputs = [X]`, e o pacote `Z` tem `buildInputs = [Y]`, então o pacote `Z` será construído como se incluísse o pacote `X` em seus `nativeBuildInputs`. Observe que se, em vez disso, o pacote `Z` tiver `nativeBuildInputs = [Y]`, então `X` não será incluído de forma alguma.

##### `depsBuildTargetPropagated` {#var-stdenv-depsBuildTargetPropagated}

O equivalente propagado de `depsBuildTarget`. Isso é prefixado pela mesma razão de alertar usuários em potencial.

##### `depsHostHostPropagated` {#var-stdenv-depsHostHostPropagated}

O equivalente propagado de `depsHostHost`.

##### `propagatedBuildInputs` {#var-stdenv-propagatedBuildInputs}

O equivalente propagado de `buildInputs`. Isso seria chamado de `depsHostTargetPropagated`, mas é por continuidade histórica.

##### `depsTargetTargetPropagated` {#var-stdenv-depsTargetTargetPropagated}

O equivalente propagado de `depsTargetTarget`. Isso é prefixado pela mesma razão de alertar usuários em potencial.

##### `strictDeps` {#var-stdenv-strictDeps}

Ao usar compilação nativa, o `stdenv` é tolerante em relação ao posicionamento incorreto de uma dependência em uma das listas de dependências descritas acima. Isso significa que uma dependência necessária em tempo de execução frequentemente funciona, mesmo que esteja presente apenas em `nativeBuildInputs`. Vice-versa, dependências contendo binários que precisam ser executados durante a construção funcionarão mesmo que estejam listadas apenas em `buildInputs`.

Embora conveniente para chegar a um pacote rapidamente, esse comportamento pode quebrar a compilação cruzada. Adicionar `strictDeps = true` como um parâmetro a `mkDerivation` ou a qualquer um de seus wrappers específicos de linguagem desabilita esse comportamento.

As funções `build*` especializadas para dlang, emacs, go, nim, ocaml, python e rust habilitam esta opção por padrão.
## Atributos {#ssec-stdenv-attributes}

### Variáveis que afetam a inicialização do `stdenv` {#variables-affecting-stdenv-initialisation}

#### `NIX_DEBUG` {#var-stdenv-NIX_DEBUG}

Um número entre 0 e 7 indicando a quantidade de informações a serem registradas. Se definido como 1 ou superior, `stdenv` imprimirá informações de depuração moderadas durante a construção. Em particular, os scripts wrapper de `gcc` e `ld` imprimirão a linha de comando completa passada para as ferramentas encapsuladas. Se definido como 6 ou superior, o script de configuração do `stdenv` será executado com rastreamento `set -x`. Se definido como 7 ou superior, os scripts wrapper de `gcc` e `ld` também serão executados com rastreamento `set -x`.

### Atributos que afetam as propriedades de construção {#attributes-affecting-build-properties}

#### `enableParallelBuilding` {#var-stdenv-enableParallelBuilding}

Se definido como `true`, `stdenv` passará flags específicas para `make` e outras ferramentas de construção para habilitar a construção paralela com até `build-cores` workers.

A menos que definido como `false`, alguns sistemas de construção com bom suporte para construção paralela, incluindo `cmake`, `meson` e `qmake`, o definirão como `true`.

#### `__structuredAttrs` {#var-stdenv-__structuredAttrs}

`__structuredAttrs` define como os atributos de derivação são passados para o builder.

Se ativado, um script shell e uma representação JSON dos atributos de derivação são criados.
As variáveis de ambiente {env}`NIX_ATTRS_SH_FILE` e {env}`NIX_ATTRS_JSON_FILE` apontam para a localização exata desses arquivos.

Atributos destinados a serem _exportados_ como variáveis de ambiente devem ser definidos no atributo `env`.
Atributos que são _locais_ ao script de construção devem ser definidos fora de `env`, para se beneficiarem de variáveis shell estruturadas.

::: {.important}
`__structuredAttrs` é um substituto completo para a forma como os atributos são tratados atualmente, e é o padrão preferido.

`passAsFile` é desabilitado quando `__structuredAttrs` é habilitado, já que {env}`NIX_ATTRS_JSON_FILE` pode ser lido em vez disso.

Todos os novos pacotes de nível superior devem habilitar `__structuredAttrs`.

:::

Consulte a documentação upstream do Nix para mais detalhes:
  - [Advanced Derivation Attributes](https://nix.dev/manual/nix/2.34/language/advanced-attributes.html#adv-attr-structuredAttrs)
  - [Builder Execution](https://nix.dev/manual/nix/2.34/store/building.html#builder-execution)
  - [Structured Attributes](https://nix.dev/manual/nix/2.34/store/derivation/#structured-attrs)

### Argumentos de ponto fixo de `mkDerivation` {#mkderivation-recursive-attributes}

Se você passar uma função para `mkDerivation`, ela chamará a função com um argumento que representa o estado final do pacote: o valor de retorno da própria função, com quaisquer overrides aplicados, já que a função é reinvocada por quaisquer chamadas `overrideAttrs`. Por exemplo:

```nix
mkDerivation (finalAttrs: {
  pname = "hello";
  withFeature = true;
  configureFlags = lib.optionals finalAttrs.withFeature [ "--with-feature" ];
})
```

Note que isso não usa a palavra-chave `rec` para reutilizar `withFeature` em `configureFlags`.
A palavra-chave `rec` funciona no nível da sintaxe e não tem conhecimento de overriding.

Em vez disso, a definição referencia `finalAttrs`, permitindo que os usuários alterem `withFeature`
consistentemente com `overrideAttrs`.

`finalAttrs` também contém o atributo `finalPackage`, que inclui os caminhos de saída, etc.

Vamos analisar um exemplo mais elaborado para entender as diferenças entre
várias ligações:

```nix
# `pkg` é a definição _original_ (para fins de ilustração)
let
  pkg = mkDerivation (finalAttrs: {
    # ...

    # Um atributo de exemplo
    packages = [ ];

    # `passthru.tests` é um atributo comumente definido.
    passthru.tests.simple = f finalAttrs.finalPackage;

    # Um exemplo de um atributo contendo uma função
    passthru.appendPackages =
      packages':
      finalAttrs.finalPackage.overrideAttrs (newSelf: super: { packages = super.packages ++ packages'; });

    # Para fins de ilustração; referenciado como
    # `(pkg.overrideAttrs(x)).finalAttrs` etc no texto abaixo.
    passthru.finalAttrs = finalAttrs;
    passthru.original = pkg;
  });
in
pkg
```

Ao contrário da ligação `pkg` no exemplo acima, o parâmetro `finalAttrs` sempre referencia os atributos finais. Por exemplo, `(pkg.overrideAttrs(x)).finalAttrs.finalPackage` é idêntico a `pkg.overrideAttrs(x)`, enquanto `(pkg.overrideAttrs(x)).original` é o mesmo que o `pkg` original.

Veja também a seção sobre [`passthru.tests`](#var-passthru-tests).

## Fases {#sec-stdenv-phases}

`stdenv.mkDerivation` define o builder da [derivação](https://nixos.org/manual/nix/stable/expressions/derivations.html#derivations) do Nix para um script que carrega a biblioteca bash `setup.sh` do stdenv e chama `genericBuild`. A maioria das funções de empacotamento depende deste builder padrão.

Este comando genérico invoca um script em *buildCommandPath*, ou um *buildCommand*, ou um número de *phases*. As construções de pacotes são divididas em fases para facilitar a substituição de partes específicas da construção (por exemplo, descompactar as fontes ou instalar os binários).

Cada fase pode ser substituída em sua totalidade, seja definindo a variável de ambiente `namePhase` para uma string contendo alguns comandos shell a serem executados, ou redefinindo a função shell `namePhase`. O primeiro é conveniente para substituir uma fase da derivação, enquanto o último é conveniente a partir de um script de construção. No entanto, tipicamente, deseja-se apenas *adicionar* alguns comandos a uma fase, por exemplo, definindo `postInstall` ou `preFixup`, pois pular algumas das ações padrão pode ter consequências inesperadas. O script padrão para cada fase é definido no arquivo `pkgs/stdenv/generic/setup.sh`.

Ao substituir uma fase, por exemplo `installPhase`, é importante começar com `runHook preInstall` e terminá-la com `runHook postInstall`, caso contrário `preInstall` e `postInstall` não serão executados. Mesmo que você não os use diretamente, é uma boa prática fazê-lo de qualquer forma para usuários downstream que queiram adicionar um `postInstall` substituindo sua derivação.

Dentro de um `nix-shell` interativo, se você quiser executar todas as fases na ordem em que seriam executadas em uma construção real, você pode invocar `genericBuild` você mesmo.

### Controlando fases {#ssec-controlling-phases}

Existem várias variáveis que controlam quais fases são executadas e em que ordem:

#### Variáveis que afetam o controle de fases {#variables-affecting-phase-control}

##### `phases` {#var-stdenv-phases}

Especifica as fases. Você pode alterar a ordem em que as fases são executadas, ou adicionar novas fases, definindo esta variável. Se não for definida, o valor padrão é usado, que é `$prePhases unpackPhase patchPhase $preConfigurePhases configurePhase $preBuildPhases buildPhase checkPhase $preInstallPhases installPhase fixupPhase installCheckPhase $preDistPhases distPhase $postPhases`.

Os elementos de `phases` não devem conter espaços. Se `phases` for especificado como um atributo da Linguagem Nix, ele deve ser especificado como listas em vez de strings. As mesmas regras se aplicam às variáveis `*Phases`.

É desencorajado definir esta variável, pois é fácil perder alguma funcionalidade importante escondida em algumas das fases menos obviamente necessárias (como `fixupPhase` que corrige o shebang de scripts).
Geralmente, se você quiser apenas adicionar algumas fases, é mais conveniente definir uma das variáveis `*Phases` abaixo.

##### `prePhases` {#var-stdenv-prePhases}

Fases adicionais executadas antes de qualquer uma das fases padrão.

##### `preConfigurePhases` {#var-stdenv-preConfigurePhases}

Fases adicionais executadas logo antes da fase de configuração.

##### `preBuildPhases` {#var-stdenv-preBuildPhases}

Fases adicionais executadas logo antes da fase de construção.

##### `preInstallPhases` {#var-stdenv-preInstallPhases}

Fases adicionais executadas logo antes da fase de instalação.

##### `preFixupPhases` {#var-stdenv-preFixupPhases}

Fases adicionais executadas logo antes da fase de fixup.

##### `preDistPhases` {#var-stdenv-preDistPhases}

Fases adicionais executadas logo antes da fase de distribuição.

##### `postPhases` {#var-stdenv-postPhases}

Fases adicionais executadas após qualquer uma das fases padrão.

### A fase de descompactação {#ssec-unpack-phase}

A fase de descompactação é responsável por descompactar o código-fonte do pacote. A implementação padrão de `unpackPhase` descompacta os arquivos-fonte listados na variável de ambiente `src` para o diretório atual. Ela suporta os seguintes arquivos por padrão:

#### Arquivos Tar {#tar-files}

Estes podem opcionalmente ser compactados usando `gzip` (`.tar.gz`, `.tgz` ou `.tar.Z`), `bzip2` (`.tar.bz2`, `.tbz2` ou `.tbz`) ou `xz` (`.tar.xz`, `.tar.lzma` ou `.txz`).

#### Arquivos Zip {#zip-files}

Arquivos Zip são descompactados usando `unzip`. No entanto, `unzip` não está no ambiente padrão, então você deve adicioná-lo a `nativeBuildInputs` você mesmo.

#### Diretórios no Nix store {#directories-in-the-nix-store}

Estes são copiados para o diretório atual. A parte do hash do nome do arquivo é removida, por exemplo, `/nix/store/1wydxgby13cz...-my-sources` seria copiado para `my-sources`.

Tipos de arquivo adicionais podem ser suportados definindo a variável `unpackCmd` (veja abaixo).

#### Variáveis que controlam a fase de descompactação {#variables-controlling-the-unpack-phase}

##### `srcs` / `src` {#var-stdenv-src}

A lista de arquivos ou diretórios de origem a serem descompactados ou copiados. Um destes deve ser definido. Note que se você usar `srcs`, você também deve definir `sourceRoot` ou `setSourceRoot`.

Estes devem idealmente ser realmente fontes e licenciados sob uma licença FLOSS. Se você tiver que usar um lançamento binário upstream ou empacotar software não-livre, certifique-se de marcar corretamente sua derivação como tal nos campos [`sourceProvenance`](#var-meta-sourceProvenance) e [`license`](#sec-meta-license) da seção [`meta`](#chap-meta).

##### `sourceRoot` {#var-stdenv-sourceRoot}

Após descompactar todos os `src` e `srcs`, se nem `sourceRoot` nem `setSourceRoot` estiverem definidos, `unpackPhase` do builder genérico verifica se a descompactação produziu um único diretório e move o diretório de trabalho atual para dentro dele.

Se `unpackPhase` produzir múltiplos diretórios de origem, você deve definir `sourceRoot` para o nome do diretório pretendido.
Você também pode definir `sourceRoot = ".";` se quiser controlá-lo você mesmo em uma fase posterior.

Por exemplo, se você quiser que sua construção comece em um subdiretório dentro de suas fontes, e você estiver usando `src` derivado de `fetchzip` (como `fetchFromGitHub` ou similar), você precisa definir `sourceRoot = "${src.name}/my-sub-directory"`.

##### `setSourceRoot` {#var-stdenv-setSourceRoot}

Alternativamente a definir `sourceRoot`, você pode definir `setSourceRoot` para um comando shell a ser avaliado pela fase de descompactação após as fontes terem sido descompactadas. Este comando deve definir `sourceRoot`.

Por exemplo, se você estiver usando `fetchurl` em um arquivo de arquivo que é descompactado em um único diretório cujo nome muda entre as versões do pacote, e você quer que sua construção comece em seu subdiretório, você precisa definir `setSourceRoot = "sourceRoot=$(echo */my-sub-directory)";`, ou no caso de múltiplas fontes, você poderia usar algo mais específico, como `setSourceRoot = "sourceRoot=$(echo ${pname}-*/my-sub-directory)";`.

##### `preUnpack` {#var-stdenv-preUnpack}

Hook executado no início da fase de descompactação.

##### `postUnpack` {#var-stdenv-postUnpack}

Hook executado no final da fase de descompactação.

##### `dontUnpack` {#var-stdenv-dontUnpack}

Defina como true para pular a fase de descompactação.

##### `dontMakeSourcesWritable` {#var-stdenv-dontMakeSourcesWritable}

Se definido como `1`, as fontes descompactadas *não* são tornadas graváveis. Por padrão, elas são tornadas graváveis para evitar problemas com fontes somente leitura. Por exemplo, diretórios de store copiados seriam somente leitura sem isso.

##### `unpackCmd` {#var-stdenv-unpackCmd}

A fase de descompactação avalia a string `$unpackCmd` para qualquer arquivo não reconhecido. O caminho para o arquivo de origem atual está contido na variável `curSrc`.

### A fase de aplicação de patches {#ssec-patch-phase}

A fase de aplicação de patches aplica a lista de patches definidos na variável `patches`.

#### Variáveis que controlam a fase de aplicação de patches {#variables-controlling-the-patch-phase}

##### `dontPatch` {#var-stdenv-dontPatch}

Defina como true para pular a fase de aplicação de patches.

##### `patches` {#var-stdenv-patches}

A lista de patches. Eles devem estar no formato aceito pelo comando `patch`, e podem opcionalmente ser compactados usando `gzip` (`.gz`), `bzip2` (`.bz2`) ou `xz` (`.xz`).

##### `patchFlags` {#var-stdenv-patchFlags}

Flags a serem passadas para `patch`. Se não for definido, o argumento `-p1` é usado, o que faz com que o componente de diretório inicial seja removido dos nomes de arquivo em cada patch.

##### `prePatch` {#var-stdenv-prePatch}

Hook executado no início da fase de aplicação de patches.

##### `postPatch` {#var-stdenv-postPatch}

Hook executado no final da fase de aplicação de patches.

### A fase de configuração {#ssec-configure-phase}

A fase de configuração prepara a árvore de fontes para a construção. A `configurePhase` padrão executa `./configure` (tipicamente um script gerado pelo Autoconf) se ele existir.

#### Variáveis que controlam a fase de configuração {#variables-controlling-the-configure-phase}

##### `configureScript` {#var-stdenv-configureScript}

O nome do script de configuração. Ele assume o padrão `./configure` se existir; caso contrário, a fase de configuração é ignorada. Isso pode ser, na verdade, um comando (como `perl ./Configure.pl`).

##### `configureFlags` {#var-stdenv-configureFlags}

Uma lista de strings passadas como argumentos adicionais para o script de configuração.

##### `dontConfigure` {#var-stdenv-dontConfigure}

Defina como true para pular a fase de configuração.

##### `configureFlagsArray` {#var-stdenv-configureFlagsArray}

Um array shell contendo argumentos adicionais passados para o script de configuração. Você deve usar isso em vez de `configureFlags` se os argumentos contiverem espaços.

##### `dontAddPrefix` {#var-stdenv-dontAddPrefix}

Por padrão, `./configure` recebe a concatenação de [`prefixKey`](#var-stdenv-prefixKey) e [`prefix`](#var-stdenv-prefix) na linha de comando. Desabilite isso definindo `dontAddPrefix` como `true`.

##### `prefix` {#var-stdenv-prefix}

O prefixo sob o qual o pacote deve ser instalado, passado via a opção `--prefix` para o script de configuração. O padrão é `$out`.

##### `prefixKey` {#var-stdenv-prefixKey}

A chave a ser usada ao especificar o [`prefix`](#var-stdenv-prefix) de instalação. Por padrão, isso é definido como `--prefix=` pois é usado pela maioria dos pacotes. Outros pacotes podem precisar de `--prefix ` (com um espaço no final) ou `PREFIX=`.

##### `dontAddStaticConfigureFlags` {#var-stdenv-dontAddStaticConfigureFlags}

Por padrão, ao construir estaticamente, `stdenv` tentará adicionar flags de configuração apropriadas ao sistema de construção para tentar habilitar construções estáticas.

Se isso for indesejável, defina esta variável como true.

##### `dontAddDisableDepTrack` {#var-stdenv-dontAddDisableDepTrack}

Por padrão, a flag `--disable-dependency-tracking` é adicionada às flags de configuração para acelerar as construções baseadas em Automake. Se isso for indesejável, defina esta variável como true.

##### `dontFixLibtool` {#var-stdenv-dontFixLibtool}

Por padrão, a fase de configuração aplica algumas "hackery" especiais a todos os arquivos chamados `ltmain.sh` antes de executar o script de configuração para melhorar a pureza dos pacotes baseados em Libtool [^footnote-stdenv-sys-lib-search-path]. Se isso for indesejável, defina esta variável como true.

##### `dontDisableStatic` {#var-stdenv-dontDisableStatic}

Por padrão, quando o script de configuração tem `--enable-static`, a opção `--disable-static` é adicionada às flags de configuração.

Se isso for indesejável, defina esta variável como true. Ela é automaticamente definida como true ao construir estaticamente, por exemplo, através de `pkgsStatic`.

##### `configurePlatforms` {#var-stdenv-configurePlatforms}

Por padrão, ao fazer compilação cruzada, o script de configuração tem `--build=...` e `--host=...` passados. Os pacotes podem, em vez disso, passar `[ "build" "host" "target" ]` ou um subconjunto para controlar exatamente quais flags de plataforma são passadas. Compiladores e outras ferramentas podem usar isso para também passar a plataforma de destino. [^footnote-stdenv-build-time-guessing-impurity]

##### `preConfigure` {#var-stdenv-preConfigure}

Hook executado no início da fase de configuração.

##### `postConfigure` {#var-stdenv-postConfigure}

Hook executado no final da fase de configuração.

### A fase de construção {#build-phase}

A fase de construção é responsável por realmente construir o pacote (por exemplo, compilá-lo). A `buildPhase` padrão chama `make` se um arquivo chamado `Makefile`, `makefile` ou `GNUmakefile` existir no diretório atual (ou o `makefile` for explicitamente definido); caso contrário, não faz nada.

#### Variáveis que controlam a fase de construção {#variables-controlling-the-build-phase}

##### `dontBuild` {#var-stdenv-dontBuild}

Defina como true para pular a fase de construção.

##### `makefile` {#var-stdenv-makefile}

O nome do arquivo do Makefile.

##### `makeFlags` {#var-stdenv-makeFlags}

Uma lista de strings passadas como flags adicionais para `make`. Essas flags também são usadas pelas fases padrão de instalação e verificação. Para definir flags de make específicas para a fase de construção, use `buildFlags` (veja abaixo).

```nix
{ makeFlags = [ "PREFIX=$(out)" ]; }
```

::: {.note}
As flags são citadas em bash, mas as variáveis de ambiente podem ser especificadas usando a sintaxe do make.
:::

##### `makeFlagsArray` {#var-stdenv-makeFlagsArray}

Um array shell contendo argumentos adicionais passados para `make`. Você deve usar isso em vez de `makeFlags` se os argumentos contiverem espaços, por exemplo:

```nix
{
  preBuild = ''
    makeFlagsArray+=(CFLAGS="-O0 -g" LDFLAGS="-lfoo -lbar")
  '';
}
```

Note que arrays shell não podem ser passados através de variáveis de ambiente, então você não pode definir `makeFlagsArray` em um atributo de derivação (porque eles são passados através de variáveis de ambiente): você tem que defini-los em código shell.

##### `buildFlags` / `buildFlagsArray` {#var-stdenv-buildFlags}

Uma lista de strings passadas como flags adicionais para `make`. Como `makeFlags` e `makeFlagsArray`, mas usadas apenas pela fase de construção. Quaisquer alvos de construção devem ser especificados como parte de `buildFlags`.

##### `preBuild` {#var-stdenv-preBuild}

Hook executado no início da fase de construção.

##### `postBuild` {#var-stdenv-postBuild}

Hook executado no final da fase de construção.

Você pode definir flags para `make` através da variável `makeFlags`.

Antes e depois de executar `make`, os hooks `preBuild` e `postBuild` são chamados, respectivamente.

### A fase de verificação {#ssec-check-phase}

A fase de verificação verifica se o pacote foi construído corretamente executando sua suíte de testes. A `checkPhase` padrão chama `make $checkTarget`, mas apenas se a [variável `doCheck`](#var-stdenv-doCheck) estiver habilitada.

É altamente recomendado, para fontes de pacotes que não são distribuídas com nenhum teste, usar pelo menos [`versionCheckHook`](#versioncheckhook) para testar se o executável resultante é basicamente funcional.

#### Variáveis que controlam a fase de verificação {#variables-controlling-the-check-phase}

##### `doCheck` {#var-stdenv-doCheck}

Controla se a fase de verificação é executada. Por padrão, ela é ignorada, mas se `doCheck` for definido como true, a fase de verificação geralmente é executada. Assim, você deve definir

```nix
{ doCheck = true; }
```

na derivação para habilitar as verificações. A exceção é a compilação cruzada. Construções compiladas cruzadamente nunca executam testes, não importa como `doCheck` esteja definido, pois o programa recém-construído não será executado na plataforma usada para construí-lo.

##### `makeFlags` / `makeFlagsArray` / `makefile` {#makeflags-makeflagsarray-makefile}

Veja a [fase de construção](#var-stdenv-makeFlags) para detalhes.

##### `checkTarget` {#var-stdenv-checkTarget}

O alvo `make` que executa os testes.
Se não definido, usa `check` se existir, caso contrário `test`; se nenhum for encontrado, não faz nada.

##### `checkFlags` / `checkFlagsArray` {#var-stdenv-checkFlags}

Uma lista de strings passadas como flags adicionais para `make`. Como `makeFlags` e `makeFlagsArray`, mas usadas apenas pela fase de verificação. Ao contrário de `buildFlags`, o `checkTarget` é automaticamente adicionado à invocação de `make` além de quaisquer `checkFlags` especificadas.

##### `checkInputs` {#var-stdenv-checkInputs}

Uma lista de dependências do host usadas pela fase, geralmente bibliotecas vinculadas a executáveis construídos durante os testes. Isso é incluído em `buildInputs` quando `doCheck` é definido.

##### `nativeCheckInputs` {#var-stdenv-nativeCheckInputs}

Uma lista de dependências nativas usadas pela fase, notavelmente ferramentas necessárias no `$PATH`. Isso é incluído em `nativeBuildInputs` quando `doCheck` é definido.

##### `preCheck` {#var-stdenv-preCheck}

Hook executado no início da fase de verificação.

##### `postCheck` {#var-stdenv-postCheck}

Hook executado no final da fase de verificação.

### A fase de instalação {#ssec-install-phase}

A fase de instalação é responsável por instalar o pacote no Nix store sob `out`. A `installPhase` padrão cria o diretório `$out` e chama `make install`.

#### Variáveis que controlam a fase de instalação {#variables-controlling-the-install-phase}

##### `dontInstall` {#var-stdenv-dontInstall}

Defina como true para pular a fase de instalação.

##### `makeFlags` / `makeFlagsArray` / `makefile` {#makeflags-makeflagsarray-makefile-1}

Veja a [fase de construção](#var-stdenv-makeFlags) para detalhes.

##### `installTargets` {#var-stdenv-installTargets}

Os alvos de make que realizam a instalação. O padrão é `install`. Exemplo:

```nix
{ installTargets = "install-bin install-doc"; }
```

##### `installFlags` / `installFlagsArray` {#var-stdenv-installFlags}

Uma lista de strings passadas como flags adicionais para `make`. Como `makeFlags` e `makeFlagsArray`, mas usadas apenas pela fase de instalação. Ao contrário de `buildFlags`, os `installTargets` são automaticamente adicionados à invocação de `make` além de quaisquer `installFlags` especificadas.

##### `preInstall` {#var-stdenv-preInstall}

Hook executado no início da fase de instalação.

##### `postInstall` {#var-stdenv-postInstall}

Hook executado no final da fase de instalação.

### A fase de fixup {#ssec-fixup-phase}

A fase de fixup executa ações de pós-processamento (específicas do Nix) nos arquivos instalados sob `$out` pela fase de instalação. A `fixupPhase` padrão faz o seguinte:

- Move os subdiretórios `man/`, `doc/` e `info/` de `$out` para `share/`.
- Remove informações de depuração de bibliotecas e executáveis.
- No Linux, aplica o comando `patchelf` a executáveis e bibliotecas ELF para remover diretórios não utilizados do `RPATH` a fim de evitar dependências de tempo de execução desnecessárias.
- Reescreve os caminhos do interpretador de scripts shell para caminhos encontrados em `PATH`. Por exemplo, `/usr/bin/perl` será reescrito para `/nix/store/some-perl/bin/perl` encontrado em `PATH`. Veja [](#patch-shebangs.sh) para detalhes.

#### Variáveis que controlam a fase de fixup {#variables-controlling-the-fixup-phase}

##### `dontFixup` {#var-stdenv-dontFixup}

Defina como true para pular a fase de fixup.

##### `dontStrip` {#var-stdenv-dontStrip}

Se definido, bibliotecas e executáveis não são "stripped" (despojados de símbolos). Por padrão, eles são.

##### `dontStripHost` {#var-stdenv-dontStripHost}

Como `dontStrip`, mas afeta apenas o comando `strip` que visa a plataforma host do pacote. Útil ao suportar compilação cruzada, mas caso contrário, sinta-se à vontade para ignorar.

##### `dontStripTarget` {#var-stdenv-dontStripTarget}

Como `dontStrip`, mas afeta apenas o comando `strip` que visa a plataforma de destino do pacote. Útil ao suportar compilação cruzada, mas caso contrário, sinta-se à vontade para ignorar.

##### `dontMoveSbin` {#var-stdenv-dontMoveSbin}

Se definido, arquivos em `$out/sbin` não são movidos para `$out/bin`. Por padrão, eles são.

##### `stripAllList` {#var-stdenv-stripAllList}

Lista de diretórios para procurar bibliotecas e executáveis dos quais *todos* os símbolos devem ser removidos. Por padrão, está vazia. Remover todos os símbolos é arriscado, pois pode remover não apenas símbolos de depuração, mas também informações ELF necessárias para a execução normal.

##### `stripAllListTarget` {#var-stdenv-stripAllListTarget}

Como `stripAllList`, mas aplica-se apenas à plataforma de destino do pacote. Por padrão, está vazia. Útil ao suportar compilação cruzada.

##### `stripAllFlags` {#var-stdenv-stripAllFlags}

Flags passadas para o comando `strip` aplicado aos arquivos nos diretórios listados em `stripAllList`. O padrão é `-s -p` (ou seja, `--strip-all --preserve-dates`).

##### `stripDebugList` {#var-stdenv-stripDebugList}

Lista de diretórios para procurar bibliotecas e executáveis dos quais apenas símbolos relacionados à depuração devem ser removidos. O padrão é `lib lib32 lib64 libexec bin sbin`.

##### `stripDebugListTarget` {#var-stdenv-stripDebugListTarget}

Como `stripDebugList`, mas aplica-se apenas à plataforma de destino do pacote. Por padrão, está vazia. Útil ao suportar compilação cruzada.

##### `stripDebugFlags` {#var-stdenv-stripDebugFlags}

Flags passadas para o comando `strip` aplicado aos arquivos nos diretórios listados em `stripDebugList`. O padrão é `-S -p` (ou seja, `--strip-debug --preserve-dates`).

##### `stripExclude` {#var-stdenv-stripExclude}

Uma lista de nomes de arquivos ou padrões de caminho a serem evitados na remoção de símbolos. Um arquivo é excluído se seu nome _ou_ caminho (a partir da raiz da derivação) corresponder.

Este exemplo impede que todos os arquivos `*.rlib` sejam removidos:

```nix
stdenv.mkDerivation {
  # ...
  stripExclude = [ "*.rlib" ];
}
```

Este exemplo impede que arquivos dentro de certos caminhos sejam removidos:

```nix
stdenv.mkDerivation {
  # ...
  stripExclude = [ "lib/modules/*/build/*" ];
}
```

##### `dontPatchELF` {#var-stdenv-dontPatchELF}

Se definido, o comando `patchelf` não é usado para remover entradas `RPATH` desnecessárias. Aplica-se apenas ao Linux.

##### `dontPatchShebangs` {#var-stdenv-dontPatchShebangs}

Se definido, scripts que começam com `#!` não têm seus caminhos de interpretador reescritos para caminhos no Nix store. Veja [](#patch-shebangs.sh) sobre como funciona a correção de shebangs.

##### `dontPruneLibtoolFiles` {#var-stdenv-dontPruneLibtoolFiles}

Se definido, os arquivos `.la` do libtool associados a bibliotecas compartilhadas não terão seu campo `dependency_libs` limpo.

##### `forceShare` {#var-stdenv-forceShare}

A lista de diretórios que devem ser movidos de `$out` para `$out/share`. O padrão é `man doc info`.

##### `setupHook` {#var-stdenv-setupHook}

Um pacote pode exportar um [setup hook](#ssec-setup-hooks) definindo esta variável. O setup hook, se definido, é copiado para `$out/nix-support/setup-hook`. As variáveis de ambiente são então substituídas nele usando `substituteAll`.

##### `preFixup` {#var-stdenv-preFixup}

Hook executado no início da fase de fixup.

##### `postFixup` {#var-stdenv-postFixup}

Hook executado no final da fase de fixup.

##### `separateDebugInfo` {#stdenv-separateDebugInfo}

Se definido como `true`, o ambiente padrão habilitará informações de depuração em construções C/C++. Após a instalação, as informações de depuração serão separadas dos executáveis e armazenadas na saída chamada `debug`. (Esta saída é habilitada automaticamente; você não precisa definir o atributo `outputs` explicitamente.) Para ser preciso, as informações de depuração são armazenadas em `debug/lib/debug/.build-id/XX/YYYY…`, onde \<XXYYYY…\> é o \<ID de construção\> do binário — um hash SHA-1 do conteúdo do binário. Depuradores como o GDB usam o ID de construção para procurar as informações de depuração separadas.

:::{.example #ex-gdb-debug-symbols-socat}

# Habilitar símbolos de depuração para uso com GDB

Para fazer o GDB encontrar informações de depuração para o pacote `socat` e suas dependências, você pode usar o seguinte `shell.nix`:

```nix
{
  pkgs ? import <nixpkgs> {
    config = { };
    overlays = [
      (final: prev: {
        ncurses = prev.ncurses.overrideAttrs { separateDebugInfo = true; };
        readline = prev.readline.overrideAttrs { separateDebugInfo = true; };
      })
    ];
  },
}:
pkgs.mkShell {
  NIX_DEBUG_INFO_DIRS = pkgs.lib.makeSearchPathOutput "debug" "lib/debug" [
    pkgs.glibc
    pkgs.ncurses
    pkgs.openssl
    pkgs.readline
  ];

  packages = [
    pkgs.gdb
    pkgs.socat
  ];

  shellHook = ''
    gdb socat
  '';
}
```

Esta configuração funciona da seguinte forma:
- Adicione [`overlays`](#chap-overlays) ao conjunto de pacotes, já que os símbolos de depuração são desabilitados para `ncurses` e `readline` por padrão.
- Defina a variável de ambiente `NIX_DEBUG_INFO_DIRS` no shell. Nixpkgs corrige `gdb` para usar esta variável para procurar símbolos de depuração.
  [`lib.makeSearchPathOutput`](#function-library-lib.strings.makeSearchPathOutput) constrói um caminho de busca separado por dois pontos, apontando para os diretórios que contêm os símbolos de depuração dos pacotes listados.
- Execute `gdb` no binário `socat` na inicialização do shell em [`shellHook`](#sec-pkgs-mkShell).

:::

### A fase installCheck {#ssec-installCheck-phase}

A fase installCheck verifica se o pacote foi instalado corretamente executando sua suíte de testes contra os diretórios instalados. O `installCheck` padrão chama `make installcheck`.

É frequentemente melhor adicionar testes que não fazem parte da distribuição de origem a `passthru.tests` (veja
[](#var-passthru-tests)). Isso evita adicionar sobrecarga a cada construção e nos permite executá-los independentemente.

#### Variáveis que controlam a fase installCheck {#variables-controlling-the-installcheck-phase}

##### `doInstallCheck` {#var-stdenv-doInstallCheck}

Controla se a fase installCheck é executada. Por padrão, ela é ignorada, mas se `doInstallCheck` for definido como true, a fase installCheck geralmente é executada. Assim, você deve definir

```nix
{ doInstallCheck = true; }
```

na derivação para habilitar as verificações de instalação. A exceção é a compilação cruzada. Construções compiladas cruzadamente nunca executam testes, não importa como `doInstallCheck` esteja definido, pois o programa recém-construído não será executado na plataforma usada para construí-lo.

##### `installCheckTarget` {#var-stdenv-installCheckTarget}

O alvo de make que executa os testes de instalação. O padrão é `installcheck`.

##### `installCheckFlags` / `installCheckFlagsArray` {#var-stdenv-installCheckFlags}

Uma lista de strings passadas como flags adicionais para `make`. Como `makeFlags` e `makeFlagsArray`, mas usadas apenas pela fase installCheck.

##### `installCheckInputs` {#var-stdenv-installCheckInputs}

Uma lista de dependências do host usadas pela fase, geralmente bibliotecas vinculadas a executáveis construídos durante os testes. Isso é incluído em `buildInputs` quando `doInstallCheck` é definido.

##### `nativeInstallCheckInputs` {#var-stdenv-nativeInstallCheckInputs}

Uma lista de dependências nativas usadas pela fase, notavelmente ferramentas necessárias no `$PATH`. Isso é incluído em `nativeBuildInputs` quando `doInstallCheck` é definido.

##### `preInstallCheck` {#var-stdenv-preInstallCheck}

Hook executado no início da fase installCheck.

##### `postInstallCheck` {#var-stdenv-postInstallCheck}

Hook executado no final da fase installCheck.

### A fase de distribuição {#ssec-distribution-phase}

A fase de distribuição destina-se a produzir uma distribuição de origem do pacote. A `distPhase` padrão primeiro chama `make dist`, depois copia os tarballs de origem resultantes para `$out/tarballs/`. Esta fase é executada apenas se o atributo `doDist` estiver definido.

#### Variáveis que controlam a fase de distribuição {#variables-controlling-the-distribution-phase}

##### `doDist` {#var-stdenv-doDist}

Se definido, a fase de distribuição é executada.

##### `distTarget` {#var-stdenv-distTarget}

O alvo de make que produz a distribuição. O padrão é `dist`.

##### `distFlags` / `distFlagsArray` {#var-stdenv-distFlags}

Flags adicionais passadas para `make`.

##### `tarballs` {#var-stdenv-tarballs}

Os nomes dos arquivos de distribuição de origem a serem copiados para `$out/tarballs/`. Pode conter curingas shell. O padrão é `*.tar.gz`.

##### `dontCopyDist` {#var-stdenv-dontCopyDist}

Se definido, nenhum arquivo é copiado para `$out/tarballs/`.

##### `preDist` {#var-stdenv-preDist}

Hook executado no início da fase de distribuição.

##### `postDist` {#var-stdenv-postDist}

Hook executado no final da fase de distribuição.
## Funções e utilitários de shell {#ssec-stdenv-functions}

O ambiente padrão oferece diversas funções úteis.

### `makeWrapper` \<executável\> \<arquivo-wrapper\> \<args\> {#fun-makeWrapper}

Constrói um wrapper para um programa com vários argumentos possíveis. Ele é definido como parte de 2 setup-hooks chamados `makeWrapper` e `makeBinaryWrapper` que implementam as mesmas funções bash. Portanto, para usá-lo, você precisa adicionar `makeWrapper` aos seus `nativeBuildInputs`. Aqui está um exemplo de uso:

```bash
# adiciona `FOOBAR=baz` ao ambiente de `$out/bin/foo`
makeWrapper $out/bin/foo $wrapperfile --set FOOBAR baz

# Prefixa os caminhos binários de `hello` e `git`
# e sufixa o caminho binário de `xdg-utils`.
# Esteja ciente de que os caminhos frequentemente devem ser corrigidos diretamente
# (via substituições de string ou em `configurePhase`).
makeWrapper $out/bin/foo $wrapperfile \
  --prefix PATH : ${lib.makeBinPath [ hello git ]} \
  --suffix PATH : ${lib.makeBinPath [ xdg-utils ]}
```

Pacotes podem esperar ou exigir que outros utilitários estejam disponíveis em tempo de execução. `makeWrapper` pode ser usado para adicionar pacotes a uma variável de ambiente `PATH` local a um wrapper.

Use `--prefix` para definir explicitamente as dependências em `PATH`.

::: {.note}
`--prefix` essencialmente codifica as dependências no wrapper. Elas não podem ser sobrescritas sem reconstruir o pacote.
:::

Se as dependências devem ser resolvidas em tempo de execução, use `--suffix` para anexar valores de fallback a `PATH`.

Existem muitos outros tipos de argumentos, eles estão documentados em `nixpkgs/pkgs/build-support/setup-hooks/make-wrapper.sh` para a implementação de `makeWrapper` e em `nixpkgs/pkgs/by-name/ma/makeBinaryWrapper/make-binary-wrapper.sh` para a implementação de `makeBinaryWrapper`.

`wrapProgram` é uma função de conveniência que você provavelmente vai querer usar na maioria das vezes, implementada tanto por `makeWrapper` quanto por `makeBinaryWrapper`.

Usar a implementação de `makeBinaryWrapper` é geralmente preferível, pois ela cria um pequeno executável wrapper _compilado_, que pode ser usado como um interpretador shebang. Isso é necessário principalmente no Darwin, onde shebangs não podem apontar para scripts, [devido a uma limitação com a syscall `execve`](https://stackoverflow.com/questions/67100831/macos-shebang-with-absolute-path-not-working). Wrappers compilados gerados por `makeBinaryWrapper` podem ser inspecionados com `less <caminho-para-wrapper>` - ao rolar além dos dados binários, você deve conseguir ver o comando shell que gerou o executável e, ali, as variáveis de ambiente que foram injetadas no wrapper.

No entanto, `makeWrapper` é mais flexível e implementa mais argumentos. Use `makeWrapper` se você precisar que o wrapper utilize recursos de shell (por exemplo, procurar variáveis de ambiente) em tempo de execução.

### `remove-references-to -t` \<caminho-da-store\> [ `-t` \<caminho-da-store\> ... ] \<arquivo\> ... {#fun-remove-references-to}

Remove as referências dos arquivos especificados para os arquivos da store especificados. Isso é feito sem alterar o tamanho do arquivo, substituindo o hash por `eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`, e deve funcionar em executáveis compilados. Isso se destina a ser usado para remover a dependência da saída em entradas que são conhecidas por serem desnecessárias em tempo de execução. Claro, o uso imprudente quebrará os programas corrigidos. Para usar isso, adicione `removeReferencesTo` aos `nativeBuildInputs`.

Como `remove-references-to` é um executável real e não uma função shell, ele pode ser usado com `find`.
Exemplo removendo todas as referências ao compilador na saída:
```nix
{
  postInstall = ''
    find "$out" -type f -exec remove-references-to -t ${stdenv.cc} '{}' +
  '';
}
```

### `runHook` \<hook\> {#fun-runHook}

Executa \<hook\> e os valores no array associado a ele. O nome do array é determinado removendo `Hook` do final de \<hook\> e anexando `Hooks`.

Por exemplo, `runHook postHook` executaria o hook `postHook` e todos os valores contidos no array `postHooks`, se ele existir.

### `substitute` \<arquivo-entrada\> \<arquivo-saída\> \<substituições\> {#fun-substitute}

Realiza substituição de strings no conteúdo de \<arquivo-entrada\>, escrevendo o resultado em \<arquivo-saída\>. As substituições em \<substituições\> são da seguinte forma:

#### `--replace-fail` \<s1\> \<s2\> {#fun-substitute-replace-fail}

Substitui cada ocorrência da string \<s1\> por \<s2\>.
Gerará um erro se nenhuma alteração for feita.

#### `--replace-warn` \<s1\> \<s2\> {#fun-substitute-replace-warn}

Substitui cada ocorrência da string \<s1\> por \<s2\>.
Imprimirá um aviso se nenhuma alteração for feita.

#### `--replace-quiet` \<s1\> \<s2\> {#fun-substitute-replace-quiet}

Substitui cada ocorrência da string \<s1\> por \<s2\>.
Não fará nada se nenhuma alteração puder ser feita.

#### `--subst-var` \<nomeVariavel\> {#fun-substitute-subst-var}

Substitui cada ocorrência de `@varName@` pelo conteúdo da variável de ambiente \<varName\>. Isso é útil para gerar arquivos a partir de templates, usando `@...@` no template como placeholders.

#### `--subst-var-by` \<nomeVariavel\> \<s\> {#fun-substitute-subst-var-by}

Substitui cada ocorrência de `@varName@` pela string \<s\>.

Exemplo:

```shell
substitute ./foo.in ./foo.out \
    --replace-fail /usr/bin/bar $bar/bin/bar \
    --replace-fail "a string containing spaces" "some other text" \
    --subst-var someVar
```

### `substituteInPlace` \<múltiplos arquivos\> \<substituições\> {#fun-substituteInPlace}

Assim como `substitute`, mas realiza as substituições diretamente nos arquivos passados.

### `substituteAll` \<arquivo-entrada\> \<arquivo-saída\> {#fun-substituteAll}

Substitui cada ocorrência de `@varName@`, onde \<varName\> é qualquer variável de ambiente, em \<arquivo-entrada\>, escrevendo o resultado em \<arquivo-saída\>. Por exemplo, se \<arquivo-entrada\> tiver o conteúdo

```bash
#! @bash@/bin/sh
PATH=@coreutils@/bin
echo @foo@
```

e o ambiente contiver `bash=/nix/store/bmwp0q28cf21...-bash-3.2-p39` e `coreutils=/nix/store/68afga4khv0w...-coreutils-6.12`, mas não contiver a variável `foo`, então a saída será

```bash
#! /nix/store/bmwp0q28cf21...-bash-3.2-p39/bin/sh
PATH=/nix/store/68afga4khv0w...-coreutils-6.12/bin
echo @foo@
```

Ou seja, nenhuma substituição é realizada para variáveis indefinidas.

Variáveis de ambiente que começam com uma letra maiúscula ou um underscore são filtradas, para evitar que variáveis globais (como `HOME`) ou variáveis privadas (como `__ETC_PROFILE_DONE`) sejam acidentalmente substituídas. As variáveis também devem ser "nomes" bash válidos, conforme definido na manpage do bash (alfanuméricos ou `_`, não devem começar com um número).

### `substituteAllInPlace` \<arquivo\> {#fun-substituteAllInPlace}

Assim como `substituteAll`, mas realiza as substituições diretamente no arquivo \<arquivo\>.

### `stripHash` \<caminho\> {#fun-stripHash}

Remove a parte do diretório e do hash de um caminho da store, imprimindo a parte do nome para `stdout`. Por exemplo:

```bash
# imprime coreutils-8.24
stripHash "/nix/store/9s9r019176g7cvn2nvcw41gsp862y6b4-coreutils-8.24"
```

Se você deseja armazenar o resultado em outra variável, o seguinte idioma pode ser útil:

```bash
name="/nix/store/9s9r019176g7cvn2nvcw41gsp862y6b4-coreutils-8.24"
someVar=$(stripHash $name)
```

### `wrapProgram` \<executável\> \<makeWrapperArgs\> {#fun-wrapProgram}

Função de conveniência para `makeWrapper` que substitui `<executável>` por um wrapper que executa o programa original. Ela aceita todos os mesmos argumentos que `makeWrapper`, exceto `--inherit-argv0` (usado pela implementação de `makeBinaryWrapper`) e `--argv0` (usado por ambas as implementações de wrapper `makeWrapper` e `makeBinaryWrapper`).

Se você aplicá-lo várias vezes, ele sobrescreverá o arquivo do wrapper e você acabará com um empacotamento duplo, o que deve ser evitado.

### `prependToVar` \<nomeVariavel\> \<elementos...\> {#fun-prependToVar}

Precede elementos a uma variável.

Exemplo:

```shellSession
$ configureFlags="--disable-static"
$ prependToVar configureFlags --disable-dependency-tracking --enable-foo
$ echo $configureFlags
--disable-dependency-tracking --enable-foo --disable-static
```

### `appendToVar` \<nomeVariavel\> \<elementos...\> {#fun-appendToVar}

Anexa elementos a uma variável.

Exemplo:

```shellSession
$ configureFlags="--disable-static"
$ appendToVar configureFlags --disable-dependency-tracking --enable-foo
$ echo $configureFlags
--disable-static --disable-dependency-tracking --enable-foo
```

## Hooks de configuração de pacotes {#ssec-setup-hooks}

O Nix em si considera uma dependência de tempo de compilação como meramente algo que deve ter sido previamente construído e acessível em tempo de compilação — os próprios pacotes são responsáveis por realizar qualquer configuração adicional. Na maioria dos casos, isso é aceitável, e a derivação downstream pode lidar com suas próprias dependências. Mas para algumas tarefas comuns, isso resultaria em quase todo pacote fazendo o mesmo tipo de trabalho de configuração — dependendo não do pacote em si, mas inteiramente de quais dependências foram usadas.

Para aliviar essa carga, o mecanismo de setup hook foi criado, onde qualquer pacote pode incluir um script shell que [por convenção, e não por imposição do Nix], qualquer dependência reversa downstream irá carregar como parte de seu processo de compilação. Isso permite que a dependência downstream apenas especifique suas dependências, e permite que essas dependências se inicializem efetivamente. Nenhum boilerplate que espelhe a lista de dependências é necessário.

O mecanismo de setup hook é um tanto quanto uma marreta: um recurso poderoso com uma área de efeito ampla e indiscriminada. A combinação de seu poder e uso implícito pode ser conveniente, mas não é sem custos. O Nix em si permanece inalterado, mas o espírito de que as dependências adicionadas são livres de efeitos é violado, mesmo que o último não seja. Por exemplo, se um caminho de derivação é mencionado mais de uma vez, o Nix em si não se importa e garante que a derivação da dependência já esteja construída da mesma forma — depender é apenas precisar que algo exista, e precisar é idempotente. No entanto, uma dependência especificada duas vezes terá seu setup hook executado duas vezes, e isso poderia facilmente alterar o ambiente de compilação (embora um setup hook bem escrito se esforçará para ser idempotente, de modo que isso não seja observável). De forma mais ampla, os setup hooks são anti-modulares, pois múltiplas dependências, sejam as mesmas ou diferentes, não deveriam interferir, mas seus setup hooks podem fazê-lo.

O uso mais típico do setup hook é, na verdade, adicionar outros hooks que são então executados (ou seja, após todos os setup hooks) em cada dependência. Por exemplo, o setup hook do wrapper do compilador C alimenta-se de flags para cada dependência que contém bibliotecas e cabeçalhos relevantes. Isso é feito definindo uma função bash e anexando seu nome a uma das variáveis `envBuildBuildHooks`, `envBuildHostHooks`, `envBuildTargetHooks`, `envHostHostHooks`, `envHostTargetHooks` ou `envTargetTargetHooks`. Essas 6 variáveis bash correspondem aos 6 tipos de dependências por plataforma (há 12 no total, mas ignoramos o eixo propagado/não propagado).

Pacotes que adicionam um hook não devem codificar um hook específico, mas sim escolher uma variável *relativa* à forma como são incluídos. Voltando ao exemplo do wrapper do compilador C, se o próprio wrapper é uma dependência `n`, então ele só quer acumular flags de dependências `n + 1`, pois apenas essas correspondem à plataforma de destino do compilador. A variável `hostOffset` é definida com o offset de host da dependência atual `targetOffset` com seu offset de destino, antes que seu setup hook seja carregado. Além disso, como a maioria dos hooks de ambiente não se importa com a plataforma de destino, isso significa que o setup hook pode anexar ao array bash correto fazendo algo como

```bash
addEnvHooks "$hostOffset" myBashFunction
```

A *existência* de setup hooks tem sido documentada há muito tempo e os pacotes dentro do Nixpkgs são livres para usar esse mecanismo. Outros pacotes, no entanto, não devem depender de que esses mecanismos não mudem entre as versões do Nixpkgs. Devido aos problemas existentes com este sistema, há pouco benefício em exigir que ele seja estável por qualquer período de tempo.

Primeiro, vamos abordar alguns setup hooks que fazem parte do `stdenv` padrão do Nixpkgs. Isso significa que eles são executados para cada pacote construído usando `stdenv.mkDerivation`, mesmo com builders personalizados. Alguns deles são específicos da plataforma, então podem ser executados no Linux, mas não no Darwin, ou vice-versa.

### `move-docs.sh` {#move-docs.sh}

Este setup hook move qualquer documentação instalada para o subdiretório `/share`. Isso inclui os diretórios `man`, `doc` e `info`. Isso é necessário para programas legados que não sabem como usar o subdiretório `share`.

### `compress-man-pages.sh` {#compress-man-pages.sh}

Este setup hook compacta quaisquer páginas de manual que foram instaladas. A compactação é feita usando o programa `gzip`. Isso ajuda a reduzir o tamanho instalado dos pacotes.

### `strip.sh` {#strip.sh}

Isso executa o comando `strip` em binários e bibliotecas instalados. Isso remove informações desnecessárias, como símbolos de depuração, quando não são necessários. Isso também ajuda a reduzir o tamanho instalado dos pacotes.

### `patch-shebangs.sh` {#patch-shebangs.sh}

Este setup hook corrige scripts instalados para adicionar caminhos da store do Nix ao seu interpretador shebang, conforme encontrado no ambiente de compilação. A linha [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) informa a um sistema operacional tipo Unix qual interpretador usar para executar o conteúdo do script.

::: {.note}
O [builder genérico][generic-builder] preenche `PATH` a partir das entradas da derivação.
:::

[generic-builder]: https://github.com/NixOS/nixpkgs/blob/19d4f7dc485f74109bd66ef74231285ff797a823/pkgs/stdenv/generic/builder.sh

#### Invocação {#patch-shebangs.sh-invocation}

Múltiplos caminhos podem ser especificados.

```
patchShebangs [--build | --host] PATH...
```

##### Flags {#patch-shebangs.sh-invocation-flags}

`--build`
: Procura comandos disponíveis em tempo de compilação

`--host`
: Procura comandos disponíveis em tempo de execução

##### Exemplos {#patch-shebangs.sh-invocation-examples}

```sh
patchShebangs --host /nix/store/<hash>-hello-1.0/bin
```

```sh
patchShebangs --build configure
```

`#!/bin/sh` será reescrito para `#!/nix/store/<hash>-some-bash/bin/sh`.

`#!/usr/bin/env` recebe tratamento especial: `#!/usr/bin/env python` é reescrito para `/nix/store/<hash>/bin/python`.

Caminhos de interpretador que apontam para uma localização válida na store do Nix não são alterados.

::: {.note}
Um arquivo de script deve ser marcado como executável, caso contrário, não será considerado.
:::

Este mecanismo garante que o interpretador para um dado script seja sempre encontrado e seja exatamente aquele especificado pela compilação.

Ele pode ser desabilitado configurando [`dontPatchShebangs`](#var-stdenv-dontPatchShebangs):

```nix
stdenv.mkDerivation {
  # ...
  dontPatchShebangs = true;
  # ...
}
```

O arquivo [`patch-shebangs.sh`][patch-shebangs.sh] define a função [`patchShebangs`][patchShebangs]. Ele é usado para implementar [`patchShebangsAuto`][patchShebangsAuto], o [setup hook](#ssec-setup-hooks) que é registrado para ser executado durante a [fase de fixup](#ssec-fixup-phase) por padrão.

Se você precisar executar `patchShebangs` em tempo de compilação, ele deve ser chamado explicitamente dentro de [uma das fases de compilação](#sec-stdenv-phases).

[patch-shebangs.sh]: https://github.com/NixOS/nixpkgs/blob/19d4f7dc485f74109bd66ef74231285ff797a823/pkgs/build-support/setup-hooks/patch-shebangs.sh
[patchShebangs]: https://github.com/NixOS/nixpkgs/blob/19d4f7dc485f74109bd66ef74231285ff797a823/pkgs/build-support/setup-hooks/patch-shebangs.sh#L24-L105
[patchShebangsAuto]: https://github.com/NixOS/nixpkgs/blob/19d4f7dc485f74109bd66ef74231285ff797a823/pkgs/build-support/setup-hooks/patch-shebangs.sh#L107-L119

### `audit-tmpdir.sh` {#audit-tmpdir.sh}

Isso verifica se nenhuma referência é deixada dos binários instalados para o diretório usado para construir esses binários. Isso garante que os binários não precisem de coisas fora da store do Nix. Atualmente, isso é suportado apenas no Linux.

### `multiple-outputs.sh` {#multiple-outputs.sh}

Este setup hook adiciona flags de configuração que instruem os pacotes a instalar arquivos em qualquer uma das saídas apropriadas listadas em `outputs`. Este comportamento pode ser desativado definindo `setOutputFlags` como false no ambiente da derivação. Consulte [](#chap-multiple-output) para mais informações.

### `move-sbin.sh` {#move-sbin.sh}

Este setup hook move quaisquer binários instalados no subdiretório `sbin/` para `bin/`. Além disso, um link é fornecido de `sbin/` para `bin/` para compatibilidade.

### `move-lib64.sh` {#move-lib64.sh}

Este setup hook move quaisquer bibliotecas instaladas no subdiretório `lib64/` para `lib/`. Além disso, um link é fornecido de `lib64/` para `lib/` para compatibilidade.

### `move-systemd-user-units.sh` {#move-systemd-user-units.sh}

Este setup hook move quaisquer unidades de usuário do systemd instaladas no subdiretório `lib/` para `share/`. Além disso, um link é fornecido de `share/` para `lib/` para compatibilidade. Isso é necessário para que o systemd encontre serviços de usuário quando instalados no perfil do usuário.

Este hook só é executado ao compilar para Linux.

### `no-broken-symlinks.sh` {#no-broken-symlinks.sh}

Este setup hook verifica, relata e (por padrão) falha builds quando symlinks "quebrados" são encontrados. Um symlink é considerado "quebrado" se estiver pendente (o destino não existe) ou reflexivo (ele se refere a si mesmo).

Este hook pode ser desabilitado configurando `dontCheckForBrokenSymlinks`.

::: {.note}
O hook considera apenas symlinks com destinos dentro da store do Nix ou do diretório `$TMPDIR` (tipicamente `/nix/store` e `/build` no ambiente do builder, sendo este último onde a compilação é executada).
:::

::: {.note}
A verificação de reflexividade é direta e não considera a transitividade, portanto, este hook não impedirá ciclos em symlinks.
:::

### `set-source-date-epoch-to-latest.sh` {#set-source-date-epoch-to-latest.sh}

Isso define `SOURCE_DATE_EPOCH` para o tempo de modificação do arquivo mais recente.

### `add-bin-to-path.sh` {#add-bin-to-path.sh}

Este setup hook verifica se o diretório `bin/` existe no caminho de saída `$out` e, em caso afirmativo, o adiciona à variável de ambiente `PATH`. Isso garante que os executáveis localizados em `$out/bin` sejam acessíveis.

Este hook é particularmente útil durante os testes, pois permite que os pacotes localizem seus executáveis sem exigir modificações manuais no `PATH`.

**Nota**: Este hook foi projetado especificamente apenas para o diretório `$out/bin` e não lida nem suporta outros caminhos como `$sourceRoot/bin`. Ele pode não funcionar como esperado em casos com múltiplas saídas ou quando os binários estão localizados em diretórios como `sbin/`. Essas ressalvas devem ser consideradas ao usar este hook, pois podem introduzir um comportamento inesperado em alguns casos específicos.

### `writable-tmpdir-as-home.sh` {#writable-tmpdir-as-home.sh}

Este setup hook garante que o diretório especificado pela variável de ambiente `HOME` seja gravável. Se não for, o hook atribui `HOME` a um diretório gravável (em `.home` em `$NIX_BUILD_TOP`). Este ajuste é necessário para certos pacotes que exigem acesso de gravação a um diretório home.

Ao definir `HOME` para um diretório gravável, este setup hook evita falhas em pacotes que tentam gravar no diretório home.

### Wrapper e hook de Bintools {#bintools-wrapper}

O Wrapper de Bintools envolve os utilitários binários para uma série de propósitos diversos. Estes são GNU Binutils ao direcionar Linux, e uma mistura de cctools e GNU binutils para Darwin. [O nome "Bintools" é suposto ser um compromisso entre "Binutils" e "cctools", não denotando nenhuma implementação específica.] Especificamente, o pacote bintools subjacente e uma biblioteca padrão C (glibc ou libSystem do Darwin, apenas para o carregador dinâmico) são todos alimentados, e a descoberta de dependências, o hardening (veja abaixo) e as verificações de pureza para cada um são tratados pelo Wrapper de Bintools. Os pacotes tipicamente dependem do Wrapper de CC, que por sua vez (em tempo de execução) depende do Wrapper de Bintools.

O Wrapper de Bintools foi recentemente separado do Wrapper de CC, então a divisão de trabalho ainda está sendo elaborada. Por exemplo, ele não deveria se importar com a biblioteca padrão C, mas apenas pegar uma derivação com o carregador dinâmico (que por acaso é o glibc no Linux). A descoberta de dependências, no entanto, é uma tarefa que ambos os wrappers continuarão a precisar compartilhar, e provavelmente a mais importante de entender. Atualmente, isso é realizado coletando diretórios de dependências da plataforma host (ou seja, `buildInputs` e `nativeBuildInputs`) em variáveis de ambiente. O setup hook do Wrapper de Bintools faz com que quaisquer subdiretórios `lib` e `lib64` sejam adicionados a `NIX_LDFLAGS`. Como o Wrapper de CC e o Wrapper de Bintools usam a mesma estratégia, a maior parte do código do Wrapper de Bintools é pouco comentada e se refere ao Wrapper de CC. Mas o código do Wrapper de CC, por outro lado, possui comentários bastante extensos. O Wrapper de Bintools apenas os cita, em vez de repeti-los, para evitar que fiquem dessincronizados.

Uma tarefa final do setup hook é definir uma série de variáveis de ambiente padrão para informar aos sistemas de compilação quais executáveis cumprem qual propósito. Elas são definidas para serem apenas o nome base das ferramentas, sob a suposição de que os binários do Wrapper de Bintools estarão no PATH. Primeiramente, isso ajuda pacotes mal escritos, por exemplo, aqueles que procuram apenas `gcc` quando `CC` não está definido, mas `clang` deve ser usado. Em segundo lugar, isso ajuda os pacotes a não se confundirem ao fazer cross-compilação, caso em que múltiplos Wrappers de Bintools podem estar em uso simultaneamente. [^footnote-stdenv-per-platform-wrapper] Versões prefixadas com `BUILD_`- e `TARGET_`- da variável de ambiente normal são definidas para Wrappers de Bintools adicionais, disambiguando-os corretamente.

Um problema com esta tarefa final é que o Wrapper de Bintools é honesto e define `LD` como `ld`. A maioria dos pacotes, no entanto, primeiramente usa o compilador C para linkagem, em segundo lugar usa `LD` de qualquer forma, definindo-o como o compilador C, e em terceiro lugar, só define `LD` quando ele está indefinido como um fallback. Essa tripla ameaça significa que o Wrapper de Bintools quebrará esses pacotes, pois `LD` já está definido como o linker real que o pacote não irá sobrescrever, mas não quer usar. A solução é definir, apenas para o pacote problemático, `LD` como o compilador C. Uma boa maneira de fazer isso seria `preConfigure = "LD=$CC"`.

### Wrapper e hook de CC {#cc-wrapper}

O Wrapper de CC envolve uma toolchain C para uma série de propósitos diversos. Especificamente, um compilador C (GCC ou Clang), ferramentas binárias empacotadas e uma biblioteca padrão C (glibc ou libSystem do Darwin, apenas para o carregador dinâmico) são todos alimentados, e a descoberta de dependências, o hardening (veja abaixo) e as verificações de pureza para cada um são tratados pelo Wrapper de CC. Os pacotes tipicamente dependem do Wrapper de CC, que por sua vez (em tempo de execução) depende do Wrapper de Bintools.

A descoberta de dependências é, sem dúvida, a principal tarefa do Wrapper de CC. Isso funciona exatamente como o Wrapper de Bintools, exceto que qualquer subdiretório `include` de qualquer dependência relevante é adicionado a `NIX_CFLAGS_COMPILE`. O próprio setup hook contém comentários elaborados descrevendo o mecanismo exato pelo qual isso é realizado.

Similarmente, o Wrapper de CC segue o Wrapper de Bintools na definição de variáveis de ambiente padrão com os nomes das ferramentas que ele envolve, pelas mesmas razões descritas acima. É importante notar que, embora inclua um symlink `cc` para o compilador C para portabilidade, o `CC` será definido usando o "nome real" do compilador (ou seja, `gcc` ou `clang`). Isso ajuda sistemas de compilação ruins que inspecionam o nome do compilador em vez de executá-lo.

Aqui estão mais alguns pacotes que fornecem um setup hook. Como a lista de hooks é extensível, esta não é uma lista exaustiva. O mecanismo deve ser usado apenas como último recurso, então pode cobrir a maioria dos usos.

### Outros hooks {#stdenv-other-hooks}

Muitos outros pacotes fornecem hooks que não fazem parte do `stdenv`. Você pode encontrá-los na [Referência de Hooks](#chap-hooks).

### Hooks do wrapper do compilador e linker {#compiler-linker-wrapper-hooks}

Se o arquivo `${cc}/nix-support/cc-wrapper-hook` existir, ele será executado no final do [wrapper do compilador](#cc-wrapper).
Se o arquivo `${binutils}/nix-support/ld-wrapper-hook` existir, ele será executado no final do wrapper do linker, antes que o linker seja executado.
Se o arquivo `${binutils}/nix-support/post-link-hook` existir, ele será executado no final do wrapper do linker.
Esses hooks permitem que um usuário injete código nos wrappers.
Como exemplo, esses hooks podem ser usados para extrair `extraBefore`, `params` e `extraAfter`, que armazenam todos os argumentos de linha de comando passados para o compilador e o linker, respectivamente.
## Pureza em Nixpkgs {#sec-purity-in-nixpkgs}

*Medidas tomadas para prevenir dependências em pacotes fora do store, e o que você pode fazer para preveni-las.*

O GCC não procura em locais como `/usr/include`. Na verdade, tentativas de adicionar tais diretórios através da flag `-I` são filtradas. Da mesma forma, o linker (do GNU binutils) não procura em locais padrão como `/usr/lib`. Programas construídos no Linux são linkados contra uma GNU C Library que, da mesma forma, não procura nos locais padrão do sistema.

## Hardening em Nixpkgs {#sec-hardening-in-nixpkgs}

Existem flags disponíveis para reforçar a segurança (harden) de pacotes em tempo de compilação ou linkagem. Elas podem ser ativadas usando os parâmetros `hardeningDisable` e `hardeningEnable` de `stdenv.mkDerivation`.

Ambos os parâmetros aceitam uma lista de flags como strings. A flag especial `"all"` pode ser passada para `hardeningDisable` para desativar todo o hardening. Essas flags também podem ser usadas como variáveis de ambiente para fins de teste ou desenvolvimento.

Para informações mais aprofundadas sobre essas flags de hardening e hardening em geral, consulte a [Debian Wiki](https://wiki.debian.org/Hardening), [Ubuntu Wiki](https://wiki.ubuntu.com/Security/Features), [Gentoo Wiki](https://wiki.gentoo.org/wiki/Project:Hardened) e a [Arch Wiki](https://wiki.archlinux.org/title/Security).

Note que o suporte para algumas flags de hardening varia de acordo com o compilador, arquitetura da CPU, sistema operacional alvo e libc. Combinações que não suportam uma flag de hardening específica ignorarão silenciosamente as tentativas de habilitá-la. Para ver exatamente quais flags de hardening estão sendo empregadas em qualquer invocação, a variável de ambiente `NIX_DEBUG` pode ser usada.

### Flags de hardening habilitadas por padrão {#sec-hardening-flags-enabled-by-default}

As seguintes flags são habilitadas por padrão e podem exigir desativação com `hardeningDisable` se o programa a ser empacotado for incompatível.

#### `format` {#format}

Adiciona as opções de compilador `-Wformat -Wformat-security -Werror=format-security`. Atualmente, isso avisa sobre chamadas para funções `printf` e `scanf` onde a string de formato não é um literal de string e não há argumentos de formato, como em `printf(foo);`. Isso pode ser uma falha de segurança se a string de formato vier de uma entrada não confiável e contiver `%n`.

Isso precisa ser desativado ou corrigido para erros semelhantes a:

```
/tmp/nix-build-zynaddsubfx-2.5.2.drv-0/zynaddsubfx-2.5.2/src/UI/guimain.cpp:571:28: error: format not a string literal and no format arguments [-Werror=format-security]
         printf(help_message);
                            ^
cc1plus: some warnings being treated as errors
```

#### `stackprotector` {#stackprotector}

Adiciona as opções de compilador `-fstack-protector-strong --param ssp-buffer-size=4`. Isso adiciona verificações de segurança contra sobrescritas de pilha, transformando muitos ataques potenciais de injeção de código em situações de aborto. No melhor dos casos, isso transforma vulnerabilidades de injeção de código em negação de serviço ou em não-problemas (dependendo da aplicação).

Isso precisa ser desativado ou corrigido para erros semelhantes a:

```
bin/blib.a(bios_console.o): In function `bios_handle_cup':
/tmp/nix-build-ipxe-20141124-5cbdc41.drv-0/ipxe-5cbdc41/src/arch/i386/firmware/pcbios/bios_console.c:86: undefined reference to `__stack_chk_fail'
```

#### `fortify` {#fortify}

Adiciona as opções de compilador `-O2 -D_FORTIFY_SOURCE=2`. Durante a geração de código, o compilador conhece muitas informações sobre tamanhos de buffer (quando possível) e tenta substituir chamadas de função de buffer inseguras de comprimento ilimitado por chamadas de comprimento limitado. Isso é especialmente útil para código antigo e problemático. Além disso, strings de formato em memória gravável que contêm `%n` são bloqueadas. Se uma aplicação depender de tal string de formato, será necessário contornar o problema.

Além disso, alguns avisos são habilitados, o que pode desencadear falhas de compilação se os avisos do compilador forem tratados como erros na construção do pacote. Nesse caso, defina `env.NIX_CFLAGS_COMPILE` como `-Wno-error=warning-type`.

Isso precisa ser desativado ou corrigido para erros semelhantes a:

```
malloc.c:404:15: error: return type is an incomplete type
malloc.c:410:19: error: storage size of 'ms' isn't known

strdup.h:22:1: error: expected identifier or '(' before '__extension__'

strsep.c:65:23: error: register name not specified for 'delim'

installwatch.c:3751:5: error: conflicting types for '__open_2'

fcntl2.h:50:4: error: call to '__open_missing_mode' declared with attribute error: open with O_CREAT or O_TMPFILE in second argument needs 3 arguments
```

Desabilitar `fortify` implica a desabilitação de `fortify3`.

#### `fortify3` {#fortify3}

Adiciona as opções de compilador `-O2 -D_FORTIFY_SOURCE=3`. Isso expande os casos que podem ser protegidos por verificações de fortify para incluir algumas situações com buffers de comprimento dinâmico cujo comprimento pode ser inferido em tempo de execução usando dicas do compilador.

Habilitar esta flag implica a habilitação de `fortify`. Desabilitar esta flag não implica a desabilitação de `fortify`.

Esta flag pode, às vezes, entrar em conflito com as próprias tentativas de um sistema de construção de habilitar o suporte a fortify e resultar em erros reclamando sobre `redefinition of _FORTIFY_SOURCE`.

#### `pic` {#pic}

Adiciona as opções de compilador `-fPIC`. Esta opção adiciona suporte para código independente de posição em bibliotecas compartilhadas, tornando assim o ASLR possível.

Mais notavelmente, o kernel Linux, módulos do kernel e outros códigos que não são executados em um ambiente de sistema operacional, como boot loaders, não serão compilados com PIC habilitado. Na maioria dos casos, o compilador reclamará que o PIC não é suportado para uma construção específica.

Isso precisa ser desativado ou corrigido para erros de montador semelhantes a:

```
ccbLfRgg.s: Assembler messages:
ccbLfRgg.s:33: Error: missing or invalid displacement expression `private_key_len@GOTOFF'
```

#### `strictoverflow` {#strictoverflow}

O estouro de inteiro assinado é um comportamento indefinido de acordo com o padrão C. Se acontecer, é um erro no programa, pois ele deveria verificar o estouro antes que aconteça, e não depois. O GCC fornece funções embutidas para realizar aritmética com verificação de estouro, que são corretas e mais rápidas do que qualquer implementação personalizada. Como solução alternativa, a opção `-fno-strict-overflow` faz com que o gcc se comporte como se os estouros de inteiro assinado fossem definidos.

Esta flag não deve desencadear nenhum erro de compilação ou tempo de execução.

#### `relro` {#relro}

Adiciona a opção de linker `-z relro`. Durante o carregamento do programa, várias seções de memória ELF precisam ser escritas pelo linker, mas podem ser tornadas somente leitura antes de transferir o controle para o programa. Isso previne alguns ataques de sobrescrita de GOT (e .dtors), mas pelo menos a parte do GOT usada pelo linker dinâmico (.got.plt) ainda é vulnerável.

Esta flag pode quebrar o carregamento dinâmico de objetos compartilhados. Por exemplo, os sistemas de módulos do Xorg e OpenCV são incompatíveis com esta flag. Em quase todos os casos, a flag `bindnow` também deve ser desabilitada e programas incompatíveis geralmente falham com erros semelhantes em tempo de execução.

#### `bindnow` {#bindnow}

Adiciona a opção de linker `-z now`. Durante o carregamento do programa, todos os símbolos dinâmicos são resolvidos, permitindo que o GOT completo seja marcado como somente leitura (devido a `relro`). Isso previne ataques de sobrescrita de GOT. Para aplicações muito grandes, isso pode incorrer em alguma perda de desempenho durante o carregamento inicial enquanto os símbolos são resolvidos, mas isso não deve ser um problema para daemons.

Esta flag pode quebrar o carregamento dinâmico de objetos compartilhados. Por exemplo, os sistemas de módulos do Xorg e PHP são incompatíveis com esta flag. Programas incompatíveis com esta flag frequentemente falham em tempo de execução devido a símbolos ausentes, como:

```
intel_drv.so: undefined symbol: vgaHWFreeHWRec
```

#### `zerocallusedregs` {#zerocallusedregs}

Adiciona a opção de compilador `-fzero-call-used-regs=used-gpr`. Isso faz com que os registradores de propósito geral que a convenção de chamada de uma arquitetura considera "call-used" sejam zerados no retorno da função. Isso pode dificultar para os atacantes a construção de gadgets ROP úteis e também reduz a chance de vazamento de dados de uma chamada de função.

#### `stackclashprotection` {#stackclashprotection}

Esta flag adiciona a opção de compilador `-fstack-clash-protection`, que faz com que o crescimento da pilha de um programa acesse cada página sucessiva em ordem. Isso deve forçar o acesso à página de guarda e fazer com que uma tentativa de "saltar" sobre esta página de guarda cause uma falha.

#### `libcxxhardeningfast` {#libcxxhardeningfast}

Adiciona a flag de compilador `-D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_FAST`. Esta flag só tem efeito em alvos libc++, e quando definida, habilita um conjunto de asserções que previnem comportamento indefinido causado pela violação de pré-condições da biblioteca padrão. libc++ fornece vários modos de hardening, e este modo "fast" contém um conjunto de verificações de segurança críticas que podem ser feitas com relativamente pouca sobrecarga em tempo constante.

Desabilitar `libcxxhardeningfast` implica a desabilitação de verificações de `libcxxhardeningextensive`.

#### `strictflexarrays1` {#strictflexarrays1}

Esta flag adiciona a opção de compilador `-fstrict-flex-arrays=1`, que reduz os casos que o compilador trata como "arrays flexíveis" para aqueles declarados com comprimento `[1]`, `[0]` ou (o correto) `[]`. Isso aumenta a cobertura das verificações de fortify, porque tais arrays declarados como o elemento final de uma estrutura normalmente não podem ter seu comprimento pretendido determinado pelo compilador.

Habilitar esta flag em pacotes que ainda usam declarações de comprimento de arrays flexíveis >1 pode fazer com que o pacote falhe na compilação, citando acessos além dos limites de um array ou até mesmo trave em tempo de execução ao detectar um acesso a array como um "overrun". Poucos projetos ainda usam declarações de comprimento de arrays flexíveis >1.

Desabilitar `strictflexarrays1` implica a desabilitação de `strictflexarrays3`.

### Flags de hardening desabilitadas por padrão {#sec-hardening-flags-disabled-by-default}

As seguintes flags são desabilitadas por padrão e devem ser habilitadas com `hardeningEnable` para pacotes que recebem entrada não confiável, como serviços de rede.

#### `nostrictaliasing` {#nostrictaliasing}

Esta flag adiciona a opção de compilador `-fno-strict-aliasing`, que impede o compilador de assumir que o código foi escrito seguindo estritamente o padrão em relação ao aliasing de ponteiros e, portanto, de realizar otimizações que podem ser inseguras para código que não seguiu essas regras.

#### `strictflexarrays3` {#strictflexarrays3}

Esta flag adiciona a opção de compilador `-fstrict-flex-arrays=3`, que reduz os casos que o compilador trata como "arrays flexíveis" para apenas aqueles declarados com comprimento como (o correto) `[]`. Isso aumenta a cobertura das verificações de fortify, porque tais arrays declarados como o elemento final de uma estrutura normalmente não podem ter seu comprimento pretendido determinado pelo compilador.

Habilitar esta flag em pacotes que ainda usam declarações de comprimento não vazias para arrays flexíveis pode fazer com que o pacote falhe na compilação, citando acessos além dos limites de um array ou até mesmo trave em tempo de execução ao detectar um acesso a array como um "overrun". Muitos projetos ainda usam tais declarações de comprimento não vazias para arrays flexíveis.

Habilitar esta flag implica a habilitação de `strictflexarrays1`. Desabilitar esta flag não implica a desabilitação de `strictflexarrays1`.

#### `shadowstack` {#shadowstack}

Adiciona a opção de compilador `-fcf-protection=return`. Isso habilita o recurso Shadow Stack suportado por alguns processadores mais recentes, que mantém uma cópia inacessível ao usuário da pilha do programa contendo apenas endereços de retorno. Ao retornar de uma função, o processador compara o valor do endereço de retorno nas duas pilhas e lança um erro se eles não corresponderem, considerando-o um sinal de corrupção e possível adulteração. Isso deve aumentar significativamente a dificuldade dos ataques ROP.

Para que o Shadow Stack seja habilitado em tempo de execução, todo o código linkado em um processo deve ser construído com o Shadow Stack habilitado, então isso provavelmente só é útil para habilitar em larga escala, para que todas as dependências de um pacote também tenham o recurso habilitado.

Atualmente, isso é suportado apenas em alguns processadores Intel e AMD mais recentes como parte do conjunto de recursos Intel CET. No entanto, o código gerado deve continuar a funcionar em processadores mais antigos, que simplesmente omitirão qualquer uma dessas verificações.

Isso quebra alguns códigos que fazem gerenciamento avançado de pilha ou tratamento de exceções. Se habilitar esta flag de hardening, é importante testar o resultado em um sistema que tenha suporte CET conhecido e funcionando, para que qualquer quebra possa ser descoberta.

#### `trivialautovarinit` {#trivialautovarinit}

Adiciona a opção de compilador `-ftrivial-auto-var-init=pattern`. Variáveis não inicializadas geralmente assumem seus valores com base em fragmentos de estados anteriores do programa, e atacantes podem manipular cuidadosamente esse estado para criar valores iniciais maliciosos para essas variáveis. Esta flag faz com que variáveis de pilha não inicializadas "trivialmente inicializáveis" sejam forçadamente inicializadas com um valor diferente de zero que provavelmente causará uma falha (e, portanto, será notado).

O uso desta flag é controverso, pois pode impedir que ferramentas que detectam o uso de variáveis não inicializadas (como o valgrind) funcionem corretamente.

Isso deve ser desativado ou corrigido para erros de compilação como:

```
sorry, unimplemented: __builtin_clear_padding not supported for variable length aggregates
```

#### `glibcxxassertions` {#glibcxxassertions}

Adiciona a flag de compilador `-D_GLIBCXX_ASSERTIONS`. Esta flag só tem efeito em alvos libstdc++, e quando definida, habilita verificações de erro extras na forma de asserções de pré-condição, como verificação de limites em strings c++ e verificações de ponteiro nulo ao desreferenciar smart pointers c++.

Essas verificações podem ter um impacto no desempenho em alguns casos.

#### `libcxxhardeningextensive` {#libcxxhardeningextensive}

Adiciona a flag de compilador `-D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_EXTENSIVE`. Esta flag só tem efeito em alvos libc++, e quando definida, habilita um conjunto de asserções que previnem comportamento indefinido causado pela violação de pré-condições da biblioteca padrão. libc++ fornece vários modos de hardening, e este modo "extensive" adiciona verificações para comportamento indefinido que incorrem em relativamente pouca sobrecarga, mas não são críticas para a segurança. O rigor adicional impacta o desempenho mais do que o modo rápido: é recomendado fazer benchmarking para determinar se é aceitável para uma aplicação específica.

Habilitar esta flag implica a habilitação de verificações de `libcxxhardeningfast`. Desabilitar esta flag não implica a desabilitação de verificações de `libcxxhardeningfast`.

#### `pacret` {#pacret}

Esta flag adiciona a opção de compilador `-mbranch-protection=pac-ret` em alvos aarch64-linux. Isso usa o recurso Pointer Authentication do ARM v8.3 para assinar ponteiros de retorno de função antes de adicioná-los à pilha. A autenticidade do ponteiro é então validada antes de retornar ao seu destino. Isso aumenta drasticamente a dificuldade das técnicas de exploração ROP.

Isso pode causar problemas com código que faz manipulação avançada de pilha, e ferramentas de depuração/desempilhamento precisam ser compatíveis com pac-ret para funcionar corretamente quando esses recursos estão em operação.

Processadores anteriores ao ARM v8.3 ignorarão as instruções de Pointer Authentication, então o código construído com esta flag continuará a funcionar em processadores mais antigos, embora sem nenhuma das proteções pretendidas. Se habilitar esta flag, é recomendado garantir que os pacotes resultantes sejam testados em um sistema Linux ARM v8.3+ com suporte a Pointer Authentication conhecido e funcionando, para que qualquer quebra causada por este recurso seja realmente detectada.

[^footnote-stdenv-ignored-build-platform]: A plataforma de construção é ignorada porque é um mero detalhe de implementação do pacote que satisfaz a dependência: Como princípio geral de programação, as dependências são sempre *especificadas* como interfaces, não como implementação concreta.
[^footnote-stdenv-native-dependencies-in-path]: Atualmente, isso significa que para construções nativas todas as dependências são colocadas no `PATH`. Mas no futuro isso pode não ser o caso para fins de correspondência cruzada: as plataformas seriam assumidas como únicas para construções nativas e cruzadas, então apenas `depsBuild*` e `nativeBuildInputs` seriam adicionados ao `PATH`.
[^footnote-stdenv-propagated-dependencies]: O próprio Nix já leva em consideração as dependências transitivas de um pacote, mas essa propagação garante que a infraestrutura específica do nixpkgs, como [setup hooks](#ssec-setup-hooks), também seja executada como se fosse uma dependência propagada.
[^footnote-stdenv-find-inputs-location]: A função `findInputs`, atualmente residindo em `pkgs/stdenv/generic/setup.sh`, implementa a lógica de propagação.
[^footnote-stdenv-sys-lib-search-path]: Ela limpa as variáveis `sys_lib_*search_path` no script Libtool para evitar que o Libtool use bibliotecas em `/usr/lib` e similares.
[^footnote-stdenv-build-time-guessing-impurity]: Eventualmente, estes também serão passados na construção nativa, para melhorar o determinismo: a adivinhação em tempo de construção, como é feita hoje, é um risco de impureza.
[^footnote-stdenv-per-platform-wrapper]: Cada wrapper visa uma única plataforma, então se binários para múltiplas plataformas forem necessários, os binários subjacentes devem ser empacotados (wrapped) múltiplas vezes. Como esta é uma propriedade do próprio wrapper, os múltiplos empacotamentos são necessários, independentemente de os mesmos binários subjacentes poderem ou não ter como alvo múltiplas plataformas.