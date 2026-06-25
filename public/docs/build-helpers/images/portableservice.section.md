# pkgs.portableService {#sec-pkgs-portableService}

`pkgs.portableService` é uma função para criar [Serviços Portáteis](https://systemd.io/PORTABLE_SERVICES/) em uma imagem de disco raw `squashfs` somente leitura e imutável.
Isso permite que você use Nix para construir imagens que podem ser executadas em muitas distribuições Linux recentes.

::: {.note}
Serviços portáteis são suportados a partir do systemd 239 (lançado em 22/06/2018).
:::

A imagem gerada conterá a estrutura do sistema de arquivos conforme exigido pela especificação de Serviços Portáteis, juntamente com os pacotes fornecidos a `portableService` e todas as suas dependências.
Quando gerada, a imagem existirá na Nix store com a extensão de arquivo `.raw`, conforme exigido pela especificação.
Veja [](#ex-portableService-hello) para entender como usar a saída de `portableService`.

## Entradas {#ssec-pkgs-portableService-inputs}

`portableService` espera um argumento com os seguintes atributos:

`pname` (String)

: O nome do serviço portátil.
  A imagem gerada será nomeada de acordo com o modelo `$pname_$version.raw`, que é suportado pela especificação de Serviços Portáteis.

`version` (String)

: A versão do serviço portátil.
  A imagem gerada será nomeada de acordo com o modelo `$pname_$version.raw`, que é suportado pela especificação de Serviços Portáteis.

`units` (Lista de Attribute Set)

: Uma lista de derivations para arquivos de unidade systemd.
  Cada derivation deve produzir um único arquivo e deve ter um nome que comece com o valor de `pname` e termine com o sufixo do tipo de unidade (por exemplo, ".service", ".socket", ".timer", e assim por diante).
  Veja [](#ex-portableService-hello) para entender melhor essa restrição de nomenclatura.

`description` (String ou Null; _opcional_)

: Se especificado, o valor é adicionado como `PORTABLE_PRETTY_NAME` ao arquivo `/etc/os-release` na imagem gerada.
  Isso pode ser usado para fornecer mais informações a quem estiver inspecionando a imagem.

  _Valor padrão:_ `null`.

`homepage` (String ou Null; _opcional_)

: Se especificado, o valor é adicionado como `HOME_URL` ao arquivo `/etc/os-release` na imagem gerada.
  Isso pode ser usado para fornecer mais informações a quem estiver inspecionando a imagem.

  _Valor padrão:_ `null`.

`symlinks` (Lista de Attribute Set; _opcional_)

: Uma lista de attribute sets no formato `{object, symlink}`.
  Para cada item na lista, `portableService` criará um symlink no caminho especificado por `symlink` (relativo à raiz da imagem) que aponta para `object`.

  Todos os pacotes dos quais `object` depende e suas dependências são automaticamente copiados para a imagem.

  Isso pode ser usado para criar symlinks para aplicações que assumem que alguns arquivos existem globalmente (`/etc/ssl` ou `/bin/bash`, por exemplo).
  Veja [](#ex-portableService-symlinks) para entender como fazer isso.

  _Valor padrão:_ `[]`.

`contents` (Lista de Attribute Set; _opcional_)

: Uma lista de derivations adicionais a serem incluídas como estão na imagem.
  Essas derivations serão incluídas diretamente em um diretório `/nix/store` dentro da imagem.

  _Valor padrão:_ `[]`.

`squashfsTools` (Attribute Set; _opcional_)

: Permite que você sobrescreva o pacote que fornece {manpage}`mksquashfs(1)`, que é usado internamente por `portableService`.

  _Valor padrão:_ `pkgs.squashfsTools`.

`squash-compression` (String; _opcional_)

: Passado como a opção de compressão para {manpage}`mksquashfs(1)`, que é usado internamente por `portableService`.

  _Valor padrão:_ `"xz -Xdict-size 100%"`.

`squash-block-size` (String; _opcional_)

: Passado como a opção de tamanho de bloco para {manpage}`mksquashfs(1)`, que é usado internamente por `portableService`.

  _Valor padrão:_ `"1M"`.

## Exemplos {#ssec-pkgs-portableService-examples}

[]{#ex-pkgs-portableService}
:::{.example #ex-portableService-hello}
# Construindo uma imagem de Serviço Portátil

O exemplo a seguir constrói uma imagem de Serviço Portátil com o pacote `hello`, juntamente com uma unidade de serviço que o executa.

```nix
{
  lib,
  writeText,
  portableService,
  hello,
}:
let
  hello-service = writeText "hello.service" ''
    [Unit]
    Description=Hello world service

    [Service]
    Type=oneshot
    ExecStart=${lib.getExe hello}
  '';
in
portableService {
  pname = "hello";
  inherit (hello) version;
  units = [ hello-service ];
}
```

Após construir o pacote, a imagem gerada pode ser carregada em um sistema através de {manpage}`portablectl(1)`:

```shell
$ nix-build
(some output removed for clarity)
/nix/store/8c20z1vh7z8w8dwagl8w87b45dn5k6iq-hello-img-2.12.1

$ portablectl attach /nix/store/8c20z1vh7z8w8dwagl8w87b45dn5k6iq-hello-img-2.12.1/hello_2.12.1.raw
Created directory /etc/systemd/system.attached.
Created directory /etc/systemd/system.attached/hello.service.d.
Written /etc/systemd/system.attached/hello.service.d/20-portable.conf.
Created symlink /etc/systemd/system.attached/hello.service.d/10-profile.conf → /usr/lib/systemd/portable/profile/default/service.conf.
Copied /etc/systemd/system.attached/hello.service.
Created symlink /etc/portables/hello_2.12.1.raw → /nix/store/8c20z1vh7z8w8dwagl8w87b45dn5k6iq-hello-img-2.12.1/hello_2.12.1.raw.

$ systemctl start hello
$ journalctl -u hello
Feb 28 22:39:16 hostname systemd[1]: Starting Hello world service...
Feb 28 22:39:16 hostname hello[102887]: Hello, world!
Feb 28 22:39:16 hostname systemd[1]: hello.service: Deactivated successfully.
Feb 28 22:39:16 hostname systemd[1]: Finished Hello world service.

$ portablectl detach hello_2.12.1
Removed /etc/systemd/system.attached/hello.service.
Removed /etc/systemd/system.attached/hello.service.d/10-profile.conf.
Removed /etc/systemd/system.attached/hello.service.d/20-portable.conf.
Removed /etc/systemd/system.attached/hello.service.d.
Removed /etc/portables/hello_2.12.1.raw.
Removed /etc/systemd/system.attached.
```
:::

:::{.example #ex-portableService-symlinks}
# Especificando symlinks ao construir uma imagem de Serviço Portátil

Alguns serviços podem esperar que arquivos ou diretórios estejam disponíveis globalmente.
Um exemplo é um serviço que espera que todos os certificados SSL confiáveis existam em um local específico por padrão.

Para tornar as coisas disponíveis globalmente, você deve especificar o atributo `symlinks` ao usar `portableService`.
O pacote a seguir se baseia no pacote de [](#ex-portableService-hello) para tornar `/etc/ssl` disponível globalmente (isso é apenas para fins ilustrativos, porque `hello` não usa `/etc/ssl`).

```nix
{
  lib,
  writeText,
  portableService,
  hello,
  cacert,
}:
let
  hello-service = writeText "hello.service" ''
    [Unit]
    Description=Hello world service

    [Service]
    Type=oneshot
    ExecStart=${lib.getExe hello}
  '';
in
portableService {
  pname = "hello";
  inherit (hello) version;
  units = [ hello-service ];
  symlinks = [
    {
      object = "${cacert}/etc/ssl";
      symlink = "/etc/ssl";
    }
  ];
}
```
:::