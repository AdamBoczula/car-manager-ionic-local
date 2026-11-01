# Project Context (MVP)

Last updated: 2026-11-01

## Product Intent

Car Manager is a mobile app for tracking car expenses (fuel + repairs), designed for a household with two users sharing one car. The app works offline and syncs to Firebase Firestore when online.

## MVP Scope

In scope:
- Login via Firebase Auth (email/password or Google Sign-In)
- Dashboard with summary: last refuel + consumption, monthly spending totals, quick-add buttons
- Refuel CRUD: add, edit, delete refuel records with automatic consumption calculation (l/100km)
- Repair CRUD: add, edit, delete repair records with speech-to-text support
- Offline-first: all writes go to Ionic Storage first, then sync to Firestore in background
- Polish złoty (PLN) as currency
- One shared car with two users

Planned after MVP:
- Multiple cars support
- Push notifications (service reminders)
- Charts for consumption trends
- CSV/PDF export
- OCR receipt scanning

## Critical Business Flows

These flows are mandatory to protect with tests:
1. Add refuel with mileage and liters → automatic consumption calculation
2. Add repair with description (including speech-to-text input)
3. Edit existing refuel → consumption recalculation
4. Dashboard summary with monthly totals (refuels + repairs)
5. Offline add/edit workflow with local persistence and Firestore sync
6. Login/auth flow (Firebase Auth)

## High-Risk Areas

Treat these as high-risk during implementation and review:
- Consumption calculation (l/100km formula: `(liters / (mileage - prevMileage)) * 100`)
- Offline/sync behavior (Ionic Storage → Firestore)
- Firebase Auth (login, token refresh, offline auth state)

## Money and Time Assumptions (Current)

Known assumptions from stakeholder input:
- Decimal money values are required (example: 100.23)
- Currency is Polish złoty (PLN)
- Date/time examples indicate Poland timezone usage
- MVP date handling uses native Date with centralized month/year boundary utilities
- Canonical reporting timezone is Europe/Warsaw

Important:
- No external money library is used for MVP; arithmetic must be centralized in utility functions.
- Internal representation uses JavaScript number values.
- Round half-up to 2 decimal places for display values.
- Keep raw computed values for intermediate calculations and aggregate logic.

## Consumption Calculation Rules

The l/100km formula:
1. Find the previous refuel for the same car (ordered by date).
2. If previous exists and has mileage and liters: `(liters / (currentMileage - prevMileage)) * 100`
3. Skip calculation if `isSkipped = true` or no previous entry exists.
4. If previous refuel used Verva (premium fuel), display an info note that consumption may differ.

## Source Of Truth

- Firebase Firestore is the source of truth
- Ionic Storage (IndexedDB) serves as local cache and offline buffer
- Sync strategy: write-local-first, background push to Firestore, Last-Write-Wins conflict resolution

## Near-Term Product Success Signals

Quality goals currently emphasized:
- Strong component test coverage using Vitest + Angular Testing Library
- Unit test coverage for consumption calculation utilities, services, and TypeScript logic
- E2E test coverage for critical flows (add refuel, offline add, login) via Playwright
- Reliable test coverage for critical business cases