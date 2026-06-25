# libglycin {#libglycin-hooks}

[Glycin](https://gitlab.gnome.org/GNOME/glycin) é uma biblioteca para carregamento de imagens em sandbox e extensível.

[]{#libglycin-setup-hook} Para a maioria das aplicações que a utilizam, formatos de imagem individuais são carregados através de binários fornecidos por `glycin-loaders`. Os caminhos desses carregadores devem ser injetados no ambiente, por exemplo, usando [`wrapGAppsHook`](#ssec-gnome-hooks). `libglycin.setupHook` fará isso.

[]{#libglycin-patch-vendor-hook} Adicionalmente, para projetos Rust, o próprio crate `glycin` Rust requer um patch para se tornar autocontido. `libglycin.patchVendorHook` fará isso. Isso não é necessário para projetos que usam a biblioteca ELF do pacote `libglycin`.

## Exemplo de trecho de código {#libglycin-hooks-example-code-snippet}

```nix
{
  lib,
  rustPlatform,
  libglycin,
  glycin-loaders,
  wrapGAppsHook4,
}:

rustPlatform.buildRustPackage {
  # ...

  cargoHash = "...";

  nativeBuildInputs = [
    wrapGAppsHook4
    libglycin.patchVendorHook
  ];

  buildInputs = [
    libglycin.setupHook
    glycin-loaders
  ];

  # ...
}
```

## Variáveis que controlam `glycin-loaders` {#libglycin-hook-variables-controlling}

### `glycinCargoDepsPath` {#glycin-cargo-deps-path}

Caminho para um diretório contendo o crate `glycin` a ser corrigido. O padrão é o diretório do crate criado por `cargoSetupHook`, ou `./vendor/`.

### `dontWrapGlycinLoaders` {#glycin-dont-wrap}

Desabilita a adição do caminho dos carregadores Glycin `XDG_DATA_DIRS` com `wrapGAppsHook`.