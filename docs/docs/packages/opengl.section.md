# OpenGL {#sec-opengl}

O suporte a OpenGL varia dependendo do hardware utilizado e dos drivers disponíveis e carregados.

De modo geral, oferecemos suporte a ambos os fornecedores de GL: Mesa e NVIDIA.

## NixOS Desktop {#nixos-desktop}

O desktop NixOS ou outras configurações não-headless são o alvo principal para bibliotecas e aplicações OpenGL. A solução atual para descobrir quais drivers estão disponíveis é baseada em [libglvnd](https://gitlab.freedesktop.org/glvnd/libglvnd). `libglvnd` realiza "dispatch neutro de fornecedor", tentando uma variedade de técnicas para encontrar a implementação GL do sistema. Na prática, isso será feito via GLX padrão para usuários X11 ou EGL para usuários Wayland, e suportando extensões NVIDIA ou Mesa.

## Nix em GNU/Linux {#nix-on-gnulinux}

Se você estiver usando um desktop GNU/Linux/X11 não-NixOS com drivers de vídeo de software livre, considere iniciar programas dependentes de OpenGL do Nixpkgs com versões do Nixpkgs de `libglvnd` e `mesa` em `LD_LIBRARY_PATH`. Para drivers Mesa, a versão do kernel Linux não precisa corresponder ao nixpkgs.

Para drivers de vídeo proprietários, você pode ter sorte adicionando também o pacote de driver de vídeo correspondente.