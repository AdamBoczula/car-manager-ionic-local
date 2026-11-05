# Testing Strategy and Quality Gates For AI

Last updated: 2026-11-01

## Testing Stack

Primary stack:

- Vitest
- Angular Testing Library
- TestBed where needed
- Reactive Forms for form behavior tests where applicable

## Required Test Layers

1. Unit tests

- Dumb/presentational components
- Services (RefuelService, RepairService, AuthService, SyncService)
- TypeScript utility/domain logic (consumption calculation, date boundaries, money rounding)
- Ionic Storage and Firestore service interactions (mocked)

2. Component/Integration tests

- User-centric flows around refuel and repair forms
- Dashboard summary rendering for monthly totals
- Login/logout flow with auth state

3. E2E tests

- Critical path coverage for MVP flows

## Minimum Scenario Set (MVP)

For each release candidate, ensure automated coverage for:

1. Add refuel with mileage, liters, and amount → verify consumption auto-calculated
2. Add refuel with skipped entry → verify consumption skipped
3. Edit an existing refuel and verify updated consumption/totals
4. Add repair with description, location, and amount
5. Dashboard monthly totals reflect refuel + repair changes
6. Offline add/edit behavior remains stable (Ionic Storage persists, Firestore sync on reconnect)
7. Login with Firebase Auth → redirect to dashboard
8. Logout → redirect to login

## Quality Gates

Before merge, AI should run:

```bash
npm exec nx affected -t lint test build e2e
```

And confirm:

- No lint errors
- No failing unit/component tests
- No failing e2e tests in affected scope
- Build succeeds

Current enforcement policy:

- CI does not block automatically yet for missing critical-flow tests.
- Agents should still add those tests and explicitly report any missing coverage.

## Consumption Calculation Test Guidance

Use these mandatory checks for the l/100km formula:

- Two consecutive refuels: verify `(liters / (mileage - prevMileage)) * 100` returns correct value
- Edge case: mileage difference of zero → handle gracefully (show "N/A" or message)
- Edge case: liters is undefined → skip calculation
- Edge case: isSkipped = true → skip calculation, show skipped reason
- Edge case: previous refuel had isVerva = true → show info note about potential consumption variance
- First refuel for a car → no consumption (show "Brak danych do wyliczenia")
- Edit a previous refuel's mileage → subsequent consumption values should recalculate
- Rounding behavior: l/100km displayed with 1 decimal place (e.g., 7.3 l/100km)

### Additional Money Test Guidance

- Decimal inputs for amount (for example 0.1, 100.23)
- Summary aggregation of multiple refuel and repair amounts
- Edit flow where amount changes from one decimal value to another
- Formatting consistency: Polish złoty (PLN), e.g. "100,23 zł"
- Half-up rounding behavior at 2 decimal places for display
- Serialization and parsing consistency for number-based Firestore values

## Offline/Sync Test Guidance

Include scenarios for:

- Create refuel while offline (Ionic Storage persists, Firestore unavailable)
- Create repair while offline
- Edit refuel while offline
- App refresh behavior in offline state (data still available from Ionic Storage)
- Return online and verify Firestore sync (local → remote)
- Sync queue behavior: multiple offline operations synced in order on reconnect
- Firestore listener behavior: remote changes pushed to local Ionic Storage

## Non-Goals For MVP Test Automation

Not required yet unless a task explicitly requests it:

- Multi-car sync conflict resolution
- Speech-to-text recognition testing (native plugin, test UI integration only)
- Push notification delivery
- Capacitor native plugin deep testing (camera, filesystem — test UI integration only)

## Security Checklist For AI Changes

Before merge, confirm:

- Inputs are validated on client (form validators) and Firestore (security rules).
- No secrets or credentials are introduced in client code.
- User-controlled strings are sanitized before rendering (Ionic handles most but verify).
- Firebase Auth tokens are not stored in insecure locations.
- Dependency risk check is tracked periodically in CI workflows.

## Manual QA Checklist

Before release candidate sign-off, confirm manually:

1. Login with Firebase Auth (email + Google) works.
2. Dashboard shows correct monthly totals after adding refuels and repairs.
3. Add refuel flow works — consumption auto-calculated correctly.
4. Edit refuel flow works — consumption recalculated.
5. Add repair flow works — all fields save correctly.
6. Edit repair flow works.
7. Offline add and refresh behavior is stable.
8. Firestore sync works after returning online.
9. Ionic swipe actions work on lists (swipe left = delete, swipe right = edit).
10. FAB button opens quick-add menu (refuel / repair).
