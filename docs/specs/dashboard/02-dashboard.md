# Dashboard – Faza 2

## Cel
Rozbudowany dashboard z podsumowaniem finansowym, ostatnim tankowaniem, kalkulacją spalania i szybkimi akcjami.

## AC (Acceptance Criteria)

### AC-1: Ostatnie tankowanie
- Wyświetla datę, kwotę, przebieg ostatniego tankowania
- Jeśli wyliczono spalanie – pokazuje wartość L/100km
- Jeśli brak danych – pokazuje "Brak danych o tankowaniach"

### AC-2: Suma wydatków w bieżącym miesiącu
- Sumuje kwoty wszystkich tankowań i napraw z bieżącego miesiąca
- Wyświetla w PLN (format: "1 234,56 zł")

### AC-3: Szybkie akcje (FAB)
- FAB button na dole ekranu
- Po kliknięciu rozwija 2 opcje: ⛽ Tankowanie, 🔧 Naprawa
- Każda opcja nawiguje do odpowiedniego formularza

### AC-4: Puste stany
- Gdy brak tankowań i napraw – zachęcający komunikat
- Dashboard nadal funkcjonalny (pokazuje same szybkie akcje)

## Implemented in
| Feature | File(s) |
|---------|---------|
| Dashboard page | `pages/dashboard/dashboard.page.ts` |
| Dashboard template | `pages/dashboard/dashboard.page.html` |
| Dashboard styles | `pages/dashboard/dashboard.page.scss` |
| Dashboard tests | `pages/dashboard/dashboard.page.spec.ts` |

---

*Created: 01.11.2026*