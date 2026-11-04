# Bug: [XX] — [Krótki tytuł buga]

**Status:** 🔴 Otwarty | 🟡 W trakcie | 🟢 Naprawiony
**Data zgłoszenia:** YYYY-MM-DD
**Data naprawy:** (wypełnić po fixie)
**Priorytet:** P0 (krytyczny) | P1 (wysoki) | P2 (średni) | P3 (niski)
**Typ:** Regresja | Nowy bug | Edge case

---

## Objawy

**Zachowanie rzeczywiste (BUG):**
[Opisz co się dzieje — co jest nieprawidłowe]

**Zachowanie oczekiwane:**
[Opisz co powinno się dziać]

---

## Kroki do reprodukcji

1. [Krok 1]
2. [Krok 2]
3. [Krok 3]
4. **Rezultat:** [Co się dzieje nieprawidłowo]

---

## Root Cause Analysis

**Przyczyna techniczna:**
[Wyjaśnienie techniczne dlaczego bug występuje — który komponent/serwis/util jest wadliwy]

**Dotknięte pliki:**
- `apps/car-manager/src/app/...`
- `libs/shared/...`

---

## Proponowane rozwiązanie

[High-level strategia naprawy — przed implementacją]

---

## Rozwiązanie (wypełnić po implementacji)

**Zastosowane podejście:**
[Jak faktycznie naprawiono]

---

## Naprawione pliki

| Plik | Zmiana |
|------|--------|
| `...` | [Co zmieniono] |

---

## Zweryfikowano przez

- [ ] Test regresyjny przechodzi: `[ścieżka do testu]`
- [ ] Unit testy przechodzą: `npm exec nx test car-manager`
- [ ] Build przechodzi: `npm exec nx build car-manager`
- [ ] Quality Gate przechodzi: `npm exec nx affected -t lint test build e2e`
- [ ] Code Review: ✅ APPROVED