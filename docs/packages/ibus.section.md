# ibus-engines.typing-booster {#sec-ibus-typing-booster}

Este pacote é um método de completude baseado em ibus para acelerar a digitação.

## Ativando o engine {#sec-ibus-typing-booster-activate}

O IBus precisa ser configurado adequadamente para ativar o `typing-booster`. A configuração depende do gerenciador de desktop em uso. Para instruções detalhadas, consulte a [documentação upstream](https://mike-fabian.github.io/ibus-typing-booster/).

No NixOS, você precisa habilitar explicitamente o `ibus` com os engines fornecidos antes de personalizar seu desktop para usar o `typing-booster`. Isso pode ser feito usando o módulo `ibus`:

```nix
{ pkgs, ... }:
{
  i18n.inputMethod = {
    enable = true;
    type = "ibus";
    ibus.engines = with pkgs.ibus-engines; [ typing-booster ];
  };
}
```

## Usando dicionários hunspell personalizados {#sec-ibus-typing-booster-customize-hunspell}

O engine do IBus é baseado em `hunspell` para suportar a completude em muitas linguagens. Por padrão, os dicionários `de-de`, `en-us`, `fr-moderne` `es-es`, `it-it`, `sv-se` e `sv-fi` estão em uso. Para adicionar outro dicionário, o pacote pode ser sobrescrito assim:

```nix
ibus-engines.typing-booster.override {
  langs = [
    "de-at"
    "en-gb"
  ];
}
```

_Nota: cada linguagem passada para `langs` deve ser um nome de atributo em `pkgs.hunspellDicts`._

## Seletor de emoji integrado {#sec-ibus-typing-booster-emoji-picker}

O pacote `ibus-engines.typing-booster` contém um programa chamado `emoji-picker`. Para exibir todos os emojis corretamente, é necessária uma fonte especial como `noto-fonts-color-emoji`:

No NixOS, ele pode ser instalado usando a seguinte expressão:

```nix
{ pkgs, ... }:
{
  fonts.packages = with pkgs; [ noto-fonts-color-emoji ];
}
```