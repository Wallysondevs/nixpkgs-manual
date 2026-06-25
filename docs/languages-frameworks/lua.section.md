# Lua {#lua}

## Usando Lua {#lua-userguide}

### Visão Geral do Lua {#lua-overview}

Várias versões do interpretador Lua estão disponíveis: luajit, lua 5.1, 5.2, 5.3.
O atributo `lua` refere-se ao interpretador padrão, também é possível referir-se a versões específicas, por exemplo, `lua5_2` refere-se ao Lua 5.2.

As bibliotecas Lua estão em conjuntos separados, com um conjunto por versão de interpretador.

Os interpretadores possuem vários atributos comuns. Um desses atributos é
`pkgs`, que é um conjunto de pacotes de bibliotecas Lua para este interpretador específico. Por exemplo, o pacote `busted` correspondente ao interpretador padrão
é `lua.pkgs.busted`, e a versão lua 5.2 é `lua5_2.pkgs.busted`.
O conjunto de pacotes principal contém aliases para esses conjuntos de pacotes, por exemplo,
`luaPackages` refere-se a `lua5_1.pkgs` e `lua52Packages` a
`lua5_2.pkgs`.

Note que nixpkgs aplica patches nos interpretadores que não são luajit para evitar referenciar
`/usr` e para que `;;` (um [placeholder](https://www.lua.org/manual/5.1/manual.html#pdf-package.path) substituído pelo LUA_PATH padrão) funcione corretamente.

### Instalando Lua e pacotes {#installing-lua-and-packages}

#### Ambiente Lua definido em arquivo `.nix` separado {#lua-environment-defined-in-separate-.nix-file}

Crie um arquivo, por exemplo `build.nix`, com a seguinte expressão

```nix
with import <nixpkgs> { };

lua5_2.withPackages (
  ps: with ps; [
    busted
    luafilesystem
  ]
)
```

e instale-o em seu perfil com

```shell
nix-env -if build.nix
```
Agora você pode usar o interpretador Lua, bem como os pacotes extras (`busted`,
`luafilesystem`) que você adicionou ao ambiente.

#### Ambiente Lua definido em `~/.config/nixpkgs/config.nix` {#lua-environment-defined-in-.confignixpkgsconfig.nix}

Se preferir, você também pode adicionar o ambiente como um package override ao conjunto Nixpkgs, por exemplo,
usando `config.nix`,

```nix
{
  # ...

  packageOverrides =
    pkgs: with pkgs; {
      myLuaEnv = lua5_2.withPackages (
        ps: with ps; [
          busted
          luafilesystem
        ]
      );
    };
}
```

e instale-o em seu perfil com

```shell
nix-env -iA nixpkgs.myLuaEnv
```
O ambiente é instalado referenciando o atributo, e considerando
que o canal `nixpkgs` foi usado.

#### Ambiente Lua definido em `/etc/nixos/configuration.nix` {#lua-environment-defined-in-etcnixosconfiguration.nix}

Para fins de completude, aqui está outro exemplo de como instalar o ambiente em todo o sistema.

```nix
{
  # ...

  environment.systemPackages = with pkgs; [
    (lua.withPackages (
      ps: with ps; [
        busted
        luafilesystem
      ]
    ))
  ];
}
```

### Como sobrescrever um pacote Lua usando overlays? {#how-to-override-a-lua-package-using-overlays}

Use o seguinte template de overlay:

```nix
final: prev: {

  lua = prev.lua.override {
    packageOverrides = luaself: luaprev: {

      luarocks-nix = luaprev.luarocks-nix.overrideAttrs (old: {
        pname = "luarocks-nix";
        src = /home/my_luarocks/repository;
      });
    };
  };

  luaPackages = lua.pkgs;
}
```

### Ambiente Lua temporário com `nix-shell` {#temporary-lua-environment-with-nix-shell}

Existem dois métodos para carregar um shell com pacotes Lua. O primeiro e recomendado método
é criar um ambiente com `lua.buildEnv` ou `lua.withPackages` e carregá-lo. Por exemplo:

```sh
$ nix-shell -p 'lua.withPackages(ps: with ps; [ busted luafilesystem ])'
```

abre um shell do qual você pode iniciar o interpretador

```sh
[nix-shell:~] lua
```

O outro método, que não é recomendado, não cria um ambiente e exige que você liste os pacotes diretamente,

```sh
$ nix-shell -p lua.pkgs.busted lua.pkgs.luafilesystem
```
Novamente, é possível iniciar o interpretador a partir do shell.
O interpretador Lua possui o atributo `pkgs` que contém todas as bibliotecas Lua para aquele interpretador específico.

## Desenvolvendo com Lua {#lua-developing}

Agora que você sabe como obter um ambiente Lua funcional com Nix, é hora
de avançar e começar a desenvolver com Lua. Existem duas maneiras de
empacotar software Lua: ou ele está no luarocks e a maior parte pode ser cuidada
pelo conversor luarocks2nix, ou o empacotamento precisa ser feito manualmente.
Vamos apresentar primeiro a maneira luarocks e a manual em seguida.

### Empacotando uma biblioteca no luarocks {#packaging-a-library-on-luarocks}

[Luarocks.org](https://luarocks.org/) é o principal repositório de pacotes Lua.
O site propõe dois tipos de pacotes: o `rockspec` e o `src.rock`
(equivalente a um [rockspec](https://github.com/luarocks/luarocks/wiki/Rockspec-format) mas com o código-fonte).

Pacotes baseados em Luarocks são gerados em [pkgs/development/lua-modules/generated-packages.nix](https://github.com/NixOS/nixpkgs/tree/master/pkgs/development/lua-modules/generated-packages.nix) a partir
da whitelist maintainers/scripts/luarocks-packages.csv e atualizados executando
o pacote `luarocks-packages-updater`:

```sh

nix-shell -p luarocks-packages-updater --run luarocks-packages-updater
```

[luarocks2nix](https://github.com/nix-community/luarocks) é uma ferramenta capaz de gerar nix derivations tanto de rockspec quanto de src.rock (e favorece o src.rock).
No entanto, a automação só vai até certo ponto e alguns pacotes precisam ser personalizados.
Essas personalizações vão em [pkgs/development/lua-modules/overrides.nix](https://github.com/NixOS/nixpkgs/tree/master/pkgs/development/lua-modules/overrides.nix).
Por exemplo, se o rockspec define `external_dependencies`, estes precisam ser adicionados manualmente ao overrides.nix.

Você pode tentar converter pacotes luarocks para pacotes nix com o comando `nix-shell -p luarocks-nix` e depois `luarocks nix PKG_NAME`.

#### Empacotando uma biblioteca manualmente {#packaging-a-library-manually}

Você pode desenvolver seu pacote como faria normalmente, apenas não se esqueça de envolvê-lo
dentro de uma chamada `toLuaModule`, por exemplo

```nix
{
  mynewlib = toLuaModule (
    stdenv.mkDerivation {
      # ...
    }
  );
}
```

Existe também a função `buildLuaPackage` que pode ser usada quando os módulos Lua
não são empacotados para luarocks. Você pode ver alguns exemplos em `pkgs/top-level/lua-packages.nix`.

## Referência Lua {#lua-reference}

### Interpretadores Lua {#lua-interpreters}

As versões 5.1, 5.2, 5.3 e 5.4 do interpretador Lua estão disponíveis como
respectivamente `lua5_1`, `lua5_2`, `lua5_3` e `lua5_4`. Luajit também está disponível.
As expressões Nix para os interpretadores podem ser encontradas em `pkgs/development/interpreters/lua-5`.

#### Atributos em pacotes de interpretadores Lua {#attributes-on-lua-interpreters-packages}

Cada interpretador possui os seguintes atributos:

- `interpreter`. Alias para `${pkgs.lua}/bin/lua`.
- `buildEnv`. Função para construir ambientes de interpretador Lua com pacotes extras agrupados. Veja a seção *função lua.buildEnv* para uso e documentação.
- `withPackages`. Interface mais simples para `buildEnv`.
- `pkgs`. Conjunto de pacotes Lua para aquele interpretador específico. O conjunto de pacotes pode ser modificado sobrescrevendo o interpretador e passando `packageOverrides`.

#### Função `buildLuarocksPackage` {#buildluarockspackage-function}

A função `buildLuarocksPackage` é implementada em `pkgs/development/interpreters/lua-5/build-luarocks-package.nix`
O seguinte é um exemplo:
```nix
{
  luaposix = buildLuarocksPackage {
    pname = "luaposix";
    version = "34.0.4-1";

    src = fetchurl {
      url = "https://raw.githubusercontent.com/rocks-moonscript-org/moonrocks-mirror/master/luaposix-34.0.4-1.src.rock";
      hash = "sha256-4mLJG8n4m6y4Fqd0meUDfsOb9RHSR0qa/KD5KCwrNXs=";
    };
    disabled = (luaOlder "5.1") || (luaAtLeast "5.4");
    propagatedBuildInputs = [
      bit32
      lua
      std_normalize
    ];

    meta = {
      homepage = "https://github.com/luaposix/luaposix/";
      description = "Lua bindings for POSIX";
      maintainers = with lib.maintainers; [
        vyp
        lblasc
      ];
      license.fullName = "MIT/X11";
    };
  };
}
```

A `buildLuarocksPackage` delega a maioria das tarefas ao luarocks:

* ele adiciona `luarocks` como um descompactador para arquivos `src.rock` (na verdade, arquivos zip).
* o `configurePhase` escreve um arquivo de configuração temporário do luarocks cuja localização
é exportada através da variável de ambiente `LUAROCKS_CONFIG`.
* o `buildPhase` não faz nada.
* o `installPhase` chama `luarocks make --deps-mode=none --tree $out` para construir e
instalar o pacote
* Na fase `postFixup`, a função bash `wrapLuaPrograms` é chamada para
  envolver todos os programas no diretório `$out/bin/*` para incluir a variável de ambiente `$PATH`
  e adicionar bibliotecas dependentes ao `LUA_PATH` e
  `LUA_CPATH` do script.

Aceita os seguintes argumentos:

* 'luarocksConfig': um valor nix que mapeia diretamente para a configuração do luarocks usada durante
  a instalação

Por padrão, `meta.platforms` é definido com o mesmo valor do interpretador, a menos que seja sobrescrito.

#### Função `buildLuaApplication` {#buildluaapplication-function}

A função `buildLuaApplication` é praticamente a mesma que `buildLuaPackage`.
A diferença é que `buildLuaPackage` por padrão prefixa os nomes dos pacotes com a versão do interpretador.
Como em uma aplicação não estamos interessados em múltiplas versões, o prefixo é removido.

#### Função lua.withPackages {#lua.withpackages-function}

A `lua.withPackages` recebe uma função como argumento que é passada para o conjunto de pacotes Lua e retorna a lista de pacotes a serem incluídos no ambiente.
Usando a função `withPackages`, o exemplo anterior para o ambiente luafilesystem pode ser escrito assim:

```nix
lua.withPackages (ps: [ ps.luafilesystem ])
```

`withPackages` passa o conjunto de pacotes correto para a versão específica do interpretador como um argumento para a função. No exemplo acima, `ps` é igual a `luaPackages`.
Mas você também pode facilmente mudar para usar `lua5_1`:

```nix
lua5_1.withPackages (ps: [ ps.lua ])
```

Agora, `ps` é definido como `lua5_1.pkgs`, correspondendo à versão do interpretador.

### Diretrizes de Contribuição para Lua {#lua-contributing}

As seguintes regras devem ser respeitadas:

* Os nomes dos commits de bibliotecas Lua devem refletir que são bibliotecas Lua, então escreva por exemplo `luaPackages.luafilesystem: 1.11 -> 1.12`.