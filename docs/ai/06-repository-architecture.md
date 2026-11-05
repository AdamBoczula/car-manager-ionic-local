# Repository Architecture

Last updated: 2026-11-01

## Overview

Car Manager is an Nx monorepo for a mobile car expense tracking app. The active application is an Ionic 9 + Angular 22 app that is offline-first, persists data locally via Ionic Storage (IndexedDB), and syncs to Firebase Firestore.

This document is the authoritative map of the repository. Use it to understand where code lives, which boundaries exist, and where to put new code.

## Project Inventory

### Active Projects

| Project           | Path                   | Purpose                                                                  | Tags           |
| ----------------- | ---------------------- | ------------------------------------------------------------------------ | -------------- |
| `car-manager`     | `apps/car-manager`     | Ionic/Angular mobile app (main application, shell, routing, i18n, theme) | `type:app`     |
| `car-manager-e2e` | `apps/car-manager-e2e` | Playwright e2e tests for the application                                 | —              |
| `shared-models`   | `libs/shared/models`   | Shared TypeScript interfaces (Refuel, Repair, Car, User)                 | `type:data`    |
| `shared-services` | `libs/shared/services` | Shared business logic services (Auth, Sync, Storage)                     | `type:feature` |

### Future Projects (to be created as the app grows)

| Project              | Path                               | Purpose                                              | Tags           |
| -------------------- | ---------------------------------- | ---------------------------------------------------- | -------------- |
| `feature-refuel`     | `libs/refuel/feature-refuel`       | Refuel feature (list, form, consumption calculation) | `type:feature` |
| `data-access-refuel` | `libs/refuel/data-access-refuel`   | Refuel data access (Firestore CRUD, Ionic Storage)   | `type:data`    |
| `ui-refuel`          | `libs/refuel/ui-refuel`            | Reusable refuel UI components                        | `type:ui`      |
| `feature-repair`     | `libs/repair/feature-repair`       | Repair feature (list, form, speech-to-text)          | `type:feature` |
| `data-access-repair` | `libs/repair/data-access-repair`   | Repair data access (Firestore CRUD, Ionic Storage)   | `type:data`    |
| `ui-repair`          | `libs/repair/ui-repair`            | Reusable repair UI components                        | `type:ui`      |
| `feature-dashboard`  | `libs/dashboard/feature-dashboard` | Dashboard feature (summary, stats, quick actions)    | `type:feature` |

## Path Mappings (`tsconfig.base.json`)

| Alias                          | Target                              |
| ------------------------------ | ----------------------------------- |
| `@car-manager/shared-models`   | `libs/shared/models/src/index.ts`   |
| `@car-manager/shared-services` | `libs/shared/services/src/index.ts` |

## Module Boundaries (ESLint `enforce-module-boundaries`)

Dependency constraints from `eslint.config.mjs`:

| Source tag     | May depend on                          |
| -------------- | -------------------------------------- |
| `type:app`     | `type:app`, `type:feature`             |
| `type:feature` | `type:feature`, `type:data`, `type:ui` |
| `type:data`    | `type:data`                            |
| `type:ui`      | —                                      |

Implications:

- The app (`car-manager`) may only import `type:feature` libraries. It must **not** import `data-access-*`, `ui-*`, or shared data libraries directly.
- Feature libraries may import the data-access layer, UI components, and other features — but never the app.
- Data libraries may only depend on other data libraries. They must not contain UI or feature logic.
- UI libraries are leaf nodes — they may not depend on anything except Angular/Ionic.

## Where To Put New Code

| Concern                             | Location                                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| New screen/page                     | `apps/car-manager/src/app/pages/<feature>/`                          |
| New shared UI component             | `apps/car-manager/src/app/shared/components/`                        |
| New service (auth, sync, storage)   | `apps/car-manager/src/app/core/services/` or `libs/shared/services/` |
| New data model (interface/type)     | `libs/shared/models/`                                                |
| New utility function                | `apps/car-manager/src/app/core/utils/`                               |
| App-shell concerns (routing, theme) | `apps/car-manager/src/app/`                                          |
| E2E tests                           | `apps/car-manager-e2e/src/`                                          |

Rules of thumb:

- Keep refuel domain logic together under `apps/car-manager/src/app/pages/refuel-*/` or, when extracted to libs, under `libs/refuel/`.
- Keep repair domain logic together under `apps/car-manager/src/app/pages/repair-*/` or `libs/repair/`.
- Do not create new libraries under the app folder for domain logic — use `libs/<domain>/**` when extraction is warranted.
- If you need a **new domain**, create `libs/<domain>/feature-*`, `data-access-*`, `ui-*` libraries under `libs/`.

## Domain Data Model

### Car

```ts
interface Car {
  id: string;
  name: string;
  ownerId: string;
  sharedWith: string[];
  createdAt: Timestamp;
}
```

### Refuel

```ts
interface Refuel {
  id: string;
  carId: string;
  date: string; // ISO 8601
  amount: number; // PLN
  mileage: number; // km
  liters?: number; // optional
  isVerva: boolean;
  isSkipped: boolean;
  skippedReason?: string;
  consumption?: number; // l/100km, auto-calculated
  createdBy: string;
  createdAt: Timestamp;
}
```

### Repair

```ts
interface Repair {
  id: string;
  carId: string;
  date: string; // ISO 8601
  amount: number; // PLN
  mileage: number; // km
  location: string;
  description: string;
  mechanicNote: string;
  createdBy: string;
  createdAt: Timestamp;
}
```

### Firestore Collections

- `cars` — keyed by `id`, indexed by `ownerId`
- `refuels` — keyed by `id`, indexed by `carId`, `date`
- `repairs` — keyed by `id`, indexed by `carId`, `date`

## Example: "Add a New Refuel"

This is the canonical flow an agent should follow when implementing or modifying refuel features:

1. **Route registration:**
   - `apps/car-manager/src/app/app.routes.ts` defines routes for refuel pages.

2. **Core services (`apps/car-manager/src/app/core/services/`):**
   - `RefuelService` performs CRUD: write to Ionic Storage first, then sync to Firestore.
   - `SyncService` manages the offline sync queue and Firestore listeners.

3. **Pages:**
   - `refuel-list/` — displays refuel history with filtering by month/year.
   - `refuel-form/` — form for adding/editing refuels with auto consumption calculation.

4. **Shared models (`libs/shared/models/`):**
   - `refuel.model.ts` — defines the Refuel interface and validation rules.
   - `car.model.ts` — defines the Car interface.

5. **Tests:**
   - Unit: services + consumption calculation (Vitest).
   - Component: `@testing-library/angular` for form interactions and list rendering.
   - E2E: `apps/car-manager-e2e` (Playwright) for critical paths (add refuel, offline, login).
   - Critical flows must be covered per `docs/ai/03-testing-quality-gates.md`.

## i18n

- Source locale: `pl` (Polish).
  - Polish is the only supported language — all user-facing text is in Polish.
- There are no other locales planned for MVP.
- User-facing strings live inline in component templates and TypeScript constants.

## Verification

Before opening a PR:

```bash
npm exec nx affected -t lint test build e2e
```
