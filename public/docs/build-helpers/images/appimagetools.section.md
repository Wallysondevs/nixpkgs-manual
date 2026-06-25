# pkgs.appimageTools {#sec-pkgs-appimageTools}

`pkgs.appimageTools` é um conjunto de funções para extrair e empacotar (wrapping) arquivos [AppImage](https://appimage.org/).
Elas são destinadas a serem usadas se o empacotamento tradicional a partir do código-fonte for inviável, ou se levar muito tempo.
Para executar rapidamente um arquivo AppImage, `pkgs.appimage-run` também pode ser usado.

::: {.warning}
A API `appimageTools` é instável e pode estar sujeita a mudanças incompatíveis com versões anteriores no futuro.
:::

## Empacotamento (Wrapping) {#ssec-pkgs-appimageTools-wrapping}

Use `wrapType2` para empacotar qualquer AppImage.
Isso criará um ambiente FHS com muitos pacotes [esperados para existir](https://github.com/AppImage/pkg2appimage/blob/master/excludelist) para que o AppImage funcione.
`wrapType2` espera um argumento com o atributo `src`, e ou um atributo `name` ou os atributos `pname` e `version`.

Ele eventualmente chamará [`buildFHSEnv`](#sec-fhs-environments), e quaisquer atributos extras no argumento para `wrapType2` serão passados para ele.
Isso significa que você pode passar o atributo `extraInstallCommands`, por exemplo, e ele terá o mesmo efeito descrito em [`buildFHSEnv`](#sec-fhs-environments).

::: {.note}
No passado, `appimageTools` fornecia tanto `wrapType1` quanto `wrapType2`, para serem usados dependendo do tipo de AppImage que estava sendo empacotado.
No entanto, [eles foram unificados no início de 2020](https://github.com/NixOS/nixpkgs/pull/81833), o que significa que tanto `wrapType1` quanto `wrapType2` têm o mesmo comportamento agora.
:::

:::{.example #ex-wrapping-appimage-from-github}

# Empacotando um AppImage do GitHub

```nix
{ appimageTools, fetchurl }:
let
  pname = "nuclear";
  version = "0.6.30";

  src = fetchurl {
    url = "https://github.com/nukeop/nuclear/releases/download/v${version}/nuclear-v${version}.AppImage";
    hash = "sha256-he1uGC1M/nFcKpMM9JKY4oeexJcnzV0ZRxhTjtJz6xw=";
  };
in
appimageTools.wrapType2 { inherit pname version src; }
```

:::

O argumento passado para `wrapType2` também pode conter um atributo `extraPkgs`, que permite incluir pacotes adicionais dentro do ambiente FHS em que seu AppImage será executado.
`extraPkgs` deve ser uma função que retorna uma lista de pacotes.
Existem algumas maneiras de descobrir quais dependências um aplicativo precisa:

  - Procurando nos arquivos AppImage extraídos, lendo seus scripts e executando `patchelf` e `ldd` em seus executáveis.
    Isso também pode ser feito em `appimage-run`, definindo `APPIMAGE_DEBUG_EXEC=bash`.
  - Executando `strace -vfefile` no executável empacotado, procurando por bibliotecas que não podem ser encontradas.

:::{.example #ex-wrapping-appimage-with-extrapkgs}

# Empacotando um AppImage com pacotes extras

```nix
{ appimageTools, fetchurl }:
let
  pname = "irccloud";
  version = "0.16.0";

  src = fetchurl {
    url = "https://github.com/irccloud/irccloud-desktop/releases/download/v${version}/IRCCloud-${version}-linux-x86_64.AppImage";
    hash = "sha256-/hMPvYdnVB1XjKgU2v47HnVvW4+uC3rhRjbucqin4iI=";
  };
in
appimageTools.wrapType2 {
  inherit pname version src;
  extraPkgs = pkgs: [ pkgs.at-spi2-core ];
}
```

:::

## Extração {#ssec-pkgs-appimageTools-extracting}

Use `extract` se precisar extrair o conteúdo de um AppImage.
Isso geralmente é usado no Nixpkgs para instalar arquivos extras além de [empacotar](#ssec-pkgs-appimageTools-wrapping) o AppImage.
`extract` espera um argumento com o atributo `src`, e ou um atributo `name` ou os atributos `pname` e `version`.

::: {.note}
No passado, `appimageTools` fornecia tanto `extractType1` quanto `extractType2`, para serem usados dependendo do tipo de AppImage que estava sendo extraído.
No entanto, [eles foram unificados no início de 2020](https://github.com/NixOS/nixpkgs/pull/81572), o que significa que tanto `extractType1` quanto `extractType2` têm o mesmo comportamento que `extract` agora.
:::

:::{.example #ex-extracting-appimage}

# Extraindo um AppImage para instalar arquivos extras

Este exemplo foi adaptado de um pacote real no Nixpkgs para mostrar como `extract` é geralmente usado em combinação com `wrapType2`.
Observe como `appimageContents` é usado em `extraInstallCommands` para instalar arquivos adicionais que foram extraídos do AppImage.

```nix
{ appimageTools, fetchurl }:
let
  pname = "irccloud";
  version = "0.16.0";

  src = fetchurl {
    url = "https://github.com/irccloud/irccloud-desktop/releases/download/v${version}/IRCCloud-${version}-linux-x86_64.AppImage";
    hash = "sha256-/hMPvYdnVB1XjKgU2v47HnVvW4+uC3rhRjbucqin4iI=";
  };

  appimageContents = appimageTools.extract { inherit pname version src; };
in
appimageTools.wrapType2 {
  inherit pname version src;

  extraPkgs = pkgs: [ pkgs.at-spi2-core ];

  extraInstallCommands = ''
    mv $out/bin/irccloud-${version} $out/bin/irccloud
    install -m 444 -D ${appimageContents}/irccloud.desktop $out/share/applications/irccloud.desktop
    install -m 444 -D ${appimageContents}/usr/share/icons/hicolor/512x512/apps/irccloud.png \
      $out/share/icons/hicolor/512x512/apps/irccloud.png
    substituteInPlace $out/share/applications/irccloud.desktop \
      --replace-fail 'Exec=AppRun' 'Exec=irccloud'
  '';
}
```

:::

O argumento passado para `extract` também pode conter um atributo `postExtract`, que permite executar comandos adicionais após os arquivos serem extraídos do AppImage.
`postExtract` deve ser uma string com comandos a serem executados.

::: {.warning}
Ao especificar `postExtract`, você deve usar `appimageTools.wrapAppImage` em vez de `appimageTools.wrapType2`.
Caso contrário, `wrapType2` extrairá o conteúdo do AppImage sem respeitar as instruções de `postExtract`.
:::

:::{.example #ex-extracting-appimage-with-postextract}

# Extraindo um AppImage para instalar arquivos extras, usando `postExtract`

Esta é uma reescrita de [](#ex-extracting-appimage) para usar `postExtract` e `wrapAppImage`.

```nix
{ appimageTools, fetchurl }:
let
  pname = "irccloud";
  version = "0.16.0";

  src = fetchurl {
    url = "https://github.com/irccloud/irccloud-desktop/releases/download/v${version}/IRCCloud-${version}-linux-x86_64.AppImage";
    hash = "sha256-/hMPvYdnVB1XjKgU2v47HnVvW4+uC3rhRjbucqin4iI=";
  };

  appimageContents = appimageTools.extract {
    inherit pname version src;
    postExtract = ''
      substituteInPlace $out/irccloud.desktop --replace-fail 'Exec=AppRun' 'Exec=irccloud'
    '';
  };
in
appimageTools.wrapAppImage {
  inherit pname version;

  src = appimageContents;

  extraPkgs = pkgs: [ pkgs.at-spi2-core ];

  extraInstallCommands = ''
    mv $out/bin/irccloud-${version} $out/bin/irccloud
    install -m 444 -D ${appimageContents}/irccloud.desktop $out/share/applications/irccloud.desktop
    install -m 444 -D ${appimageContents}/usr/share/icons/hicolor/512x512/apps/irccloud.png \
      $out/share/icons/hicolor/512x512/apps/irccloud.png
  '';

  # specify src archive for nix-update
  passthru.src = src;
}
```

:::