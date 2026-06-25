# Factor {#sec-language-factor}

## Ambiente de Desenvolvimento {#ssec-factor-dev-env}

Todas as expressões Nix para o compilador Factor e o ambiente de desenvolvimento podem ser encontradas em `pkgs/top-level/factor-packages.nix`.

O pacote padrão `factor-lang` oferece suporte para a interface gráfica de usuário integrada e um conjunto selecionado de bindings de bibliotecas C, por exemplo, para som e conexões TLS.
Ele também vem com a biblioteca Fuel para Emacs, que fornece um ambiente de desenvolvimento integrado para desenvolver programas Factor, incluindo acesso ao runtime Factor e à documentação online.

Para usar bibliotecas menos frequentemente utilizadas que necessitam de bindings adicionais, você pode sobrescrever o pacote `factor-lang` e adicionar mais bindings de bibliotecas e/ou binários ao seu PATH.
O pacote é definido em `pkgs/development/compilers/factor-lang/wrapper.nix` e fornece vários atributos para adicioná-los:

- `extraLibs` adiciona os caminhos `/lib` dos pacotes ao wrapper e adiciona todas as bibliotecas compartilhadas a um cache ld.so para que possam ser encontradas dinamicamente pelo runtime Factor.
- `binPackages` faz o mesmo que `extraLibs` e, adicionalmente, adiciona os pacotes à variável de ambiente PATH do Factor.
- `extraVocabs` adiciona vocabulários Factor à árvore que não fazem parte da biblioteca padrão.
  Os pacotes devem aderir à estrutura raiz de vocabulário padrão para serem encontrados.
- `guiSupport` inclui todas as bibliotecas gráficas necessárias para habilitar a GUI do Factor.
  Isso deve ser definido como `true` ao considerar a construção e execução de aplicações gráficas com este runtime Factor (mesmo que a GUI do Factor não seja usada para programação).
  Este argumento é `true` por padrão.
- `enableDefaults` pode ser desativado para envolver apenas bibliotecas que são nomeadas em `extraLibs` ou `binPackages`.
  Isso reduz as dependências de runtime, especialmente ao distribuir aplicações Factor.

O pacote também repassa vários atributos listando as bibliotecas e binários envolvidos, a saber, `extraLibs` e `binPackages`, bem como `defaultLibs` e `defaultBins`.
Além disso, todos os `runtimeLibs` são a concatenação de todos os itens acima com o propósito de fornecer todas as bibliotecas dinâmicas necessárias como "`propagatedBuildInputs`".
Por fim, `extraVocabs` é repassado como está para composição empilhada, e o `vocabTree` totalmente composto é repassado como um store path.
Isso facilita para plugins externos (por exemplo, para editores e IDEs) referenciar as raízes de vocabulário do Factor.

`factorPackages` fornece pacotes Factor pré-configurados:
- `factorPackages.factor-lang` é o pacote padrão com suporte a GUI e vários bindings de biblioteca padrão (por exemplo, openssl, openal etc.).
- `factorPackages.factor-no-gui` desativa o suporte a GUI, mantendo os bindings de biblioteca padrão.
- `factorPackages.factor-minimal` vem praticamente sem bindings de biblioteca e binários adicionais e sem suporte a GUI.
- `factorPackages.factor-minimal-gui` vem sem bindings de biblioteca adicionais, mas inclui suporte a GUI.

### Scaffolding e a raiz de vocabulário `work` {#ssec-factor-scaffolding}

Factor usa o conceito de "scaffolding" para iniciar um novo vocabulário em um workspace pessoal enraizado na raiz de vocabulário `work`.
Este conceito não escala muito bem, porque faz muitas suposições que, em algum momento, se mostram erradas.
Na implementação atual, a raiz de vocabulário `work` aponta para `/var/lib/factor` na máquina de destino.
Isso pode ser adequado para um sistema de usuário único.
Crie o local e torne-o gravável para o seu usuário.
Então, você pode usar a palavra `scaffold-work` conforme instruído por muitos tutoriais.

Se você não gostar dessa abordagem, pode contorná-la criando um arquivo `~/.factor-roots` em seu diretório home que contenha os locais que você deseja representar como raízes de vocabulário Factor adicionais, um diretório por linha.
Use `scaffold-vocab` para criar seus vocabulários em uma dessas raízes adicionais.
A documentação online do Factor é extensa sobre como usar o framework de scaffolding.

## Empacotando Vocabulários Factor {#ssec-factor-packaging}

