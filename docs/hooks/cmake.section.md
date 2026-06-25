# cmake {#cmake}

Sobrescreve a fase de configuração padrão para executar o comando CMake.

Por padrão, usamos o gerador Make do CMake.
Mas quando o Ninja também está disponível como um `nativeBuildInput`, este hook de configuração detectará isso e usará o gerador ninja.

As dependências são adicionadas automaticamente a `CMAKE_PREFIX_PATH` para que os pacotes sejam corretamente detectados pelo CMake.
Algumas flags adicionais são passadas para fornecer um comportamento semelhante aos pacotes baseados em configuração.

Por padrão, a construção paralela é habilitada, pois o CMake suporta construção paralela em quase todos os lugares.

Você pode desabilitar o comportamento deste hook definindo `configurePhase` para um valor personalizado, ou definindo `dontUseCmakeConfigure`.

## Variáveis que controlam o CMake {#cmake-variables-controlling}

### Variáveis Exclusivas do CMake {#cmake-exclusive-variables}

#### `cmakeFlags` {#cmake-flags}

Controla as flags passadas para `cmake setup` durante a fase de configuração.

#### `cmakeBuildDir` {#cmake-build-dir}

Diretório onde o CMake colocará os arquivos intermediários.

Definir isso pode ser útil para depurar múltiplas construções CMake no mesmo diretório de origem, por exemplo, ao construir para diferentes plataformas.
Valores diferentes para cada construção evitarão que os artefatos de construção interfiram uns nos outros.
Esta configuração não tem efeito tangível ao executar a construção em uma derivation isolada (sandboxed).

O valor padrão é `build`.

#### `cmakeBuildType` {#cmake-build-type}

Tipo de construção da saída do cmake.

Preenche internamente a flag cmake `CMAKE_BUILD_TYPE`.

O valor padrão é `Release`.

#### `dontUseCmakeConfigure` {#dont-use-cmake-configure}

Quando definido como true, não usa a `cmakeConfigurePhase` predefinida.

## Controlando a invocação do CTest {#cmake-ctest}

Por padrão, os testes são executados por make em [`checkPhase`](#ssec-check-phase) ou por [ninja](#ninja) se `ninja` estiver disponível em `nativeBuildInputs`. Os geradores Makefile e Ninja produzem o target `test`, que invoca `ctest` internamente.
Isso dificulta a passagem de argumentos adicionais para `ctest`, então é possível invocá-lo diretamente em `checkPhase` adicionando `ctestCheckHook` a `nativeCheckInputs`.

### Variáveis do CTest {#cmake-ctest-variables}

#### `disabledTests` {#cmake-ctest-disabled-tests}

Permite desabilitar a execução de uma lista de testes. Note que expressões regulares não são suportadas por `disabledTests`, mas pode ser combinado com a opção `--exclude-regex`.

#### `ctestFlags` {#cmake-ctest-flags}

Opções adicionais passadas para `ctest` juntamente com `checkFlags`.