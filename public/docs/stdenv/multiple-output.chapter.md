# Pacotes de múltiplas saídas {#chap-multiple-output}

A linguagem Nix permite que uma derivation produza múltiplas saídas, o que é similar ao que é utilizado por outros sistemas de empacotamento de distribuições Linux. As saídas residem em caminhos separados no Nix store, então elas podem ser, em sua maioria, tratadas independentemente umas das outras, incluindo a passagem para build inputs, coleta de lixo ou substituição binária. A exceção é que a construção a partir do código-fonte sempre produz todas as saídas.

A principal motivação é economizar espaço em disco, reduzindo os tamanhos das closures em tempo de execução; consequentemente, os tamanhos dos binários substituídos também são reduzidos. A divisão pode ser usada para ter dependências de tempo de execução mais granulares, por exemplo, a redução típica é separar arquivos apenas de desenvolvimento, pois estes geralmente não são necessários durante o tempo de execução. Como resultado, os tamanhos das closures de muitos pacotes podem ser reduzidos pela metade ou até muito menos.

::: {.note}
Os efeitos de redução poderiam ser alcançados, em vez disso, construindo as partes em derivations completamente separadas. Isso frequentemente reduziria adicionalmente as closures em tempo de construção, mas tende a ser muito mais difícil escrever tais derivations, pois os sistemas de construção tipicamente assumem que todas as partes estão sendo construídas de uma vez. Esta abordagem de compromisso de um único pacote de código-fonte produzindo múltiplos pacotes binários também é frequentemente utilizada por rpm e deb.
:::

Vários atributos podem ser usados para trabalhar com uma derivation com múltiplas saídas.
O atributo `outputs` é uma lista de strings, que são os nomes das saídas.
Para cada um desses nomes, um atributo com nome idêntico é criado, correspondendo a essa saída.

