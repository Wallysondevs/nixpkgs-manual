# Kakoune {#sec-kakoune}

Kakoune pode ser construído para carregar plugins automaticamente:

```nix
(kakoune.override { plugins = with pkgs.kakounePlugins; [ parinfer-rust ]; })
```