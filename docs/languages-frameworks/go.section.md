# Go {#sec-language-go}

## Construindo módulos Go com `buildGoModule` {#ssec-language-go}

A função `buildGoModule` constrói programas Go gerenciados com módulos Go. Ela constrói [Módulos Go](https://go.dev/wiki/Modules) através de uma construção em duas fases:

- Uma derivation de *fetcher* intermediária chamada `goModules`. Esta derivation será usada para buscar todas as dependências do módulo Go.
- Uma derivation final usará a saída da derivation intermediária para construir os binários e produzir a saída final.

### Exemplo para `buildGoModule` {#ex-buildGoModule}

A seguir, um exemplo de expressão usando `buildGoModule`:

```nix
{
  pet = buildGoModule (finalAttrs: {
    pname = "pet";
    version = "0.3.4";

    src = fetchFromGitHub {
      owner = "knqyf263";
      repo = "pet";
      tag = "v${finalAttrs.version}";
      hash = "sha256-Gjw1dRrgM8D3G7v6WIM2+50r4HmTXvx0Xxme2fH9TlQ=";
    };

    vendorHash = "sha256-ciBIR+a1oaYH+H1PcC8cD8ncfJczk1IiJ8iYNM+R6aA=";

    meta = {
      description = "Simple command-line snippet manager, written in Go";
      homepage = "https://github.com/knqyf263/pet";
      license = lib.licenses.mit;
      maintainers = with lib.maintainers; [ kalbasit ];
    };
  });
}
```

## Atributos de `buildGoModule` {#buildgomodule-parameters}

Muitos atributos [que controlam a fase de construção](#variables-controlling-the-build-phase) são respeitados por `buildGoModule`. Note que `buildGoModule` também lê os seguintes atributos ao construir a derivation de saída fixa `vendor/` goModules:

- [`sourceRoot`](#var-stdenv-sourceRoot)
- [`prePatch`](#var-stdenv-prePatch)
- [`patches`](#var-stdenv-patches)
- [`patchFlags`](#var-stdenv-patchFlags)
- [`postPatch`](#var-stdenv-postPatch)
- [`preBuild`](#var-stdenv-preBuild)
- `env`: útil para passar variáveis como `GOWORK`.

Para controlar a execução de testes da derivation de construção, os seguintes atributos são de interesse:

- [`checkInputs`](#var-stdenv-checkInputs)
- [`preCheck`](#var-stdenv-preCheck)
- [`checkFlags`](#var-stdenv-checkFlags)

Além dos atributos acima, e das muitas outras variáveis respeitadas também por `stdenv.mkDerivation`, `buildGoModule` respeita atributos específicos do Go que os ajustam para se comportarem de forma ligeiramente diferente:

### `vendorHash` {#var-go-vendorHash}

Hash da saída da derivation de *fetcher* intermediária (as dependências dos módulos Go).

`vendorHash` pode ser definido como `null`.
Nesse caso, em vez de buscar as dependências, as dependências já *vendored* no diretório `vendor` do repositório de origem serão usadas.

Para evitar atualizar este campo quando as dependências mudarem, execute `go mod vendor` no seu repositório de origem e defina `vendorHash = null;`.
Você pode ler mais sobre [vendoring na documentação do Go](https://go.dev/ref/mod#vendoring).

Para obter o hash, defina `vendorHash = lib.fakeHash;` e execute a construção. ([mais detalhes aqui](#sec-source-hashes)).
Outra forma é usar `nix-prefetch` para obter o hash. O comando a seguir obtém o valor de `vendorHash` para o pacote `pet`:

```sh
cd path/to/nixpkgs
nix-prefetch -E "{ sha256 }: ((import ./. { }).my-package.overrideAttrs { vendorHash = sha256; }).goModules"
```

`vendorHash` pode ser sobrescrito com `overrideAttrs`. Sobrescreva o exemplo acima assim:

```nix
{
  pet_0_4_0 = pet.overrideAttrs (
    finalAttrs: previousAttrs: {
      version = "0.4.0";
      src = fetchFromGitHub {
        inherit (previousAttrs.src) owner repo;
        tag = "v${finalAttrs.version}";
        hash = "sha256-gVTpzmXekQxGMucDKskGi+e+34nJwwsXwvQTjRO6Gdg=";
      };
      vendorHash = "sha256-dUvp7FEW09V0xMuhewPGw3TuAic/sD7xyXEYviZ2Ivs=";
    }
  );
}
```

### `proxyVendor` {#var-go-proxyVendor}

Se `true`, o *fetcher* intermediário baixa as dependências do
[proxy de módulos Go](https://go.dev/ref/mod#module-proxy) (usando `go mod download`) em vez de *vendoring* delas. O
[cache de módulos](https://go.dev/ref/mod#module-cache) resultante é então passado para a derivation final.

Isso é útil se seu código depende de código C e `go mod tidy` não inclui as fontes necessárias para construir ou
se alguma dependência tem conflitos que ignoram maiúsculas/minúsculas, o que produzirá *checksums* `vendorHash` dependentes da plataforma.
Também pode ser necessário se o módulo visa a versão 1.16 ou anterior da linguagem, já que o *vendoring* compila todas as dependências contra a versão 1.16 da linguagem neste caso.

O padrão é `false`.

### `modPostBuild` {#var-go-modPostBuild}

Comandos de *shell* para executar após a construção dos goModules executar `go mod vendor`, e antes de calcular o `vendorHash` da derivation de saída fixa.
Note que se você alterar este atributo, você precisa atualizar o atributo `vendorHash`.

### `modRoot` {#var-go-modRoot}

O diretório raiz do módulo Go que contém o arquivo `go.mod`.

O padrão é `./`, que é a raiz de `src`.

### `ldflags` {#var-go-ldflags}

Uma lista de *strings* de *flags* para passar à ferramenta de *linker* Go via o argumento `-ldflags` de `go build`. Valores possíveis podem ser recuperados executando `go tool link --help`.
O caso de uso mais comum para este argumento é tornar o executável resultante ciente de sua própria versão injetando o valor de uma variável de *string* usando a *flag* `-X`. Por exemplo:

```nix
{
  ldflags = [
    "-X main.Version=${version}"
    "-X main.Commit=${version}"
  ];
}
```

### `tags` {#var-go-tags}

Uma lista de *strings* de [tags de construção Go (também chamadas de restrições de construção)](https://pkg.go.dev/cmd/go#hdr-Build_constraints) que são passadas via o argumento `-tags` de `go build`. Essas restrições controlam se os arquivos Go da fonte devem ser incluídos na construção. Por exemplo:

```nix
{
  tags = [
    "production"
    "sqlite"
  ];
}
```

As *tags* também podem ser definidas condicionalmente:

```nix
{ tags = [ "production" ] ++ lib.optionals withSqlite [ "sqlite" ]; }
```

### `deleteVendor` {#var-go-deleteVendor}

Se definido como `true`, remove o diretório `vendor` pré-existente. Isso só deve ser usado se as dependências incluídas na pasta `vendor` estiverem quebradas ou incompletas.

### `subPackages` {#var-go-subPackages}

Especificado como uma *string* ou lista de *strings*. Limita o *builder* de construir pacotes filhos que não foram listados. Se `subPackages` não for especificado, todos os pacotes filhos serão construídos.

Muitos projetos Go mantêm o pacote principal em um diretório `cmd`.
O exemplo a seguir pode ser usado para construir apenas os binários `example-cli` e `example-server`:

```nix
{
  subPackages = [
    "cmd/example-cli"
    "cmd/example-server"
  ];
}
```

### `excludedPackages` {#var-go-excludedPackages}

Especificado como uma *string* ou lista de *strings*. Faz com que o *builder* pule a construção de pacotes filhos que correspondam a qualquer um dos valores fornecidos.

### `enableParallelBuilding` {#var-go-enableParallelBuilding}

Se as construções e testes devem ser executados em paralelo.

O padrão é `true`.

### `allowGoReference` {#var-go-allowGoReference}

Se o resultado da construção deve ter permissão para conter referências à cadeia de ferramentas Go. Isso pode ser necessário para programas que estão acoplados ao compilador, mas não deve ser definido sem uma boa razão.

O padrão é `false`

### `goSum` {#var-go-goSum}

Especifica o conteúdo do arquivo `go.sum` e aciona reconstruções quando ele muda. Isso ajuda a combater erros de dependência inconsistentes em mudanças no `go.sum`.

O padrão é `null`

### `buildTestBinaries` {#var-go-buildTestBinaries}

Esta opção permite compilar binários de teste em vez dos binários usuais produzidos por um pacote.
Go pode [compilar testes em binários](https://pkg.go.dev/cmd/go#hdr-Test_packages) usando o comando `go test -c`.
Esses binários podem então ser executados posteriormente (fora do *sandbox* Nix) para executar os testes.
Isso é principalmente útil para consumidores *downstream* executarem testes de integração ou de ponta a ponta que não funcionarão no *sandbox* Nix, por exemplo, porque exigem acesso à rede.

## Cadeias de ferramentas e *builders* versionados {#ssec-go-toolchain-versions}

Além de `buildGoModule`, também existem *builders* versionados disponíveis que fixam uma versão específica do Go, como `buildGo124Module` para Go 1.24.
Da mesma forma, cadeias de ferramentas versionadas estão disponíveis, como `go_1_24` para Go 1.24.
Tanto o *builder* quanto a cadeia de ferramentas de uma determinada versão serão removidos assim que a versão do Go atingir seu fim de vida.

Como as atualizações da cadeia de ferramentas em nixpkgs causam reconstruções em massa e devem passar pelo ciclo de *staging*, pode levar um tempo até que uma nova versão menor do Go esteja disponível para os consumidores de nixpkgs.
Se você deseja acesso mais rápido à versão menor mais recente, use a cadeia de ferramentas `go_latest` e o *builder* `buildGoLatestModule`.
Para saber mais sobre o procedimento de manutenção e atualização do Go em nixpkgs, consulte a [política de atualização da cadeia de ferramentas/builder do Go](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/go/README.md#go-toolchainbuilder-upgrade-policy).

::: {.warning}
O uso de `go_latest` e `buildGoLatestModule` é restrito dentro de nixpkgs.
A [política de atualização da cadeia de ferramentas/builder do Go](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/go/README.md#go-toolchainbuilder-upgrade-policy) deve ser seguida.
:::

## Sobrescrevendo `goModules` {#buildGoModule-goModules-override}

Sobrescrever `<pkg>.goModules` chamando `goModules.overrideAttrs` não é suportado. Ainda assim, é possível sobrescrever o `vendorHash` (`outputHash` de `goModules`) e os *hooks* `pre`/`post` para as fases de construção e *patch* da derivation primária e de `goModules`.

Alternativamente, a derivation primária fornece uma função `passthru.overrideModAttrs` sobrescrevível para armazenar a sobreposição de atributos implicitamente assumida por `goModules.overrideAttrs`. Aqui está um exemplo de uso de `overrideModAttrs`:

```nix
{
  pet-overridden = pet.overrideAttrs (
    finalAttrs: previousAttrs: {
      passthru = previousAttrs.passthru // {
        # If the original package has an `overrideModAttrs` attribute set, you'd
        # want to extend it, and not replace it. Hence we use
        # `lib.composeExtensions`. If you are sure the `overrideModAttrs` of the
        # original package trivially does nothing, you can safely replace it
        # with your own by not using `lib.composeExtensions`.
        overrideModAttrs = lib.composeExtensions previousAttrs.passthru.overrideModAttrs (
          finalModAttrs: previousModAttrs: {
            # goModules-specific overriding goes here
            postBuild = ''
              # Here you have access to the `vendor` directory.
              substituteInPlace vendor/github.com/example/repo/file.go \
                --replace-fail "panic(err)" ""
            '';
          }
        );
      };
    }
  );
}
```

## Controlando o ambiente Go {#ssec-go-environment}

A construção Go pode ser ainda mais ajustada definindo variáveis de ambiente via o atributo `env`. Na maioria dos casos, isso não é necessário. Valores possíveis podem ser encontrados na [documentação Go de variáveis de ambiente aceitas](https://pkg.go.dev/cmd/go#hdr-Environment_variables). Observe que algumas dessas *flags* são definidas pelo próprio *helper* de construção e não devem ser definidas explicitamente. Em caso de dúvida, procure na implementação do *helper* de construção.

`buildGoModule` suporta oficialmente as seguintes variáveis de ambiente:

### `env.CGO_ENABLED` {#var-go-CGO_ENABLED}

Quando definido como `0`, o comando [cgo](https://pkg.go.dev/cmd/cgo) é desabilitado. Como consequência, o programa de construção não pode mais fazer *link* com bibliotecas C, e o binário resultante é ligado estaticamente.

Ao construir com CGO habilitado, o Go provavelmente fará *link* de alguns pacotes da biblioteca padrão do Go com bibliotecas C, mesmo quando o código alvo não chamar explicitamente dependências C. Com `env.CGO_ENABLED = 0;`, o Go sempre usará a implementação nativa Go desses pacotes internos. Para referência, veja os pacotes [net](https://pkg.go.dev/net#hdr-Name_Resolution) e [os/user](https://pkg.go.dev/os/user#pkg-overview). Observe que a decisão se esses pacotes devem usar a implementação nativa Go ou não também pode ser controlada por nível de pacote usando *build tags* (`tags`). Caso o CGO esteja desabilitado, essas *tags* não têm efeito adicional.

Quando um programa Go depende de bibliotecas C, coloque essas dependências em `buildInputs`:

```nix
{
  buildInputs = [
    libvirt
    libxml2
  ];
}
```

`env.CGO_ENABLED` o padrão é `1`.

## Pulando testes {#ssec-skip-go-tests}

`buildGoModule` executa testes por padrão. Testes falhos podem ser desabilitados usando o parâmetro `checkFlags`.
Isso é feito com as *flags* [`-skip` ou `-run`](https://pkg.go.dev/cmd/go#hdr-Testing_flags) do comando `go test`.

Por exemplo, apenas uma seleção de testes poderia ser executada com:

```nix
{
  # -run and -skip accept regular expressions
  checkFlags = [ "-run=^Test(Simple|Fast)$" ];
}
```

Se uma quantidade maior de testes deve ser pulada, o seguinte padrão pode ser usado:

```nix
{
  checkFlags =
    let
      # Skip tests that require network access
      skippedTests = [
        "TestNetwork"
        "TestDatabase/with_mysql" # exclude only the subtest
        "TestIntegration"
      ];
    in
    [ "-skip=^${builtins.concatStringsSep "$|^" skippedTests}$" ];
}
```

Para desabilitar os testes completamente, defina `doCheck = false;`.

## Migrando de `buildGoPackage` para `buildGoModule` {#buildGoPackage-migration}

::: {.warning}
`buildGoPackage` foi removido para o lançamento 25.05. Ele era usado para construir programas Go legados que não suportam módulos Go.
:::

Módulos Go, lançados há 6 anos, agora são amplamente adotados no ecossistema.
A maioria dos projetos *upstream* está usando módulos Go, e as ferramentas anteriormente usadas para gerenciamento de dependências em Go estão em grande parte obsoletas, arquivadas ou, no mínimo, sem manutenção neste momento.

Caso um projeto não tenha dependências externas ou as dependências sejam *vendored* de uma forma compreendida por `go mod init`, a migração pode ser feita com algumas mudanças no pacote.

- Mudar o *builder* de `buildGoPackage` para `buildGoModule`
- Remover `goPackagePath` e outros atributos específicos de `buildGoPackage`
- Definir `vendorHash = null;`
- Executar `go mod init <module name>` em `postPatch`

Caso o pacote tenha dependências externas que não são *vendored* ou a configuração de construção seja mais complexa, a fonte *upstream* pode precisar ser *patchada*.
Exemplos para a migração podem ser encontrados na [issue que rastreia a migração dentro de nixpkgs](https://github.com/NixOS/nixpkgs/issues/318069).