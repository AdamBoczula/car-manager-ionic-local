# Car Manager – AI Agent Guidance

> **Authoritative document** for all AI agents working on this repository.
> Read this first before making any changes.

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx` skill first
- When running tasks, always use `nx` (e.g., `npm exec nx build car-manager`)
- Prefix nx commands with the workspace's package manager (e.g., `npm exec nx build`)
- You have access to the Nx MCP server and its tools
- NEVER guess CLI flags — check `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks, invoke the `nx` skill FIRST

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

| Project                | Type | Purpose                                            |
| ---------------------- | ---- | -------------------------------------------------- |
| `apps/car-manager`     | app  | Main Ionic/Angular application                     |
| `apps/car-manager-e2e` | e2e  | Playwright end-to-end tests                        |
| `libs/shared/models`   | lib  | Shared TypeScript interfaces (car, refuel, repair) |
| `libs/shared/services` | lib  | Shared business logic services                     |

---

## Agent Architecture

This project uses **7 main agents** (each with specific skills assigned to them) and **3 helper agents** for special tasks. Skills are no longer globally available — they are bound to specific agents, reducing ambiguity.

### Main Agents (assigned to workflow phases)

| Agent            | Model             | Role                                                    | Assigned Skills    |
| ---------------- | ----------------- | ------------------------------------------------------- | ------------------ |
| `analyst`        | DeepSeek-V4-Pro   | Requirements gathering & bug diagnosis (SDD P1, BFW P1) | `business-analyst` |
| `architect`      | DeepSeek-V4-Pro   | Architecture design & ADRs (SDD P2)                     | —                  |
| `developer`      | DeepSeek-V4-Flash | Code implementation via TDD (SDD P3 Dev, BFW P3 Fix)    | —                  |
| `tester`         | DeepSeek-V4-Flash | E2E & regression tests (SDD P3 Tester, BFW P2)          | —                  |
| `reviewer`       | DeepSeek-V4-Pro   | Code review (SDD P3/4, BFW P4)                          | —                  |
| `qa-coordinator` | DeepSeek-V4-Flash | UI/UX/A11y/Responsive QA orchestration (optional)       | —                  |
| `ci-monitor`     | DeepSeek-V4-Flash | Nx Cloud CI monitoring & self-healing                   | `monitor-ci`       |

### Helper Agents (special tasks, invoked directly by user)

| Agent               | Model           | Role                                       |
| ------------------- | --------------- | ------------------------------------------ |
| `critical-thinking` | DeepSeek-V4-Pro | Challenge assumptions, strategic thinking  |
| `doublecheck`       | DeepSeek-V4-Pro | Verify AI-generated output against sources |
| `tutor`             | DeepSeek-V4-Pro | Explain concepts and teach                 |

### QA Sub-agents (called by qa-coordinator)

| Agent                | Model             | Role                            |
| -------------------- | ----------------- | ------------------------------- |
| `ui-reviewer`        | DeepSeek-V4-Flash | Visual consistency review       |
| `ux-analyzer`        | DeepSeek-V4-Flash | UX heuristic evaluation         |
| `a11y-auditor`       | DeepSeek-V4-Flash | WCAG 2.1 AA accessibility audit |
| `responsive-checker` | DeepSeek-V4-Flash | Viewport & touch target testing |

### Globally Available Skills (for main agent — me)

| Skill                 | When to Use                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| `nx`                  | Exploring workspace, running tasks, scaffolding, plugins, package linking |
| `nx-import`           | Importing external repositories into the workspace                        |
| `conventional-commit` | Generating conventional commit messages (end of each implementation)      |
| `anti-ui-slop`        | UI guardrail — enforcing Ionic design system consistency                  |

---

## Spec-Driven Development (SDD)

This project uses **Spec-Driven Development** for new features and significant changes.

### Quick SDD overview

1. **Analysis** — invoke `analyst` agent to gather requirements
2. **Architecture** — invoke `architect` agent to design module structure, component tree, data flow
3. **Implementation (parallel)** — Dev: invoke `developer` (TDD + code) || Tester: invoke `tester` (E2E tests)
4. **Quality Gate** — `npm exec nx affected -t lint test build e2e`
5. **Done** — code ready, reviewed locally by user

### Phase 1: Analysis

- Use `analyst` agent (invokes `business-analyst` skill internally)
- Output: `docs/specs/XX-feature-name.md`

