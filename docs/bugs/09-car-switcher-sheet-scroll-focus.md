# Bug: [09] — Arkusz „Dodaj auto” nie reaguje na klawiaturę i nie da się go przewinąć

**Status:** 🔵 Zastąpiony przez [bug 10](./10-native-keyboard-integration.md)
**Data zgłoszenia:** 2026-11-18
**Data naprawy:** 2026-11-18
**Priorytet:** P1 (wysoki) — blokuje dodanie auta na telefonie
**Typ:** Błąd layoutu UI (Ionic sheet modal + soft keyboard)
**Powiązane:** [bug 06](./06-sheet-modal-offscreen-submit.md) — poprzednia, niepełna poprawka

> **Addendum (2026-11-18):** podniesienie `initialBreakpoint` do `0.8` naprawiło
> dostęp do przycisku, ale zostawiło ~`110 px` martwej przestrzeni pod nim — arkusz
> nadal nie dopasowuje się do treści formularza. Dodatkowo aplikacja nie obsługiwała
> klawiatury natywnej (`@capacitor/keyboard`, `adjustResize`). Oba dialogi są teraz
> kartami o wysokości treści, a klawiatura jest obsługiwana natywnie — szczegóły
> w [bug 10](./10-native-keyboard-integration.md). Poniższa analiza pozostaje
> aktualna jako opis zachowania sheet modala w Ionic.

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

Na telefonie (`390 × 664`, klawiatura wirtualna) arkusz „Dodaj nowe auto”:

1. Otwiera się na breakpoincie `0.55`, przycisk **„Dodaj auto”** jest poza ekranem
   (`y ≈ 656–692 px` przy widocznych `664 px`).
2. Zawartość `ion-content` **nie przewija się** — `scrollHeight === clientHeight`.
3. Po dotknięciu pola i otwarciu klawiatury (viewport `390 × 360`) cały formularz
   i przycisk są **poza ekranem** — nie da się dokończyć dodawania auta.

Analogicznie zachowuje się arkusz „Edytuj auto” (przyciski „Zapisz” / „Usuń auto”).

**Zachowanie oczekiwane:**

- Arkusz po otwarciu pokazuje wszystkie pola **i** przycisk akcji.
- Dotknięcie dowolnego pola rozwija arkusz do pełnej wysokości, także gdy
  klawiatura zwęziła viewport.
- Przycisk akcji jest zawsze osiągalny (jest częścią przewijanej zawartości).

---

## Kroki do reprodukcji

1. Zarejestruj konto i dodaj pierwsze auto (kreator), otwórz `/dashboard`
2. Dotknij przełącznika auta w headerze → „Dodaj auto”
3. **Rezultat:** przycisk „Dodaj auto” jest pod dolną krawędzią ekranu
4. Dotknij pola „Nazwa auta”, otwórz klawiaturę
5. **Rezultat:** cały formularz znika pod klawiaturą

Pomiary przed poprawką (viewport `390 × 664`, breakpoint `0.55`):

| Element                           | Wartość                              |
| --------------------------------- | ------------------------------------ |
| Wysokość viewportu                | `664 px`                             |
| `ion-content`                     | `360 px → 958 px`                    |
| `ion-footer` (przypięty)          | `902 px → 958 px`                    |
| Przycisk „Dodaj auto”             | `912 px → 948 px`                    |
| `scrollHeight === clientHeight`   | `542 px` (brak scrolla)              |
| Po otwarciu klawiatury (`360 px`) | przycisk `472–508 px` — poza ekranem |

---

## Root Cause Analysis

### 1. `ion-footer` odbiera wysokość `ion-content`

Ionic traktuje `ion-modal.modal-sheet` jako flex-column. Przypięty `ion-footer`
nie zabiera miejsca `ion-content` w sposób, który pozwala na scroll — `ion-content`
dostaje **pełną** wysokość wrappera, więc `scrollHeight === clientHeight`
i `expandToScroll` nie ma czego rozwijać.

### 2. `ion-modal` w trybie sheet nie kurczy `ion-content`

Kluczowe odkrycie podczas diagnozy: sheet modal **nie zmniejsza** `ion-content`
do widocznej części. Ionic przesuwa cały `.modal-wrapper` przez `translateY`,
a `ion-content` pozostaje wysokości **całego** wrappera (`598 px`), niezależnie od
breakpointu. Potwierdzone pomiarami: po `setCurrentBreakpoint(0.55)` oraz `1`
`content.getBoundingClientRect().height` było identyczne.

