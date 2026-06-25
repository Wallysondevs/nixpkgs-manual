# A Toolchain LLVM {#chap-toolchains}

LLVM é um otimizador e gerador de código independente de alvo e serve como base para muitos compiladores como GHC do Haskell, rustc, Zig e muitos outros. Ele forma as ferramentas base para a plataforma Darwin da Apple.

## Usando LLVM {#sec-using-llvm}

LLVM pode ser usado de duas maneiras. Uma é utilizando-o em todo o Nixpkgs e a outra é para compilar e construir pacotes individuais.

### Construindo pacotes com LLVM {#sec-building-packages-with-llvm}

Nixpkgs suporta dois métodos para compilar o mundo com LLVM. Um é através da configuração de `useLLVM` em `crossSystem` durante a importação. Esta é a maneira recomendada ao fazer compilação cruzada, pois é mais expressiva. Um exemplo de compilação cruzada `aarch64-linux` a partir de `x86_64-linux` com LLVM no alvo é o seguinte:

```nix
import <nixpkgs> {
  localSystem = {
    system = "x86_64-linux";
  };
  crossSystem = {
    useLLVM = true;
    linker = "lld";
  };
}
```

Note que definimos `linker` como `lld`. Isso ocorre porque o LLVM possui seu próprio linker, chamado "lld". Ao configurá-lo, utilizamos Clang e lld dentro desta nova instância do Nixpkgs. Existe um método abreviado para construir tudo com LLVM: `pkgsLLVM`. Isso é mais fácil de usar com `nix-build` (ou `nix build`):

```bash
nix-build -A pkgsLLVM.hello
```

Isso compilará o pacote GNU hello com LLVM e o linker lld, como mencionado anteriormente.

#### Usando `clangStdenv` {#sec-building-packages-with-llvm-using-clang-stdenv}

Outra maneira simples é sobrescrever o stdenv com `clangStdenv`. Isso faz com que um único pacote seja construído com Clang. No entanto, este `stdenv` não sobrescreve os padrões da plataforma para usar compiler-rt, libc++ e libunwind. Esta é a maneira preferida de fazer com que um único pacote no Nixpkgs seja construído com Clang. Há casos em que apenas Clang não é suficiente. Para essas situações, existe `libcxxStdenv`, que usa Clang com libc++ e compiler-rt.