# Auxiliares de construção triviais {#chap-trivial-builders}

Nixpkgs oferece uma variedade de funções wrapper que ajudam a construir derivations comumente úteis.
Assim como [`stdenv.mkDerivation`](#sec-using-stdenv), cada um desses auxiliares de construção cria uma derivation, mas os argumentos passados são diferentes (geralmente mais simples) daqueles exigidos por `stdenv.mkDerivation`.


## `runCommandWith` {#trivial-builder-runCommandWith}

A função `runCommandWith` retorna uma derivation construída usando o(s) comando(s) especificado(s), em um ambiente especificado.

É a função base subjacente de todas as [`runCommand*` variants].
O comportamento geral é controlado através de um único conjunto de atributos passado
como o primeiro argumento, e permite especificar `stdenv` livremente.

As seguintes [`runCommand*` variants] existem: `runCommand`, `runCommandCC`, e `runCommandLocal`.

[`runCommand*` variants]: #trivial-builder-runCommand

### Tipo {#trivial-builder-runCommandWith-Type}

```
runCommandWith :: {
  name :: name;
  stdenv? :: Derivation;
  runLocal? :: Bool;
  derivationArgs? :: { ... };
} -> String -> Derivation
```

### Entradas {#trivial-builder-runCommandWith-Inputs}

`name` (String)
:   O nome da derivation, que o Nix anexará ao store path; veja [`mkDerivation`](#sec-using-stdenv).

`runLocal` (Boolean)
:   Se definido como `true`, isso força a derivation a ser construída localmente, não usando [substitutes] nem construções remotas.
    Isso é destinado a comandos muito baratos (<1s de tempo de execução) que podem ser acelerados evitando a(s) viagem(ns) de ida e volta da rede.
    Seu efeito é definir [`preferLocalBuild = true`][preferLocalBuild] e [`allowSubstitutes = false`][allowSubstitutes].

   ::: {.note}
   Isso impede o uso de [substituters], então defina `runLocal` (ou use `runCommandLocal`) apenas quando tiver certeza de que o usuário
   sempre terá um builder para o `system` da derivation. Isso deve ser verdade para a maioria dos casos de uso triviais
   (por exemplo, apenas copiar alguns arquivos para um local diferente ou adicionar symlinks) porque o `system`
   geralmente é o mesmo que `builtins.currentSystem`.
   :::

`stdenv` (Derivation)
:   O [ambiente padrão](#chap-stdenv) a ser usado, com padrão para `pkgs.stdenv`.

`derivationArgs` (Conjunto de atributos)
:   Argumentos adicionais para [`mkDerivation`](#sec-using-stdenv).

`buildCommand` (String)
:   Comandos shell a serem executados no builder da derivation.

    ::: {.note}
    Você precisa criar um arquivo ou diretório `$out` para que o Nix consiga executar o builder com sucesso.
    :::

[allowSubstitutes]: https://nix.dev/manual/nix/latest/language/advanced-attributes.html#adv-attr-allowSubstitutes
[preferLocalBuild]: https://nix.dev/manual/nix/latest/language/advanced-attributes.html#adv-attr-preferLocalBuild
[substituter]: https://nix.dev/manual/nix/latest/glossary#gloss-substituter
[substitutes]: https://nix.dev/manual/nix/latest/glossary#gloss-substitute

::: {.example #ex-runcommandwith}
# Invocação de `runCommandWith`

```nix
runCommandWith
  {
    name = "example";
    derivationArgs.nativeBuildInputs = [ cowsay ];
  }
  ''
    cowsay > $out <<EOMOO
    'runCommandWith' is a bit cumbersome,
    so we have more ergonomic wrappers.
    EOMOO
  ''
```

:::


## `runCommand` e `runCommandCC` {#trivial-builder-runCommand}

A função `runCommand` retorna uma derivation construída usando o(s) comando(s) especificado(s), no ambiente `stdenvNoCC`.

`runCommandCC` é similar, mas usa o ambiente do compilador padrão. Para minimizar as dependências, `runCommandCC`
deve ser usado apenas quando o comando de construção precisar de um compilador C.

`runCommandLocal` também é similar a `runCommand`, mas força a derivation a ser construída localmente.
Veja a nota sobre [`runCommandWith`] a respeito de `runLocal`.

[`runCommandWith`]: #trivial-builder-runCommandWith

### Tipo {#trivial-builder-runCommand-Type}

```
runCommand      :: String -> AttrSet -> String -> Derivation
runCommandCC    :: String -> AttrSet -> String -> Derivation
runCommandLocal :: String -> AttrSet -> String -> Derivation
```

### Entrada {#trivial-builder-runCommand-Input}

Embora a(s) assinatura(s) de tipo difiram de [`runCommandWith`], argumentos individuais com o mesmo nome terão o mesmo tipo e significado:

`name` (String)
:   O nome da derivation

`derivationArgs` (Conjunto de atributos)
:   Parâmetros adicionais passados para [`mkDerivation`]

`buildCommand` (String)
:   O(s) comando(s) executado(s) para construir a derivation.


::: {.example #ex-runcommand-simple}
# Invocação de `runCommand`

```nix
runCommand "my-example" { } ''
  echo My example command is running

  mkdir $out

  echo I can write data to the Nix store > $out/message

  echo I can also run basic commands like:

  echo ls
  ls

  echo whoami
  whoami

  echo date
  date
''
```
:::

::: {.note}
`runCommand name derivationArgs buildCommand` é equivalente a
```nix
runCommandWith {
  inherit name derivationArgs;
  stdenv = stdenvNoCC;
} buildCommand
```

Da mesma forma, `runCommandCC name derivationArgs buildCommand` é equivalente a
```nix
runCommandWith { inherit name derivationArgs; } buildCommand
```
:::


## Escrevendo arquivos de texto {#trivial-builder-text-writing}

Nixpkgs fornece as seguintes funções para produzir derivations que escrevem arquivos de texto ou scripts executáveis no Nix store.
Elas são úteis para criar arquivos a partir de expressões Nix, e todas são implementadas como wrappers de conveniência em torno de `writeTextFile`.

Cada uma dessas funções fará com que uma derivation seja produzida.
Quando você coage o resultado de cada uma dessas funções a uma string com [interpolação de string](https://nixos.org/manual/nix/stable/language/string-interpolation) ou [`toString`](https://nixos.org/manual/nix/stable/language/builtins#builtins-toString), ele será avaliado para o [store path](https://nixos.org/manual/nix/stable/store/store-path) desta derivation.

:::: {.note}
Algumas dessas funções colocarão os arquivos resultantes dentro de um diretório dentro da [saída da derivation](https://nixos.org/manual/nix/stable/language/derivations#attr-outputs).
Se você precisar referenciar os arquivos resultantes em outro lugar em uma expressão Nix, anexe o caminho deles ao store path da derivation.

Por exemplo, se o destino do arquivo for um diretório:

```nix
{
  my-file = writeTextFile {
    name = "my-file";
    text = ''
      Contents of File
    '';
    destination = "/share/my-file";
  };
}
```

Lembre-se de anexar "/share/my-file" ao store path resultante ao usá-lo em outro lugar:

```nix
writeShellScript "evaluate-my-file.sh" ''
  cat ${my-file}/share/my-file
''
```
::::

### `makeDesktopItem` {#trivial-builder-makeDesktopItem}

Escreve um [arquivo desktop XDG](https://specifications.freedesktop.org/desktop-entry-spec/1.4/) no Nix store.

Esta função é geralmente usada para adicionar itens de desktop a um pacote através do hook `copyDesktopItems`.

`makeDesktopItem` adere à versão 1.4 da especificação.

#### Entradas {#trivial-builder-makeDesktopItem-inputs}

`makeDesktopItem` aceita um conjunto de atributos que recebe a maioria dos valores da [especificação XDG](https://specifications.freedesktop.org/desktop-entry-spec/1.4/ar01s06.html).

Todas as chaves reconhecidas da especificação são suportadas, com exceção do campo "Hidden". As chaves são convertidas para o formato camelCase, mas correspondem 1:1 ao seu equivalente na especificação: `genericName`, `noDisplay`, `comment`, `icon`, `onlyShowIn`, `notShowIn`, `dbusActivatable`, `tryExec`, `exec`, `path`, `terminal`, `mimeTypes`, `categories`, `implements`, `keywords`, `startupNotify`, `startupWMClass`, `url`, `prefersNonDefaultGPU`.

O campo "Version" é codificado para a versão à qual `makeDesktopItem` atualmente adere.

Os seguintes campos são obrigatórios, são de um tipo diferente do que na especificação, carregam valores padrão específicos ou são campos adicionais suportados por `makeDesktopItem`:

`name` (String)

: O nome do arquivo desktop no Nix store.

`type` (String; _opcional_)

: Valor padrão: `"Application"`

`desktopName` (String)

: Corresponde ao campo "Name" da especificação.

`actions` (Lista de Conjunto de atributos; _opcional_)

: Uma lista de conjuntos de atributos {name, exec?, icon?}

`extraConfig` (Conjunto de atributos; _opcional_)

: Pares chave/valor adicionais a serem adicionados literalmente ao arquivo desktop. Os atributos precisam ser prefixados com 'X-'.

#### Exemplos {#trivial-builder-makeDesktopItem-examples}

::: {.example #ex-makeDesktopItem}
# Uso 1 de `makeDesktopItem`

Escreve um arquivo desktop `/nix/store/<store path>/my-program.desktop` no Nix store.

```nix
{ makeDesktopItem }:
makeDesktopItem {
  name = "my-program";
  desktopName = "My Program";
  genericName = "Video Player";
  noDisplay = false;
  comment = "Cool video player";
  icon = "/path/to/icon";
  onlyShowIn = [ "KDE" ];
  dbusActivatable = true;
  tryExec = "my-program";
  exec = "my-program --someflag";
  path = "/some/working/path";
  terminal = false;
  actions.example = {
    name = "New Window";
    exec = "my-program --new-window";
    icon = "/some/icon";
  };
  mimeTypes = [ "video/mp4" ];
  categories = [ "Utility" ];
  implements = [ "org.my-program" ];
  keywords = [
    "Video"
    "Player"
  ];
  startupNotify = false;
  startupWMClass = "MyProgram";
  prefersNonDefaultGPU = false;
  extraConfig.X-SomeExtension = "somevalue";
}
```

:::

::: {.example #ex2-makeDesktopItem}
# Uso 2 de `makeDesktopItem`

Sobrescreve o pacote `hello` para adicionar um item de desktop.

```nix
{
  copyDesktopItems,
  hello,
  makeDesktopItem,
}:

hello.overrideAttrs {
  nativeBuildInputs = [ copyDesktopItems ];

  desktopItems = [
    (makeDesktopItem {
      name = "hello";
      desktopName = "Hello";
      exec = "hello";
    })
  ];
}
```

:::

### `writeTextFile` {#trivial-builder-writeTextFile}

Escreve um arquivo de texto no Nix store.

`writeTextFile` aceita um conjunto de atributos com os seguintes atributos possíveis:

`name` (String)

: Corresponde ao nome usado no identificador do Nix store path.

`text` (String)

: O conteúdo do arquivo.

`executable` (Bool, _opcional_)

: Faz com que este arquivo tenha o bit executável definido.

  Padrão: `false`

`destination` (String, _opcional_)

: Um subcaminho sob o caminho de saída da derivation no qual o arquivo será colocado.
  Subdiretórios são criados automaticamente quando a derivation é realizada.

  Por padrão, o store path em si será um arquivo contendo o conteúdo do texto.

  Padrão: `""`

`checkPhase` (String, _opcional_)

: Comandos a serem executados após a geração do arquivo.

  Padrão: `""`

`meta` (Conjunto de atributos, _opcional_)

: Metadados adicionais para a derivation.

  Padrão: `{}`

`allowSubstitutes` (Bool, _opcional_)

: Se deve permitir a substituição de um cache binário.
  Passado para [`allowSubstitutes`](https://nixos.org/manual/nix/stable/language/advanced-attributes#adv-attr-allowSubstitutes) da chamada subjacente a `derivation`.

  O padrão é `false`, pois a execução do executável `builder` simples da derivation localmente é assumida como mais rápida do que as operações de rede.
  Defina-o como true se a etapa `checkPhase` for cara.

  Padrão: `false`

`preferLocalBuild` (Bool, _opcional_)

: Se deve preferir a construção localmente, mesmo que máquinas de [construção remota](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-substituters) mais rápidas estejam disponíveis.

  Passado para [`preferLocalBuild`](https://nixos.org/manual/nix/stable/language/advanced-attributes#adv-attr-preferLocalBuild) da chamada subjacente a `derivation`.

  O padrão é `true` pela mesma razão que `allowSubstitutes` é `false`.

  Padrão: `true`

`derivationArgs` (Conjunto de atributos, _opcional_)

: Argumentos extras a serem passados para a chamada subjacente a `stdenv.mkDerivation`.

  Padrão: `{}`

O store path resultante incluirá alguma variação do nome, e será um arquivo, a menos que `destination` seja usado, caso em que será um diretório.

::: {.example #ex-writeTextFile}
# Uso 1 de `writeTextFile`

Escreve `my-file` em `/nix/store/<store path>/some/subpath/my-cool-script`, tornando-o executável.
Também executa uma verificação no arquivo resultante em um `checkPhase`, e fornece valores para as opções menos usadas.

```nix
writeTextFile {
  name = "my-cool-script";
  text = ''
    #!/bin/sh
    echo "This is my cool script!"
  '';
  executable = true;
  destination = "/some/subpath/my-cool-script";
  checkPhase = ''
    ${pkgs.shellcheck}/bin/shellcheck $out/some/subpath/my-cool-script
  '';
  meta = {
    license = pkgs.lib.licenses.cc0;
  };
  allowSubstitutes = true;
  preferLocalBuild = false;
}
```
:::

::: {.example #ex2-writeTextFile}
# Uso 2 de `writeTextFile`

Escreve a string `Contents of File` em `/nix/store/<store path>`.
Veja também a função auxiliar [](#trivial-builder-writeText).

```nix
writeTextFile {
  name = "my-file";
  text = ''
    Contents of File
  '';
}
```
:::

::: {.example #ex3-writeTextFile}
# Uso 3 de `writeTextFile`

Escreve um script executável `my-script` em `/nix/store/<store path>/bin/my-script`.
Veja também a função auxiliar [](#trivial-builder-writeScriptBin).

```nix
writeTextFile {
  name = "my-script";
  text = ''
    echo "hi"
  '';
  executable = true;
  destination = "/bin/my-script";
}
```
:::

### `writeText` {#trivial-builder-writeText}

Escreve um arquivo de texto no Nix store

`writeText` aceita os seguintes argumentos:
uma string.

`name` (String)

: O nome usado no Nix store path.

`text` (String)

: O conteúdo do arquivo.

O store path incluirá o nome, e será um arquivo.

::: {.example #ex-writeText}
# Uso de `writeText`

Escreve a string `Contents of File` em `/nix/store/<store path>`:

```nix
writeText "my-file" ''
  Contents of File
''
```
:::

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-file";
  text = ''
    Contents of File
  '';
}
```

### `writeTextDir` {#trivial-builder-writeTextDir}

Escreve um arquivo de texto dentro de um subdiretório do Nix store.

`writeTextDir` aceita os seguintes argumentos:

`path` (String)

: O destino dentro do Nix store path sob o qual o arquivo será criado.

`text` (String)

: O conteúdo do arquivo.

O store path será um diretório.

::: {.example #ex-writeTextDir}
# Uso de `writeTextDir`

Escreve a string `Contents of File` em `/nix/store/<store path>/share/my-file`:

```nix
writeTextDir "share/my-file" ''
  Contents of File
''
```
:::

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-file";
  text = ''
    Contents of File
  '';
  destination = "/share/my-file";
}
```

### `writeScript` {#trivial-builder-writeScript}

Escreve um arquivo de script executável no Nix store.

`writeScript` aceita os seguintes argumentos:

`name` (String)

: O nome usado no Nix store path.

`text` (String)

: O conteúdo do arquivo.

O arquivo criado é marcado como executável.
O store path incluirá o nome, e será um arquivo.

::: {.example #ex-writeScript}
# Uso de `writeScript`

Escreve a string `Contents of File` em `/nix/store/<store path>` e torna o arquivo executável.

```nix
writeScript "my-file" ''
  Contents of File
''
```

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-file";
  text = ''
    Contents of File
  '';
  executable = true;
}
```
:::

### `writeScriptBin` {#trivial-builder-writeScriptBin}

Escreve um script dentro de um subdiretório `bin` de um diretório no Nix store.
Isso é para consistência com a convenção de pacotes de software que colocam executáveis em `bin`.

`writeScriptBin` aceita os seguintes argumentos:

`name` (String)

: O nome usado no Nix store path e dentro do arquivo criado sob o store path.

`text` (String)

: O conteúdo do arquivo.

O arquivo criado é marcado como executável.
O conteúdo do arquivo será colocado em `/nix/store/<store path>/bin/<name>`.
O store path incluirá o nome, e será um diretório.

::: {.example #ex-writeScriptBin}
# Uso de `writeScriptBin`

```nix
writeScriptBin "my-script" ''
  echo "hi"
''
```
:::

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-script";
  text = ''
    echo "hi"
  '';
  executable = true;
  destination = "/bin/my-script";
}
```

### `writeShellScript` {#trivial-builder-writeShellScript}

Escreve um script Bash no store.

`writeShellScript` aceita os seguintes argumentos:

`name` (String)

: O nome usado no Nix store path.

`text` (String)

: O conteúdo do arquivo.

O arquivo criado é marcado como executável.
O store path incluirá o nome, e será um arquivo.

Esta função é quase exatamente como [](#trivial-builder-writeScript), exceto que ela adiciona ao início do arquivo uma linha [shebang](https://en.wikipedia.org/wiki/Shebang_%28Unix%29) que aponta para a versão do Bash usada em Nixpkgs.
<!-- this cannot be changed in practice, so there is no point pretending it's somehow generic -->

::: {.example #ex-writeShellScript}
# Uso de `writeShellScript`

```nix
writeShellScript "my-script" ''
  echo "hi"
''
```
:::

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-script";
  text = ''
    #! ${pkgs.runtimeShell}
    echo "hi"
  '';
  executable = true;
}
```

### `writeShellScriptBin` {#trivial-builder-writeShellScriptBin}

Escreve um script Bash em um subdiretório "bin" de um diretório no Nix store.

`writeShellScriptBin` aceita os seguintes argumentos:

`name` (String)

: O nome usado no Nix store path e dentro do arquivo gerado sob o store path.

`text` (String)

: O conteúdo do arquivo.

O conteúdo do arquivo será colocado em `/nix/store/<store path>/bin/<name>`.
O store path incluirá o nome, e será um diretório.

Esta função é uma combinação de [](#trivial-builder-writeShellScript) e [](#trivial-builder-writeScriptBin).

::: {.example #ex-writeShellScriptBin}
# Uso de `writeShellScriptBin`

```nix
writeShellScriptBin "my-script" ''
  echo "hi"
''
```
:::

Isso é equivalente a:

```nix
writeTextFile {
  name = "my-script";
  text = ''
    #! ${pkgs.runtimeShell}
    echo "hi"
  '';
  executable = true;
  destination = "/bin/my-script";
}
```

## `concatTextFile`, `concatText`, `concatScript` {#trivial-builder-concatText}

Essas funções concatenam `files` no Nix store em um único arquivo. Isso é útil para arquivos de configuração estruturados em linhas de texto. `concatTextFile` aceita um conjunto de atributos e espera dois argumentos, `name` e `files`. `name` (ou alternativamente `pname` e `version`) corresponde ao nome usado no Nix store path. `files` serão os arquivos a serem concatenados. Você também pode definir `executable` como true para fazer com que este arquivo tenha o bit executável definido.
`concatText` e `concatScript` são wrappers simples sobre `concatTextFile`.

Aqui estão alguns exemplos:
```nix
# Writes my-file to /nix/store/<store path>
concatTextFile
  {
    name = "my-file";
    files = [
      drv1
      "${drv2}/path/to/file"
    ];
  }
  # See also the `concatText` helper function below.

  # Writes executable my-file to /nix/store/<store path>/bin/my-file
  concatTextFile
  {
    name = "my-file";
    files = [
      drv1
      "${drv2}/path/to/file"
    ];
    executable = true;
    destination = "/bin/my-file";
  }
  # Writes contents of files to /nix/store/<store path>
  concatText
  "my-file"
  [
    file1
    file2
  ]

  # Writes contents of files to /nix/store/<store path>
  concatScript
  "my-file"
  [
    file1
    file2
  ]
```

## `writeShellApplication` {#trivial-builder-writeShellApplication}

`writeShellApplication` é similar a `writeShellScriptBin` e `writeScriptBin`, mas suporta dependências de tempo de execução com `runtimeInputs`.
Escreve um script shell executável em `/nix/store/<store path>/bin/<name>` e verifica sua sintaxe com [`shellcheck`](https://github.com/koalaman/shellcheck) e a opção `-n` do `bash`.
Algumas opções básicas do Bash são definidas por padrão (`errexit`, `nounset` e `pipefail`), mas podem ser sobrescritas com `bashOptions`.

Argumentos extras podem ser passados para `stdenv.mkDerivation` definindo `derivationArgs`; note que as variáveis definidas desta maneira serão definidas quando o script shell for _construído_, não quando for executado.
Variáveis de ambiente de tempo de execução podem ser definidas com o argumento `runtimeEnv`.

`writeShellApplication` possui os seguintes argumentos:

`name` (String)

: O nome do script a ser escrito.

`text` (String)

: O texto do script shell, sem incluir um shebang.

`runtimeInputs` (Lista de derivations ou strings, _opcional_)

: Entradas a serem adicionadas ao `$PATH` do script shell em tempo de execução.

  Cada elemento pode ser uma derivation normal ou uma string contendo um caminho, caso em que será sufixado com `/bin` para criar uma expressão `PATH` (veja [`lib.strings.makeBinPath`](#function-library-lib.strings.makeBinPath) para mais informações).

`runtimeEnv` (Conjunto de atributos, _opcional_)

: Variáveis de ambiente extras a serem definidas em tempo de execução.

`checkPhase` (String, _opcional_)

: O `checkPhase` a ser executado.

  O caminho do script será dado como `$target` no `checkPhase`

  _Comportamento padrão:_ executa [`shellcheck`](https://github.com/koalaman/shellcheck) (em plataformas suportadas) e `bash -n` (verifica a sintaxe, mas não executa comandos).

`excludeShellChecks` (Lista de strings, _opcional_)

: Verificações a serem excluídas ao executar `shellcheck`.

  Por exemplo, `excludeShellChecks = [ "SC2016" ]` impediria o `shellcheck` de relatar `SC2016`, mas ainda detectaria quaisquer outros problemas.

  Veja [a wiki do `shellcheck`](https://www.shellcheck.net/wiki/) para uma lista de verificações.

`extraShellCheckFlags` (Lista de strings, _opcional_)

: Flags de linha de comando extras a serem passadas para `shellcheck`.

`bashOptions` (Lista de strings, _opcional_)

: Opções do Bash a serem ativadas com `set -o` no início do script

  _Padrão:_ `[ "errexit" "nounset" "pipefail" ]`, o que significa:
  1. Um comando falho dentro de uma lista de comandos ou pipeline fará com que o script saia, exceto se usado como condicional (dentro de um `while`, `if`, `&&`, `||`, etc.);
  2. Qualquer tentativa de expandir uma variável indefinida fará com que o script saia.

`inheritPath` (Bool, _opcional_)

: Se o script herdará o PATH de seu ambiente pai.

  _Padrão:_ `true`

`meta` (Conjunto de atributos, _opcional_)

: Argumento [`meta`](#chap-meta) de `stdenv.mkDerivation`

`passthru` (Conjunto de atributos, _opcional_)

: Argumento [`passthru`](#chap-passthru) de `stdenv.mkDerivation`

`derivationArgs` (Conjunto de atributos, _opcional_)

: Argumentos extras a serem passados para [`stdenv.mkDerivation`](#chap-stdenv)

  ::: {.caution}
  Certos atributos de derivation também são definidos internamente, então sobrescrevê-los pode causar problemas.
  :::

::: {.example #ex-writeShellApplication}
# Uso de `writeShellApplication`

A seguinte aplicação shell pode referenciar `curl` diretamente, em vez de precisar escrever `${curl}/bin/curl`

```nix
writeShellApplication {
  name = "show-nixos-org";

  runtimeInputs = [
    curl
    w3m
  ];

  text = ''
    curl -s 'https://nixos.org' | w3m -dump -T text/html
  '';
}
```
:::

## `symlinkJoin` {#trivial-builder-symlinkJoin}

Isso pode ser usado para colocar muitas derivations na mesma estrutura de diretórios. Funciona criando uma nova derivation e adicionando symlinks para cada um dos caminhos listados. Ele espera dois argumentos, `name` e `paths`. `name` (ou alternativamente `pname` e `version`) é o nome usado no Nix store path para a derivation criada. `paths` é uma lista de caminhos que serão symlinked. Esses caminhos podem ser para derivations do Nix store ou qualquer outro subdiretório contido neles.
Aqui está um exemplo:
```nix
# adds symlinks of hello and stack to current build and prints "links added"
symlinkJoin {
  name = "myexample";
  paths = [
    pkgs.hello
    pkgs.stack
  ];
  postBuild = "echo links added";
}
```
Isso cria uma derivation com uma estrutura de diretórios como a seguinte:
```
/nix/store/sglsr5g079a5235hy29da3mq3hv8sjmm-myexample
|-- bin
|   |-- hello -> /nix/store/qy93dp4a3rqyn2mz63fbxjg228hffwyw-hello-2.10/bin/hello
|   `-- stack -> /nix/store/6lzdpxshx78281vy056lbk553ijsdr44-stack-2.1.3.1/bin/stack
`-- share
    |-- bash-completion
    |   `-- completions
    |       `-- stack -> /nix/store/6lzdpxshx78281vy056lbk553ijsdr44-stack-2.1.3.1/share/bash-completion/completions/stack
    |-- fish
    |   `-- vendor_completions.d
    |       `-- stack.fish -> /nix/store/6lzdpxshx78281vy056lbk553ijsdr44-stack-2.1.3.1/share/fish/vendor_completions.d/stack.fish
...
```

## `writeClosure` {#trivial-builder-writeClosure}

Dada uma lista de [store paths](https://nixos.org/manual/nix/stable/glossary#gloss-store-path) (ou expressões tipo string coercíveis a store paths), escreve seu [closure](https://nixos.org/manual/nix/stable/glossary#gloss-closure) coletivo em um arquivo de texto.

O resultado é equivalente à saída de `nix-store -q --requisites`.

Por exemplo,

```nix
writeClosure [ (writeScriptBin "hi" "${hello}/bin/hello") ]
```

produz um caminho de saída `/nix/store/<hash>-runtime-deps` contendo

```
/nix/store/<hash>-hello-2.10
/nix/store/<hash>-hi
/nix/store/<hash>-libidn2-2.3.0
/nix/store/<hash>-libunistring-0.9.10
/nix/store/<hash>-glibc-2.32-40
```

Você pode ver que isso inclui `hi`, o caminho de entrada original,
`hello`, que é uma referência direta, mas também
os outros caminhos que são indiretamente necessários para executar `hello`.

## `writeDirectReferencesToFile` {#trivial-builder-writeDirectReferencesToFile}

Escreve o conjunto de referências para o arquivo de saída, ou seja, suas dependências imediatas.

Isso produz o equivalente a `nix-store -q --references`.

Por exemplo,

```nix
writeDirectReferencesToFile (writeScriptBin "hi" "${hello}/bin/hello")
```

produz um caminho de saída `/nix/store/<hash>-runtime-references` contendo

```
/nix/store/<hash>-hello-2.10
```

mas nenhuma das dependências de `hello` porque elas não são referenciadas diretamente
pela saída de `hi`.