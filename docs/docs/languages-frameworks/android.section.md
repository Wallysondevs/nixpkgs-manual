# Android {#android}

O ambiente de compilação Android oferece três recursos principais e uma série de recursos de suporte.

## Usando androidenv com Android Studio {#using-androidenv-with-android-studio}

Use o atributo `android-studio-full` para um SDK Android muito completo, incluindo imagens de sistema:

```nix
{ buildInputs = [ android-studio-full ]; }
```

Isso é idêntico a:

```nix
{ buildInputs = [ androidStudioPackages.stable.full ]; }
```

Alternativamente, você pode passar `composeAndroidPackages` para o `withSdk` passthrough:

```nix
{
  buildInputs = [
    (android-studio.withSdk (androidenv.composeAndroidPackages { includeNDK = true; }).androidsdk)
  ];
}
```

Isso exportará `ANDROID_HOME` e `ANDROID_NDK_ROOT` para os diretórios do SDK e NDK no ambiente de compilação Android especificado.

## Implantando uma instalação do SDK Android com plugins {#deploying-an-android-sdk-installation-with-plugins}

Alternativamente, você pode implantar o SDK separadamente com um conjunto desejado de plugins, ou subconjuntos de um SDK.

```nix
with import <nixpkgs> { };

let
  androidComposition = androidenv.composeAndroidPackages {
    platformVersions = [
      "34"
      "35"
      "latest"
    ];
    systemImageTypes = [ "google_apis_playstore" ];
    abiVersions = [
      "armeabi-v7a"
      "arm64-v8a"
    ];
    includeNDK = true;
    includeExtras = [ "extras;google;auto" ];
  };
in
androidComposition.androidsdk
```

A invocação de função acima declara que queremos um SDK Android com as versões de plugin especificadas acima. Por padrão, a maioria dos plugins está desativada. Exceções notáveis são os subpacotes `tools`, `platform-tools` e `build-tools`.

Os seguintes parâmetros são suportados:

* `cmdLineToolsVersion` especifica a versão do pacote `cmdline-tools` a ser usado.
  O padrão é a versão mais recente.
* `toolsVersion`, especifica a versão do pacote `tools`. Note que `tools` está
  obsoleto, e atualmente apenas `26.1.1` está disponível, então não há muitas
  opções aqui; no entanto, você pode defini-lo como `null` se não o quiser. O padrão
  é a versão mais recente.
* `platformToolsVersion` especifica a versão do plugin `platform-tools`.
  O padrão é a versão mais recente.
* `buildToolsVersions` especifica as versões dos plugins `build-tools` a serem
  usados. O padrão é a versão mais recente.
* `includeEmulator` especifica se o pacote do `emulator` deve ser implantado (`false`
  por padrão). Quando ativado, a versão do `emulator` a ser implantada pode ser
  especificada definindo o parâmetro `emulatorVersion`. Se definido como
  `"if-supported"`, ele implantará o `emulator` se for suportado pelo sistema.
* `includeCmake` especifica se o CMake deve ser incluído. O padrão é `true`
  em plataformas x86-64 e Darwin, e também suporta `"if-supported"`.
* `cmakeVersions` especifica quais versões do CMake devem ser implantadas.
  O padrão é a versão mais recente.
* `includeNDK` especifica que o pacote Android NDK deve ser incluído.
  O padrão é `false`, mas pode ser definido como `true` ou `"if-supported"`.
* `ndkVersions` especifica as versões do NDK que queremos usar. Estas são vinculadas
  sob o diretório `ndk` da raiz do SDK, e a primeira é vinculada sob o
  diretório `ndk-bundle`. O padrão é a versão mais recente.
* `ndkVersion` é equivalente a especificar uma entrada em `ndkVersions`, e
  `ndkVersions` substitui este parâmetro se fornecido.
* `includeExtras` é um array de strings de identificadores que se referem a pacotes
  adicionais arbitrários que devem ser instalados. Note que extras podem não ser compatíveis
  com todas as plataformas (por exemplo, a unidade principal do Google TV, que não
  possui uma compilação aarch64-linux).
