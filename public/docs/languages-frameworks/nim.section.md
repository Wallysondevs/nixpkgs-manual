# Nim {#sec-language-nim}

O compilador Nim e uma função de construção estão disponíveis.
Programas Nim são construídos usando um lockfile e `buildNimPackage` ou `buildNimSbom`.

## buildNimPackage {#buildNimPackage}

O exemplo a seguir mostra um programa Nim que depende apenas de bibliotecas Nim:
```nix
{
  lib,
  buildNimPackage,
  fetchFromGitHub,
}:

buildNimPackage (finalAttrs: {
  pname = "ttop";
  version = "1.2.7";

  src = fetchFromGitHub {
    owner = "inv2004";
    repo = "ttop";
    tag = "v${finalAttrs.version}";
    hash = lib.fakeHash;
  };

  lockFile = ./lock.json;

  nimFlags = [ "-d:NimblePkgVersion=${finalAttrs.version}" ];
})
```

### Parâmetros de `buildNimPackage` {#buildnimpackage-parameters}

A função `buildNimPackage` aceita um attrset de parâmetros que são passados para `stdenv.mkDerivation`.

Os seguintes parâmetros são específicos para `buildNimPackage`:

*   `lockFile`: Lockfile formatado em JSON.
*   `nimbleFile`: Especifica a localização do arquivo Nimble do pacote sendo construído, em vez de descobrir o arquivo em tempo de construção.
*   `nimRelease ? true`: Constrói o pacote no modo *release*.
*   `nimDefines ? []`: Uma lista de defines Nim. Tuplas chave-valor não são suportadas.
*   `nimFlags ? []`: Uma lista de argumentos de linha de comando para passar ao compilador Nim. Use isso para especificar defines com argumentos no formato de `-d:${name}=${value}`.
*   `nimDoc` ? false`: Constrói e instala a documentação HTML.

### Lockfiles {#nim-lockfiles}
Lockfiles Nim são criados com o utilitário `nim_lk`.
Execute `nim_lk` com o diretório de origem como argumento e ele imprimirá um lockfile para a saída padrão (stdout).
```sh
$ cd nixpkgs
$ nix build -f . ttop.src
$ nix run -f . nim_lk ./result | jq --sort-keys > pkgs/by-name/tt/ttop/lock.json
```

## buildNimSbom {#buildNimSbom}

Uma alternativa a `buildNimPackage` é `buildNimSbom`, que constrói pacotes a partir de arquivos [CycloneDX SBOM](https://cyclonedx.org/).
`buildNimSbom` resolve dependências Nim para [derivações de saída fixa](https://nixos.org/manual/nix/stable/glossary#gloss-fixed-output-derivation) usando o [namespace nix:fod](#sec-interop.cylonedx-fod).

No exemplo mínimo a seguir, apenas o checkout do código-fonte e um `buildInput` são especificados.
O arquivo SBOM fornece metadados como `pname` e `version`, bem como as fontes para as dependências Nim.
```nix
# pkgs/by-name/ni/nim_lk/package.nix
{
  lib,
  buildNimSbom,
  fetchFromSourcehut,
  openssl,
}:

buildNimSbom (finalAttrs: {
  src = fetchFromSourcehut {
    owner = "~ehmry";
    repo = "nim_lk";
    tag = finalAttrs.version;
    hash = lib.fakeHash;
  };
  buildInputs = [ openssl ];
}) ./sbom.json
```

### Gerando SBOMs {#generating-nim-sboms}

O utilitário [nim_lk](https://git.sr.ht/~ehmry/nim_lk) pode gerar SBOMs a partir de metadados de pacotes [Nimble](https://github.com/nim-lang/nimble).
Consulte a [documentação do nim_lk](https://git.sr.ht/~ehmry/nim_lk#nimble-to-cyclonedx-sbom) para mais informações.

## Sobrescrevendo pacotes Nim {#nim-overrides}

As funções `buildNimPackage` e `buildNimSbom` geram flags e dependências de construção adicionais a partir do parâmetro `lockFile` passado para `buildNimPackage`. Usar [`overrideAttrs`](#sec-pkg-overrideAttrs) no pacote final será aplicado depois que isso já tiver sido gerado, então isso não pode ser usado para sobrescrever o `lockFile` em um pacote construído com `buildNimPackage`. Para poder sobrescrever parâmetros antes que as flags e as dependências de construção sejam geradas a partir do `lockFile`, use `overrideNimAttrs` em vez disso, com a mesma sintaxe de `overrideAttrs`:

```nix
pkgs.nitter.overrideNimAttrs {
  # usando uma fonte diferente que tem dependências diferentes do pacote padrão
  src = pkgs.fetchFromGitHub {
    # …
  };
  # novo lock file gerado a partir da fonte
  lockFile = ./custom-lock.json;
}
```

## Sobrescritas de dependência de Lockfile {#nim-lock-overrides}

A função `buildNimPackage` associa as bibliotecas especificadas por `lockFile` a um attrset de funções de sobrescrita que são então aplicadas à derivação do pacote.
As sobrescritas padrão são mantidas como o attrset `nimOverrides` de nível superior em `pkgs/top-level/nim-overrides.nix`.

Por exemplo, para propagar uma dependência em SDL2 para lockfiles que selecionam a biblioteca Nim `sdl2`, um overlay é adicionado ao conjunto no arquivo `nim-overrides.nix`:
```nix
{
  lib,
  # …
  SDL2,
  # …
}:

{
  # …
  sdl2 =
    lockAttrs:
    {
      buildInputs ? [ ],
      ...
    }:
    {
      buildInputs = buildInputs ++ [ SDL2 ];
    };
  # …
}
```

As anotações no conjunto `nim-overrides.nix` são funções que aceitam dois argumentos e retornam um novo attrset a ser sobreposto no pacote que está sendo construído.
- lockAttrs: o attrset para esta biblioteca de dentro de um lockfile. Isso pode ser usado para implementar restrições de versão de biblioteca, como marcar bibliotecas como quebradas ou inseguras.
- prevAttrs: o attrset produzido pelos argumentos iniciais para `buildNimPackage` e quaisquer overlays de lockfile precedentes.

### Sobrescrevendo uma sobrescrita de biblioteca Nim {#nim-lock-overrides-overrides}

O attrset `nimOverrides` possibilita modificar sobrescritas de algumas maneiras diferentes.

Sobrescrever um pacote internamente à sua definição:
```nix
{
  lib,
  buildNimPackage,
  nimOverrides,
  libressl,
}:

let
  buildNimPackage' = buildNimPackage.override {
    nimOverrides = nimOverrides.override { openssl = libressl; };
  };
in
buildNimPackage' (finalAttrs: {
  pname = "foo";
  # …
})
```

Sobrescrever um pacote externamente:
```nix
{ pkgs }:
{
  foo = pkgs.foo.override {
    buildNimPackage = pkgs.buildNimPackage.override {
      nimOverrides = pkgs.nimOverrides.override { openssl = libressl; };
    };
  };
}
```