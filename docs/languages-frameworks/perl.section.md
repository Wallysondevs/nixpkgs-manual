# Perl {#sec-language-perl}

## Executando programas Perl no shell {#ssec-perl-running}

Ao executar um script Perl, é possível que você receba um erro como `./myscript.pl: bad interpreter: /usr/bin/perl: no such file or directory`. Isso acontece quando o script espera que o Perl esteja instalado em `/usr/bin/perl`, o que não é o caso ao usar o Perl do nixpkgs. Você pode corrigir o script alterando a primeira linha para:

```perl
#!/usr/bin/env perl
```

para usar a instalação do Perl da variável de ambiente `PATH`, ou invocar o Perl diretamente com:

```ShellSession
$ perl ./myscript.pl
```

Quando o script está usando uma biblioteca Perl que não está instalada globalmente, você pode receber um erro como `Can't locate DB_File.pm in @INC (you may need to install the DB_File module)`. Nesse caso, você pode usar `nix-shell` para iniciar um shell ad-hoc com essa biblioteca instalada, por exemplo:

```ShellSession
$ nix-shell -p perl perlPackages.DBFile --run ./myscript.pl
```

Se você estiver sempre usando o script em locais onde `nix-shell` está disponível, você pode incorporar a invocação de `nix-shell` no shebang assim:

```perl
#!/usr/bin/env nix-shell
#! nix-shell -i perl -p perl perlPackages.DBFile
```

## Empacotando programas Perl {#ssec-perl-packaging}

Nixpkgs fornece uma função `buildPerlPackage`, uma função genérica de construção de pacotes para qualquer pacote Perl que tenha um `Makefile.PL` padrão. Ela é implementada em [pkgs/development/perl-modules/generic](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/perl-modules/generic).

Pacotes Perl do CPAN são definidos em [pkgs/top-level/perl-packages.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/top-level/perl-packages.nix) em vez de `pkgs/all-packages.nix`. A maioria dos pacotes Perl são tão simples de construir que são definidos diretamente aqui, em vez de ter uma função separada para cada pacote chamada de `perl-packages.nix`. No entanto, pacotes mais complicados devem ser colocados em um arquivo separado, tipicamente em `pkgs/development/perl-modules`. Aqui está um exemplo do primeiro caso:

```nix
{
  ClassC3 = buildPerlPackage rec {
    pname = "Class-C3";
    version = "0.21";
    src = fetchurl {
      url = "mirror://cpan/authors/id/F/FL/FLORA/Class-C3-${version}.tar.gz";
      hash = "sha256-/5GE5xHT0uYGOQxroqj6LMU7CtKn2s6vMVoSXxL4iK4=";
    };
  };
}
```

Observe o uso de `mirror://cpan/`, e o `pname` e `version` na definição da URL para garantir que o atributo `pname` seja consistente com a fonte que estamos realmente baixando. Pacotes Perl são disponibilizados em `all-packages.nix` através da variável `perlPackages`. Por exemplo, se você tem um pacote que precisa de `ClassC3`, você normalmente escreveria

```nix
{
  foo = import ../path/to/foo.nix {
    inherit
      stdenv
      fetchurl # ...
      ;
    inherit (perlPackages) ClassC3;
  };
}
```

em `all-packages.nix`. Você pode testar a construção de um pacote Perl da seguinte forma:

```ShellSession
$ nix-build -A perlPackages.ClassC3
```

Para instalá-lo com `nix-env` em vez disso: `nix-env -f. -iA perlPackages.ClassC3`.

Então, o que `buildPerlPackage` faz? Ele faz o seguinte:

1.  Na fase de configuração, ele chama `perl Makefile.PL` para gerar um Makefile. Você pode definir a variável `makeMakerFlags` para passar flags para `Makefile.PL`
2.  Ele adiciona o conteúdo da variável de ambiente `PERL5LIB` a uma declaração `use lib` no início dos scripts Perl. Isso garante que um script possa encontrar suas dependências.
3.  Na fase de correção (`fixup phase`), ele escreve as entradas de construção propagadas (`propagatedBuildInputs`) para o arquivo `$out/nix-support/propagated-user-env-packages`. `nix-env` instala recursivamente todos os pacotes listados neste arquivo quando você instala um pacote que o possui. Isso garante que um pacote Perl possa encontrar suas dependências.

