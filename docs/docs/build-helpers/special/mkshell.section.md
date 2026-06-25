# pkgs.mkShell {#sec-pkgs-mkShell}

`pkgs.mkShell` é um `stdenv.mkDerivation` especializado que remove alguma repetição ao usá-lo com `nix-shell` (ou `nix develop`).

## Uso {#sec-pkgs-mkShell-usage}

Aqui está um exemplo de uso comum:

```nix
{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  packages = [ pkgs.gnumake ];

  inputsFrom = [
    pkgs.hello
    pkgs.gnutar
  ];

  shellHook = ''
    export DEBUG=1
  '';
}
```

## Atributos {#sec-pkgs-mkShell-attributes}

*   `name` (padrão: `nix-shell`). Define o nome da derivation.
*   `packages` (padrão: `[]`). Adiciona pacotes executáveis ao ambiente `nix-shell`.
*   `inputsFrom` (padrão: `[]`). Adiciona dependências de construção das derivations listadas ao ambiente `nix-shell`.
*   `shellHook` (padrão: `""`). Comandos Bash que são executados por `nix-shell`.

... todos os atributos de `stdenv.mkDerivation`.

## Variantes {#sec-pkgs-mkShell-variants}

`pkgs.mkShellNoCC` é uma variante que usa `stdenvNoCC` em vez de `stdenv` como ambiente base. Isso é útil se nenhum compilador C for necessário no ambiente do shell.

## Construindo o shell {#sec-pkgs-mkShell-building}

A saída desta derivation conterá um arquivo de texto que faz referência a todas as entradas de construção. Isso é útil em CI onde queremos garantir que cada derivation, e suas dependências, sejam construídas corretamente. Ou ao criar uma raiz GC para que as dependências de construção não sejam coletadas pelo coletor de lixo.