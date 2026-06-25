# Notas da Plataforma {#chap-platform-notes}

## Darwin (macOS) {#sec-darwin}

O `stdenv` do Darwin difere da maioria dos outros no Nixpkgs em algumas maneiras cruciais. Essas diferenças refletem as suposições padrão para a construção de software nessa plataforma. Em muitos casos, você pode ignorar essas diferenças porque o software que você está empacotando já foi escrito com elas em mente. Quando você fizer isso, escreva sua `derivation` normalmente. Você não precisa incluir nenhum caso especial específico do Darwin. A maneira mais fácil de saber se sua `derivation` requer tratamento especial para Darwin é escrevê-la como se não precisasse e ver se funciona. Se funcionar, você terminou; pule o restante.

- O Darwin usa Clang por padrão em vez de GCC. Pacotes que se referem a `$CC` ou `cc` devem funcionar na maioria dos casos. Alguns pacotes podem ter `gcc` ou `g++` codificados. Você geralmente pode corrigir isso definindo `makeFlags = [ "CC=cc" "CXX=C++" ]`. Se isso não funcionar, você terá que corrigir os scripts de construção por conta própria para usar o compilador correto para Darwin.
- O Darwin usa o `libc++` do sistema por padrão para evitar violações de ODR e potenciais problemas de compatibilidade ao misturar `libc++` do LLVM com o `libc++` do sistema. Embora a mistura dos dois geralmente funcionasse, as duas implementações não têm garantia de serem compatíveis com ABI e são consideradas distintas pelo `upstream`. Consulte o guia de solução de problemas abaixo se precisar usar recursos de biblioteca C++ mais recentes do que os suportados pelo `deployment target` padrão.
- O Darwin precisa de um SDK para construir software. O SDK fornece um conjunto padrão de `frameworks` e bibliotecas para construir software, a maioria dos quais são específicos do Darwin. Existem várias versões dos pacotes SDK no Nixpkgs, mas uma é incluída por padrão no `stdenv`. Geralmente, você não precisa alterar ou escolher um SDK diferente. Em caso de dúvida, use o padrão.
- O SDK usado pela sua construção pode ser encontrado usando a variável de ambiente `DEVELOPER_DIR`. Existem também versões desta variável disponíveis durante a `cross-compilation`, dependendo da função do SDK. A variável `SDKROOT` também é definida com o caminho para as bibliotecas e `frameworks` do SDK. `SDKROOT` é sempre uma subpasta de `DEVELOPER_DIR`.
- O Darwin inclui uma ferramenta específica da plataforma chamada `xcrun` para ajudar as construções a localizar os binários de que precisam. Uma versão de `xcrun` faz parte do `stdenv` no Darwin. Se o seu pacote invocar `xcrun` via um caminho absoluto (como `/usr/bin/xcrun`), você precisará corrigir os scripts de construção para usar `xcrun` em vez disso.

Para reiterar: você geralmente não precisa se preocupar com isso. Comece escrevendo sua `derivation` como se tudo já estivesse configurado para você (porque na maioria dos casos já está). Se você encontrar problemas ou falhas, continue lendo abaixo para saber como lidar com os problemas mais comuns que você pode encontrar.

### Solução de Problemas do Darwin {#sec-darwin-troubleshooting}

#### A construção de um pacote ou biblioteca C++ indica que certas APIs estão indisponíveis {#sec-darwin-libcxx-versions}

Embora algumas APIs mais recentes possam estar disponíveis apenas via `headers`, algumas exigem o uso de um `libc++` do sistema com o suporte de API necessário. Quando isso acontece, sua construção falhará porque o `libc++` considera a falha no uso do `deployment target` correto como um erro. Para tornar a API mais recente disponível, aumente o `deployment target` para a versão necessária. Observe que é possível usar `libc++` do LLVM em vez de aumentar o `deployment target`, mas não é recomendado. Fazer isso pode causar problemas quando múltiplas implementações de `libc++` são vinculadas a um binário (por exemplo, de dependências).

##### Usando um `deployment target` mais recente {#sec-darwin-libcxx-deployment-targets}

Veja abaixo como usar um `deployment target` mais recente. Por exemplo, `std::print` depende de recursos que estão disponíveis apenas no macOS 13.3 ou mais recente. Para torná-los disponíveis, defina o `deployment target` para 13.3 usando `darwinMinVersionHook`.

