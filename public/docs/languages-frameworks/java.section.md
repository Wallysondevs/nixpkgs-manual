# Java {#sec-language-java}

Pacotes Java baseados em Ant são tipicamente construídos a partir do código-fonte da seguinte forma:

```nix
stdenv.mkDerivation {
  pname = "...";
  version = "...";

  src = fetchurl {
    # ...
  };

  nativeBuildInputs = [
    ant
    jdk
    stripJavaArchivesHook # removes timestamp metadata from jar files
  ];

  buildPhase = ''
    runHook preBuild
    ant # build the project using ant
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    # copy generated jar file(s) to an appropriate location in $out
    install -Dm644 build/foo.jar $out/share/java/foo.jar

    runHook postInstall
  '';
}
```

Note que `jdk` é um alias para o OpenJDK (auto-construído onde disponível, ou pré-construído via Zulu).

Observe também que não usar `stripJavaArchivesHook` provavelmente fará com que os arquivos `.jar` gerados sejam não-determinísticos, o que não é ideal. Usá-lo, no entanto, nem sempre garante a reprodutibilidade.

Arquivos JAR que se destinam a ser usados por outros pacotes devem ser instalados em `$out/share/java`. JDKs possuem um *setup hook* do `stdenv` que adiciona quaisquer JARs nos diretórios `share/java` das entradas de construção à variável de ambiente `CLASSPATH`. Por exemplo, se o pacote `libfoo` instala um JAR chamado `foo.jar` em seu diretório `share/java`, e outro pacote declara o atributo

```nix
{
  buildInputs = [ libfoo ];
  nativeBuildInputs = [ jdk ];
}
```

então `CLASSPATH` será definido como `/nix/store/...-libfoo/share/java/foo.jar`.

JARs privados devem ser instalados em um local como `$out/share/package-name`.

Se o seu pacote Java fornece um programa, você precisa gerar um *script wrapper* para executá-lo usando um JRE. Você pode usar `makeWrapper` para isso:

```nix
{
  nativeBuildInputs = [ makeWrapper ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    makeWrapper ${jre}/bin/java $out/bin/foo \
      --add-flags "-cp $out/share/java/foo.jar org.foo.Main"

    runHook postInstall
  '';
}
```

Desde a introdução do Java Platform Module System no Java 9, as distribuições Java tipicamente não vêm mais com um JRE de propósito geral: em vez disso, elas permitem gerar um JRE com apenas os módulos necessários para sua(s) aplicação(ões). Como não podemos prever quais módulos serão necessários em um sistema de propósito geral, o pacote `jre` padrão é o JDK completo. Ao construir um sistema/imagem mínima, você pode sobrescrever o parâmetro `modules` em `jre_minimal` para construir um JRE com apenas os módulos relevantes para você:

```nix
let
  my_jre = pkgs.jre_minimal.override {
    modules = [
      # The modules used by 'something' and 'other' combined:
      "java.base"
      "java.logging"
    ];
  };
  something = (pkgs.something.override { jre = my_jre; });
  other = (pkgs.other.override { jre = my_jre; });
in
<...>
```

Você também pode especificar em qual JDK seu JRE deve ser baseado, por exemplo, selecionando uma construção 'headless' para evitar incluir um link para GTK+:

```nix
{ my_jre = pkgs.jre_minimal.override { jdk = jdk11_headless; }; }
```

Observe que todos os JDKs passam `home`, então se sua aplicação requer que variáveis de ambiente como `JAVA_HOME` sejam definidas, isso pode ser feito de forma genérica com o argumento `--set` de `makeWrapper`:

```bash
--set JAVA_HOME ${jdk.home}
```

É possível usar um compilador Java diferente de `javac` do OpenJDK. Por exemplo, para usar o GNU Java Compiler:

```nix
{
  nativeBuildInputs = [
    gcj
    ant
  ];
}
```

Aqui, o Ant usará automaticamente `gij` (o GNU Java Runtime) em vez do OpenJRE.