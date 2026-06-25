# Suporte a Plataformas {#chap-platform-support}

Pacotes recebem graus variados de suporte, tanto em termos de atenção dos mantenedores quanto de recursos computacionais disponíveis para integração contínua (CI). Temos 7 níveis (tiers) definidos que indicam o quão bem cada plataforma é suportada.

## Níveis (Tiers) {#sec-platform-tiers}

### Nível 1 {#sec-platform-tier1}

Plataformas [Nível 1](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-1) recebem o mais alto nível de suporte, onde problemas podem bloquear atualizações, patches específicos da plataforma são aplicados livremente e a maioria dos pacotes é esperada para funcionar.

### Nível 2 {#sec-platform-tier2}

Plataformas [Nível 2](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-2) são esperadas para permanecerem funcionais com atualizações, recebem patches específicos da plataforma conforme necessário e têm muitos pacotes construídos pelo Hydra com suporte total do ofBorg.

### Nível 3 {#sec-platform-tier3}

Plataformas [Nível 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) podem receber correções não intrusivas específicas da plataforma, têm ferramentas de bootstrap nativas disponíveis com toolchains de cross-build em cache binário, mas atualizações podem quebrar compilações nessas plataformas.

### Níveis 4-7 {#sec-platform-tier4-7}

Os Níveis de Plataforma [4 a 7](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-4) indicam níveis variados de suporte mínimo, indo desde o recebimento de apenas correções limitadas até plataformas sem suporte, mas com um caminho para o suporte.

## Detalhamento {#sec-platform-breakdown}

| Triple                                | Nível de Suporte | Channel Blockers | Hydra Support | Ofborg Support | Bootstrap Tarballs | Suporte a Compilação Cruzada |
| ------------------------------------- | ------------ | ---------------- | ------------- | -------------- | ------------------ | ----------------------- |
| `x86_64-unknown-linux-gnu`            | [Tier 1](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-1) | Muitos | ✔️            | ✔️            | ✔️                 | ✔️                      |
| `aarch64-unknown-linux-gnu`           | [Tier 2](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-2) | Alguns | ✔️            | ✔️            | ✔️                 | ✔️                      |
| `x86_64-unknown-linux-musl`           | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | Limitado        | ❌             | ✔️                 | ✔️                      |
| `aarch64-unknown-linux-musl`          | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | Limitado        | ❌             | ✔️                 | ✔️                      |
| `x86_64-unknown-unknown-freebsd`      | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `arm64-apple-darwin`                  | [Tier 2](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-2) | Alguns | ✔️            | ✔️            | ✔️                 | ❌\*                     |
| `x86_64-apple-darwin`                 | [Tier 2](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-2) | Alguns | ✔️            | ✔️            | ✔️                 | ❌\*                     |
| `i686-unknown-linux-gnu`              | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | Limitado        | ❌             | ✔️                 | ✔️                      |
| `riscv32-unknown-linux-gnu`           | [Tier 4](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-4) | Nenhum | ❌             | ❌             | ❌                  | ✔️                      |
| `riscv64-unknown-linux-gnu`           | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `loongarch64-unknown-linux-gnu`       | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `armv6l-unknown-linux-gnueabihf`      | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `armv6l-unknown-linux-musleabihf`     | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `armv7l-unknown-linux-gnueabihf`      | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `armv5tel-unknown-linux-gnueabi`      | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `mips64el-unknown-linux-gnuabi64`     | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `mips64el-unknown-linux-gnuabin32`    | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `mipsel-unknown-linux-gnu`            | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `powerpc64-unknown-linux-gnuabielfv2` | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `powerpc64le-unknown-linux-gnu`       | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |
| `s390x-unknown-linux-gnu`             | [Tier 3](https://github.com/NixOS/rfcs/blob/master/rfcs/0046-platform-support-tiers.md#tier-3) | Nenhum | ❌             | ❌             | ✔️                 | ✔️                      |

\* - A compilação cruzada é suportada apenas em hosts Darwin.