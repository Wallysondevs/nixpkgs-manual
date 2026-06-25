# Genérico {#modules-generic}

Módulos genéricos podem ser importados para estender configurações de qualquer [classe].

## `meta-maintainers.nix` {#modules-generic-meta-maintainers}

As opções abaixo ficam disponíveis ao usar `imports = [ (nixpkgs + "/modules/generic/meta-maintainers.nix") ];`.

```{=include=} options
id-prefix: opt-modules-generic-meta-maintainers-
list-id: configuration-variable-list
source: ../options-modules-generic-meta-maintainers.json
```

[class]: https://nixos.org/manual/nixpkgs/unstable/#module-system-lib-evalModules-param-class