#### Pacote falha ao construir devido à falta de verificações de disponibilidade de API {#sec-darwin-availability-checks}

Isso normalmente é um bug no pacote ou um `deployment target` mal configurado.
* Se estiver usando uma API de uma versão mais recente (por exemplo, do macOS 26.0 enquanto mira o macOS 14.0), ele precisa usar uma verificação de disponibilidade. O código deve ser corrigido para usar [`__builtin_available`](https://clang.llvm.org/docs/LanguageExtensions.html#objective-c-available). Observe que, embora a documentação vinculada seja para Objective-C, ela é aplicável a C e C++ com a exceção de que você usa `__builtin_available` no lugar de `@available`.
* Se o pacote pretende exigir a plataforma mais recente (ou seja, não suporta a execução em versões mais antigas com funcionalidade reduzida), use `darwinMinVersionHook` para definir o `deployment target` para a versão necessária. Veja abaixo como usar um `deployment target` mais recente.
* Se o pacote realmente lida com isso através de algum outro mecanismo (por exemplo, MoltenVK depende da versão MSL da plataforma em execução), o erro pode ser suprimido. Para suprimir o erro, adicione `-Wno-error=unguarded-availability` a `env.NIX_CFLAGS_COMPILE`.

#### Pacote requer um SDK não padrão ou falha ao construir devido à falta de `frameworks` ou símbolos {#sec-darwin-troubleshooting-using-sdks}

Em alguns casos, você pode ter que usar um SDK não padrão. Isso pode acontecer quando um pacote requer APIs que não estão presentes no SDK padrão. Por exemplo, Metal Performance Shaders foram adicionados no macOS 12. Se o SDK padrão for 11.3, um pacote que requer Metal Performance Shaders falhará ao construir devido à falta de `frameworks` e símbolos.

Para usar um SDK não padrão, adicione-o aos `buildInputs` da sua `derivation`. Não é necessário sobrescrever o SDK no `stdenv` nem é necessário sobrescrever o SDK usado pelas suas dependências. Se sua `derivation` precisar de um SDK não padrão no tempo de construção (por exemplo, para um compilador `depsBuildBuild`), consulte a documentação de `cross-compilation` para saber qual entrada você deve usar.

Ao determinar se deve usar um SDK não padrão, considere o seguinte:

- Tente construir sua `derivation` com o SDK padrão. Se funcionar, você terminou.
- Se o pacote especificar uma versão específica, use-a. Veja abaixo como mapear a versão do Xcode para a versão do SDK.
- Se a documentação do pacote indicar que ele suporta recursos opcionais em SDKs mais recentes, considere usar o SDK que habilita esses recursos. Se você não tiver certeza, use o SDK padrão.

Nota: É possível ter múltiplas e diferentes versões de SDK em suas entradas. Quando isso acontece, a que tem a versão mais alta é sempre usada.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  # ...
  buildInputs = [ apple-sdk_14 ];
}
```

#### O que é um “deployment target” (ou versão mínima)? {#sec-darwin-troubleshooting-using-deployment-targets}

O “deployment target” refere-se à versão mínima do macOS que se espera que execute um aplicativo. Na maioria dos casos, o padrão é bom, e você não precisa fazer mais nada. Se você não tiver certeza, não faça nada, e provavelmente estará tudo bem.

Alguns pacotes exigem a definição de um `deployment target` não padrão (ou versão mínima) para obter acesso a certas APIs. Você faz isso usando o `darwinMinVersionHook`, que recebe a versão do `deployment target` como parâmetro. Existem principalmente duas maneiras de determinar o `deployment target`.

- A documentação `upstream` especificará um `deployment target` ou versão mínima. Use-o.
- A construção falhará porque uma API requer uma certa versão. Use-a.
- Em todos os outros casos, você provavelmente não precisa especificar uma versão mínima. O padrão geralmente é bom o suficiente.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3"; # Upstream specifies the minimum supported version as 12.5.
  buildInputs = [ (darwinMinVersionHook "12.5") ];
}
```

Nota: É possível ter múltiplas e diferentes instâncias de `darwinMinVersionHook` em suas entradas. Quando isso acontece, a que tem a versão mais alta é sempre usada.

#### Escolhendo uma versão do SDK {#sec-darwin-troubleshooting-picking-sdk-version}

