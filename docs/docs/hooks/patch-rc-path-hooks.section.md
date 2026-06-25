# Hooks de `patchRcPath` {#sec-patchRcPathHooks}

Esses hooks fornecem utilitários específicos de shell (com o mesmo nome do hook) para aplicar patches em scripts de shell destinados a serem "sourced" por usuários de software.

O uso típico é aplicar patches em scripts de inicialização ou [rc](https://unix.stackexchange.com/questions/3467/what-does-rc-in-bashrc-stand-for) dentro de `$out/bin` ou `$out/etc`.
Tais scripts, quando "sourced", inserem os locais dos binários de certos comandos no `PATH`, modificam outras variáveis de ambiente ou executam uma série de comandos de inicialização.
Quando enviados pelo upstream, eles às vezes usam comandos que podem não estar disponíveis no ambiente em que estão sendo "sourced".

Os shells compatíveis para cada hook são:

 - `patchRcPathBash`: [Bash](https://www.gnu.org/software/bash/), [ksh](http://www.kornshell.org/), [zsh](https://www.zsh.org/) e outros shells que suportam as expansões de parâmetros tipo Bash.
 - `patchRcPathCsh`: Scripts Csh, como aqueles que visam [tcsh](https://www.tcsh.org/).
 - `patchRcPathFish`: Scripts [Fish](https://fishshell.com/).
 - `patchRcPathPosix`: Shells conformes ao POSIX que suportam as expansões de parâmetros limitadas especificadas pelo padrão POSIX. A implementação atual usa apenas a expansão de parâmetro `${foo-}`.

Para cada shell suportado, ele modifica o script com um prefixo `PATH` que é removido posteriormente quando o script termina.
Ele permite o "patching" aninhado, o que garante que um script com patch possa "sourcear" outro script com patch.

Sintaxe para aplicar o utilitário a um script:

```sh
patchRcPath<shell> <file> <PATH-prefix>
```

Exemplo de uso:

Dado um pacote `foo` contendo um script de inicialização `this-foo.fish` que depende de `coreutils`, `man` e `which`,
aplique o patch no script de inicialização para que os usuários possam "sourceá-lo" sem ter as dependências acima em seu `PATH`:

```nix
{
  lib,
  stdenv,
  patchRcPathFish,
}:
stdenv.mkDerivation {

  # ...

  nativeBuildInputs = [ patchRcPathFish ];

  postFixup = ''
    patchRcPathFish $out/bin/this-foo.fish ${
      lib.makeBinPath [
        coreutils
        man
        which
      ]
    }
  '';
}
```

::: {.note}
A implementação de `patchRcPathCsh` e `patchRcPathPosix` depende de `sed` para fazer o processamento de strings.
Os outros estão em shell vanilla e não possuem dependências de terceiros.
:::