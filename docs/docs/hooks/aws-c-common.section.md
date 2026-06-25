# `aws-c-common` {#aws-c-common}

Este hook expõe seus próprios módulos [CMake](#cmake) ao definir [`CMAKE_MODULE_PATH`](https://cmake.org/cmake/help/latest/variable/CMAKE_MODULE_PATH.html) através [da variável `cmakeFlags`](#cmake-flags) para o diretório não padrão `$out/lib/cmake`, como uma solução alternativa para [um bug upstream](https://github.com/awslabs/aws-c-common/issues/844).