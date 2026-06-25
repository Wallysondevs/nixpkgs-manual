# Dotnet {#dotnet}

## Fluxo de Trabalho de Desenvolvimento Local {#local-development-workflow}

Para desenvolvimento local, é recomendado usar nix-shell para criar um ambiente dotnet:

```nix
# shell.nix
with import <nixpkgs> { };

mkShell {
  name = "dotnet-env";
  packages = [ dotnet-sdk ];
}
```

### Usando múltiplos SDKs em um fluxo de trabalho {#using-many-sdks-in-a-workflow}

É muito provável que mais de um sdk seja necessário em um determinado projeto. O Dotnet fornece várias frameworks diferentes (Ex: dotnetcore, aspnetcore, etc.), bem como muitas versões para uma dada framework. Normalmente, o dotnet é capaz de buscar uma framework e instalá-la em relação ao executável. No entanto, isso significaria escrever no nix store em nixpkgs, que é somente leitura. Para suportar o caso de uso de múltiplos sdks, pode-se compor um ambiente usando `dotnetCorePackages.combinePackages`:

```nix
with import <nixpkgs> { };

mkShell {
  name = "dotnet-env";
  packages = [
    (
      with dotnetCorePackages;
      combinePackages [
        sdk_8_0
        sdk_9_0
      ]
    )
  ];
}
```

Isso produzirá uma instalação dotnet que possui os sdks dotnet 8.0 e 9.0. O primeiro sdk listado terá sua utilidade CLI presente no ambiente resultante. Exemplo de saída de informações:

```ShellSession
$ dotnet --info
.NET SDK:
 Version:           9.0.100
 Commit:            59db016f11
 Workload version:  9.0.100-manifests.3068a692
 MSBuild version:   17.12.7+5b8665660

Runtime Environment:
 OS Name:     nixos
 OS Version:  25.05
 OS Platform: Linux
 RID:         linux-x64
 Base Path:   /nix/store/a03c70i7x6rjdr6vikczsp5ck3v6rixh-dotnet-sdk-9.0.100/share/dotnet/sdk/9.0.100/

.NET workloads installed:
There are no installed workloads to display.
Configured to use loose manifests when installing new manifests.

Host:
  Version:      9.0.0
  Architecture: x64
  Commit:       9d5a6a9aa4

.NET SDKs installed:
  8.0.404 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/sdk]
  9.0.100 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/sdk]

.NET runtimes installed:
  Microsoft.AspNetCore.App 8.0.11 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/shared/Microsoft.AspNetCore.App]
  Microsoft.AspNetCore.App 9.0.0 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/shared/Microsoft.AspNetCore.App]
  Microsoft.NETCore.App 8.0.11 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/shared/Microsoft.NETCore.App]
  Microsoft.NETCore.App 9.0.0 [/nix/store/6wlrjiy10wg766490dcmp6x64zb1vc8j-dotnet-core-combined/share/dotnet/shared/Microsoft.NETCore.App]

Other architectures found:
  None

Environment variables:
  Not set

global.json file:
  Not found

Learn more:
  https://aka.ms/dotnet/info

Download .NET:
  https://aka.ms/dotnet/download
```

## dotnet-sdk vs dotnetCorePackages.sdk {#dotnet-sdk-vs-dotnetcorepackages.sdk}

O `dotnetCorePackages.sdk_X_Y` é preferido em relação ao antigo dotnet-sdk, pois tanto a versão principal quanto a secundária são muito importantes para um ambiente dotnet. Se uma determinada versão secundária não estiver presente (ou for alterada), isso provavelmente quebrará sua capacidade de construir um projeto.

## dotnetCorePackages.sdk vs dotnetCorePackages.runtime vs dotnetCorePackages.aspnetcore {#dotnetcorepackages.sdk-vs-dotnetcorepackages.aspnetcore}

O `dotnetCorePackages.sdk` contém tanto um runtime quanto o sdk completo de uma determinada versão. Os pacotes `runtime` e `aspnetcore` destinam-se a servir como runtimes mínimos para serem implantados junto com aplicações já construídas.

## Empacotando uma Aplicação Dotnet {#packaging-a-dotnet-application}

Para empacotar aplicações Dotnet, você pode usar `buildDotnetModule`. Este possui argumentos semelhantes a `stdenv.mkDerivation`, com as seguintes adições:

