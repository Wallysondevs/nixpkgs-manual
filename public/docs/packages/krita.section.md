# Krita {#sec-krita}

## Plugins Python {#krita-python-plugins}

Plugins "pykrita" devem ser instalados seguindo o
[manual do Krita](https://docs.krita.org/en/user_manual/python_scripting/install_custom_python_plugin.html).
Isso geralmente envolve extrair a extensão para `~/.local/share/krita/pykrita/`.

## Plugins binários {#krita-binary-plugins}

Plugins binários são Bibliotecas de Ligação Dinâmica (Dynamically Linked Libraries) a serem carregadas pelo Krita.

_Nota: Você provavelmente não precisará lidar com plugins binários,
todos os plugins conhecidos são empacotados e habilitados por padrão._

### Instalando plugins binários {#krita-install-binary-plugins}

Você pode escolher quais plugins são adicionados ao Krita sobrescrevendo o
atributo `binaryPlugins`.

Se você quiser adicionar plugins em vez de substituir, você pode ler a
lista de plugins anteriores via `pkgs.krita.binaryPlugins`:

```nix
(pkgs.krita.override (old: {
  binaryPlugins = old.binaryPlugins ++ [ your-plugin ];
}))
```

### Exemplo de estrutura de um plugin binário {#krita-binary-plugin-structure}

```
/nix/store/00000000000000000000000000000000-krita-plugin-example-1.2.3
└── lib
   └── kritaplugins
      └── krita_example.so
```