# Dhall {#sec-language-dhall}

O suporte do Nixpkgs para Dhall pressupõe alguma familiaridade com o suporte da linguagem Dhall para importar expressões Dhall, que está documentado aqui:

* [`dhall-lang.org` - Installing packages](https://docs.dhall-lang.org/tutorials/Language-Tour.html#installing-packages)

## Importações remotas {#ssec-dhall-remote-imports}

O Nixpkgs ignora o suporte do Dhall para importações remotas usando as verificações de integridade semântica do Dhall. Especificamente, qualquer importação Dhall pode ser protegida por uma verificação de integridade como:

```dhall
https://prelude.dhall-lang.org/v20.1.0/package.dhall
  sha256:26b0ef498663d269e4dc6a82b0ee289ec565d683ef4c00d0ebdd25333a5a3c98
```

… e se a importação estiver em cache, o interpretador carregará a importação do cache em vez de buscar a URL.

O Nixpkgs usa esse truque para adicionar todas as dependências de uma expressão Dhall ao cache, de modo que o interpretador Dhall nunca precise resolver nenhuma URL remota. Na verdade, o Nixpkgs usa um interpretador Dhall com importações remotas desabilitadas ao empacotar expressões Dhall para garantir que o interpretador nunca resolva uma importação remota. Isso significa que o Nixpkgs só oferece suporte à construção de expressões Dhall se todas as suas importações remotas forem protegidas por verificações de integridade semântica.

Em vez de importações remotas, o Nixpkgs usa o Nix para buscar código Dhall remoto. Por exemplo, o pacote Dhall Prelude usa `pkgs.fetchFromGitHub` para buscar o repositório `dhall-lang` contendo o Prelude. Confiar exclusivamente no Nix para buscar código Dhall garante que os pacotes Dhall construídos usando Nix permaneçam puros e também se comportem bem quando construídos dentro de um sandbox.

## Empacotando uma expressão Dhall do zero {#ssec-dhall-packaging-expression}

Podemos ilustrar como o Nixpkgs integra o Dhall começando pela seguinte expressão Dhall trivial com uma dependência (o Prelude):

```dhall
-- ./true.dhall

let Prelude = https://prelude.dhall-lang.org/v20.1.0/package.dhall

in  Prelude.Bool.not False
```

Conforme escrito, esta expressão não pode ser construída usando Nixpkgs porque a expressão não protege a importação do Prelude com uma verificação de integridade semântica, então o primeiro passo é congelar a expressão usando `dhall freeze`, assim:

```ShellSession
$ dhall freeze --inplace ./true.dhall
```

… o que nos dá:

```dhall
-- ./true.dhall

let Prelude =
      https://prelude.dhall-lang.org/v20.1.0/package.dhall
        sha256:26b0ef498663d269e4dc6a82b0ee289ec565d683ef4c00d0ebdd25333a5a3c98

in  Prelude.Bool.not False
```

Para empacotar essa expressão, criamos um arquivo `./true.nix` contendo a seguinte especificação para o pacote Dhall:

```nix
# ./true.nix

{ buildDhallPackage, Prelude }:

buildDhallPackage {
  name = "true";
  code = ./true.dhall;
  dependencies = [ Prelude ];
  source = true;
}
```

… e completamos a construção incorporando esse pacote Dhall na hierarquia `pkgs.dhallPackages` usando um overlay, assim:

```nix
# ./example.nix

let
  nixpkgs = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/94b2848559b12a8ed1fe433084686b2a81123c99.tar.gz";
    hash = "sha256-B4Q3c6IvTLg3Q92qYa8y+i4uTaphtFdjp+Ir3QQjdN0=";
  };

  dhallOverlay = self: super: { true = self.callPackage ./true.nix { }; };

  overlay = self: super: {
    dhallPackages = super.dhallPackages.override (old: {
      overrides = self.lib.composeExtensions (old.overrides or (_: _: { })) dhallOverlay;
    });
  };

  pkgs = import nixpkgs {
    config = { };
    overlays = [ overlay ];
  };

in
pkgs
```

… que podemos então construir usando este comando:

```ShellSession
$ nix build --file ./example.nix dhallPackages.true
```

## Conteúdo de um pacote Dhall {#ssec-dhall-package-contents}

O pacote acima produz a seguinte árvore de diretórios:

```ShellSession
$ tree -a ./result
result
├── .cache
│   └── dhall
│       └── 122027abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70
├── binary.dhall
└── source.dhall
```

… onde:

* `source.dhall` contém o resultado da interpretação do nosso pacote Dhall:

  ```ShellSession
  $ cat ./result/source.dhall
  True
  ```

* O subdiretório `.cache` contém um produto de cache binário codificando o
  mesmo resultado que `source.dhall`:

  ```ShellSession
  $ dhall decode < ./result/.cache/dhall/122027abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70
  True
  ```

* `binary.dhall` contém uma expressão Dhall que lida com a busca e decodificação
  do mesmo produto de cache:

  ```ShellSession
  $ cat ./result/binary.dhall
  missing sha256:27abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70
  $ cp -r ./result/.cache .cache

  $ chmod -R u+w .cache

  $ XDG_CACHE_HOME=.cache dhall --file ./result/binary.dhall
  True
  ```

O arquivo `source.dhall` está presente apenas para pacotes que especificam
`source = true;`. Por padrão, os pacotes Dhall omitem o `source.dhall` para
conservar espaço em disco quando são usados exclusivamente como dependências. Por
exemplo, se construirmos o pacote Prelude, ele conterá apenas a codificação binária da expressão:

```ShellSession
$ nix build --file ./example.nix dhallPackages.Prelude

$ tree -a result
result
├── .cache
│   └── dhall
│       └── 122026b0ef498663d269e4dc6a82b0ee289ec565d683ef4c00d0ebdd25333a5a3c98
├── binary.dhall
└── source.dhall

2 directories, 2 files
```

Tipicamente, você só especifica `source = true;` para a expressão Dhall de nível superior
de interesse (como nosso exemplo de pacote Dhall `true.nix`). No entanto, se você
desejar especificar `source = true` para todos os pacotes Dhall, então você pode emendar o
overlay Dhall assim:

```nix
{
  dhallOverrides = self: super: {
    # Enable source for all Dhall packages
    buildDhallPackage = args: super.buildDhallPackage (args // { source = true; });

    true = self.callPackage ./true.nix { };
  };
}
```

… e agora o Prelude conterá o resultado totalmente decodificado da interpretação
do Prelude:

```ShellSession
$ nix build --file ./example.nix dhallPackages.Prelude

$ tree -a result
result
├── .cache
│   └── dhall
│       └── 122026b0ef498663d269e4dc6a82b0ee289ec565d683ef4c00d0ebdd25333a5a3c98
├── binary.dhall
└── source.dhall

$ cat ./result/source.dhall
{ Bool =
  { and =
      \(_ : List Bool) ->
        List/fold Bool _ Bool (\(_ : Bool) -> \(_ : Bool) -> _@1 && _) True
  , build = \(_ : Type -> _ -> _@1 -> _@2) -> _ Bool True False
  , even =
      \(_ : List Bool) ->
        List/fold Bool _ Bool (\(_ : Bool) -> \(_ : Bool) -> _@1 == _) True
  , fold =
      \(_ : Bool) ->
…
```

## Funções de empacotamento {#ssec-dhall-packaging-functions}

Já vimos um exemplo de uso de `buildDhallPackage` para criar um pacote Dhall a partir de um único arquivo, mas a maioria dos pacotes Dhall consiste em mais de um arquivo e existem duas utilidades derivadas que você pode achar mais úteis ao empacotar vários arquivos:

* `buildDhallDirectoryPackage` - constrói um pacote Dhall a partir de um diretório local

* `buildDhallGitHubPackage` - constrói um pacote Dhall a partir de um repositório GitHub

A `buildDhallPackage` é a função de nível mais baixo e aceita os seguintes argumentos:

* `name`: O nome da derivation

* `dependencies`: Dependências Dhall para construir e armazenar em cache antecipadamente

* `code`: A expressão de nível superior a ser construída para este pacote

  Observe que o campo `code` aceita uma expressão Dhall arbitrária. Você não está limitado a apenas um arquivo.

* `source`: Definido como `true` para incluir o resultado decodificado como `source.dhall` no produto de construção, à custa de exigir mais espaço em disco

* `documentationRoot`: Definido como o diretório raiz do pacote se você quiser que `dhall-docs` gere documentação dentro do subdiretório `docs` do produto de construção

A `buildDhallDirectoryPackage` é uma função de nível superior implementada em termos de `buildDhallPackage` que aceita os seguintes argumentos:

* `name`: O mesmo que `buildDhallPackage`

* `dependencies`: O mesmo que `buildDhallPackage`

* `source`: O mesmo que `buildDhallPackage`

* `src`: O diretório contendo o código Dhall que você deseja transformar em um pacote Dhall

* `file`: O arquivo de nível superior (`package.dhall` por padrão) que é o ponto de entrada para o restante do pacote

* `document`: Definido como `true` para gerar documentação para o pacote

A `buildDhallGitHubPackage` é outra função de nível superior implementada em termos de `buildDhallPackage` que aceita os seguintes argumentos:

* `name`: O mesmo que `buildDhallPackage`

* `dependencies`: O mesmo que `buildDhallPackage`

* `source`: O mesmo que `buildDhallPackage`

* `owner`: O proprietário do repositório

* `repo`: O nome do repositório

* `rev`: A revisão desejada (ou branch, ou tag)

* `directory`: O subdiretório do repositório Git a ser empacotado (se for um diretório diferente da raiz do repositório)

* `file`: O arquivo de nível superior (`${directory}/package.dhall` por padrão) que é o ponto de entrada para o restante do pacote

* `document`: Definido como `true` para gerar documentação para o pacote

Além disso, `buildDhallGitHubPackage` aceita os mesmos argumentos que `fetchFromGitHub`, como `hash` ou `fetchSubmodules`.

## `dhall-to-nixpkgs` {#ssec-dhall-dhall-to-nixpkgs}

Você pode usar a utilidade de linha de comando `dhall-to-nixpkgs` para automatizar
o empacotamento de código Dhall. Por exemplo:

```ShellSession
$ nix-shell -p haskellPackages.dhall-nixpkgs nix-prefetch-git
[nix-shell]$ dhall-to-nixpkgs github https://github.com/Gabriella439/dhall-semver.git
{ buildDhallGitHubPackage, Prelude }:
  buildDhallGitHubPackage {
    name = "dhall-semver";
    githubBase = "github.com";
    owner = "Gabriella439";
    repo = "dhall-semver";
    rev = "2d44ae605302ce5dc6c657a1216887fbb96392a4";
    fetchSubmodules = false;
    hash = "sha256-n0nQtswVapWi/x7or0O3MEYmAkt/a1uvlOtnje6GGnk=";
    directory = "";
    file = "package.dhall";
    source = false;
    document = false;
    dependencies = [ (Prelude.overridePackage { file = "package.dhall"; }) ];
    }
```

:::{.note}
`nix-prefetch-git` é adicionado à invocação `nix-shell -p` acima, porque ele precisa estar no `$PATH` para que `dhall-to-nixpkgs` funcione.
:::

A utilidade se encarrega de detectar automaticamente as importações remotas e convertê-las em dependências de pacote. Você também pode usar a utilidade em diretórios Dhall locais:

```ShellSession
$ dhall-to-nixpkgs directory ~/proj/dhall-semver
{ buildDhallDirectoryPackage, Prelude }:
  buildDhallDirectoryPackage {
    name = "proj";
    src = ~/proj/dhall-semver;
    file = "package.dhall";
    source = false;
    document = false;
    dependencies = [ (Prelude.overridePackage { file = "package.dhall"; }) ];
    }
```

### Importações remotas como fixed-output derivations {#ssec-dhall-remote-imports-as-fod}

`dhall-to-nixpkgs` tem a capacidade de buscar e construir importações remotas como
fixed-output derivations usando sua verificação de integridade Dhall. Isso é
às vezes mais fácil do que empacotar manualmente todas as importações remotas.

Isso pode ser usado da seguinte forma:

```ShellSession
$ dhall-to-nixpkgs directory --fixed-output-derivations ~/proj/dhall-semver
{ buildDhallDirectoryPackage, buildDhallUrl }:
  buildDhallDirectoryPackage {
    name = "proj";
    src = ~/proj/dhall-semver;
    file = "package.dhall";
    source = false;
    document = false;
    dependencies = [
      (buildDhallUrl {
        url = "https://prelude.dhall-lang.org/v17.0.0/package.dhall";
        hash = "sha256-ENs8kZwl6QRoM9+Jeo/+JwHcOQ+giT2VjDQwUkvlpD4=";
        dhallHash = "sha256:10db3c919c25e9046833df897a8ffe2701dc390fa0893d958c3430524be5a43e";
        })
      ];
    }
```

Aqui, a dependência `Prelude` de `dhall-semver` é buscada e construída com a
função auxiliar `buildDhallUrl`, em vez de ser passada como um argumento de função.

## Sobrescrevendo versões de dependência {#ssec-dhall-overriding-dependency-versions}

Suponha que mudemos nossa expressão de exemplo `true.dhall` para depender de uma versão mais antiga
do Prelude (19.0.0):

```dhall
-- ./true.dhall

let Prelude =
      https://prelude.dhall-lang.org/v19.0.0/package.dhall
        sha256:eb693342eb769f782174157eba9b5924cf8ac6793897fc36a31ccbd6f56dafe2

in  Prelude.Bool.not False
```

Se tentarmos reconstruir essa expressão, a construção falhará:

```ShellSession
$ nix build --file ./example.nix dhallPackages.true
builder for '/nix/store/0f1hla7ff1wiaqyk1r2ky4wnhnw114fi-true.drv' failed with exit code 1; last 10 log lines:

  Dhall was compiled without the 'with-http' flag.

  The requested URL was: https://prelude.dhall-lang.org/v19.0.0/package.dhall


  4│       https://prelude.dhall-lang.org/v19.0.0/package.dhall
  5│         sha256:eb693342eb769f782174157eba9b5924cf8ac6793897fc36a31ccbd6f56dafe2

  /nix/store/rsab4y99h14912h4zplqx2iizr5n4rc2-true.dhall:4:7
[1 built (1 failed), 0.0 MiB DL]
error: build of '/nix/store/0f1hla7ff1wiaqyk1r2ky4wnhnw114fi-true.drv' failed
```

… porque o Prelude padrão selecionado pela revisão do Nixpkgs
`94b2848559b12a8ed1fe433084686b2a81123c99` é a versão 20.1.0, que não
tem a mesma verificação de integridade que a versão 19.0.0. Isso significa que a versão
19.0.0 não está em cache, e o interpretador não tem permissão para recorrer à
importação da URL.

No entanto, podemos sobrescrever a versão padrão do Prelude usando `dhall-to-nixpkgs`
para criar um pacote Dhall para o nosso Prelude desejado:

```ShellSession
$ dhall-to-nixpkgs github https://github.com/dhall-lang/dhall-lang.git \
    --name Prelude \
    --directory Prelude \
    --rev v19.0.0 \
    > Prelude.nix
```

… e então referenciando esse pacote em nosso overlay Dhall, seja sobrescrevendo
o Prelude globalmente para todos os pacotes, assim:

```nix
{
  dhallOverrides = self: super: {
    true = self.callPackage ./true.nix { };

    Prelude = self.callPackage ./Prelude.nix { };
  };
}
```

… ou sobrescrevendo seletivamente a dependência do Prelude apenas para o pacote `true`,
assim:

```nix
{
  dhallOverrides = self: super: {
    true = self.callPackage ./true.nix {
      Prelude = self.callPackage ./Prelude.nix { };
    };
  };
}
```

## Overrides {#ssec-dhall-overrides}

Você pode sobrescrever qualquer um dos argumentos para `buildDhallGitHubPackage` ou
`buildDhallDirectoryPackage` usando o atributo `overridePackage` de um pacote.
Por exemplo, suponha que quiséssemos habilitar seletivamente `source = true` apenas para o Prelude. Podemos fazer isso assim:

```nix
{
  dhallOverrides = self: super: {
    Prelude = super.Prelude.overridePackage { source = true; };

    # ...
  };
}
```

[semantic-integrity-checks]: https://docs.dhall-lang.org/tutorials/Language-Tour.html#installing-packages