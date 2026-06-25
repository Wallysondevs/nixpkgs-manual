# `haredo` {#haredo-hook}

Este hook usa [o executor de comandos `haredo`](https://sr.ht/~autumnull/haredo/) para construir, verificar e instalar o pacote. Ele sobrescreve `buildPhase`, `checkPhase` e `installPhase` por padrão.

O hook constrói seus alvos em paralelo se [`enableParallelBuilding`](#var-stdenv-enableParallelBuilding) for definido como `true`.

## `buildPhase` {#haredo-hook-buildPhase}

Esta fase tenta construir o alvo padrão.

[]{#haredo-hook-haredoBuildTargets} Alvos podem ser definidos explicitamente adicionando uma string à lista `haredoBuildTargets`.

[]{#haredo-hook-dontUseHaredoBuild} Este comportamento pode ser desabilitado definindo `dontUseHaredoBuild` como `true`.

## `checkPhase` {#haredo-hook-checkPhase}

Esta fase procura pelos alvos `check.do` ou `test.do`, executando-os se existirem.

[]{#haredo-hook-haredoCheckTargets} Alvos podem ser definidos explicitamente adicionando uma string à lista `haredoCheckTargets`.

[]{#haredo-hook-dontUseHaredoCheck} Este comportamento pode ser desabilitado definindo `dontUseHaredoCheck` como `true`.

## `installPhase` {#haredo-hook-installPhase}

Esta fase tenta construir o alvo `install.do`, se ele existir.

[]{#haredo-hook-haredoInstallTargets} Alvos podem ser definidos explicitamente adicionando uma string à lista `haredoInstallTargets`.

[]{#haredo-hook-dontUseHaredoInstall} Este comportamento pode ser desabilitado definindo `dontUseHaredoInstall` como `true`.