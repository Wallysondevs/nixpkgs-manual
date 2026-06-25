# buildEnv {#sec-buildEnv}

`buildEnv` constrói uma derivation contendo diretórios e links simbólicos, que se assemelha ao layout de perfil onde uma lista de derivations ou store paths são instalados.

Ao contrário de [`symlinkJoin`](#trivial-builder-symlinkJoin), `buildEnv` tem um cuidado especial com as saídas a serem linkadas e verifica por colisões de conteúdo entre os paths por padrão.
Um caso de uso comum para `buildEnv` é a construção de wrappers de ambiente, como um interpretador com módulos ou um programa com extensões.
Por exemplo, [`python.withPackage`](#attributes-on-interpreters-packages) é baseado em `buildEnv`.

## Argumentos {#sec-buildEnv-arguments}

`buildEnv` aceita [argumentos de ponto fixo (`buildEnv (finalAttrs: { })`)](#chap-build-helpers-finalAttrs), bem como um conjunto de atributos simples.

Salvo indicação em contrário, os argumentos podem ser sobrescritos diretamente usando [`<pkg>.overrideAttrs`](#sec-pkg-overrideAttrs).

`buildEnv` impõe [atributos estruturados (`{ __structuredAttrs = true; }`)](https://nix.dev/manual/nix/2.18/language/advanced-attributes.html#adv-attr-structuredAttrs).

- `name` ou `pname` e `version` (obrigatório):
    O nome do ambiente.

- `paths` (obrigatório):
    As derivations ou store paths a serem linkados simbolicamente ("instalados").

    Os elementos podem ser qualquer objeto tipo path que se interpole em string para um store path.
    A prioridade de cada path é retirada de `<path>.meta.priority` e retorna para `lib.meta.defaultPriority` se não for definida.

    O argumento `paths` é passado como atributo `passthru.paths` para evitar poluição inesperada de contexto.
    `passthru.paths` pode ser sobrescrito com `<pkg>.overrideAttrs`.

-   `extraOutputsToInstall` (padrão: `[ ]`):
    Saídas de pacote a serem incluídas além do que `meta.outputsToInstall` especifica.

-   `includeClosures` (padrão: `false`):
    Se deve incluir os closures de todos os input paths.
    A lista dos closure paths é construída com `writeClosure`.
    Eles são instalados com prioridade mais baixa e com exceções de tempo de build silenciadas.

-   `extraPrefix` (padrão: `""`):
    Define a raiz do resultado no diretório `"$out${extraPrefix}"`, por exemplo, `"/share"`.

-   `ignoreCollisions` (padrão: `false`):
    Não falha o build em caso de colisões de conteúdo.

-   `checkCollisionContents` (padrão: `true`):
    Se houver uma colisão, verifica se o conteúdo e as permissões correspondem; e somente se não corresponderem, lança um erro de colisão.

-   `ignoreSingleFileOutputs` (padrão: `false`):
    Não falha o build em caso de saídas de arquivo único.

-   `manifest` (padrão: `""`):
    O arquivo de manifesto (se houver). Um symlink `$out/manifest` será criado para ele.

-   `pathsToLink` (padrão: `[ "/" ]`):
    Os paths (relativos a cada elemento de `paths`) que queremos linkar simbolicamente (por exemplo, `["/bin"]`).
    Qualquer arquivo fora dos diretórios nesta lista não será linkado simbolicamente para o ambiente produzido.

-   `postBuild` (padrão: `""`):
    Comandos shell para executar após a construção da árvore de symlinks.

-   `passthru` e `meta` (padrão: `{ }`):
    Atributos suportados por `stdenv.mkDerivation` que não são passados para `builtins.derivation`.

-   `derivationArgs` (padrão: `{ }`):
    Argumentos adicionais de `stdenv.mkDerivation`, como `nativeBuildInputs`/`buildInputs` para dependências de `postBuild` e setup hooks.

    `derivationArgs` não é passado para `stdenv.mkDerivation`.
    Sobrescreva seus atributos diretamente via `<pkg>.overrideAttrs` e referencie diretamente via `finalAttrs`.

## Exceções em tempo de build {#sec-buildEnv-exceptions}

Existem situações em que os `paths` especificados podem não produzir um layout de perfil sensato.
Por padrão, o builder falha precocemente ao detectar essas exceções.
`buildEnv` fornece argumentos para ajustar ou ignorar certas exceções.

### Colisões de Path {#ssec-buildEnv-collisions}

Colisões de path ocorrem quando arquivos fornecidos por dois ou mais output paths com a mesma prioridade se sobrepõem, tornando o layout de perfil resultante potencialmente afetado pela ordem dos elementos de `paths`.
Isso é indesejável em vários casos de uso, como quando os `paths` são determinados pela fusão de módulos Nix.

Se o argumento `checkCollisionContents` for `true`, o builder verifica se o conteúdo e as permissões correspondem; e falha somente se não corresponderem.

O argumento `ignoreCollisions` silencia as verificações de colisão e permite que os arquivos sejam sobrescritos com base na ordem dos output paths escolhidos.

Além de silenciar esta exceção com `ignoreCollisions`, também é possível ajustar a prioridade de pacotes e store paths em colisão.
Store paths podem especificar prioridade na forma

```nix
{
  outPath = <path>;
  meta.priority = <priority>;
}
```

E as funções da Nixpkgs Library relacionadas a [`lib.meta.setPrio`](#function-library-lib.meta.setPrio) também se aplicam a um conjunto de atributos tipo string (`{ outPath = <path>; }`).

### Saídas de arquivo único {#ssec-buildEnv-singleFileOutputs}

Quando um output path fornece um único arquivo em vez de um diretório, ele inerentemente não pode ser mesclado no layout resultante.
Todos os pacotes detectáveis devem configurar seus `meta.outputsToInstall` corretamente, para que as saídas de arquivo único não sejam instaladas em um perfil.

Defina `ignoreSingleFileOutputs` como `true` para descartar silenciosamente todos os output paths de arquivo único.
Esta opção é útil quando os paths especificados contêm os output paths de testes de pacote.