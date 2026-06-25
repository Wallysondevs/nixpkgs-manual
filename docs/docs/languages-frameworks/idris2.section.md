# Idris2 {#sec-idris2}

Ao desenvolver usando Idris2, por padrão o compilador Idris possui apenas as bibliotecas de suporte mínimas em seu ambiente. Isso significa que ele não tentará ler nenhuma biblioteca instalada globalmente, por exemplo, no diretório `$HOME`. A maneira recomendada de usar o Idris2 é envolver o compilador em um ambiente que forneça esses pacotes por projeto, por exemplo, em um devShell.

```nix
{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  packages = [ (idris2.withPackages (p: [ p.idris2Api ])) ];
}
```
ou, alternativamente, se o Nix for usado para construir o projeto Idris2:

```nix
{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  inputsFrom = [ (pkgs.callPackage ./package.nix { }) ];
}
```

Por padrão, o compilador Idris2 fornecido pelo Nixpkgs não lê pacotes instalados globalmente, nem pode instalá-los. Executar `idris2 --install` falhará porque o Nix store é um sistema de arquivos somente leitura. Se pacotes instalados globalmente forem desejados em vez da estratégia acima, pode-se definir `IDRIS2_PREFIX`, ou entradas adicionais de `IDRIS2_PACKAGE_PATH` para o compilador ler. O trecho a seguir anexará `$HOME/.idris2` a `$IDRIS2_PACKAGE_PATH`, e se tal variável não existir, a criará. O compilador Idris2 do Nixpkgs anexa algumas bibliotecas necessárias a esta variável de caminho, mas quaisquer caminhos no ambiente do usuário serão prefixados a essas bibliotecas.

```nix
{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  packages = [ (idris2.withPackages (p: [ p.idris2Api ])) ];
  shellHook = ''
    IDRIS2_PACKAGE_PATH="''${IDRIS2_PACKAGE_PATH:+$IDRIS2_PACKAGE_PATH}$HOME/.idris2"
  '';
}
```
O trecho a seguir permitirá que o Idris2 execute `idris2 --install` com sucesso:
```nix
{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  packages = [ (idris2.withPackages (p: [ p.idris2Api ])) ];
  shellHook = ''
    IDRIS2_PREFIX="$HOME/.idris2"
  '';
}
```

Além de expor o próprio compilador Idris2, o Nixpkgs expõe um auxiliar `idris2Packages.buildIdris` para tornar um pouco mais ergonômico a construção de executáveis ou bibliotecas Idris2.

A função `buildIdris` recebe um attribute set que define, no mínimo, o `src` e o `ipkgName` do pacote a ser construído e quaisquer `idrisLibraries` necessárias para construí-lo. O `src` é a mesma fonte com a qual você está familiarizado e o `ipkgName` deve ser o nome do arquivo `ipkg` para o projeto (omitindo a extensão `.ipkg`). O `idrisLibraries` é uma lista de outras library derivations criadas com `buildIdris`. Você pode opcionalmente especificar outras propriedades de derivation conforme necessário, mas padrões sensatos para `configurePhase`, `buildPhase` e `installPhase` são fornecidos.

Importante, `buildIdris` não cria uma única derivation, mas sim um attribute set com duas propriedades: `executable` e `library`. A propriedade `executable` é uma derivation e a propriedade `library` é uma função que retornará uma derivation para a biblioteca com ou sem código-fonte incluído. O código-fonte não precisa ser incluído, a menos que você pretenda usar recursos de IDE ou LSP que sejam capazes de pular para definições dentro de um editor.

Um exemplo simples de uma biblioteca totalmente empacotada seria a [`LSP-lib`](https://github.com/idris-community/LSP-lib) encontrada na organização `idris-community` do GitHub.
```nix
{ fetchFromGitHub, idris2Packages }:
let
  lspLibPkg = idris2Packages.buildIdris {
    ipkgName = "lsp-lib";
    src = fetchFromGitHub {
      owner = "idris-community";
      repo = "LSP-lib";
      rev = "main";
      hash = "sha256-EvSyMCVyiy9jDZMkXQmtwwMoLaem1GsKVFqSGNNHHmY=";
    };
    idrisLibraries = [ ];
  };
in
lspLibPkg.library { withSource = true; }
```

O acima resulta em uma derivation com os resultados da biblioteca instalada (com código-fonte).

Um exemplo um pouco mais complexo de um executável totalmente empacotado seria o [`idris2-lsp`](https://github.com/idris-community/idris2-lsp), que é um servidor de linguagem Idris2 que usa a `LSP-lib` encontrada acima.
```nix
{
  callPackage,
  fetchFromGitHub,
  idris2Packages,
}:

# Assuming the previous example lives in `lsp-lib.nix`:
let
  lspLib = callPackage ./lsp-lib.nix { };
  inherit (idris2Packages) idris2Api;
  lspPkg = idris2Packages.buildIdris {
    ipkgName = "idris2-lsp";
    src = fetchFromGitHub {
      owner = "idris-community";
      repo = "idris2-lsp";
      rev = "main";
      hash = "sha256-vQTzEltkx7uelDtXOHc6QRWZ4cSlhhm5ziOqWA+aujk=";
    };
    idrisLibraries = [
      idris2Api
      lspLib
    ];
  };
in
lspPkg.executable
```

O acima usa o valor padrão de `withSource = false` para o `idris2Api`, mas poderia ser modificado para incluir o código-fonte dessa biblioteca passando `(idris2Api { withSource = true; })` para `idrisLibraries` em vez disso. `idris2Api` na derivation acima vem embutido com `idris2Packages`. Esta biblioteca expõe muitas das APIs, de outra forma internas, do compilador Idris2.

O pacote do compilador pode ser instanciado com pacotes em seu caminho `IDRIS2_PACKAGES` a partir do conjunto `idris2Packages`.

```nix
{
  idris2,
  devShell,
}:
let
  myIdris = idris2.withPackages (p: [ p.idris2Api ]);
in
devShell {
  packages = [ myIdris ];
}
```

Este caminho de busca é estendido a partir do caminho já existente no ambiente do usuário.