Konsekwencje:

- `expandToScroll` **nie zadziała** dopóki treść nie jest wyższa niż sam wrapper —
  a nie jest, bo wrapper ma pełną wysokość.
- Ograniczanie `ion-content` przez `max-height` / `--height: auto` w SCSS
  **przesuwa** zawartość poza ekran (content jest kolejnym elementem flex po
  headerze) — sprawdzone eksperymentalnie, odrzucone.
- Zmiana `breakpoints` / `initialBreakpoint` w runtime nie powoduje przeliczenia
  layoutu przez Ionic.

### 3. Brak reakcji na fokus / klawiaturę

`@capacitor/keyboard` **nie jest** zainstalowany, a `AndroidManifest.xml` nie ma
`windowSoftInputMode="adjustResize"`. Po otwarciu klawiatury viewport się zwęża,
ale arkusz zostaje na `0.55` i formularz ląduje pod klawiaturą. Brak
`(ionFocus)` → brak jakiejkolwiek reakcji arkusza.

---

## Rozwiązanie

### Arkusz otwiera się wysoko i rozwija na fokus

1. `[initialBreakpoint]="0.8"`, `[breakpoints]="[0.8, 1]"` — po otwarciu widoczne
   są **wszystkie** pola i przycisk akcji; `1` to jedyny wyższy stan, więc każdy
   gest/rozwinięcie prowadzi w przewidywalne miejsce.
2. `[expandToScroll]="true"` — przewijanie treści rozwija arkusz.
3. `(ionFocus)="expandSheetForTyping()"` na **każdym** polu — `setCurrentBreakpoint(1)`
   natychmiast po dotknięciu pola, co ratuje sytuację przy otwartej klawiaturze.
4. `ion-footer` **usunięty** z obu arkuszy; przycisk akcji przeniesiony do
   `ion-content` (arkusz edycji: wiersz `.car-switcher__sheet-actions`).
5. `.car-switcher__sheet-content` — `--padding-start/end: 16px` oraz
   `--padding-bottom: calc(24px + var(--ion-safe-area-bottom))`.

### Wynik po poprawce (viewport `390 × 664` / `390 × 360` z klawiaturą)

| Stan                                    | Przycisk „Dodaj auto”     |
| --------------------------------------- | ------------------------- |
| Arkusz otwarty (`0.8`)                  | `493 → 529 px` — widoczny |
| Po fokusie pola (`1`)                   | `362 → 398 px` — widoczny |
| Klawiatura otwarta, po `scrollIntoView` | `292 → 328 px` — widoczny |

Arkusz „Edytuj auto” (`0.8`): „Zapisz” `497 → 533 px` — widoczny bez przewijania.

**Naprawione pliki:**

| Plik                                                                                  | Zmiana                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts`   | oba arkusze: `0.8` / `[0.8, 1]` / `expandToScroll`; `ion-footer` usunięty; akcje w `ion-content`; `(ionFocus)` → `expandSheetForTyping()`; `viewChild` na oba modal |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.scss` | `__sheet-content`, `__submit`, `__sheet-actions`                                                                                                                    |

**Testy regresyjne:**

| Warstwa | Plik                                                                                     | Zakres                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Unit    | `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.spec.ts` | rozwinięcie na fokus, brak wyjątku bez arkusza, brak `ion-footer`, breakpointy `≥ 0.8` i `expandToScroll`                 |
| E2E     | `apps/car-manager-e2e/src/car-switcher-sheet-scroll.spec.ts`                             | brak przypiętego footera, przycisk widoczny od razu po otwarciu, arkusz rozwija się i treść przewija się przy klawiaturze |

Test E2E **nie wymaga emulatora Firebase** — konto zakładane jest przez UI rejestracji.

---

## Zapobieganie

- W sheet modalu **nie używaj `ion-footer`** dla akcji formularza — umieść akcję
  w `ion-content`, inaczej treść nigdy się nie przewinie.
- `initialBreakpoint` arkusza z formularzem ustaw tak, aby akcja była widoczna
  **bez** interakcji (`0.8` dla 4 pól) — użytkownik nie musi odkrywać gestów.
- Zawsze dodawaj `(ionFocus)` → rozwinięcie arkusza; bez tego klawiatura wirtualna
  zasłania formularz.
- Testuj na `390 × 664` **oraz** `390 × 360` (symulacja klawiatury).
- Rozważ `@capacitor/keyboard` + `windowSoftInputMode="adjustResize"` jako osobne
  zadanie (poza zakresem tej poprawki).
