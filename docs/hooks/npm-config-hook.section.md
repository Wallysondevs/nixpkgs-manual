# npmHooks.npmConfigHook {#npm-config-hook}

Hook para configurar pacotes que usam npm.
Feito principalmente para um ambiente multi-linguagem.

## Exemplos {#npm-config-hook-snippet}

[](#npm-build-hook-example-snippet)

## Variáveis que controlam `npmConfigHook` {#npm-config-hook-variables}

### Variáveis Exclusivas de `npmConfigHook` {#npm-config-hook-exclusive-variables}

#### `npmDeps` {#npm-config-hook-deps}

Derivation que contém as dependências do pacote npm.
Geralmente construído com `fetchNpmDeps`.
Este atributo é obrigatório ou o hook abortará a construção.

#### `makeCacheWritable` {#npm-config-hook-writable-cache}

Define se o cache de dependências deve ser gravável antes de instalar as dependências.
Não defina isso a menos que o npm tente gravar no diretório de cache.

#### `npmInstallFlags` {#npm-config-hook-install-flags}

Flags para passar para a chamada {command}`npm ci` para instalar as dependências no ambiente de construção.
O padrão é `--ignore-scripts`, que não pode ser removido.
Isso não controla nada relacionado ao `npmInstallHook`.

#### `npmRebuildFlags` {#npm-config-hook-rebuild-flags}

Flags para passar para o comando {command}`npm rebuild` depois que as dependências são instaladas no ambiente.

### Variáveis Respeitadas {#npm-config-hook-honored-variables}

As seguintes variáveis são respeitadas pelo `npmConfigHook`.

- [`npmWorkspace`](#javascript-buildNpmPackage-npmWorkspace)
- [`npmFlags`](#javascript-buildNpmPackage-npmFlags)
- `npmRoot`