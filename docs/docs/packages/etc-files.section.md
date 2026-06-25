# Arquivos /etc {#etc}

Certas chamadas em glibc exigem acesso a arquivos de tempo de execução encontrados em `/etc`, como `/etc/protocols` ou `/etc/services` -- [getprotobyname](https://linux.die.net/man/3/getprotobyname) é uma dessas funções.

Em distribuições que não são NixOS, esses arquivos são tipicamente fornecidos por pacotes (ou seja, [netbase](https://packages.debian.org/sid/netbase)) se já não estiverem pré-instalados em sua distribuição. Isso pode causar não-reprodutibilidade para o código se ele depender da presença desses arquivos.

Se [iana-etc](https://hydra.nixos.org/job/nixos/trunk-combined/nixpkgs.iana-etc.x86_64-linux) fizer parte dos seus `buildInputs`, ele definirá as variáveis de ambiente `NIX_ETC_PROTOCOLS` e `NIX_ETC_SERVICES` para os arquivos correspondentes no pacote através de um setup hook.

```bash
> nix-shell -p iana-etc

[nix-shell:~]$ env | grep NIX_ETC
NIX_ETC_SERVICES=/nix/store/aj866hr8fad8flnggwdhrldm0g799ccz-iana-etc-20210225/etc/services
NIX_ETC_PROTOCOLS=/nix/store/aj866hr8fad8flnggwdhrldm0g799ccz-iana-etc-20210225/etc/protocols
```

A versão do Nixpkgs de [glibc](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/libraries/glibc/default.nix) foi corrigida para verificar a existência dessas variáveis de ambiente. Se as variáveis de ambiente *não* estiverem definidas, ela tentará encontrar os arquivos no local padrão dentro de `/etc`.