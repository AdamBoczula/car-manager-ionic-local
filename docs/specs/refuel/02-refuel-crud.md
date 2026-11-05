# Tankowania – Faza 2 (Refuel CRUD)

## Cel

Pełny CRUD dla tankowań: lista + formularz z automatycznym wyliczaniem spalania.

## AC (Acceptance Criteria)

### AC-1: Lista tankowań

- Wyświetla wszystkie tankowania posortowane malejąco po dacie
- Każdy element pokazuje: datę, kwotę, przebieg, litry (jeśli podano), spalanie (jeśli wyliczono)
- Pusty stan: "Brak tankowań – dodaj pierwsze!"
- Przycisk "+" w headerze do dodawania nowego

### AC-2: Usuwanie tankowania

- Swipe w lewo na elemencie → przycisk "Usuń"
- Po usunięciu element znika z listy

### AC-3: Formularz tankowania

- Data – date picker (domyślnie dzisiejsza)
- Kwota – number input (PLN)
- Przebieg – number input (km)
- Verva? – toggle switch
- Ilość litrów – opcjonalne pole number
- Pomiń wpis – checkbox; gdy zaznaczony, pokazuje pole "Powód pominięcia" (text)
- Przycisk "Zapisz" – dodaje tankowanie i wraca do listy

### AC-4: Automatyczne wyliczanie spalania

- Po zapisie tankowania, jeśli podano litry i istnieje poprzednie tankowanie, wylicza spalanie
- Wyświetla wynik na liście (np. "7.58 L/100km")
- Jeśli brak danych – nie wyświetla spalania

### AC-5: Walidacja formularza

- Data wymagana
- Kwota > 0
- Przebieg > 0
- Jeśli "Pomiń wpis" zaznaczone – powód wymagany

## Implemented in

| Feature          | File(s)                                 |
| ---------------- | --------------------------------------- |
| Refuel list page | `pages/refuel-list/refuel-list.page.ts` |
| Refuel form page | `pages/refuel-form/refuel-form.page.ts` |

---

_Created: 01.11.2026_
