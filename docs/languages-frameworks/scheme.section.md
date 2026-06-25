# Scheme {#sec-scheme}

## Gerenciamento de Pacotes {#sec-scheme-package-management}

### Akku {#sec-scheme-package-management-akku}

Cerca de duzentas bibliotecas R6RS & R7RS do [Akku](https://akkuscm.org/) (que também espelha [snow-fort](https://snow-fort.org/pkg)) estão disponíveis dentro do `akkuPackages` attrset, e o executável Akku em si está no nível superior como `akku`. Os pacotes podem ser usados nos `buildInputs` de uma derivation, funcionam dentro de `nix-shell`, e são testados usando [Chez](https://www.scheme.com/) & [Chibi](https://synthcode.com/wiki/chibi-scheme) Scheme em tempo de compilação.

A inclusão de um pacote como `build input` é feita da maneira típica do Nix. Por exemplo, para incluir [um conjunto de SRFIs](https://akkuscm.org/packages/chez-srfi/) principalmente para Chez Scheme em uma derivation, pode-se escrever:

```nix
{
  buildInputs = [
    chez
    akkuPackages.chez-srfi
  ];
}
```

O índice de pacotes está localizado em `pkgs/tools/package-management/akku` como `deps.toml`, e deve ser atualizado ocasionalmente executando `./update.sh` no diretório. Fazer isso irá buscar as URLs de origem para novos pacotes e versões mais recentes, e então escrevê-las no TOML.