### Phase 2: Architecture

- Use `architect` agent
- Design module structure, component tree, data flow
- Output: Architecture decisions in spec or `docs/adr/`

### Phase 3: Implementation (parallel)

- **Dev track:** use `developer` agent — TDD → implement → update "Implemented in" table in spec
- **Tester track:** use `tester` agent — E2E tests with Playwright

### Phase 4: Quality Gate

```bash
npm exec nx affected -t lint test build e2e
```

### Phase 5: Done

- Commit with Conventional Commits format (use `conventional-commit` skill)
- Open PR (if applicable)

### SDD Traceability

- Every new source file must start with: `// spec: docs/specs/<domain>/<name>.md`
- Every test must annotate which AC it covers: `// covers: docs/specs/<domain>/<name>.md#AC-N`
- During implementation, update the spec file's "Implemented in" table continuously

---

## Bug Fix Workflow (BFW)

This project uses a **structured Bug Fix Workflow** to ensure fixes are correct,
verified, and don't introduce regressions. Key principle: **reproduce first,
then fix via TDD, then review**.

### Quick BFW overview

1. **Diagnoza** — use `analyst` agent to analyze bug, document findings
2. **Test regresyjny** — use `tester` agent to write failing E2E test (Playwright)
3. **TDD Fix** — use `developer` agent to implement fix via TDD
4. **Code Review** — use `reviewer` agent for independent review
5. **Post-Review Fix** — use `developer` agent to address findings
6. **Quality Gate** — `npm exec nx affected -t lint test build e2e`
7. **Done** — commit with Conventional Commits, bug doc updated

### Phase 1: Diagnoza

- Use `analyst` agent
- Output: `docs/bugs/XX-bug-name.md`

### Phase 2: Test regresyjny (RED)

- Use `tester` agent
- Write E2E test that **demonstrates the bug** (must FAIL before the fix)
- Annotate: `// covers: docs/bugs/<name>.md`

### Phase 3: TDD Fix (GREEN)

- Use `developer` agent
- Follow TDD: failing test → minimal code → refactor
- Update bug doc: "Rozwiązanie" section and "Naprawione pliki" table

### Phase 4: Code Review

- Use `reviewer` agent
- Review criteria: poprawność, regresja, konwencje, testy, architektura, kod
- If changes requested → Phase 5

### Phase 5: Post-Review Fix

- Use `developer` agent to address findings
- Iterate until reviewer approves

### Phase 6: Quality Gate

```bash
npm exec nx affected -t lint test build e2e
```

### Phase 7: Done

- Commit with Conventional Commits format (`fix: <description>`)
- Update bug doc with final details

### BFW Traceability

- Every bug fix source file must reference: `// bugfix: docs/bugs/<name>.md`
- Every regression test must annotate: `// covers: docs/bugs/<name>.md`

---

## AI Agent Read-Order

Before making changes, read these files in order:

1. `AGENTS.md` (this file) – authoritative guidance
2. `PLAN.md` – project plan & architecture
3. `nx.json` – workspace configuration
4. `package.json` – dependencies & scripts
5. `docs/specs/` – feature specifications
6. `docs/conventions/navigation.md` – navigation & redirect rules

---

## Mandatory Verification Command

Before marking a task as complete, run:

```bash
npm exec nx affected -t lint test build e2e
```

### Static checks (guardrail)

Before every commit, PR, or marking a task as done, run the **static checks**:

```bash
npm run static:checks
```

This runs:

- `lint` — ESLint (TypeScript + Angular template accessibility rules)
- `format:check` — Prettier formatting validation

These checks are **non-negotiable** — treat failures as blocking.

### Dead code & duplication checks (guardrail)

In addition to static checks, run **before every PR and before marking a task as done**:

```bash
npm run knip          # dead code detection (unused files, exports, dependencies)
npm run duplication   # code duplication analysis (jscpd)
```

Or run everything (static + dead code + duplication) in one command:

```bash
npm run quality
```

These checks are **strict — must pass with zero errors and zero warnings**.

> Agents: Run `npm run quality` before every PR and before marking a task as done.

The full guardrail workflow before marking complete:

```bash
npm run quality                              # MUST pass with exit code 0
npm exec nx affected -t lint test build e2e  # if full quality gate is needed
```

---

## Governance

