# Maven {#maven}

Maven é uma ferramenta de build bem conhecida para o ecossistema Java; no entanto, apresenta alguns desafios ao ser integrada ao sistema de build do Nix.

A seguir, é apresentada uma lista de padrões comuns sobre como empacotar um projeto Maven (ou qualquer linguagem JVM que possa exportar para Maven) como um pacote Nix.

## Construindo um pacote usando `maven.buildMavenPackage` {#maven-buildmavenpackage}

Considere o seguinte pacote:

```nix
{
  lib,
  fetchFromGitHub,
  jre,
  makeWrapper,
  maven,
}:

maven.buildMavenPackage (finalAttrs: {
  pname = "jd-cli";
  version = "1.2.1";

  src = fetchFromGitHub {
    owner = "intoolswetrust";
    repo = "jd-cli";
    tag = "jd-cli-${finalAttrs.version}";
    hash = "sha256-rRttA5H0A0c44loBzbKH7Waoted3IsOgxGCD2VM0U/Q=";
  };

  mvnHash = "sha256-kLpjMj05uC94/5vGMwMlFzLKNFOKeyNvq/vmB6pHTAo=";

  nativeBuildInputs = [ makeWrapper ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin $out/share/jd-cli
    install -Dm644 jd-cli/target/jd-cli.jar $out/share/jd-cli

    makeWrapper ${jre}/bin/java $out/bin/jd-cli \
      --add-flags "-jar $out/share/jd-cli/jd-cli.jar"

    runHook postInstall
  '';

  meta = {
    description = "Simple command line wrapper around JD Core Java Decompiler project";
    homepage = "https://github.com/intoolswetrust/jd-cli";
    license = lib.licenses.gpl3Plus;
    maintainers = with lib.maintainers; [ majiir ];
  };
})
```

Este pacote chama `maven.buildMavenPackage` para realizar seu trabalho. A principal diferença em relação a `stdenv.mkDerivation` é a variável `mvnHash`, que é um hash de todas as dependências Maven.

