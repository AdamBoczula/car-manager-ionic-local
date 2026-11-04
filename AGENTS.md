# Car Manager – AI Agent Guidance

> **Authoritative document** for all AI agents working on this repository.
> Read this first before making any changes.

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first — it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npm exec nx build`, `npm exec nx test`) — avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file — proceed without it if unavailable.
- NEVER guess CLI flags — always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax, standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally — don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

## Repository Overview

**Car Manager** is a mobile-first Ionic/Angular app for tracking car expenses (fuel + repairs).
It operates in an Nx monorepo and is designed for offline-first operation using Ionic Storage
backed by IndexedDB, with Firebase Firestore as the remote source-of-truth.

- **Project:** Car Manager – mobile app for tracking car expenses (fuel + repairs)
- **Stack:** Ionic 9 + Angular 22 + Capacitor 8 + Firebase v13 (Firestore + Auth)
- **Workspace:** Nx monorepo, mobile-first, offline-capable
- **Target:** Android & iOS (via Capacitor), PWA as fallback
- **Language:** Polish (UI), English (code)

### Active Projects

| Project | Type | Purpose |
|---------|------|---------|
| `apps/car-manager` | app | Main Ionic/Angular application |
| `apps/car-manager-e2e` | e2e | Playwright end-to-end tests |
| `libs/shared/models` | lib | Shared TypeScript interfaces (car, refuel, repair) |
| `libs/shared/services` | lib | Shared business logic services |

---

## Spec-Driven Development (SDD)

This project uses **Spec-Driven Development** for new features and significant changes.
The full workflow is defined below.

### Quick SDD overview

1. **Analysis** — invoke the `business-analyst` skill to gather requirements
2. **Architecture** — design module structure, component tree, data flow, and ADRs (if needed)
3. **Implementation (parallel)** — Dev (TDD + code + "Implemented in" updates) || Tester (E2E tests)
4. **Quality Gate** — `npm exec nx affected -t lint test build e2e`
5. **Done** — code ready, reviewed locally by user

### Phase 1: Analysis
- Use `business-analyst` skill to drill down requirements
- Output: `docs/specs/XX-feature-name.md`

### Phase 2: Architecture
- Design module structure, component tree, data flow
- Output: Architecture decisions in spec or `docs/adr/`

### Phase 3: Implementation (parallel)
- **Dev track:** TDD → implement → update "Implemented in" table in the spec
- **Tester track:** E2E tests with Playwright
- Use `senior-frontend-dev` agent for code
- Use `automation-playwright-tester` agent for tests

### Phase 4: Quality Gate

```bash
npm exec nx affected -t lint test build e2e
```

### Phase 5: Done
- Commit with Conventional Commits format
- Open PR (if applicable)

### SDD Traceability

- Every new source file must start with: `// spec: docs/specs/<domain>/<name>.md`
- Every test must annotate which AC it covers: `// covers: docs/specs/<domain>/<name>.md#AC-N`
- During implementation, update the spec file's "Implemented in" table continuously

---

## Bug Fix Workflow (BFW)

This project uses a **structured Bug Fix Workflow** to ensure fixes are correct,
verified, and don't introduce regressions. The key principle: **reproduce first,
then fix via TDD, then review**.

### Quick BFW overview

1. **Diagnoza** — analyze the bug, understand root cause, document findings
2. **Test regresyjny** — write a failing E2E/integration test that reproduces the bug (Playwright)
3. **TDD Fix** — implement the fix using TDD approach (unit tests + code)
4. **Code Review** — independent review of the change by a reviewer agent
5. **Post-Review Fix** — address review findings, iterate until approved
6. **Quality Gate** — `npm exec nx affected -t lint test build e2e`
7. **Done** — commit with Conventional Commits, bug doc updated

### Phase 1: Diagnoza
- Analyze the bug: what is the actual behavior vs. expected behavior?
- Identify root cause: which component/service/utility is at fault?
- Determine impact: is this a regression? Which user flows are affected?
- Output: `docs/bugs/XX-bug-name.md` with the following structure:
  - **Objawy** — what the user sees (actual vs. expected)
  - **Kroki do reprodukcji** — step-by-step reproduction instructions
  - **Root cause analysis** — technical explanation of the defect
  - **Dotknięte pliki** — files involved in the bug
  - **Proponowane rozwiązanie** — high-level fix strategy (before implementation)
- Use `senior-frontend-dev` agent for the analysis phase

### Phase 2: Test regresyjny (RED)
- Write an E2E/integration test that **demonstrates the bug** (must FAIL before the fix)
- Use `automation-playwright-tester` agent for E2E tests
- For unit-level regressions, write a Vitest unit test instead
- The test must clearly document what the expected behavior should be
- Annotate with: `// covers: docs/bugs/<name>.md`
- Commit the failing test separately (or keep it staged) to prove it catches the bug

### Phase 3: TDD Fix (GREEN)
- Use `senior-frontend-dev` agent to implement the fix
- Follow TDD: run the failing test → write minimal code to make it pass → refactor
- Add/update unit tests for the fixed code
- Add/update component tests if the fix touches UI behavior
- Update the bug doc: add "Rozwiązanie" section and "Naprawione pliki" table
- Run project-specific tests to verify:

