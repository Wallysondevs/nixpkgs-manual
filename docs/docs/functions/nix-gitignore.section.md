# pkgs.nix-gitignore {#sec-pkgs-nix-gitignore}

`pkgs.nix-gitignore` é uma função que age de forma semelhante a `builtins.filterSource` mas também permite a filtragem com a ajuda do formato gitignore.

## Uso {#sec-pkgs-nix-gitignore-usage}

`pkgs.nix-gitignore` exporta várias funções, mas você provavelmente precisará de `gitignoreSource` ou `gitignoreSourcePure`. Como primeiro argumento, ambos aceitam 1. um arquivo com linhas gitignore ou 2. uma string com linhas gitignore, ou 3. uma lista de qualquer um dos dois. Eles serão concatenados em uma única string grande.

```nix
{
  pkgs ? import <nixpkgs> { },
}:
{

  src = nix-gitignore.gitignoreSource [ ] ./source;
  # Versão mais simples

  src = nix-gitignore.gitignoreSource ''
    supplemental-ignores
  '' ./source;
  # Este lê o ./source/.gitignore e concatena os ignores auxiliares

  src = nix-gitignore.gitignoreSourcePure ''
    ignore-this
    ignore-that
  '' ./source;
  # Use esta string como gitignore, não leia ./source/.gitignore.

  src = nix-gitignore.gitignoreSourcePure [
    ''
      ignore-this
      ignore-that
    ''
    ~/.gitignore
  ] ./source;
  # Também aceita uma lista (de strings e paths) que será concatenada
  # assim que os paths forem transformados em strings via readFile.
}
```

Estas funções são derivadas das funções `Filter` ao definir o primeiro argumento de filtro para `(_: _: true)`:

```nix
{
  gitignoreSourcePure = gitignoreFilterSourcePure (_: _: true);
  gitignoreSource = gitignoreFilterSource (_: _: true);
}
```

Essas funções de filtro aceitam os mesmos argumentos que a função `builtins.filterSource` passaria para seus filtros, portanto `fn: gitignoreFilterSourcePure fn ""` deve ser extensionamente equivalente a `filterSource`. O arquivo é colocado na lista negra se for colocado na lista negra pelo seu filtro ou pelo `gitignoreFilter`.

Se você quiser criar seu próprio filtro do zero, você pode usar

```nix
{ gitignoreFilter = ign: root: filterPattern (gitignoreToPatterns ign) root; }
```

## arquivos gitignore em subdiretórios {#sec-pkgs-nix-gitignore-usage-recursive}

Se você deseja usar um filtro que procuraria por arquivos `.gitignore` em subdiretórios, assim como o git faz por padrão, use esta função:

```nix
{
  # gitignoreFilterRecursiveSource = filter: patterns: root:
  # OU
  gitignoreRecursiveSource = gitignoreFilterSourcePure (_: _: true);
}
```