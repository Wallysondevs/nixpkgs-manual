# Kernel Linux {#sec-linux-kernel}

As expressões Nix para construir o kernel Linux estão em [`pkgs/os-specific/linux/kernel`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/os-specific/linux/kernel).

A função [`pkgs.buildLinux`](https://github.com/NixOS/nixpkgs/blob/d77bda728d5041c1294a68fb25c79e2d161f62b9/pkgs/os-specific/linux/kernel/generic.nix) constrói um kernel com [valores de configuração comuns](https://github.com/NixOS/nixpkgs/blob/d77bda728d5041c1294a68fb25c79e2d161f62b9/pkgs/os-specific/linux/kernel/common-config.nix). Esta é a opção preferida, a menos que você tenha um caso de uso muito específico. A maioria dos kernels empacotados no Nixpkgs são construídos dessa forma, e isso também gerará kernels adequados para o NixOS. [`pkgs.linuxManualConfig`](https://github.com/NixOS/nixpkgs/blob/d77bda728d5041c1294a68fb25c79e2d161f62b9/pkgs/os-specific/linux/kernel/build.nix) requer que uma configuração completa seja passada. Ela tem menos recursos adicionais do que `pkgs.buildLinux`, que fornece valores de configuração comuns e expõe o atributo `features`, conforme explicado abaixo.

Ambas as funções possuem um argumento `kernelPatches` que deve ser uma lista de conjuntos de atributos `{name, patch, extraConfig}`, onde `name` é o nome do patch (que é incluído no atributo `meta.description` do kernel), `patch` é o próprio patch (possivelmente compactado), e `extraConfig` (opcional) é uma string que especifica opções extras a serem concatenadas ao arquivo de configuração do kernel (`.config`).

A derivation do kernel criada com `pkgs.buildLinux` exporta um atributo `features` especificando se a funcionalidade opcional está ou não habilitada. Isso é usado no NixOS para implementar comportamento específico do kernel.

Se você estiver usando um kernel empacotado no Nixpkgs, você pode personalizá-lo sobrescrevendo seus argumentos. Para detalhes sobre como cada argumento afeta o kernel gerado, consulte [o código-fonte de `pkgs.buildLinux`](https://github.com/NixOS/nixpkgs/blob/d77bda728d5041c1294a68fb25c79e2d161f62b9/pkgs/os-specific/linux/kernel/generic.nix).

:::{.example #ex-overriding-kernel-derivation}

# Sobrescrevendo a derivation do kernel

Assumindo que você esteja usando o kernel de `pkgs.linux_latest`:

```nix
pkgs.linux_latest.override {
  ignoreConfigErrors = true;
  autoModules = false;
  kernelPreferBuiltin = true;
  structuredExtraConfig = with lib.kernel; {
    DEBUG_KERNEL = yes;
    FRAME_POINTER = yes;
    KGDB = yes;
    KGDB_SERIAL_CONSOLE = yes;
    DEBUG_INFO = yes;
  };
}
```

:::

## Configuração manual do kernel {#sec-manual-kernel-configuration}

Às vezes, pode não ser desejável usar kernels construídos com `pkgs.buildLinux`, especialmente se a maior parte da configuração comum tiver que ser alterada ou desabilitada para obter um kernel conforme esperado pelo caso de uso alvo. Um exemplo disso é a construção de um kernel para uso em uma VM ou micro VM. Você pode usar `pkgs.linuxPackages_custom` nestes casos. Ele requer que os atributos `src`, `version` e `configfile` sejam especificados.

:::{.example #ex-using-linux-manual-config}

# Usando `pkgs.linuxPackages_custom` com uma fonte, versão e arquivo de configuração específicos

```nix
{ pkgs, ... }:
pkgs.linuxPackages_custom {
  version = "6.1.55";
  src = pkgs.fetchurl {
    url = "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${version}.tar.xz";
    hash = "sha256-qH4kHsFdU0UsTv4hlxOjdp2IzENrW5jPbvsmLEr/FcA=";
  };
  configfile = ./path_to_config_file;
}
```

Se necessário, a string de versão pode ser ligeiramente modificada para marcá-la explicitamente como uma versão personalizada. Se você fizer isso, certifique-se de que o atributo `modDirVersion` corresponda à versão da fonte, caso contrário, a construção falhará.

```nix
{ pkgs, ... }:
pkgs.linuxPackages_custom {
  version = "6.1.55-custom";
  modDirVersion = "6.1.55";
  src = pkgs.fetchurl {
    url = "https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${modDirVersion}.tar.xz";
    hash = "sha256-qH4kHsFdU0UsTv4hlxOjdp2IzENrW5jPbvsmLEr/FcA=";
  };
  configfile = ./path_to_config_file;
}
```

:::

Atributos adicionais podem ser usados com `linuxManualConfig` para personalização adicional em vez de `linuxPackages_custom`. Você é encorajado a ler [o código-fonte de `pkgs.linuxManualConfig`](https://github.com/NixOS/nixpkgs/blob/d77bda728d5041c1294a68fb25c79e2d161f62b9/pkgs/os-specific/linux/kernel/build.nix) para entender como usá-los.

Para editar o arquivo `.config` para Linux X.Y de dentro do Nix, proceda da seguinte forma:

```ShellSession
$ nix-shell '<nixpkgs>' -A linuxKernel.kernels.linux_X_Y.configEnv
$ unpackPhase
$ cd linux-*
$ make nconfig
```

## Desenvolvendo módulos do kernel {#sec-linux-kernel-developing-modules}

Ao desenvolver módulos do kernel, é frequentemente conveniente executar o ciclo de edição-compilação-execução o mais rápido possível. Veja o trecho abaixo como exemplo.

:::{.example #ex-edit-compile-run-kernel-modules}

# Ciclo de edição-compilação-execução ao desenvolver drivers `mellanox`

```ShellSession
$ nix-build '<nixpkgs>' -A linuxPackages.kernel.dev
$ nix-shell '<nixpkgs>' -A linuxPackages.kernel
$ unpackPhase
$ cd linux-*
$ make -C $dev/lib/modules/*/build M=$(pwd)/drivers/net/ethernet/mellanox modules
# insmod ./drivers/net/ethernet/mellanox/mlx5/core/mlx5_core.ko
```

:::

## Informações do mantenedor {#sec-linux-kernel-maintainer-information}

### Atualizando kernels {#sec-linux-updates}

A atualização de todos os kernels pode ser feita com o seguinte script:

```ShellSession
$ pkgs/os-specific/linux/kernel/update.sh
```

A alteração é submetida da seguinte forma:

*   Abra um PR contra `staging-nixos`.
    *   Adicione uma etiqueta `backport staging-nixos-XX.XX` para um backport automatizado. Ao usar um PR adicional, obtemos o backport automático para a versão estável sem cherry-picks manuais.
*   Mescle em `staging-nixos` ou `staging-nixos-XX.XX`.
*   Abra como PR de `staging-nixos` contra `master` ou `staging-nixos-XX.XX` contra `release-xx.xx`.
*   Quando todas as verificações de status estiverem verdes, mescle.

### Adicionar uma nova versão (principal) do kernel Linux {#sec-linux-add-new-kernel-version}

*   Ao executar `./pkgs/os-specific/linux/kernel/update.sh`, novas versões principais do kernel são descobertas automaticamente.
*   Prepare todas as expressões Nix para o novo kernel
    *   Instancie o novo kernel em `pkgs/top-level/linux-kernels.nix` na seção `kernels`.
    ```nix
    {
      linux_X_Y = callPackage ../os-specific/linux/kernel/mainline.nix {
        branch = "X.Y";
        kernelPatches = [
          # any new patches required (it makes to look which patches are used by its predecessor)
        ];
      };
    }
    ```
    *   Instancie o conjunto de pacotes em `vanillaPackages`:
    ```nix
    {
      linux_X_Y = recurseIntoAttrs (packagesFor kernels.linux_X_Y);
    }
    ```
    *   Atualize `linux_latest` para o novo atributo.
*   **SQUASH** as alterações no commit `linux: init at …`.

### Política para aceitar novas variantes de kernel {#sec-linux-new-kernels}

Nenhum novo kernel downstream é aceito no nixpkgs. Isso inclui kernels que usam a árvore de código-fonte principal, mas com uma configuração diferente. Kernels para suporte estendido de hardware devem ir para [nixos-hardware](github.com/NixOS/nixos-hardware) em vez disso.