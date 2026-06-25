# Sistema de Módulos {#module-system}

## Introdução {#module-system-introduction}

O sistema de módulos é uma linguagem para gerenciar configurações, implementada como uma biblioteca Nix.

Em comparação com o Nix puro, ele adiciona documentação, verificação de tipo e composição ou extensibilidade.

::: {.note}
Este capítulo é novo e ainda não está completo.

Veja também:
- Introdução ao sistema de módulos, no contexto do NixOS, veja [Escrevendo Módulos NixOS](https://nixos.org/manual/nixos/unstable/index.html#sec-writing-modules) no manual do NixOS.
- Guia genérico para o sistema de módulos em [nix.dev](https://nix.dev/tutorials/module-system/index.html).
:::

## `lib.evalModules` {#module-system-lib-evalModules}

Avalia um conjunto de módulos. Esta função é tipicamente usada apenas uma vez por aplicação (por exemplo, uma vez no NixOS, uma vez no Home Manager, ...).

### Parâmetros {#module-system-lib-evalModules-parameters}

#### `modules` {#module-system-lib-evalModules-param-modules}

Uma lista de módulos. Estes são mesclados para formar a configuração final.
<!-- TODO link to section about merging, TBD -->

#### `specialArgs` {#module-system-lib-evalModules-param-specialArgs}

Um conjunto de atributos de argumentos de módulo que podem ser usados em `imports`.

Isso contrasta com `config._module.args`, que só está disponível depois que todos os `imports` foram resolvidos.

::: {.warning}
Você pode ser tentado a usar `specialArgs.lib` para fornecer funções de biblioteca extras. Fazer isso limita a interoperabilidade dos módulos, bem como a interoperabilidade das aplicações do Sistema de Módulos.

`lib` é reservado para a biblioteca Nixpkgs e não deve ser usado para funções personalizadas.

Em vez disso, você pode criar um novo atributo em `specialArgs` para fornecer funções personalizadas. Isso esclarece sua origem e evita incompatibilidades.
:::

#### `class` {#module-system-lib-evalModules-param-class}

Se o atributo `class` for definido e não for `null`, o sistema de módulos rejeitará `imports` com uma declaração `_class` diferente.

O valor de `class` deve ser uma string em [camel case](https://en.wikipedia.org/wiki/Camel_case) minúsculo.

Se aplicável, o `class` deve corresponder ao "prefixo" dos atributos usados em [flakes](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake.html#description) (experimentais). Alguns exemplos são:

 - `nixos` as in `flake.nixosModules`
 - `nixosTest`: modules that constitute a [NixOS VM test](https://nixos.org/manual/nixos/stable/index.html#sec-nixos-tests)
<!-- We've only just started with `class`. You're invited to add a few more. -->

#### `prefix` {#module-system-lib-evalModules-param-prefix}

Uma lista de strings representando o local no qual ou abaixo do qual todas as opções são avaliadas. Isso é usado por `types.submodule` para melhorar a comunicação de erros e encontrar o argumento de módulo `name` implícito.

### Valor de retorno {#module-system-lib-evalModules-return-value}

O resultado é um conjunto de atributos com os seguintes atributos:

#### `options` {#module-system-lib-evalModules-return-value-options}

O conjunto de atributos aninhados de todas as declarações de opção.

#### `config` {#module-system-lib-evalModules-return-value-config}

O conjunto de atributos aninhados de todos os valores de opção.

#### `type` {#module-system-lib-evalModules-return-value-type}

Um tipo de sistema de módulos. Este tipo é uma instância de `types.submoduleWith` contendo os [`modules`](#module-system-lib-evalModules-param-modules) atuais.

As definições de opção que são tipadas com este tipo estenderão o conjunto atual de módulos, como [`extendModules`](#module-system-lib-evalModules-return-value-extendModules).

No entanto, o valor retornado do tipo é apenas o [`config`](#module-system-lib-evalModules-return-value-config), como qualquer submódulo.

Se você está familiarizado com herança de protótipos, pode pensar nesta invocação de `evalModules` como o protótipo, e os usos deste tipo como as instâncias.

Este tipo também está disponível para os [`modules`](#module-system-lib-evalModules-param-modules) como o argumento de módulo `moduleType`.
<!-- TODO: document the module arguments. Using moduleType is like saying: suppose this configuration was extended. -->

#### `extendModules` {#module-system-lib-evalModules-return-value-extendModules}

Uma função similar a `evalModules` mas que se baseia nos [`modules`](#module-system-lib-evalModules-param-modules) já passados. Seus argumentos, `modules` e `specialArgs`, são adicionados aos valores existentes.

Se você está familiarizado com herança de protótipos, pode pensar na invocação atual e real de `evalModules` como o protótipo, e o valor de retorno de `extendModules` como a instância.

Esta funcionalidade também está disponível para módulos como o argumento de módulo `extendModules`.

::: {.note}

**Desempenho da Avaliação**

`extendModules` retorna uma configuração que compartilha muito pouco com a invocação original de `evalModules`, porque os argumentos do módulo podem ser diferentes.

Portanto, se você tem uma configuração que foi (ou será) amplamente avaliada, quase nenhum dos cálculos é compartilhado com a configuração retornada por `extendModules`.

O trabalho real da avaliação de módulos acontece ao computar os valores em `config` e `options`, então múltiplas invocações de `extendModules` têm um custo particularmente pequeno, desde que apenas o `config` e `options` finais sejam avaliados.

Se você referenciar múltiplos `config` (ou `options`) de antes e depois de `extendModules`, o desempenho da avaliação é o mesmo que com múltiplas invocações de `evalModules`, porque a capacidade dos novos módulos de sobrescrever a configuração existente requer fundamentalmente a construção de um novo ponto fixo de `config` e `options`.
:::

#### `_module` {#module-system-lib-evalModules-return-value-_module}

Uma porção da árvore de configuração que é omitida de `config`.

<!-- TODO: when markdown migration is complete, make _module docs visible again and reference _module docs. Maybe move those docs into this chapter? -->

#### `_type` {#module-system-lib-evalModules-return-value-_type}

Um marcador de tipo nominal, sempre `"configuration"`.

#### `class` {#module-system-lib-evalModules-return-value-_configurationClass}

O argumento [`class`](#module-system-lib-evalModules-param-class).

#### `graph` {#module-system-lib-evalModules-return-value-graph}

Representa todos os módulos que participaram da avaliação.
É uma lista de `ModuleGraph` onde `ModuleGraph` é definido como um conjunto de atributos com os seguintes atributos:

- `key`: `string` for the purpose of module deduplication and `disabledModules`
- `file`: `string` for the purpose of error messages and warnings
- `imports`: `[ ModuleGraph ]`
- `disabled`: `bool`

## Argumentos de módulo {#module-system-module-arguments}

Argumentos de módulo são os valores de atributo passados para os módulos quando são avaliados.

Eles se originam destas fontes:
1. Argumentos embutidos
    - `lib`,
    - `config`,
    - `options`,
    - `_class`,
    - `_prefix`,
2. Atributos do argumento [`specialArgs`] passado para [`evalModules`] ou `submoduleWith`. Estes são específicos da aplicação.
3. Atributos do valor da opção `_module.args`. Estes são específicos da aplicação e podem ser fornecidos por qualquer módulo.

As duas categorias anteriores estão disponíveis durante a avaliação dos `imports`, enquanto a última categoria só está disponível depois que os `imports` foram resolvidos.

[`lib`]{#module-system-module-argument-lib} [🔗](#module-system-module-argument-lib)
: Uma referência à biblioteca Nixpkgs.

[`config`]{#module-system-module-argument-config} [🔗](#module-system-module-argument-config)
: Todos os valores de opção. Ao contrário do atributo de retorno [`config`](#module-system-lib-evalModules-return-value-config) de `evalModules`, este inclui `_module`.

[`options`]{#module-system-module-argument-options} [🔗](#module-system-module-argument-options)
: Todas as declarações de opção avaliadas.

[`_class`]{#module-system-module-argument-_class} [🔗](#module-system-module-argument-_class)
: A [classe esperada](#module-system-lib-evalModules-param-class) dos módulos carregados.

[`_prefix`]{#module-system-module-argument-_prefix} [🔗](#module-system-module-argument-_prefix)
: O local sob o qual o módulo é avaliado. Isso é usado para melhorar a comunicação de erros e para encontrar o argumento de módulo `name` implícito em submódulos. É exposto como um argumento de módulo devido à forma como o sistema de módulos é implementado, o que não pode ser evitado sem quebrar a compatibilidade.

  É uma boa prática não depender de `_prefix`. Um módulo não deve fazer suposições sobre sua localização na árvore de configuração. Por exemplo, a raiz de uma configuração NixOS pode ter um prefixo não vazio, por exemplo, quando é uma especialização, ou quando faz parte de uma configuração maior e multi-host, como um [teste NixOS](https://nixos.org/manual/nixos/unstable/#sec-nixos-tests). Em vez de depender de `_prefix`, use opções explícitas, cujas definições padrão podem ser fornecidas pelo módulo que as importa.

<!-- markdown link aliases -->
[`evalModules`]: #module-system-lib-evalModules
[`specialArgs`]: #module-system-lib-evalModules-param-specialArgs