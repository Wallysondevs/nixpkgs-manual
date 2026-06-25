# `just` {#just-hook}

Este *setup hook* tenta usar [o executor de comandos `just`](https://just.systems/man/en/) para construir, verificar e instalar o pacote. Por padrão, o *hook* sobrescreve `buildPhase`, `checkPhase` e `installPhase`.

[]{#just-hook-justFlags} A variável `justFlags` pode ser definida como uma lista de *strings* para adicionar *flags* adicionais passadas a todas as invocações de `just`.

## `buildPhase` {#just-hook-buildPhase}

Esta fase tenta invocar `just` com [a *recipe* padrão](https://just.systems/man/en/the-default-recipe.html).

[]{#just-hook-dontUseJustBuild} Este comportamento pode ser desativado definindo `dontUseJustBuild` como `true`.

## `checkPhase` {#just-hook-checkPhase}

Esta fase tenta invocar a *recipe* `just test`, se estiver disponível. Isso pode ser sobrescrito definindo `checkTarget` como uma *string*.

[]{#just-hook-dontUseJustCheck} Este comportamento pode ser desativado definindo `dontUseJustCheck` como `true`.

## `installPhase` {#just-hook-installPhase}

Esta fase tenta invocar a *recipe* `just install`.

[]{#just-hook-dontUseJustInstall} Este comportamento pode ser desativado definindo `dontUseJustInstall` como `true`.