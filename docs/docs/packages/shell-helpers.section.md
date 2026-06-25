# Auxiliares interativos de shell {#sec-shell-helpers}

Alguns pacotes fornecem integração com o shell para serem mais úteis. Mas, ao contrário de outros sistemas, o nix não possui um local padrão para o diretório `share`. É por isso que um conjunto de scripts `PACKAGE-share` é fornecido, que imprime a localização da pasta compartilhada correspondente. A lista atual de tais pacotes é a seguinte:

- `fzf` : `fzf-share`

Exemplo: `fzf` pode então ser usado no `.bashrc` desta forma:

```bash
source "$(fzf-share)/completion.bash"
source "$(fzf-share)/key-bindings.bash"
```