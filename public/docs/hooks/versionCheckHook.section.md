# versionCheckHook {#versioncheckhook}

Este hook adiciona uma `versionCheckPhase` aos [`preInstallCheckHooks`](#ssec-installCheck-phase) que executa o programa principal da derivation com um argumento `--help` ou `--version`, e verifica se a string `${version}` é encontrada nessa saída. Se esta verificação falhar, toda a build falhará. _(Uma opção mais suave é [`testers.testVersion`](#tester-testVersion).)_

Você o usa assim:

```nix
{
  lib,
  stdenv,
  versionCheckHook,
  # ...
}:

stdenv.mkDerivation (finalAttrs: {
  # ...

  nativeInstallCheckInputs = [ versionCheckHook ];
  doInstallCheck = true;

  # ...
})
```

Observe que para [`buildPythonPackage`](#buildpythonpackage-function) e [`buildPythonApplication`](#buildpythonapplication-function), `doInstallCheck` é habilitado por padrão.

Ele faz isso em um ambiente limpo (usando `env --ignore-environment`), e verifica a string `${version}` tanto no `stdout` quanto no `stderr` do comando. Ele reportará no log da build a saída que recebeu e falhará a build se não conseguir encontrar `${version}`.

As variáveis que esta fase controla são:

- `dontVersionCheck`: Desabilita a adição deste hook aos [`preInstallCheckHooks`](#ssec-installCheck-phase). Útil se você quiser carregar as funções bash do hook, mas executá-las de forma diferente.
- `versionCheckProgram`: O caminho completo para o programa que deve imprimir a string `${version}`. O padrão é usar o primeiro valor não vazio `$binary` de `${NIX_MAIN_PROGRAM}` e `${pname}`, nessa ordem, para construir aproximadamente `${placeholder "out"}/bin/$binary`. O valor de `${NIX_MAIN_PROGRAM}` vem de `meta.mainProgram`, e normalmente não precisa ser definido explicitamente. Ao definir `versionCheckProgram`, usar `$out` diretamente não funcionará, pois as variáveis de ambiente desta variável não são expandidas pelo hook. Portanto, usar `placeholder "out"` é inevitável.
- `versionCheckProgramArg`: O argumento que precisa ser passado para `versionCheckProgram`. Se indefinido, o hook tenta primeiro `--version` e depois `--help`. Exemplos: `version`, `-V`, `-v`.
- `versionCheckKeepEnvironment`: Uma lista de variáveis de ambiente para manter e passar para o comando. Apenas as variáveis que são realmente necessárias para o comando de versão funcionar devem ser adicionadas a esta lista. Se não for viável listar explicitamente todas essas variáveis de ambiente, você pode definir este parâmetro para o valor especial `"*"` para desabilitar a flag `--ignore-environment` e, assim, manter todas as variáveis de ambiente.
- `preVersionCheck`: Um hook para executar antes que a verificação seja feita.
- `postVersionCheck`: Um hook para executar depois que a verificação é feita.

Esta verificação assume que o executável é _hermético_. Se variáveis de ambiente como `PATH` ou `HOME` são necessárias para o programa funcionar, então [`testers.testVersion`](#tester-testVersion) é atualmente a melhor alternativa.