# `<nixpkgs/nixos/lib/make-disk-image.nix>` {#sec-make-disk-image}

`<nixpkgs/nixos/lib/make-disk-image.nix>` é uma função para criar _imagens de disco_ em múltiplos formatos: raw, QCOW2 (QEMU), QCOW2-Compressed (versão compactada), VDI (VirtualBox), VPC (VirtualPC).

Esta função pode criar imagens de duas maneiras:

- usando `cptofs` sem nenhuma máquina virtual para criar uma imagem de disco do Nix store,
- usando uma máquina virtual para criar uma instalação completa do NixOS.

Ao testar partes de inicialização precoce ou do ciclo de vida do NixOS, como um bootloader ou múltiplas gerações, é necessário optar por uma instalação completa do sistema NixOS.
Enquanto para muitos servidores web e aplicações, é possível trabalhar com uma imagem de disco contendo apenas o Nix store, o que é mais rápido de construir.

Os testes do NixOS também usam esta função ao preparar a VM. O método `cptofs` é usado quando `virtualisation.useBootLoader` é `false` (o padrão). Caso contrário, o segundo método é usado.

## Funcionalidades {#sec-make-disk-image-features}

Para referência, leia o código-fonte da assinatura da função para documentação sobre os argumentos: <https://github.com/NixOS/nixpkgs/blob/master/nixos/lib/make-disk-image.nix>.
As funcionalidades são separadas em várias seções, dependendo se você opta por uma imagem contendo apenas o Nix store ou uma imagem completa do NixOS.

### Comum {#sec-make-disk-image-features-common}

- configuração arbitrária do NixOS
- tamanho de disco automático ou limitado: parâmetro `diskSize`, `additionalSpace` pode ser definido quando `diskSize` é `auto` para adicionar uma constante de espaço em disco
- múltiplos layouts de tabela de partição: EFI, legacy, legacy + GPT, hybrid, none através do parâmetro `partitionTableType`
- firmwares e modelos de variáveis OVMF ou EFI podem ser personalizados
- o `fsType` do sistema de arquivos raiz pode ser personalizado para qualquer `mkfs.${fsType}` que exista durante as operações
- o rótulo do sistema de arquivos raiz pode ser personalizado, o padrão é `nix-store` se for uma imagem do Nix store, caso contrário `nixpkgs/nixos`
- código arbitrário pode ser executado após a produção da imagem de disco com `postVM`
- o nixpkgs atual pode ser realizado como um canal na imagem de disco, o que alterará o hash da imagem quando as fontes forem atualizadas
- caminhos de store adicionais podem ser fornecidos através de `additionalPaths`

### Imagem completa do NixOS {#sec-make-disk-image-features-full-image}

- conteúdos arbitrários com permissões podem ser colocados no sistema de arquivos de destino usando `contents`
- um `/etc/nixpkgs/nixos/configuration.nix` pode ser fornecido através de `configFile`
- bootloaders são suportados
- variáveis EFI podem ser mutadas durante a produção da imagem e o resultado é exposto em `$out`
- tamanho da partição de boot quando a tabela de partição é `efi` ou `hybrid`

### Sobre a reprodutibilidade bit-a-bit {#sec-make-disk-image-features-reproducibility}

As imagens **NÃO** são determinísticas. Por favor, não hesite em tentar corrigir isso. As fontes de não-determinismo são (não exaustivas):

- a instalação do bootloader possui timestamps
- o banco de dados do Nix store SQLite contém tempos de registro
- `/etc/shadow` está em uma ordem não determinística

Uma flag `deterministic` está disponível para os melhores esforços de determinismo.

## Uso {#sec-make-disk-image-usage}

Para produzir uma imagem contendo apenas o Nix store:
```nix
let
  pkgs = import <nixpkgs> { };
  lib = pkgs.lib;
  make-disk-image = import <nixpkgs/nixos/lib/make-disk-image.nix>;
in
make-disk-image {
  inherit pkgs lib;
  config = { };
  additionalPaths = [ ];
  format = "qcow2";
  onlyNixStore = true;
  partitionTableType = "none";
  installBootLoader = false;
  touchEFIVars = false;
  diskSize = "auto";
  additionalSpace = "0M"; # Defaults to 512M.
  copyChannel = false;
}
```

Alguns argumentos podem ser omitidos, eles são mostrados explicitamente para fins de exemplo.

A construção desta derivation fornecerá uma imagem de disco QCOW2 contendo apenas o Nix store e suas informações de registro.

Para produzir uma imagem de disco de instalação do NixOS com UEFI e bootloader instalados:
```nix
let
  pkgs = import <nixpkgs> { };
  lib = pkgs.lib;
  make-disk-image = import <nixpkgs/nixos/lib/make-disk-image.nix>;
  evalConfig = import <nixpkgs/nixos/lib/eval-config.nix>;
in
make-disk-image {
  inherit pkgs lib;
  inherit
    (evalConfig {
      modules = [
        {
          fileSystems."/" = {
            device = "/dev/vda";
            fsType = "ext4";
            autoFormat = true;
          };
          boot.grub.device = "/dev/vda";
        }
      ];
    })
    config
    ;
  format = "qcow2";
  onlyNixStore = false;
  partitionTableType = "legacy+gpt";
  installBootLoader = true;
  touchEFIVars = true;
  diskSize = "auto";
  additionalSpace = "0M"; # Defaults to 512M.
  copyChannel = false;
  memSize = 2048; # Qemu VM memory size in MiB (1024*1024 bytes). Defaults to 1024M.
}
```