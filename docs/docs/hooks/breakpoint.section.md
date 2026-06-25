# breakpointHook {#breakpointhook}

Este hook faz com que uma compilação pause em vez de parar quando ocorre uma falha. Ele impede que o Nix limpe o ambiente de compilação imediatamente e permite que o usuário se conecte ao ambiente de compilação. Após um erro de compilação, ele imprimirá instruções que podem ser usadas para entrar no ambiente para depuração. O `breakpointHook` está disponível apenas no Linux. Para usá-lo, adicione `breakpointHook` a `nativeBuildInputs` no pacote a ser inspecionado.

```nix
{ nativeBuildInputs = [ breakpointHook ]; }
```

Quando ocorre uma falha de compilação, uma instrução será impressa mostrando como se conectar ao build sandbox.

::: {.note}
Cuidado com compilações remotas

Para compilações remotas, as instruções impressas precisam ser executadas na máquina remota, pois o build sandbox é acessível apenas na máquina que executa as compilações. Compilações remotas podem ser desativadas definindo `--option builders ''` para `nix-build` ou `--builders ''` para `nix build`. :::