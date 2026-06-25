# Overlays {#chap-overlays}

Este capítulo descreve como estender e alterar o Nixpkgs usando overlays. Overlays são usados para adicionar camadas no ponto fixo usado pelo Nixpkgs para compor o conjunto de todos os pacotes.

O Nixpkgs pode ser configurado com uma lista de overlays, que são aplicados em ordem. Isso significa que a ordem dos overlays pode ser significativa se múltiplas camadas sobrescreverem o mesmo pacote.

## Instalando overlays {#sec-overlays-install}

A lista de overlays pode ser definida explicitamente em uma expressão Nix, ou através de `<nixpkgs-overlays>` ou arquivos de configuração do usuário.

### Definir overlays em NixOS ou expressões Nix {#sec-overlays-argument}

Em um sistema NixOS, o valor da opção `nixpkgs.overlays`, se presente, é passado para o Nixpkgs do sistema diretamente como um argumento. Note que isso não afeta os overlays para operações não-NixOS (e.g. `nix-env`), que são [procurados](#sec-overlays-lookup) independentemente.

A lista de overlays pode ser passada explicitamente ao importar o nixpkgs, por exemplo `import <nixpkgs> { overlays = [ overlay1 overlay2 ]; }`.

NOTA: NÃO USE ISSO no nixpkgs. Overlays adicionais podem ser adicionados chamando `pkgs.extend` ou `pkgs.appendOverlays`, embora seja frequentemente preferível evitar essas funções, porque elas recalculam o ponto fixo do Nixpkgs, o que é um tanto custoso.

### Instalar overlays via busca de configuração {#sec-overlays-lookup}

A lista de overlays é determinada da seguinte forma.

1. Primeiro, se um argumento [`overlays`](#sec-overlays-argument) para a própria função Nixpkgs for fornecido, então ele será usado e nenhuma busca de caminho será realizada.

2. Caso contrário, se a entrada de caminho Nix `<nixpkgs-overlays>` existir, procuramos por overlays nesse caminho, conforme descrito abaixo.

    Consulte a [seção sobre `NIX_PATH`](https://nixos.org/manual/nix/stable/command-ref/env-common.html#env-NIX_PATH) no manual do Nix para mais detalhes sobre como definir um valor para `<nixpkgs-overlays>`.

3. Se um dos `~/.config/nixpkgs/overlays.nix` e `~/.config/nixpkgs/overlays/` existir, então procuramos por overlays nesse caminho, conforme descrito abaixo. É um erro se ambos existirem.

Se estivermos procurando por overlays em um caminho, então há dois casos:

- Se o caminho for um arquivo, então o arquivo é importado como uma expressão Nix e usado como a lista de overlays.

- Se o caminho for um diretório, então pegamos o conteúdo do diretório, o ordenamos lexicograficamente e tentamos interpretar cada um como um overlay por:

    - Importar o arquivo, se for um arquivo `.nix`.

    - Importar um arquivo `default.nix` de nível superior, se for um diretório.

Como os overlays definidos na configuração do NixOS não afetam operações não-NixOS como `nix-env`, a opção `overlays.nix` oferece uma maneira conveniente de usar os mesmos overlays para uma configuração de sistema NixOS e uma configuração de usuário: o mesmo arquivo pode ser usado como `overlays.nix` e importado como o valor de `nixpkgs.overlays`.

## Definindo overlays {#sec-overlays-definition}

Overlays são funções Nix que aceitam dois argumentos, convencionalmente chamados de `final` e `prev` em código mais recente ou `self` e `super` em código mais antigo, e retornam um conjunto de pacotes. Por exemplo, o seguinte é um overlay válido.

```nix
final: prev:

{
  boost = prev.boost.override { python = final.python3; };
  rr = prev.callPackage ./pkgs/rr { stdenv = final.stdenv_32bit; };
}
```

O primeiro argumento (`final`, `self`) corresponde ao conjunto final de pacotes. Você deve usar este conjunto para as dependências de todos os pacotes especificados em seu overlay. Por exemplo, todas as dependências de `rr` no exemplo acima vêm de `final`, assim como as dependências sobrescritas usadas na sobrescrita de `boost`.

O segundo argumento (`prev`, `super`) corresponde ao resultado da avaliação dos estágios anteriores do Nixpkgs. Ele não contém nenhum dos pacotes adicionados pelo overlay atual, nem nenhum dos overlays seguintes. Este conjunto deve ser usado para referenciar pacotes que você deseja sobrescrever, ou para acessar funções definidas no Nixpkgs. Por exemplo, a receita original de `boost` no exemplo acima, vem de `prev`, assim como a função `callPackage`.

O valor retornado por esta função deve ser um conjunto similar a `pkgs/top-level/all-packages.nix`, contendo pacotes sobrescritos e/ou novos.

Overlays são semelhantes a outros métodos para personalizar o Nixpkgs, em particular o atributo `packageOverrides` descrito em [](#sec-modify-via-packageOverrides). De fato, `packageOverrides` atua como um overlay com apenas o argumento `prev`. É, portanto, apropriado para uso básico, mas overlays são mais poderosos e fáceis de distribuir.

## Usando overlays para configurar alternativas {#sec-overlays-alternatives}

Certos pacotes de software possuem diferentes implementações da mesma interface. Outras distribuições possuem funcionalidades para alternar entre elas. Por exemplo, o Debian oferece [DebianAlternatives](https://wiki.debian.org/DebianAlternatives). O Nixpkgs possui o que chamamos de `alternatives`, que são configuradas através de overlays.

### BLAS/LAPACK {#sec-overlays-alternatives-blas-lapack}

No Nixpkgs, temos múltiplas implementações das interfaces de álgebra linear numérica BLAS/LAPACK. Elas são:

- [OpenBLAS](https://www.openblas.net/)

    O atributo Nixpkgs é `openblas` para ILP64 (largura do inteiro = 64 bits) e `openblasCompat` para LP64 (largura do inteiro = 32 bits). `openblasCompat` é o padrão.

- [LAPACK reference](https://www.netlib.org/lapack/) (também fornece BLAS e CBLAS)

    O atributo Nixpkgs é `lapack-reference`.

- [Intel MKL](https://software.intel.com/en-us/mkl) (funciona apenas na arquitetura x86_64, não-livre)

    O atributo Nixpkgs é `mkl`.

- [BLIS](https://github.com/flame/blis)

    BLIS, disponível através do atributo `blis`, é um framework para kernels de álgebra linear. Além disso, ele implementa a interface BLAS.

- [AMD BLIS/LIBFLAME](https://developer.amd.com/amd-aocl/blas-library/) (otimizado para CPUs AMD x86_64 modernas)

    O fork da AMD da biblioteca BLIS, com atributo `amd-blis`, estende o BLIS com otimizações para CPUs AMD modernas. As mudanças são geralmente submetidas ao projeto BLIS upstream após algum tempo. No entanto, o AMD BLIS tipicamente oferece algumas melhorias de desempenho em CPUs AMD Zen. A biblioteca complementar AMD LIBFLAME, com atributo `amd-libflame`, fornece uma implementação LAPACK.

Introduzido no [PR #83888](https://github.com/NixOS/nixpkgs/pull/83888), somos capazes de sobrescrever os pacotes `blas` e `lapack` para usar diferentes implementações, através dos argumentos `blasProvider` e `lapackProvider`. Isso pode ser usado para selecionar um provedor diferente. Provedores BLAS terão symlinks em `$out/lib/libblas.so.3` e `$out/lib/libcblas.so.3` para suas respectivas bibliotecas BLAS. Da mesma forma, provedores LAPACK terão symlinks em `$out/lib/liblapack.so.3` e `$out/lib/liblapacke.so.3` para suas respectivas bibliotecas LAPACK. Por exemplo, o Intel MKL é um provedor BLAS e LAPACK. Um overlay pode ser criado para usar o Intel MKL que se parece com:

```nix
final: prev:

{
  blas = prev.blas.override { blasProvider = final.mkl; };

  lapack = prev.lapack.override { lapackProvider = final.mkl; };
}
```

Este overlay usa a biblioteca MKL da Intel para ambas as interfaces BLAS e LAPACK. Note que o mesmo pode ser realizado em tempo de execução usando `LD_LIBRARY_PATH` de `libblas.so.3` e `liblapack.so.3`. Por exemplo:

```ShellSession
$ LD_LIBRARY_PATH=$(nix-build -A mkl)/lib${LD_LIBRARY_PATH:+:}$LD_LIBRARY_PATH nix-shell -p octave --run octave
```

O Intel MKL requer uma implementação `openmp` ao ser executado com múltiplos processadores. Por padrão, `mkl` usará a implementação `iomp` da Intel se nenhuma outra for especificada, mas esta é uma dependência apenas em tempo de execução e compatível binariamente com a implementação LLVM. Para usar esta última, a Intel recomenda que os usuários a definam com `LD_PRELOAD`. Note que `mkl` está disponível apenas em `x86_64-linux` e `x86_64-darwin`. Além disso, o Hydra não está construindo e distribuindo binários pré-compilados usando-o.

Para sobrescrever `blas` e `lapack` com suas implementações de referência (ou seja, para fins de desenvolvimento), pode-se usar o seguinte overlay:

```nix
final: prev:

{
  blas = prev.blas.override { blasProvider = final.lapack-reference; };

  lapack = prev.lapack.override { lapackProvider = final.lapack-reference; };
}
```

Para que a troca de BLAS/LAPACK funcione corretamente, todos os pacotes devem depender de `blas` ou `lapack`. Isso garante que apenas uma biblioteca BLAS/LAPACK seja usada por vez. Existem duas versões de BLAS/LAPACK atualmente em uso, `LP64` (tamanho do inteiro = 32 bits) e `ILP64` (tamanho do inteiro = 64 bits). Os atributos `blas` e `lapack` são `LP64` por padrão. Suas versões `ILP64` são fornecidas através dos atributos `blas-ilp64` e `lapack-ilp64`. Alguns softwares precisam de flags ou patches especiais para funcionar com `ILP64`. Você pode verificar se `ILP64` é usado no Nixpkgs com `blas.isILP64` e `lapack.isILP64`. Alguns softwares NÃO funcionam com `ILP64`, e as derivations precisam especificar uma asserção para evitar isso. Você pode impedir que `ILP64` seja usado com o seguinte:

```nix
{
  stdenv,
  blas,
  lapack,
  ...
}:

assert (!blas.isILP64) && (!lapack.isILP64);

stdenv.mkDerivation {
  # ...
}
```

### Alternando a implementação MPI {#sec-overlays-alternatives-mpi}

Todos os programas construídos com suporte a [MPI](https://en.wikipedia.org/wiki/Message_Passing_Interface) usam o atributo genérico `mpi` como entrada. Atualmente, o Nixpkgs fornece nativamente as seguintes implementações MPI:

- [Open MPI](https://www.open-mpi.org/) (padrão), nome do atributo `openmpi`

- [MPICH](https://www.mpich.org/), nome do atributo `mpich`

- [MVAPICH](https://mvapich.cse.ohio-state.edu/), nome do atributo `mvapich`

Para fornecer aplicações habilitadas para MPI que usam `MPICH`, em vez do `Open MPI` padrão, use o seguinte overlay:

```nix
final: prev:

{
  mpi = final.mpich;
}
```