# overlay prefer-remote-fetch {#sec-prefer-remote-fetch}

`prefer-remote-fetch` é um overlay que baixa fontes em um *builder* remoto. Isso é útil quando a máquina de avaliação tem um upload lento, enquanto o *builder* pode buscar mais rapidamente, diretamente da fonte. Para usá-lo, coloque o seguinte trecho como um novo overlay:

```nix
self: super: (super.prefer-remote-fetch self super)
```

Um exemplo completo de configuração que configura o overlay para sua própria conta pode ser assim:

```ShellSession
$ mkdir ~/.config/nixpkgs/overlays/
$ cat > ~/.config/nixpkgs/overlays/prefer-remote-fetch.nix <<EOF
  self: super: super.prefer-remote-fetch self super
EOF
```