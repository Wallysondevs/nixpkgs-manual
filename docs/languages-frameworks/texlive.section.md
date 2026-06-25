# TeX Live {#sec-language-texlive}

Existe um empacotamento do TeX Live que reside inteiramente sob o atributo `texlive`.

## Guia do Usuário {#sec-language-texlive-user-guide}

- Para uso básico, utilize alguns dos ambientes pré-construídos disponíveis no nível superior, como `texliveBasic`, `texliveSmall`. Para a lista completa de ambientes pré-construídos, inspecione `texlive.schemes`.

- Pacotes não podem ser usados diretamente, mas devem ser montados em um ambiente. Para criar ou adicionar pacotes a um ambiente, use
  ```nix
  texliveSmall.withPackages (
    ps: with ps; [
      collection-langkorean
      algorithms
      cm-super
    ]
  )
  ```
  A função `withPackages` pode ser chamada várias vezes para adicionar mais pacotes.

  - **Nota.** Dentro do Nixpkgs, os pacotes devem usar apenas ambientes pré-construídos como entradas, como `texliveSmall` ou `texliveInfraOnly`, e não devem depender diretamente de `texlive`. Outras dependências devem ser adicionadas chamando `withPackages`. Isso é para garantir que haja uma maneira consistente e simples de sobrescrever as entradas.

- `texlive.withPackages` usa a mesma lógica que `buildEnv`. Apenas partes de um pacote são instaladas em um ambiente: seus arquivos de 'runtime' (saída `tex`), binários (saída `out`) e arquivos de suporte (saída `tlpkg`). Além disso, as páginas man e info são montadas em saídas separadas `man` e `info`. Para adicionar apenas os arquivos TeX de um pacote, ou sua documentação (saída `texdoc`), basta especificar as saídas:
  ```nix
  texliveBasic.withPackages (
    ps: with ps; [
      texdoc # recommended package to navigate the documentation
      perlPackages.LaTeXML.tex # tex files of LaTeXML, omit binaries
      cm-super
      cm-super.texdoc # documentation of cm-super
    ]
  )
  ```

- Para adicionar a documentação para todos os pacotes no ambiente, use
  ```nix
  texliveSmall.overrideAttrs { withDocs = true; }
  ```
  Isso pode ser aplicado antes ou depois de chamar `withPackages`. O parâmetro `withSources` adiciona todos os contêineres de código-fonte.

- Todos os pacotes distribuídos pelo TeX Live, que contém a maioria do CTAN, estão disponíveis e podem ser encontrados em `texlive.pkgs`:
  ```ShellSession
  $ nix repl
  nix-repl> :l <nixpkgs>
  nix-repl> texlive.pkgs.[TAB]
  ```
  Estas são derivations com saídas `out`, `tex`, `texdoc`, `texsource`, `tlpkg`, `man`, `info`. Elas não podem ser instaladas fora de `texlive.withPackages`, mas estão disponíveis para outros usos. Para reempacotar uma fonte, por exemplo, use

  ```nix
  stdenvNoCC.mkDerivation (finalAttrs: {
    src = texlive.pkgs.iwona;
    dontUnpack = true;

    inherit (finalAttrs.src) pname version;

    installPhase = ''
      runHook preInstall
      install -Dm644 $src/fonts/opentype/nowacki/iwona/*.otf -t $out/share/fonts/opentype
      runHook postInstall
    '';
  })
  ```

  Veja `biber`, `iwona` para exemplos completos.

## Pacotes Personalizados {#sec-language-texlive-custom-packages}