`buildPerlPackage` é construído sobre `stdenv`, então tudo pode ser customizado da maneira usual. Por exemplo, o módulo `BerkeleyDB` tem um hook `preConfigure` para gerar um arquivo de configuração usado por `Makefile.PL`:

```nix
{
  buildPerlPackage,
  fetchurl,
  db,
}:

buildPerlPackage rec {
  pname = "BerkeleyDB";
  version = "0.36";

  src = fetchurl {
    url = "mirror://cpan/authors/id/P/PM/PMQS/BerkeleyDB-${version}.tar.gz";
    hash = "sha256-4Y+HGgGQqcOfdiKcFIyMrWBEccVNVAMDBWZlFTMorh8=";
  };

  preConfigure = ''
    echo "LIB = ${db.out}/lib" > config.in
    echo "INCLUDE = ${db.dev}/include" >> config.in
  '';
}
```

Dependências em outros pacotes Perl podem ser especificadas nos atributos `buildInputs` e `propagatedBuildInputs`. Se algo é exclusivamente uma dependência de tempo de construção, use `buildInputs`; se for (também) uma dependência de tempo de execução, use `propagatedBuildInputs`. Por exemplo, isso constrói um módulo Perl que tem dependências de tempo de execução em vários outros módulos:

```nix
{
  ClassC3Componentised = buildPerlPackage rec {
    pname = "Class-C3-Componentised";
    version = "1.0004";
    src = fetchurl {
      url = "mirror://cpan/authors/id/A/AS/ASH/Class-C3-Componentised-${version}.tar.gz";
      hash = "sha256-ASO9rV/FzJYZ0BH572Fxm2ZrFLMZLFATJng1NuU4FHc=";
    };
    propagatedBuildInputs = [
      ClassC3
      ClassInspector
      TestException
      MROCompat
    ];
  };
}
```

### Geração a partir do CPAN {#ssec-generation-from-CPAN}

Expressões Nix para pacotes Perl podem ser geradas (quase) automaticamente a partir do CPAN. Isso é feito pelo programa `nix-generate-from-cpan`, que pode ser instalado da seguinte forma:

```ShellSession
$ nix-env -f "<nixpkgs>" -iA nix-generate-from-cpan
```

Substitua `<nixpkgs>` pelo caminho de um clone do nixpkgs para usar a versão mais recente.

Este programa recebe um nome de módulo Perl, o procura no CPAN, busca e descompacta o pacote correspondente, e imprime uma expressão Nix na saída padrão. Por exemplo:

```ShellSession
$ nix-generate-from-cpan XML::Simple
  XMLSimple = buildPerlPackage rec {
    pname = "XML-Simple";
    version = "2.22";
    src = fetchurl {
      url = "mirror://cpan/authors/id/G/GR/GRANTM/XML-Simple-2.22.tar.gz";
      hash = "sha256-uUUO8i6pZErl1q2ghtxDAPoQW+BQogMOvU79KMGY60k=";
    };
    propagatedBuildInputs = [ XMLNamespaceSupport XMLSAX XMLSAXExpat ];
    meta = {
      description = "API for simple XML files";
      license = with lib.licenses; [ artistic1 gpl1Plus ];
    };
  };
```

A saída pode ser colada em `pkgs/top-level/perl-packages.nix` ou em qualquer outro lugar que você precise.

### Compilação cruzada de módulos {#ssec-perl-cross-compilation}

Nixpkgs tem suporte experimental para compilação cruzada de módulos Perl. Em muitos casos, funcionará perfeitamente, mesmo para módulos com extensões nativas. Às vezes, no entanto, o Makefile.PL de um módulo pode (indiretamente) importar um módulo nativo. Nesse caso, você precisará criar um stub para esse módulo que satisfaça o Makefile.PL e instalá-lo em `lib/perl5/site_perl/cross_perl/${perl.version}`. Veja o `postInstall` para `DBI` para um exemplo.