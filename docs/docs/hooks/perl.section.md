# Perl {#setup-hook-perl}

Adiciona o subdiretório `lib/site_perl` de cada entrada de construção à variável de ambiente `PERL5LIB`. Por exemplo, se `buildInputs` contiver Perl, então o subdiretório `lib/site_perl` de cada entrada é adicionado à variável de ambiente `PERL5LIB`.