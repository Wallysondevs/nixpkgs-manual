# Haskell {#haskell}

A infraestrutura Haskell no Nixpkgs tem dois propósitos principais: O propósito primário é fornecer um compilador Haskell e ferramentas de construção, bem como infraestrutura para empacotar pacotes baseados em Haskell.

O propósito secundário é fornecer suporte para ambientes de desenvolvimento Haskell, incluindo bibliotecas Haskell pré-construídas. No entanto, nesta área, sacrifícios foram feitos devido a restrições autoimpostas no Nixpkgs, para diminuir o esforço de manutenção e melhorar o desempenho. (Mais detalhes na subseção [Limitações.](#haskell-limitations))

## Pacotes Disponíveis {#haskell-available-packages}

O compilador e a maioria das ferramentas de construção são expostos no nível superior:

*   `ghc` é a versão padrão do GHC
*   Ferramentas específicas da linguagem: `cabal-install`, `stack`, `hpack`, …

Muitos pacotes "normais" voltados para o usuário, escritos em Haskell, como `niv` ou `cachix`, também são expostos no nível superior, e não há nada específico de Haskell para instalá-los e usá-los.

Todos esses pacotes são originalmente definidos no conjunto de pacotes `haskellPackages`. Os mesmos pacotes são reexpostos com um fechamento de dependência reduzido para conveniência (veja `justStaticExecutables` ou `separateBinOutput` abaixo).

:::{.note}
Veja [](#chap-language-support) para técnicas de exploração de conjuntos de pacotes.
:::

O conjunto `haskellPackages` inclui pelo menos uma versão de cada pacote do [Hackage](https://hackage.haskell.org/), bem como alguns pacotes injetados manualmente.

Os nomes dos atributos em `haskellPackages` sempre correspondem aos seus nomes no Hackage. Como o Hackage permite nomes que não são Nix válidos sem escape, você precisa ter cuidado ao lidar com nomes de atributos como `3dmodels`.

Para pacotes que fazem parte do [Stackage] (um conjunto curado de pacotes conhecidos por serem compatíveis), usamos a versão prescrita por um snapshot do Stackage (geralmente o LTS atual) como a versão padrão. Para todos os outros pacotes, usamos a versão mais recente do [Hackage](https://hackage.org) (o repositório de basicamente todos os pacotes Haskell de código aberto). Veja [abaixo](#haskell-available-versions) para mais alguns detalhes sobre isso.

Aproximadamente metade dos 16 mil pacotes contidos em `haskellPackages` na verdade não são construídos e são [marcados como quebrados semi-automaticamente](https://github.com/NixOS/nixpkgs/blob/haskell-updates/pkgs/development/haskell-modules/configuration-hackage2nix/broken.yaml). A maioria desses pacotes está obsoleta ou sem manutenção, mas às vezes pacotes que deveriam ser construídos, não são. Muitas vezes, corrigi-los não exige muito trabalho.

<!--
TODO(@sternenseemann):
How you can help with that is
described in [Fixing a broken package](#haskell-fixing-a-broken-package).
-->

`haskellPackages` é construído com nosso compilador padrão, mas também fornecemos outras versões do GHC e conjuntos de pacotes construídos com eles. Os compiladores disponíveis são coletados sob `haskell.compiler`.

Cada uma dessas versões de compilador tem um conjunto de atributos `packages` correspondente construído com ela. No entanto, os conjuntos de pacotes não padrão não são testados regularmente e, como resultado, contêm menos pacotes funcionais. O conjunto de pacotes correspondente para GHC 9.4.8 é `haskell.packages.ghc948`. Na verdade, `haskellPackages` (no momento da escrita) é apenas um alias para `haskell.packages.ghc9103`.

Cada conjunto de pacotes também reexpõe o GHC usado para construir seus pacotes como `haskell.packages.*.ghc`.

### Versões de Pacotes Disponíveis {#haskell-available-versions}

Nosso objetivo é um conjunto de pacotes "abençoado" que contenha apenas uma versão de cada pacote, como o [Stackage], que é um conjunto curado de pacotes conhecidos por serem compatíveis. Usamos as informações de versão dos snapshots do Stackage e as estendemos com mais pacotes. Normalmente, no Nixpkgs, o número de pacotes Haskell em construção é aproximadamente duas a três vezes o tamanho do Stackage. Para escolher a versão a ser usada para um determinado pacote, usamos as seguintes regras:

1.  Por padrão, para `haskellPackages.foo` é a versão mais recente do pacote `foo` encontrada no [Hackage](https://hackage.org), que é o registro central de todos os pacotes Haskell de código aberto. O Nixpkgs contém uma referência a um snapshot fixado do Hackage, portanto, usamos o estado do Hackage a partir da última vez que atualizamos este fixador.
2.  Se o snapshot do [Stackage] que usamos (geralmente o snapshot LTS mais recente) contém um pacote, [usamos em vez disso a versão do snapshot do Stackage como versão padrão para esse pacote.](https://github.com/NixOS/nixpkgs/blob/haskell-updates/pkgs/development/haskell-modules/configuration-hackage2nix/stackage.yaml)
3.  Para alguns pacotes, que não estão no Stackage, temos, se necessário, [substituições manuais para definir a versão padrão para uma versão mais antiga do que a mais recente no Hackage.](https://github.com/NixOS/nixpkgs/blob/haskell-updates/pkgs/development/haskell-modules/configuration-hackage2nix/main.yaml)
4.  Para todos os pacotes para os quais a versão mais recente do Hackage não é a versão padrão, também haverá um pacote `haskellPackages.foo_x_y_z` com a versão mais recente. A parte `x_y_z` codifica a versão com pontos substituídos por underscores. Quando a versão mais recente muda por um novo lançamento no Hackage, o pacote antigo desaparecerá sob esse nome e será substituído por um mais novo sob o nome com a nova versão. O nome do pacote, incluindo a versão, também desaparecerá quando a versão padrão, por exemplo, do Stackage, alcançar a versão mais recente do Hackage. Por exemplo, se `haskellPackages.foo` for atualizado de 1.0.0 para 1.1.0, o pacote `haskellPackages.foo_1_1_0` se tornará obsoleto e será descartado.
5.  Para alguns pacotes, também [adicionamos manualmente outras versões `haskellPackages.foo_x_y_z`](https://github.com/NixOS/nixpkgs/blob/haskell-updates/pkgs/development/haskell-modules/configuration-hackage2nix/main.yaml), se forem necessárias para uma determinada construção.

Confiar em atributos `haskellPackages.foo_x_y_z` em derivações fora do nixpkgs é desencorajado porque eles podem mudar ou desaparecer a cada atualização do conjunto de pacotes.
<!-- TODO(@maralorn) We should add a link to callHackage, etc. once we added
them to the docs. -->

Todos os conjuntos de pacotes `haskell.packages.*` usam as mesmas descrições de pacotes e os mesmos conjuntos de versões por padrão. No entanto, existem arquivos `.nix` de substituição específicos da versão do GHC para flexibilizar um pouco isso.

### Resolução de Dependências {#haskell-dependency-resolution}

Normalmente, quando você constrói pacotes Haskell com `cabal-install`, o `cabal-install` faz a resolução de dependências. Ele examinará todas as versões de pacotes Haskell conhecidas no Hackage e tentará escolher exatamente uma versão para cada dependência (transitiva) da sua construção. Essas versões precisam satisfazer todas as restrições de versão fornecidas no arquivo `.cabal` do seu pacote e de todas as suas dependências.

O [construtor Haskell no nixpkgs](#haskell-mkderivation) não faz tal coisa. Ele receberá como entrada pacotes com nomes das dependências desejadas e apenas verificará se eles cumprem os limites de versão e falhará se não o fizerem (por padrão, veja `jailbreak` para contornar isso).

A função `haskellPackages.callPackage` faz a resolução do pacote. Ela, por exemplo, usará `haskellPackages.aeson` que tem a versão padrão conforme descrito acima para uma entrada de pacote com o nome `aeson`. (Mais genericamente: `<packages>.callPackage f` chamará `f` com entradas nomeadas fornecidas do conjunto de pacotes `<packages>`.)
Embora este seja o comportamento padrão, é possível substituir as dependências para um pacote específico, veja
[`override` e `overrideScope`](#haskell-overriding-haskell-packages).

### Limitações {#haskell-limitations}

Nosso principal objetivo com `haskellPackages` é empacotar software Haskell no Nixpkgs. Isso implica algumas limitações, parcialmente devido a restrições autoimpostas do Nixpkgs, parcialmente em nome da manutenibilidade:

*   Apenas os pacotes construídos com o compilador padrão passam por testes extensivos de todo o conjunto de pacotes. Para outras versões do GHC, apenas alguns pacotes essenciais são testados e armazenados em cache.
*   Conforme descrito acima, construímos apenas uma versão da maioria dos pacotes.

A experiência de usar um compilador empacotado mais antigo ou mais novo, ou usar versões diferentes, pode ser pior, porque as construções não serão armazenadas em cache em `cache.nixos.org` ou podem falhar.

Assim, para obter a melhor experiência, certifique-se de que seu projeto possa ser compilado usando o compilador padrão do nixpkgs e versões recentes de suas dependências.

Um resultado dessa configuração é que obter um plano de construção válido para um determinado pacote pode ser bastante doloroso às vezes, e de fato é aqui que a maior parte do trabalho de manutenção para `haskellPackages` é necessária. Além disso, não é possível obter as dependências de um projeto legado do nixpkgs ou usar um resolvedor de stack específico para compilar um projeto.

Embora não pudéssemos usá-los diretamente no nixpkgs, seria desejável ter ferramentas para gerar conjuntos de pacotes Nix funcionais a partir de planos de construção gerados por `cabal-install` ou um snapshot específico do Stackage via import-from-derivation. Infelizmente, atualmente não temos ferramentas para isso. Para isso, você pode se interessar pelo framework alternativo [haskell.nix], que, esteja avisado, é completamente incompatível com pacotes de `haskellPackages`.

<!-- TODO(@maralorn) Link to package set generation docs in the contributors guide below. -->

### Política de Descontinuação do GHC {#ghc-deprecation-policy}

Removemos as versões do GHC de acordo com a seguinte política:

#### Versões Maiores do GHC {#major-ghc-deprecation}

Mantemos as seguintes versões maiores do GHC:
1.  O Stackage LTS atual como padrão e todas as versões maiores posteriores.
2.  As duas últimas versões maiores mais antigas que a nossa padrão.
3.  A versão GHCup atualmente recomendada e todas as versões maiores posteriores.

Versões mais antigas do GHC podem ser mantidas por mais tempo, se houver consumidores internos. Coordenaremos com os mantenedores dessas dependências para encontrar um caminho a seguir.

#### Versões Menores do GHC {#minor-ghc-deprecation}

Cada versão maior tem uma versão menor padrão. A versão menor padrão será atualizada assim que for viável, sem quebras.

Versões menores mais antigas para uma versão maior suportada serão mantidas apenas se forem a última versão suportada de um lançamento LTS principal do Stackage.

<!-- Policy introduced here: https://discourse.nixos.org/t/nixpkgs-ghc-deprecation-policy-user-feedback-necessary/64153 -->

## `haskellPackages.mkDerivation` {#haskell-mkderivation}

Cada conjunto de pacotes Haskell tem seu próprio `mkDerivation` ciente de Haskell, que é usado para construir seus pacotes. Geralmente, você não precisará interagir com este construtor, pois o [cabal2nix](#haskell-cabal2nix) pode gerar pacotes usando-o para uma definição arbitrária de pacote cabal. Ainda assim, é útil conhecer os parâmetros que ele aceita quando você precisa [substituir](#haskell-overriding-haskell-packages) uma expressão Nix gerada.

`haskellPackages.mkDerivation` é um wrapper em torno de `stdenv.mkDerivation` que redefine as fases padrão para serem cientes de Haskell e lida com a especificação de dependências, suítes de teste, benchmarks, etc., compilando e invocando o `Setup.hs` do pacote. Ele *não* usa ou invoca o binário `cabal-install`, mas usa a biblioteca `Cabal` subjacente.

### Argumentos Gerais {#haskell-derivation-args}

`pname`
: Nome do pacote, assumido ser o mesmo que no Hackage (se aplicável)

`version`
: Versão empacotada, assumida ser a mesma que no Hackage (se aplicável)

`src`
: Fonte do pacote. Se omitido, busca o pacote correspondente a `pname` e `version` do Hackage.

`sha256`
: Hash a ser usado para o caso padrão de `src`.

`sourceRoot`, `setSourceRoot`
: Passado para `stdenv.mkDerivation`; veja [“Variáveis que controlam a fase de descompactação”](#variables-controlling-the-unpack-phase).

`revision`
: Número de revisão do arquivo cabal atualizado a ser buscado do Hackage. Se `null` (que é o valor padrão), o incluído em `src` é usado.

`editedCabalFile`
: Hash `sha256` do arquivo cabal identificado por `revision` ou `null`.

`env`
: Variáveis de ambiente extras a serem definidas durante a construção. Estas também serão definidas dentro do [ambiente de desenvolvimento definido pelo atributo `passthru.env` na derivação retornada](#haskell-development-environments), mas não serão definidas dentro de um ambiente de desenvolvimento construído com [`shellFor`](#haskell-shellFor) que inclua este pacote.

`configureFlags`
: Flags extras passadas ao executar o comando `configure` de `Setup.hs`.

`buildFlags`
: Flags extras passadas ao executar o comando `build` de `Setup.hs`.

`haddockFlags`
: Flags extras passadas para `Setup.hs haddock` ao construir a documentação.

`doCheck`
: Se deve executar a suíte de testes do pacote, caso exista. O padrão é `true`, a menos que esteja fazendo compilação cruzada.

`doBenchmark`
: Se deve executar o benchmark do pacote, caso exista. O padrão é `false`.

`doHoogle`
: Se deve gerar um arquivo de índice para [hoogle][hoogle] como parte da `haddockPhase` passando a [`--hoogle` option][haddock-hoogle-option]. O padrão é `true`.

`doHaddockQuickjump`
: Se deve gerar um índice para navegação interativa da documentação HTML. O padrão é `true` se suportado.

`doInstallIntermediates`
: Se deve instalar produtos de construção intermediários (arquivos escritos em `dist/build` pelo GHC durante o processo de construção). Com `enableSeparateIntermediatesOutput`, esses arquivos são instalados em [uma saída `intermediates` separada.][multiple-outputs] A saída pode então ser passada para uma futura construção do mesmo pacote com o argumento `previousIntermediates` para suportar construções incrementais. Veja [“Construções incrementais”](#haskell-incremental-builds) para mais informações. O padrão é `false`.

`dontConvertCabalFileToUnix`
: Por padrão, `haskellPackages.mkDerivation` converte o arquivo `.cabal` de um determinado pacote para quebras de linha no estilo Unix. Isso visa contornar o [Hackage que converte arquivos `.cabal` revisados para quebras de linha no estilo DOS](https://github.com/haskell/hackage-server/issues/316), o que frequentemente faz com que os patches parem de ser aplicados. Você pode passar `true` para desabilitar este comportamento.

`enableLibraryProfiling`
: Se deve habilitar [profiling][profiling] para bibliotecas contidas no pacote. Habilitado por padrão se suportado.

`enableExecutableProfiling`
: Se deve habilitar [profiling][profiling] para executáveis contidos no pacote. Desabilitado por padrão.

`profilingDetail`
: [Nível de detalhe de profiling][profiling-detail] a ser definido. O padrão é `exported-functions`.

`enableSharedExecutables`
: Se deve linkar executáveis dinamicamente. Por padrão, os executáveis são linkados estaticamente.

`enableSharedLibraries`
: Se deve construir bibliotecas Haskell compartilhadas. Isso é habilitado por padrão, a menos que estejamos usando `pkgsStatic` ou que as bibliotecas compartilhadas tenham sido desabilitadas no GHC.

`enableStaticLibraries`
: Se deve construir bibliotecas estáticas. Habilitado por padrão se suportado.

`enableDeadCodeElimination`
: Se deve habilitar a eliminação de código morto baseada em linker no GHC. Habilitado por padrão se suportado.

`enableHsc2hsViaAsm`
: Se deve passar `--via-asm` para `hsc2hs`. Habilitado por padrão apenas no Windows.

`hyperlinkSource`
: Se deve renderizar o código-fonte como parte da documentação haddock, passando a [`--hyperlinked-source` flag][haddock-hyperlinked-source-option]. O padrão é `true`.

`isExecutable`
: Se o pacote contém um executável.

`isLibrary`
: Se o pacote contém uma biblioteca.

`jailbreak`
: Se deve executar [jailbreak-cabal][jailbreak-cabal] antes de `configurePhase` para remover quaisquer restrições de versão no arquivo cabal. Note que isso não pode remover limites de versão se eles forem condicionais, ou seja, se uma dependência estiver oculta atrás de uma flag.

`enableParallelBuilding`
: Se deve usar a flag `-j` para fazer o GHC/Cabal iniciar múltiplos trabalhos em paralelo.

`maxBuildCores`
: Limite superior de trabalhos a serem usados em paralelo para compilação, independentemente de `$NIX_BUILD_CORES`. O padrão é 16, pois a compilação Haskell com GHC atualmente apresenta uma [regressão de desempenho](https://gitlab.haskell.org/ghc/ghc/-/issues/9221) se muitos trabalhos paralelos forem usados.

`doCoverage`
: Se deve gerar e instalar arquivos necessários para [HPC][haskell-program-coverage]. O padrão é `false`.

`doHaddock`
: Se deve construir documentação (HTML) usando [haddock][haddock]. O padrão é `true` se suportado.

`testTargets`
: Nomes das suítes de teste a serem construídas e executadas. Se não definido, todas as suítes de teste serão executadas.

`preCompileBuildDriver`
: Código shell a ser executado antes de compilar `Setup.hs`.

`postCompileBuildDriver`
: Código shell a ser executado após compilar `Setup.hs`.

`preHaddock`
: Código shell a ser executado antes de construir a documentação usando haddock.

`postHaddock`
: Código shell a ser executado após construir a documentação usando haddock.

`coreSetup`
: Se deve permitir apenas que bibliotecas centrais sejam usadas durante a construção de `Setup.hs`. O padrão é `false`.

`useCpphs`
: Se deve habilitar o pré-processador [cpphs][cpphs]. O padrão é `false`.

`enableSeparateBinOutput`
: Se deve instalar executáveis em uma saída `bin` separada. O padrão é `false`.

`enableSeparateDataOutput`
: Se deve instalar arquivos de dados enviados com o pacote em uma saída `data` separada. O padrão é `false`.

`enableSeparateDocOutput`
: Se deve instalar a documentação em uma saída `doc` separada. É automaticamente habilitado se `doHaddock` for `true`.

`enableSeparateIntermediatesOutput`
: Quando `doInstallIntermediates` é verdadeiro, se deve instalar produtos de construção intermediários em uma saída `intermediates` separada. Veja [“Construções incrementais”](#haskell-incremental-builds) para mais informações. O padrão é `false`.

`allowInconsistentDependencies`
: Se habilitado, permite múltiplas versões do mesmo pacote Haskell na árvore de dependências no momento da configuração. Frequentemente, em tal situação, a compilação falharia mais tarde devido a incompatibilidades de tipo. O padrão é `false`.

`enableLibraryForGhci`
: Constrói e instala um arquivo objeto especial para GHCi. Isso melhora o desempenho ao carregar a biblioteca no REPL, mas requer tempo de construção e espaço em disco extras. O padrão é `false`.

`previousIntermediates`
: Se não for nulo, artefatos de construção intermediários são copiados desta entrada para `dist/build` antes de realizar a compilação. Veja [“Construções incrementais”](#haskell-incremental-builds) para mais informações. O padrão é `null`.

`buildTarget`
: Nome do executável ou biblioteca a ser construído e instalado. Se não definido, todos os alvos disponíveis são construídos e instalados.

### Especificando Dependências {#haskell-derivation-deps}

Como `haskellPackages.mkDerivation` é destinado a ser gerado a partir de arquivos cabal, ele reflete a maneira do cabal de especificar dependências. Por exemplo, as dependências são agrupadas pela parte do pacote a que pertencem. Isso ajuda a reduzir o fechamento de dependência de uma derivação; por exemplo, as dependências de benchmark não são incluídas se `doBenchmark == false`.

`setup*Depends`
: dependências necessárias para compilar `Setup.hs`

`library*Depends`
: dependências de uma biblioteca contida no pacote

`executable*Depends`
: dependências de um executável contido no pacote

`test*Depends`
: dependências de uma suíte de testes contida no pacote

`benchmark*Depends`
: dependências de um benchmark contido no pacote

A outra categorização se relaciona com a forma como o pacote depende da dependência:

`*ToolDepends`
: Ferramentas que precisamos executar como parte do processo de construção. Elas são adicionadas aos `nativeBuildInputs` da derivação.

`*HaskellDepends`
: Bibliotecas Haskell das quais o pacote depende. Elas são adicionadas aos `propagatedBuildInputs`.

`*SystemDepends`
: Bibliotecas não-Haskell das quais o pacote depende. Elas são adicionadas aos `buildInputs`

`*PkgconfigDepends`
: `*SystemDepends` que são descobertas usando `pkg-config`. Elas são adicionadas aos `buildInputs` e é adicionalmente garantido que `pkg-config` esteja disponível no tempo de construção.

`*FrameworkDepends`
: Framework do Apple SDK do qual o pacote depende ao compilá-lo no Darwin.

Usando essas duas distinções, você deve ser capaz de categorizar a maioria das especificações de dependência disponíveis:
`benchmarkFrameworkDepends`,
`benchmarkHaskellDepends`,
`benchmarkPkgconfigDepends`,
`benchmarkSystemDepends`,
`benchmarkToolDepends`,
`executableFrameworkDepends`,
`executableHaskellDepends`,
`executablePkgconfigDepends`,
`executableSystemDepends`,
`executableToolDepends`,
`libraryFrameworkDepends`,
`libraryHaskellDepends`,
`libraryPkgconfigDepends`,
`librarySystemDepends`,
`libraryToolDepends`,
`setupHaskellDepends`,
`testFrameworkDepends`,
`testHaskellDepends`,
`testPkgconfigDepends`,
`testSystemDepends` e
`testToolDepends`.

Isso deixa apenas as seguintes formas extras de especificar dependências:

`buildDepends`
: Permite especificar dependências Haskell que são adicionadas a `propagatedBuildInputs` incondicionalmente.

`buildTools`
: Como `*ToolDepends`, mas são adicionadas a `nativeBuildInputs` incondicionalmente.

`extraLibraries`
: Como `*SystemDepends`, mas são adicionadas a `buildInputs` incondicionalmente.

`pkg-configDepends`
: Como `*PkgconfigDepends`, mas são adicionadas a `buildInputs` incondicionalmente.

`testDepends`
: Descontinuado, use `testHaskellDepends` ou `testSystemDepends`.

`benchmarkDepends`
: Descontinuado, use `benchmarkHaskellDepends` ou `benchmarkSystemDepends`.

Os métodos de especificação de dependência nesta lista que são incondicionais são especialmente úteis ao escrever [substituições](#haskell-overriding-haskell-packages) quando você quer ter certeza de que elas serão definitivamente incluídas. No entanto, é recomendado usar os mais precisos listados acima sempre que possível.

### Atributos Meta {#haskell-derivation-meta}

`haskellPackages.mkDerivation` aceita os seguintes atributos como argumentos diretos que são definidos transparentemente em `meta` da derivação resultante. Veja a [seção de Atributos Meta](#chap-meta) para sua documentação.

*   Estes atributos são preenchidos com um valor padrão se omitidos:
    *   `homepage`: o padrão é a página do Hackage para `pname`.
    *   `platforms`: o padrão é `lib.platforms.all` (já que o GHC pode fazer compilação cruzada)
*   Estes atributos são definidos apenas se fornecidos:
    *   `description`
    *   `license`
    *   `changelog`
    *   `maintainers`
    *   `broken`
    *   `hydraPlatforms`

### Construções Incrementais {#haskell-incremental-builds}

`haskellPackages.mkDerivation` suporta construções incrementais para GHC 9.4 e mais recentes com os argumentos `doInstallIntermediates`, `enableSeparateIntermediatesOutput` e `previousIntermediates`.

A ideia básica é primeiro realizar uma construção completa do pacote em questão, salvar seus produtos de construção intermediários para mais tarde e, em seguida, copiar esses produtos de construção para o diretório de construção de uma construção incremental realizada posteriormente. Então, o GHC usará esses artefatos de construção para evitar recompilar módulos inalterados.

Para mais detalhes sobre como armazenar e usar produtos de construção incrementais, veja a [postagem do blog de Gabriella Gonzalez “Nixpkgs support for incremental Haskell builds”.][incremental-builds] a motivação por trás deste recurso.

Uma construção incremental para [o pacote `turtle`][turtle] pode ser realizada da seguinte forma:

```nix
let
  pkgs = import <nixpkgs> { };
  inherit (pkgs) haskell;
  inherit (haskell.lib.compose) overrideCabal;

  # Construções incrementais funcionam com GHC >=9.4.
  turtle = haskell.packages.ghc944.turtle;

  # Isso fará uma construção completa de `turtle`, enquanto escreve os produtos de construção intermediários
  # (módulos compilados, etc.) para a saída `intermediates`.
  turtle-full-build-with-incremental-output = overrideCabal (drv: {
    doInstallIntermediates = true;
    enableSeparateIntermediatesOutput = true;
  }) turtle;

  # Isso fará uma construção incremental de `turtle` copiando os módulos previamente
  # compilados e produtos de construção intermediários para a árvore de código-fonte
  # antes de executar a construção.
  #
  # O GHC então naturalmente detectará e reutilizará esses produtos, tornando esta construção
  # muito mais rápida do que a anterior.
  turtle-incremental-build = overrideCabal (drv: {
    previousIntermediates = turtle-full-build-with-incremental-output.intermediates;
  }) turtle;
in
turtle-incremental-build
```
## Ambientes de desenvolvimento {#haskell-development-environments}

Além de construir e instalar software Haskell, o Nixpkgs também pode fornecer
ambientes de desenvolvimento para projetos Haskell. Isso tem a óbvia vantagem
de que você se beneficia de `cache.nixos.org` e não precisa mais compilar
todas as dependências do projeto por conta própria. Embora seja frequentemente
muito útil, este não é o caso de uso principal do nosso conjunto de pacotes.
Consulte a seção [versões de pacotes disponíveis](#haskell-available-versions)
para saber quais versões de pacotes fornecemos e a seção
[limitações](#haskell-limitations), para avaliar se um ambiente de
desenvolvimento baseado em `haskellPackages` para o seu projeto é viável.

Por padrão, cada derivação construída usando
[`haskellPackages.mkDerivation`](#haskell-mkderivation) expõe um ambiente
adequado para construí-lo interativamente como o atributo `env`. Por exemplo,
se você tiver um checkout local de `random`, pode entrar em um ambiente de
desenvolvimento para ele assim (se as dependências nas versões de desenvolvimento
e empacotadas corresponderem):

```console
$ cd ~/src/random
$ nix-shell -A haskellPackages.random.env '<nixpkgs>'
[nix-shell:~/src/random]$ ghc-pkg list
/nix/store/a8hhl54xlzfizrhcf03c1l3f6l9l8qwv-ghc-9.2.4-with-packages/lib/ghc-9.2.4/package.conf.d
    Cabal-3.6.3.0
    array-0.5.4.0
    base-4.16.3.0
    binary-0.8.9.0
    …
    ghc-9.2.4
    …
```

Como você pode ver, o ambiente contém um GHC que está configurado para encontrar
todas as dependências de `random`. Observe que este ambiente não espelha o
ambiente usado para construir o pacote, mas é destinado como uma ferramenta
conveniente para desenvolvimento e depuração simples. `env` depende do wrapper
`ghcWithPackages` que injeta automaticamente um package-db pré-preenchido em
cada invocação do GHC. Em contraste, usar `nix-shell -A haskellPackages.random`
não resultará em um ambiente no qual as dependências estão no banco de dados
de pacotes do GHC. Em vez disso, o construtor Haskell passará todas as
dependências explicitamente via flags de configuração.

`env` espelha o ambiente de derivação normal em um aspecto: ele não inclui
ferramentas de desenvolvimento familiares como `cabal-install`, já que
dependemos de `Setup.hs` puro para construir todos os pacotes. No entanto,
`cabal-install` funcionará como esperado se estiver no `PATH` (por exemplo,
quando instalado globalmente e usando um `nix-shell` sem `--pure`). Uma
maneira declarativa e pura de adicionar ferramentas de desenvolvimento
arbitrárias é fornecida via [`shellFor`](#haskell-shellFor).

Ao usar `cabal-install` para resolução de dependências, você precisa ter um
pouco de cuidado para alcançar a pureza da construção. `cabal-install`
encontrará e usará todas as dependências instaladas dos pacotes `env` via Nix,
mas também consultará o Hackage para potencialmente baixar e compilar
dependências se não conseguir encontrar um plano de construção válido
localmente. Para evitar isso, você pode nunca executar `cabal update`,
remover o banco de dados cabal da sua pasta `~/.cabal` ou executar `cabal`
com `--offline`. Observe, no entanto, que para alguns casos de uso,
`cabal2nix` precisa do db local do Hackage.

Muitas vezes você não trabalhará em um pacote que já faz parte de
`haskellPackages` ou Hackage, então primeiro precisamos escrever uma expressão
Nix para obter o ambiente de desenvolvimento. Felizmente, podemos gerar uma
muito facilmente a partir de um arquivo cabal já existente usando `cabal2nix`:

```console
$ ls
my-project.cabal src …
$ cabal2nix ./. > my-project.nix
```

A expressão Nix gerada avalia para uma função pronta para ser
`callPackage`-ada. Por enquanto, podemos adicionar um `default.nix` mínimo
que faz exatamente isso:

```nix
# Retrieve nixpkgs impurely from NIX_PATH for now, you can pin it instead, of course.
{
  pkgs ? import <nixpkgs> { },
}:

# use the nixpkgs default haskell package set
pkgs.haskellPackages.callPackage ./my-project.nix { }
```

Usando `nix-build default.nix` agora podemos construir nosso projeto, mas
também podemos entrar em um shell com todas as dependências do pacote
disponíveis usando `nix-shell -A env default.nix`. Se você tiver
`cabal-install` instalado globalmente, ele funcionará dentro do shell como
esperado.

### shellFor {#haskell-shellFor}

Ter que instalar ferramentas globalmente obviamente não é o ideal,
especialmente se você quiser fornecer um `shell.nix` completo com seu
projeto. Felizmente, existe uma ferramenta adequada para criar ambientes de
desenvolvimento a partir dos ambientes de construção de pacotes: `shellFor`,
uma função exposta por cada conjunto de pacotes haskell. Ela aceita os
seguintes argumentos e retorna uma derivação que é adequada como um ambiente
de desenvolvimento dentro de `nix-shell`:

`packages`
: Este argumento é usado para selecionar os pacotes para os quais construir o
ambiente de desenvolvimento. Deve ser uma função que recebe um conjunto de
pacotes haskell e retorna uma lista de pacotes. `shellFor` passará o conjunto
de pacotes usado para esta função e incluirá todas as dependências do pacote
retornado no ambiente de construção. Isso significa que você pode reutilizar
expressões Nix de pacotes incluídos no nixpkgs, mas também usar expressões Nix
locais como esta: `hpkgs: [ (hpkgs.callPackage ./my-project.nix { }) ]`.

`extraDependencies`
: Dependências extras, na forma de atributos de construção cabal2nix. Um
exemplo de caso de uso é quando você tem scripts Haskell que usam bibliotecas
que não aparecem nas dependências de seus pacotes. Exemplo: `hpkgs:
{libraryHaskellDepends = [ hpkgs.releaser ]}`. O padrão é `hpkgs: { }`.

`nativeBuildInputs`
: Espera uma lista de derivações para adicionar como ferramentas de
construção ao ambiente de construção. Este é o lugar para adicionar pacotes
como `cabal-install`, `doctest` ou `hlint`. O padrão é `[]`.

`buildInputs`
: Espera uma lista de derivações para adicionar como dependências de
biblioteca, como `openssl`. Isso raramente é necessário, pois as expressões
de pacotes haskell geralmente também rastreiam as dependências do sistema. O
padrão é `[]`. (veja também [dependências de derivação](#haskell-derivation-deps))

`withHoogle`
: Se for `true`, `hoogle` será adicionado a `nativeBuildInputs`. Além disso,
seu banco de dados será preenchido com todas as dependências incluídas, para
que você possa pesquisar a documentação de suas dependências. O padrão é `false`.

`genericBuilderArgsModifier`
: Este argumento aceita uma função que permite modificar os argumentos
passados para `mkDerivation` a fim de criar o ambiente de desenvolvimento.
Por exemplo, `args: { doCheck = false; }` faria com que o ambiente não
incluísse nenhuma dependência de teste. O padrão é `lib.id`.

`doBenchmark`
: Este é um atalho para habilitar `doBenchmark` via
`genericBuilderArgsModifier`. Definir como `true` fará com que o ambiente de
desenvolvimento inclua todas as dependências de benchmark que seriam
excluídas por padrão. O padrão é `false`.

Uma propriedade interessante de `shellFor` é que ele permite que você
trabalhe em vários pacotes usando o mesmo ambiente em conjunto com
[arquivos cabal.project][cabal-project-files]. Digamos que nosso exemplo
acima dependa de `distribution-nixpkgs` e tenhamos um arquivo de projeto
configurado para ambos, podemos adicionar a seguinte expressão `shell.nix`:

```nix
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.haskellPackages.shellFor {
  packages = hpkgs: [
    # reuse the nixpkgs for this package
    hpkgs.distribution-nixpkgs
    # call our generated Nix expression manually
    (hpkgs.callPackage ./my-project/my-project.nix { })
  ];

  # development tools we use
  nativeBuildInputs = [
    pkgs.cabal-install
    pkgs.haskellPackages.doctest
    pkgs.cabal2nix
  ];

  # Extra arguments are added to mkDerivation's arguments as-is.
  # Since it adds all passed arguments to the shell environment,
  # we can use this to set the environment variable the `Paths_`
  # module of distribution-nixpkgs uses to search for bundled
  # files.
  # See also: https://cabal.readthedocs.io/en/latest/cabal-package.html#accessing-data-files-from-package-code
  distribution_nixpkgs_datadir = toString ./distribution-nixpkgs;
}
```

<!-- TODO(@sternenseemann): deps are not included if not selected -->

### haskell-language-server {#haskell-language-server}

Para usar o HLS em resumo: Instale `pkgs.haskell-language-server`, por exemplo,
em `nativeBuildInputs` em `shellFor` e use o comando
`haskell-language-server-wrapper` para executá-lo. Consulte o
[guia do usuário do HLS] sobre como configurar seu editor de texto para usar
o HLS e como testar sua configuração.

O HLS precisa ser compilado com a versão do GHC do projeto em que você o usa.

`pkgs.haskell-language-server` fornece os binários
`haskell-language-server-wrapper`, `haskell-language-server` e
`haskell-language-server-x.x.x`, onde `x.x.x` é a versão do GHC para a qual
ele é compilado. Por padrão, ele inclui apenas binários para a versão atual
do GHC, para reduzir o tamanho do closure. O tamanho do closure é grande,
porque o HLS precisa ser vinculado dinamicamente para funcionar de forma
confiável. Você pode substituir a lista de versões GHC suportadas com, por
exemplo:

```nix
pkgs.haskell-language-server.override {
  supportedGhcVersions = [
    "90"
    "94"
  ];
}
```
Onde todas as strings `version` são permitidas, de modo que
`haskell.packages.ghc${version}` seja um conjunto de pacotes existente.

Quando você executa `haskell-language-server-wrapper`, ele detectará a
versão do GHC usada pelo projeto em que você está trabalhando (perguntando,
por exemplo, ao cabal ou stack) e escolherá o binário versionado apropriado
do seu PATH.

Tenha cuidado ao instalar o HLS globalmente e usar um nixpkgs fixado para um
projeto Haskell em um `nix-shell`. Se as versões do nixpkgs divergirem muito
(por exemplo, usarem versões diferentes do `glibc`), o executável
`haskell-language-server-?.?.?` tentará detectar essas situações e se
recusará a iniciar. Recomenda-se obter o HLS via `nix-shell` da versão do
nixpkgs fixada lá.

O atributo de nível superior `pkgs.haskell-language-server` é apenas um
wrapper de conveniência para possibilitar a instalação do HLS para várias
versões do GHC ao mesmo tempo. Se você sabe que usa apenas uma versão do GHC,
por exemplo, em um `nix-shell` específico do projeto, você pode usar
`pkgs.haskellPackages.haskell-language-server` ou
`pkgs.haskell.packages.*.haskell-language-server` do conjunto de pacotes que
você usa.

Se você usa `nix-shell` para seus ambientes de desenvolvimento, lembre-se de
iniciar seu editor nesse ambiente. Você pode querer usar algo como `direnv`
e/ou um plugin de editor para conseguir isso.

## Sobrescrevendo pacotes Haskell {#haskell-overriding-haskell-packages}

### Sobrescrevendo um único pacote {#haskell-overriding-a-single-package}

<!-- TODO(@sternenseemann): we should document /somewhere/ that base == null etc. -->

Como muitos subsistemas específicos de linguagem no nixpkgs, a infraestrutura
Haskell também tem suas próprias peculiaridades quando se trata de
sobrescrever. A sobrescrita das *entradas* para um pacote segue pelo menos o
procedimento padrão. Por exemplo, imagine que você precise construir
`nix-tree` com uma versão mais recente de `brick` do que a padrão fornecida
por `haskellPackages`:

```nix
haskellPackages.nix-tree.override { brick = haskellPackages.brick_0_67; }
```

<!-- TODO(@sternenseemann): This belongs in the next section
One common problem you may run into with such an override is the build failing
with “abort because of serious configure-time warning from Cabal”. When scrolling
up, you'll usually notice that Cabal noticed that more than one versions of the same
package was present in the dependency graph. This typically causes a later compilation
failure (the error message `haskellPackages.mkDerivation` produces tries to save
you the time of finding this out yourself, but if you wish to do so, you can
disable it using `allowInconsistentDependencies`). Luckily, `haskellPackages` provides
you with a tool to deal with this. `overrideScope` creates a new `haskellPackages`
instance with the override applied *globally* for this package, so the dependency
closure automatically uses a consistent version of the overridden package. E. g.
if `haskell-ci` needs a recent version of `Cabal`, but also uses other packages
that depend on that library, you may want to use:

```nix
haskellPackages.haskell-ci.overrideScope (self: super: {
  Cabal = self.Cabal_3_14_2_0;
})
```

-->

A interface personalizada entra em jogo quando você deseja sobrescrever os
argumentos passados para `haskellPackages.mkDerivation`. Para isso, a função
`overrideCabal` de `haskell.lib.compose` é usada. Por exemplo, se você
deseja instalar uma página de manual que é distribuída com o pacote, você
pode fazer algo assim:

```nix
haskell.lib.compose.overrideCabal (drv: {
  postInstall = ''
    ${drv.postInstall or ""}
    install -Dm644 man/pnbackup.1 -t $out/share/man/man1
  '';
}) haskellPackages.pnbackup
```

`overrideCabal` aceita dois argumentos:

1. Uma função que recebe todos os argumentos passados para
   `haskellPackages.mkDerivation` antes e retorna um conjunto de argumentos
   para substituir (ou adicionar) com um novo valor.
2. A derivação Haskell a ser sobrescrita.

Os argumentos são ordenados para que você possa criar facilmente funções
auxiliares usando currying:

```nix
let
  installManPage = haskell.lib.compose.overrideCabal (drv: {
    postInstall = ''
      ${drv.postInstall or ""}
      install -Dm644 man/${drv.pname}.1 -t "$out/share/man/man1"
    '';
  });

in
installManPage haskellPackages.pnbackup
```

Na verdade, `haskell.lib.compose` já fornece muitos auxiliares úteis para
tarefas comuns, detalhados na próxima seção. Eles também são estruturados de
forma que podem ser combinados usando `lib.pipe`:

```nix
lib.pipe my-haskell-package [
  # lift version bounds on dependencies
  haskell.lib.compose.doJailbreak
  # disable building the haddock documentation
  haskell.lib.compose.dontHaddock
  # pass extra package flag to Cabal's configure step
  (haskell.lib.compose.enableCabalFlag "myflag")
]
```

#### `haskell.lib.compose` {#haskell-haskell.lib.compose}

A interface base para todas as sobrescritas é a seguinte função:

`overrideCabal f drv`
: Pega os argumentos passados para obter `drv` para `f` e usa o conjunto de
atributos resultante para atualizar o conjunto de argumentos. Em seguida, uma
versão recomputada de `drv` usando o novo conjunto de argumentos é retornada.

<!--
TODO(@sternenseemann): ideally we want to be more detailed here as well, but
I want to avoid the documentation having to be kept in sync in too many places.
We already document this stuff in the mkDerivation section and lib/compose.nix.
Ideally this section would be generated from the latter in the future.
-->

Todas as outras funções auxiliares são implementadas em termos de
`overrideCabal` e tornam as sobrescritas comuns mais curtas e as mais
complicadas triviais. As sobrescritas simples que alteram apenas um único
argumento são descritas muito brevemente na visão geral a seguir. Consulte a
[documentação de `haskellPackages.mkDerivation`](#haskell-mkderivation) para
uma descrição mais detalhada dos efeitos dos respectivos argumentos.

##### Auxiliares de Empacotamento {#haskell-packaging-helpers}

`overrideSrc { src, version } drv`
: Substitui a fonte usada para construir `drv` pelo caminho ou derivação
fornecida como `src`. O atributo `version` é opcional. Prefira esta função
em vez de sobrescrever `src` via `overrideCabal`, pois ela também cuida
automaticamente da remoção de quaisquer revisões do Hackage.

<!-- TODO(@sternenseemann): deprecated

`generateOptparseApplicativeCompletions list drv`
: Generate and install shell completion files for the installed executables whose
names are given via `list`. The executables need to be using `optparse-applicative`
for this to work.
-->

`justStaticExecutables drv`
: Constrói e instala apenas os executáveis produzidos por `drv`, removendo
tudo o que possa se referir a caminhos de armazenamento de outros pacotes
Haskell (como bibliotecas e documentação). Isso reduz drasticamente o tamanho
do closure da derivação resultante. Observe que os executáveis são vinculados
estaticamente apenas às suas dependências Haskell, mas ainda se vincularão
dinamicamente a libc, GMP e outras dependências de bibliotecas do sistema.

  Se uma biblioteca ou suas dependências usarem seu módulo `Paths_*` gerado
  pelo Cabal, isso pode não funcionar tão bem se a eliminação de código morto
  do GHC for incapaz de remover as referências aos caminhos de armazenamento
  da dependência que o módulo contém. Como consequência, uma referência não
  utilizada pode ser criada do binário estático para tal caminho de
  armazenamento de _biblioteca_. (Consulte [nixpkgs#164630][164630] para mais
  informações.)

  Importar o módulo `Paths_*` pode fazer com que as construções falhem com
  esta mensagem:

  ```
  error: output '/nix/store/64k8iw0ry76qpijsnl9v87fb26v28z8-my-haskell-package-1.0.0.0' is not allowed to refer to the following paths:
           /nix/store/5q5s4a07gaz50h04zpfbda8xjs8wrnhg-ghc-9.6.3
  ```

  Se isso acontecer, primeiro desabilite a verificação de referências GHC e
  reconstrua a derivação:

  ```nix
  pkgs.haskell.lib.overrideCabal (pkgs.haskell.lib.justStaticExecutables my-haskell-package) (drv: {
    disallowGhcReference = false;
  })
  ```

  Em seguida, use `strings` para determinar quais bibliotecas são
  responsáveis:

  ```
  $ nix-build ...
  $ strings result/bin/my-haskell-binary | grep /nix/store/
  ...
  /nix/store/n7ciwdlg8yyxdhbrgd6yc2d8ypnwpmgq-hs-opentelemetry-sdk-0.0.3.6/bin
  ...
  ```

  Finalmente, use `remove-references-to` para excluir esses caminhos de
  armazenamento da saída produzida:

  ```nix
  pkgs.haskell.lib.overrideCabal (pkgs.haskell.lib.justStaticExecutables my-haskell-package) (drv: {
    postInstall = ''
      ${drv.postInstall or ""}
      remove-references-to -t ${pkgs.haskellPackages.hs-opentelemetry-sdk}
    '';
  })
  ```

[164630]: https://github.com/NixOS/nixpkgs/issues/164630

`enableSeparateBinOutput drv`
: Instala os executáveis produzidos por `drv` em uma saída `bin` separada.
Isso tem um efeito semelhante a `justStaticExecutables`, mas preserva as
bibliotecas e a documentação na saída `out` junto com a saída `bin` com um
tamanho de closure muito menor.

`markBroken drv`
: Define a flag `broken` como `true` para `drv`.

`markUnbroken drv`, `unmarkBroken drv`
: Define a flag `broken` como `false` para `drv`.

`doDistribute drv`
: Atualiza `hydraPlatforms` para que o Hydra construa `drv`. Isso é
às vezes necessário ao trabalhar com pacotes versionados em
`haskellPackages` que não são construídos por padrão.

`dontDistribute drv`
: Define `hydraPlatforms` como `[]`, fazendo com que o Hydra ignore este
pacote completamente. Útil se ele falhar ao avaliar corretamente e estiver
causando ruído na aba de erros de avaliação no Hydra.

##### Auxiliares de Desenvolvimento {#haskell-development-helpers}

`sdistTarball drv`
: Cria um tarball de distribuição de fonte como os encontrados no Hackage
em vez de construir o pacote `drv`.

`documentationTarball drv`
: Cria um tarball de documentação adequado para upload no Hackage
em vez de construir o pacote `drv`.

`buildFromSdist drv`
: Usa `sdistTarball drv` como fonte para compilar `drv`. Isso ajuda a
detectar bugs de empacotamento ao construir a partir de um diretório local,
por exemplo, quando arquivos necessários estão faltando em `extra-source-files`.

`failOnAllWarnings drv`
: Habilita todos os avisos que o GHC suporta e faz com que a construção
falhe se algum deles for emitido.

<!-- TODO(@sternenseemann):
`checkUnusedPackages opts drv`
: Adds an extra check to `postBuild` which fails the build if any dependency
taken as an input is not used. The `opts` attribute set allows relaxing this
check.
-->

`enableDWARFDebugging drv`
: Compila o pacote com símbolos de depuração adicionais habilitados, útil
para depuração com, por exemplo, `gdb`.

`doStrip drv`
: Define `doStrip` como `true` para `drv`.

`dontStrip drv`
: Define `doStrip` como `false` para `drv`.

<!-- TODO(@sternenseemann): shellAware -->

##### Auxiliares Triviais {#haskell-trivial-helpers}

`doJailbreak drv`
: Define o argumento `jailbreak` como `true` para `drv`.

`dontJailbreak drv`
: Define o argumento `jailbreak` como `false` para `drv`.

`doHaddock drv`
: Define `doHaddock` como `true` para `drv`.

`dontHaddock drv`
: Define `doHaddock` como `false` para `drv`. Útil se a construção de um
pacote estiver falhando devido, por exemplo, a um erro de sintaxe na
documentação Haddock.

`doHyperlinkSource drv`
: Define `hyperlinkSource` como `true` para `drv`.

`dontHyperlinkSource drv`
: Define `hyperlinkSource` como `false` para `drv`.

`doCheck drv`
: Define `doCheck` como `true` para `drv`.

`dontCheck drv`
: Define `doCheck` como `false` para `drv`. Útil se um pacote tiver um
conjunto de testes quebrado, instável ou problemático que esteja quebrando a
construção.

`dontCheckIf condition drv`
: Define `doCheck` como `false` para `drv`, mas apenas se `condition` se
aplicar. Caso contrário, é uma operação nula. Útil para desabilitar
condicionalmente testes para um pacote sem interferir com sobrescritas
anteriores ou valores padrão.

<!-- Purposefully omitting the non-list variants here. They are a bit
ugly, and we may want to deprecate them at some point. -->

`appendConfigureFlags list drv`
: Adiciona as strings em `list` ao argumento `configureFlags` para `drv`.

`enableCabalFlag flag drv`
: Garante que a flag Cabal `flag` esteja habilitada na etapa de configuração
do Cabal.

`disableCabalFlag flag drv`
: Garante que a flag Cabal `flag` esteja desabilitada na etapa de
configuração do Cabal.

`appendBuildFlags list drv`
: Adiciona as strings em `list` ao argumento `buildFlags` para `drv`.

<!-- TODO(@sternenseemann): removeConfigureFlag -->

`appendPatches list drv`
: Adiciona a `list` de derivações ou caminhos ao argumento `patches` para `drv`.

<!-- TODO(@sternenseemann): link dep section -->

`addBuildTools list drv`
: Adiciona a `list` de derivações ao argumento `buildTools` para `drv`.

`addExtraLibraries list drv`
: Adiciona a `list` de derivações ao argumento `extraLibraries` para `drv`.

`addBuildDepends list drv`
: Adiciona a `list` de derivações ao argumento `buildDepends` para `drv`.

`addTestToolDepends list drv`
: Adiciona a `list` de derivações ao argumento `testToolDepends` para `drv`.

`addPkgconfigDepends list drv`
: Adiciona a `list` de derivações ao argumento `pkg-configDepends` para `drv`.

`addSetupDepends list drv`
: Adiciona a `list` de derivações ao argumento `setupHaskellDepends` para `drv`.

`doBenchmark drv`
: Define `doBenchmark` como `true` para `drv`. Útil se seu ambiente de
desenvolvimento estiver faltando as dependências necessárias para compilar o
componente de benchmark.

`dontBenchmark drv`
: Define `doBenchmark` como `false` para `drv`.

`setBuildTargets drv list`
: Define o argumento `buildTarget` para `drv` para que os alvos especificados
em `list` sejam construídos.

`doCoverage drv`
: Define o argumento `doCoverage` como `true` para `drv`.

`dontCoverage drv`
: Define o argumento `doCoverage` como `false` para `drv`.

`enableExecutableProfiling drv`
: Define o argumento `enableExecutableProfiling` como `true` para `drv`.

`disableExecutableProfiling drv`
: Define o argumento `enableExecutableProfiling` como `false` para `drv`.

`enableLibraryProfiling drv`
: Define o argumento `enableLibraryProfiling` como `true` para `drv`.

`disableLibraryProfiling drv`
: Define o argumento `enableLibraryProfiling` como `false` para `drv`.

`disableParallelBuilding drv`
: Define o argumento `enableParallelBuilding` como `false` para `drv`.

#### Funções de biblioteca nos conjuntos de pacotes Haskell {#haskell-package-set-lib-functions}

Algumas funções de biblioteca dependem de pacotes dos conjuntos de pacotes
Haskell. Assim, elas são expostas a partir desses em vez de
`haskell.lib.compose`, que só pode acessar o que é passado diretamente a ele.
Ao usar as funções abaixo, certifique-se de obtê-las do mesmo conjunto de
pacotes (`haskellPackages`, `haskell.packages.ghc944` etc.) que os pacotes
com os quais você está trabalhando ou – ainda melhor – do ponto fixo
`self`/`final` do seu overlay para `haskellPackages`.

Nota: Algumas funções como `shellFor` que não são destinadas a sobrescrever
por si só, são omitidas nesta seção. <!-- TODO(@sternenseemann): note about ifd section -->

`cabalSdist { src, name ? ... }`
: Gera o tarball sdist do Cabal para `src`, adequado para upload no Hackage.
Ao contrário de `haskell.lib.compose.sdistTarball`, ele usa `cabal-install`
em vez de `Setup.hs`, então geralmente é mais rápido: Nenhuma dependência de
construção precisa ser baixada, e podemos pular a compilação de `Setup.hs`.

`buildFromCabalSdist drv`
: Constrói `drv`, mas executa seu atributo `src` através de `cabalSdist`
primeiro. Útil para detectar arquivos necessários para a compilação que
estão faltando no sdist.

`generateOptparseApplicativeCompletions list drv`
: Gera e instala arquivos de conclusão de shell para os executáveis
instalados cujos nomes são fornecidos via `list`. Os executáveis precisam
estar usando `optparse-applicative` para [isso funcionar][optparse-applicative-completions].
Observe que este recurso é automaticamente desabilitado durante a
compilação cruzada, pois requer a execução dos binários em questão.
## Auxiliares de Import-from-Derivation {#haskell-import-from-derivation}

### cabal2nix {#haskell-cabal2nix}

[`cabal2nix`][cabal2nix] pode gerar definições de pacotes Nix para pacotes Haskell arbitrários usando [import from derivation][import-from-derivation].
`cabal2nix` irá gerar expressões Nix que se parecem com isto:

```nix
# cabal get mtl-2.2.1 && cd mtl-2.2.1 && cabal2nix .
{
  mkDerivation,
  base,
  lib,
  transformers,
}:
mkDerivation {
  pname = "mtl";
  version = "2.2.1";
  src = ./.;
  libraryHaskellDepends = [
    base
    transformers
  ];
  homepage = "http://github.com/ekmett/mtl";
  description = "Monad classes, using functional dependencies";
  license = lib.licenses.bsd3;
}
```

Esta expressão deve ser chamada com `haskellPackages.callPackage`, que fornecerá [`haskellPackages.mkDerivation`](#haskell-mkderivation) e as dependências Haskell como argumentos.

`callCabal2nix name src args`
: Cria um pacote chamado `name` a partir da derivação de origem `src` usando `cabal2nix`.

  `args` são argumentos extras fornecidos a `haskellPackages.callPackage`.

`callCabal2nixWithOptions name src opts args`
: Cria um pacote chamado `name` a partir da derivação de origem `src` usando `cabal2nix`.

  `opts` são opções extras para chamar `cabal2nix`. Se `opts` for uma string, ela será usada como argumentos extras de linha de comando para `cabal2nix`, por exemplo, `--subpath path/to/dir/containing/cabal-file`. Caso contrário, `opts` deve ser um AttrSet que pode conter os seguintes atributos:

  `extraCabal2nixOptions`
  : Argumentos extras de linha de comando para `cabal2nix`.

  `srcModifier`
  : Uma função que é usada para modificar o `src` fornecido em vez do filtro padrão.

    O filtro de origem padrão removerá todos os arquivos de `src`, exceto os arquivos `.cabal` e `package.yaml`.

<!--

`callHackage`
: TODO

`callHackageDirect`
: TODO

`developPackage`
: TODO

-->

<!--

TODO(@NixOS/haskell): finish these planned sections
### Overriding the entire package set

## Contributing {#haskell-contributing}

### Fixing a broken package {#haskell-fixing-a-broken-package}

### Package set generation {#haskell-package-set-generation}

### Packaging a Haskell project

### Backporting {#haskell-backporting}

Backporting changes to a stable NixOS version in general is covered
in nixpkgs' `CONTRIBUTING.md` in general. In particular refer to the
[backporting policy](https://github.com/NixOS/nixpkgs/blob/master/CONTRIBUTING.md#criteria-for-backporting-changes)
to check if the change you have in mind may be backported.

This section focuses on how to backport a package update (e.g. a
bug fix or security release). Fixing a broken package works like
it does for the unstable branches.

-->

## Perguntas Frequentes {#haskell-faq}

### Por que o tópico X não está coberto nesta seção? Por que a seção Y está faltando? {#haskell-why-not-covered}

Temos trabalhado em [mover a documentação Haskell do nixpkgs de volta para o manual do nixpkgs](https://github.com/NixOS/nixpkgs/issues/121403). <!-- krank:ignore-line -->
Como este processo ainda não foi concluído, você pode encontrar alguns tópicos ausentes aqui, mas cobertos na antiga [documentação do haskell4nix](https://haskell4nix.readthedocs.io/).

Se você sentir que algum tópico importante não está documentado, sinta-se à vontade para comentar na issue linkada acima.

### Como habilitar ou desabilitar compilações de profiling globalmente? {#haskell-faq-override-profiling}

Por padrão, o Nixpkgs compila uma versão de profiling de cada biblioteca Haskell. A exceção a esta regra são algumas plataformas onde ela é desabilitada devido a preocupações com o tamanho da saída. Você pode querer…

* …habilitar o profiling globalmente para que você possa compilar um projeto no qual está trabalhando com capacidade de profiling, fornecendo insights sobre o tempo gasto em seu código e no código do qual você depende, usando o [recurso de profiling do GHC][profiling].

* …desabilitar o profiling (globalmente) para reduzir o tempo gasto na compilação das versões de profiling de bibliotecas, nas quais uma quantidade significativa de tempo de compilação é gasta (embora não sejam tão caras quanto a compilação "normal" de uma biblioteca Haskell).

::: {.note}
O método descrito abaixo afeta a compilação de todas as bibliotecas no respectivo conjunto de pacotes Haskell, bem como o GHC. Se suas escolhas diferirem do padrão do Nixpkgs para sua plataforma (host), você perderá a capacidade de substituir do cache binário oficial.

Se você está preocupado com os tempos de compilação e, portanto, deseja desabilitar o profiling, provavelmente faz sentido usar `haskell.lib.compose.disableLibraryProfiling` (veja [](#haskell-trivial-helpers)) nos pacotes que você está compilando localmente, enquanto continua a substituir suas dependências e o GHC.
:::

Como precisamos alterar as configurações de profiling para o conjunto de pacotes Haskell desejado _e_ o GHC (já que as bibliotecas principais como `base`, `filepath` etc. são empacotadas com o GHC), é recomendado usar overlays para o Nixpkgs para alterá-las.
Como as partes inter-relacionadas, ou seja, o conjunto de pacotes e o GHC, estão conectadas através do fixpoint do Nixpkgs, precisamos modificá-las de uma forma que preserve sua conexão (ou então teríamos que configurá-las novamente manualmente). Isso é alcançado alterando o GHC e o conjunto de pacotes em overlays separados para evitar que o conjunto de pacotes puxe o GHC de `prev`.

O resultado são dois overlays como os mostrados abaixo. As partes ajustáveis são anotadas com comentários, assim como quaisquer formas opcionais ou alternativas de alcançar as configurações de profiling desejadas sem causar muitas reconstruções.

<!-- TODO(@sternenseemann): buildHaskellPackages != haskellPackages with this overlay,
affected by https://github.com/NixOS/nixpkgs/issues/235960 which needs to be fixed
properly still.
-->

```nix
let
  # Nome do compilador e do conjunto de pacotes que você deseja alterar. Se você estiver usando
  # o conjunto de pacotes padrão `haskellPackages`, você precisa verificar qual versão
  # do GHC ele usa atualmente (note que isso está sujeito a alterações).
  ghcName = "ghc910";
  # Nova configuração desejada
  enableProfiling = true;

in
[
  # O primeiro overlay modifica a derivação do GHC para que ele compile ou não
  # versões de profiling das bibliotecas principais empacotadas com ele. É
  # recomendado usar tal overlay apenas se você estiver habilitando o profiling em uma
  # plataforma que não o faz por padrão, porque compilar o GHC do zero é
  # bastante caro.
  (
    final: prev:
    let
      inherit (final) lib;

    in
    {
      haskell = prev.haskell // {
        compiler = prev.haskell.compiler // {
          ${ghcName} = prev.haskell.compiler.${ghcName}.override {
            # Infelizmente, a configuração do GHC tem um nome diferente por razões históricas
            enableProfiledLibs = enableProfiling;
          };
        };
      };
    }
  )

  (
    final: prev:
    let
      inherit (final) lib;
      haskellLib = final.haskell.lib.compose;

    in
    {
      haskell = prev.haskell // {
        packages = prev.haskell.packages // {
          ${ghcName} = prev.haskell.packages.${ghcName}.override {
            overrides = hfinal: hprev: {
              mkDerivation =
                args:
                hprev.mkDerivation (
                  args
                  // {
                    # Como estamos impondo nossas ideias ao mkDerivation, esta mudança irá
                    # afetar todos os pacotes no conjunto de pacotes.
                    enableLibraryProfiling = enableProfiling;

                    # Para realmente usar o profiling em um executável, o profiling de executáveis
                    # precisa ser habilitado para o executável que você deseja perfilar. Você
                    # pode fazer isso globalmente ou…
                    enableExecutableProfiling = enableProfiling;
                  }
                );

              # …apenas para o pacote que contém um executável que você deseja perfilar.
              # Isso economiza reconstruções desnecessárias para pacotes dos quais você depende
              # apenas por sua biblioteca, mas que também contêm executáveis (por exemplo, pandoc).
              my-executable = haskellLib.enableExecutableProfiling hprev.my-executable;

              # Se você está desabilitando o profiling para economizar tempo de compilação, mas deseja
              # manter a capacidade de substituir do cache binário. Remova o
              # override para mkDerivation acima e, em vez disso, tenha um override como
              # este para os pacotes específicos que você está compilando localmente e deseja
              # tornar mais baratos de compilar.
              my-library = haskellLib.disableLibraryProfiling hprev.my-library;
            };
          };
        };
      };
    }
  )
]
```

<!-- TODO(@sternenseemann): write overriding mkDerivation, overriding GHC, and
overriding the entire package set sections and link to them from here where
relevant.
-->

[Stackage]: https://www.stackage.org
[cabal-project-files]: https://cabal.readthedocs.io/en/latest/cabal-project.html
[cabal2nix]: https://github.com/nixos/cabal2nix
[cpphs]: https://Hackage.haskell.org/package/cpphs
[haddock-hoogle-option]: https://haskell-haddock.readthedocs.io/en/latest/invoking.html#cmdoption-hoogle
[haddock-hyperlinked-source-option]: https://haskell-haddock.readthedocs.io/en/latest/invoking.html#cmdoption-hyperlinked-source
[haddock]: https://www.haskell.org/haddock/
[haskell-program-coverage]: https://downloads.haskell.org/~ghc/latest/docs/html/users_guide/profiling.html#observing-code-coverage
[haskell.nix]: https://input-output-hk.github.io/haskell.nix/index.html
[HLS user guide]: https://haskell-language-server.readthedocs.io/en/latest/configuration.html#configuring-your-editor
[hoogle]: https://wiki.haskell.org/Hoogle
[incremental-builds]: https://www.haskellforall.com/2022/12/nixpkgs-support-for-incremental-haskell.html
[jailbreak-cabal]: https://github.com/NixOS/jailbreak-cabal/
[multiple-outputs]: https://nixos.org/manual/nixpkgs/stable/#chap-multiple-output
[optparse-applicative-completions]: https://github.com/pcapriotti/optparse-applicative/blob/7726b63796aa5d0df82e926d467f039b78ca09e2/README.md#bash-zsh-and-fish-completions
[profiling-detail]: https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-profiling-detail
[profiling]: https://downloads.haskell.org/~ghc/latest/docs/html/users_guide/profiling.html
[search.nixos.org]: https://search.nixos.org
[turtle]: https://hackage.haskell.org/package/turtle
[import-from-derivation]: https://nixos.org/manual/nix/stable/language/import-from-derivation