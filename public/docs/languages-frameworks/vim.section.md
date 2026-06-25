# Vim {#vim}

O Vim pode ser configurado para incluir seus plugins favoritos e bibliotecas adicionais.

O carregamento pode ser adiado; veja os exemplos.

No momento, suportamos dois métodos diferentes para gerenciar plugins:

- Pacotes Vim (*recomendado*)
- vim-plug (apenas Vim)

Atualmente, dois pacotes Vim estão disponíveis: `vim`, que tem a maioria dos recursos que exigem dependências extras desabilitados, e `vim-full`, que os tem configuráveis e habilitados por padrão.

::: {.note}
`vim_configurable` é um alias obsoleto para `vim-full` e se refere ao fato de que seus recursos de tempo de compilação são configuráveis. Não tem nada a ver com a configuração do usuário, e ambos os pacotes `vim` e `vim-full` podem ser personalizados conforme explicado na próxima seção.
:::

## Configuração personalizada {#vim-custom-configuration}

Adicionar linhas `.vimrc` personalizadas pode ser feito usando o seguinte código:

```nix
vim-full.customize {
  # `name` optionally specifies the name of the executable and package
  name = "vim-with-plugins";

  vimrcConfig.customRC = ''
    set hidden
  '';
}
```

Esta configuração é usada quando o Vim é invocado com o comando especificado como nome, neste caso `vim-with-plugins`. Você também pode omitir `name` para personalizar o próprio Vim. Veja a [definição de `vimUtils.makeCustomizable`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/vim-utils.nix#L408) para todas as opções suportadas.

## Gerenciando plugins com pacotes Vim {#managing-plugins-with-vim-packages}

Para armazenar seus plugins em pacotes Vim (o gerenciador de plugins nativo do Vim, veja `:help packages`), o exemplo a seguir pode ser usado:

```nix
vim-full.customize {
  vimrcConfig.packages.myVimPackage = with pkgs.vimPlugins; {
    # loaded on launch
    start = [
      youcompleteme
      fugitive
    ];
    # manually loadable by calling `:packadd $plugin-name`
    # however, if a Vim plugin has a dependency that is not explicitly listed in
    # opt that dependency will always be added to start to avoid confusion.
    opt = [
      phpCompletion
      elm-vim
    ];
    # To automatically load a plugin when opening a filetype, add vimrc lines like:
    # autocmd FileType php :packadd phpCompletion
  };
}
```

O pacote resultante pode ser adicionado a `packageOverrides` em `~/.nixpkgs/config.nix` para torná-lo instalável:

```nix
{
  packageOverrides =
    pkgs: with pkgs; {
      myVim = vim-full.customize {
        # `name` specifies the name of the executable and package
        name = "vim-with-plugins";
        # add here code from the example section
      };
      myNeovim = neovim.override {
        configure = {
          # add code from the example section here
        };
      };
    };
}
```

Depois disso, você pode instalar seus pacotes especiais `myVim` ou `myNeovim` enxertados.

### E se o seu plugin Vim favorito ainda não estiver empacotado? {#what-if-your-favourite-vim-plugin-isnt-already-packaged}

Se um dos seus plugins favoritos não estiver empacotado, você pode empacotá-lo você mesmo:

```nix
{ config, pkgs, ... }:

let
  easygrep = pkgs.vimUtils.buildVimPlugin {
    name = "vim-easygrep";
    src = pkgs.fetchFromGitHub {
      owner = "dkprice";
      repo = "vim-easygrep";
      rev = "d0c36a77cc63c22648e792796b1815b44164653a";
      hash = "sha256-bL33/S+caNmEYGcMLNCanFZyEYUOUmSsedCVBn4tV3g=";
    };
  };
in
{
  environment.systemPackages = [
    (pkgs.neovim.override {
      configure = {
        packages.myPlugins = with pkgs.vimPlugins; {
          start = [
            vim-go # already packaged plugin
            easygrep # custom package
          ];
          opt = [ ];
        };
        # ...
      };
    })
  ];
}
```

Se o seu pacote exigir a construção de partes específicas, use `pkgs.vimUtils.buildVimPlugin` em vez disso.

## Gerenciando plugins com vim-plug {#managing-plugins-with-vim-plug}

Para usar [vim-plug](https://github.com/junegunn/vim-plug) para gerenciar seus plugins Vim, o exemplo a seguir pode ser usado:

```nix
vim-full.customize {
  vimrcConfig.packages.myVimPackage = with pkgs.vimPlugins; {
    # loaded on launch
    plug.plugins = [
      youcompleteme
      fugitive
      phpCompletion
      elm-vim
    ];
  };
}
```

Nota: isso não é mais possível para Neovim.

## Adicionando novos plugins ao nixpkgs {#adding-new-plugins-to-nixpkgs}

As expressões Nix para plugins Vim são armazenadas em [pkgs/applications/editors/vim/plugins](https://github.com/NixOS/nixpkgs/tree/master/pkgs/applications/editors/vim/plugins). Para a grande maioria dos plugins, as expressões Nix são geradas automaticamente executando [`nix-shell -p vimPluginsUpdater --run vim-plugins-updater`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/utils/updater.nix). Isso cria um arquivo [generated.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/generated.nix) com base nos plugins listados em [vim-plugin-names](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/vim-plugin-names).

Quando o atualizador do Vim detecta uma atualização do nvim-treesitter, ele também executa [`nvim-treesitter/update.py $(nix-build -A vimPlugins.nvim-treesitter)`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/utils/update.py) para atualizar as gramáticas do tree-sitter para `nvim-treesitter`.

Alguns plugins exigem overrides para funcionar corretamente. Os overrides são colocados em [overrides.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/overrides.nix). Overrides são mais frequentemente necessários quando um plugin exige algumas dependências, ou etapas extras são necessárias durante o processo de construção. Por exemplo, `deoplete-fish` requer tanto `deoplete-nvim` quanto `vim-fish`, e então o seguinte override foi adicionado:

```nix
{
  deoplete-fish = super.deoplete-fish.overrideAttrs (old: {
    dependencies = with super; [
      deoplete-nvim
      vim-fish
    ];
  });
}
```

Às vezes, os plugins exigem um override que deve ser alterado quando o plugin é atualizado. Isso pode causar problemas quando os plugins Vim são atualizados automaticamente, mas o override associado não é atualizado. Para esses plugins, o override deve ser escrito de forma a especificar todas as informações necessárias para instalar o plugin, e a execução de `nix-shell -p vimPluginsUpdater --run vim-plugins-updater` não altera a derivation para o plugin. A atualização manual do override é necessária para atualizar esses tipos de plugins. Um exemplo de tal plugin é `LanguageClient-neovim`.

Para adicionar um novo plugin, execute `nix-shell -p vimPluginsUpdater --run 'vim-plugins-updater add "[owner]/[name]"'`. **NOTA**: Este script faz commits automaticamente no seu repositório git. Certifique-se de fazer checkout em um novo branch antes de executar.

## Atualizando plugins no nixpkgs {#updating-plugins-in-nixpkgs}

Execute o script de atualização com um token de API do GitHub que tenha pelo menos acesso `public_repo`. Executar o script sem o token provavelmente resultará em limitação de taxa (erros 429). Para obter etapas sobre como criar um token de API, consulte a [documentação de tokens do GitHub](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token).

```sh
nix-shell -p vimPluginsUpdater --run 'vim-plugins-updater --github-token=mytoken' # or set GITHUB_TOKEN environment variable
```

Alternativamente, defina o número de processos para uma contagem menor para evitar a limitação de taxa.

```sh
nix-shell -p vimPluginsUpdater --run 'vim-plugins-updater --proc 1'
```

Para atualizar apenas plugins específicos, liste-os após o comando `update`:

```sh
nix-shell -p vimPluginsUpdater --run 'vim-plugins-updater update "nvim-treesitter" "mini.nvim" "mini-nvim"'
```

O script do atualizador aceita argumentos de plugin em diferentes formatos:

- `"mini.nvim"` := O nome do repositório GitHub, o nome bruto do plugin ou o alias definido em `vim-plugin-names`.
- `"mini-nvim"` := O nome normalizado do plugin, que corresponde ao nome do atributo gerado em `generated.nix`.

## Como manter um overlay out-of-tree de plugins vim? {#vim-out-of-tree-overlays}

Você pode usar o script do atualizador para gerar pacotes básicos a partir de uma lista personalizada de plugins vim:

```
nix-shell -p vimPluginsUpdater --run vim-plugins-updater -i vim-plugin-names -o generated.nix --no-commit
```

com o conteúdo de `vim-plugin-names` sendo, por exemplo:

```
repo,branch,alias
pwntester/octo.nvim,,
```

Você pode então referenciar os plugins vim gerados via:

```nix
{
  myVimPlugins = pkgs.vimPlugins.extend ((pkgs.callPackage ./generated.nix { }));
}
```