# Typst {#typst}

Typst pode ser configurado para incluir pacotes do [Typst Universe](https://typst.app/universe/) ou pacotes personalizados.

## Ambiente Personalizado {#typst-custom-environment}

Você pode criar um ambiente Typst personalizado com um conjunto selecionado de pacotes do **Typst Universe** usando o seguinte código. Também é possível especificar um pacote Typst com uma versão específica (por exemplo, `cetz_0_3_0`). Um pacote sem número de versão sempre se referirá à sua versão mais recente.

```nix
typst.withPackages (
  p: with p; [
    polylux_0_4_0
    cetz_0_3_0
  ]
)
```

Para mais opções de personalização, você pode invocar o wrapper diretamente:

```nix
typst.wrapper {
  packages = p: [ ];
  fonts = [ ];
  extraWrapperArgs = [ ];
}
```

### Lidando com Hashes de Pacotes Desatualizados {#typst-handling-outdated-package-hashes}

Como o **Typst Universe** não oferece uma maneira de buscar um pacote com um hash específico, os hashes dos pacotes em `nixpkgs` podem, às vezes, estar desatualizados. Para resolver este problema, você pode sobrescrever manualmente a origem do pacote usando a seguinte abordagem:

```nix
typst.withPackages.override
  (old: {
    typstPackages = old.typstPackages.overrideScope (
      _: previous: {
        polylux_0_4_0 = previous.polylux_0_4_0.overrideAttrs (oldPolylux: {
          src = oldPolylux.src.overrideAttrs { outputHash = YourUpToDatePolyluxHash; };
        });
      }
    );
  })
  (
    p: with p; [
      polylux_0_4_0
      cetz_0_3_0
    ]
  )
```

## Pacotes Personalizados {#typst-custom-packages}

`Nixpkgs` fornece uma função auxiliar, `buildTypstPackage`, para construir pacotes Typst personalizados que podem ser usados dentro do ambiente Typst. No entanto, todas as dependências do pacote personalizado devem ser explicitamente especificadas em `typstDeps`.

Veja como definir um pacote Typst personalizado:

```nix
{ buildTypstPackage, typstPackages }:

buildTypstPackage (finalAttrs: {
  pname = "my-typst-package";
  version = "0.0.1";
  src = ./.;
  typstDeps = with typstPackages; [ cetz_0_3_0 ];
})
```

### Escopo e Uso de Pacotes {#typst-package-scope-and-usage}

Por padrão, todo pacote personalizado é escopado sob `@preview`, como mostrado abaixo:

```typst
#import "@preview/my-typst-package:0.0.1": *
```

Como `@preview` é destinado a pacotes do **Typst Universe**, é recomendado usar esta abordagem **apenas para modificações temporárias ou experimentais sobre pacotes existentes** do **Typst Universe**.

Por outro lado, **pacotes locais**, pacotes escopados sob `@local`, **não** são considerados parte do ambiente Typst. Isso significa que pacotes locais devem ser manualmente vinculados ao compilador Typst, se necessário.