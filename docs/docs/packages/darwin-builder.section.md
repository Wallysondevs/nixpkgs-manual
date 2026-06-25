# darwin.linux-builder {#sec-darwin-builder}

:::{.warning}
Por padrão, `darwin.linux-builder` usa uma **chave de host** SSH privada publicamente conhecida (isso é diferente da chave SSH usada pelo usuário que se conecta ao builder).

Dado o caso de uso pretendido (um builder Linux que roda **na mesma máquina**), isso não deve ser um problema.
No entanto, se você planeja desviar-se deste caso de uso de alguma forma (por exemplo, expondo este builder a máquinas remotas), você deve entender as implicações de segurança de fazê-lo e tomar as medidas apropriadas.
:::

`darwin.linux-builder` oferece uma maneira de inicializar um builder remoto Linux em uma máquina macOS.

Isso requer macOS versão 12.4 ou posterior.

O builder remoto roda na porta de host 31022 por padrão.
Você pode alterá-lo sobrescrevendo `virtualisation.darwin-builder.hostPort`.
Veja o [exemplo](#sec-darwin-builder-example-flake).

Você também precisará ser um usuário confiável para sua instalação do Nix. Em outras
palavras, seu `/etc/nix/nix.conf` deve ter algo como:

```
extra-trusted-users = <your username goes here>
```

Para iniciar o builder remoto, execute o seguinte flake:

```ShellSession
$ nix run nixpkgs#darwin.linux-builder
```

Isso solicitará que você digite sua senha de `sudo`:

```
+ sudo --reset-timestamp /nix/store/…-install-credentials.sh ./keys
Password:
```

… para que ele possa instalar uma chave privada usada para `ssh` no servidor de build.
Depois disso, o script iniciará a máquina virtual e fará login automaticamente como o usuário
`builder`:

```
<<< Welcome to NixOS 22.11.20220901.1bd8d11 (aarch64) - ttyAMA0 >>>

Run 'nixos-help' for the NixOS manual.

nixos login: builder (automatic login)


[builder@nixos:~]$
```

> Nota: Quando precisar parar a VM, execute `shutdown now` como o usuário `builder`.

Para delegar builds ao builder remoto, adicione as seguintes opções ao seu
arquivo `nix.conf`:

```
# - Substitua ${ARCH} por aarch64 ou x86_64 para corresponder à sua máquina host
# - Substitua ${MAX_JOBS} pelo número máximo de builds (escolha 4 se não tiver certeza)
builders = ssh-ng://builder@linux-builder ${ARCH}-linux /etc/nix/builder_ed25519 ${MAX_JOBS} - - - c3NoLWVkMjU1MTkgQUFBQUMzTnphQzFsWkRJMU5URTVBQUFBSUpCV2N4Yi9CbGFxdDFhdU90RStGOFFVV3JVb3RpQzVxQkorVXVFV2RWQ2Igcm9vdEBuaXhvcwo=

# Não é estritamente necessário, mas isso reduzirá a utilização do seu disco
builders-use-substitutes = true
```

Para permitir que o Nix se conecte ao builder remoto padrão, que não roda na porta 22, você também precisará criar um novo arquivo em `/etc/ssh/ssh_config.d/100-linux-builder.conf`:

```
Host linux-builder
  Hostname localhost
  HostKeyAlias linux-builder
  Port 31022
  User builder
  IdentityFile /etc/nix/builder_ed25519
```

… e então reinicie seu daemon Nix para aplicar a mudança:

```ShellSession
$ sudo launchctl kickstart -k system/org.nixos.nix-daemon
```

Note que se o builder estiver em execução e você tiver criado o arquivo de configuração ssh acima, você pode fazer ssh no builder com `sudo ssh builder@linux-builder`.

## Exemplo de uso de flake {#sec-darwin-builder-example-flake}

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-22.11-darwin";
    darwin.url = "github:lnl7/nix-darwin/master";
    darwin.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      darwin,
      nixpkgs,
      ...
    }@inputs:
    let

      inherit (darwin.lib) darwinSystem;
      system = "aarch64-darwin";
      pkgs = nixpkgs.legacyPackages."${system}";
      linuxSystem = builtins.replaceStrings [ "darwin" ] [ "linux" ] system;

      darwin-builder = nixpkgs.lib.nixosSystem {
        system = linuxSystem;
        modules = [
          "${nixpkgs}/nixos/modules/profiles/nix-builder-vm.nix"
          {
            virtualisation = {
              host.pkgs = pkgs;
              darwin-builder.workingDirectory = "/var/lib/darwin-builder";
              darwin-builder.hostPort = 22;
            };
          }
        ];
      };
    in
    {

      darwinConfigurations = {
        machine1 = darwinSystem {
          inherit system;
          modules = [
            {
              nix.distributedBuilds = true;
              nix.buildMachines = [
                {
                  hostName = "localhost";
                  sshUser = "builder";
                  sshKey = "/etc/nix/builder_ed25519";
                  system = linuxSystem;
                  maxJobs = 4;
                  supportedFeatures = [
                    "kvm"
                    "benchmark"
                    "big-parallel"
                  ];
                }
              ];

              launchd.daemons.darwin-builder = {
                command = "${darwin-builder.config.system.build.macos-builder-installer}/bin/create-builder";
                serviceConfig = {
                  KeepAlive = true;
                  RunAtLoad = true;
                  StandardOutPath = "/var/log/darwin-builder.log";
                  StandardErrorPath = "/var/log/darwin-builder.log";
                };
              };
            }
          ];
        };
      };

    };
}
```

## Reconfigurando o builder remoto {#sec-darwin-builder-reconfiguring}

Inicialmente, você não deve alterar a configuração do builder remoto, caso contrário, não conseguirá usar o cache binário. No entanto, depois de ter o builder remoto rodando localmente, você pode usá-lo para construir um builder remoto modificado com armazenamento ou memória adicionais.

Para fazer isso, você só precisa definir os parâmetros `virtualisation.darwin-builder.*` como no exemplo abaixo e reconstruir.

```nix
{
  darwin-builder = nixpkgs.lib.nixosSystem {
    system = linuxSystem;
    modules = [
      "${nixpkgs}/nixos/modules/profiles/nix-builder-vm.nix"
      {
        virtualisation.host.pkgs = pkgs;
        virtualisation.darwin-builder.diskSize = 5120;
        virtualisation.darwin-builder.memorySize = 1024;
        virtualisation.darwin-builder.hostPort = 33022;
        virtualisation.darwin-builder.workingDirectory = "/var/lib/darwin-builder";
      }
    ];
  };
}
```

Você pode fazer quaisquer outras alterações em sua VM neste conjunto de atributos. Por exemplo, você pode habilitar o Docker ou o encaminhamento X11 para seu host Darwin.

## Solução de problemas da configuração gerada {#sec-darwin-builder-troubleshoot}

O pacote `linux-builder` expõe os atributos `nixosConfig` e `nixosOptions` que permitem inspecionar a configuração NixOS gerada no `nix repl`. Por exemplo:

```
$ nix repl --file ~/src/nixpkgs --argstr system aarch64-darwin

nix-repl> darwin.linux-builder.nixosConfig.nix.package
«derivation /nix/store/...-nix-2.17.0.drv»

nix-repl> :p darwin.linux-builder.nixosOptions.virtualisation.memorySize.definitionsWithLocations
[ { file = "/home/user/src/nixpkgs/nixos/modules/profiles/nix-builder-vm.nix"; value = 3072; } ]

```