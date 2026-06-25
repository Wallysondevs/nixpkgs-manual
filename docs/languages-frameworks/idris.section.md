# Idris {#idris}

## Instalando Idris {#installing-idris}

A maneira mais fácil de obter uma versão funcional do idris é instalar o atributo `idris`:

```ShellSession
$ nix-env -f "<nixpkgs>" -iA idris
```

No entanto, isso fornece apenas as bibliotecas `prelude` e `base`. Para instalar o idris com bibliotecas adicionais, você pode usar a função `idrisPackages.with-packages`, por exemplo, em um overlay em `~/.config/nixpkgs/overlays/my-idris.nix`:

```nix
self: super: {
  myIdris =
    with self.idrisPackages;
    with-packages [
      contrib
      pruviloj
    ];
}
```

E então:

```ShellSession
$ # On NixOS
$ nix-env -iA nixos.myIdris
$ # On non-NixOS
$ nix-env -iA nixpkgs.myIdris
```

Para ver todos os pacotes Idris disponíveis:

```ShellSession
$ # On NixOS
$ nix-env -qaPA nixos.idrisPackages
$ # On non-NixOS
$ nix-env -qaPA nixpkgs.idrisPackages
```

Similarmente, ao entrar em um `nix-shell`:

```ShellSession
$ nix-shell -p 'idrisPackages.with-packages (with idrisPackages; [ contrib pruviloj ])'
```

## Iniciando Idris com suporte a bibliotecas {#starting-idris-with-library-support}

Para ter acesso a essas bibliotecas no idris, chame-o com um argumento `-p <library name>` para cada biblioteca:

```ShellSession
$ nix-shell -p 'idrisPackages.with-packages (with idrisPackages; [ contrib pruviloj ])'
[nix-shell:~]$ idris -p contrib -p pruviloj
```

Uma listagem de todos os pacotes disponíveis aos quais o binário Idris tem acesso está disponível via `--listlibs`:

```ShellSession
$ idris --listlibs
00prelude-idx.ibc
pruviloj
base
contrib
prelude
00pruviloj-idx.ibc
00base-idx.ibc
00contrib-idx.ibc
```

## Construindo um projeto Idris com Nix {#building-an-idris-project-with-nix}

Como exemplo de como uma expressão Nix para um pacote Idris pode ser criada, aqui está a para `idrisPackages.yaml`:

```nix
{
  lib,
  build-idris-package,
  fetchFromGitHub,
  contrib,
  lightyear,
}:
build-idris-package {
  name = "yaml";
  version = "2018-01-25";

  # This is the .ipkg file that should be built, defaults to the package name
  # In this case it should build `Yaml.ipkg` instead of `yaml.ipkg`
  # This is only necessary because the yaml packages ipkg file is
  # different from its package name here.
  ipkgName = "Yaml";
  # Idris dependencies to provide for the build
  idrisDeps = [
    contrib
    lightyear
  ];

  src = fetchFromGitHub {
    owner = "Heather";
    repo = "Idris.Yaml";
    rev = "5afa51ffc839844862b8316faba3bafa15656db4";
    hash = "sha256-h28F9EEPuvab6zrfeE+0k1XGQJGwINnsJEG8yjWIl7w=";
  };

  meta = {
    description = "Idris YAML lib";
    homepage = "https://github.com/Heather/Idris.Yaml";
    license = lib.licenses.mit;
    maintainers = [ lib.maintainers.brainrape ];
  };
}
```

Assumindo que este arquivo seja salvo como `yaml.nix`, ele pode ser construído usando

```ShellSession
$ nix-build -E '(import <nixpkgs> {}).idrisPackages.callPackage ./yaml.nix {}'
```

Ou é possível usar

```nix
with import <nixpkgs> { };

{
  yaml = idrisPackages.callPackage ./yaml.nix { };
}
```

em outro arquivo (digamos `default.nix`) para poder construí-lo com

```ShellSession
$ nix-build -A yaml
```

## Passando opções para comandos `idris` {#passing-options-to-idris-commands}

A função `build-idris-package` também fornece valores de entrada opcionais para definir opções adicionais para os comandos `idris` usados.

Especificamente, você pode definir `idrisBuildOptions`, `idrisTestOptions`, `idrisInstallOptions` e `idrisDocOptions` para fornecer opções adicionais ao comando `idris` respectivamente ao construir, testar, instalar e gerar documentação para seu pacote.

Por exemplo, você poderia definir

```nix
build-idris-package {
  idrisBuildOptions = [
    "--log"
    "1"
    "--verbose"
  ];

  # ...
}
```

para exigir saída detalhada durante a fase de construção do `idris`.