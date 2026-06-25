# `juce.projucerHook` {#juce-projucer-hook}

[Projucer](https://juce.com/tutorials/tutorial_new_projucer_project/) é um utilitário gráfico de gerenciamento de projetos e sistema de compilação para o framework de programação de áudio [JUCE](https://juce.com/). Ele está disponível no nixpkgs sob o pacote `juce`.

O hook de configuração `juce.projucerHook` sobrescreve as fases de configuração e instalação. Ele é suportado apenas no Linux e requer que o arquivo `.jucer` do seu projeto contenha um exportador `LinuxMakefile`.

## Exemplo {#juce-projucer-hook-example}

```nix
{
  juce,
  stdenv,
}:
stdenv.mkDerivation {
  # ...
  nativeBuildInputs = [ juce.projucerHook ];

  jucerFile = "Microbiome.jucer";

  dontUseProjucerInstall = true;
  # ...
}
```

## Variáveis que controlam `juce.projucerHook` {#juce-projucer-hook-variables}

### `dontUseProjucerConfigure`

Desabilita `projucerConfigurePhase`

### `dontUseProjucerInstall`

Desabilita `projucerInstallPhase`