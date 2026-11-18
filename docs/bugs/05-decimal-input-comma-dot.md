# Bug: [05] — Wpisywanie przecinka lub kropki w polach dziesiętnych czyści wartość

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-07
**Data naprawy:** 2026-11-07
**Priorytet:** P1 (wysoki)
**Typ:** Błąd UI / Walidacja

---

## Objawy

**Zachowanie rzeczywiste (BUG):**
W formularzu tankowania (`apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts`) oraz w formularzu naprawy (`apps/car-manager/src/app/pages/repair-form/repair-form.page.ts`), podczas wpisywania kwoty (lub litrów) naciśnięcie klawisza `,` (przecinek) lub `.` (kropka) powodowało wyczyszczenie wartości inputa (reset do 0 lub puste pole).

**Zachowanie oczekiwane:**
W polach z wartościami dziesiętnymi (Kwota w PLN, Litry) wpisanie `,` lub `.` powinno wstawiać odpowiedni znak separatora dziesiętnego (polski format `,`), nie czyścić wartości i pozwalać na swobodne wpisanie wartości z częścią ułamkową (np. `123,45`).

---

## Kroki do reprodukcji

1. Otwórz formularz dodawania tankowania (`/refuel-form`) lub naprawy (`/repair-form`).
2. W polu "Kwota (PLN)" wpisz cyfry np. `12`.
3. Naciśnij klawisz `,` lub `.` na klawiaturze (lub klawiaturze numerycznej).
4. **Rezultat:** Wartość natychmiast znika lub resetuje się do 0. Nie można wpisać kwoty dziesiętnej z groszami.

---

## Root Cause Analysis

**Przyczyna techniczna:**

1. W szablonach komponentów `refuel-form.page.ts` i `repair-form.page.ts` pola dziesiętne miały atrybut `type="number"`:
   `<ion-input type="number" [value]="amount()" (ionInput)="amount.set($any($event).detail.value ? +$any($event).detail.value : 0)" ... />`
2. Zgodnie ze specyfikacją HTML5, element `<input type="number">` akceptuje wyłącznie liczby zmiennoprzecinkowe w notacji kropkowej. W przeglądarkach wpisanie przecinka `,` (lub niedokończonej kropki) powoduje stan `badInput` i natywna wartość `HTMLInputElement.value` staje się pustym ciągiem `""`.
3. Zdarzenie `(ionInput)` przekazywało pusty string `""`.
4. Wyrażenie `amount.set($any($event).detail.value ? +$any($event).detail.value : 0)` ustawiało sygnał `amount` na `0`.
5. Powiązanie `[value]="amount()"` wymuszało przekazanie wartości `0` z powrotem do kontrolki, nadpisując i czyszcząc to, co użytkownik dotychczas wpisał.
6. Nawet przy naciśnięciu `.`, bezpośrednia konwersja `+$event.detail.value` usuwała kropkę dopóki użytkownik nie wpisze kolejnej cyfry, bo `Number("12.") === 12`, co natychmiast cofało wpisaną kropkę.

**Dotknięte pola:**

1. `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts`:
   - `Kwota (PLN)` (`amount`)
   - `Ilość litrów (opcjonalnie)` (`liters`)
2. `apps/car-manager/src/app/pages/repair-form/repair-form.page.ts`:
   - `Kwota (PLN)` (`amount`)

---

## Rozwiązanie

1. Utworzono moduł narzędziowy `apps/car-manager/src/app/core/utils/decimal-input.util.ts`:
   - `formatDecimalInput(value: string | null | undefined, maxDecimals = 2): string`:
     - Normalizuje kropki `.` do przecinków `,` w czasie rzeczywistym.
     - Automatycznie zamienia wiodący separator (`,`) na `0,`.
     - Odrzuca znaki nieliczbowe i zapobiega wstawieniu więcej niż jednego separatora dziesiętnego.
     - Ogranicza liczbę miejsc po przecinku do podanego limitu (domyślnie 2).
   - `parseDecimal(value: string | null | undefined): number`:
     - Bezpiecznie parsuje ciąg z przecinkiem lub kropką do `number` dla Firestore / API.
   - `handleDecimalKeyDown(event: KeyboardEvent): void`:
     - Blokuje klawisze nieliczbowe na fizycznej klawiaturze, przepuszczając klawisze nawigacyjne i funkcyjne.
2. Zaktualizowano formularze `RefuelFormPage` oraz `RepairFormPage`:
   - Zastąpiono `type="number"` przez `type="text"` oraz `inputmode="decimal"` (odpowiednia klawiatura na telefonach, brak czyszczenia inputa).
   - Wprowadzono sygnały tekstowe (`amountRaw`, `litersRaw`) jako źródło prawdy dla `[value]`.
   - Zastosowano `computed(() => parseDecimal(this.amountRaw()))` dla wartości numerycznych `amount` i `liters`.
3. Dodano testy jednostkowe i regresyjne:
   - `apps/car-manager/src/app/core/utils/decimal-input.util.spec.ts`
   - `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.spec.ts`
   - `apps/car-manager/src/app/pages/repair-form/repair-form.page.spec.ts`

---

## Naprawione pliki

| Plik                                                                  | Zmiana                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/core/utils/decimal-input.util.ts`           | Nowy moduł narzędziowy formatowania i parsowania liczb dziesiętnych                            |
| `apps/car-manager/src/app/core/utils/decimal-input.util.spec.ts`      | Testy jednostkowe funkcji formatowania, parsowania i obsługi klawiatury                        |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts`      | Obsługa pól `amount` i `liters` przez `type="text" inputmode="decimal"` i `formatDecimalInput` |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.spec.ts` | Test regresyjny dla wpisywania `,` i `.` w formularzu tankowania                               |
| `apps/car-manager/src/app/pages/repair-form/repair-form.page.ts`      | Obsługa pola `amount` przez `type="text" inputmode="decimal"` i `formatDecimalInput`           |
| `apps/car-manager/src/app/pages/repair-form/repair-form.page.spec.ts` | Test regresyjny dla wpisywania `,` i `.` w formularzu naprawy                                  |
