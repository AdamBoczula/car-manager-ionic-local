# Technology Stack Decisions (MVP)

Last updated: 2026-11-01

## Confirmed Stack

- Monorepo and orchestration: Nx
- Frontend framework: Ionic 9 + Angular 22
- Native runtime: Capacitor 8
- Build tooling: Vite
- Unit and component test runner: Vitest
- Angular component/integration testing: Angular Testing Library (+ TestBed where needed)
- E2E: Playwright via Nx
- Backend: Firebase (Auth + Firestore)
- Offline persistence: Ionic Storage (IndexedDB) + Firestore offline persistence

## Frontend Architecture Direction

### State Management

Use:

- Angular Signals for component-local and shared state
- RxJS for Firebase stream subscriptions (Firestore `onSnapshot`)
- Reactive Forms (`@angular/forms`) as the default form pattern
- Ionic Storage for local/offline data persistence

Avoid for MVP:

- Heavy global state frameworks like NgRx unless a clear scaling need appears
- Template-driven forms (use Reactive Forms instead)

Reason:

- Faster iteration, lower boilerplate, strong fit for current MVP scope.

### Angular 22 Specific Rules

#### Decorators

```typescript
// ✅ DO — standalone is default in Angular 22, no need to declare it explicitly
@Component({
  template: `...`,
})
export class MyComponent {}

// ✅ DO — use @Service() for services (Angular 22+)
@Service()
export class MyService {}

// ✅ DO — use inject() for dependency injection in functions/guards
const auth = inject(AuthService);

// ❌ DON'T — @Injectable({ providedIn: 'root' }) for services (use @Service() instead)
// ❌ DON'T — standalone: true (redundant in Angular 22+)
```

#### Forms

```typescript
// ✅ PREFER: Signal Forms (@angular/forms/signals) as default for new forms
import { signalForm, signalControl } from '@angular/forms/signals';
this.form = signalForm({ name: signalControl(''), amount: signalControl(0) });

// ✅ ALSO PREFER: Reactive Forms with FormRecord for complex dynamic controls
this.form = new FormRecord<FormControl<number | null>>({});
this.form.addControl(id, new FormControl(0, { validators: [Validators.min(0)] }));
// Template: [formControl]="getControl(id)"

// ✅ ACCEPTABLE: Ionic form components wrapped with Reactive Forms
// <ion-input [formControl]="amountControl" type="number" />

// ❌ AVOID: Template-driven forms (FormsModule + ngModel)
```

#### CSS

```scss
// ✅ DO — use styleUrl to a .scss file (supports BEM nesting)
// styleUrl: './my.component.scss'
.card {
  &__header {
    display: flex;
  }
  &--active {
    color: red;
  }
}

// ✅ ALSO DO — use Ionic CSS variables for theming
:host {
  --color-primary: var(--ion-color-primary);
  --border-radius: 8px;
}

// ❌ DON'T — inline styles: `...` (no BEM nesting support, harder to maintain)
@component ({ styles: `.card__header { ... }` });
```

#### Template

```typescript
// ✅ DO — inline template for ALL components
@Component({
  template: `<div>...</div>`,
  styleUrl: './my.component.scss',
})

// ❌ DON'T — templateUrl
@Component({
  templateUrl: './my.component.html',  // avoid separate HTML files
})
```

#### Components

```typescript
// ✅ DO — use input() signals for child component bindings
readonly data = input.required<SomeType>();

// ❌ DON'T — use @Input() decorator
@Input() data: SomeType;
```

#### Child Component Form Controls

When passing a `FormControl` from a parent `FormRecord` to a child component:

```typescript
// Parent (container) — owns the FormRecord
readonly form = new FormRecord<FormControl<number | null>>({});
getControl(id: string): FormControl<number | null> {
  if (!this.form.contains(id)) {
    this.form.addControl(id, new FormControl(0, { validators: [Validators.min(0)] }));
  }
  return this.form.controls[id];
}
// Template: <child-card [control]="getControl(cat.id)" />

// Child (presenter) — receives FormControl via input
readonly control = input.required<FormControl<number | null>>();
// Template: <ion-input [formControl]="control()" />
```

