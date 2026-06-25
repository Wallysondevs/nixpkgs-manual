# julec.hook {#julec-hook}

[Jule](https://jule.dev) é uma linguagem de programação eficaz projetada para construir software eficiente, rápido, confiável e seguro, mantendo a simplicidade.

No Nixpkgs, `jule.hook` sobrescreve as fases padrão de build, check e install.

## Exemplo de trecho de código {#julec-hook-example-code-snippet}

```nix
{
  julec,
  clangStdenv,
}:

clangStdenv.mkDerivation (finalAttrs: {
  # ...

  nativeBuildInputs = [ julec.hook ];

  # Customize filenames if needed
  JULE_SRC_DIR = "./src";
  JULE_OUT_DIR = "./bin";
  JULE_OUT_NAME = "hello-jule";
  JULE_TEST_DIR = "./tests";
  JULE_TEST_OUT_DIR = "./test-bin";
  JULE_TEST_OUT_NAME = "hello-jule-test";

  # ...
})
```

## Variáveis que controlam julec.hook {#julec-hook-variables}

### `JULE_SRC_DIR` {#julec-hook-variable-jule-src-dir}

Especifica o diretório de origem contendo `main.jule`.
O padrão é `./src`.

### `JULE_OUT_DIR` {#julec-hook-variable-jule-out-dir}

Especifica o diretório de saída para o binário compilado.
O padrão é `./bin`.

### `JULE_OUT_NAME` {#julec-hook-variable-jule-out-name}

Especifica o nome do binário compilado.
O padrão é `output`.

### `JULE_TEST_DIR` {#julec-hook-variable-jule-test-dir}

Especifica o diretório contendo os arquivos de teste.
O padrão é o valor de [`JULE_SRC_DIR`](#julec-hook-variable-jule-src-dir).

### `JULE_TEST_OUT_DIR` {#julec-hook-variable-jule-test-out-dir}

Especifica o diretório de saída para os binários de teste compilados.
O padrão é o valor de [`JULE_OUT_DIR`](#julec-hook-variable-jule-out-dir).

### `JULE_TEST_OUT_NAME` {#julec-hook-variable-jule-test-out-name}

Especifica o nome do binário de teste compilado.
O padrão é o valor de [`JULE_OUT_NAME`](#julec-hook-variable-jule-out-name) com o sufixo `-test`.

### `dontUseJulecBuild` {#julec-hook-variable-dontusejulecbuild}

Quando definido como true, não usa o `julecBuildHook` predefinido.
O padrão é false.

### `dontUseJulecCheck` {#julec-hook-variable-dontusejuleccheck}

Quando definido como true, não usa o `julecCheckHook` predefinido.
O padrão é false.

### `dontUseJulecInstall` {#julec-hook-variable-dontusejulecinstall}

Quando definido como true, não usa o `julecInstallHook` predefinido.
O padrão é false.