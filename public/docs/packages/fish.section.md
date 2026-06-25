# Fish {#sec-fish}

Fish é um "shell de linha de comando inteligente e amigável" com suporte a plugins.


## Scripts Fish de fornecedor (Vendor Fish scripts) {#sec-fish-vendor}

Qualquer pacote pode incluir suas próprias conclusões (completions), trechos de configuração e funções do Fish. Estes devem ser instalados em `$out/share/fish/vendor_{completions,conf,functions}.d` respectivamente.

Quando as opções `programs.fish.enable` e `programs.fish.vendor.{completions,config,functions}.enable` do módulo Fish do NixOS são definidas como true, esses caminhos são criados como symlinks no ambiente do sistema atual e são carregados automaticamente pelo Fish.


## Empacotando plugins Fish {#sec-fish-plugins-pkg}

Enquanto pacotes que fornecem executáveis autônomos pertencem ao nível superior, pacotes que têm o único propósito de estender o Fish pertencem ao escopo `fishPlugins` e devem ser registrados em `pkgs/shells/fish/plugins/default.nix`.

A função utilitária `buildFishPlugin` pode ser usada para copiar automaticamente scripts Fish de `$src/{completions,conf,conf.d,functions}` para os caminhos de instalação padrão do fornecedor (vendor). Ela também configura o ambiente de teste para que o `checkPhase` opcional seja executado em um shell Fish com outros plugins já empacotados e funções Fish locais do pacote especificadas em `checkPlugins` e `checkFunctionDirs` respectivamente.

Veja `pkgs/shells/fish/plugins/pure.nix` para um exemplo de pacote de plugin Fish usando `buildFishPlugin` e executando testes de unidade com o executor de testes `fishtape`.


## Wrapper Fish {#sec-fish-wrapper}

O pacote `wrapFish` é um wrapper para o Fish que pode ser usado para criar shells Fish inicializados com alguns plugins, bem como conclusões (completions), trechos de configuração e funções originadas dos caminhos fornecidos. Isso oferece uma maneira conveniente de testar plugins e scripts Fish sem ter que alterar o ambiente.

```nix
wrapFish {
  pluginPkgs = with fishPlugins; [
    pure
    foreign-env
  ];
  completionDirs = [ ];
  functionDirs = [ ];
  confDirs = [ "/path/to/some/fish/init/dir/" ];
}
```