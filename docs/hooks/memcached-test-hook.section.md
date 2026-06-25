# `memcachedTestHook` {#sec-memcachedTestHook}

Este hook inicia um servidor Memcached durante a `checkPhase`. Exemplo:

```nix
{ stdenv, memcachedTestHook }:
stdenv.mkDerivation {

  # ...

  nativeCheckInputs = [ memcachedTestHook ];
}
```

Se você usar uma `checkPhase` personalizada, lembre-se de adicionar as chamadas `runHook`:
```nix
{
  checkPhase = ''
    runHook preCheck

    # ... your tests

    runHook postCheck
  '';
}
```

## Variáveis {#sec-memcachedTestHook-variables}

Variáveis apenas para Bash:

 - `memcachedTestPort`: Porta a ser usada pelo Memcached. O padrão é `11211`

Exemplo de uso:

```nix
{ stdenv, memcachedTestHook }:
stdenv.mkDerivation {

  # ...

  nativeCheckInputs = [ memcachedTestHook ];

  preCheck = ''
    memcachedTestPort=1234;
  '';
}
```