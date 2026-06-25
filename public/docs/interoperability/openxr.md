# OpenXR no NixOS

OpenXR é um padrão para aplicativos e drivers (provedores) de Realidade Estendida (XR).

Provedores de runtime OpenXR devem garantir que o caminho da biblioteca compartilhada do runtime possa ser carregado por aplicativos Nix. Se o seu provedor de runtime OpenXR executa em um FHSEnv, isso significa que você pode ter que usar `auto-patchelf` para vincular dependências ao Nix store.