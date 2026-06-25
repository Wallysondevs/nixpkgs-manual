# fakeNss {#sec-fakeNss}

Fornece arquivos `/etc/passwd` e `/etc/group` que contêm `root` e `nobody`, permitindo que pesquisas de usuário/grupo funcionem em binários que insistem em fazê-las.
Esta pode ser uma escolha melhor do que um script personalizado executando `useradd` e utilitários relacionados se você precisar apenas que esses arquivos existam com algumas entradas.

`fakeNss` também fornece `/etc/nsswitch.conf`, configurando a resolução de host NSS para primeiro verificar `/etc/hosts` antes de verificar o DNS, já que o padrão na ausência de um arquivo de configuração (`dns [!UNAVAIL=return] files`) é bastante inesperado.

Ele também cria um diretório vazio em `/var/empty` porque o usa como diretório home para os usuários `root` e `nobody`.
O diretório `/var/empty` também pode ser usado como um alvo de `chroot` para evitar o acesso a arquivos em processos que não precisam acessar arquivos, se seu contêiner executar tais processos.

As entradas de usuário criadas por `fakeNss` usam o shell `/bin/sh`, que não é fornecido por `fakeNss` porque na maioria dos casos não será usado.
Se você precisar que ele esteja disponível, consulte [`dockerTools.binSh`](#sssec-pkgs-dockerTools-helpers-binSh) ou forneça o seu próprio.

## Inputs {#sec-fakeNss-inputs}

`fakeNss` é disponibilizado no Nixpkgs como um pacote em vez de uma função, mas possui dois atributos que podem ser sobrescritos e podem ser úteis em casos particulares.
Para mais detalhes sobre como a sobrescrita funciona, consulte [](#ex-fakeNss-overriding) e [](#sec-pkg-override).

`extraPasswdLines` (Lista de Strings; _opcional_)

: Uma lista de linhas que serão adicionadas a `/etc/passwd`.
  Útil se usuários extras precisarem existir na saída de `fakeNss`.
  Se `extraPasswdLines` for especificado, ele **não** sobrescreverá as entradas `root` e `nobody` criadas por `fakeNss`.
  Essas entradas sempre existirão.

  As linhas especificadas aqui devem seguir o formato em {manpage}`passwd(5)`.

  _Valor padrão:_ `[]`.

`extraGroupLines` (Lista de Strings; _opcional_)

: Uma lista de linhas que serão adicionadas a `/etc/group`.
  Útil se grupos extras precisarem existir na saída de `fakeNss`.
  Se `extraGroupLines` for especificado, ele **não** sobrescreverá as entradas `root` e `nobody` criadas por `fakeNss`.
  Essas entradas sempre existirão.

  As linhas especificadas aqui devem seguir o formato em {manpage}`group(5)`.

  _Valor padrão:_ `[]`.

## Examples {#sec-fakeNss-examples}

:::{.example #ex-fakeNss-dockerTools-buildImage}
# Usando `fakeNss` com `dockerTools.buildImage`

Este exemplo mostra como usar `fakeNss` como está.
É útil com funções em `dockerTools` para permitir a construção de imagens Docker que possuem os arquivos `/etc/passwd` e `/etc/group`.
Este exemplo inclui o binário `hello` na imagem para que ela possa fazer algo além de apenas ter os arquivos extras.

```nix
{
  dockerTools,
  fakeNss,
  hello,
}:
dockerTools.buildImage {
  name = "image-with-passwd";
  tag = "latest";

  copyToRoot = [
    fakeNss
    hello
  ];

  config = {
    Cmd = [ "/bin/hello" ];
  };
}
```
:::

:::{.example #ex-fakeNss-overriding}
# Usando `fakeNss` com uma sobrescrita para adicionar linhas extras

O código a seguir usa `override` para adicionar linhas extras a `/etc/passwd` e `/etc/group` para criar outra entrada de usuário e grupo.

```nix
{ fakeNss }:
fakeNss.override {
  extraPasswdLines = [ "newuser:x:9001:9001:new user:/var/empty:/bin/sh" ];
  extraGroupLines = [ "newuser:x:9001:" ];
}
```
:::