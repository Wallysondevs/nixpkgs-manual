# GNOME {#sec-language-gnome}

## Empacotando aplicações GNOME {#ssec-gnome-packaging}

Programas no universo GNOME são escritos em várias linguagens, mas todos usam bibliotecas baseadas em GObject como GLib, GTK ou GStreamer. Essas bibliotecas são frequentemente modulares, dependendo da busca em certos diretórios para encontrar seus módulos. No entanto, devido à organização específica do sistema de arquivos do Nix, isso falhará sem nossa intervenção. Felizmente, as bibliotecas geralmente permitem sobrescrever os diretórios através de variáveis de ambiente, seja nativamente ou graças a um patch no nixpkgs. [Empacotar](#fun-wrapProgram) os executáveis para garantir que os caminhos corretos estejam disponíveis para a aplicação constitui uma parte significativa do empacotamento de uma aplicação de desktop moderna. Nesta seção, descreveremos vários módulos necessários por tais aplicações, variáveis de ambiente necessárias para fazer os módulos carregarem e, finalmente, um script que fará o trabalho para nós.

### Configurações {#ssec-gnome-settings}

A API GSettings é frequentemente usada para armazenar configurações. Esquemas GSettings são necessários para saber o tipo e outros metadados dos valores armazenados. GLib procura por arquivos `glib-2.0/schemas/gschemas.compiled` dentro dos diretórios de `XDG_DATA_DIRS`.

No Linux, a API GSettings é implementada usando o backend [dconf](https://gitlab.gnome.org/GNOME/dconf). Você precisará adicionar o [módulo GIO](#ssec-gnome-gio-modules) `dconf` à variável `GIO_EXTRA_MODULES`, caso contrário, o backend `memory` será usado e as configurações salvas não serão persistentes.

Por último, você precisará do próprio serviço D-Bus do banco de dados dconf. Você pode habilitá-lo usando `programs.dconf.enable`.

Algumas aplicações também exigirão `gsettings-desktop-schemas` para coisas como leitura de configuração de proxy ou personalização da interface do usuário. Essa dependência frequentemente não é mencionada pelo upstream; você deve procurar por `org.gnome.desktop` e `org.gnome.system` para ver se os esquemas são necessários.

### Módulos GIO {#ssec-gnome-gio-modules}

A biblioteca [GIO](https://developer.gnome.org/gio/stable/ch01.html) do GLib suporta vários [pontos de extensão](https://developer.gnome.org/gio/stable/extending-gio.html). Notavelmente, eles permitem:

*   implementar backends de configurações (já [mencionado](#ssec-gnome-settings))
*   adicionar suporte TLS
*   configurações de proxy
*   sistemas de arquivos virtuais

Os módulos são tipicamente instalados no diretório `lib/gio/modules/` de um pacote e você precisa adicioná-los a `GIO_EXTRA_MODULES` se precisar de alguma dessas funcionalidades.

Em particular, recomendamos:

*   adicionar `dconf.lib` para qualquer software no Linux que leia [GSettings](#ssec-gnome-settings) (mesmo transitivamente através, por exemplo, do gerenciador de arquivos do GTK)
*   adicionar `glib-networking` para qualquer software que acesse a rede usando GIO ou libsoup – glib-networking contém um módulo que implementa suporte TLS e carrega configurações de proxy de todo o sistema

Para permitir que o software use vários sistemas de arquivos virtuais, o pacote `gvfs` também pode ser adicionado. Mas essa é geralmente uma funcionalidade opcional, então tipicamente usamos `gvfs` do sistema (por exemplo, instalado globalmente usando o módulo NixOS).

### Carregadores GdkPixbuf {#ssec-gnome-gdk-pixbuf-loaders}

Aplicações GTK tipicamente usam [GdkPixbuf](https://gitlab.gnome.org/GNOME/gdk-pixbuf/) para carregar imagens. Mas o pacote `gdk-pixbuf` suporta apenas formatos básicos de bitmap como JPEG, PNG ou TIFF, exigindo o uso de módulos de carregamento de terceiros para outros formatos. Isso é especialmente problemático, pois o próprio GTK inclui ícones SVG, que não podem ser renderizados sem um carregador fornecido por `librsvg`.

Ao contrário de outras bibliotecas mencionadas nesta seção, GdkPixbuf suporta apenas um único valor em sua variável de ambiente controladora `GDK_PIXBUF_MODULE_FILE`. Ele deve apontar para um arquivo de cache contendo informações sobre os carregadores disponíveis. Cada pacote de carregador conterá um arquivo `lib/gdk-pixbuf-2.0/2.10.0/loaders.cache` descrevendo os carregadores padrão no pacote `gdk-pixbuf` mais o carregador contido no próprio pacote. Se você quiser usar vários carregadores de terceiros, precisará criar seu próprio arquivo de cache manualmente. Felizmente, isso é bastante raro, pois [não existem muitos carregadores](https://gitlab.gnome.org/federico/gdk-pixbuf-survey/blob/master/src/modules.md).

`gdk-pixbuf` contém [um setup hook](#ssec-gnome-hooks-gdk-pixbuf) que define `GDK_PIXBUF_MODULE_FILE` a partir das dependências, mas, como mencionado em uma seção posterior, é bastante limitado. Carregadores devem propagar este setup hook.

### Ícones {#ssec-gnome-icons}

Quando uma aplicação usa ícones, um tema de ícones deve estar disponível em `XDG_DATA_DIRS` durante a execução. O pacote para o [hicolor-icon-theme](https://www.freedesktop.org/wiki/Software/icon-theme/) padrão, sem ícones (deve ser propagado por todo tema de ícones), contém [um setup hook](#ssec-gnome-hooks-hicolor-icon-theme) que irá coletar temas de ícones de `buildInputs` e adicionar seus datadirs à variável de ambiente `XDG_ICON_DIRS` (isso é específico do Nixpkgs, não é realmente uma variável padrão XDG). Infelizmente, depender disso significaria que cada usuário teria que baixar o tema incluído na expressão do pacote, independentemente de sua preferência. Por essa razão, deixamos a instalação do tema de ícones para o usuário. Se você usa um dos ambientes de desktop, provavelmente já tem um tema de ícones instalado.

No raro caso de você precisar usar ícones de dependências (por exemplo, quando um aplicativo força um tema de ícones), você pode usar o seguinte para coletá-los:

```nix
{
  buildInputs = [ pantheon.elementary-icon-theme ];
  preFixup = ''
    gappsWrapperArgs+=(
      # The icon theme is hardcoded.
      --prefix XDG_DATA_DIRS : "$XDG_ICON_DIRS"
    )
  '';
}
```

Para evitar acesso custoso ao sistema de arquivos ao localizar ícones, GTK, [assim como Qt](https://woboq.com/blog/qicon-reads-gtk-icon-cache-in-qt57.html), pode depender de arquivos `icon-theme.cache` dos diretórios de nível superior dos temas. Esses arquivos são gerados usando `gtk-update-icon-cache`, que é esperado ser executado sempre que um ícone é adicionado ou removido de um tema de ícones (tipicamente um ícone de aplicação no tema `hicolor`) e alguns programas de fato executam isso após a instalação do ícone. No entanto, como os pacotes são instalados em seu próprio prefixo pelo Nix, isso levaria a conflitos. Por essa razão, `gtk3` fornece um [setup hook](#ssec-gnome-hooks-gtk-drop-icon-theme-cache) que limpará o arquivo da instalação. Como a maioria das aplicações apenas envia seu próprio ícone que será carregado na inicialização, isso não deve afetá-las muito. Por outro lado, temas de ícones são muito maiores e mais amplamente usados, então precisamos armazená-los em cache. Como recomendamos instalar temas de ícones globalmente, geraremos os arquivos de cache de todos os pacotes em um perfil usando um módulo NixOS. Você pode habilitar a geração de cache usando a opção `gtk.iconCache.enable` se seu ambiente de desktop ainda não o fizer.

### Empacotando temas de ícones {#ssec-icon-theme-packaging}

Temas de ícones podem herdar de outros temas de ícones. A herança é especificada usando a chave `Inherits` no arquivo `index.theme` distribuído com o tema de ícones. De acordo com a [especificação de tema de ícones](https://specifications.freedesktop.org/icon-theme-spec/latest), ícones não fornecidos pelo tema são procurados em seus temas de ícones pai. Portanto, os temas pai devem ser instalados como dependências para uma experiência mais completa em relação aos conjuntos de ícones usados.

O pacote `hicolor-icon-theme` fornece um setup hook que cria links simbólicos para os temas pai no diretório `share/icons` do diretório do tema atual no nix store, garantindo que possam ser encontrados em tempo de execução. Para que isso funcione, os pacotes que fornecem temas de ícones pai devem ser listados como dependências de build propagadas, juntamente com `hicolor-icon-theme`.

Além disso, certifique-se de que `icon-theme.cache` esteja instalado para cada tema fornecido pelo pacote, e defina `dontDropIconThemeCache` como `true` para que o arquivo de cache não seja removido pelo setup hook do `gtk3`.

### Temas GTK {#ssec-gnome-themes}

Anteriormente, um tema GTK precisava estar em `XDG_DATA_DIRS`. Isso não é mais necessário para a maioria dos programas, já que o GTK incorporou o tema Adwaita. Alguns programas (por exemplo, aqueles projetados para [elementary HIG](https://docs.elementary.io/hig)) podem exigir um tema especial como `pantheon.elementary-gtk-theme`.

### Typelibs de introspecção GObject {#ssec-gnome-typelibs}

[Introspecção GObject](https://gitlab.gnome.org/GNOME/gobject-introspection) permite que aplicações usem bibliotecas C em outras linguagens facilmente. Isso é feito através de arquivos `typelib` pesquisados em `GI_TYPELIB_PATH`.

### Vários plug-ins {#ssec-gnome-plugins}

Se sua aplicação usa [GStreamer](https://gstreamer.freedesktop.org/) ou [Grilo](https://gitlab.gnome.org/GNOME/grilo), você deve definir `GST_PLUGIN_SYSTEM_PATH_1_0` e `GRL_PLUGIN_PATH`, respectivamente.

## Sobre os hooks `wrapGApps*` {#ssec-gnome-hooks}

Dados os requisitos acima, a expressão do pacote se tornaria rapidamente confusa:

```nix
{
  preFixup = ''
    for f in $(find $out/bin/ $out/libexec/ -type f -executable); do
      wrapProgram "$f" \
        --prefix GIO_EXTRA_MODULES : "${getLib dconf}/lib/gio/modules" \
        --prefix XDG_DATA_DIRS : "$out/share" \
        --prefix XDG_DATA_DIRS : "$out/share/gsettings-schemas/${name}" \
        --prefix XDG_DATA_DIRS : "${gsettings-desktop-schemas}/share/gsettings-schemas/${gsettings-desktop-schemas.name}" \
        --prefix XDG_DATA_DIRS : "${hicolor-icon-theme}/share" \
        --prefix GI_TYPELIB_PATH : "${
          lib.makeSearchPath "lib/girepository-1.0" [
            pango
            json-glib
          ]
        }"
    done
  '';
}
```

Felizmente, temos uma [família de hooks]{#ssec-gnome-hooks-wrapgappshook} que automatizam isso. Eles funcionam em conjunto com outros setup hooks que preenchem variáveis de ambiente, e então empacotarão todos os executáveis nos diretórios `bin` e `libexec` usando as referidas variáveis.

-   [`wrapGAppsHook3`]{#ssec-gnome-hooks-wrapgappshook3} para aplicações GTK 3. Para conveniência, ele também adiciona `dconf.lib` para um módulo GIO que implementa um backend GSettings usando `dconf`, `gtk3` para esquemas GSettings, e `librsvg` para o carregador GdkPixbuf ao closure.
-   [`wrapGAppsHook4`]{#ssec-gnome-hooks-wrapgappshook4} para aplicações GTK 4. O mesmo que `wrapGAppsHook3`, mas substitui `gtk3` por `gtk4`.
-   [`wrapGAppsNoGuiHook`]{#ssec-gnome-hooks-wrapgappsnoguihook} para programas sem interface gráfica. O mesmo que os anteriores, mas não traz `gtk3` e `librsvg` para o closure.

Os hooks fazem o seguinte:

-   O próprio hook `wrapGApps*` adicionará o diretório `share` do pacote a `XDG_DATA_DIRS`.

-   []{#ssec-gnome-hooks-glib} O setup hook `glib` preencherá `GSETTINGS_SCHEMAS_PATH` e então o hook `wrapGApps*` o adicionará ao início de `XDG_DATA_DIRS`.

-   []{#ssec-gnome-hooks-gdk-pixbuf} O setup hook `gdk-pixbuf` preencherá `GDK_PIXBUF_MODULE_FILE` com o caminho para o maior arquivo `loaders.cache` das dependências contendo [carregadores GdkPixbuf](#ssec-gnome-gdk-pixbuf-loaders). Isso funciona bem quando há apenas dois pacotes contendo carregadores (`gdk-pixbuf` e, por exemplo, `librsvg`) – ele escolherá o segundo, esperando razoavelmente que seja maior, já que descreve um carregador extra além dos padrões. Mas quando há mais de dois pacotes de carregadores, essa lógica falhará. Uma possível solução seria construir um arquivo de cache personalizado para cada pacote contendo um programa como o módulo NixOS `services/x11/gdk-pixbuf.nix` faz. O hook `wrapGApps*` copia a variável de ambiente `GDK_PIXBUF_MODULE_FILE` para o wrapper produzido.

-   []{#ssec-gnome-hooks-gtk-drop-icon-theme-cache} Um dos setup hooks do `gtk3` removerá os arquivos `icon-theme.cache` dos diretórios de tema de ícones do pacote para evitar conflitos. Pacotes de tema de ícones devem evitar isso com `dontDropIconThemeCache = true;`.

-   []{#ssec-gnome-hooks-dconf} `dconf.lib` é uma dependência do hook `wrapGApps*`, que então também o adiciona à variável `GIO_EXTRA_MODULES`.

-   []{#ssec-gnome-hooks-hicolor-icon-theme} O setup hook do `hicolor-icon-theme` adicionará temas de ícones a `XDG_ICON_DIRS`.

-   []{#ssec-gnome-hooks-gobject-introspection} O setup hook `gobject-introspection` preenche a variável `GI_TYPELIB_PATH` com os diretórios `lib/girepository-1.0` das dependências, que é então adicionada ao wrapper pelo hook `wrapGApps*`. Ele também adiciona diretórios `share` de dependências a `XDG_DATA_DIRS`, o que se destina a promover arquivos GIR, mas também [polui os closures](https://github.com/NixOS/nixpkgs/issues/32790) de pacotes que usam o hook `wrapGApps*`.

-   []{#ssec-gnome-hooks-gst-grl-plugins} Os setup hooks de `gst_all_1.gstreamer` e `grilo` preencherão as variáveis `GST_PLUGIN_SYSTEM_PATH_1_0` e `GRL_PLUGIN_PATH`, respectivamente, que serão então adicionadas ao wrapper pelo hook `wrapGApps*`.

-   []{#ssec-gnome-hooks-libglycin} O [setup hook](#libglycin-setup-hook) de `libglycin` preencherá `XDG_DATA_DIRS` com o caminho para os carregadores.

Você também pode passar argumentos adicionais para `makeWrapper` usando `gappsWrapperArgs` no hook `preFixup`:

```nix
{
  preFixup = ''
    gappsWrapperArgs+=(
      # Thumbnailers
      --prefix XDG_DATA_DIRS : "${gdk-pixbuf}/share"
      --prefix XDG_DATA_DIRS : "${librsvg}/share"
      --prefix XDG_DATA_DIRS : "${shared-mime-info}/share"
    )
  '';
}
```

## Atualizando pacotes GNOME {#ssec-gnome-updating}

A maioria dos pacotes GNOME oferece [`updateScript`](#var-passthru-updateScript), sendo, portanto, possível atualizar para o tarball de origem mais recente executando `nix-shell maintainers/scripts/update.nix --argstr package nautilus` ou até mesmo em massa com `nix-shell maintainers/scripts/update.nix --argstr path gnome`. Leia o arquivo `NEWS` do pacote para ver o que mudou.

## Problemas frequentemente encontrados {#ssec-gnome-common-issues}

### `GLib-GIO-ERROR **: 06:04:50.903: No GSettings schemas are installed on the system` {#ssec-gnome-common-issues-no-schemas}

Não há esquemas disponíveis em `XDG_DATA_DIRS`. Adicione temporariamente um pacote aleatório contendo esquemas como `gsettings-desktop-schemas` a `buildInputs`. Os setup hooks [`glib`](#ssec-gnome-hooks-glib) e [`wrapGApps*`](#ssec-gnome-hooks-wrapgappshook) se encarregarão de disponibilizar os esquemas para a aplicação e você verá os esquemas ausentes reais com o [próximo erro](#ssec-gnome-common-issues-missing-schema). Ou você pode tentar procurar no código-fonte os esquemas reais usados.

### `GLib-GIO-ERROR **: 06:04:50.903: Settings schema ‘org.gnome.foo’ is not installed` {#ssec-gnome-common-issues-missing-schema}

O pacote está faltando alguns esquemas GSettings. Você pode descobrir o pacote que contém o esquema com `nix-locate org.gnome.foo.gschema.xml` e deixar os hooks lidarem com o empacotamento como [acima](#ssec-gnome-common-issues-no-schemas).

### Ao usar o hook `wrapGApps*` com derivers ou hooks especiais, você pode acabar com binários empacotados duas vezes. {#ssec-gnome-common-issues-double-wrapped}

Isso ocorre porque alguns setup hooks como `qt6.wrapQtAppsHook` também empacotam programas usando `makeWrapper`. Da mesma forma, alguns derivers (por exemplo, `python.pkgs.buildPythonApplication`) automaticamente puxam seus próprios setup hooks que produzem wrappers.

A solução mais simples é desabilitar o empacotamento automático do hook `wrapGApps*` usando `dontWrapGApps = true;` enquanto passa seus argumentos `makeWrapper` para outro wrapper.

No caso de uma aplicação Python, poderia ser assim:

```nix
python3.pkgs.buildPythonApplication {
  pname = "gnome-music";
  version = "3.32.2";

  nativeBuildInputs = [
    wrapGAppsHook3
    gobject-introspection
    # ...
  ];

  dontWrapGApps = true;

  # Arguments to be passed to `makeWrapper`, only used by buildPython*
  preFixup = ''
    makeWrapperArgs+=("''${gappsWrapperArgs[@]}")
  '';
}
```

E para uma aplicação QT, assim:

```nix
stdenv.mkDerivation {
  pname = "calibre";
  version = "3.47.0";

  nativeBuildInputs = [
    wrapGAppsHook3
    qt6.wrapQtAppsHook
    qmake
    # ...
  ];

  dontWrapGApps = true;

  preFixup = ''
    qtWrapperArgs+=("''${gappsWrapperArgs[@]}")
  '';
}
```

### Estou empacotando um projeto que não pode ser empacotado, como uma biblioteca ou extensão do GNOME Shell. {#ssec-gnome-common-issues-unwrappable-package}

Você pode depender de aplicações que dependem da biblioteca para definir as variáveis de ambiente necessárias, mas isso é frequentemente fácil de ignorar. Em vez disso, recomendamos aplicar patches nos caminhos no código-fonte sempre que possível. Aqui estão alguns exemplos:

-   []{#ssec-gnome-common-issues-unwrappable-package-gnome-shell-ext} [Substituindo um `GI_TYPELIB_PATH` em uma extensão do GNOME Shell](https://github.com/NixOS/nixpkgs/blob/e981466fbb08e6231a1377539ff17fbba3270fda/pkgs/by-name/gn/gnome-shell-extensions/package.nix#L25-L32) – estamos usando `replaceVars` para incluir o caminho para um typelib em um patch.

-   []{#ssec-gnome-common-issues-unwrappable-package-gsettings} Os exemplos a seguir estão codificando caminhos de esquema GSettings. Para obter os caminhos dos esquemas, usamos as funções

    *   `glib.getSchemaPath` Recebe um atributo de pacote nix como argumento.

    *   `glib.makeSchemaPath` Recebe uma saída de pacote como `$out` e um nome de derivation. Você deve usar isso se os esquemas que você precisa codificar estiverem na mesma derivation.

    []{#ssec-gnome-common-issues-unwrappable-package-gsettings-vala} [Codificando o caminho do esquema GSettings em um plug-in Vala (biblioteca carregada dinamicamente)](https://github.com/NixOS/nixpkgs/blob/7bb8f05f12ca3cff9da72b56caa2f7472d5732bc/pkgs/desktops/pantheon/apps/elementary-files/default.nix#L78-L86) – aqui, `replaceVars` não pode ser usado, pois o esquema vem do mesmo pacote, impedindo-nos de passar seu caminho para a função, provavelmente devido a um [bug do Nix](https://github.com/NixOS/nix/issues/1846).

    []{#ssec-gnome-common-issues-unwrappable-package-gsettings-c} [Codificando o caminho do esquema GSettings em uma biblioteca C](https://github.com/NixOS/nixpkgs/blob/29c120c065d03b000224872251bed93932d42412/pkgs/development/libraries/glib-networking/default.nix#L31-L34) – nada de especial além de usar um [patch Coccinelle](https://github.com/NixOS/nixpkgs/pull/67957#issuecomment-527717467) para gerar o próprio patch.

### Preciso empacotar um binário fora dos diretórios `bin` e `libexec`. {#ssec-gnome-common-issues-weird-location}

Você pode acionar manualmente o empacotamento com `wrapGApp` na fase `preFixup`. Ele recebe um caminho para um programa como primeiro argumento; os argumentos restantes são passados diretamente para a função [`wrapProgram`](#fun-wrapProgram).