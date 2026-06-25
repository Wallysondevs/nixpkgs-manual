# Swift {#swift}

O compilador Swift é fornecido pelo pacote `swift`:

```sh
# Compile and link a simple executable.
nix-shell -p swift --run 'swiftc -' <<< 'print("Hello world!")'
# Run it!
./main
```

O pacote `swift` também fornece o comando `swift`, com algumas ressalvas:

- O Swift Package Manager (SwiftPM) é empacotado separadamente como `swiftpm`. Se você
  precisar de funcionalidades como `swift build`, `swift run`, `swift test`, você deve
  também adicionar o pacote `swiftpm` ao seu closure.
- No Darwin, o comando `swift repl` requer uma instalação do Xcode. Isso ocorre
  porque ele usa o debugserver LLDB do sistema, que possui entitlements especiais.

## Caminhos de busca de módulos {#ssec-swift-module-search-paths}

Assim como outras toolchains no Nixpkgs, os executáveis do compilador Swift são empacotados
para ajudar o Swift a encontrar as dependências da sua aplicação no Nix store. Esses
wrappers escaneiam os `buildInputs` da sua derivation de pacote em busca de diretórios específicos
onde os módulos Swift são colocados por convenção, e automaticamente
adicionam esses diretórios aos caminhos de busca do compilador Swift.

Swift segue convenções diferentes dependendo da plataforma. Os wrappers
procuram pelos seguintes diretórios:

- Em plataformas Darwin: `lib/swift/macosx`
  (Se não estiver visando macOS, substitua `macosx` pelo nome da plataforma Xcode.)
- Em outras plataformas: `lib/swift/linux/x86_64`
  (Onde `linux` e `x86_64` são do `uname -sm` em minúsculas.)
- Para conveniência, o Nixpkgs também adiciona `lib/swift` ao caminho de busca.
  Isso pode economizar um pouco de trabalho ao empacotar módulos Swift, porque muitas builds do Nix
  produzirão saída para apenas um alvo de qualquer maneira.

## Bibliotecas centrais {#ssec-swift-core-libraries}

Além da biblioteca padrão, a toolchain Swift contém algumas
'bibliotecas centrais' adicionais que, em plataformas Apple, são normalmente distribuídas
como parte do OS ou Xcode. Estas são empacotadas separadamente no Nixpkgs e podem
ser encontradas (para uso em `buildInputs`) como:

- `swiftPackages.Dispatch`
- `swiftPackages.Foundation`
- `swiftPackages.XCTest`

## Empacotamento com SwiftPM {#ssec-swift-packaging-with-swiftpm}

O Nixpkgs inclui um pequeno helper `swiftpm2nix` que pode buscar suas
dependências do SwiftPM para você, quando precisar escrever uma expressão Nix para empacotar sua
aplicação.

O primeiro passo é executar o gerador:

```sh
cd /path/to/my/project
# Entra em um shell Nix com as ferramentas necessárias.
nix-shell -p swift swiftpm swiftpm2nix
# Primeiro, certifique-se de que o workspace esteja atualizado.
swift package resolve
# Agora gera o código Nix.
swiftpm2nix
```

Isso produz alguns arquivos em um diretório `nix`, que farão parte da sua expressão Nix.
O próximo passo é escrever essa expressão:

```nix
{
  stdenv,
  swift,
  swiftpm,
  swiftpm2nix,
  fetchFromGitHub,
}:

let
  # Passa os arquivos gerados para o helper.
  generated = swiftpm2nix.helpers ./nix;

in
stdenv.mkDerivation (finalAttrs: {
  pname = "myproject";
  version = "0.0.0";

  src = fetchFromGitHub {
    owner = "nixos";
    repo = "myproject";
    tag = finalAttrs.version;
    hash = "";
  };

  # Incluir SwiftPM como nativeBuildInput fornece um buildPhase para você.
  # Isso por padrão executa uma build de release usando SwiftPM, essencialmente:
  #   swift build -c release
  nativeBuildInputs = [
    swift
    swiftpm
  ];

  # O helper fornece um snippet de configuração que preparará todas as dependências
  # no local correto, onde o SwiftPM as espera.
  configurePhase = ''
    runHook preConfigure

    ${generated.configure}

    runHook postConfigure
  '';

  installPhase = ''
    runHook preInstall

    # Esta é uma função especial que invoca o swiftpm para encontrar a localização
    # dos binários que ele produziu.
    binPath="$(swiftpmBinPath)"
    # Agora execute quaisquer passos de instalação.
    mkdir -p $out/bin
    cp $binPath/myproject $out/bin/

    runHook postInstall
  '';
})
```

### Flags de build personalizadas {#ssec-swiftpm-custom-build-flags}

Se você quiser construir uma configuração diferente de `release`:

```nix
{ swiftpmBuildConfig = "debug"; }
```

Também é possível fornecer flags adicionais para `swift build`:

```nix
{ swiftpmFlags = [ "--disable-dead-strip" ]; }
```

O `buildPhase` padrão já passa `-j` para construção paralela.

Se essas duas opções de personalização forem insuficientes, forneça seu próprio
`buildPhase` que invoca `swift build`.

### Executando testes {#ssec-swiftpm-running-tests}

Incluir `swiftpm` em seus `nativeBuildInputs` também fornece um `checkPhase` padrão,
mas ele deve ser habilitado com:

```nix
{ doCheck = true; }
```

Isso essencialmente executa: `swift test -c release`

### Aplicando patches em dependências {#ssec-swiftpm-patching-dependencies}

Em alguns casos, pode ser necessário aplicar um patch em uma dependência do SwiftPM. As
dependências do SwiftPM estão localizadas em `.build/checkouts`, mas o helper `swiftpm2nix`
as fornece como symlinks para caminhos `/nix/store` somente leitura. Para aplicar patches
nelas, precisamos torná-las graváveis.

Uma função especial `swiftpmMakeMutable` está disponível para substituir o symlink
por uma cópia gravável:

```nix
{
  configurePhase = ''
    runHook preConfigure

    ${generated.configure}

    # Substitui o symlink da dependência por uma cópia gravável.
    swiftpmMakeMutable swift-crypto
    # Agora aplica um patch.
    patch -p1 -d .build/checkouts/swift-crypto -i ${./some-fix.patch}

    runHook postConfigure
  '';
}
```

## Considerações para ferramentas de build personalizadas {#ssec-swift-considerations-for-custom-build-tools}

### Linkando a biblioteca padrão {#ssec-swift-linking-the-standard-library}

O pacote `swift` possui uma saída `lib` separada contendo apenas a biblioteca padrão
do Swift, para evitar que aplicações Swift precisem de uma dependência do compilador Swift
completo em tempo de execução. O link com a toolchain Swift do Nixpkgs
já garante que os binários referenciem corretamente a saída `lib`.

Às vezes, o Swift é usado apenas para compilar parte de uma base de código mista, e a
etapa de linkagem é manual. Ferramentas de build personalizadas frequentemente localizam a biblioteca padrão
relativa ao executável do compilador `swift`, e embora o resultado funcione,
quando esse caminho acaba no binário, ele terá o compilador Swift como uma
dependência não intencional.

Nesse caso, você deve investigar como seu processo de build descobre a
biblioteca padrão e sobrescrever o caminho. O caminho correto será algo
como: `"${swift.swift.lib}/${swift.swiftModuleSubdir}"`