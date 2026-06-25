# Qt {#sec-language-qt}

Escrever expressões Nix para bibliotecas e aplicações Qt é em grande parte semelhante ao que se faz para outros softwares C++. Esta seção pressupõe algum conhecimento deste último.

A principal ressalva com aplicações Qt é que o Qt usa um sistema de plugins para carregar módulos adicionais em tempo de execução. No Nixpkgs, nós "envolvemos" (wrap) aplicações Qt para injetar variáveis de ambiente que informam ao Qt onde descobrir os plugins e módulos QML necessários.

Isso efetivamente torna as dependências de tempo de execução puras e explícitas em tempo de compilação, ao custo de introduzir uma indireção extra.

## Expressão Nix para um pacote Qt (default.nix) {#qt-default-nix}

```nix
{ stdenv, qt6 }:

stdenv.mkDerivation {
  pname = "myapp";
  version = "1.0";

  buildInputs = [ qt6.qtbase ];
  nativeBuildInputs = [ qt6.wrapQtAppsHook ];
}
```

O mesmo se aplica ao Qt 5, onde as bibliotecas e ferramentas estão sob `libsForQt5`.

Qualquer pacote Qt deve incluir `wrapQtAppsHook` em `nativeBuildInputs`, ou definir explicitamente `dontWrapQtApps` para ignorar a geração dos wrappers.

## Pacotes que suportam múltiplas versões do Qt {#qt-versions}

Se o seu pacote é uma biblioteca que pode ser construída com múltiplas versões do Qt, você pode querer usar módulos Qt como argumentos separados (`qtbase`, `qtdeclarative` etc.), e invocar o pacote de `pkgs/top-level/qt5-packages.nix` ou `pkgs/top-level/qt6-packages.nix` usando as respectivas funções `callPackage`.

Aplicações devem geralmente ser construídas com a versão do Qt preferida pelo upstream.

## Localizando dependências adicionais de tempo de execução {#qt-runtime-dependencies}

Adicione entradas a `qtWrapperArgs` para modificar os wrappers criados por
`wrapQtAppsHook`:

```nix
{ stdenv, qt6 }:

stdenv.mkDerivation {
  # ...
  nativeBuildInputs = [ qt6.wrapQtAppsHook ];
  qtWrapperArgs = [ "--prefix PATH : /path/to/bin" ];
}
```

As entradas são passadas como argumentos para [wrapProgram](#fun-wrapProgram).

Se você precisa de mais controle sobre o processo de "wrapping", defina `dontWrapQtApps` para desabilitar a geração automática de wrappers,
e então crie wrappers manualmente em `fixupPhase`, usando `wrapQtApp`, que por si só é um pequeno wrapper sobre [wrapProgram](#fun-wrapProgram):

Os argumentos `makeWrapper` necessários para Qt também são expostos no ambiente como `$qtWrapperArgs`.

```nix
{
  stdenv,
  lib,
  wrapQtAppsHook,
}:

stdenv.mkDerivation {
  # ...
  nativeBuildInputs = [ wrapQtAppsHook ];
  dontWrapQtApps = true;
  preFixup = ''
    wrapQtApp "$out/bin/myapp" --prefix PATH : /path/to/bin
  '';
}
```

::: {.note}
`wrapQtAppsHook` ignora arquivos que não são executáveis ELF.
Isso significa que scripts não serão automaticamente "envolvidos" (wrapped), então você precisará envolvê-los manualmente como mencionado anteriormente.
Um exemplo de quando você sempre precisaria fazer isso é com aplicações Python que usam PyQt.
:::