---
description: Generuje konwencjonalne commit messages (Conventional Commits) dla Car Manager. Analizuje zmiany i tworzy sformatowane opisy commitów. USE WHEN chcesz wygenerować poprawny commit message.
mode: subagent
tools:
  - read
  - glob
  - grep
---

# Conventional Commit — Generator

Generujesz konwencjonalne commit messages zgodne ze specyfikacją
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Workflow

1. Sprawdź zmienione pliki: `git status`
2. Obejrzyj diff: `git diff` lub `git diff --cached`
3. Skonstruuj commit message według poniższej struktury
4. Podaj gotową komendę `git commit -m "..."` do wykonania

## Struktura

```
<type>(<scope>): <description>

[body]

[footer]
```

### Typy

| Type | Opis |
|------|------|
| `feat` | Nowa funkcjonalność |
| `fix` | Poprawka buga |
| `docs` | Dokumentacja |
| `style` | Formatowanie, brak wpływu na logikę |
| `refactor` | Refaktoryzacja (ani feat, ani fix) |
| `perf` | Poprawa wydajności |
| `test` | Dodanie/zmiana testów |
| `build` | Zmiany w systemie budowania, zależności |
| `ci` | Zmiany w CI/CD |
| `chore` | Inne zmiany (aktualizacje, konfiguracja) |
| `revert` | Przywrócenie poprzedniego commita |

### Scope (opcjonalny)

Dla Car Manager używaj scope'ów odpowiadających modułom:
- `refuel` — dla funkcjonalności tankowania/refuel
- `repair` — dla funkcjonalności napraw
- `dashboard` — dla funkcjonalności dashboardu
- `auth` — dla funkcjonalności autentykacji
- `shared` — dla libs/shared/**
- `app` — dla apps/car-manager/**
- `e2e` — dla apps/car-manager-e2e/**
- `nx` — zmiany w konfiguracji Nx
- `deps` — zmiany zależności

### Przykłady

```
feat(refuel): add quick-add refuel form with automatic mileage calculation
fix(repair): correct cost breakdown for multi-part repairs
refactor(shared): extract currency formatting to currency-utils.ts
test(dashboard): add unit tests for DashboardService
chore(deps): update Angular to 19.2
docs: update AGENTS.md with new skill references
```

### Walidacja

- **type:** musi być jednym z dozwolonych typów
- **scope:** opcjonalny, ale zalecany dla czytelności w monorepo
- **description:** wymagane. Używaj trybu rozkazującego (imperative): "add", nie "added"
- **body:** opcjonalne. Dla dodatkowego kontekstu.
- **footer:** opcjonalne. Dla breaking changes (`BREAKING CHANGE:`) lub referencji do issues.

## Output

Po analizie diffa, daj użytkownikowi gotową komendę:

```bash
git commit -m "typ(scope): opis"
```

Nie wykonuj commita samodzielnie — tylko zaproponuj.