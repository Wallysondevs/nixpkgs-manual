# Prefácio {#preface}

A coleção de pacotes Nix (Nixpkgs) é um conjunto de milhares de pacotes para o [gerenciador de pacotes Nix](https://nixos.org/nix/), lançada sob uma [licença MIT permissiva](https://github.com/NixOS/nixpkgs/blob/master/COPYING). Os pacotes estão disponíveis para diversas plataformas e podem ser usados com o gerenciador de pacotes Nix na maioria das distribuições GNU/Linux, bem como no [NixOS](https://nixos.org/nixos).

Este documento é o manual de [_referência_](https://nix.dev/contributing/documentation/diataxis#reference) do usuário para Nixpkgs. Ele descreve toda a interface pública do Nixpkgs de forma concisa e ordenada, e todos os comportamentos relevantes, com exemplos e referências cruzadas.

Para descobrir outros tipos de documentação:
- [nix.dev](https://nix.dev/): Tutoriais e guias para realizar tarefas com Nix
- [**Busca de Opções** do NixOS](https://search.nixos.org/options) e documentação de referência
- [**Busca de Pacotes** do Nixpkgs](https://search.nixos.org/packages)
- Manual do [**NixOS**](https://nixos.org/manual/nixos/stable/): Documentação de referência para a distribuição Linux NixOS
- [`CONTRIBUTING.md`](https://github.com/NixOS/nixpkgs/blob/master/CONTRIBUTING.md): Contribuindo para Nixpkgs, incluindo este manual

## Visão Geral do Nixpkgs {#overview-of-nixpkgs}

Expressões Nix descrevem como construir pacotes a partir do código-fonte e são coletadas no [repositório Nixpkgs](https://github.com/NixOS/nixpkgs). Também estão incluídas na coleção expressões Nix para [módulos NixOS](https://nixos.org/nixos/manual/index.html#sec-writing-modules). Com essas expressões, o gerenciador de pacotes Nix pode construir pacotes binários.

Pacotes, incluindo a coleção de pacotes Nix, são distribuídos através de [canais](https://nixos.org/nix/manual/#sec-channels). A coleção é distribuída para usuários de Nix em distribuições não-NixOS através do canal `nixpkgs-unstable`. Usuários de NixOS geralmente usam um dos canais `nixos-*`, por exemplo, `nixos-22.11`, que inclui todos os pacotes e módulos para o NixOS 22.11 estável. Lançamentos estáveis do NixOS geralmente recebem apenas atualizações de segurança. Pacotes e módulos mais atualizados estão disponíveis através do canal `nixos-unstable`.

Tanto `nixos-unstable` quanto `nixpkgs-unstable` seguem o branch `master` do repositório Nixpkgs, embora ambos geralmente fiquem [alguns dias](https://status.nixos.org/) atrasados em relação ao branch `master`. Atualizações para um canal são distribuídas assim que todos os testes para esse canal são aprovados, por exemplo, [esta tabela](https://hydra.nixos.org/job/nixpkgs/trunk/unstable#tabs-constituents) mostra o status dos testes para o canal `nixpkgs-unstable`.

Os testes são conduzidos por um cluster chamado [Hydra](https://nixos.org/hydra/), que também constrói pacotes binários a partir das expressões Nix em Nixpkgs para `x86_64-linux`, `aarch64-linux`, `x86_64-darwin` e `aarch64-darwin`. Os binários são disponibilizados através de um [cache binário](https://cache.nixos.org).

As expressões Nix atuais dos canais estão disponíveis no [repositório Nixpkgs](https://github.com/NixOS/nixpkgs) em branches que correspondem aos nomes dos canais (por exemplo, `nixos-22.11-small`).