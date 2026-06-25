# autoPatchcilHook {#setup-hook-autopatchcilhook}

Este é um hook de configuração especial que auxilia no empacotamento de assemblies/programas .NET, pois tenta automaticamente encontrar dependências de bibliotecas compartilhadas ausentes de assemblies .NET com base nos `buildInputs` e `nativeBuildInputs` fornecidos.

Como o hook precisa de informações sobre o host onde o pacote será executado, existe uma variável de ambiente obrigatória chamada `autoPatchcilRuntimeId` que deve ser preenchida com o RID (Runtime Identifier) da máquina onde a saída será executada. Se você estiver usando `buildDotnetModule`, ele usará `dotnetRuntimeIds` (que é definido como `lib.singleton (if runtimeId != null then runtimeId else systemToDotnetRid stdenvNoCC.hostPlatform.system)`) para você, caso não seja fornecido.

Em certas situações, você pode querer executar o comando principal (`autoPatchcil`) do hook de configuração em um arquivo ou em um conjunto de diretórios, em vez de aplicar patches incondicionalmente a todas as saídas. Isso pode ser feito definindo a variável de ambiente `dontAutoPatchcil` para um valor não vazio.

Por padrão, `autoPatchcil` falhará assim que qualquer assembly .NET exigir uma dependência que não possa ser resolvida através dos `buildInputs` fornecidos. Em algumas situações, você pode preferir simplesmente deixar as dependências ausentes sem patch e continuar a aplicar patches no restante. Isso pode ser alcançado definindo a variável de ambiente `autoPatchcilIgnoreMissingDeps` para um valor não vazio. `autoPatchcilIgnoreMissingDeps` pode ser definido como uma lista como `autoPatchcilIgnoreMissingDeps = [ "libcuda.so.1" "libcudart.so.1" ];` ou como `[ "*" ]` para ignorar todas as dependências ausentes.

O comando `autoPatchcil` requer a flag de linha de comando `--rid`, informando o RID (Runtime Identifier) que ele deve assumir que os assemblies serão executados, e também reconhece a flag de linha de comando `--no-recurse`, que o impede de recursar em subdiretórios.

::: {.note}
Como, ao contrário da maioria dos binários nativos, os assemblies .NET são compilados uma vez para serem executados em qualquer plataforma, muitos assemblies podem ter stubs PInvoke para bibliotecas que podem não estar disponíveis na plataforma em que o pacote será efetivamente executado. Alguns exemplos são assemblies que chamam APIs nativas do Windows através de PInvoke visando `kernel32`, `gdi32`, `user32`, `shell32` ou `ntdll`.

`autoPatchcil` faz o seu melhor para ignorar dependências de outras plataformas verificando as extensões de arquivo solicitadas, no entanto, nem todos os stubs PInvoke fornecem uma extensão, então nesses casos será necessário listá-los em `autoPatchcilIgnoreMissingDeps` manualmente.
:::