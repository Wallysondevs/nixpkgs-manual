# Premake {#premake-hook}

Este gancho de configuração tenta configurar o pacote usando [o sistema de configuração de compilação Premake](https://premake.github.io/). Ele sobrescreve o `configurePhase` por padrão, se nenhum existir.

[]{#premake-hook-premakefile} O Premakefile a ser usado pode ser especificado definindo `premakefile` na derivation.

[]{#premake-hook-premakeFlagsArray} As flags passadas para o Premake podem ser configuradas adicionando strings à lista `premakeFlags`.