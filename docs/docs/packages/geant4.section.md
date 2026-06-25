# Geant4 {#geant4}

[Geant4](https://www.geant4.org/) é um kit de ferramentas para simular como partículas passam pela matéria. Ele está disponível através do pacote `geant4`.

## Hook de configuração {#geant4-hook}

O hook de configuração incluído no pacote aplica as variáveis de ambiente definidas pelo [`geant4.sh` script](https://github.com/Geant4/geant4/blob/master/cmake/Modules/G4ConfigureGNUMakeHelpers.cmake#L4-L55), o que é tipicamente necessário para compilar programas baseados em `make` que dependem do Geant4.

## Conjuntos de dados {#geant4-datasets}

Todos os [conjuntos de dados do Geant4 fornecidos pelo CERN](https://geant4.web.cern.ch/support/download) estão disponíveis através do attrset `geant4.data`.

### Hook de configuração {#geant4-datasets-hook}

O hook fornecido pelos pacotes em `geant4.data` definirá uma variável de ambiente apropriada na forma de `G4[...]DATA`. Por exemplo, para o conjunto de dados `G4RadioactiveDecay`, a variável de ambiente `G4RADIOACTIVEDATA` é definida para o valor esperado pelo Geant4.