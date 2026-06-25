# nrfutil {#sec-nrfutil}

nrfutil pode ser construído com seus instaláveis da seguinte forma:

```nix
(nrfutil.withExtensions [
  "nrfutil-completion"
  "nrfutil-device"
  "nrfutil-trace"
])
```

Tenha em mente que todos os instaláveis podem não estar disponíveis para todas as plataformas suportadas.