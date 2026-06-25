# LHAPDF {#lhapdf}

[LHAPDF](https://lhapdf.hepforge.org/) é uma ferramenta para avaliar funções de distribuição de partons (PDFs) em física de altas energias. LHAPDF está disponível no pacote `lhapdf`.

## Conjuntos de PDFs {#lhapdf-sets}

Todos os [conjuntos de PDFs disponibilizados pelo projeto LHAPDF](https://lhapdf.hepforge.org/pdfsets.html) estão disponíveis através do attrset `lhapdf.pdf_sets`.

### Hook de configuração {#lhapdf-sets-hook}

Cada pacote fornecido no attrset `lhapdf.pdf_sets` contém um hook de configuração que se adiciona à [variável de ambiente `LHAPDF_DATA_PATH`](https://lhapdf.hepforge.org/#sets).