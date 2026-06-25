# Rocq e pacotes rocq {#sec-language-rocq}

Observe que "The Rocq Prover" (Rocq, para abreviar) é o novo nome do assistente de prova anteriormente conhecido como Coq. As derivações `coq` e `coqPackages` atualmente permanecem tanto para versões mais antigas do Coq, quanto para algumas versões do Rocq durante a transição de renomeação. Neste último caso, a derivação `coq` engloba os binários de compatibilidade (`coqtop`, `coqc`, etc.) além do binário `rocq`. Os pacotes apenas em `coqPackages` são aqueles que atualmente ainda dependem desses binários de compatibilidade.

## Derivação Rocq: `rocq-core` {#rocq-derivation-rocq}

A derivação Rocq pode ser sobrescrita através de `rocq-core.override overrides`, onde `overrides` é um conjunto de atributos que contém os argumentos a serem sobrescritos. Recomendamos sobrescrever qualquer um dos seguintes:

*   `version` (opcional, o padrão é a versão mais recente do Rocq selecionada para nixpkgs, veja `pkgs/top-level/rocq-packages` para verificar essa escolha), que segue as convenções explicadas na seção `rocqPackages` abaixo,
*   `customOCamlPackages` (opcional, o padrão é `null`, o que permite ao Rocq escolher uma versão automaticamente), que pode ser definido para qualquer um dos atributos de pacotes ocaml de `ocaml-ng` (como `ocaml-ng.ocamlPackages_4_14`, que é o padrão para Rocq 9.1, por exemplo).
*   `rocq-version` (opcional, o padrão é a versão curta, por exemplo, "9.1"), é um número de versão no formato "x.y" que indica qual comportamento de construção da versão do Rocq deve ser imitado ao usar uma fonte que não seja um lançamento. Por exemplo: `rocq-core.override { version = "40be8435e132aab2231a79091f011ebc3e64a753"; rocq-version = "9.1"; }`.

## Criando ambientes Coq personalizados com `coq.withPackages` {#coq-withPackages}

A função `coq.withPackages` oferece uma maneira conveniente de criar um ambiente Coq que inclui pacotes Coq adicionais. Isso é semelhante a como `python.withPackages` funciona para ambientes Python.

A função recebe uma função que obtém o conjunto de pacotes Coq e retorna uma lista de pacotes. Ela retorna um ambiente Coq encapsulado onde todos os binários Coq (`coqtop`, `coqc`, `coqdep`, `coqchk`, `coqide`, etc.) são configurados com as variáveis de ambiente apropriadas para encontrar os pacotes.

### Uso {#coq-withPackages-usage}

Aqui está um exemplo de como criar um ambiente Coq com pacotes específicos.

```nix
coq.withPackages (
  ps: with ps; [
    mathcomp
    bignums
  ]
)
```

Se você instalar o servidor `vsrocq-language-server` ou `rocq-lsp`, certifique-se de listá-los como parte da expressão `coq.withPackages` acima, em vez de instalá-los separadamente, se quiser que eles encontrem seus pacotes Coq/Rocq.

## Conjuntos de atributos de pacotes Rocq: `rocqPackages` {#rocq-packages-attribute-sets-rocqpackages}

A maneira recomendada de definir uma derivação para uma biblioteca Rocq é usar a função `rocqPackages.mkRocqDerivation`, que é essencialmente uma especialização de `mkDerivation` que leva em consideração a maioria das especificidades das bibliotecas Rocq. Os seguintes atributos são suportados:

*   `pname` (obrigatório) é o nome do pacote,
*   `version` (opcional, o padrão é `null`), é a versão a ser obtida e construída,
    este atributo é interpretado de várias maneiras dependendo de seu tipo e padrão:
    *   se for uma string de versão lançada conhecida, ou seja, do atributo `release` abaixo, o lançamento correspondente é escolhido, e o atributo `version` da derivação resultante é definido para esta string de lançamento,
    *   se for um prefixo majorMinor `"x.y"` de uma versão lançada conhecida (conforme definido acima), então a versão lançada conhecida `"x.y.z"` mais recente é selecionada (para a ordenação dada por `versionAtLeast`),
    *   se for um caminho ou uma string representando um caminho absoluto (ou seja, começando com `"/"`), o caminho fornecido é selecionado como fonte, e o atributo `version` da derivação resultante é definido como `"dev"`,
    *   se for uma string no formato `owner:branch`, então ele tenta baixar a `branch` do `owner` para um projeto com o mesmo nome usando o mesmo vcs, e o atributo `version` da derivação resultante é definido como `"dev"`, adicionalmente, se o `owner` não for fornecido (ou seja, se o prefixo `owner:` estiver faltando), ele assume o `owner` original do pacote (veja abaixo),
    *   se for uma string no formato `"#N"`, e o domínio for github, então ele tenta baixar o `head` atual do `pull request` `#N` do github,
