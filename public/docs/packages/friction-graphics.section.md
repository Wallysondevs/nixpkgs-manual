# Friction {#friction-graphics}

[Friction](https://friction.graphics/) é um aplicativo de gráficos vetoriais em movimento de código aberto para criar animações para plataformas web e de vídeo.

## Suporte a Wayland {#friction-graphics-wayland}

O upstream força explicitamente o X11 (XCB) no Linux devido ao suporte incompleto ao Wayland (tela cheia não funciona, algumas interações do mouse estão quebradas).
Isso significa que o aplicativo é executado sob XWayland por padrão e não respeita o dimensionamento HiDPI em nível de compositor.

Para habilitar o suporte nativo ao Wayland, removendo a substituição forçada do X11:

```nix
friction-graphics.override { enableWayland = true; }
```