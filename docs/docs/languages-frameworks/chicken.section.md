# CHICKEN {#sec-chicken}

[CHICKEN](https://call-cc.org/) é um compilador Scheme compatível com [R⁵RS](https://schemers.org/Documents/Standards/R5RS/HTML/). Ele inclui um modo interativo e um formato de pacote personalizado, "eggs".

## Usando Eggs {#sec-chicken-using}

Os eggs descritos no Nixpkgs estão disponíveis dentro do attrset `chickenPackages.chickenEggs`. A inclusão de um egg como build input é feita da maneira típica do Nix. Por exemplo, para incluir suporte para [SRFI 189](https://srfi.schemers.org/srfi-189/srfi-189.html) em uma derivation, pode-se escrever:

```nix
{
  buildInputs = [
    chicken
    chickenPackages.chickenEggs.srfi-189
  ];
}
```

Tanto `chicken` quanto seus eggs possuem um setup hook que configura as variáveis de ambiente `CHICKEN_INCLUDE_PATH` e `CHICKEN_REPOSITORY_PATH`.

## Atualizando Eggs {#sec-chicken-updating-eggs}

Nixpkgs conhece apenas um subconjunto de todos os eggs publicados. Ele usa [egg2nix](https://github.com/the-kenny/egg2nix) para gerar um package set a partir de uma lista de eggs a serem incluídos.

O package set é regenerado executando os seguintes comandos shell:

```
$ nix-shell -p chickenPackages.egg2nix
$ cd pkgs/development/compilers/chicken/5/
$ egg2nix eggs.scm > eggs.nix
```

## Adicionando Eggs {#sec-chicken-adding-eggs}

Quando executamos `egg2nix`, obtemos uma coleção de eggs com versões mutuamente compatíveis. Isso significa que, ao adicionar novos eggs, podemos precisar atualizar os eggs existentes. Para mantê-los separados, siga o procedimento para atualizar eggs antes de incluir mais eggs.

Para incluir mais eggs, edite `pkgs/development/compilers/chicken/5/eggs.scm`. A primeira seção deste arquivo lista os eggs que são exigidos pelo próprio `egg2nix`; todos os outros eggs vão para a segunda seção. Após a edição, siga o procedimento para atualizar eggs.

## Override Scope {#sec-chicken-override-scope}

O pacote chicken e seus eggs, respectivamente, residem em um scope. Isso significa que o scope pode ser sobrescrito (overridden) para afetar outros pacotes nele.

Este exemplo mostra como usar uma cópia local de `srfi-180` e fazer com que ela afete todos os outros eggs:

```nix
let
  myChickenPackages = pkgs.chickenPackages.overrideScope (
    self: super: {
      # The chicken package itself can be overridden to affect the whole ecosystem.
      # chicken = super.chicken.overrideAttrs {
      #   src = ...
      # };

      chickenEggs = super.chickenEggs.overrideScope (
        eggself: eggsuper: {
          srfi-180 = eggsuper.srfi-180.overrideAttrs {
            # path to a local copy of srfi-180
            src = <...>;
          };
        }
      );
    }
  );
  # Here, `myChickenPackages.chickenEggs.json-rpc`, which depends on `srfi-180` will use
  # the local copy of `srfi-180`.
in
<...>
```