O atributo `meta.outputsToInstall` é usado para determinar o [conjunto padrão de saídas a serem instaladas](https://github.com/NixOS/nixpkgs/blob/08c3198f1c6fd89a09f8f0ea09b425028a34de3e/pkgs/stdenv/generic/check-meta.nix#L411-L426) ao usar o nome da derivation não qualificado:
`bin`, ou `out`, ou a primeira saída especificada; bem como `man` se este for especificado.

## Utilizando um pacote dividido {#sec-multiple-outputs-using-split-packages}

Na linguagem Nix, as saídas individuais podem ser acessadas explicitamente como atributos, por exemplo, `coreutils.info`, mas o caso típico é apenas usar pacotes como build inputs.

Quando uma derivation de múltiplas saídas se torna um build input de outra derivation, a saída `dev` é adicionada se existir, caso contrário, a primeira saída é adicionada. Além disso, `propagatedBuildOutputs` desse pacote, que por padrão contêm `$outputBin` e `$outputLib`, também são adicionados. (Veja [](#multiple-output-file-type-groups).)

Em alguns casos, pode ser desejável combinar diferentes saídas sob um único caminho no store. O builder `symlinkJoin` pode ser usado para fazer isso. (Veja [](#trivial-builder-symlinkJoin)). Note que isso pode anular alguns dos benefícios de tamanho de closure de usar um pacote de múltiplas saídas.

## Escrevendo uma derivation dividida {#sec-multiple-outputs-}

Aqui você encontra como escrever uma derivation que produz múltiplas saídas.

Em nixpkgs, existe um framework que suporta derivations de múltiplas saídas. Ele tenta cobrir a maioria dos casos com comportamento padrão. Você pode encontrar o código-fonte separado em `<nixpkgs/pkgs/build-support/setup-hooks/multiple-outputs.sh>`; é relativamente fácil de ler. Todo o mecanismo é acionado definindo o atributo `outputs` para conter a lista dos nomes de saída desejados (strings).

```nix
{
  outputs = [
    "bin"
    "dev"
    "out"
    "doc"
  ];
}
```

Frequentemente, uma única linha como essa é suficiente. Para cada saída, uma variável de ambiente com o mesmo nome é passada para o builder e contém o caminho no nix store para essa saída. Tipicamente, você também vai querer ter a saída principal `out`, pois ela captura quaisquer arquivos que não foram para outro lugar.

::: {.note}
Existe um tratamento especial para a saída `debug`, descrito em [](#stdenv-separateDebugInfo).
:::

### “Binários primeiro” {#multiple-output-file-binaries-first-convention}

Uma convenção comumente adotada em `nixpkgs` é que os executáveis fornecidos pelo pacote estão contidos em sua primeira saída. Esta convenção permite que os pacotes dependentes referenciem os executáveis fornecidos pelos pacotes de maneira uniforme. Por exemplo, com o conhecimento de que o pacote `perl` contém um executável `perl`, ele pode ser referenciado como `${pkgs.perl}/bin/perl` dentro de uma Nix derivation que precisa executar um script Perl.

O pacote `glibc` é uma única exceção deliberada à convenção “binários primeiro”. O `glibc` tem `libs` como sua primeira saída, permitindo que as bibliotecas fornecidas por `glibc` sejam referenciadas diretamente (por exemplo, `${glibc}/lib/ld-linux-x86-64.so.2`). Os executáveis fornecidos por `glibc` podem ser acessados através de seu atributo `bin` (por exemplo, `${lib.getBin stdenv.cc.libc}/bin/ldd`).

A razão pela qual `glibc` se desvia da convenção é porque referenciar uma biblioteca fornecida por `glibc` é uma operação muito comum entre os pacotes Nix. Por exemplo, executáveis de terceiros empacotados por Nix são tipicamente corrigidos e religados com a versão relevante das bibliotecas `glibc` dos pacotes Nix (consulte a documentação sobre [patchelf](https://github.com/NixOS/patchelf) para mais detalhes).

### Grupos de tipos de arquivo {#multiple-output-file-type-groups}

O código de suporte atualmente reconhece alguns tipos particulares de saídas e instrui o sistema de construção do pacote a colocar os arquivos em suas saídas desejadas ou move os arquivos durante a fase de fixup. Cada grupo de tipos de arquivo tem uma variável `outputFoo` especificando o nome da saída para onde eles devem ir. Se essa variável não for definida pelo escritor da derivation, ela é adivinhada – um nome de saída padrão é definido, recorrendo a outras possibilidades se a saída não for definida.

#### `$outputDev` {#outputdev}

é para arquivos apenas de desenvolvimento. Estes incluem cabeçalhos C(++) (`include/`), pkg-config (`lib/pkgconfig/`), cmake (`lib/cmake/`) e arquivos aclocal (`share/aclocal/`). Eles vão para `dev` ou `out` por padrão.

#### `$outputBin` {#outputbin}

é destinado a binários voltados para o usuário, tipicamente residindo em `bin/`. Eles vão para `bin` ou `out` por padrão.

#### `$outputLib` {#outputlib}

é destinado a bibliotecas, tipicamente residindo em `lib/` e `libexec/`. Elas vão para `lib` ou `out` por padrão.

#### `$outputDoc` {#outputdoc}

é para documentação do usuário, tipicamente residindo em `share/doc/`. Ela vai para `doc` ou `out` por padrão.

#### `$outputDevdoc` {#outputdevdoc}

é para documentação de _desenvolvedor_. Atualmente, contamos livros gtk-doc e devhelp, tipicamente residindo em `share/gtk-doc/` e `share/devhelp/`, aqui. Ela vai para `devdoc` ou é removida (!) por padrão. Isso ocorre porque, por exemplo, gtk-doc tende a ser bastante grande e completamente não utilizado pelos usuários de nixpkgs.

#### `$outputMan` {#outputman}

é para páginas man (exceto para a seção 3), tipicamente residindo em `share/man/man[0-9]/`. Elas vão para `man` ou `$outputBin` por padrão.

#### `$outputDevman` {#outputdevman}

é para páginas man da seção 3, tipicamente residindo em `share/man/man[0-9]/`. Elas vão para `devman` ou `$outputMan` por padrão.

#### `$outputInfo` {#outputinfo}

é para páginas info, tipicamente residindo em `share/info/`. Elas vão para `info` ou `$outputBin` por padrão.

### Ressalvas comuns {#sec-multiple-outputs-caveats}

- Alguns scripts de configuração não gostam de alguns dos parâmetros passados por padrão pelo framework, por exemplo, `--docdir=/foo/bar`. Você pode desabilitar isso definindo `setOutputFlags = false;`.

- As saídas de uma única derivation podem reter referências umas às outras, mas note que referências circulares não são permitidas. (E cada componente fortemente conectado agiria como uma única saída de qualquer forma.)

- A maioria dos pacotes divididos contém sua funcionalidade principal em bibliotecas. Essas bibliotecas tendem a se referir a vários tipos de dados que tipicamente vão para `out`, por exemplo, strings de locale, então muitas vezes não há vantagem em separar as bibliotecas em `lib`, pois mantê-las em `out` é mais fácil.

- Alguns pacotes têm suposições ocultas sobre os caminhos de instalação, o que complica a divisão.