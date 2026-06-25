# Depurando Expressões Nix {#sec-debug}

Nix é uma linguagem unitipificada e dinâmica, isso significa que qualquer valor pode potencialmente aparecer em qualquer lugar. Como também não é estrita, a ordem de avaliação e o que é finalmente avaliado podem surpreendê-lo. Portanto, é importante ser capaz de depurar expressões Nix.

No arquivo `lib/debug.nix` você encontrará várias funções que ajudam a imprimir (de forma legível) valores enquanto a avaliação está em execução. Você pode até especificar a profundidade com que esses valores devem ser impressos recursivamente, e transformá-los em tempo real. Por favor, consulte as docstrings em `lib/debug.nix` para informações de uso.