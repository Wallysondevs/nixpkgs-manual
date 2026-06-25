# Hy {#sec-language-hy}

## Instalação {#ssec-hy-installation}

### Instalação sem pacotes {#installation-without-packages}

Você pode instalar `hy` via nix-env ou adicionando-o ao `configuration.nix` referindo-se a ele como um atributo `hy`. Este tipo de instalação adiciona `hy` ao seu ambiente e funciona com sucesso com `python3`.

::: {.caution}
Pacotes que são instalados com sua derivation python não são acessíveis por `hy` desta forma.
:::

### Instalação com pacotes {#installation-with-packages}

Criar uma `hy` derivation com pacotes `python` personalizados é muito simples e semelhante à forma como o python faz isso. O atributo `hy` fornece a função `withPackages` que cria uma `hy` derivation personalizada com os pacotes especificados.

Por exemplo, se você quiser criar um shell com `matplotlib` e `numpy`, você pode fazer isso da seguinte forma:

```ShellSession
$ nix-shell -p "hy.withPackages (ps: with ps; [ numpy matplotlib ])"
```

Ou se você quiser estender seu `configuration.nix`:
```nix
{
  # ...

  environment.systemPackages = with pkgs; [
    (hy.withPackages (
      py-packages: with py-packages; [
        numpy
        matplotlib
      ]
    ))
  ];
}
```