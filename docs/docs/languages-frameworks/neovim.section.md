# Neovim {#neovim}

Instale `neovim-unwrapped` para obter um Neovim básico para configurar imperativamente.
Esta é a opção mais próxima do que você encontra em outras distribuições.

`neovim` é um wrapper em torno do Neovim com alguma configuração extra, por
exemplo, para definir os vários provedores de linguagem como Python.
O wrapper pode ser configurado ainda mais para incluir seus plugins favoritos e
configurações para um Neovim reproduzível em diferentes máquinas.
Consulte a próxima seção para mais detalhes.

## Custom configuration {#neovim-custom-configuration}

Existem dois wrappers disponíveis para fornecer configuração adicional ao pacote vanilla `pkgs.neovim-unwrapped`:
1. `wrapNeovim`: o histórico que você deve usar
2. `wrapNeovimUnstable` destinado a substituir o anterior. Ele tem mais recursos, mas
   a interface ainda não é estável.

Você pode configurar o primeiro via:

```nix
neovim.override {
  withPython3 = true; # see `:h g:python3_host_prog`
  withNodeJs = false;
  withRuby = false;
  configure = {
    customRC = ''
      # here your custom viml configuration goes!
    '';
    packages.myVimPackage = with pkgs.vimPlugins; {
      # See examples below on how to use custom packages.
      start = [ ];
      # If a Vim plugin has a dependency that is not explicitly listed in
      # `opt`, that dependency will always be added to `start` to avoid confusion.
      opt = [ ];
    };
  };
}
```
`myVimPackage` é um nome arbitrário para o pacote gerado. Você pode escolher qualquer nome que desejar.

Se você quiser usar `neovim-qt` como um editor gráfico, você pode configurá-lo sobrescrevendo o Neovim em um overlay
ou passando-lhe um Neovim sobrescrito:

```nix
neovim-qt.override {
  neovim = neovim.override {
    configure = {
      customRC = ''
        # your custom viml configuration
      '';
    };
  };
}
```

