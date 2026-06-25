# WeeChat {#sec-weechat}

O WeeChat pode ser configurado para incluir os plugins de sua escolha, reduzindo o tamanho de seu *closure* em relação à configuração padrão, que inclui todos os plugins disponíveis. Para usar essa funcionalidade, instale uma expressão que sobrescreva sua configuração, como:

```nix
weechat.override {
  configure = (
    { availablePlugins, ... }:
    {
      plugins = with availablePlugins; [
        python
        perl
      ];
    }
  );
}
```

Se a função `configure` retornar um *attrset* sem o atributo `plugins`, `availablePlugins` será usado automaticamente.

Os plugins atualmente disponíveis são `python`, `perl`, `ruby`, `guile`, `tcl` e `lua`.

Os plugins Python e Perl permitem a adição de bibliotecas extras. Por exemplo, o script `inotify.py` em `weechat-scripts` requer D-Bus ou libnotify, e o script `fish.py` requer `pycrypto`. Para usar esses scripts, utilize o atributo `withPackages` do plugin:

```nix
weechat.override {
  configure =
    { availablePlugins, ... }:
    {
      plugins = with availablePlugins; [
        (python.withPackages (
          ps: with ps; [
            pycrypto
            python-dbus
          ]
        ))
      ];
    };
}
```

Para também manter todos os plugins padrão instalados, é possível usar o seguinte método:

```nix
weechat.override {
  configure =
    { availablePlugins, ... }:
    {
      plugins = builtins.attrValues (
        availablePlugins
        // {
          python = availablePlugins.python.withPackages (
            ps: with ps; [
              pycrypto
              python-dbus
            ]
          );
        }
      );
    };
}
```

O WeeChat permite definir padrões na inicialização usando o `--run-command`. O método `configure` pode ser usado para passar comandos para o programa:

```nix
weechat.override {
  configure =
    { availablePlugins, ... }:
    {
      init = ''
        /set foo bar
        /server add libera irc.libera.chat
      '';
    };
}
```

Valores adicionais podem ser adicionados à lista de comandos ao executar `weechat --run-command "your-commands"`.

Além disso, é possível especificar scripts a serem carregados ao iniciar o `weechat`. Estes serão carregados antes dos comandos de `init`:

```nix
weechat.override {
  configure =
    { availablePlugins, ... }:
    {
      scripts = with pkgs.weechatScripts; [
        weechat-xmpp
        weechat-matrix-bridge
        wee-slack
      ];
      init = ''
        /set plugins.var.python.jabber.key "val"
      '';
    };
}
```

Em `nixpkgs` existe um subpacote que contém *derivations* para scripts do WeeChat. Tais *derivations* esperam um atributo `passthru.scripts`, que contém uma lista de todos os scripts dentro do *store path*. Além disso, todos os scripts devem residir em `$out/share`. Uma *derivation* exemplar se parece com isto:

```nix
{ stdenv, fetchurl }:

stdenv.mkDerivation {
  name = "exemplary-weechat-script";
  src = fetchurl {
    url = "https://scripts.tld/your-scripts.tar.gz";
    hash = "...";
  };
  passthru.scripts = [
    "foo.py"
    "bar.lua"
  ];
  installPhase = ''
    runHook preInstall

    mkdir $out/share
    cp foo.py $out/share
    cp bar.lua $out/share

    runHook postInstall
  '';
}
```