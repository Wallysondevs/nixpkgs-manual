# npmHooks.npmBuildHook {#npm-build-hook}

Hook para construir pacotes que usam npm. Pode ser usado em ambientes multi-linguagem.

## Exemplos {#npm-build-hook-snippet}

:::{.example #npm-build-hook-example-snippet}

# Usando `npmHooks`

```nix
{
  stdenv,
  fetchFromGitHub,
  fetchNpmDeps,
  npmHooks,
  nodejsInstallExecutables,
  nodejsInstallManuals,
  nodejs,
}:
stdenv.mkDerivation (finalAttrs: {
  pname = "some-npm-project";
  version = "1.0";

  src = fetchFromGitHub {
    owner = "JohnNpm";
    repo = "SomeProject";
    tag = finalAttrs.version;
    hash = "...";
  };

  strictDeps = true;

  nativeBuildInputs = [
    nodejs
    nodejsInstallExecutables
    nodejsInstallManuals
    npmHooks.npmConfigHook
    npmHooks.npmBuildHook
    npmHooks.npmInstallHook
  ];

  npmBuildScript = "build";

  npmBuildFlags = [
    "--prod"
  ];

  npmFlags = [
    "--ignore-scripts"
  ];

  npmDeps = fetchNpmDeps {
    inherit (finalAttrs) src;
    hash = "...";
  };

  makeWrapperArgs = [
    "--set"
    "NODE_ENV"
    "production"
  ];

  meta = {
    description = "npm project";
  };
})
```
:::

## Variáveis que controlam `npmBuildHook` {#npm-build-hook-variables}

### Variáveis Exclusivas do `npmBuildHook` {#npm-build-hook-exclusive-variables}

#### `npmBuildScript` {#npm-build-hook-script}

Controla o script executado para construir o pacote npm dentro do arquivo `package.json`. É obrigatório ser definido, geralmente como `build`, mas pode variar entre os pacotes.

#### `npmBuildFlags` {#npm-build-hook-flags}

Controla os argumentos para o comando {command}`npm run $npmBuildScript`.

#### `dontNpmBuild` {#npm-build-hook-dont}

Desabilita `npmBuildHook` quando ativado

### Variáveis Respeitadas {#npm-build-hook-honored-variables}

As seguintes variáveis são respeitadas pelo `npmBuildHook`.

- [`npmWorkspace`](#javascript-buildNpmPackage-npmWorkspace)
- [`npmFlags`](#javascript-buildNpmPackage-npmFlags)