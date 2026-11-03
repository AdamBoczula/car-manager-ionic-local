---
description: Skanuje zmienione pliki w poszukiwaniu wycieków sekretów, credentiali i wrażliwych danych. Uruchamiany jako komenda /scan-secrets.
---

# /scan-secrets

Skanuje zmodyfikowane pliki w repozytorium Budget Fort w poszukiwaniu przypadkowo
wysyłanych sekretów, kluczy API, tokenów i innych wrażliwych danych.

## Quick Start

1. Uruchom skrypt:
   ```bash
   bash .opencode/scripts/scan-secrets.sh
   ```

2. Skrypt automatycznie:
   - Znajduje zmodyfikowane pliki (git diff + untracked)
   - Pomija pliki binarne i lock files
   - Skanuje pod kątem 20+ wzorców sekretów
   - Pomija placeholder values (`example`, `changeme`, `test_key`)
   - Raportuje znalezione problemy ze ścieżką, linią i severity

## Tryby

| Tryb | Opis |
|------|------|
| `warn` (domyślny) | Loguje znaleziska, nie blokuje |
| `block` | Exit code != 0 gdy znaleziono sekrety |

```bash
SCAN_MODE=block bash .opencode/scripts/scan-secrets.sh
```

## Co wykrywa

- **Klucze chmurowe:** AWS (AKIA...), GCP, Azure
- **Tokeny GitHub:** `ghp_...`, `github_pat_...`
- **Klucze prywatne:** RSA, EC, OpenSSH, PGP
- **Connection stringi:** MongoDB, PostgreSQL, MySQL, Redis
- **Tokeny SaaS:** Slack, Stripe, npm, Discord, Twilio, SendGrid
- **JWT tokeny**
- **Wewnętrzne IP z portami**

## Allowlista

Dla znanych fałszywych alarmów:
```bash
SECRETS_ALLOWLIST="test_key_123,example_token" bash .opencode/scripts/scan-secrets.sh
```

## Wyłączenie

```bash
SKIP_SECRETS_SCAN=true bash .opencode/scripts/scan-secrets.sh
```