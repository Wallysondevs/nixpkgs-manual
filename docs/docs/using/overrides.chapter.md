# Sobrescrita {#chap-overrides}

Às vezes, deseja-se sobrescrever partes do `nixpkgs`, por exemplo, atributos de *derivation*, os resultados de *derivations*.

Essas funções são usadas para fazer alterações em pacotes, retornando apenas pacotes únicos. [Overlays](#chap-overlays), por outro lado, podem ser usados para combinar os pacotes sobrescritos em todo o conjunto de pacotes do Nixpkgs.

## &lt;pkg&gt;.override {#sec-pkg-override}

A função `override` geralmente está disponível para todas as *derivations* na expressão `nixpkgs` (`pkgs`).

Ela é usada para sobrescrever os argumentos passados para uma função.

Exemplos de uso:

```nix
pkgs.foo.override {
  arg1 = val1;
  arg2 = val2; # ...
}
```

Também é possível acessar os argumentos anteriores.

```nix
pkgs.foo.override (previous: {
  arg1 = previous.arg1; # ...
})
```

<!-- TODO: move below programlisting to a new section about extending and overlays and reference it -->

```nix
import pkgs.path {
  overlays = [ (self: super: { foo = super.foo.override { barSupport = true; }; }) ];
}
```

```nix
{
  mypkg = pkgs.callPackage ./mypkg.nix {
    mydep = pkgs.mydep.override {
      # ...
    };
  };
}
```

No primeiro exemplo, `pkgs.foo` é o resultado de uma chamada de função com alguns argumentos padrão, geralmente uma *derivation*. Usar `pkgs.foo.override` chamará a mesma função com os novos argumentos fornecidos.

Muitos pacotes, como o exemplo `foo` acima, fornecem opções de pacote com valores padrão em seus argumentos, para facilitar a sobrescrita.
Como geralmente não é viável testar se os pacotes são construídos com todas as combinações de opções, você pode descobrir que um pacote não é construído se você sobrescrever opções para valores não padrão.

Não se espera que os mantenedores de pacotes corrijam combinações arbitrárias de opções.
Se você encontrar algo que não funciona, por favor, envie uma correção, idealmente com um teste de regressão.
Se você quiser garantir que as coisas continuem funcionando, considere [tornar-se um mantenedor](https://github.com/NixOS/nixpkgs/tree/master/maintainers) para o pacote.

## &lt;pkg&gt;.overrideAttrs {#sec-pkg-overrideAttrs}

A função `overrideAttrs` permite sobrescrever o conjunto de atributos passado para uma chamada `stdenv.mkDerivation`, produzindo uma nova *derivation* baseada na original. Esta função está disponível em todas as *derivations* produzidas pela função `stdenv.mkDerivation`, que são a maioria dos pacotes na expressão Nixpkgs `pkgs`.

Exemplos de uso:

```nix
{
  helloBar = pkgs.hello.overrideAttrs (
    finalAttrs: previousAttrs: { pname = previousAttrs.pname + "-bar"; }
  );
}
```

No exemplo acima, "-bar" é anexado ao atributo `pname`, enquanto todos os outros atributos serão mantidos do pacote `hello` original.

O argumento `previousAttrs` é convencionalmente usado para se referir ao conjunto de atributos originalmente passado para `stdenv.mkDerivation`.

O argumento `finalAttrs` refere-se aos atributos finais passados para `mkDerivation`, mais o atributo `finalPackage` que é igual ao resultado de `mkDerivation` ou chamadas `overrideAttrs` subsequentes.

Se apenas uma função de um argumento for escrita, o argumento tem o significado de `previousAttrs`.

Os argumentos da função podem ser omitidos inteiramente se não houver necessidade de acessar `previousAttrs` ou `finalAttrs`.

```nix
{ helloWithDebug = pkgs.hello.overrideAttrs { separateDebugInfo = true; }; }
```

No exemplo acima, o atributo `separateDebugInfo` é sobrescrito para ser `true`, construindo assim informações de depuração para `helloWithDebug`.

::: {.note}
Note que `separateDebugInfo` é processado apenas pela função `stdenv.mkDerivation`, e não pela *derivation* Nix bruta gerada. Assim, usar `overrideDerivation` não funcionará neste caso, pois ele sobrescreve apenas os atributos da *derivation* final. É por esta razão que `overrideAttrs` deve ser preferido em (quase) todos os casos em relação a `overrideDerivation`, ou seja, para permitir o uso de `stdenv.mkDerivation` para processar argumentos de entrada, bem como o fato de ser mais fácil de usar (você pode usar os mesmos nomes de atributos que vê em seu código Nix, em vez dos gerados (por exemplo, `buildInputs` vs `nativeBuildInputs`), e envolve menos digitação).
:::

## &lt;pkg&gt;.overrideDerivation {#sec-pkg-overrideDerivation}

::: {.warning}
Você deve preferir `overrideAttrs` em quase todos os casos, veja sua documentação para as razões. `overrideDerivation` não está depreciado e continuará a funcionar, mas é menos agradável de usar e não possui tantas capacidades quanto `overrideAttrs`.
:::

::: {.warning}
Não use esta função no Nixpkgs, pois ela avalia uma *derivation* antes de modificá-la, o que quebra a abstração do pacote. Além disso, esta avaliação por aplicação de função incorre em uma penalidade de desempenho, o que pode se tornar um problema se muitos *overrides* forem usados. Ela é destinada apenas para personalização *ad-hoc*, como em `~/.config/nixpkgs/config.nix`.
:::

A função `overrideDerivation` cria uma nova *derivation* baseada em uma existente, sobrescrevendo os atributos da original com o conjunto de atributos produzido pela função especificada. Esta função está disponível em todas as *derivations* definidas usando a função `makeOverridable`. A maioria das funções padrão que produzem *derivations*, como `stdenv.mkDerivation`, são definidas usando esta função, o que significa que a maioria dos pacotes na expressão Nixpkgs, `pkgs`, possui esta função.

Exemplo de uso:

```nix
{
  mySed = pkgs.gnused.overrideDerivation (oldAttrs: {
    name = "sed-4.2.2-pre";
    src = fetchurl {
      url = "ftp://alpha.gnu.org/gnu/sed/sed-4.2.2-pre.tar.bz2";
      hash = "sha256-MxBJRcM2rYzQYwJ5XKxhXTQByvSg5jZc5cSHEZoB2IY=";
    };
    patches = [ ];
  });
}
```

No exemplo acima, o `name`, `src` e `patches` da *derivation* serão sobrescritos, enquanto todos os outros atributos serão mantidos da *derivation* original.

O argumento `oldAttrs` é usado para se referir ao conjunto de atributos da *derivation* original.

::: {.note}
Os atributos de um pacote são avaliados *antes* de serem modificados pela função `overrideDerivation`. Por exemplo, a referência do atributo `name` em `url = "mirror://gnu/hello/${name}.tar.gz";` é preenchida *antes* que a função `overrideDerivation` modifique o conjunto de atributos. Isso significa que sobrescrever o atributo `name`, neste exemplo, *não* alterará o valor do atributo `url`. Em vez disso, precisamos sobrescrever ambos os atributos `name` *e* `url`.
:::

## lib.makeOverridable {#sec-lib-makeOverridable}

A função `lib.makeOverridable` é usada para tornar o resultado de uma função facilmente personalizável. Este utilitário só faz sentido para funções que aceitam um conjunto de argumentos e retornam um conjunto de atributos.

Exemplo de uso:

```nix
{
  f =
    { a, b }:
    {
      result = a + b;
    };
  c = lib.makeOverridable f {
    a = 1;
    b = 2;
  };
}
```

A variável `c` é o valor da função `f` aplicada com alguns argumentos padrão. Assim, o valor de `c.result` é `3`, neste exemplo.

A variável `c`, no entanto, também possui algumas funções adicionais, como
[c.override](#sec-pkg-override) que pode ser usada para sobrescrever os
argumentos padrão. Neste exemplo, o valor de
`(c.override { a = 4; }).result` é 6.