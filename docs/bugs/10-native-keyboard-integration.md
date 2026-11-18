# Bug: [10] — Arkusz „Dodaj auto” zasłonięty klawiaturą, martwa przestrzeń pod przyciskiem

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-18
**Data naprawy:** 2026-11-18
**Priorytet:** P1 (wysoki) — blokuje dodanie auta na telefonie
**Typ:** Błąd UX/layoutu (Ionic sheet modal, klawiatura natywna Capacitor)
**Powiązane:** [bug 06](./06-sheet-modal-offscreen-submit.md), [bug 09](./09-car-switcher-sheet-scroll-focus.md) — poprzednie, niepełne poprawki

---

## Objawy

### 1. Martwa przestrzeń pod przyciskiem (zgłoszenie użytkownika)

Po poprzedniej poprawce (bug 09) arkusz otwierał się na breakpoincie `0.8`, żeby
przycisk akcji był zawsze klikalny. Skutek: pod przyciskiem zostawało ~`110 px`
pustej powierzchni. Przycisk był widoczny, ale wyglądało to nieprofesjonalnie —
arkusz zajmował więcej miejsca, niż potrzebował formularz.

### 2. Brak obsługi klawiatury natywnej

- Aplikacja nie miała `@capacitor/keyboard` — brak wiedzy o tym, czy klawiatura
  jest otwarta i jakiej jest wysokości.
- `AndroidManifest.xml` nie miał `windowSoftInputMode="adjustResize"`, więc przy
  pełnoekranowym WebView klawiatura **nakładała się** na formularz zamiast go
  ścisnąć.
- `capacitor.config.ts` nie ustawiał `resizeOnFullScreen`, co jest wymagane przez
  plugin klawiatury, gdy pasek statusu jest przezroczysty.

---

## Root Cause Analysis

### Sheet modal nie potrafi „zmieścić się w treści”

Ionic w trybie sheet:

1. ustawia `.modal-wrapper` na `--height: calc(100% - offset)` (prawie pełny ekran),
2. pozycjonuje go `position: absolute; bottom: 0`,
3. pokazuje go przez `transform: translateY(...)` zależny od breakpointu.

`ion-content` ma więc **zawsze** wysokość całego wrappera, a nie widocznej części.
Stąd dwa nierozłączne problemy:

- niski breakpoint → przycisk poza ekranem (bug 06/09),
- wysoki breakpoint → martwa przestrzeń pod przyciskiem.

Nie da się jednocześnie „pokazać całego formularza” i „nie marnować miejsca”
w arkuszu, dopóki wysokość arkusza jest pochodną breakpointu (`0.8 × ekran`),
a nie wysokości formularza.

### Ionic 8.6 wspiera modale o wysokości treści

W `@ionic/core` modal może mieć `--height` typu _content-sized_ (`auto`,
`fit-content`, `max-content`). Wtedy:

- `.modal-wrapper` ma `display: flex; flex-direction: column` i rośnie do treści,
- `--max-height: 100%` ogranicza go do ekranu,
- `ion-content` wykrywa to przez `readSizeToContent()` i **nie** rozciąga się do
  wysokości overlay — a gdy treść przekroczy limit, przewija się.

Haczyk: Ionic deklaruje `--height: 100%` we własnym arkuszu na hoście modala,
a `ion-content.readSizeToContent()` czyta **wyliczoną** wartość `--height`.
Ustawienie `--height: auto` w komponencie przegrywa specyficznością, więc
nadpisanie musi być `!important`. Dopiero wtedy modal faktycznie dopasowuje się
do treści (sprawdzone empirycznie: bez `!important` wrapper = `664 px`, z nim
`420 px`).

---

## Rozwiązanie

1. Oba dialogi (dodaj / edytuj auto) przestały być sheet modalem — nie mają już
   `initialBreakpoint`, `breakpoints` ani `expandToScroll`. Są to modalne **karty**
   o wysokości treści.
2. `.car-switcher__card-modal` (klasa na `ion-modal`):
   - `--width: min(100%, 480px)` — pełna szerokość telefonu, sensowny limit na tablecie,
   - `--height: auto !important` — wysokość dokładnie taka jak formularz,
   - `--max-height: calc(100% - 32px)` — karta nigdy nie dotyka krawędzi ekranu,
   - `--border-radius: 16px`.
3. `.car-switcher__modal-content` — padding `16px` w poziomie i
   `calc(16px + var(--ion-safe-area-bottom))` od dołu (pasek gestów iOS).
4. Usunięte `expandSheetForTyping()` i `(ionFocus)` — przy wysokości treści
   rozwijanie arkusza nie ma już czego robić. Zamiast tego
   `dismissKeyboard()` przy „Anuluj” / „Zamknij”, aby klawiatura nie została nad
   dashboardem.

### Klawiatura natywna

5. **`KeyboardService`** (`core/services/keyboard.service.ts`, nowy):
   - sygnały `isKeyboardVisible` / `keyboardHeight` z `keyboardDidShow` / `keyboardDidHide`,
   - na iOS: `setAccessoryBarVisible({ isVisible: false })` (pasek `^ v Done`
     zasłaniał ostatnie pole) oraz `setScroll({ isDisabled: true })` (WebView nie
     ucieka pod pasek górny),
   - `hide()` do chowania klawiatury z UI,
   - pełny graceful degradation: brak pluginu (web/PWA) → no-op, brak metod
     w implementacji natywnej → błędy połknięte.
