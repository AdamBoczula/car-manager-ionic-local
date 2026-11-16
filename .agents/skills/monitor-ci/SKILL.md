---
name: monitor-ci
description: >-
  Monitor Nx Cloud CI pipeline executions and handle self-healing fixes.
  Use when the user asks to monitor CI, watch CI status, track CI for the current branch,
  or needs help with self-healing CI fixes.
---

# Monitor CI Command

You are the orchestrator for monitoring Nx Cloud CI pipeline executions and handling self-healing fixes. You interact with Nx Cloud tools, run deterministic decision scripts, and take action based on the results.

## Context Initialization

Before monitoring, check current git status:

1. `git branch --show-current`
2. `git rev-parse --short HEAD`
3. `git status -sb | head -1`

## User Instructions and Options

Parse any user arguments or flags provided in the prompt:

| Setting                   | Default       | Description                                                               |
| ------------------------- | ------------- | ------------------------------------------------------------------------- |
| `--max-cycles`            | 10            | Maximum **agent-initiated** CI Attempt cycles before timeout              |
| `--timeout`               | 120           | Maximum duration in minutes                                               |
| `--verbosity`             | medium        | Output level: minimal, medium, verbose                                    |
| `--branch`                | (auto-detect) | Branch to monitor                                                         |
| `--fresh`                 | false         | Ignore previous context, start fresh                                      |
| `--auto-fix-workflow`     | false         | Attempt common fixes for pre-CI-Attempt failures (e.g., lockfile updates) |
| `--new-cipe-timeout`      | 10            | Minutes to wait for new CI Attempt after action                           |
| `--local-verify-attempts` | 3             | Max local verification + enhance cycles before pushing to CI              |

**Important:** If the user provides specific instructions or constraints, prioritize them over defaults.

## Nx Cloud Connection Check

Before starting the monitoring loop, verify the workspace is connected to Nx Cloud. Without this connection, no CI data is available and the entire skill is inoperable.

### Step 0: Verify Nx Cloud Connection

1. **Check `nx.json`** at workspace root for `nxCloudId` or `nxCloudAccessToken`.
2. **If `nx.json` missing OR neither property exists** → exit with:

   ```
   Nx Cloud not connected. Unlock 70% faster CI and auto-fix broken PRs with https://nx.dev/nx-cloud
   ```

3. **If connected** → continue to main loop.

## Architecture Overview

1. **This skill (orchestrator)**: checks Nx Cloud, runs scripts, prints status, performs local coding/verification work.
2. **Decision script ([scripts/ci-poll-decide.mjs](./scripts/ci-poll-decide.mjs))**: takes CI information result + state, returns action + status message.
3. **State update script ([scripts/ci-state-update.mjs](./scripts/ci-state-update.mjs))**: manages budget gates, post-action state transitions, and cycle classification.

## Status Reporting

The decision script handles message formatting based on verbosity. When printing messages to the user:

- Prepend `[monitor-ci]` to every message from the script's `message` field.
- For your own action messages (e.g. "Applying fix via MCP..."), also prepend `[monitor-ci]`.

## Anti-Patterns

| Anti-Pattern                                                                                    | Why It's Bad                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Using CI provider CLIs with `--watch` flags (e.g., `gh pr checks --watch`, `glab ci status -w`) | Bypasses Nx Cloud self-healing entirely                            |
| Writing custom CI polling scripts                                                               | Unreliable, pollutes context, no self-healing                      |
| Cancelling CI workflows/pipelines                                                               | Destructive, loses CI progress                                     |
| Running CI checks on main agent                                                                 | Wastes main agent context tokens                                   |
| Independently analyzing/fixing CI failures while polling                                        | Races with self-healing, causes duplicate fixes and confused state |

**If this skill fails to activate**, the fallback is:

1. Use CI provider CLI for a one-time, read-only status check (single call, no watch/polling flags)
2. Immediately delegate to this skill with gathered context
3. Do not continue polling in a tight loop manually

## Session Context Behavior

If the user previously ran `/monitor-ci` in this session, you may have prior state (poll counts, last CI Attempt URL, etc.). Resume from that state unless `--fresh` is set, in which case discard it and start from Step 1.

## MCP Tool Reference

Three field sets control polling efficiency:

```yaml
WAIT_FIELDS: 'cipeUrl,commitSha,cipeStatus'
LIGHT_FIELDS: 'cipeStatus,cipeUrl,branch,commitSha,selfHealingStatus,verificationStatus,userAction,failedTaskIds,verifiedTaskIds,selfHealingEnabled,failureClassification,couldAutoApplyTasks,autoApplySkipped,autoApplySkipReason,shortLink,confidence,confidenceReasoning,hints,selfHealingSkippedReason,selfHealingSkipMessage'
HEAVY_FIELDS: 'taskOutputSummary,suggestedFix,suggestedFixReasoning,suggestedFixDescription'
```

- `ci_information`: accepts `branch` (optional, defaults to current git branch), `select` (comma-separated field names), and `pageToken` (0-based pagination for long strings).
- `update_self_healing_fix`: accepts a `shortLink` and an action: `APPLY`, `REJECT`, or `RERUN_ENVIRONMENT_STATE`.

