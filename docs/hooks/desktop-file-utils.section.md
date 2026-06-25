# desktop-file-utils {#desktop-file-utils}

Este setup hook remove o cache MIME (localizado em `$out/share/applications/mimeinfo.cache`) na `preFixupPhase`.

Este hook é necessário porque `mimeinfo.cache` pode ser criado quando um pacote usa `desktop-file-utils`, resultando em colisões se múltiplos pacotes que contêm este arquivo forem instalados (como em [#48295](https://github.com/NixOS/nixpkgs/issues/48295)).