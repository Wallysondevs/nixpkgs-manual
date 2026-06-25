# Meta-atributos {#chap-meta}

Pacotes Nix podem declarar *meta-atributos* que contêm informações sobre um pacote, como uma descrição, sua página inicial, sua licença e assim por diante. Por exemplo, o pacote GNU Hello possui uma declaração `meta` como esta:

```nix
{
  meta = {
    description = "Program that produces a familiar, friendly greeting";
    longDescription = ''
      GNU Hello is a program that prints "Hello, world!" when you run it.
      It is fully customizable.
    '';
    homepage = "https://www.gnu.org/software/hello/manual/";
    license = lib.licenses.gpl3Plus;
    maintainers = with lib.maintainers; [ eelco ];
    platforms = lib.platforms.all;
  };
}
```

Meta-atributos não são passados para o *builder* do pacote. Assim, uma alteração em um meta-atributo não aciona uma recompilação do pacote.

## Meta-atributos padrão {#sec-standard-meta-attributes}

Se o pacote for enviado para o Nixpkgs, por favor, verifique os
[requisitos para meta-atributos](https://github.com/NixOS/nixpkgs/tree/master/pkgs#meta-attributes)
na documentação de contribuição.

Espera-se que cada meta-atributo seja um dos seguintes:

### `description` {#var-meta-description}

Uma descrição curta (uma linha) do pacote.
Isso é exibido em [search.nixos.org](https://search.nixos.org/packages).

Os requisitos gerais de uma descrição são:

- Ser curta, apenas uma frase.
- Ter a primeira letra maiúscula.
- Não começar com artigo definido ("O"/"A") ou indefinido ("Um"/"Uma").
- Não começar com o nome do pacote.
  - Mais geralmente, não deve se referir ao nome do pacote.
- Não terminar com um ponto (ou qualquer pontuação, aliás).
- Fornecer informações factuais.
  - Evitar linguagem subjetiva.


Errado: `"libpng is a library that allows you to decode PNG images."`

Correto: `"Library for decoding PNG images"`

### `longDescription` {#var-meta-longDescription}

Uma descrição arbitrariamente longa do pacote em Markdown [CommonMark](https://commonmark.org).

### `branch` {#var-meta-branch}

Branch de lançamento. Usado para especificar que um pacote não receberá atualizações que não estejam nesta branch; por exemplo, o kernel Linux 3.0 deve ser atualizado para 3.0.X, não para 3.1.

### `homepage` {#var-meta-homepage}

A página inicial do pacote. Exemplo: `https://www.gnu.org/software/hello/manual/`

### `donationPage` {#var-meta-donationPage}

A página de doação do pacote ou projeto, se existir. Exemplo: `https://neovim.io/sponsors/`

URLs de projetos autoritativas são preferidas.

### `downloadPage` {#var-meta-downloadPage}

A página onde um link para a versão atual pode ser encontrado. Exemplo: `https://ftp.gnu.org/gnu/hello/`

### `changelog` {#var-meta-changelog}

Um link ou uma lista de links para a localização do Changelog de um pacote. Um link pode usar expansão para se referir à versão correta do changelog. Exemplo: `"https://git.savannah.gnu.org/cgit/hello.git/plain/NEWS?h=v${version}"`

### `license` {#var-meta-license}

A licença, ou licenças, para o pacote. Uma do conjunto de atributos definido em [`nixpkgs/lib/licenses.nix`](https://github.com/NixOS/nixpkgs/blob/master/lib/licenses.nix). Neste momento, usar tanto uma lista de licenças quanto uma única licença é válido. Se o campo de licença estiver na forma de uma representação de lista, isso significa que partes do pacote são licenciadas de forma diferente. Cada licença deve ser preferencialmente referenciada por seu atributo. O valor do atributo não-lista também pode ser uma representação de string delimitada por espaços dos atributos `shortNames` ou `spdxIds` contidos. Os seguintes são todos exemplos válidos:

- Licença única referenciada por atributo (preferencial) `lib.licenses.gpl3Only`.
- Licença única referenciada por seu atributo shortName (desencorajado) `"gpl3Only"`.
- Licença única referenciada por seu atributo spdxId (desencorajado) `"GPL-3.0-only"`.
- Múltiplas licenças referenciadas por atributo (preferencial) `with lib.licenses; [ asl20 free ofl ]`.
- Múltiplas licenças referenciadas como uma string delimitada por espaços de shortNames de atributos (desencorajado) `"asl20 free ofl"`.

Para detalhes, veja [Licenças](#sec-meta-license).

### `sourceProvenance` {#var-meta-sourceProvenance}

Uma lista contendo o tipo ou tipos de entradas de origem a partir das quais o pacote é construído, por exemplo, código-fonte original, binários pré-construídos, etc.

Para detalhes, veja [Proveniência da fonte](#sec-meta-sourceProvenance).

### `maintainers` {#var-meta-maintainers}

Uma lista dos mantenedores desta expressão Nix. Os mantenedores são definidos em [`nixpkgs/maintainers/maintainer-list.nix`](https://github.com/NixOS/nixpkgs/blob/master/maintainers/maintainer-list.nix). Não há restrição para se tornar um mantenedor, basta adicionar-se a essa lista em um commit separado intitulado “maintainers: add alice” no mesmo pull request, e referenciar os mantenedores com `maintainers = with lib.maintainers; [ alice bob ]`.

### `teams` {#var-meta-teams}

Uma lista das equipes desta expressão Nix. As equipes são definidas em [`nixpkgs/maintainers/team-list.nix`](https://github.com/NixOS/nixpkgs/blob/master/maintainers/team-list.nix), e podem ser definidas em um pacote com `meta.teams = with lib.teams; [ team1 team2 ]`.

### `mainProgram` {#var-meta-mainProgram}

O nome do binário principal para o pacote. Isso afeta o binário que `nix run` executa. Exemplo: `"rg"`

### `priority` {#var-meta-priority}

A *prioridade* do pacote, usada por `nix-env` para resolver conflitos de nomes de arquivos entre pacotes. Veja a [página do manual para `nix-env`](https://nixos.org/manual/nix/stable/command-ref/nix-env) para detalhes. Exemplo: `"10"` (um pacote de baixa prioridade).

### `platforms` {#var-meta-platforms}

A lista de tipos de plataforma Nix nos quais o pacote é suportado. O Hydra constrói pacotes de acordo com a plataforma especificada. Se nenhuma plataforma for especificada, o pacote não terá binários pré-construídos. Um exemplo é:

```nix
{ meta.platforms = lib.platforms.linux; }
```

O conjunto de atributos `lib.platforms` define [várias listas comuns](https://github.com/NixOS/nixpkgs/blob/master/lib/systems/doubles.nix) de tipos de plataforma.

### `badPlatforms` {#var-meta-badPlatforms}

A lista de [tipos de plataforma](https://github.com/NixOS/nixpkgs/blob/b03ac42b0734da3e7be9bf8d94433a5195734b19/lib/meta.nix#L75-L81) Nix nos quais o pacote é conhecido por não ser construível.
O Hydra nunca criará binários pré-construídos para esses tipos de plataforma, mesmo que estejam em [`meta.platforms`](#var-meta-platforms).
Em geral, é preferível definir `meta.platforms = lib.platforms.all` e então excluir quaisquer plataformas nas quais o pacote é conhecido por não ser construído.
Por exemplo, um pacote que requer vinculação dinâmica e não pode ser vinculado estaticamente poderia usar isso:

```nix
{
  meta.platforms = lib.platforms.all;
  meta.badPlatforms = [ lib.systems.inspect.platformPatterns.isStatic ];
}
```

A função [`lib.meta.availableOn`](https://github.com/NixOS/nixpkgs/blob/b03ac42b0734da3e7be9bf8d94433a5195734b19/lib/meta.nix#L95-L106) pode ser usada para testar se um pacote está disponível (ou seja, construível) em uma determinada plataforma.
Alguns pacotes usam isso para detectar automaticamente o conjunto máximo de recursos com os quais podem ser construídos.
Por exemplo, o `systemd` [requer vinculação dinâmica](https://github.com/systemd/systemd/issues/20600#issuecomment-912338965), e [possui uma configuração `meta.badPlatforms`](https://github.com/NixOS/nixpkgs/blob/b03ac42b0734da3e7be9bf8d94433a5195734b19/pkgs/os-specific/linux/systemd/default.nix#L752) semelhante à acima.
Pacotes que podem ser construídos com ou sem suporte a `systemd` usarão `lib.meta.availableOn` para detectar se o `systemd` está disponível na [`hostPlatform`](#ssec-cross-platform-parameters) para a qual estão sendo construídos; se não estiver disponível (por exemplo, devido a uma plataforma host vinculada estaticamente como `pkgsStatic`), este suporte será desabilitado por padrão.

### `timeout` {#var-meta-timeout}

Um tempo limite (em segundos) para a construção da derivation. Se a derivation demorar mais do que este tempo para ser construída, o Hydra a falhará devido à quebra do tempo limite. No entanto, nem todos os computadores têm o mesmo poder de computação, portanto, alguns *builders* podem decidir aplicar um fator multiplicativo a este valor. Ao preencher este valor, tente mantê-lo aproximadamente consistente com outros valores já presentes em `nixpkgs`.

Atributos `meta` não são armazenados na derivation instanciada.
Portanto, esta configuração pode ser perdida quando o pacote é usado como uma dependência.
Para ser eficaz, deve ser apresentado diretamente a um processo de avaliação que lida com o atributo `meta.timeout`.

### `hydraPlatforms` {#var-meta-hydraPlatforms}

A lista de tipos de plataforma Nix para os quais a [instância Hydra](https://github.com/nixos/hydra) [em `hydra.nixos.org`](https://nixos.org/hydra) construirá o pacote. (Hydra é o sistema de construção contínua baseado em Nix.) Ele assume o valor de `meta.platforms` por padrão. Assim, a única razão para definir `meta.hydraPlatforms` é se você deseja que `hydra.nixos.org` construa o pacote em um subconjunto de `meta.platforms`, ou não o construa de forma alguma, por exemplo.

```nix
{
  meta.platforms = lib.platforms.linux;
  meta.hydraPlatforms = [ ];
}
```

### `broken` {#var-meta-broken}

Se definido como `true`, o pacote é marcado como "quebrado", o que significa que ele não aparecerá em [search.nixos.org](https://search.nixos.org/packages), e não poderá ser construído ou instalado a menos que seja [explicitamente permitido](#sec-allow-broken).
Tais pacotes incondicionalmente quebrados devem ser removidos do Nixpkgs eventualmente, a menos que sejam corrigidos.

O valor deste atributo pode depender dos argumentos de um pacote, incluindo `stdenv`.
Isso significa que `broken` pode ser usado para expressar restrições, por exemplo:

- Não compila cruzado

  ```nix
  { meta.broken = !(stdenv.buildPlatform.canExecute stdenv.hostPlatform); }
  ```

- Quebrado se todo um certo conjunto de suas dependências estiver quebrado

  ```nix
  {
    meta.broken = lib.all (
      map (p: p.meta.broken) [
        glibc
        musl
      ]
    );
  }
  ```

Isso torna `broken` estritamente mais poderoso que `meta.badPlatforms`.
No entanto, `meta.availableOn` atualmente examina apenas `meta.platforms` e `meta.badPlatforms`, então `meta.broken` não influencia os valores padrão para dependências opcionais.

Por baixo, `meta.broken = true;` é o mesmo que
```nix
{
  meta.problems.broken.message = "This package is broken.";
}
```

Ao especificar isso manualmente, a mensagem de erro pode ser personalizada.

## `knownVulnerabilities` {#var-meta-knownVulnerabilities}

Uma lista de vulnerabilidades conhecidas que afetam o pacote, geralmente identificadas por identificadores CVE.

Este metadado permite que usuários e ferramentas estejam cientes de problemas de segurança não resolvidos antes de usar o pacote, por exemplo:

```nix
{
  meta.knownVulnerabilities = [
    "CVE-2024-3094: Malicious backdoor allowing unauthorized remote code execution"
  ];
}
```

Se esta lista não estiver vazia, o pacote é marcado como "inseguro", o que significa que ele não pode ser construído ou instalado a menos que a variável de ambiente [`NIXPKGS_ALLOW_INSECURE`](#sec-allow-insecure) seja definida.

## Licenças {#sec-meta-license}

O atributo `meta.license` deve preferencialmente conter um valor de `lib.licenses` definido em [`nixpkgs/lib/licenses.nix`](https://github.com/NixOS/nixpkgs/blob/master/lib/licenses.nix), ou uma descrição de licença no local do mesmo formato se a licença for improvável de ser útil em outra expressão.

Embora seja tipicamente melhor indicar a licença específica, algumas opções genéricas estão disponíveis:

### `lib.licenses.free`, `"free"` {#lib.licenses.free-free}

Abrangente para licenças de software livre não listadas acima.

### `lib.licenses.unfreeRedistributable`, `"unfree-redistributable"` {#lib.licenses.unfreeredistributable-unfree-redistributable}

Pacote não livre que pode ser redistribuído em formato binário. Ou seja, é legal redistribuir a *saída* da derivation. Isso significa que o pacote pode ser incluído no canal Nixpkgs.

Às vezes, software proprietário só pode ser redistribuído sem modificações. Certifique-se de que o *builder* não modifique os binários originais; caso contrário, estaremos quebrando a licença. Por exemplo, os drivers NVIDIA X11 podem ser redistribuídos sem modificações, mas nosso *builder* aplica `patchelf` para fazê-los funcionar. Assim, sua licença é `"unfree"` e ele não pode ser incluído no canal Nixpkgs.

### `lib.licenses.unfree`, `"unfree"` {#lib.licenses.unfree-unfree}

Pacote não livre que não pode ser redistribuído. Você pode construí-lo por conta própria, mas não pode redistribuir a saída da derivation. Assim, ele não pode ser incluído no canal Nixpkgs.

### `lib.licenses.unfreeRedistributableFirmware`, `"unfree-redistributable-firmware"` {#lib.licenses.unfreeredistributablefirmware-unfree-redistributable-firmware}

Este pacote fornece firmware não livre e redistribuível. Este é um valor separado de `unfree-redistributable` porque nem todos se importam se o firmware é livre.

## Proveniência da fonte {#sec-meta-sourceProvenance}

O valor do atributo `meta.sourceProvenance` de um pacote especifica a proveniência das saídas da derivation do pacote.

Se um pacote contém elementos que não são construídos a partir da fonte original por uma derivation do nixpkgs, o atributo `meta.sourceProvenance` deve ser uma lista contendo um ou mais valores de `lib.sourceTypes` definidos em [`nixpkgs/lib/source-types.nix`](https://github.com/NixOS/nixpkgs/blob/master/lib/source-types.nix).

Adicionar esta informação ajuda usuários que têm necessidades relacionadas à transparência de construção e segurança da cadeia de suprimentos a obter alguma visibilidade sobre seu software instalado ou a definir políticas para permitir ou proibir a instalação com base na proveniência da fonte.

A presença de um `sourceType` particular na lista `meta.sourceProvenance` de um pacote indica que o pacote contém alguns componentes que se enquadram nessa categoria, embora a *ausência* desse `sourceType` não *garanta* a ausência dessa categoria de `sourceType` no conteúdo do pacote. Um pacote sem `meta.sourceProvenance` definido implica que ele não possui `sourceType`s *conhecidos* além de `fromSource`.

O significado do atributo `meta.sourceProvenance` não depende do valor do atributo `meta.license`.

### `lib.sourceTypes.fromSource` {#lib.sourceTypes.fromSource}

Elementos do pacote que são produzidos por uma derivation do nixpkgs que os constrói a partir do código-fonte.

### `lib.sourceTypes.binaryNativeCode` {#lib.sourceTypes.binaryNativeCode}

Código nativo a ser executado na CPU do sistema de destino, construído por terceiros. Isso inclui pacotes que encapsulam um AppImage ou pacote Debian baixado.

### `lib.sourceTypes.binaryFirmware` {#lib.sourceTypes.binaryFirmware}

Código a ser executado em um dispositivo periférico ou controlador embarcado, construído por terceiros.

### `lib.sourceTypes.binaryBytecode` {#lib.sourceTypes.binaryBytecode}

Código para ser executado em um interpretador de VM ou compilado JIT em bytecode por terceiros. Isso inclui pacotes que baixam arquivos Java `.jar` de outra fonte.

### `lib.sourceTypes.obfuscatedCode` {#lib.sourceTypes.obfuscatedCode}

Código que é intencionalmente ofuscado por terceiros, por exemplo, usando um ofuscador de código ou sendo distribuído em uma forma ofuscada.

## Identificadores de software {#sec-meta-identifiers}

O atributo `meta.identifiers` do pacote especifica informações sobre os identificadores de software associados a este pacote. Identificadores de software são usados, por exemplo:
* para gerar Listas de Materiais de Software (SBOM) que listam todos os componentes usados para construir o software, que podem ser posteriormente usadas para realizar análises de vulnerabilidade ou licença do software resultante;
* para pesquisar software em diferentes bancos de dados de vulnerabilidades ou relatar novas vulnerabilidades a eles.

Sobrescrever o atributo `meta.identifiers` padrão é opcional, mas é recomendado preencher as partes para ajudar as ferramentas mencionadas acima a obter dados precisos.
Por exemplo, poderíamos obter notificações automáticas sobre potenciais vulnerabilidades para os usuários no futuro.
Todos os identificadores especificados em `meta.identifiers` devem ser inequívocos e válidos.

`meta.identifiers` contém o atributo `v1`, que é um conjunto de atributos que garante a compatibilidade retroativa de seus constituintes. Atualmente, ele contém cópias de todos os outros atributos em `meta.identifiers`.

### CPE {#sec-meta-identifiers-cpe}

Common Platform Enumeration (CPE) é uma especificação mantida pelo NIST como parte do Security Content Automation Protocol (SCAP). É usada para identificar software no National Vulnerabilities Database (NVD, https://nvd.nist.gov) e em outros bancos de dados de vulnerabilidades.

A versão atual do CPE 2.3 consiste em 13 partes:

```
cpe:2.3:a:<vendor>:<product>:<version>:<update>:<edition>:<language>:<sw_edition>:<target_sw>:<target_hw>:<other>
```

Alguns deles são os seguintes:

* *Versão do CPE* - a versão atual do CPE é `2.3`
* *parte* - geralmente em Nixpkgs `a` para "aplicativo", também pode ser `o` para "sistema operacional" ou `h` para "hardware"
* *fornecedor* - pode apontar para a fonte do pacote, ou para o próprio Nixpkgs
* *produto* - nome do pacote
* *versão* - versão do pacote
* *atualização* - parte da string de versão específica do fornecedor da última atualização (por exemplo, `rc1`, `beta`, etc...)
* *edição* - obsoleta e deve ser definida como `*`

Você pode encontrar informações sobre todos esses atributos na [especificação oficial](https://csrc.nist.gov/projects/security-content-automation-protocol/specifications/cpe/naming) (seção 5.3.3, páginas 11-13).

Quaisquer campos que não possuem um valor são definidos como:

* `*` (QUALQUER) quando o campo pode corresponder a qualquer valor
* `-` (NA) quando o valor não é significativo ou não é usado na descrição

Por exemplo, para glibc 2.40.1 o CPE seria `cpe:2.3:a:gnu:glibc:2.40.1:*:*:*:*:*:*:*`.

#### `meta.identifiers.cpeParts` {#var-meta-identifiers-cpeParts}

Este atributo contém um conjunto de atributos de todas as partes do CPE para este pacote. A maioria das partes assume `*` (corresponder a qualquer valor) por padrão, com algumas exceções:

* `part` assume `a` (aplicativo) por padrão, também pode ser definido como `o` para sistemas operacionais, por exemplo, kernel Linux, ou como `h` para hardware
* `vendor` não pode ser deduzido de outras fontes, então deve ser especificado pelo autor do pacote
* `product` assume o atributo `pname` da derivation fornecida por padrão e deve ser fornecido explicitamente se `pname` estiver faltando
* `version` e `update` não têm padrões e devem ser especificados explicitamente ou usando funções auxiliares; quando ausentes, o atributo `cpe` estará vazio, e todas as possíveis suposições usando funções auxiliares estarão no atributo `possibleCPEs`.

Cabe ao autor do pacote garantir que todas as partes estejam corretas e correspondam aos valores esperados no [dicionário NVD](https://nvd.nist.gov/products/cpe). Valores desconhecidos podem ser ignorados, o que os deixaria com o valor padrão de `*`.

As seguintes funções ajudam a preencher os campos `version` e `update`:

* [`lib.meta.cpeFullVersionWithVendor`](#function-library-lib.meta.cpeFullVersionWithVendor)

Para muitos pacotes, para tornar o CPE disponível, deve ser suficiente especificar apenas:

```nix
{
  # ...
  meta.identifiers.cpeParts = lib.meta.cpeFullVersionWithVendor vendor version;
}
```

#### `meta.identifiers.cpe` {#var-meta-identifiers-cpe}

Um atributo somente leitura que concatena todas as partes do CPE em uma única string.

#### `meta.identifiers.possibleCPEs` {#var-meta-identifiers-possibleCPEs}

Um atributo somente leitura contendo a lista de suposições de como o CPE para este pacote pode ser. Inclui todas as variantes de tratamento de versão mencionadas acima. Cada item é um attrset com os atributos `cpeParts` e `cpe` para cada suposição.