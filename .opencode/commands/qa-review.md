---
description: Triggers a full UI/UX/A11y/Responsive QA review of the Car Manager application.
---

# /qa-review

Delegates to the `qa-coordinator` agent. Follow the workflow defined in `.opencode/agents/qa-coordinator.md`.

## Overview

1. Spawn `qa-coordinator` agent
2. It spawns 4 subagents in parallel: `ui-reviewer`, `ux-analyzer`, `a11y-auditor`, `responsive-checker`
3. Collect results and generate unified report at `docs/qa/YYYY-MM-DD-qa-report.md`
4. Present summary with severity breakdown

## Usage

```
/qa-review
```

## See Also

- `.opencode/agents/qa-coordinator.md` — full coordinator workflow
- `.opencode/agents/ui-reviewer.md` — UI review subagent
- `.opencode/agents/ux-analyzer.md` — UX analysis subagent
- `.opencode/agents/a11y-auditor.md` — accessibility audit subagent
- `.opencode/agents/responsive-checker.md` — responsive design subagent
- `docs/qa/qa-report-template.md` — report template
- `docs/specs/01-spec-workflow.md` — SDD workflow (phase [4b])
