# AI Readiness Overview

Last updated: 2026-11-01

## Purpose

This folder defines the minimum context AI agents need to work safely and effectively in this repository.

The goal is to reduce:
- Wrong assumptions about product scope
- Architecture boundary violations
- Low-value or risky code changes
- Missing tests for critical business flows

## Quick Start For Any AI Agent

Before making changes, read in this order:
1. AGENTS.md
2. PLAN.md
3. nx.json
4. tsconfig.base.json
5. docs/ai/01-project-context-mvp.md
6. docs/ai/02-agent-operating-model.md
7. docs/ai/03-testing-quality-gates.md
8. docs/ai/05-technology-stack-decisions.md
9. docs/ai/06-repository-architecture.md
10. docs/specs/01-spec-workflow.md (SDD process for new features)

## Workspace Facts

- Monorepo: Nx
- Frontend stack: Ionic 9 + Angular 22 + Capacitor 8
- Testing direction: Vitest + Angular Testing Library + TestBed where needed
- E2E: Playwright via Nx
- MVP domains in scope: Refuel, Repair, Dashboard, Auth, Settings, PWA
- UI direction: Ionic components + CSS variables (mobile-first, max 430px)
- State direction: Angular Signals + RxJS (for Firebase streams)
- Offline persistence: Ionic Storage (IndexedDB) + Firestore sync (offline-first)

## Primary Quality Objective

AI-generated changes should prioritize correctness of car expense calculations and reliability of offline flows.

## Definition of Done (AI Changes)

A change is not done until all are true:
- Unit tests pass
- Component/integration tests for business flow pass
- E2E critical path passes
- Nx affected tasks pass (`npm exec nx affected -t lint test build e2e`)
- No architecture boundary violations
- Traceability annotations in place (`// spec:`, `// covers:`, "Implemented in" updated)
- User has reviewed the changes locally

## Preferred Validation Command

```bash
npm exec nx affected -t lint test build e2e
```

## Governance Rule

- Agents may update documentation without approval.
- Agents must request approval before changing code or tests (unit/component/e2e).