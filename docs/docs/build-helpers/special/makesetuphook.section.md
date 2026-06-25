# pkgs.makeSetupHook {#sec-pkgs.makeSetupHook}

`pkgs.makeSetupHook` é um auxiliar de construção que produz hooks que vão para `nativeBuildInputs`

## Uso {#sec-pkgs.makeSetupHook-usage}

```nix
pkgs.makeSetupHook {
  name = "something-hook";
  propagatedBuildInputs = [ pkgs.commandsomething ];
  depsTargetTargetPropagated = [ pkgs.libsomething ];
} ./script.sh
```

### hook de setup que depende do pacote hello e executa hello e @shell@ é substituído pelo caminho para bash {#sec-pkgs.makeSetupHook-usage-example}

```nix
pkgs.makeSetupHook
  {
    name = "run-hello-hook";
    # Coloque as dependências aqui se elas tiverem hooks ou dependências necessárias propagadas
    # caso contrário, prefira caminhos diretos para executáveis.
    propagatedBuildInputs = [
      pkgs.hello
      pkgs.cowsay
    ];
    substitutions = {
      shell = "${pkgs.bash}/bin/bash";
      cowsay = "${pkgs.cowsay}/bin/cowsay";
    };
  }
  (
    writeScript "run-hello-hook.sh" ''
      #!@shell@
      # o caminho direto para o executável deve estar aqui porque
      # isso será executado quando o arquivo for "sourced"
      # momento em que '$PATH' ainda não foi populado com as entradas
      @cowsay@ cow

      _printHelloHook() {
        hello
      }
      preConfigureHooks+=(_printHelloHook)
    ''
  )
```

## Atributos {#sec-pkgs.makeSetupHook-attributes}

*   `name` Define o nome do hook.
*   `propagatedBuildInputs` Dependências de tempo de execução (como binários) do hook.
*   `depsTargetTargetPropagated` Dependências não-binárias.
*   `meta`
*   `passthru`
*   `substitutions` Variáveis para `substituteAll`