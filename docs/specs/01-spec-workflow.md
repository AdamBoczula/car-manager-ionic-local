# Spec-Driven Development Workflow

Last updated: 2026-11-01

## Overview

Ten dokument definiuje proces Spec-Driven Development (SDD) dla projektu Car Manager.
Proces jest zoptymalizowany pod kątem równoległej pracy agentów – Developer i Tester
działają jednocześnie po zatwierdzeniu architektury, co skraca całkowity czas realizacji.

## Role

Proces wykorzystuje następujące role agenta:

| Rola | Odpowiedzialność | Wyzwalacz |
|------|-----------------|-----------|
| **Analityk biznesowy (BA)** | Zbiera wymagania metodą drill-down, tworzy draft speca | Użytkownik zgłasza potrzebę / pomysł |
| **Architekt** | Projektuje architekturę, tworzy ADR-y, rozszerza spec o sekcję "Architektura" | Spec zatwierdzony |
| **Developer (Dev)** | Implementuje kod metodą TDD, aktualizuje "Implemented in" na bieżąco | Architektura zatwierdzona |
| **Tester (QA)** | Tworzy i aktualizuje testy E2E, odpala quality gate | Architektura zatwierdzona (równolegle z Devem) |
| **QA Coordinator** | Orkiestruje przegląd UI/UX/A11y/Responsive, generuje raport QA | Użytkownik wywołuje `/qa-review` (faza [4b]) |
| **UI Reviewer** | Analizuje spójność wizualną, layout, typografię, stany komponentów | Wywoływany przez QA Coordinator |
| **UX Analyzer** | Ocenia user experience, heurystyki Nielsena, efektywność kliknięć | Wywoływany przez QA Coordinator |
| **A11y Auditor** | Audytuje dostępność WCAG 2.1 AA, Axe-core, ARIA, klawiatura | Wywoływany przez QA Coordinator |
| **Responsive Checker** | Testuje viewporty, touch targety, overflow, adaptację layoutu | Wywoływany przez QA Coordinator |

## Sekwencja (Pipeline)

```
[1] ANALIZA              → Użytkownik zgłasza pomysł
     │                    → Agent (BA) zadaje pytania drill-down
     │                    → Agent tworzy draft speca (docs/specs/<domain>/<name>.md)
     ▼
  🛑 BRAMKA 1: Użytkownik zatwierdza speca (status: confirmed)

[2] ARCHITEKTURA         → Agent (Architekt) czyta zatwierdzony spec
     │                    → Tworzy ADR (docs/adr/<NNN>-<title>.md) jeśli potrzebny
     │                    → Projektuje strukturę (gdzie idzie kod, jakie moduły)
     │                    → Rozszerza spec o sekcję "Architektura"
     ▼
  🛑 BRAMKA 2: Użytkownik zatwierdza architekturę

     ┌─────────────────────────────────────────────────────────┐
     │              RÓWNOLEGŁE ŚCIEŻKI                          │
     │                                                         │
[3A] DEV (TDD)          │  [3B] TESTER (E2E)                   │
     │                    │       │                             │
     │ Tworzy testy       │       │ Czyta spec od BA            │
     │   jednostkowe      │       │ Tworzy/aktualizuje          │
     │   i komponentowe   │       │   testy E2E                 │
     │ Implementuje kod   │       │                             │
     │ Aktualizuje        │       │                             │
     │   "Implemented in" │       │                             │
     │   i Task Board     │       │                             │
     │   na bieżąco       │       │                             │
     ▼                    │       ▼                             │
  (testy przechodzą)      │  (E2E gotowe)                      │
     │                    │       │                             │
     └────────┬───────────┴───────┘                             │
              ▼                                                │
[4] QUALITY GATE        → Agent (QA/Tester) odpala pełną bramkę │
     │                    → npm exec nx affected -t lint test    │
     │                      build e2e                            │
     ▼                                                          │
  🛑 BRAMKA 3: Quality gate przechodzi                           │

[4b] UI/UX REVIEW       → Użytkownik wywołuje /qa-review         │
     │                    → QA Coordinator orkiestruje 4         │
     │                      subagentów: ui-reviewer,             │
     │                      ux-analyzer, a11y-auditor,           │
     │                      responsive-checker                   │
     │                    → Generowany raport:                   │
     │                      docs/qa/YYYY-MM-DD-qa-report.md      │
     ▼                                                          │
  (opcjonalne, nie blokuje pipeline'u)                           │

[5] DONE                → Kod gotowy, wdrożony lokalnie          │
```

### Uwagi do flowu

- **Ścieżki 3A i 3B startują równolegle** po zatwierdzeniu architektury (Bramka 2) — skraca to czas realizacji
- **Użytkownik review'uje kod lokalnie na bieżąco** podczas implementacji — projekt solo, nie ma potrzeby formalnego Code Review jako osobnej fazy
- **Dokumentacja "Implemented in" aktualizowana na bieżąco** przez Deva w trakcie implementacji, nie dopiero na końcu
- **Manual QA jest poza formalnym workflow** — nie blokuje pipeline'u, wykonuje się opcjonalnie po fazie [4]
- **Faza [4b] UI/UX Review** — automatyczny przegląd UI/UX/A11y/Responsive wyzwalany ręcznie przez `/qa-review`. QA Coordinator orkiestruje 4 subagentów (ui-reviewer, ux-analyzer, a11y-auditor, responsive-checker), którzy używają Playwright MCP + Chrome DevTools MCP. Raport zapisywany w `docs/qa/`. **Nie blokuje pipeline'u.**
- **ADR-y** to artefakt tworzony przez Architekta w fazie [2] (docs/adr/<NNN>-<title>.md)
- **Pipeline ma 5 faz i 3 bramki** — zoptymalizowany pod kątem projektu solo

