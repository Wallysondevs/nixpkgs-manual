# Tree Sitter em Python {#python-tree-sitter}

[Tree Sitter](https://tree-sitter.github.io/tree-sitter/) é um framework para construir gramáticas para linguagens de programação. Ele gera e usa árvores de sintaxe a partir de arquivos fonte, que são úteis para análise de código, ferramentas e realce de sintaxe.

As bindings Python para gramáticas Tree Sitter são fornecidas através do módulo [py-tree-sitter](https://github.com/tree-sitter/py-tree-sitter). O pacote Nix `python3Packages.tree-sitter-grammars` fornece gramáticas pré-construídas para várias linguagens.

Por exemplo, para experimentar a gramática Rust, você pode criar um ambiente de shell com a seguinte configuração:

```nix
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  name = "py-tree-sitter-dev-shell";

  buildInputs = with pkgs; [
    (python3.withPackages (
      ps: with ps; [
        tree-sitter
        tree-sitter-grammars.tree-sitter-rust
      ]
    ))
  ];
}
```

Uma vez dentro do shell, o seguinte código Python demonstra como analisar um trecho de código Rust:

```python
# Import the Tree Sitter library and Rust grammar
import tree_sitter
import tree_sitter_rust

# Load the Rust grammar and initialize the parser
rust = tree_sitter.Language(tree_sitter_rust.language())
parser = tree_sitter.Parser(rust)

# Parse a Rust snippet
tree = parser.parse(
    bytes(
        """
        fn main() {
          println!("Hello, world!");
        }
        """,
        "utf8"
    )
)

# Display the resulting syntax tree
print(tree.root_node)
```

A função `tree_sitter_rust.language()` referencia a gramática Rust carregada no shell Nix. A árvore resultante permite inspecionar programaticamente a estrutura do código.