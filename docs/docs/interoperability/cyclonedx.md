# CycloneDX {#chap-interop-cyclonedx}

[OWASP](https://owasp.org/) [CycloneDX](https://cyclonedx.org/) é um padrão de [Lista de Materiais](https://en.wikipedia.org/wiki/Bill_of_materials) (SBOM) de Software.
Os padrões descritos aqui são para incluir informações específicas do Nix em SBOMs de uma forma que seja interoperável com ferramentas SBOM externas.

## Taxonomia de Propriedades do Namespace `nix` {#sec-interop.cylonedx-nix}

As tabelas a seguir descrevem namespaces para [propriedades](https://cyclonedx.org/docs/1.6/json/#components_items_properties) que podem ser anexadas a componentes dentro de SBOMs.
As propriedades de componente são listas de pares nome-valor onde os valores devem ser strings.
Propriedades com o mesmo nome podem aparecer mais de uma vez.
Nomes e valores diferenciam maiúsculas de minúsculas.

| Property         | Descrição |
|------------------|-------------|
| `nix:store_path` | Um caminho de store do Nix para o componente dado. Esta propriedade deve ser contextualizada por propriedades adicionais que descrevem a produção do caminho de store, como aquelas dos namespaces `nix:narinfo:` e `nix:fod`. |

| Namespace     | Descrição |
|---------------|-------------|
| [`nix:narinfo`](#sec-interop.cylonedx-narinfo) | Namespace para propriedades que são específicas de como um componente é armazenado como um [arquivo Nix](https://nixos.org/manual/nix/stable/glossary#gloss-nar) (NAR) em um [cache binário](https://nixos.org/manual/nix/stable/glossary#gloss-binary-cache). |
| [`nix:fod`](#sec-interop.cylonedx-fod) | Namespace para propriedades que descrevem uma [derivation de saída fixa](https://nixos.org/manual/nix/stable/glossary#gloss-fixed-output-derivation). |

### `nix:narinfo` {#sec-interop.cylonedx-narinfo}

As propriedades Narinfo descrevem arquivos de componentes que podem estar disponíveis em caches binários.
As propriedades `nix:narinfo` devem ser acompanhadas por uma propriedade `nix:store_path` dentro da mesma lista de propriedades.

| Property                  | Descrição |
|---------------------------|-------------|
| `nix:narinfo:store_path`  | Caminho de store para o componente de store dado. |
| `nix:narinfo:url`         | Componente de caminho URL. |
| `nix:narinfo:nar_hash`    | Hash da parte do objeto do sistema de arquivos do componente quando serializado como um Arquivo Nix. |
| `nix:narinfo:nar_size`    | Tamanho do componente quando serializado como um Arquivo Nix. |
| `nix:narinfo:compression` | O formato de compressão em que o arquivo do componente está. |
| `nix:narinfo:file_hash`   | Um digest para o próprio arquivo de componente compactado, em oposição aos dados contidos nele. |
| `nix:narinfo:file_size`   | O tamanho do próprio arquivo de componente compactado. |
| `nix:narinfo:deriver`     | O caminho para a derivation da qual este componente é produzido. |
| `nix:narinfo:system`      | A plataforma de hardware e software na qual este componente é produzido. |
| `nix:narinfo:sig`         | Assinaturas que afirmam que este componente é o que ele diz ser. |
| `nix:narinfo:ca`          | Endereço de conteúdo do objeto do sistema de arquivos deste objeto de store, usado para calcular seu caminho de store. |
| `nix:narinfo:references`  | Um array de caminhos de store separados por espaço em branco que este componente referencia. |

### `nix:fod` {#sec-interop.cylonedx-fod}

As propriedades FOD descrevem uma [derivation de saída fixa](https://nixos.org/manual/nix/stable/glossary#gloss-fixed-output-derivation).
A propriedade `nix:fod:method` é obrigatória e deve ser acompanhada por uma propriedade `nix:store_path` dentro da mesma lista de propriedades.
Todas as outras propriedades neste namespace são específicas do método.
Para reproduzir a construção de um componente, o valor `nix:fod:method` é resolvido para uma [função apropriada](#chap-pkgs-fetchers) dentro do Nixpkgs cujos argumentos se cruzam com as propriedades dadas.
Ao gerar propriedades `nix:fod`, o método selecionado deve ser uma função estável com um número mínimo de argumentos.
Por exemplo, `fetchFromGitHub` é comumente usado dentro do Nixpkgs, mas deve ser reduzido a uma chamada para a função pela qual é implementado, `fetchzip`.

| Property         | Descrição |
|------------------|-------------|
| `nix:fod:method` | Função Nixpkgs que produz esta FOD. Obrigatório. Exemplos: `"fetchzip"`, `"fetchgit"` |
| `nix:fod:name`   | Nome da derivation, presente quando o método é `"fetchzip"` |
| `nix:fod:ref`    | [Git ref](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddefrefaref), presente quando o método é `"fetchgit"` |
| `nix:fod:rev`    | [Git rev](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddefrevisionarevision), presente quando o método é `"fetchgit"` |
| `nix:fod:sha256` | Hash da FOD |
| `nix:fod:url`    | URL para buscar |

As propriedades `nix:fod` podem ser extraídas e avaliadas para uma derivation usando um código semelhante ao seguinte, assumindo uma função fictícia `filterPropertiesToAttrs`:

```nix
{
  pkgs,
  filterPropertiesToAttrs,
  properties,
}:
let
  fodProps = filterPropertiesToAttrs "nix:fod:" properties;

  methods = {
    fetchzip =
      {
        name,
        url,
        sha256,
        ...
      }:
      pkgs.fetchzip { inherit name url sha256; };
  };

in
methods.${fodProps.method} fodProps
```