## Determinizm i śladowalność

### Konwencja adnotacji w kodzie

Każdy nowy plik kodu (`.ts`, `.html`, `.scss`, `.spec.ts`) musi zawierać nagłówek:

```typescript
// spec: docs/specs/<domain>/<name>.md
// uc: UC-1, UC-2  (opcjonalnie – które use case'y implementuje)
```

Każdy test (`.spec.ts`) musi zawierać adnotację przy teście:

```typescript
// covers: docs/specs/<domain>/<name>.md#AC-N
it('should add refuel with mileage and calculate consumption', () => { ... });
```

### Konwencja w specu

Każdy spec w sekcji "Implemented in" (aktualizowanej na bieżąco przez Deva) zawiera:

```markdown
## Implemented in

| Plik | Data | AC pokryte |
|------|------|------------|
| `apps/car-manager/src/app/.../file.ts` | 2026-11-01 | AC-1, AC-2 |
| `apps/car-manager-e2e/src/.../file.spec.ts` | 2026-11-01 | AC-1 |
```

### Walidacja

Skrypt `npm run spec:validate` (przyszłe zadanie) będzie sprawdzał:
- Czy każdy AC ma co najmniej jeden test z `// covers:`
- Czy każdy plik kodu ma `// spec:` referencję
- Czy pliki wymienione w "Implemented in" istnieją

## Bramki decyzyjne (gates)

### Bramka 1: Spec zatwierdzony
- Użytkownik mówi "zatwierdzam", "ok", "zapisuj"
- Agent (BA) zapisuje plik `docs/specs/<domain>/<name>.md` ze statusem `confirmed`

### Bramka 2: Architektura zatwierdzona
- Użytkownik mówi "zatwierdzam architekturę"
- Agent (Architekt) aktualizuje spec dodając sekcję "Architektura"
- Agent tworzy ADR(y) w `docs/adr/` jeśli architektura wymaga udokumentowanej decyzji
- Po zatwierdzeniu startują **równolegle** Dev (3A) i Tester (3B)

### Bramka 3: Quality gate
- `npm exec nx affected -t lint test build e2e` przechodzi
- Agent (QA/Tester) raportuje wyniki
- Po przejściu: **Done** — kod gotowy, wdrożony lokalnie

## ADR (Architecture Decision Records)

Architekt w fazie [2] tworzy ADR-y dla decyzji architektonicznych, które:
- Dotyczą wyboru między wieloma rozwiązaniami
- Mają długoterminowy wpływ na projekt
- Mogą być kontrowersyjne lub wymagają uzasadnienia

Szablon ADR: `docs/adr/adr-template.md`

Istniejące ADR-y są przechowywane w `docs/adr/` z konwencją nazewniczą:
```
docs/adr/<NNN>-<title>.md
```

Gdzie `<NNN>` to kolejny numer (001, 002, ...), a `<title>` to zwięzły tytuł oddzielony myślnikami.

## Manual QA (opcjonalne, poza workflow)

Po zakończeniu formalnego workflow (po Bramce 3), można opcjonalnie wykonać manualne testy QA
lub automatyczny przegląd UI/UX przez `/qa-review`.
Oba **nie blokują pipeline'u** i są wykonywane niezależnie.

Lista kontrolna manual QA znajduje się w `docs/ai/03-testing-quality-gates.md#manual-qa-checklist`.
Automatyczny przegląd UI/UX przez QA Coordinator jest opisany w `.opencode/agents/qa-coordinator.md`.

### Automatyczny przegląd UI/UX (faza [4b])

Wywołaj `/qa-review` w OpenCode aby uruchomić automatyczny przegląd:
- **UI Reviewer** — spójność wizualna, layout, typografia, stany komponentów
- **UX Analyzer** — user experience, heurystyki Nielsena, efektywność
- **A11y Auditor** — dostępność WCAG 2.1 AA, Axe-core, klawiatura, ARIA
- **Responsive Checker** — viewporty, touch targety, adaptacja layoutu

Raport zapisywany jest w `docs/qa/YYYY-MM-DD-qa-report.md`.

## Powiązane pliki

- `docs/specs/02-spec-template.md` – szablon speca
- `docs/specs/03-spec-glossary.md` – słownik pojęć
- `docs/adr/adr-template.md` – szablon ADR
- `.opencode/skills/business-analyst.md` – definicja skillu analityka
- `docs/ai/02-agent-operating-model.md` – role agenta i permission model
- `docs/ai/03-testing-quality-gates.md` – quality gates i manual QA checklist
- `.opencode/agents/qa-coordinator.md` – QA Coordinator (faza [4b])
- `.opencode/agents/ui-reviewer.md` – UI Reviewer subagent
- `.opencode/agents/ux-analyzer.md` – UX Analyzer subagent
- `.opencode/agents/a11y-auditor.md` – A11y Auditor subagent
- `.opencode/agents/responsive-checker.md` – Responsive Checker subagent
- `.opencode/commands/qa-review.md` – komenda /qa-review
- `docs/qa/qa-report-template.md` – szablon raportu QA