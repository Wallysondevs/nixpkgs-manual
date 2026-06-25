# Elm {#sec-elm}

Para iniciar um ambiente de desenvolvimento, execute:

```ShellSession
nix-shell -p elmPackages.elm elmPackages.elm-format
```

Para atualizar o compilador Elm, consulte `nixpkgs/pkgs/development/compilers/elm/README.md`.

Para empacotar aplicações Elm, [leia sobre elm2nix](https://github.com/hercules-ci/elm2nix#elm2nix).