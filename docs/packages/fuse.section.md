# FUSE {#sec-fuse}

Alguns pacotes dependem de
[FUSE](https://www.kernel.org/doc/html/latest/filesystems/fuse.html) para fornecer
suporte a sistemas de arquivos adicionais não suportados pelo kernel.

Em geral, o software FUSE é desenvolvido principalmente para Linux, mas muitos deles podem
também ser executados no macOS. Nixpkgs suporta pacotes FUSE no macOS, mas requer
que o [macFUSE](https://osxfuse.github.io) seja instalado fora do Nix. Atualmente, o macFUSE
não está empacotado no Nixpkgs, principalmente porque inclui uma extensão de kernel,
que não é suportada pelo Nix fora do NixOS.

Se um pacote falhar ao ser executado no macOS com uma mensagem de erro semelhante à
seguinte, é um sinal provável de que você precisa ter o macFUSE instalado.

    dyld: Library not loaded: /usr/local/lib/libfuse.2.dylib
    Referenced from: /nix/store/w8bi72bssv0bnxhwfw3xr1mvn7myf37x-sshfs-fuse-2.10/bin/sshfs
    Reason: image not found
    [1]    92299 abort      /nix/store/w8bi72bssv0bnxhwfw3xr1mvn7myf37x-sshfs-fuse-2.10/bin/sshfs

Mantenedores de pacotes podem frequentemente encontrar o seguinte erro ao construir pacotes FUSE
no macOS:

    checking for fuse.h... no
    configure: error: No fuse.h found.

Isso acontece em projetos baseados em autoconf que usam `AC_CHECK_HEADERS` ou
`AC_CHECK_LIBS` para detectar libfuse, e ocorrerá mesmo quando o pacote `fuse`
estiver incluído em `buildInputs`. Isso acontece porque os cabeçalhos do libfuse geram um erro
no macOS se a macro `FUSE_USE_VERSION` não estiver definida. Muitos projetos definem
`FUSE_USE_VERSION`, mas apenas dentro de arquivos-fonte C. Isso resulta no erro
acima no momento da configuração porque o script de configuração tentaria compilar
programas FUSE de exemplo sem definir `FUSE_USE_VERSION`.

Existem duas soluções possíveis para este problema no Nixpkgs:

1.  Passe `FUSE_USE_VERSION` para o script de configuração adicionando
    `CFLAGS=-DFUSE_USE_VERSION=25` em `configureFlags`. O valor real teria que
    corresponder à definição usada no código-fonte upstream.
2.  Remova `AC_CHECK_HEADERS` / `AC_CHECK_LIBS` para libfuse.

No entanto, uma solução melhor pode ser corrigir o script de construção upstream para usar
`PKG_CHECK_MODULES` em vez disso. Essa abordagem não sofreria do problema que
`AC_CHECK_HEADERS`/`AC_CHECK_LIBS` tem, ao custo de introduzir uma dependência
em pkg-config.