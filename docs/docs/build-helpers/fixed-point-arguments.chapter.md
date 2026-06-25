# Argumentos de ponto fixo de auxiliares de construção {#chap-build-helpers-finalAttrs}

Como mencionado no início desta parte, `stdenv.mkDerivation` poderia alternativamente aceitar uma função de ponto fixo. A entrada desta função, tipicamente nomeada `finalAttrs`, é esperada ser o estado final do conjunto de atributos. Um auxiliar de construção como este é dito aceitar **argumentos de ponto fixo**.

Auxiliares de construção nem sempre suportam argumentos de ponto fixo ainda, pois o suporte em [`stdenv.mkDerivation`](#mkderivation-recursive-attributes) foi incluído pela primeira vez no Nixpkgs 22.05.

## Definindo um auxiliar de construção com `lib.extendMkDerivation` {#sec-build-helper-extendMkDerivation}

Desenvolvedores podem usar a função de biblioteca do Nixpkgs [`lib.customisation.extendMkDerivation`](#function-library-lib.customisation.extendMkDerivation) para definir um auxiliar de construção que suporte argumentos de ponto fixo a partir de um existente com tal suporte, com uma sobreposição de atributos similar àquela aceita por [`<pkg>.overrideAttrs`](#sec-pkg-overrideAttrs).

Além da sobreposição, `lib.extendMkDerivation` também suporta `excludeDrvArgNames` para opcionalmente excluir alguns argumentos nos argumentos de ponto fixo de entrada de serem passados para o auxiliar de construção base (especificado como `constructDrv`).

:::{.example #ex-build-helpers-extendMkDerivation}

# Exemplo de definição de `mkLocalDerivation` estendido de `stdenv.mkDerivation` com `lib.extendMkDerivation`

Queremos definir um auxiliar de construção chamado `mkLocalDerivation` que constrói localmente sem usar substitutos por padrão.

Em vez de aceitar um conjunto de atributos simples,

```nix
{
  preferLocalBuild ? true,
  allowSubstitute ? false,
  specialArg ? (_: false),
  ...
}@args:

stdenv.mkDerivation (
  removeAttrs [
    # Don't pass specialArg into mkDerivation.
    "specialArg"
  ] args
  // {
    # Arguments to pass
    inherit preferLocalBuild allowSubstitute;
    # Some expressions involving specialArg
    greeting = if specialArg "hi" then "hi" else "hello";
  }
)
```

poderíamos definir com `lib.extendMkDerivation` uma sobreposição de atributos para fazer com que o auxiliar de construção resultante também aceite o ponto fixo do conjunto de atributos passando para o `stdenv.mkDerivation` subjacente, nomeado `finalAttrs` aqui:

```nix
lib.extendMkDerivation {
  constructDrv = stdenv.mkDerivation;
  excludeDrvArgNames = [
    # Don't pass specialArg into mkDerivation.
    "specialArg"
  ];
  extendDrvArgs =
    finalAttrs:
    {
      preferLocalBuild ? true,
      allowSubstitute ? false,
      specialArg ? (_: false),
      ...
    }@args:
    {
      # Arguments to pass
      inherit preferLocalBuild allowSubstitute;
      # Some expressions involving specialArg
      greeting = if specialArg "hi" then "hi" else "hello";
    };
}
```
:::

Se for necessário aplicar mudanças extras à derivation resultante, passe a função de transformação da derivation para `lib.extendMkDerivation` como `lib.customisation.extendMkDerivation { transformDrv = drv: ...; }`.