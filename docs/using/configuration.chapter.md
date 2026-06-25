# Configuração global {#chap-packageconfig}

O Nix vem com certos padrões sobre quais pacotes podem e não podem ser instalados, com base nos metadados de um pacote.
Por padrão, o Nix impedirá a instalação se qualquer um dos seguintes critérios for verdadeiro:

- O pacote é considerado quebrado e teve seu `meta.broken` definido como `true`.

- O pacote não se destina a ser executado no sistema fornecido, pois nenhum de seus `meta.platforms` corresponde ao sistema fornecido.

- O `meta.license` do pacote está definido para uma licença que é considerada não-livre.

- O pacote possui vulnerabilidades de segurança conhecidas, mas não foi ou não pode ser atualizado por algum motivo, e uma lista de problemas foi inserida no `meta.knownVulnerabilities` do pacote.

- Existem problemas para pacotes que devem ser reconhecidos, por exemplo, avisos de depreciação.

Cada um desses critérios pode ser alterado na configuração do Nixpkgs.

:::{.note}
Tudo isso é verificado já durante a `evaluation`, e a verificação inclui qualquer pacote que seja avaliado.
Em particular, todas as `build-time dependencies` são verificadas.
:::

A configuração do Nixpkgs de um usuário é armazenada em um arquivo de configuração específico do usuário localizado em `~/.config/nixpkgs/config.nix`. Por exemplo:

```nix
{ allowUnfree = true; }
```

:::{.caution}
Software não-livre não é testado ou construído na `Nixpkgs continuous integration`, e portanto não é `cached`.
A maioria das licenças não-livres proíbe a execução ou a distribuição do software.
:::

A variável de ambiente `NIXPKGS_CONFIG` pode sobrescrever o local do arquivo de configuração.
O Nixpkgs resolve a configuração nesta ordem:

1. `$NIXPKGS_CONFIG`, se definido e o arquivo existir.
2. `~/.config/nixpkgs/config.nix`, se existir.
3. `~/.nixpkgs/config.nix` (legado), se existir.
4. Configuração vazia.

