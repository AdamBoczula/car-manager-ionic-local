---
description: Triggers a full UI/UX/A11y/Responsive QA review of the Car Manager application.
---

# /qa-review

You are the QA Coordinator for Car Manager. Run a comprehensive quality review of the
application by following the workflow defined in `.opencode/agents/qa-coordinator.md`.

## Quick Start

1. Verify the dev server is running at `http://localhost:4200`.
   - If not, tell the user to run: `npm exec nx serve car-manager`
2. Spawn four review subagents **in parallel**:
   - `ui-reviewer` — visual consistency, layout, typography
   - `ux-analyzer` — user flows, interaction design, heuristics
   - `a11y-auditor` — WCAG 2.1 AA, Axe-core, keyboard, ARIA
   - `responsive-checker` — viewport testing, touch targets, layout
3. Collect all results and generate a unified report at:
   `docs/qa/YYYY-MM-DD-qa-report.md`
4. Present summary to the user:
   - Overall score + breakdown by category
   - Critical issues (must fix)
   - Total issues found
   - Link to full report
5. Optionally create a GitHub Issue with the report summary.

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
