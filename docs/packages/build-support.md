# Suporte de Construção {#sec-build-support}

## `pkgs.substitute` {#pkgs-substitute}

`pkgs.substitute` é um *wrapper* para [a função Bash `substitute`](#fun-substitute) no ambiente padrão. Ele substitui strings em `src` conforme especificado pelo argumento `substitutions`.

:::{.example #ex-pkgs-substitute}
# Uso de `pkgs.substitute`

Em um script de construção, a linha:

```bash
substitute $infile $outfile --replace-fail @foo@ ${foopkg}/bin/foo
```

é equivalente a:

```nix
{ substitute, foopkg }:
substitute {
  src = ./sourcefile.txt;
  substitutions = [
    "--replace"
    "@foo@"
    "${foopkg}/bin/foo"
  ];
}
```
:::

## `pkgs.replaceVars` {#pkgs-replacevars}

`pkgs.replaceVars <src> <replacements>` substitui todas as instâncias de `@varName@` (incluindo os `@`) no arquivo `src` pelo valor respectivo no conjunto de atributos `replacements`.

:::{.example #ex-pkgs-replace-vars}
# Uso de `pkgs.replaceVars`

Se `say-goodbye.sh` contiver o seguinte:

```bash
#! @bash@/bin/bash

echo @unchanged@
@hello@/bin/hello --greeting @greeting@
```

a seguinte derivation fará substituições para `@bash@`, `@hello@`, e `@greeting@`:

```nix
{
  replaceVars,
  bash,
  hello,
}:
replaceVars ./say-goodbye.sh {
  inherit bash hello;
  greeting = "goodbye";
  unchanged = null;
}
```

de modo que `$out` resultará em algo como o seguinte:

```
#! /nix/store/s30jrpgav677fpc9yvkqsib70xfmx7xi-bash-5.2p26/bin/bash

echo @unchanged@
/nix/store/566f5isbvw014h7knmzmxa5l6hshx43k-hello-2.12.1/bin/hello --greeting goodbye
```

Note que, em contraste com o antigo `substituteAll`, `unchanged = null` deve ser explicitamente definido. Qualquer padrão `@...@` não referenciado no arquivo de origem lançará um erro.
:::

## `pkgs.replaceVarsWith` {#pkgs-replacevarswith}

`pkgs.replaceVarsWith` funciona da mesma forma que [pkgs.replaceVars](#pkgs-replacevars), mas adicionalmente permite mais opções.

:::{.example #ex-pkgs-replace-vars-with}
# Uso de `pkgs.replaceVarsWith`

Com o arquivo de exemplo `say-goodbye.sh`, considere:

```nix
{ replaceVarsWith }:
replaceVarsWith {
  src = ./say-goodbye.sh;

  replacements = {
    inherit bash hello;
    greeting = "goodbye";
    unchanged = null;
  };

  name = "say-goodbye";
  dir = "bin";
  isExecutable = true;
  meta.mainProgram = "say-goodbye";
}
```

Isso tornará o arquivo resultante executável, o colocará em `bin/say-goodbye` e definirá os atributos `meta` respectivamente.
:::