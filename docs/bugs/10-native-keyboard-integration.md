# Bug: [10] — Arkusz „Dodaj auto” zasłonięty klawiaturą, martwa przestrzeń pod przyciskiem

**Status:** 🟡 Częściowo naprawiony — web/PWA i layout zweryfikowane, build Androida
z wpiętym `@capacitor/keyboard` czeka na manual QA na urządzeniu (patrz
[Otwarte kwestie](#otwarte-kwestie))
**Data zgłoszenia:** 2026-11-18
**Data naprawy:** 2026-11-18
**Priorytet:** P1 (wysoki) — blokuje dodanie auta na telefonie
**Typ:** Błąd UX/layoutu (Ionic sheet modal, klawiatura natywna Capacitor)
**Powiązane:** [bug 06](./06-sheet-modal-offscreen-submit.md), [bug 09](./09-car-switcher-sheet-scroll-focus.md) — poprzednie, niepełne poprawki

---

## Kryteria akceptacji

AC są cytowane z testów przez `// covers:
docs/bugs/10-native-keyboard-integration.md#AC-N`. Każdy test plikowy wskazany
niżej istnieje i przechodzi.

| AC   | Kryterium                                                                                                                                                                                                                                                            | Pokrycie                                                                                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | `KeyboardService` śledzi stan klawiatury natywnej: sygnały `isKeyboardVisible` / `keyboardHeight` zmieniają się na `keyboardDidShow` / `keyboardDidHide` (na starcie `false` / `0`).                                                                                 | Unit: `keyboard.service.spec.ts` — „closed before any native event”, „expose visibility and height”                                                                                                                                            |
| AC-2 | Listenery `keyboardDidShow` / `keyboardDidHide` są rejestrowane dokładnie raz, także przy wielokrotnym `init()`.                                                                                                                                                     | Unit: `keyboard.service.spec.ts` — „register the native listeners only once”                                                                                                                                                                   |
| AC-3 | Na iOS wyłączony jest pasek akcesoriów (`setAccessoryBarVisible({ isVisible: false })`) i przewijanie WebView (`setScroll({ isDisabled: true })`); na Androidzie te wywołania nie następują.                                                                         | Unit: `keyboard.service.spec.ts` — „hide the iOS accessory bar…”, „not call iOS-only APIs on Android”                                                                                                                                          |
| AC-4 | Brak pluginu klawiatury (web/PWA) albo brak implementacji natywnej degraduje się do no-op — `init()` i `hide()` nigdy nie rzucają, aplikacja działa.                                                                                                                 | Unit: `keyboard.service.spec.ts` — „degrade to a no-op…”, „swallow native errors…”                                                                                                                                                             |
| AC-5 | `KeyboardService.hide()` chowa klawiaturę natywną i nie robi nic, gdy plugin jest niedostępny.                                                                                                                                                                       | Unit: `keyboard.service.spec.ts` — „dismiss the native keyboard”                                                                                                                                                                               |
| AC-6 | Oba dialogi auta („Dodaj nowe auto”, „Edytuj auto”) są kartą o wysokości treści: brak `breakpoints` / `initialBreakpoint` / `expandToScroll`, klasa `car-switcher__card-modal`, przycisk akcji w `ion-content` (brak `ion-footer`).                                  | Component: `car-switcher.component.spec.ts` — „self-sizing card modals, not sheets”, „submit button inside the scrollable content”; E2E: `car-switcher-sheet.spec.ts` — „no longer relies on breakpoints”, `car-switcher-sheet-scroll.spec.ts` |
| AC-7 | Na telefonie (`390 × 664`) karta mieści się w ekranie bez scrolla, przycisk akcji jest w pełni widoczny od otwarcia, a przy ściśniętym viewportcie (`390 × 360`, symulacja klawiatury) karta nie wychodzi poza ekran i akcja pozostaje osiągalna przez przewinięcie. | E2E: `car-switcher-sheet-scroll.spec.ts` — trzy testy układu                                                                                                                                                                                   |
| AC-8 | Klawiatura nie zostaje nad dashboardem po zamknięciu dialogu — **każdą** ścieżką (Anuluj, Zamknij, tapnięcie w backdrop, zapis, usunięcie).                                                                                                                          | Component: `car-switcher.component.spec.ts` — „covers every close path”; Native: manual QA na urządzeniu                                                                                                                                       |
| AC-9 | Oba dialogi mają dostępną nazwę (`aria-label` na `ion-modal`), więc wewnętrzny `role="dialog"` nie łamie reguły `aria-dialog-name`.                                                                                                                                  | Component: `car-switcher.component.spec.ts` — „accessible name”; E2E: `car-switcher-sheet-scroll.spec.ts` — axe `@a11y`                                                                                                                        |

**Uwaga:** AC-1…AC-5 weryfikują logikę serwisu na zmockowanym pluginie — nie
dowodzą, że plugin działa na urządzeniu. Dowód natywny to AC-8 (manual QA) oraz
wpis `:capacitor-keyboard` w plikach Gradle (patrz [Otwarte kwestie](#otwarte-kwestie)).

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
   Górnego insetu nie ma świadomie: karta jest odsunięta o `16px` od krawędzi
   (`--max-height: calc(100% - 32px)`), więc nigdy nie wchodzi pod notcha, a
   `--ion-safe-area-top` dodałoby tylko martwą przestrzeń nad tytułem.
4. Usunięte `expandSheetForTyping()` i `(ionFocus)` — przy wysokości treści
   rozwijanie arkusza nie ma już czego robić. Zamiast tego
   `dismissKeyboard()` w `ionModalDidDismiss` (a nie w handlerach przycisków),
   czyli na **każdej** ścieżce zamknięcia: Anuluj, Zamknij, tapnięcie w backdrop,
   zapis i usunięcie.

### Klawiatura natywna

5. **`KeyboardService`** (`core/services/keyboard.service.ts`, nowy):
   - sygnały `isKeyboardVisible` / `keyboardHeight` z `keyboardDidShow` / `keyboardDidHide`,
   - na iOS: `setAccessoryBarVisible({ isVisible: false })` (pasek `^ v Done`
     zasłaniał ostatnie pole) oraz `setScroll({ isDisabled: true })` (WebView nie
     ucieka pod pasek górny),
   - `hide()` do chowania klawiatury z UI,
   - pełny graceful degradation: brak pluginu (web/PWA) → no-op, brak metod
     w implementacji natywnej → błędy połknięte.
   - Sygnały to **publiczny kontrakt** serwisu (na razie bez konsumenta w UI —
     layout dopasowuje się sam przez `adjustResize`). Każde wywołanie natywne ma
     **własny** `try/catch`, więc nieudana rejestracja listenera nie wyłącza
     preferencji iOS.
6. Inicjalizacja przez `provideAppInitializer()` (a nie przestarzały
   `APP_INITIALIZER`) po storage i migracji — nie blokuje startu, bo wszystkie
   wywołania natywne są opakowane w `try/catch`.
7. `apps/car-manager/capacitor.config.ts` → `plugins.Keyboard.resizeOnFullScreen: true`.
8. `android/app/src/main/AndroidManifest.xml` → `android:windowSoftInputMode="adjustResize"`
   na `MainActivity`, żeby WebView faktycznie się kurczył.
9. `android/capacitor.settings.gradle` + `android/app/capacitor.build.gradle` →
   `:capacitor-keyboard` (bez tego kod wtyczki się nie kompiluje i cała natywna
   połowa fixu milczy — patrz [Otwarte kwestie](#otwarte-kwestie)).

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
| `apps/car-manager/src/app/core/services/keyboard.service.ts`                          | nowy serwis klawiatury natywnej (sygnały + `init()` + `hide()`, osobny `try/catch` per wywołanie)      |
| `apps/car-manager/src/app/app.config.ts`                                              | `KeyboardService` przez `provideAppInitializer()` (po storage i migracji)                              |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts`   | sheet → karta o wysokości treści; usunięte breakpointy i `expandSheetForTyping()`; `dismissKeyboard()` |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.scss` | `__card-modal` (`--height: auto`, `--max-height`), `__modal-content`                                   |
| `apps/car-manager/capacitor.config.ts`                                                | `plugins.Keyboard.resizeOnFullScreen: true`                                                            |
| `android/app/src/main/AndroidManifest.xml`                                            | `android:windowSoftInputMode="adjustResize"`                                                           |
| `android/capacitor.settings.gradle`                                                   | `include ':capacitor-keyboard'` (wpis ręczny, format CLI)                                              |
| `android/app/capacitor.build.gradle`                                                  | `implementation project(':capacitor-keyboard')`                                                        |
| `scripts/capacitor-gradle-sync.mjs`                                                   | odtwarza wpisy Gradle z manifestów wtyczek (obejście `cap sync`, patrz niżej)                          |
| `package.json`                                                                        | `@capacitor/keyboard@^8.0.6`                                                                           |

**Testy regresyjne:**

| Warstwa   | Plik                                                                                     | Zakres                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit      | `apps/car-manager/src/app/core/services/keyboard.service.spec.ts`                        | stan początkowy, zdarzenia show/hide, jednorazowa rejestracja, iOS-only API, brak pluginu, `hide()`, połknięte błędy, izolacja `try/catch` |
| Component | `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.spec.ts` | oba dialogi jako karty (brak breakpointów), przycisk akcji w `ion-content`, `dismissKeyboard()` na każdej ścieżce zamknięcia               |
| E2E       | `apps/car-manager-e2e/src/car-switcher-sheet.spec.ts`                                    | brak breakpointów / `initialBreakpoint` / `expandToScroll`, karta o wysokości treści                                                       |
| E2E       | `apps/car-manager-e2e/src/car-switcher-sheet-scroll.spec.ts`                             | karta niższa od ekranu i bez scrolla, przycisk widoczny od razu, karta mieści się w ekranie przy klawiaturze, axe (`@a11y`)                |
| Manual    | urządzenie z Androidem                                                                   | AC-8: klawiatura schodzi razem z dialogiem (czeka na naprawę builda — bug 11)                                                              |

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
- Po dodaniu pluginu Capacitora sprawdź wpisy `:capacitor-<plugin>` w **obu**
  generowanych plikach Gradle (`android/capacitor.settings.gradle` i
  `android/app/capacitor.build.gradle`). Brak wpisu nie daje żadnego błędu
  kompilacji — natywna połowa pluginu po prostu nie istnieje.
- `android/` leży w **roocie** repo, a `capacitor.config.ts` w `apps/car-manager/`.
  Nie zakładaj, że `npx cap sync android` to naprawi — patrz niżej.

### Ograniczenie: `npx cap sync android` w tym repo

**Objaw.** Z roota `npx cap sync android` kończy się na
`Could not find the web assets directory: .\www.` — CLI nie widzi
`apps/car-manager/capacitor.config.ts` i spada do domyślnego `webDir: 'www'`.
Z `apps/car-manager/` kończy się na
`android platform has not been added yet` — bo tam nie ma katalogu `android/`
(platforma jest w roocie, `android/`).

**Root cause.** CLI 8.6 rozwiązuje ścieżki od `process.cwd()` **i** uruchamia
config przez loader, który podmienia katalog konfiguracji na cwd. Nie da się
więc wskazać pary „config z `apps/`, platforma z roota”.

**Skutek.** `npm run build:android` / `deploy:android` są zepsute od momentu
przeniesienia `android/` do roota — to dług osobny ([bug 11](./11-broken-android-build.md)).

**Obejście zastosowane tutaj.** Wpisy Gradle dodano ręcznie, w formacie
generowanym przez CLI (ta sama ścieżka `../node_modules/@capacitor/keyboard/android`,
ta sama kolejność):

- `android/capacitor.settings.gradle` → `include ':capacitor-keyboard'` + `projectDir`,
- `android/app/capacitor.build.gradle` → `implementation project(':capacitor-keyboard')`.

Ręczne wpisy zostaną nadpisane przy najbliższym udanym `cap update android`, więc
po naprawie workflow (bug 11) wystarczy je zweryfikować, nie odtwarzać.

**Skrypt pomocniczy.** `scripts/capacitor-gradle-sync.mjs` odtwarza oba pliki z
manifestów wtyczek dokładnie tak, jak robi to CLI (`installGradlePlugins`).
Uruchamiany jest z katalogu aplikacji po tymczasowym `android/` z podkatalogiem
`app/` — w tym repo zweryfikowany, daje identyczny wynik jak wpisy ręczne.
Nie jest podpięty do `npm run quality` (tworzy pliki w katalogu roboczym).

### Czego nadal brakuje: manual QA na urządzeniu

Zmiany w `AndroidManifest.xml` (`adjustResize`), `capacitor.config.ts`
(`resizeOnFullScreen`) i wpisy Gradle są gotowe, ale **nie zostały zweryfikowane
na urządzeniu** — w repo nie ma działającego builda Androida (bug 11). Do
odhaczenia po jego naprawie:

1. `npm run build:android` i instalacja na telefonie z notchem,
2. otwarcie „Dodaj auto” → tapnięcie w pole → karta nad klawiaturą, pola widoczne,
3. zamknięcie (Anuluj / backdrop / zapis) → klawiatura schodzi razem z dialogiem.
