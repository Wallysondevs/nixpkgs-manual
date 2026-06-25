# Zig {#zig}

[Zig](https://ziglang.org/) é uma linguagem de programação de propósito geral e um conjunto de ferramentas para manter software robusto, otimizado e reutilizável.

No Nixpkgs, `zig` sobrescreve as fases padrão de build, check e install.

## Exemplo de trecho de código {#zig-example-code-snippet}

```nix
{
  lib,
  stdenv,
  zig,
}:

stdenv.mkDerivation {
  # . . .

  nativeBuildInputs = [ zig ];

  zigBuildFlags = [ "-Dman-pages=true" ];

  dontUseZigCheck = true;

  # . . .
}
```

## Variáveis que controlam o zig {#zig-variables-controlling}

### Variáveis Exclusivas do `zig` {#zig-exclusive-variables}

As variáveis abaixo são exclusivas do `zig`.

#### `dontUseZigConfigure` {#dont-use-zig-configure}

Desabilita o uso de `zigConfigurePhase`.

#### `dontUseZigBuild` {#dont-use-zig-build}

Desabilita o uso de `zigBuildPhase`.

#### `dontUseZigCheck` {#dont-use-zig-check}

Desabilita o uso de `zigCheckPhase`.

#### `dontUseZigInstall` {#dont-use-zig-install}

Desabilita o uso de `zigInstallPhase`.

#### `dontSetZigDefaultFlags` {#dont-set-zig-default-flags}

Desabilita o uso de um conjunto de flags padrão ao realizar builds do zig.

### Variáveis semelhantes {#zig-similar-variables}

As seguintes variáveis são semelhantes às suas contrapartes em `stdenv.mkDerivation`.

| `zig` Variable | `stdenv.mkDerivation` Counterpart |
|---------------------|-----------------------------------|
| `zigBuildFlags`     | `buildFlags`                      |
| `zigCheckFlags`     | `checkFlags`                      |
| `zigInstallFlags`   | `installFlags`                    |

### Variáveis respeitadas pelo zig {#zig-variables-honored}

As seguintes variáveis, comumente usadas por `stdenv.mkDerivation`, são respeitadas pelo `zig`.

- `prefixKey`
- `dontAddPrefix`