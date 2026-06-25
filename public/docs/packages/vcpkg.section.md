# VCPKG {#sec-vcpkg}

O pacote `vcpkg-tool` possui um *wrapper* em torno do executável `vcpkg` para evitar a escrita no *nix store*.
O *wrapper* também estará presente em `vcpkg`, a menos que você especifique `vcpkg.override { vcpkg-tool = vcpkg-tool-unwrapped; }`

O *wrapper* foi feito de forma a fornecer argumentos *cli* padrão, mas tenta não interferir se o usuário fornecer os mesmos argumentos.
Os argumentos também possuem variáveis de ambiente correspondentes que podem ser usadas como uma forma alternativa de sobrescrever esses caminhos.

Execute o *wrapper* com a variável de ambiente `NIX_VCPKG_DEBUG_PRINT_ENVVARS=true` para obter uma lista completa das variáveis de ambiente correspondentes.

## Variáveis de ambiente específicas do Nix {#sec-vcpkg-nix-envvars}

O *wrapper* também fornece algumas novas variáveis de ambiente específicas do Nix que permitem controlar parte da funcionalidade do *wrapper*.

- `NIX_VCPKG_WRITABLE_PATH = <path>`

   Defina esta variável de ambiente para especificar o caminho onde `vcpkg` armazenará artefatos de tempo de compilação.
   Este se tornará o caminho base para todos os outros caminhos.

- `NIX_VCPKG_DEBUG_PRINT_ENVVARS = true | false`

   Defina isso como `true` para que o *wrapper* imprima as variáveis de ambiente correspondentes para os argumentos que serão fornecidos ao executável sem *wrapper*.
   A lista de variáveis será impressa logo antes de invocar `vcpkg`.
   Isso pode ser útil se você suspeitar que o *wrapper*, por algum motivo, não conseguiu priorizar os argumentos *cli* fornecidos pelo usuário em relação aos seus padrões, ou para corrigir outros problemas como erros de digitação ou variáveis de ambiente não expandidas.