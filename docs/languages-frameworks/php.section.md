# PHP {#sec-php}

## Guia do Usuário {#ssec-php-user-guide}

### Visão Geral {#ssec-php-user-guide-overview}

Várias versões do PHP estão disponíveis no Nix, cada uma com uma ampla variedade de extensões e bibliotecas disponíveis.

As diferentes versões do PHP que o nixpkgs oferece estão localizadas sob atributos nomeados com base no número da versão principal e secundária; por exemplo, `php84` é o PHP 8.4.

Apenas as versões do PHP que são suportadas pelo upstream durante toda a duração de uma determinada versão do NixOS serão incluídas nessa versão do NixOS. Veja [Versões Suportadas do PHP](https://www.php.net/supported-versions.php).

O atributo `php` refere-se à versão do PHP considerada mais estável e exaustivamente testada no nixpkgs para qualquer versão específica do NixOS - não necessariamente a última versão principal do upstream.

Todos os atributos PHP disponíveis são wrappers em torno de seus respectivos pacotes binários PHP e fornecem extensões comumente usadas dessa forma. O pacote PHP 8.4 real, ou seja, o 'unwrapped', está disponível como `php84.unwrapped`; veja a próxima seção para mais detalhes.

Ferramentas interativas construídas em PHP são colocadas em `php.packages`; o composer, por exemplo, está disponível em `php.packages.composer`.

A maioria das extensões que vêm com o PHP, bem como algumas populares de terceiros, estão disponíveis em `php.extensions`; por exemplo, a extensão opcache que acompanha o PHP está disponível em `php.extensions.opcache` e a extensão ImageMagick de terceiros em `php.extensions.imagick`.

### Instalando PHP com extensões {#ssec-php-user-guide-installing-with-extensions}

Um pacote PHP com extensões específicas habilitadas pode ser construído usando `php.withExtensions`. Esta é uma função que aceita uma função anônima como seu único argumento; a função deve aceitar dois parâmetros nomeados: `enabled` - uma lista de extensões atualmente habilitadas e `all` - o conjunto de todas as extensões, e retornar uma lista de extensões desejadas. Por exemplo, um pacote PHP com todas as extensões padrão e ImageMagick habilitados:

```nix
php.withExtensions ({ enabled, all }: enabled ++ [ all.imagick ])
```

Para excluir algumas, mas não todas, das extensões padrão, você pode filtrar a lista `enabled` assim:

```nix
php.withExtensions (
  { enabled, all }: (lib.filter (e: e != php.extensions.opcache) enabled) ++ [ all.imagick ]
)
```

Para construir sua lista de extensões do zero, você pode ignorar `enabled`:

```nix
php.withExtensions (
  { all, ... }:
  with all;
  [
    imagick
    opcache
  ]
)
```

`php.withExtensions` fornece extensões envolvendo um pacote base PHP mínimo, fornecendo um arquivo `php.ini` listando todas as extensões a serem carregadas. Você pode acessar este pacote através do atributo `php.unwrapped`; útil se você, por exemplo, precisar de acesso à saída `dev`. O arquivo `php.ini` gerado pode ser acessado através do atributo `php.phpIni`.

Se você deseja uma build do PHP com configuração extra no arquivo `php.ini`, você pode usar `php.buildEnv`. Esta função aceita dois parâmetros nomeados e opcionais: `extensions` e `extraConfig`. `extensions` aceita uma especificação de extensão equivalente à de `php.withExtensions`, `extraConfig` uma string de parâmetros de configuração adicionais do `php.ini`. Por exemplo, um pacote PHP com as extensões opcache e ImageMagick habilitadas, e `memory_limit` definido para `256M`:

```nix
php.buildEnv {
  extensions =
    { all, ... }:
    with all;
    [
      imagick
      opcache
    ];
  extraConfig = "memory_limit=256M";
}
```

#### Exemplo de configuração para `phpfpm` {#ssec-php-user-guide-installing-with-extensions-phpfpm}

Você pode usar os exemplos anteriores em um pool `phpfpm` chamado `foo` da seguinte forma:

```nix
let
  myPhp = php.withExtensions (
    { all, ... }:
    with all;
    [
      imagick
      opcache
    ]
  );
in
{
  services.phpfpm.pools."foo".phpPackage = myPhp;
}
```

```nix
let
  myPhp = php.buildEnv {
    extensions =
      { all, ... }:
      with all;
      [
        imagick
        opcache
      ];
    extraConfig = "memory_limit=256M";
  };
in
{
  services.phpfpm.pools."foo".phpPackage = myPhp;
}
```

#### Exemplo de uso com `nix-shell` {#ssec-php-user-guide-installing-with-extensions-nix-shell}

Isso cria um ambiente temporário que contém um interpretador PHP com as extensões `imagick` e `opcache` habilitadas:

```sh
nix-shell -p 'php.withExtensions ({ all, ... }: with all; [ imagick opcache ])'
```

### Instalando pacotes PHP com extensões {#ssec-php-user-guide-installing-packages-with-extensions}

Todas as ferramentas interativas usam o pacote PHP do qual você as obtém, então todos os pacotes em `php.packages.*` usam o pacote `php` com suas extensões padrão. Às vezes, este conjunto padrão de extensões não é suficiente e você pode querer estendê-lo. Um caso comum disso é o pacote `composer`: um projeto pode depender de certas extensões e o `composer` não funcionará com esse projeto a menos que essas extensões sejam carregadas.

Exemplo de construção do `composer` com extensões adicionais:

```nix
(php.withExtensions (
  { all, enabled }:
  enabled
  ++ (with all; [
    imagick
    redis
  ])
)).packages.composer
```

### Sobrescrevendo pacotes PHP {#ssec-php-user-guide-overriding-packages}

`php-packages.nix` formam um escopo, permitindo-nos sobrescrever os pacotes definidos dentro. Por exemplo, para aplicar um patch a uma extensão `mysqlnd`, você pode passar uma função estilo overlay para o argumento `packageOverrides` do `php`:

```nix
php.override {
  packageOverrides = final: prev: {
    extensions = prev.extensions // {
      mysqlnd = prev.extensions.mysqlnd.overrideAttrs (attrs: {
        patches = attrs.patches or [ ] ++ [
          # ...
        ];
      });
    };
  };
}
```

### Construindo projetos PHP {#ssec-building-php-projects}

Com o [Composer](https://getcomposer.org/), você pode construir projetos PHP de forma eficaz, otimizando o gerenciamento de dependências. Como o gerenciador de dependências padrão de fato para PHP, o Composer permite que você declare e gerencie as bibliotecas das quais seu projeto depende, garantindo um processo de desenvolvimento mais organizado e eficiente.

O Composer não é um gerenciador de pacotes no mesmo sentido que `Yum` ou `Apt`. Sim, ele lida com "pacotes" ou bibliotecas, mas os gerencia por projeto, instalando-os em um diretório (por exemplo, `vendor`) dentro do seu projeto. Por padrão, ele não instala nada globalmente. Essa ideia não é nova e o Composer é fortemente inspirado no `npm` do Node e no `bundler` do Ruby.

Atualmente, não há outra ferramenta PHP que ofereça a mesma funcionalidade que o Composer. Consequentemente, incorporar um helper no Nix para facilitar a construção de tais aplicações é uma escolha lógica.

Em um projeto Composer, as dependências são definidas em um arquivo `composer.json`, enquanto suas versões específicas são travadas em um arquivo `composer.lock`. Alguns projetos baseados em Composer optam por incluir este arquivo `composer.lock` em seu código-fonte, enquanto outros escolhem não fazê-lo.

No Nix, existem várias abordagens para construir um projeto baseado em Composer.

Um desses métodos é a função auxiliar `php.buildComposerProject2`, que serve como um wrapper em torno de `mkDerivation`.

Usando esta função, você pode construir um projeto PHP que inclui tanto um arquivo `composer.json` quanto um `composer.lock`. Se o projeto especificar binários usando o atributo `bin` em `composer.json`, esses binários serão automaticamente linkados e tornados acessíveis na derivation. Neste contexto, "binários" referem-se a scripts PHP que são destinados a serem executáveis.

Para usar o helper de forma eficaz, adicione o atributo `vendorHash`, que permite ao wrapper lidar com o trabalho pesado.

Internamente, o helper opera em três estágios:

1.  Ele constrói uma derivation do atributo `composerRepository` criando um repositório composer no sistema de arquivos contendo as dependências especificadas em `composer.json`. Este processo usa a função `php.mkComposerRepository` que, por sua vez, usa o hook `php.composerHooks.composerRepositoryHook`. Internamente, esta função usa um [plugin Composer](https://github.com/nix-community/composer-local-repo-plugin) personalizado para gerar o repositório.
2.  A derivation `composerRepository` resultante é então usada pelo hook `php.composerHooks.composerInstallHook`, que é responsável por criar o diretório `vendor` final.
3.  Qualquer "binário" especificado no `composer.json` é linkado e tornado acessível na derivation.

Como a otimização do autoloader pode ser ativada diretamente no arquivo `composer.json`, não habilitamos nenhuma flag de otimização do autoloader.

Para personalizar a versão do PHP, você pode especificar o atributo `php`. Da mesma forma, se você deseja modificar a versão do Composer, use o atributo `composer`. É importante notar que ambos os atributos devem ser do tipo `derivation`.

Aqui está um exemplo de código funcional usando `php.buildComposerProject2`:

```nix
{ php, fetchFromGitHub }:

php.buildComposerProject2 (finalAttrs: {
  pname = "php-app";
  version = "1.0.0";

  src = fetchFromGitHub {
    owner = "git-owner";
    repo = "git-repo";
    tag = finalAttrs.version;
    hash = "sha256-VcQRSss2dssfkJ+iUb5qT+FJ10GHiFDzySigcmuVI+8=";
  };

  # PHP version containing the `ast` extension enabled
  php = php.buildEnv {
    extensions = ({ enabled, all }: enabled ++ (with all; [ ast ]));
  };

  # The composer vendor hash
  vendorHash = "sha256-86s/F+/5cBAwBqZ2yaGRM5rTGLmou5//aLRK5SA0WiQ=";

  # If the composer.lock file is missing from the repository, add it:
  # composerLock = ./path/to/composer.lock;
})
```

Caso o arquivo `composer.lock` esteja faltando no repositório, é possível especificá-lo usando o atributo `composerLock`.

O outro método é usar todos esses métodos e hooks individualmente. Isso tem a vantagem de construir uma biblioteca PHP dentro de outra derivation muito facilmente quando necessário.

Aqui está um exemplo de código funcional para construir uma biblioteca PHP usando `mkDerivation` e funções e hooks separados:

```nix
{
  stdenvNoCC,
  fetchFromGitHub,
  php,
}:

stdenvNoCC.mkDerivation (
  finalAttrs:
  let
    src = fetchFromGitHub {
      owner = "git-owner";
      repo = "git-repo";
      tag = finalAttrs.version;
      hash = "sha256-VcQRSss2dssfkJ+iUb5qT+FJ10GHiFDzySigcmuVI+8=";
    };
  in
  {
    inherit src;
    pname = "php-app";
    version = "1.0.0";

    buildInputs = [ php ];

    nativeBuildInputs = [
      php.packages.composer
      # This hook will use the attribute `composerRepository`
      php.composerHooks.composerInstallHook
    ];

    composerRepository = php.mkComposerRepository {
      inherit (finalAttrs) pname version src;
      composerNoDev = true;
      composerNoPlugins = true;
      composerNoScripts = true;
      # Specifying a custom composer.lock since it is not present in the sources.
      composerLock = ./composer.lock;
      # The composer vendor hash
      vendorHash = "sha256-86s/F+/5cBAwBqZ2yaGRM5rTGLmou5//aLRK5SA0WiQ=";
    };
  }
)
```