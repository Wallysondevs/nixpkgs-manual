# `redisTestHook` {#sec-redisTestHook}

Este hook inicia um servidor Redis durante a `checkPhase`. Exemplo:

```nix
{
  stdenv,
  redis,
  redisTestHook,
}:
stdenv.mkDerivation {

  # ...

  nativeCheckInputs = [ redisTestHook ];
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

## Variables {#sec-redisTestHook-variables}

A lógica do hook lerá as seguintes variáveis e as definirá para um valor padrão se não estiverem definidas ou estiverem vazias.

Variáveis exportadas:

- `REDIS_SOCKET`: caminho do socket de domínio UNIX

Variáveis apenas para Bash:

- `redisTestPort`: Porta a ser usada pelo Redis. O padrão é `6379`

Exemplo de uso:

```nix
{
  stdenv,
  redis,
  redisTestHook,
}:
stdenv.mkDerivation {

  # ...

  nativeCheckInputs = [ redisTestHook ];

  preCheck = ''
    redisTestPort=6390;
  '';
}
```