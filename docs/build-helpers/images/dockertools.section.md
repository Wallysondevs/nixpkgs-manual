# pkgs.dockerTools {#sec-pkgs-dockerTools}

`pkgs.dockerTools` é um conjunto de funções para criar e manipular imagens Docker de acordo com a [Docker Image Specification v1.3.1](https://github.com/moby/docker-image-spec/blob/v1.3.1/spec.md). O próprio Docker não é usado para realizar nenhuma das operações feitas por essas funções.

## buildImage {#ssec-pkgs-dockerTools-buildImage}

Esta função constrói um tarball de repositório compatível com Docker contendo uma única imagem. Como tal, o resultado é adequado para ser carregado no Docker com `docker image load` (veja [](#ex-dockerTools-buildImage) para saber como fazer isso).

Esta função criará uma única camada para todos os arquivos (e dependências) que são especificados em seu argumento. Apenas novas dependências que ainda não estão nas camadas existentes serão copiadas. Se você preferir criar várias camadas para os arquivos e dependências que deseja adicionar à imagem, consulte [](#ssec-pkgs-dockerTools-buildLayeredImage) ou [](#ssec-pkgs-dockerTools-streamLayeredImage) em vez disso.

Esta função permite que um script seja executado durante o processo de geração da camada, permitindo que um comportamento personalizado afete os resultados finais da imagem (veja a documentação dos atributos `runAsRoot` e `extraCommands`).

O tarball de repositório resultante listará uma única imagem conforme especificado pelos atributos `name` e `tag`. Por padrão, essa imagem usará uma data de criação estática (veja a documentação para o atributo `created`). Isso permite que `buildImage` produza imagens reproduzíveis.

:::{.tip}
Ao executar uma imagem construída com `buildImage`, você pode encontrar certos erros dependendo do que você incluiu na imagem, especialmente se você não começou com nenhuma imagem base.

Se você encontrar erros semelhantes a `getProtocolByName: does not exist (no such protocol name: tcp)`, pode ser necessário adicionar o conteúdo de `pkgs.iana-etc` no atributo `copyToRoot`. Da mesma forma, se você encontrar erros semelhantes a `Error_Protocol ("certificate has unknown CA",True,UnknownCa)`, pode ser necessário adicionar o conteúdo de `pkgs.cacert` no atributo `copyToRoot`.
:::

### Inputs {#ssec-pkgs-dockerTools-buildImage-inputs}

`buildImage` espera um argumento com os seguintes atributos:

`name` (String)

: O nome da imagem gerada.

`tag` (String ou Null; _opcional_)

: Tag da imagem gerada.
  Se `null`, o hash da nix derivation será usado como a tag.

  _Valor padrão:_ `null`.

`fromImage` (Path ou Null; _opcional_)

: O tarball de repositório de uma imagem a ser usada como base para a imagem gerada.
  Deve ser uma imagem Docker válida, como uma exportada por `docker image save`, ou outra imagem construída com as funções de utilidade `dockerTools`.
  Isso pode ser visto como um equivalente de `FROM fromImage` em um `Dockerfile`.
  Um valor de `null` pode ser visto como um equivalente de `FROM scratch`.

  Se especificado, a camada criada por `buildImage` será anexada às camadas definidas na imagem base, resultando em uma imagem com pelo menos duas camadas (uma ou mais camadas da imagem base e a camada criada por `buildImage`).
  Caso contrário, a imagem resultante conterá a única camada criada por `buildImage`.

  :::{.note}
  Apenas a configuração **Env** é herdada da imagem base.
  :::

  _Valor padrão:_ `null`.

`fromImageName` (String ou Null; _opcional_)

: Usado para especificar a imagem dentro do tarball de repositório caso ele contenha múltiplas imagens.
  Um valor de `null` significa que `buildImage` usará a primeira imagem disponível no repositório.

  :::{.note}
  Isso deve ser usado com `fromImageTag`. Usar apenas `fromImageName` sem `fromImageTag` fará com que `buildImage` use a primeira imagem disponível no repositório.
  :::

  _Valor padrão:_ `null`.

`fromImageTag` (String ou Null; _opcional_)

: Usado para especificar a imagem dentro do tarball de repositório caso ele contenha múltiplas imagens.
  Um valor de `null` significa que `buildImage` usará a primeira imagem disponível no repositório.

  :::{.note}
  Isso deve ser usado com `fromImageName`. Usar apenas `fromImageTag` sem `fromImageName` fará com que `buildImage` use a primeira imagem disponível no repositório.
  :::

  _Valor padrão:_ `null`.

`copyToRoot` (Path, Lista de Paths, ou Null; _opcional_)

: Arquivos a serem adicionados à imagem gerada.
  Qualquer coisa que se converta em um path (por exemplo, uma derivation) também pode ser usada.
  Isso pode ser visto como um equivalente de `ADD contents/ /` em um `Dockerfile`.

  _Valor padrão:_ `null`.

`keepContentsDirlinks` (Booleano; _opcional_)

: Ao adicionar arquivos à imagem gerada (conforme especificado por `copyToRoot`), este atributo controla se os symlinks para diretórios devem ser preservados.
  Se `false`, os symlinks serão transformados em diretórios.
  Isso se comporta da mesma forma que `rsync -k` quando `keepContentsDirlinks` é `false`, e da mesma forma que `rsync -K` quando `keepContentsDirlinks` é `true`.

  _Valor padrão:_ `false`.

`runAsRoot` (String ou Null; _opcional_)

: Um script bash que será executado como root dentro de uma VM que contém as camadas existentes da imagem base e a nova camada gerada (incluindo os arquivos de `copyToRoot`).
  O script será executado com um diretório de trabalho de `/`.
  Isso pode ser visto como um equivalente de `RUN ...` em um `Dockerfile`.
  Um valor de `null` significa que esta etapa no processo de geração da imagem será ignorada.

  Veja [](#ex-dockerTools-buildImage-runAsRoot) para saber como trabalhar com este atributo.

  :::{.caution}
  Usar este atributo requer que o dispositivo `kvm` esteja disponível, veja [`system-features`](https://nixos.org/manual/nix/stable/command-ref/conf-file.html#conf-system-features).
  Se o dispositivo `kvm` não estiver disponível, você deve considerar usar [`buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage) ou [`streamLayeredImage`](#ssec-pkgs-dockerTools-streamLayeredImage) em vez disso.
  Essas funções permitem que scripts sejam executados como root sem acesso ao dispositivo `kvm`.
  :::

  :::{.note}
  No momento em que o script em `runAsRoot` é executado, os arquivos especificados diretamente em `copyToRoot` estarão presentes na VM, mas suas dependências podem ainda não estar lá.
  Copiar suas dependências para a imagem gerada é uma etapa que acontece depois que `runAsRoot` termina de ser executado.
  :::

  _Valor padrão:_ `null`.

`extraCommands` (String; _opcional_)

: Um script bash que será executado antes que a camada criada por `buildImage` seja finalizada.
  O script será executado em algum diretório de trabalho (opaco) que se tornará `/` assim que a camada for criada.
  Isso é semelhante a `runAsRoot`, mas o script especificado em `extraCommands` **não** é executado como root, e não envolve a criação de uma VM.
  Ele é simplesmente executado como parte da construção da derivation que gera a camada criada por `buildImage`.

  Veja [](#ex-dockerTools-buildImage-extraCommands) para saber como trabalhar com este atributo, e diferenças sutis em comparação com `runAsRoot`.

  _Valor padrão:_ `""`.

`config` (Attribute Set ou Null; _opcional_)

: Usado para especificar a configuração dos containers que serão iniciados a partir da imagem gerada.
  Deve ser um attribute set, com cada atributo conforme listado na [Docker Image Specification v1.3.1](https://github.com/moby/docker-image-spec/blob/v1.3.1/spec.md#image-json-field-descriptions).

  _Valor padrão:_ `null`.

`architecture` (String; _opcional_)

: Usado para especificar a arquitetura da imagem.
  Isso é útil para builds multi-arquitetura que não precisam de cross-compilação.
  Se especificado, seu valor deve seguir a [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/v1.1.1/config.md#properties), que ainda deve ser compatível com Docker.
  De acordo com a especificação vinculada, todos os valores possíveis para `$GOARCH` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão um de `386`, `amd64`, `arm` ou `arm64`.

  _Valor padrão:_ o mesmo valor de `pkgs.go.GOARCH`.

`diskSize` (Number; _opcional_)

: Controla o tamanho do disco em MiB (1024x1024 bytes) da VM usada para executar o script especificado em `runAsRoot`.
  Este atributo é ignorado se `runAsRoot` for `null`.

  _Valor padrão:_ 1024.

`buildVMMemorySize` (Number; _opcional_)

: Controla a quantidade de memória em MiB (1024x1024 bytes) provisionada para a VM usada para executar o script especificado em `runAsRoot`.
  Este atributo é ignorado se `runAsRoot` for `null`.

  _Valor padrão:_ 512.

`created` (String; _opcional_)

: Especifica a hora de criação da imagem gerada.
  Isso deve ser uma data e hora formatadas de acordo com [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) ou `"now"`, caso em que `buildImage` usará a data atual.

  Veja [](#ex-dockerTools-buildImage-creatednow) para saber como usar `"now"`.

  :::{.caution}
  Usar `"now"` significa que a imagem gerada não será mais reproduzível (porque a data sempre mudará sempre que for construída).
  :::

  _Valor padrão:_ `"1970-01-01T00:00:01Z"`.

`uid` (Number; _opcional_)

: O uid do usuário que será proprietário dos arquivos empacotados na nova camada construída por `buildImage`.

  _Valor padrão:_ 0.

`gid` (Number; _opcional_)

: O gid do grupo que será proprietário dos arquivos empacotados na nova camada construída por `buildImage`.

  _Valor padrão:_ 0.

`compressor` (String; _opcional_)

: Seleciona o algoritmo usado para compactar a imagem.

  _Valor padrão:_ `"gz"`.\
  _Valores possíveis:_ `"none"`, `"gz"`, `"zstd"`.

`includeNixDB` (Booleano; _opcional_)

: Popula o banco de dados nix na imagem com as dependências de `copyToRoot`.
  O principal objetivo é poder usar comandos nix no container.

  :::{.caution}
  Tenha cuidado, pois isso não funciona bem em combinação com `fromImage`. Em particular, em uma imagem multi-camadas, apenas os paths Nix da imagem inferior estarão no banco de dados.

  Isso também negligencia o registro dos store paths que são puxados para a imagem como uma dependência de um dos outros valores, mas não são uma dependência de `copyToRoot`.
  :::

  _Valor padrão:_ `false`.

`meta` (Attribute Set)

: O atributo `meta` da derivation resultante, como em `stdenv.mkDerivation`. Aceita `description`, `maintainers` e quaisquer outros atributos `meta`.

`contents` **DEPRECATED**

: Este atributo está obsoleto, e os usuários são encorajados a usar `copyToRoot` em vez disso.

### Passthru outputs {#ssec-pkgs-dockerTools-buildImage-passthru-outputs}

`buildImage` define alguns atributos [`passthru`](#chap-passthru):

`buildArgs` (Attribute Set)

: O argumento passado para o próprio `buildImage`.
  Isso permite inspecionar todos os atributos especificados no argumento, conforme descrito acima.

`layer` (Attribute Set)

: A derivation com a camada criada por `buildImage`.
  Isso permite uma inspeção mais fácil do conteúdo adicionado por `buildImage` na imagem gerada.

`imageTag` (String)

: A tag da imagem gerada.
  Isso é útil se nenhuma tag foi especificada nos atributos do argumento para `buildImage`, porque uma tag automática será usada em vez disso.
  `imageTag` permite recuperar o valor da tag usada neste caso.

### Examples {#ssec-pkgs-dockerTools-buildImage-examples}

:::{.example #ex-dockerTools-buildImage}
# Construindo uma imagem Docker

O pacote a seguir constrói uma imagem Docker que executa o executável `redis-server` do pacote `redis`.
A imagem Docker terá o nome `redis` e a tag `latest`.

```nix
{
  dockerTools,
  buildEnv,
  redis,
}:
dockerTools.buildImage {
  name = "redis";
  tag = "latest";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = [ redis ];
    pathsToLink = [ "/bin" ];
  };

  runAsRoot = ''
    mkdir -p /data
  '';

  config = {
    Cmd = [ "/bin/redis-server" ];
    WorkingDir = "/data";
    Volumes = {
      "/data" = { };
    };
  };
}
```

O resultado da construção deste pacote é um arquivo `.tar.gz` que pode ser carregado no Docker:

```shell
$ nix-build
(some output removed for clarity)
building '/nix/store/yw0adm4wpsw1w6j4fb5hy25b3arr9s1v-docker-image-redis.tar.gz.drv'...
Adding layer...
tar: Removing leading `/' from member names
Adding meta...
Cooking the image...
Finished.
/nix/store/p4dsg62inh9d2ksy3c7bv58xa851dasr-docker-image-redis.tar.gz

$ docker image load -i /nix/store/p4dsg62inh9d2ksy3c7bv58xa851dasr-docker-image-redis.tar.gz
(some output removed for clarity)
Loaded image: redis:latest
```
:::

:::{.example #ex-dockerTools-buildImage-runAsRoot}
# Construindo uma imagem Docker com `runAsRoot`

O pacote a seguir constrói uma imagem Docker com o executável `hello` do pacote `hello`.
Ele usa `runAsRoot` para criar um diretório e um arquivo dentro da imagem.

Isso funciona da mesma forma que [](#ex-dockerTools-buildImage-extraCommands), mas usa `runAsRoot` em vez de `extraCommands`.

```nix
{
  dockerTools,
  buildEnv,
  hello,
}:
dockerTools.buildImage {
  name = "hello";
  tag = "latest";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = [ hello ];
    pathsToLink = [ "/bin" ];
  };

  runAsRoot = ''
    mkdir -p /data
    echo "some content" > my-file
  '';

  config = {
    Cmd = [ "/bin/hello" ];
    WorkingDir = "/data";
  };
}
```
:::

:::{.example #ex-dockerTools-buildImage-extraCommands}
# Construindo uma imagem Docker com `extraCommands`

O pacote a seguir constrói uma imagem Docker com o executável `hello` do pacote `hello`.
Ele usa `extraCommands` para criar um diretório e um arquivo dentro da imagem.

Isso funciona da mesma forma que [](#ex-dockerTools-buildImage-runAsRoot), mas usa `extraCommands` em vez de `runAsRoot`.
Note que com `extraCommands`, não podemos referenciar diretamente `/` e devemos criar arquivos e diretórios como se já estivéssemos em `/`.

```nix
{
  dockerTools,
  buildEnv,
  hello,
}:
dockerTools.buildImage {
  name = "hello";
  tag = "latest";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = [ hello ];
    pathsToLink = [ "/bin" ];
  };

  extraCommands = ''
    mkdir -p data
    echo "some content" > my-file
  '';

  config = {
    Cmd = [ "/bin/hello" ];
    WorkingDir = "/data";
  };
}
```
:::

:::{.example #ex-dockerTools-buildImage-creatednow}
# Construindo uma imagem Docker com a data de criação definida para a hora atual

Note que usar o valor `"now"` no atributo `created` quebrará a reprodutibilidade.

```nix
{
  dockerTools,
  buildEnv,
  hello,
}:
dockerTools.buildImage {
  name = "hello";
  tag = "latest";

  created = "now";

  copyToRoot = buildEnv {
    name = "image-root";
    paths = [ hello ];
    pathsToLink = [ "/bin" ];
  };

  config.Cmd = [ "/bin/hello" ];
}
```

Após importar o tarball de repositório gerado com Docker, sua CLI exibirá uma data razoável e ordenará as imagens como esperado:

```shell
$ docker image ls
REPOSITORY   TAG      IMAGE ID       CREATED              SIZE
hello        latest   de2bf4786de6   About a minute ago   25.2MB
```
:::

## buildLayeredImage {#ssec-pkgs-dockerTools-buildLayeredImage}

`buildLayeredImage` usa [`streamLayeredImage`](#ssec-pkgs-dockerTools-streamLayeredImage) por baixo para construir um tarball de repositório compactado compatível com Docker. Basicamente, `buildLayeredImage` executa o script criado por `streamLayeredImage` para salvar a imagem compactada no Nix store. `buildLayeredImage` suporta as mesmas opções que `streamLayeredImage`, veja [`streamLayeredImage`](#ssec-pkgs-dockerTools-streamLayeredImage) para detalhes.

:::{.note}
Apesar do nome semelhante, [`buildImage`](#ssec-pkgs-dockerTools-buildImage) funciona de forma completamente diferente de `buildLayeredImage` e `streamLayeredImage`.

Embora alguns dos argumentos possam parecer relacionados, eles não podem ser intercambiados.
:::

Você pode carregar o resultado desta função no Docker com `docker image load`. Veja [](#ex-dockerTools-buildLayeredImage-hello) para ver como fazer isso.

### Examples {#ssec-pkgs-dockerTools-buildLayeredImage-examples}

:::{.example #ex-dockerTools-buildLayeredImage-hello}
# Construindo uma imagem Docker em camadas

O pacote a seguir constrói uma imagem Docker em camadas que executa o executável `hello` do pacote `hello`.
A imagem Docker terá o nome `hello` e a tag `latest`.

```nix
{ dockerTools, hello }:
dockerTools.buildLayeredImage {
  name = "hello";
  tag = "latest";

  contents = [ hello ];

  config.Cmd = [ "/bin/hello" ];
}
```

O resultado da construção deste pacote é um arquivo `.tar.gz` que pode ser carregado no Docker:

```shell
$ nix-build
(some output removed for clarity)
building '/nix/store/bk8bnrbw10nq7p8pvcmdr0qf57y6scha-hello.tar.gz.drv'...
No 'fromImage' provided
Creating layer 1 from paths: ['/nix/store/i93s7xxblavsacpy82zdbn4kplsyq48l-libunistring-1.1']
Creating layer 2 from paths: ['/nix/store/ji01n9vinnj22nbrb86nx8a1ssgpilx8-libidn2-2.3.4']
Creating layer 3 from paths: ['/nix/store/ldrslljw4rg026nw06gyrdwl78k77vyq-xgcc-12.3.0-libgcc']
Creating layer 4 from paths: ['/nix/store/9y8pmvk8gdwwznmkzxa6pwyah52xy3nk-glibc-2.38-27']
Creating layer 5 from paths: ['/nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1']
Creating layer 6 with customisation...
Adding manifests...
Done.
/nix/store/hxcz7snvw7f8rzhbh6mv8jq39d992905-hello.tar.gz

$ docker image load -i /nix/store/hxcz7snvw7f8rzhbh6mv8jq39d992905-hello.tar.gz
(some output removed for clarity)
Loaded image: hello:latest
```
:::

## streamLayeredImage {#ssec-pkgs-dockerTools-streamLayeredImage}

`streamLayeredImage` constrói um **script** que, quando executado, transmitirá para o stdout um tarball de repositório compatível com Docker contendo uma única imagem, usando múltiplas camadas para melhorar o compartilhamento entre imagens. Isso significa que `streamLayeredImage` não gera uma imagem no Nix store, mas apenas um script que constrói a imagem, economizando E/S e espaço em disco/cache, particularmente com imagens grandes.

Você pode carregar o resultado desta função no Docker com `docker image load`. Veja [](#ex-dockerTools-streamLayeredImage-hello) para ver como fazer isso.

Para esta função, você especifica um [store path](https://nixos.org/manual/nix/stable/store/store-path) ou uma lista de store paths a serem adicionados à imagem, e as funções incluirão automaticamente quaisquer dependências desses paths na imagem. A função tentará criar uma camada por objeto no Nix store que precisa ser adicionado à imagem. Caso haja mais objetos para incluir do que camadas disponíveis, a função colocará os objetos mais ["populares"](https://github.com/NixOS/nixpkgs/tree/release-23.11/pkgs/build-support/references-by-popularity) em suas próprias camadas, e agrupará todos os objetos restantes em uma única camada.

Uma camada adicional será criada com symlinks para os store paths que você especificou para serem incluídos na imagem. Esses symlinks são construídos com [`symlinkJoin`](#trivial-builder-symlinkJoin), então eles serão incluídos na raiz da imagem. Veja [](#ex-dockerTools-streamLayeredImage-exploringlayers) para entender como esses symlinks são dispostos na imagem gerada.

`streamLayeredImage` permite que scripts sejam executados ao criar a camada adicional com symlinks, permitindo que um comportamento personalizado afete os resultados finais da imagem (veja a documentação dos atributos `extraCommands` e `fakeRootCommands`).

O tarball de repositório resultante listará uma única imagem conforme especificado pelos atributos `name` e `tag`. Por padrão, essa imagem usará uma data de criação estática (veja a documentação para os atributos `created` e `mtime`). Isso permite que a função produza imagens reproduzíveis.

### Inputs {#ssec-pkgs-dockerTools-streamLayeredImage-inputs}

`streamLayeredImage` espera um argumento com os seguintes atributos:

`name` (String)

: O nome da imagem gerada.

`tag` (String ou Null; _opcional_)

: Tag da imagem gerada.
  Se `null`, o hash da nix derivation será usado como a tag.

  _Valor padrão:_ `null`.

`fromImage`(Path ou Null; _opcional_)

: O tarball de repositório de uma imagem a ser usada como base para a imagem gerada.
  Deve ser uma imagem Docker válida, como uma exportada por `docker image save`, ou outra imagem construída com as funções de utilidade `dockerTools`.
  Isso pode ser visto como um equivalente de `FROM fromImage` em um `Dockerfile`.
  Um valor de `null` pode ser visto como um equivalente de `FROM scratch`.

  Se especificado, as camadas criadas serão anexadas às camadas definidas na imagem base.

  _Valor padrão:_ `null`.

`contents` (Path ou Lista de Paths; _opcional_) []{#dockerTools-buildLayeredImage-arg-contents}

: Diretórios cujo conteúdo será adicionado à imagem gerada.
  Coisas que se convertem em paths (por exemplo, uma derivation) também podem ser usadas.
  Isso pode ser visto como um equivalente de `ADD contents/ /` em um `Dockerfile`.

  Todo o conteúdo especificado por `contents` será adicionado como uma camada final na imagem gerada.
  Eles serão adicionados como links para os arquivos reais (por exemplo, links para os store paths).
  Os arquivos reais serão adicionados em camadas anteriores.

  _Valor padrão:_ `[]`

`config` (Attribute Set ou Null; _opcional_) []{#dockerTools-buildLayeredImage-arg-config}

: Usado para especificar a configuração dos containers que serão iniciados a partir da imagem gerada.
  Deve ser um attribute set, com cada atributo conforme listado na [Docker Image Specification v1.3.0](https://github.com/moby/moby/blob/46f7ab808b9504d735d600e259ca0723f76fb164/image/spec/spec.md#image-json-field-descriptions).

  Se quaisquer pacotes forem usados diretamente em `config`, eles serão automaticamente incluídos na imagem gerada.
  Veja [](#ex-dockerTools-streamLayeredImage-configclosure) para um exemplo.

  _Valor padrão:_ `null`.

`architecture` (String; _opcional_)

: Usado para especificar a arquitetura da imagem.
  Isso é útil para builds multi-arquitetura que não precisam de cross-compilação.
  Se especificado, seu valor deve seguir a [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md#properties), que ainda deve ser compatível com Docker.
  De acordo com a especificação vinculada, todos os valores possíveis para `$GOARCH` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão um de `386`, `amd64`, `arm` ou `arm64`.

  _Valor padrão:_ o mesmo valor de `pkgs.go.GOARCH`.

`created` (String; _opcional_)

: Especifica a hora de criação da imagem gerada.
  Esta data será usada para os metadados da imagem.
  Isso deve ser uma data e hora formatadas de acordo com [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) ou `"now"`, caso em que a data atual será usada.

  :::{.caution}
  Usar `"now"` significa que a imagem gerada não será mais reproduzível (porque a data sempre mudará sempre que for construída).
  :::

  _Valor padrão:_ `"1970-01-01T00:00:01Z"`.

`mtime` (String; _opcional_)

: Especifica a hora usada para o timestamp de modificação dos arquivos dentro das camadas da imagem gerada.
  Isso deve ser uma data e hora formatadas de acordo com [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) ou `"now"`, caso em que a data atual será usada.

  :::{.caution}
  Usar uma data não constante fará com que as camadas construídas tenham um hash diferente a cada vez, impedindo a deduplicação.
  Usar `"now"` também significa que a imagem gerada não será mais reproduzível (porque a data sempre mudará sempre que for construída).
  :::

  _Valor padrão:_ `"1970-01-01T00:00:01Z"`.

`uid` (Number; _opcional_) []{#dockerTools-buildLayeredImage-arg-uid}
`gid` (Number; _opcional_) []{#dockerTools-buildLayeredImage-arg-gid}
`uname` (String; _opcional_) []{#dockerTools-buildLayeredImage-arg-uname}
`gname` (String; _opcional_) []{#dockerTools-buildLayeredImage-arg-gname}

: Credenciais para a propriedade do Nix store.
  Pode ser substituído para, por exemplo, `1000` / `1000` / `"user"` / `"user"` para permitir a construção de um container onde o Nix pode ser usado como um usuário sem privilégios no modo de usuário único.

  _Valor padrão:_ `0` / `0` / `"root"` / `"root"`

`maxLayers` (Number; _opcional_) []{#dockerTools-buildLayeredImage-arg-maxLayers}

: O número máximo de camadas que serão usadas pela imagem gerada.
  Se um `fromImage` foi especificado, o número de camadas usadas por `fromImage` será subtraído de `maxLayers` para garantir que a imagem gerada terá no máximo `maxLayers`.

  :::{.caution}
  Dependendo da ferramenta/runtime onde a imagem será usada, pode haver um limite para o número de camadas que uma imagem pode ter.
  Para Docker, veja [este problema no GitHub](https://github.com/docker/docs/issues/8230).
  :::

  _Valor padrão:_ 100.

`extraCommands` (String; _opcional_)

: Um script bash que será executado no contexto da camada criada com o conteúdo especificado por `contents`.
  No momento em que este script é executado, apenas o conteúdo especificado diretamente por `contents` estará disponível como links.

  _Valor padrão:_ `""`.

`fakeRootCommands` (String; _opcional_)

: Um script bash que será executado no contexto da camada criada com o conteúdo especificado por `contents`.
  Durante o processo de geração dessa camada, o script em `extraCommands` será executado primeiro, se especificado.
  Depois disso, um ambiente {manpage}`fakeroot(1)` será iniciado.
  O script especificado em `fakeRootCommands` é executado dentro do ambiente fakeroot, e a camada é então gerada a partir da visão dos arquivos dentro do ambiente fakeroot.

  Isso é útil para alterar os proprietários dos arquivos na camada (executando `chown`, por exemplo), ou realizando quaisquer outras operações privilegiadas relacionadas à manipulação de arquivos (por padrão, todos os arquivos na camada serão de propriedade do root, e o ambiente de build não tem privilégios suficientes para realizar diretamente operações privilegiadas nesses arquivos).

  Para mais detalhes, veja a manpage para {manpage}`fakeroot(1)`.

  :::{.caution}
  Devido a como o fakeroot funciona, binários estáticos não podem realizar operações de arquivo privilegiadas em `fakeRootCommands`, a menos que `enableFakechroot` seja definido como `true`.
  :::

  _Valor padrão:_ `""`.

`enableFakechroot` (Booleano; _opcional_)

: Por padrão, o script especificado em `fakeRootCommands` é executado apenas dentro de um ambiente fakeroot.
  Se `enableFakechroot` for `true`, um ambiente chroot mais completo será criado usando [`proot`](https://proot-me.github.io/) antes de executar o script em `fakeRootCommands`.
  Arquivos no Nix store estarão disponíveis.
  Isso permite que scripts que realizam instalação em `/` funcionem como esperado.
  Isso pode ser visto como um equivalente de `RUN ...` em um `Dockerfile`.

  _Valor padrão:_ `false`

`includeStorePaths` (Booleano; _opcional_)

: Os arquivos especificados em `contents` são colocados em camadas na imagem gerada.
  Se `includeStorePaths` for `false`, os arquivos reais não serão incluídos na imagem gerada, e apenas links para eles serão adicionados.
  **Não é recomendado** definir isso como `false` a menos que você tenha outras ferramentas para inserir os store paths por outros meios (como montagem de bind do host store) ao executar containers com a imagem gerada.
  Se você não fornecer nenhuma ferramenta extra, a imagem gerada não será executada corretamente.

  Veja [](#ex-dockerTools-streamLayeredImage-exploringlayers) para entender o impacto de definir `includeStorePaths` como `false`.

  _Valor padrão:_ `true`

`includeNixDB` (Booleano; _opcional_)

: Popula o banco de dados nix na imagem com as dependências de `copyToRoot`.
  O principal objetivo é poder usar comandos nix no container.

  :::{.caution}
  Tenha cuidado, pois isso não funciona bem em combinação com `fromImage`. Em particular, em uma imagem multi-camadas, apenas os paths Nix da imagem inferior estarão no banco de dados.

  Isso também negligencia o registro dos store paths que são puxados para a imagem como uma dependência de um dos outros valores, mas não são uma dependência de `copyToRoot`.
  :::

  _Valor padrão:_ `false`.

`meta` (Attribute Set)

: O atributo `meta` da derivation resultante, como em `stdenv.mkDerivation`. Aceita `description`, `maintainers` e quaisquer outros atributos `meta`.

`passthru` (Attribute Set; _opcional_)

: Use isso para passar quaisquer atributos como [`passthru`](#chap-passthru) para a derivation resultante.

  _Valor padrão:_ `{}`

### Passthru outputs {#ssec-pkgs-dockerTools-streamLayeredImage-passthru-outputs}

`streamLayeredImage` também define seus próprios atributos [`passthru`](#chap-passthru):

`imageTag` (String)

: A tag da imagem gerada.
  Isso é útil se nenhuma tag foi especificada nos atributos do argumento para a função, porque uma tag automática será usada em vez disso.
  `imageTag` permite recuperar o valor da tag usada neste caso.

### Examples {#ssec-pkgs-dockerTools-streamLayeredImage-examples}

:::{.example #ex-dockerTools-streamLayeredImage-hello}
# Streaming uma imagem Docker em camadas

O pacote a seguir constrói um **script** que, quando executado, transmitirá uma imagem Docker em camadas que executa o executável `hello` do pacote `hello`.
A imagem Docker terá o nome `hello` e a tag `latest`.

```nix
{ dockerTools, hello }:
dockerTools.streamLayeredImage {
  name = "hello";
  tag = "latest";

  contents = [ hello ];

  config.Cmd = [ "/bin/hello" ];
}
```

O resultado da construção deste pacote é um script.
Executar este script e direcioná-lo para `docker image load` lhe dá a mesma imagem que foi construída em [](#ex-dockerTools-buildLayeredImage-hello).
Note que neste caso, a imagem nunca é adicionada ao Nix store, mas sim transmitida diretamente para o Docker.

```shell
$ nix-build
(output removed for clarity)
/nix/store/wsz2xl8ckxnlb769irvq6jv1280dfvxd-stream-hello

$ /nix/store/wsz2xl8ckxnlb769irvq6jv1280dfvxd-stream-hello | docker image load
No 'fromImage' provided
Creating layer 1 from paths: ['/nix/store/i93s7xxblavsacpy82zdbn4kplsyq48l-libunistring-1.1']
Creating layer 2 from paths: ['/nix/store/ji01n9vinnj22nbrb86nx8a1ssgpilx8-libidn2-2.3.4']
Creating layer 3 from paths: ['/nix/store/ldrslljw4rg026nw06gyrdwl78k77vyq-xgcc-12.3.0-libgcc']
Creating layer 4 from paths: ['/nix/store/9y8pmvk8gdwwznmkzxa6pwyah52xy3nk-glibc-2.38-27']
Creating layer 5 from paths: ['/nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1']
Creating layer 6 with customisation...
Adding manifests...
Done.
(some output removed for clarity)
Loaded image: hello:latest
```
:::

:::{.example #ex-dockerTools-streamLayeredImage-exploringlayers}
# Explorando as camadas em uma imagem construída com `streamLayeredImage`

Assuma o seguinte pacote, que constrói uma imagem Docker em camadas com o pacote `hello`.

```nix
{ dockerTools, hello }:
dockerTools.streamLayeredImage {
  name = "hello";
  contents = [ hello ];
}
```

O pacote `hello` depende de outros 4 pacotes:

```shell
$ nix-store --query -R $(nix-build -A hello)
/nix/store/i93s7xxblavsacpy82zdbn4kplsyq48l-libunistring-1.1
/nix/store/ji01n9vinnj22nbrb86nx8a1ssgpilx8-libidn2-2.3.4
/nix/store/ldrslljw4rg026nw06gyrdwl78k77vyq-xgcc-12.3.0-libgcc
/nix/store/9y8pmvk8gdwwznmkzxa6pwyah52xy3nk-glibc-2.38-27
/nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1
```

Isso significa que todos esses pacotes serão incluídos na imagem gerada por `streamLayeredImage`.
Ele colocará cada pacote em sua própria camada, para um total de 5 camadas com arquivos reais.
Uma camada final será criada apenas com symlinks para o pacote `hello`.

A imagem gerada terá a seguinte estrutura de diretórios (alguns diretórios foram recolhidos para legibilidade):

```
├── bin
│   └── hello → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/bin/hello
├── nix
│   └── store
│       ├─⊕ 9y8pmvk8gdwwznmkzxa6pwyah52xy3nk-glibc-2.38-27
│       ├─⊕ i93s7xxblavsacpy82zdbn4kplsyq48l-libunistring-1.1
│       ├─⊕ ji01n9vinnj22nbrb86nx8a1ssgpilx8-libidn2-2.3.4
│       ├─⊕ ldrslljw4rg026nw06gyrdwl78k77vyq-xgcc-12.3.0-libgcc
│       └─⊕ zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1
└── share
    ├── info
    │   └── hello.info → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/share/info/hello.info
    ├─⊕ locale
    └── man
        └── man1
            └── hello.1.gz → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/share/man/man1/hello.1.gz
```

Cada um dos pacotes em `/nix/store` vem de uma camada na imagem.
A camada final adiciona os diretórios `/bin` e `/share`, mas eles contêm apenas links para os arquivos reais em `/nix/store`.

Se nosso pacote definir `includeStorePaths` como `false`, teremos apenas a camada final com os links, mas os arquivos reais não existirão na imagem:

```nix
{ dockerTools, hello }:
dockerTools.streamLayeredImage {
  name = "hello";
  contents = [ hello ];
  includeStorePaths = false;
}
```

Após construir este pacote, a imagem terá a seguinte estrutura de diretórios:

```
├── bin
│   └── hello → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/bin/hello
└── share
    ├── info
    │   └── hello.info → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/share/info/hello.info
    ├─⊕ locale
    └── man
        └── man1
            └── hello.1.gz → /nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1/share/man/man1/hello.1.gz
```

Note como os links apontam para paths em `/nix/store`, mas eles não estão incluídos na própria imagem.
É por isso que você precisa de ferramentas extras ao usar `includeStorePaths`:
um container criado a partir de tal imagem não encontrará nenhum dos arquivos de que precisa para ser executado.
:::

::: {.example #ex-dockerTools-streamLayeredImage-configclosure}
# Construindo uma imagem Docker em camadas com pacotes diretamente em `config`

O closure de `config` é automaticamente incluído na imagem gerada.
O pacote a seguir mostra uma maneira mais compacta de criar a mesma saída gerada em [](#ex-dockerTools-streamLayeredImage-hello).

```nix
{
  dockerTools,
  hello,
  lib,
}:
dockerTools.streamLayeredImage {
  name = "hello";
  tag = "latest";
  config.Cmd = [ "${lib.getExe hello}" ];
}
```
:::

[]{#ssec-pkgs-dockerTools-fetchFromRegistry}
## pullImage {#ssec-pkgs-dockerTools-pullImage}

Esta função é semelhante ao comando `docker image pull`, o que significa que pode ser usada para puxar uma imagem Docker de um registry que implementa a [Docker Registry HTTP API V2](https://distribution.github.io/distribution/spec/api/). Por padrão, o registry `docker.io` é usado.

A imagem será baixada como um tarball de repositório Docker compatível e não compactado, que é adequado para uso com outras funções `dockerTools` como [`buildImage`](#ssec-pkgs-dockerTools-buildImage), [`buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage) e [`streamLayeredImage`](#ssec-pkgs-dockerTools-streamLayeredImage).

Esta função requer que dois tipos diferentes de hashes/digests sejam especificados:

- Um deles é usado para identificar uma imagem única dentro do registry (veja a documentação para o atributo `imageDigest`).
- O outro é usado pelo Nix para garantir que o conteúdo da saída não mudou (veja a documentação para o atributo `sha256`).

Ambos os hashes são necessários porque devem identificar de forma única algum conteúdo em dois sistemas completamente diferentes (o Docker registry e o Nix store), mas seus valores não serão os mesmos.
Veja [](#ex-dockerTools-pullImage-nixprefetchdocker) para uma ferramenta que pode ajudar a coletar esses valores.

### Inputs {#ssec-pkgs-dockerTools-pullImage-inputs}

`pullImage` espera um único argumento com os seguintes atributos:

`imageName` (String)

: Especifica o nome da imagem a ser baixada, bem como o endpoint do registry.
  Por padrão, o registry `docker.io` é usado.
  Para especificar um registry diferente, prefixe o endpoint a `imageName`, separado por uma barra (`/`).
  Veja [](#ex-dockerTools-pullImage-differentregistry) para saber como fazer isso.

`imageDigest` (String)

: Especifica o digest da imagem a ser baixada.

  :::{.tip}
  **Por que não posso especificar uma tag para puxar, e tenho que usar um digest em vez disso?**

  Tags são frequentemente atualizadas para apontar para diferentes conteúdos de imagem.
  O exemplo mais comum é a tag `latest`, que geralmente é atualizada sempre que uma nova versão da imagem está disponível.

  Uma tag de imagem não é suficiente para garantir que o conteúdo de uma imagem não mudará, mas um digest garante isso.
  Fornecer um digest ajuda a garantir que você ainda será capaz de construir o mesmo código Nix e obter a mesma saída, mesmo que novas versões de uma imagem sejam lançadas.
  :::

`sha256` (String)

: O hash da imagem depois de ser baixada.
  Internamente, isso é passado para o atributo [`outputHash`](https://nixos.org/manual/nix/stable/language/advanced-attributes#adv-attr-outputHash) da derivation resultante.
  Isso é necessário para fornecer uma garantia ao Nix de que o conteúdo da imagem não mudou, porque o Nix não suporta o valor em `imageDigest`.

`finalImageName` (String; _opcional_)

: Especifica o nome que será usado para a imagem depois de ser baixada.
  Isso se aplica apenas depois que a imagem é baixada, e não é usado para identificar a imagem a ser baixada no registry.
  Use `imageName` para isso em vez disso.

  _Valor padrão:_ o mesmo valor especificado em `imageName`.

`finalImageTag` (String; _opcional_)

: Especifica a tag que será usada para a imagem depois de ser baixada.
  Isso se aplica apenas depois que a imagem é baixada, e não é usado para identificar a imagem a ser baixada no registry.

  _Valor padrão:_ `"latest"`.

`os` (String; _opcional_)

: Especifica o sistema operacional da imagem a ser puxada.
  Se especificado, seu valor deve seguir a [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md#properties), que ainda deve ser compatível com Docker.
  De acordo com a especificação vinculada, todos os valores possíveis para `$GOOS` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão um de `darwin` ou `linux`.

  _Valor padrão:_ `"linux"`.

`arch` (String; _opcional_)

: Especifica a arquitetura da imagem a ser puxada.
  Se especificado, seu valor deve seguir a [OCI Image Configuration Specification](https://github.com/opencontainers/image-spec/blob/main/config.md#properties), que ainda deve ser compatível com Docker.
  De acordo com a especificação vinculada, todos os valores possíveis para `$GOARCH` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão um de `386`, `amd64`, `arm` ou `arm64`.

  _Valor padrão:_ o mesmo valor de `pkgs.go.GOARCH`.

`tlsVerify` (Booleano; _opcional_)

: Usado para habilitar ou desabilitar a verificação de certificados HTTPS e TLS ao se comunicar com o Docker registry escolhido.
  Definir isso como `false` fará com que `pullImage` se conecte ao registry via HTTP.

  _Valor padrão:_ `true`.

`name` (String; _opcional_)

: O nome usado para a saída no Nix store path.

  _Valor padrão:_ um valor derivado de `finalImageName` e `finalImageTag`, com alguns símbolos substituídos.
  É recomendado tratar o padrão como um valor opaco.

### Examples {#ssec-pkgs-dockerTools-pullImage-examples}

::: {.example #ex-dockerTools-pullImage-niximage}
# Puxando a imagem Docker nixos/nix do registry padrão

Este exemplo puxa a [`nixos/nix` image](https://hub.docker.com/r/nixos/nix) e a salva no Nix store.

```nix
{ dockerTools }:
dockerTools.pullImage {
  imageName = "nixos/nix";
  imageDigest = "sha256:b8ea88f763f33dfda2317b55eeda3b1a4006692ee29e60ee54ccf6d07348c598";
  finalImageName = "nix";
  finalImageTag = "2.19.3";
  hash = "sha256-zRwlQs1FiKrvHPaf8vWOR/Tlp1C5eLn1d9pE4BZg3oA=";
}
```
:::

::: {.example #ex-dockerTools-pullImage-differentregistry}
# Puxando a imagem Docker nixos/nix de um registry específico

Este exemplo puxa a [`coreos/etcd` image](https://quay.io/repository/coreos/etcd) do registry `quay.io`.

```nix
{ dockerTools }:
dockerTools.pullImage {
  imageName = "quay.io/coreos/etcd";
  imageDigest = "sha256:24a23053f29266fb2731ebea27f915bb0fb2ae1ea87d42d890fe4e44f2e27c5d";
  finalImageName = "etcd";
  finalImageTag = "v3.5.11";
  hash = "sha256-Myw+85f2/EVRyMB3axECdmQ5eh9p1q77FWYKy8YpRWU=";
}
```
:::

::: {.example #ex-dockerTools-pullImage-nixprefetchdocker}
# Encontrando os valores de digest e hash para usar com `dockerTools.pullImage`

Como [`dockerTools.pullImage`](#ssec-pkgs-dockerTools-pullImage) requer dois hashes diferentes, pode-se executar a ferramenta `nix-prefetch-docker` para descobrir os valores dos hashes.
A ferramenta gera um texto para um attribute set que você pode passar diretamente para `pullImage`.

```shell
$ nix run nixpkgs#nix-prefetch-docker -- --image-name nixos/nix --image-tag 2.19.3 --arch amd64 --os linux
(some output removed for clarity)
Writing manifest to image destination
-> ImageName: nixos/nix
-> ImageDigest: sha256:498fa2d7f2b5cb3891a4edf20f3a8f8496e70865099ba72540494cd3e2942634
-> FinalImageName: nixos/nix
-> FinalImageTag: latest
-> ImagePath: /nix/store/4mxy9mn6978zkvlc670g5703nijsqc95-docker-image-nixos-nix-latest.tar
-> ImageHash: 1q6cf2pdrasa34zz0jw7pbs6lvv52rq2aibgxccbwcagwkg2qj1q
{
  imageName = "nixos/nix";
  imageDigest = "sha256:498fa2d7f2b5cb3891a4edf20f3a8f8496e70865099ba72540494cd3e2942634";
  hash = "sha256-OEgs3uRPMb4Y629FJXAWZW9q9LqHS/A/GUqr3K5wzOA=";
  finalImageName = "nixos/nix";
  finalImageTag = "latest";
}
```

É importante fornecer os argumentos `--arch` e `--os` para `nix-prefetch-docker` para filtrar para uma única imagem, caso haja múltiplas arquiteturas e/ou sistemas operacionais suportados pelo nome e tags da imagem especificados.
Por padrão, `nix-prefetch-docker` definirá `os` como `linux` e `arch` como `amd64`.

Execute `nix-prefetch-docker --help` para uma lista de todos os argumentos suportados:
```shell
$ nix run nixpkgs#nix-prefetch-docker -- --help
(output removed for clarity)
```
:::

## exportImage {#ssec-pkgs-dockerTools-exportImage}

Esta função é semelhante ao comando `docker container export`, o que significa que pode ser usada para exportar o filesystem de uma imagem como um arquivo tarball não compactado.
A diferença é que `docker container export` é aplicado a containers, mas `dockerTools.exportImage` é aplicado a imagens Docker.
O arquivo resultante não conterá nenhum metadado da imagem (como o comando para executar com `docker container run`), apenas o conteúdo do filesystem.

Você pode usar esta função para importar um arquivo no Docker com `docker image import`.
Veja [](#ex-dockerTools-exportImage-importingDocker) para entender como fazer isso.

:::{.caution}
`exportImage` funciona descompactando a imagem fornecida dentro de uma VM.
Por causa disso, usar esta função requer que o dispositivo `kvm` esteja disponível, veja [`system-features`](https://nixos.org/manual/nix/stable/command-ref/conf-file.html#conf-system-features).
:::

### Inputs {#ssec-pkgs-dockerTools-exportImage-inputs}

`exportImage` espera um argumento com os seguintes atributos:

`fromImage` (Attribute Set ou String)

: O tarball de repositório da imagem cujo filesystem será exportado.
  Deve ser uma imagem Docker válida, como uma exportada por `docker image save`, ou outra imagem construída com as funções de utilidade `dockerTools`.

  Se `name` não for especificado, `fromImage` deve ser um Attribute Set correspondente a uma derivation, ou seja, não pode ser um path para um tarball.
  Se `name` for especificado, `fromImage` pode ser um Attribute Set correspondente a uma derivation ou simplesmente um path para um tarball.

  Veja [](#ex-dockerTools-exportImage-naming) e [](#ex-dockerTools-exportImage-fromImagePath) para entender a conexão entre `fromImage`, `name` e o nome usado para a saída de `exportImage`.

`fromImageName` (String ou Null; _opcional_)

: Usado para especificar a imagem dentro do tarball de repositório caso ele contenha múltiplas imagens.
  Um valor de `null` significa que `exportImage` usará a primeira imagem disponível no repositório.

  :::{.note}
  Isso deve ser usado com `fromImageTag`. Usar apenas `fromImageName` sem `fromImageTag` fará com que `exportImage` use a primeira imagem disponível no repositório.
  :::

  _Valor padrão:_ `null`.

`fromImageTag` (String ou Null; _opcional_)

: Usado para especificar a imagem dentro do tarball de repositório caso ele contenha múltiplas imagens.
  Um valor de `null` significa que `exportImage` usará a primeira imagem disponível no repositório.

  :::{.note}
  Isso deve ser usado com `fromImageName`. Usar apenas `fromImageTag` sem `fromImageName` fará com que `exportImage` use a primeira imagem disponível no repositório.
  :::

  _Valor padrão:_ `null`.

`diskSize` (Number; _opcional_)

: Controla o tamanho do disco (em megabytes) da VM usada para descompactar a imagem.

  _Valor padrão:_ 1024.

`name` (String; _opcional_)

: O nome usado para a saída no Nix store path.

  _Valor padrão:_ o valor de `fromImage.name`.

### Examples {#ssec-pkgs-dockerTools-exportImage-examples}

:::{.example #ex-dockerTools-exportImage-hello}
# Exportando uma imagem Docker com `dockerTools.exportImage`

Este exemplo primeiro constrói uma imagem em camadas com [`dockerTools.buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage), e então exporta seu filesystem com `dockerTools.exportImage`.

```nix
{ dockerTools, hello }:
dockerTools.exportImage {
  name = "hello";
  fromImage = dockerTools.buildLayeredImage {
    name = "hello";
    contents = [ hello ];
  };
}
```

Ao construir o pacote acima, podemos ver as camadas da imagem Docker sendo descompactadas para produzir a saída final:

```shell
$ nix-build
(some output removed for clarity)
Unpacking base image...
From-image name or tag wasn't set. Reading the first ID.
Unpacking layer 5731199219418f175d1580dbca05677e69144425b2d9ecb60f416cd57ca3ca42/layer.tar
tar: Removing leading `/' from member names
Unpacking layer e2897bf34bb78c4a65736510204282d9f7ca258ba048c183d665bd0f3d24c5ec/layer.tar
tar: Removing leading `/' from member names
Unpacking layer 420aa5876dca4128cd5256da7dea0948e30ef5971712f82601718cdb0a6b4cda/layer.tar
tar: Removing leading `/' from member names
Unpacking layer ea5f4e620e7906c8ecbc506b5e6f46420e68d4b842c3303260d5eb621b5942e5/layer.tar
tar: Removing leading `/' from member names
Unpacking layer 65807b9abe8ab753fa97da8fb74a21fcd4725cc51e1b679c7973c97acd47ebcf/layer.tar
tar: Removing leading `/' from member names
Unpacking layer b7da2076b60ebc0ea6824ef641978332b8ac908d47b2d07ff31b9cc362245605/layer.tar
Executing post-mount steps...
Packing raw image...
[    1.660036] reboot: Power down
/nix/store/x6a5m7c6zdpqz1d8j7cnzpx9glzzvd2h-hello
```

O comando a seguir lista alguns dos conteúdos da saída para verificar se a estrutura do arquivo está conforme o esperado:

```shell
$ tar --exclude '*/share/*' --exclude 'nix/store/*/*' -tvf /nix/store/x6a5m7c6zdpqz1d8j7cnzpx9glzzvd2h-hello
drwxr-xr-x root/0            0 1979-12-31 16:00 ./
drwxr-xr-x root/0            0 1979-12-31 16:00 ./bin/
lrwxrwxrwx root/0            0 1979-12-31 16:00 ./bin/hello -> /nix/store/h92a9jd0lhhniv2q417hpwszd4jhys7q-hello-2.12.1/bin/hello
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/05zbwhz8a7i2v79r9j21pl6m6cj0xi8k-libunistring-1.1/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/ayg5rhjhi9ic73hqw33mjqjxwv59ndym-xgcc-13.2.0-libgcc/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/h92a9jd0lhhniv2q417hpwszd4jhys7q-hello-2.12.1/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/m59xdgkgnjbk8kk6k6vbxmqnf82mk9s0-libidn2-2.3.4/
dr-xr-xr-x root/0            0 1979-12-31 16:00 ./nix/store/p3jshbwxiwifm1py0yq544fmdyy98j8a-glibc-2.38-27/
drwxr-xr-x root/0            0 1979-12-31 16:00 ./share/
```
:::

:::{.example #ex-dockerTools-exportImage-importingDocker}
# Importando um arquivo construído com `dockerTools.exportImage` no Docker

Usaremos o mesmo pacote de [](#ex-dockerTools-exportImage-hello) e o importaremos para o Docker.

```nix
{ dockerTools, hello }:
dockerTools.exportImage {
  name = "hello";
  fromImage = dockerTools.buildLayeredImage {
    name = "hello";
    contents = [ hello ];
  };
}
```

Construindo e importando para o Docker:

```shell
$ nix-build
(output removed for clarity)
/nix/store/x6a5m7c6zdpqz1d8j7cnzpx9glzzvd2h-hello
$ docker image import /nix/store/x6a5m7c6zdpqz1d8j7cnzpx9glzzvd2h-hello
sha256:1d42dba415e9b298ea0decf6497fbce954de9b4fcb2984f91e307c8fedc1f52f
$ docker image ls
REPOSITORY                              TAG                IMAGE ID       CREATED         SIZE
<none>                                  <none>             1d42dba415e9   4 seconds ago   32.6MB
```
:::

:::{.example #ex-dockerTools-exportImage-naming}
# Explorando a nomeação de saída com `dockerTools.exportImage`

`exportImage` não requer um atributo `name` se `fromImage` for uma derivation, o que significa que o seguinte funciona:

```nix
{ dockerTools, hello }:
dockerTools.exportImage {
  fromImage = dockerTools.buildLayeredImage {
    name = "hello";
    contents = [ hello ];
  };
}
```

No entanto, como a saída de [`dockerTools.buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage) termina com `.tar.gz`, a saída de `exportImage` também terminará com `.tar.gz`, mesmo que o arquivo criado com `exportImage` não seja compactado:

```shell
$ nix-build
(output removed for clarity)
/nix/store/by3f40xvc4l6bkis74l0fj4zsy0djgkn-hello.tar.gz
$ file /nix/store/by3f40xvc4l6bkis74l0fj4zsy0djgkn-hello.tar.gz
/nix/store/by3f40xvc4l6bkis74l0fj4zsy0djgkn-hello.tar.gz: POSIX tar archive (GNU)
```

Se o arquivo estivesse realmente compactado, a saída de `file` teria mencionado esse fato.
Por causa disso, pode ser importante definir um atributo `name` adequado ao usar `exportImage` com outras funções de `dockerTools`.
:::

:::{.example #ex-dockerTools-exportImage-fromImagePath}
# Usando `dockerTools.exportImage` com um path como `fromImage`

É possível usar um path como valor do atributo `fromImage` ao chamar `dockerTools.exportImage`.
No entanto, ao fazer isso, um atributo `name` **DEVE** ser especificado, ou você encontrará um erro ao avaliar o código Nix.

Para este exemplo, assumiremos que uma imagem tarball Docker chamada `image.tar.gz` existe no mesmo diretório onde nosso pacote é definido:

```nix
{ dockerTools }:
dockerTools.exportImage {
  name = "filesystem.tar";
  fromImage = ./image.tar.gz;
}
```

Construir isso nos dará a saída esperada:

```shell
$ nix-build
(output removed for clarity)
/nix/store/w13l8h3nlkg0zv56k7rj0ai0l2zlf7ss-filesystem.tar
```

Se você não especificar um atributo `name`, encontrará um erro de avaliação e o pacote não será construído.
:::

## Environment Helpers {#ssec-pkgs-dockerTools-helpers}

Ao construir imagens Docker com Nix, você também pode querer adicionar certos arquivos que são esperados para estarem disponíveis globalmente pelo software que você está empacotando.
Exemplos simples são a utilidade `env` em `/usr/bin/env`, ou certificados raiz TLS/SSL confiáveis.
Tais arquivos provavelmente não serão incluídos se você estiver construindo uma imagem Docker do zero com Nix, e eles também podem não ser incluídos se você estiver começando de uma imagem Docker que não os inclui.
Os helpers nesta seção são pacotes que fornecem alguns desses arquivos globais comumente necessários.

A maioria desses helpers são pacotes, o que significa que você deve adicioná-los à lista de conteúdos a serem incluídos na imagem (isso muda dependendo da função que você está usando para construir a imagem).
[](#ex-dockerTools-helpers-buildImage) e [](#ex-dockerTools-helpers-buildLayeredImage) mostram como incluir esses pacotes nas funções `dockerTools` que constroem uma imagem.
Para mais detalhes sobre como isso funciona, veja a documentação da função que você está usando.

### usrBinEnv {#sssec-pkgs-dockerTools-helpers-usrBinEnv}

Isso fornece a utilidade `env` em `/usr/bin/env`.
Isso é atualmente implementado ligando ao binário `env` do pacote `coreutils`, mas é considerado um detalhe de implementação que pode mudar no futuro.

### binSh {#sssec-pkgs-dockerTools-helpers-binSh}

Isso fornece um link `/bin/sh` para o binário `bash` do pacote `bash`.
Por causa disso, ele suporta casos como executar um comando interativamente em um container (por exemplo, executando `docker container run -it <image_name>`).

### caCertificates {#sssec-pkgs-dockerTools-helpers-caCertificates}

Isso adiciona certificados raiz TLS/SSL confiáveis do pacote `cacert` em vários locais em uma tentativa de ser compatível com binários construídos para múltiplas distribuições Linux.
Os locais atualmente usados são:

- `/etc/ssl/certs/ca-bundle.crt`
- `/etc/ssl/certs/ca-certificates.crt`
- `/etc/pki/tls/certs/ca-bundle.crt`

[]{#ssec-pkgs-dockerTools-fakeNss}
### fakeNss {#sssec-pkgs-dockerTools-helpers-fakeNss}

Este é um re-export do pacote `fakeNss` do Nixpkgs.
Veja [](#sec-fakeNss).

### shadowSetup {#ssec-pkgs-dockerTools-shadowSetup}

Esta é uma string contendo um script que configura arquivos necessários para que o [`shadow`](https://github.com/shadow-maint/shadow) funcione (usando o pacote `shadow` do Nixpkgs), e altera o `PATH` para tornar todas as suas utilidades disponíveis no mesmo script.
Ele é destinado a ser usado com outras funções dockerTools em atributos que esperam scripts.
Depois que o script em `shadowSetup` é executado, você poderá adicionar mais comandos que utilizam as utilidades em `shadow`, como adicionar quaisquer usuários e/ou grupos extras.
Veja [](#ex-dockerTools-shadowSetup-buildImage) e [](#ex-dockerTools-shadowSetup-buildLayeredImage) para entender melhor como usá-lo.

`shadowSetup` alcança um resultado semelhante a [`fakeNss`](#sssec-pkgs-dockerTools-helpers-fakeNss), mas apenas configura um usuário `root` com valores diferentes para o diretório home e o shell a ser usado, além de configurar arquivos para [PAM](https://en.wikipedia.org/wiki/Linux_PAM) e um arquivo {manpage}`login.defs(5)`.

:::{.caution}
Usar `fakeNss` e `shadowSetup` ao mesmo tempo causará a quebra da sua build ou produzirá resultados inesperados.
Use `fakeNss` ou `shadowSetup` dependendo do seu caso de uso, mas evite usar ambos.
:::

:::{.note}
Quando usado com [`buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage) ou [`streamLayeredImage`](#ssec-pkgs-dockerTools-streamLayeredImage), você terá que definir o atributo `enableFakechroot` como `true`, caso contrário o script em `shadowSetup` não será executado corretamente.
Veja [](#ex-dockerTools-shadowSetup-buildLayeredImage).
:::

### Examples {#ssec-pkgs-dockerTools-helpers-examples}

:::{.example #ex-dockerTools-helpers-buildImage}
# Usando os helpers de ambiente do `dockerTools` com `buildImage`

Este exemplo adiciona o helper [`binSh`](#sssec-pkgs-dockerTools-helpers-binSh) a uma imagem Docker básica construída com [`dockerTools.buildImage`](#ssec-pkgs-dockerTools-buildImage).
Este helper possibilita entrar em um shell dentro do container.
Este é o equivalente de `buildImage` de [](#ex-dockerTools-helpers-buildLayeredImage).

```nix
{ dockerTools, hello }:
dockerTools.buildImage {
  name = "env-helpers";
  tag = "latest";

  copyToRoot = [
    hello
    dockerTools.binSh
  ];
}
```

Após construir a imagem e carregá-la no Docker, podemos criar um container baseado nela e entrar em um shell dentro do container.
Isso é possível graças a `binSh`.

```shell
$ nix-build
(some output removed for clarity)
/nix/store/2p0i3i04cgjlk71hsn7ll4kxaxxiv4qg-docker-image-env-helpers.tar.gz
$ docker image load -i /nix/store/2p0i3i04cgjlk71hsn7ll4kxaxxiv4qg-docker-image-env-helpers.tar.gz
(output removed for clarity)
$ docker container run --rm -it env-helpers:latest /bin/sh
sh-5.2# help
GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)
(rest of output removed for clarity)
```
:::

:::{.example #ex-dockerTools-helpers-buildLayeredImage}
# Usando os helpers de ambiente do `dockerTools` com `buildLayeredImage`

Este exemplo adiciona o helper [`binSh`](#sssec-pkgs-dockerTools-helpers-binSh) a uma imagem Docker básica construída com [`dockerTools.buildLayeredImage`](#ssec-pkgs-dockerTools-buildLayeredImage).
Este helper possibilita entrar em um shell dentro do container.
Este é o equivalente de `buildLayeredImage` de [](#ex-dockerTools-helpers-buildImage).

```nix
{ dockerTools, hello }:
dockerTools.buildLayeredImage {
  name = "env-helpers";
  tag = "latest";

  contents = [
    hello
    dockerTools.binSh
  ];

  config = {
    Cmd = [ "/bin/hello" ];
  };
}
```

Após construir a imagem e carregá-la no Docker, podemos criar um container baseado nela e entrar em um shell dentro do container.
Isso é possível graças a `binSh`.

```shell
$ nix-build
(some output removed for clarity)
/nix/store/rpf47f4z5b9qr4db4ach9yr4b85hjhxq-env-helpers.tar.gz
$ docker image load -i /nix/store/rpf47f4z5b9qr4db4ach9yr4b85hjhxq-env-helpers.tar.gz
(output removed for clarity)
$ docker container run --rm -it env-helpers:latest /bin/sh
sh-5.2# help
GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)
(rest of output removed for clarity)
```
:::

:::{.example #ex-dockerTools-shadowSetup-buildImage}
# Usando `dockerTools.shadowSetup` com `dockerTools.buildImage`

Este é um exemplo que mostra como usar `shadowSetup` com `dockerTools.buildImage`.
Note que o script extra em `runAsRoot` usa `groupadd` e `useradd`, que são binários fornecidos pelo pacote `shadow`.
Esses binários são adicionados ao `PATH` pelo script `shadowSetup`, mas apenas durante a execução de `runAsRoot`.

```nix
{ dockerTools, hello }:
dockerTools.buildImage {
  name = "shadow-basic";
  tag = "latest";

  copyToRoot = [ hello ];

  runAsRoot = ''
    ${dockerTools.shadowSetup}
    groupadd -r hello
    useradd -r -g hello hello
    mkdir /data
    chown hello:hello /data
  '';

  config = {
    Cmd = [ "/bin/hello" ];
    WorkingDir = "/data";
  };
}
```
:::

:::{.example #ex-dockerTools-shadowSetup-buildLayeredImage}
# Usando `dockerTools.shadowSetup` com `dockerTools.buildLayeredImage`

Ele realiza a mesma coisa que [](#ex-dockerTools-shadowSetup-buildImage), mas usando `buildLayeredImage` em vez disso.

Note que o script extra em `fakeRootCommands` usa `groupadd` e `useradd`, que são binários fornecidos pelo pacote `shadow`.
Esses binários são adicionados ao `PATH` pelo script `shadowSetup`, mas apenas durante a execução de `fakeRootCommands`.

```nix
{ dockerTools, hello }:
dockerTools.buildLayeredImage {
  name = "shadow-basic";
  tag = "latest";

  contents = [ hello ];

  fakeRootCommands = ''
    ${dockerTools.shadowSetup}
    groupadd -r hello
    useradd -r -g hello hello
    mkdir /data
    chown hello:hello /data
  '';
  enableFakechroot = true;

  config = {
    Cmd = [ "/bin/hello" ];
    WorkingDir = "/data";
  };
}
```
:::

[]{#ssec-pkgs-dockerTools-buildNixShellImage-arguments}
## buildNixShellImage {#ssec-pkgs-dockerTools-buildNixShellImage}

`buildNixShellImage` usa [`streamNixShellImage`](#ssec-pkgs-dockerTools-streamNixShellImage) por baixo para construir um tarball de repositório compactado compatível com Docker de uma imagem que configura um ambiente semelhante ao de executar `nix-shell` em uma derivation. Basicamente, `buildNixShellImage` executa o script criado por `streamNixShellImage` para salvar a imagem compactada no Nix store.

`buildNixShellImage` suporta as mesmas opções que `streamNixShellImage`, veja [`streamNixShellImage`](#ssec-pkgs-dockerTools-streamNixShellImage) para detalhes.

[]{#ssec-pkgs-dockerTools-buildNixShellImage-example}
### Examples {#ssec-pkgs-dockerTools-buildNixShellImage-examples}

:::{.example #ex-dockerTools-buildNixShellImage-hello}
# Construindo uma imagem Docker com `buildNixShellImage` com o ambiente de build para o pacote `hello`

Este exemplo mostra como construir o pacote `hello` dentro de um container Docker construído com `buildNixShellImage`.
A imagem Docker gerada terá um nome como `hello-<version>-env` e a tag `latest`.
Este exemplo é o equivalente de `buildNixShellImage` de [](#ex-dockerTools-streamNixShellImage-hello).

```nix
{ dockerTools, hello }:
dockerTools.buildNixShellImage {
  drv = hello;
  tag = "latest";
}
```

O resultado da construção deste pacote é um arquivo `.tar.gz` que pode ser carregado no Docker:

```shell
$ nix-build
(some output removed for clarity)
/nix/store/pkj1sgzaz31wl0pbvbg3yp5b3kxndqms-hello-2.12.1-env.tar.gz

$ docker image load -i /nix/store/pkj1sgzaz31wl0pbvbg3yp5b3kxndqms-hello-2.12.1-env.tar.gz
(some output removed for clarity)
Loaded image: hello-2.12.1-env:latest
```

Após iniciar um container interativo, a derivation pode ser construída executando `buildDerivation`, e a saída pode ser executada como esperado:

```shell
$ docker container run -it hello-2.12.1-env:latest
[nix-shell:~]$ buildDerivation
Running phase: unpackPhase
unpacking source archive /nix/store/pa10z4ngm0g83kx9mssrqzz30s84vq7k-hello-2.12.1.tar.gz
source root is hello-2.12.1
(some output removed for clarity)
Running phase: fixupPhase
shrinking RPATHs of ELF executables and libraries in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1
shrinking /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/bin/hello
checking for references to /build/ in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1...
gzipping man pages under /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/share/man/
patching script interpreter paths in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1
stripping (with command strip and flags -S -p) in  /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/bin

[nix-shell:~]$ $out/bin/hello
Hello, world!
```
:::

## streamNixShellImage {#ssec-pkgs-dockerTools-streamNixShellImage}

`streamNixShellImage` constrói um **script** que, quando executado, transmitirá para o stdout um tarball de repositório compatível com Docker de uma imagem que configura um ambiente semelhante ao de executar `nix-shell` em uma derivation. Isso significa que `streamNixShellImage` não gera uma imagem no Nix store, mas apenas um script que constrói a imagem, economizando E/S e espaço em disco/cache, particularmente com imagens grandes.
Veja [](#ex-dockerTools-streamNixShellImage-hello) para entender como carregar no Docker a imagem gerada por este script.

O ambiente configurado por `streamNixShellImage` se assemelha um pouco ao Nix sandbox tipicamente usado por `nix-build`, com uma grande diferença sendo que o acesso à internet é permitido.
Ele também se comporta como um `nix-shell` interativo, executando coisas como `shellHook` (veja [](#ex-dockerTools-streamNixShellImage-addingShellHook)) e configurando um prompt interativo.
Se a derivation for construível (ou seja, `nix-build` pode ser usado nela), executar `buildDerivation` no container construirá a derivation, com todas as suas saídas disponíveis nos store paths corretos `/nix/store`, apontados pelas respectivas variáveis de ambiente (por exemplo, `$out`).

::: {.caution}
O ambiente na imagem não corresponde exatamente a `nix-shell` ou `nix-build`, e esta função é conhecida por não funcionar corretamente para derivations de saída fixa, derivations com endereço de conteúdo, derivations impuras e outros tipos especiais de derivations.
:::

### Inputs {#ssec-pkgs-dockerTools-streamNixShellImage-inputs}

`streamNixShellImage` espera um argumento com os seguintes atributos:

`drv` (Attribute Set)

: A derivation para a qual o ambiente na imagem será configurado.
  Adicionar pacotes à imagem Docker é possível estendendo a lista de `nativeBuildInputs` desta derivation.
  Veja [](#ex-dockerTools-streamNixShellImage-extendingBuildInputs) para saber como fazer isso.
  Da mesma forma, você pode estender o script de inicialização da imagem estendendo `shellHook`.
  [](#ex-dockerTools-streamNixShellImage-addingShellHook) mostra como fazer isso.

`name` (String; _opcional_)

: O nome da imagem gerada.

  _Valor padrão:_ o valor de `drv.name + "-env"`.

`tag` (String ou Null; _opcional_)

: Tag da imagem gerada.
  Se `null`, o hash da nix derivation que constrói a imagem Docker será usado como a tag.

  _Valor padrão:_ `null`.

`uid` (Number; _opcional_)

: O ID de usuário para executar o container.
  Isso pode ser visto como um usuário de build `nixbld`.

  _Valor padrão:_ 1000.

`gid` (Number; _opcional_)

: O ID de grupo para executar o container.
  Isso pode ser visto como um grupo de build `nixbld`.

  _Valor padrão:_ 1000.

`homeDirectory` (String; _opcional_)

: O diretório home do usuário como o qual o container está sendo executado.

  _Valor padrão:_ `/build`.

`shell` (String; _opcional_)

: O path para o binário `bash` a ser usado como shell.
  Este shell é iniciado ao executar a imagem.
  Isso pode ser visto como um equivalente da [variável de ambiente](https://nixos.org/manual/nix/stable/command-ref/nix-shell.html#environment-variables) `NIX_BUILD_SHELL` para {manpage}`nix-shell(1)`.

  _Valor padrão:_ o binário `bash` do pacote `bash`.

`command` (String ou Null; _opcional_)

: Se especificado, este comando será executado no ambiente da derivation em um shell interativo.
  Uma chamada para `exit` será adicionada após o comando, se especificado, para que o shell saia após a execução.
  Isso pode ser visto como um equivalente da opção `--command` em {manpage}`nix-shell(1)`.

  _Valor padrão:_ `null`.

`run` (String ou Null; _opcional_)

: Semelhante ao atributo `command`, mas executa o comando em um shell não interativo.
  Uma chamada para `exit` será adicionada após o comando, se especificado, para que o shell saia após a execução.
  Isso pode ser visto como um equivalente da opção `--run` em {manpage}`nix-shell(1)`.

  _Valor padrão:_ `null`.

### Examples {#ssec-pkgs-dockerTools-streamNixShellImage-examples}

:::{.example #ex-dockerTools-streamNixShellImage-hello}
# Construindo uma imagem Docker com `streamNixShellImage` com o ambiente de build para o pacote `hello`

Este exemplo mostra como construir o pacote `hello` dentro de um container Docker construído com `streamNixShellImage`.
A imagem Docker gerada terá um nome como `hello-<version>-env` e a tag `latest`.
Este exemplo é o equivalente de `streamNixShellImage` de [](#ex-dockerTools-buildNixShellImage-hello).

```nix
{ dockerTools, hello }:
dockerTools.streamNixShellImage {
  drv = hello;
  tag = "latest";
}
```

O resultado da construção deste pacote é um script.
Executar este script e direcioná-lo para `docker image load` lhe dá a mesma imagem que foi construída em [](#ex-dockerTools-buildNixShellImage-hello).

```shell
$ nix-build
(some output removed for clarity)
/nix/store/8vhznpz2frqazxnd8pgdvf38jscdypax-stream-hello-2.12.1-env

$ /nix/store/8vhznpz2frqazxnd8pgdvf38jscdypax-stream-hello-2.12.1-env | docker image load
(some output removed for clarity)
Loaded image: hello-2.12.1-env:latest
```

Após iniciar um container interativo, a derivation pode ser construída executando `buildDerivation`, e a saída pode ser executada como esperado:

```shell
$ docker container run -it hello-2.12.1-env:latest
[nix-shell:~]$ buildDerivation
Running phase: unpackPhase
unpacking source archive /nix/store/pa10z4ngm0g83kx9mssrqzz30s84vq7k-hello-2.12.1.tar.gz
source root is hello-2.12.1
(some output removed for clarity)
Running phase: fixupPhase
shrinking RPATHs of ELF executables and libraries in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1
shrinking /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/bin/hello
checking for references to /build/ in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1...
gzipping man pages under /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/share/man/
patching script interpreter paths in /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1
stripping (with command strip and flags -S -p) in  /nix/store/f2vs29jibd7lwxyj35r9h87h6brgdysz-hello-2.12.1/bin

[nix-shell:~]$ $out/bin/hello
Hello, world!
```
:::

:::{.example #ex-dockerTools-streamNixShellImage-extendingBuildInputs}
# Adicionando pacotes extras a uma imagem Docker construída com `streamNixShellImage`

Este exemplo mostra como adicionar pacotes extras a uma imagem construída com `streamNixShellImage`.
Neste caso, adicionaremos o pacote `cowsay`.
A imagem Docker gerada terá um nome como `hello-<version>-env` e a tag `latest`.
Este exemplo usa [](#ex-dockerTools-streamNixShellImage-hello) como ponto de partida.

```nix
{
  dockerTools,
  cowsay,
  hello,
}:
dockerTools.streamNixShellImage {
  tag = "latest";
  drv = hello.overrideAttrs (old: {
    nativeBuildInputs = old.nativeBuildInputs or [ ] ++ [ cowsay ];
  });
}
```

O resultado da construção deste pacote é um script que pode ser executado e direcionado para `docker image load` para carregar a imagem gerada.

```shell
$ nix-build
(some output removed for clarity)
/nix/store/h5abh0vljgzg381lna922gqknx6yc0v7-stream-hello-2.12.1-env

$ /nix/store/h5abh0vljgzg381lna922gqknx6yc0v7-stream-hello-2.12.1-env | docker image load
(some output removed for clarity)
Loaded image: hello-2.12.1-env:latest
```

Após iniciar um container interativo, podemos verificar se o pacote extra está disponível executando `cowsay`:

```shell
$ docker container run -it hello-2.12.1-env:latest
[nix-shell:~]$ cowsay "Hello, world!"
 _______________
< Hello, world! >
 ---------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```
:::

:::{.example #ex-dockerTools-streamNixShellImage-addingShellHook}
# Adicionando um `shellHook` a uma imagem Docker construída com `streamNixShellImage`

Este exemplo mostra como adicionar um comando `shellHook` a uma imagem construída com `streamNixShellImage`.
Neste caso, simplesmente exibiremos a string `Hello, world!`.
A imagem Docker gerada terá um nome como `hello-<version>-env` e a tag `latest`.
Este exemplo usa [](#ex-dockerTools-streamNixShellImage-hello) como ponto de partida.

```nix
{ dockerTools, hello }:
dockerTools.streamNixShellImage {
  tag = "latest";
  drv = hello.overrideAttrs (old: {
    shellHook = ''
      ${old.shellHook or ""}
      echo "Hello, world!"
    '';
  });
}
```

O resultado da construção deste pacote é um script que pode ser executado e direcionado para `docker image load` para carregar a imagem gerada.

```shell
$ nix-build
(some output removed for clarity)
/nix/store/iz4hhdvgzazl5vrgyz719iwjzjy6xlx1-stream-hello-2.12.1-env

$ /nix/store/iz4hhdvgzazl5vrgyz719iwjzjy6xlx1-stream-hello-2.12.1-env | docker image load
(some output removed for clarity)
Loaded image: hello-2.12.1-env:latest
```

Após iniciar um container interativo, podemos ver o resultado do `shellHook`:

```shell
$ docker container run -it hello-2.12.1-env:latest
Hello, world!

[nix-shell:~]$
```
:::