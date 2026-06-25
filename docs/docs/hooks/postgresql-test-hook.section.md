# `postgresqlTestHook` {#sec-postgresqlTestHook}

Este hook inicia um servidor PostgreSQL durante a `checkPhase`. Exemplo:

```nix
{
  stdenv,
  postgresql,
  postgresqlTestHook,
}:
stdenv.mkDerivation {

  # ...

  nativeCheckInputs = [
    postgresql
    postgresqlTestHook
  ];
}
```

Se você usa uma `checkPhase` personalizada, lembre-se de adicionar as chamadas `runHook`:
```nix
checkPhase ''
  runHook preCheck

  # ... your tests

  runHook postCheck
''
```

## Variables {#sec-postgresqlTestHook-variables}

A lógica do hook lerá várias variáveis e as definirá com um valor padrão se não estiverem definidas ou estiverem vazias.

Variáveis exportadas:

 - `PGDATA`: localização dos arquivos do servidor.
 - `PGHOST`: localização do diretório do socket de domínio UNIX; o `host` padrão em uma string de conexão.
 - `PGUSER`: usuário para criar / fazer login, padrão: `test_user`.
 - `PGDATABASE`: nome do banco de dados, padrão: `test_db`.

Variáveis apenas para Bash:

 - `postgresqlTestUserOptions`: opções SQL a serem usadas ao criar a role `$PGUSER`, padrão: `"LOGIN"`. Exemplo: `"LOGIN SUPERUSER"`
 - `postgresqlTestSetupSQL`: comandos SQL a serem executados como administrador do banco de dados após a inicialização, padrão: instruções que criam `$PGUSER` e `$PGDATABASE`.
 - `postgresqlTestSetupCommands`: comandos bash a serem executados após o início do banco de dados, o padrão é executar `$postgresqlTestSetupSQL` como administrador do banco de dados.
 - `postgresqlEnableTCP`: defina como `1` para habilitar a escuta TCP. Instável; não recomendado.
 - `postgresqlStartCommands`: o padrão é `pg_ctl start`.
 - `postgresqlExtraSettings`: Configuração adicional para adicionar a `postgresql.conf`

## Hooks {#sec-postgresqlTestHook-hooks}

Vários hooks adicionais são executados em postgresqlTestHook

 - `postgresqlTestSetupPost`: executado depois que o postgresql for configurado.

## TCP and the Nix sandbox {#sec-postgresqlTestHook-tcp}

`postgresqlEnableTCP` depende do sandboxing de rede, que não está disponível no macOS e em algumas instalações personalizadas do Nix, resultando em testes instáveis.
Por essa razão, ele é desabilitado por padrão.

A solução preferida é fazer com que o conjunto de testes use uma conexão de socket de domínio UNIX. Este é o comportamento padrão quando nenhum parâmetro de conexão `host` é fornecido.
No entanto, alguns conjuntos de testes codificam um valor para `host`, então um patch pode ser necessário. Se você puder enviar o patch para o upstream, poderá fazer com que `host` use a variável de ambiente `PGHOST` por padrão quando definida. Caso contrário, você pode aplicar um patch localmente para omitir o parâmetro da string de conexão `host` completamente.

::: {.note}
O erro `libpq: failed (could not receive data from server: Connection refused` é geralmente uma indicação de que o conjunto de testes está tentando se conectar via TCP.
:::