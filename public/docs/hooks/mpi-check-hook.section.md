# mpiCheckPhaseHook {#setup-hook-mpi-check}


Este hook pode ser usado para configurar uma fase de verificação que requer a execução de uma aplicação MPI. Ele detecta o tipo de implementação MPI presente e exporta as variáveis de ambiente necessárias para usar `mpirun` e `mpiexec` em uma sandbox Nix.


Exemplo:

```nix
{ mpiCheckPhaseHook, mpi, ... }:
{
  # ...

  nativeCheckInputs = [
    openssh
    mpiCheckPhaseHook
  ];
}
```