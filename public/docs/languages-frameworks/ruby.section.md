# Ruby {#sec-language-ruby}

## Usando Ruby {#using-ruby}

Várias versões de interpretadores Ruby estão disponíveis no Nix, assim como mais de 250 gems e muitas aplicações escritas em Ruby. O atributo `ruby` refere-se ao interpretador Ruby padrão, que atualmente é o MRI 3.3. Também é possível referir-se a versões específicas, por exemplo, `ruby_3_y`, `jruby` ou `mruby`.

Na árvore Nixpkgs, pacotes Ruby podem ser encontrados em diversos locais, dependendo do que fazem, e são chamados do conjunto principal de pacotes. As gems Ruby, no entanto, são conjuntos separados, e há um conjunto padrão para cada interpretador (atualmente apenas MRI).

Existem duas abordagens principais para usar Ruby com gems. Uma é usar um `Gemfile` especificamente bloqueado para uma aplicação que possui dependências muito rigorosas. A outra é depender das gems comuns, que explicaremos mais adiante, e confiar que elas sejam atualizadas regularmente.

Os interpretadores possuem atributos comuns, a saber `gems` e `withPackages`. Assim, você pode se referir a `ruby.gems.nokogiri` ou `ruby_3_4.gems.nokogiri` para obter a gem Nokogiri já compilada e pronta para uso.

Como nem todas as gems possuem executáveis como `nokogiri`, geralmente é mais conveniente usar a função `withPackages` desta forma: `ruby.withPackages (p: with p; [ nokogiri ])`. Isso também garantirá que o Ruby em seu ambiente será capaz de encontrar a gem e que ela poderá ser usada em seu código Ruby (por exemplo, via executáveis `ruby` ou `irb`) através de `require "nokogiri"` como de costume.

### Ambiente Ruby temporário com `nix-shell` {#temporary-ruby-environment-with-nix-shell}

Em vez de ter um único ambiente Ruby compartilhado por todos os projetos de desenvolvimento Ruby em um sistema, o Nix permite criar ambientes separados por projeto. O `nix-shell` oferece a possibilidade de carregar temporariamente outro ambiente, semelhante a uma combinação de `chruby` ou `rvm` e `bundle exec`.

Existem dois métodos para carregar um shell com pacotes Ruby. O primeiro e recomendado método é criar um ambiente com `ruby.withPackages` e carregá-lo.

```ShellSession
$ nix-shell -p "ruby.withPackages (ps: with ps; [ nokogiri pry ])"
```

O outro método, que não é recomendado, é criar um ambiente e listar todos os pacotes diretamente.

```ShellSession
$ nix-shell -p ruby.gems.nokogiri ruby.gems.pry
```

Novamente, é possível iniciar o interpretador a partir do shell. O interpretador Ruby possui o atributo `gems` que contém todas as gems Ruby para aquele interpretador específico.

#### Carregar ambiente Ruby a partir de expressão `.nix` {#load-ruby-environment-from-.nix-expression}

