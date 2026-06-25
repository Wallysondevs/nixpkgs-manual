# udevCheckHook {#udevcheckhook}

A `derivation` `udevCheckHook` adiciona `udevCheckPhase` aos [`preInstallCheckHooks`](#ssec-installCheck-phase), que encontra todas as regras udev em todas as saídas e as verifica usando `udevadm verify --resolve-names=never --no-style`. Deve ser usado em qualquer pacote que tenha saídas de regras udev para garantir que as regras sejam e permaneçam válidas.

O hook é executado em `installCheckPhase`, exigindo que `doInstallCheck` esteja habilitado para que o hook tenha efeito:
```nix
{
  lib,
  stdenv,
  udevCheckHook,
  # ...
}:

stdenv.mkDerivation (finalAttrs: {
  # ...

  nativeInstallCheckInputs = [ udevCheckHook ];
  doInstallCheck = true;

  # ...
})
```
Note que para [`buildPythonPackage`](#buildpythonpackage-function) e [`buildPythonApplication`](#buildpythonapplication-function), `doInstallCheck` é habilitado por padrão.

Todas as saídas são escaneadas em busca de seus caminhos `/{etc,lib}/udev/rules.d`. Se nenhuma saída de regra for encontrada, o hook é basicamente uma operação nula.

O `udevCheckHook` adiciona uma dependência em `systemdMinimal`. Ele é internamente protegido por `hostPlatform` que suporta udev e `buildPlatform` sendo capaz de executar `udevadm`. O hook não precisa de verificações explícitas de plataforma nos locais onde é usado.

O hook pode ser desabilitado usando `dontUdevCheck`, o que é necessário se você quiser executar alguma tarefa diferente em `installCheckPhase` em um pacote com saídas de regras udev quebradas.