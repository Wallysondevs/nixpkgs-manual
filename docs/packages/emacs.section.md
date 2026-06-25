# Emacs {#sec-emacs}

## Configurando o Emacs {#sec-emacs-config}

O pacote Emacs vem com alguns auxiliares extras para facilitar a configuração. `emacs.pkgs.withPackages` permite que você gerencie pacotes do ELPA. Isso significa que você não precisará instalar esses pacotes de dentro do Emacs. Por exemplo, se você quisesse usar `company`, `counsel`, `flycheck`, `ivy`, `magit`, `projectile` e `use-package`, você poderia usar isso como um override em `~/.config/nixpkgs/config.nix`:

```nix
{
  packageOverrides =
    pkgs: with pkgs; {
      myEmacs = emacs.pkgs.withPackages (
        epkgs:
        (with epkgs.melpaStablePackages; [
          company
          counsel
          flycheck
          ivy
          magit
          projectile
          use-package
        ])
      );
    };
}
```

Você pode instalá-lo como qualquer outro pacote via `nix-env -iA myEmacs`. No entanto, isso apenas instalará esses pacotes. Não os `configurará` para nós. Para fazer isso, precisamos fornecer um arquivo de configuração. Felizmente, é possível fazer isso de dentro do Nix! Ao modificar o exemplo acima, podemos fazer o Emacs carregar um arquivo de configuração personalizado. A chave é criar um pacote que forneça um arquivo `default.el` em `/share/emacs/site-start/`. O Emacs sabe carregar este arquivo automaticamente quando inicia.

```nix
{
  packageOverrides = pkgs: {
    myEmacsConfig = pkgs.writeText "default.el" ''
      (eval-when-compile
        (require 'use-package))

      ;; load some packages

      (use-package company
        :bind ("<C-tab>" . company-complete)
        :diminish company-mode
        :commands (company-mode global-company-mode)
        :defer 1
        :config
        (global-company-mode))

      (use-package counsel
        :commands (counsel-descbinds)
        :bind (([remap execute-extended-command] . counsel-M-x)
               ("C-x C-f" . counsel-find-file)
               ("C-c g" . counsel-git)
               ("C-c j" . counsel-git-grep)
               ("C-c k" . counsel-ag)
               ("C-x l" . counsel-locate)
               ("M-y" . counsel-yank-pop)))

      (use-package flycheck
        :defer 2
        :config (global-flycheck-mode))

      (use-package ivy
        :defer 1
        :bind (("C-c C-r" . ivy-resume)
               ("C-x C-b" . ivy-switch-buffer)
               :map ivy-minibuffer-map
               ("C-j" . ivy-call))
        :diminish ivy-mode
        :commands ivy-mode
        :config
        (ivy-mode 1))

      (use-package magit
        :defer
        :if (executable-find "git")
        :bind (("C-x g" . magit-status)
               ("C-x G" . magit-dispatch-popup))
        :init
        (setq magit-completing-read-function 'ivy-completing-read))

      (use-package projectile
        :commands projectile-mode
        :bind-keymap ("C-c p" . projectile-command-map)
        :defer 5
        :config
        (projectile-global-mode))
    '';

    myEmacs = emacs.pkgs.withPackages (
      epkgs:
      (with epkgs.melpaStablePackages; [
        (runCommand "default.el" { } ''
          mkdir -p $out/share/emacs/site-lisp
          cp ${myEmacsConfig} $out/share/emacs/site-lisp/default.el
        '')
        company
        counsel
        flycheck
        ivy
        magit
        projectile
        use-package
      ])
    );
  };
}
```

Isso fornece um arquivo de inicialização do Emacs bastante completo. Ele será carregado além da configuração pessoal do usuário. Você sempre pode desativá-lo passando `-q` para o comando Emacs.

Às vezes, `emacs.pkgs.withPackages` não é suficiente, pois este conjunto de pacotes impõe algumas prioridades aos pacotes (com a menor prioridade atribuída ao GNU-devel ELPA e a maior para pacotes definidos manualmente em `pkgs/applications/editors/emacs/elisp-packages/manual-packages`). Mas você não pode controlar essas prioridades quando algum pacote é instalado como uma dependência. Você pode sobrescrevê-lo por pacote, fornecendo todas as dependências necessárias manualmente, mas é tedioso e sempre há a possibilidade de uma dependência indesejada se infiltrar através de outro pacote. Para sobrescrever completamente tal pacote, você pode usar `overrideScope`.

```nix
let
  overrides = self: super: rec {
    haskell-mode = self.melpaPackages.haskell-mode;
    # ...
  };
in
((emacsPackagesFor emacs).overrideScope overrides).withPackages (
  p: with p; [
    # here both these package will use haskell-mode of our own choice
    ghc-mod
    dante
  ]
)
```