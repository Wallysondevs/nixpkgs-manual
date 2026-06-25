# Tcl {#sec-language-tcl}

## Guia do usuário {#sec-language-tcl-user-guide}

Interpretadores Tcl estão disponíveis sob os atributos `tcl` e `tcl-X_Y`, onde `X_Y` é a versão do Tcl.

Bibliotecas Tcl estão disponíveis no conjunto de atributos `tclPackages`. Elas são garantidas para funcionar apenas com a versão padrão do Tcl, mas provavelmente também funcionarão com outras graças ao [mecanismo de stubs](https://wiki.tcl-lang.org/page/Stubs).

## Guia de empacotamento {#sec-language-tcl-packaging}

Pacotes Tcl são tipicamente construídos com `tclPackages.mkTclDerivation`. Dependências Tcl vão em `buildInputs`/`nativeBuildInputs`/... como outros pacotes. Para definições de pacotes mais complexas, como pacotes com linguagens mistas, use `tcl.tclPackageHook`.

Sempre que possível, certifique-se de habilitar stubs para máxima compatibilidade. Se você estiver usando `mkTclDerivation`, `--enable-stubs` será automaticamente adicionado a `configureFlags`.

Aqui está um exemplo de pacote simples a ser chamado com `tclPackages.callPackage`.

```
{ lib, fetchzip, mkTclDerivation, openssl }:

mkTclDerivation (finalAttrs: {
  pname = "tcltls";
  version = "1.7.22";

  src = fetchzip {
    url = "https://core.tcl-lang.org/tcltls/uv/tcltls-${finalAttrs.version}.tar.gz";
    hash = "sha256-TOouWcQc3MNyJtaAGUGbaQoaCWVe6g3BPERct/V65vk=";
  };

  buildInputs = [ openssl ];

  configureFlags = [
    "--with-ssl-dir=${openssl.dev}"
  ];

  meta = {
    homepage = "https://core.tcl-lang.org/tcltls/index";
    description = "OpenSSL / RSA-bsafe Tcl extension";
    maintainers = [ lib.maintainers.agbrooks ];
    license = lib.licenses.tcltk;
    platforms = lib.platforms.unix;
  };
})
```

Todas as bibliotecas Tcl são declaradas em `pkgs/top-level/tcl-packages.nix` e são definidas em `pkgs/development/tcl-modules/`. Se possível, prefira a hierarquia por nome em `pkgs/development/tcl-modules/by-name/`. Seu uso está documentado em `pkgs/development/tcl-modules/by-name/README.md`.

Todas as aplicações Tcl residem em outro lugar. Caso um pacote seja usado tanto como biblioteca quanto como aplicação (por exemplo `expect`), ele deve ser definido em `tcl-packages.nix`, com um alias em outro lugar.

### Usando tclRequiresCheck {#using-tclrequirescheck}

Embora testes de unidade sejam altamente preferidos para validar a correção de um pacote, nem todos os pacotes possuem suítes de teste que podem ser executadas facilmente, e alguns não possuem nenhuma. Para ajudar a garantir que o pacote ainda funcione, [`tclRequiresCheck`](#using-tclrequirescheck) pode tentar `package require` os módulos listados.

```nix
{
  tclRequiresCheck = [
    "json"
    "doctools"
  ];
}
```

traduz-se aproximadamente para:

```nix
{
  preDist = ''
    TCLLIBPATH="$out/lib $TCLLIBPATH"
    tclsh <<<'exit [catch {package require json; package require doctools}]'
  '';
}
```

No entanto, isso é feito em sua própria fase, e não depende se [`doCheck = true;`](#var-stdenv-doCheck).

Isso também pode ser útil para verificar se o pacote não assume pacotes comumente presentes (por exemplo, `tcllib`).