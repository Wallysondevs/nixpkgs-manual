# JavaScript {#language-javascript}

## Introdução {#javascript-introduction}

Isto contém instruções sobre como empacotar aplicações JavaScript.

As várias ferramentas disponíveis serão listadas na [visão geral das ferramentas](#javascript-tools-overview).
Alguns princípios gerais para empacotamento seguirão.
Finalmente, algumas instruções específicas de ferramentas serão fornecidas.

## Desbloqueando / encontrando exemplos de código {#javascript-finding-examples}

Se você sentir que está sem inspiração para empacotar aplicações JavaScript, os links abaixo podem ser úteis.
Pesquisar online por trabalhos anteriores pode ser útil se você estiver encontrando problemas já resolvidos.

### GitHub {#javascript-finding-examples-github}

- Pesquisando arquivos Nix por `yarnConfigHook`: <https://github.com/search?q=yarnConfigHook+language%3ANix&type=code>
- Pesquisando apenas arquivos `flake.nix` por `yarnConfigHook`: <https://github.com/search?q=yarnConfigHook+path%3A**%2Fflake.nix&type=code>

### GitLab {#javascript-finding-examples-gitlab}

- Pesquisando arquivos Nix por `yarnConfigHook`: <https://gitlab.com/search?scope=blobs&search=yarnConfigHook+extension%3Anix>
- Pesquisando apenas arquivos `flake.nix` por `yarnConfigHook`: <https://gitlab.com/search?scope=blobs&search=yarnConfigHook+filename%3Aflake.nix>

## Visão geral das ferramentas {#javascript-tools-overview}

## Princípios gerais {#javascript-general-principles}

Os seguintes princípios são apresentados em ordem de importância, com possíveis exceções.

### Tente usar a mesma versão do node usada upstream {#javascript-upstream-node-version}

Frequentemente não é documentado qual versão do node é usada upstream, mas se for, tente usar a mesma versão ao empacotar.

Isso pode ser um problema se o upstream estiver usando a versão mais recente e você estiver tentando usar uma versão anterior do node.
Alguns erros crípticos relacionados ao V8 podem aparecer.

### Tente respeitar o gerenciador de pacotes originalmente usado upstream (e use o arquivo de lock upstream) {#javascript-upstream-package-manager}

Um arquivo de lock (package-lock.json, yarn.lock...) deve tornar as instalações de `node_modules` reproduzíveis para cada ferramenta.

As diretrizes dos gerenciadores de pacotes recomendam commitar esses arquivos de lock nos repositórios.
Se um arquivo de lock específico estiver presente, é uma forte indicação de qual gerenciador de pacotes é usado upstream.

É melhor tentar usar uma ferramenta Nix que entenda o arquivo de lock.
Usar uma ferramenta diferente pode gerar um erro difícil de entender porque pacotes diferentes foram instalados.

Usar uma ferramenta diferente força você a commitar um arquivo de lock no repositório.
Esses arquivos são bastante grandes, então, ao empacotar para nixpkgs, essa abordagem não escala bem.

Exceções a esta regra são:

- Quando você encontrar um dos bugs de uma ferramenta Nix. Em cada uma das instruções específicas da ferramenta, problemas conhecidos serão detalhados. Se você tiver um problema com uma ferramenta específica, é melhor tentar outra ferramenta, mesmo que isso signifique que você terá que recriar um arquivo de lock e committá-lo para Nixpkgs.
- Alguns arquivos de lock contêm uma versão particular de um pacote que foi removido do npm por algum motivo. Nesse caso, você pode recriar o lock upstream (removendo o original e `npm install`, `yarn`, ...) e committar isso para nixpkgs.

### Tente usar o package.json upstream {#javascript-upstream-package-json}

Exceções a esta regra são:

- Às vezes, o repositório upstream assume que algumas dependências devem ser instaladas globalmente. Nesse caso, você pode adicioná-las manualmente ao `package.json` upstream (`yarn add xxx` ou `npm install xxx`, ...). Dependências instaladas localmente podem ser executadas com `npx` para ferramentas CLI (por exemplo, `npx postcss ...`, é assim que você pode chamar essas dependências nas fases).
- Às vezes, há um conflito de versão entre alguns requisitos de dependência. Nesse caso, você pode fixar uma versão removendo o `^`.
- Às vezes, o script definido no package.json não funciona como está. Alguns scripts, por exemplo, usam ferramentas CLI que podem não estar disponíveis, ou `cd` em um diretório com um package.json diferente (para workspaces, notavelmente). Nesse caso, é perfeitamente aceitável analisar o que o script específico está fazendo e dividi-lo nas fases. No script de build, você pode ver `build:*` chamando, por sua vez, vários outros scripts de build como `build:ui` ou `build:server`. Se um deles falhar, você pode tentar separá-los em,

  ```sh
  yarn build:ui
  yarn build:server
  # OR
  npm run build:ui
  npm run build:server
  ```

  quando você precisar sobrescrever um package.json. É bom usar o da fonte upstream e fazer uma sobrescrita explícita. Aqui está um exemplo:

  ```nix
  {
    patchedPackageJSON = final.runCommand "package.json" { } ''
      ${jq}/bin/jq '.version = "0.4.0" |
        .devDependencies."@jsdoc/cli" = "^0.2.5"
        ${sonar-src}/package.json > $out
    '';
  }
  ```

  Você ainda precisará commitar a versão modificada dos arquivos de lock, mas pelo menos as sobrescritas são explícitas para todos verem.

### Usando node_modules diretamente {#javascript-using-node_modules}

Cada ferramenta possui uma abstração para apenas construir o diretório node_modules (dependências).
Você sempre pode usar o `stdenv.mkDerivation` com o node_modules para construir o pacote (criar um symlink para o diretório node_modules e então usar o comando de build do pacote).
A abstração node_modules também pode ser usada para construir alguns frontends de frameworks web.
Para um exemplo disso, veja como [plausible](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pl/plausible/package.nix) é construído.
Então, ao construir o frontend, você pode simplesmente criar um symlink para o diretório node_modules.

## Instruções específicas da ferramenta {#javascript-tool-specific}

### buildNpmPackage {#javascript-buildNpmPackage}

`buildNpmPackage` permite empacotar projetos baseados em npm no Nixpkgs sem o uso de um arquivo de dependências auto-gerado.
Ele funciona utilizando a funcionalidade de cache do npm -- criando um cache reproduzível que contém as dependências de um projeto e apontando o npm para ele.

Aqui está um exemplo:

```nix
{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
}:

buildNpmPackage (finalAttrs: {
  pname = "flood";
  version = "4.7.0";

  src = fetchFromGitHub {
    owner = "jesec";
    repo = "flood";
    tag = "v${finalAttrs.version}";
    hash = "sha256-BR+ZGkBBfd0dSQqAvujsbgsEPFYw/ThrylxUbOksYxM=";
  };

  npmDepsHash = "sha256-tuEfyePwlOy2/mOPdXbqJskO6IowvAP4DWg8xSZwbJw=";

  # The prepack script runs the build script, which we'd rather do in the build phase.
  npmPackFlags = [ "--ignore-scripts" ];

  NODE_OPTIONS = "--openssl-legacy-provider";

  meta = {
    description = "Modern web UI for various torrent clients with a Node.js backend and React frontend";
    homepage = "https://flood.js.org";
    license = lib.licenses.gpl3Only;
    maintainers = with lib.maintainers; [ winter ];
  };
})
```

Na `installPhase` padrão definida por `buildNpmPackage`, ele usa `npm pack --json --dry-run` para decidir quais arquivos instalar em `$out/lib/node_modules/$name/`, onde `$name` é a string `name` definida no `package.json` do pacote.
Além disso, as chaves `bin` e `man` no `package.json` da fonte são usadas para decidir quais binários e páginas de manual devem ser instalados.
Se estes não forem definidos, `npm pack` pode perder alguns arquivos, e nenhum binário será produzido.

#### Argumentos {#javascript-buildNpmPackage-arguments}

*   `npmDepsHash`: O hash de saída das dependências para este projeto. Pode ser calculado antecipadamente com [`prefetch-npm-deps`](#javascript-buildNpmPackage-prefetch-npm-deps).
*   `makeCacheWritable`: Se deve tornar o cache gravável antes de instalar as dependências. Não defina isso a menos que o npm tente gravar no diretório de cache, pois isso pode atrasar a construção.
*   `npmBuildScript`: O script a ser executado para construir o projeto. O padrão é `"build"`.
*   []{#javascript-buildNpmPackage-npmWorkspace} `npmWorkspace`: O diretório do workspace dentro do projeto a ser construído e instalado.
*   `dontNpmBuild`: Opção para desabilitar a execução do script de build. Defina como `true` se o pacote não tiver um script de build. O padrão é `false`. Alternativamente, definir `buildPhase` explicitamente também desabilita isso.
*   `dontNpmInstall`: Opção para desabilitar a execução de `npm install`. O padrão é `false`. Alternativamente, definir `installPhase` explicitamente também desabilita isso.
*   []{#javascript-buildNpmPackage-npmFlags} `npmFlags`: Flags a serem passadas para todos os comandos npm.
*   `npmInstallFlags`: Flags a serem passadas para `npm ci`.
*   `npmBuildFlags`: Flags a serem passadas para `npm run ${npmBuildScript}`.
*   `npmPackFlags`: Flags a serem passadas para `npm pack`.
*   `npmPruneFlags`: Flags a serem passadas para `npm prune`. O padrão é o valor de `npmInstallFlags`.
*   `makeWrapperArgs`: Flags a serem passadas para `makeWrapper`, adicionadas ao executável que chama o `.js` gerado com `node` como interpretador. Esses scripts são definidos em `package.json`.
*   `nodejs`: O pacote `nodejs` para construir, usando o `npm` correspondente fornecido com essa versão do `node`. O padrão é `pkgs.nodejs`.
*   `npmDeps`: As dependências usadas para construir o pacote npm. Especialmente útil para não ter que recalcular as dependências do workspace.

#### prefetch-npm-deps {#javascript-buildNpmPackage-prefetch-npm-deps}

`prefetch-npm-deps` é um pacote Nixpkgs que calcula o hash das dependências de um projeto npm antecipadamente.

```console
$ ls
package.json package-lock.json index.js
$ prefetch-npm-deps package-lock.json
...
sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

#### fetchNpmDeps {#javascript-buildNpmPackage-fetchNpmDeps}

`fetchNpmDeps` é uma função Nix que requer os seguintes argumentos obrigatórios:

-   `src`: Um diretório / tarball com o arquivo `package-lock.json`
-   `hash`: O hash de saída das dependências do node definidas em `package-lock.json`.

Ele retorna uma derivation com todas as dependências de `package-lock.json` baixadas para `$out/`, utilizável como um cache npm.

#### importNpmLock {#javascript-buildNpmPackage-importNpmLock}

Esta função substitui as referências de dependência npm em `package.json` e `package-lock.json` por caminhos para o Nix store.
Como cada dependência é buscada pode ser personalizado com o argumento `fetcherOpts`.

Esta é uma alternativa mais simples e conveniente a [`fetchNpmDeps`](#javascript-buildNpmPackage-fetchNpmDeps) para gerenciar dependências npm no Nixpkgs.
Não há necessidade de especificar um `hash`, pois ele depende inteiramente dos hashes de integridade já presentes no arquivo `package-lock.json`.

##### Entradas {#javascript-buildNpmPackage-inputs}

-   `npmRoot`: Caminho para o diretório do pacote contendo a árvore de origem.
    Se omitido, os argumentos `package` e `packageLock` devem ser ambos especificados.
-   `package`: Conteúdo parseado de `package.json`
-   `packageLock`: Conteúdo parseado de `package-lock.json`
-   `pname`: Nome do pacote
-   `version`: Versão do pacote
-   `fetcherOpts`: Um conjunto de atributos de argumentos encaminhados para o fetcher subjacente.

Ele retorna uma derivation com um `package.json` e `package-lock.json` corrigidos, com todas as dependências resolvidas para caminhos do Nix store.

:::{.note}
`npmHooks.npmConfigHook` não pode ser usado com `importNpmLock`.
Use `importNpmLock.npmConfigHook` em vez disso.
:::

:::{.example}

##### Exemplo de uso de `pkgs.importNpmLock` {#javascript-buildNpmPackage-example}
```nix
{ buildNpmPackage, importNpmLock }:

buildNpmPackage {
  pname = "hello";
  version = "0.1.0";
  src = ./.;

  npmDeps = importNpmLock { npmRoot = ./.; };

  npmConfigHook = importNpmLock.npmConfigHook;
}
```
:::

:::{.example}
##### Exemplo de uso de `pkgs.importNpmLock` com `fetcherOpts` {#javascript-buildNpmPackage-example-fetcherOpts}

`importNpmLock` usa os seguintes fetchers:

-   `pkgs.fetchurl` para dependências `http(s)`
-   `fetchGit` para dependências `git`

É possível fornecer argumentos adicionais a fetchers individuais conforme necessário:

```nix
{ buildNpmPackage, importNpmLock }:

buildNpmPackage {
  pname = "hello";
  version = "0.1.0";
  src = ./.;

  npmDeps = importNpmLock {
    npmRoot = ./.;
    fetcherOpts = {
      # Pass 'curlOptsList' to 'pkgs.fetchurl' while fetching 'axios'
      "node_modules/axios" = {
        curlOptsList = [ "--verbose" ];
      };
    };
  };

  npmConfigHook = importNpmLock.npmConfigHook;
}
```
:::

#### importNpmLock.buildNodeModules {#javascript-buildNpmPackage-importNpmLock.buildNodeModules}

`importNpmLock.buildNodeModules` retorna uma derivation com um diretório `node_modules` pré-construído, conforme importado por `importNpmLock`.

Isso deve ser usado em conjunto com `importNpmLock.hooks.linkNodeModulesHook` para facilitar fluxos de trabalho de desenvolvimento baseados em `nix-shell`/`nix develop`.

Ele aceita um argumento com os seguintes atributos:

`npmRoot` (Caminho; opcional)
: Caminho para o diretório do pacote contendo a árvore de origem. Se não especificado, os argumentos `package` e `packageLock` devem ser ambos especificados.

`package` (Attrset; opcional)
: Conteúdo parseado de `package.json`, conforme retornado por `lib.importJSON ./my-package.json`. Se não especificado, o `package.json` em `npmRoot` é usado.

`packageLock` (Attrset; opcional)
: Conteúdo parseado de `package-lock.json`, conforme retornado por `lib.importJSON ./my-package-lock.json`. Se não especificado, o `package-lock.json` em `npmRoot` é usado.

`derivationArgs` (`mkDerivation` attrset; opcional)
: Argumentos passados para `stdenv.mkDerivation`

Por exemplo:

```nix
pkgs.mkShell {
  packages = [
    importNpmLock.hooks.linkNodeModulesHook
    nodejs
  ];

  npmDeps = importNpmLock.buildNodeModules {
    npmRoot = ./.;
    inherit nodejs;
  };
}
```
criará um shell de desenvolvimento onde um diretório `node_modules` é criado e pacotes são linkados simbolicamente para o Nix store quando ativado.

:::{.note}
Comandos como `npm install` e `npm add` que escrevem pacotes e executáveis precisam ser usados com `--package-lock-only`.

Isso significa que o `npm` instala dependências escrevendo no `package-lock.json` sem modificar a pasta `node_modules`. A instalação ocorre recarregando o devShell.
Esta pode ser a melhor prática, pois dá ao `nix shell` a propriedade virtualmente exclusiva sobre sua pasta `node_modules`.

É recomendado definir `package-lock-only = true` em seu [`.npmrc`](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc) local do projeto.
:::

### corepack {#javascript-corepack}

Este pacote coloca os wrappers corepack para pnpm e yarn em seu PATH, e eles respeitarão a configuração `packageManager` no `package.json`.

### pnpm {#javascript-pnpm}

pnpm está disponível como o pacote de nível superior `pnpm`. Além disso, existem variantes fixadas em certas versões principais, como `pnpm_8`, `pnpm_9`, `pnpm_10`, `pnpm_10_29_2` e `pnpm_11`, que suportam diferentes conjuntos de versões de arquivos de lock.

Ao empacotar uma aplicação que inclui um `pnpm-lock.yaml`, você precisa buscar o store pnpm para esse projeto usando uma fixed-output-derivation. A função `fetchPnpmDeps` pode criar esta derivation do store pnpm. Em conjunto, o setup hook `pnpmConfigHook` preparará o ambiente de build para instalar o store de dependências pré-buscadas. Aqui está um exemplo para um pacote que contém arquivos `package.json` e `pnpm-lock.yaml` usando o fetcher e o setup hook acima:

```nix
{
  fetchPnpmDeps,
  nodejs,
  pnpm_11,
  pnpmConfigHook,
  stdenv,
}:
let
  # It is recommended to pin pnpm to a major version, due to regular breaking changes in the store format
  # The latest major version is always available under `pkgs.pnpm`
  # Optionally override pnpm to use a custom nodejs version
  # Make sure that the same nodejs version is referenced in nativeBuildInputs
  # pnpm = pnpm_11.override { nodejs = nodejs_24; };
  pnpm = pnpm_11;
in
stdenv.mkDerivation (finalAttrs: {
  pname = "foo";
  version = "0-unstable-1980-01-01";

  src = {
    #...
  };

  nativeBuildInputs = [
    nodejs # in case scripts are run outside of a pnpm call
    pnpmConfigHook
    pnpm # At least required by pnpmConfigHook, if not other (custom) phases
  ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 4;
    hash = "...";
  };
})
```

É altamente recomendado usar uma versão fixada do pnpm (ou seja, `pnpm_9` ou `pnpm_10`), para aumentar a reprodutibilidade futura. Também pode ser necessário usar uma versão mais antiga se o pacote precisar de suporte para uma determinada versão de arquivo de lock. Para fazer isso, você pode passar o argumento `pnpm` para `fetchPnpmDeps` e sobrescrever o argumento `pnpm` em `pnpmConfigHook`. Aqui estão as mudanças no exemplo acima para usar uma versão pnpm fixada:

<!-- TODO: Does splicing still work when overriding in nativeBuildInputs here? -->

```diff
 {
   fetchPnpmDeps,
   nodejs,
-  pnpm,
+  pnpm_10,
   pnpmConfigHook,
   stdenv,
 }:
+let
+  # Optionally override pnpm to use a custom nodejs version
+  # Make sure that the same nodejs version is referenced in nativeBuildInputs
+  # pnpm = pnpm_10.override { nodejs = nodejs-slim_22; };
+in
 stdenv.mkDerivation (finalAttrs: {
   pname = "foo";
   version = "0-unstable-1980-01-01";

   src = {
     #...
   };

   nativeBuildInputs = [
     nodejs # in case scripts are run outside of a pnpm call
     pnpmConfigHook
-    pnpm # At least required by pnpmConfigHook, if not other (custom) phases
+    pnpm_10 # At least required by pnpmConfigHook, if not other (custom) phases
   ];

   pnpmDeps = fetchPnpmDeps {
     inherit (finalAttrs) pname version src;
+    pnpm = pnpm_10;
     fetcherVersion = 4;
     hash = "...";
   };
 })
```

Caso você esteja corrigindo `package.json` ou `pnpm-lock.yaml`, certifique-se de passar `finalAttrs.patches` para a função também (ou seja, `inherit (finalAttrs) patches`.

`pnpmConfigHook` suporta a adição de flags `pnpm install` adicionais via `pnpmInstallFlags`, que pode ser definido como um array de strings Nix:

```nix
{
  # ...
  pnpmDeps = fetchPnpmDeps {
    # ...
    inherit (finalAttrs) pnpmInstallFlags;
  };

  pnpmInstallFlags = [ "--shamefully-hoist" ];
}
```

#### Lidando com `sourceRoot` {#javascript-pnpm-sourceRoot}

Se o projeto pnpm estiver em um subdiretório, você pode simplesmente definir `sourceRoot` ou `setSourceRoot` para `fetchPnpmDeps`.
Se `sourceRoot` for diferente entre a derivation pai e `fetchPnpmDeps`, você terá que definir `pnpmRoot` para ser efetivamente o mesmo local que em `fetchPnpmDeps`.

Assumindo a seguinte estrutura de diretórios, podemos definir `sourceRoot` e `pnpmRoot` da seguinte forma:

```
.
├── frontend
│   ├── ...
│   ├── package.json
│   └── pnpm-lock.yaml
└── ...
```

```nix
{
  # ...
  pnpmDeps = fetchPnpmDeps {
    # ...
    sourceRoot = "${finalAttrs.src.name}/frontend";
  };

  # by default the working directory is the extracted source
  pnpmRoot = "frontend";
}
```

#### Workspaces PNPM {#javascript-pnpm-workspaces}

Se você precisar usar um workspace PNPM para seu projeto, então defina `pnpmWorkspaces = [ "<nome do projeto do workspace 1>" "<nome do projeto do workspace 2>" ]`, etc, em sua chamada `fetchPnpmDeps`,
o que fará com que o PNPM instale dependências apenas para esses pacotes do workspace.

Por exemplo:

```nix
{
  # ...
  pnpmWorkspaces = [ "@astrojs/language-server" ];
  pnpmDeps = fetchPnpmDeps {
    #...
    inherit (finalAttrs) pnpmWorkspaces;
  };
}
```

O acima faria com que a chamada `fetchPnpmDeps` instalasse dependências apenas para o pacote do workspace `@astrojs/language-server`.
Note que você não precisa definir `sourceRoot` para que isso funcione.

Geralmente, em tais casos, você gostaria de usar `pnpm --filter=<nome do workspace pnpm> build` para construir seu projeto, pois `npmHooks.npmBuildHook` provavelmente não funcionará. Uma `buildPhase` baseada no exemplo a seguir provavelmente se adequará à maioria dos projetos de workspace:

```nix
{
  buildPhase = ''
    runHook preBuild

    pnpm --filter=@astrojs/language-server build

    runHook postBuild
  '';
}
```

#### Comandos e configurações PNPM adicionais {#javascript-pnpm-extraCommands}

Se você precisar definir uma configuração PNPM adicional (como `dedupe-peer-dependents` ou similar),
defina `prePnpmInstall` para os comandos corretos a serem executados. Por exemplo:

```nix
{
  prePnpmInstall = ''
    pnpm config set dedupe-peer-dependents false
  '';
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) prePnpmInstall;
    # ...
  };
}
```

Neste exemplo, `prePnpmInstall` será executado tanto por `pnpmConfigHook` quanto pelo builder `fetchPnpmDeps`.

#### pnpm `fetcherVersion` {#javascript-pnpm-fetcherVersion}

Esta é a versão da saída de `fetchPnpmDeps`. Novos pacotes devem usar `3`:

```nix
{
  # ...
  pnpmDeps = fetchPnpmDeps {
    # ...
    fetcherVersion = 4;
    hash = "..."; # clear this hash and generate a new one
  };
}
```

Ao atualizar para uma `fetcherVersion` mais recente, você precisa regenerar o hash.

Esta variável garante que podemos fazer alterações na saída de `fetchPnpmDeps` sem quebrar os hashes existentes.
As alterações podem incluir soluções alternativas ou correções de bugs para problemas PNPM existentes.

##### Histórico de versões {#javascript-pnpm-fetcherVersion-versionHistory}

A versão 3 é o valor recomendado para novos pacotes. As versões 1 e 2 estão obsoletas e programadas para remoção na versão 26.11; pacotes existentes devem migrar.

-   1: Versão inicial, nada especial.
-   2: [Garantir permissões consistentes](https://github.com/NixOS/nixpkgs/pull/422975)
-   3: [Construir um tarball reproduzível](https://github.com/NixOS/nixpkgs/pull/469950)
-   4: [Despejar banco de dados SQLite em um arquivo SQL](https://github.com/NixOS/nixpkgs/pull/522703)

### Yarn {#javascript-yarn}

Projetos baseados em Yarn usam um arquivo `yarn.lock` em vez de um `package-lock.json` para fixar dependências.

Para empacotar aplicações baseadas em Yarn, você precisa distinguir pelos ponteiros de versão no arquivo `yarn.lock`. Veja as seções a seguir.

#### Yarn v1 {#javascript-yarn-v1}

Arquivos de lock do Yarn v1 contêm um comentário `# yarn lockfile v1` no início do arquivo.

Nixpkgs fornece a função Nix `fetchYarnDeps` que busca um cache offline adequado para executar `yarn install` antes de construir o projeto. Além disso, Nixpkgs fornece os hooks:

-   `yarnConfigHook`: Busca as dependências do cache offline e as instala em `node_modules`.
-   `yarnBuildHook`: Executa `yarn build` ou um comando `yarn` especificado que constrói o projeto.
-   `yarnInstallHook`: Executa `yarn install --production` para podar dependências e instala o projeto em `$out`.

Um exemplo de uso dos atributos acima é:

```nix
{
  lib,
  stdenv,
  fetchFromGitHub,
  fetchYarnDeps,
  yarnConfigHook,
  yarnBuildHook,
  yarnInstallHook,
  nodejs,
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "...";
  version = "...";

  src = fetchFromGitHub {
    owner = "...";
    repo = "...";
    tag = "v${finalAttrs.version}";
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  yarnOfflineCache = fetchYarnDeps {
    yarnLock = finalAttrs.src + "/yarn.lock";
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  nativeBuildInputs = [
    yarnConfigHook
    yarnBuildHook
    yarnInstallHook
    # Needed for executing package.json scripts
    nodejs
  ];

  meta = {
    # ...
  };
})
```

##### Argumentos de `yarnConfigHook` {#javascript-yarnconfighook}

Por padrão, `yarnConfigHook` depende do atributo `${yarnOfflineCache}` (ou `${offlineCache}` se o primeiro não estiver definido) para encontrar a localização do cache offline produzido por `fetchYarnDeps`. Para desabilitar esta fase, você pode definir `dontYarnInstallDeps = true` ou sobrescrever a `configurePhase`.

##### Argumentos de `yarnBuildHook` {#javascript-yarnbuildhook}

Este script, por padrão, executa `yarn --offline build`, e depende das dependências do projeto instaladas em `node_modules`. Abaixo está uma lista de argumentos `mkDerivation` adicionais lidos por este hook:

-   `yarnBuildScript`: Define um subcomando `yarn --offline` diferente (o padrão é `build`).
-   `yarnBuildFlags`: Lista de string única de flags adicionais para passar ao comando acima, ou uma lista Nix de tais flags adicionais.

##### Argumentos de `yarnInstallHook` {#javascript-yarninstallhook}

Para instalar o pacote, `yarnInstallHook` usa tanto `npm` quanto `yarn` para limpar arquivos e dependências do projeto. Para desabilitar esta fase, você pode definir `dontYarnInstall = true` ou sobrescrever a `installPhase`. Abaixo está uma lista de argumentos `mkDerivation` adicionais lidos por este hook:

-   `yarnKeepDevDeps`: Desabilita a remoção de devDependencies de `node_modules` antes da instalação.

#### Yarn Berry v3/v4 {#javascript-yarn-v3-v4}
Yarn Berry (v3 / v4) têm formatos semelhantes, eles começam com blocos como estes:

```yaml
__metadata:
  version: 6
  cacheKey: 8[cX]
```

```yaml
__metadata:
  version: 8
  cacheKey: 10[cX]
```

Para esses pacotes, temos alguns helpers expostos sob os respectivos pacotes `yarn-berry_3` e `yarn-berry_4`:

-   `yarn-berry-fetcher`
-   `fetchYarnBerryDeps`
-   `yarnBerryConfigHook`

É recomendado garantir que você esteja fixando explicitamente a versão principal usada, por exemplo, capturando o argumento `yarn-berry_Xn` e então redefinindo-o como uma ligação `let` `yarn-berry`.

```nix
{
  stdenv,
  nodejs,
  yarn-berry_4,
}:

let
  yarn-berry = yarn-berry_4;

in
stdenv.mkDerivation (finalAttrs: {
  pname = "foo";
  version = "0-unstable-1980-01-01";

  src = {
    #...
  };

  nativeBuildInputs = [
    nodejs
    yarn-berry.yarnBerryConfigHook
  ];

  offlineCache = yarn-berry.fetchYarnBerryDeps {
    inherit (finalAttrs) src;
    hash = "...";
  };
})
```

##### `yarn-berry_X.fetchYarnBerryDeps` {#javascript-fetchYarnBerryDeps}
`fetchYarnBerryDeps` executa `yarn-berry-fetcher fetch` em uma fixed-output-derivation. É um fetcher personalizado projetado para baixar de forma reproduzível todos os arquivos no arquivo `yarn.lock`, validando seus hashes no processo. Para dependências git, ele cria um checkout em `${offlineCache}/checkouts/<hash-de-commit-de-40-caracteres>` (confiando no hash de commit git para descrever o conteúdo do checkout).

Para produzir o argumento `hash` para a chamada da função `fetchYarnBerryDeps`, o comando `yarn-berry-fetcher prefetch` pode ser usado:

```console
$ yarn-berry-fetcher prefetch </path/to/yarn.lock> [/path/to/missing-hashes.json]
```

Isso imprime o hash para stdout e pode ser usado em scripts de atualização para recalcular o hash para uma nova versão de `yarn.lock`.

##### `yarn-berry_X.yarnBerryConfigHook` {#javascript-yarnBerryConfigHook}
`yarnBerryConfigHook` usa o caminho do store para o qual `offlineCache` aponta, para executar um `yarn install` durante o build, produzindo um diretório `node_modules` utilizável a partir das dependências baixadas.

Internamente, isso usa uma versão corrigida do Yarn para garantir que as dependências git sejam re-empacotadas e quaisquer tentativas de download falhem imediatamente.

##### Corrigindo arquivos `package.json` ou `yarn.lock` upstream {#javascript-yarnBerry-patching}
Caso seja necessário corrigir o `package.json` ou `yarn.lock` upstream, é importante passar `finalAttrs.patches` para `fetchYarnBerryDeps` também, para que as variantes corrigidas sejam utilizadas (ou seja, `inherit (finalAttrs) patches`.

##### Hashes ausentes no arquivo `yarn.lock` {#javascript-yarnBerry-missing-hashes}
Infelizmente, os arquivos `yarn.lock` não incluem hashes para dependências opcionais/específicas de plataforma.
Isso é [por design](https://github.com/yarnpkg/berry/issues/6759).

Para compensar isso, o subcomando `yarn-berry-fetcher missing-hashes` pode ser usado para produzir todos os hashes ausentes. Estes são geralmente armazenados em um arquivo `missing-hashes.json`, que precisa ser passado tanto para o build em si, quanto para o helper `fetchYarnBerryDeps`:

```nix
{
  stdenv,
  nodejs,
  yarn-berry_4,
}:

let
  yarn-berry = yarn-berry_4;

in
stdenen.mkDerivation (finalAttrs: {
  pname = "foo";
  version = "0-unstable-1980-01-01";

  src = {
    #...
  };

  nativeBuildInputs = [
    nodejs
    yarn-berry.yarnBerryConfigHook
  ];

  missingHashes = ./missing-hashes.json;
  offlineCache = yarn-berry.fetchYarnBerryDeps {
    inherit (finalAttrs) src missingHashes;
    hash = "...";
  };
})
```

## Fora do Nixpkgs {#javascript-outside-nixpkgs}

Existem outras ferramentas disponíveis, que são escritas na linguagem Nix.
Estas não podem ser usadas dentro do Nixpkgs porque exigem [Import From Derivation](#ssec-import-from-derivation), o que não é permitido no Nixpkgs.

Se você estiver empacotando algo fora do Nixpkgs, considere o seguinte:

### npmlock2nix {#javascript-npmlock2nix}

[npmlock2nix](https://github.com/nix-community/npmlock2nix) visa construir `node_modules` sem geração de código. Ainda não atingiu a v1, a API pode estar sujeita a alterações.

#### Armadilhas {#javascript-npmlock2nix-pitfalls}

Existem alguns [problemas com o npm v7](https://github.com/tweag/npmlock2nix/issues/45).

### nix-npm-buildpackage {#javascript-nix-npm-buildpackage}

[nix-npm-buildpackage](https://github.com/serokell/nix-npm-buildpackage) visa construir `node_modules` sem geração de código. Ainda não atingiu a v1, a API pode mudar.
Ele suporta tanto `package-lock.json` quanto yarn.lock.

#### Armadilhas {#javascript-nix-npm-buildpackage-pitfalls}

Existem alguns [problemas com o npm v7](https://github.com/serokell/nix-npm-buildpackage/issues/33).