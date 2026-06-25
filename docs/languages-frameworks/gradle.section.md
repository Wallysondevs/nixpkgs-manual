# Gradle {#gradle}

Gradle é uma ferramenta de build popular para Java/Kotlin. O próprio Gradle atualmente não fornece ferramentas para tornar a resolução de dependências reproduzível, então o nixpkgs possui um proxy projetado para interceptar requisições web do Gradle para registrar dependências, de modo que elas possam ser restauradas de forma reproduzível.

## Construindo um pacote Gradle {#building-a-gradle-package}

Veja como uma derivation típica se parecerá:

```nix
stdenv.mkDerivation (finalAttrs: {
  pname = "pdftk";
  version = "3.3.3";

  src = fetchFromGitLab {
    owner = "pdftk-java";
    repo = "pdftk";
    tag = "v${finalAttrs.version}";
    hash = "sha256-ciKotTHSEcITfQYKFZ6sY2LZnXGChBJy0+eno8B3YHY=";
  };

  nativeBuildInputs = [
    gradle
    makeWrapper
  ];

  # if the package has dependencies, mitmCache must be set
  mitmCache = gradle.fetchDeps {
    inherit (finalAttrs) pname;
    data = ./deps.json;
  };

  # this is required for using mitm-cache on Darwin
  __darwinAllowLocalNetworking = true;

  gradleFlags = [ "-Dfile.encoding=utf-8" ];

  # defaults to "assemble"
  gradleBuildTask = "shadowJar";

  # will run the gradleCheckTask (defaults to "test")
  doCheck = true;

  installPhase = ''
    mkdir -p $out/{bin,share/pdftk}
    cp build/libs/pdftk-all.jar $out/share/pdftk

    makeWrapper ${lib.getExe jre} $out/bin/pdftk \
      --add-flags "-jar $out/share/pdftk/pdftk-all.jar"

    cp ${finalAttrs.src}/pdftk.1 $out/share/man/man1
  '';

  meta.sourceProvenance = with lib.sourceTypes; [
    fromSource
    binaryBytecode # mitm cache
  ];
})
```

Para atualizar (ou inicializar) dependências, execute o script de atualização através de algo como `$(nix-build -A <pname>.mitmCache.updateScript)` (`nix-build` constrói o `updateScript`, `$(...)` executa o script no caminho impresso por `nix-build`).

Se o seu pacote não puder ser avaliado usando uma expressão `pkgs.<pname>` simples (por exemplo, se o seu pacote não estiver localizado no nixpkgs, ou se você quiser sobrescrever alguns de seus atributos), você geralmente terá que passar `pkg` em vez de `pname` para `gradle.fetchDeps`. Existem duas maneiras de fazer isso.

A primeira é adicionar os argumentos da derivation necessários para obter o pacote. Usando o exemplo do pdftk acima:

```nix
{
  lib,
  stdenv,
  gradle,
  # ...
  pdftk,
}:

stdenv.mkDerivation (finalAttrs: {
  # ...
  mitmCache = gradle.fetchDeps {
    pkg = pdftk;
    data = ./deps.json;
  };
})
```

Isso permite que você `override` quaisquer argumentos do `pkg` usado para o script de atualização (por exemplo, `pkg = pdftk.override { enableSomeFlag = true };`).

A segunda é usar `finalAttrs.finalPackage` assim:

```nix
stdenv.mkDerivation (finalAttrs: {
  # ...
  mitmCache = gradle.fetchDeps {
    pkg = finalAttrs.finalPackage;
    data = ./deps.json;
  };
})
```
A limitação deste método é que você não pode sobrescrever os argumentos da derivation `pkg`.

No primeiro caso, o script de atualização permanecerá o mesmo mesmo que a derivation seja chamada com argumentos diferentes. No segundo caso, o script de atualização mudará dependendo dos argumentos da derivation. Cabe a você decidir qual funcionaria melhor para sua derivation.

## Script de Atualização {#gradle-update-script}

O script de atualização faz o seguinte:

