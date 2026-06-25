# wafHook {#waf-hook}

[Waf](https://waf.io) é um sistema de construção de software baseado em Python.

No Nixpkgs, `wafHook` sobrescreve as fases padrão de configuração, construção e instalação.

## Variáveis que controlam o wafHook {#waf-hook-variables-controlling}

### Variáveis Exclusivas do `wafHook` {#waf-hook-exclusive-variables}

As variáveis abaixo são exclusivas do `wafHook`.

#### `wafPath` {#waf-path}

Localização da ferramenta `waf`. O padrão é `./waf`, para respeitar projetos de software que a incluem diretamente em suas árvores de código-fonte.

Se o arquivo apontado por `wafPath` não existir, então o `waf` fornecido pelo Nixpkgs será usado.

#### `wafFlags` {#waf-flags}

Controla as flags passadas para a ferramenta waf durante as fases de construção e instalação. Para configurações específicas das fases de construção ou instalação, use `wafBuildFlags` ou `wafInstallFlags`, respectivamente.

#### `dontUseWafConfigure` {#dont-use-waf-configure}

Quando definido como true, não usa a `wafConfigurePhase` predefinida.

#### `dontUseWafBuild` {#dont-use-waf-build}

Quando definido como true, não usa a `wafBuildPhase` predefinida.

#### `dontUseWafInstall` {#dont-use-waf-install}

Quando definido como true, não usa a `wafInstallPhase` predefinida.

### Variáveis semelhantes {#waf-hook-similar-variables}

As seguintes variáveis são semelhantes às suas contrapartes em `stdenv.mkDerivation`.

| Variável `wafHook`    | Contraparte `stdenv.mkDerivation` |
|-----------------------|-----------------------------------|
| `wafConfigureFlags`   | `configureFlags`                  |
| `wafConfigureTargets` | `configureTargets`                |
| `wafBuildFlags`       | `buildFlags`                      |
| `wafBuildTargets`     | `buildTargets`                    |
| `wafInstallFlags`     | `installFlags`                    |
| `wafInstallTargets`   | `installTargets`                  |

### Variáveis respeitadas {#waf-hook-honored-variables}

As seguintes variáveis comumente usadas por `stdenv.mkDerivation` são respeitadas por `wafHook`.

- `prefixKey`
- `enableParallelBuilding`
- `enableParallelInstalling`