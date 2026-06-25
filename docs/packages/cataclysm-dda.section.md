# Cataclysm: Dark Days Ahead {#cataclysm-dark-days-ahead}

## Como instalar Cataclysm DDA {#how-to-install-cataclysm-dda}

Para instalar a última versão estável de Cataclysm DDA em seu perfil, execute
`nix-env -f "<nixpkgs>" -iA cataclysm-dda`. Para a build curses (build
sem tiles), instale `cataclysmDDA.stable.curses`. Nota: `cataclysm-dda` é
um alias para `cataclysmDDA.stable.tiles`.

Se você deseja ter acesso a uma build de desenvolvimento da sua revisão git favorita,
sobrescreva `cataclysm-dda-git` (ou `cataclysmDDA.git.curses` se preferir a build curses):

```nix
cataclysm-dda-git.override {
  version = "YYYY-MM-DD";
  rev = "YOUR_FAVORITE_REVISION";
  sha256 = "CHECKSUM_OF_THE_REVISION";
}
```

O checksum sha256 pode ser obtido por

```sh
nix-prefetch-url --unpack "https://github.com/CleverRaven/Cataclysm-DDA/archive/${YOUR_FAVORITE_REVISION}.tar.gz"
```

O diretório de configuração padrão é `~/.cataclysm-dda`. Se você preferir
`$XDG_CONFIG_HOME/cataclysm-dda`, sobrescreva a derivation:

```nix
cataclysm-dda.override { useXdgDir = true; }
```

## Nota importante para sobrescrever pacotes {#important-note-for-overriding-packages}

Após aplicar `overrideAttrs`, você precisa corrigir os atributos `passthru.pkgs` e
`passthru.withMods` manualmente ou usando `attachPkgs`:

```nix
let
  # Você habilitou a construção paralela.
  myCDDA = cataclysm-dda-git.overrideAttrs (_: {
    enableParallelBuilding = true;
  });

  # Infelizmente, isso se refere ao pacote antes da sobrescrita e
  # a construção paralela ainda está desabilitada.
  badExample = myCDDA.withMods (_: [ ]);

  inherit (cataclysmDDA) attachPkgs pkgs wrapCDDA;

  # Você pode corrigir manualmente
  goodExample1 = myCDDA.overrideAttrs (old: {
    passthru = old.passthru // {
      pkgs = pkgs.override { build = goodExample1; };
      withMods = wrapCDDA goodExample1;
    };
  });

  # ou usando uma função auxiliar `attachPkgs`.
  goodExample2 = attachPkgs pkgs myCDDA;

  # badExample                     # construção paralela desabilitada
  # goodExample1.withMods (_: [])  # construção paralela habilitada
in
goodExample2.withMods (_: [ ]) # construção paralela habilitada
```

## Personalizando com mods {#customizing-with-mods}

Para instalar Cataclysm DDA com mods de sua escolha, você pode usar o atributo `withMods`:

```nix
cataclysm-dda.withMods (mods: with mods; [ tileset.UndeadPeople ])
```

Todos os mods, soundpacks e tilesets disponíveis em nixpkgs são encontrados em
`cataclysmDDA.pkgs`.

Aqui está um exemplo para modificar mods existentes e/ou adicionar mais mods não disponíveis
em nixpkgs:

```nix
let
  customMods =
    self: super:
    lib.recursiveUpdate super {
      # Modificar mod existente
      tileset.UndeadPeople = super.tileset.UndeadPeople.overrideAttrs (old: {
        # Se você quiser aplicar um patch ao tileset, por exemplo
        patches = [ ./path/to/your.patch ];
      });

      # Adicionar outro mod
      mod.Awesome = cataclysmDDA.buildMod {
        modName = "Awesome";
        version = "0.x";
        src = fetchFromGitHub {
          owner = "Someone";
          repo = "AwesomeMod";
          rev = "...";
          hash = "...";
        };
        # Caminho a ser instalado na fonte descompactada (padrão: ".")
        modRoot = "contents/under/this/path/will/be/installed";
      };

      # Adicionar outro soundpack
      soundpack.Fantastic = cataclysmDDA.buildSoundPack {
        # idem
      };

      # Adicionar outro tileset
      tileset.SuperDuper = cataclysmDDA.buildTileSet {
        # idem
      };
    };
in
cataclysm-dda.withMods (
  mods: with mods.extend customMods; [
    tileset.UndeadPeople
    mod.Awesome
    soundpack.Fantastic
    tileset.SuperDuper
  ]
)
```