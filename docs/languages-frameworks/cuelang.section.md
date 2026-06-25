# Cue (Cuelang) {#cuelang}

[Cuelang](https://cuelang.org/) é uma linguagem para:

- descrever esquemas e validar compatibilidade retroativa
- gerar código e esquemas em vários formatos (por exemplo, JSON Schema, OpenAPI)
- fazer configuração semelhante a [Dhall Lang](https://dhall-lang.org/)
- realizar validação de dados

## Guia rápido de esquema Cuelang {#cuelang-quickstart}

Os esquemas Cuelang são semelhantes a JSON, aqui está um guia rápido:

- Tipos padrão incluem: `null`, `string`, `bool`, `bytes`, `number`, `int`, `float`, listas como `[...T]` onde `T` é um tipo.
- Todas as estruturas, definidas por: `myStructName: { <fields> }` são **abertas** -- elas aceitam campos que não são especificados.
- Estruturas fechadas podem ser construídas fazendo `myStructName: close({ <fields> })` -- elas são estritas no que aceitam.
- `#X` são **definições**, definições referenciadas são **recursivamente fechadas**, ou seja, todas as suas estruturas filhas são **fechadas**.
- O operador `&` é o [operador de unificação](https://cuelang.org/docs/references/spec/#unification) (semelhante a um operador de fusão em nível de tipo), `|` é o [operador de disjunção](https://cuelang.org/docs/references/spec/#disjunction) (semelhante a um operador de união em nível de tipo).
- Valores **são** tipos, ou seja, `myStruct: { a: 3 }` é uma definição de tipo válida que permite apenas `3` como valor.

- Leia <https://cuelang.org/docs/concepts/logic/> para aprender mais sobre a semântica.
- Leia <https://cuelang.org/docs/references/spec/> para aprender sobre a especificação da linguagem.

## `writeCueValidator` {#cuelang-writeCueValidator}

Nixpkgs fornece um auxiliar `pkgs.writeCueValidator`, que escreverá um script de validação baseado no esquema Cuelang fornecido.

Aqui está um exemplo:
```nix
pkgs.writeCueValidator (pkgs.writeText "schema.cue" ''
  #Def1: {
    field1: string
  }
'') { document = "#Def1"; }
```

- O primeiro parâmetro é o arquivo de esquema Cue.
- O segundo parâmetro é um parâmetro de opções, atualmente, apenas: `document` pode ser passado.

`document` : compara seus dados de entrada com este fragmento de estrutura ou definição, por exemplo, você pode usar o mesmo arquivo de esquema, mas documentos diferentes com base nos dados que está validando.

Outro exemplo, dado o seguinte `validator.nix` :
```nix
{
  pkgs ? import <nixpkgs> { },
}:
let
  genericValidator =
    version:
    pkgs.writeCueValidator (pkgs.writeText "schema.cue" ''
      #Version1: {
        field1: string
      }
      #Version2: #Version1 & {
        field1: "unused"
      }'') { document = "#Version${toString version}"; };
in
{
  validateV1 = genericValidator 1;
  validateV2 = genericValidator 2;
}
```

O resultado é um script que validará o arquivo que você passa como primeiro argumento contra o esquema que você forneceu a `writeCueValidator`.

Pode ser qualquer formato que `cue vet` suporte, ou seja, YAML ou JSON, por exemplo.

Aqui está um exemplo, nomeado `example.json`, dado o seguinte JSON:
```
{ "field1": "abc" }
```

Você pode executar o script resultante (nomeado `validate`) da seguinte forma:

```console
$ nix-build validator.nix
$ ./result example.json
$ ./result-2 example.json
field1: conflicting values "unused" and "abc":
    ./example.json:1:13
    ../../../../../../nix/store/v64dzx3vr3glpk0cq4hzmh450lrwh6sg-schema.cue:5:11
$ sed -i 's/"abc"/3/' example.json
$ ./result example.json
field1: conflicting values 3 and string (mismatched types int and string):
    ./example.json:1:13
    ../../../../../../nix/store/v64dzx3vr3glpk0cq4hzmh450lrwh6sg-schema.cue:5:11
```

**Limitações conhecidas**

* O script aplicará valores **concretos** e não aceitará transformações com perda (rigidez). Você pode adicionar essas opções se precisar delas.