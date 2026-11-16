---
name: scan-secrets
description: >-
  Scans modified and untracked files for accidentally committed secrets, API keys,
  passwords, tokens, and other sensitive credentials.
  Use when the user runs /scan-secrets, before commits, or before opening a PR.
---

# Scan Secrets Skill

Scans modified files in the Car Manager repository for accidentally
committed secrets, API keys, tokens, and other sensitive data.

## Quick Start

1. Run the scanning script:

   ```bash
   bash .agents/skills/scan-secrets/scripts/scan-secrets.sh
   ```

2. The script automatically:
   - Finds modified files (git diff + untracked)
   - Skips binary files and lock files
   - Scans for 20+ secret patterns
   - Skips placeholder values (`example`, `changeme`, `test_key`)
   - Reports found issues with path, line, and severity

## Modes

| Mode             | Description                       | Command                                                                    |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `warn` (default) | Logs findings, does not block     | `bash .agents/skills/scan-secrets/scripts/scan-secrets.sh`                 |
| `block`          | Exit code != 0 when secrets found | `SCAN_MODE=block bash .agents/skills/scan-secrets/scripts/scan-secrets.sh` |

## What It Detects

- **Cloud keys:** AWS (AKIA...), GCP, Azure
- **GitHub tokens:** `ghp_...`, `github_pat_...`
- **Private keys:** RSA, EC, OpenSSH, PGP
- **Connection strings:** MongoDB, PostgreSQL, MySQL, Redis
- **SaaS tokens:** Slack, Stripe, npm, Discord, Twilio, SendGrid
- **JWT tokens**
- **Internal IPs with ports**

## Configuration

### Allowlist false positives

```bash
SECRETS_ALLOWLIST="test_key_123,example_token" bash .agents/skills/scan-secrets/scripts/scan-secrets.sh
```

### Staged files only

```bash
SCAN_SCOPE=staged bash .agents/skills/scan-secrets/scripts/scan-secrets.sh
```

### Disable scan

```bash
SKIP_SECRETS_SCAN=true bash .agents/skills/scan-secrets/scripts/scan-secrets.sh
```
