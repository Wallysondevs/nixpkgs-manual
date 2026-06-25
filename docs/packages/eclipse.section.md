# Eclipse {#sec-eclipse}

As expressões Nix relacionadas à plataforma e IDE Eclipse estão em [`pkgs/applications/editors/eclipse`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/eclipse).

Nixpkgs oferece vários pacotes que instalarão o Eclipse em suas diversas formas. Estes variam desde a plataforma Eclipse básica (bare-bones Eclipse Platform) até os pacotes Eclipse SDK ou Scala-IDE mais completos, e várias versões estão frequentemente disponíveis. É possível listar os pacotes Eclipse disponíveis executando o comando:

```ShellSession
$ nix-env -f '<nixpkgs>' -qaP -A eclipses --description
```

Uma vez que uma variante do Eclipse é instalada, ela pode ser executada usando o comando `eclipse`, como esperado. De dentro do Eclipse, é então possível instalar plugins da maneira usual, seja especificando manualmente um site de atualização do Eclipse ou instalando o plugin Marketplace Client e usando-o para descobrir e instalar outros plugins. Este método de instalação fornece uma instalação do Eclipse que se assemelha muito a um Eclipse instalado manualmente.

Se você preferir instalar plugins de uma maneira mais declarativa, então Nixpkgs também oferece vários plugins Eclipse que podem ser instalados em um _ambiente Eclipse_. Este tipo de ambiente é criado usando a função `eclipseWithPlugins` encontrada dentro do conjunto de atributos `nixpkgs.eclipses`. Esta função recebe como argumento `{ eclipse, plugins ? [], jvmArgs ? [] }` onde `eclipse` é um dos pacotes Eclipse descritos acima, `plugins` é uma lista de derivations de plugins, e `jvmArgs` é uma lista de argumentos dados à JVM que executa o Eclipse. Por exemplo, digamos que você deseje instalar a última Eclipse Platform com o popular plugin Eclipse Color Theme e também permitir que o Eclipse use mais RAM. Você poderia então adicionar:

```nix
{
  packageOverrides = pkgs: {
    myEclipse =
      with pkgs.eclipses;
      eclipseWithPlugins {
        eclipse = eclipse-platform;
        jvmArgs = [ "-Xmx2048m" ];
        plugins = [ plugins.color-theme ];
      };
  };
}
```

à sua configuração Nixpkgs (`~/.config/nixpkgs/config.nix`) e instalá-lo executando `nix-env -f '<nixpkgs>' -iA myEclipse` e, em seguida, executando o Eclipse como de costume. É possível descobrir quais plugins estão disponíveis para instalação usando `eclipseWithPlugins` executando:

```ShellSession
$ nix-env -f '<nixpkgs>' -qaP -A eclipses.plugins --description
```

Se houver a necessidade de instalar plugins que não estão disponíveis no Nixpkgs, então pode ser possível definir esses plugins fora do Nixpkgs usando as funções `buildEclipseUpdateSite` e `buildEclipsePlugin` encontradas no conjunto de atributos `nixpkgs.eclipses.plugins`. Use a função `buildEclipseUpdateSite` para instalar um plugin distribuído como um site de atualização do Eclipse. Esta função recebe `{ src }` e `pname` ou `name` + `version` como argumentos, onde `src` indica o arquivo do site de atualização do Eclipse. Todos os recursos e plugins do Eclipse dentro do site de atualização baixado serão instalados. Quando um arquivo de site de atualização não estiver disponível, a função `buildEclipsePlugin` pode ser usada para instalar um plugin que consiste em um par de JARs de feature e plugin. Esta função recebe `{ srcFeature, srcPlugin }` e `pname` ou `name` + `version` como argumentos, onde `srcFeature` e `srcPlugin` são os JARs de feature e plugin, respectivamente.

Expandindo o exemplo anterior com dois plugins usando as funções acima, temos:

```nix
{
  packageOverrides = pkgs: {
    myEclipse =
      with pkgs.eclipses;
      eclipseWithPlugins {
        eclipse = eclipse-platform;
        jvmArgs = [ "-Xmx2048m" ];
        plugins = [
          plugins.color-theme
          (plugins.buildEclipsePlugin {
            pname = "myplugin1";
            version = "1.0";
            srcFeature = fetchurl {
              url = "http://…/features/myplugin1.jar";
              hash = "sha256-123…";
            };
            srcPlugin = fetchurl {
              url = "http://…/plugins/myplugin1.jar";
              hash = "sha256-123…";
            };
          })
          (plugins.buildEclipseUpdateSite {
            pname = "myplugin2";
            version = "1.0";
            src = fetchurl {
              stripRoot = false;
              url = "http://…/myplugin2.zip";
              hash = "sha256-123…";
            };
          })
        ];
      };
  };
}
```