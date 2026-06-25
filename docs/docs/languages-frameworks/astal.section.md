# Astal {#astal}

Astal é uma coleção de blocos de construção para criar shells de desktop personalizados.

## Empacotamento {#astal-bundling}

O empacotamento de uma aplicação Astal é feito usando a ferramenta `ags`. Você pode usá-la assim:

```nix
ags.bundle {
  pname = "hyprpanel";
  version = "1.0.0";

  src = fetchFromGitHub {
    #...
  };

  # change your entry file (default is `app.ts`)
  entry = "app.ts";

  dependencies = [
    # list here astal modules that your package depends on
    # `astal3`, `astal4` and `astal.io` are automatically included
    astal.apps
    astal.battery
    astal.bluetooth

    # you can also list here other runtime dependencies
    hypridle
    hyprpicker
    hyprsunset
  ];

  # GTK 4 support is opt-in
  enableGtk4 = true;

  meta = {
    #...
  };
}
```

Você também pode passar todos os outros argumentos que são suportados por `stdenv.mkDerivation`.