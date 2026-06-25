# lisp-modules {#lisp}

Este documento descreve a infraestrutura do Nixpkgs para construir sistemas Common Lisp que usam [ASDF](https://asdf.common-lisp.dev/) (Another System Definition Facility). Ele reside em `pkgs/development/lisp-modules`.

## Visão Geral {#lisp-overview}

O principal ponto de entrada da API são os próprios pacotes de implementação Common Lisp (por exemplo, `abcl`, `ccl`, `clasp-common-lisp`, `clisp`, `ecl`, `sbcl`). Eles possuem os atributos `pkgs` e `withPackages`, que podem ser usados para descobrir pacotes disponíveis e para construir wrappers, respectivamente.

O conjunto de atributos `pkgs` contém pacotes que foram automaticamente [importados](#lisp-importing-packages-from-quicklisp) do Quicklisp, e quaisquer outros [definidos manualmente](#lisp-defining-packages-inside). Nem todo pacote funciona para todas as implementações CL (por exemplo, `nyxt` só faz sentido para `sbcl`).

A função `withPackages` é de utilidade primária. Ela é usada para construir [wrappers executáveis](#lisp-building-wrappers), com um [ASDF FASL](#lisp-loading-asdf) fixado e pré-construído disponível na variável de ambiente `ASDF`, e `CL_SOURCE_REGISTRY`/`ASDF_OUTPUT_TRANSLATIONS` configurados para [encontrar os sistemas desejados em tempo de execução](#lisp-loading-systems).

Além disso, os Lisps possuem a função `withOverrides`, que pode ser usada para [substituir](#lisp-including-external-pkg-in-scope) qualquer pacote no escopo de seus `pkgs`. Isso também será útil em conjunto com `overrideLispAttrs` ao [lidar com sistemas "slashy"](#lisp-dealing-with-slashy-systems), porque eles devem permanecer no pacote principal e ser construídos especificando o argumento `systems` para `build-asdf-system`.

## O exemplo de caso de uso de 90% {#lisp-use-case-example}

A maneira mais comum de usar a biblioteca é executar wrappers ad-hoc como este:

`nix-shell -p 'sbcl.withPackages (ps: with ps; [ alexandria ])'`

Então, em um shell:

```
$ sbcl
* (load (sb-ext:posix-getenv "ASDF"))
* (asdf:load-system 'alexandria)
```

Também é possível criar um ambiente `pkgs.mkShell` em `shell.nix`/`flake.nix`:

```nix
let
  sbcl' = sbcl.withPackages (ps: [ ps.alexandria ]);
in
mkShell { packages = [ sbcl' ]; }
```

Tal Lisp pode agora ser usado, por exemplo, para compilar seus fontes:

```nix
{
  buildPhase = ''
    runHook preBuild

    ${sbcl'}/bin/sbcl --load my-build-file.lisp

    runHook postBuild
  '';
}
```

## Importando pacotes do Quicklisp {#lisp-importing-packages-from-quicklisp}

Para economizar o trabalho de escrever expressões Nix, existe um script que importa todos os pacotes distribuídos pelo Quicklisp para `imported.nix`. Isso funciona analisando seus arquivos `releases.txt` e `systems.txt`, que são publicados a cada dois meses em [quicklisp.org](https://beta.quicklisp.org/dist/quicklisp.txt).

O processo de importação é implementado no diretório `import` como código Common Lisp no sistema ASDF `org.lispbuilds.nix`. Para executar o script, pode-se executar `ql-import.lisp`:

```
cd pkgs/development/lisp-modules
nix-shell --run 'sbcl --script ql-import.lisp'
```

O script irá:

1.  Baixar os arquivos `systems.txt` e `releases.txt` mais recentes do Quicklisp
2.  Gerar um banco de dados SQLite temporário de todos os sistemas QL em `packages.sqlite`
3.  Gerar um arquivo `imported.nix` a partir do banco de dados

(O arquivo `packages.sqlite` pode ser excluído à vontade, pois é regenerado toda vez que o script é executado.)

O trabalho do mantenedor é:

1.  Reexecutar o script `ql-import.lisp` quando houver um novo lançamento do Quicklisp
2.  [Adicionar quaisquer dependências nativas ausentes](#lisp-quicklisp-adding-native-dependencies) em `ql.nix`
3.  Para pacotes que ainda não compilam, [empacotá-los manualmente](#lisp-defining-packages-inside) em `packages.nix`

Além disso, o arquivo `imported.nix` **não deve ser editado manualmente**! Ele deve ser gerado apenas conforme descrito nesta seção (executando `ql-import.lisp`).

### Adicionando dependências nativas {#lisp-quicklisp-adding-native-dependencies}

Os arquivos do Quicklisp contêm dados de dependência ASDF, mas não incluem dependências de bibliotecas nativas (CFFI) e, no caso do ABCL, dependências Java.

O arquivo `ql.nix` contém uma longa lista de overrides, onde essas dependências podem ser adicionadas.

Pacotes definidos em `packages.nix` contêm essas dependências naturalmente.

### Confiando em `systems.txt` e `releases.txt` {#lisp-quicklisp-trusting}

A implementação anterior de `lisp-modules` não confiava totalmente nos dados do Quicklisp, porque houve momentos em que as dependências especificadas não estavam completas e causavam builds quebrados. Em vez disso, ela usava um ambiente `nix-shell` para descobrir dependências reais usando as APIs ASDF.

A implementação atual optou por confiar nesses dados, porque é mais rápido analisar um arquivo de texto do que construir cada sistema para gerar seu arquivo Nix, e porque dessa forma os pacotes podem ser importados em massa. Por causa disso, pode chegar um dia em que alguns pacotes quebrarão, devido a bugs no Quicklisp. Nesse caso, a correção poderia ser um override manual em `packages.nix` e `ql.nix`.

Um fato conhecido é que o Quicklisp não inclui dependências em sistemas "slashy" em seus dados. Este é um exemplo de uma situação em que tais correções foram usadas, por exemplo, para substituir o atributo `systems` dos pacotes afetados. (Veja a definição de `iolib`).

### Peculiaridades {#lisp-quicklisp-quirks}

Durante a importação do Quicklisp:

-   `+` em nomes é convertido para `_plus{_,}`: `cl+ssl`->`cl_plus_ssl`, `alexandria+`->`alexandria_plus`
-   `.` em nomes é convertido para `_dot_`: `iolib.base`->`iolib_dot_base`
-   nomes que começam com um número têm um `_` prefixado (`3d-vectors`->`_3d-vectors`)
-   `_` em nomes é convertido para `__` para reversibilidade

## Definindo pacotes manualmente dentro do Nixpkgs {#lisp-defining-packages-inside}

Pacotes que, por alguma razão, não estão no Quicklisp e, portanto, não podem ser auto-importados, ou não funcionam diretamente da importação, são definidos no arquivo `packages.nix`.

Nesse arquivo, use a função `build-asdf-system`, que é um wrapper em torno de `mkDerivation` para construir sistemas ASDF. Vários outros hacks estão presentes, como `build-with-compile-into-pwd` para sistemas que criam arquivos durante a compilação (como cl-unicode).

A função `build-asdf-system` está documentada [aqui](#lisp-defining-packages-outside). Além disso, `packages.nix` está cheio de exemplos de como usá-la.

## Definindo pacotes manualmente fora do Nixpkgs {#lisp-defining-packages-outside}

Derivações Lisp (`abcl`, `sbcl` etc.) também exportam a função `buildASDFSystem`, que é semelhante a `build-asdf-system` de `packages.nix`, mas faz parte da API pública.

Ela aceita os seguintes argumentos:

-   `pname`: o nome do pacote
-   `version`: a versão do pacote
-   `src`: a fonte do pacote
-   `patches`: patches a serem aplicados à fonte antes da construção
-   `nativeLibs`: bibliotecas nativas usadas por CFFI e grovelling
-   `javaLibs`: bibliotecas Java para ABCL
-   `lispLibs`: dependências de outros pacotes construídos com `buildASDFSystem`
-   `systems`: lista de sistemas a serem construídos

Ela pode ser usada para definir pacotes fora do Nixpkgs e, por exemplo, adicioná-los ao escopo do pacote com `withOverrides`.

### Incluindo um pacote externo no escopo {#lisp-including-external-pkg-in-scope}

Um pacote definido fora do Nixpkgs usando `buildASDFSystem` pode ser integrado ao escopo fornecido pelo Nixpkgs desta forma:

```nix
let
  alexandria = sbcl.buildASDFSystem rec {
    pname = "alexandria";
    version = "1.4";
    src = fetchFromGitLab {
      domain = "gitlab.common-lisp.net";
      owner = "alexandria";
      repo = "alexandria";
      tag = "v${version}";
      hash = "sha256-1Hzxt65dZvgOFIljjjlSGgKYkj+YBLwJCACi5DZsKmQ=";
    };
  };
  sbcl' = sbcl.withOverrides (self: super: { inherit alexandria; });
in
sbcl'.pkgs.alexandria
```

## Sobrescrevendo atributos de pacote {#lisp-overriding-package-attributes}

Pacotes exportam a função `overrideLispAttrs`, que pode ser usada para construir um novo pacote com parâmetros diferentes.

Exemplo de override de `alexandria`:

```nix
sbcl.pkgs.alexandria.overrideLispAttrs (oldAttrs: rec {
  version = "1.4";
  src = fetchFromGitLab {
    domain = "gitlab.common-lisp.net";
    owner = "alexandria";
    repo = "alexandria";
    tag = "v${version}";
    hash = "sha256-1Hzxt65dZvgOFIljjjlSGgKYkj+YBLwJCACi5DZsKmQ=";
  };
})
```

### Lidando com sistemas "slashy" {#lisp-dealing-with-slashy-systems}

Sistemas "slashy" (secundários) não devem existir em seus próprios pacotes! Em vez disso, eles devem ser incluídos no pacote pai como uma entrada extra no argumento `systems` para as funções `build-asdf-system`/`buildASDFSystem`.

A razão é que o ASDF procura por um sistema secundário no `.asd` do pacote pai. Assim, tê-los separados faria com que um deles não carregasse corretamente, porque um conteria FASLs de si mesmo, mas não do outro, e vice-versa.

Para empacotar sistemas "slashy", use `overrideLispAttrs`, assim:

```nix
ecl.pkgs.alexandria.overrideLispAttrs (oldAttrs: {
  systems = oldAttrs.systems ++ [ "alexandria/tests" ];
  lispLibs = oldAttrs.lispLibs ++ [ ecl.pkgs.rt ];
})
```

Veja a [seção respectiva](#lisp-including-external-pkg-in-scope) sobre o uso de `withOverrides` para como integrá-lo de volta em `ecl.pkgs`.

Note que, às vezes, os sistemas "slashy" podem não apenas ter mais dependências do que o principal, mas também criar uma dependência circular entre os arquivos `.asd`. Infelizmente, neste caso, uma solução ad-hoc se torna necessária.

## Construindo Wrappers {#lisp-building-wrappers}

Wrappers podem ser construídos usando a função `withPackages` das implementações Common Lisp (`abcl`, `ecl`, `sbcl` etc.):

```
nix-shell -p 'sbcl.withPackages (ps: [ ps.alexandria ps.bordeaux-threads ])'
```

Tal wrapper pode então ser usado assim:

```
$ sbcl
* (load (sb-ext:posix-getenv "ASDF"))
* (asdf:load-system 'alexandria)
* (asdf:load-system 'bordeaux-threads)
```

### Carregando ASDF {#lisp-loading-asdf}

Para melhores resultados, evite chamar `(require 'asdf)` ao usar os wrappers gerados pela biblioteca.

Use `(load (ext:getenv "ASDF"))` em vez disso, fornecendo a maneira de sua implementação de obter uma variável de ambiente para `ext:getenv`. Isso carregará a versão do ASDF fornecida pelo Nixpkgs (pré-compilada para FASL).

### Carregando sistemas {#lisp-loading-systems}

Lá, você pode usar `asdf:load-system`. Isso funciona definindo os valores corretos para as variáveis de ambiente `CL_SOURCE_REGISTRY`/`ASDF_OUTPUT_TRANSLATIONS`, para que os sistemas sejam encontrados no Nix store e os FASLs pré-compilados sejam carregados.

## Adicionando um novo Lisp {#lisp-adding-a-new-lisp}

A função `wrapLisp` é usada para envolver implementações Common Lisp. Ela adiciona os atributos `pkgs`, `withPackages`, `withOverrides` e `buildASDFSystem` à derivation.

`wrapLisp` aceita estes argumentos:

-   `pkg`: o pacote Lisp
-   `faslExt`: Extensão específica da implementação para arquivos FASL
-   `program`: O nome do arquivo executável em `${pkg}/bin/` (Padrão: `pkg.pname`)
-   `flags`: Uma lista de flags para sempre passar para `program` (Padrão: `[]`)
-   `asdf`: A versão do ASDF a ser usada (Padrão: `pkgs.asdf_3_3`)
-   `packageOverrides`: Configuração de overrides de pacote (Padrão: `(self: super: {})`)

Este exemplo envolve CLISP:

```nix
wrapLisp {
  pkg = clisp;
  faslExt = "fas";
  flags = [
    "-E"
    "UTF8"
  ];
}
```