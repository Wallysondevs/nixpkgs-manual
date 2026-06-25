# pkg-config {#sec-pkg-config}

*pkg-config* é uma interface unificada para declarar e consultar bibliotecas C/C++ construídas.

Nixpkgs oferece algumas facilidades para trabalhar com esta ferramenta.

## Escrevendo pacotes que fornecem módulos pkg-config {#pkg-config-writing-packages}

Pacotes devem definir `meta.pkgConfigModules` com a lista de módulos pkg-config que eles fornecem. Eles também devem usar `testers.hasPkgConfigModules` para verificar se o pacote final construído corresponde a essa lista, e opcionalmente verificar se os metadados de versão dos módulos pkgconf correspondem aos da derivation. Além disso, o [`validatePkgConfig` setup hook](https://nixos.org/manual/nixpkgs/stable/#validatepkgconfig) fará verificações adicionais nos módulos pkg-config a serem instalados.

Um bom exemplo de todas essas coisas é o miniz:

```nix
{ pkg-config, testers, ... }:

stdenv.mkDerivation (finalAttrs: {
  # ...

  nativeBuildInputs = [
    pkg-config
    validatePkgConfig
  ];

  passthru.tests.pkg-config = testers.hasPkgConfigModules {
    package = finalAttrs.finalPackage;
    versionCheck = true;
  };

  meta = {
    # ...
    pkgConfigModules = [ "miniz" ];
  };
})
```

## Acessando pacotes via nome do módulo pkg-config {#sec-pkg-config-usage}

### Dentro do Nixpkgs {#sec-pkg-config-usage-internal}

Um [setup hook](#setup-hook-pkg-config) é empacotado no pacote `pkg-config` para trazer as entradas de construção declaradas de uma derivation para o ambiente. Isso preencherá variáveis de ambiente como `PKG_CONFIG_PATH`, `PKG_CONFIG_PATH_FOR_BUILD` e `PKG_CONFIG_PATH_HOST` com base em:

 - como o próprio `pkg-config` é dependido

 - como outras dependências são dependidas

Para mais detalhes, consulte a seção sobre [especificação de dependências em geral](#ssec-stdenv-dependencies).

Comandos normais do pkg-config para procurar dependências por nome funcionarão então com essas variáveis de ambiente definidas pelo hook.

### Externamente {#sec-pkg-config-usage-external}

O conjunto de pacotes `defaultPkgConfigPackages` é um conjunto de aliases, nomeados de acordo com os módulos que fornecem. Isso é destinado a ser usado por integrações de linguagem para Nix. Pacotes escritos manualmente devem usar o nome de atributo normal do Nixpkgs em vez disso.