### UI Strategy

Use:

- Ionic 9 components exclusively for UI (`<ion-header>`, `<ion-fab>`, `<ion-modal>`, `<ion-toast>`, `<ion-list>`, `<ion-item>`, etc.)
- Ionic CSS variables for theming (`--ion-color-primary`, `--ion-color-secondary`, etc.)
- SCSS for component-level styling with BEM methodology
- Mobile-first design: max 430px width, tablet as enhancement

Reason:

- Ionic provides production-ready mobile components with native look-and-feel.
- Capacitor enables access to native APIs (camera, speech recognition).
- CSS variables provide consistent theming without a design system build step.

### Offline and Persistence

Use:

- Ionic Storage (`@ionic/storage`) backed by IndexedDB for local persistence
- Firestore offline persistence as secondary local layer
- Offline-first flow for refuel and repair create/edit
- Write-local-first strategy: save to Ionic Storage immediately, push to Firestore in background
- Sync queue for operations that fail while offline

Reason:

- IndexedDB provides better capacity and reliability than localStorage for structured data.
- Ionic Storage provides a simple key-value API on top of IndexedDB.
- Firestore adds real-time sync between users when online.
- Last-Write-Wins is sufficient for a 2-user household.

### API Contract Strategy

Use:

- Shared TypeScript models (interfaces in `libs/shared/models`)
- Runtime validation at boundaries (Firestore reads, user input)
- Firebase SDK direct (no `@angular/fire` wrapper, use modular Firebase v13 SDK)

Reason:

- Better safety than type-only contracts.
- Firebase SDK offers tree-shakeable modular API.

## Date and Time Strategy

Current decision:

- Use native Date for MVP
- Centralize all calendar boundaries in one utility layer

Required utility responsibilities:

- Month start/end calculation
- Year start/end calculation
- Local timezone boundary behavior for Poland-focused usage
- Single place to refactor if multi-timezone support is needed later

Policy details:

- Canonical timezone: Europe/Warsaw
- Month/year boundaries are computed in local Europe/Warsaw time
- DST behavior is validated through dedicated utility tests

Why this is safe for now:

- Current product is for a Polish household in one timezone.
- Complexity stays low while test coverage protects edge cases.

## Money Handling Strategy (Current Constraint)

Current decision:

- No external decimal/money library for now
- Use strict number utilities and tests

Policy details:

- Internal representation: JavaScript number
- Display rounding: half-up to 2 decimal places
- Currency: Polish złoty (PLN)
- API and storage serialization: number values
- Keep raw computed values for intermediate calculations

Mandatory guardrails:

- Keep all arithmetic in dedicated utility functions
- Cover decimal edge values in tests (for example 0.1, 0.2, 100.23)
- Avoid duplicating money logic across components

Note:

- If rounding or precision defects appear, revisit and adopt a decimal library.

## CI Enforcement Level

Current decision:

- Critical flow enforcement is not automatically blocking yet

Expectation:

- AI should still generate tests for critical flows and report gaps explicitly in PR summaries.

## Performance Budget Baseline

Current baseline:

- Initial bundle warning: 500kb
- Initial bundle error: 1mb

PR policy:

- Any change increasing initial bundle by more than 10% requires explicit approval.

## Speech-to-Text Strategy

Use:

- `@capacitor-community/speech-recognition` plugin
- Triggered via microphone button in repair form
- Fills textarea fields (description, mechanic note) with recognized text

## Planned Reassessment Triggers

Revisit these decisions when any of the following happens:

- Multi-car support is added
- Migration from Firebase to NestJS + PostgreSQL
- Multi-currency support is needed
- Multi-timezone usage is required
- UI customization needs exceed Ionic CSS variable system