*   `defaultVersion` (opcional). As bibliotecas Rocq podem ser compatíveis apenas com algumas versões específicas do Rocq. O atributo `defaultVersion` é usado quando nenhuma `version` é fornecida (ou se `version = null`) para selecionar a versão da biblioteca a ser usada por padrão, dependendo do contexto. Essa seleção dependerá principalmente de um número de versão `rocq-core`, mas também possivelmente de outras versões de pacotes (por exemplo, `mathcomp`). Se seu valor acabar sendo `null`, o pacote é marcado para remoção no conjunto de atributos `rocqPackages` do usuário final.
*   `release` (opcional, o padrão é `{}`), lista todos os lançamentos conhecidos da biblioteca e para cada um deles fornece um conjunto de atributos com pelo menos um atributo `hash` (você pode colocar a string vazia `""` para inserir automaticamente um `hash` falso, isso irá disparar um erro que permitirá que você encontre o `hash` correto), cada conjunto de atributos da lista de lançamentos também aceita argumentos de sobrecarga opcionais para o `fetcher` como abaixo (ou seja, `domain`, `owner`, `repo`, `rev`, `artifact` assumindo que o `fetcher` padrão é usado) e sobrescritas opcionais para o resultado do `fetcher` (ou seja, `version` e `src`).
*   `fetcher` (opcional, o padrão é um mecanismo de busca genérico que suporta infraestruturas baseadas em github ou gitlab), é uma função que recebe pelo menos um `owner`, um `repo`, um `rev` e um `hash` e retorna um conjunto de atributos com uma `version` e `src`.
*   `repo` (opcional, o padrão é o valor de `pname`),
*   `owner` (opcional, o padrão é `"rocq-community"`).
*   `domain` (opcional, o padrão é `"github.com"`), domínios que incluem as strings `"github"` ou `"gitlab"` em seus nomes são automaticamente suportados, caso contrário, deve-se alterar o argumento `fetcher` para suportá-los (cf. `pkgs/development/rocq-modules/bignums/default.nix` para um exemplo),
*   `releaseRev` (opcional, o padrão é `(v: v)`), fornece um mapeamento padrão de nomes de lançamento para `hashes` de revisão/nomes de `branch`/`tags`,
*   `releaseArtifact` (opcional, o padrão é `(v: null)`), fornece um mapeamento padrão de nomes de lançamento para nomes de artefatos (funciona apenas para artefatos do github por enquanto),
*   `displayVersion` (opcional), fornece uma maneira de alterar o cálculo de `name` a partir de `pname`, explicando como exibir números de versão,
*   `namePrefix` (opcional, o padrão é `[ "rocq-core" ]`), fornece uma maneira de alterar o cálculo de `name` a partir de `pname`, explicando quais dependências devem ocorrer em `name`,
*   `nativeBuildInputs` (opcional), é uma lista de executáveis que são necessários para construir a derivação atual, além dos padrões (ou seja, `which`, `dune` e `ocaml` dependendo se `useDune`, `useDuneifVersion` e `mlPlugin` estão definidos).
*   `extraNativeBuildInputs` (opcional, obsoleto), uma lista adicional de derivações para adicionar a `nativeBuildInputs`,
*   `overrideNativeBuildInputs` (opcional) substitui a lista padrão de derivações à qual `nativeBuildInputs` e `extraNativeBuildInputs` adicionam elementos extras,
*   `buildInputs` (opcional), é uma lista de bibliotecas e dependências que são necessárias para construir e executar a derivação atual, além da padrão `[ rocq-core ]`,
*   `extraBuildInputs` (opcional, obsoleto), uma lista adicional de derivações para adicionar a `buildInputs`,
*   `overrideBuildInputs` (opcional) substitui a lista padrão de derivações à qual `buildInputs` e `extraBuildInputs` adicionam elementos extras,
*   `propagatedBuildInputs` (opcional) é passado como está para `mkDerivation`, recomendamos usá-lo para bibliotecas Rocq e dependências de plugins Rocq, pois isso garante que os caminhos das bibliotecas e plugins compilados serão sempre adicionados aos ambientes de construção de derivações subsequentes, o que é necessário para que os pacotes Rocq funcionem corretamente,
*   `mlPlugin` (opcional, o padrão é `false`). Algumas extensões (plugins) podem exigir OCaml e, às vezes, outros pacotes OCaml. Dependências padrão podem ser adicionadas definindo a opção atual como `true`. Para um controle mais refinado, o atributo `rocq-core.ocamlPackages` pode ser usado em `nativeBuildInputs`, `buildInputs` e `propagatedBuildInputs` para depender do mesmo conjunto de pacotes contra o qual o Rocq foi construído.
*   `useDuneifVersion` (opcional, o padrão é `(x: false)`) usa Dune para construir o pacote se o predicado fornecido for avaliado como verdadeiro na versão, por exemplo, `useDuneifVersion = versions.isGe "1.1"` usará `dune` se a versão do pacote for maior ou igual a `"1.1"`,
*   `useDune` (opcional, o padrão é `false`) usa Dune para construir o pacote se definido como verdadeiro, a presença deste atributo sobrescreve o comportamento do anterior.
*   `opam-name` (opcional, o padrão é concatenar com um separador de traço os componentes de `namePrefix` e `pname`), nome do pacote Dune a ser construído.
*   `enableParallelBuilding` (opcional, o padrão é `true`), como é ativado por padrão, fornecemos uma maneira de desativá-lo.
*   `extraInstallFlags` (opcional), permite estender `installFlags` que inicializa as variáveis `COQLIBINSTALL` e `COQPLUGININSTALL` para instalar no subdiretório apropriado. De fato, as bibliotecas Rocq devem ser instaladas em `$(out)/lib/coq/${rocq-core.rocq-version}/user-contrib/`. Tais diretórios são automaticamente adicionados à variável de ambiente `$ROCQPATH` pelo `hook` definido na derivação Rocq.
*   `setROCQBIN` (opcional, o padrão é `true`), por padrão, a variável de ambiente `$ROCQBIN` é definida para o binário Rocq atual, mas pode-se desativar esse comportamento definindo-a como `false`,
*   `useMelquiondRemake` (opcional, o padrão é `null`) é um conjunto de atributos que, se fornecido, sobrecarrega os atributos `preConfigurePhases`, `configureFlags`, `buildPhase` e `installPhase` da derivação para um uso específico em bibliotecas que usam `remake` conforme configurado por Guillaume Melquiond para `flocq`, `gappalib`, `interval` e `coquelicot` (veja a derivação correspondente para exemplos concretos de uso desta opção). Para compatibilidade retroativa, o atributo `useMelquiondRemake.logpath` deve ser definido para a raiz lógica da biblioteca (caso contrário, pode-se passar `useMelquiondRemake = {}` para ativar isso sem compatibilidade retroativa).
*   `dropAttrs`, `keepAttrs`, `dropDerivationAttrs` são todos opcionais e permitem ajustar qual atributo é adicionado ou removido da chamada final para `mkDerivation`.