No NixOS, `NIXPKGS_CONFIG` aponta para `/etc/nix/nixpkgs-config.nix` em todo o sistema.
Coloque um arquivo lá para aplicar a configuração a `nix-env`, `nix-shell` e outros comandos de nível de usuário.
O NixOS não cria este arquivo.
A opção [`nixpkgs.config`](https://nixos.org/manual/nixos/stable/options#opt-nixpkgs.config) não afeta `nix-env`, `nix-shell` ou outros comandos de nível de usuário.

Esta pesquisa se aplica ao uso não-flake, como `channels` e `<nixpkgs>`.
`Flakes` a ignoram; passe `config` diretamente ao importar `nixpkgs`.

## Instalando pacotes quebrados {#sec-allow-broken}

Existem várias maneiras de tentar compilar um pacote que foi marcado como quebrado.

- Para permitir a construção de um pacote quebrado uma vez, você pode usar uma variável de ambiente para uma única invocação das ferramentas `nix`:

    ```ShellSession
    $ export NIXPKGS_ALLOW_BROKEN=1
    ```

- Para permitir permanentemente que pacotes quebrados com um nome específico sejam construídos, você pode adicionar um `problems.handlers` correspondente ao arquivo de configuração do seu usuário, por exemplo:

    ```nix
    {
      problems.handlers.hello.broken = "warn"; # or "ignore"
    }
    ```

- Para permitir permanentemente que todos os pacotes quebrados sejam construídos, você pode adicionar `allowBroken = true;` ao arquivo de configuração do seu usuário, assim:

    ```nix
    { allowBroken = true; }
    ```

## Instalando pacotes em sistemas não suportados {#sec-allow-unsupported-system}

Existem também duas maneiras de tentar compilar um pacote que foi marcado como não suportado para o sistema fornecido.

- Para permitir a construção de um pacote não suportado uma vez, você pode usar uma variável de ambiente para uma única invocação das ferramentas `nix`:

    ```ShellSession
    $ export NIXPKGS_ALLOW_UNSUPPORTED_SYSTEM=1
    ```

- Para permitir permanentemente que pacotes não suportados sejam construídos, você pode adicionar `allowUnsupportedSystem = true;` ao arquivo de configuração do seu usuário, assim:

    ```nix
    { allowUnsupportedSystem = true; }
    ```

A diferença entre um pacote ser não suportado em algum sistema e ser quebrado é, admitidamente, um pouco vaga. Se um programa *deveria* funcionar em uma determinada plataforma, mas não funciona, a plataforma deve ser incluída em `meta.platforms`, mas marcada como quebrada com, por exemplo, `meta.broken = !hostPlatform.isWindows`. Claro, isso levanta a questão do que "deveria" significa exatamente. Isso é deixado para o `package maintainer`.

## Instalando pacotes não-livres {#sec-allow-unfree}

Todos os usuários do Nixpkgs são usuários de software livre, e muitos usuários (e desenvolvedores) do Nixpkgs querem limitar e controlar rigorosamente sua exposição a software não-livre.
Ao mesmo tempo, muitos usuários precisam (ou querem) executar algumas peças específicas de software proprietário.
O Nixpkgs inclui algumas expressões para pacotes de software não-livre.
Por padrão, software não-livre não pode ser instalado e não aparece nas buscas.

Existem várias maneiras de ajustar como o Nix lida com um pacote que foi marcado como não-livre.

- Para permitir temporariamente todos os pacotes não-livres, você pode usar uma variável de ambiente para uma única invocação das ferramentas `nix`:

    ```ShellSession
    $ export NIXPKGS_ALLOW_UNFREE=1
    ```

- É possível permitir permanentemente pacotes não-livres individuais, enquanto ainda bloqueia pacotes não-livres por padrão, usando a opção de configuração `allowUnfreePredicate` no arquivo de configuração do usuário.

    Esta opção é uma função que aceita um pacote como parâmetro e retorna um booleano. O exemplo de configuração a seguir aceita um pacote e sempre retorna falso:

    ```nix
    { allowUnfreePredicate = (pkg: false); }
    ```

    Para um exemplo mais útil, tente o seguinte. Esta configuração permite apenas pacotes não-livres chamados `roon-server` e `Visual Studio Code`:

    ```nix
    {
      allowUnfreePredicate =
        pkg:
        builtins.elem (lib.getName pkg) [
          "roon-server"
          "vscode"
        ];
    }
    ```

- Também é possível permitir e bloquear licenças que são especificamente aceitáveis ou não aceitáveis, usando `allowlistedLicenses` e `blocklistedLicenses`, respectivamente.

    O exemplo de configuração a seguir permite as licenças `amd` e `wtfpl`:

    ```nix
    {
      allowlistedLicenses = with lib.licenses; [
        amd
        wtfpl
      ];
    }
    ```

    O exemplo de configuração a seguir bloqueia as licenças `gpl3Only` e `agpl3Only`:

    ```nix
    {
      blocklistedLicenses = with lib.licenses; [
        agpl3Only
        gpl3Only
      ];
    }
    ```

    Note que `allowlistedLicenses` se aplica apenas a licenças não-livres, a menos que `allowUnfree` esteja habilitado. Não é uma lista de permissões genérica para todos os tipos de licenças. `blocklistedLicenses` se aplica a todas as licenças.

Uma lista completa de licenças pode ser encontrada no arquivo `lib/licenses.nix` da `nixpkgs tree`.

## Instalando pacotes inseguros {#sec-allow-insecure}

Existem várias maneiras de ajustar como o Nix lida com um pacote que foi marcado como inseguro.

- Para permitir temporariamente todos os pacotes inseguros, você pode usar uma variável de ambiente para uma única invocação das ferramentas `nix`:

    ```ShellSession
    $ export NIXPKGS_ALLOW_INSECURE=1
    ```

- É possível permitir permanentemente pacotes inseguros individuais, enquanto ainda bloqueia outros pacotes inseguros por padrão, usando a opção de configuração `permittedInsecurePackages` no arquivo de configuração do usuário.

    O exemplo de configuração a seguir permite a instalação do pacote hipoteticamente inseguro `hello`, versão `1.2.3`:

    ```nix
    { permittedInsecurePackages = [ "hello-1.2.3" ]; }
    ```

- Também é possível criar uma política personalizada sobre quais pacotes inseguros permitir e negar, sobrescrevendo a opção de configuração `allowInsecurePredicate`.

    A opção `allowInsecurePredicate` é uma função que aceita um pacote e retorna um booleano, muito parecido com `allowUnfreePredicate`.

    O exemplo de configuração a seguir permite qualquer versão do pacote `ovftool`:

    ```nix
    { allowInsecurePredicate = pkg: builtins.elem (lib.getName pkg) [ "ovftool" ]; }
    ```

    Note que `permittedInsecurePackages` é verificado apenas se `allowInsecurePredicate` não for especificado.

## Pacotes com problemas {#sec-problems}

Um pacote pode ter vários problemas associados a ele.
Estes podem ser declarados manualmente em `meta.problems`, ou gerados automaticamente a partir de seus outros atributos `meta`.
Cada problema tem um nome, um "tipo" (`kind`), uma mensagem e, opcionalmente, uma lista de URLs.
Nem todos os tipos podem ser especificados manualmente em `meta.problems`, e alguns tipos podem existir apenas uma vez por pacote.
Atualmente, os seguintes tipos de problemas são conhecidos (com mais reservados para serem adicionados no futuro):

- "removal": O pacote está planejado para ser removido em algum momento no futuro. Único.
- "deprecated": O pacote depende de software que atingiu seu fim de vida.
- "maintainerless": Gerado automaticamente para pacotes com `meta.maintainers == []`. Único, não especificável manualmente.
- "broken": Gerado automaticamente para pacotes com `meta.broken = true`.

Cada problema tem um manipulador (`handler`) que lida com ele, que pode ser "error", "warn" ou "ignore".
"error" impedirá a avaliação de um pacote, enquanto "warn" simplesmente imprimirá uma mensagem no log.

O manipulador para problemas pode ser especificado usando `config.problems.handlers.${packageName}.${problemName} = "${handler}";`.

Existe também a possibilidade de especificar alguns `matchers` genéricos, que podem definir um manipulador para mais do que um problema específico de um pacote específico.
Isso funciona através da opção `config.problems.matchers`:

```nix
{
  problems.matchers = [
    # Fail to build any packages which are about to be removed anyway
    {
      kind = "removal";
      handler = "error";
    }

    # Get warnings when using packages with no declared maintainers
    {
      kind = "maintainerless";
      handler = "warn";
    }

    # You deeply care about this package and want to absolutely know when it has any problems
    {
      package = "hello";
      handler = "error";
    }
  ];
}
```

Os `matchers` podem corresponder a um ou mais de nome do pacote, nome do problema ou tipo do problema.
Se várias condições estiverem presentes, todas devem ser atendidas para haver uma correspondência.
Se vários `matchers` corresponderem a um problema, o manipulador de maior severidade será escolhido.
O valor padrão atual contém `{ kind = "removal"; handler = "warn"; }`, o que significa que as pessoas serão notificadas sobre remoções de pacotes com antecedência.

Os nomes dos pacotes para `problems.handlers` e `problems.matchers` são obtidos de `lib.getName`, que primeiro procura por `pname` e, em caso de falha, extrai a parte "pname" do atributo `name`.

## Modificar pacotes via `packageOverrides` {#sec-modify-via-packageOverrides}

Você pode definir uma função chamada `packageOverrides` em seu `~/.config/nixpkgs/config.nix` local para sobrescrever pacotes Nix. Deve ser uma função que recebe `pkgs` como argumento e retorna um conjunto modificado de pacotes.

```nix
{
  packageOverrides = pkgs: rec {
    foo = pkgs.foo.override {
      # ...
    };
  };
}
```

## Referência de Opções `config` {#sec-config-options-reference}

Os seguintes atributos podem ser passados em [`config`](#chap-packageconfig).

```{=include=} options
id-prefix: opt-
list-id: configuration-variable-list
source: ../config-options.json
```

## Gerenciamento Declarativo de Pacotes {#sec-declarative-package-management}

### Construir um ambiente {#sec-building-environment}

Usando `packageOverrides`, é possível gerenciar pacotes de forma declarativa. Isso significa que podemos listar todos os nossos pacotes desejados dentro de uma expressão Nix declarativa. Por exemplo, para ter `aspell`, `bc`, `ffmpeg`, `coreutils`, `gdb`, `nix`, `emscripten`, `jq`, `nox` e `silver-searcher`, poderíamos usar o seguinte em `~/.config/nixpkgs/config.nix`:

```nix
{
  packageOverrides =
    pkgs: with pkgs; {
      myPackages = pkgs.buildEnv {
        name = "my-packages";
        paths = [
          aspell
          bc
          coreutils
          gdb
          ffmpeg
          nix
          emscripten
          jq
          nox
          silver-searcher
        ];
      };
    };
}
```

Para instalá-lo em nosso ambiente, basta executar `nix-env -iA nixpkgs.myPackages`. Se você quiser carregar os pacotes a serem construídos a partir de uma cópia de trabalho de `nixpkgs`, basta executar `nix-env -f. -iA myPackages`. Para explorar o que foi instalado, basta olhar em `~/.nix-profile/`. Você pode ver que muita coisa foi instalada. Algumas dessas coisas são úteis, outras não. Vamos dizer ao Nixpkgs para vincular apenas o que queremos:

```nix
{
  packageOverrides =
    pkgs: with pkgs; {
      myPackages = pkgs.buildEnv {
        name = "my-packages";
        paths = [
          aspell
          bc
          coreutils
          gdb
          ffmpeg
          nix
          emscripten
          jq
          nox
          silver-searcher
        ];
        pathsToLink = [
          "/share"
          "/bin"
        ];
      };
    };
}
```

`pathsToLink` diz ao Nixpkgs para vincular apenas os caminhos listados, o que elimina o material extra no perfil. `/bin` e `/share` são bons padrões para um ambiente de usuário, eliminando a desordem. Se você estiver executando Nix no macOS, talvez queira adicionar outro caminho também, `/Applications`, que disponibiliza aplicativos GUI.

### Obtendo documentação {#sec-getting-documentation}

Depois de construir esse novo ambiente, verifique `~/.nix-profile` para ter certeza de que tudo o que queríamos está lá. Leitores perspicazes notarão que alguns arquivos estão faltando. Olhe dentro de `~/.nix-profile/share/man/man1/` para verificar isso. Não há páginas `man` para nenhuma das ferramentas Nix! Isso ocorre porque alguns pacotes como o Nix têm várias saídas para coisas como documentação (veja a seção 4). Vamos fazer o Nix instalar essas também.

```nix
{
  packageOverrides =
    pkgs: with pkgs; {
      myPackages = pkgs.buildEnv {
        name = "my-packages";
        paths = [
          aspell
          bc
          coreutils
          ffmpeg
          nix
          emscripten
          jq
          nox
          silver-searcher
        ];
        pathsToLink = [
          "/share/man"
          "/share/doc"
          "/bin"
        ];
        extraOutputsToInstall = [
          "man"
          "doc"
        ];
      };
    };
}
```

Isso nos fornece alguma documentação útil para usar nossos pacotes. No entanto, se realmente quisermos que essas `manpages` sejam detectadas pelo `man`, precisamos configurar nosso ambiente. Isso também pode ser gerenciado dentro das expressões Nix.

```nix
{
  packageOverrides = pkgs: {
    myProfile = pkgs.writeText "my-profile" ''
      export PATH=$HOME/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/sbin:/bin:/usr/sbin:/usr/bin
      export MANPATH=$HOME/.nix-profile/share/man:/nix/var/nix/profiles/default/share/man:/usr/share/man
    '';
    myPackages = pkgs.buildEnv {
      name = "my-packages";
      paths = with pkgs; [
        (runCommand "profile" { } ''
          mkdir -p $out/etc/profile.d
          cp ${myProfile} $out/etc/profile.d/my-profile.sh
        '')
        aspell
        bc
        coreutils
        ffmpeg
        man
        nix
        emscripten
        jq
        nox
        silver-searcher
      ];
      pathsToLink = [
        "/share/man"
        "/share/doc"
        "/bin"
        "/etc"
      ];
      extraOutputsToInstall = [
        "man"
        "doc"
      ];
    };
  };
}
```

Para que isso funcione completamente, você também deve ter este script carregado quando estiver logado. Tente adicionar algo como isto ao seu arquivo `~/.profile`:

```ShellSession
#!/bin/sh
if [ -d "${HOME}/.nix-profile/etc/profile.d" ]; then
  for i in "${HOME}/.nix-profile/etc/profile.d/"*.sh; do
    if [ -r "$i" ]; then
      . "$i"
    fi
  done
fi
```

Agora, basta executar `. "${HOME}/.profile"` e você pode começar a carregar páginas `man` do seu ambiente.

### Configuração do GNU info {#sec-gnu-info-setup}

Configurar o GNU info é um pouco mais complicado do que as páginas `man`. Para funcionar corretamente, o `info` precisa que um `database` seja gerado. Isso pode ser feito com algumas pequenas modificações em nossos scripts de ambiente.

```nix
{
  packageOverrides = pkgs: {
    myProfile = pkgs.writeText "my-profile" ''
      export PATH=$HOME/.nix-profile/bin:/nix/var/nix/profiles/default/bin:/sbin:/bin:/usr/sbin:/usr/bin
      export MANPATH=$HOME/.nix-profile/share/man:/nix/var/nix/profiles/default/share/man:/usr/share/man
      export INFOPATH=$HOME/.nix-profile/share/info:/nix/var/nix/profiles/default/share/info:/usr/share/info
    '';
    myPackages = pkgs.buildEnv {
      name = "my-packages";
      paths = with pkgs; [
        (runCommand "profile" { } ''
          mkdir -p $out/etc/profile.d
          cp ${myProfile} $out/etc/profile.d/my-profile.sh
        '')
        aspell
        bc
        coreutils
        ffmpeg
        man
        nix
        emscripten
        jq
        nox
        silver-searcher
        texinfoInteractive
      ];
      pathsToLink = [
        "/share/man"
        "/share/doc"
        "/share/info"
        "/bin"
        "/etc"
      ];
      extraOutputsToInstall = [
        "man"
        "doc"
        "info"
      ];
      postBuild = ''
        if [ -x $out/bin/install-info -a -w $out/share/info ]; then
          shopt -s nullglob
          for i in $out/share/info/*.info $out/share/info/*.info.gz; do
              $out/bin/install-info $i $out/share/info/dir
          done
        fi
      '';
    };
  };
}
```

`postBuild` diz ao Nixpkgs para executar um comando após construir o ambiente. Neste caso, `install-info` adiciona as páginas `info` instaladas a `dir`, que é o nó raiz padrão do GNU info. Note que `texinfoInteractive` é adicionado ao ambiente para fornecer o comando `install-info`.