Você pode precisar usar um pacote TeX externo. Uma derivation para tal pacote deve fornecer o conteúdo do diretório "texmf" em sua saída `"tex"`, de acordo com a [TeX Directory Structure](https://tug.ctan.org/tds/tds.html). Dependências de outros pacotes TeX podem ser listadas no atributo `passthru.tlDeps`, que é uma função que recebe um conjunto de pacotes e retorna uma lista de pacotes.

A função `texlive.withPackages` reconhece as seguintes saídas:

- `"out"`: o conteúdo é linkado no ambiente TeX Live, e os binários na pasta `$out/bin` são empacotados (wrapped);
- `"tex"`: linkado em `$TEXMFDIST`; os arquivos devem seguir o TDS (por exemplo `$tex/tex/latex/foiltex/foiltex.cls`);
- `"texdoc"`, `"texsource"`: ignorados por padrão, tratados como `"tex"`;
- `"tlpkg"`: linkado em `$TEXMFROOT/tlpkg`;
- `"man"`, `"info"`, ...: as outras saídas são combinadas em saídas separadas.

Aqui está um exemplo (muito detalhado). Veja também os pacotes `auctex`, `eukleides`, `mftrace` para mais exemplos.

```nix
with import <nixpkgs> { };

let
  foiltex = stdenvNoCC.mkDerivation {
    pname = "latex-foiltex";
    version = "2.1.4b";

    outputs = [
      "tex"
      "texdoc"
    ];
    passthru.tlDeps = ps: [ ps.latex ];

    srcs = [
      (fetchurl {
        url = "http://mirrors.ctan.org/macros/latex/contrib/foiltex/foiltex.dtx";
        hash = "sha256-/2I2xHXpZi0S988uFsGuPV6hhMw8e0U5m/P8myf42R0=";
      })
      (fetchurl {
        url = "http://mirrors.ctan.org/macros/latex/contrib/foiltex/foiltex.ins";
        hash = "sha256-KTm3pkd+Cpu0nSE2WfsNEa56PeXBaNfx/sOO2Vv0kyc=";
      })
    ];

    unpackPhase = ''
      runHook preUnpack

      for _src in $srcs; do
        cp "$_src" $(stripHash "$_src")
      done

      runHook postUnpack
    '';

    nativeBuildInputs = [
      (texliveSmall.withPackages (
        ps: with ps; [
          cm-super
          hypdoc
          latexmk
        ]
      ))
      writableTmpDirAsHomeHook # Need a writable $HOME for latexmk
    ];

    # multiple-outputs.sh fails if $out is not defined
    preHook = ''
      out="''${tex-}"
    '';

    dontConfigure = true;

    buildPhase = ''
      runHook preBuild

      # Generate the style files
      latex foiltex.ins

      # Generate the documentation
      latexmk -pdf foiltex.dtx

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      path="$tex/tex/latex/foiltex"
      mkdir -p "$path"
      cp *.{cls,def,clo,sty} "$path/"

      path="$texdoc/doc/tex/latex/foiltex"
      mkdir -p "$path"
      cp *.pdf "$path/"

      runHook postInstall
    '';

    meta = {
      description = "LaTeX2e class for overhead transparencies";
      license = lib.licenses.unfreeRedistributable;
      maintainers = with lib.maintainers; [ veprbl ];
      platforms = lib.platforms.all;
    };
  };

  latex_with_foiltex = texliveSmall.withPackages (_: [ foiltex ]);
in
runCommand "test.pdf" { nativeBuildInputs = [ latex_with_foiltex ]; } ''
  cat >test.tex <<EOF
  \documentclass{foils}

  \title{Presentation title}
  \date{}

  \begin{document}
  \maketitle
  \end{document}
  EOF
    pdflatex test.tex
    cp test.pdf $out
''
```

## Cache de fontes do LuaLaTeX {#sec-language-texlive-lualatex-font-cache}

O cache de fontes para LuaLaTeX é gravado em `$HOME`.
Portanto, é necessário definir `$HOME` para um caminho gravável, por exemplo, [antes de usar LuaLaTeX em nix derivations](https://github.com/NixOS/nixpkgs/issues/180639):
```nix
runCommand "lualatex-hello-world" { buildInputs = [ texliveFull ]; } ''
  mkdir $out
  echo '\documentclass{article} \begin{document} Hello world \end{document}' > main.tex
  env HOME=$(mktemp -d) lualatex  -interaction=nonstopmode -output-format=pdf -output-directory=$out ./main.tex
''
```

Além disso, [o cache de um usuário pode divergir do nix store](https://github.com/NixOS/nixpkgs/issues/278718).
Para resolver possíveis problemas de fontes, o cache pode ser removido pelo usuário:
```ShellSession
luaotfload-tool --cache=erase --flush-lookups --force
```