```bash
npm exec nx test car-manager
npm exec nx build car-manager
```

### Phase 4: Code Review
- Use `pr-reviewer` agent to review the entire change
- Review criteria:
  - **Poprawność** — does the fix actually resolve the root cause?
  - **Regresja** — could this break anything else?
  - **Konwencje** — does the code follow project conventions (AGENTS.md)?
  - **Testy** — are tests sufficient and meaningful? Do they pass?
  - **Architektura** — is the fix in the right layer? No leaky abstractions?
- Output: review comments in the bug doc or conversation thread
- If changes requested → go to Phase 5

### Phase 5: Post-Review Fix
- Use `senior-frontend-dev` agent to address review findings
- Iterate on Phase 4–5 until the reviewer approves
- Update the bug doc with final resolution details

### Phase 6: Quality Gate

```bash
npm exec nx affected -t lint test build e2e
```

All checks must pass. If E2E tests are too slow, run project-specific tests first:

```bash
npm exec nx test car-manager
npm exec nx build car-manager
```

### Phase 7: Done
- Commit with Conventional Commits format (`fix: <description>`)
- Update bug doc: add "Data naprawy" and "Zweryfikowano przez" fields
- Close the bug

### BFW Traceability

- Every bug fix source file must reference: `// bugfix: docs/bugs/<name>.md`
- Every regression test must annotate: `// covers: docs/bugs/<name>.md`
- During fix implementation, update the bug doc's "Naprawione pliki" table
- The bug doc serves as a permanent record of the defect and its resolution

---

## AI Agent Read-Order

Before making changes, read these files in order:

1. `AGENTS.md` (this file) – authoritative guidance
2. `PLAN.md` – project plan & architecture
3. `nx.json` – workspace configuration
4. `package.json` – dependencies & scripts
5. `docs/specs/` – feature specifications

---

## Mandatory Verification Command

Before marking a task as complete, run:

```bash
npm exec nx affected -t lint test build e2e
```

---

## Governance

- Agents may update documentation (`docs/`, `PLAN.md`) without approval.
- Agents must request approval before changing code or tests (unit/component/e2e).

---

## Mandatory Testing Workflow

For **any** code change (new feature, refactor, bug fix), the agent MUST create or update tests
**at the same time as the code change**, without waiting for user reminders. This applies to:

1. **Unit tests** (Vitest) – services, utilities, pure functions, dumb components
   - Framework: Vitest + `TestBed` or direct function testing
   - Location: `*.spec.ts` next to the source file

2. **Component/Integration tests** (`@testing-library/angular`) – user-facing component behavior
   - Use `render()`, `screen` queries, `userEvent` for interactions
   - Test: rendering states, form submissions, dialog open/close, computed outputs
   - Location: `*.spec.ts` next to the component file

3. **E2E tests** (Playwright) – critical user flows across the full stack
   - Use `page.goto()`, `page.locator()`, `expect().toBeVisible()`
   - Location: `apps/car-manager-e2e/src/*.spec.ts`
   - Base URL is set via `test.use({ baseURL: 'http://localhost:4200' })`

### When to write each layer

| Change type | Unit tests | Component tests | E2E tests |
|-------------|-----------|-----------------|-----------|
| New service / utility | ✅ Required | — | — |
| New component | ✅ (class logic) | ✅ Required | — |
| New feature / screen | ✅ | ✅ Required | ✅ (critical path) |
| Bug fix | ✅ (regression) | ✅ (if component) | ✅ (if critical path) |
| Refactor (no behavior change) | ✅ (existing must pass) | ✅ (existing must pass) | — |
| Refactor (behavior changes) | ✅ Updated | ✅ Updated | ✅ Updated |

### Testing patterns used in this project

- **Services**: `TestBed.configureTestingModule` with mock providers, `firstValueFrom` for observables
- **Component (testing-library)**: `await render(Component, { providers: [...] })` + `screen.getByText/Role/LabelText`
- **Component (TestBed)**: `TestBed.createComponent(Component)` + `fixture.debugElement.query(By.css(...))`
- **Ionic components**: mock `IonModal`, `ModalController`, `NavController` when testing pages with overlays
- **Firebase-dependent services**: mock `auth`, `db`, `firestore` exports from `core/firebase.ts`
- **Ionic Storage-dependent services**: mock `Storage` from `@ionic/storage`
- **Guard tests**: mock `AuthService`, test route activation/redirection
- **E2E**: seed data via Ionic Storage helpers (see `apps/car-manager-e2e/src/utils/db-helpers.ts`), use `page.goto('/dashboard')`, wait for `ion-page` visibility

### Verification after every change

After implementing code + tests, run:

```bash
npm exec nx affected -t lint test build e2e
```

If the full suite is too slow for iteration, run project-specific tests first:

```bash
npm exec nx test car-manager
npm exec nx build car-manager
```

And run the full `nx affected` command before marking the task complete.

---

## Critical Guardrails

