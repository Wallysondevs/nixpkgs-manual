# CUDA {#cuda}

Compute Unified Device Architecture (CUDA) é uma plataforma de computação paralela e um modelo de interface de programação de aplicações (API) criado pela NVIDIA. É comumente usado para acelerar problemas computacionalmente intensivos e tem sido amplamente adotado para aplicações de computação de alto desempenho (HPC) e aprendizado de máquina (ML).

## Guia do Usuário {#cuda-user-guide}

Pacotes fornecidos pela NVIDIA que requerem CUDA são tipicamente armazenados em conjuntos de pacotes CUDA.

Nixpkgs fornece vários conjuntos de pacotes CUDA, cada um baseado em uma versão diferente do CUDA. Atributos de nível superior que fornecem acesso a conjuntos de pacotes CUDA seguem estas convenções de nomenclatura:

- `cudaPackages_x_y`: Um conjunto de pacotes com versão maior-menor para uma versão específica do CUDA, onde `x` e `y` são as versões maior e menor da versão do CUDA.
- `cudaPackages_x`: Um alias com versão maior para o conjunto de pacotes CUDA com versão maior-menor com a última versão maior do CUDA amplamente suportada.
- `cudaPackages`: Um alias sem versão para o alias com versão maior para a última versão do CUDA amplamente suportada. O conjunto de pacotes referenciado por este alias também é conhecido como o conjunto de pacotes CUDA "padrão".

É recomendado usar o atributo `cudaPackages` sem versão. Embora conjuntos de pacotes versionados estejam disponíveis (por exemplo, `cudaPackages_12_8`), eles são removidos periodicamente.

Aqui estão dois exemplos para ilustrar as convenções de nomenclatura:

- Se `cudaPackages_12_9` for a última versão da série 12.x, mas bibliotecas principais como OpenCV ou ONNX Runtime falharem ao compilar com ela, `cudaPackages_12` pode ser um alias para `cudaPackages_12_8` em vez de `cudaPackages_12_9`.
- Se `cudaPackages_13_1` for a última versão, mas bibliotecas principais como PyTorch ou Torch Vision falharem ao compilar com ela, `cudaPackages` pode ser um alias para `cudaPackages_12` em vez de `cudaPackages_13`.

Todos os conjuntos de pacotes CUDA incluem pacotes CUDA comuns como `libcublas`, `cudnn`, `tensorrt` e `nccl`.

### Configurando Nixpkgs para CUDA {#cuda-configuring-nixpkgs-for-cuda}

O suporte a CUDA não é habilitado por padrão no Nixpkgs. Para habilitar o suporte a CUDA, certifique-se de que o Nixpkgs seja importado com uma configuração semelhante à seguinte:

```nix
{ pkgs }:
{
  allowUnfreePredicate = pkgs._cuda.lib.allowUnfreeCudaPredicate;
  cudaCapabilities = [ <target-architectures> ];
  cudaForwardCompat = true;
  cudaSupport = true;
}
```

A maioria dos pacotes CUDA não são livres, então `allowUnfreePredicate` ou `allowUnfree` devem ser definidos.

A opção de configuração `cudaSupport` é usada por pacotes para habilitar condicionalmente a funcionalidade específica do CUDA. Esta opção de configuração é comumente usada por pacotes que podem ser construídos com ou sem suporte a CUDA.

