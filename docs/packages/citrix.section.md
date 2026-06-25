# Citrix Workspace {#sec-citrix}

O [Citrix Workspace App](https://www.citrix.com/products/workspace-app/) é um visualizador de desktop remoto que fornece acesso a instalações [XenDesktop](https://www.citrix.com/products/xenapp-xendesktop/).

## Uso básico {#sec-citrix-base}

O arquivo tarball precisa ser baixado manualmente, já que os acordos de licença do fornecedor para [Citrix Workspace](https://www.citrix.com/downloads/workspace-app/linux/workspace-app-for-linux-latest.html) precisam ser aceitos primeiro. Em seguida, execute `nix-prefetch-url file://$PWD/linuxx64-$version.tar.gz`. Com o arquivo disponível no store, o pacote pode ser construído e instalado com Nix.

## Citrix Self-service {#sec-citrix-selfservice}

O [self-service](https://support.citrix.com/article/CTX200337) é uma aplicação para gerenciar desktops e aplicações Citrix. Por favor, note que este recurso funciona apenas com pelo menos `citrix_workspace_20_06_0` e versões posteriores.

Para configurar isso, você primeiro precisa [baixar o arquivo `.cr` do Netscaler Gateway](https://its.uiowa.edu/support/article/102186). Depois disso, você pode configurar o `selfservice` assim:

```ShellSession
$ storebrowse -C ~/Downloads/receiverconfig.cr
$ selfservice
```

## Certificados personalizados {#sec-citrix-custom-certs}

O `Citrix Workspace App` em `nixpkgs` confia em vários certificados [do banco de dados Mozilla](https://curl.haxx.se/docs/caextract.html) por padrão. No entanto, várias empresas que usam Citrix podem exigir seu próprio certificado corporativo. Em distribuições com empacotamento imperativo, esses certificados podem ser facilmente armazenados em [`$ICAROOT`](https://citrix.github.io/receiver-for-linux-command-reference/), no entanto, este diretório é um store path em `nixpkgs`. Para contornar este problema, o pacote fornece um mecanismo simples para adicionar certificados personalizados sem reconstruir o pacote inteiro usando `symlinkJoin`:

```nix
with import <nixpkgs> { config.allowUnfree = true; };
let
  extraCerts = [
    ./custom-cert-1.pem
    ./custom-cert-2.pem # ...
  ];
in
citrix_workspace.override { inherit extraCerts; }
```