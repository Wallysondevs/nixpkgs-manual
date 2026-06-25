# Linguagens BEAM (Erlang, Elixir & LFE) {#sec-beam}

## Introdução {#beam-introduction}

Neste documento e nas expressões Nix relacionadas, usamos o termo _BEAM_ para descrever o ambiente. BEAM é o nome da Máquina Virtual Erlang e, no que nos diz respeito, de uma perspectiva de empacotamento, todas as linguagens que rodam na BEAM são intercambiáveis. O que varia, como o sistema de build, é transparente para os usuários de qualquer pacote BEAM, então não fazemos distinção.

## Versões disponíveis e cronograma de depreciações {#available-versions-and-deprecations-schedule}

### Erlang OTP {#erlang}

Nixpkgs segue o Erlang upstream em seu [ciclo de vida de suporte](https://erlang.org/download/otp_versions_tree.html) e mantém disponíveis as últimas 3 versões lançadas do Erlang. Devido aos prazos de lançamento do upstream e do NixOS, isso pode significar a remoção da versão mais antiga antes que o upstream descontinue totalmente o suporte.

### Elixir {#elixir}

Nixpkgs segue o [cronograma oficial de depreciação do Elixir](https://hexdocs.pm/elixir/compatibility-and-deprecations.html) e mantém disponíveis as últimas 5 versões lançadas do Elixir.

## Estrutura {#beam-structure}

Todas as expressões relacionadas ao BEAM estão disponíveis através de conjuntos de pacotes de nível superior. Recomenda-se trabalhar com um único conjunto de pacotes para garantir versões consistentes.

- `beamPackages` - versão OTP padrão
- `beamMinimalPackages` - versão OTP padrão, sem wxwidgets, o que economiza ~1GB no tamanho do closure

Existem também conjuntos de pacotes específicos da versão OTP, por exemplo, para OTP 28:

- `beam28Packages`
- `beamMinimal28Packages`

Dentro de cada conjunto de pacotes estão:

- o próprio erlang (a versão vem do conjunto de pacotes)
- interpretadores: elixir (múltiplas versões, por exemplo, elixir_1_18) e lfe
- pacotes: rebar3, hex, etc
- builders: mixRelease, buildRebar3, etc
- hooks: para compor builders e pacotes

Para usar um Elixir não padrão, é importante manter o restante do conjunto de pacotes consistente, por isso é recomendado usar `.extend`. Isso garante que builders como `mixRelease`, `fetchMixDeps` e `buildMix` utilizem o Elixir sobrescrito:

```nix
let
  beamPackages = beam27Packages.extend (self: super: { elixir = self.elixir_1_18; });
in
beamPackages.mixRelease {
  # ...
}
```

## Ferramentas de Build {#beam-build-tools}

### Rebar3 {#beam-build-tools-rebar3}

Fornecemos uma versão do Rebar3, sob `beamPackages.rebar3`. Também fornecemos um helper para buscar dependências do Rebar3 de um lockfile sob `beamPackages.fetchRebar3Deps`.

Também fornecemos uma versão do Rebar3 com plugins incluídos, sob `beamPackages.rebar3WithPlugins`. Este pacote é uma função que recebe dois argumentos: `plugins`, uma lista de derivations nix para incluir como plugins (carregados apenas quando especificados em `rebar.config`), e `globalPlugins`, que devem ser sempre carregados pelo rebar3. Exemplo: `beamPackages.rebar3WithPlugins { globalPlugins = [beamPackages.pc]; }`.

Ao adicionar um novo plugin, é importante que o atributo `name` seja o mesmo que o atom usado pelo rebar3 para se referir ao plugin.

### Erlang.mk {#beam-build-tools-erlangmk}

Erlang.mk funciona exatamente como esperado. Há um processo de bootstrap que precisa ser executado, o qual é suportado pela derivation `buildErlangMk`.

### Mix {#beam-build-tools-mix}

Para aplicações Elixir que usam [mix release](https://hexdocs.pm/mix/Mix.Release.html), use o builder `mixRelease` para criar um release. Veja os exemplos para mais detalhes.

Há também um helper `buildMix`, cujo comportamento é mais próximo ao de `buildErlangMk` e `buildRebar3`. A principal diferença é que `mixRelease` cria um release, enquanto `buildMix` apenas constrói o pacote, o que é mais útil para bibliotecas e outras dependências.

## Como Instalar Pacotes BEAM {#how-to-install-beam-packages}

Para usar qualquer um desses builders em seu ambiente, refira-se a eles pelo seu attribute path sob `beamPackages` (ou outro conjunto de pacotes BEAM), por exemplo, `beamPackages.rebar3`:

::: {.example #ex-beam-ephemeral-shell}
# Shell efêmero

```ShellSession
$ nix-shell -p beamPackages.rebar3
```
:::

::: {.example #ex-beam-declarative-shell}
# Shell declarativo

```nix
let
  pkgs = import <nixpkgs> {
    config = { };
    overlays = [ ];
  };
in
pkgs.mkShell { packages = [ pkgs.beamPackages.rebar3 ]; }
```
:::

## Empacotando Aplicações BEAM {#packaging-beam-applications}

### Aplicações Erlang {#packaging-erlang-applications}

#### Pacotes Rebar3 {#rebar3-packages}

O builder `beamPackages.buildRebar3` pode ser usado para construir uma derivation que entende como construir um projeto Rebar3.

#### Pacotes Erlang.mk {#erlang-mk-packages}

Erlang.mk funciona de forma semelhante ao Rebar3, exceto que usamos `beamPackages.buildErlangMk` em vez de `beamPackages.buildRebar3`.

Se um pacote precisar compilar código nativo via mecanismo de compilação de portas do Erlang.mk, adicione `compilePorts = true;` à derivation.

### Aplicações Elixir {#packaging-elixir-applications}

#### Pacotes Mix {#mix-packages}

`beamPackages.mixRelease` é usado para criar um release no sentido do mix. As dependências precisarão ser buscadas com `beamPackages.fetchMixDeps` e passadas para ele.

#### mixRelease - Exemplo Elixir Phoenix {#mix-release-elixir-phoenix-example}

Existem 3 etapas: dependências de frontend (javascript), dependências de backend (elixir) e a derivation final que une ambas.

##### mixRelease - Dependências de Frontend (javascript) {#mix-release-javascript-deps}

Para projetos Phoenix, dentro do Nixpkgs você pode usar `fetchYarnDeps` ou `buildNpmPackage`. Um exemplo com `buildNpmPackage` pode ser encontrado [aqui](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pl/plausible/package.nix), e um exemplo com `fetchYarnDeps` pode ser encontrado [aqui](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pi/pinchflat/package.nix).

##### mixRelease - Dependências de Backend (mix) {#mix-release-mix-deps}

Existem 2 maneiras de empacotar dependências de backend: ou mix2nix por dependência ou com uma fixed-output-derivation (FOD).

Ao escrever um projeto Elixir visando `mixRelease`, você também pode considerar usar [deps_nix](https://github.com/code-supply/deps_nix) com `mixNixDeps`. `deps_nix` suporta dependências git, mas é destinado a ser adicionado diretamente ao `mix.exs` do projeto.

###### mix2nix {#mix2nix}

`mix2nix` é uma ferramenta de linha de comando disponível no Nixpkgs. Ela gerará uma expressão Nix a partir de um arquivo `mix.lock`. É bastante padrão na série de ferramentas 2nix.

Observe que atualmente o mix2nix não consegue lidar com dependências git dentro do arquivo mix.lock. Se você tiver dependências git, pode adicioná-las manualmente (veja [exemplo](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/pl/pleroma/package.nix)) ou usar o método FOD.

A vantagem de usar mix2nix é que o nix conhecerá todo o seu grafo de dependências. Em uma atualização de dependência, isso não acionará uma reconstrução e download completos de todas as dependências, o que o FOD fará.

Passos práticos:

- execute `mix2nix > mix_deps.nix` no repositório upstream.
- passe `mixNixDeps = with pkgs; import ./mix_deps.nix { inherit lib beamPackages; };` como um argumento para mixRelease.

Se houver dependências git.

- Você precisará fixar a versão artificialmente em mix.exs e regenerar o mix.lock com a versão fixa (no upstream). Isso permitirá que você execute `mix2nix > mix_deps.nix`.
- Do arquivo mix_deps.nix, remova as dependências que tinham versões git e passe-as como um override para a função de importação.

```nix
{
  mixNixDeps = import ./mix.nix {
    inherit beamPackages lib;
    overrides = (
      final: prev: {
        # mix2nix does not support git dependencies yet,
        # so we need to add them manually
        prometheus_ex = beamPackages.buildMix rec {
          name = "prometheus_ex";
          version = "3.0.5";

          # Change the argument src with the git src that you actually need
          src = fetchFromGitLab {
            domain = "git.pleroma.social";
            group = "pleroma";
            owner = "elixir-libraries";
            repo = "prometheus.ex";
            rev = "a4e9beb3c1c479d14b352fd9d6dd7b1f6d7deee5";
            hash = "sha256-U17LlN6aGUKUFnT4XyYXppRN+TvUBIBRHEUsfeIiGOw=";
          };
          # you can re-use the same beamDeps argument as generated
          beamDeps = with final; [ prometheus ];
        };
      }
    );
  };
}
```

Você precisará executar o processo de build uma vez para corrigir o hash para corresponder ao seu novo git src.

###### FOD {#fixed-output-derivation}

Uma fixed output derivation fará o download das dependências do mix da internet. Para garantir a reprodutibilidade, um hash será fornecido. Observe que o mix é relativamente reproduzível. Não foi observado um FOD gerando um hash diferente a cada execução (ao contrário do npm, onde as chances são relativamente altas). Veja [akkoma](https://github.com/NixOS/nixpkgs/blob/master/pkgs/by-name/ak/akkoma/package.nix) para um exemplo de uso de FOD.

Passos práticos

- comece com o seguinte argumento para mixRelease

```nix
{
  mixFodDeps = fetchMixDeps {
    pname = "mix-deps-${pname}";
    inherit src version;
    hash = lib.fakeHash;
  };
}
```

O primeiro build reclamará sobre o valor do hash, você pode substituí-lo pelo valor sugerido depois disso.

Observe que se, depois de você ter substituído o valor, o nix sugerir outro hash, então o mix não está buscando as dependências de forma reproduzível. Um FOD não funcionará nesse caso e você terá que usar mix2nix.

##### mixRelease - exemplo {#mix-release-example}

Veja como seu arquivo `default.nix` ficaria para um projeto Phoenix.

```nix
{
  # beam27Packages or beam29Packages is available if you need a particular version
  beamPackages,
}:
let
  pname = "your_project";
  version = "0.0.1";

  src = builtins.fetchgit {
    url = "ssh://git@github.com/your_id/your_repo";
    rev = "replace_with_your_commit";
  };

  # if using mix2nix you can use the mixNixDeps attribute
  mixFodDeps = beamPackages.fetchMixDeps {
    pname = "mix-deps-${pname}";
    inherit src version;
    # nix will complain and tell you the right value to replace this with
    hash = lib.fakeHash;
    mixEnv = ""; # default is "prod", when empty includes all dependencies, such as "dev", "test".
    # if you have build time environment variables add them here
    MY_ENV_VAR = "my_value";
  };
in
beamPackages.mixRelease {
  inherit
    src
    pname
    version
    mixFodDeps
    ;
  # if you have build time environment variables add them here
  MY_ENV_VAR = "my_value";

  postBuild = ''
    # for external task you need a workaround for the no deps check flag
    # https://github.com/phoenixframework/phoenix/issues/2690
    mix do deps.loadpaths --no-deps-check, phx.digest
    mix phx.digest --no-deps-check
  '';
}
```

A configuração exigirá os seguintes passos:

- Mova seus segredos para variáveis de ambiente de tempo de execução. Para mais informações, consulte a [documentação de runtime.exs](https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-runtime-configuration). Em um build Phoenix novo, isso significaria que tanto `DATABASE_URL` quanto `SECRET_KEY` precisam ser movidos para `runtime.exs`.
- Gere uma expressão Nix para suas dependências de frontend usando `fetchNpmDeps`/`buildNpmPackage` ou `fetchYarnDeps`, dependendo se o projeto usa npm ou yarn
- faça commit e push dessas alterações
- agora você pode `nix-build .`
- Para executar o release, defina a variável de ambiente `RELEASE_TMP` para um diretório ao qual seu programa tenha acesso de escrita. Ele será usado para armazenar as configurações do BEAM.

#### Exemplo de criação de um serviço para um projeto Elixir - Phoenix {#example-of-creating-a-service-for-an-elixir---phoenix-project}

Para criar um serviço com seu release, você pode adicionar um `service.nix`
em seu projeto com o seguinte

```nix
{
  config,
  pkgs,
  lib,
  ...
}:

let
  release = pkgs.callPackage ./default.nix { };
  release_name = "app";
  working_directory = "/home/app";
in
{
  systemd.services.${release_name} = {
    wantedBy = [ "multi-user.target" ];
    after = [
      "network.target"
      "postgresql.target"
    ];
    # note that if you are connecting to a postgres instance on a different host
    # postgresql.target should not be included in the requires.
    requires = [
      "network-online.target"
      "postgresql.target"
    ];
    description = "my app";
    environment = {
      # RELEASE_TMP is used to write the state of the
      # VM configuration when the system is running
      # it needs to be a writable directory
      RELEASE_TMP = working_directory;
      # can be generated in an elixir console with
      # Base.encode32(:crypto.strong_rand_bytes(32))
      RELEASE_COOKIE = "my_cookie";
      MY_VAR = "my_var";
    };
    serviceConfig = {
      Type = "exec";
      DynamicUser = true;
      WorkingDirectory = working_directory;
      # Implied by DynamicUser, but just to emphasize due to RELEASE_TMP
      PrivateTmp = true;
      ExecStart = ''
        ${release}/bin/${release_name} start
      '';
      ExecStop = ''
        ${release}/bin/${release_name} stop
      '';
      ExecReload = ''
        ${release}/bin/${release_name} restart
      '';
      Restart = "on-failure";
      RestartSec = 5;
    };
    unitConfig = {
      StartLimitBurst = 3;
      StartLimitInterval = 10;
    };
    # disksup requires bash
    path = [ pkgs.bash ];
  };

  # in case you have migration scripts or you want to use a remote shell
  environment.systemPackages = [ release ];
}
```

## Como Desenvolver {#how-to-develop}

### Criando um Shell {#creating-a-shell}

Geralmente, precisamos criar um arquivo `shell.nix` e fazer nosso desenvolvimento dentro do ambiente especificado nele. Basta instalar sua versão do Erlang e quaisquer outros interpretadores, e então usar suas ferramentas de build normais. Como exemplo, com Elixir:

```nix
{
  pkgs ? import <nixpkgs> { },
}:

with pkgs;
let
  # pin OTP via beam27Packages/beam28Packages/... and Elixir via .extend
  beamPackages = beam27Packages.extend (self: super: { elixir = self.elixir_1_18; });
in
mkShell { buildInputs = [ beamPackages.elixir ]; }
```

### Usando um overlay {#beam-using-overlays}

Se você precisar usar um overlay para alterar alguns atributos de uma derivation, por exemplo, se precisar de uma correção de bug de uma versão que ainda não está disponível no Nixpkgs, você pode sobrescrever atributos como `version` (e o `hash` correspondente) e então usar este overlay em seu ambiente de desenvolvimento:

#### `shell.nix` {#beam-using-overlays-shell.nix}

```nix
let
  elixir_1_18_1_overlay = (
    self: super: {
      elixir_1_18 = super.elixir_1_18.override {
        version = "1.18.1";
        hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      };
    }
  );
  pkgs = import <nixpkgs> { overlays = [ elixir_1_18_1_overlay ]; };
in
with pkgs;
mkShell { buildInputs = [ elixir_1_18 ]; }
```

#### Projeto Elixir - Phoenix {#elixir---phoenix-project}

Aqui está um exemplo de `shell.nix`.

```nix
with import <nixpkgs> { };

let
  # pin OTP via beam27Packages/beam28Packages/... and Elixir via .extend
  beamPackages = beam27Packages.extend (self: super: { elixir = self.elixir_1_18; });

  # define packages to install
  basePackages = [
    git
    beamPackages.elixir
    nodejs
    postgresql_14
    # formatting js file
    prettier
  ];

  inputs = basePackages ++ lib.optionals stdenv.hostPlatform.isLinux [ inotify-tools ];

  # define shell startup command
  hooks = ''
    # this allows mix to work on the local directory
    mkdir -p .nix-mix .nix-hex
    export MIX_HOME=$PWD/.nix-mix
    export HEX_HOME=$PWD/.nix-mix
    # make hex from Nixpkgs available
    # `mix local.hex` will install hex into MIX_HOME and should take precedence
    export MIX_PATH="${beamPackages.hex}/lib/erlang/lib/hex/ebin"
    export PATH=$MIX_HOME/bin:$HEX_HOME/bin:$PATH
    export LANG=C.UTF-8
    # keep your shell history in iex
    export ERL_AFLAGS="-kernel shell_history enabled"

    # postgres related
    # keep all your db data in a folder inside the project
    export PGDATA="$PWD/db"

    # phoenix related env vars
    export POOL_SIZE=15
    export DB_URL="postgresql://postgres:postgres@localhost:5432/db"
    export PORT=4000
    export MIX_ENV=dev
    # add your project env vars here, word readable in the nix store.
    export ENV_VAR="your_env_var"
  '';

in
mkShell {
  buildInputs = inputs;
  shellHook = hooks;
}
```

A inicialização do projeto exigirá os seguintes passos:

- crie o diretório db `initdb ./db` (dentro da pasta do seu projeto mix)
- crie o usuário postgres `createuser postgres -ds`
- crie o db `createdb db`
- inicie a instância postgres `pg_ctl -l "$PGDATA/server.log" start`
- adicione a pasta `/db` ao seu `.gitignore`
- você pode iniciar seu servidor Phoenix e obter um shell com `iex -S mix phx.server`