# GitHub MCP + CodeRabbit Setup

## 1. GitHub Personal Access Token (dla OpenCode MCP)

1. Otwórz: https://github.com/settings/tokens/new
2. Ustaw nazwę: `OpenCode MCP`
3. Zaznacz scope: **repo** (wszystko), **issues**, **pull_requests**
4. Kliknij **Generate token**
5. Skopiuj wygenerowany token (zaczyna się od `ghp_...`)
6. Otwórz `.opencode/env` w projekcie i wklej:

```
GITHUB_TOKEN=ghp_twój_token_tutaj
```

7. **Zrestartuj OpenCode** — GitHub MCP powinien być dostępny automatycznie

### Weryfikacja

Po restarcie OpenCode, uruchom:

```
tools.opencode.list_mcp_resources()
```

Powinny pojawić się GitHub resources (issues, pull requests, files).

---

## 2. CodeRabbit AI Code Review

CodeRabbit to AI code reviewer. Działa przez GitHub App.

### Instalacja

1. Otwórz: https://github.com/apps/coderabbit
2. Kliknij **Install** lub **Configure**
3. Wybierz organizację `AdamBoczula`
4. Wybierz repo: `car-manager-ionic-local`
5. Kliknij **Install**

### Konfiguracja

Plik `.github/coderabbit.yaml` jest już gotowy w projekcie.
Profile: `chill` (łagodne review, tylko sugestie, bez blokowania PR).

Aby dostosować, edytuj `.github/coderabbit.yaml`:

```yaml
language: 'en-US'
reviews:
  profile: 'chill'      # 'chill' | 'assertive' | 'strict'
  request_changes_workflow: true  # może żądać zmian w PR
  auto_review:
    enabled: true
    base_branches: ['main']
```

### Działanie

- CodeRabbit automatycznie review'uje każdy PR na `main`
- Komentuje w PR z sugestiami
- Możesz go wywołać komentarzem `/review` w PR