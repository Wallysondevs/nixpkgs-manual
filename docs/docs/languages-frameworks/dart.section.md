# Dart {#sec-language-dart}

## Aplicações Dart {#ssec-dart-applications}

A função `buildDartApplication` constrói aplicações Dart gerenciadas com pub.

Ela busca suas dependências Dart automaticamente através de `pub2nix`, e (através de uma série de hooks) constrói e instala os executáveis especificados no arquivo pubspec. Os hooks podem ser usados em outras derivations, se necessário. As fases também podem ser sobrescritas para fazer algo diferente da instalação de binários.

Se você estiver empacotando uma aplicação Flutter para desktop, use [`buildFlutterApplication`](#ssec-dart-flutter) em vez disso.

`pubspecLock` é o arquivo pubspec.lock parseado. pub2nix o utiliza para baixar os pacotes necessários. Isso pode ser convertido para JSON de YAML com algo como `yq . pubspec.lock`, e então lido por Nix.

Alternativamente, `autoPubspecLock` pode ser usado em vez disso, e definido para um caminho para um arquivo `pubspec.lock` regular. Isso depende de import-from-derivation, e não é permitido em Nixpkgs, mas pode ser útil em outras ocasiões.

::: {.warning}
Ao usar `autoPubspecLock` com um diretório de origem local, certifique-se de usar um operador de concatenação (por exemplo, `autoPubspecLock = src + "/pubspec.lock";`), e não interpolação de string.

A interpolação de string copiará todo o seu diretório de origem para o Nix store e usará seu caminho de store, o que significa que mudanças não relacionadas na sua árvore de origem farão com que a derivation `pubspec.lock` gerada seja reconstruída!
:::

Se o pacote tiver dependências de pacotes Git, os hashes devem ser fornecidos no conjunto `gitHashes`. Se um hash estiver faltando, uma mensagem de erro solicitando que você o adicione será exibida.

Os comandos `dart` executados podem ser sobrescritos através de `pubGetScript` e `dartCompileCommand`; você também pode adicionar flags usando `dartCompileFlags` ou `dartJitFlags`.

Dart suporta múltiplos [tipos de saída](https://dart.dev/tools/dart-compile#types-of-output); você pode escolher entre eles usando `dartOutputType` (o padrão é `exe`). Se você quiser sobrescrever o caminho dos binários ou o caminho de origem de onde eles vêm, você pode usar `dartEntryPoints`. Saídas que requerem um runtime serão automaticamente empacotadas com o runtime relevante (`dartaotruntime` para `aot-snapshot`, `dart run` para `jit-snapshot` e `kernel`, `node` para `js`); isso pode ser sobrescrito através de `dartRuntimeCommand`.

```nix
{
  lib,
  buildDartApplication,
  fetchFromGitHub,
}:

buildDartApplication (finalAttrs: {
  pname = "dart-sass";
  version = "1.62.1";

  src = fetchFromGitHub {
    owner = "sass";
    repo = "dart-sass";
    tag = finalAttrs.version;
    hash = "sha256-U6enz8yJcc4Wf8m54eYIAnVg/jsGi247Wy8lp1r1wg4=";
  };

  pubspecLock = lib.importJSON ./pubspec.lock.json;
})
```

### Aplicando patches em dependências {#ssec-dart-applications-patching-dependencies}

Alguns pacotes Dart requerem patches ou mudanças no ambiente de build. Derivations de pacotes podem ser customizadas com o argumento `customSourceBuilders`.

Uma coleção de tais customizações pode ser encontrada em Nixpkgs, no diretório `development/compilers/dart/package-source-builders`.

Isso permite que correções para pacotes sejam compartilhadas entre todas as aplicações que os utilizam. É fortemente recomendado adicionar a esta coleção em vez de incluir correções na sua própria application derivation.

### Executando executáveis de dev_dependencies {#ssec-dart-applications-build-tools}

Muitas aplicações Dart requerem que executáveis da seção `dev_dependencies` em `pubspec.yaml` sejam executados antes de construí-las.

Isso pode ser feito em `preBuild`, de uma de duas maneiras:

1.  Empacotando a ferramenta com `buildDartApplication`, adicionando-a ao Nixpkgs, e executando-a como qualquer outra aplicação
2.  Executando a ferramenta a partir do cache de pacotes

Desses métodos, o primeiro é recomendado ao usar uma ferramenta que não precisa ser de uma versão específica.

Para o segundo método, a função `packageRun` do `dartConfigHook` pode ser usada. Esta é uma alternativa a `dart run` que não depende de Pub.

por exemplo, para `build_runner`:

```bash
packageRun build_runner build
```

NÃO use `dart run <package_name>`, pois isso tentará baixar dependências com Pub.

### Uso com nix-shell {#ssec-dart-applications-nix-shell}

#### Usando dependências do Nix store {#ssec-dart-applications-nix-shell-deps}

Como `buildDartApplication` fornece dependências em vez de `pub get`, Dart precisa ser explicitamente informado onde encontrá-las.

Execute os seguintes comandos no diretório de origem para configurar o Dart apropriadamente. Não use `pub` depois de fazer isso; ele baixará as dependências por conta própria e sobrescreverá essas mudanças.

```bash
cp --no-preserve=all "$pubspecLockFilePath" pubspec.lock
mkdir -p .dart_tool && cp --no-preserve=all "$packageConfig" .dart_tool/package_config.json
```

## Aplicações Flutter {#ssec-dart-flutter}

A função `buildFlutterApplication` constrói aplicações Flutter.

Consulte a [documentação Dart](#ssec-dart-applications) para mais detalhes sobre arquivos e argumentos necessários.

`flutter` em Nixpkgs sempre aponta para `flutterPackages.stable`, que é a versão empacotada mais recente. Para evitar quebras imprevistas durante a atualização, os pacotes em Nixpkgs devem usar uma versão específica do Flutter, como `flutter335` e `flutter338`, em vez de usar `flutter` diretamente.

```nix
{ flutter335, fetchFromGitHub }:

flutter335.buildFlutterApplication (finalAttrs: {
  pname = "firmware-updater";
  version = "0-unstable-2025-09-09";

  # To build for the Web, use the targetFlutterPlatform argument.
  # targetFlutterPlatform = "web";

  src = fetchFromGitHub {
    owner = "canonical";
    repo = "firmware-updater";
    rev = "402e97254b9d63c8d962c46724995e377ff922c8";
    hash = "sha256-nQn5mlgNj157h++67+mhez/F1ALz4yY+bxiGsi0/xX8=";
    fetchSubmodules = true;
  };

  pubspecLock = lib.importJSON ./pubspec.lock.json;

  sourceRoot = "${finalAttrs.src.name}/apps/firmware_updater";

  gitHashes.fwupd = "sha256-l/+HrrJk1mE2Mrau+NmoQ7bu9qhHU6wX68+m++9Hjd4=";
})
```

### Uso com nix-shell {#ssec-dart-flutter-nix-shell}

Notas de uso de `nix-shell` específicas do Flutter estão incluídas aqui. Consulte a [documentação Dart](#ssec-dart-applications-nix-shell) para instruções gerais de `nix-shell`.

#### Entrando no shell {#ssec-dart-flutter-nix-shell-enter}

Por padrão, as dependências apenas para o `targetFlutterPlatform` estão disponíveis no ambiente de build. Isso é útil para manter os closures pequenos, mas pode ser problemático durante o desenvolvimento. É comum, por exemplo, construir aplicações Web para Linux durante o desenvolvimento para aproveitar recursos nativos como o hot reload com estado.

Para entrar em um shell com todas as plataformas de destino usuais disponíveis, use o atributo `multiShell`.

por exemplo, `nix-shell '<nixpkgs>' -A fluffychat-web.multiShell`.