# vmTools {#sec-vm-tools}

Um conjunto de utilitários relacionados a VMs, que auxiliam na construção de alguns pacotes em cenários mais avançados.

## `vmTools.createEmptyImage` {#vm-tools-createEmptyImage}

Um fragmento de script bash que produz uma imagem de disco em `destination`.

### Attributes {#vm-tools-createEmptyImage-attributes}

* `size`. O tamanho do disco, em MiB.
* `fullName`. Nome que será escrito em `${destination}/nix-support/full-name`.
* `destination` (opcional, padrão `$out`). Onde escrever os arquivos de imagem.

## `vmTools.runInLinuxVM` {#vm-tools-runInLinuxVM}

Executa uma derivation em uma máquina virtual Linux (usando Qemu/KVM).
Por padrão, não há imagem de disco; o sistema de arquivos raiz é um `tmpfs`, e o Nix store é compartilhado com o host (via [protocolo 9P](https://wiki.qemu.org/Documentation/9p#9p_Protocol)).
Assim, qualquer derivation Nix pura deve ser executada sem modificações.

Se a construção falhar e o Nix for executado com a opção `-K/--keep-failed`, um script `run-vm` será deixado no diretório de construção temporário, permitindo que você inicialize a VM e a depure interativamente.

### Attributes {#vm-tools-runInLinuxVM-attributes}

* `preVM` (opcional). Comando shell a ser avaliado *antes* da VM ser iniciada (ou seja, no host).
* `memSize` (opcional, padrão `512`). O tamanho da memória da VM em MiB (1024×1024 bytes).
* `diskImage` (opcional). Uma imagem de sistema de arquivos a ser anexada a `/dev/sda`.
  Note que atualmente esperamos que a imagem contenha um sistema de arquivos, e não uma imagem de disco completa com uma tabela de partições, etc.

### Examples {#vm-tools-runInLinuxVM-examples}

Constrói a derivation hello dentro de uma VM:
```nix
{ pkgs }: with pkgs; with vmTools; runInLinuxVM hello
```

Constrói dentro de uma VM com memória extra:
```nix
{ pkgs }:
with pkgs;
with vmTools;
runInLinuxVM (
  hello.overrideAttrs (_: {
    memSize = 1024;
  })
)
```

Usa a VM com uma imagem de disco (define `diskImage` implicitamente, veja [`vmTools.createEmptyImage`](#vm-tools-createEmptyImage)):
```nix
{ pkgs }:
with pkgs;
with vmTools;
runInLinuxVM (
  hello.overrideAttrs (_: {
    preVM = createEmptyImage {
      size = 1024;
      fullName = "vm-image";
    };
  })
)
```

## `vmTools.extractFs` {#vm-tools-extractFs}

Recebe um arquivo, como um ISO, e extrai seu conteúdo para o store.

### Attributes {#vm-tools-extractFs-attributes}

* `file`. Caminho para o arquivo a ser extraído.
  Note que atualmente esperamos que a imagem contenha um sistema de arquivos, e não uma imagem de disco completa com uma tabela de partições, etc.
* `fs` (opcional). Sistema de arquivos do conteúdo do arquivo.

### Examples {#vm-tools-extractFs-examples}

Extrai o conteúdo de um arquivo ISO:
```nix
{ pkgs }: with pkgs; with vmTools; extractFs { file = ./image.iso; }
```

## `vmTools.extractMTDfs` {#vm-tools-extractMTDfs}

Semelhante a [](#vm-tools-extractFs), mas faz uso de um [Memory Technology Device (MTD)](https://en.wikipedia.org/wiki/Memory_Technology_Device).

## `vmTools.runInLinuxImage` {#vm-tools-runInLinuxImage}

Semelhante a [](#vm-tools-runInLinuxVM), mas em vez de usar `stdenv` do Nix store, executa a construção usando as ferramentas fornecidas por `/bin`, `/usr/bin`, etc. da imagem de sistema de arquivos especificada, que tipicamente é um sistema de arquivos contendo uma distribuição Linux baseada em [FHS](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard).

## `vmTools.makeImageTestScript` {#vm-tools-makeImageTestScript}

Gera um script que pode ser usado para executar uma sessão interativa na imagem fornecida.

### Examples {#vm-tools-makeImageTestScript-examples}

Cria um script para executar uma VM Fedora 43:
```nix
{ pkgs }: pkgs.vmTools.makeImageTestScript pkgs.vmTools.diskImages.fedora43x86_64
```

Cria um script para executar uma VM Ubuntu 24.04:
```nix
{ pkgs }: pkgs.vmTools.makeImageTestScript pkgs.vmTools.diskImages.ubuntu2404x86_64
```

## `vmTools.diskImageFuns` {#vm-tools-diskImageFuns}

Um conjunto de funções que constroem um conjunto predefinido de imagens mínimas de distribuições Linux.

### Imagens {#vm-tools-diskImageFuns-images}

* Fedora
  * `fedora42x86_64`
  * `fedora43x86_64`
* Rocky Linux
  * `rocky9x86_64`
  * `rocky10x86_64`
* AlmaLinux
  * `alma9x86_64`
  * `alma10x86_64`
* Oracle Linux
  * `oracle9x86_64`
* Amazon Linux
  * `amazon2023x86_64`
* Ubuntu
  * `ubuntu2204i386`
  * `ubuntu2204x86_64`
  * `ubuntu2404x86_64`
* Debian
  * `debian11i386`
  * `debian11x86_64`
  * `debian12i386`
  * `debian12x86_64`
  * `debian13i386`
  * `debian13x86_64`

### Attributes {#vm-tools-diskImageFuns-attributes}

* `size` (opcional, padrão `4096`). O tamanho da imagem, em MiB.
* `extraPackages` (opcional). Uma lista de nomes de pacotes adicionais da distribuição que devem ser incluídos na imagem.

### Examples {#vm-tools-diskImageFuns-examples}

Imagem de 8GiB contendo Firefox além dos pacotes padrão:
```nix
{ pkgs }:
pkgs.vmTools.diskImageFuns.ubuntu2404x86_64 {
  extraPackages = [ "firefox" ];
  size = 8192;
}
```

## `vmTools.diskImageExtraFuns` {#vm-tools-diskImageExtraFuns}

Abreviação para `vmTools.diskImageFuns.<attr> { extraPackages = ... }`.

## `vmTools.diskImages` {#vm-tools-diskImages}

Abreviação para `vmTools.diskImageFuns.<attr> { }`.