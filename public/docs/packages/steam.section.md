# Steam {#sec-steam}

## Steam no Nix {#sec-steam-nix}

O Steam é distribuído como um arquivo `.deb`, por enquanto apenas como um pacote i686 (o pacote amd64 possui apenas documentação). Quando descompactado, ele possui um script chamado `steam` que no Ubuntu (sua distro alvo) iria para `/usr/bin`. Quando executado pela primeira vez, este script copia alguns arquivos para o diretório home do usuário, que incluem outro script que é, em última instância, responsável por iniciar o binário do steam, que também está em `$HOME`.

Problemas e restrições do Nix:

- Não temos `/bin/bash` e muitos scripts apontam para lá. O mesmo vale para `/usr/bin/python`.
- Não temos o carregador dinâmico em `/lib`.
- O script `steam.sh` em `$HOME` não pode ser corrigido (patched), pois é verificado e reescrito pelo steam.
- O binário do steam não pode ser corrigido (patched), ele também é verificado.

A abordagem atual para implantar o Steam no NixOS é compor um ambiente chroot compatível com FHS, conforme documentado [aqui](https://sandervanderburg.blogspot.com/2013/09/composing-fhs-compatible-chroot.html). Isso nos permite ter binários nos caminhos esperados sem interromper o sistema e evitar corrigi-los (patching) para funcionar em um ambiente não-FHS.

## Como jogar {#sec-steam-play}

Use `programs.steam.enable = true;` se você quiser adicionar o steam a `systemPackages` e também habilitar algumas soluções alternativas (workarounds), bem como suporte a controles Steam ou outros controles suportados pelo Steam, como o DualShock 4 ou o Nintendo Switch Pro Controller.

## Solução de problemas {#sec-steam-troub}

- **O Steam falha ao iniciar. O que devo fazer?**

  Tente executar

  ```ShellSession
  strace steam
  ```

  para ver o que está fazendo o steam falhar.

- **Usando os drivers FOSS Radeon ou nouveau (nvidia)**

  - O Steam é distribuído estaticamente linkado com uma versão de `libcrypto` que entra em conflito com a carregada dinamicamente por `radeonsi_dri.so`. Se você receber o erro:

    ```
    steam.sh: line 713: 7842 Segmentation fault (core dumped)
    ```

    dê uma olhada [neste pull request](https://github.com/NixOS/nixpkgs/pull/20269).

## steam-run {#sec-steam-run}

O chroot compatível com FHS usado para o Steam também pode ser usado para executar outros jogos Linux que esperam um ambiente FHS. Para usá-lo, instale o pacote `steam-run` e execute o jogo com:

```
steam-run ./foo
```