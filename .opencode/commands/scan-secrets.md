---
description: Scans changed files for secret leaks, credentials, and sensitive data. Run as /scan-secrets command.
---

# /scan-secrets

Scans modified files in the Car Manager repository for accidentally
committed secrets, API keys, tokens, and other sensitive data.

## Quick Start

1. Run the script:

   ```bash
   bash .opencode/scripts/scan-secrets.sh
   ```

2. The script automatically:
   - Finds modified files (git diff + untracked)
   - Skips binary files and lock files
   - Scans for 20+ secret patterns
   - Skips placeholder values (`example`, `changeme`, `test_key`)
   - Reports found issues with path, line, and severity

## Modes

| Mode             | Description                       |
| ---------------- | --------------------------------- |
| `warn` (default) | Logs findings, does not block     |
| `block`          | Exit code != 0 when secrets found |

```bash
SCAN_MODE=block bash .opencode/scripts/scan-secrets.sh
```

## What It Detects

- **Cloud keys:** AWS (AKIA...), GCP, Azure
- **GitHub tokens:** `ghp_...`, `github_pat_...`
- **Private keys:** RSA, EC, OpenSSH, PGP
- **Connection strings:** MongoDB, PostgreSQL, MySQL, Redis
- **SaaS tokens:** Slack, Stripe, npm, Discord, Twilio, SendGrid
- **JWT tokens**
- **Internal IPs with ports**

## Allowlist

For known false positives:

```bash
SECRETS_ALLOWLIST="test_key_123,example_token" bash .opencode/scripts/scan-secrets.sh
```

## Disable

```bash
SKIP_SECRETS_SCAN=true bash .opencode/scripts/scan-secrets.sh
```
