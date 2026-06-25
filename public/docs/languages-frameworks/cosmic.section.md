# COSMIC {#sec-language-cosmic}

## Empacotando aplicações COSMIC {#ssec-cosmic-packaging}

COSMIC (Computer Operating System Main Interface Components) é um ambiente de desktop desenvolvido pela System76, principalmente para a distribuição Linux Pop!_OS. As aplicações no ecossistema COSMIC são escritas em Rust e usam libcosmic, que se baseia no framework GUI Iced. Esta seção explica como empacotar e integrar corretamente aplicações COSMIC dentro do Nix.

### libcosmicAppHook {#ssec-cosmic-libcosmic-app-hook}

O `libcosmicAppHook` é um setup hook que ajuda nisso, configurando e empacotando automaticamente aplicações baseadas em libcosmic. Ele lida com muitos requisitos comuns, como:

- Configurar a ligação adequada para bibliotecas que podem ser dlopen'd por aplicações libcosmic/iced
- Configurar caminhos XDG para esquemas de configurações, ícones e outros recursos
- Gerenciar variáveis de ambiente Vergen para informações de tempo de compilação
- Configurar flags do linker Rust para bibliotecas específicas

Para usar o hook, basta adicioná-lo aos `nativeBuildInputs` do seu pacote:

```nix
{
  lib,
  rustPlatform,
  libcosmicAppHook,
}:
rustPlatform.buildRustPackage {
  # ...
  nativeBuildInputs = [ libcosmicAppHook ];
  # ...
}
```

### Fallback de configurações {#ssec-cosmic-settings-fallback}

Aplicações COSMIC usam os componentes de UI do libcosmic, que podem precisar de acesso às configurações de tema. O pacote `cosmic-settings` fornece configurações de tema padrão como um fallback em seu diretório `share`. Por padrão, `libcosmicAppHook` inclui este caminho de fallback em `XDG_DATA_DIRS`, garantindo que as aplicações COSMIC terão acesso às configurações de tema mesmo que não estejam disponíveis em outro lugar no sistema.

Este comportamento de fallback pode ser desativado definindo `includeSettings = false` ao incluir o hook:

```nix
{
  lib,
  rustPlatform,
  libcosmicAppHook,
}:
let
  # Get build-time version of libcosmicAppHook
  libcosmicAppHook' = (libcosmicAppHook.__spliced.buildHost or libcosmicAppHook).override {
    includeSettings = false;
  };
in
rustPlatform.buildRustPackage {
  # ...
  nativeBuildInputs = [ libcosmicAppHook' ];
  # ...
}
```

Note que `cosmic-settings` é uma aplicação separada e não faz parte do próprio sistema de configurações do libcosmic. Ele é incluído por padrão em `libcosmicAppHook` apenas para fornecer essas configurações de tema de fallback.

### Ícones {#ssec-cosmic-icons}

Aplicações COSMIC podem usar ícones do tema de ícones COSMIC. Embora as aplicações COSMIC possam ser compiladas e executadas sem esses ícones, elas estariam faltando elementos visuais. O `libcosmicAppHook` inclui automaticamente `cosmic-icons` nos `XDG_DATA_DIRS` da aplicação empacotada como um fallback, garantindo que a aplicação tenha acesso aos seus ícones necessários mesmo que o sistema não tenha o tema de ícones COSMIC instalado globalmente.

Ao contrário do fallback de `cosmic-settings`, o fallback de `cosmic-icons` não pode ser removido ou desativado, pois é essencial para que as aplicações COSMIC tenham acesso a esses ícones para uma renderização visual adequada.

### Bibliotecas de Tempo de Execução {#ssec-cosmic-runtime-libraries}

Aplicações COSMIC construídas sobre libcosmic e Iced requerem várias bibliotecas de tempo de execução que são dlopen'd em vez de ligadas diretamente. O `libcosmicAppHook` garante que essas bibliotecas sejam corretamente ligadas definindo flags apropriadas do linker Rust. As bibliotecas tratadas incluem:

- Bibliotecas gráficas (EGL, Vulkan)
- Bibliotecas de entrada (xkbcommon)
- Protocolos de servidor de exibição (Wayland, X11)

Isso garante que as aplicações funcionarão corretamente em tempo de execução, mesmo que usem carregamento dinâmico para essas dependências.

### Adicionando argumentos personalizados ao wrapper {#ssec-cosmic-custom-wrapper-args}

Você pode passar argumentos adicionais para o wrapper usando `libcosmicAppWrapperArgs` no hook `preFixup`:

```nix
{
  lib,
  rustPlatform,
  libcosmicAppHook,
}:
rustPlatform.buildRustPackage {
  # ...
  preFixup = ''
    libcosmicAppWrapperArgs+=(--set-default ENVIRONMENT_VARIABLE VALUE)
  '';
  # ...
}
```

## Problemas frequentemente encontrados {#ssec-cosmic-common-issues}

### Configurando variáveis de ambiente Vergen {#ssec-cosmic-common-issues-vergen}

Muitas aplicações COSMIC usam o crate Rust Vergen para informações de tempo de compilação. O `libcosmicAppHook` configura automaticamente a variável de ambiente `VERGEN_GIT_COMMIT_DATE` com base em `SOURCE_DATE_EPOCH` para garantir builds reproduzíveis.

No entanto, algumas aplicações podem exigir explicitamente variáveis de ambiente Vergen adicionais. Sem estas configuradas corretamente, você pode encontrar falhas de compilação com erros como:

```
>   cargo:rerun-if-env-changed=VERGEN_GIT_COMMIT_DATE
>   cargo:rerun-if-env-changed=VERGEN_GIT_SHA
>
>   --- stderr
>   Error: no suitable 'git' command found!
> warning: build failed, waiting for other jobs to finish...
```

Embora `libcosmicAppHook` lide com `VERGEN_GIT_COMMIT_DATE`, você pode precisar definir explicitamente outras variáveis. Para aplicações que exigem essas variáveis, você deve defini-las diretamente na definição do pacote:

```nix
{
  lib,
  rustPlatform,
  libcosmicAppHook,
}:
rustPlatform.buildRustPackage {
  # ...
  env = {
    VERGEN_GIT_COMMIT_DATE = "2025-01-01";
    VERGEN_GIT_SHA = "0000000000000000000000000000000000000000"; # SHA-1 hash of the commit
  };
  # ...
}
```

Nem todas as aplicações COSMIC exigem essas variáveis, mas para aquelas que exigem, defini-las explicitamente evitará falhas de compilação.