A seguir, uma lista de versões do Xcode, a versão do SDK no Nixpkgs e o atributo a ser usado para adicioná-lo. Verifique a documentação do seu pacote (suporte à plataforma ou instruções de instalação) para encontrar qual versão do Xcode ou SDK usar. Geralmente, apenas a última versão do SDK para uma versão principal é empacotada.

| Versão do Xcode | Versão do SDK | Atributo Nixpkgs            |
|---------------|-------------|------------------------------|
| 15.0–15.4     | 14.4        | `apple-sdk_14` / `apple-sdk` |
| 16.0          | 15.0        | `apple-sdk_15`               |
| 26.0+         | 26.0+       | `apple-sdk_26`, etc          |

#### Versões Padrão do SDK do Darwin {#sec-darwin-troubleshooting-darwin-defaults}

A versão padrão atual do SDK e do `deployment target` (versão mínima suportada) são indicadas pelos atributos de plataforma específicos do Darwin `darwinSdkVersion` e `darwinMinVersion`. Devido às maneiras como a versão mínima e o SDK podem ser alterados que não são visíveis para o Nix, eles devem ser tratados como limites inferiores. Se você precisar parametrizar sobre uma versão específica, crie uma função que receba a versão como parâmetro em vez de depender desses atributos.

No macOS, o `darwinMinVersion` é 14.0, e o `darwinSdkVersion` é 14.4.

#### `xcrun` não consegue encontrar um binário {#sec-darwin-troubleshooting-xcrun}

`xcrun` pesquisa `PATH` e a `toolchain` do SDK por binários para executar. Se não conseguir encontrar um binário necessário, falhará. Quando isso acontecer, adicione o pacote para esse binário aos `nativeBuildInputs` da sua `derivation` (ou `nativeCheckInputs` se a falha estiver ocorrendo ao executar testes).

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  # ...
  nativeBuildInputs = [ bison ];
  buildCommand = ''
    xcrun bison foo.y # produces foo.tab.c
    # ...
  '';
}
```

#### Pacote requer `xcodebuild` {#sec-darwin-troubleshooting-xcodebuild}

O pacote `xcbuild` fornece um comando `xcodebuild` para pacotes que realmente dependem do Xcode. Esta substituição não é 100% compatível e pode encontrar alguns problemas, mas é capaz de construir muitos pacotes. Para usar `xcodebuild`, adicione `xcbuildHook` aos `nativeBuildInputs` do seu pacote. Ele fornecerá um `buildPhase` para sua `derivation`. Você pode usar `xcbuildFlags` para especificar `flags` para `xcodebuild`, como o esquema necessário. Se um esquema tiver espaços em seu nome, você deve definir `__structuredAttrs` como `true`. Veja MoltenVK para um exemplo de configuração do `xcbuild`.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  xcbuildFlags = [
    "-configuration"
    "Release"
    "-project"
    "libfoo-project.xcodeproj"
    "-scheme"
    "libfoo Package (macOS only)"
  ];
  __structuredAttrs = true;
}
```

##### Corrigindo caminhos absolutos para `xcodebuild`, `xcrun` e `PlistBuddy` {#sec-darwin-troubleshooting-xcodebuild-absolute-paths}

Muitos sistemas de construção codificam os caminhos absolutos para `xcodebuild`, `xcrun` e `PlistBuddy` como `/usr/bin/xcodebuild`, `/usr/bin/xcrun` e `/usr/libexec/PlistBuddy` respectivamente. Esses caminhos precisarão ser substituídos por caminhos relativos e pelo pacote `xcbuild` se `xcodebuild` ou `PListBuddy` forem usados.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  postPatch = ''
    substituteInPlace Makefile \
      --replace-fail '/usr/bin/xcodebuild' 'xcodebuild' \
      --replace-fail '/usr/bin/xcrun' 'xcrun' \
      --replace-fail '/usr/bin/PListBuddy' 'PListBuddy'
  '';
}
```

#### Como usar `libiconv` no Darwin {#sec-darwin-troubleshooting-libiconv}

O pacote `libiconv` é incluído no SDK por padrão, juntamente com `libresolv` e `libsbuf`. Você não precisa fazer nada para usar esses pacotes. Eles estão disponíveis automaticamente. Se sua `derivation` precisar do binário `iconv`, adicione o pacote `libiconv` aos seus `nativeBuildInputs` (ou `nativeCheckInputs` para testes).

#### Problemas de `install name` da biblioteca {#sec-darwin-troubleshooting-install-name}

As bibliotecas no Darwin geralmente são vinculadas com caminhos absolutos. Isso é determinado por algo chamado “install name”, que é resolvido no tempo de vinculação. Às vezes, os pacotes não definem isso corretamente, fazendo com que os binários que se vinculam a ele não encontrem suas bibliotecas em tempo de execução. Isso pode ser corrigido adicionando `flags` extras do `linker` ou usando `install_name_tool` para defini-lo no `fixupPhase`.

##### Definindo o `install name` via `flags` do `linker` {#sec-darwin-troubleshooting-install-name-linker-flags}

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  # ...
  makeFlags = lib.optional stdenv.hostPlatform.isDarwin "LDFLAGS=-Wl,-install_name,$(out)/lib/libfoo.dylib";
}
```