Ele também aceita outros atributos padrão de `mkDerivation`, que são adicionados como tal, exceto por `meta` que estende um `meta` automaticamente calculado (onde o `platform` é o mesmo que `rocq-core` e a `homepage` é automaticamente calculada).

Aqui está um exemplo de pacote simples. É uma biblioteca Rocq pura, portanto, depende do Rocq. Ela se baseia na biblioteca Mathematical Components, portanto, também recebe algumas derivações `mathcomp` como `extraBuildInputs`.

```nix
{
  lib,
  mkRocqDerivation,
  version ? null,
  rocq-core,
  mathcomp,
  mathcomp-finmap,
  mathcomp-bigenough,
}:

mkRocqDerivation {
  # namePrefix leads to e.g. `name = rocq-core9.1-mathcomp2.5.0-multinomials-2.4.0`
  namePrefix = [
    "rocq-core"
    "mathcomp"
  ];
  pname = "multinomials";
  owner = "math-comp";
  inherit version;
  defaultVersion =
    let
      case = rocq: mc: out: {
        cases = [
          rocq-core
          mc
        ];
        inherit out;
      };
    in
    with lib.versions;
    lib.switch
      [ rocq-core.rocq-version mathcomp.version ]
      [
        (case (range "8.18" "9.1") (range "2.1.0" "2.5.0") "2.4.0")
        (case (range "8.17" "9.0") (range "2.1.0" "2.3.0") "2.3.0")
      ]
      null;
  release = {
    "2.4.0".sha256 = "sha256-7zfIddRH+Sl4nhEPtS/lMZwRUZI45AVFpcC/UC8Z0Yo=";
    "2.3.0".sha256 = "sha256-usIcxHOAuN+f/j3WjVbPrjz8Hl9ac8R6kYeAKi3CEts=";
  };

  propagatedBuildInputs = [
    mathcomp.boot
    mathcomp.algebra
    mathcomp-finmap
    mathcomp.fingroup
    mathcomp-bigenough
  ];

  meta = {
    description = "Coq/SSReflect Library for Monoidal Rings and Multinomials";
    license = lib.licenses.cecill-c;
  };
}
```