Você pode usar o novo wrapper instável, mas a interface pode mudar:
- `autoconfigure`: certos plugins precisam de uma configuração personalizada para funcionar com Nix.
Por exemplo, `sqlite-lua` precisa que `g:sqlite_clib_path` seja definido para funcionar. Nixpkgs historicamente corrigiu isso nos plugins com várias desvantagens: manutenção mais difícil e tornando o trabalho upstream mais complicado. Por convenção, esses bits obrigatórios de configuração são marcados em nixpkgs em `passthru.initLua`. Habilitar `autoconfigure` adiciona automaticamente os snippets necessários para que os plugins funcionem.
- `autowrapRuntimeDeps`: Anexa as dependências de tempo de execução do plugin ao `PATH`. Por exemplo, `rest.nvim` requer `curl` para funcionar. Habilitar `autowrapRuntimeDeps` o adiciona ao `PATH` visível pelo seu wrapper Neovim (mas não ao seu `PATH` global).
- `luaRcContent`: Código Lua extra para adicionar ao `init.lua` gerado.
- `neovimRcContent`: Código vimL extra carregado pelo `init.lua` gerado.
- `wrapperArgs`: Argumentos extras encaminhados para a chamada `makeWrapper`.
- `wrapRc`: Nix, não sendo capaz de escrever em seu `$HOME`, carrega a
  configuração do Neovim gerada através da variável de ambiente `$VIMINIT`, ou seja: `export VIMINIT='lua dofile("/nix/store/…-init.lua")'`. Isso tem efeitos colaterais como impedir que o Neovim carregue seu `init.lua` em `$XDG_CONFIG_HOME/nvim` (veja o item 7 de [`:help startup`](https://neovim.io/doc/user/starting.html#startup) no Neovim). Desabilite-o se quiser gerar seu próprio wrapper. Você ainda pode reutilizar o código init vimscript gerado via `neovim.passthru.initRc`.
- `plugins`: Uma lista de plugins para adicionar ao wrapper.
- `extraLuaPackages`: Uma função passada para `lua.withPackages`
- `withPython3`, `withNodeJs`, `withRuby` controlam quando habilitar os
  provedores do Neovim (veja `:h provider`).

```
wrapNeovimUnstable neovim-unwrapped {
  autoconfigure = true;
  autowrapRuntimeDeps = true;
  luaRcContent = ''
    vim.o.sessionoptions = 'buffers,curdir,help,tabpages,winsize,winpos,localoptions'
    vim.g.mapleader = ' '
    vim.g.maplocalleader = ' '
    vim.opt.smoothscroll = true
    vim.opt.colorcolumn = { 100 }
    vim.opt.termguicolors = true
  '';
  # plugins accepts a list of either plugins or { plugin = ...; config = ..vimscript.. };
  plugins = with vimPlugins; [
    {
      plugin = vim-obsession;
      config = ''
        map <Leader>$ <Cmd>Obsession<CR>
      '';
    }
    (nvim-treesitter.withPlugins (p: [ p.nix p.python ]))
    hex-nvim
  ];
  extraLuaPackages = lp: [ lp.mpack ];
  withPython3 = true;
  withNodeJs = false;
  withRuby = false;
}
```

Você pode explorar a configuração com `nix repl` para descobrir essas opções e
sobrescrevê-las. Por exemplo:
```nix
neovim.overrideAttrs (oldAttrs: {
  autowrapRuntimeDeps = false;
})
```

## Specificities for some plugins {#neovim-plugin-specificities}

### Plugin optional configuration {#neovim-plugin-required-snippet}

Alguns plugins exigem configuração específica para funcionar. Optamos por não
aplicar patches nesses plugins, mas expor a configuração necessária em
`PLUGIN.passthru.initLua` para plugins do Neovim. Por exemplo, o plugin `unicode-vim`
precisa do caminho para um banco de dados unicode, então expomos o seguinte snippet `vim.g.Unicode_data_directory="${self.unicode-vim}/autoload/unicode"` em `vimPlugins.unicode-vim.passthru.initLua`.

### Plugin license overrides {#neovim-plugin-license-overrides}

Plugins gerados do Vim e Neovim obtêm sua `meta.license` dos metadados de licença do GitHub quando possível.
Alguns repositórios upstream não expõem um arquivo de licença que o GitHub possa detectar, ou apenas mencionam a licença em um README.
Nesses casos, adicione uma sobrescrita manual de `meta.license` em [overrides.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/overrides.nix).

Por exemplo, se o upstream documenta que um plugin usa a licença Vim, mas o GitHub não a detecta:

```nix
{
  foo-nvim = super.foo-nvim.overrideAttrs (old: {
    meta = old.meta // {
      # README says this plugin is distributed under the Vim license.
      license = lib.licenses.vim;
    };
  });
}
```

## LuaRocks based plugins {#neovim-luarocks-based-plugins}

Para lidar automaticamente com as dependências de plugins, vários plugins do Neovim
carregam seus pacotes para [LuaRocks](https://www.luarocks.org). Isso significa menos trabalho para os mantenedores do nixpkgs a longo prazo, pois as dependências são atualizadas automaticamente.
Isso significa que vários plugins do Neovim são primeiro empacotados como [pacotes Lua](#packaging-a-library-on-luarocks) do nixpkgs, e convertidos via `buildNeovimPlugin` em
um plugin Vim. Essa conversão é necessária porque o Neovim espera que as pastas Lua sejam
de nível superior, enquanto o LuaRocks as instala em várias subpastas por padrão.

Por exemplo:
```nix
{
  rtp-nvim = neovimUtils.buildNeovimPlugin { luaAttr = luaPackages.rtp-nvim; };
}
```
Para atualizar esses pacotes, você deve usar o atualizador Lua em vez do atualizador do Vim.

## Treesitter {#neovim-plugin-treesitter}

[Treesitter](https://tree-sitter.github.io/) fornece análise sintática para o Neovim, habilitando recursos como:
Realce de sintaxe avançado, Dobramento de código, Indentação e muito mais.

A maioria dos usuários do Neovim gerencia o Treesitter através do plugin `nvim-treesitter`, que fornece:

- Comandos para gerenciar grammars e queries,
  por exemplo, `:TSInstall`, que os baixa, compila e instala em tempo de execução.
- Uma implementação de indentação personalizada ([`:h indentexpr`](https://neovim.io/doc/user/options.html#'indentexpr'))
  para linguagens com queries `indents.scm`.

Esses recursos são construídos sobre a funcionalidade do Treesitter que está integrada ao Neovim.

Em nixpkgs, grammars e queries são pré-compiladas e empacotadas separadamente. Isso significa:

- Você pode usar os recursos do Treesitter **sem** instalar `nvim-treesitter`.
- Você só precisa de `nvim-treesitter` se quiser sua implementação de indentação personalizada.
- Plugins que dependem de grammars podem referenciá-los diretamente.

### Treesitter setup using `nvim-treesitter` {#neovim-plugin-nvim-treesitter}

::: {.tip}
Escolha esta abordagem se você quiser usar a expressão de indentação personalizada do `nvim-treesitter`.
:::

Para instalar `nvim-treesitter` combinado com um conjunto de grammars pré-compiladas,
você pode usar a função `nvim-treesitter.withPlugins`:

```nix
(pkgs.neovim.override {
  configure = {
    packages.myPlugins = with pkgs.vimPlugins; {
      start = [
        (nvim-treesitter.withPlugins (
          plugins: with plugins; [
            nix
            python
          ]
        ))
      ];
    };
  };
})
```

Para habilitar todas as grammars empacotadas em nixpkgs, use `pkgs.vimPlugins.nvim-treesitter.withAllGrammars`.

Para saber como configurar `nvim-treesitter` e configurar realce de sintaxe, indentação, dobramento, etc.,
consulte a documentação do plugin `:help nvim-treesitter-quickstart`.

::: {.note}
Ao usar grammars gerenciadas por Nix, `:checkhealth nvim-treesitter` reportará que não há linguagens instaladas.
Este é o comportamento esperado porque:
- O `health check` do `nvim-treesitter` procura em seu diretório de instalação configurado.
- Nix instala grammars no Nix store e as adiciona ao `runtimepath` em vez disso.

**Para verificar parsers e queries gerenciados por Nix**, use `:checkhealth vim.treesitter` em vez disso.
:::

### Treesitter setup using standalone grammars and queries {#neovim-plugin-treesitter-standalone}

::: {.tip}
Escolha esta abordagem se você
- Quiser dependências mínimas.
- Não precisar da expressão de indentação personalizada do `nvim-treesitter`.
:::

Você pode instalar os parsers e queries autônomos diretamente sem instalar `nvim-treesitter`:

```nix
(pkgs.neovim.override {
  configure = {
    packages.myPlugins =
      with pkgs.vimPlugins;
      let
        # Select the grammars you need
        treesitter-grammars = with nvim-treesitter-parsers; [
          nix
          python
        ];
        # Queries are needed for treesitter based syntax highlighting and folds.
        treesitter-queries = map (p: p.associatedQuery) treesitter-grammars;
      in
      {
        start = [
          # regular plugins
        ]
        ++ treesitter-grammars
        ++ treesitter-queries;
      };
  };
})
```

Você pode habilitar os recursos do Treesitter para grammars instaladas em um `FileType` autocommand
ou em um script `ftplugin/<language>.lua`, por exemplo:

```lua
vim.api.nvim_create_autocmd('FileType', {
  pattern = { 'rust', 'javascript', 'zig' },
  callback = function(ev)
    local bufnr = ev.buf

    -- Enable treesitter syntax highlighting and parsing for the current buffer
    -- (Requires queries to be installed)
    vim.treesitter.start(bufnr)

    -- Enable treesitter based code folding
    -- (folds are window-scoped, not buffer-scoped)
    -- (Requires queries to be installed)
    vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
    vim.wo.foldmethod = 'expr'
  end,
})
```

### Treesitter grammars as plugin dependencies {#neovim-plugin-treesitter-grammar-dependencies}

Alguns plugins do Neovim (como adaptadores `neotest`, `markdoc-nvim`, `hurl-nvim`) dependem de grammars do Treesitter.
Essas dependências são geralmente declaradas em sobrescritas de plugins.

::: {.important}
Alguns READMEs de plugins podem sugerir que eles dependem de `nvim-treesitter`.
**Este quase sempre não é o caso.**

`nvim-treesitter` não fornece mais uma Lua module API para outros plugins usarem.
Na vasta maioria dos casos, esses plugins:
- **Dependem de parsers** (não de `nvim-treesitter` ou suas queries).
- **Empacotam suas próprias queries** (seja como arquivos `*.scm` ou codificadas nas Lua sources).
:::

Para adicionar grammars como uma dependência de plugin, adicione um [override](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/overrides.nix):

```nix
{
  foo-nvim = super.foo-nvim.overrideAttrs {
    dependencies = with self.nvim-treesitter-parsers; [
      markdown
      markdown_inline
      html
    ];
  };
}
```

Se um plugin realmente depender da `nvim-treesitter` legacy module API, você pode adicionar
`nvim-treesitter-legacy` como uma dependência:

```nix
{
  foo-legacy-nvim = super.foo-legacy-nvim.overrideAttrs {
    dependencies = with self; [
      nvim-treesitter-legacy
      nvim-treesitter-parsers.nix
    ];
  };
}
```

::: {.caution}
`nvim-treesitter-legacy` existe com o propósito de facilitar a transição e será removido em 26.11.
Se uma configuração do Neovim contiver tanto `nvim-treesitter` quanto `nvim-treesitter-legacy`, ela falhará ao ser avaliada.
:::

## Testing Neovim plugins {#testing-neovim-plugins}

### neovimRequireCheck {#testing-neovim-plugins-neovim-require-check}

`neovimRequireCheck` é um teste simples que verifica se o Neovim pode carregar Lua modules sem erros. Isso geralmente é suficiente para detectar dependências ausentes.

Ele aceita uma única string para um module, ou uma lista de strings de modules para testar.
- `nvimRequireCheck = MODULE;`
- `nvimRequireCheck = [ MODULE1 MODULE2 ];`

Quando `nvimRequireCheck` não é especificado, procuraremos no diretório do plugin por Lua modules para tentar carregar. Este teste rápido de fumaça pode detectar erros óbvios de dependência que poderiam ser perdidos.
O `check hook` falhará na build se algum module não puder ser carregado. Isso incentiva a inspeção dos logs para identificar possíveis problemas.

Para verificar apenas um module específico, adicione-o manualmente à definição do plugin em [overrides](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/overrides.nix).

```nix
{
  gitsigns-nvim = super.gitsigns-nvim.overrideAttrs {
    dependencies = [ self.plenary-nvim ];
    nvimRequireCheck = "gitsigns";
  };
}
```
Alguns plugins terão Lua modules que exigem uma configuração de usuário para funcionar corretamente ou podem conter Lua modules opcionais que não queremos testar ao carregar.
Podemos pular modules específicos usando `nvimSkipModules`. Semelhante a `nvimRequireCheck`, ele aceita uma lista de strings.
- `nvimSkipModules = [ MODULE1 MODULE2 ];`

```nix
{
  asyncrun-vim = super.asyncrun-vim.overrideAttrs {
    nvimSkipModules = [
      # vim plugin with optional toggleterm integration
      "asyncrun.toggleterm"
      "asyncrun.toggleterm2"
    ];
  };
}
```

Em casos raros, podemos não querer realmente testar o carregamento de Lua modules para um plugin. Nesses casos, podemos desabilitar `neovimRequireCheck` com `doCheck = false;`.

Isso pode ser adicionado manualmente através de sobrescritas de definição de plugin em [overrides.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/applications/editors/vim/plugins/overrides.nix).
```nix
{
  vim-test = super.vim-test.overrideAttrs {
    # Vim plugin with a test lua file
    doCheck = false;
  };
}
```