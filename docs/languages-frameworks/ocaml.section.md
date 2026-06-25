# OCaml {#sec-language-ocaml}

## Guia do usuário {#sec-language-ocaml-user-guide}

As bibliotecas OCaml estão disponíveis em conjuntos de atributos no formato `ocaml-ng.ocamlPackages_X_XX` onde X deve ser substituído pela versão do compilador desejada. Por exemplo, ocamlgraph compilado com OCaml 4.12 pode ser encontrado em `ocaml-ng.ocamlPackages_4_12.ocamlgraph`. O próprio compilador também está localizado neste conjunto, sob o nome `ocaml`.

Se você não se importa com a versão exata do compilador, `ocamlPackages` é um alias de nível superior que aponta para uma versão recente do OCaml.

As aplicações OCaml geralmente estão disponíveis no nível superior, e não dentro de `ocamlPackages`. Exceções notáveis são ferramentas de construção que devem ser construídas com a mesma versão do compilador que você pretende usar, como `dune` ou `ocaml-lsp`.

Para abrir um shell capaz de construir um projeto OCaml típico, coloque as dependências em `buildInputs` e adicione `ocamlPackages.ocaml` e `ocamlPackages.findlib` a `nativeBuildInputs` no mínimo.
Por exemplo:
```nix
let
  pkgs = import <nixpkgs> { };
  # choose the ocaml version you want to use
  ocamlPackages = pkgs.ocaml-ng.ocamlPackages_4_12;
in
pkgs.mkShell {
  # build tools
  nativeBuildInputs = with ocamlPackages; [
    ocaml
    findlib
    pkgs.dune
    ocaml-lsp
  ];
  # dependencies
  buildInputs = with ocamlPackages; [ ocamlgraph ];
}
```

## Guia de empacotamento {#sec-language-ocaml-packaging}

As bibliotecas OCaml devem ser instaladas em `$(out)/lib/ocaml/${ocaml.version}/site-lib/`. Tais diretórios são automaticamente adicionados à variável de ambiente `$OCAMLPATH` ao construir outro pacote que dependa deles ou ao abrir um `nix-shell`.

Dado que a maior parte do ecossistema OCaml é agora construída com dune, nixpkgs inclui uma função de suporte de construção de conveniência chamada `buildDunePackage` que construirá um pacote OCaml usando dune, OCaml e findlib e quaisquer dependências adicionais fornecidas como `buildInputs` ou `propagatedBuildInputs`.

Aqui está um exemplo de pacote simples.

- Ele define um atributo (opcional) `minimalOCamlVersion` (veja a nota abaixo) que será usado para lançar um erro de avaliação descritivo se for tentada a construção com uma versão mais antiga do OCaml.

- Ele usa o fetcher `fetchFromGitHub` para obter sua fonte.

- Ele também aceita um parâmetro `duneVersion` (valores válidos são `"2"` e `"3"`). A prática recomendada é defini-lo apenas se você não quiser o valor padrão e/ou se ele depender de outra coisa, como a versão do pacote.

- Ele define o atributo opcional `doCheck` de forma que os testes serão executados com `dune runtest -p angstrom` após a conclusão da construção (`dune build -p angstrom`), mas apenas se a versão do OCaml for pelo menos `"4.05"`.

- Ele usa o pacote `ocaml-syntax-shims` como um `build input`, `alcotest` e `ppx_let` como `check inputs` (porque são necessários para executar os testes), e `bigstringaf` e `result` como `propagated build inputs` (assim, eles também estarão disponíveis para bibliotecas que dependem desta biblioteca).

- A biblioteca será instalada usando o arquivo `angstrom.install` que o dune gera.

```nix
{
  lib,
  fetchFromGitHub,
  buildDunePackage,
  ocaml,
  ocaml-syntax-shims,
  alcotest,
  result,
  bigstringaf,
  ppx_let,
}:

buildDunePackage (finalAttrs: {
  pname = "angstrom";
  version = "0.15.0";

  minimalOCamlVersion = "4.04";

  src = fetchFromGitHub {
    owner = "inhabitedtype";
    repo = "angstrom";
    tag = finalAttrs.version;
    hash = "sha256-MK8o+iPGANEhrrTc1Kz9LBilx2bDPQt7Pp5P2libucI=";
  };

  buildInputs = [ ocaml-syntax-shims ];

  propagatedBuildInputs = [
    bigstringaf
    result
  ];

  doCheck = lib.versionAtLeast ocaml.version "4.05";
  checkInputs = [
    alcotest
    ppx_let
  ];

  meta = {
    homepage = "https://github.com/inhabitedtype/angstrom";
    description = "OCaml parser combinators built for speed and memory efficiency";
    license = lib.licenses.bsd3;
    maintainers = with lib.maintainers; [ sternenseemann ];
  };
})
```

Aqui está um segundo exemplo, desta vez usando um arquivo fonte gerado com `dune-release`. É uma boa ideia usar este arquivo quando ele estiver disponível, pois geralmente conterá variáveis substituídas, como um campo `%%VERSION%%`. Esta biblioteca não depende de nenhuma outra biblioteca OCaml e nenhum teste é executado após sua construção.

```nix
{
  lib,
  fetchurl,
  buildDunePackage,
}:

buildDunePackage (finalAttrs: {
  pname = "wtf8";
  version = "1.0.2";

  minimalOCamlVersion = "4.02";

  src = fetchurl {
    url = "https://github.com/flowtype/ocaml-wtf8/releases/download/v${finalAttrs.version}/wtf8-v${finalAttrs.version}.tbz";
    hash = "sha256-d5/3KUBAWRj8tntr4RkJ74KWW7wvn/B/m1nx0npnzyc=";
  };

  meta = {
    homepage = "https://github.com/flowtype/ocaml-wtf8";
    description = "WTF-8 is a superset of UTF-8 that allows unpaired surrogates";
    license = lib.licenses.mit;
    maintainers = [ lib.maintainers.eqyiel ];
  };
})
```

A construção falhará automaticamente se duas versões distintas da mesma biblioteca forem adicionadas a `buildInputs` (o que geralmente acontece transitivamente por causa de `propagatedBuildInputs`). Defina `dontDetectOcamlConflicts` como `true` para desabilitar este comportamento.