## Três maneiras de sobrescrever pacotes Rocq {#rocq-overriding-packages}

Existem três maneiras distintas de alterar um pacote Rocq sobrescrevendo um de seus valores: `.override`, `overrideRocqDerivation` e `.overrideAttrs`. Esta seção explica que tipo de valores podem ser sobrescritos com cada um desses métodos.

### `.override` {#rocq-override}

`.override` permite que você altere argumentos para uma derivação Rocq. No caso do pacote `multinomials` acima, `.override` permitiria que você sobrescrevesse argumentos como `mkRocqDerivation`, `version`, `rocq-core`, `mathcomp`, `mathcom-finmap`, etc.

Por exemplo, assumindo que você tenha uma dependência `mathcomp` especial que deseja usar, veja como você poderia sobrescrever a dependência `mathcomp`:

```nix
multinomials.override { mathcomp = my-special-mathcomp; }
```

No Nixpkgs, todas as derivações Rocq aceitam um argumento `version`. Isso pode ser sobrescrito para usar facilmente uma versão diferente:

```nix
rocqPackages.multinomials.override { version = "1.5.1"; }
```

Consulte [](#rocq-packages-attribute-sets-rocqpackages) para todos os diferentes formatos que você pode potencialmente passar para `version`, bem como as restrições.

### `overrideRocqDerivation` {#rocq-overrideRocqDerivation}

A função `overrideRocqDerivation` permite que você altere facilmente os argumentos para `mkRocqDerivation`. Esses argumentos são descritos em [](#rocq-packages-attribute-sets-rocqpackages).

Por exemplo, veja como você poderia adicionar localmente um novo lançamento da biblioteca `multinomials` e definir o `defaultVersion` para usar este lançamento:

```nix
rocqPackages.lib.overrideRocqDerivation {
  defaultVersion = "2.0";
  release."2.0".hash = "sha256-czoP11rtrIM7+OLdMisv2EF7n/IbGuwFxHiPtg3qCNM=";
} rocqPackages.multinomials
```

### `.overrideAttrs` {#rocq-overrideAttrs}

`.overrideAttrs` permite que você sobrescreva argumentos para a chamada subjacente `stdenv.mkDerivation`. Internamente, `mkRocqDerivation` usa `stdenv.mkDerivation` para criar derivações para bibliotecas Rocq. Você pode sobrescrever argumentos para `stdenv.mkDerivation` com `.overrideAttrs`.

Por exemplo, veja como você poderia adicionar algum código a ser executado na derivação após a conclusão da instalação:

```nix
rocqPackages.multinomials.overrideAttrs (oldAttrs: {
  postInstall = oldAttrs.postInstall or "" + ''
    echo "you can do anything you want here"
  '';
})
```