# Testadores {#chap-testers}

Este capítulo descreve vários *builders* de teste que estão disponíveis no *namespace* `testers`.

## `hasPkgConfigModules` {#tester-hasPkgConfigModules}

<!-- Old anchor name so links still work -->
[]{#tester-hasPkgConfigModule}
Verifica se um pacote expõe uma determinada lista de módulos `pkg-config`.
Se o argumento `moduleNames` for omitido, `hasPkgConfigModules` usará `meta.pkgConfigModules`.

:::{.example #ex-haspkgconfigmodules-defaultvalues}

# Verifica se os módulos `pkg-config` são expostos usando valores padrão

```nix
{
  passthru.tests.pkg-config = testers.hasPkgConfigModules { package = finalAttrs.finalPackage; };

  meta.pkgConfigModules = [ "libfoo" ];
}
```

:::

:::{.example #ex-haspkgconfigmodules-explicitmodules}

# Verifica se os módulos `pkg-config` são expostos usando nomes de módulos explícitos

```nix
{
  passthru.tests.pkg-config = testers.hasPkgConfigModules {
    package = finalAttrs.finalPackage;
    moduleNames = [ "libfoo" ];
  };
}
```

:::

## `hasCmakeConfigModules` {#tester-hasCmakeConfigModules}

Verifica se um pacote expõe uma determinada lista de módulos `*config.cmake`.
Observe que os `moduleNames` usados em `cmake find_package` diferenciam maiúsculas de minúsculas.

:::{.example #ex-hascmakeconfigmodules}

# Verifica se os módulos `*config.cmake` são expostos usando nomes de módulos explícitos

```nix
{
  passthru.tests.cmake-config = testers.hasCmakeConfigModules {
    package = finalAttrs.finalPackage;
    moduleNames = [ "Foo" ];
  };
}
```

:::

## `lycheeLinkCheck` {#tester-lycheeLinkCheck}

Verifica os links de um site estático empacotado com o pacote [`lychee`](https://search.nixos.org/packages?show=lychee&type=packages&query=lychee).

Você pode usar Nix para construir sites estáticos de forma reprodutível, como para documentação de software.
Alguns pacotes instalarão a documentação em suas saídas `out` ou `doc`, ou talvez você tenha um pacote dedicado onde tornou seu site estático reprodutível executando um gerador, como [Hugo](https://gohugo.io/) ou [mdBook](https://rust-lang.github.io/mdBook/), em uma *derivation*.

Se você tem um site estático que pode ser construído com Nix, você pode usar `lycheeLinkCheck` para verificar se os hiperlinks em seu site estão corretos, e fazer isso como parte do seu fluxo de trabalho Nix e CI.

:::{.example #ex-lycheelinkcheck}

# Verifica hiperlinks na documentação do `nix`

```nix
testers.lycheeLinkCheck { site = nix.doc + "/share/doc/nix/manual"; }
```

:::

### Valor de retorno {#tester-lycheeLinkCheck-return}

Este *tester* produz um pacote que não gera saídas úteis, mas só é bem-sucedido se os hiperlinks em seu site estiverem corretos. O log de *build* listará os links quebrados.

Ele possui dois modos:

- Construir a *derivation* retornada; seu processo de *build* verificará se os hiperlinks internos estão corretos. Isso é executado na *sandbox*, então não verificará hiperlinks externos, mas é rápido e confiável.

- Invocar o atributo `.online` com [`nix run`](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-run) ([experimental](https://nixos.org/manual/nix/stable/contributing/experimental-features#xp-feature-nix-command)). Isso é executado fora da *sandbox* e verifica se os hiperlinks internos e externos estão corretos.
  Exemplo:

  ```shell
  nix run nixpkgs#lychee.tests.ok.online
  ```

### Entradas {#tester-lycheeLinkCheck-inputs}

`site` (caminho ou *derivation*) {#tester-lycheeLinkCheck-param-site}

: O caminho para os arquivos a serem verificados.

`remap` (*attribute set*, opcional) {#tester-lycheeLinkCheck-param-remap}

: Um *attribute set* onde os nomes dos atributos são expressões regulares.
  Os valores devem ser *strings*, *derivations* ou valores de caminho.

  Na configuração padrão da verificação retornada, URLs externas são verificadas apenas quando você executa o atributo `.online`.

  Ao adicionar remapeamentos, você pode verificar *offline* se as URLs para recursos externos estão corretas, fornecendo um substituto do sistema de arquivos.

  Antes de verificar a existência de uma URL, as expressões regulares são correspondidas e substituídas pelos seus valores correspondentes.

  Exemplo:

  ```nix
  {
    "https://nix\\.dev/manual/nix/[a-z0-9.-]*" = "${nix.doc}/share/doc/nix/manual";
    "https://nixos\\.org/manual/nix/(un)?stable" =
      "${emptyDirectory}/placeholder-to-disallow-old-nix-docs-urls";
  }
  ```

  Caminhos de *store* nos valores dos atributos são automaticamente prefixados com `file://`, porque `lychee` exige isso para caminhos no sistema de arquivos.
  Se isso for um problema, ou se você precisar controlar a ordem em que as substituições são realizadas, use `extraConfig.remap` em vez disso.

`extraConfig` (*attribute set*) {#tester-lycheeLinkCheck-param-extraConfig}

: Configuração extra para passar para `lychee` em seu [arquivo de configuração](https://github.com/lycheeverse/lychee/blob/master/lychee.example.toml).
  É automaticamente [traduzido](https://nixos.org/manual/nixos/stable/index.html#sec-settings-nix-representable) para TOML.

  Exemplo: `{ "include_verbatim" = true; }`

`extraArgs` (lista de *strings*, opcional) {#tester-lycheeLinkCheck-param-extraArgs}

: Argumentos de linha de comando extras para passar para a invocação de `lychee`.
  Estes são passados tanto nos modos *offline* (*build*) quanto [`online`](#tester-lycheeLinkCheck-return).

  Exemplo: `[ "--format" "json" ]`

`lychee` (*derivation*, opcional) {#tester-lycheeLinkCheck-param-lychee}

: O pacote `lychee` a ser usado.

## `shellcheck` {#tester-shellcheck}

Executa arquivos através de `shellcheck`, uma ferramenta de análise estática para *scripts* de *shell*, falhando se houver algum problema.

:::{.example #ex-shellcheck}
# Executa `testers.shellcheck`

Um único script

```nix
testers.shellcheck {
  name = "script";
  src = ./script.sh;
}
```

Múltiplos arquivos

```nix
let
  inherit (lib) fileset;
in
testers.shellcheck {
  name = "nixbsd-activate";
  src = fileset.toSource {
    root = ./.;
    fileset = fileset.unions [
      ./lib.sh
      ./nixbsd-activate
    ];
  };
}
```

:::

### Entradas {#tester-shellcheck-inputs}

`name` (*string*, opcional)
: O nome do teste.
  `name` será obrigatório em um ponto futuro porque melhora massivamente a rastreabilidade das falhas de teste, mas é mantido opcional por enquanto para evitar quebrar usos existentes.
  O padrão é `run-shellcheck`.
  O nome da *derivation* produzida pelo *tester* é `shellcheck-${name}` quando `name` é fornecido.

`src` (tipo caminho)
: O caminho para o(s) *script*(s) de *shell* a serem verificados.
  Pode ser um único arquivo ou um diretório contendo arquivos de *shell*.
  Todos os arquivos em `src` serão verificados, então você pode querer fornecer uma fonte baseada em `fileset` em vez de um diretório inteiro.

### Valor de retorno {#tester-shellcheck-return}

Uma *derivation* que executa `shellcheck` no(s) *script*(s) fornecido(s), produzindo uma saída vazia se nenhum problema for encontrado.
O *build* falhará se `shellcheck` encontrar algum problema.

## `shfmt` {#tester-shfmt}

Executa arquivos através de `shfmt`, um formatador de *scripts* de *shell*, falhando se algum arquivo for reformatado.

:::{.example #ex-shfmt}
# Executa `testers.shfmt`

Um único script

```nix
testers.shfmt {
  name = "script";
  src = ./script.sh;
}
```

Múltiplos arquivos

```nix
let
  inherit (lib) fileset;
in
testers.shfmt {
  name = "nixbsd";
  src = fileset.toSource {
    root = ./.;
    fileset = fileset.unions [
      ./lib.sh
      ./nixbsd-activate
    ];
  };
}
```

:::

### Entradas {#tester-shfmt-inputs}

`name` (*string*)
: O nome do teste.
  `name` é obrigatório porque melhora massivamente a rastreabilidade das falhas de teste.
  O nome da *derivation* produzida pelo *tester* é `shfmt-${name}`.

`src` (tipo caminho)
: O caminho para o(s) *script*(s) de *shell* a serem verificados.
  Pode ser um único arquivo ou um diretório contendo arquivos de *shell*.
  Todos os arquivos em `src` serão verificados, então você pode querer fornecer uma fonte baseada em `fileset` em vez de um diretório inteiro.

`indent` (*inteiro*, opcional)
: O número de espaços a serem usados para indentação.
  O padrão é `2`.
  Um valor de `0` indenta com tabulações.

### Valor de retorno {#tester-shfmt-return}

Uma *derivation* que executa `shfmt` no(s) *script*(s) fornecido(s), produzindo uma saída vazia em caso de sucesso.
O *build* falhará se `shfmt` reformatar algo.

## `testVersion` {#tester-testVersion}

Verifica se a saída da execução de um comando contém a *string* de versão especificada como uma palavra inteira.

NOTA: Esta é uma verificação que você adiciona a `passthru.tests`, que é executada principalmente por OfBorg, mas não em Hydra. Se você deseja que uma falha na verificação de versão bloqueie o *build* completamente, então [`versionCheckHook`](#versioncheckhook) é a ferramenta que você procura (e é recomendada para *builds* rápidos). A motivação para adicionar qualquer uma dessas verificações seria:

- Capturar erros de *dynamic linking* e variáveis de ambiente ausentes que deveriam ser adicionadas por *wrapping*.
- Proteção provável contra a construção acidental da versão errada, por exemplo, ao usar um *hash* "antigo" em uma *fixed-output derivation*.

Por padrão, o comando a ser executado será inferido do atributo `package` fornecido:
ele verificará `meta.mainProgram` primeiro, e recorrerá a `pname` ou `name`.
O argumento padrão para o comando é `--version`, e a versão a ser verificada também será inferida do atributo `package` fornecido.

:::{.example #ex-testversion-hello}

# Verifica a versão de um programa usando todos os valores padrão

Este exemplo executará o comando `hello --version`, e então verificará se a versão do pacote `hello` está na saída do comando.

```nix
{ passthru.tests.version = testers.testVersion { package = hello; }; }
```

:::

:::{.example #ex-testversion-different-commandversion}

# Verifica a versão do programa usando um comando especificado e uma string de versão esperada

Este exemplo executará o comando `leetcode -V`, e então verificará se `leetcode 0.4.2` está na saída do comando como uma palavra inteira (separada por espaços em branco).
Isso significa que uma saída como "leetcode 0.4.21" falharia nos testes, e uma saída como "You're running leetcode 0.4.2" passaria nos testes.

Um uso comum do atributo `version` é especificar `version = "v${version}"`.

```nix
{
  version = "0.4.2";

  passthru.tests.version = testers.testVersion {
    package = leetcode-cli;
    command = "leetcode -V";
    version = "leetcode ${version}";
  };
}
```

:::

## `testBuildFailure` {#tester-testBuildFailure}

Garante que um *build* não seja bem-sucedido. Isso é útil para testar *testers*.

Isso retorna uma *derivation* com uma sobrescrita no *builder*, com os seguintes efeitos:

 - Falha o *build* quando o *builder* original é bem-sucedido
 - Move `$out` para `$out/result`, se existir (assumindo que `out` é a saída padrão)
 - Salva o log de *build* em `$out/testBuildFailure.log` (o mesmo)

Embora `testBuildFailure` seja projetado para manter as alterações no ambiente do *builder* original ao mínimo, algumas pequenas alterações são inevitáveis:

 - O arquivo `$TMPDIR/testBuildFailure.log` está presente. Ele não deve ser excluído.
 - `stdout` e `stderr` são um *pipe* em vez de um *tty*. Isso poderia ser melhorado.
 - Um ou dois processos extras estão presentes na *sandbox* durante a execução do *builder* original.
 - Os *hashes* da *derivation* e da saída são diferentes, mas não incomuns.
 - A *derivation* inclui uma dependência em `buildPackages.bash` e `expect-failure.sh`, que é construído para incluir uma dependência transitiva em `buildPackages.coreutils` e possivelmente mais.
   Estes não são adicionados a `PATH` ou a qualquer outra variável de ambiente, então devem ser difíceis de observar.

:::{.example #ex-testBuildFailure-showingenvironmentchanges}

# Verifica se um build falha e as alterações feitas durante o build

```nix
runCommand "example"
  {
    failed = testers.testBuildFailure (
      runCommand "fail" { } ''
        echo ok-ish >$out
        echo failing though
        exit 3
      ''
    );
  }
  ''
    grep -F 'ok-ish' $failed/result
    grep -F 'failing though' $failed/testBuildFailure.log
    [[ 3 = $(cat $failed/testBuildFailure.exit) ]]
    touch $out
  ''
```

:::

## `testBuildFailure'` {#tester-testBuildFailurePrime}

Este *tester* encapsula a funcionalidade fornecida por [`testers.testBuildFailure`](#tester-testBuildFailure) para facilitar a escrita de verificações, simplificando a checagem do código de saída do *builder* e a afirmação da existência de entradas no log do *builder*.
Além disso, os usuários podem especificar um *script* contendo verificações adicionais, acessando o resultado da aplicação de `testers.testBuildFailure` através da variável `failed`.

NOTA: Este *tester* produzirá uma saída vazia e sairá com sucesso se nenhuma das verificações falhar; não há necessidade de `touch "$out"` no `script`.

:::{.example #ex-testBuildFailurePrime-doc-example}

# Verifica se um build falha e as alterações feitas durante o build

Reutilizando o exemplo de [`testers.testBuildFailure`](#ex-testBuildFailure-showingenvironmentchanges), podemos ver como as verificações comuns são facilitadas e eliminam a necessidade de `runCommand`:

```nix
testers.testBuildFailure' {
  drv = runCommand "doc-example" { } ''
    echo ok-ish >"$out"
    echo failing though
    exit 3
  '';
  expectedBuilderExitCode = 3;
  expectedBuilderLogEntries = [ "failing though" ];
  script = ''
    grep --silent -F 'ok-ish' "$failed/result"
  '';
}
```

:::

### Entradas {#tester-testBuildFailurePrime-inputs}

`drv` (*derivation*)

: A *derivation* com falha a ser encapsulada com `testBuildFailure`.

`name` (*string*, opcional)

: O nome do teste.
  Quando não fornecido, este valor padrão é `testBuildFailure-${(testers.testBuildFailure drv).name}`.

`expectedBuilderExitCode` (*inteiro*, opcional)

: O código de saída esperado do *builder* de `drv`.
  Quando não fornecido, este valor padrão é `1`.

`expectedBuilderLogEntries` (*array* de valores tipo *string*, opcional)

: Uma lista de valores tipo *string* que devem ser encontrados no log do *builder* por correspondência exata.
  Quando não fornecido, este valor padrão é `[ ]`.

  NOTA: Padrões e expressões regulares não são suportados.

`script` (*string*, opcional)

: Uma *string* contendo verificações adicionais a serem executadas.
  Quando não fornecido, este valor padrão é `""`.
  O resultado de `testers.testBuildFailure drv` está disponível através da variável `failed`.
  Como exemplo, o log do *builder* está em `"$failed/testBuildFailure.log"`.

### Valor de retorno {#tester-testBuildFailurePrime-return}

O *tester* produz uma saída vazia e só é bem-sucedido quando as verificações usando `expectedBuilderExitCode`, `expectedBuilderLogEntries` e `script` são bem-sucedidas.
O log de *build* conterá as diferenças encontradas.

## `testEqualContents` {#tester-testEqualContents}

Verifica se dois caminhos têm o mesmo conteúdo.

`assertion` (*string*)

: Uma mensagem que é impressa antes da comparação, após `Checking:`.

`expected` (caminho ou valor coercível para *store path*)

: O caminho para o conteúdo esperado do [objeto do sistema de arquivos]

`actual` (valor coercível para *store path*) <!-- path value is possible, but wrong in practice, but let's not bother readers with our predictions -->

: O caminho para o conteúdo real do objeto do sistema de arquivos a ser verificado

`postFailureMessage` (*string*)

: Uma mensagem que é impressa por último se o conteúdo do objeto do sistema de arquivos nos dois caminhos não corresponder exatamente.

`checkMetadata` (*booleano*)

: Se deve falhar em diferenças de metadados, como permissões ou propriedade.
  O padrão é `true`.

:::{.example #ex-testEqualContents-toyexample}

# Verifica se dois caminhos têm o mesmo conteúdo

```nix
testers.testEqualContents {
  assertion = "sed -e performs replacement";
  expected = writeText "expected" ''
    foo baz baz
  '';
  actual =
    runCommand "actual"
      {
        # not really necessary for a package that's in stdenv
        nativeBuildInputs = [ gnused ];
        base = writeText "base" ''
          foo bar baz
        ';
      }
      ''
        sed -e 's/bar/baz/g' $base >$out
      '';
  # if applicable
  postFailureMessage = ''
    The bar-baz replacer produced an unexpected result.
    If the new behavior is acceptable and validated against the bar-baz specification, run ./adopt-new-bar-baz-result.sh to adjust this test and require the new behavior.
  '';
}
```

:::

## `testEqualArrayOrMap` {#tester-testEqualArrayOrMap}

Verifica se *arrays* Bash (incluindo *arrays* associativos, referidos como "mapas") são preenchidos corretamente.

Isso pode ser usado para garantir que os *setup hooks* sejam registrados em uma determinada ordem, ou para escrever testes de unidade para funções de *shell* que transformam *arrays*.

:::{.example #ex-testEqualArrayOrMap-test-function-add-cowbell}

# Testa uma função que anexa um valor a um array

```nix
testers.testEqualArrayOrMap {
  name = "test-function-add-cowbell";
  valuesArray = [
    "cowbell"
    "cowbell"
  ];
  expectedArray = [
    "cowbell"
    "cowbell"
    "cowbell"
  ];
  script = ''
    addCowbell() {
      local -rn arrayNameRef="$1"
      arrayNameRef+=( "cowbell" )
    }

    nixLog "appending all values in valuesArray to actualArray"
    for value in "''${valuesArray[@]}"; do
      actualArray+=( "$value" )
    done

    nixLog "applying addCowbell"
    addCowbell actualArray
  '';
}
```

:::

### Entradas {#tester-testEqualArrayOrMap-inputs}

NOTA: Internamente, este *tester* usa `__structuredAttrs` para lidar com a serialização entre expressões Nix e variáveis de *shell*.
Isso impõe a restrição de que *arrays* e "mapas" devem ter valores tipo *string*.

NOTA: Pelo menos um de `expectedArray` e `expectedMap` deve ser fornecido.

`name` (*string*)

: O nome do teste.

`script` (*string*)

: A única tarefa de `script` é preencher `actualArray` ou `actualMap` (pode preencher ambos).
  Para fazer isso, `script` pode acessar as seguintes variáveis de *shell*:

  - `valuesArray` (disponível quando `valuesArray` é fornecido ao *tester*)
  - `valuesMap` (disponível quando `valuesMap` é fornecido ao *tester*)
  - `actualArray` (disponível quando `expectedArray` é fornecido ao *tester*)
  - `actualMap` (disponível quando `expectedMap` é fornecido ao *tester*)

  Embora `expectedArray` e `expectedMap` estejam no escopo durante a execução de `script`, eles *não devem* ser acessados ou modificados de dentro de `script`.

`valuesArray` (*array* de valores tipo *string*, opcional)

: Um *array* de valores tipo *string*.
  Este *array* pode ser usado dentro de `script`.

`valuesMap` (*attribute set* de valores tipo *string*, opcional)

: Um *attribute set* de valores tipo *string*.
  Este *attribute set* pode ser usado dentro de `script`.

`expectedArray` (*array* de valores tipo *string*, opcional)

: Um *array* de valores tipo *string*.
  Este *array* *não deve* ser acessado ou modificado de dentro de `script`.
  Quando fornecido, espera-se que `script` preencha `actualArray`.

`expectedMap` (*attribute set* de valores tipo *string*, opcional)

: Um *attribute set* de valores tipo *string*.
  Este *attribute set* *não deve* ser acessado ou modificado de dentro de `script`.
  Quando fornecido, espera-se que `script` preencha `actualMap`.

### Valor de retorno {#tester-testEqualArrayOrMap-return}

O *tester* produz uma saída vazia e só é bem-sucedido quando `expectedArray` e `expectedMap` correspondem a `actualArray` e `actualMap`, respectivamente, quando não nulos.
O log de *build* conterá as diferenças encontradas.

## `testEqualDerivation` {#tester-testEqualDerivation}

Verifica se dois pacotes produzem as mesmas instruções de *build*.

Isso pode ser usado para garantir que uma certa diferença de configuração, como a presença de um *overlay*, não cause uma falha de *cache*.

Quando as *derivations* são iguais, o valor de retorno é um arquivo vazio.
Caso contrário, o log de *build* explica a diferença via `nix-diff`.

:::{.example #ex-testEqualDerivation-hello}

# Verifica se dois pacotes produzem a mesma derivation

```nix
testers.testEqualDerivation "The hello package must stay the same when enabling checks." hello (
  hello.overrideAttrs (o: {
    doCheck = true;
  })
)
```

:::

## `invalidateFetcherByDrvHash` {#tester-invalidateFetcherByDrvHash}

Usa o *hash* da *derivation* para invalidar a saída via nome, para testes.

Tipo: `(a@{ name, ... } -> Derivation) -> a -> Derivation`

Normalmente, *fixed output derivations* podem e devem ser armazenadas em *cache* apenas pelo seu *hash* de saída, mas para testes queremos buscar novamente toda vez que o *fetcher* mudar.

Alterações no *fetcher* tornam-se aparentes no `drvPath`, que é um *hash* de como buscar, em vez de um *store path* fixo.
Ao inserir este *hash* no nome, podemos garantir que o *fetcher* seja executado novamente toda vez que ele mudar.

Isso se baseia na suposição de que Nix não é inteligente o suficiente para reutilizar seu banco de dados de conteúdos de *store* local para otimizar a busca.

Você pode notar que o nome "salgado" deriva da invocação normal, não da *derivation* final.
`invalidateFetcherByDrvHash` precisa invocar a função *fetcher* duas vezes:
uma vez para obter um *hash* de *derivation*, e novamente para produzir a *fixed output derivation* final.

:::{.example #ex-invalidateFetcherByDrvHash-nix}

# Impede que nix reutilize a saída de um fetcher

```nix
{
  tests.fetchgit = testers.invalidateFetcherByDrvHash fetchgit {
    name = "nix-source";
    url = "https://github.com/NixOS/nix";
    rev = "9d9dbe6ed05854e03811c361a3380e09183f4f4a";
    hash = "sha256-7DszvbCNTjpzGRmpIVAWXk20P0/XTrWZ79KSOGLrUWY=";
  };
}
```

:::

## `runCommand` {#tester-runCommand}

`runCommand :: { name, script, stdenv ? stdenvNoCC, hash ? "...", ... } -> Derivation`

Este é um *wrapper* em torno de `pkgs.runCommandWith`, que
- produz uma *fixed-output derivation*, permitindo que o(s) comando(s) acesse(m) a rede;
- salga o nome da *derivation* com base em suas entradas, garantindo que o comando seja executado novamente sempre que as entradas mudarem.

Ele aceita os seguintes atributos:
- o `name` da *derivation*;
- o `script` a ser executado;
- `stdenv`, o ambiente a ser usado, com padrão `stdenvNoCC`;
- o `hash` de saída da *derivation*, com padrão para o do arquivo vazio.
  O `outputHashMode` da *derivation* é definido por padrão como recursivo, então o `script` também pode gerar um diretório.

Todos os outros atributos são passados para [`mkDerivation`](#sec-using-stdenv),
incluindo `nativeBuildInputs` para especificar dependências disponíveis para o `script`.

:::{.example #ex-tester-runCommand-nix}

# Executa um comando com acesso à rede

```nix
testers.runCommand {
  name = "access-the-internet";
  script = ''
    curl -o /dev/null https://example.com
    touch $out
  '';
  nativeBuildInputs = with pkgs; [
    cacert
    curl
  ];
}
```

:::

## `runNixOSTest` {#tester-runNixOSTest}

Uma função auxiliar que se comporta exatamente como o `runTest` do NixOS, exceto que também atribui este conjunto de pacotes Nixpkgs como os `pkgs` do teste e torna as opções `nixpkgs.*` somente leitura.

Se o seu teste faz parte do repositório Nixpkgs, ou se você precisa de um ponto de entrada mais geral, consulte ["Calling a test" no manual do NixOS](https://nixos.org/manual/nixos/stable/index.html#sec-calling-nixos-tests).

:::{.example #ex-runNixOSTest-hello}

# Executa um teste NixOS usando `runNixOSTest`

```nix
pkgs.testers.runNixOSTest (
  { lib, ... }:
  {
    name = "hello";
    nodes.machine =
      { pkgs, ... }:
      {
        environment.systemPackages = [ pkgs.hello ];
      };
    testScript = ''
      machine.succeed("hello")
    '';
  }
)
```

:::

## `nixosTest` {#tester-nixosTest}

Executa um teste de rede de VM NixOS usando esta avaliação de Nixpkgs.

NOTA: Esta função é principalmente para uso externo. O próprio NixOS usa `make-test-python.nix` diretamente. Pacotes definidos em Nixpkgs [reutilizam testes NixOS via `nixosTests`, no plural](#ssec-nixos-tests-linking).

É principalmente equivalente à função `import ./make-test-python.nix` do [manual do NixOS](https://nixos.org/nixos/manual/index.html#sec-nixos-tests), exceto que a aplicação atual de Nixpkgs (`pkgs`) será usada, em vez de deixar o NixOS invocar Nixpkgs novamente.

Se uma máquina de teste precisar definir opções NixOS sob `nixpkgs`, ela deve definir apenas a opção `nixpkgs.pkgs`.

### Parâmetro {#tester-nixosTest-parameter}

Uma [rede de teste de VM NixOS](https://nixos.org/nixos/manual/index.html#sec-nixos-tests), ou caminho para ela. Exemplo:

```nix
{
  name = "my-test";
  nodes = {
    machine1 =
      {
        lib,
        pkgs,
        nodes,
        ...
      }:
      {
        environment.systemPackages = [ pkgs.hello ];
        services.foo.enable = true;
      };
    # machine2 = ...;
  };
  testScript = ''
    start_all()
    machine1.wait_for_unit("foo.service")
    machine1.succeed("hello | foo-send")
  '';
}
```

### Resultado {#tester-nixosTest-result}

Uma *derivation* que executa o teste da VM.

Atributos notáveis:

 * `nodes`: as configurações NixOS avaliadas. Útil para depuração e exploração da configuração.

 * `driverInteractive`: um *script* que inicia uma sessão interativa Python no contexto do `testScript`.

[objeto do sistema de arquivos]: https://nix.dev/manual/nix/latest/store/file-system-object