6. Inicjalizacja w `APP_INITIALIZER` po storage i migracji — nie blokuje
   startu, bo wszystkie wywołania natywne są opakowane w `try/catch`.
7. `apps/car-manager/capacitor.config.ts` → `plugins.Keyboard.resizeOnFullScreen: true`.
8. `android/app/src/main/AndroidManifest.xml` → `android:windowSoftInputMode="adjustResize"`
   na `MainActivity`, żeby WebView faktycznie się kurczył.

### Wynik po poprawce (viewport `390 × 664`, pomiary z `390 px` szerokości)

| Stan                                 | Karta (wrapper) | Przycisk akcji            |
| ------------------------------------ | --------------- | ------------------------- |
| „Dodaj auto” otwarta                 | `122 → 542`     | `482 → 518 px` — widoczny |
| „Dodaj auto” + klawiatura (`360 px`) | `16 → 344`      | osiągalny po przewinięciu |
| „Edytuj auto” otwarta                | `118 → 546`     | `482 → 518 px` — widoczny |

Martwej przestrzeni pod przyciskiem nie ma: wcześniej arkusz miał `654 px`
wysokości przy `420 px` treści, teraz karta ma dokładnie `420 px`.

**Naprawione pliki:**

| Plik                                                                                  | Zmiana                                                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/car-manager/src/app/core/services/keyboard.service.ts`                          | nowy serwis klawiatury natywnej (sygnały + `init()` + `hide()`)                                        |
| `apps/car-manager/src/app/app.config.ts`                                              | `KeyboardService` w `APP_INITIALIZER` (po storage i migracji)                                          |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts`   | sheet → karta o wysokości treści; usunięte breakpointy i `expandSheetForTyping()`; `dismissKeyboard()` |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.scss` | `__card-modal` (`--height: auto`, `--max-height`), `__modal-content`                                   |
| `apps/car-manager/capacitor.config.ts`                                                | `plugins.Keyboard.resizeOnFullScreen: true`                                                            |
| `android/app/src/main/AndroidManifest.xml`                                            | `android:windowSoftInputMode="adjustResize"`                                                           |
| `package.json`                                                                        | `@capacitor/keyboard@^8.0.6`                                                                           |

**Testy regresyjne:**

| Warstwa | Plik                                                                                     | Zakres                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Unit    | `apps/car-manager/src/app/core/services/keyboard.service.spec.ts`                        | stan początkowy, zdarzenia show/hide, jednorazowa rejestracja, iOS-only API, brak pluginu, `hide()`, połknięte błędy |
| Unit    | `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.spec.ts` | oba dialogi jako karty (brak breakpointów), brak `ion-footer`, `dismissKeyboard()` woła `hide()`                     |
| E2E     | `apps/car-manager-e2e/src/car-switcher-sheet-scroll.spec.ts`                             | karta niższa od ekranu i bez scrolla, przycisk widoczny od razu, karta mieści się w ekranie przy klawiaturze         |

Test E2E **nie wymaga emulatora Firebase** — konto zakładane jest przez UI rejestracji.

---

## Zapobieganie

- Formularz w modalu na telefonie: używaj **karty o wysokości treści**
  (`--height: auto !important` + `--max-height`), nie sheet modalu. Sheet ma
  sens tylko dla treści, która ma sensowną wysokość „procentową” (lista, mapa).
- Nadpisania `--height` / `--width` modala wymagają `!important` — Ionic ustawia
  je we własnym arkuszu, a `ion-content` czyta wartość wyliczoną.
- Każdy nowy ekran z `ion-input` testuj z **otwartą klawiaturą** (viewport
  `390 × 360`) — samo klikanie w pola w przeglądarce tego nie wykryje.
- Zdarzenia Capacitora (`keyboardDidShow`, `keyboardDidHide`) **nie występują
  w przeglądarce** — kod musi działać bez pluginu, inaczej PWA i testy padają.
- Po `npx cap sync` sprawdź, czy `android/app/capacitor.build.gradle` zawiera
  wpis `:capacitor-keyboard` (w tym repo `android/` ma puste `assets/`, więc
  sync wymaga wpisu `public` w `.gitignore`-owanym katalogu — patrz niżej).

### Otwarta kwestia: `npx cap sync android`

W katalogu `android/` brakuje `app/src/main/assets/`, więc `npx cap sync android`
zatrzymuje się na `Could not find the web assets directory: .\www.`. Plugin
klawiatury jest już wykrywany przez CLI (`npx cap ls android` go listuje), ale
wpisy `:capacitor-keyboard` w `capacitor.settings.gradle` /
`capacitor.build.gradle` powstają dopiero po udanym `cap sync` lub `cap update`.
Zmiany w `AndroidManifest.xml` i `capacitor.config.ts` są gotowe — build APK
wymaga jednorazowego `npm run build && npx cap sync android` na maszynie z
kompletnym projektem Android.
