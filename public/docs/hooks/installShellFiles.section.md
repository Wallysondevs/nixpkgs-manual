# `installShellFiles` {#installshellfiles}

Este *hook* adiciona ajudantes que instalam artefatos como arquivos executáveis, *manpages* e complementos de *shell*.

Ele expõe as seguintes funções que podem ser usadas a partir do seu *hook* `postInstall`:

## `installBin` {#installshellfiles-installbin}

A função `installBin` recebe um ou mais caminhos para arquivos a serem instalados como arquivos executáveis.

Esta função os colocará em [`outputBin`](#outputbin).

### Exemplo de Uso {#installshellfiles-installbin-exampleusage}

```nix
{
  nativeBuildInputs = [ installShellFiles ];

  # Às vezes o arquivo tem um nome indesejável. Ele deve ser renomeado antes
  # de ser instalado via installBin
  postInstall = ''
    mv a.out delmar
    installBin foobar delmar
  '';
}
```

## `installManPage` {#installshellfiles-installmanpage}

A função `installManPage` recebe um ou mais caminhos para *manpages* a serem instaladas.

As *manpages* devem ter um sufixo de seção e podem opcionalmente ser compactadas (com sufixo `.gz`). Esta função as colocará no diretório correto `share/man/man<section>/` em [`outputMan`](#outputman).

### Exemplo de Uso {#installshellfiles-installmanpage-exampleusage}

```nix
{
  nativeBuildInputs = [ installShellFiles ];

  # Às vezes o arquivo da manpage tem um nome indesejável; por exemplo, ele entra em conflito com
  # outro software com o mesmo nome. Para instalá-lo com um nome diferente,
  # o nome a ser instalado deve ser fornecido antes do caminho para o arquivo.
  #
  # Abaixo, instala uma manpage "foobar.1" do arquivo de origem "./foobar.1", e
  # também instala a manpage "fromsea.3" do arquivo de origem "./delmar.3".
  postInstall = ''
    installManPage \
        foobar.1 \
        --name fromsea.3 delmar.3
  '';
}
```

A *manpage* pode ser o resultado de uma entrada canalizada (por exemplo, `<(cmd)`), caso em que o nome deve ser fornecido antes do *pipe* com a *flag* `--name`.

```nix
{
  nativeBuildInputs = [ installShellFiles ];

  postInstall = ''
    installManPage --name foobar.1 <($out/bin/foobar --manpage)
  '';
}
```

Se nenhuma análise de argumentos for desejada, passe `--` para desativar todos os argumentos subsequentes.

```nix
{
  nativeBuildInputs = [ installShellFiles ];

  # Instala uma manpage de um arquivo chamado "--name"
  postInstall = ''
    installManPage -- --name
  '';
}
```

## `installShellCompletion` {#installshellfiles-installshellcompletion}

A função `installShellCompletion` recebe um ou mais caminhos para arquivos de complemento de *shell*.

Por padrão, ele detectará automaticamente o tipo de *shell* a partir da extensão do arquivo de complemento, mas você também pode especificá-lo passando uma das *flags* `--bash`, `--fish`, `--zsh` ou `--nushell`. Essas *flags* se aplicam a todos os caminhos listados após elas (até que outra *flag* de *shell* seja fornecida). Cada caminho também pode ter um nome de instalação personalizado fornecido ao passar a *flag* `--name NAME` antes do caminho. Se esta *flag* não for fornecida, os complementos do *zsh* serão renomeados automaticamente de forma que `foobar.zsh` se torne `_foobar`. Um nome raiz pode ser fornecido para todos os caminhos usando a *flag* `--cmd NAME`; isso sintetiza o nome apropriado dependendo do *shell* (por exemplo, `--cmd foo` sintetizará o nome `foo.bash` para *bash* e `_foo` para *zsh*).

### Exemplo de Uso {#installshellfiles-installshellcompletion-exampleusage}

```nix
{
  nativeBuildInputs = [ installShellFiles ];
  postInstall = ''
    # comportamento explícito
    installShellCompletion --bash --name foobar.bash share/completions.bash
    installShellCompletion --fish --name foobar.fish share/completions.fish
    installShellCompletion --nushell --name foobar share/completions.nu
    installShellCompletion --zsh --name _foobar share/completions.zsh
    # comportamento implícito
    installShellCompletion share/completions/foobar.{bash,fish,zsh,nu}
  '';
}
```

O caminho também pode ser o resultado de substituição de processo (por exemplo, `<(cmd)`), caso em que o *shell* e o nome devem ser fornecidos (veja abaixo).

Se o arquivo de complemento de *shell* de destino não estiver realmente presente ou consistir em zero *bytes* após chamar `installShellCompletion`, isso é tratado como uma falha de *build*. Em particular, se os arquivos de complemento não forem empacotados, mas forem gerados pela execução de um executável, isso provavelmente falhará em cenários de compilação cruzada. O resultado será um arquivo de complemento de zero *bytes* e, portanto, uma falha de *build*. Para evitar isso, proteja os comandos de geração de complemento.

### Exemplo de Uso {#installshellfiles-installshellcompletion-exampleusage-guarded}

```nix
{
  nativeBuildInputs = [ installShellFiles ];
  postInstall = lib.optionalString (stdenv.buildPlatform.canExecute stdenv.hostPlatform) ''
    # usando substituição de processo
    installShellCompletion --cmd foobar \
      --bash <($out/bin/foobar --bash-completion) \
      --fish <($out/bin/foobar --fish-completion) \
      --nushell <($out/bin/foobar --nushell-completion) \
      --zsh <($out/bin/foobar --zsh-completion)
  '';
}
```