- Agents may update documentation (`docs/`, `PLAN.md`) without approval.
- Agents must request approval before changing code or tests (unit/component/e2e).

---

## Mandatory Testing Workflow

For **any** code change (new feature, refactor, bug fix), the agent MUST create or update tests
**at the same time as the code change**, without waiting for user reminders.

### Test layers

1. **Unit tests** (Vitest) – services, utilities, pure functions, dumb components
2. **Component/Integration tests** (`@testing-library/angular`) – user-facing component behavior
3. **E2E tests** (Playwright) – critical user flows across the full stack

### When to write each layer

| Change type                   | Unit tests              | Component tests         | E2E tests             |
| ----------------------------- | ----------------------- | ----------------------- | --------------------- |
| New service / utility         | ✅ Required             | —                       | —                     |
| New component                 | ✅ (class logic)        | ✅ Required             | —                     |
| New feature / screen          | ✅                      | ✅ Required             | ✅ (critical path)    |
| Bug fix                       | ✅ (regression)         | ✅ (if component)       | ✅ (if critical path) |
| Refactor (no behavior change) | ✅ (existing must pass) | ✅ (existing must pass) | —                     |
| Refactor (behavior changes)   | ✅ Updated              | ✅ Updated              | ✅ Updated            |

### Testing patterns

- **Services**: `TestBed.configureTestingModule` with mock providers, `firstValueFrom` for observables
- **Component (testing-library)**: `await render(Component, { providers: [...] })` + `screen.getByText/Role/LabelText`
- **Component (TestBed)**: `TestBed.createComponent(Component)` + `fixture.debugElement.query(By.css(...))`
- **Ionic components**: mock `IonModal`, `ModalController`, `NavController`
- **Firebase-dependent services**: mock `auth`, `db`, `firestore` from `core/firebase.ts`
- **Ionic Storage-dependent services**: mock `Storage` from `@ionic/storage`
- **Guard tests**: mock `AuthService`, test route activation/redirection
- **E2E**: seed data via Ionic Storage helpers, use `page.goto('/dashboard')`, wait for `ion-page`

### Verification after every change

```bash
npm exec nx affected -t lint test build e2e
```

### Accessibility (static audit)

This project uses **static accessibility analysis** at two levels:

1. **ESLint (compile-time)** — `@angular-eslint/template/*` rules enforce:
   - `alt-text`, `elements-content`, `label-has-associated-control`, `table-scope`
   - `valid-aria`, `button-has-type`, `click-events-have-key-events`, `mouse-events-have-key-events`
   - `no-autofocus`, `no-positive-tabindex`, `role-has-required-aria`
   - Run: `npm exec nx lint car-manager`

2. **axe-core via Playwright (runtime)** — automated a11y audits on key pages:
   - Test file: `apps/car-manager-e2e/src/accessibility.spec.ts`
   - Helper: `apps/car-manager-e2e/src/utils/accessibility-helpers.ts`
   - Run: `npm exec nx run car-manager-e2e:a11y`

Every new feature / screen MUST include accessibility tests using `checkAccessibility()`.

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
14. **Navigation** – every NavController call (`navigateForward`, `navigateBack`, `navigateRoot`) MUST be wrapped in `this.zone.run(() => ...)`. Every page that uses NavController MUST inject `NgZone`. Use `navigateForward` (not `navigateBack`) for all forward navigations. Hub pages (dashboard) MUST NOT call `stopListening()` in `ngOnDestroy` — the next page's `startListening()` handles cleanup. Full rules: `docs/conventions/navigation.md`.

---

## UI/UX Review (Phase [4b])

After the quality gate passes, you can trigger an automated UI/UX/Accessibility/Responsive review:

```
/qa-review
```

This invokes the **QA Coordinator** (`qa-coordinator`), which spawns 4 subagents in parallel:

- `ui-reviewer` — visual consistency, layout, typography, component states
- `ux-analyzer` — user experience, Nielsen's heuristics, click efficiency
- `a11y-auditor` — WCAG 2.1 AA, Axe-core, keyboard, ARIA, contrast
- `responsive-checker` — viewport breakpoints, touch targets, overflow

The review is **optional** — it does NOT block the pipeline. Results are saved to
`docs/qa/YYYY-MM-DD-qa-report.md`.

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

_Ostatnia aktualizacja: 06.11.2026_
