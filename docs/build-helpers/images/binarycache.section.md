# pkgs.mkBinaryCache {#sec-pkgs-binary-cache}

`pkgs.mkBinaryCache` é uma função para criar caches binários de arquivo plano do Nix.
Tal cache existe como um diretório no disco e pode ser usado como um substituidor Nix passando `--substituter file:///path/to/cache` para os comandos Nix.

Pacotes Nix são mais comumente compartilhados entre máquinas usando [HTTP, SSH ou S3](https://nixos.org/manual/nix/stable/package-management/sharing-packages.html), mas um cache binário de arquivo plano ainda pode ser útil em algumas situações.
Por exemplo, você pode copiá-lo diretamente para outra máquina ou torná-lo disponível em um sistema de arquivos de rede.
Também pode ser uma maneira conveniente de disponibilizar alguns pacotes Nix dentro de um contêiner via bind-mounting.

`mkBinaryCache` espera um argumento com o atributo `rootPaths`.
`rootPaths` deve ser uma lista de derivations.
O fecho transitivo das saídas dessas derivations será copiado para o cache.

## Argumentos opcionais {#sec-pkgs-binary-cache-arguments}

`compression` (`"none"` ou `"xz"` ou `"zstd"`; _opcional_)

: O algoritmo de compressão a ser usado.

  _Valor padrão:_ `zstd`.

::: {.note}
Esta função é destinada a casos de uso avançados.
A maneira mais idiomática de trabalhar com caches binários de arquivo plano é através do comando [nix-copy-closure](https://nixos.org/manual/nix/stable/command-ref/nix-copy-closure.html).
Você também pode querer considerar [dockerTools](#sec-pkgs-dockerTools) para suas necessidades de conteinerização.
:::

[]{#sec-pkgs-binary-cache-example}
:::{.example #ex-mkbinarycache-copying-package-closure}

# Copiando um pacote e seu fecho para outra máquina com `mkBinaryCache`

A seguinte derivation construirá um cache binário de arquivo plano contendo o fecho de `hello`.

```nix
{ mkBinaryCache, hello }: mkBinaryCache { rootPaths = [ hello ]; }
```

Construa o cache em uma máquina.
Observe que o comando ainda constrói o pacote nix exato acima, mas adiciona algum código clichê para construí-lo diretamente a partir de uma expressão.

```shellSession
$ nix-build -E 'let pkgs = import <nixpkgs> {}; in pkgs.callPackage ({ mkBinaryCache, hello }: mkBinaryCache { rootPaths = [hello]; }) {}'
/nix/store/azf7xay5xxdnia4h9fyjiv59wsjdxl0g-binary-cache
```

Copie o diretório resultante para outra máquina, que chamaremos de `host2`:

```shellSession
$ scp result host2:/tmp/hello-cache
```

Neste ponto, o cache pode ser usado como um substituidor ao construir derivations em `host2`:

```shellSession
$ nix-build -A hello '<nixpkgs>' \
  --option require-sigs false \
  --option trusted-substituters file:///tmp/hello-cache \
  --option substituters file:///tmp/hello-cache
/nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1
```

:::
