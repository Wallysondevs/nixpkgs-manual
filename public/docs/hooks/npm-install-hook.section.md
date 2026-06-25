# npmHooks.npmInstallHook {#npm-install-hook}

Hook para instalar node_modules para pacotes npm.
Não cria wrappers para projetos npm executáveis
Feito principalmente para um ambiente multi-linguagem.

## Exemplos {#npm-install-hook-snippet}

[](#npm-build-hook-example-snippet)

## Variáveis que controlam `npmInstallHook` {#npm-install-hook-variables}

### Variáveis Exclusivas de `npmInstallHook` {#npm-install-hook-exclusive-variables}

#### `dontNpmPrune` {#npm-install-hook-dont-prune}

Define se deve executar {command}`npm prune` nos `node_modules` ou não.
O padrão é `true`.

#### `npmInstallFlags` {#npm-install-hook-prune-flags}

Flags a serem passadas para a chamada {command}`npm prune` para os `node_modules` do pacote.
O padrão é `--omit=dev --no-save`, que não pode ser modificado.

#### `dontNpmInstall` {#npm-install-hook-dont}

Controla se `npmInstallHook` está habilitado ou não.
O padrão é `true`, então o hook será executado.

### Variáveis Respeitadas {#npm-install-hook-honored-variables}

As seguintes variáveis são respeitadas pelo `npmInstallHook`.

- [`npmWorkspace`](#javascript-buildNpmPackage-npmWorkspace)
- [`npmFlags`](#javascript-buildNpmPackage-npmFlags)