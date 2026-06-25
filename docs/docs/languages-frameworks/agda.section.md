# Agda {#agda}

## Como usar Agda {#how-to-use-agda}

Agda está disponível como o pacote [agda](https://search.nixos.org/packages?channel=unstable&show=agda&from=0&size=30&sort=relevance&query=agda).

O pacote `agda` instala um wrapper de Agda, que chama `agda` com `--library-file` configurado para um arquivo de biblioteca gerado dentro do nix store, o que significa que seu arquivo de biblioteca em `$HOME/.agda/libraries` será ignorado. Por padrão, o pacote agda instala Agda sem bibliotecas, ou seja, o arquivo de biblioteca gerado está vazio. Para usar Agda com bibliotecas, a função `agda.withPackages` pode ser usada. Esta função aceita:

* Uma lista de pacotes,
* ou uma função que retorna uma lista de pacotes quando recebe o conjunto de atributos `agdaPackages`,
* ou um conjunto de atributos contendo uma lista de pacotes e uma derivation GHC para compilação (veja abaixo).
* ou um conjunto de atributos contendo uma função que retorna uma lista de pacotes quando recebe o conjunto de atributos `agdaPackages` e uma derivation GHC para compilação (veja abaixo).

Por exemplo, suponha que quiséssemos uma versão de Agda que tivesse acesso à biblioteca padrão. Isso pode ser obtido com as expressões:

```nix
agda.withPackages [ agdaPackages.standard-library ]
```

ou

```nix
agda.withPackages (p: [ p.standard-library ])
```

ou pode ser chamado como na seção [Compilando Agda](#compiling-agda).

Se você quiser usar uma versão diferente de uma biblioteca (por exemplo, uma versão de desenvolvimento), sobrescreva o atributo `src` do pacote para apontar para seu repositório local

```nix
agda.withPackages (p: [
  (p.standard-library.overrideAttrs (oldAttrs: {
    version = "local version";
    src = /path/to/local/repo/agda-stdlib;
  }))
])
```

Você também pode referenciar um repositório GitHub

```nix
agda.withPackages (p: [
  (p.standard-library.overrideAttrs (oldAttrs: {
    version = "1.5";
    src = fetchFromGitHub {
      repo = "agda-stdlib";
      owner = "agda";
      rev = "v1.5";
      hash = "sha256-nEyxYGSWIDNJqBfGpRDLiOAnlHJKEKAOMnIaqfVZzJk=";
    };
  }))
])
```

Se você quiser usar uma biblioteca não adicionada ao Nixpkgs, você pode adicionar uma dependência a uma biblioteca local chamando `agdaPackages.mkDerivation`.

```nix
agda.withPackages (p: [
  (p.mkDerivation {
    pname = "your-agda-lib";
    version = "1.0.0";
    src = /path/to/your-agda-lib;
  })
])
```

Novamente, você pode referenciar o GitHub

```nix
agda.withPackages (p: [
  (p.mkDerivation {
    pname = "your-agda-lib";
    version = "1.0.0";
    src = fetchFromGitHub {
      repo = "repo";
      owner = "owner";
      version = "...";
      rev = "...";
      hash = "...";
    };
  })
])
```

Veja [Construindo pacotes Agda](#building-agda-packages) para mais informações sobre `mkDerivation`.

Agda não usará essas bibliotecas por padrão. Para instruir Agda a usar uma biblioteca, temos algumas opções:

* Chame `agda` com a flag de biblioteca:
  ```ShellSession
  $ agda -l standard-library -i . MyFile.agda
  ```
* Escreva um arquivo `my-library.agda-lib` para o projeto em que você está trabalhando, que pode se parecer com:
  ```
  name: my-library
  include: .
  depend: standard-library
  ```
* Crie o arquivo `~/.agda/defaults` e adicione quaisquer bibliotecas que você queira usar por padrão.

Mais informações podem ser encontradas na [documentação oficial do Agda sobre gerenciamento de bibliotecas](https://agda.readthedocs.io/en/v2.6.1/tools/package-system.html).

## Compilando Agda {#compiling-agda}

Módulos Agda podem ser compilados usando o backend GHC com a flag `--compile`. Uma versão de `ghc` com `ieee754` é disponibilizada para o programa Agda através da flag `--with-compiler`. Isso pode ser sobrescrito por uma versão diferente de `ghc` da seguinte forma:

```nix
agda.withPackages {
  pkgs = [
    # ...
  ];
  ghc = haskell.compiler.ghcHEAD;
}
```

Para instalar Agda sem GHC, use `ghc = null;`.

## Escrevendo pacotes Agda {#writing-agda-packages}

Para escrever uma nix derivation para uma biblioteca Agda, primeiro verifique se a biblioteca possui um (único) arquivo `*.agda-lib`.

Uma derivation pode então ser escrita usando `agdaPackages.mkDerivation`. Isso possui argumentos semelhantes aos de `stdenv.mkDerivation` com as seguintes adições:

* `libraryName` deve ser o nome que aparece no arquivo `*.agda-lib`, com padrão para `pname`.
* `libraryFile` deve ser o nome do arquivo `*.agda-lib`, com padrão para `${libraryName}.agda-lib`.

Aqui está um exemplo de `default.nix`

```nix
{
  nixpkgs ? <nixpkgs>,
}:
with (import nixpkgs { });
agdaPackages.mkDerivation {
  version = "1.0";
  pname = "my-agda-lib";
  src = ./.;
  buildInputs = [ agdaPackages.standard-library ];
}
```

### Construindo pacotes Agda {#building-agda-packages}

A fase de build padrão para `agdaPackages.mkDerivation` executa `agda --build-library`. Se algo mais for necessário para construir o pacote (por exemplo, `make`), então o `buildPhase` deve ser sobrescrito. Além disso, um `preBuild` ou `configurePhase` pode ser usado se houver etapas que precisam ser feitas antes de verificar a biblioteca. `agda` e as bibliotecas Agda contidas em `buildInputs` são disponibilizadas durante a fase de build.

### Instalando pacotes Agda {#installing-agda-packages}

A fase de instalação padrão copia os arquivos fonte Agda, arquivos de interface Agda (`*.agdai`) e arquivos `*.agda-lib` para o diretório de saída. Isso pode ser sobrescrito.

Por padrão, os fontes Agda são arquivos terminados em `.agda`, ou arquivos Agda literários terminados em `.lagda`, `.lagda.tex`, `.lagda.org`, `.lagda.md`, `.lagda.rst`. A lista de extensões de fonte Agda reconhecidas pode ser estendida configurando a variável de configuração `extraExtensions`.

## Mantendo o conjunto de pacotes Agda no Nixpkgs {#maintaining-the-agda-package-set-on-nixpkgs}

Nosso objetivo é fornecer todas as bibliotecas Agda comuns como pacotes no `nixpkgs`, e mantê-las atualizadas. Contribuições e ajuda na manutenção são sempre apreciadas, mas o esforço de manutenção é tipicamente baixo, já que o ecossistema Agda é bastante pequeno.

O conjunto de pacotes Agda do `nixpkgs` tenta assumir um papel semelhante ao do [Stackage](https://www.stackage.org/) no mundo Haskell. É um conjunto curado de bibliotecas que:

1. Sempre funcionam juntas.
2. Estão o mais atualizadas possível.

Enquanto o ecossistema Haskell é enorme, e o Stackage é altamente automatizado, o conjunto de pacotes Agda é pequeno e pode (ainda) ser mantido manualmente.

### Adicionando pacotes Agda ao Nixpkgs {#adding-agda-packages-to-nixpkgs}

Para adicionar um pacote Agda ao `nixpkgs`, a derivation deve ser escrita em `pkgs/development/libraries/agda/${library-name}/default.nix` e uma entrada deve ser adicionada a `pkgs/top-level/agda-packages.nix`. Aqui é chamado em um escopo com acesso a todas as outras bibliotecas Agda, então a derivation poderia se parecer com:

```nix
{
  mkDerivation,
  standard-library,
  fetchFromGitHub,
}:

mkDerivation {
  pname = "my-library";
  version = "1.0";
  src = <...>;
  buildInputs = [ standard-library ];
  meta = <...>;
}
```

Você pode consultar outros arquivos em `pkgs/development/libraries/agda/` para mais inspiração.

Note que a função de derivation é chamada com `mkDerivation` configurado para `agdaPackages.mkDerivation`, portanto você poderia usar um conjunto similar ao do seu `default.nix` de [Escrevendo pacotes Agda](#writing-agda-packages) com `agdaPackages.mkDerivation` substituído por `mkDerivation`.

Aqui está um esqueleto de derivation de exemplo para iowa-stdlib:

```nix
mkDerivation {
  version = "1.5.0";
  pname = "iowa-stdlib";

  src = <...>;

  libraryFile = "";
  libraryName = "IAL-1.3";

  buildPhase = ''
    runHook preBuild

    patchShebangs find-deps.sh
    make

    runHook postBuild
  '';
}
```

Esta biblioteca possui um arquivo chamado `.agda-lib`, e por isso fornecemos uma string vazia para `libraryFile`, já que nada precede `.agda-lib` no nome do arquivo. Este arquivo contém `name: IAL-1.3`, e por isso definimos `libraryName = "IAL-1.3"`. Esta biblioteca não usa um arquivo `Everything.agda` e, em vez disso, possui um Makefile, então não há necessidade de definir `everythingFile` e configuramos um `buildPhase` personalizado.

Ao escrever um pacote Agda, é essencial garantir que nenhum arquivo `.agda-lib` seja adicionado ao store como um único arquivo (por exemplo, usando `writeText`). Isso faz com que Agda pense que o nix store é uma biblioteca Agda e tentará escrever nele sempre que verificar tipos. Veja [https://github.com/agda/agda/issues/4613](https://githcub.com/agda/agda/issues/4613).

Na pull request que adiciona esta biblioteca, você pode testar se ela compila corretamente escrevendo em um comentário:

```
@ofborg build agdaPackages.my-library
```

### Mantendo pacotes Agda {#agda-maintaining-packages}

Como mencionado anteriormente, o objetivo é ter um conjunto de pacotes compatível e atualizado. Essas duas condições às vezes se excluem: Por exemplo, se atualizarmos `agdaPackages.standard-library` devido a um lançamento upstream, isso tipicamente quebrará muitas dependências reversas, ou seja, bibliotecas Agda downstream que dependem da biblioteca padrão. No `nixpkgs`, somos tipicamente os primeiros a notar isso, já que temos testes de build implementados para verificar isso.

Em uma pull request que atualiza, por exemplo, a biblioteca padrão, você deve escrever o seguinte comentário:

```
@ofborg build agdaPackages.standard-library.passthru.tests
```

Isso construirá todas as dependências reversas da biblioteca padrão, por exemplo `agdaPackages.agda-categories`.

Em alguns casos, é útil construir _todos_ os pacotes Agda. Isso pode ser feito com o seguinte comentário no Github:

```
@ofborg build agda.passthru.tests.allPackages
```

Às vezes, as builds das dependências reversas falham porque ainda não foram atualizadas e lançadas. Você deve enviar aos mantenedores um aviso rápido sobre a quebra, citando o erro de build (que você pode obter dos logs do ofborg). Se você estiver motivado, pode até enviar uma pull request que o corrija. Geralmente, os mantenedores responderão dentro de uma ou duas semanas com um novo lançamento. Aumentar a versão dessa dependência reversa deve ser um commit adicional em sua PR.

No caso raro de um novo lançamento não ser esperado dentro de um tempo aceitável, marque o pacote quebrado como quebrado definindo `meta.broken = true;`. Isso o excluirá do teste de build. Ele pode ser adicionado posteriormente, quando for corrigido, e não impede o avanço de todo o conjunto de pacotes nesse ínterim.