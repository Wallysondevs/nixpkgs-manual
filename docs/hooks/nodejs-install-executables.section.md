# nodejsInstallExecutables {#nodejs-install-executables}

Hook para empacotar executáveis Node.js.
Criado principalmente para um ambiente multi-linguagem.

## Exemplos {#nodejs-install-executables-example}

[](#npm-build-hook-example-snippet)

## Variáveis que controlam `nodejsInstallExecutables` {#nodejs-install-executables-variables}

### Variáveis Exclusivas de `nodejsInstallExecutables` {#nodejs-install-executables-exclusive-variables}

#### `makeWrapperArgs` {#nodejs-install-executables-wrapper-args}

Flags para passar para a chamada de [`makeWrapper`](#fun-makeWrapper).
Para evitar empacotamento duplo, esta flag também pode ser acessada em Bash.

```nix
stdenv.mkDerivation (finalAttrs: {
  #...
  dontWrapGApps = true;

  postInstall = ''
    makeWrapperArgs+=("''${gappsWrapperArgs[@]}")
  '';
  #...
})
```