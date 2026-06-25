# iOS {#ios}

Este componente é basicamente um wrapper/solução alternativa que possibilita expor uma instalação do Xcode como um pacote Nix por meio de symlinks para os executáveis relevantes no sistema host.

Como o Xcode não pode ser empacotado com Nix, nem podemos publicá-lo como um pacote Nix (devido à sua licença), esta é basicamente a única estratégia de integração que torna possível realizar builds de aplicativos iOS que se integram com outros componentes do ecossistema Nix.

O objetivo principal deste projeto é usar a linguagem de expressão Nix para especificar como os aplicativos iOS podem ser construídos a partir do código-fonte e para iniciar automaticamente instâncias de simulador iOS para testes.

Este componente também possibilita o uso do [Hydra](https://nixos.org/hydra), o servidor de integração contínua baseado em Nix, para construir regularmente aplicativos iOS e para fazer instalações ad-hoc sem fio de IPAs empresariais em dispositivos iOS através do Hydra.

O ambiente de build do Xcode implementa uma série de recursos.

## Implantando um wrapper de componente proxy que expõe o Xcode {#deploying-a-proxy-component-wrapper-exposing-xcode}

O primeiro caso de uso é implantar um pacote Nix que fornece symlinks para a instalação do Xcode no sistema host. Este pacote pode ser usado como uma entrada de build para qualquer função de build implementada na linguagem de expressão Nix que exija o Xcode.

```nix
let
  pkgs = import <nixpkgs> { };

  xcodeenv = import ./xcodeenv { inherit (pkgs) stdenv; };
in
xcodeenv.composeXcodeWrapper {
  version = "9.2";
  xcodeBaseDir = "/Applications/Xcode.app";
}
```

Ao implantar a expressão acima com `nix-build` e inspecionar seu conteúdo, você notará que vários executáveis relacionados ao Xcode são expostos como um pacote Nix:

```bash
$ ls result/bin
lrwxr-xr-x  1 sander  staff  94  1 jan  1970 Simulator -> /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator
lrwxr-xr-x  1 sander  staff  17  1 jan  1970 codesign -> /usr/bin/codesign
lrwxr-xr-x  1 sander  staff  17  1 jan  1970 security -> /usr/bin/security
lrwxr-xr-x  1 sander  staff  21  1 jan  1970 xcode-select -> /usr/bin/xcode-select
lrwxr-xr-x  1 sander  staff  61  1 jan  1970 xcodebuild -> /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild
lrwxr-xr-x  1 sander  staff  14  1 jan  1970 xcrun -> /usr/bin/xcrun
```

## Construindo um aplicativo iOS {#building-an-ios-application}

Podemos construir um executável de aplicativo iOS para o simulador, ou um arquivo IPA/xcarchive para fins de lançamento, por exemplo, instalações ad-hoc, empresariais ou de loja, executando a função `xcodeenv.buildApp {}`:

```nix
let
  pkgs = import <nixpkgs> { };

  xcodeenv = import ./xcodeenv { inherit (pkgs) stdenv; };
in
xcodeenv.buildApp {
  name = "MyApp";
  src = ./myappsources;
  sdkVersion = "11.2";

  target = null; # Corresponds to the name of the app by default
  configuration = null; # Release for release builds, Debug for debug builds
  scheme = null; # -scheme will correspond to the app name by default
  sdk = null; # null will set it to 'iphonesimulator` for simulator builds or `iphoneos` to real builds
  xcodeFlags = "";

  release = true;
  certificateFile = ./mycertificate.p12;
  certificatePassword = "secret";
  provisioningProfile = ./myprovisioning.profile;
  signMethod = "ad-hoc"; # 'enterprise' or 'store'
  generateIPA = true;
  generateXCArchive = false;

  enableWirelessDistribution = true;
  installURL = "/installipa.php";
  bundleId = "mycompany.myapp";
  appVersion = "1.0";

  # Supports all xcodewrapper parameters as well
  xcodeBaseDir = "/Applications/Xcode.app";
}
```

A função acima aceita uma variedade de parâmetros:

* Os parâmetros `name` e `src` são obrigatórios e especificam o nome do aplicativo e o local onde o código-fonte reside.
* `sdkVersion` especifica qual versão do iOS SDK usar.

Também é possível ajustar os parâmetros do `xcodebuild`. Isso só é necessário em raras circunstâncias. Na maioria dos casos, os valores padrão devem ser suficientes:

* `target` especifica qual target do `xcodebuild` construir. Por padrão, ele usa o target que tem o mesmo nome do aplicativo.
* O parâmetro `configuration` pode ser sobrescrito se desejado. Por padrão, ele fará um build de depuração para o simulador e um build de lançamento para dispositivos reais.
* O parâmetro `scheme` especifica qual parâmetro `-scheme` propagar para o `xcodebuild`. Por padrão, ele corresponde ao nome do aplicativo.
* O parâmetro `sdk` especifica qual SDK usar. Por padrão, ele escolhe `iphonesimulator` para builds de simulador e `iphoneos` para builds de lançamento.
* O parâmetro `xcodeFlags` especifica parâmetros arbitrários de linha de comando que devem ser propagados para o `xcodebuild`.

Por padrão, os builds são realizados para o simulador iOS. Para fazer builds de lançamento (builds para dispositivos iOS reais), você deve definir o parâmetro `release` como `true`. Além disso, você precisa definir os seguintes parâmetros:

* `certificateFile` refere-se a um arquivo de certificado P12.
* `certificatePassword` especifica a senha do certificado P12.
* `provisioningProfile` refere-se ao perfil de provisionamento necessário para assinar o aplicativo.
* `signMethod` deve se referir a `ad-hoc` para assinar o aplicativo com um certificado ad-hoc, `enterprise` para certificados empresariais e `app-store` para certificados da App Store.
* `generateIPA` especifica que queremos produzir um arquivo IPA (provavelmente é isso que você deseja).
* `generateXCArchive` especifica que queremos produzir um arquivo xcarchive.

Ao construir arquivos IPA no Hydra e quando se deseja permitir que dispositivos iOS instalem IPAs navegando até a página de produtos de build do Hydra, você pode habilitar o parâmetro `enableWirelessDistribution`.

Quando habilitado, você precisa configurar as seguintes opções:

* O parâmetro `installURL` refere-se à URL de um script PHP que compõe a URL `itms-services://` permitindo que dispositivos iOS instalem o arquivo IPA.
* `bundleId` refere-se ao valor do bundle ID do aplicativo.
* `appVersion` refere-se ao número da versão do aplicativo.

