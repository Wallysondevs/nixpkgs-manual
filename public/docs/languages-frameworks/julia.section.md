# Julia {#language-julia}

## Introdução {#julia-introduction}

Nixpkgs inclui Julia como a `julia` derivation.
Você pode obter versões específicas procurando pelas outras `julia*` derivations de nível superior disponíveis.
Por exemplo, `julia_112` corresponde a Julia 1.12.
Também fornecemos a versão estável atual como `julia-stable`, e uma versão LTS como `julia-lts`.

Ocasionalmente, uma versão do Julia tem sido muito difícil de construir a partir do código-fonte em Nixpkgs e, em vez disso, foi obtida pré-construída.
Essas versões do Julia são diferenciadas com o sufixo `*-bin`; por exemplo, `julia-stable-bin`.

## julia.withPackages {#julia-withpackage}

As derivations básicas do Julia fornecem apenas os pacotes embutidos que vêm com a distribuição.

Você pode construir ambientes Julia com pacotes adicionais usando o comando `julia.withPackages`.
Esta função aceita uma lista de strings que representam nomes de pacotes Julia.
Por exemplo, você pode construir um ambiente Julia com o pacote `Plots` da seguinte forma.

```nix
julia.withPackages [ "Plots" ]
```

Argumentos podem ser passados usando `.override`.
Por exemplo:

```nix
(julia.withPackages.override {
  precompile = false; # Turn off precompilation
})
  [ "Plots" ]
```

Aqui está uma maneira interessante de executar um ambiente Julia com um comando de shell de uma linha:

```sh
nix-shell -p 'julia.withPackages ["Plots"]' --run julia
```

### Argumentos {#julia-withpackage-arguments}

*   `precompile`: Se deve executar `Pkg.precompile()` no ambiente gerado.

    Isso tornará as importações de pacotes mais rápidas, mas pode falhar em alguns casos.
    Por exemplo, há um problema upstream com `Gtk.jl` que impede a pré-compilação de funcionar no sandbox de construção do Nix, porque o código pré-compilado tenta acessar um display.
    Pacotes como este funcionarão bem se você construir com `precompile=false`, e então pré-compilar conforme necessário assim que seu ambiente iniciar.

    Padrão: `true`

*   `extraLibs`: Dependências de bibliotecas extras que serão colocadas no `LD_LIBRARY_PATH` para Julia.

    Não deve ser necessário, pois tentamos obter as dependências de bibliotecas automaticamente usando o sistema de artefatos do Julia.

*   `makeWrapperArgs`: Argumentos extras a serem passados para a chamada `makeWrapper` que usamos para empacotar o binário Julia.
*   `setDefaultDepot`: Se deve automaticamente adicionar `$HOME/.julia` ao início do `JULIA_DEPOT_PATH`.

    Isso é útil porque Julia espera um caminho de depot gravável como a primeira entrada, o que o que construímos em Nixpkgs não é.
    Se não houver um depot gravável, Julia exibirá um aviso e não conseguirá salvar logs de histórico de comandos, etc.

    Padrão: `true`

*   `packageOverrides`: Permite que você sobrescreva pacotes por nome, passando uma fonte alternativa.

    Por exemplo, você pode usar uma versão personalizada do pacote `LanguageServer` passando `packageOverrides = { "LanguageServer" = fetchFromGitHub {...}; }`.

*   `augmentedRegistry`: Permite que você altere o registro de onde os pacotes Julia são obtidos.

    Isso normalmente aponta para uma versão aumentada especial do [registro de pacotes General](https://github.com/JuliaRegistries/General) do Julia.
    Se você quiser usar uma versão de ponta para obter as últimas atualizações de pacotes, você pode usar uma revisão posterior àquela em Nixpkgs.

*   `juliaCpuTarget`: Permite que você defina `JULIA_CPU_TARGET` ao pré-compilar. Não tem efeito se `precompile=false`.

    Você pode querer usar isso se estiver construindo um depot Julia que acabará em um cache Nix e será usado em máquinas com CPUs diferentes.

    Por quê? Julia detectará a microarquitetura da CPU da máquina de construção e incluirá essa informação nos arquivos `*.ji` pré-compilados.
    A partir da versão 1.10, Julia se tornou mais rigorosa ao verificar a compatibilidade do alvo da CPU, então pode rejeitar seus arquivos pré-compilados se eles foram compilados em uma máquina diferente.
    Uma boa opção para fornecer ampla compatibilidade é definir isso como `"generic"`, embora isso possa reduzir o desempenho.
    Você também pode definir uma lista de múltiplos alvos diferentes separados por ponto e vírgula. Consulte a documentação do Julia para detalhes.