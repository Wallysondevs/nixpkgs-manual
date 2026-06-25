# Fetchers {#chap-pkgs-fetchers}

Construir software com Nix frequentemente requer o download de código-fonte e outros arquivos da internet. Para este fim, usamos funções que chamamos de _fetchers_, que obtêm fontes remotas através de vários protocolos e serviços.

Nix fornece fetchers embutidos como [`fetchTarball`](https://nixos.org/manual/nix/stable/language/builtins.html#builtins-fetchTarball).
Nixpkgs fornece seus próprios fetchers, que funcionam de forma diferente:

- Um fetcher embutido fará o download e o cache de arquivos no momento da avaliação e produzirá um [store path](https://nixos.org/manual/nix/stable/glossary#gloss-store-path).
  Um fetcher do Nixpkgs criará uma [derivation](https://nixos.org/manual/nix/stable/glossary#gloss-derivation) ([fixed-output](https://nixos.org/manual/nix/stable/glossary#gloss-fixed-output-derivation)), e os arquivos são baixados no momento da construção.
- Fetchers embutidos invalidarão seu cache após a expiração de [`tarball-ttl`](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-tarball-ttl), e exigirão atividade de rede para verificar se a entrada do cache está atualizada.
  Fetchers do Nixpkgs só fazem o download novamente se o hash especificado mudar ou se o objeto do store não estiver disponível.
- Fetchers embutidos não usam [substituters](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-substituters).
  Derivations produzidas por fetchers do Nixpkgs usarão qualquer cache binário configurado de forma transparente.

Isso reduz significativamente o tempo necessário para avaliar o Nixpkgs, e permite que o [Hydra](https://nixos.org/hydra) retenha e redistribua as fontes usadas pelo Nixpkgs no [cache binário público](https://cache.nixos.org). Por essas razões, os fetchers embutidos do Nix não são permitidos no Nixpkgs.

A tabela a seguir resume as diferenças:

| Fetchers | Download | Saída | Cache | Refazer download quando |
|-|-|-|-|-|
| `builtins.fetch*` | tempo de avaliação | store path | `/nix/store`, `~/.cache/nix` | `tarball-ttl` expira, cache miss em `~/.cache/nix`, objeto do store de saída não está no store local |
| `pkgs.fetch*` | tempo de construção | derivation | `/nix/store`, substituters | objeto do store de saída não disponível |

:::{.tip}
Os auxiliares `pkgs.fetchFrom*` recuperam _snapshots_ de fontes versionadas, em oposição a todo o histórico de versões, o que é mais eficiente. `pkgs.fetchgit` por padrão também tem o mesmo comportamento, mas pode ser alterado através de atributos específicos fornecidos a ele.
:::

## Caveats {#chap-pkgs-fetchers-caveats}

Como os fetchers do Nixpkgs são derivations de saída fixa (fixed-output derivations), um [output hash](https://nixos.org/manual/nix/stable/language/advanced-attributes#adv-attr-outputHash) precisa ser especificado, geralmente indiretamente através de um atributo `hash`.
Este hash se refere à saída da derivation, que pode ser diferente da própria fonte remota!

Isso tem as seguintes implicações das quais você deve estar ciente:

- Use ferramentas Nix (ou compatíveis com Nix) para produzir o output hash.

- Ao alterar quaisquer parâmetros do fetcher, sempre atualize o output hash.
  Use um dos métodos de [](#sec-pkgs-fetchers-updating-source-hashes).
  Caso contrário, objetos do store existentes que correspondem ao output hash serão reutilizados em vez de buscar novo conteúdo.

  :::{.note}
  Um problema semelhante surge ao testar alterações na implementação de um fetcher.
  Se a saída da derivation já existe no Nix store, falhas de teste podem passar despercebidas.
  A função [`invalidateFetcherByDrvHash`](#tester-invalidateFetcherByDrvHash) ajuda a evitar a reutilização de derivations em cache.
  :::

## Updating source hashes {#sec-pkgs-fetchers-updating-source-hashes}

Existem várias maneiras de obter o hash correspondente a uma fonte remota.
A menos que você entenda como o fetcher que você está usando calcula o hash a partir do conteúdo baixado, você deve usar [o método de hash falso](#sec-pkgs-fetchers-updating-source-hashes-fakehash-method).

1. [](#sec-pkgs-fetchers-updating-source-hashes-fakehash-method) O método de hash falso: Na sua receita de pacote, defina o hash para um dos seguintes

   - `""`
   - `lib.fakeHash`
   - `lib.fakeSha256`
   - `lib.fakeSha512`

   Tente construir, extraia os hashes calculados das mensagens de erro e coloque-os na receita.

   :::{.warning}
   Você deve usar um desses quatro hashes falsos e não um hash escolhido arbitrariamente.
   Veja [](#sec-pkgs-fetchers-secure-hashes) para detalhes.
   :::

   :::{.example #ex-fetchers-update-fod-hash}
   # Atualizar hash da fonte com o método de hash falso

   Considere a seguinte receita que produz um arquivo simples:

   ```nix
   { fetchurl }:
   fetchurl {
     url = "https://raw.githubusercontent.com/NixOS/nixpkgs/23.05/.version";
     hash = "sha256-ZHl1emidXVojm83LCVrwULpwIzKE/mYwfztVkvpruOM=";
   }
   ```

   Um erro comum é atualizar um parâmetro do fetcher, como `url`, sem atualizar o hash:

   ```nix
   { fetchurl }:
   fetchurl {
     url = "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version";
     hash = "sha256-ZHl1emidXVojm83LCVrwULpwIzKE/mYwfztVkvpruOM=";
   }
   ```

   **Isso produzirá a mesma saída de antes!** Defina o hash como uma string vazia:

   ```nix
   { fetchurl }:
   fetchurl {
     url = "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version";
     hash = "";
   }
   ```

   Ao construir o pacote, use a mensagem de erro para determinar o hash correto:

   ```shell
   $ nix-build
   (some output removed for clarity)
   error: hash mismatch in fixed-output derivation '/nix/store/7yynn53jpc93l76z9zdjj4xdxgynawcw-version.drv':
           specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
               got:    sha256-BZqI7r0MNP29yGH5+yW2tjU9OOpOCEvwWKrWCv5CQ0I=
   error: build of '/nix/store/bqdjcw5ij5ymfbm41dq230chk9hdhqff-version.drv' failed
   ```
   :::

2. Pré-busque a fonte com [`nix-prefetch-<type> <URL>`](https://search.nixos.org/packages?buckets={%22package_attr_set%22%3A[%22No%20package%20set%22]%2C%22package_license_set%22%3A[]%2C%22package_maintainers_set%22%3A[]%2C%22package_platforms%22%3A[]}&query=nix-prefetch), onde `<type>` é um dos seguintes

   - `url`
   - `git`
   - `hg`
   - `cvs`
   - `bzr`
   - `svn`
   - `darcs`
   - `pijul`

   O hash é impresso no stdout.

3. Pré-busque pela fonte do pacote (com `nix-prefetch-url '<nixpkgs>' -A <package>.src`, onde `<package>` é o nome do atributo do pacote).
   O hash é impresso no stdout.

   Isso funciona bem quando você atualizou a versão existente do pacote e quer descobrir o novo hash, mas é inútil se o pacote não pode ser acessado por atributo ou se o pacote tem múltiplas fontes (`.srcs`, fontes dependentes da arquitetura, etc).

4. Hash upstream: use-o quando o upstream fornece `sha256` ou `sha512`.
   Não o use quando o upstream fornece `md5`, calcule `sha256` em vez disso.

   Uma pequena nuance é que as ferramentas `nix-prefetch-*` produzem hashes com a codificação `nix32` (uma adaptação base32 específica do Nix), mas o upstream geralmente fornece codificação hexadecimal (`base16`).
   Fetchers entendem ambos os formatos.
   Nixpkgs não padroniza nenhum formato.

   Você pode converter entre formatos de hash com [`nix-hash`](https://nixos.org/manual/nix/stable/command-ref/nix-hash).

5. Extraia o hash de um arquivo de fonte local com `sha256sum`.
   Use `nix-prefetch-url file:///path/to/archive` se você quiser o hash `base32` personalizado do Nix.

## Obtaining hashes securely {#sec-pkgs-fetchers-secure-hashes}

É sempre uma boa ideia evitar ataques Man-in-the-Middle (MITM) ao baixar conteúdos de fontes.
Caso contrário, você poderia baixar malware sem saber, em vez da fonte pretendida, e em vez do hash real da fonte, você acabaria usando o hash do malware.
Aqui estão considerações de segurança para este cenário:

- URLs `http://` não são seguras para pré-buscar hashes.

- Hashes upstream devem ser obtidos via um protocolo seguro.

- URLs `https://` oferecem mais proteções ao usar `nix-prefetch-*` ou para hashes upstream.

- URLs `https://` são seguras ao usar o [método de hash falso](#sec-pkgs-fetchers-updating-source-hashes-fakehash-method) *somente se* você usar um dos hashes falsos listados.
  Se você usar qualquer outro hash, o download estará exposto a ataques MITM mesmo que você use URLs HTTPS.

  Em termos mais concretos, se você usar qualquer outro hash, a [`--insecure` flag](https://curl.se/docs/manpage.html#-k) será passada para a chamada subjacente ao `curl` ao baixar o conteúdo.

## Proxy usage {#sec-pkgs-fetchers-proxy}

Os fetchers do Nixpkgs podem usar um proxy http(s). Cada fetcher herdará automaticamente variáveis de ambiente relacionadas a proxy (`http_proxy`, `https_proxy`, etc) via [impureEnvVars](https://nixos.org/manual/nix/stable/language/advanced-attributes#adv-attr-impureEnvVars).

A variável de ambiente `NIX_SSL_CERT_FILE` também é herdada nos fetchers, e pode ser usada para fornecer um pacote de certificados personalizado aos fetchers. Isso geralmente é necessário para que um proxy https funcione sem erros de validação de certificado.

Para usar uma instância temporária do Tor como proxy para buscar de endereços `.onion`, adicione `nativeBuildInputs = [ tor.proxyHook ];` aos parâmetros do fetcher.

[]{#fetchurl}
## `fetchurl` {#sec-pkgs-fetchers-fetchurl}

`fetchurl` retorna uma [fixed-output derivation](https://nixos.org/manual/nix/stable/glossary.html#gloss-fixed-output-derivation) que baixa conteúdo de uma URL fornecida e armazena o conteúdo inalterado dentro do Nix store.

Ele usa {manpage}`curl(1)` internamente e permite que seu comportamento seja modificado especificando alguns atributos no argumento para `fetchurl` (veja a documentação para os atributos `curlOpts`, `curlOptsList` e `netrcPhase`).

O [store path](https://nixos.org/manual/nix/stable/store/store-path) resultante é determinado pelo hash fornecido a `fetchurl`, e também pelos valores de `name` (ou `pname` e `version`).

Se nem `name` nem `pname` e `version` forem especificados ao chamar `fetchurl`, ele usará por padrão o [basename](https://nixos.org/manual/nix/stable/language/builtins.html#builtins-baseNameOf) de `url` ou o primeiro elemento de `urls`.
Se `pname` e `version` forem especificados, `fetchurl` usará esses valores e ignorará `name`, mesmo que também seja especificado.

### Inputs {#sec-pkgs-fetchers-fetchurl-inputs}

`fetchurl` requer um conjunto de atributos com os seguintes atributos:

`url` (String; _opcional_)
: A URL de onde baixar.

  :::{.note}
  Ou `url` ou `urls` deve ser especificado, mas não ambos.
  :::

  Todas as URLs no formato [especificado aqui](https://curl.se/docs/url-syntax.html#rfc-3986-plus) são suportadas.

  _Valor padrão:_ `""`.

`urls` (Lista de String; _opcional_)
: Uma lista de URLs, especificando locais de download para o mesmo conteúdo.
  Cada URL será tentada em ordem até que uma delas seja bem-sucedida com algum conteúdo ou todas falhem.
  Veja [](#ex-fetchers-fetchurl-nixpkgs-version-multiple-urls) para entender como este atributo afeta o comportamento de `fetchurl`.

  :::{.note}
  Ou `url` ou `urls` deve ser especificado, mas não ambos.
  :::

  _Valor padrão:_ `[]`.

`hash` (String; _opcional_)
: Hash da saída da derivation de `fetchurl`, seguindo o formato para metadados de integridade conforme definido por [SRI](https://www.w3.org/TR/SRI/).
  Para mais informações, veja [](#chap-pkgs-fetchers-caveats).

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez dos outros atributos específicos de hash que existem para compatibilidade retroativa.

  Se `hash` não for especificado, você deve especificar `outputHash` e `outputHashAlgo`, ou um de `sha512`, `sha256`, ou `sha1`.
  :::

  _Valor padrão:_ `""`.

`outputHash` (String; _opcional_)
: Hash da saída da derivation de `fetchurl` no formato esperado pelo Nix.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHash) para mais informações sobre seu formato.

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez disso.

  Se `outputHash` for especificado, você também deve especificar `outputHashAlgo`.
  :::

  _Valor padrão:_ `""`.

`outputHashAlgo` (String; _opcional_)
: Algoritmo usado para gerar o valor especificado em `outputHash`.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHashAlgo) para mais informações sobre os valores que ele suporta.

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez disso.

  O valor especificado em `outputHashAlgo` será ignorado se `outputHash` também não for especificado.
  :::

  _Valor padrão:_ `""`.

`sha1` (String; _opcional_)
: Hash SHA-1 da saída da derivation de `fetchurl` no formato esperado pelo Nix.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHash) para mais informações sobre seu formato.

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez disso.
  :::

  _Valor padrão:_ `""`.

`sha256` (String; _opcional_)
: Hash SHA-256 da saída da derivation de `fetchurl` no formato esperado pelo Nix.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHash) para mais informações sobre seu formato.

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez disso.
  :::

  _Valor padrão:_ `""`.

`sha512` (String; _opcional_)
: Hash SHA-512 da saída da derivation de `fetchurl` no formato esperado pelo Nix.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHash) para mais informações sobre seu formato.

  :::{.note}
  Recomenda-se que você use o atributo `hash` em vez disso.
  :::

  _Valor padrão:_ `""`.

`name` (String; _opcional_)
: O nome simbólico do arquivo baixado quando salvo no Nix store.
  Veja [a visão geral de `fetchurl`](#sec-pkgs-fetchers-fetchurl) para detalhes sobre como o nome do arquivo é decidido.

  _Valor padrão:_ `""`.

`pname` (String; _opcional_)
: Um nome base, que será combinado com `version` para formar o nome simbólico do arquivo baixado quando salvo no Nix store.
  Veja [a visão geral de `fetchurl`](#sec-pkgs-fetchers-fetchurl) para detalhes sobre como o nome do arquivo é decidido.

  :::{.note}
  Se `pname` for especificado, você também deve especificar `version`, caso contrário `fetchurl` ignorará o valor de `pname`.
  :::

  _Valor padrão:_ `""`.

`version` (String; _opcional_)
: Uma versão, que será combinada com `pname` para formar o nome simbólico do arquivo baixado quando salvo no Nix store.
  Veja [a visão geral de `fetchurl`](#sec-pkgs-fetchers-fetchurl) para detalhes sobre como o nome do arquivo é decidido.

  _Valor padrão:_ `""`.

`recursiveHash` (Booleano; _opcional_) []{#sec-pkgs-fetchers-fetchurl-inputs-recursiveHash}
: Se definido como `true`, sinalizará ao Nix que o hash fornecido a `fetchurl` foi calculado usando o modo `"recursive"`.
  Veja [a documentação no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-outputHashMode) para mais informações sobre os modos existentes.

  Por padrão, `fetchurl` usa o modo `"recursive"` quando o atributo `executable` é definido como `true`, então você não precisa especificar `recursiveHash` neste caso.

  _Valor padrão:_ `false`.

`executable` (Booleano; _opcional_)
: Se `true`, define o bit executável no arquivo baixado.

  _Valor padrão_: `false`.

`downloadToTemp` (Booleano; _opcional_) []{#sec-pkgs-fetchers-fetchurl-inputs-downloadToTemp}
: Se `true`, salva o arquivo baixado em um local temporário em vez do local esperado no Nix store.
  Isso é útil quando usado em conjunto com o atributo `postFetch`, caso contrário `fetchurl` não produzirá nenhuma saída significativa.

  O local do arquivo baixado será definido na variável `$downloadedFile`, que deve ser usada pelo script no atributo `postFetch`.
  Veja [](#ex-fetchers-fetchurl-nixpkgs-version-postfetch) para entender como trabalhar com este atributo.

  _Valor padrão:_ `false`.

`postFetch` (String; _opcional_)
: Script executado após o arquivo ter sido baixado com sucesso, e antes que `fetchurl` termine de ser executado.
  Útil para pós-processamento, para verificar ou transformar o arquivo de alguma forma.
  Veja [](#ex-fetchers-fetchurl-nixpkgs-version-postfetch) para entender como trabalhar com este atributo.

  _Valor padrão:_ `""`.

`netrcPhase` (String ou Nulo; _opcional_)
: Script executado para criar um arquivo {manpage}`netrc(5)` a ser usado com {manpage}`curl(1)`.
  O script deve criar o arquivo `netrc` (note que ele não começa com um ".") no diretório em que está sendo executado (`$PWD`).

  O script é executado durante a configuração feita por `fetchurl` antes de executar qualquer um de seus códigos para baixar o conteúdo especificado.

  :::{.note}
  Se especificado, `fetchurl` alterará automaticamente sua invocação de {manpage}`curl(1)` para usar o arquivo `netrc`, então você não precisa adicionar nada a `curlOpts` ou `curlOptsList`.
  :::

  :::{.caution}
  Como `netrcPhase` precisa ser especificado em seu código-fonte Nix, quaisquer segredos que você colocar diretamente nele serão legíveis por qualquer pessoa por design (tanto em seu código-fonte, quanto quando a derivation é criada no Nix store).

  Se você quiser evitar este comportamento, veja a documentação de `netrcImpureEnvVars` para uma forma alternativa de lidar com esses segredos.
  :::

  _Valor padrão_: `null`.

`netrcImpureEnvVars` (Lista de String; _opcional_)
: Se especificado, `fetchurl` adicionará esses nomes de variáveis de ambiente à lista de [variáveis de ambiente impuras](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-impureEnvVars), que serão passadas do ambiente do usuário chamador para o builder executando o código `fetchurl`.

  Isso é útil quando usado com `netrcPhase` para ocultar quaisquer segredos que são usados nele, porque o script em `netrcPhase` só precisa referenciar as variáveis de ambiente com os segredos nelas.
  No entanto, note que estas são chamadas variáveis _impuras_ por uma razão:
  o ambiente que inicia a construção precisa ter essas variáveis declaradas para que tudo funcione corretamente, o que significa que uma configuração adicional é necessária fora do controle do Nix.

  _Valor padrão:_ `[]`.

`curlOpts` (String; _opcional_)
: Se especificado, este valor será anexado à invocação de {manpage}`curl(1)` ao baixar a(s) URL(s) fornecida(s) a `fetchurl`.
  Múltiplos argumentos podem ser separados por espaços normalmente, mas valores com espaços em branco serão interpretados como múltiplos argumentos (em vez de um único valor), mesmo que o valor seja escapado.
  Veja `curlOptsList` para uma forma de passar valores com espaços em branco.

  _Valor padrão:_ `""`.

`curlOptsList` (Lista de String; _opcional_)
: Se especificado, cada elemento desta lista será passado como um argumento para a invocação de {manpage}`curl(1)` ao baixar a(s) URL(s) fornecida(s) a `fetchurl`.
  Isso permite passar valores que contêm espaços, sem necessidade de escape.

  _Valor padrão:_ `[]`.

`showURLs` (Booleano; _opcional_)
: Se definido como `true`, isso impedirá que `fetchurl` baixe qualquer coisa.
  Em vez disso, ele exibirá uma lista de todas as URLs que ele teria usado para baixar o conteúdo (após resolver URLs `mirror://`, por exemplo).
  Isso é útil para depuração.

  _Valor padrão:_ `false`.

`meta` (Conjunto de Atributos; _opcional_)
: Especifica quaisquer [meta-atributos](#chap-meta) para a derivation retornada por `fetchurl`.

  _Valor padrão:_ `{}`.

`passthru` (Conjunto de Atributos; _opcional_)
: Especifica quaisquer atributos [`passthru`](#chap-passthru) extras para a derivation retornada por `fetchurl`.
  Note que `fetchurl` define [seus próprios atributos `passthru`](#ssec-pkgs-fetchers-fetchurl-passthru-outputs).
  Atributos especificados em `passthru` podem sobrescrever os atributos padrão retornados por `fetchurl`.

  _Valor padrão:_ `{}`.

`preferLocalBuild` (Booleano; _opcional_)
: Este é o mesmo atributo [definido no manual do Nix](https://nixos.org/manual/nix/stable/language/advanced-attributes.html#adv-attr-preferLocalBuild).
  É `true` por padrão porque fazer uma máquina remota baixar o conteúdo apenas duplica o tráfego de rede (já que a máquina local pode baixar os resultados da derivation de qualquer forma), mas isso pode ser útil em casos onde o acesso à rede é restrito em máquinas locais.

  _Valor padrão:_ `true`.

`nativeBuildInputs` (Lista de Conjunto de Atributos; _opcional_)
: Pacotes adicionais necessários para baixar o conteúdo.
  Isso é útil se você precisar de pacotes extras para `postFetch` ou `netrcPhase`, por exemplo.
  Tem a mesma semântica que em [](#var-stdenv-nativeBuildInputs).
  Veja [](#ex-fetchers-fetchurl-nixpkgs-version-postfetch) para entender como isso pode ser usado com `postFetch`.

  _Valor padrão:_ `[]`.

### Passthru outputs {#ssec-pkgs-fetchers-fetchurl-passthru-outputs}

`fetchurl` também define seus próprios atributos [`passthru`](#chap-passthru):

`url` (String)

: O mesmo atributo `url` passado no argumento para `fetchurl`.

### Examples {#ssec-pkgs-fetchers-fetchurl-examples}

:::{.example #ex-fetchers-fetchurl-nixpkgs-version}
# Usando `fetchurl` para baixar um arquivo

O pacote a seguir baixa um pequeno arquivo de uma URL e mostra a maneira mais comum de usar `fetchurl`:

```nix
{ fetchurl }:
fetchurl {
  url = "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version";
  hash = "sha256-BZqI7r0MNP29yGH5+yW2tjU9OOpOCEvwWKrWCv5CQ0I=";
}
```

Após construir o pacote, o arquivo será baixado e colocado no Nix store:

```shell
$ nix-build
(output removed for clarity)
/nix/store/4g9y3x851wqrvim4zcz5x2v3zivmsq8n-version

$ cat /nix/store/4g9y3x851wqrvim4zcz5x2v3zivmsq8n-version
23.11
```
:::

:::{.example #ex-fetchers-fetchurl-nixpkgs-version-multiple-urls}
# Usando `fetchurl` para baixar um arquivo com múltiplas URLs possíveis

O pacote a seguir adapta [](#ex-fetchers-fetchurl-nixpkgs-version) para usar múltiplas URLs.
A primeira URL foi criada para retornar intencionalmente um erro para ilustrar como `fetchurl` tentará múltiplas URLs até encontrar uma que funcione (ou todas as URLs falhem).

```nix
{ fetchurl }:
fetchurl {
  urls = [
    "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/does-not-exist"
    "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version"
  ];
  hash = "sha256-BZqI7r0MNP29yGH5+yW2tjU9OOpOCEvwWKrWCv5CQ0I=";
}
```

Após construir o pacote, ambas as URLs serão usadas para baixar o arquivo:

```shell
$ nix-build
(some output removed for clarity)
trying https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/does-not-exist
(some output removed for clarity)
curl: (22) The requested URL returned error: 404

trying https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version
(some output removed for clarity)
/nix/store/n9asny31z32q7sdw6a8r1gllrsfy53kl-does-not-exist

$ cat /nix/store/n9asny31z32q7sdw6a8r1gllrsfy53kl-does-not-exist
23.11
```

No entanto, note que o nome do arquivo foi derivado da primeira URL (isso é explicado em mais detalhes na [visão geral de `fetchurl`](#sec-pkgs-fetchers-fetchurl)).
Para garantir que o resultado terá o mesmo nome, independentemente das URLs usadas, podemos modificar o pacote:

```nix
{ fetchurl }:
fetchurl {
  name = "nixpkgs-version";
  urls = [
    "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/does-not-exist"
    "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version"
  ];
  hash = "sha256-BZqI7r0MNP29yGH5+yW2tjU9OOpOCEvwWKrWCv5CQ0I=";
}
```

Após construir o pacote, o resultado terá o nome que especificamos:

```shell
$ nix-build
(output removed for clarity)
/nix/store/zczb6wl3al6jm9sm5h3pr6nqn0i5ji9z-nixpkgs-version
```
:::

:::{.example #ex-fetchers-fetchurl-nixpkgs-version-postfetch}
# Manipulando o conteúdo baixado por `fetchurl`

Pode ser útil manipular o conteúdo baixado por `fetchurl` diretamente em sua derivation.
Neste exemplo, adaptaremos [](#ex-fetchers-fetchurl-nixpkgs-version) para anexar o resultado da execução do pacote `hello` ao conteúdo que baixamos, puramente para ilustrar como manipular o conteúdo.

```nix
{
  fetchurl,
  hello,
  lib,
}:
fetchurl {
  url = "https://raw.githubusercontent.com/NixOS/nixpkgs/23.11/.version";

  nativeBuildInputs = [ hello ];

  downloadToTemp = true;
  postFetch = ''
    hello >> "$downloadedFile"
    mv "$downloadedFile" "$out"
  '';

  hash = "sha256-ceooQQYmDx5+0nfg40uU3NNI2yKrixP7HZ/xLZUNv+w=";
}
```

Após construir o pacote, o arquivo resultante terá "Hello, world!" anexado a ele:

```shell
$ nix-build
(output removed for clarity)
/nix/store/ifi6pp7q0ag5h7c5v9h1c1c7bhd10c7f-version

$ cat /nix/store/ifi6pp7q0ag5h7c5v9h1c1c7bhd10c7f-version
23.11
Hello, world!
```

Note que o `hash` especificado no pacote é diferente do hash especificado em [](#ex-fetchers-fetchurl-nixpkgs-version), porque o conteúdo da saída foi alterado (mesmo que o arquivo real que foi baixado seja o mesmo).
Veja [](#chap-pkgs-fetchers-caveats) para mais detalhes sobre como trabalhar com o atributo `hash` quando a saída muda.
:::

## `fetchzip` {#sec-pkgs-fetchers-fetchzip}

Retorna uma [fixed-output derivation](https://nixos.org/manual/nix/stable/glossary.html#gloss-fixed-output-derivation) que baixa um arquivo de uma URL fornecida e o descompacta.

Apesar do nome, `fetchzip` não se limita a arquivos `.zip`, mas também pode ser usado com [vários formatos de tarball compactados](#tar-files) por padrão.
Isso pode ser estendido especificando atributos adicionais, veja [](#ex-fetchers-fetchzip-rar-archive) para entender como fazer isso.

### Inputs {#sec-pkgs-fetchers-fetchzip-inputs}

`fetchzip` requer um conjunto de atributos, e a maioria dos atributos é passada para a chamada subjacente a [`fetchurl`](#sec-pkgs-fetchers-fetchurl).

Os atributos abaixo são tratados de forma diferente por `fetchzip` em comparação com o que `fetchurl` espera:

`name` (String; _opcional_)
: Funciona como definido em `fetchurl`, mas tem um valor padrão diferente de `fetchurl`.

  _Valor padrão:_ `"source"`.

`nativeBuildInputs` (Lista de Conjunto de Atributos; _opcional_)
: Funciona como definido em `fetchurl`, mas também é aumentado por `fetchzip` para incluir pacotes para lidar com arquivos adicionais (como `.zip`).

  _Valor padrão:_ `[]`.

`postFetch` (String; _opcional_)
: Funciona como definido em `fetchurl`, mas também é aumentado com o código necessário para fazer `fetchzip` funcionar.

  :::{.caution}
  É seguro modificar arquivos em `$out` apenas em `postFetch`.
  Consulte a implementação de `fetchzip` para algo mais complexo.
  :::

  _Valor padrão:_ `""`.

`stripRoot` (Booleano; _opcional_)
: Se `true`, o conteúdo descompactado é movido um nível acima na árvore de diretórios.

  Isso é útil para arquivos que descompactam em um único diretório que comumente inclui alguns valores que mudam com o tempo, como números de versão.
  Quando este é o caso (e `stripRoot` é `true`), `fetchzip` removerá este diretório e tornará o conteúdo descompactado disponível no diretório de nível superior.

  [](#ex-fetchers-fetchzip-simple-striproot) mostra o que este atributo faz.

  Este atributo **não** é passado para `fetchurl`.

  _Valor padrão:_ `true`.

`extension` (String ou Nulo; _opcional_)
: Se definido, o arquivo baixado por `fetchzip` será renomeado para um nome de arquivo com a extensão especificada neste atributo.

  Isso é útil ao fazer com que `fetchzip` suporte tipos adicionais de arquivos, porque a implementação pode usar a extensão de um arquivo para determinar se pode descompactá-lo.
  Se a URL que você está usando para baixar o conteúdo não termina com a extensão associada ao arquivo, use este atributo para corrigir o nome do arquivo.

  Este atributo **não** é passado para `fetchurl`.

  _Valor padrão:_ `null`.

`recursiveHash` (Booleano; _opcional_)
: Funciona [como definido em `fetchurl`](#sec-pkgs-fetchers-fetchurl-inputs-recursiveHash), mas seu valor padrão é diferente do de `fetchurl`.

  _Valor padrão:_ `true`.

`downloadToTemp` (Booleano; _opcional_)
: Funciona [como definido em `fetchurl`](#sec-pkgs-fetchers-fetchurl-inputs-downloadToTemp), mas seu valor padrão é diferente do de `fetchurl`.

  _Valor padrão:_ `true`.

`extraPostFetch` **DEPRECATED**
: Este atributo está obsoleto.
  Por favor, use `postFetch` em vez disso.

  Este atributo **não** é passado para `fetchurl`.

### Examples {#sec-pkgs-fetchers-fetchzip-examples}

::::{.example #ex-fetchers-fetchzip-simple-striproot}
# Usando `fetchzip` para gerar conteúdo diretamente

A receita a seguir mostra como usar `fetchzip` para descompactar um arquivo `.tar.gz`:

```nix
{ fetchzip }:
fetchzip {
  url = "https://github.com/NixOS/patchelf/releases/download/0.18.0/patchelf-0.18.0.tar.gz";
  hash = "sha256-3ABYlME9R8klcpJ7MQpyFEFwHmxDDEzIYBqu/CpDYmg=";
}
```

Este arquivo tem todo o seu conteúdo em um diretório chamado `patchelf-0.18.0`.
Isso significa que, após descompactar, você teria que entrar neste diretório para ver o conteúdo do arquivo.
No entanto, `fetchzip` facilita isso através do atributo `stripRoot` (ativado por padrão).

Após construir a receita, a saída da derivation mostrará todos os arquivos do arquivo no nível superior:

```shell
$ nix-build
(output removed for clarity)
/nix/store/1b7h3fvmgrcddvs0m299hnqxlgli1yjw-source

$ ls /nix/store/1b7h3fvmgrcddvs0m299hnqxlgli1yjw-source
aclocal.m4  completions  configure.ac  m4           Makefile.in  patchelf.spec     README.md  tests
build-aux   configure    COPYING       Makefile.am  patchelf.1   patchelf.spec.in  src        version
```

Se `stripRoot` for definido como `false`, a saída da derivation será o arquivo descompactado como está:

```nix
{ fetchzip }:
fetchzip {
  url = "https://github.com/NixOS/patchelf/releases/download/0.18.0/patchelf-0.18.0.tar.gz";
  hash = "sha256-uv3FuKE4DqpHT3yfE0qcnq0gYjDNQNKZEZt2+PUAneg=";
  stripRoot = false;
}
```

:::{.caution}
O hash mudou!
Sempre que alterar atributos de um fetcher do Nixpkgs, [lembre-se de invalidar o hash](#chap-pkgs-fetchers-caveats), caso contrário você não obterá os resultados esperados!
:::

Após construir a receita:

```shell
$ nix-build
(output removed for clarity)
/nix/store/2hy5bxw7xgbgxkn0i4x6hjr8w3dbx16c-source

$ ls /nix/store/2hy5bxw7xgbgxkn0i4x6hjr8w3dbx16c-source
patchelf-0.18.0
```
::::

::::{.example #ex-fetchers-fetchzip-rar-archive}
# Usando `fetchzip` para descompactar um arquivo `.rar`

O pacote `unrar` fornece um [setup hook](#ssec-setup-hooks) para descompactar arquivos `.rar` durante a [fase de descompactação](#ssec-unpack-phase), que pode ser usado com `fetchzip` para descompactar esses arquivos:

```nix
{ fetchzip, unrar }:
fetchzip {
  url = "https://archive.org/download/SpaceCadet_Plus95/Space_Cadet.rar";
  hash = "sha256-fC+zsR8BY6vXpUkVd6i1jF0IZZxVKVvNi6VWCKT+pA4=";
  stripRoot = false;
  nativeBuildInputs = [ unrar ];
}
```

Como este arquivo `.rar` em particular não coloca seu conteúdo em um diretório dentro do arquivo, `stripRoot` deve ser definido como `false`.

Após construir a receita, a saída da derivation mostrará os arquivos descompactados:

```shell
$ nix-build
(output removed for clarity)
/nix/store/zpn7knxfva6rfjja2gbb4p3l9w1f0d36-source

$ ls /nix/store/zpn7knxfva6rfjja2gbb4p3l9w1f0d36-source
FONT.DAT      PINBALL.DAT  PINBALL.EXE	PINBALL2.MID  TABLE.BMP    WMCONFIG.EXE
MSCREATE.DIR  PINBALL.DOC  PINBALL.MID	Sounds	     WAVEMIX.INF
```
::::

## `fetchpatch` {#fetchpatch}

`fetchpatch` funciona de forma muito semelhante a `fetchurl` com os mesmos argumentos esperados. Ele espera arquivos de patch como fonte e realiza a normalização neles antes de calcular o checksum. Por exemplo, ele removerá comentários ou outras partes instáveis que às vezes são adicionadas por sistemas de controle de versão e podem mudar com o tempo.

- `relative`: Semelhante ao uso da flag `--relative` do `git-diff`, mantém apenas as alterações dentro do diretório especificado, tornando os caminhos relativos a ele.
- `stripLen`: Remove os primeiros `stripLen` componentes dos nomes de caminho no patch.
- `decode`: Envia os dados baixados através deste comando antes de processá-los como um patch.
- `extraPrefix`: Prefixa os nomes de caminho com esta string.
- `excludes`: Exclui arquivos que correspondem a esses padrões (aplica-se após os argumentos acima).
- `includes`: Inclui apenas arquivos que correspondem a esses padrões (aplica-se após os argumentos acima).
- `hunks`: Escolhe os hunks especificados de cada arquivo (aplica-se após os argumentos acima).
  Note que você pode especificar uma lista de números ou intervalos de números
  (por exemplo, `[ 1 2 3 4 ]`, `[ "1-4" ]`, `[ "-4" ]`, ou `[ "1-" ]` seriam todos o mesmo intervalo efetivo em um patch aplicando 4 hunks a um único arquivo).
- `revert`: Reverte o patch.

Note que, como o checksum é calculado após a aplicação desses efeitos, usar ou modificar esses argumentos não terá efeito a menos que o argumento `hash` também seja alterado.

A maioria dos outros fetchers retorna um diretório em vez de um único arquivo.

## `fetchDebianPatch` {#fetchdebianpatch}

Um wrapper em torno de `fetchpatch`, que recebe:
- `patch` e `hash`: o nome do arquivo do patch,
  e seu hash após a normalização por `fetchpatch` ;
- `pname`: o nome do pacote fonte Debian ;
- `version`: o número da versão upstream ;
- `debianRevision`: o [número de revisão Debian] se aplicável ;
- a `area` do arquivo Debian: `main` (padrão), `contrib`, ou `non-free`.

Aqui está um exemplo de `fetchDebianPatch` em ação:

```nix
{
  lib,
  fetchDebianPatch,
  buildPythonPackage,
}:

buildPythonPackage rec {
  pname = "pysimplesoap";
  version = "1.16.2";
  src = <...>;

  patches = [
    (fetchDebianPatch {
      inherit pname version;
      debianRevision = "5";
      patch = "Add-quotes-to-SOAPAction-header-in-SoapClient.patch";
      hash = "sha256-xA8Wnrpr31H8wy3zHSNfezFNjUJt1HbSXn3qUMzeKc0=";
    })
  ];

  # ...
}
```

Os patches são buscados de `sources.debian.org`, e portanto devem vir de uma
versão de pacote que foi carregada para o arquivo Debian. Pacotes podem
ser removidos de lá uma vez que aquela versão específica não esteja mais em nenhuma suíte
(stable, testing, unstable, etc.), então os mantenedores devem usar
`copy-tarballs.pl` para arquivar o patch se ele precisar estar disponível
a longo prazo.

[número de revisão Debian]: https://www.debian.org/doc/debian-policy/ch-controlfields.html#version

## `fetchsvn` {#fetchsvn}

Usado com Subversion. Espera `url` para um diretório Subversion, `rev`, e `hash`.

## `fetchgit` {#fetchgit}

Usado com Git. Espera `url` para um repositório Git, `rev` ou `tag`, e `hash`. `rev` neste caso pode ser o ID completo do commit git (hash SHA1), ou usar `tag` para um nome de tag como `refs/tags/v1.0`.

Se você quiser buscar uma tag, você deve passar o parâmetro `tag` em vez de `rev`, o que tem o mesmo efeito que definir `rev = "refs/tags"/${version}"`.
Isso é mais seguro do que apenas definir `rev = version` em relação a possíveis conflitos de nomes de branch e tag.

Além disso, os seguintes argumentos opcionais podem ser fornecidos:

*`fetchSubmodules`* (Booleano)

: Se deve também buscar os submódulos de um repositório.

*`fetchLFS`* (Booleano)

: Se deve buscar objetos LFS.

*`preFetch`* (String)

: Código shell a ser executado antes que o repositório seja buscado, para permitir
  a alteração do ambiente em que o fetcher é executado.

*`postFetch`* (String)

: Código shell executado após o repositório ter sido buscado com sucesso.
  Isso pode fazer coisas como verificar ou transformar o arquivo.

*`leaveDotGit`* (Booleano)

: Se o diretório `.git` do clone *não* deve ser removido após o checkout.

  No entanto, esteja avisado que o formato do repositório git não é estável e esta flag, portanto, não é adequada para uso real por si só.
  Use isso apenas para fins de teste ou em conjunto com a remoção do diretório `.git` em `postFetch`.

*`deepClone`* (Booleano)

: Clona o repositório inteiro em vez de apenas criar um clone raso.
  Isso implica `leaveDotGit`.

*`fetchTags`* (Booleano)

: Se deve buscar todas as tags do repositório remoto. Isso é útil quando o processo de construção precisa executar `git describe` ou outros comandos que exigem que as informações de tag estejam disponíveis. Este parâmetro implica `leaveDotGit`, pois as tags são armazenadas no diretório `.git`.

*`sparseCheckout`* (Lista de String)

: Impede o git de buscar blobs desnecessários do servidor.
  Isso é útil se apenas partes do repositório forem necessárias.

  ::: {.example #ex-fetchgit-sparseCheckout}

  # Use `sparseCheckout` para incluir apenas alguns diretórios:

  ```nix
  { stdenv, fetchgit }:

  stdenv.mkDerivation {
    name = "hello";
    src = fetchgit {
      url = "https://...";
      sparseCheckout = [
        "directory/to/be/included"
        "another/directory"
      ];
      hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    };
  }
  ```
  :::

  Veja [git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) para mais informações.

*`rootDir`* (String)

: Quando não vazio, copia apenas o conteúdo do subdiretório do repositório para o resultado. Define automaticamente `sparseCheckout` e `nonConeMode` para evitar o checkout de quaisquer peças extras. Incompatível com `leaveDotGit`.

Alguns parâmetros adicionais para casos de uso específicos podem ser encontrados listados nos parâmetros da função na declaração de `fetchgit`: `pkgs/build-support/fetchgit/default.nix`.
Adições futuras de parâmetros também podem ocorrer sem serem imediatamente documentadas aqui.

## `fetchfossil` {#fetchfossil}

Usado com Fossil. Espera `url` para um arquivo Fossil, `rev`, e `hash`.

## `fetchcvs` {#fetchcvs}

Usado com CVS. Espera `cvsRoot`, `tag`, e `hash`.

## `fetchhg` {#fetchhg}

Usado com Mercurial. Espera `url`, `rev`, `hash`, sobrescrevível com [`<pkg>.overrideAttrs`](#sec-pkg-overrideAttrs).

Várias funções de fetcher envolvem parte de `fetchurl` e `fetchzip`. Elas são principalmente funções de conveniência destinadas a destinos comumente usados de código-fonte no Nixpkgs. Esses fetchers wrapper estão listados abaixo.

## `fetchFromGitea`, `fetchFromForgejo` and `fetchFromCodeberg` {#fetchfromgitea}

`fetchFromGitea`, também apelidado de `fetchFromForgejo`, espera cinco argumentos. `domain` é o nome do servidor Gitea/Forgejo. `owner` é uma string correspondente ao usuário ou organização que controla este repositório. `repo` corresponde ao nome do repositório de software. Estes estão localizados no topo de cada página HTML do Gitea/Forgejo como `owner`/`repo`. `rev` corresponde ao hash do commit Git ou tag (por exemplo, `v1.0`) que será baixado do Git. Finalmente, `hash` corresponde ao hash do diretório extraído. Novamente, outros algoritmos de hash também estão disponíveis, mas `hash` é atualmente preferido.

Como <codeberg.org> é atualmente o servidor Forgejo público mais popular, o fetcher `fetchFromCodeberg` também está disponível, que preenche previamente o atributo `domain`.

## `fetchFromGitHub` {#fetchfromgithub}

`fetchFromGitHub` espera quatro argumentos. `owner` é uma string correspondente ao usuário ou organização do GitHub que controla este repositório. `repo` corresponde ao nome do repositório de software. Estes estão localizados no topo de cada página HTML do GitHub como `owner`/`repo`. `rev` corresponde ao hash do commit Git ou tag (por exemplo, `v1.0`) que será baixado do Git. Se você precisar buscar uma tag, no entanto, você deve preferir usar o parâmetro `tag`, que consegue isso de uma forma mais segura e com menos boilerplate. Finalmente, `hash` corresponde ao hash do diretório extraído. Novamente, outros algoritmos de hash também estão disponíveis, mas `hash` é atualmente preferido.

Para usar uma instância diferente do GitHub, use `githubBase` (o padrão é `"github.com"`).

Por padrão, `fetchFromGitHub` usa `fetchzip` para baixar o arquivo fonte do GitHub para a revisão especificada.
No entanto, `fetchFromGitHub` mudará automaticamente para usar `fetchgit` em qualquer um destes casos:

- `forceFetchGit`, `leaveDotGit`, `deepClone`, `fetchLFS`, ou `fetchSubmodules` são definidos como `true`
- `sparseCheckout` contém quaisquer entradas (é uma lista não vazia)
- `rootDir` é definido como uma string não vazia

Quando `fetchgit` é usado, consulte a seção `fetchgit` para documentação de suas opções disponíveis.

## `fetchFromGitLab` {#fetchfromgitlab}

Isso é usado com repositórios GitLab. Ele se comporta de forma semelhante a `fetchFromGitHub`, e espera `owner`, `repo`, `rev`, e `hash`.

Para usar uma instância específica do GitLab, use `domain` (o padrão é `"gitlab.com"`).

## `fetchFromGitiles` {#fetchfromgitiles}

Isso é usado com repositórios Gitiles. Os argumentos esperados são semelhantes a `fetchgit`.

## `fetchFromBitbucket` {#fetchfrombitbucket}

Usado para repositórios hospedados no Bitbucket (`"bitbucket.org"`) de propriedade da Atlassian Corporation, com sede na Austrália. Ele requer um argumento `owner` e `repo`, que são ambas strings que referenciam o ID do workspace e o nome do repositório hospedado na nuvem do Bitbucket, bem como um argumento `tag` ou `rev`.

Por padrão, `fetchFromBitbucket` tentará baixar um tarball de snapshot de commit na `tag` ou `rev` especificada em `https://bitbucket.org/<owner>/<repo>/get/<tag-or-rev>.tar.gz`

No entanto, `fetchFromBitbucket` mudará automaticamente para usar `fetchgit` e buscar de `https://bitbucket.org/<owner>/<repo>.git` em qualquer um destes casos:

- `forceFetchGit`, `leaveDotGit`, `deepClone`, `fetchLFS`, ou `fetchSubmodules` são definidos como `true`
- `sparseCheckout` contém quaisquer entradas (é uma lista não vazia)
- `rootDir` é definido como uma string não vazia

Quando `fetchgit` é usado, consulte a seção `fetchgit` para documentação de suas opções disponíveis.

## `fetchFromRepoOrCz` {#fetchfromrepoorcz}

Isso é usado com repositórios repo.or.cz. Os argumentos esperados são muito semelhantes aos de `fetchFromGitHub` acima.

## `fetchFromSourcehut` {#fetchfromsourcehut}

Isso é usado com repositórios sourcehut. Semelhante a `fetchFromGitHub` acima,
ele espera `owner`, `repo`, `rev` e `hash`, mas não se esqueça do til (~)
na frente do nome de usuário! Os argumentos esperados também incluem `vc` ("git" (padrão)
ou "hg"), `domain` e `fetchSubmodules`.

Se `fetchSubmodules` for `true`, `fetchFromSourcehut` usa `fetchgit`
ou `fetchhg` com `fetchSubmodules` ou `fetchSubrepos` definidos como `true`,
respectivamente. Caso contrário, o fetcher usa `fetchzip`.

## `fetchFromRadicle` {#fetchfromradicle}

Isso é usado com repositórios Radicle. Os argumentos esperados são semelhantes a `fetchgit`.

Requer um argumento `seed` (por exemplo, `seed.radicle.dev` ou `rosa.radicle.network`) e um argumento `repo`
(o ID do repositório *sem* o prefixo `rad:`). Também aceita um argumento `node` opcional que
contém o ID do nó do qual buscar a ref especificada. Se `node` for `null` (o
padrão), uma ref canônica é buscada em vez disso.

```nix
fetchFromRadicle {
  seed = "seed.radicle.dev";
  repo = "z3gqcJUoA1n9HaHKufZs5FCSGazv5"; # heartwood
  tag = "releases/1.3.0";
  hash = "sha256-4o88BWKGGOjCIQy7anvzbA/kPOO+ZsLMzXJhE61odjw=";
}
```

## `fetchRadiclePatch` {#fetchradiclepatch}

`fetchRadiclePatch` funciona de forma muito semelhante a `fetchFromRadicle` com quase os mesmos argumentos
esperados. No entanto, em vez de um argumento `rev` ou `tag`, um argumento `revision` é esperado, que
contém o ID completo da revisão do patch Radicle a ser buscado.

```nix
fetchRadiclePatch {
  seed = "rosa.radicle.network";
  repo = "z4V1sjrXqjvFdnCUbxPFqd5p4DtH5"; # radicle-explorer
  revision = "d97d872386c70607beda2fb3fc2e60449e0f4ce4"; # patch: d77e064
  hash = "sha256-ttnNqj0lhlSP6BGzEhhUOejKkkPruM9yMwA5p9Di4bk=";
}
```

## `requireFile` {#requirefile}

`requireFile` permite solicitar arquivos que não podem ser buscados automaticamente, mas cujo conteúdo é conhecido.
Esta é uma solução útil de último recurso para restrições de licença que proíbem a redistribuição, ou para downloads que são acessíveis apenas após autenticação interativa em um navegador.
Se o arquivo solicitado estiver presente no Nix store, a derivation resultante não será construída, porque sua saída esperada já está disponível.
Caso contrário, o builder será executado, mas falhará com uma mensagem explicando ao usuário como fornecer o arquivo. O seguinte código, por exemplo:

```nix
requireFile {
  name = "jdk-${version}_linux-x64_bin.tar.gz";
  url = "https://www.oracle.com/java/technologies/javase-jdk11-downloads.html";
  hash = "sha256-lL00+F7jjT71nlKJ7HRQuUQ7kkxVYlZh//5msD8sjeI=";
}
```
resulta nesta mensagem de erro:
```
***
Unfortunately, we cannot download file jdk-11.0.10_linux-x64_bin.tar.gz automatically.
Please go to https://www.oracle.com/java/technologies/javase-jdk11-downloads.html to download it yourself, and add it to the Nix store
using either
  nix-store --add-fixed sha256 jdk-11.0.10_linux-x64_bin.tar.gz
or
  nix-prefetch-url --type sha256 file:///path/to/jdk-11.0.10_linux-x64_bin.tar.gz

***
```

Esta função deve ser usada apenas por software não redistribuível com uma licença não livre que precisamos exigir que o usuário baixe manualmente.
Ela produz pacotes que não podem ser construídos automaticamente.

## `fetchtorrent` {#fetchtorrent}

`fetchtorrent` espera dois argumentos. `url` que pode ser um Magnet URI (Link Magnet) como `magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c` ou uma URL HTTP apontando para um arquivo `.torrent`. Ele também pode receber um argumento `config` que criará um arquivo de configuração `settings.json` e o passará para `transmission`, o programa subjacente que está realizando a busca. As opções de configuração disponíveis para `transmission` podem ser encontradas [aqui](https://github.com/transmission/transmission/blob/main/docs/Editing-Configuration-Files.md#options)

```nix
{ fetchtorrent }:

fetchtorrent {
  config = {
    peer-limit-global = 100;
  };
  url = "magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c";
  hash = "";
}
```

### Parameters {#fetchtorrent-parameters}

- `url`: Magnet URI (Link Magnet) como `magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c` ou uma URL HTTP apontando para um arquivo `.torrent`.

- `backend`: Qual programa bittorrent usar. Padrão: `"transmission"`. Valores válidos são `"rqbit"` ou `"transmission"`. Estes são os dois clientes torrent mais adequados para buscar em uma fixed-output derivation no momento da escrita, pois podem ser facilmente encerrados após o uso. `rqbit` é escrito em Rust e tem um tamanho de closure menor que `transmission`, e as propriedades de desempenho e descoberta de pares diferem entre esses clientes, exigindo experimentação para decidir qual é o melhor.

- `config`: Ao usar `transmission` como `backend`, uma configuração json pode
  ser fornecida ao transmission. Consulte a [documentação upstream](https://github.com/transmission/transmission/blob/main/docs/Editing-Configuration-Files.md) para obter informações sobre como configurar.

## `fetchItchIo` {#fetchitchio}

`fetchItchIo` é um fetcher para baixar ativos de jogos do [itch.io](https://itch.io/). Ele aceita estes argumentos:

- `gameUrl`: A URL da página da loja do jogo.
- `upload`: O ID numérico do ativo a ser baixado. Para encontrar o ID de upload de um ativo, verifique o basename da URL da requisição ao baixar o ativo usando um navegador.
- `hash`.
- `name` (opcional): O nome da derivation, frequentemente o nome do arquivo do ativo.
- `extraMessage` (opcional): Mensagem extra impressa se a chave da API não for fornecida ou se a conta não comprou o jogo.

Para que este fetcher funcione, a variável de ambiente `NIX_ITCHIO_API_KEY` deve ser definida para o processo de construção do nix (que é o nix-daemon no modo multiusuário), e deve pertencer a uma conta que comprou o jogo se ele estiver atrás de um paywall.
Para obter sua chave de API, vá para a seção ["API key"](https://itch.io/user/settings/api-keys) das configurações da sua conta no itch.io.

```nix
{ fetchItchIo }:

fetchItchIo {
  name = "DungeonDuelMonsters-linux-x64.zip";
  hash = "sha256-gq2nGwpaStqaVI1pL63xygxOI/z53o+zLwiKizG98Ks=";
  gameUrl = "https://mikaygo.itch.io/ddm";
  upload = "13371354";
}
```