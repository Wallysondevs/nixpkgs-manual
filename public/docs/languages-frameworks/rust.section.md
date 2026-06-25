# Rust {#rust}

Para instalar o compilador Rust e o cargo, coloque

```nix
{
  environment.systemPackages = [
    rustc
    cargo
  ];
}
```

no seu `configuration.nix` ou traga-os para o escopo com `nix-shell -p rustc cargo`.

Para outras versões, como builds diárias (beta e nightly),
use `rustup` do Nixpkgs (que gerenciará a instalação do Rust em seu diretório home),
ou use [toolchains Rust mantidos pela comunidade](#using-community-maintained-rust-toolchains).

## `buildRustPackage`: Compilando aplicações Rust com Cargo {#compiling-rust-applications-with-cargo}

Aplicações Rust são empacotadas usando o auxiliar `buildRustPackage` do `rustPlatform`:

```nix
{
  lib,
  fetchFromGitHub,
  rustPlatform,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "ripgrep";
  version = "14.1.1";

  src = fetchFromGitHub {
    owner = "BurntSushi";
    repo = "ripgrep";
    tag = finalAttrs.version;
    hash = "sha256-gyWnahj1A+iXUQlQ1O1H1u7K5euYQOld9qWm99Vjaeg=";
  };

  cargoHash = "sha256-9atn5qyBDy4P6iUoHFhg+TV6Ur71fiah4oTJbBMeEy4=";

  meta = {
    description = "Fast line-oriented regex search tool, similar to ag and ack";
    homepage = "https://github.com/BurntSushi/ripgrep";
    license = lib.licenses.unlicense;
    maintainers = [ ];
  };
})
```

`buildRustPackage` requer um atributo `cargoHash`, computado sobre todas as fontes de crate deste pacote.

::: {.warning}
`cargoSha256` já está obsoleto e será removido em favor de
`cargoHash`, que suporta hashes [SRI](https://www.w3.org/TR/SRI/).

Se você ainda estiver usando `cargoSha256`, pode simplesmente substituí-lo por
`cargoHash` e recalcular o hash, ou converter o sha256 original para hash SRI
usando `nix-hash --to-sri --type sha256 "<original sha256>"`.
:::

```nix
{ cargoHash = "sha256-l1vL2ZdtDRxSGvP0X/l3nMw8+6WF67KPutJEzUROjg8="; }
```

Se este método não funcionar, você pode recorrer a copiar o arquivo `Cargo.lock` para o Nixpkgs
e importá-lo conforme descrito na [próxima seção](#importing-a-cargo.lock-file).

Ambos os tipos de hashes são permitidos ao contribuir para o Nixpkgs. O
hash do Cargo é obtido inserindo um checksum falso na
expressão e construindo o pacote uma vez. O checksum correto pode
então ser obtido da construção falha. Um hash falso pode ser usado para
`cargoHash` da seguinte forma:

```nix
{ cargoHash = lib.fakeHash; }
```

De acordo com as instruções no guia de melhores práticas do [Cargo Book](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html),
aplicações Rust devem sempre commitar o arquivo `Cargo.lock`
no git para garantir uma construção reproduzível. No entanto, alguns pacotes não o fazem, e
o Nix depende deste arquivo, então se ele estiver faltando, você pode usar `cargoPatches` para
aplicá-lo na `patchPhase`. Considere enviar um PR upstream com uma nota ao
mantenedor descrevendo por que é importante incluí-lo na aplicação.

O fetcher verificará se o arquivo `Cargo.lock` está sincronizado com o atributo `src`,
e falhará a construção caso contrário. Ele também compactará o
diretório de vendor em um arquivo tar.gz.

O tarball com dependências vendored contém um diretório com o
`name` do pacote, que normalmente é composto por `pname` e
`version`. Isso significa que o hash das dependências vendored
(`cargoHash`) depende do nome e da
versão do pacote. O atributo `cargoDepsName` pode ser usado para usar outro nome
para o diretório de dependências vendored. Por exemplo, o hash pode
ser tornado invariante à versão definindo `cargoDepsName` para
`pname`:

```nix
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "broot";
  version = "1.2.0";

  src = fetchCrate {
    inherit (finalAttrs) pname version;
    hash = "sha256-aDQA4A5mScX9or3Lyiv/5GyAehidnpKKE0grhbP1Ctc=";
  };

  cargoHash = "sha256-iDYh52rj1M5Uupvbx2WeDd/jvQZ+2A50V5rp5e2t7q4=";
  cargoDepsName = finalAttrs.pname;

  # ...
})
```

### Importando um arquivo `Cargo.lock` {#importing-a-cargo.lock-file}

Usar um hash vendored (`cargoHash`) é tedioso ao usar
`buildRustPackage` dentro de um projeto, pois requer que o hash
seja atualizado após cada alteração no `Cargo.lock`. Portanto,
`buildRustPackage` também suporta o vendoring de dependências diretamente de
um arquivo `Cargo.lock` usando o argumento `cargoLock`. Por exemplo:

```nix
rustPlatform.buildRustPackage {
  pname = "myproject";
  version = "1.0.0";

  cargoLock = {
    lockFile = ./Cargo.lock;
  };

  # ...
}
```

Isso recuperará as dependências usando derivações de saída fixa do
lockfile especificado.

Uma ressalva é que o `Cargo.lock` não pode ser corrigido na `patchPhase`
porque ela é executada depois que as dependências já foram buscadas. Se
você precisar corrigir ou gerar o lockfile, pode alternativamente definir
`cargoLock.lockFileContents` para uma string de seu conteúdo:

```nix
rustPlatform.buildRustPackage {
  pname = "myproject";
  version = "1.0.0";

  cargoLock =
    let
      fixupLockFile = path: f (builtins.readFile path);
    in
    {
      lockFileContents = fixupLockFile ./Cargo.lock;
    };

  # ...
}
```

Se o repositório de origem upstream não possui um arquivo `Cargo.lock`, você deve adicionar um
ao `src`, pois é essencial para construir um pacote Rust. Definir
`cargoLock.lockFile` ou `cargoLock.lockFileContents` não adicionará automaticamente
um arquivo `Cargo.lock` ao `src`. Uma solução direta é usar:

```nix
{
  postPatch = ''
    ln -s ${./Cargo.lock} Cargo.lock
  '';
}
```

O hash de saída de cada dependência que usa uma fonte git deve ser
especificado no atributo `outputHashes`. Por exemplo:

```nix
rustPlatform.buildRustPackage {
  pname = "myproject";
  version = "1.0.0";

  cargoLock = {
    lockFile = ./Cargo.lock;
    outputHashes = {
      "finalfusion-0.14.0" = "17f4bsdzpcshwh74w5z119xjy2if6l2wgyjy56v621skr2r8y904";
    };
  };

  # ...
}
```

Se você não especificar um hash de saída para uma dependência git, a construção
do pacote falhará e informará qual crate precisa ser
adicionado. Para encontrar o hash correto, você pode primeiro usar `lib.fakeSha256` ou
`lib.fakeHash` como um hash provisório. A construção do pacote (e, portanto, das
dependências vendored) então informará o hash correto.

Para uso fora do nixpkgs, `allowBuiltinFetchGit` pode ser usado para
evitar ter que especificar `outputHashes`. Por exemplo:

```nix
rustPlatform.buildRustPackage {
  pname = "myproject";
  version = "1.0.0";

  cargoLock = {
    lockFile = ./Cargo.lock;
    allowBuiltinFetchGit = true;
  };

  # ...
}
```

### Funcionalidades do Cargo {#cargo-features}

Você pode desabilitar funcionalidades padrão usando `buildNoDefaultFeatures`, e
funcionalidades extras podem ser adicionadas com `buildFeatures`.

Se você quiser usar funcionalidades diferentes para a fase de verificação (`check phase`), pode usar
`checkNoDefaultFeatures` e `checkFeatures`. Elas são passadas apenas para
`cargo test` e não para `cargo build`. Se não forem definidas, elas padronizam para
`buildNoDefaultFeatures` e `buildFeatures`.

Por exemplo:

```nix
rustPlatform.buildRustPackage {
  pname = "myproject";
  version = "1.0.0";

  buildNoDefaultFeatures = true;
  buildFeatures = [
    "color"
    "net"
  ];

  # disable network features in tests
  checkFeatures = [ "color" ];

  # ...
}
```

### Compilação cruzada {#cross-compilation}

Por padrão, pacotes Rust são compilados para a plataforma host, assim como qualquer
outro pacote. O `--target` passado para as ferramentas Rust é computado a partir disso.
Por padrão, ele pega `stdenv.hostPlatform.config` e substitui componentes
onde se sabe que diferem. Mas há maneiras de personalizar o argumento:

 - Para escolher um alvo diferente pelo nome, defina
   `stdenv.hostPlatform.rust.rustcTargetSpec` como esse nome (uma string), e esse
   nome será usado em vez disso.

   Por exemplo:

   ```nix
   import <nixpkgs> {
     crossSystem = (import <nixpkgs/lib>).systems.examples.armhf-embedded // {
       rust.rustcTargetSpec = "thumbv7em-none-eabi";
     };
   }
   ```

   resultará em:

   ```shell
   --target thumbv7em-none-eabi
   ```

 - Para passar um alvo completamente personalizado, defina
   `stdenv.hostPlatform.rust.rustcTargetSpec` com o caminho para o arquivo JSON de
   especificação de alvo personalizado.

   Note que algumas ferramentas como Cargo e alguns crates como `cc` fazem uso do
   nome do arquivo JSON do alvo. Portanto, não use
   `./path/to/target-spec.json` diretamente, porque ele será renomeado pelo Nix.
   Em vez disso, coloque-o em um diretório e use `"${./path/to/dir}/target-spec.json"`.
   O diretório deve conter apenas este arquivo, para evitar que mudanças não relacionadas
   causem reconstruções desnecessárias.

   Por exemplo:

   ```nix
   import <nixpkgs> {
     crossSystem = {
       config = "mips64el-unknown-linux-gnuabi64";
       # gcc = ...; # Config for C compiler omitted
       rust.rustcTargetSpec = "${./rust}/mips64el_mips3-unknown-linux-gnuabi64.json";
     };
   }
   ```

   resultará em:

   ```shell
   --target /nix/store/...-rust/mips64el_mips3-unknown-linux-gnuabi64.json
   ```

### Executando testes de pacote {#running-package-tests}

Ao usar `buildRustPackage`, a `checkPhase` é habilitada por padrão e executa
`cargo test` no pacote a ser construído. Para garantir que não compilamos as
fontes duas vezes e para realmente testar os artefatos que serão usados em tempo de execução,
os testes serão executados no modo `release` por padrão.

No entanto, em alguns casos, a suíte de testes de um pacote não funciona corretamente no
modo `release`. Para essas situações, o modo para `checkPhase` pode ser alterado assim:

```nix
rustPlatform.buildRustPackage {
  # ...
  checkType = "debug";
}
```

Por favor, note que o código será compilado duas vezes aqui: uma vez no modo `release`
para a `buildPhase`, e novamente no modo `debug` para a `checkPhase`.

Flags de teste, por exemplo, `--package foo`, podem ser passadas para `cargo test` via o
atributo `cargoTestFlags`.

Outro atributo, chamado `checkFlags`, é usado para passar argumentos para o
próprio binário de teste, conforme declarado
[aqui](https://doc.rust-lang.org/cargo/commands/cargo-test.html).

#### Testes que dependem da estrutura do diretório `target/` {#tests-relying-on-the-structure-of-the-target-directory}

Alguns testes podem depender da estrutura do diretório `target/`. Esses testes
provavelmente falharão porque usamos `cargo --target` durante a construção. Isso significa que
os artefatos
[são armazenados em `target/<architecture>/release/`](https://doc.rust-lang.org/cargo/guide/build-cache.html),
em vez de em `target/release/`.

Isso só pode ser contornado aplicando patches nos testes afetados de acordo.

#### Desabilitando testes de pacote {#disabling-package-tests}

Em alguns casos, pode ser necessário desabilitar completamente os testes (com `doCheck = false;`):

*   Se não existirem testes — a `checkPhase` deve ser explicitamente desabilitada para pular
    etapas de construção desnecessárias e acelerar a construção.
*   Se os testes forem altamente impuros (por exemplo, devido ao uso de rede).

Obviamente, haverá alguns casos de canto não listados acima onde é sensato desabilitar os testes.
Os itens acima são apenas diretrizes, e exceções podem ser concedidas caso a caso.

No entanto, por favor, verifique se é possível desabilitar um subconjunto problemático da
suíte de testes e deixe um comentário explicando seu raciocínio.

Isso pode ser alcançado com `--skip` em `checkFlags`:

```nix
rustPlatform.buildRustPackage {
  # ...
  checkFlags = [
    # reason for disabling test
    "--skip=example::tests:example_test"
  ];
}
```

#### Usando `cargo-nextest` {#using-cargo-nextest}

Os testes podem ser executados com [cargo-nextest](https://github.com/nextest-rs/nextest)
definindo `useNextest = true`. As mesmas opções ainda se aplicam, mas o nextest
aceita um conjunto diferente de argumentos e as configurações podem precisar ser
adaptadas para serem compatíveis com `cargo-nextest`.

```nix
rustPlatform.buildRustPackage {
  # ...
  useNextest = true;
}
```

#### Configurando `test-threads` {#setting-test-threads}

`buildRustPackage` usará threads de teste paralelos por padrão,
às vezes pode ser necessário desabilitar isso para que os testes sejam executados consecutivamente.

```nix
rustPlatform.buildRustPackage {
  # ...
  dontUseCargoParallelTests = true;
}
```

### Construindo um pacote no modo `debug` {#building-a-package-in-debug-mode}

Por padrão, `buildRustPackage` usará o modo `release` para as construções. Se um pacote
deve ser construído no modo `debug`, ele pode ser configurado assim:

```nix
rustPlatform.buildRustPackage {
  # ...
  buildType = "debug";
}
```

Neste cenário, a `checkPhase` também será executada no modo `debug`.

### Procedimentos `build`/`install` personalizados {#custom-buildinstall-procedures}

Alguns pacotes podem usar scripts personalizados para construção/instalação, por exemplo, com um `Makefile`.
Nesses casos, é recomendado sobrescrever a `buildPhase`/`installPhase`/`checkPhase`.

Caso contrário, algumas etapas podem falhar devido à estrutura de diretório modificada de `target/`.

### Construindo um crate com um arquivo Cargo.lock ausente ou desatualizado {#building-a-crate-with-an-absent-or-out-of-date-cargo.lock-file}

`buildRustPackage` precisa de um arquivo `Cargo.lock` para obter todas as dependências no
código-fonte de forma reproduzível. Se ele estiver faltando ou desatualizado, pode-se usar
o atributo `cargoPatches` para atualizá-lo ou adicioná-lo.

```nix
rustPlatform.buildRustPackage {
  # ...
  cargoPatches = [
    # a patch file to add/update Cargo.lock in the source code
    ./add-Cargo.lock.patch
  ];
}
```

### Compilando pacotes não-Rust que incluem código Rust {#compiling-non-rust-packages-that-include-rust-code}

Vários pacotes não-Rust incorporam código Rust para partes sensíveis a desempenho ou
segurança. `rustPlatform` expõe várias funções e
hooks que podem ser usados para integrar o Cargo em pacotes não-Rust.

#### Vendoring de dependências {#vendoring-of-dependencies}

Como o acesso à rede não é permitido em construções em sandbox, as dependências de crate Rust
precisam ser recuperadas usando um fetcher. `rustPlatform`
fornece o fetcher `fetchCargoVendor`, que faz vendor de todas as
dependências de um crate. Por exemplo, dado um caminho de origem `src`
contendo `Cargo.toml` e `Cargo.lock`, `fetchCargoVendor`
pode ser usado da seguinte forma:

```nix
{
  cargoDeps = rustPlatform.fetchCargoVendor {
    inherit src;
    hash = "sha256-BoHIN/519Top1NUBjpB/oEMqi86Omt3zTQcXFWqrek0=";
  };
}
```

O atributo `src` é obrigatório, assim como um hash especificado através
de um dos atributos `hash`. Os seguintes atributos opcionais também podem
ser usados:

*   `name`: o nome que é usado para o tarball de dependências. Se
    `name` não for especificado, então o nome `cargo-deps` será usado.
*   `sourceRoot`: quando os arquivos `Cargo.lock`/`Cargo.toml` estão em um
    subdiretório, `sourceRoot` especifica o caminho relativo para esses
    arquivos.
*   `patches`: patches para aplicar antes do vendoring. Isso é útil quando
    os arquivos `Cargo.lock`/`Cargo.toml` precisam ser corrigidos antes
    do vendoring.

Se um arquivo `Cargo.lock` estiver disponível, você pode alternativamente usar a
função `importCargoLock`. Em contraste com `fetchCargoVendor`, esta
função não requer um hash (a menos que dependências git sejam usadas)
e busca cada dependência como uma derivação de saída fixa separada.
`importCargoLock` pode ser usado da seguinte forma:

```nix
{ cargoDeps = rustPlatform.importCargoLock { lockFile = ./Cargo.lock; }; }
```

Se o arquivo `Cargo.lock` incluir dependências git, então seus hashes de
saída precisam ser especificados, pois não estão disponíveis através do
arquivo lock. Por exemplo:

```nix
{
  cargoDeps = rustPlatform.importCargoLock {
    lockFile = ./Cargo.lock;
    outputHashes = {
      "rand-0.8.3" = "0ya2hia3cn31qa8894s3av2s8j5bjwb6yq92k0jsnlx7jid0jwqa";
    };
  };
}
```

Se você não especificar um hash de saída para uma dependência git, a construção
de `cargoDeps` falhará e informará qual crate precisa ser
adicionado. Para encontrar o hash correto, você pode primeiro usar `lib.fakeSha256` ou
`lib.fakeHash` como um hash provisório. A construção de `cargoDeps` então informará
o hash correto.

#### Hooks {#hooks}

`rustPlatform` fornece os seguintes hooks para automatizar construções Cargo:

*   `cargoSetupHook`: configura o Cargo para usar dependências vendored
    através de `fetchCargoVendor` ou `importCargoLock`. Este hook usa a
    variável de ambiente `cargoDeps` para encontrar as dependências vendored.
    Se um projeto já faz vendor de suas dependências, a
    variável `cargoVendorDir` pode ser usada em vez disso. Quando os
    arquivos `Cargo.toml`/`Cargo.lock` não estão em `sourceRoot`, então o
    `cargoRoot` opcional é usado para especificar o diretório raiz do Cargo
    relativo a `sourceRoot`.
*   `cargoBuildHook`: usa o Cargo para construir um crate. Se o crate a ser
    construído for um crate em, por exemplo, um workspace Cargo, o caminho relativo para o
    crate a ser construído pode ser definido através da variável de ambiente opcional
    `buildAndTestSubdir`. Funcionalidades podem ser especificadas com
    `cargoBuildNoDefaultFeatures` e `cargoBuildFeatures`. Flags de construção
    Cargo adicionais podem ser passadas através de `cargoBuildFlags`.
*   `maturinBuildHook`: usa [Maturin](https://github.com/PyO3/maturin)
    para construir um wheel Python. Similar a `cargoBuildHook`, a variável
    opcional `buildAndTestSubdir` pode ser usada para construir um crate em um
    workspace Cargo. Flags adicionais do Maturin podem ser passadas através de
    `maturinBuildFlags`.
*   `cargoCheckHook`: executa testes usando Cargo. O tipo de construção para verificações
    pode ser definido usando `cargoCheckType`. Funcionalidades podem ser especificadas com
    `cargoCheckNoDefaultFeatures` e `cargoCheckFeatures`. Flags adicionais
    podem ser passadas para os testes usando `checkFlags` e
    `checkFlagsArray`. Por padrão, os testes são executados em paralelo. Isso pode
    ser desabilitado definindo `dontUseCargoParallelTests`.
*   `cargoNextestHook`: executa testes usando
    [cargo-nextest](https://github.com/nextest-rs/nextest). As mesmas
    opções para `cargoCheckHook` também se aplicam a `cargoNextestHook`.
*   `cargoInstallHook`: instala binários e bibliotecas estáticas/compartilhadas
    que foram construídas usando `cargoBuildHook`.
*   `bindgenHook`: para crates que usam `bindgen` como dependência de construção, permite
    que `bindgen` encontre `libclang` e `libclang` encontre as bibliotecas em `buildInputs`.

#### Exemplos {#examples}

#### Pacote Python usando `setuptools-rust` {#python-package-using-setuptools-rust}

Para pacotes Python usando `setuptools-rust`, você pode usar
`fetchCargoVendor` e `cargoSetupHook` para recuperar e configurar as dependências do Cargo.
A construção em si é então realizada por
`buildPythonPackage`.

O exemplo a seguir descreve como o pacote Python `tokenizers` é
construído. Como o pacote Python está no diretório `source/bindings/python`
do arquivo de origem do projeto `tokenizers`, usamos
`sourceRoot` para apontar as ferramentas para este diretório:

```nix
{
  fetchFromGitHub,
  buildPythonPackage,
  cargo,
  rustPlatform,
  rustc,
  setuptools-rust,
}:

buildPythonPackage rec {
  pname = "tokenizers";
  version = "0.10.0";

  src = fetchFromGitHub {
    owner = "huggingface";
    repo = "tokenizers";
    tag = "python-v${version}";
    hash = "sha256-rQ2hRV52naEf6PvRsWVCTN7B1oXAQGmnpJw4iIdhamw=";
  };

  cargoDeps = rustPlatform.fetchCargoVendor {
    inherit
      pname
      version
      src
      sourceRoot
      ;
    hash = "sha256-RO1m8wEd5Ic2M9q+zFHeCJWhCr4Sv3CEWd08mkxsBec=";
  };

  sourceRoot = "${src.name}/bindings/python";

  nativeBuildInputs = [
    cargo
    rustPlatform.cargoSetupHook
    rustc
    setuptools-rust
  ];

  # ...
}
```

Em alguns projetos, o crate Rust não está no diretório principal de origem Python.
Nesses casos, o atributo `cargoRoot` pode ser usado para
especificar o diretório do crate relativo a `sourceRoot`. No
exemplo a seguir, o crate está em `src/rust`, conforme especificado no
atributo `cargoRoot`. Note que também precisamos passar `cargoRoot`
para `fetchCargoVendor`.

```nix
{
  buildPythonPackage,
  fetchPypi,
  rustPlatform,
  setuptools-rust,
  openssl,
}:

buildPythonPackage rec {
  pname = "cryptography";
  version = "3.4.2"; # Also update the hash in vectors.nix

  src = fetchPypi {
    inherit pname version;
    hash = "sha256-xGDilsjLOnls3MfVbGKnj80KCUCczZxlis5PmHzpNcQ=";
  };

  cargoDeps = rustPlatform.fetchCargoVendor {
    inherit
      pname
      version
      src
      cargoRoot
      ;
    hash = "sha256-ctUt8maCjnGddKPf+Ii++wKsAXA1h+JM6zKQNXXwJqQ=";
  };

  cargoRoot = "src/rust";

  # ...
}
```

#### Pacote Python usando `maturin` {#python-package-using-maturin}

Pacotes Python que usam [Maturin](https://github.com/PyO3/maturin)
podem ser construídos com `fetchCargoVendor`, `cargoSetupHook` e
`maturinBuildHook`. Por exemplo, a seguinte derivação (parcial)
constrói o pacote Python `retworkx`. `fetchCargoVendor` e
`cargoSetupHook` são usados para buscar e configurar as dependências do crate.
`maturinBuildHook` é usado para realizar a construção.

```nix
{
  lib,
  buildPythonPackage,
  rustPlatform,
  fetchFromGitHub,
}:

buildPythonPackage rec {
  pname = "retworkx";
  version = "0.6.0";
  pyproject = true;

  src = fetchFromGitHub {
    owner = "Qiskit";
    repo = "retworkx";
    tag = version;
    hash = "sha256-11n30ldg3y3y6qxg3hbj837pnbwjkqw3nxq6frds647mmmprrd20=";
  };

  cargoDeps = rustPlatform.fetchCargoVendor {
    inherit pname version src;
    hash = "sha256-QsPCQhNZKYCAogQriQX6pBYQUDAIUsEdRX/63dAqTzg=";
  };

  nativeBuildInputs = with rustPlatform; [
    cargoSetupHook
    maturinBuildHook
  ];

  # ...
}
```

#### Pacote Rust construído com `meson` {#rust-package-built-with-meson}

Alguns projetos, especialmente aplicações GNOME, são construídos com o Sistema de Construção Meson em vez de chamar o Cargo diretamente. Usar `rustPlatform.buildRustPackage` pode construir com sucesso o programa principal, mas arquivos relacionados estarão faltando. Em vez disso, você precisa configurar as dependências do Cargo com `fetchCargoVendor` e `cargoSetupHook` e deixar o resto para o Meson. `rust` e `cargo` ainda são necessários em `nativeBuildInputs` para o Meson usar.

```nix
{
  lib,
  stdenv,
  fetchFromGitLab,
  meson,
  ninja,
  pkg-config,
  rustPlatform,
  rustc,
  cargo,
  wrapGAppsHook4,
  blueprint-compiler,
  libadwaita,
  libsecret,
  tinysparql,
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "health";
  version = "0.95.0";

  src = fetchFromGitLab {
    domain = "gitlab.gnome.org";
    owner = "World";
    repo = "health";
    tag = finalAttrs.version;
    hash = "sha256-PrNPprSS98yN8b8yw2G6hzTSaoE65VbsM3q7FVB4mds=";
  };

  cargoDeps = rustPlatform.fetchCargoVendor {
    inherit (finalAttrs) pname version src;
    hash = "sha256-eR1ZGtTZQNhofFUEjI7IX16sMKPJmAl7aIFfPJukecg=";
  };

  nativeBuildInputs = [
    meson
    ninja
    pkg-config
    rustPlatform.cargoSetupHook
    rustc
    cargo
    wrapGAppsHook4
    blueprint-compiler
  ];

  buildInputs = [
    libadwaita
    libsecret
    tinysparql
  ];

  # ...
})
```

### Compilando pacote `wasm32-wasip1` {#compiling-wasm32-wasip1-package}

```nix
pkgsCross.wasi32.callPackage (
  {
    fetchFromGitHub,
    rustPlatform,
    lld,
  }:
  rustPlatform.buildRustPackage (finalAttrs: {
    pname = "zellij-harpoon";
    version = "0.3.0";

    src = fetchFromGitHub {
      owner = "Nacho114";
      repo = "harpoon";
      tag = "v${finalAttrs.version}";
      hash = "sha256-JmYcbzxIF6qZs2/RKuspHqNpyDibGp9CVQJj47y/BOQ=";
    };

    cargoHash = "sha256-lsv5Wssakni18jif++fPo3Z5WyBtvPsGpWwG3abR7jQ=";

    # these two lines are currently required
    env.RUSTFLAGS = "-C linker=wasm-ld";
    nativeBuildInputs = [ lld ];
  })
) { }
```

## `buildRustCrate`: Compilando crates Rust usando Nix em vez de Cargo {#compiling-rust-crates-using-nix-instead-of-cargo}

### Operação simples {#simple-operation}

Quando executado, `cargo build` produz um arquivo chamado `Cargo.lock`,
contendo versões fixadas de todas as dependências. O Nixpkgs contém uma
ferramenta chamada `crate2Nix` (`nix-shell -p crate2nix`), que pode ser
usada para transformar um `Cargo.lock` em uma expressão Nix. Essa expressão
Nix chama `rustc` diretamente (ignorando assim o Cargo), e pode
ser usada para compilar um crate e todas as suas dependências.

Consulte a [documentação do `crate2nix`](https://github.com/kolloch/crate2nix#known-restrictions)
para obter instruções sobre como usá-lo.

### Lidando com dependências externas {#handling-external-dependencies}

Alguns crates requerem bibliotecas externas. Para crates do
[crates.io](https://crates.io), tais bibliotecas podem ser especificadas no
pacote `defaultCrateOverrides` no próprio nixpkgs.

A partir desse arquivo, pode-se adicionar mais sobrescrições, para adicionar funcionalidades
ou entradas de construção, sobrescrevendo o crate hello em um arquivo separado.

```nix
with import <nixpkgs> { };
((import ./hello.nix).hello { }).override {
  crateOverrides = defaultCrateOverrides // {
    hello = attrs: { buildInputs = [ openssl ]; };
  };
}
```

Aqui, `crateOverrides` é esperado ser um conjunto de atributos, onde a
chave é o nome do crate sem número de versão e o valor uma função.
A função recebe todos os atributos passados para `buildRustCrate` como primeiro
argumento e retorna um conjunto que contém todos os atributos que devem ser
sobrescritos.

Para casos mais complicados, como quando partes da derivação do crate
dependem da versão do crate, o argumento `attrs` da
sobrescrição acima pode ser lido, como no exemplo a seguir, que
aplica patches à derivação:

```nix
with import <nixpkgs> { };
((import ./hello.nix).hello { }).override {
  crateOverrides = defaultCrateOverrides // {
    hello =
      attrs:
      lib.optionalAttrs (lib.versionAtLeast attrs.version "1.0") {
        postPatch = ''
          substituteInPlace lib/zoneinfo.rs \
            --replace-fail "/usr/share/zoneinfo" "${tzdata}/share/zoneinfo"
        '';
      };
  };
}
```

Outra situação é quando queremos sobrescrever uma dependência
aninhada. Isso funciona exatamente da mesma maneira, já que o
parâmetro `crateOverrides` é encaminhado para as dependências do
crate. Por exemplo, para sobrescrever as entradas de construção para o
crate `libc` no exemplo acima, onde `libc` é uma dependência do
crate principal, poderíamos fazer:

```nix
with import <nixpkgs> { };
((import hello.nix).hello { }).override {
  crateOverrides = defaultCrateOverrides // {
    libc = attrs: { buildInputs = [ ]; };
  };
}
```

### Configuração de opções e fases {#options-and-phases-configuration}

Na verdade, as sobrescrições introduzidas na seção anterior são mais
gerais. Vários outros parâmetros podem ser sobrescritos:

- A versão de `rustc` usada para compilar o crate:

  ```nix
  (hello { }).override { rust = pkgs.rust; }
  ```

- Se deve construir no modo release ou debug (modo release por
  padrão):

  ```nix
  (hello { }).override { release = false; }
  ```

- Se deve imprimir os comandos enviados a `rustc` durante a construção
  (equivalente a `--verbose` no cargo):

  ```nix
  (hello { }).override { verbose = false; }
  ```

- Argumentos extras a serem passados para `rustc`:

  ```nix
  (hello { }).override { extraRustcOpts = "-Z debuginfo=2"; }
  ```

- Argumentos extras passados para `rustc` quando o crate é um proc-macro,
  substituindo `extraRustcOpts`. Útil para manter flags de instrumentação
  (sanitizers, coverage) fora de dylibs do host. Padroniza para `null`, que
  herda `extraRustcOpts`:

  ```nix
  (myProcMacro { }).override { extraRustcOptsForProcMacro = [ ]; }
  ```

- O limite de nível de lint passado para `rustc`. Padroniza para `null`, que
  resolve automaticamente para `"allow"` (silencia todos os lints) quando `lints` está
  vazio, ou `"forbid"` (sem limite) quando `lints` está definido. Como `rustc`
  só honra o primeiro `--cap-lints` que recebe, isso não pode ser
  alterado via `extraRustcOpts`; use este atributo em vez disso. Útil
  ao sobrescrever o atributo `rust` para apontar para `clippy-driver`,
  já que os lints do clippy também são limitados por esta flag:

  ```nix
  (hello { }).override { capLints = "warn"; }
  ```

- Configuração de lint espelhando a tabela `[lints]` do Cargo.toml. As chaves são
  nomes de ferramentas (`rust`, `clippy`, `rustdoc`); os valores mapeiam nomes de lint para
  uma string de nível (`"allow"`, `"warn"`, `"deny"`, `"forbid"`) ou
  `{ level = "..."; priority = <int>; }`. Prioridades mais baixas são emitidas
  primeiro para que lints mais específicos possam sobrescrevê-los. Definir um
  `lints` não vazio eleva o `capLints` padrão para `"forbid"` para que os
  lints realmente se apliquem:

  ```nix
  (hello { }).override {
    lints.rust = {
      unsafe_code = "forbid";
      unused = {
        level = "deny";
        priority = -1;
      };
    };
  }
  ```

- Fases, assim como em qualquer outra derivação, podem ser especificadas usando
  os seguintes atributos: `preUnpack`, `postUnpack`, `prePatch`,
  `patches`, `postPatch`, `preConfigure` (no caso de um crate Rust,
  isso é executado antes de chamar o script "build"), `postConfigure`
  (depois do script "build"), `preBuild`, `postBuild`, `preInstall` e
  `postInstall`. Como exemplo, aqui está como criar um novo módulo
  antes de executar o script de construção:

  ```nix
  (hello { }).override {
    preConfigure = ''
      echo "pub const PATH=\"${hi.out}\";" >> src/path.rs"
    '';
  }
  ```

### Configurando `nix-shell` {#setting-up-nix-shell}

Muitas vezes você quer desenvolver código de dentro de `nix-shell`. Infelizmente
`buildRustCrate` não suporta operações comuns de `nix-shell` diretamente
(veja [este problema](https://github.com/NixOS/nixpkgs/issues/37945))
então usaremos `stdenv.mkDerivation` em vez disso.

Usando o projeto `hello` de exemplo acima, queremos fazer o seguinte:

- Ter acesso a `cargo` e `rustc`
- Ter a biblioteca `openssl` disponível para um crate através de seu mecanismo de
  compilação _normal_ (`pkg-config`).

Um `shell.nix` típico pode parecer:

```nix
with import <nixpkgs> { };

stdenv.mkDerivation {
  name = "rust-env";
  nativeBuildInputs = [
    rustc
    cargo

    # Example Build-time Additional Dependencies
    pkg-config
  ];
  buildInputs = [
    # Example Run-time Additional Dependencies
    openssl
  ];

  # Set Environment Variables
  RUST_BACKTRACE = 1;
}
```

Agora você deve ser capaz de executar o seguinte:

```ShellSession
$ nix-shell --pure
$ cargo build
$ cargo test
```

## Usando toolchains Rust mantidos pela comunidade {#using-community-maintained-rust-toolchains}

::: {.note}
Os projetos a seguir não podem ser usados dentro do Nixpkgs, já que [Import From Derivation](https://nixos.org/manual/nix/unstable/language/import-from-derivation) (IFD) não é permitido no Nixpkgs.
Para empacotar coisas que requerem Rust nightly, `RUSTC_BOOTSTRAP = true;` pode às vezes ser usado como um hack.
:::

Existem duas abordagens mantidas pela comunidade para o gerenciamento de toolchains Rust:
- [overlay Rust de oxalica](https://github.com/oxalica/rust-overlay)
- [fenix](https://github.com/nix-community/fenix)

Apesar de seus nomes, ambos os projetos fornecem um conjunto similar de pacotes e overlays sob diferentes APIs.

O overlay de Oxalica permite selecionar uma versão específica do Rust sem que você forneça um hash ou uma entrada flake,
mas vem com um repositório git maior que o fenix.

O Fenix também fornece `rust-analyzer` nightly além dos toolchains Rust.

Tanto o overlay de oxalica quanto o fenix se integram melhor com nix e otimizações de cache.
Por causa disso e da ergonomia, qualquer um desses projetos da comunidade
deve ser preferido ao overlay Rust da Mozilla ([nixpkgs-mozilla](https://github.com/mozilla/nixpkgs-mozilla)).

A seguinte documentação demonstra exemplos usando fenix e o overlay Rust de oxalica
com `nix-shell` e construindo derivações. Usos mais avançados, como o uso de flakes,
estão documentados em seus próprios repositórios.

### Usando Rust nightly com `nix-shell` {#using-rust-nightly-with-nix-shell}

Aqui está um `shell.nix` simples que fornece Rust nightly (perfil padrão) usando fenix:

```nix
with import <nixpkgs> { };
let
  fenix = callPackage (fetchFromGitHub {
    owner = "nix-community";
    repo = "fenix";
    # commit from: 2023-03-03
    rev = "e2ea04982b892263c4d939f1cc3bf60a9c4deaa1";
    hash = "sha256-AsOim1A8KKtMWIxG+lXh5Q4P2bhOZjoUhFWJ1EuZNNk=";
  }) { };
in
mkShell {
  name = "rust-env";
  nativeBuildInputs = [
    # Note: to use stable, just replace `default` with `stable`
    fenix.default.toolchain

    # Example Build-time Additional Dependencies
    pkg-config
  ];
  buildInputs = [
    # Example Run-time Additional Dependencies
    openssl
  ];

  # Set Environment Variables
  RUST_BACKTRACE = 1;
}
```

Salve isso em `shell.nix`, então execute:

```ShellSession
$ rustc --version
rustc 1.69.0-nightly (13471d3b2 2023-03-02)
```

Para ver que você está usando nightly.

O overlay Rust de Oxalica tem exemplos mais completos de `shell.nix` (e compilação cruzada) em seu
[diretório `examples`](https://github.com/oxalica/rust-overlay/tree/e53e8853aa7b0688bc270e9e6a681d22e01cf299/examples).

### Usando Rust nightly em uma derivação com `buildRustPackage` {#using-rust-nightly-in-a-derivation-with-buildrustpackage}

Você também pode usar Rust nightly para construir pacotes Rust usando `makeRustPlatform`.
O trecho abaixo demonstra a invocação de `buildRustPackage` com um toolchain Rust do overlay de oxalica:

```nix
with import <nixpkgs> {
  overlays = [
    (import (fetchTarball "https://github.com/oxalica/rust-overlay/archive/master.tar.gz"))
  ];
};
let
  rustPlatform = makeRustPlatform {
    cargo = rust-bin.selectLatestNightlyWith (toolchain: toolchain.default);
    rustc = rust-bin.selectLatestNightlyWith (toolchain: toolchain.default);
  };

in
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "ripgrep";
  version = "14.1.1";

  src = fetchFromGitHub {
    owner = "BurntSushi";
    repo = "ripgrep";
    tag = finalAttrs.version;
    hash = "sha256-gyWnahj1A+iXUQlQ1O1H1u7K5euYQOld9qWm99Vjaeg=";
  };

  cargoHash = "sha256-9atn5qyBDy4P6iUoHFhg+TV6Ur71fiah4oTJbBMeEy4=";

  # Tests require network access. Skipping.
  doCheck = false;

  meta = {
    description = "Fast line-oriented regex search tool, similar to ag and ack";
    homepage = "https://github.com/BurntSushi/ripgrep";
    license = with lib.licenses; [
      mit
      unlicense
    ];
    maintainers = with lib.maintainers; [ ];
  };
})
```

Siga os passos abaixo para experimentar esse trecho.
1. salve o trecho acima como `default.nix` nesse diretório
2. entre nesse diretório e execute `nix-build`

O Fenix também tem exemplos com `buildRustPackage`,
[crane](https://github.com/ipetkov/crane),
[naersk](https://github.com/nix-community/naersk),
e compilação cruzada em sua seção [Examples](https://github.com/nix-community/fenix#examples).

## Usando `git bisect` no compilador Rust {#using-git-bisect-on-the-rust-compiler}

Às vezes, uma atualização do compilador Rust (`rustc`) quebrará um
pacote downstream. Nessas situações, ser capaz de usar `git bisect`
no histórico de versões de `rustc` para encontrar o commit ofensivo é bastante
útil. O Nixpkgs facilita isso.

Primeiro, reverta seu nixpkgs para um commit em que seu `rustc` usava
*o mais recente que não apresenta o problema.* Você precisará
fazer isso por causa do versionamento extremamente agressivo do `rustc`.

Em seguida, adicione o seguinte overlay, atualizando a versão do Rust para a
que está no seu nixpkgs revertido, e substituindo `/git/scratch/rust`
pelo caminho onde você clonou o repositório git de `rustc`:

```nix
(
  final: prev: # lib.optionalAttrs prev.stdenv.targetPlatform.isAarch64
  {
    rust_1_72 = lib.updateManyAttrsByPath [
      {
        path = [
          "packages"
          "stable"
        ];
        update =
          old:
          old.overrideScope (
            final: prev: {
              rustc-unwrapped = prev.rustc-unwrapped.overrideAttrs (_: {
                src = lib.cleanSource /git/scratch/rust;
                # do *not* put passthru.isReleaseTarball=true here
              });
            }
          );
      }
    ] prev.rust_1_72;
  })
```

Se o problema que você está solucionando só se manifesta durante a
compilação cruzada, você pode descomentar o `lib.optionalAttrs` no
exemplo acima e substituir `isAarch64` pelo alvo que está
apresentando problemas. Isso acelerará bastante seu bisect, já que
o compilador host não precisará ser reconstruído.

Agora, você pode iniciar um `git bisect` no diretório onde você fez o
checkout do código-fonte de `rustc`. É recomendado selecionar os
commits de ponto final pesquisando para trás a partir de `origin/master`
pelos *commits que adicionaram as notas de lançamento para as versões em
questão.* Se você definir os pontos finais para commits nas branches de
lançamento (ou seja, as tags de lançamento), o git-bisect frequentemente
ficará confuso pelas complexas estruturas de merge-commit que precisará
atravessar.

O loop de comando que você vai querer usar para fazer o bisect se parece com isto:

```bash
git bisect {good,bad}  # depending on result of last build
git submodule update --init
CARGO_NET_OFFLINE=false cargo vendor \
  --sync ./src/tools/cargo/Cargo.toml \
  --sync ./src/tools/rust-analyzer/Cargo.toml \
  --sync ./compiler/rustc_codegen_cranelift/Cargo.toml \
  --sync ./src/bootstrap/Cargo.toml
nix-build $NIXPKGS -A package-broken-by-rust-changes
```

Os comandos `git submodule update --init` e `cargo vendor` acima
requerem acesso à rede, então eles não podem ser executados de dentro da
derivação `rustc`, infelizmente.