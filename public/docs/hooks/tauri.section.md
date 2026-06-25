# cargo-tauri.hook {#tauri-hook}

[Tauri](https://tauri.app/) é um framework para construir aplicações desktop menores, mais rápidas e mais seguras com um frontend web.

No Nixpkgs, `cargo-tauri.hook` sobrescreve as fases padrão de build e instalação.

## Exemplo de trecho de código {#tauri-hook-example-code-snippet}

```nix
{
  lib,
  stdenv,
  rustPlatform,
  fetchNpmDeps,
  cargo-tauri,
  glib-networking,
  nodejs,
  npmHooks,
  openssl,
  pkg-config,
  webkitgtk_4_1,
  wrapGAppsHook4,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  # ...

  cargoHash = "...";

  # Assuming our app's frontend uses `npm` as a package manager
  npmDeps = fetchNpmDeps {
    name = "${finalAttrs.pname}-${finalAttrs.version}-npm-deps";
    inherit (finalAttrs) src;
    hash = "...";
  };

  nativeBuildInputs = [
    # Pull in our main hook
    cargo-tauri.hook

    # Setup npm
    nodejs
    npmHooks.npmConfigHook

    # Make sure we can find our libraries
    pkg-config
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [ wrapGAppsHook4 ];

  buildInputs = lib.optionals stdenv.hostPlatform.isLinux [
    glib-networking # Most Tauri apps need networking
    openssl
    webkitgtk_4_1
  ];

  # Set our Tauri source directory
  cargoRoot = "src-tauri";
  # And make sure we build there too
  buildAndTestSubdir = finalAttrs.cargoRoot;

  # ...
})
```

## Variáveis que controlam cargo-tauri {#tauri-hook-variables-controlling}

### Variáveis Exclusivas do Tauri {#tauri-hook-exclusive-variables}

#### `tauriBuildFlags` {#tauri-build-flags}

Controla as flags passadas para `cargo tauri build`.

#### `tauriBundleType` {#tauri-bundle-type}

O [tipo de bundle](https://tauri.app/v1/guides/building/) a ser construído.

#### `dontTauriBuild` {#dont-tauri-build}

Desabilita o uso de `tauriBuildHook`.

#### `dontTauriFixup` {#dont-tauri-fixup}

Desabilita a fase de pré-fixup de `tauriFixupHook`.

#### `dontTauriInstall` {#dont-tauri-install}

Desabilita o uso de `tauriInstallPostBuildHook` e `tauriInstallHook`.

### Variáveis Respeitadas {#tauri-hook-honored-variables}

Juntamente com as encontradas em [](#compiling-rust-applications-with-cargo), as seguintes variáveis usadas por `cargoBuildHook` e `cargoInstallHook` são respeitadas pelo setup hook de cargo-tauri.

- `buildAndTestSubdir`
- `cargoBuildType`
- `cargoBuildNoDefaultFeatures`
- `cargoBuildFeatures`