Conforme explicado [na seção `nix-shell`](https://nixos.org/manual/nix/stable/command-ref/nix-shell) do manual do Nix, o `nix-shell` também pode carregar uma expressão de um arquivo `.nix`.
Digamos que queremos ter Ruby, `nokogiri` e `pry`. Considere um arquivo `shell.nix` com:

```nix
with import <nixpkgs> { };
ruby.withPackages (
  ps: with ps; [
    nokogiri
    pry
  ]
)
```

O que está acontecendo aqui?

1.  Começamos importando as coleções de pacotes Nix. `import <nixpkgs>` importa a função `<nixpkgs>`, `{}` a chama e a declaração `with` traz todos os atributos de `nixpkgs` para o escopo local. Esses atributos formam o conjunto principal de pacotes.
2.  Em seguida, criamos um ambiente Ruby com a função `withPackages`.
3.  A função `withPackages` espera que forneçamos uma função como argumento que recebe o conjunto de todas as gems Ruby e retorna uma lista de pacotes a serem incluídos no ambiente. Aqui, selecionamos os pacotes `nokogiri` e `pry` do conjunto de pacotes.

#### Executar comando com `--run` {#execute-command-with---run}

Uma flag conveniente para `nix-shell` é `--run`. Ela executa um comando no `nix-shell`. Podemos, por exemplo, abrir diretamente um REPL `pry`:

```ShellSession
$ nix-shell -p "ruby.withPackages (ps: with ps; [ nokogiri pry ])" --run "pry"
```

Ou exigir imediatamente `nokogiri` no pry:

```ShellSession
$ nix-shell -p "ruby.withPackages (ps: with ps; [ nokogiri pry ])" --run "pry -rnokogiri"
```

Ou executar um script usando este ambiente:

```ShellSession
$ nix-shell -p "ruby.withPackages (ps: with ps; [ nokogiri pry ])" --run "ruby example.rb"
```

#### Usando `nix-shell` como shebang {#using-nix-shell-as-shebang}

Na verdade, para o último caso, existe um método mais conveniente. Você pode adicionar um [shebang](<https://en.wikipedia.org/wiki/Shebang_(Unix)>) ao seu script especificando quais dependências o `nix-shell` precisa. Com o seguinte shebang, você pode simplesmente executar `./example.rb`, e ele será executado com todas as dependências.

```ruby
#! /usr/bin/env nix-shell
#! nix-shell -i ruby -p "ruby.withPackages (ps: with ps; [ nokogiri rest-client ])"

require 'nokogiri'
require 'rest-client'

body = RestClient.get('http://example.com').body
puts Nokogiri::HTML(body).at('h1').text
```

## Desenvolvendo com Ruby {#developing-with-ruby}

### Usando um Gemfile existente {#using-an-existing-gemfile}

Na maioria dos casos, você já terá um `Gemfile.lock` listando todas as suas dependências. Isso pode ser usado para gerar um `gemset.nix` que é utilizado para buscar as gems e combiná-las em um único ambiente. A razão pela qual você precisa ter um arquivo separado para isso é que o Nix exige que você tenha um checksum para cada entrada da sua build. Como o `Gemfile.lock` que o `bundler` gera não nos fornece checksums, precisamos primeiro baixar cada gem, calcular seu SHA256 e armazená-lo neste arquivo separado.

Então, os passos para ir de um `Gemfile` para um `gemset.nix` são:

```ShellSession
$ bundle lock
$ bundix
```

Se você já tem um `Gemfile.lock`, pode executar `bundix` e funcionará da mesma forma.

Para atualizar as gems em seu `Gemfile.lock`, você pode usar a flag `bundix -l`, que criará um novo `Gemfile.lock` caso o `Gemfile` tenha um tempo de modificação mais recente.

Uma vez que o `gemset.nix` é gerado, ele pode ser usado em uma derivation `bundlerEnv`. Aqui está um exemplo que você poderia usar para o seu `shell.nix`:

```nix
# ...
let
  gems = bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
in
mkShell {
  packages = [
    gems
    gems.wrappedRuby
  ];
}
```

Com este arquivo em seu diretório, você pode executar `nix-shell` para construir e usar as gems. As partes importantes aqui são `bundlerEnv` e `wrappedRuby`.

O `bundlerEnv` é um wrapper sobre todas as gems em seu gemset. Isso significa que todos os diretórios `/lib` e `/bin` estarão disponíveis, e os executáveis de todas as gems (mesmo de dependências indiretas) acabarão em seu `$PATH`. O `wrappedRuby` fornece todos os executáveis que vêm com o próprio Ruby, mas encapsulados para que possam encontrar facilmente as gems em seu gemset.

Um problema comum que você pode ter é que você tem Ruby, mas também `bundler` em seu gemset. Isso leva a um conflito para `/bin/bundle` e `/bin/bundler`. Você pode resolver isso encapsulando seu Ruby ou suas gems em uma chamada `lowPrio`. Então, para dar prioridade ao `bundler` do seu gemset, ele seria usado assim:

```nix
# ...
mkShell {
  buildInputs = [
    gems
    (lowPrio gems.wrappedRuby)
  ];
}
```

Às vezes, um Gemfile referencia outros arquivos. Como `.ruby-version` ou gems vendored. Ao copiar o Gemfile para o nix store, precisamos copiar esses arquivos junto. Isso pode ser feito usando `extraConfigPaths`. Por exemplo:

```nix
{
  gems = bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
    extraConfigPaths = [ "${./.}/.ruby-version" ];
  };
}
```

### Configurações e soluções alternativas específicas para gems {#gem-specific-configurations-and-workarounds}

Em alguns casos, especialmente se a gem tiver extensões nativas, você pode precisar modificar a forma como a gem é construída.

Isso é feito através de um arquivo de configuração comum que inclui todas as soluções alternativas para cada gem.

Este arquivo está localizado em `/pkgs/development/ruby-modules/gem-config/default.nix`, e como já contém muitas entradas, deve ser bastante fácil adicionar as modificações que você precisa para suas necessidades.

Enquanto isso, ou se a modificação for para uma gem privada, você também pode adicionar a configuração apenas ao seu próprio ambiente.

Dois locais que permitem essa modificação são a derivation `ruby` ou `bundlerEnv`.

Aqui está o exemplo para `ruby`:

```nix
{
  pg_version ? "10",
  pkgs ? import <nixpkgs> { },
}:
let
  myRuby = pkgs.ruby.override {
    defaultGemConfig = pkgs.defaultGemConfig // {
      pg = attrs: {
        buildFlags = [
          "--with-pg-config=${pkgs."postgresql_${pg_version}".pg_config}/bin/pg_config"
        ];
      };
    };
  };
in
myRuby.withPackages (ps: with ps; [ pg ])
```

E um exemplo com `bundlerEnv`:

```nix
{
  pg_version ? "10",
  pkgs ? import <nixpkgs> { },
}:
let
  gems = pkgs.bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
    gemConfig = pkgs.defaultGemConfig // {
      pg = attrs: {
        buildFlags = [
          "--with-pg-config=${pkgs."postgresql_${pg_version}".pg_config}/bin/pg_config"
        ];
      };
    };
  };
in
mkShell {
  buildInputs = [
    gems
    gems.wrappedRuby
  ];
}
```

E finalmente via overlays:

```nix
{
  pg_version ? "10",
}:
let
  pkgs = import <nixpkgs> {
    overlays = [
      (self: super: {
        defaultGemConfig = super.defaultGemConfig // {
          pg = attrs: {
            buildFlags = [
              "--with-pg-config=${pkgs."postgresql_${pg_version}".pg_config}/bin/pg_config"
            ];
          };
        };
      })
    ];
  };
in
pkgs.ruby.withPackages (ps: with ps; [ pg ])
```

Então podemos obter a versão do postgresql que desejarmos e a gem `pg` sempre a referenciará corretamente:

```ShellSession
$ nix-shell --argstr pg_version 9_4 --run 'ruby -rpg -e "puts PG.library_version"'
90421

$ nix-shell --run 'ruby -rpg -e "puts PG.library_version"'
100007
```

Claro que para este caso de uso também se poderia usar overlays, já que a configuração para `pg` depende do alias `postgresql`, mas para fins de demonstração isso deve ser suficiente.

### Gems específicas de plataforma {#ruby-platform-specif-gems}

Atualmente, o bundix tem alguns problemas com gems pré-construídas e específicas de plataforma: [bundix PR #68](https://github.com/nix-community/bundix/pull/68).
Até que isso seja resolvido, você pode instruir o bundler a não usar gems específicas de plataforma e, em vez disso, construí-las a partir do código-fonte a cada vez:
- globalmente (será definido em `~/.config/.bundle/config`):
```shell
$ bundle config set force_ruby_platform true
```
- localmente (será definido em `<project-root>/.bundle/config`):
```shell
$ bundle config set --local force_ruby_platform true
```

### Adicionando uma gem ao gemset padrão {#adding-a-gem-to-the-default-gemset}

Agora que você sabe como obter um ambiente Ruby funcional com Nix, é hora de avançar e começar a desenvolver com Ruby. Primeiro, veremos como as gems Ruby são empacotadas no Nix. Em seguida, veremos como você pode usar o modo de desenvolvimento com seu código.

Todas as gems no conjunto padrão são geradas automaticamente a partir de um único `Gemfile`. A resolução de dependências é feita com `bundler` e torna mais provável que todas as gems sejam compatíveis entre si.

Para adicionar uma nova gem ao nixpkgs, você pode colocá-la em `/pkgs/development/ruby-modules/with-packages/Gemfile` e executar `./maintainers/scripts/update-ruby-packages`.

Para testar se funciona, você pode tentar usar a gem com:

```shell
NIX_PATH=nixpkgs=$PWD nix-shell -p "ruby.withPackages (ps: with ps; [ name-of-your-gem ])"
```

Para verificar as gems em busca de vulnerabilidades de segurança, execute `./maintainers/scripts/audit-ruby-packages/audit-ruby-packages.bash`.

### Empacotando aplicações {#packaging-applications}

Uma tarefa comum é adicionar um executável Ruby ao Nixpkgs; exemplos populares seriam `chef`, `jekyll` ou `sass`. Uma boa maneira de fazer isso é usar a função `bundlerApp`, que permite criar um pacote que expõe apenas os executáveis listados. Caso contrário, o pacote pode causar conflitos através de caminhos comuns como `bin/rake` ou `bin/bundler` que não devem ser usados.

A maneira mais fácil de fazer isso é escrever um `Gemfile` nestas linhas:

```ruby
source 'https://rubygems.org' do
  gem 'mdl'
end
```

Se você quiser empacotar uma versão específica, pode usar a sintaxe padrão do Gemfile para isso, por exemplo, `gem 'mdl', '0.5.0'`, mas se você quiser a versão estável mais recente de qualquer forma, é mais fácil atualizar executando os passos `bundle lock` e `bundix` novamente.

Agora você também pode criar um `default.nix` que se parece com isto:

```nix
{ bundlerApp }:

bundlerApp {
  pname = "mdl";
  gemdir = ./.;
  exes = [ "mdl" ];
}
```

Tudo o que resta a fazer é gerar os `Gemfile.lock` e `gemset.nix` correspondentes, conforme descrito acima na seção `Usando um Gemfile existente`.

#### Empacotando executáveis que requerem wrapping {#packaging-executables-that-require-wrapping}

Às vezes, sua aplicação dependerá de outros executáveis em tempo de execução e tentará encontrá-los através da variável de ambiente `PATH`.

Neste caso, você pode fornecer um hook `postBuild` para `bundlerApp` que encapsula a gem em outro script que prefixa o `PATH`.

Claro que você também poderia criar um `gemConfig` personalizado se souber exatamente como corrigi-lo, mas geralmente é muito mais fácil de manter com um wrapper simples para que o patch não precise ser ajustado para cada versão.

Aqui está outro exemplo:

```nix
{
  lib,
  bundlerApp,
  makeWrapper,
  git,
  gnutar,
  gzip,
}:

bundlerApp {
  pname = "r10k";
  gemdir = ./.;
  exes = [ "r10k" ];

  nativeBuildInputs = [ makeWrapper ];

  postBuild = ''
    wrapProgram $out/bin/r10k --prefix PATH : ${
      lib.makeBinPath [
        git
        gnutar
        gzip
      ]
    }
  '';
}
```