- Constrói o código-fonte da derivation via `pkgs.srcOnly`
- Entra em um `nix-shell` para a derivation em um sandbox `bwrap` (o sandbox é usado apenas no Linux)
- Define a variável de ambiente `IN_GRADLE_UPDATE_DEPS` para `1`
- Executa o `unpackPhase`, `patchPhase`, `configurePhase` da derivation
- Executa o `gradleUpdateScript` da derivation (o hook de configuração do Gradle define um valor padrão para ele, que executa os hooks `preBuild`, `preGradleUpdate`, busca as dependências usando `gradleUpdateTask` e, finalmente, executa o hook `postGradleUpdate`)
- Finalmente, armazena todos os hashes dos arquivos buscados no lockfile. Eles podem ser arquivos `.jar`/`.pom` de repositórios Maven, ou podem ser arquivos usados de outra forma para construir o pacote.

`fetchDeps` aceita os seguintes argumentos:

- `attrPath` - o caminho para o pacote no nixpkgs (por exemplo, `"javaPackages.openjfx25"`). Usado para metadados do script de atualização.
- `pname` - um alias para `attrPath` para conveniência. Isso é o que você geralmente usará em vez de `pkg` ou `attrPath`.
- `pkg` - o pacote a ser usado para buscar as dependências. O padrão é `getAttrFromPath (splitString "." attrPath) pkgs`.
- `bwrapFlags` - permite que você sobrescreva as flags do bwrap (relevante apenas para projetos downstream, fora do nixpkgs)
- `data` - caminho para o lockfile de dependências (pode ser relativo ao pacote, pode ser absoluto). No nixpkgs, é desencorajado que os lockfiles tenham qualquer nome diferente de `deps.json`. Considere criar subdiretórios se o seu pacote exigir vários arquivos `deps.json`.

## Ambiente {#gradle-environment}

O hook de configuração do Gradle aceita as seguintes variáveis de ambiente:

- `mitmCache` - o cache do proxy MITM importado usando `gradle.fetchDeps`
- `gradleFlags` - flags de linha de comando a serem usadas para cada invocação do Gradle (isso simplesmente registra uma função que usa as flags necessárias).
  - Você não pode usar `gradleFlags` para flags que contêm espaços; nesse caso, você deve adicionar `gradleFlagsArray+=("-flag with spaces")` ao código bash da derivation.
  - Se você quiser construir o pacote usando uma versão específica do Java, você pode passar `"-Dorg.gradle.java.home=${jdk}"` como uma das flags.
- `gradleBuildTask` - a tarefa (ou tarefas) do Gradle a ser usada para construir o pacote. O padrão é `assemble`.
- `gradleCheckTask` - a tarefa (ou tarefas) do Gradle a ser usada para verificar o pacote se `doCheck` estiver definido como `true`. O padrão é `test`.
- `gradleUpdateTask` - a tarefa (ou tarefas) do Gradle a ser usada para buscar todas as dependências do pacote em `mitmCache.updateScript`. O padrão é `nixDownloadDeps`.
- `gradleUpdateScript` - o código a ser executado para buscar todas as dependências do pacote em `mitmCache.updateScript`. O padrão é executar os hooks `preBuild` e `preGradleUpdate`, executar o `gradleUpdateTask` e, finalmente, executar o hook `postGradleUpdate`.
- `gradleInitScript` - caminho para o `--init-script` a ser passado para o Gradle. Por padrão, um script de inicialização simples que permite a criação de arquivos reproduzíveis é usado.
  - Note que arquivos reproduzíveis podem quebrar algumas builds. Um exemplo de erro causado por isso é `Could not create task ':jar'. Replacing an existing task that may have already been used by other plugins is not supported`. Se você receber tal erro, a "solução" mais fácil é desabilitar completamente os arquivos reproduzíveis, definindo `gradleInitScript` para algo como `writeText "empty-init-script.gradle" ""`
- `enableParallelBuilding` / `enableParallelChecking` / `enableParallelUpdating` - passa `--parallel` para o Gradle na fase de build/verificação ou no script de atualização. O padrão é true. Se a build falhar por razões misteriosas, considere definir isso como false.
- `dontUseGradleConfigure` / `dontUseGradleBuild` / `dontUseGradleCheck` - força a desativação do hook de configuração do Gradle para certas fases.
  - Note que se você desabilitar o hook de configuração, você pode enfrentar problemas como `Failed to load native library 'libnative-platform.so'`, porque o hook de configuração é responsável por inicializar o Gradle.