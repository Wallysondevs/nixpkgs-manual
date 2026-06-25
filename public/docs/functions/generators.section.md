# Geradores {#sec-generators}
Geradores são funções que criam formatos de arquivo a partir de estruturas de dados Nix, por exemplo, para arquivos de configuração. Existem geradores disponíveis para: `INI`, `JSON` e `YAML`.

Todos os geradores seguem uma interface de chamada similar: `generatorName configFunctions data`, onde `configFunctions` é um attrset de funções definidas pelo usuário que formatam partes aninhadas do conteúdo. Cada um deles possui padrões comuns, então frequentemente não precisam ser definidos manualmente. Um exemplo é `mkSectionName` do gerador `INI`, que por padrão é `(name: libStr.escape [ "[" "]" ] name)`. Ele recebe o nome de uma seção e o sanitiza. O `mkSectionName` padrão escapa `[` e `]` com uma barra invertida.

Os geradores podem ser ajustados para produzir exatamente o formato de arquivo exigido pela sua aplicação/serviço. Um exemplo é um formato de arquivo INI que usa `: ` como separador, as strings `"yes"` e `"no"` como valores booleanos, e exige que todos os valores de string sejam entre aspas:

```nix
let
  inherit (lib) generators isString;

  customToINI = generators.toINI {
    # specifies how to format a key/value pair
    mkKeyValue = generators.mkKeyValueDefault {
      # specifies the generated string for a subset of nix values
      mkValueString =
        v:
        if v == true then
          ''"yes"''
        else if v == false then
          ''"no"''
        else if isString v then
          ''"${v}"''
        # and delegates all other values to the default generator
        else
          generators.mkValueStringDefault { } v;
    } ":";
  };

  # the INI file can now be given as plain old nix values
in
customToINI {
  main = {
    pushinfo = true;
    autopush = false;
    host = "localhost";
    port = 42;
  };
  mergetool = {
    merge = "diff3";
  };
}
```

Isso produzirá o seguinte arquivo INI como uma string Nix:

```INI
[main]
autopush:"no"
host:"localhost"
port:42
pushinfo:"yes"
str\:ange:"very::strange"

[mergetool]
merge:"diff3"
```

::: {.note}
Caminhos do Nix store podem ser convertidos para strings envolvendo um atributo de derivation assim: `"${drv}"`.
:::

A documentação detalhada para cada gerador pode ser encontrada [aqui](#sec-functions-library-generators)