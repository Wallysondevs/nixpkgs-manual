# Lean 4 {#sec-language-lean4}

Lean 4 é uma linguagem funcional estrita com tipos dependentes. `leanPackages` fornece a toolchain e um conjunto curado de bibliotecas — incluindo a árvore de dependências completa do mathlib — com sua própria toolchain Lean. Um compilador autônomo também está disponível como `pkgs.lean4` para uso fora do conjunto de pacotes.

## Construindo projetos Lean 4 com `buildLakePackage` {#lean4-buildLakePackage}

```nix
leanPackages.buildLakePackage {
  pname = "my-project";
  version = "0.1.0";
  src = ./.;
  leanDeps = with leanPackages; [ mathlib ];
  lakeHash = null; # all deps nix-managed; set to lib.fakeHash for Lake-managed deps
}
```

As dependências são declaradas no lakefile para Lake e na expressão Nix para Nix. `leanDeps` fornece bibliotecas gerenciadas pelo Nix cujos arquivos `.olean` — o artefato de compilação padrão da faceta de biblioteca do Lake — são reutilizados sem recompilação. `buildLakePackage` os injeta via `lake --packages`, o que tem precedência sobre a própria resolução de dependências do Lake, produzindo uma compilação hermética.

Sui generis entre os builders do nixpkgs, `buildLakePackage` suporta resolução de dependências heterogêneas, na medida em que o Nix substitui transparentemente as dependências gerenciadas upstream com granularidade por pacote: dependências gerenciadas pelo Nix via `leanDeps` e dependências gerenciadas pelo Lake via `lakeHash` se compõem na mesma derivation. Definir `lakeHash = lib.fakeHash` e compilar reportará o hash esperado para uma fixed-output derivation que fixa o que o Lake normalmente buscaria, menos as dependências gerenciadas pelo Nix. As dependências gerenciadas pelo Nix têm precedência por nome — então mover uma dependência de `lakeHash` para `leanDeps` mudará o hash esperado — fornecendo uma rampa de acesso para projetos adotarem incrementalmente bibliotecas gerenciadas pelo Nix. Definir `lakeHash = null` (o padrão) declara que todas as dependências são gerenciadas pelo Nix e nenhuma busca de fixed-output é realizada durante a compilação.

Um `lake-manifest.json` é necessário na raiz do projeto. Se todas as dependências forem gerenciadas pelo Nix, um manifest vazio é suficiente:

```json
{"version":"1.1.0","packagesDir":".lake/packages","packages":[]}
```

## Shells de desenvolvimento {#lean4-dev-shells}

Em `nix develop`, o `lean4` e `buildLakePackage` com escopo fornecem a mesma toolchain usada para compilações herméticas. Note que a resolução normal de dependências do Lake está disponível no shell — o Lake pode buscar dependências não cobertas por `leanDeps` da rede, como é padrão para shells de desenvolvimento Nix.

## O escopo `leanPackages` {#lean4-leanPackages}

`leanPackages` é um `lib.makeScope` com seu próprio `lean4`. Sobrescrevê-lo se propaga para todos os pacotes e para `buildLakePackage`:

```nix
leanPackages.overrideScope (
  self: super: {
    lean4 = myCustomLean4;
  }
)
```

O `lean4` fornecido por `leanPackages` é corrigido binariamente para garantir que o servidor de linguagem Lean descubra o `lake` encapsulado em vez de um não encapsulado. Isso é necessário porque o subcomando `serve` do Lake tem um padrão de invocação problemático: ele deriva `LAKE` de `IO.appPath` e o define incondicionalmente no ambiente gerado, ignorando qualquer wrapper. O patch binário reescreve as referências de store path para que esse mecanismo de descoberta encontre o binário correto, permitindo a integração LSP — incluindo o InfoView, que requer extensões de protocolo específicas do Lean — sem mutação indevida do diretório do projeto do usuário.

Note que `leanPackages.lean4` suplanta a invalidação de cache embutida do Lake para dependências em `/nix/store/`, deferindo inteiramente ao modelo de dependência sob medida do Nix. A validação de rastreamento do Lake — que verifica o "hash" do compilador, a plataforma e a identidade do pacote — é graciosamente subsumida pelas garantias que o Nix já oferece. As responsabilidades de coerência de cache são delegadas ao orquestrador da integração simplificada do Nix.

Para Emacs, `emacsPackages.nael` e `emacsPackages.nael-lsp` (baseados em eglot e lsp-mode, respectivamente, disponíveis via MELPA) fornecem suporte a Lean 4, incluindo exibição do estado da prova via eldoc. Para VSCode (não livre) / VSCodium, `vscode-extensions.leanprover.lean4` está disponível. Os pacotes de editor descobrem a toolchain a partir do `PATH`.

## Relação com o suporte anterior a Lean 4 no Nix {#lean4-history}

Usuários familiarizados com a abordagem de derivation por módulo (2020–2025) devem notar que `buildLakePackage` segue uma arquitetura diferente. A integração anterior descobria dependências no tempo de avaliação via import-from-derivation — uma tentativa ambiciosa de conciliar o gerenciamento declarativo de pacotes com semânticas de compilação granulares, ultimamente minada pelo próprio modelo de avaliação do Nix. Foi [removido upstream](https://github.com/leanprover/lean4/commit/535435955b482176e8d62a54deebcacdec0827db). `buildLakePackage` trata o Lake como um driver de compilação e usa o Nix para limites de nível de pacote, enquanto `nix develop` e `nix-shell` alcançam paridade de recursos com a experiência de desenvolvimento vanilla do Lake.