# ninja {#ninja}

Sobrescreve as fases de `build`, `install` e `check` para executar `ninja` em vez de `make`. Você pode desabilitar este comportamento com `dontUseNinjaBuild`, `dontUseNinjaInstall` e `dontUseNinjaCheck`, respectivamente. A compilação paralela é habilitada por padrão no Ninja.

Observe que se o [hook de configuração do Meson](#meson) também estiver ativo, as fases de `install` e `check` do Ninja serão desabilitadas em favor das do Meson.