A opção de configuração `cudaCapabilities` especifica uma lista de capacidades CUDA. Os pacotes podem usar esta opção para controlar a geração de código de dispositivo para aproveitar a funcionalidade específica da arquitetura, acelerar os tempos de compilação produzindo menos código de dispositivo ou reduzir os fechamentos de pacotes. Por exemplo, você pode compilar para GPUs Ada Lovelace com `cudaCapabilities = [ "8.9" ];`. Se `cudaCapabilities` não for fornecido, o valor padrão é calculado por conjunto de pacotes, derivado de uma lista de GPUs suportadas por essa versão do CUDA. Consulte [GPUs suportadas](https://en.wikipedia.org/wiki/CUDA#GPUs_supported) para placas específicas. Mantenedores de bibliotecas devem consultar a [Documentação do NVCC](https://docs.nvidia.com/cuda/cuda-compiler-driver-nvcc/) e suas notas de lançamento.

::: {.caution}
Certas capacidades CUDA não são direcionadas por padrão, incluindo capacidades pertencentes à família de dispositivos Jetson (por exemplo, `8.7`, que corresponde ao Jetson Orin) ou conjuntos de recursos não-base (por exemplo, `9.0a`, que corresponde ao conjunto de recursos exclusivo do Hopper). Se você precisar direcionar essas capacidades, deve definir explicitamente `cudaCapabilities` para incluí-las.
:::

A opção de configuração booleana `cudaForwardCompat` determina se o suporte a PTX para hardware futuro está habilitado.

### Modificando conjuntos de pacotes CUDA {#cuda-modifying-cuda-package-sets}

Os conjuntos de pacotes CUDA são definidos em `pkgs/top-level/cuda-packages.nix`. Um conjunto de pacotes CUDA é criado por `callPackage`-ing `pkgs/development/cuda-modules/default.nix` com um conjunto de atributos `manifests`, contendo manifestos NVIDIA para cada redistribuível. Os manifestos para redistribuíveis suportados estão disponíveis através de `_cuda.manifests` e residem em `pkgs/development/cuda-modules/_cuda/manifests`.

A maioria das ferramentas do conjunto de pacotes CUDA está disponível através do conjunto de atributos de nível superior `_cuda`, um ponto fixo definido fora dos conjuntos de pacotes CUDA. Como um ponto fixo, `_cuda` deve ser modificado através de seu atributo `extend`.

::: {.caution}
Conforme indicado pelo prefixo de sublinhado, `_cuda` é um detalhe de implementação e nenhuma garantia é fornecida em relação à sua estabilidade ou API. O conjunto de atributos `_cuda` é exposto apenas para facilitar a criação ou modificação de conjuntos de pacotes CUDA por usuários experientes e fora da árvore.
:::

Modificações fora da árvore de pacotes devem usar `overrideAttrs` para fazer quaisquer modificações necessárias à expressão do pacote.

::: {.note}
O conjunto de atributos `_cuda` anteriormente expunha `fixups`, um conjunto de atributos que mapeava do nome do pacote (`pname`) para uma expressão compatível com `callPackage` que era fornecida a `overrideAttrs` no resultado de um construtor redistribuível genérico. Esta funcionalidade foi removida em favor de incluir expressões de pacote completas para cada pacote redistribuível para garantir a consistência da associação do conjunto de atributos em todas as versões, plataformas e configurações CUDA suportadas.
:::

### Estendendo conjuntos de pacotes CUDA {#cuda-extending-cuda-package-sets}

Os conjuntos de pacotes CUDA são escopos e fornecem o atributo `overrideScope` usual para sobrescrever atributos de pacotes (veja a nota sobre `_cuda` em [Configurando conjuntos de pacotes CUDA](#cuda-modifying-cuda-package-sets)).

Inspirado por `pythonPackagesExtensions`, o atributo `_cuda.extensions` é uma lista de extensões aplicadas a cada versão do conjunto de pacotes CUDA, permitindo a modificação de todas as versões do conjunto de pacotes CUDA sem a necessidade de saber seus nomes ou enumerá-los e modificá-los explicitamente. Como exemplo, desabilitar `cuda_compat` em todos os conjuntos de pacotes CUDA pode ser realizado com este overlay:

```nix
final: prev: {
  _cuda = prev._cuda.extend (
    _: prevAttrs: {
      extensions = prevAttrs.extensions ++ [ (_: _: { cuda_compat = null; }) ];
    }
  );
}
```

Pacotes redistribuíveis são construídos pelo auxiliar `buildRedist`; veja `pkgs/development/cuda-modules/buildRedist/default.nix` para a implementação.

### Usando `cudaPackages` {#cuda-using-cudapackages}

::: {.caution}
Uma quantidade não trivial de descoberta e usabilidade de pacotes CUDA depende dos vários hooks de configuração usados por um conjunto de pacotes CUDA. Como resultado, os usuários provavelmente encontrarão problemas ao tentar realizar compilações dentro de um `devShell` sem invocar fases manualmente.
:::

Para usar um ou mais pacotes CUDA em uma expressão, dê à expressão um parâmetro `cudaPackages` e, caso o suporte a CUDA seja opcional, adicione um parâmetro `config` e `cudaSupport`:

```nix
{
  config,
  cudaSupport ? config.cudaSupport,
  cudaPackages,
}:
<package-expression>
```

Nos argumentos de derivação do seu pacote, é _fortemente_ recomendado que os seguintes sejam definidos:

```nix
{
  __structuredAttrs = true;
  strictDeps = true;
}
```

Essas configurações garantem que os hooks de configuração do CUDA funcionem conforme o esperado.

Ao usar `callPackage`, você pode optar por passar uma variante diferente, por exemplo, quando um pacote requer uma versão específica do CUDA:

```nix
{ mypkg = callPackage { cudaPackages = cudaPackages_12_6; }; }
```

::: {.caution}
Sobrescrever o conjunto de pacotes CUDA para um pacote pode causar inconsistências, porque a sobrescrita não afeta suas dependências diretas ou transitivas. Como resultado, é fácil acabar com um pacote que usa um conjunto de pacotes CUDA diferente de suas dependências. Se possível, é recomendado que você altere o conjunto de pacotes CUDA padrão globalmente, para garantir um ambiente consistente.
:::

### Variantes Nixpkgs CUDA {#cuda-nixpkgs-cuda-variants}

As variantes Nixpkgs CUDA são fornecidas principalmente para a conveniência de selecionar pacotes habilitados para CUDA por caminho de atributo. Como exemplo, a coleção `pkgsForCudaArch` de variantes Nixpkgs CUDA permite que você acesse uma instanciação do OpenCV com suporte a CUDA para uma GPU Ada Lovelace com o caminho de atributo `pkgsForCudaArch.sm_89.opencv`, sem a necessidade de modificar a `config` fornecida ao importar Nixpkgs.

::: {.caution}
As variantes Nixpkgs não são gratuitas: elas exigem a reavaliação do Nixpkgs. Sempre que possível, importe o Nixpkgs uma vez, com a configuração desejada.
:::

#### Usando `cudaPackages.pkgs` {#cuda-using-cudapackages-pkgs}

Cada conjunto de pacotes CUDA possui um atributo `pkgs`, que é uma variante do Nixpkgs na qual o conjunto de pacotes CUDA envolvente se torna o padrão. Isso foi feito principalmente para evitar vazamento de conjunto de pacotes, onde um membro de um conjunto de pacotes CUDA não padrão tem uma dependência (potencialmente transitiva) de um membro do conjunto de pacotes CUDA padrão.

::: {.note}
O vazamento de conjunto de pacotes é um problema comum no Nixpkgs e não se limita aos conjuntos de pacotes CUDA.
:::

Como um benefício adicional de `pkgs` ser configurado dessa forma, construir um pacote com uma versão não padrão do CUDA é tão simples quanto acessar um atributo. Como exemplo, `cudaPackages_12_8.pkgs.opencv` fornece OpenCV construído com CUDA 12.8.

#### Usando `pkgsCuda` {#cuda-using-pkgscuda}

O conjunto de atributos `pkgsCuda` é uma variante do Nixpkgs configurada com `cudaSupport = true;` e `rocmSupport = false`. É uma maneira conveniente de acessar uma variante do Nixpkgs configurada com o conjunto padrão de capacidades CUDA.

#### Usando `pkgsForCudaArch` {#cuda-using-pkgsforcudaarch}

O conjunto de atributos `pkgsForCudaArch` mapeia arquiteturas CUDA (por exemplo, `sm_89` para Ada Lovelace ou `sm_90a` para Hopper específica da arquitetura) para variantes Nixpkgs configuradas para suportar exatamente essa arquitetura. Como exemplo, `pkgsForCudaArch.sm_89` é uma variante Nixpkgs que estende `pkgs` e define os seguintes valores em `config`:

```nix
{
  cudaSupport = true;
  cudaCapabilities = [ "8.9" ];
  cudaForwardCompat = false;
}
```

::: {.note}
Em `pkgsForCudaArch`, a opção `cudaForwardCompat` é definida como `false` porque exatamente uma arquitetura CUDA é suportada pela variante Nixpkgs correspondente. Além disso, algumas arquiteturas, incluindo conjuntos de recursos específicos da arquitetura como `sm_90a`, não podem ser construídas com compatibilidade futura.
:::

::: {.caution}
Nem toda versão do CUDA suporta todas as arquiteturas!

Para ilustrar: o suporte para Blackwell (por exemplo, `sm_100`) foi adicionado no CUDA 12.8. Suponha que o conjunto de pacotes CUDA padrão do nosso Nixpkgs seja o CUDA 12.6. Então a variante Nixpkgs disponível através de `pkgsForCudaArch.sm_100` é inútil, já que pacotes como `pkgsForCudaArch.sm_100.opencv` e `pkgsForCudaArch.sm_100.python3Packages.torch` tentarão gerar código para `sm_100`, uma arquitetura desconhecida para o CUDA 12.6. Nesse caso, você deve usar `pkgsForCudaArch.sm_100.cudaPackages_12_8.pkgs` em vez disso (veja [Usando `cudaPackages.pkgs`](#cuda-using-cudapackages-pkgs) para mais detalhes).
:::

O conjunto de atributos `pkgsForCudaArch` possibilita o acesso a pacotes construídos para uma arquitetura específica sem a necessidade de chamar manualmente `pkgs.extend` e fornecer uma nova `config`. Como exemplo, `pkgsForCudaArch.sm_89.python3Packages.torch` fornece PyTorch construído para GPUs Ada Lovelace.

### Executando contêineres Docker ou Podman com suporte a CUDA {#cuda-docker-podman}

É possível executar contêineres Docker ou Podman com suporte a CUDA. O mecanismo recomendado para realizar esta tarefa é usar o [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/index.html).

O NVIDIA Container Toolkit pode ser habilitado no NixOS da seguinte forma:

```nix
{ hardware.nvidia-container-toolkit.enable = true; }
```

Isso habilitará automaticamente um serviço que gera uma especificação CDI (localizada em `/var/run/cdi/nvidia-container-toolkit.json`) com base no hardware detectado automaticamente da sua máquina. Você pode verificar este serviço executando:

```ShellSession
$ systemctl status nvidia-container-toolkit-cdi-generator.service
```

::: {.note}
Dependendo das configurações que você já havia habilitado em seu sistema, pode ser necessário reiniciar sua máquina para que o NVIDIA Container Toolkit gere uma especificação CDI válida para sua máquina.
:::

Uma vez que uma especificação CDI válida tenha sido gerada para sua máquina no momento da inicialização, tanto o Podman quanto o Docker (> 25) usarão esta especificação se você fornecer a eles a flag `--device`:

```ShellSession
$ podman run --rm -it --device=nvidia.com/gpu=all ubuntu:latest nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 4090 (UUID: <REDACTED>)
GPU 1: NVIDIA GeForce RTX 2080 SUPER (UUID: <REDACTED>)
```

```ShellSession
$ docker run --rm -it --device=nvidia.com/gpu=all ubuntu:latest nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 4090 (UUID: <REDACTED>)
GPU 1: NVIDIA GeForce RTX 2080 SUPER (UUID: <REDACTED>)
```

Você pode verificar todos os identificadores que foram gerados para o seu hardware detectado automaticamente verificando o conteúdo do arquivo `/var/run/cdi/nvidia-container-toolkit.json`:

```ShellSession
$ nix run nixpkgs#jq -- -r '.devices[].name' < /var/run/cdi/nvidia-container-toolkit.json
0
1
all
```

#### Especificando quais dispositivos expor ao contêiner {#cuda-specifying-what-devices-to-expose-to-the-container}

Você pode escolher quais dispositivos são expostos aos seus contêineres usando o identificador na especificação CDI gerada. Como segue:

```ShellSession
$ podman run --rm -it --device=nvidia.com/gpu=0 ubuntu:latest nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 4090 (UUID: <REDACTED>)
```

Você pode repetir o argumento `--device` quantas vezes forem necessárias se tiver várias GPUs e quiser escolher quais expor ao contêiner:

```ShellSession
$ podman run --rm -it --device=nvidia.com/gpu=0 --device=nvidia.com/gpu=1 ubuntu:latest nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 4090 (UUID: <REDACTED>)
GPU 1: NVIDIA GeForce RTX 2080 SUPER (UUID: <REDACTED>)
```

::: {.note}
Por padrão, o NVIDIA Container Toolkit usará o índice da GPU para identificar dispositivos específicos. Você pode alterar a forma de identificar quais dispositivos expor usando o atributo NixOS `hardware.nvidia-container-toolkit.device-name-strategy`.
:::

#### Usando docker-compose {#cuda-using-docker-compose}

É possível expor GPUs a um ambiente `docker-compose` também. Com um arquivo `docker-compose.yaml` como segue:

```yaml
services:
  some-service:
    image: ubuntu:latest
    command: sleep infinity
    deploy:
      resources:
        reservations:
          devices:
          - driver: cdi
            device_ids:
            - nvidia.com/gpu=all
```

Da mesma forma, você pode escolher dispositivos específicos que serão expostos ao contêiner:

```yaml
services:
  some-service:
    image: ubuntu:latest
    command: sleep infinity
    deploy:
      resources:
        reservations:
          devices:
          - driver: cdi
            device_ids:
            - nvidia.com/gpu=0
            - nvidia.com/gpu=1
```

## Contribuindo {#cuda-contributing}

::: {.warning}
Esta seção da documentação ainda está em andamento. Feedback é bem-vindo em GitHub Issues marcando @NixOS/cuda-maintainers ou no [Matrix](https://matrix.to/#/#cuda:nixos.org).
:::

### Manutenção do conjunto de pacotes {#cuda-package-set-maintenance}

O CUDA Toolkit é um conjunto de bibliotecas e software CUDA destinado a fornecer um ambiente de desenvolvimento para aplicações aceleradas por CUDA. Até o lançamento do CUDA 11.4, a NVIDIA só havia disponibilizado o CUDA Toolkit como um instalador runfile de vários gigabytes. A partir do CUDA 11.4 em diante, a NVIDIA também forneceu redistribuíveis CUDA ("CUDA-redist"): componentes do CUDA Toolkit empacotados individualmente destinados a facilitar a redistribuição e inclusão em projetos downstream. Esses pacotes estão disponíveis no conjunto de pacotes [`cudaPackages`](https://search.nixos.org/packages?channel=unstable&type=packages&query=cudaPackages).

Embora o instalador runfile monolítico do CUDA Toolkit não seja mais fornecido, [`cudaPackages.cudatoolkit`](https://search.nixos.org/packages?channel=unstable&type=packages&query=cudaPackages.cudatoolkit) fornece uma aproximação `symlinkJoin`-ed que contém bibliotecas comuns. O uso de [`cudaPackages.cudatoolkit`](https://search.nixos.org/packages?channel=unstable&type=packages&query=cudaPackages.cudatoolkit) é desencorajado: todos os novos projetos devem usar os redistribuíveis CUDA disponíveis em [`cudaPackages`](https://search.nixos.org/packages?channel=unstable&type=packages&query=cudaPackages) em vez disso, pois são muito mais fáceis de manter e atualizar.

#### Atualizando redistribuíveis {#cuda-updating-redistributables}

Sempre que uma nova versão de um manifesto redistribuível for disponibilizada:

1. Verifique o `README.md` correspondente em `pkgs/development/cuda-modules/_cuda/manifests` para a URL a ser usada ao vender manifestos.
2. Atualize a versão do manifesto usada na construção de cada conjunto de pacotes CUDA em `pkgs/top-level/cuda-packages.nix`.
3. Atualize as expressões de pacote em `pkgs/development/cuda-modules/packages`.

A atualização das expressões de pacote consiste em:

- adicionar correções condicionadas a versões mais recentes, como dependências adicionadas ou removidas
- adicionar expressões de pacote para novos pacotes
- atualizar `passthru.brokenConditions` e `passthru.badPlatformsConditions` com várias restrições (por exemplo, novas versões removendo o suporte para várias arquiteturas)

#### Atualizando compiladores e GPUs suportados {#cuda-updating-supported-compilers-and-gpus}

1. Atualize `nvccCompatibilities` em `pkgs/development/cuda-modules/_cuda/db/bootstrap/nvcc.nix` para incluir a versão mais recente do NVCC, bem como quaisquer novos compiladores de host suportados.
2. Atualize `cudaCapabilityToInfo` em `pkgs/development/cuda-modules/_cuda/db/bootstrap/cuda.nix` para incluir quaisquer novas GPUs suportadas pela nova versão do CUDA.

#### Atualizando o conjunto de pacotes CUDA {#cuda-updating-the-cuda-package-set}

::: {.note}
A alteração do conjunto de pacotes CUDA padrão deve ocorrer em um PR separado, permitindo tempo para testes adicionais.
:::

::: {.warning}
Conforme descrito em [Usando `cudaPackages.pkgs`](#cuda-using-cudapackages-pkgs), a correção de implementação atual para vazamento de conjunto de pacotes envolve a criação de uma nova instância para cada conjunto de pacotes CUDA não padrão. Como tal, devemos limitar o número de conjuntos de pacotes CUDA que têm `recurseForDerivations` definido como true: `lib.recurseIntoAttrs` deve ser aplicado apenas ao conjunto de pacotes CUDA padrão.
:::

1. Inclua um novo conjunto de pacotes `cudaPackages_<major>_<minor>` em `pkgs/top-level/cuda-packages.nix` e herde-o em `pkgs/top-level/all-packages.nix`.
2. Construa com sucesso o fechamento do novo conjunto de pacotes, atualizando as expressões em `pkgs/development/cuda-modules/packages` conforme necessário. Abaixo estão algumas falhas comuns:

| Incapaz de ... | Durante ... | Razão | Solução | Nota |
| :------------- | :------------------------------- | :----------------------------------------------- | :-------------------------- | :----------------------------------------------------------- |
| Encontrar cabeçalhos | `configurePhase` ou `buildPhase` | Dependência ausente em uma saída `dev` | Adicione a dependência ausente | A saída `dev` tipicamente contém os cabeçalhos |
| Encontrar bibliotecas | `configurePhase` | Dependência ausente em uma saída `dev` | Adicione a dependência ausente | A saída `dev` tipicamente contém arquivos de configuração CMake |
| Encontrar bibliotecas | `buildPhase` ou `patchelf` | Dependência ausente em uma saída `lib` ou `static` | Adicione a dependência ausente | A saída `lib` ou `static` tipicamente contém as bibliotecas |

::: {.note}
Duas derivações de utilidade facilitam o teste de atualizações no conjunto de pacotes:

- `cudaPackages.tests.redists-unpacked`: o `src` de cada pacote redistribuível descompactado e `symlinkJoin`-ed
- `cudaPackages.tests.redists-installed`: cada saída de cada pacote redistribuível `symlinkJoin`-ed
:::

A falha ao executar o binário resultante é tipicamente a mais desafiadora de diagnosticar, pois pode envolver uma combinação dos problemas mencionados. Este tipo de falha geralmente ocorre quando uma biblioteca tenta carregar ou abrir uma biblioteca da qual depende e que não declara em sua seção `DT_NEEDED`. Tente as seguintes etapas de depuração:

1. Primeiro, certifique-se de que as dependências são corrigidas com [`autoAddDriverRunpath`](https://search.nixos.org/packages?channel=unstable&type=packages&query=autoAddDriverRunpath).
2. Caso contrário, tente executar o aplicativo com [`nixGL`](https://github.com/guibou/nixGL) ou uma ferramenta wrapper semelhante.
3. Se isso funcionar, provavelmente significa que o aplicativo está tentando carregar uma biblioteca que não está no `RPATH` ou `RUNPATH` do binário.

### Escrevendo testes {#cuda-writing-tests}

::: {.caution}
A existência de `passthru.testers` e `passthru.tests` deve ser considerada um detalhe de implementação -- eles não se destinam a ser uma interface pública ou estável.
:::

Em geral, existem dois conjuntos de atributos em `passthru` que são usados para construir e executar testes para pacotes CUDA: `passthru.testers` e `passthru.tests`. Cada conjunto de atributos pode conter um conjunto de atributos chamado `cuda`, que contém derivações específicas do CUDA. O conjunto de atributos `cuda` é usado para separar derivações específicas do CUDA daquelas que suportam múltiplas implementações (por exemplo, OpenCL, ROCm, etc.) ou têm licenças diferentes. Para um exemplo de tais derivações genéricas, veja o pacote `magma`.

::: {.note}
As derivações são aninhadas sob o atributo `cuda` devido a uma peculiaridade do OfBorg: se a avaliação falhar (por exemplo, devido a licenças não livres), todo o conjunto de atributos envolvente é descartado. Isso impede que outros atributos no conjunto sejam descobertos, avaliados ou construídos.
:::

#### `passthru.testers` {#cuda-passthru-testers}

Atributos adicionados a `passthru.testers` são derivações que produzem um executável que executa um teste. O executável produzido deve:

- Cuidar de configurar o ambiente, criar diretórios temporários e assim por diante.
- Ser registrado como o `meta.mainProgram` da derivação para que possa ser executado diretamente.

::: {.note}
Testadores que sempre exigem CUDA devem ser colocados em `passthru.testers.cuda`, enquanto aqueles que são genéricos devem ser colocados em `passthru.testers`.
:::

O conjunto de atributos `passthru.testers` permite executar testes fora do sandbox do Nix. Existem várias razões pelas quais isso é útil, já que tal teste:

- Pode ser executado em sistemas não-NixOS, quando envolvido com utilitários como `nixGL` ou `nix-gl-host`.
- Possui padrões de acesso à rede que são difíceis ou impossíveis de isolar.
- É livre para produzir saída que não é determinística, como informações de tempo.

#### `passthru.tests` {#cuda-passthru-tests}

Atributos adicionados a `passthru.tests` são derivações que executam testes dentro do sandbox do Nix. Os testes devem:

- Usar os executáveis produzidos por `passthru.testers`, sempre que possível, para evitar duplicação da lógica de teste.
- Incluir `requiredSystemFeatures = [ "cuda" ];`, possivelmente condicionado ao valor de `cudaSupport` se forem genéricos, para garantir que sejam executados apenas em sistemas que exponham uma GPU compatível com CUDA.

::: {.note}
Testes que sempre exigem CUDA devem ser colocados em `passthru.tests.cuda`, enquanto aqueles que são genéricos devem ser colocados em `passthru.tests`.
:::

Isso é útil para testes que são determinísticos (por exemplo, verificar códigos de saída) e que podem ser fornecidos com todos os recursos necessários no sandbox.