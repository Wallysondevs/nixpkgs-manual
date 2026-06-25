# buildFHSEnv {#sec-fhs-environments}

`buildFHSEnv` oferece uma maneira de construir e executar um sandbox leve e compatível com FHS. Ele cria um sistema de arquivos raiz isolado com o `/nix/store` do host, de modo que sua pegada em termos de espaço em disco é bastante pequena. Isso permite que você execute software que é difícil ou inviável de corrigir para NixOS; árvores de código-fonte de terceiros com suposições FHS, jogos distribuídos como tarballs, software com verificação de integridade e/ou binários externos autoatualizados, por exemplo.
Ele usa o recurso de namespaces do Linux para criar ambientes leves temporários que são destruídos após a saída de todos os processos filhos, sem exigir privilégios elevados. Funciona de forma semelhante à tecnologia de conteinerização como Docker ou FlatPak, mas não oferece separação relevante para a segurança do sistema host.

Os argumentos aceitos são:

- `name`
        O nome do ambiente.
- `pname`
        O pname do ambiente.
- `version`
        A versão do ambiente.
- `executableName`
        O nome do executável wrapper. O padrão é `pname` se definido, ou `name` caso contrário.
- `targetPkgs`
        Pacotes a serem instalados para a arquitetura principal do host (ou seja, x86_64 em instalações x86_64). Juntamente com as bibliotecas, os binários também são instalados.
- `multiPkgs`
        Pacotes a serem instalados para todas as arquiteturas suportadas por um host (ou seja, i686 e x86_64 em instalações x86_64). Apenas bibliotecas são instaladas por padrão.
- `multiArch`
        Se deve instalar multiPkgs de 32 bits no FHSEnv em ambientes de 64 bits
- `extraBuildCommands`
        Comandos adicionais a serem executados para finalizar a estrutura de diretórios.
- `extraBuildCommandsMulti`
        Semelhante a `extraBuildCommands`, mas executado apenas em arquiteturas multilib.
- `extraOutputsToInstall`
        Saídas de derivation adicionais a serem vinculadas para pacotes de arquitetura alvo e multi-arquitetura.
- `extraInstallCommands`
        Comandos adicionais a serem executados para finalizar a derivation com o script de execução.
- `runScript`
        Um comando shell a ser executado dentro do sandbox. O padrão é `bash`. Os argumentos de linha de comando passados para o wrapper resultante são anexados a este comando por padrão. Este comando deve ser escapado; ou seja, `"foo app" --do-stuff --with "some file"`. Veja `lib.escapeShellArgs`.
- `profile`
        Script opcional para `/etc/profile` dentro do sandbox.

Você pode criar um ambiente simples usando um `shell.nix` assim:

```nix
{
  pkgs ? import <nixpkgs> { },
}:

(pkgs.buildFHSEnv {
  name = "simple-x11-env";
  targetPkgs =
    pkgs:
    (with pkgs; [
      udev
      alsa-lib
      libx11
      libxcursor
      libxrandr
    ]);
  multiPkgs =
    pkgs:
    (with pkgs; [
      udev
      alsa-lib
    ]);
  runScript = "bash";
}).env
```

Executar `nix-shell` nele o levaria para um shell dentro de um ambiente FHS onde essas bibliotecas e binários estão disponíveis em caminhos compatíveis com FHS. Aplicativos que esperam uma estrutura FHS (ou seja, binários proprietários) podem ser executados dentro deste ambiente sem modificação.
Você pode construir um wrapper executando seu binário em `runScript`, por exemplo, `./bin/start.sh`. Caminhos relativos funcionam como esperado.

Além disso, o construtor FHS vincula todos os gsettings-schemas realocados (o setup-hook do glib os move para `share/gsettings-schemas/${name}/glib-2.0/schemas`) para seu local FHS padrão. Isso significa que você não precisa empacotar binários com o hook `wrapGApps*`.