1. **Mobile-first** – design for max 430px width first, tablet as enhancement
2. **Ionic components only** – use `<ion-*>` components, no custom UI unless necessary
3. **Standalone components** – Angular 22 style, no NgModules (standalone is default)
4. **Signals > RxJS** – prefer Angular Signals for state, RxJS for async streams
5. **SCSS + Ionic CSS variables** – theming via `--ion-color-*` custom properties. One `.scss` file per component via `styleUrl`.
6. **Offline-first** – always write to Ionic Storage first, sync to Firestore in background. Firestore offline persistence is enabled at app startup.
7. **Firebase SDK direct** – no `@angular/fire` wrapper, use modular Firebase v13 SDK. Import `{ auth, db }` from `core/firebase.ts`.
8. **Polish UI** – all user-facing text in Polish. Code identifiers and comments in English.
9. **`strict: true`** – TypeScript strict mode always on
10. **Conventional Commits** – `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
11. **Angular 22 specifics** – omit `standalone: true` (now default). Use `@Service()` instead of `@Injectable({ providedIn: 'root' })`. Use `input()` signals instead of `@Input()` decorator. Use `resource()` and `linkedSignal()` for async data. Signal Forms (`@angular/forms/signals`) are the default pattern for new forms. Reactive Forms (`FormRecord`, `FormControl`) are the standard for complex dynamic forms. Template MUST be inline (`template: \`...\``). Styles MUST be in a separate `.scss` file (`styleUrl: './*.component.scss'`) — never `styles: \`...\`` inline.
12. **Money/logic** – fuel consumption calculations must live in dedicated pure utility functions. Round half-up to 2 decimals for display; keep raw values for intermediate calculations.
13. **Architecture** – organize code by feature domain (refuel, repair, auth). Keep services cohesive. Respect Nx module boundaries.

---

## UI/UX Review (Phase [4b])

After the quality gate passes, you can trigger an automated UI/UX/Accessibility/Responsive review:

```
/qa-review
```

This invokes the **QA Coordinator**, which spawns 4 subagents in parallel:
- **UI Reviewer** — visual consistency, layout, typography, component states
- **UX Analyzer** — user experience, Nielsen's heuristics, click efficiency
- **A11y Auditor** — WCAG 2.1 AA, Axe-core, keyboard, ARIA, contrast
- **Responsive Checker** — viewport breakpoints, touch targets, overflow

The review is **optional** — it does NOT block the pipeline. Results are saved to
`docs/qa/YYYY-MM-DD-qa-report.md`. See `.opencode/agents/qa-coordinator.md` for details.

### MCP servers used by QA subagents

| MCP Server | Purpose |
|------------|---------|
| Playwright MCP | Browser automation, navigation, screenshots, viewport resizing |
| Chrome DevTools MCP | Axe-core audits, ARIA tree inspection, contrast checks |
| GitHub MCP | Optional: create GitHub Issues from QA reports |

---

## Agent Model Assignments

| Agent | Model | Why |
|-------|-------|-----|
| QA Coordinator | DeepSeek-V4-Pro | Orchestration, report merging, decision-making |
| UI Reviewer | DeepSeek-V4-Flash | Visual analysis — doesn't need deep reasoning |
| UX Analyzer | DeepSeek-V4-Flash | Heuristic evaluation — procedural task |
| A11y Auditor | DeepSeek-V4-Flash | Audits are tool-driven, not reasoning-heavy |
| Responsive Checker | DeepSeek-V4-Flash | Viewport testing is procedural |
| Senior Frontend Dev | DeepSeek-V4-Pro | Primary implementation |
| Business Analyst | DeepSeek-V4-Pro | Requirements analysis |
| Automation Playwright Tester | DeepSeek-V4-Flash | E2E test generation — procedural, tool-driven |
| PR Reviewer | DeepSeek-V4-Pro | Code review — correctness, regression, conventions, architecture |

---

## Project-Specific Conventions

### Data Flow

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Ionic UI   │ ←→ │  Service (Facade) │ ←→ │  Ionic       │
│  (Angular)   │     │  refuel.service   │     │  Storage     │
│              │     │  repair.service   │     │  (IndexedDB) │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   Firebase       │
                     │   Firestore      │
                     └──────────────────┘
```

### Offline Strategy
1. **Write**: always to Ionic Storage first, then sync to Firestore in background
2. **Read**: from Ionic Storage (fast), with Firestore listener for remote updates
3. **Conflict**: Last-Write-Wins (LWW) — sufficient for 2-person use
4. **Sync queue**: if offline → save locally, push when connectivity returns

### Route Structure
- `/login` — login page (guarded by `noAuthGuard`)
- `/register` — registration page (guarded by `noAuthGuard`)
- `/dashboard` — main dashboard (guarded by `authGuard`)

### Firebase Setup
- Initialized once in `apps/car-manager/src/app/core/firebase.ts`
- Exports `app`, `db`, `auth` instances
- Firestore offline persistence enabled by default
- Emulator support via environment config (future)

### Ionic Storage
- Database name: `__car_manager_db`
- Driver order: `[IndexedDB, LocalStorage]`
- Store name in IndexedDB: `_ionickv`
- Key format: `_ionickv:<key>`

---

*Ostatnia aktualizacja: 04.11.2026*