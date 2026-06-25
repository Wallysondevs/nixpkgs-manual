# Meson {#meson}

[Meson](https://mesonbuild.com/) é um sistema de meta-construção de código aberto projetado para ser rápido e fácil de usar.

No Nixpkgs, o meson vem com um `setup hook` que sobrescreve as fases `configure`, `check` e `install`.

Sendo um sistema de meta-construção, o meson precisa de um backend de acompanhamento. No contexto do Nixpkgs, o backend companheiro típico é o [Ninja](#ninja), que fornece um `setup hook` que registra as fases de `build` e `install` baseadas em `ninja`.

## Variáveis que controlam o Meson {#meson-variables-controlling}

### Variáveis Exclusivas do Meson {#meson-exclusive-variables}

#### `mesonFlags` {#meson-flags}

Controla as `flags` passadas para `meson setup` durante a fase `configure`.

#### `mesonBuildDir` {#meson-build-dir}

Diretório onde o Meson colocará os arquivos intermediários.

Definir isso pode ser útil para depurar múltiplas `builds` do Meson enquanto no mesmo diretório de origem, por exemplo, ao construir para diferentes plataformas.
Valores diferentes para cada `build` evitarão que os artefatos de `build` interfiram uns com os outros.
Esta configuração não tem efeito tangível ao executar a `build` em uma `derivation` isolada (`sandboxed`).

O valor padrão é `build`.

#### `mesonWrapMode` {#meson-wrap-mode}

Qual valor é passado como
[`-Dwrap_mode=`](https://mesonbuild.com/Builtin-options.html#core-options).
No Nixpkgs, o valor padrão é `nodownload`, para que nenhum subprojeto seja
baixado (já que o acesso à rede já está desabilitado durante o `deployment` no
Nixpkgs).

Nota: O Meson permite o pré-preenchimento de subprojetos que, de outra forma, seriam baixados.

#### `mesonBuildType` {#meson-build-type}

Qual valor é passado como
[`--buildtype`](https://mesonbuild.com/Builtin-options.html#core-options) para
`meson setup` durante a fase `configure`. No Nixpkgs, o valor padrão é `plain`.

#### `mesonAutoFeatures` {#meson-auto-features}

Qual valor é passado como
[`-Dauto_features=`](https://mesonbuild.com/Builtin-options.html#core-options)
para `meson setup` durante a fase `configure`. No Nixpkgs, o valor padrão é
`enabled`, significando que cada `feature` declarada como "auto" pelos `scripts` do meson
será habilitada.

#### `mesonCheckFlags` {#meson-check-flags}

Controla as `flags` passadas para `meson test` durante a fase `check`.

#### `mesonInstallFlags` {#meson-install-flags}

Controla as `flags` passadas para `meson install` durante a fase `install`.

#### `mesonInstallTags` {#meson-install-tags}

Uma lista de `tags` de instalação passadas para a opção de linha de comando do Meson
[`--tags`](https://mesonbuild.com/Installing.html#installation-tags) durante a
fase `install`.

Nota: `mesonInstallTags` deve ser uma lista de `strings` que serão convertidas para
uma `string` separada por vírgulas que é reconhecida por `--tags`.
Exemplo: `mesonInstallTags = [ "emulator" "assembler" ];` será convertido para
`--tags emulator,assembler`.

#### `dontUseMesonConfigure` {#dont-use-meson-configure}

Quando definido como `true`, não usa a `mesonConfigurePhase` predefinida.

#### `dontUseMesonCheck` {#dont-use-meson-check}

Quando definido como `true`, não usa a `mesonCheckPhase` predefinida.

#### `dontUseMesonInstall` {#dont-use-meson-install}

Quando definido como `true`, não usa a `mesonInstallPhase` predefinida.

### Variáveis Honradas {#meson-honored-variables}

As seguintes variáveis comumente usadas por `stdenv.mkDerivation` são honradas pelo
`setup hook` do Meson.

- `prefixKey`
- `enableParallelBuilding`
- `enableParallelChecking`