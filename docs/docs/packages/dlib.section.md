# DLib {#dlib}

[DLib](http://dlib.net/) é um kit de ferramentas moderno, baseado em C++, que oferece diversos algoritmos de aprendizado de máquina.

## Compilando sem suporte a AVX {#compiling-without-avx-support}

Especialmente CPUs mais antigas não suportam as instruções [AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions) (Advanced Vector Extensions) que são usadas pelo DLib para otimizar seus algoritmos.

No hardware afetado, erros como `Illegal instruction` ocorrerão. Nesses casos, o suporte a AVX precisa ser desabilitado:

```nix
self: super: { dlib = super.dlib.override { avxSupport = false; }; }
```