# Crystal {#crystal}

## Construindo um pacote Crystal {#building-a-crystal-package}

Esta seção usa [Mint](https://github.com/mint-lang/mint) como exemplo de como construir um pacote Crystal.

Se o projeto Crystal tiver alguma dependência, o primeiro passo é obter um arquivo `shards.nix` que as codifique. Obtenha uma cópia do projeto e vá para seu diretório raiz, de modo que seu arquivo `shard.lock` esteja no diretório atual. Projetos executáveis geralmente devem commitar o arquivo `shard.lock`, mas às vezes isso não acontece, o que significa que você precisa gerá-lo por conta própria. Com um arquivo `shard.lock` existente, `crystal2nix` pode ser executado.
```bash
$ git clone https://github.com/mint-lang/mint
$ cd mint
$ git checkout 0.5.0
$ if [ ! -f shard.lock ]; then nix-shell -p shards --run "shards lock"; fi
$ nix-shell -p crystal2nix --run crystal2nix
```

Isso deve ter gerado um arquivo `shards.nix`.

Em seguida, crie um arquivo Nix para sua derivation e use `pkgs.crystal.buildCrystalPackage` da seguinte forma:

```nix
with import <nixpkgs> { };
crystal.buildCrystalPackage rec {
  pname = "mint";
  version = "0.5.0";

  src = fetchFromGitHub {
    owner = "mint-lang";
    repo = "mint";
    tag = version;
    hash = "sha256-dFN9l5fgrM/TtOPqlQvUYgixE4KPr629aBmkwdDoq28=";
  };

  # Insert the path to your shards.nix file here
  shardsFile = ./shards.nix;

  # ...
}
```

Isso não construirá nada ainda, porque não informamos quais arquivos devem ser construídos. Podemos especificar um mapeamento de nomes de binários para arquivos de origem com o atributo `crystalBinaries`. As instruções de compilação do projeto devem mostrar isso. Para Mint, o binário é chamado "mint", que é compilado a partir do arquivo de origem `src/mint.cr`, então especificaremos isso da seguinte forma:

```nix
{
  crystalBinaries.mint.src = "src/mint.cr";

  # ...
}
```

Além disso, você pode sobrescrever as opções padrão de `crystal build` (que atualmente são `--release --progress --no-debug --verbose`) com

```nix
{
  crystalBinaries.mint.options = [
    "--release"
    "--verbose"
  ];
}
```

Dependendo do projeto, você pode precisar de passos adicionais para que ele compile com sucesso. No caso do Mint, precisamos fazer o link com openssl, então no final o arquivo Nix fica assim:

```nix
with import <nixpkgs> { };
crystal.buildCrystalPackage rec {
  version = "0.5.0";
  pname = "mint";
  src = fetchFromGitHub {
    owner = "mint-lang";
    repo = "mint";
    tag = version;
    hash = "sha256-dFN9l5fgrM/TtOPqlQvUYgixE4KPr629aBmkwdDoq28=";
  };

  shardsFile = ./shards.nix;
  crystalBinaries.mint.src = "src/mint.cr";

  buildInputs = [ openssl ];
}
```