* `platformVersions` especifica quais versões do SDK da plataforma devem ser incluídas.
  O padrão é incluir apenas o nível de API mais recente, embora você possa adicionar mais.
* `numLatestPlatformVersions` especifica quantos dos níveis de API mais recentes devem ser incluídos,
  se você estiver usando o padrão para `platformVersions`. O padrão é 1, mas você pode
  aumentar isso para, por exemplo, 5 para obter os pacotes de API Android dos últimos 5 anos.
* `minPlatformVersion` e `maxPlatformVersion` têm prioridade sobre `platformVersions`
  se ambos forem fornecidos. Note que `maxPlatformVersion` sempre assume como padrão a versão
  mais recente da plataforma SDK Android, permitindo que você especifique `minPlatformVersion` para descrever
  a versão mínima do SDK que sua composição Android suporta.

Para cada versão de plataforma que foi especificada, podemos aplicar as seguintes
opções:

* `includeSystemImages` especifica se uma imagem de sistema para cada SDK de plataforma
  deve ser incluída.
* `includeSources` especifica se os fontes para cada versão do SDK devem ser
  incluídos.
* `useGoogleAPIs` especifica que para cada versão de plataforma selecionada a
  Google API deve ser incluída.
* `useGoogleTVAddOns` especifica que para cada versão de plataforma selecionada o
  complemento Google TV deve ser incluído.

Para cada imagem de sistema solicitada, podemos especificar as seguintes opções:

* `systemImageTypes` especifica que tipo de imagens de sistema devem ser incluídas.
  O padrão é: `default`.
* `abiVersions` especifica que tipo de versão ABI de cada imagem de sistema deve
  ser incluída. O padrão é `armeabi-v7a` e `arm64-v8a`.

A maioria dos argumentos da função possui configurações padrão razoáveis, preferindo as versões mais recentes
das ferramentas quando possível. Você pode adicionalmente especificar "latest" para qualquer versão de plugin
que você não se importa e apenas quer a mais recente.

Você pode especificar nomes de licença:

* `extraLicenses` é uma lista de nomes de licença.
  Você pode obter esses nomes de `repo.json` ou `querypackages.sh licenses`. A licença do SDK
  (`android-sdk-license`) é aceita para você se você definir `accept_license`
  como `true`. Se você estiver trabalhando com SDKs de pré-visualização, você vai
  querer adicionar `android-sdk-preview-license` ou qualquer licença que se aplique aqui.

Além disso, você pode substituir os repositórios dos quais `composeAndroidPackages` irá
puxar:

* `repoJson` especifica um caminho para um arquivo `repo.json` gerado. Você pode gerá-lo
  executando `generate.sh`, que por sua vez chamará `mkrepo.rb`.
* `repoXmls` é um conjunto de atributos contendo caminhos para arquivos XML de repositório. Se especificado,
  ele tem prioridade sobre `repoJson` e acionará uma compilação local escrevendo um
  `repo.json` para o Nix store com base nos XMLs de repositório fornecidos. Note que isso usa
  `import-from-derivation`.

```nix
{
  repoXmls = {
    packages = [ ./xml/repository2-1.xml ];
    images = [
      ./xml/android-sys-img2-1.xml
      ./xml/android-tv-sys-img2-1.xml
      ./xml/android-wear-sys-img2-1.xml
      ./xml/android-wear-cn-sys-img2-1.xml
      ./xml/google_apis-sys-img2-1.xml
      ./xml/google_apis_playstore-sys-img2-1.xml
    ];
    addons = [ ./xml/addon2-1.xml ];
  };
}
```

Ao compilar a expressão acima com:

```bash
$ nix-build
```

O SDK Android é implantado com todas as versões de plugin desejadas.

Também podemos implantar subconjuntos do SDK Android. Por exemplo, para apenas o
pacote `platform-tools`, você pode avaliar a seguinte expressão:

```nix
with import <nixpkgs> { };

let
  androidComposition = androidenv.composeAndroidPackages {
    # ...
  };
in
androidComposition.platform-tools
```