*   `projectFile` é usado para especificar o arquivo de projeto dotnet, relativo à raiz do código-fonte. Estes possuem extensões de arquivo `.sln` (solução inteira) ou `.csproj` (projeto único). Isso também pode ser uma lista de múltiplos projetos. Quando omitido, tentará encontrar e construir a solução (`.sln`). Se encontrar problemas, certifique-se de defini-lo para um arquivo (ou uma lista de arquivos) com a extensão `.csproj` - a construção de aplicações como soluções inteiras não é totalmente suportada pela CLI do .NET.
*   `nugetDeps` deve ser um caminho para um arquivo JSON, um caminho para um arquivo nix (obsoleto), uma derivation, ou uma lista de derivations. Um arquivo `deps.json` pode ser gerado usando o script anexado a `passthru.fetch-deps`, que é o método preferido. Todos os pacotes `nugetDeps` são adicionados a `buildInputs`.
::: {.note}
Para mais detalhes sobre como gerenciar o arquivo `deps.json`, veja [Gerando e atualizando dependências NuGet](#generating-and-updating-nuget-dependencies)
:::

*   `packNupkg` é usado para empacotar o projeto como um `nupkg`, e o instala em `$out/share`. Se definido como `true`, a derivation pode ser usada como uma dependência para outro projeto dotnet adicionando-a a `buildInputs`.
*   `buildInputs` pode ser usado para resolver itens de projeto `ProjectReference`. Projetos referenciados podem ser empacotados com `buildDotnetModule` definindo o atributo `packNupkg = true` e passando uma lista de derivations para `buildInputs`. Como estamos compartilhando projetos referenciados como NuGets, eles devem ser adicionados aos arquivos csproj/fsproj como `PackageReference` também. Por exemplo, seu projeto tem uma dependência local:
    ```xml
        <ProjectReference Include="../foo/bar.fsproj" />
    ```
    Para habilitar a descoberta através de `buildInputs` você precisaria adicionar:
    ```xml
        <ProjectReference Include="../foo/bar.fsproj" />
        <PackageReference Include="bar" Version="*" Condition=" '$(ContinuousIntegrationBuild)'=='true' "/>
    ```
*   `executables` é usado para especificar quais executáveis são empacotados para `$out/bin`, relativo a `$out/lib/$pname`. Se isso não for definido, todos os executáveis gerados serão instalados. Se você não quiser instalar nenhum, defina-o como `[]`. Isso é feito na fase `preFixup`.
*   `runtimeDeps` é usado para empacotar bibliotecas em `LD_LIBRARY_PATH`. É assim que o dotnet geralmente lida com dependências de runtime.
*   `buildType` é usado para alterar o tipo de build. Os valores possíveis são `Release`, `Debug`, etc. Por padrão, isso é definido como `Release`.
*   `selfContainedBuild` permite habilitar a flag de build [self-contained](https://docs.microsoft.com/en-us/dotnet/core/deploying/#publish-self-contained). Por padrão, é definido como falso e as aplicações geradas têm uma dependência do runtime dotnet selecionado. Se habilitado, o runtime dotnet é empacotado no executável e a aplicação construída não tem dependência do .NET.
*   `useAppHost` habilitará a criação de um executável binário que executa a aplicação .NET usando a raiz especificada. Mais informações na [documentação da Microsoft](https://learn.microsoft.com/en-us/dotnet/core/deploying/#publish-framework-dependent). Habilitado por padrão.
*   `useDotnetFromEnv` alterará o wrapper binário para que ele use o .NET do ambiente. O runtime especificado por `dotnet-runtime` é fornecido como um fallback caso nenhum .NET esteja instalado no ambiente do usuário. Isso é mais útil para ferramentas globais .NET e servidores LSP, que frequentemente estendem a CLI do .NET e seu runtime deve corresponder ao runtime .NET do usuário.
*   `dotnet-sdk` é útil em casos onde você precisa alterar qual dotnet SDK está sendo usado. Você também pode definir isso para o resultado de `dotnetSdkPackages.combinePackages`, se o projeto usar múltiplos SDKs para construir.
*   `dotnet-runtime` é útil em casos onde você precisa alterar qual dotnet runtime está sendo usado. Isso pode ser um runtime dotnet regular, ou um aspnetcore.
*   `testProjectFile` é útil em casos onde o arquivo de projeto regular não contém os testes de unidade. Ele é restaurado e construído, mas não instalado. Você pode precisar regenerar seu lockfile nuget após definir isso. Note que, se definido, apenas os testes deste projeto são executados.
*   `testFilters` é usado para desabilitar a execução de testes de unidade com base em vários [filtros](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-test#filter-option-details). Isso é passado como: `dotnet test --filter "{}"`, com cada filtro sendo concatenado usando `"&"`.
*   `disabledTests` é usado para desabilitar a execução de testes de unidade específicos. Isso é passado como: `dotnet test --filter "FullyQualifiedName!={}"`, para garantir compatibilidade com todas as frameworks de teste de unidade.
*   `dotnetRestoreFlags` pode ser usado para passar flags para `dotnet restore`.
*   `dotnetBuildFlags` pode ser usado para passar flags para `dotnet build`.
*   `dotnetTestFlags` pode ser usado para passar flags para `dotnet test`. Usado apenas se `doCheck` for definido como `true`.
*   `dotnetInstallFlags` pode ser usado para passar flags para `dotnet install`.
*   `dotnetPackFlags` pode ser usado para passar flags para `dotnet pack`. Usado apenas se `packNupkg` for definido como `true`.
*   `dotnetFlags` pode ser usado para passar flags para todas as fases acima.

Ao empacotar uma nova aplicação, você precisa buscar suas dependências. Crie um `deps.json` vazio, defina `nugetDeps = ./deps.json`, então execute `nix-build -A package.fetch-deps` para gerar um script que construirá o lockfile para você.

Aqui está um exemplo de `default.nix`, usando alguns dos argumentos discutidos anteriormente:
```nix
{
  lib,
  buildDotnetModule,
  dotnetCorePackages,
  ffmpeg,
}:

let
  referencedProject = import ../../bar {
    # ...
  };
in
buildDotnetModule rec {
  pname = "someDotnetApplication";
  version = "0.1";

  src = ./.;

  projectFile = "src/project.sln";
  nugetDeps = ./deps.json; # see "Generating and updating NuGet dependencies" section for details

  buildInputs = [
    referencedProject
  ]; # `referencedProject` must contain `nupkg` in the folder structure.

  dotnet-sdk = dotnetCorePackages.sdk_8_0;
  dotnet-runtime = dotnetCorePackages.runtime_8_0;

  executables = [ "foo" ]; # This wraps "$out/lib/$pname/foo" to `$out/bin/foo`.
  executables = [ ]; # Don't install any executables.

  packNupkg = true; # This packs the project as "foo-0.1.nupkg" at `$out/share`.

  runtimeDeps = [ ffmpeg ]; # This will wrap ffmpeg's library path into `LD_LIBRARY_PATH`.
}
```

Lembre-se que você pode marcar a equipe [`@NixOS/dotnet`](https://github.com/orgs/nixos/teams/dotnet) para obter ajuda e revisão de código.

## Ferramentas globais Dotnet {#dotnet-global-tools}

[Ferramentas globais .NET](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools) são um mecanismo fornecido pela CLI do dotnet para instalar binários .NET de pacotes Nuget.

Elas podem ser instaladas como uma ferramenta global para todo o sistema, ou como uma ferramenta local específica para o projeto.

A instalação local é a mais fácil e funciona no NixOS da mesma forma que em outras distribuições Linux. [Veja a documentação do dotnet](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools#install-a-local-tool) para saber mais.

O método de instalação global também deve funcionar na maioria das vezes. Você deve se lembrar de atualizar o valor `PATH` para o local onde as ferramentas são instaladas (a CLI o informará sobre isso durante a instalação) e também definir o valor `DOTNET_ROOT`, para que a ferramenta possa encontrar o pacote .NET SDK. Você pode encontrar o caminho para o SDK executando `nix eval --raw nixpkgs#dotnet-sdk` (substitua o pacote `dotnet-sdk` por outro se uma versão diferente do SDK for necessária).

Este método não é recomendado no NixOS, pois não é declarativo e envolve a instalação de binários não feitos para NixOS, o que nem sempre funcionará.

A terceira, e preferida, maneira é empacotar a ferramenta em uma Nix derivation.

### Empacotando ferramentas globais Dotnet {#packaging-dotnet-global-tools}

Ferramentas globais Dotnet são binários .NET padrão, apenas disponibilizados através de um pacote NuGet especial. Portanto, elas podem ser construídas e empacotadas como qualquer aplicação .NET, usando `buildDotnetModule`.

Se, no entanto, o código-fonte não estiver disponível ou for difícil de construir, o helper `buildDotnetGlobalTool` pode ser usado, que empacotará a ferramenta diretamente de seu pacote NuGet.

Este helper possui os mesmos argumentos que `buildDotnetModule`, com algumas diferenças:

*   `pname` e `version` são obrigatórios e serão usados para encontrar o pacote NuGet da ferramenta
*   `nugetName` pode ser usado para sobrescrever o nome do pacote NuGet que será baixado, se for diferente de `pname`
*   `nugetHash` é o hash do pacote NuGet buscado. `nugetSha256` também é suportado, mas não recomendado. Defina isso como `lib.fakeHash` para a primeira construção, e ele irá falhar, fornecendo o hash correto. Lembre-se também de atualizá-lo durante as atualizações de versão (ele não falhará se você apenas mudar a versão enquanto tiver um pacote buscado em `/nix/store`)
*   `dotnet-runtime` é definido como `dotnet-sdk` por padrão. Ao alterar isso, lembre-se que as ferramentas .NET buscadas do NuGet requerem um SDK.

Aqui está um exemplo de empacotamento de `pbm`, um binário não livre sem código-fonte disponível:
```nix
{ buildDotnetGlobalTool, lib }:

buildDotnetGlobalTool {
  pname = "pbm";
  version = "1.3.1";

  nugetHash = "sha256-ZG2HFyKYhVNVYd2kRlkbAjZJq88OADe3yjxmLuxXDUo=";

  meta = {
    homepage = "https://cmd.petabridge.com/index.html";
    changelog = "https://cmd.petabridge.com/articles/RELEASE_NOTES.html";
    license = lib.licenses.unfree;
    platforms = lib.platforms.linux;
  };
}
```
## Gerando e atualizando dependências NuGet {#generating-and-updating-nuget-dependencies}

Ao escrever uma nova expressão, você pode usar o script `fetch-deps` gerado para inicializar o lockfile. Depois de definir `nugetDeps` para o local desejado do lockfile (por exemplo, `./deps.json`), construa o script com `nix-build -A package.fetch-deps` e então execute o resultado. (Quando o attr raiz é o seu pacote, é simplesmente `nix-build -A fetch-deps`.)

Existe também um método manual:
Primeiro, restaure os pacotes para o diretório `out`, certifique-se de ter clonado o repositório upstream e de estar dentro dele.

```bash
$ dotnet restore --packages out
  Determining projects to restore...
  Restored /home/ggg/git-credential-manager/src/shared/Git-Credential-Manager/Git-Credential-Manager.csproj (in 1.21 sec).
```

Em seguida, use a ferramenta `nuget-to-json` fornecida em Nixpkgs para gerar um lockfile para `deps.json` a partir dos pacotes dentro do diretório `out`.

```bash
$ nuget-to-json out > deps.json
```
A ferramenta `nuget-to-json` gerará uma saída semelhante à abaixo
```json
[
  {
    "pname": "Avalonia",
    "version": "11.1.3",
    "hash": "sha256-kz+k/vkuWoL0XBvRT8SadMOmmRCFk9W/J4k/IM6oYX0="
  },
  {
    "pname": "Avalonia.Angle.Windows.Natives",
    "version": "2.1.22045.20230930",
    "hash": "sha256-RxPcWUT3b/+R3Tu5E5ftpr5ppCLZrhm+OTsi0SwW3pc="
  },
  {
    "pname": "Avalonia.BuildServices",
    "version": "0.0.29",
    "hash": "sha256-WPHRMNowRnYSCh88DWNBCltWsLPyOfzXGzBqLYE7tRY="
  },
  // ...
  {
    "pname": "System.Runtime.CompilerServices.Unsafe",
    "version": "6.0.0",
    "hash": "sha256-bEG1PnDp7uKYz/OgLOWs3RWwQSVYm+AnPwVmAmcgp2I="
  },
  {
    "pname": "System.Security.Cryptography.ProtectedData",
    "version": "4.5.0",
    "hash": "sha256-Z+X1Z2lErLL7Ynt2jFszku6/IgrngO3V1bSfZTBiFIc="
  },
  {
    "pname": "Tmds.DBus.Protocol",
    "version": "0.16.0",
    "hash": "sha256-vKYEaa1EszR7alHj48R8G3uYArhI+zh2ZgiBv955E98="
  }
]

```

Finalmente, você move o arquivo `deps.json` para o local apropriado a ser usado por `nugetDeps`, e então está tudo pronto!

Se você precisar atualizar as dependências de um pacote, você fará o seguinte:

*   `nix-build -A package.fetch-deps` para gerar o script de atualização para `package`
*   Execute `./result` para regenerar o lockfile para o caminho passado para `nugetDeps` (lembre-se que se não puder ser resolvido para um caminho local, o script escreverá para `$1` ou um caminho temporário)
*   Finalmente, certifique-se de que o arquivo correto foi escrito e que a derivation pode ser construída.