# Octave {#sec-octave}

## Introdução {#ssec-octave-introduction}

Octave é uma linguagem e ambiente de programação científica modular. A maioria dos pacotes suportados pelo Octave em seu [site](https://gnu-octave.github.io/packages/) são empacotados no nixpkgs.

## Estrutura {#ssec-octave-structure}

Todos os pacotes adicionais do Octave estão disponíveis de duas maneiras:
1. Sob o atributo de nível superior `Octave`, `octave.pkgs`.
2. Como um atributo de nível superior, `octavePackages`.

## Empacotando Pacotes Octave {#ssec-octave-packaging}

O Nixpkgs fornece uma função `buildOctavePackage`, uma função genérica de construção de pacotes para qualquer pacote Octave que esteja em conformidade com o formato de empacotamento atual do Octave.

Todos os pacotes Octave são definidos em [pkgs/top-level/octave-packages.nix](https://github.com/NixOS/nixpkgs/blob/master/pkgs/top-level/octave-packages.nix) em vez de `pkgs/all-packages.nix`. Cada pacote é definido em seu próprio arquivo no diretório [pkgs/development/octave-modules](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/octave-modules). Os pacotes Octave são disponibilizados através de `all-packages.nix` tanto pelo atributo `octavePackages` quanto por `octave.pkgs`. Você pode testar a construção de um pacote Octave da seguinte forma:

```ShellSession
$ nix-build -A octavePackages.symbolic
```

Para instalá-lo em seu perfil de usuário, execute este comando a partir da raiz do repositório:

```ShellSession
$ nix-env -f. -iA octavePackages.symbolic
```

Você pode construir o Octave com pacotes usando a função `withPackages` passada.

```ShellSession
$ nix-shell -p 'octave.withPackages (ps: with ps; [ symbolic ])'
```

Isso também funcionará em um arquivo `shell.nix`.

```nix
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [ (octave.withPackages (opkgs: with opkgs; [ symbolic ])) ];
}
```

### Etapas do `buildOctavePackage` {#sssec-buildOctavePackage-steps}

O `buildOctavePackage` faz várias coisas para garantir que tudo funcione corretamente.

1. Define a variável de ambiente `OCTAVE_HISTFILE` como `/dev/null` durante a compilação do pacote para que os comandos executados diretamente pelo interpretador Octave não sejam registrados.
2. Pula a etapa de configuração, porque os pacotes são armazenados como gzipped tarballs, que o próprio Octave manipula diretamente.
3. Altera a hierarquia do tarball para que apenas um único diretório esteja no nível mais alto do tarball.
4. Usa o próprio Octave para executar o comando `pkg build`, que descompacta o tarball, extrai os arquivos necessários escritos em Octave, e compila qualquer código escrito em C++ ou Fortran, e coloca o artefato totalmente compilado em `$out`.

`buildOctavePackage` é construído sobre o `stdenv` de forma padrão, permitindo que a maioria das coisas seja personalizada.

### Lidando com Dependências {#sssec-octave-handling-dependencies}

Em pacotes Octave, existem quatro conjuntos de dependências que podem ser especificados:

`nativeBuildInputs`
: Assim como outros pacotes, `nativeBuildInputs` é destinado a dependências de tempo de construção apenas, dependentes da arquitetura.

`buildInputs`
: Como outros pacotes, `buildInputs` é destinado a dependências de tempo de construção apenas, independentes da arquitetura.

`propagatedBuildInputs`
: Semelhante a outros pacotes, `propagatedBuildInputs` é destinado a pacotes que são necessários tanto para a construção quanto para a execução do pacote. Veja [Symbolic](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/octave-modules/symbolic/default.nix) para entender como isso funciona e por que é necessário.

`requiredOctavePackages`
: Esta é uma dependência especial que garante que os pacotes Octave especificados dependam de outros e sejam disponibilizados simultaneamente ao carregá-los no Octave.

### Testando pacotes Octave {#sssec-testing-octave-packages}

Pacotes Octave construídos usando a função `buildOctavePackage` não possuem um `checkPhase` ou `installCheckPhase`. Em vez disso, os testes `testOctaveBuildEnv` e `testOctavePkgTests` são adicionados ao `passthru.tests` do pacote.

`passthru.tests.testOctaveBuildEnv` testa se o pacote pode ser usado com sucesso por `octave.withPackages`.

`passthru.tests.testOctavePkgTests` executa um comando `pkg test` para o pacote. Se o pacote precisar de entradas adicionais para executar os testes com sucesso, o atributo `nativeOctavePkgTestInputs` pode ser especificado. Se o pacote precisar que variáveis de ambiente sejam definidas para executar os testes com sucesso, certifique-se de que `__structuredAttrs = true;` esteja no pacote e, em seguida, defina as variáveis de ambiente necessárias em `octavePkgTestEnv` (que deve ser um attrset onde a chave é o nome da variável e o valor é seu valor (como uma string)).

### Instalando Pacotes Octave {#sssec-installing-octave-packages}

Por padrão, a função `buildOctavePackage` _não_ instala o pacote solicitado no Octave para uso. A função apenas construirá o pacote solicitado. Isso ocorre porque o Octave mantém um banco de dados baseado em texto sobre quais pacotes estão instalados e onde. Para isso, quando todos os pacotes solicitados tiverem sido construídos, o pacote Octave e todos os seus pacotes adicionais são reunidos em um ambiente, semelhante ao Python.

1. Primeiro, todos os binários do Octave são encapsulados com a variável de ambiente `OCTAVE_SITE_INITFILE` definida para um arquivo em `$out`, o que é necessário para que o Octave possa encontrar o local do banco de dados de pacotes não padrão.
2. Devido à forma como o `buildEnv` funciona, todos os tarballs presentes (que devem ser todos os pacotes Octave a serem instalados) devem ser removidos.
3. O caminho para o local de instalação padrão dos pacotes Octave é recriado para que o Octave operado por Nix possa instalar os pacotes.
4. Instala os pacotes no ambiente `$out` enquanto escreve as entradas dos pacotes no arquivo do banco de dados. Este arquivo de banco de dados é único para cada invocação de ambiente diferente (de acordo com o Nix).
5. Reescreve o arquivo de inicialização global do Octave para ler da lista de pacotes instalados naquele ambiente específico.
6. Encapsula quaisquer programas que sejam exigidos pelos pacotes Octave para que funcionem com todos os caminhos definidos dentro do ambiente.