## Usando composições de pacotes Android predefinidas {#using-predefined-android-package-compositions}

Além de compor um conjunto de pacotes Android manualmente, também é possível
usar uma composição predefinida que contém um conjunto bastante completo de pacotes Android:

A seguinte expressão Nix pode ser usada para implantar o SDK completo:

```nix
with import <nixpkgs> { };

androidenv.androidPkgs.androidsdk
```

Também é possível usar apenas um plugin:

```nix
with import <nixpkgs> { };

androidenv.androidPkgs.platform-tools
```

## Iniciando instâncias de emulador {#spawning-emulator-instances}

Para fins de teste, também pode ser bastante conveniente gerar automaticamente
scripts que iniciam instâncias de emulador com todas as configurações desejadas.

Um script de inicialização de emulador pode ser configurado invocando a função `emulateApp {}`:

```nix
with import <nixpkgs> { };

androidenv.emulateApp {
  name = "emulate-MyAndroidApp";
  platformVersion = "28";
  abiVersion = "x86"; # armeabi-v7a, mips, x86_64
  systemImageType = "google_apis_playstore";
}
```

Flags adicionais podem ser aplicadas ao emulador do SDK Android através da variável de ambiente de tempo de execução `$NIX_ANDROID_EMULATOR_FLAGS`.

Também é possível especificar um APK para implantar dentro do emulador
e os nomes do pacote e da atividade para iniciá-lo:

```nix
with import <nixpkgs> { };

androidenv.emulateApp {
  name = "emulate-MyAndroidApp";
  platformVersion = "24";
  abiVersion = "armeabi-v7a"; # mips, x86, x86_64
  systemImageType = "default";
  app = ./MyApp.apk;
  package = "MyApp";
  activity = "MainActivity";
}
```

Além de APKs pré-compilados, você também pode vincular o parâmetro `APK` a uma
invocação da função `buildApp {}` mostrada no exemplo anterior.

## Notas sobre variáveis de ambiente em projetos Android {#notes-on-environment-variables-in-android-projects}

* `ANDROID_HOME` deve apontar para o SDK Android. Em suas expressões Nix, isso deve ser
  `${androidComposition.androidsdk}/libexec/android-sdk`. Note que `ANDROID_SDK_ROOT` está obsoleto,
  mas se você depender de ferramentas que o necessitam, você pode exportá-lo também.
* `ANDROID_NDK_ROOT` deve apontar para o NDK Android, se você estiver fazendo desenvolvimento NDK.
  Em suas expressões Nix, isso deve ser `${ANDROID_HOME}/ndk-bundle`.

Se você estiver executando o plugin Android Gradle, você precisa exportar `GRADLE_OPTS` para sobrescrever `aapt2`
para apontar para o binário `aapt2` no Nix store também, ou usar um ambiente FHS para que o `aapt2` empacotado
possa ser executado. Se você não quiser usar um ambiente FHS, algo assim deve funcionar:

```nix
let
  buildToolsVersion = "30.0.3";

  # Use buildToolsVersion when you define androidComposition
  androidComposition = <...>;
in
pkgs.mkShell rec {
  ANDROID_HOME = "${androidComposition.androidsdk}/libexec/android-sdk";
  ANDROID_NDK_ROOT = "${ANDROID_HOME}/ndk-bundle";

  # Use the same buildToolsVersion here
  GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${ANDROID_HOME}/build-tools/${buildToolsVersion}/aapt2";
}
```

Se você estiver usando `cmake`, você precisa adicioná-lo ao `PATH` em um `shell hook` ou perfil de ambiente FHS.
O caminho é sufixado com um número de compilação, mas devidamente prefixado com a versão.
Então, algo assim deve ser suficiente:

```nix
let
  cmakeVersion = "3.10.2";

  # Use cmakeVersion when you define androidComposition
  androidComposition = <...>;
in
pkgs.mkShell rec {
  ANDROID_HOME = "${androidComposition.androidsdk}/libexec/android-sdk";
  ANDROID_NDK_ROOT = "${ANDROID_HOME}/ndk-bundle";

  # Use the same cmakeVersion here
  shellHook = ''
    export PATH="$(echo "$ANDROID_HOME/cmake/${cmakeVersion}".*/bin):$PATH"
  '';
}
```

