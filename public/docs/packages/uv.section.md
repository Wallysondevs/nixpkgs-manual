# uv {#sec-uv}

`uv` é um instalador e resolvedor de pacotes Python extremamente rápido, escrito em Rust. Ele gerencia dependências e ambientes de projeto, com suporte para lockfiles, workspaces e muito mais.

Devido ao `uv` não ter conhecimento de que está sendo executado em um sistema NixOS, por padrão, ele buscará executáveis Python dinamicamente ligados que falharão ao serem executados, já que o NixOS não consegue executar executáveis destinados a ambientes Linux genéricos de forma nativa. Para saber mais sobre isso, visite
https://nix.dev/guides/faq.html#how-to-run-non-nix-executables

Existem duas maneiras de mitigar isso:

1.  Forneça ao `uv` um executável Python estaticamente ligado (idealmente de `nixpkgs`) através da [`UV_PYTHON` environment variable](https://docs.astral.sh/uv/reference/environment/#uv_python). Alternativamente, a flag `--python` também pode ser usada, mas é fácil de esquecer. Também é útil proibir o `uv` de baixar quaisquer binários Python através da [`UV_PYTHON_DOWNLOADS` environment variable](https://docs.astral.sh/uv/reference/environment/#uv_python_downloads) definindo-a como `never`.
    Essas variáveis podem ser definidas em `shell.nix` e arquivos `.env`, que podem ser redistribuídos com o projeto para garantir que outras máquinas NixOS possam executar o projeto.

2.  Adicione `programs.nix-ld.enable = true` à sua configuração do NixOS. Embora funcional, a opção anterior é preferível, pois esta é a opção "funciona na minha máquina", porque redistribuir projetos Python que usam `uv` para outra máquina NixOS que não tenha `nix-ld` habilitado causará os mesmos erros.

Além disso, há a questão de módulos do PyPI que empacotam bibliotecas dinamicamente ligadas, como `numpy`, que também falharão ao funcionar.
Este tópico não é exclusivo do `uv`, mas merece documentação, no entanto.
Definir `LD_LIBRARY_PATH` deve ser a solução de escolha aqui. Ou:

1.  Use `lib.makeLibraryPath` para definir `LD_LIBRARY_PATH` a partir de um `shell.nix`, por exemplo, `LD_LIBRARY_PATH = lib.makeLibraryPath [ pkgs.openssl pkgs.zlib pkgs.curl ]`
2.  (Se você já habilitou `nix-ld`) defina `LD_LIBRARY_PATH` para `NIX_LD_LIBRARY_PATH`. Esteja ciente de que esta não é uma solução milagrosa, pois ela simplesmente fornece uma lista de bibliotecas comumente usadas, como é mostrado em `nixos/modules/programs/nix-ld.nix`.