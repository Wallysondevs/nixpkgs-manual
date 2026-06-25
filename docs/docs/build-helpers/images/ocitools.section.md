# pkgs.ociTools {#sec-pkgs-ociTools}

`pkgs.ociTools` é um conjunto de funções para criar *bundles* de contêineres em tempo de execução de acordo com a [especificação de tempo de execução OCI v1.0.0](https://github.com/opencontainers/runtime-spec/blob/v1.0.0/spec.md). Ele não faz suposições sobre o *runner* de contêiner que você escolher usar para executar o contêiner criado.

O conjunto de funções em `pkgs.ociTools` atualmente não lida com a [especificação de imagem OCI](https://github.com/opencontainers/image-spec).

Em um nível alto, uma implementação OCI baixaria uma Imagem OCI e então descompactaria essa imagem em um *bundle* de sistema de arquivos de Tempo de Execução OCI. Neste ponto, o *Bundle* de Tempo de Execução OCI seria executado por um Tempo de Execução OCI. `pkgs.ociTools` fornece utilitários para criar *bundles* de Tempo de Execução OCI.

## buildContainer {#ssec-pkgs-ociTools-buildContainer}

Esta função cria um contêiner de tempo de execução OCI (consistindo em um `config.json` e um diretório de sistema de arquivos raiz) que executa um único comando dentro dele. O *nix store* do contêiner conterá todas as dependências referenciadas do comando fornecido.

Esta função assume que o contêiner será executado em plataformas POSIX e define configurações (como o usuário que executa o processo ou certas montagens) de acordo com essa suposição. Por causa disso, um contêiner construído com `buildContainer` não funcionará no Windows ou em outras plataformas não-POSIX sem modificações na configuração do contêiner. Essas modificações não são suportadas por `buildContainer`.

Para plataformas `linux`, `buildContainer` também configura os seguintes *namespaces* (veja {manpage}`unshare(1)`) para isolar o contêiner OCI do *namespace* global: PID, rede, montagem, IPC e UTS.

Note que nenhum *namespace* de usuário é criado, o que significa que você não poderá executar o contêiner a menos que seja o usuário `root`.

### Inputs {#ssec-pkgs-ociTools-buildContainer-inputs}

`buildContainer` espera um argumento com os seguintes atributos:

`args` (Lista de String)

: Especifica um conjunto de argumentos para executar dentro do contêiner. Quaisquer pacotes referenciados por `args` serão disponibilizados dentro do contêiner.

`mounts` (Conjunto de Atributos; _opcional_)

: Especificaria montagens adicionais que o tempo de execução deve disponibilizar ao contêiner.

  :::{.warning}
  Conforme explicado na [issue #290879](https://github.com/NixOS/nixpkgs/issues/290879), este atributo é atualmente ignorado.
  :::

  :::{.note}
  `buildContainer` inclui um conjunto mínimo de sistemas de arquivos necessários para serem montados no contêiner, e este conjunto não pode ser alterado com o atributo `mounts`.
  :::

  _Valor padrão:_ `{}`.

`readonly` (Booleano; _opcional_)

: Se `true`, define o sistema de arquivos raiz do contêiner como somente leitura.

  _Valor padrão:_ `false`.

`os` **OBSOLETO**

: Especifica o sistema operacional no qual o sistema de arquivos do contêiner é baseado. Se especificado, seu valor deve seguir a [Especificação de Configuração de Imagem OCI](https://github.com/opencontainers/image-spec/blob/main/config.md#properties). De acordo com a especificação vinculada, todos os valores possíveis para `$GOOS` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão `darwin` ou `linux`.

  _Valor padrão:_ `"linux"`.

`arch` **OBSOLETO**

: Usado para especificar a arquitetura para a qual os binários no sistema de arquivos do contêiner foram compilados. Se especificado, seu valor deve seguir a [Especificação de Configuração de Imagem OCI](https://github.com/opencontainers/image-spec/blob/main/config.md#properties). De acordo com a especificação vinculada, todos os valores possíveis para `$GOARCH` na [documentação do Go](https://go.dev/doc/install/source#environment) devem ser válidos, mas comumente serão `386`, `amd64`, `arm` ou `arm64`.

  _Valor padrão:_ `x86_64`.

### Examples {#ssec-pkgs-ociTools-buildContainer-examples}

::: {.example #ex-ociTools-buildContainer-bash}
# Criando um contêiner de tempo de execução OCI que executa `bash`

Este exemplo usa `ociTools.buildContainer` para criar um contêiner simples que executa `bash`.

```nix
{
  ociTools,
  lib,
  bash,
}:
ociTools.buildContainer {
  args = [ (lib.getExe bash) ];

  readonly = false;
}
```

Como exemplo de como executar o contêiner gerado por este pacote, usaremos `runc` para iniciar o contêiner. Qualquer outra ferramenta que suporte contêineres OCI poderia ser usada em vez disso.

```shell
$ nix-build
(alguma saída removida para clareza)
/nix/store/7f9hgx0arvhzp2a3qphp28rxbn748l25-join

$ cd /nix/store/7f9hgx0arvhzp2a3qphp28rxbn748l25-join
$ nix-shell -p runc
[nix-shell:/nix/store/7f9hgx0arvhzp2a3qphp28rxbn748l25-join]$ sudo runc run ocitools-example
help
GNU bash, version 5.2.26(1)-release (x86_64-pc-linux-gnu)
(alguma saída removida para clareza)
```
:::