# autoPatchelfHook {#setup-hook-autopatchelfhook}

Este é um hook de configuração especial que ajuda no empacotamento de software proprietário, na medida em que tenta automaticamente encontrar dependências de bibliotecas compartilhadas ausentes de arquivos ELF com base nos `buildInputs` e `nativeBuildInputs` fornecidos.

Você também pode especificar uma variável `runtimeDependencies` que lista dependências a serem adicionadas incondicionalmente ao rpath de todos os executáveis. Isso é útil para programas que usam `dlopen` para carregar bibliotecas em tempo de execução.

Em certas situações, você pode querer executar o comando principal (`autoPatchelf`) do hook de configuração em um arquivo ou um conjunto de diretórios, em vez de aplicar patches incondicionalmente a todas as saídas. Isso pode ser feito definindo a variável de ambiente `dontAutoPatchelf` para um valor não vazio.

Por padrão, `autoPatchelf` falhará assim que qualquer arquivo ELF exigir uma dependência que não possa ser resolvida através dos `build inputs` fornecidos. Em algumas situações, você pode preferir simplesmente deixar as dependências ausentes sem patch e continuar a aplicar patches no restante. Isso pode ser alcançado definindo a variável de ambiente `autoPatchelfIgnoreMissingDeps` para um valor não vazio. `autoPatchelfIgnoreMissingDeps` pode ser definido como uma lista como `autoPatchelfIgnoreMissingDeps = [ "libcuda.so.1" "libcudart.so.1" ];` ou para `[ "*" ]` para ignorar todas as dependências ausentes.

O comando `autoPatchelf` também reconhece uma flag de linha de comando `--no-recurse`, que o impede de recursar em subdiretórios.