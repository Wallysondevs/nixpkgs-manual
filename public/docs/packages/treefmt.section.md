# treefmt {#treefmt}

[treefmt](https://github.com/numtide/treefmt) simplifica o processo de aplicação de formatadores ao seu projeto, tornando-o fácil com apenas uma linha de comando.

O [`treefmt` package](https://search.nixos.org/packages?channel=unstable&show=treefmt) fornece funções para configurar o treefmt usando o sistema de módulos, que estão [documentadas abaixo](#sec-functions-library-treefmt), juntamente com [suas opções](#sec-treefmt-options-reference).

Alternativamente, o treefmt pode ser configurado usando [treefmt-nix](https://github.com/numtide/treefmt-nix).

```{=include=} sections auto-id-prefix=auto-generated-treefmt-functions
treefmt-functions.section.md
```

## Referência de Opções {#sec-treefmt-options-reference}

Os seguintes atributos podem ser passados para [`withConfig`](#pkgs.treefmt.withConfig) ou [`evalConfig`](#pkgs.treefmt.evalConfig):

```{=include=} options
id-prefix: opt-treefmt-
list-id: configuration-variable-list
source: ../treefmt-options.json
```