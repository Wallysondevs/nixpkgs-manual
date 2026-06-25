# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

| slug | path | port | repo / publish |
|---|---|---|---|
| `chess-game` | `/` | 18615 | local only |
| `xampp-guide` | `/xampp-guide/` | 19228 | https://github.com/Wallysondevs/xampp-guide → GitHub Pages |
| `kali-guide` | `/kali-guide/` | 21966 | https://github.com/Wallysondevs/kali-guide → https://wallysondevs.github.io/kali-guide/ |
| `renpy-guide` | `/renpy-guide/` | 18838 | https://github.com/Wallysondevs/renpy-guide → https://wallysondevs.github.io/renpy-guide/ |
| `api-server` | `/api/` | 8080 | local only |
| `mockup-sandbox` | canvas | — | design surface |

### Sakura Visual Novel theme (`renpy-guide`)

Same component shell as `kali-guide`/`xampp-guide` (Terminal/CodeBlock/CommandTable/PracticeBox/AlertBox/PageContainer) but recolored for Visual Novels. The components keep their `--kali-*` CSS variable names for compatibility, the values themselves were retuned in `src/index.css`:

- Palette: pink sakura `322 85% 60%` (replaces magenta), purple `280 80% 65%` (replaces cyan), warm yellow, lavender bg.
- Fonts: `Quicksand` for prose + `JetBrains Mono` for code/terminals.
- `h2::before` ornament: ❀ (instead of `$_`).
- Sidebar styled as a `renpy-sdk` window with mini `label start:` prompt; sections labelled `[01]…[11]` with VN topics (`Comece Aqui` → `Linguagem .rpy` → `Visual & Cenas` → … → `Projeto Final`).
- Terminal default: `dev@vn-studio` user/host with `~/projetos/sakura-cafe` path. Code blocks use `language="python"` since `.rpy` highlights well as Python.
- Pages narrate the building of the **Sakura Café** VN (characters Sakura, Yuki, Akira, Hana, Mei, Rin) culminating in `ProjetoFinal.tsx` with the full script + 3 routes.
- All page navigation uses wouter `<Link className=…>` (no nested `<a>`).

### Kali Linux terminal aesthetic (shared by `xampp-guide` and `kali-guide`)

Both guides share the same visual language. Components live inside each artifact (no shared lib yet) but follow identical patterns:

- `src/index.css` — Kali cyan/dragon palette via `--kali-*` HSL CSS vars (bg, bg-2, blue, cyan, green, red, yellow, magenta, fg, dim). Includes custom WebKit scrollbar, `.kali-scroll` (slim cyan inside terminals), `.kali-scanlines`, blinking `.kali-cursor`, and `h2::before { content: "$_" }`.
- `components/ui/Terminal.tsx` — Full Kali prompt `┌──(user㉿host)-[path] └─$ cmd` with output coloring (success/warning/error/info/muted), traffic-light dots, copy-all button. Default `host` is `kali` for kali-guide and `xampp` for xampp-guide.
- `components/ui/CodeBlock.tsx` — File-content viewer (no prompt) with syntax highlighting, traffic-light dots, copy button.
- `components/ui/OutputBlock.tsx` — Raw output without prompt, themed by type.
- `components/ui/CommandTable.tsx` — Manpage-style table: `cmd | desc | output`.
- `components/ui/AlertBox.tsx` — Info/warning/danger/success styled callouts.
- `components/ui/PracticeBox.tsx` — Hands-on lab block (goal / steps / command via Terminal / expected / verify).
- `components/layout/PageContainer.tsx` — Optional `prompt?` breadcrumb (terminal style) + scroll progress gradient bar.
- `components/layout/Header.tsx` — Kali prompt pill (`root@kali:~/pentest #` for kali-guide), GitHub link, theme toggle.
- `components/layout/Sidebar.tsx` — Terminal-window styled with traffic-light dots, mini prompt, numbered `[01]…[NN]` sections, monospace items.