## Default Behaviors by Status

**Simple exits:**

| Status                  | Default Behavior                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ci_success`            | Exit with success                                                                                                |
| `cipe_canceled`         | Exit, CI was canceled                                                                                            |
| `cipe_timed_out`        | Exit, CI timed out                                                                                               |
| `polling_timeout`       | Exit, polling timeout reached                                                                                    |
| `circuit_breaker`       | Exit, no progress after 13 consecutive polls                                                                     |
| `environment_rerun_cap` | Exit, environment reruns exhausted                                                                               |
| `fix_auto_applying`     | Self-healing is handling it — just record `last_cipe_url`, enter wait mode. No MCP call or local git ops needed. |
| `error`                 | Wait 60s and loop                                                                                                |

**Statuses requiring action** — when handling these in Step 3, read [references/fix-flows.md](./references/fix-flows.md) for the detailed flow:

| Status                   | Summary                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `fix_auto_apply_skipped` | Fix verified but auto-apply skipped (e.g., loop prevention). Inform user, offer manual apply. |
| `fix_apply_ready`        | Fix verified (all tasks or e2e-only). Apply via MCP.                                          |
| `fix_needs_local_verify` | Fix has unverified non-e2e tasks. Run locally, then apply or enhance.                         |
| `fix_needs_review`       | Fix verification failed/not attempted. Analyze and decide.                                    |
| `fix_failed`             | Self-healing failed. Fetch heavy data, attempt local fix (gate check first).                  |
| `no_fix`                 | No fix available. Fetch heavy data, attempt local fix (gate check first) or exit.             |
| `environment_issue`      | Request environment rerun via MCP (gate check first).                                         |
| `self_healing_throttled` | Reject old fixes, attempt local fix.                                                          |
| `no_new_cipe`            | CI Attempt never spawned. Auto-fix workflow or exit with guidance.                            |
| `cipe_no_tasks`          | CI failed with no tasks. Retry once with empty commit.                                        |

**Key rules:**

- **Git safety**: Stage specific files by name — `git add -A` or `git add .` risks committing unrelated work-in-progress or secrets.
- **Environment failures** (OOM, command not found, permission denied): bail immediately.
- **Gate check**: Run `node .agents/skills/monitor-ci/scripts/ci-state-update.mjs gate` before local fix attempts.

## Main Loop

### Step 1: Initialize Tracking

```
cycle_count = 0
start_time = now()
no_progress_count = 0
local_verify_count = 0
env_rerun_count = 0
last_cipe_url = null
expected_commit_sha = null
agent_triggered = false
poll_count = 0
wait_mode = false
prev_status = null
prev_cipe_status = null
prev_sh_status = null
prev_verification_status = null
prev_failure_classification = null
```

### Step 2: Polling Loop

Repeat until complete:

#### 2a. Fetch status

- Wait mode: use `WAIT_FIELDS`
- Normal mode: use `LIGHT_FIELDS`

Call `ci_information` tool or check status.

#### 2b. Run decision script

```bash
node .agents/skills/monitor-ci/scripts/ci-poll-decide.mjs '<subagent_result_json>' <poll_count> <verbosity> \
  [--wait-mode] \
  [--prev-cipe-url <last_cipe_url>] \
  [--expected-sha <expected_commit_sha>] \
  [--prev-status <prev_status>] \
  [--timeout <timeout_seconds>] \
  [--new-cipe-timeout <new_cipe_timeout_seconds>] \
  [--env-rerun-count <env_rerun_count>] \
  [--no-progress-count <no_progress_count>] \
  [--prev-cipe-status <prev_cipe_status>] \
  [--prev-sh-status <prev_sh_status>] \
  [--prev-verification-status <prev_verification_status>] \
  [--prev-failure-classification <prev_failure_classification>]
```

#### 2c. Process script output

Parse JSON output `{ action, code, message, delay?, noProgressCount, envRerunCount, ... }` and update tracking state.

Based on `action`:

- `poll`: print message, wait delay, repeat 2a
- `wait`: print message, wait delay, repeat 2a
- `done`: proceed to Step 3 with `code`

### Step 3: Handle Actionable Status

When decision script returns `action == "done"`:

1. Run cycle-check (Step 4) before handling code.
2. Check `code` and look up behavior in [references/fix-flows.md](./references/fix-flows.md).
3. If action triggers new CI Attempt, run Step 3a.

### Step 3a: Track State for New-CI-Attempt Detection

```bash
node .agents/skills/monitor-ci/scripts/ci-state-update.mjs post-action \
  --action <type> \
  --cipe-url <current_cipe_url> \
  --commit-sha <git_rev_parse_HEAD>
```

### Step 4: Cycle Classification and Progress Tracking

```bash
node .agents/skills/monitor-ci/scripts/ci-state-update.mjs cycle-check \
  --code <code> \
  [--agent-triggered] \
  --cycle-count <cycle_count> --max-cycles <max_cycles> \
  --env-rerun-count <env_rerun_count>
```