Note que executar o Android Studio com `ANDROID_HOME` definido escreverá automaticamente um
arquivo `local.properties` com `sdk.dir` definido para `$ANDROID_HOME` se um ainda não
existir. Se você também estiver usando o NDK, pode ser necessário adicionar `ndk.dir` a este arquivo.

Um exemplo de `shell.nix` que faz tudo isso para você é fornecido em `examples/shell.nix`.
Este `shell.nix` inclui um `shell hook` que sobrescreve `local.properties` com os valores corretos
de `sdk.dir` e `ndk.dir`. Isso garantirá que os diretórios do SDK e NDK estarão
corretos quando você executar o Android Studio dentro de `nix-shell`.

## Notas sobre como melhorar a compatibilidade do build.gradle {#notes-on-improving-build.gradle-compatibility}

Certifique-se de que seu `buildToolsVersion` e `ndkVersion` correspondam ao que é declarado em `androidenv`.
Se você estiver usando `cmake`, certifique-se de que sua versão declarada também esteja correta.

Caso contrário, você pode receber erros crípticos do `aapt2` e do plugin Android Gradle avisando
que ele não pode instalar as ferramentas de compilação porque o diretório do SDK não é gravável.

```gradle
android {
    buildToolsVersion "30.0.3"
    ndkVersion = "22.0.7026061"
    externalNativeBuild {
        cmake {
            version "3.10.2"
        }
    }
}

```

## Consultando as versões disponíveis de cada plugin {#querying-the-available-versions-of-each-plugin}

Todos os pacotes `androidenv` estão disponíveis em [search.nixos.org](https://search.nixos.org).
Note que a compatibilidade com `aarch64-linux` é atualmente irregular, embora `x86_64-linux` e `aarch64-darwin`
sejam bem suportados. Isso ocorre porque as definições de repositório do Google marcam alguns pacotes para "todas" as arquiteturas
que na verdade são apenas para `x86_64` ou `aarch64`.

## Atualizando as expressões geradas {#updating-the-generated-expressions}

`repo.json` é gerado a partir de arquivos XML que o gerenciador de pacotes do Android Studio usa.
Para atualizar as expressões, execute o script `update.sh` que está armazenado no
subdiretório `pkgs/development/mobile/androidenv/`:

```bash
./update.sh
```

Isso é executado automaticamente pelo script de atualização do `nixpkgs`.

## Compilando uma aplicação Android com Ant {#building-an-android-application-with-ant}

Além do SDK, também é possível compilar um projeto Android baseado em Ant
e implantar automaticamente todos os plugins Android que um projeto
requer. A maioria dos projetos Android mais recentes usa Gradle, e isso é incluído para fins
históricos.

```nix
with import <nixpkgs> { };

androidenv.buildApp {
  name = "MyAndroidApp";
  src = ./myappsources;
  release = true;

  # If release is set to true, you need to specify the following parameters
  keyStore = ./keystore;
  keyAlias = "myfirstapp";
  keyStorePassword = "mykeystore";
  keyAliasPassword = "myfirstapp";

  # Any Android SDK parameters that install all the relevant plugins that a
  # build requires
  platformVersions = [ "24" ];

  # When we include the NDK, then ndk-build is invoked before Ant gets invoked
  includeNDK = true;
}
```

Além dos parâmetros de compilação específicos do aplicativo (`name`, `src`, `release` e
parâmetros de `keystore`), a função `buildApp {}` suporta todos os parâmetros de função
que a função de composição do SDK (a função mostrada na seção anterior) suporta.

Esta função de compilação é particularmente útil quando se deseja usar
[Hydra](https://nixos.org/hydra): a solução de integração contínua baseada em Nix
para compilar aplicativos Android. Um APK Android é exposto como um produto de compilação e pode ser
instalado em qualquer dispositivo Android com um navegador web navegando até a página
de resultado da compilação.