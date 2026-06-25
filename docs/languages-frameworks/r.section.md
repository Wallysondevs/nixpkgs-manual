# R {#r}

## Instalação {#installation}

Defina um ambiente para R que contenha todas as bibliotecas que você gostaria de usar adicionando o seguinte trecho ao seu arquivo $HOME/.config/nixpkgs/config.nix:

```nix
{
  packageOverrides =
    super:
    let
      self = super.pkgs;
    in
    {

      rEnv = super.rWrapper.override {
        packages = with self.rPackages; [
          devtools
          ggplot2
          reshape2
          yaml
          optparse
        ];
      };
    };
}
```

Então você pode usar `nix-env -f "<nixpkgs>" -iA rEnv` para instalá-lo em seu perfil de usuário. O conjunto de bibliotecas disponíveis pode ser descoberto executando o comando `nix-env -f "<nixpkgs>" -qaP -A rPackages`. A primeira coluna dessa saída é o nome que deve ser passado para rWrapper no trecho de código acima.

No entanto, se você quiser adicionar um arquivo à fonte do seu projeto para tornar o ambiente disponível para outros colaboradores, você pode criar um arquivo `default.nix` assim:

```nix
with import <nixpkgs> { };
{
  myProject = stdenv.mkDerivation {
    name = "myProject";
    version = "1";
    src = if lib.inNixShell then null else nix;

    buildInputs = with rPackages; [
      R
      ggplot2
      knitr
    ];
  };
}
```
e então execute `nix-shell .` para entrar em um shell com esses pacotes disponíveis.

## RStudio {#rstudio}

O RStudio usa um conjunto padrão de pacotes e ignora quaisquer ambientes R personalizados ou pacotes instalados que você possa ter. Para criar um ambiente personalizado, consulte `rstudioWrapper`, que funciona de forma semelhante a `rWrapper`:

```nix
{
  packageOverrides =
    super:
    let
      self = super.pkgs;
    in
    {

      rstudioEnv = super.rstudioWrapper.override {
        packages = with self.rPackages; [
          dplyr
          ggplot2
          reshape2
        ];
      };
    };
}
```

Então, como acima, `nix-env -f "<nixpkgs>" -iA rstudioEnv` irá instalar isso em seu perfil de usuário.

Alternativamente, você pode criar um `shell.nix` autocontido sem a necessidade de modificar nenhum arquivo de configuração:

```nix
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.rstudioWrapper.override {
  packages = with pkgs.rPackages; [
    dplyr
    ggplot2
    reshape2
  ];
}
```

A execução de `nix-shell` então o colocará em um ambiente equivalente ao descrito acima. Se você precisar de pacotes adicionais, basta adicioná-los à lista e reentrar no shell.

## Atualizando o conjunto de pacotes {#updating-the-package-set}

Existe um script e um ambiente associado para regenerar os conjuntos de pacotes e sincronizar a árvore rPackages com o CRAN atual e a versão BIOC correspondente. Esses scripts são encontrados no diretório `pkgs/development/r-modules` e executados da seguinte forma:

```bash
nix-shell generate-shell.nix

Rscript generate-r-packages.R cran  > cran-packages.json.new
mv cran-packages.json.new cran-packages.json

Rscript generate-r-packages.R bioc  > bioc-packages.json.new
mv bioc-packages.json.new bioc-packages.json

Rscript generate-r-packages.R bioc-annotation > bioc-annotation-packages.json.new
mv bioc-annotation-packages.json.new bioc-annotation-packages.json

Rscript generate-r-packages.R bioc-experiment > bioc-experiment-packages.json.new
mv bioc-experiment-packages.json.new bioc-experiment-packages.json
```

`generate-r-packages.R <repo>` lê `<repo>-packages.json`, daí a renomeação.

O conteúdo de um arquivo `*-packages.json` gerado será usado para criar uma derivation de pacote para cada pacote R listado no arquivo.

Alguns pacotes exigem overrides para especificar dependências externas ou outros patches e requisitos especiais. Esses overrides são especificados no arquivo `pkgs/development/r-modules/default.nix`. Como o conteúdo de `*-packages.json` é gerado automaticamente, ele não deve ser editado e as compilações quebradas devem ser resolvidas usando overrides.