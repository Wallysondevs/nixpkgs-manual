# `installFonts` {#installfonts}

Este hook instala formatos de fonte comuns no local apropriado. Em seu estado padrão, o hook lida automaticamente com ttf, ttc, otf, bdf e psf. Dado um output `webfont`, os formatos woff e woff2 serão instalados sob este output.

O comportamento automático do hook pode ser desativado definindo a variável `dontInstallFonts` como true.

Além disso, ele expõe a função `installFont` que pode ser usada a partir do seu hook `postInstall`, para instalar formatos adicionais:

## `installFont` {#installfonts-installfont}

A função `installFont` recebe dois argumentos: uma extensão de arquivo para mover (*sem* um ponto precedente) e o local de instalação.

### Exemplo de Uso {#installfonts-installfont-exampleusage}

```nix
{
  nativeBuildInputs = [ installFonts ];

  postInstall = ''
    installFont svg $out/share/fonts/svg
  '';
}
```