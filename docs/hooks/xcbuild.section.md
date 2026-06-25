# xcbuildHook {#xcbuildhook}

Sobrescreve as fases de build e install para executar o comando "xcbuild". Este hook é necessário quando um projeto vem apenas com arquivos de build para o sistema de build do XCode. Você pode desabilitar este comportamento definindo buildPhase e configurePhase para um valor personalizado. xcbuildFlags controla as flags passadas apenas para o xcbuild.