::: {.tip}
Após configurar `maven.buildMavenPackage`, realizamos a instalação padrão do `.jar` Java, salvando o `.jar` em `$out/share/java` e, em seguida, criando um wrapper que permite a execução desse arquivo; consulte [](#sec-language-java) para obter informações genéricas adicionais sobre o empacotamento de aplicações Java.
:::

### Sobrescrevendo atributos de pacote Maven {#maven-overriding-package-attributes}

```
overrideMavenAttrs :: (AttrSet -> Derivation) | ((AttrSet -> Attrset) -> Derivation) -> Derivation
```

A saída de `buildMavenPackage` possui um atributo `overrideMavenAttrs`, que é uma função que aceita:
- qualquer subconjunto dos atributos que podem ser passados para `buildMavenPackage`

  ou
- uma função que recebe o argumento passado para a invocação anterior de `buildMavenPackage` (convencionalmente chamado `old`) e retorna um conjunto de atributos que pode ser passado para `buildMavenPackage`

e retorna uma derivation que constrói um pacote Maven com base nos argumentos antigos e novos mesclados.

Isso é semelhante a [](#sec-pkg-overrideAttrs), mas notavelmente não permite acessar o valor final do argumento para `buildMavenPackage`.

:::{.example}
### Exemplo de `overrideMavenAttrs`

Use `overrideMavenAttrs` para construir a versão 1.2.0 do `jd-cli` e desabilitar alguns testes instáveis:

```nix
jd-cli.overrideMavenAttrs (old: rec {
  version = "1.2.0";
  src = fetchFromGitHub {
    owner = old.src.owner;
    repo = old.src.repo;
    tag = "${old.pname}-${version}";
    # old source hash of 1.2.0 version
    hash = "sha256-US7j6tQ6mh1libeHnQdFxPGoxHzbZHqehWSgCYynKx8=";
  };

  # tests can be disabled by prefixing it with `!`
  # see Maven documentation for more details:
  # https://maven.apache.org/surefire/maven-surefire-plugin/examples/single-test.html#Multiple_Formats_in_One
  mvnParameters = lib.escapeShellArgs [
    "-Dsurefire.failIfNoSpecifiedTests=false"
    "-Dtest=!JavaDecompilerTest#basicTest,!JavaDecompilerTest#patternMatchingTest"
  ];

  # old mvnHash of 1.2.0 maven dependencies
  mvnHash = "sha256-N9XC1pg6Y4sUiBWIQUf16QSXCuiAPpXEHGlgApviF4I=";
})
```
:::

### Build offline {#maven-offline-build}

Por padrão, `buildMavenPackage` faz o seguinte:

1. Executa `mvn package -Dmaven.repo.local=$out/.m2 ${mvnParameters}` na [fixed-output derivation](https://nixos.org/manual/nix/stable/glossary.html#gloss-fixed-output-derivation) `fetchedMavenDeps`.
2. Executa `mvn package -o -nsu "-Dmaven.repo.local=$mvnDeps/.m2" ${mvnParameters}` novamente na derivation principal.

Como resultado, os testes são executados duas vezes.
Isso também significa que um teste com falha acionará uma nova tentativa de realizar a fixed-output derivation, o que, por sua vez, baixa todas as dependências novamente.
Para projetos Maven maiores, isso pode levar a um longo ciclo de feedback.

Use `buildOffline = true` para alterar o comportamento de `buildMavenPackage` para o seguinte:
1. Executa `mvn de.qaware.maven:go-offline-maven-plugin:1.2.8:resolve-dependencies -Dmaven.repo.local=$out/.m2 ${mvnDepsParameters}` na fixed-output derivation.
2. Executa `mvn package -o -nsu "-Dmaven.repo.local=$mvnDeps/.m2" ${mvnParameters}` na derivation principal.

Como resultado, todas as dependências são baixadas na etapa 1 e os testes são executados na etapa 2.
Um teste com falha apenas aciona uma reconstrução da etapa 2, pois pode reutilizar as dependências da etapa 1, já que elas não foram alteradas.

::: {.warning}
As dependências de teste não são baixadas na etapa 1 e, portanto, estão ausentes na etapa 2, o que provavelmente fará com que o build falhe. O plugin `go-offline` não consegue lidar com essas chamadas [dependências dinâmicas](https://github.com/qaware/go-offline-maven-plugin?tab=readme-ov-file#dynamic-dependencies).
Nesse caso, você deve adicionar essas dependências dinâmicas manualmente com:
```nix
maven.buildMavenPackage {
  manualMvnArtifacts = [
    # add dynamic test dependencies here
    "org.apache.maven.surefire:surefire-junit-platform:3.1.2"
    "org.junit.platform:junit-platform-launcher:1.10.0"
  ];
}
```
:::

### Plugins Maven estáveis {#stable-maven-plugins}

Maven define versões padrão para seus plugins principais, por exemplo, `maven-compiler-plugin`. Se seu projeto não sobrescrever essas versões, uma atualização do Maven alterará a versão dos plugins utilizados e, consequentemente, a derivation e o hash.

Quando o `maven` é atualizado, o `mvnHash` para a derivation também deve ser atualizado: caso contrário, o projeto será construído com a derivation de plugins antigos e falhará porque os plugins solicitados estão ausentes.

Isso claramente impede atualizações automáticas do Maven: um esforço manual deve ser feito em todo o nixpkgs por qualquer mantenedor que deseje impulsionar as atualizações.

Para garantir que seu pacote não adicione esforço manual extra ao atualizar o Maven, defina explicitamente as versões para todos os plugins. Você pode verificar se este é o caso adicionando o seguinte plugin ao seu POM (pai):

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-enforcer-plugin</artifactId>
  <version>3.3.0</version>
  <executions>
    <execution>
      <id>enforce-plugin-versions</id>
      <goals>
        <goal>enforce</goal>
      </goals>
      <configuration>
        <rules>
          <requirePluginVersions />
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

## Usando `mvn2nix` manualmente {#maven-mvn2nix}
::: {.warning}
Este método não é mais recomendado; consulte [](#maven-buildmavenpackage) para a forma mais simples e preferida.
:::

Para os propósitos deste exemplo, vamos considerar um projeto Maven muito básico com o seguinte `pom.xml` com uma única dependência em [emoji-java](https://github.com/vdurmont/emoji-java).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>io.github.fzakaria</groupId>
  <artifactId>maven-demo</artifactId>
  <version>1.0</version>
  <packaging>jar</packaging>
  <name>NixOS Maven Demo</name>

  <dependencies>
    <dependency>
        <groupId>com.vdurmont</groupId>
        <artifactId>emoji-java</artifactId>
        <version>5.1.1</version>
      </dependency>
  </dependencies>
</project>
```

Nosso arquivo de classe principal será muito simples:

```java
import com.vdurmont.emoji.EmojiParser;

public class Main {
  public static void main(String[] args) {
    String str = "NixOS :grinning: is super cool :smiley:!";
    String result = EmojiParser.parseToUnicode(str);
    System.out.println(result);
  }
}
```

Você encontra este projeto de demonstração em [https://github.com/fzakaria/nixos-maven-example](https://github.com/fzakaria/nixos-maven-example).

### Resolvendo dependências {#solving-for-dependencies}

#### buildMaven com NixOS/mvn2nix-maven-plugin {#buildmaven-with-nixosmvn2nix-maven-plugin}
`buildMaven` é um método alternativo que tenta seguir padrões semelhantes de outras linguagens de programação gerando um arquivo de lock. Ele depende do plugin Maven [mvn2nix-maven-plugin](https://github.com/NixOS/mvn2nix-maven-plugin).

Primeiro, você gera um arquivo `project-info.json` usando o plugin Maven.

> Isso deve ser executado no repositório de código-fonte do projeto ou deve ser informado qual `pom.xml` executar.

```bash
# run this step within the project's source repository
❯ mvn org.nixos.mvn2nix:mvn2nix-maven-plugin:mvn2nix

❯ cat project-info.json | jq | head
{
  "project": {
    "artifactId": "maven-demo",
    "groupId": "org.nixos",
    "version": "1.0",
    "classifier": "",
    "extension": "jar",
    "dependencies": [
      {
        "artifactId": "maven-resources-plugin",
```

Este arquivo é então passado para a função `buildMaven`, e ela retorna 2 atributos.

**`repo`**:
    Um repositório Maven que é um linkFarm de todas as dependências encontradas no `project-info.json`

**`build`**:
    Uma derivation simples que executa `mvn compile` e `mvn package` para construir o JAR. Você pode usar isso como inspiração para derivations mais complexas.

Aqui está um [exemplo](https://github.com/fzakaria/nixos-maven-example/blob/main/build-maven-repository.nix) de construção do repositório Maven

```nix
{
  pkgs ? import <nixpkgs> { },
}:
with pkgs;
(buildMaven ./project-info.json).repo
```

O benefício em relação à _invocação dupla_, como veremos abaixo, é que a entrada _/nix/store_ é um _linkFarm_ de cada pacote, de modo que as alterações em seu conjunto de dependências não envolvem o download de tudo do zero.

```bash
❯ tree $(nix-build --no-out-link build-maven-repository.nix) | head
/nix/store/g87va52nkc8jzbmi1aqdcf2f109r4dvn-maven-repository
├── antlr
│   └── antlr
│       └── 2.7.2
│           ├── antlr-2.7.2.jar -> /nix/store/d027c8f2cnmj5yrynpbq2s6wmc9cb559-antlr-2.7.2.jar
│           └── antlr-2.7.2.pom -> /nix/store/mv42fc5gizl8h5g5vpywz1nfiynmzgp2-antlr-2.7.2.pom
├── avalon-framework
│   └── avalon-framework
│       └── 4.1.3
│           ├── avalon-framework-4.1.3.jar -> /nix/store/iv5fp3955w3nq28ff9xfz86wvxbiw6n9-avalon-framework-4.1.3.jar
```

#### Invocação Dupla {#double-invocation}
::: {.note}
Este padrão é o mais simples, mas pode causar reconstruções desnecessárias devido à alteração do hash de saída.
:::

A invocação dupla é uma maneira _simples_ de contornar o problema de que `nix-build` pode estar em sandbox e não ter conectividade com a Internet.

Ele trata todo o repositório Maven como uma única fonte a ser baixada, contando com a resolução de dependências do Maven para satisfazer o hash de saída. Isso é semelhante a fetchers como `fetchgit`, exceto que ele precisa executar um build Maven para determinar o que baixar.

O primeiro passo será construir o projeto Maven como uma fixed-output derivation para coletar o repositório Maven -- abaixo está um [exemplo](https://github.com/fzakaria/nixos-maven-example/blob/main/double-invocation-repository.nix).

::: {.note}
Tradicionalmente, o repositório Maven está em `~/.m2/repository`. Iremos sobrescrever isso para ser o diretório `$out`.
:::

```nix
{
  lib,
  stdenv,
  maven,
}:
stdenv.mkDerivation {
  name = "maven-repository";
  buildInputs = [ maven ];
  src = ./.; # or fetchFromGitHub, cleanSourceWith, etc
  buildPhase = ''
    runHook preBuild

    mvn package -Dmaven.repo.local=$out

    runHook postBuild
  '';

  # keep only *.{pom,jar,sha1,nbm} and delete all ephemeral files with lastModified timestamps inside
  installPhase = ''
    runHook preInstall

    find $out -type f \
      -name \*.lastUpdated -or \
      -name resolver-status.properties -or \
      -name _remote.repositories \
      -delete

    runHook postInstall
  '';

  # don't do any fixup
  dontFixup = true;
  outputHashAlgo = null;
  outputHashMode = "recursive";
  # replace this with the correct SHA256
  outputHash = lib.fakeHash;
}
```

O build falhará e informará o `outputHash` esperado para ser colocado. Depois de definir o hash, o build retornará com uma entrada `/nix/store` cujo conteúdo é o repositório Maven completo.

::: {.warning}
Alguns arquivos adicionais são excluídos, o que poderia fazer com que o hash de saída mudasse potencialmente em execuções subsequentes.
:::

```bash
❯ tree $(nix-build --no-out-link double-invocation-repository.nix) | head
/nix/store/8kicxzp98j68xyi9gl6jda67hp3c54fq-maven-repository
├── backport-util-concurrent
│   └── backport-util-concurrent
│       └── 3.1
│           ├── backport-util-concurrent-3.1.pom
│           └── backport-util-concurrent-3.1.pom.sha1
├── classworlds
│   └── classworlds
│       ├── 1.1
│       │   ├── classworlds-1.1.jar
```

Se seu pacote usa dependências _SNAPSHOT_ ou _version ranges_; há uma grande probabilidade de que, com o tempo, seu hash de saída mude, já que as dependências resolvidas podem mudar. Portanto, este método é menos recomendado do que usar `buildMaven`.

### Construindo um JAR {#building-a-jar}

Independentemente da estratégia escolhida acima, a etapa para construir a derivation é a mesma.

```nix
{
  stdenv,
  maven,
  callPackage,
}:
let
  # pick a repository derivation, here we will use buildMaven
  repository = callPackage ./build-maven-repository.nix { };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "maven-demo";
  version = "1.0";

  src = fetchTarball "https://github.com/fzakaria/nixos-maven-example/archive/main.tar.gz";
  buildInputs = [ maven ];

  buildPhase = ''
    runHook preBuild

    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} package;

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm644 target/${finalAttrs.pname}-${finalAttrs.version}.jar $out/share/java

    runHook postInstall
  '';
})
```

::: {.tip}
Colocamos a biblioteca em `$out/share/java`, pois o pacote JDK possui um _stdenv setup hook_ que adiciona quaisquer JARs nos diretórios `share/java` das entradas de build ao ambiente CLASSPATH.
:::

```bash
❯ tree $(nix-build --no-out-link build-jar.nix)
/nix/store/7jw3xdfagkc2vw8wrsdv68qpsnrxgvky-maven-demo-1.0
└── share
    └── java
        └── maven-demo-1.0.jar

2 directories, 1 file
```

### JAR executável {#runnable-jar}

O exemplo anterior constrói um arquivo `jar`, mas não é um arquivo que se possa executar.

Você precisa usá-lo com `java -jar $out/share/java/output.jar` e certificar-se de fornecer as dependências necessárias no classpath.

O seguinte explica como usar `makeWrapper` para fazer com que a derivation produza um executável que executará o arquivo JAR que você criou.

Usaremos o mesmo repositório que construímos acima (seja _double invocation_ ou _buildMaven_) para configurar um CLASSPATH para nosso JAR.

Os dois métodos a seguir são mais adequados ao Nix do que construir um [UberJar](https://imagej.net/Uber-JAR), que pode ser a abordagem mais tradicional.

#### CLASSPATH {#classpath}

Este método é ideal se você estiver fornecendo uma derivation para _nixpkgs_ e não quiser aplicar patches no `pom.xml` do projeto.

Leremos o repositório Maven e o nivelaremos em uma única lista. Esta lista será então concatenada com o separador _CLASSPATH_ para criar o classpath completo.

Garantimos que este classpath seja fornecido ao `makeWrapper`.

```nix
{
  stdenv,
  maven,
  callPackage,
  makeWrapper,
  jre,
}:
let
  repository = callPackage ./build-maven-repository.nix { };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "maven-demo";
  version = "1.0";

  src = fetchTarball "https://github.com/fzakaria/nixos-maven-example/archive/main.tar.gz";
  nativeBuildInputs = [ makeWrapper ];
  buildInputs = [ maven ];

  buildPhase = ''
    runHook preBuild

    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} package;

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin

    classpath=$(find ${repository} -name "*.jar" -printf ':%h/%f');
    install -Dm644 target/maven-demo-${finalAttrs.version}.jar $out/share/java
    # create a wrapper that will automatically set the classpath
    # this should be the paths from the dependency derivation
    makeWrapper ${jre}/bin/java $out/bin/maven-demo \
          --add-flags "-classpath $out/share/java/maven-demo-${finalAttrs.version}.jar:''${classpath#:}" \
          --add-flags "Main"

    runHook postInstall
  '';
})
```

#### Arquivo MANIFEST via Plugin Maven {#manifest-file-via-maven-plugin}

Este método é ideal se você é o proprietário do projeto e deseja alterar seu `pom.xml` para definir o CLASSPATH dentro dele.

Aumente o `pom.xml` para criar um JAR com o seguinte manifesto:

```xml
<build>
  <plugins>
    <plugin>
        <artifactId>maven-jar-plugin</artifactId>
        <configuration>
            <archive>
                <manifest>
                    <addClasspath>true</addClasspath>
                    <classpathPrefix>../../repository/</classpathPrefix>
                    <classpathLayoutType>repository</classpathLayoutType>
                    <mainClass>Main</mainClass>
                </manifest>
                <manifestEntries>
                    <Class-Path>.</Class-Path>
                </manifestEntries>
            </archive>
        </configuration>
    </plugin>
  </plugins>
</build>
```

O plugin acima instrui o JAR a procurar as dependências necessárias na pasta relativa `lib/`. O layout da pasta também está no estilo _repositório Maven_.

```bash
❯ unzip -q -c $(nix-build --no-out-link runnable-jar.nix)/share/java/maven-demo-1.0.jar META-INF/MANIFEST.MF

Manifest-Version: 1.0
Archiver-Version: Plexus Archiver
Built-By: nixbld
Class-Path: . ../../repository/com/vdurmont/emoji-java/5.1.1/emoji-jav
 a-5.1.1.jar ../../repository/org/json/json/20170516/json-20170516.jar
Created-By: Apache Maven 3.6.3
Build-Jdk: 1.8.0_265
Main-Class: Main
```

Modificaremos a derivation acima para adicionar um symlink ao nosso repositório, de modo que ele seja acessível ao nosso JAR durante a `installPhase`.

```nix
{
  stdenv,
  maven,
  callPackage,
  makeWrapper,
  jre,
}:
let
  # pick a repository derivation, here we will use buildMaven
  repository = callPackage ./build-maven-repository.nix { };
in
stdenv.mkDerivation (finalAttrs: {
  pname = "maven-demo";
  version = "1.0";

  src = fetchTarball "https://github.com/fzakaria/nixos-maven-example/archive/main.tar.gz";
  nativeBuildInputs = [ makeWrapper ];
  buildInputs = [ maven ];

  buildPhase = ''
    runHook preBuild

    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} package;

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin

    # create a symbolic link for the repository directory
    ln -s ${repository} $out/repository

    install -Dm644 target/maven-demo-${finalAttrs.version}.jar $out/share/java
    # create a wrapper that will automatically set the classpath
    # this should be the paths from the dependency derivation
    makeWrapper ${jre}/bin/java $out/bin/maven-demo \
          --add-flags "-jar $out/share/java/maven-demo-${finalAttrs.version}.jar"

    runHook postInstall
  '';
})
```
::: {.note}
Nosso script produz uma dependência em `jre` em vez de `jdk` para restringir o closure de tempo de execução necessário para executar a aplicação.
:::

Isso lhe dará um script shell executável que inicia seu JAR com todas as dependências disponíveis.

```bash
❯ tree $(nix-build --no-out-link runnable-jar.nix)
/nix/store/8d4c3ibw8ynsn01ibhyqmc1zhzz75s26-maven-demo-1.0
├── bin
│   └── maven-demo
├── repository -> /nix/store/g87va52nkc8jzbmi1aqdcf2f109r4dvn-maven-repository
└── share
    └── java
        └── maven-demo-1.0.jar

❯ $(nix-build --no-out-link --option tarball-ttl 1 runnable-jar.nix)/bin/maven-demo
NixOS 😀 is super cool 😃!
```