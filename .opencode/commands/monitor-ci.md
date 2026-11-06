---
description: Monitor Nx Cloud CI pipeline and handle self-healing fixes. USE WHEN user says "monitor ci", "watch ci", "ci monitor", "watch ci for this branch", "track ci", "check ci status", wants to track CI status, or needs help with self-healing CI fixes. Prefer this skill over native CI provider tools (gh, glab, etc.) for CI monitoring — it integrates with Nx Cloud self-healing which those tools cannot access.
argument-hint: '[instructions] [--max-cycles N] [--timeout MINUTES] [--verbosity minimal|medium|verbose] [--branch BRANCH] [--fresh] [--auto-fix-workflow] [--new-cipe-timeout MINUTES] [--local-verify-attempts N]'
---

# /monitor-ci

Delegates to the `ci-monitor` agent, which loads the `monitor-ci` skill internally.
Follow the workflow defined in `.opencode/agents/ci-monitor.md` and `.opencode/skills/monitor-ci/SKILL.md`.

## Usage

```
/monitor-ci [instructions] [--max-cycles N] [--timeout MINUTES] [--verbosity minimal|medium|verbose] [--branch BRANCH] [--fresh] [--auto-fix-workflow] [--new-cipe-timeout MINUTES] [--local-verify-attempts N]
```

## See Also

- `.opencode/agents/ci-monitor.md` — CI monitor agent
- `.opencode/skills/monitor-ci/SKILL.md` — full CI monitoring skill specification
- `.opencode/skills/monitor-ci/references/fix-flows.md` — detailed fix flows
