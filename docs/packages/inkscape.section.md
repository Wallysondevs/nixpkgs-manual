# Inkscape {#sec-inkscape}

[Inkscape](https://inkscape.org) é um poderoso editor de gráficos vetoriais.

## Plugins {#inkscape-plugins}
Os plugins do Inkscape são coletados no conjunto de pacotes [`inkscape-extensions`](https://search.nixos.org/packages?channel=unstable&type=packages&query=cudaPackages).
Para habilitá-los, use um override em `inkscape-with-extensions`:

```nix
inkscape-with-extensions.override {
  inkscapeExtensions = with inkscape-extensions; [ inkstitch ];
}
```

Da mesma forma, isso funciona no shell:

```bash
$ nix-shell -p 'inkscape-with-extensions.override { inkscapeExtensions = with inkscape-extensions; [inkstitch]; }'
[nix-shell:~]$ # Ink/Stitch is now available via the extension menu
[nix-shell:~]$ inkscape
```

Todas as extensões disponíveis podem ser habilitadas passando `inkscapeExtensions = null;`.

::: {.note}
Carregar as extensões do Inkscape de forma independente (sem usar `override`) não afeta o Inkscape de forma alguma.
:::