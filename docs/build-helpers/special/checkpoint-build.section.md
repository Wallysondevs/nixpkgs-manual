# pkgs.checkpointBuildTools {#sec-checkpoint-build}

`pkgs.checkpointBuildTools` fornece uma maneira de construir *derivations* incrementalmente. Consiste em duas funções para tornar possíveis as *checkpoint builds* usando Nix.

Para hermeticidade, *derivations* do Nix não permitem que nenhum estado seja transferido entre *builds*, tornando impossível uma *build* incremental transparente dentro de uma *derivation*.

No entanto, podemos dizer ao Nix explicitamente qual era o estado anterior da *build*, representando esse estado anterior como uma saída de *derivation*. Isso permite que o estado de *build* passado seja usado para uma *build* incremental.

Para transformar uma *derivation* normal em uma *build* baseada em *checkpoint*, estas etapas devem ser seguidas:
  ```nix
  {
    checkpointArtifacts = (pkgs.checkpointBuildTools.prepareCheckpointBuild pkgs.virtualbox);
  }
  ```
  ```nix
  {
    changedVBox = pkgs.virtualbox.overrideAttrs (old: {
      src = path/to/vbox/sources;
    });
  }
  ```
  - use `mkCheckpointBuild changedVBox checkpointArtifacts`
  - desfrute de tempos de *build* mais curtos

## Exemplo {#sec-checkpoint-build-example}
```nix
{
  pkgs ? import <nixpkgs> { },
}:
let
  inherit (pkgs.checkpointBuildTools) prepareCheckpointBuild mkCheckpointBuild;
  helloCheckpoint = prepareCheckpointBuild pkgs.hello;
  changedHello = pkgs.hello.overrideAttrs (_: {
    doCheck = false;
    postPatch = ''
      sed -i 's/Hello, world!/Hello, Nix!/g' src/hello.c
    '';
  });
in
mkCheckpointBuild changedHello helloCheckpoint
```