Todos os vocabulários Factor que devem ser adicionados a um ambiente Factor via o atributo `extraVocabs` devem aderir ao seguinte esquema de diretórios.
Seu diretório de nível superior deve ser um (ou múltiplos) de `basis`, `core` ou `extra`.
`work` é roteado para `/var/lib/factor` e não é distribuído nem referenciado no nix store, veja a seção sobre [scaffolding](#ssec-factor-scaffolding).
Você deve geralmente usar `extra`, mas pode usar as outras raízes para sobrescrever vocabulários embutidos.
Esteja ciente de que os vocabulários em `core` fazem parte da imagem Factor da qual o ambiente de desenvolvimento é executado.
Isso significa que o código nesses vocabulários não é carregado das fontes, de modo que você precisa chamar `refresh-all` para recompilar e carregar as definições alteradas.
Nesses casos, é aconselhável sobrescrever o pacote `factor-unwrapped` diretamente, que compila e empacota as bibliotecas Factor principais na imagem Factor padrão.

Conforme a convenção do Factor, seu vocabulário `foo.factor` deve estar em um diretório com o mesmo nome, além de uma das raízes de vocabulário mencionadas anteriormente, por exemplo, `extra/foo/foo.factor`.

Todos os vocabulários Factor extras são registrados em `pkgs/top-level/factor-packages.nix` e suas definições de pacote geralmente residem em `development/compilers/factor-lang/vocabs/`.

Empacote um vocabulário usando a função `buildFactorVocab`.
Seu `installPhase` padrão se encarrega de instalá-lo em `out/lib/factor`.
Ele também entende os seguintes atributos especiais:
- `vocabName` é o caminho para o vocabulário a ser instalado.
  O padrão é `pname`.
- `vocabRoot` é a raiz de vocabulário sob a qual o vocabulário será instalado.
  O padrão é `extra`.
  A menos que você saiba o que está fazendo, não o altere.
  Outras raízes de vocabulário facilmente compreendidas são `core` e `basis`, que permitem modificar o ambiente de runtime Factor padrão com um pacote externo.
- `extraLibs`, `extraVocabs`, `extraPaths` têm o mesmo significado que para [aplicações](#ssec-factor-applications).
  Eles não têm efeito imediato e são apenas repassados.
  Ao construir pacotes factor-lang e aplicações Factor que usam este vocabulário respectivo, essas variáveis são avaliadas e seus caminhos são adicionados ao ambiente de runtime.

A função entende várias formas de árvores de diretórios de origem:
1. Projetos simples de vocabulário único com seus arquivos Factor e suplementares diretamente na raiz do projeto.
   Todos os arquivos `.factor` e `.txt` são copiados para `out/lib/factor/<vocabRoot>/<vocabName>`.
2. Projetos mais complexos com vários vocabulários lado a lado, por exemplo, `./<vocabName>` e `./<otherVocab>`.
   Todos os diretórios, exceto `bin`, `doc` e `lib`, são copiados para `out/lib/factor/<vocabRoot>`.
3. Projetos ainda mais complexos que tocam múltiplas raízes de vocabulário.
   Os vocabulários devem residir em `lib/factor/<root>/<vocab>`, com o vocabulário que dá nome estando em `lib/factor/<vocabRoot>/<vocabName>`.
   Todos os diretórios em `lib/factor` são copiados para `out/`.

Por exemplo, o empacotamento do algoritmo de Bresenham para interpolação de linha se parece com isto, veja `pkgs/development/compilers/factor-lang/vocabs/bresenham` para o arquivo completo:
```nix
{ factorPackages, fetchFromGitHub }:

factorPackages.buildFactorVocab {
  pname = "bresenham";
  version = "dev";

  src = fetchFromGitHub {
    owner = "Capital-EX";
    repo = "bresenham";
    rev = "58d76b31a17f547e19597a09d02d46a742bf6808";
    hash = "sha256-cfQOlB877sofxo29ahlRHVpN3wYTUc/rFr9CJ89dsME=";
  };
}
```

O vocabulário vai para `lib/factor/extra`, arquivos extras, como licenças etc., iriam para `share/` como de costume e poderiam ser adicionados à saída via uma fase `postInstall`.
Caso o vocabulário se ligue a uma biblioteca compartilhada ou chame um binário que precise estar presente no ambiente de runtime de seus usuários, adicione os atributos `extraPaths` e `extraLibs`, respectivamente.
Eles são então capturados pela função `buildFactorApplication` e adicionados como dependências de runtime.

## Construindo Aplicações {#ssec-factor-applications}

Aplicações Factor são construídas usando a facilidade `deploy` do Factor com a ajuda da função `buildFactorApplication`.

### Função `buildFactorApplication` {#ssec-factor-buildFactorApplication-func}

`factorPackages.buildFactorApplication` *`buildDesc`*

Ao empacotar uma aplicação Factor com [`buildFactorApplication`](#ssec-factor-buildFactorApplication-func), sua interface [`override`](#sec-pkg-override) deve conter o argumento `factorPackages`.
Por exemplo:
```nix
{
  lib,
  fetchurl,
  factorPackages,
}:

factorPackages.buildFactorApplication (finalAttrs: {
  pname = "foo";
  version = "1.0";

  src = fetchurl {
    url = "https://some-forge.org/foo-${finalAttrs.version}.tar.gz";
  };
})
```

A função `buildFactorApplication` espera a seguinte estrutura de origem para um pacote `foo-1.0` e produz uma aplicação `/bin/foo`:
```
foo-1.0/
  foo/
    foo.factor
    deploy.factor
  <more files and directories>...
```

Ela fornece os atributos adicionais `vocabName` e `binName` para lidar com desvios de nomenclatura.
O arquivo `deploy.factor` controla como a aplicação é implantada e está documentado na documentação online do Factor sobre a facilidade `deploy`.

Use os hooks `preInstall` ou `postInstall` para copiar arquivos e diretórios adicionais para `out/`.
A própria função apenas constrói a aplicação em `/lib/factor/` e um wrapper em `/bin/`.

Um exemplo mais complexo mostra como especificar dependências de runtime e vocabulários Factor adicionais no exemplo da aplicação Factor `painter`:
```nix
{
  lib,
  fetchFromGitHub,
  factorPackages,
  curl,
}:

factorPackages.buildFactorApplication (finalAttrs: {
  pname = "painter";
  version = "1";

  factor-lang = factorPackages.factor-minimal-gui;

  src = fetchFromGitHub {
    name = finalAttrs.vocabName;
    owner = "Capital-EX";
    repo = "painter";
    rev = "365797be8c4f82440bec0ad0a50f5a858a06c1b6";
    hash = "sha256-VdvnvKNGcFAtjWVDoxyYgRSyyyy0BEZ2MZGQ71O8nUI=";
  };

  sourceRoot = ".";

  enableUI = true;
  extraVocabs = [ factorPackages.bresenham ];

  extraPaths = with finalAttrs.factor-lang; binPackages ++ defaultBins ++ [ curl ];

})
```

O uso dos atributos `src.name` e `sourceRoot` estabelece convenientemente o diretório de vocabulário `painter` necessário para que a implantação funcione.

Ele exige que o empacotador especifique o conjunto completo de binários a serem disponibilizados em runtime.
Isso permite o padrão usual para pacotes de aplicação especificarem todas as dependências de runtime explicitamente, sem a interferência do runtime Factor.

`buildFactorApplication` é um wrapper em torno de `stdenv.mkDerivation` e aceita todos os seus atributos.
Atributos adicionais que são compreendidos por `buildFactorApplication`:

*`buildDesc`* (Função ou conjunto de atributos)

: Uma descrição de build similar a `stdenv.mkDerivation` com os seguintes atributos:

  `vocabName` (String; _opcional_)

  : é o caminho para o vocabulário a ser implantado em relação à raiz da fonte.
    Assim, o diretório `foo/` do exemplo acima poderia ser `extra/deep/down/foo`.
    Isso permite manter a hierarquia de vocabulário do Factor e distribuir a mesma árvore de fontes como uma aplicação autônoma e como uma biblioteca no ambiente de desenvolvimento Factor via o atributo `extraVocabs`.

  `binName` (String; _opcional_)

  : é o nome do binário resultante em `/bin/`.
    O padrão é o último componente do diretório em `vocabName`.
    Também é adicionado como o atributo `meta.mainProgram` para facilitar `nix run`.

  `enableUI` (Booleano; _opcional_)

  : é `false` por padrão.
    Defina isso como `true` ao distribuir uma aplicação gráfica.

  `extraLibs` (Lista; _opcional_)

  : adiciona bibliotecas adicionais como dependências de runtime.
    O padrão é `[]` e é concatenado com `runtimeLibs` do pacote factor-lang usado.
    Use `factor-minimal` para minimizar o fechamento de bibliotecas de runtime.

  `extraPaths` (Lista; _opcional_)

  : adiciona binários adicionais à variável de ambiente PATH do runtime (sem adicionar suas bibliotecas também).
    O padrão é `[]` e é concatenado com `defaultBins` e `binPackages` do pacote factor-lang usado.
    Use `factor-minimal` para minimizar o fechamento de bibliotecas de runtime.

  `deployScriptText` (String; _opcional_)

  : é o arquivo Factor de deploy real que é executado para implantar a aplicação.
    Você pode alterá-lo se precisar realizar computações adicionais durante a implantação.

  `factor-lang` (Pacote; _opcional_)

  : sobrescreve o pacote Factor a ser usado para implantar esta aplicação, o que também afeta os bindings de biblioteca padrão e os programas no PATH do runtime.
    O padrão é `factor-lang` quando `enableUI` está ativado e `factor-no-gui` quando está desativado.
    Aplicações que usam apenas bibliotecas Factor sem bindings ou programas externos podem definir isso como `factor-minimal` ou `factor-minimal-gui`.