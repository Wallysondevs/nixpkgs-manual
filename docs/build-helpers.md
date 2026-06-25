# Auxiliares de construção {#part-builders}

Um auxiliar de construção é uma função que produz derivations.

:::{.warning}
Isso não deve ser confundido com o argumento [`builder` da primitiva `derivation` do Nix](https://nixos.org/manual/nix/unstable/language/derivations.html), que se refere ao executável que produz o resultado da construção, ou com [remote builder](https://nixos.org/manual/nix/stable/advanced-topics/distributed-builds.html), que se refere a uma máquina remota que poderia executar tal executável.
:::

Tal função é geralmente projetada para abstrair um fluxo de trabalho típico para uma determinada linguagem de programação ou framework.
Isso permite declarar uma receita de construção definindo um número limitado de opções relevantes para o caso de uso particular, em vez de usar a função `derivation` diretamente.

[`stdenv.mkDerivation`](#part-stdenv) é o auxiliar de construção mais amplamente utilizado e serve como base para muitos outros.
Além disso, ele oferece várias opções para personalizar partes das construções.

Não há uma interface uniforme para auxiliares de construção.
[Auxiliares de construção triviais](#chap-trivial-builders) e [fetchers](#chap-pkgs-fetchers) possuem vários tipos de entrada para conveniência.
[Auxiliares de construção específicos de linguagem ou framework](#chap-language-support) geralmente seguem o estilo de `stdenv.mkDerivation`, que aceita um conjunto de atributos ou uma função de ponto fixo que recebe um conjunto de atributos.

```{=include=} chapters
build-helpers/fixed-point-arguments.chapter.md
build-helpers/fetchers.chapter.md
build-helpers/trivial-build-helpers.chapter.md
build-helpers/testers.chapter.md
build-helpers/dev-shell-tools.chapter.md
build-helpers/special.md
build-helpers/images.md
hooks/index.md
languages-frameworks/index.md
packages/index.md
```