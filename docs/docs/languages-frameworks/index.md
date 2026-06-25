# Linguagens e frameworks {#chap-language-support}

O [ambiente de compilação padrão](#chap-stdenv) facilita a compilação de pacotes típicos baseados em Autotools com muito pouco código. Qualquer outro tipo de pacote pode ser acomodado sobrescrevendo as fases apropriadas de `stdenv`. No entanto, existem funções especializadas no Nixpkgs para construir facilmente pacotes para outras linguagens de programação, como Perl ou Haskell. Estas são descritas neste capítulo.

Cada linguagem ou ecossistema de software suportado tem seu próprio conjunto de pacotes chamado `<language or ecosystem>Packages`, que pode ser explorado de várias maneiras:

- Pesquise em [search.nixos.org](https://search.nixos.org/packages)

  Por exemplo, pesquise por [`haskellPackages`](https://search.nixos.org/packages?query=haskellPackages) ou [`rubyPackages`](https://search.nixos.org/packages?query=rubyPackages).

- Navegue por conjuntos de atributos com [`nix repl`](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-repl).

  Esta técnica é geralmente útil para inspecionar estruturas de dados da linguagem Nix.

  :::{.example #example-navigte-nix-repl}

  # Navegue por variantes do compilador Java em `javaPackages` com `nix repl`

  ```shell-session
  $ nix repl -f '<nixpkgs>' -I nixpkgs=channel:nixpkgs-unstable
  nix-repl> javaPackages.<tab>
  javaPackages.compiler               javaPackages.openjfx15              javaPackages.openjfx21              javaPackages.recurseForDerivations
  javaPackages.jogl_2_4_0             javaPackages.openjfx17              javaPackages.openjfx25
  javaPackages.mavenfod               javaPackages.openjfx19              javaPackages.override
  javaPackages.openjfx11              javaPackages.openjfx20              javaPackages.overrideDerivation
  ```
  :::

- Liste todas as derivations na linha de comando com [`nix-env --query`](https://nixos.org/manual/nix/stable/command-ref/nix-env/query).

  `nix-env` é a única maneira conveniente de fazer isso, pois ele ignorará atributos que falham em [assertions](https://nixos.org/manual/nix/stable/language/constructs#assertions), como quando um pacote é [marcado como quebrado](#var-meta-broken), em vez de falhar a avaliação inteira.

  :::{.example #example-list-haskellPackages}

  # Liste todos os pacotes Python no Nixpkgs

  O comando a seguir lista todos os [nomes de derivations](https://nixos.org/manual/nix/stable/language/derivations#attr-name) com seu caminho de atributo da última versão rolling release do Nixpkgs (`nixpkgs-unstable`).

  ```shell-session
  $ nix-env -qaP -f '<nixpkgs>' -A pythonPackages -I nixpkgs=channel:nixpkgs-unstable
  ```

  ```console
  pythonPackages.avahi                                                  avahi-0.8
  pythonPackages.boost                                                  boost-1.81.0
  pythonPackages.caffe                                                  caffe-1.0
  pythonPackages.caffeWithCuda                                          caffe-1.0
  pythonPackages.cbeams                                                 cbeams-1.0.3
  …
  ```
  :::

```{=include=} sections
agda.section.md
android.section.md
astal.section.md
beam.section.md
chicken.section.md
rocq.section.md
cosmic.section.md
crystal.section.md
cuda.section.md
cuelang.section.md
dart.section.md
dhall.section.md
dlang.section.md
dotnet.section.md
emscripten.section.md
factor.section.md
gnome.section.md
go.section.md
gradle.section.md
hare.section.md
haskell.section.md
hy.section.md
idris.section.md
idris2.section.md
ios.section.md
java.section.md
javascript.section.md
julia.section.md
lean4.section.md
lisp.section.md
lua.section.md
maven.section.md
nim.section.md
ocaml.section.md
octave.section.md
perl.section.md
php.section.md
pkg-config.section.md
python.section.md
qt.section.md
r.section.md
ruby.section.md
rust.section.md
scheme.section.md
swift.section.md
tcl.section.md
texlive.section.md
typst.section.md
vim.section.md
neovim.section.md
```