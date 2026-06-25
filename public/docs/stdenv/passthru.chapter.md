# Atributos Passthru {#chap-passthru}
[]{#var-stdenv-passthru} []{#special-variables} <!-- legacy anchors -->

Ao contrário da maioria dos outros atributos de entrada de `mkDerivation`, `passthru` não é passado para o executável [`builder`](https://nixos.org/manual/nix/stable/expressions/derivations.html#attr-builder) da derivation. Alterá-lo não acionará uma reconstrução – ele é "passado adiante" (passed through). Seu valor pode ser acessado como se tivesse sido definido dentro de uma derivation.

::: {.note}
Os atributos `passthru` não seguem um esquema particular, mas existem alguns [padrões convencionais](#sec-common-passthru-attributes).
:::

:::{.example #ex-accessing-passthru}

## Definindo e acessando atributos `passthru`

```nix
{ stdenv, fetchGit }:
let
  hello = stdenv.mkDerivation {
    pname = "hello";
    src = fetchGit {
      # ...
    };

    passthru = {
      foo = "bar";
      baz = {
        value1 = 4;
        value2 = 5;
      };
    };
  };
in
hello.baz.value1
```

```
4
```
:::

## Atributos `passthru` comuns {#sec-common-passthru-attributes}

Muitos atributos `passthru` são situacionais, então esta seção lista apenas padrões recorrentes. Eles se enquadram em uma destas categorias:

- Convenções globais, que são aplicadas quase universalmente em Nixpkgs.

  Geralmente, estes não implicam em nenhum suporte especial embutido na derivation à qual pertencem. Exemplos comuns deste tipo são [`passthru.tests`](#var-passthru-tests) e [`passthru.updateScript`](#var-passthru-updateScript).

- Convenções para adicionar funcionalidade extra a uma derivation.

  Estes tendem a implicar suporte da derivation ou do atributo `passthru` em questão. Exemplos comuns deste tipo são `passthru.optional-dependencies`, `passthru.withPlugins` e `passthru.withPackages`. Todos eles permitem associar o pacote a um conjunto de componentes construídos para aquele pacote específico, como ao construir ambientes de tempo de execução Python usando [`python.withPackages`](#python.withpackages-function).

Atributos que se aplicam apenas a [auxiliares de construção](#part-builders) ou [ecossistemas de linguagem](#chap-language-support) específicos são documentados lá.

### `passthru.tests` {#var-passthru-tests}
[]{#var-meta-tests} <!-- legacy anchor -->

Um conjunto de atributos com testes como valores. Um teste é uma derivation que é construída quando o teste passa e falha na construção caso contrário.

Execute estes testes com:

```ShellSession
$ cd path/to/nixpkgs
$ nix-build -A your-package.tests
```

::: {.note}
Os sistemas Nixpkgs para integração contínua [Hydra](https://hydra.nixos.org/) e [`nixpkgs-review`](https://github.com/Mic92/nixpkgs-review) não constroem essas derivations por padrão, e ([`@ofborg`](https://github.com/NixOS/ofborg)) as constrói apenas ao avaliar pull requests para aquele pacote específico, ou quando instruído manualmente.
:::

#### Testes de pacote {#var-passthru-tests-packages}
[]{#var-meta-tests-packages} <!-- legacy anchor -->

Além dos testes fornecidos pelo upstream, que você executa na [`checkPhase`](#ssec-check-phase), você pode querer definir derivations de teste no atributo `passthru.tests`, o que não alterará a construção. `passthru.tests` tem várias vantagens sobre a execução de testes durante qualquer uma das [fases padrão](#sec-stdenv-phases):

- Eles acessam o pacote como os consumidores fariam, independentemente do ambiente em que foi construído
- Eles podem ser executados e depurados sem reconstruir o pacote, o que é útil se isso levar muito tempo
- Eles não adicionam sobrecarga a cada construção, ao contrário das verificações adicionadas à [`installCheckPhase`](#ssec-installCheck-phase), como [`versionCheckHook`](#versioncheckhook).

Também é possível usar `passthru.tests` para testar a versão com [`testVersion`](#tester-testVersion), mas como isso é algo bastante trivial e recomendado, sugerimos usar [`versionCheckHook`](#versioncheckhook) para isso, que possui as seguintes vantagens sobre `passthru.tests`:

- Se o `versionCheckPhase` (a fase definida por [`versionCheckHook`](#versioncheckhook)) falhar, ele aciona uma falha que não pode ser ignorada se você usar o pacote, ou se você descobrir sobre ela em um relatório do [`nixpkgs-review`](https://github.com/Mic92/nixpkgs-review).
- Às vezes, os pacotes ficam silenciosamente quebrados – o que significa que eles falham ao iniciar, mas sua construção é bem-sucedida porque não realizam nenhum teste na `checkPhase`. Se você usa esta ferramenta com pouca frequência, tal quebra silenciosa pode apodrecer na configuração do seu sistema/perfil, e você não notará a falha até que queira usar este pacote. Testar essa funcionalidade básica garante que você terá que lidar com a falha ao atualizar seu sistema/perfil.
- Ao abrir um PR, o CI do [ofborg](https://github.com/NixOS/ofborg) _executará_ os `passthru.tests` dos [pacotes que são diretamente alterados pelo seu PR (de acordo com as mensagens dos seus commits)](https://github.com/NixOS/ofborg?tab=readme-ov-file#automatic-building), mas se você quiser usar o comando [`@ofborg build`](https://github.com/NixOS/ofborg?tab=readme-ov-file#build) para pacotes dependentes, você não precisará especificar adicionalmente o atributo `.tests` dos pacotes que deseja construir, e ninguém poderá evitar esses testes.

<!-- NOTE(@fricklerhandwerk): one may argue whether that testing guide should rather be in the user's manual -->
Para mais informações sobre como escrever e executar testes de pacotes para Nixpkgs, consulte a [seção de testes no guia do contribuidor de pacotes](https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#package-tests).

#### Testes NixOS {#var-passthru-tests-nixos}
[]{#var-meta-tests-nixos} <!-- legacy anchor -->

Testes escritos para NixOS estão disponíveis como o argumento `nixosTests` para receitas de pacotes. Por exemplo, a [derivation OpenSMTPD](https://search.nixos.org/packages?show=opensmtpd) inclui linhas semelhantes a:

```nix
{ nixosTests, ... }:
{
  # ...
  passthru.tests = {
    basic-functionality-and-dovecot-integration = nixosTests.opensmtpd;
  };
}
```

Os testes NixOS são executados em uma máquina virtual (VM), portanto, são mais lentos do que os testes de pacote regulares. Para mais informações, consulte o manual do NixOS sobre [testes de módulo NixOS](https://nixos.org/manual/nixos/stable/#sec-nixos-tests).

### `passthru.updateScript` {#var-passthru-updateScript}
<!-- legacy anchors -->
[]{#var-passthru-updateScript-command}
[]{#var-passthru-updateScript-set-command}
[]{#var-passthru-updateScript-set-attrPath}
[]{#var-passthru-updateScript-set-supportedFeatures}
[]{#var-passthru-updateScript-env-UPDATE_NIX_NAME}
[]{#var-passthru-updateScript-env-UPDATE_NIX_PNAME}
[]{#var-passthru-updateScript-env-UPDATE_NIX_OLD_VERSION}
[]{#var-passthru-updateScript-env-UPDATE_NIX_ATTR_PATH}
[]{#var-passthru-updateScript-execution}
[]{#var-passthru-updateScript-supported-features}
[]{#var-passthru-updateScript-commit}
[]{#var-passthru-updateScript-commit-attrPath}
[]{#var-passthru-updateScript-commit-oldVersion}
[]{#var-passthru-updateScript-commit-newVersion}
[]{#var-passthru-updateScript-commit-files}
[]{#var-passthru-updateScript-commit-commitBody}
[]{#var-passthru-updateScript-commit-commitMessage}
[]{#var-passthru-updateScript-example-commit}

Nixpkgs tenta atualizar automaticamente todos os pacotes que possuem um atributo `passthru.updateScript`. Consulte a [seção sobre atualizações automáticas de pacotes no guia do contribuidor de pacotes](https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#automatic-package-updates) para detalhes.