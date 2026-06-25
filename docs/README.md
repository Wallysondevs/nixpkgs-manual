# Contribuindo para o manual de referência do Nixpkgs

Este diretório contém os arquivos-fonte para o manual de referência do Nixpkgs.

> [!IMPORTANTE]
> Estamos reestruturando ativamente nossa documentação para seguir o [framework Diátaxis](https://diataxis.fr/)
>
> De agora em diante, este diretório deve conter **apenas** [documentação de referência](https://nix.dev/contributing/documentation/diataxis#reference).
> Para tutoriais, guias e explicações, contribua para <https://nix.dev/>.
>
> Estamos trabalhando ativamente para gerar **toda** a documentação de referência a partir dos [doc-comments](https://github.com/NixOS/rfcs/blob/master/rfcs/0145-doc-strings.md) presentes no código.
> Isso também oferece o benefício de usar `:doc` no `nix repl` para visualizar a documentação de referência localmente e em tempo real.

Para documentação relevante apenas para contribuidores, use arquivos Markdown ao lado do código-fonte e comentários de código regulares.

> [!DICA]
> O feedback para melhorar o suporte à análise e renderização de doc-comments é muito apreciado.
> [Abra uma issue](https://github.com/NixOS/nixpkgs/issues/new?labels=6.topic%3A+documentation&title=Doc%3A+) para solicitar correções de bugs ou novos recursos.

Documentação renderizada:
- [Unstable (from master)](https://nixos.org/manual/nixpkgs/unstable/)
- [Stable (from latest release)](https://nixos.org/manual/nixpkgs/stable/)

A ferramenta de renderização é [nixos-render-docs](../pkgs/by-name/ni/nixos-render-docs), às vezes abreviada como `nrd`.

## Contribuindo para esta documentação

Você pode verificar rapidamente suas edições com `nix-build`:

```ShellSession
$ cd /path/to/nixpkgs
$ nix-build doc
```

Se a compilação for bem-sucedida, o manual estará em `./result/share/doc/nixpkgs/manual.html`.

### Ambiente de desenvolvimento

Para reduzir a repetição, considere usar as ferramentas do ambiente de desenvolvimento fornecido:

Carregue-o do diretório de documentação do Nixpkgs com

```ShellSession
$ cd /path/to/nixpkgs/doc
$ nix-shell
```

Para carregar os utilitários de desenvolvimento automaticamente ao entrar nesse diretório, [configure o `nix-direnv`](https://nix.dev/guides/recipes/direnv).

Certifique-se de que seus arquivos locais não sejam adicionados ao histórico do Git, adicionando as seguintes linhas a `.git/info/exclude` na raiz do repositório Nixpkgs:

```
/**/.envrc
/**/.direnv
```

#### `devmode`

Use [`devmode`](../pkgs/by-name/de/devmode/README.md) para uma pré-visualização ao vivo ao editar o manual.

### Testando redirecionamentos

Depois de ter uma compilação bem-sucedida, você pode abrir o HTML relevante (caminho mencionado acima) em um navegador junto com a âncora e observar o redirecionamento.

Observe que, se você já carregou a página e *depois* inseriu a âncora, precisará recarregar.
Isso ocorre porque os navegadores não executam novamente o código JS do cliente quando apenas a âncora foi alterada.

## Sintaxe

De acordo com a [RFC 0072](https://github.com/NixOS/rfcs/pull/72), todo o novo conteúdo de documentação deve ser escrito no dialeto Markdown [CommonMark](https://commonmark.org/).

Extensões de sintaxe adicionais estão disponíveis, todas as quais podem ser usadas na documentação de opções do NixOS.
As seguintes extensões são atualmente usadas:

#### Tabelas

Tabelas, usando a [sintaxe Markdown estilo GitHub](https://github.github.com/gfm/#tables-extension-).

#### Âncoras

Âncoras **explicitamente definidas** em títulos, para permitir a ligação a seções.
Estas devem ser sempre usadas, para garantir que as âncoras possam ser ligadas mesmo quando o texto do título muda, e para evitar conflitos entre [identificadores atribuídos automaticamente](https://github.com/jgm/commonmark-hs/blob/master/commonmark-extensions/test/auto_identifiers.md).

Ele usa a sintaxe de [atributos de cabeçalho](https://github.com/jgm/commonmark-hs/blob/master/commonmark-extensions/test/attributes.md) amplamente compatível:

```markdown
## Syntax {#sec-contributing-markup}
```

> [!Nota]
> A documentação de opções do NixOS não suporta títulos em geral.

#### Âncoras Inline

Permitem a ligação a um local arbitrário no texto (por exemplo, itens de lista individuais, frases...).

Elas são definidas usando um híbrido da sintaxe de link com a sintaxe de atributos conhecida de títulos, chamada [bracketed spans](https://github.com/jgm/commonmark-hs/blob/master/commonmark-extensions/test/bracketed_spans.md):

```markdown
- []{#ssec-gnome-hooks-glib} `glib` setup hook will populate `GSETTINGS_SCHEMAS_PATH` and then `wrapGApps*` hook will prepend it to `XDG_DATA_DIRS`.
```

#### Links automáticos

Se você **omitir um texto de link** para um link apontando para uma seção, o texto será substituído automaticamente.
Por exemplo `[](#chap-contributing)`.

Esta sintaxe é retirada do [MyST](https://myst-parser.readthedocs.io/en/latest/using/syntax.html#targets-and-cross-referencing).

#### HTML

A incorporação de HTML não é permitida.
Partes da documentação são renderizadas em vários formatos não-HTML, como páginas man no caso do manual do NixOS.

#### Papéis

Se você quiser linkar para uma página man, você pode usar `` {manpage}`nix.conf(5)` ``.
As referências se transformarão em links quando um mapeamento existir em [`doc/manpage-urls.json`](./manpage-urls.json).
Por favor, mantenha o arquivo `manpage-urls.json` ordenado alfabeticamente.

Algumas marcações para outros tipos de literais também estão disponíveis:

- `` {command}`rm -rfi` ``
- `` {env}`XDG_DATA_DIRS` ``
- `` {file}`/etc/passwd` ``
- `` {option}`networking.useDHCP` ``
- `` {var}`/etc/passwd` ``

Esses tipos literais são usados principalmente na documentação de opções do NixOS.

Esta sintaxe é retirada do [MyST](https://myst-parser.readthedocs.io/en/latest/syntax/syntax.html#roles-an-in-line-extension-point).
No entanto, o recurso se origina do [reStructuredText](https://www.sphinx-doc.org/en/master/usage/restructuredtext/roles.html#role-manpage) com uma sintaxe ligeiramente diferente.
Eles são tratados por `myst_role` definido por renderizador. <!-- reverse references in code -->

#### Admoestações

Destacadas do texto para chamar a atenção para algo.

Ele usa a sintaxe de [fenced `div`s](https://github.com/jgm/commonmark-hs/blob/master/commonmark-extensions/test/fenced_divs.md) do pandoc:

```markdown
::: {.warning}
This is a warning
:::
```

Os seguintes são suportados:

- `caution`
- `important`
- `note`
- `tip`
- `warning`
- `example`

Admoestações de exemplo requerem um título para funcionar.
Se você não fornecer um, o manual não será compilado.

```markdown
::: {.example #ex-showing-an-example}

# Title for this example

Text for the example.
:::
```

#### [Listas de definição](https://github.com/jgm/commonmark-hs/blob/master/commonmark-extensions/test/definition_lists.md)

Para definir um grupo de termos:

```markdown
pear
:   green or yellow bulbous fruit

watermelon
:   green fruit with red flesh
```

## Convenções de commit

- Certifique-se de ler sobre as [convenções de commit](../CONTRIBUTING.md#commit-conventions) comuns ao Nixpkgs como um todo.

- Se estiver criando um commit puramente para alterações de documentação, formate a mensagem do commit da seguinte maneira:

  ```
  doc: (documentation summary)

  (Motivation for change, relevant links, additional information.)
  ```

  Exemplos:

  * doc: update the kernel config documentation to use `nix-shell`
  * doc: add information about `nix-update-script`

    Closes #216321.

- Se o commit contiver mais do que apenas alterações de documentação, siga o formato da mensagem de commit relevante para o restante das alterações.

## Convenções de documentação

Em um esforço para manter o manual do Nixpkgs em um estilo consistente, siga as convenções abaixo, a menos que elas o impeçam de documentar algo adequadamente.
Nesse caso, por favor, abra uma issue sobre a convenção de documentação específica e marque-a com a etiqueta "needs: documentation".
Quando necessário, cada convenção explica por que existe, para que você possa tomar uma decisão sobre segui-la ou não com base no seu caso particular.
Observe que essas convenções são sobre a **estrutura** do manual (e seus arquivos-fonte), e não sobre o conteúdo que nele é inserido.
Você, como escritor da documentação, ainda é responsável pelo seu conteúdo.

### Uma frase por linha

Coloque cada frase em sua própria linha.
Isso torna as revisões e sugestões muito mais fáceis, já que o sistema de revisão do GitHub é baseado em linhas.
Também ajuda a identificar frases longas rapidamente.

Nem tudo foi migrado para este formato ainda.
Por favor, sempre use-o para novos conteúdos.
Ao alterar conteúdo existente, atualize a formatação se possível, mas evite diffs excessivos.

### Exemplos primeiro

Os leitores olham os exemplos primeiro: um exemplo comunica o que algo faz mais rápido do que uma descrição.
Coloque os exemplos antes das explicações detalhadas.

Prefira esta estrutura para cada item documentado:

1. Título
2. Resumo (opcional, máximo uma frase, o exemplo geralmente fala por si)
3. Exemplo
4. Explicação (detalhes, casos extremos, tipos, padrões)

Por exemplo:

````markdown
## `lib.toUpper`

Converts all characters in a string to uppercase.

:::{.example #ex-lib-toUpper}
# Converting a string to uppercase
```nix
lib.toUpper "hello"
=> "HELLO"
```

:::

Only acts on ASCII characters.
Unicode characters are passed through unchanged.
````

Atua apenas em caracteres ASCII.
Caracteres Unicode são passados sem alterações.

### Escrevendo Documentação de Função

A documentação de função é *documentação de referência*, para a qual
[documentação de referência diataxis](https://diataxis.fr/reference/) (8 minutos) é **leitura obrigatória**.

Além do framework diataxis, que oferece uma perspectiva equilibrada sobre o que a documentação de referência deve conter, aplicamos uma regra de estilo específica à documentação de funções:
a primeira frase está no presente, voz ativa, e o sujeito é omitido, referindo-se implicitamente ao nome da função.
Por exemplo:

```nix
/**
  Subtracts value `b` from value `a`.

  Returns the difference as a number.
*/
subtractValues # ...elided code
```

Renderiza como:

```md
## `subtractValues`

Subtracts value `b` from value `a`.

Returns the difference as a number.
```

### Destaques e exemplos

Use a [sintaxe de admoestação](#admonitions) para destaques e exemplos.

### Forneça exemplos autocontidos

Forneça pelo menos um exemplo por função e torne os exemplos autocontidos.
Isso é mais fácil de entender para iniciantes.
Também ajuda a testar se realmente funciona – especialmente quando introduzimos automação.

O código de exemplo deve ser tal que possa ser passado para `pkgs.callPackage`.
Em vez de algo como:

```nix
pkgs.dockerTools.buildLayeredImage {
  name = "hello";
  contents = [ pkgs.hello ];
}
```

Escreva algo como:

```nix
{ dockerTools, hello }:
dockerTools.buildLayeredImage {
  name = "hello";
  contents = [ hello ];
}
```

### REPLs

Ao mostrar entradas/saídas de qualquer [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), como um shell ou o Nix REPL, use um formato como você veria no REPL, enquanto tenta separar visualmente as entradas das saídas.
Isso significa que para um shell, você deve usar um formato como o seguinte:
```shell
$ nix-build -A hello '<nixpkgs>' \
  --option require-sigs false \
  --option trusted-substituters file:///tmp/hello-cache \
  --option substituters file:///tmp/hello-cache
/nix/store/zhl06z4lrfrkw5rp0hnjjfrgsclzvxpm-hello-2.12.1
```
Observe como a entrada é precedida por `$` na primeira linha e recuada nas linhas subsequentes, e como a saída é fornecida como você veria no shell.

Para o Nix REPL, você deve usar um formato como o seguinte:
```shell
nix-repl> builtins.attrNames { a = 1; b = 2; }
[ "a" "b" ]
```
Observe como a entrada é precedida por `nix-repl>` e a saída é fornecida como você veria no Nix REPL.

### Títulos para entradas, saídas e exemplos

Ao documentar funções ou qualquer coisa que tenha entradas/saídas e uso de exemplo, use títulos aninhados para separar claramente entradas, saídas e exemplos.
Mantenha os exemplos como o último título aninhado e link para os exemplos sempre que aplicável na documentação.

O objetivo desta convenção é fornecer uma estrutura familiar para navegar no manual, para que qualquer leitor possa esperar encontrar conteúdo relacionado a entradas em um título "inputs", exemplos em um título "examples", e assim por diante.
Um exemplo:
```
## buildImage

Some explanation about the function here.
Describe a particular scenario, and point to [](#ex-dockerTools-buildImage), which is an example demonstrating it.

### Inputs

Documentation for the inputs of `buildImage`.
Perhaps even point to [](#ex-dockerTools-buildImage) again when talking about something specifically linked to it.

### Passthru outputs

Documentation for any passthru outputs of `buildImage`.

### Examples

Note that this is the last nested heading in the `buildImage` section.

:::{.example #ex-dockerTools-buildImage}

# Using `buildImage`

Example of how to use `buildImage` goes here.

:::
```

### Argumentos de função

Use [listas de definição](#definition-lists) para documentar argumentos de função, e os atributos de tais argumentos, bem como seus [tipos](https://nixos.org/manual/nix/stable/language/values).
Por exemplo:

```markdown
# pkgs.coolFunction {#pkgs.coolFunction}

`pkgs.coolFunction` *`name`* *`config`*

Description of what `callPackage` does.


## Inputs {#pkgs-coolFunction-inputs}

If something's special about `coolFunction`'s general argument handling, you can say so here.
Otherwise, just describe the single argument or start the arguments' definition list without introduction.

*`name`* (String)

: The name of the resulting image.

*`config`* (Attribute set)

: Introduce the parameter. Maybe you have a test to make sure `{ }` is a sensible default; then you can say: these attributes are optional; `{ }` is a valid argument.

  `outputHash` (String; _optional_)

  : A brief explanation including when and when not to pass this attribute.

  : _Default:_ the output path's hash.
```

Lista de verificação:
- Comece com uma sinopse, para mostrar a ordem dos argumentos posicionais.
- Metavariáveis estão em spans de código enfatizados: ``` *`arg1`* ```.
  Metavariáveis são espaços reservados onde os usuários podem escrever expressões arbitrárias.
  Isso inclui argumentos posicionais.
- Nomes de atributos são spans de código regulares: ``` `attr1` ```.
  Esses identificadores _não_ podem ser escolhidos livremente pelos usuários, portanto, _não_ são metavariáveis.
- Atributos _opcionais_ têm um _`Padrão:`_ se for facilmente descrito como um valor.
- Atributos _opcionais_ têm um _`Comportamento padrão:`_ se não for facilmente descrito usando um valor.
- Tipos Nix não estão em spans de código, porque não são código
- Tipos Nix são capitalizados, para distingui-los dos tipos camelCase do Module System, que _são_ código e se comportam como funções.

#### Exemplos

Para definir uma figura referenciável, use o seguinte cercamento:

```markdown
:::{.example #an-attribute-set-example}
# An attribute set example

You can add text before

    ```nix
    { a = 1; b = 2;}
    ```

and after code fencing
:::
```

A definição de exemplos através da classe de cercamento `example` os adiciona a uma seção "Lista de Exemplos" após o Sumário.
Embora isso não seja mostrado na documentação renderizada em nixos.org.

#### Figuras

Para definir uma figura referenciável, use o seguinte cercamento:

```markdown
::: {.figure #nixos-logo}
# NixOS Logo
![NixOS logo](./nixos_logo.png)
:::
```

A definição de figuras através da classe de cercamento `figure` as adiciona a uma `Lista de Figuras` após o `Sumário`.
Embora isso não seja mostrado na documentação renderizada em nixos.org.

#### Notas de rodapé

Para adicionar uma explicação de nota de rodapé, use a seguinte sintaxe:

```markdown
Sometimes it's better to add context [^context] in a footnote.

[^context]: This explanation will be rendered at the end of the chapter.
```

#### Comentários inline

Comentários inline são suportados com a seguinte sintaxe:

```markdown
<!-- This is an inline comment -->
```

Os comentários não serão renderizados no HTML final.

#### Definições de referência de link

Links podem referenciar um rótulo, por exemplo, para tornar o destino do link reutilizável:

```markdown
::: {.note}
Reference links can also be used to [shorten URLs][url-id] and keep the markdown readable.
:::

[url-id]: https://github.com/NixOS/nixpkgs/blob/19d4f7dc485f74109bd66ef74231285ff797a823/doc/README.md
```

Esta sintaxe é retirada do [CommonMark](https://spec.commonmark.org/0.30/#link-reference-definitions).

#### Substituições tipográficas

Substituições tipográficas estão ativadas.
Verifique a [lista de padrões de substituição possíveis](https://github.com/executablebooks/markdown-it-py/blob/3613e8016ecafe21709471ee0032a90a4157c2d1/markdown_it/rules_core/replacements.py#L1-L15).

## Obtendo ajuda

Se precisar de ajuda ou revisões específicas de documentação, mencione [@NixOS/documentation-team](https://github.com/orgs/nixos/teams/documentation-team) em seu pull request.