##### Definindo o `install name` usando `install_name_tool` {#sec-darwin-troubleshooting-install-name-install_name_tool}

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  # ...
  postFixup = ''
    # `-id <install_name>` takes the install name. The last parameter is the path to the library.
    ${stdenv.cc.targetPrefix}install_name_tool -id "$out/lib/libfoo.dylib" "$out/lib/libfoo.dylib"
  '';
}
```

Mesmo que as bibliotecas sejam vinculadas usando caminhos absolutos e resolvidas corretamente via seu `install name`, os testes no `checkPhase` às vezes podem falhar ao executar binários porque eles estão vinculados a bibliotecas que ainda não foram instaladas. Isso geralmente pode ser resolvido executando os testes após o `installPhase` ou usando `DYLD_LIBRARY_PATH` (veja {manpage}`dyld(1)` para mais informações sobre como definir `DYLD_LIBRARY_PATH`).

##### Definindo o `install name` usando o `hook` `fixDarwinDylibNames` {#sec-darwin-troubleshooting-install-name-fixDarwinDylibNames}

Se o seu pacote tiver vários `dylibs` que precisam ser corrigidos, embora seja preferível corrigir o problema na construção do pacote, você pode atualizá-los todos adicionando o `hook` `fixDarwinDylibNames` aos seus `nativeBuildInputs`. Este `hook` irá escanear as saídas do seu pacote em busca de `dylibs` e corrigir seus `install names`. Observe que, se quaisquer binários em suas saídas vincularam esses `dylibs`, você pode precisar usar `install_name_tool` para substituir as referências a eles pelos caminhos corretos.

#### Propagando um SDK (avançado, apenas compiladores) {#sec-darwin-troubleshooting-propagating-sdks}

O SDK é um pacote, e ele pode ser propagado. `darwinMinVersionHook` com uma versão especificada também pode ser propagado. No entanto, a maioria dos pacotes *não* deve fazer isso. A exceção são os compiladores. Quando você propaga um SDK, ele se torna parte da API pública da sua `derivation`, e alterar o SDK ou removê-lo pode ser uma mudança que quebra a compatibilidade. É por isso que propagá-lo é recomendado apenas para compiladores.

Ao criar uma `derivation` de compilador, propague o SDK apenas para as maneiras como você espera que os usuários usem seu compilador. Dependendo dos seus casos de uso esperados, você pode ter que fazer uma ou todas estas ações.

- Coloque-o em `depsTargetTargetPropagated` quando seu compilador for esperado para ser adicionado aos `nativeBuildInputs`. Isso garantirá que o SDK seja efetivamente parte dos `buildInputs` da `derivation` de destino.
- Se o seu compilador usar um `hook`, coloque-o no `depsTargetTargetPropagated` do `hook` em vez disso. O efeito deve ser o mesmo que o anterior.
- Se o seu pacote usa o padrão `builder`, atualize seu `builder` para adicionar o SDK aos `buildInputs` da `derivation`.

Se você não tiver certeza se deve propagar um SDK, não o faça. Se o seu pacote é um compilador ou linguagem, e você não tem certeza, peça ajuda a @NixOS/darwin-maintainers para decidir.

### Lidando com `darwin.apple_sdk.frameworks` {#sec-darwin-legacy-frameworks}

Você pode ver referências a `darwin.apple_sdk.frameworks`. Este é o padrão de SDK legado, e está sendo descontinuado. Todos os pacotes em `darwin.apple_sdk`, `darwin.apple_sdk_11_0` e `darwin.apple_sdk_12_3` foram removidos. Se sua `derivation` fizer referência a eles, você deve excluir essas referências, pois o SDK padrão deve ser suficiente para construir seu pacote.

Nota: o novo padrão de SDK usa o nome `apple-sdk` para melhor se alinhar às convenções de nomenclatura do Nixpkgs. O padrão de SDK legado usa `apple_sdk`. Você sempre saberá que está usando o padrão de SDK antigo se o nome for `apple_sdk`.

Algumas `derivations` podem depender da localização de `frameworks` nesses pacotes antigos. Para atualizar sua `derivation` para encontrá-los no novo SDK, use `$SDKROOT` em vez disso em `preConfigure`. Por exemplo, se você substituir `${darwin.apple_sdk.frameworks.OpenGL}/Library/Frameworks/OpenGL.framework` em `postPatch`, substitua-o por `$SDKROOT/System/Library/Frameworks/OpenGL.framework` em `preConfigure`.

Observe que, se sua `derivation` estiver alterando um caminho do sistema (como `/System/Library/Frameworks/OpenGL.framework`), você pode ser capaz de remover o caminho. Compiladores e `binutils` que visam o Darwin procuram caminhos do sistema no `sysroot` do SDK. Alguns deles (como Zig ou `bindgen` para Rust) dependem disso.

#### Atualizando `overrides` de SDK legados {#sec-darwin-legacy-frameworks-overrides}

O SDK legado fornecia duas maneiras de sobrescrever o SDK padrão. Eles foram removidos juntamente com os SDKs legados.

- `pkgs.darwin.apple_sdk_11_0.callPackage` - este padrão era usado para fornecer `frameworks` do SDK do macOS 11. Agora é o mesmo que `callPackage`.
- `overrideSDK` - este adaptador `stdenv` tentaria substituir os `frameworks` usados pela sua `derivation` e suas dependências transitivas. Ele adicionou o pacote `apple-sdk_12` para `12.3` e não fez nada para `11.0`. Se `darwinMinVersion` fosse especificado, ele adicionaria `darwinMinVersionHook` com a versão mínima especificada. Nenhuma outra versão de SDK era suportada.

### Cross-Compilação Darwin {#sec-darwin-legacy-cross-compilation}

O Darwin suporta `cross-compilation` entre plataformas Darwin. A `cross-compilation` do Linux não é atualmente suportada, mas pode ser suportada no futuro. Para `cross-compile` para Darwin, você pode definir `crossSystem` ou usar um dos sistemas Darwin em `pkgsCross`. O `darwinMinVersionHook` e os SDKs suportam `cross-compilation`. Se você precisar especificar uma versão de SDK diferente para um compilador `depsBuildBuild`, adicione-o aos seus `nativeBuildInputs`.

```nix
stdenv.mkDerivation {
  name = "libfoo-1.2.3";
  # ...
  depsBuildBuild = [ buildPackages.stdenv.cc ];
  nativeBuildInputs = [ apple-sdk_12 ];
  buildInputs = [ apple-sdk_13 ];
  depsTargetTargetPropagated = [ apple-sdk_14 ];
}
# The build-build `clang` will use the 12.3 SDK while the package build itself will use the 13.3 SDK.
# Derivations that add this package as an input will have the 14.4 SDK propagated to them.
```

O SDK de destino e os `hooks` diferentes são `mangled` com base na função:

- `DEVELOPER_DIR_FOR_BUILD` e `MACOSX_DEPLOYMENT_TARGET_FOR_BUILD` para a plataforma de construção;
- `DEVELOPER_DIR` e `MACOSX_DEPLOYMENT_TARGET` para a plataforma `host`; e
- `DEVELOPER_DIR_FOR_TARGET` e `MACOSX_DEPLOYMENT_TARGET_FOR_TARGET` para a plataforma de construção.

Em situações de compilação estática, é possível que as plataformas `build` e `host` sejam a mesma plataforma, mas tenham SDKs diferentes com a mesma versão (um dinâmico e um estático). `cc-wrapper` e `bintools-wrapper` cuidam de lidar com essa distinção.