### Publishing kali-guide / xampp-guide to GitHub Pages

Both repos publish via the same direct GitHub Git Database API flow (no `git push`):

1. Build with `PORT=<port> BASE_PATH=/<slug>/ pnpm --filter @workspace/<slug> run build`
2. Use `listConnections('github')` to get the access token
3. Walk `dist/public/`, create blobs (text utf-8, binary base64)
4. Add `404.html` (copy of `index.html`) for SPA fallback + empty `.nojekyll`
5. Create tree, commit on top of `gh-pages` ref tip, PATCH the ref

### Notes

- The kali-guide artifact was bootstrapped before being registered in `listArtifacts()`. Its `.replit-artifact/artifact.toml` and workflow `artifacts/kali-guide: web` are the source of truth; the path-based proxy routes `/kali-guide/` correctly even though the registry doesn't list it.
- Pre-existing TS error in `kali-guide/src/pages/CTF.tsx` (`FLAG{exemplo_aqui}` parsed as TSX expression) — does not block `vite build`, but breaks `pnpm typecheck`. Not in scope of the aesthetic upgrade.

### kali-guide expansão (May 2026) — 73 novas páginas

Crescimento de 94 → 167 páginas (.tsx) cobrindo fundamentos Linux puros + ferramentas pentest avançadas. Sidebar reorganizado de 18 para 33 seções. App.tsx com ~143 rotas. Build de produção: 3.3MB JS gzip ~1.1MB. Branches publicados em `Wallysondevs/kali-guide`: `main` (source) e `gh-pages` (build estático).

Conteúdo adicionado por categoria:
- **Pacotes profundo (6):** Apt, Dpkg, PPA, SnapFlatpak, AppImage, CodigoFonte
- **Sistema/Kernel/Hardware (6):** Boot, Kernel, Hardware, Compressao, Disco, Particoes
- **Storage (5):** LVM, LUKS, Fstab, Backup, Timeshift
- **Processos & Logs (6):** Processos, Cron, JournalCtl, IOStat, ManPages, Localizacao
- **Bash (6):** ShellBash, VariaveisAmbiente, Aliases, ExpansoesBash, Redirecionamento, Avancado
- **Editores/Scripts (5):** ScriptsBash, Zsh, Vim, Navegacao, ManipulacaoArquivos
- **Misc/GUI (5):** Visualizacao, Multimedia, Wine, Troubleshooting, AmbienteGrafico
- **Redes profundo (4):** Netplan, DNS, VPN, Samba
- **Containers/Web (6):** Docker, DockerCompose, KVM, Nginx, Apache, PHP
- **Bancos/Hardening (4):** MySQL, PostgreSQL, AppArmor, Fail2Ban
- **Defensiva/Dev (5):** GPG, Seguranca, Python, NodeJS, Git
- **Dev tooling pentest (5):** Java, VSCode, Ansible, Pwncat, Chisel
- **C2 + AD (6):** Sliver, Havoc, Mythic, Mimikatz, Rubeus, SharpHound
- **Phishing/Fuzz/Detection (4):** Evilginx, Gophish, Wfuzz, AtomicRedTeam

Padrão de cada página: `PageContainer + Terminal + CodeBlock + CommandTable + PracticeBox + AlertBox`, ~250 linhas, PT-BR técnico, perspectiva pentester quando aplicável. Convenção de imports: `Docker.tsx` → `Docker` (novo, T009), `Python.tsx` → `PythonCore` (novo, T011, distinto de `PythonHacking` que já existia). `Terminal.tsx` (página) → `TerminalPage` para evitar colisão com `@/components/ui/Terminal`.

Fix global aplicado nas páginas legadas durante a expansão: `"intermediário"` (com acento) → `"intermediario"` (PageContainer só aceita sem acento), e remoção da prop `prompt=` em Terminals (não existe na interface — quem queria usar deve passar via `path=`).
