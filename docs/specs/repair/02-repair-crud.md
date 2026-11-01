# Naprawy – Faza 2 (Repair CRUD)

## Cel
Pełny CRUD dla napraw: lista + formularz z textarea i speech-to-text.

## AC (Acceptance Criteria)

### AC-1: Lista napraw
- Wyświetla wszystkie naprawy posortowane malejąco po dacie
- Każdy element pokazuje: datę, kwotę, przebieg, miejsce, krótki opis
- Pusty stan: "Brak napraw – dodaj pierwszą!"
- Przycisk "+" w headerze do dodawania nowej

### AC-2: Usuwanie naprawy
- Swipe w lewo na elemencie → przycisk "Usuń"
- Po usunięciu element znika z listy

### AC-3: Formularz naprawy
- Data – date picker (domyślnie dzisiejsza)
- Kwota – number input (PLN)
- Przebieg – number input (km)
- Miejsce – text input (np. "AutoSerwis Kraków")
- Opis prac – `<ion-textarea>` z dużą ilością miejsca
- Komentarz o wykonawcy – `<ion-textarea>`
- Przycisk 🎤 (speech-to-text) – uruchamia rozpoznawanie mowy, wypełnia pole "Opis prac"
- Przycisk "Zapisz" – dodaje naprawę i wraca do listy

### AC-4: Walidacja formularza
- Data wymagana
- Kwota > 0
- Przebieg > 0
- Miejsce wymagane
- Opis prac wymagany

### AC-5: Speech-to-text
- Przycisk z mikrofonem 🎤 przy polu "Opis prac"
- Po tapnięciu uruchamia natywne rozpoznawanie mowy (Capacitor plugin)
- W przeglądarce (dev) – używa Web Speech API jako fallback
- Wynik dokleja do istniejącego tekstu w textarea

## Implemented in
| Feature | File(s) |
|---------|---------|
| Repair list page | `pages/repair-list/repair-list.page.ts` |
| Repair form page | `pages/repair-form/repair-form.page.ts` |
| Speech service | `core/services/speech.service.ts` |

---

*Created: 01.11.2026*