Para usar distribuições ad-hoc sem fio, você também deve instalar o script PHP correspondente em um servidor web (consulte a seção: 'Instalando o script PHP para instalações ad-hoc sem fio do Hydra' para mais informações).

Além dos parâmetros de build, você também pode especificar quaisquer parâmetros que a função `xcodeenv.composeXcodeWrapper {}` aceita. Por exemplo, o parâmetro `xcodeBaseDir` pode ser sobrescrito para se referir a uma versão diferente do Xcode.

## Iniciando instâncias de simulador {#spawning-simulator-instances}

Além de construir aplicativos iOS, também podemos iniciar automaticamente instâncias de simulador:

```nix
let
  pkgs = import <nixpkgs> { };

  xcodeenv = import ./xcodeenv { inherit (pkgs) stdenv; };
in
xcode.simulateApp {
  name = "simulate";

  # Supports all xcodewrapper parameters as well
  xcodeBaseDir = "/Applications/Xcode.app";
}
```

A expressão acima produz um script que inicia o simulador a partir da instalação do Xcode fornecida. O script pode ser iniciado da seguinte forma:

```bash
./result/bin/run-test-simulator
```

Por padrão, o script mostrará uma visão geral dos UDIDs para todas as instâncias de simulador disponíveis e pedirá para você escolher uma. Você também pode fornecer um UDID como parâmetro de linha de comando para iniciar uma instância automaticamente:

```bash
./result/bin/run-test-simulator 5C93129D-CF39-4B1A-955F-15180C3BD4B8
```

Você também pode estender o script do simulador para implantar e iniciar automaticamente um aplicativo na instância de simulador solicitada:

```nix
let
  pkgs = import <nixpkgs> { };

  xcodeenv = import ./xcodeenv { inherit (pkgs) stdenv; };
in
xcode.simulateApp {
  name = "simulate";
  bundleId = "mycompany.myapp";
  app = xcode.buildApp {
    # ...
  };

  # Supports all xcodewrapper parameters as well
  xcodeBaseDir = "/Applications/Xcode.app";
}
```

Ao fornecer o resultado de uma função `xcode.buildApp {}` e configurar o bundle ID do aplicativo, o aplicativo é implantado e iniciado automaticamente.

## Solução de problemas {#troubleshooting}

Em alguns casos raros, pode acontecer que, após uma falha, as alterações não sejam reconhecidas. Muito provavelmente, isso é causado por um cache de dados derivados que o Xcode mantém. Para limpá-lo, você pode executar:

```bash
$ rm -rf ~/Library/Developer/Xcode/DerivedData
```