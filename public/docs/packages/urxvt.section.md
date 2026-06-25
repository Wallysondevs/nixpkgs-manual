# Urxvt {#sec-urxvt}

Urxvt, também conhecido como rxvt-unicode, é um emulador de terminal altamente personalizável.

## Configurando urxvt {#sec-urxvt-conf}

No `nixpkgs`, o urxvt é fornecido pelo pacote `rxvt-unicode`. Ele pode ser configurado para incluir sua escolha de plugins, reduzindo o tamanho de seu closure em relação à configuração padrão que inclui todos os plugins disponíveis. Para usar essa funcionalidade, utilize um overlay ou instale diretamente uma expressão que sobrescreva sua configuração, como:

```nix
rxvt-unicode.override {
  configure =
    { availablePlugins, ... }:
    {
      plugins = with availablePlugins; [
        perls
        resize-font
        vtwheel
      ];
    };
}
```

Se a função `configure` retornar um attrset sem o atributo `plugins`, `availablePlugins` será usado automaticamente.

Para adicionar plugins e também manter todos os plugins padrão instalados, é possível usar o seguinte método:

```nix
rxvt-unicode.override {
  configure =
    { availablePlugins, ... }:
    {
      plugins = (builtins.attrValues availablePlugins) ++ [ custom-plugin ];
    };
}
```

Para obter uma lista de todos os plugins disponíveis, abra o Nix REPL e execute

```ShellSession
$ nix repl
:l <nixpkgs>
map (p: p.name) pkgs.rxvt-unicode.plugins
```

Alternativamente, se seu shell for bash ou zsh e tiver a conclusão habilitada, digite `nixpkgs.rxvt-unicode.plugins.<tab>`.

Além de `plugins`, as opções `extraDeps` e `perlDeps` podem ser usadas para instalar pacotes extras. `extraDeps` pode ser usado, por exemplo, para fornecer `xsel` (um gerenciador de área de transferência) ao plugin de área de transferência, sem instalá-lo globalmente:

```nix
rxvt-unicode.override {
  configure =
    { availablePlugins, ... }:
    {
      pluginsDeps = [ xsel ];
    };
}
```

`perlDeps` é uma maneira prática de fornecer pacotes Perl para seus plugins personalizados (em `$HOME/.urxvt/ext`). Por exemplo, se você precisar de `AnyEvent`, você pode fazer:

```nix
rxvt-unicode.override {
  configure =
    { availablePlugins, ... }:
    {
      perlDeps = with perlPackages; [ AnyEvent ];
    };
}
```

## Empacotando plugins do urxvt {#sec-urxvt-pkg}

Os plugins do Urxvt residem em `pkgs/applications/misc/rxvt-unicode-plugins`. Para adicionar um novo plugin, crie uma expressão em um subdiretório e adicione o pacote ao conjunto em `pkgs/applications/misc/rxvt-unicode-plugins/default.nix`.

Um plugin pode ser qualquer tipo de derivation; o único requisito é que ele sempre deve instalar scripts perl em `$out/lib/urxvt/perl`. Procure por plugins existentes para exemplos.

Se o plugin for ele próprio um pacote Perl que precisa ser importado de outros plugins ou scripts, adicione o seguinte passthrough:

```nix
{ passthru.perlPackages = [ "self" ]; }
```

Isso fará com que o wrapper do urxvt detecte a dependência e configure o caminho do Perl de acordo.