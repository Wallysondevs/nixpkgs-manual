# Auxiliares de Shell de Desenvolvimento {#chap-devShellTools}

O comando `nix-shell` popularizou o conceito de ambientes de shell transitórios para fins de desenvolvimento ou teste. No entanto, `nix-shell` não é a única maneira de criar tais ambientes, e até mesmo o próprio `nix-shell` pode se beneficiar indiretamente desta biblioteca.

Esta biblioteca fornece um conjunto de funções que ajudam a criar tais ambientes.

## `devShellTools.valueToString` {#sec-devShellTools-valueToString}

Converte valores Nix para strings da mesma forma que a [`derivation` built-in function](https://nix.dev/manual/nix/2.23/language/derivations) faz.

:::{.example}
## Exemplos de uso de `valueToString`

```nix
devShellTools.valueToString (builtins.toFile "foo" "bar")
# => "/nix/store/...-foo"
```

```nix
devShellTools.valueToString false
# => ""
```

:::

## `devShellTools.unstructuredDerivationInputEnv` {#sec-devShellTools-unstructuredDerivationInputEnv}

Converte um conjunto de atributos de derivation (como seriam passados para [`derivation`]) para um conjunto de variáveis de ambiente que podem ser usadas em um script de shell. Esta função não suporta `__structuredAttrs`, mas suporta `passAsFile`.

:::{.example}
## Exemplo de uso de `unstructuredDerivationInputEnv`

```nix
devShellTools.unstructuredDerivationInputEnv {
  drvAttrs = {
    name = "foo";
    buildInputs = [
      hello
      figlet
    ];
    builder = bash;
    args = [
      "-c"
      "${./builder.sh}"
    ];
  };
}
# => {
#  name = "foo";
#  buildInputs = "/nix/store/...-hello /nix/store/...-figlet";
#  builder = "/nix/store/...-bash";
#}
```

Note que `args` não é incluído, porque o Nix não o adiciona ao ambiente do processo do builder.

:::

## `devShellTools.derivationOutputEnv` {#sec-devShellTools-derivationOutputEnv}

Pega as partes relevantes de uma derivation e retorna um conjunto de variáveis de ambiente, que estariam presentes na derivation.

:::{.example}
## Exemplo de uso de `derivationOutputEnv`

```nix
let
  pkg = hello;
in
devShellTools.derivationOutputEnv {
  outputList = pkg.outputs;
  outputMap = pkg;
}
```

:::