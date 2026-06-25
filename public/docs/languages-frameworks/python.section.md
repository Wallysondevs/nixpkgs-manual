# Python {#python}

## Referência {#reference}

### Interpretadores {#interpreters}

@python-interpreter-table@

As expressões Nix para os interpretadores podem ser encontradas em
`pkgs/development/interpreters/python`.

Todos os pacotes que dependem de qualquer interpretador Python têm
`out/{python.sitePackages}` anexado ao `$PYTHONPATH` se tal diretório
existir.

#### Módulo `tkinter` da biblioteca padrão ausente {#missing-tkinter-module-standard-library}

Para reduzir o tamanho do *closure*, o `Tkinter`/`tkinter` está disponível como um pacote separado, `pythonPackages.tkinter`.

#### Atributos em pacotes de interpretadores {#attributes-on-interpreters-packages}

Cada interpretador possui os seguintes atributos:

- `libPrefix`. Nome da pasta em `${python}/lib/` para o interpretador correspondente.
- `interpreter`. Alias para `${python}/bin/${executable}`.
- `buildEnv`. Função para construir ambientes de interpretadores Python com pacotes extras agrupados. Veja [](#python.buildenv-function) para uso e documentação.
- `withPackages`. Interface mais simples para `buildEnv`. Veja [](#python.withpackages-function) para uso e documentação.
- `sitePackages`. Alias para `lib/${libPrefix}/site-packages`.
- `executable`. Nome do executável do interpretador, por exemplo, `python3.10`.
- `pkgs`. Conjunto de pacotes Python para aquele interpretador específico. O conjunto de pacotes pode ser modificado sobrescrevendo o interpretador e passando `packageOverrides`.

### Construindo pacotes e aplicações {#building-packages-and-applications}

Bibliotecas e aplicações Python que usam ferramentas para seguir a PEP 517 (por exemplo, `setuptools` ou `hatchling`, etc.) ou
ferramentas anteriores como `distutils` são tipicamente construídas com as funções [`buildPythonPackage`](#buildpythonpackage-function) e
[`buildPythonApplication`](#buildpythonapplication-function), respectivamente. Essas duas funções também suportam a instalação de um `wheel`.

Todos os pacotes Python residem em `pkgs/top-level/python-packages.nix` e todas as
aplicações em outro lugar. Caso um pacote seja usado tanto como biblioteca quanto como
aplicação, então o pacote deve estar em `pkgs/top-level/python-packages.nix`
já que apenas esses pacotes são disponibilizados para todas as versões do interpretador. A
localização preferencial para expressões de biblioteca é em
`pkgs/development/python-modules`. É importante que esses pacotes sejam
chamados de `pkgs/top-level/python-packages.nix` e não de outro lugar, para garantir
que a versão correta do pacote seja construída.

Com base nos pacotes definidos em `pkgs/top-level/python-packages.nix`, um
conjunto de atributos é criado para cada interpretador Python disponível. Os
conjuntos disponíveis são

* `pkgs.python27Packages`
* `pkgs.python3Packages`
* `pkgs.python311Packages`
* `pkgs.python312Packages`
* `pkgs.python313Packages`
* `pkgs.python314Packages`
* `pkgs.python315Packages`
* `pkgs.pypy27Packages`
* `pkgs.pypy310Packages`

e os aliases

* `pkgs.python2Packages` apontando para `pkgs.python27Packages`
* `pkgs.python3Packages` apontando para `pkgs.python313Packages`
* `pkgs.pythonPackages` apontando para `pkgs.python2Packages`
* `pkgs.pypy2Packages` apontando para `pkgs.pypy27Packages`
* `pkgs.pypy3Packages` apontando para `pkgs.pypy310Packages`
* `pkgs.pypyPackages` apontando para `pkgs.pypy2Packages`

#### Função `buildPythonPackage` {#buildpythonpackage-function}

A função `buildPythonPackage` tem sua ligação de nome em
`pkgs/development/interpreters/python/python-packages-base.nix` e é
implementada em `pkgs/development/interpreters/python/mk-python-derivation.nix`
usando *setup hooks*.

O seguinte é um exemplo:

```nix
{
  lib,
  buildPythonPackage,
  fetchPypi,

  # build-system
  setuptools,
  setuptools-scm,

  # dependencies
  attrs,
  pluggy,
  py,
  setuptools,
  six,

  # tests
  hypothesis,
}:

buildPythonPackage (finalAttrs: {
  pname = "pytest";
  version = "3.3.1";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;

    hash = "sha256-z4Q23FnYaVNG/NOrKW3kZCXsqcDWQJbOvnn7Ueyy65M=";
  };

  postPatch = ''
    # don't test bash builtins
    rm testing/test_argcomplete.py
  '';

  build-system = [
    setuptools
    setuptools-scm
  ];

  dependencies = [
    attrs
    py
    setuptools
    six
    pluggy
  ];

  nativeCheckInputs = [ hypothesis ];

  meta = {
    changelog = "https://github.com/pytest-dev/pytest/releases/tag/${finalAttrs.version}";
    description = "Framework for writing tests";
    homepage = "https://github.com/pytest-dev/pytest";
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [
      lovek323
      madjar
      lsix
    ];
  };
})
```

A `buildPythonPackage` faz principalmente quatro coisas:

* Na [`buildPhase`](#build-phase), ela chama `${python.pythonOnBuildForHost.interpreter} -m build --wheel` para
  construir um arquivo zip binário `wheel`.
* Na [`installPhase`](#ssec-install-phase), ela instala o arquivo `wheel` usando `${python.pythonOnBuildForHost.interpreter} -m installer *.whl`.
* Na fase [`postFixup`](#var-stdenv-postFixup), a função bash `wrapPythonPrograms` é chamada para
  envolver todos os programas no diretório `$out/bin/*` para incluir a variável de ambiente `$PATH`
  e adicionar bibliotecas dependentes ao `sys.path` do script.
* Na fase [`installCheck`](#ssec-installCheck-phase), `${python.interpreter} -m pytest` é executado.

Por padrão, os testes são executados porque [`doCheck = true`](#var-stdenv-doCheck). As dependências de teste, como
por exemplo, o executor de testes, devem ser adicionadas a [`nativeCheckInputs`](#var-stdenv-nativeCheckInputs).

Por padrão, `meta.platforms` é definido com o mesmo valor
que o interpretador, a menos que seja sobrescrito.

##### Parâmetros de `buildPythonPackage` {#buildpythonpackage-parameters}

Todos os parâmetros da função [`stdenv.mkDerivation`](#sec-using-stdenv) ainda são suportados. Os
seguintes são específicos para `buildPythonPackage`:

* `catchConflicts ? true`: Se `true`, aborta a construção do pacote se um nome de pacote
  aparecer mais de uma vez na árvore de dependências. O padrão é `true`.
* `disabled ? false`: Se `true`, o pacote não é construído para a versão específica do interpretador Python.
* `dontWrapPythonPrograms ? false`: Ignora o *wrapping* de programas Python.
* `permitUserSite ? false`: Ignora a definição da variável de ambiente `PYTHONNOUSERSITE` em
  programas *wrapped*.
* `pyproject`: Se o formato pyproject deve ser usado. Como todos os outros formatos
  estão obsoletos, é recomendado definir isso como `true`. Ao fazer isso,
  `pypaBuildHook` será usado, e você pode adicionar as dependências de construção necessárias
  de `build-system.requires` para `build-system`. Observe que o formato pyproject
  retorna ao uso de `setuptools`, então você pode usar `pyproject = true`
  mesmo que o pacote tenha apenas um `setup.py`. Quando definido como `false`, você pode
  usar os [hooks](#setup-hooks) existentes ou fornecer sua própria lógica para construir o
  pacote. Isso pode ser útil para pacotes que não suportam o formato pyproject.
  Quando não definido, os *hooks* `setuptools` legados são usados para compatibilidade retroativa.
* `makeWrapperArgs ? []`: Uma lista de strings. Argumentos a serem passados para
  [`makeWrapper`](#fun-makeWrapper), que envolve binários gerados. Por padrão, os argumentos para
  [`makeWrapper`](#fun-makeWrapper) definem as variáveis de ambiente `PATH` e `PYTHONPATH` antes de chamar
  o binário. Argumentos adicionais aqui podem permitir que um desenvolvedor defina variáveis de ambiente
  que estarão disponíveis quando o binário for executado. Por exemplo,
  `makeWrapperArgs = ["--set" "FOO" "BAR" "--set" "BAZ" "QUX"]`.

  ::: {.note}
  Quando `__structuredAttrs = false`, o atributo `makeWrapperArgs` é passado como uma string separada por espaços para o script de construção. Os desenvolvedores devem usar `prependToVar` ou `appendToVar` para adicionar argumentos a ele nas fases de construção, ou usar `__structuredAttrs = true` para garantir que `makeWrapperArgs` seja passado como um array Bash.

  Para fins de compatibilidade,
  quando a variável de shell `makeWrapperArgs` é especificada como uma string separada por espaços (em vez de um array Bash) no script de construção, o conteúdo da string é expandido pelo Bash antes de ser concatenado no comando `wrapProgram`. Ainda assim, os desenvolvedores não devem depender de tais comportamentos, mas usar `__structuredAttrs = true` para especificar flags contendo espaços (por exemplo, `makeWrapperArgs = [ "--set" "GREETING" "Hello, world!" ]`), ou usar fases -pre e -post para especificar flags com expansões Bash (por exemplo, `preFixup = ''makeWrapperArgs+=(--prefix PATH : "$SOME_PATH")''`).
  :::

* `namePrefix`: Adiciona texto ao parâmetro `${name}`. No caso de bibliotecas, isso
  assume o padrão `"python3.8-"` para Python 3.8, etc., e no caso de aplicações para `""`.
* `pypaBuildFlags ? []`: Uma lista de strings. Argumentos a serem passados para `python -m build --wheel`.
* `pythonPath ? []`: Lista de pacotes a serem adicionados ao `$PYTHONPATH`. Pacotes
  em `pythonPath` não são propagados (ao contrário de [`propagatedBuildInputs`](#var-stdenv-propagatedBuildInputs)).
* `preShellHook`: Hook para executar comandos antes de `shellHook`.
* `postShellHook`: Hook para executar comandos depois de `shellHook`.
* `removeBinByteCode ? true`: Remove o bytecode de `/bin`. O bytecode é
  criado apenas quando os nomes dos arquivos terminam com `.py`.
* `setupPyGlobalFlags ? []`: Lista de flags passadas para o comando `setup.py`.
* `setupPyBuildFlags ? []`: Lista de flags passadas para o comando `setup.py build_ext`.

##### Usando argumentos de ponto fixo {#buildpythonpackage-fixed-point-arguments}

Ambos `buildPythonPackage` e `buildPythonApplication` suportam [argumentos de ponto fixo](#chap-build-helpers-finalAttrs), semelhantes a `stdenv.mkDerivation`.
Isso permite que você referencie os atributos finais da derivação.

Em vez de usar `rec`:

```nix
buildPythonPackage rec {
  pname = "pyspread";
  version = "2.4";
  src = fetchPypi {
    inherit pname version;
    hash = "sha256-...";
  };
}
```

Você pode usar o padrão `finalAttrs`:

```nix
buildPythonPackage (finalAttrs: {
  pname = "pyspread";
  version = "2.4";
  src = fetchPypi {
    pname = "pyspread";
    inherit (finalAttrs) version;
    hash = "sha256-...";
  };
})
```

Consulte a [documentação geral sobre argumentos de ponto fixo](#chap-build-helpers-finalAttrs) para mais detalhes sobre os benefícios deste padrão.

::: {.note}

Alguns argumentos de `buildPythonPackage`/`buildPythonApplication` são passados indiretamente para `stdenv.mkDerivation` via `passthru`.
Portanto, o estado final desses atributos pode ser acessado via `finalAttrs.passthru.${name}`.
[`<pkg>.overrideAttrs`](#sec-pkg-overrideAttrs) pode sobrescrevê-los usando o padrão `passthru = prevAttrs.passthru // { foo = "bar"; }`.
Tais argumentos incluem:

- `disabled`
- `pyproject`
- `format`
- `build-system`
- `dependencies`
- `optional-dependencies`

<!--
TODO(@doronbehar): When `.overridePythonAttrs` will be removed, the above text might need to be revised. See:

- https://github.com/NixOS/nixpkgs/pull/379637
- https://github.com/NixOS/nixpkgs/pull/469804
-->
:::

A função [`stdenv.mkDerivation`](#sec-using-stdenv) aceita vários parâmetros para descrever
entradas de construção (veja "Especificando dependências"). Os seguintes são de especial
interesse para pacotes Python, seja porque são principalmente usados, ou
porque seu comportamento é diferente:

* `nativeBuildInputs ? []`: Dependências apenas em tempo de construção. Tipicamente executáveis.
* `build-system ? []`: Dependências Python apenas em tempo de construção. Itens listados em `build-system.requires`/`setup_requires`.
* `buildInputs ? []`: Dependências de construção e/ou tempo de execução que precisam ser
  compiladas para a máquina *host*. Tipicamente bibliotecas não-Python que estão sendo
  linkadas.
* `nativeCheckInputs ? []`: Dependências necessárias para executar a [`checkPhase`](#ssec-check-phase). Estas
  são adicionadas a [`nativeBuildInputs`](#var-stdenv-nativeBuildInputs) quando [`doCheck = true`](#var-stdenv-doCheck). Itens listados em
  `tests_require` vão aqui.
* `dependencies ? []`: Além de propagar dependências,
  `buildPythonPackage` também injeta código e envolve executáveis com os
  caminhos incluídos nesta lista. Itens listados em `install_requires` vão aqui.
* `optional-dependencies ? { }`: Dependências opcionais sinalizadas por recurso. Itens listados em `extras_require` vão aqui.

##### Sobrescrevendo pacotes Python {#overriding-python-packages}

A função `buildPythonPackage` possui um método `overridePythonAttrs` que pode ser
usado para sobrescrever o pacote. No exemplo a seguir, criamos um ambiente
onde temos o pacote `blaze` usando uma versão mais antiga de `pandas`. Sobrescrevemos
primeiro o interpretador Python e passamos `packageOverrides` que contém
as sobrescritas para pacotes no conjunto de pacotes.

```nix
with import <nixpkgs> { };

let
  python = pkgs.python3.override {
    packageOverrides = self: super: {
      pandas = super.pandas.overridePythonAttrs (
        finalAttrs: prevAttrs: {
          version = "0.19.1";
          src = fetchPypi {
            pname = "pandas";
            inherit (finalAttrs) version;
            hash = "sha256-JQn+rtpy/OA2deLszSKEuxyttqBzcAil50H+JDHUdCE=";
          };
        }
      );
    };
  };
in
(python.withPackages (ps: [ ps.blaze ])).env
```

O próximo exemplo mostra uma sobrescrita não trivial da implementação de `blas` para
ser usada em todo o conjunto de pacotes Python:

```nix
{
  python3MyBlas = pkgs.python3.override {
    packageOverrides = self: super: {
      # We need toPythonModule for the package set to evaluate this
      blas = super.toPythonModule (super.pkgs.blas.override { blasProvider = super.pkgs.mkl; });
      lapack = super.toPythonModule (super.pkgs.lapack.override { lapackProvider = super.pkgs.mkl; });
    };
  };
}
```

Isso é particularmente útil para usuários de numpy e scipy que desejam ganhar velocidade com outras implementações de blas.
Note que usar `scipy = super.scipy.override { blas = super.pkgs.mkl; };` provavelmente resultará em
problemas de compilação, porque as dependências do scipy também precisam usar a mesma implementação de blas.

#### Função `buildPythonApplication` {#buildpythonapplication-function}

A função [`buildPythonApplication`](#buildpythonapplication-function) é praticamente a mesma que
[`buildPythonPackage`](#buildpythonpackage-function). O principal objetivo desta função é construir um pacote Python
onde se está interessado apenas nos executáveis, e não em módulos importáveis.
Por essa razão, ao adicionar este pacote a um [`python.buildEnv`](#python.buildenv-function), os
módulos não serão disponibilizados.

Outra diferença é que [`buildPythonPackage`](#buildpythonpackage-function) por padrão prefixa os nomes dos
pacotes com a versão do interpretador. Como isso é irrelevante para
aplicações, o prefixo é omitido.

Ao empacotar uma aplicação Python com [`buildPythonApplication`](#buildPythonApplication-function), ela deve ser
chamada com `callPackage` e passada `python3` ou `python3Packages` (possivelmente
especificando uma versão do interpretador), assim:

```nix
{
  lib,
  python3Packages,
  fetchPypi,
}:

python3Packages.buildPythonApplication (finalAttrs: {
  pname = "luigi";
  version = "2.7.9";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;
    hash = "sha256-Pe229rT0aHwA98s+nTHQMEFKZPo/yw6sot8MivFDvAw=";
  };

  build-system = with python3Packages; [ setuptools ];

  dependencies = with python3Packages; [
    tornado
    python-daemon
  ];

  meta = {
    # ...
  };
})
```

Isso é então adicionado a `pkgs/by-name` assim como qualquer outra aplicação seria.

Como o pacote é uma aplicação, um consumidor não precisa se preocupar com
versões ou módulos Python, e é por isso que eles não vão em `python3Packages`.

#### Função `toPythonApplication` {#topythonapplication-function}

Uma distinção é feita entre aplicações e bibliotecas, no entanto, às vezes um
pacote é usado como ambos. Neste caso, o pacote é adicionado como uma biblioteca a
`python-packages.nix` e como uma aplicação a `pkgs/by-name`. Para reduzir
duplicação, `toPythonApplication` pode ser usado para converter uma biblioteca em uma
aplicação.

A expressão Nix deve usar [`buildPythonPackage`](#buildpythonpackage-function) e ser chamada de
`python-packages.nix`. Uma referência deve ser criada de `pkgs/by-name` para
o atributo em `python-packages.nix`, e `toPythonApplication` deve ser
aplicada à referência:

```nix
{ python3Packages }:

python3Packages.toPythonApplication python3Packages.youtube-dl
```

#### Função `toPythonModule` {#topythonmodule-function}

Em alguns casos, como *bindings*, um pacote é criado usando
[`stdenv.mkDerivation`](#sec-using-stdenv) e adicionado como atributo em `pkgs/by-name` ou em `all-packages.nix`. Os
*bindings* Python devem ser disponibilizados a partir de `python-packages.nix`. A
função `toPythonModule` recebe uma derivação e faz certas
modificações específicas do Python.

```nix
{
  opencv = toPythonModule (
    pkgs.opencv.override {
      enablePython = true;
      pythonPackages = self;
    }
  );
}
```

Preste atenção em passar a versão correta do Python!

#### Função `mkPythonMetaPackage` {#mkpythonmetapackage-function}

Isso criará um meta pacote contendo [arquivos de metadados](https://packaging.python.org/en/latest/specifications/recording-installed-packages/) para satisfazer uma dependência de um pacote, sem que ele tenha sido realmente instalado no ambiente.
No nixpkgs, isso é usado para empacotar pacotes Python com distribuições binárias/de código-fonte divididas, como [psycopg2](https://pypi.org/project/psycopg2/)/[psycopg2-binary](https://pypi.org/project/psycopg2-binary/).

```nix
mkPythonMetaPackage {
  pname = "psycopg2-binary";
  inherit (psycopg2) optional-dependencies version;
  dependencies = [ psycopg2 ];
  meta = { inherit (psycopg2.meta) description homepage; };
}
```

#### Função `mkPythonEditablePackage` {#mkpythoneditablepackage-function}

Ao desenvolver pacotes Python, é comum instalar pacotes no [modo editável](https://setuptools.pypa.io/en/latest/userguide/development_mode.html).
Assim como `mkPythonMetaPackage`, esta função existe para criar um pacote de outra forma vazio, mas também contendo um ponteiro para um local impuro fora do Nix store que pode ser alterado sem reconstrução.

A raiz editável é passada como uma string. Normalmente, os arquivos `.pth` contêm caminhos absolutos para o local mutável. Isso nem sempre é ergonômico com Nix, então as variáveis de ambiente são expandidas em tempo de execução.
Isso significa que um *shell hook* configurando algo como uma variável `$REPO_ROOT` pode ser usado como a raiz do pacote relativa.

Como um detalhe de implementação, o `build-system` especificado na [PEP-518](https://peps.python.org/pep-0518/) não será usado, mas em vez disso o pacote editável será construído usando [hatchling](https://pypi.org/project/hatchling/).
O `build-system` fornecido se tornará, em vez disso, dependências de tempo de execução do pacote editável.

Note que sobrescrever pacotes mais profundos no grafo de dependências *pode* funcionar, mas não é o caso de uso principal e sobrescrever pacotes existentes pode fazer com que outros quebrem de maneiras inesperadas.

```nix
{
  pkgs ? import <nixpkgs> { },
}:

let
  pyproject = pkgs.lib.importTOML ./pyproject.toml;

  myPython = pkgs.python.override {
    self = myPython;
    packageOverrides = pyfinal: pyprev: {
      # An editable package with a script that loads our mutable location
      my-editable = pyfinal.mkPythonEditablePackage {
        # Inherit project metadata from pyproject.toml
        pname = pyproject.project.name;
        inherit (pyproject.project) version;

        # The editable root passed as a string
        root = "$REPO_ROOT/src"; # Use environment variable expansion at runtime

        # Inject a script (other PEP-621 entrypoints are also accepted)
        inherit (pyproject.project) scripts;
      };
    };
  };

  pythonEnv = myPython.withPackages (ps: [ ps.my-editable ]);

in
pkgs.mkShell { packages = [ pythonEnv ]; }
```

#### Função `python.buildEnv` {#python.buildenv-function}

Ambientes Python podem ser criados usando a função de baixo nível `pkgs.buildEnv`.
Este exemplo mostra como criar um ambiente que possui o Pyramid Web Framework.
Salvando o seguinte como `default.nix`

```nix
with import <nixpkgs> { };

python3.buildEnv.override {
  extraLibs = [ python3Packages.pyramid ];
  ignoreCollisions = true;
}
```

e executando `nix-build` criará

```
/nix/store/cf1xhjwzmdki7fasgr4kz6di72ykicl5-python-2.7.8-env
```

com binários *wrapped* em `bin/`.

Você também pode usar o atributo `env` para criar ambientes locais com os
pacotes necessários instalados. Isso é de certa forma comparável ao `virtualenv`. Por exemplo,
executando `nix-shell` com o seguinte `shell.nix`

```nix
with import <nixpkgs> { };

(python3.buildEnv.override {
  extraLibs = with python3Packages; [
    numpy
    requests
  ];
}).env
```

o levará a um *shell* onde o Python terá os
pacotes especificados em seu caminho.

##### Argumentos de `python.buildEnv` {#python.buildenv-arguments}

* `extraLibs`: Lista de pacotes instalados dentro do ambiente.
* `postBuild`: Comando de *shell* executado após a construção do ambiente.
* `ignoreCollisions`: Ignora colisões de arquivos dentro do ambiente (o padrão é `false`).
* `permitUserSite`: Ignora a definição da variável de ambiente `PYTHONNOUSERSITE` em
  binários *wrapped* no ambiente.

#### Função `python.withPackages` {#python.withpackages-function}

A função [`python.withPackages`](#python.withpackages-function) fornece uma interface mais simples para a funcionalidade [`python.buildEnv`](#python.buildenv-function).
Ela recebe uma função como argumento que é passada para o conjunto de pacotes python e retorna a lista
dos pacotes a serem incluídos no ambiente. Usando a função [`withPackages`](#python.withpackages-function), o exemplo anterior
para o ambiente do Pyramid Web Framework pode ser escrito assim:

```nix
with import <nixpkgs> { };

python.withPackages (ps: [ ps.pyramid ])
```

[`withPackages`](#python.withpackages-function) passa o conjunto de pacotes correto para a versão específica do interpretador
como um argumento para a função. No exemplo acima, `ps` é igual a
`pythonPackages`. Mas você também pode facilmente mudar para usar python3:

```nix
with import <nixpkgs> { };

python3.withPackages (ps: [ ps.pyramid ])
```

Agora, `ps` é definido como `python3Packages`, correspondendo à versão do interpretador.

Como [`python.withPackages`](#python.withpackages-function) usa [`python.buildEnv`](#python.buildenv-function) por baixo dos panos, ele também
suporta o atributo `env`. O arquivo `shell.nix` da seção anterior pode
assim ser escrito também assim:

```nix
with import <nixpkgs> { };

(python3.withPackages (
  ps: with ps; [
    numpy
    requests
  ]
)).env
```

Em contraste com [`python.buildEnv`](#python.buildenv-function), [`python.withPackages`](#python.withpackages-function) não suporta as
opções mais avançadas como `ignoreCollisions = true` ou `postBuild`. Se você
precisar delas, você terá que usar [`python.buildEnv`](#python.buildenv-function).

Pacotes de namespace do Python 2 podem fornecer `__init__.py` que colidem. Nesse caso,
[`python.buildEnv`](#python.buildenv-function) deve ser usado com `ignoreCollisions = true`.

#### Setup hooks {#setup-hooks}

Os seguintes são *setup hooks* especificamente para pacotes Python. A maioria deles
é usada em [`buildPythonPackage`](#buildpythonpackage-function).

- `eggUnpackhook` para mover um *egg* para a pasta correta para que possa ser instalado
  com o `eggInstallHook`.
- `eggBuildHook` para pular a construção de *eggs*.
- `eggInstallHook` para instalar *eggs*.
- `pypaBuildHook` para construir um *wheel* usando
  [`pypa/build`](https://pypa-build.readthedocs.io/en/latest/index.html) e
  PEP 517/518. Note que um sistema de construção (por exemplo, `setuptools` ou `flit`) ainda
  deve ser adicionado como `build-system`.
- `pypaInstallHook` para instalar *wheels*.
- `pytestCheckHook` para executar testes com `pytest`. Veja [exemplo de uso](#using-pytestcheckhook).
- `pythonCatchConflictsHook` para falhar se o pacote depender de duas versões diferentes da mesma dependência.
- `pythonImportsCheckHook` para verificar se a importação dos módulos listados funciona.
- `pythonRelaxDepsHook` relaxará as restrições de dependências Python para o pacote.
  Veja [exemplo de uso](#using-pythonrelaxdepshook).
- `pythonRemoveBinBytecode` para remover o bytecode da pasta `/bin`.
- `setuptoolsBuildHook` para construir um *wheel* usando `setuptools`.
- `sphinxHook` para construir documentação e páginas de manual usando Sphinx.
- `stestrCheckHook` para executar testes com `stestr`.
- `venvShellHook` para *source* um `venv` Python 3 no local `venvDir`. Um
  `venv` é criado se ainda não existir. `postVenvCreation` pode ser usado para
  executar comandos apenas após a primeira criação do venv.
- `wheelUnpackHook` para mover um *wheel* para a pasta correta para que possa ser instalado
  com o `pipInstallHook`.
- `unittestCheckHook` executará testes com `python -m unittest discover`. Veja [exemplo de uso](#using-unittestcheckhook).

#### Sobrescrevendo *build helpers* {#overriding-python-build-helpers}

Assim como muitos dos *build helpers* fornecidos pelo Nixpkgs, os *build helpers* Python tipicamente fornecem um atributo `<function>.override`.
Ele funciona como [`<pkg>.override`](#sec-pkg-override), e pode ser usado para sobrescrever as dependências de cada *build helper*.

Isso permite especificar o *stdenv* a ser usado por `buildPythonPackage` ou `buildPythonApplication`. O padrão (`python.stdenv`) pode ser sobrescrito da seguinte forma:

```nix
buildPythonPackage.override { stdenv = customStdenv; } {
  # package attrs...
}
```
## Guia do Usuário {#user-guide}

### Usando Python {#using-python}

#### Visão Geral {#overview}

Várias versões do interpretador Python estão disponíveis no Nix, assim como uma
grande quantidade de pacotes. O atributo `python3` refere-se ao interpretador
padrão, que atualmente é o CPython 3.13. O atributo `python` refere-se ao
CPython 2.7 para compatibilidade com versões anteriores. Também é possível
referir-se a versões específicas, por exemplo, `python313` refere-se ao CPython 3.13, e `pypy` refere-se ao
interpretador PyPy padrão.

Python é muito usado, e de diferentes maneiras. Isso afeta também como ele é
empacotado. No caso do Python no Nix, uma distinção importante é feita entre
se o pacote é considerado principalmente uma aplicação, ou se deve
ser usado como uma biblioteca, ou seja, de interesse primário são os módulos em
`site-packages` que devem ser importáveis.

Na árvore do Nixpkgs, as aplicações Python podem ser encontradas por toda parte, dependendo do
que elas fazem, e são chamadas do conjunto principal de pacotes. As bibliotecas Python,
no entanto, estão em conjuntos separados, com um conjunto por versão de interpretador.

Os interpretadores possuem vários atributos comuns. Um desses atributos é
`pkgs`, que é um conjunto de pacotes de bibliotecas Python para este
interpretador específico. Por exemplo, o pacote `toolz` correspondente ao interpretador
padrão é `python3.pkgs.toolz`, e a versão CPython 3.13 é `python313.pkgs.toolz`.
O conjunto principal de pacotes contém aliases para esses conjuntos de pacotes, por exemplo,
`pythonPackages` refere-se a `python.pkgs` e `python313Packages` a
`python313.pkgs`.

#### Instalando Python e pacotes {#installing-python-and-packages}

Os manuais do Nix e NixOS explicam como os pacotes são geralmente instalados. No
caso do Python e Nix, é importante fazer uma distinção entre se o
pacote é considerado uma aplicação ou uma biblioteca.

Aplicações no Nix são tipicamente instaladas no seu perfil de usuário imperativamente
usando `nix-env -i`, e no NixOS declarativamente adicionando o nome do pacote a
`environment.systemPackages` em `/etc/nixos/configuration.nix`. Dependências
como bibliotecas são instaladas automaticamente e não devem ser instaladas
explicitamente.

O mesmo vale para aplicações Python. Aplicações Python podem ser instaladas no
seu perfil, e serão empacotadas para encontrar suas dependências de biblioteca exatas,
sem impactar outras aplicações ou poluir seu ambiente de usuário.

Mas as bibliotecas Python que você gostaria de usar para desenvolvimento não podem ser instaladas,
pelo menos não individualmente, porque elas não conseguirão se encontrar
resultando em erros de importação. Em vez disso, é possível criar um ambiente
com [`python.buildEnv`](#python.buildenv-function) ou [`python.withPackages`](#python.withpackages-function) onde o interpretador e outros
executáveis são empacotados para poderem se encontrar e todos os módulos.

Nos exemplos a seguir, começaremos criando um ambiente simples e ad-hoc
com um nix-shell que possui `numpy` e `toolz` no Python 3.13; em seguida, criaremos
um ambiente reutilizável em um script Python de arquivo único; depois, criaremos um
ambiente Python completo para desenvolvimento com este mesmo ambiente.

Filosoficamente, isso deve ser familiar para usuários acostumados a um estilo
de desenvolvimento `venv`: projetos individuais criam seus próprios ambientes Python sem
impactar o ambiente global ou uns aos outros.

#### Ambiente Python temporário ad-hoc com `nix-shell` {#ad-hoc-temporary-python-environment-with-nix-shell}

A maneira mais simples de começar a experimentar como o nix empacota e configura ambientes Python
é com `nix-shell` na linha de comando. Esses ambientes criam uma
sessão de shell temporária com um Python e uma lista *precisa* de pacotes (além
de suas dependências de tempo de execução), sem outros pacotes Python no escopo do
interpretador Python.

Para criar uma sessão Python 3.13 com `numpy` e `toolz` disponíveis, execute:

```sh
$ nix-shell -p 'python313.withPackages(ps: with ps; [ numpy toolz ])'
```

Por padrão, `nix-shell` iniciará uma sessão `bash` com este interpretador em nosso
`PATH`, então se executarmos:

```Python console
[nix-shell:~/src/nixpkgs]$ python3
Python 3.13.3 (main, Apr  8 2025, 13:54:08) [GCC 14.2.1 20250322] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import numpy; import toolz
```

Observe que nenhum outro módulo está no escopo, mesmo que tenham sido imperativamente
instalados em nosso ambiente de usuário como uma dependência de uma aplicação Python:

```Python console
>>> import requests
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ModuleNotFoundError: No module named 'requests'
```

Podemos adicionar quantos módulos adicionais ao `nix-shell` precisarmos, e ainda
teremos 1 interpretador Python empacotado. Podemos iniciar o interpretador
diretamente assim:

```sh
$ nix-shell -p "python313.withPackages (ps: with ps; [ numpy toolz requests ])" --run python3
Python 3.13.3 (main, Apr  8 2025, 13:54:08) [GCC 14.2.1 20250322] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> import requests
>>>
```

Observe que desta vez ele construiu um novo ambiente Python, que agora inclui
`requests`. Construir um ambiente apenas cria scripts de wrapper que expõem as
dependências selecionadas ao interpretador enquanto reutilizam os módulos reais. Isso
significa que se qualquer outro ambiente tiver instalado `requests` ou `numpy` em um contexto
diferente, não precisamos recompilá-los -- apenas recompilamos o script de wrapper
que configura um interpretador apontando para eles. Isso importa muito mais para
módulos "grandes" como `pytorch` ou `tensorflow`.

Os nomes dos módulos geralmente correspondem aos seus nomes em [pypi.org](https://pypi.org/), mas
normalizados de acordo com PEP 503/508. (por exemplo, Foo__Bar.baz -> foo-bar-baz)
Você pode usar o [site de busca do Nixpkgs](https://nixos.org/nixos/packages.html)
para encontrá-los também (juntamente com pacotes não-Python).

Neste ponto, podemos criar ambientes Python experimentais descartáveis com
dependências arbitrárias. Esta é uma boa maneira de ter uma ideia de como o
interpretador Python e as dependências funcionam no Nix e NixOS, mas para fazer
algum desenvolvimento real, vamos querer torná-lo um pouco mais persistente.

##### Executando scripts Python e usando `nix-shell` como shebang {#running-python-scripts-and-using-nix-shell-as-shebang}

Às vezes, temos um script cujo cabeçalho se parece com isto:

```python
#!/usr/bin/env python3
import numpy as np
a = np.array([1,2])
b = np.array([3,4])
print(f"The dot product of {a} and {b} is: {np.dot(a, b)}")
```

A execução deste script requer um `python3` que tenha `numpy`. Usando o que aprendemos
na seção anterior, poderíamos iniciar um shell e simplesmente executá-lo assim:

```ShellSession
$ nix-shell -p 'python313.withPackages (ps: with ps; [ numpy ])' --run 'python3 foo.py'
The dot product of [1 2] and [3 4] is: 11
```

Mas se mantivermos o script nós mesmos, e se houver mais dependências, pode
ser bom codificar essas dependências no código-fonte para tornar o script reutilizável
sem essa informação. Isso pode ser feito usando `nix-shell` como um
[shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)), assim:

```python
#!/usr/bin/env nix-shell
#!nix-shell -i python3 -p "python3.withPackages(ps: [ ps.numpy ])"
import numpy as np
a = np.array([1,2])
b = np.array([3,4])
print(f"The dot product of {a} and {b} is: {np.dot(a, b)}")
```

Então o executamos, sem exigir nenhuma configuração de ambiente!

```sh
$ ./foo.py
The dot product of [1 2] and [3 4] is: 11
```

Se as dependências não estiverem disponíveis no host onde `foo.py` é executado, ele
as construirá ou baixará de um cache binário do Nix antes de iniciar, desde
que seja executado em uma máquina com uma instalação multiusuário do Nix.

Isso fornece uma maneira de distribuir um script Python auto-inicializável, semelhante a um
binário estaticamente ligado, onde ele pode ser executado em qualquer máquina (desde que o nix esteja
instalado) sem ter que assumir que `numpy` está instalado globalmente no
sistema.

Por padrão, ele está puxando o checkout de importação do próprio Nixpkgs do nosso canal nix,
o que é bom, pois se alinha com nossos outros builds de pacotes, mas podemos
torná-lo totalmente reproduzível fixando a importação de `nixpkgs`:

```python
#!/usr/bin/env nix-shell
#!nix-shell -i python3 -p "python3.withPackages (ps: [ ps.numpy ])"
#!nix-shell -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/e51209796c4262bfb8908e3d6d72302fe4e96f5f.tar.gz
import numpy as np
a = np.array([1,2])
b = np.array([3,4])
print(f"The dot product of {a} and {b} is: {np.dot(a, b)}")
```

Isso será executado com as mesmas versões exatas de Python 3.10, numpy e
dependências do sistema daqui a um ano como hoje, porque sempre usará
exatamente o commit git `e51209796c4262bfb8908e3d6d72302fe4e96f5f` do Nixpkgs para todas
as versões dos pacotes.

Esta também é uma ótima maneira de garantir que o script seja executado de forma idêntica em diferentes
servidores.

##### Carregar ambiente a partir de expressão `.nix` {#load-environment-from-.nix-expression}

Vimos agora como criar uma sessão de shell temporária ad-hoc e como
criar um único script com dependências Python, mas no curso do
desenvolvimento normal, geralmente trabalhamos em um repositório de pacotes inteiro.

Conforme explicado [na seção `nix-shell`](https://nixos.org/manual/nix/stable/command-ref/nix-shell) do manual do Nix, o `nix-shell` também pode carregar uma expressão de um arquivo `.nix`.
Digamos que queremos ter Python 3.13, `numpy` e `toolz`, como antes,
em um ambiente. Podemos adicionar um arquivo `shell.nix` descrevendo nossas dependências:

```nix
with import <nixpkgs> { };
(python313.withPackages (
  ps: with ps; [
    numpy
    toolz
  ]
)).env
```

E então, na linha de comando, apenas digitar `nix-shell` produz o mesmo
ambiente de antes. Em um projeto normal, provavelmente teremos muito mais
dependências; isso pode fornecer uma maneira para os desenvolvedores compartilharem os ambientes
uns com os outros e com os construtores de CI.

O que está acontecendo aqui?

1.  Começamos importando as coleções de pacotes Nix. `import <nixpkgs>`
    importa a função `<nixpkgs>`, `{}` a chama e a declaração `with`
    traz todos os atributos de `nixpkgs` para o escopo local. Esses atributos formam
    o conjunto principal de pacotes.
2.  Em seguida, criamos um ambiente Python 3.13 com a função [`withPackages`](#python.withpackages-function), como antes.
3.  A função [`withPackages`](#python.withpackages-function) espera que forneçamos uma função como argumento
    que recebe o conjunto de todos os pacotes Python e retorna uma lista de pacotes a
    serem incluídos no ambiente. Aqui, selecionamos os pacotes `numpy` e `toolz`
    do conjunto de pacotes.

Para combinar isso com `mkShell` você pode:

```nix
with import <nixpkgs> { };
let
  pythonEnv = python313.withPackages (ps: [
    ps.numpy
    ps.toolz
  ]);
in
mkShell {
  packages = [
    pythonEnv

    black
    mypy

    libffi
    openssl
  ];
}
```

Isso criará um ambiente unificado que não possui apenas nosso interpretador Python
e suas dependências Python, mas também ferramentas como `black` ou `mypy` e bibliotecas
como `libffi` e `openssl` no escopo. Isso é genérico e pode abranger qualquer número de
ferramentas ou linguagens em todo o ecossistema Nixpkgs.

##### Instalando ambientes globalmente no sistema {#installing-environments-globally-on-the-system}

Até agora, temos criado ambientes com escopo para uma sessão de shell ad-hoc,
ou um único script, ou um único projeto. Isso é geralmente aconselhável, pois
evita poluição entre contextos.

No entanto, às vezes sabemos que frequentemente desejaremos um Python com alguns pacotes básicos,
e queremos que isso esteja disponível sem ter que entrar em um shell ou contexto de build.
Isso pode ser útil para que editores e plugins como vim/emacs ou ferramentas de shell
"simplesmente funcionem" sem ter que configurá-los, ou ao executar outro software
que espera que os pacotes sejam instalados globalmente.

Para criar seu próprio ambiente personalizado, crie um arquivo em `~/.config/nixpkgs/overlays/`
que se pareça com isto:

```nix
# ~/.config/nixpkgs/overlays/myEnv.nix
self: super: {
  myEnv = super.buildEnv {
    name = "myEnv";
    paths = [
      # A Python 3 interpreter with some packages
      (self.python3.withPackages (
        ps: with ps; [
          pyflakes
          pytest
          black
        ]
      ))

      # Some other packages we'd like as part of this env
      self.mypy
      self.black
      self.ripgrep
      self.tmux
    ];
  };
}
```

Você pode então construir e instalar isso em seu perfil com:

```sh
nix-env -iA myEnv
```

Uma limitação disso é que você só pode ter 1 ambiente Python instalado
globalmente, já que eles entram em conflito no `python` a ser carregado do seu `PATH`.

Se você tiver um conflito ou preferir manter a configuração limpa, você pode fazer com que o `nix-env`
*desinstale* atomicamente todos os outros pacotes instalados imperativamente e substitua
seu perfil apenas por `myEnv` usando a flag `--replace`.

##### Ambiente definido em `/etc/nixos/configuration.nix` {#environment-defined-in-etcnixosconfiguration.nix}

Para fins de completude, veja como instalar o ambiente em todo o sistema
no NixOS.

```nix
{
  # ...

  environment.systemPackages = with pkgs; [
    (python314.withPackages (
      ps: with ps; [
        numpy
        toolz
      ]
    ))
  ];
}
```

### Desenvolvendo com Python {#developing-with-python}

Acima, estávamos principalmente focados em casos de uso e no que fazer para começar
a criar ambientes Python funcionais no nix.

Agora que você conhece o básico para começar, é hora de dar um passo
atrás e dar uma olhada mais profunda em como os pacotes Python são empacotados no Nix.

#### Pacotes de biblioteca Python no Nixpkgs {#python-library-packages-in-nixpkgs}

Com o Nix, todos os pacotes são construídos por funções. A principal função no Nix para
construir bibliotecas Python é [`buildPythonPackage`](#buildpythonpackage-function). Vamos ver como podemos construir o
pacote `toolz`.

```nix
{
  lib,
  buildPythonPackage,
  fetchPypi,
  setuptools,
}:

buildPythonPackage (finalAttrs: {
  pname = "toolz";
  version = "0.10.0";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;
    hash = "sha256-CP3V73yWSArRHBLUct4hrNMjWZlvaaUlkpm1QP66RWA=";
  };

  build-system = [ setuptools ];

  # has no tests
  doCheck = false;

  pythonImportsCheck = [
    "toolz.itertoolz"
    "toolz.functoolz"
    "toolz.dicttoolz"
  ];

  meta = {
    changelog = "https://github.com/pytoolz/toolz/releases/tag/${finalAttrs.version}";
    homepage = "https://github.com/pytoolz/toolz";
    description = "List processing tools and functional utilities";
    license = lib.licenses.bsd3;
  };
})
```

O que acontece aqui? A função [`buildPythonPackage`](#buildPythonPackage-function) é chamada e como argumento
ela aceita um conjunto. Neste caso, o conjunto é um conjunto recursivo, `rec`. Um dos
argumentos é o nome do pacote, que consiste em um nome base (geralmente
seguindo o nome no PyPI) e uma versão. Outro argumento, `src`, especifica a
fonte, que neste caso é obtida do PyPI usando a função auxiliar
`fetchPypi`. O argumento `doCheck` é usado para definir se os testes devem ser executados
ao construir o pacote. Como não há testes, contamos com [`pythonImportsCheck`](#using-pythonimportscheck)
para testar se o pacote pode ser importado. Além disso, especificamos algumas
informações meta. A saída da função é uma derivação.

Uma expressão para `toolz` pode ser encontrada no repositório Nixpkgs. Conforme explicado
na introdução desta seção Python, uma derivação de `toolz` está disponível
para cada versão do interpretador, por exemplo, `python313.pkgs.toolz` refere-se à derivação
`toolz` correspondente ao interpretador CPython 3.13.

O exemplo acima funciona quando você está trabalhando diretamente em
`pkgs/top-level/python-packages.nix` no repositório Nixpkgs. No entanto, muitas vezes,
você desejará testar uma expressão Nix fora da árvore Nixpkgs.

A seguinte expressão cria uma derivação para o pacote `toolz`,
e o adiciona junto com um pacote `numpy` a um ambiente Python.

```nix
with import <nixpkgs> { };

(
  let
    my_toolz = python313.pkgs.buildPythonPackage (finalAttrs: {
      pname = "toolz";
      version = "0.10.0";
      pyproject = true;

      src = fetchPypi {
        inherit (finalAttrs) pname version;
        hash = "sha256-CP3V73yWSArRHBLUct4hrNMjWZlvaaUlkpm1QP66RWA=";
      };

      build-system = [ python313.pkgs.setuptools ];

      # has no tests
      doCheck = false;

      meta = {
        homepage = "https://github.com/pytoolz/toolz/";
        description = "List processing tools and functional utilities";
        # [...]
      };
    });

  in
  python313.withPackages (
    ps: with ps; [
      numpy
      my_toolz
    ]
  )
).env
```

A execução de `nix-shell` resultará em um ambiente no qual você pode usar
Python 3.13 e o pacote `toolz`. Como você pode ver, tivemos que mencionar explicitamente
para qual versão do Python queremos construir um pacote.

Então, o que fizemos aqui? Bem, pegamos a expressão Nix que usamos anteriormente
para construir um ambiente Python, e dissemos que queríamos incluir nossa própria
versão de `toolz`, chamada `my_toolz`. Para introduzir nosso próprio pacote no escopo
de [`withPackages`](#python.withpackages-function), usamos uma expressão `let`. Você pode ver que usamos
`ps.numpy` para selecionar numpy do conjunto de pacotes nixpkgs (`ps`). Não pegamos
`toolz` do conjunto de pacotes Nixpkgs desta vez, mas sim nossa própria versão
que introduzimos com a expressão `let`.

#### Lidando com dependências {#handling-dependencies}

Nosso exemplo, `toolz`, não possui dependências de outros pacotes Python ou bibliotecas de sistema.
[`buildPythonPackage`](#buildPythonPackage-function) usa os seguintes argumentos nas seguintes circunstâncias:

-   `dependencies` - Para dependências de tempo de execução do Python.
-   `build-system` - Para requisitos de tempo de construção do Python.
-   [`buildInputs`](#var-stdenv-buildInputs) - Para requisitos de tempo de construção não-Python.
-   [`nativeCheckInputs`](#var-stdenv-nativeCheckInputs) - Para dependências de teste.

As dependências podem pertencer a múltiplos argumentos, por exemplo, se algo é tanto um requisito de tempo de construção quanto uma dependência de tempo de execução.

O exemplo a seguir mostra quais argumentos são passados para [`buildPythonPackage`](#buildPythonPackage-function) a fim de construir [`dirigera`](https://github.com/Leggin/dirigera).

```nix
{
  lib,
  buildPythonPackage,
  fetchFromGitHub,
  pydantic,
  pytestCheckHook,
  requests,
  setuptools,
  websocket-client,
}:

buildPythonPackage (finalAttrs: {
  pname = "dirigera";
  version = "1.2.6";
  pyproject = true;

  src = fetchFromGitHub {
    owner = "Leggin";
    repo = "dirigera";
    tag = "v${finalAttrs.version}";
    hash = "sha256-5pfzmaIkIEtxDtkhG1lOLSTjWahEDgQKLJKbAG5rBjE=";
  };

  build-system = [ setuptools ];

  dependencies = [
    pydantic
    requests
    websocket-client
  ];

  nativeCheckInputs = [ pytestCheckHook ];

  pythonImportsCheck = [ "dirigera" ];

  meta = {
    description = "Module for controlling the IKEA Dirigera Smart Home Hub";
    homepage = "https://github.com/Leggin/dirigera";
    changelog = "https://github.com/Leggin/dirigera/releases/tag/${finalAttrs.src.tag}";
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [ fab ];
    mainProgram = "generate-token";
  };
})
```

Podemos ver várias dependências de tempo de execução, `pydantic`, `requests` e
`websocket-client`. Além disso, temos [`nativeCheckInputs`](#var-stdenv-nativeCheckInputs) com `pytestCheckHook`.
`pytestCheckHook` é um hook de execução de testes e é usado apenas durante a [`checkPhase`](#ssec-check-phase) e, portanto,
não é adicionado a `dependencies`.

No caso anterior, tínhamos apenas dependências de outros pacotes Python a considerar.
Ocasionalmente, você também tem bibliotecas de sistema a considerar. Por exemplo, `lxml` fornece
ligações Python para `libxml2` e `libxslt`. Essas bibliotecas são necessárias apenas
ao construir as ligações e, portanto, são adicionadas como [`buildInputs`](#var-stdenv-buildInputs).

```nix
{
  lib,
  buildPythonPackage,
  fetchPypi,
  setuptools,
  libxml2,
  libxslt,
}:

buildPythonPackage (finalAttrs: {
  pname = "lxml";
  version = "3.4.4";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;
    hash = "sha256-s9NiusRxFydHzaNRMjjxFcvWxfi45jGb9ql6eJJyQJk=";
  };

  build-system = [ setuptools ];

  buildInputs = [
    libxml2
    libxslt
  ];

  # tests are meant to be ran "in-place" in the same directory as src
  doCheck = false;

  pythonImportsCheck = [
    "lxml"
    "lxml.etree"
  ];

  meta = {
    changelog = "https://github.com/lxml/lxml/releases/tag/lxml-${finalAttrs.version}";
    description = "Pythonic binding for the libxml2 and libxslt libraries";
    homepage = "https://lxml.de";
    license = lib.licenses.bsd3;
    maintainers = with lib.maintainers; [ sjourdois ];
  };
})
```

Neste exemplo, `lxml` e Nix conseguem determinar exatamente onde estão os arquivos
relevantes das dependências. Este nem sempre é o caso.

O exemplo abaixo mostra as ligações para a Transformada Rápida de Fourier do Oeste,
comumente conhecida como FFTW. No Nix, temos pacotes separados de FFTW para os
diferentes tipos de floats (`"single"`, `"double"`, `"long-double"`). As
ligações precisam de todos os três tipos e, portanto, adicionamos todos os três como [`buildInputs`](#var-stdenv-buildInputs).
As ligações não esperam encontrar cada um deles em uma pasta diferente e,
portanto, temos que definir `LDFLAGS` e `CFLAGS`.

```nix
{
  lib,
  buildPythonPackage,
  fetchPypi,

  # build dependencies
  setuptools,

  # dependencies
  fftw,
  fftwFloat,
  fftwLongDouble,
  numpy,
  scipy,
}:

buildPythonPackage (finalAttrs: {
  pname = "pyfftw";
  version = "0.9.2";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;
    hash = "sha256-9ru2r6kwhUCaskiFoaPNuJCfCVoUL01J40byvRt4kHQ=";
  };

  build-system = [ setuptools ];

  buildInputs = [
    fftw
    fftwFloat
    fftwLongDouble
  ];

  dependencies = [
    numpy
    scipy
  ];

  preConfigure = ''
    export LDFLAGS="-L${fftw.dev}/lib -L${fftwFloat.out}/lib -L${fftwLongDouble.out}/lib"
    export CFLAGS="-I${fftw.dev}/include -I${fftwFloat.dev}/include -I${fftwLongDouble.dev}/include"
  '';

  # Tests cannot import pyfftw. pyfftw works fine though.
  doCheck = false;

  pythonImportsCheck = [ "pyfftw" ];

  meta = {
    changelog = "https://github.com/pyFFTW/pyFFTW/releases/tag/v${finalAttrs.version}";
    description = "Pythonic wrapper around FFTW, the FFT library, presenting a unified interface for all the supported transforms";
    homepage = "http://hgomersall.github.com/pyFFTW";
    license = with lib.licenses; [
      bsd2
      bsd3
    ];
  };
})
```

Observe também a linha [`doCheck = false;`](#var-stdenv-doCheck), desabilitamos explicitamente a execução do conjunto de testes.

#### Testando Pacotes Python {#testing-python-packages}

É altamente recomendado ter testes como parte da construção do pacote. Isso
ajuda a evitar situações em que o pacote foi capaz de construir e instalar,
mas não é utilizável em tempo de execução.
Seu pacote deve fornecer sua própria [`checkPhase`](#ssec-check-phase).

::: {.note}
A [`checkPhase`](#ssec-check-phase) para python mapeia para a `installCheckPhase` em uma
derivação normal. Isso ocorre porque muitos pacotes python não se comportam bem
com a versão pré-instalada do pacote. Informações de versão e extensões
compiladas nativamente geralmente existem apenas no diretório de instalação, e
assim podem causar problemas quando um conjunto de testes afirma esse comportamento.
:::

::: {.note}
Os testes só devem ser desabilitados se não estiverem de acordo com o nix
(por exemplo, dependências externas, acesso à rede, testes instáveis), no entanto,
o maior número possível de testes deve ser habilitado. Testes falhos ainda podem ser
uma boa indicação de que o pacote não está em um estado válido.
:::

::: {.note}
Queremos apenas testar a funcionalidade de um pacote. Em particular, não estamos
interessados em cobertura, formatação e verificação de tipo. Se o pytest falhar com
`unrecognized arguments: --cov`, adicione `pytest-cov-stub` a `nativeCheckInputs`
em vez de `pytest-cov`.
:::

#### Usando pytest {#using-pytest}

Pytest é o executor de testes mais comum para repositórios Python. Uma execução
trivial de teste seria:

```nix
{
  nativeCheckInputs = [ pytest ];
  checkPhase = ''
    runHook preCheck

    pytest

    runHook postCheck
  '';
}
```

No entanto, os conjuntos de testes de muitos repositórios não se traduzem bem para o sandbox de build do nix,
e geralmente precisarão que muitos testes sejam desabilitados.

Isso é alcançável por
-   Incluindo caminhos ou itens de teste (`path/to/file.py::MyClass` ou `path/to/file.py::MyClass::test_method`) com argumentos posicionais.
-   Excluindo caminhos com `--ignore` ou caminhos globbed com `--ignore-glob`.
-   Excluindo itens de teste usando a flag `--deselect`.
-   Incluindo ou excluindo classes ou métodos de teste por seus nomes usando a flag `-k`.
-   Incluindo ou excluindo testes por suas marcas usando a flag `-m`.

Recomendamos fortemente o `pytestCheckHook` para uma configuração mais fácil e estrutural.

#### Usando pytestCheckHook {#using-pytestcheckhook}

`pytestCheckHook` é um hook conveniente que configurará (ou ajustará)
uma [`checkPhase`](#ssec-check-phase) para executar `pytest`. Isso também é benéfico
quando um pacote pode precisar de muitos itens desabilitados para executar o conjunto de testes.
A maioria dos pacotes usa `pytest` ou `unittest`, que é compatível com `pytest`,
então você provavelmente usará `pytestCheckHook`.

Para usar `pytestCheckHook`, adicione-o a `nativeCheckInputs`.
Adicionar `pytest` não é necessário, pois ele está incluído no `pytestCheckHook`.

```nix
{ nativeCheckInputs = [ pytestCheckHook ]; }
```

`pytestCheckHook` reconhece os seguintes atributos:

`enabledTestPaths` e `disabledTestPaths`

:   Para especificar globs de caminho (arquivos ou diretórios) ou itens de teste.

`enabledTests` e `disabledTests`

:   Para especificar palavras-chave para nomes de classes ou nomes de métodos de teste.

`enabledTestMarks` e `disabledTestMarks`

:   Para especificar marcas de teste.

`pytestFlags`

:   Para anexar argumentos adicionais de linha de comando ao `pytest`.

Por padrão, `pytest` descobre automaticamente quais testes executar.
Se os testes forem explicitamente habilitados, apenas esses testes serão executados.
Um teste que é habilitado e desabilitado não será executado.

O exemplo a seguir demonstra o uso de vários atributos de `pytestCheckHook`:

```nix
{
  nativeCheckInputs = [ pytestCheckHook ];

  # Allow running the following test paths and test objects.
  enabledTestPaths = [
    # Find tests under the tests directory.
    # The trailing slash is not necessary.
    "tests/"

    # Additionally run test_foo
    "other-tests/test_foo.py::Foo::test_foo"
  ];

  # Override the above-enabled test paths and test objects.
  disabledTestPaths = [
    # Tests under tests/integration requires additional data.
    "tests/integration"
  ];

  # Allow tests by keywords matching their class names or method names.
  enabledTests = [
    # pytest by default only runs test methods begin with "test_" or end with "_test".
    # This includes all functions whose name contains "test".
    "test"
  ];

  # Override the above-enabled tests by keywords matching their class names or method names.
  disabledTests = [
    # Tests touching networks.
    "upload"
    "download"
  ];

  # Additional pytest flags
  pytestFlags = [
    # Disable benchmarks and run benchmarking tests only once.
    "--benchmark-disable"
  ];
}
```

Esses atributos são todos passados diretamente para a derivação
e adicionados ao comando `pytest` sem expansão adicional do Bash.
É necessário `__structuredAttrs = true` para passar elementos de lista contendo espaços.

Os atributos `<enabled/disabled>TestsPaths` expandem globs no estilo Unix.
Se um caminho de teste contiver caracteres como `*`, `?`, `[`, ou `]`, você pode
citá-los com colchetes (`[*]`, `[?]`, `[[]`, e `[]]`) para corresponder literalmente.

Os pares de atributos `<enabled/disabled>Tests` e `<enabled/disabled>TestMarks`
formam uma expressão lógica `((included_element1) or (included_element2)) and not (excluded_element1) and not (excluded_element2)`
que será passada para as flags `-k` e `-m` do pytest, respectivamente.
Com `__structuredAttrs = true` habilitado, eles também suportam subexpressões.

Por exemplo, você poderia desabilitar itens de teste como `TestFoo::test_bar_functionality`
desabilitando testes que correspondem a `"Foo"` **e** `"bar"`:

```nix
{
  __structuredAttrs = true;

  disabledTests = [ "Foo and bar" ];
}
```

Os principais benefícios de usar `pytestCheckHook` para construir comandos `pytest`
são a estruturação e a acessibilidade em tempo de avaliação.
Isso é especialmente útil para selecionar testes ou especificar flags condicionalmente:

```nix
{
  disabledTests = [
    # touches network
    "download"
    "update"
  ]
  ++ lib.optionals (pythonAtLeast "3.8") [
    # broken due to python3.8 async changes
    "async"
  ]
  ++ lib.optionals stdenv.buildPlatform.isDarwin [
    # can fail when building with other packages
    "socket"
  ];
}
```

#### Usando pythonImportsCheck {#using-pythonimportscheck}

Embora os testes de unidade sejam altamente preferidos para validar a correção de um pacote, nem
todos os pacotes possuem conjuntos de testes que podem ser executados facilmente, e alguns não possuem nenhum.
Para ajudar a garantir que o pacote ainda funcione, [`pythonImportsCheck`](#using-pythonimportscheck) pode tentar importar
os módulos listados.

```nix
{
  pythonImportsCheck = [
    "requests"
    "urllib"
  ];
}
```

traduz-se aproximadamente para:

```nix
{
  postCheck = ''
    PYTHONPATH=$out/${python.sitePackages}:$PYTHONPATH
    python -c "import requests; import urllib"
  '';
}
```

No entanto, isso é feito em sua própria fase, e não depende se [`doCheck = true;`](#var-stdenv-doCheck).

Isso também pode ser útil para verificar se o pacote não assume pacotes comumente
presentes (por exemplo, `setuptools`).

#### Usando pythonRelaxDepsHook {#using-pythonrelaxdepshook}

É comum que o upstream especifique um intervalo de versões para suas dependências de pacote.
Isso faz sentido, pois garante que o pacote será construído
com um subconjunto de pacotes bem testado. No entanto, isso comumente causa
problemas ao empacotar no Nixpkgs, porque as dependências que este pacote
pode precisar são muito novas ou antigas para o pacote ser construído corretamente. Também não podemos
empacotar múltiplas versões do mesmo pacote, pois isso pode causar conflitos
em `PYTHONPATH`.

Uma maneira de contornar esse problema é flexibilizar as dependências. Isso pode ser feito
removendo o intervalo de versão do pacote ou removendo a declaração do pacote
inteiramente. Isso pode ser feito usando o hook `pythonRelaxDepsHook`. Por
exemplo, dado o seguinte arquivo `requirements.txt`:

```
pkg1<1.0
pkg2
pkg3>=1.0,<=2.0
```

podemos fazer:

```nix
{
  pythonRelaxDeps = [
    "pkg1"
    "pkg3"
  ];
  pythonRemoveDeps = [ "pkg2" ];
}
```

o que resultaria no seguinte arquivo `requirements.txt`:

```
pkg1
pkg3
```

Outra opção é passar `true`, que irá flexibilizar/remover todas as dependências, por
exemplo:

```nix
{ pythonRelaxDeps = true; }
```

o que resultaria no seguinte arquivo `requirements.txt`:

```
pkg1
pkg2
pkg3
```

Em geral, você deve sempre usar `pythonRelaxDeps`, porque `pythonRemoveDeps`
converterá erros de build em erros de tempo de execução. No entanto, `pythonRemoveDeps` pode
ainda ser útil em casos excepcionais, e também para remover dependências declaradas
erroneamente pelo upstream (por exemplo, declarar `black` como uma dependência de tempo de execução
em vez de uma dependência de desenvolvimento).

Tenha em mente que, embora os exemplos acima sejam feitos com `requirements.txt`,
`pythonRelaxDepsHook` funciona modificando o arquivo wheel resultante, então deve
funcionar com qualquer um dos [hooks existentes](#setup-hooks).

O `pythonRelaxDepsHook` não tem efeito sobre as dependências de tempo de construção, como
aquelas especificadas em `build-system`. Se um pacote requer dependências de tempo de construção
incompatíveis, elas devem ser removidas em `postPatch` através de
`substituteInPlace` ou similar.

Para facilitar o uso, tanto `buildPythonPackage` quanto `buildPythonApplication`
adicionarão automaticamente `pythonRelaxDepsHook` se `pythonRelaxDeps` ou
`pythonRemoveDeps` for especificado.

#### Usando unittestCheckHook {#using-unittestcheckhook}

`unittestCheckHook` é um hook que configurará (ou ajustará) uma [`checkPhase`](#ssec-check-phase) para executar `python -m unittest discover`:

```nix
{
  nativeCheckInputs = [ unittestCheckHook ];

  unittestFlags = [
    "-s"
    "tests"
    "-v"
  ];
}
```

`pytest` é compatível com `unittest`, então na maioria dos casos você pode usar `pytestCheckHook` em vez disso.

#### Usando sphinxHook {#using-sphinxhook}

O `sphinxHook` é uma ferramenta útil para construir documentação e páginas de manual
usando o popular gerador de documentação Sphinx.
Ele é configurado para encontrar automaticamente caminhos comuns de origem de documentação e
renderizá-los usando o estilo `html` padrão.

```nix
{
  outputs = [
    "out"
    "doc"
  ];

  nativeBuildInputs = [ sphinxHook ];
}
```

O hook construirá e instalará automaticamente o artefato na
saída `doc`, se ela existir. Ele também fornece um desvio automático
para os artefatos do construtor `man` para o destino `man`.

```nix
{
  outputs = [
    "out"
    "doc"
    "man"
  ];

  # Use multiple builders
  sphinxBuilders = [
    "singlehtml"
    "man"
  ];
}
```

Sobrescreva `sphinxRoot` quando o hook não conseguir encontrar a raiz da sua
fonte de documentação.

```nix
{
  # Configure sphinxRoot for uncommon paths
  sphinxRoot = "weird/docs/path";
}
```

O hook também está disponível para pacotes fora do ecossistema Python,
referenciando-o usando `sphinxHook` do nível superior.

### Organizando seus pacotes {#organising-your-packages}

Até agora, discutimos como você pode usar Python no Nix e como pode desenvolver com
ele. Vimos como você escreve expressões para empacotar pacotes Python, e
vimos como você pode criar ambientes nos quais pacotes especificados estão
disponíveis.

Em algum momento, você provavelmente terá vários pacotes que gostaria
de usar em diferentes projetos. Para minimizar a duplicação desnecessária,
agora veremos como você pode manter um repositório com seus
próprios pacotes. As funções importantes aqui são `import` e `callPackage`.

### Incluindo uma derivação usando `callPackage` {#including-a-derivation-using-callpackage}

Anteriormente, criamos um ambiente Python usando [`withPackages`](#python.withpackages-function) e incluímos o
pacote `toolz` por meio de uma expressão `let`.
Vamos separar a definição do pacote da definição do ambiente.

Primeiro, criamos uma função que constrói `toolz` em `~/path/to/toolz/release.nix`

```nix
{
  lib,
  buildPythonPackage,
  fetchPypi,
  setuptools,
}:

buildPythonPackage (finalAttrs: {
  pname = "toolz";
  version = "0.10.0";
  pyproject = true;

  src = fetchPypi {
    inherit (finalAttrs) pname version;
    hash = "sha256-CP3V73yWSArRHBLUct4hrNMjWZlvaaUlkpm1QP66RWA=";
  };

  build-system = [ setuptools ];

  meta = {
    changelog = "https://github.com/pytoolz/toolz/releases/tag/${version}";
    homepage = "https://github.com/pytoolz/toolz/";
    description = "List processing tools and functional utilities";
    license = lib.licenses.bsd3;
  };
})
```

Ele recebe um argumento [`buildPythonPackage`](#buildPythonPackage-function). Agora chamamos esta função usando
`callPackage` na definição do nosso ambiente

```nix
with import <nixpkgs> { };

(
  let
    toolz = callPackage /path/to/toolz/release.nix {
      buildPythonPackage = python3Packages.buildPythonPackage;
    };
  in
  python3.withPackages (ps: [
    ps.numpy
    toolz
  ])
).env
```

É importante lembrar que a versão do Python para a qual o pacote é feito
depende da derivação `python` que é passada para [`buildPythonPackage`](#buildPythonPackage-function). O Nix
tenta passar argumentos automaticamente quando possível, razão pela qual geralmente você
não define explicitamente qual derivação `python` deve ser usada. No exemplo
acima, usamos [`buildPythonPackage`](#buildPythonPackage-function) que faz parte do conjunto `python3Packages`,
e neste caso o interpretador `python3` é usado automaticamente.
## Perguntas Frequentes {#faq}

### Como resolver dependências circulares? {#how-to-solve-circular-dependencies}

Considere os pacotes `A` e `B` que dependem um do outro. Ao empacotar `B`, uma solução é sobrescrever o pacote `A` para que ele não dependa de `B` como entrada. O mesmo deve ser feito ao empacotar `A`.

### Como sobrescrever um pacote Python? {#how-to-override-a-python-package}

Podemos sobrescrever o interpretador e passar `packageOverrides`. No exemplo a seguir, renomeamos o pacote `pandas` e o construímos.

```nix
with import <nixpkgs> { };

(
  let
    python =
      let
        packageOverrides = self: super: {
          pandas = super.pandas.overridePythonAttrs (old: {
            name = "foo";
          });
        };
      in
      pkgs.python313.override { inherit packageOverrides; };

  in
  python.withPackages (ps: [ ps.pandas ])
).env
```

Usar `nix-build` nesta expressão construirá um ambiente que contém o pacote `pandas`, mas com o novo nome `foo`.

Todos os pacotes no conjunto de pacotes usarão o pacote renomeado. Um caso de uso típico é mudar para outra versão de um determinado pacote. Por exemplo, no repositório Nixpkgs, temos várias versões de `django` e `scipy`. No exemplo a seguir, usamos uma versão diferente de `scipy` e criamos um ambiente que a utiliza. Todos os pacotes no conjunto de pacotes Python agora usarão a versão atualizada de `scipy`.

```nix
with import <nixpkgs> { };

(
  let
    packageOverrides = self: super: { scipy = super.scipy_0_17; };
  in
  (pkgs.python313.override { inherit packageOverrides; }).withPackages (ps: [ ps.blaze ])
).env
```

O pacote `blaze` solicitado depende de `pandas`, que por sua vez depende de `scipy`.

Se você quiser que todo o Nixpkgs use suas modificações, então você pode usar `overlays` conforme explicado neste manual. No exemplo a seguir, construímos um `inkscape` usando uma versão diferente de `numpy`.

```nix
let
  pkgs = import <nixpkgs> { };
  newpkgs = import pkgs.path {
    overlays = [
      (self: super: {
        python313 =
          let
            packageOverrides = python-self: python-super: {
              numpy = python-super.numpy_1_18;
            };
          in
          super.python313.override { inherit packageOverrides; };
      })
    ];
  };
in
newpkgs.inkscape
```

### `python setup.py bdist_wheel` não consegue criar .whl {#python-setup.py-bdist_wheel-cannot-create-.whl}

A execução de `python setup.py bdist_wheel` em um `nix-shell` falha com

```
ValueError: ZIP does not support timestamps before 1980
```

Isso ocorre porque arquivos do Nix store (que possuem um timestamp da época UNIX de 1º de janeiro de 1970) são incluídos no .ZIP, mas os arquivos .ZIP seguem a convenção DOS de contar timestamps a partir de 1980.

O comando `bdist_wheel` lê a variável de ambiente `SOURCE_DATE_EPOCH`, que `nix-shell` define como 1. Desdefinir esta variável ou atribuir a ela um valor correspondente a 1980 ou posterior permite a construção de wheels.

Use 1980 como timestamp:

```shell
nix-shell --run "SOURCE_DATE_EPOCH=315532800 python3 setup.py bdist_wheel"
```

ou a hora atual:

```shell
nix-shell --run "SOURCE_DATE_EPOCH=$(date +%s) python3 setup.py bdist_wheel"
```

ou desdefina `SOURCE_DATE_EPOCH`:

```shell
nix-shell --run "unset SOURCE_DATE_EPOCH; python3 setup.py bdist_wheel"
```

### Problemas com `install_data` / `data_files` {#install_data-data_files-problems}

Se você receber o seguinte erro:

```
could not create '/nix/store/6l1bvljpy8gazlsw2aw9skwwp4pmvyxw-python-2.7.8/etc':
Permission denied
```

Este é um [bug conhecido](https://github.com/pypa/setuptools/issues/130) no `setuptools`. O `install_data` do Setuptools não respeita `--prefix`. Um exemplo de tal pacote usando o recurso é `pkgs/tools/X11/xpra/default.nix`.

Como solução alternativa, instale-o como uma etapa `preInstall` extra:

```shell
${python.pythonOnBuildForHost.interpreter} setup.py install_data --install-dir=$out --root=$out
sed -i '/ = data\_files/d' setup.py
```

### Razão para a inexistência de site-packages globais {#rationale-of-non-existent-global-site-packages}

Na maioria dos sistemas operacionais, um `site-packages` global é mantido. No entanto, isso se torna problemático se você quiser executar várias versões do Python ou ter várias versões de certas bibliotecas para seus projetos. Geralmente, você resolveria esses problemas criando ambientes virtuais usando `virtualenv`.

No Nix, cada pacote possui uma árvore de dependências isolada que, no caso do Python, garante que as versões corretas do interpretador e das bibliotecas ou pacotes estejam disponíveis. Portanto, não há necessidade de manter um `site-packages` global.

Se você deseja criar um ambiente Python para desenvolvimento, o método recomendado é usar `nix-shell`, com ou sem a função [`python.buildEnv`](#python.buildenv-function).

### Como consumir módulos Python usando pip em um ambiente virtual como estou acostumado em outros Sistemas Operacionais? {#how-to-consume-python-modules-using-pip-in-a-virtual-environment-like-i-am-used-to-on-other-operating-systems}

Embora esta abordagem não seja muito idiomática da perspectiva do Nix, ela ainda pode ser útil ao lidar com projetos pré-existentes ou em situações onde não é viável ou desejável escrever derivações para todas as dependências necessárias.

Este é um exemplo de um `default.nix` para um `nix-shell`, que permite consumir um ambiente virtual criado por `venv`, e instalar módulos Python através de `pip` da maneira tradicional.

Crie este arquivo `default.nix`, juntamente com um `requirements.txt` e execute `nix-shell`.

```nix
with import <nixpkgs> { };

let
  pythonPackages = python3Packages;
in
pkgs.mkShell rec {
  name = "impurePythonEnv";
  venvDir = "./.venv";
  buildInputs = [
    # A Python interpreter including the 'venv' module is required to bootstrap
    # the environment.
    pythonPackages.python

    # This executes some shell code to initialize a venv in $venvDir before
    # dropping into the shell
    pythonPackages.venvShellHook

    # Those are dependencies that we would like to use from nixpkgs, which will
    # add them to PYTHONPATH and thus make them accessible from within the venv.
    pythonPackages.numpy
    pythonPackages.requests

    # In this particular example, in order to compile any binary extensions they may
    # require, the Python modules listed in the hypothetical requirements.txt need
    # the following packages to be installed locally:
    taglib
    openssl
    git
    libxml2
    libxslt
    libzip
    zlib
  ];

  # Run this command, only after creating the virtual environment
  postVenvCreation = ''
    unset SOURCE_DATE_EPOCH
    pip install -r requirements.txt
  '';

  # Now we can execute any commands within the virtual environment.
  # This is optional and can be left out to run pip manually.
  postShellHook = ''
    # allow pip to install wheels
    unset SOURCE_DATE_EPOCH
  '';

}
```

Caso o `venvShellHook` fornecido seja insuficiente, ou quando o suporte ao Python 2 for necessário, você pode definir seu próprio shell hook e adaptá-lo às suas necessidades, como no exemplo a seguir:

```nix
with import <nixpkgs> { };

let
  venvDir = "./.venv";
  pythonPackages = python3Packages;
in
pkgs.mkShell rec {
  name = "impurePythonEnv";
  buildInputs = [
    pythonPackages.python
    # Needed when using python 2.7
    # pythonPackages.virtualenv
    # ...
  ];

  # This is very close to how venvShellHook is implemented, but
  # adapted to use 'virtualenv'
  shellHook = ''
    SOURCE_DATE_EPOCH=$(date +%s)

    if [ -d "${venvDir}" ]; then
      echo "Skipping venv creation, '${venvDir}' already exists"
    else
      echo "Creating new venv environment in path: '${venvDir}'"
      # Note that the module venv was only introduced in python 3, so for 2.7
      # this needs to be replaced with a call to virtualenv
      ${pythonPackages.python.interpreter} -m venv "${venvDir}"
    fi

    # Under some circumstances it might be necessary to add your virtual
    # environment to PYTHONPATH, which you can do here too;
    # PYTHONPATH=$PWD/${venvDir}/${pythonPackages.python.sitePackages}/:$PYTHONPATH

    source "${venvDir}/bin/activate"

    # As in the previous example, this is optional.
    pip install -r requirements.txt
  '';
}
```

Note que o `pip install` é uma ação imperativa. Assim, toda vez que `nix-shell` é executado, ele tentará baixar os módulos Python listados em `requirements.txt`. No entanto, estes serão armazenados em cache localmente dentro da pasta `virtualenv` e não serão baixados novamente.

### Como sobrescrever um pacote Python a partir de `configuration.nix`? {#how-to-override-a-python-package-from-configuration.nix}

Se você precisar alterar o(s) atributo(s) de um pacote a partir de `configuration.nix`, você pode fazer:

```nix
{
  nixpkgs.config.packageOverrides = super: {
    python3 = super.python3.override {
      packageOverrides = python-self: python-super: {
        twisted = python-super.twisted.overridePythonAttrs (oldAttrs: {
          src = super.fetchPypi {
            pname = "Twisted";
            version = "19.10.0";
            hash = "sha256-c5S6fycq5yKnTz2Wnc9Zm8TvCTvDkgOHSKSQ8XJKUV0=";
            extension = "tar.bz2";
          };
        });
      };
    };
  };
}
```

`python3Packages.twisted` agora está globalmente sobrescrito. Todos os pacotes e também todos os serviços NixOS que referenciam `twisted` (como `services.buildbot-worker`) agora usam a nova definição. Note que `python-super` se refere ao conjunto de pacotes antigo e `python-self` à nova versão sobrescrita.

Para modificar apenas um conjunto de pacotes Python em vez de uma derivação Python inteira, use este trecho:

```nix
{
  myPythonPackages = python3Packages.override { overrides = self: super: { twisted = <...>; }; };
}
```

### Como sobrescrever um pacote Python usando overlays? {#how-to-override-a-python-package-using-overlays}

Use o seguinte template de overlay:

```nix
self: super: {
  python = super.python.override {
    packageOverrides = python-self: python-super: {
      twisted = python-super.twisted.overrideAttrs (oldAttrs: {
        src = super.fetchPypi {
          pname = "Twisted";
          version = "19.10.0";
          hash = "sha256-c5S6fycq5yKnTz2Wnc9Zm8TvCTvDkgOHSKSQ8XJKUV0=";
          extension = "tar.bz2";
        };
      });
    };
  };
}
```

### Como sobrescrever um pacote Python para todas as versões Python usando extensões? {#how-to-override-a-python-package-for-all-python-versions-using-extensions}

O overlay a seguir sobrescreve a chamada para [`buildPythonPackage`](#buildpythonpackage-function) para o pacote `foo` para todos os interpretadores, anexando uma extensão Python à lista `pythonPackagesExtensions` de extensões.

```nix
final: prev: {
  pythonPackagesExtensions = prev.pythonPackagesExtensions ++ [
    (python-final: python-prev: {
      foo = python-prev.foo.overridePythonAttrs (oldAttrs: {
        # ...
      });
    })
  ];
}
```

### Como usar o MKL da Intel com numpy e scipy? {#how-to-use-intels-mkl-with-numpy-and-scipy}

O MKL pode ser configurado usando um overlay. Veja a seção "[Usando overlays para configurar alternativas](#sec-overlays-alternatives-blas-lapack)".

### A quais entradas `setup_requires`, `install_requires` e `tests_require` se mapeiam? {#what-inputs-do-setup_requires-install_requires-and-tests_require-map-to}

Em um `setup.py` ou `setup.cfg`, é comum declarar dependências:

*   `setup_requires` corresponde a `build-system`
*   `install_requires` corresponde a `dependencies`
*   `tests_require` corresponde a [`nativeCheckInputs`](#var-stdenv-nativeCheckInputs)

### Como habilitar otimizações do interpretador? {#optimizations}

Os interpretadores Python não são construídos com otimizações habilitadas por padrão, porque as construções, nesse caso, não são reproduzíveis. Para habilitar otimizações, sobrescreva o interpretador de interesse, por exemplo, usando

```nix
let
  pkgs = import ./. { };
  mypython = pkgs.python3.override {
    enableOptimizations = true;
    reproducibleBuild = false;
    self = mypython;
  };
in
mypython
```

### Como adicionar dependências opcionais? {#python-optional-dependencies}

Alguns pacotes definem dependências opcionais para recursos adicionais. Com `setuptools`, isso é chamado de `extras_require` e `flit` o chama de `extras-require`, enquanto a PEP 621 os chama de `optional-dependencies`.

```nix
{
  optional-dependencies = {
    complete = [ distributed ];
  };
}
```

e permitindo que o pacote que requer o extra adicione a lista às suas dependências

```nix
{
  dependencies = [
    # ...
  ]
  ++ dask.optional-dependencies.complete;
}
```

Este método usa `passthru`, o que significa que alterar `optional-dependencies` de um pacote não fará com que ele seja reconstruído.

Note que este método é preferível a adicionar parâmetros aos builders, pois isso pode resultar em pacotes dependendo de variantes diferentes e, consequentemente, causando colisões.

::: {.note}
O atributo `optional-dependencies` deve ser usado apenas para grupos de dependências
conforme definido nos metadados do pacote. Se um pacote lida graciosamente com dependências ausentes
em tempo de execução, mas não as anuncia através dos metadados do pacote, então
essas dependências não devem ser listadas. (Pode ser necessário listá-las
em `nativeCheckInputs` para passar na suíte de testes.)
:::

### Como contribuir com um pacote Python para nixpkgs? {#tools}

Pacotes dentro do nixpkgs devem usar a função [`buildPythonPackage`](#buildpythonpackage-function) ou [`buildPythonApplication`](#buildpythonapplication-function) diretamente, porque só podemos fornecer suporte de segurança para dependências não empacotadas (non-vendored).

Recomendamos [nix-init](https://github.com/nix-community/nix-init) para criar novos pacotes Python dentro do nixpkgs, pois ele já pré-busca a fonte, analisa as dependências para formatos comuns e preenche a maioria das informações em `meta`. Ao usar a ferramenta, puxe do repositório de origem original em vez do PyPI, se possível.

Veja também a [seção de contribuição](#contributing).

### Os interpretadores Python são construídos deterministicamente? {#deterministic-builds}

Os interpretadores Python agora são construídos deterministicamente. Pequenas modificações tiveram que ser feitas nos interpretadores para gerar bytecode determinístico. Isso tem implicações de segurança e é relevante para aqueles que usam Python em um `nix-shell`.

Quando a variável de ambiente `DETERMINISTIC_BUILD` é definida, todo o bytecode terá o timestamp 1. A função [`buildPythonPackage`](#buildpythonpackage-function) define `DETERMINISTIC_BUILD=1` e [PYTHONHASHSEED=0](https://docs.python.org/3.13/using/cmdline.html#envvar-PYTHONHASHSEED). Ambos também são exportados em `nix-shell`.

### Como fornecer testes automáticos para pacotes Python? {#automatic-tests}

É recomendado testar pacotes como parte do processo de construção. Distribuições de código-fonte (`sdist`) frequentemente incluem arquivos de teste, mas nem sempre.

A melhor prática hoje é passar um hook de teste (por exemplo, pytestCheckHook, unittestCheckHook) para `nativeCheckInputs`. Isso reconfigurará o `checkPhase` para usar essa estrutura de teste específica. Ocasionalmente, os pacotes não utilizam uma estrutura de teste comum, o que pode então exigir um `checkPhase` personalizado.

#### Problemas comuns {#common-issues}

*   Testes que tentam acessar `$HOME` podem ser corrigidos usando `writableTmpDirAsHomeHook` em `nativeCheckInputs`, que configura um diretório temporário gravável como o diretório home. Alternativamente, você pode obter o mesmo efeito manualmente (por exemplo, em `preCheck`) com: `export HOME=$(mktemp -d)`.
*   A compilação com Cython faz com que os testes falhem com um `ModuleNotLoadedError`. Isso pode ser corrigido com duas alterações na derivação: 1) substituindo `pytest` por `pytestCheckHook` e 2) adicionando um `preCheck` contendo `cd $out` para executar os testes dentro da saída construída.
## Contribuindo {#contributing}

### Diretrizes de contribuição {#contributing-guidelines}

As seguintes regras devem ser respeitadas:

*   Bibliotecas Python são chamadas de `python-packages.nix` e empacotadas com
    [`buildPythonPackage`](#buildpythonpackage-function). A expressão de uma biblioteca deve estar em
    `pkgs/development/python-modules/<name>/default.nix`.
*   Aplicações Python ficam fora de `python-packages.nix` e são empacotadas
    com [`buildPythonApplication`](#buildpythonapplication-function).
*   Certifique-se de que as bibliotecas sejam construídas para todos os interpretadores Python.
    Se falhar ao construir em algumas versões do Python, considere desabilitá-las definindo `disable = pythonAtLeast "3.x"` junto com um comentário.
*   Os dois parâmetros, `pyproject` e `build-system` são definidos para evitar a construção legada de setuptools/distutils.
*   Apenas atributos sem versão (por exemplo, `pydantic`, mas não `pypdantic_1`) podem ser incluídos em `dependencies`,
    pois devido às limitações do `PYTHONPATH` só podemos suportar uma única versão para bibliotecas
    sem encontrar conflitos de nomes de módulos duplicados.
*   As restrições de versão de `dependencies` podem ser flexibilizadas por [`pythonRelaxDepsHook`](#using-pythonrelaxdepshook).
*   Certifique-se de que os testes estejam habilitados usando, por exemplo, [`pytestCheckHook`](#using-pytestcheckhook) e, no caso de
    bibliotecas, estejam passando para todos os interpretadores. Se certos testes falharem, eles podem ser
    desabilitados individualmente. Tente evitar desabilitar os testes completamente. Em qualquer
    caso, ao desabilitar testes, deixe um comentário explicando não apenas _qual_ é a falha, mas _por que_ a falha do teste pode ser ignorada para uma distribuição segura com nixpkgs.
*   `pythonImportsCheck` está definido. Este ainda é um bom teste de fumaça mesmo que `pytestCheckHook` esteja definido.
*   `meta.platforms` assume o valor padrão em muitos casos.
    Não precisa ser definido explicitamente, a menos que o pacote exija uma plataforma específica.
*   O arquivo está formatado corretamente (por exemplo, `nix-shell --run treefmt`).
*   Os nomes dos commits de bibliotecas Python devem refletir que são bibliotecas Python (por exemplo, `python3Packages.numpy: 1.11 -> 1.12` em vez de `numpy: 1.11 -> 1.12`).
    Veja também [`pkgs/README.md`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/README.md#commit-conventions).
*   Nomes de atributos em `python-packages.nix` assim como `pname`s devem corresponder ao
    nome da biblioteca no PyPI, mas ser normalizados de acordo com [PEP
    0503](https://www.python.org/dev/peps/pep-0503/#normalized-names). Isso significa
    que os caracteres devem ser convertidos para minúsculas e `.` e `_` devem ser
    substituídos por um único `-` (foo-bar-baz em vez de Foo__Bar.baz).
    Se necessário, `pname` deve receber um valor diferente dentro de `fetchPypi`.
*   Geralmente é preferível buscar `src` diretamente do repositório e não do
    PyPI. Use `fetchPypi` quando houver uma razão técnica clara para fazê-lo.
*   Pacotes de fontes como GitHub e GitLab que não existem no PyPI
    não devem usar um nome que já é usado no PyPI. Quando possível, eles devem
    usar o nome do repositório do pacote prefixado com o nome do proprietário (por exemplo, organização)
    e usando um `-` como delimitador.
*   Nomes de atributos em `python-packages.nix` devem ser classificados alfanumericamente para
    evitar conflitos de mesclagem e facilitar a localização de atributos.
*   Dependências de tempo de execução não-Python devem ser adicionadas via empacotamento explícito ou
    aplicação de patches (usando, por exemplo, `substituteInPlace`), em vez de por propagação via
    `dependencies`/`propagatedBuildInputs`, para reduzir a desordem em `$PATH`.

Esta lista é útil para revisores, bem como para autoavaliação ao submeter pacotes.

## Manutenção do conjunto de pacotes {#python-package-set-maintenance}

Todo o conjunto de pacotes Python possui muitos pacotes que não recebem atualizações regulares, porque são um componente muito frágil no ecossistema Python, como por exemplo o pacote `hypothesis`, ou pacotes que não têm mantenedor, então a manutenção recai sobre os mantenedores do conjunto de pacotes.

### Atualizando pacotes em massa {#python-package-bulk-updates}

Uma ferramenta para atualização em massa de várias bibliotecas Python está disponível no
repositório em `maintainers/scripts/update-python-libraries`.

Ele pode atualizar rapidamente versões menores ou maiores para todos os pacotes selecionados
e criar commits de atualização, e suporta os fetchers `fetchPypi`, `fetchurl` e
`fetchFromGitHub`. Ao atualizar muitos pacotes que estão
hospedados no GitHub, exportar um `GITHUB_API_TOKEN` é altamente recomendado.

A atualização de pacotes em massa leva a muitas quebras, razão pela qual um
período de estabilização na branch `python-updates` é necessário.

Se um pacote é frágil e frequentemente quebra durante essas atualizações em massa, pode ser razoável definir `passthru.skipBulkUpdate = true` na
derivação. Esta decisão não deve ser tomada por capricho e deve
ser sempre apoiada por um comentário justificativo.

Uma vez que a branch esteja suficientemente estável, ela deve ser normalmente mesclada
na branch `staging`.

Uma chamada exemplar para atualizar todas as bibliotecas Python entre versões menores
seria:

```ShellSession
$ maintainers/scripts/update-python-libraries --target minor --commit --use-pkgs-prefix pkgs/development/python-modules/**/default.nix
```

## Cronograma de Atualização do CPython {#python-cpython-update-schedule}

Com [PEP 602](https://www.python.org/dev/peps/pep-0602/), o CPython agora
segue uma cadência de lançamento anual. No nixpkgs, todos os interpretadores suportados
são disponibilizados, mas apenas os dois conjuntos de pacotes de interpretadores
mais recentes são construídos; este é um compromisso entre ser
o interpretador mais recente e o que a maioria dos pacotes Python suporta.

Novos interpretadores CPython são lançados em outubro. Geralmente, leva algum
tempo para a maioria dos projetos Python ativos suportar o interpretador estável
mais recente. Para ajudar a facilitar a migração para usuários do Nixpkgs
entre interpretadores Python, o cronograma abaixo será usado:

| Quando | Evento |
| --- | --- |
| Após o lançamento YY.11 | Aumentar a janela do conjunto de pacotes CPython. O mais recente e o anterior mais recente estável devem agora ser construídos. |
| Após o lançamento YY.05 | Atualizar o interpretador CPython padrão para o estável mais recente. |

Na prática, isso significa que a comunidade Python terá tido um interpretador
estável por ~2 meses antes de tentar atualizar o conjunto de pacotes. E isso
permitirá ~7 meses para que as aplicações Python suportem o interpretador mais recente.