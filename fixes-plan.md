# Plan poprawek — review commita `4fe0454`

**Commit:** `fix(car-switcher): size the car dialog to its form and wire the native keyboard`
**Data review:** 2026-11-18
**Werdykt:** 🟡 Zatwierdzone z uwagami

Kod TypeScript jest poprawny (lint 0 błędów, `knip` czysty, 30/30 testów jednostkowych
i komponentowych zielonych). Commit zostawia jednak **czerwony e2e** oraz **martwą natywną
połówkę fixu** (plugin `@capacitor/keyboard` nie jest wpięty do builda Gradle).

---

## Tabela ustaleń

| #   | Priorytet    | Plik                                                                                                                     | Problem                                                                                                                                                                                                                                                                                                                                                      | Rekomendacja                                                                                                                                      |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 🔴 Blokujący | `android/capacitor.settings.gradle:1-3`, `android/app/capacitor.build.gradle:1-6`                                        | Brak `:capacitor-keyboard` w obu plikach Gradle. `Keyboard.java:19` czyta `resizeOnFullScreen` z configu, a listener insetów instaluje się w kodzie natywnym wtyczki — bez wpisu w Gradle `adjustResize` i `resizeOnFullScreen` **milcząco nic nie robią** na urządzeniu.                                                                                    | Dodać `assets/` / poprawić `webDir` i uruchomić `cap sync android`; potwierdzić wpisy `:capacitor-keyboard` w obu plikach Gradle.                 |
| 2   | 🔴 Blokujący | `apps/car-manager-e2e/src/car-switcher-sheet.spec.ts:66-86`                                                              | Test „exposes a higher breakpoint" czyta `modal.breakpoints` i `modal.initialBreakpoint`; po usunięciu tych bindingów z templatki dostaje `[]` i `0`, więc `expect(breakpoints.some((b) => b > 0)).toBe(true)` **failuje**. `setCurrentBreakpoint?.(1)` (l. 55-61) jest no-opem, a `// covers:` prowadzi do `docs/bugs/06` (dziś 🟡, wypartego przez 09/10). | Przepisać na nowy kontrakt (karta o wysokości treści, brak breakpointów) albo usunąć i przenieść pokrycie do `car-switcher-sheet-scroll.spec.ts`. |
| 3   | 🟠 Ważny     | `apps/car-manager/src/app/core/services/keyboard.service.spec.ts` (nagłówki `// covers: …#AC-1…AC-5`)                    | `docs/bugs/10-native-keyboard-integration.md` **nie ma sekcji kryteriów akceptacji** — cytowane AC nie istnieją. Traceability jest fikcyjne.                                                                                                                                                                                                                 | Dopisać sekcję `## Kryteria akceptacji` z AC-1…AC-5 albo poprawić odwołania w testach.                                                            |
| 4   | 🟠 Ważny     | `car-switcher.component.ts` — `modalDismissed()`, `editModalDismissed()`, `addCar()`, `saveEdit()`, `deleteEditingCar()` | `dismissKeyboard()` wołane **tylko** z Anuluj/Zamknij. Zamknięcie tapnięciem w backdrop, po zapisie lub po usunięciu nie chowa klawiatury — na natywce zostaje nad dashboardem.                                                                                                                                                                              | Wywołać `dismissKeyboard()` w `ionModalDidDismiss` (pokrywa wszystkie ścieżki zamknięcia).                                                        |
| 5   | 🟠 Ważny     | `car-switcher.component.spec.ts:253-276`                                                                                 | Test „submit inside scrollable content" sprawdza tylko brak `<ion-footer>` — nie weryfikuje własnej tezy. Test na `:278-291` mockuje pole przez `Object.defineProperty` i nosi tytuł „when the dialog is cancelled", choć Anuluj nigdy nie jest kliknięty.                                                                                                   | Dodać asercję `content.contains(submit)` i test klikający realnie Anuluj/Zamknij.                                                                 |
| 6   | 🟠 Ważny     | `car-switcher.component.scss:58-60`                                                                                      | Martwy selektor `&__delete-wrapper` (opakowanie `ion-note` usunięte w tym commicie). Reszta nazw wciąż „sheet" (`__sheet-actions`) przy `__card-modal`.                                                                                                                                                                                                      | Usunąć martwy blok, ujednolicić prefiksy BEM.                                                                                                     |
| 7   | 🟠 Ważny     | `keyboard.service.ts:25,52-59`                                                                                           | Sygnały `isKeyboardVisible` / `keyboardHeight` nie mają **żadnego konsumenta** w repo. Jednym `try/catch` opakowane są zarówno `addListener`, jak i preferencje iOS — nieudany listener przerywa też `setScroll` / `setAccessoryBarVisible`.                                                                                                                 | Oddzielne `try/catch`; usunąć sygnały albo udokumentować jako publiczny kontrakt.                                                                 |
| 8   | 🟡 Drobny    | `app.config.ts:58`                                                                                                       | `APP_INITIALIZER` jest przestarzały (warning ESLint) — commit pogłębia deprecated wzorzec.                                                                                                                                                                                                                                                                   | Migrować na `provideAppInitializer(() => inject(KeyboardService).init())`.                                                                        |
| 9   | 🟡 Drobny    | cały commit                                                                                                              | Commit miesza fix z `docs/bugs/07`, `08`, `docs/dev/*`, `scripts/dev-phone.mjs`, usunięciem rootowego `capacitor.config.ts`, `.gitattributes` oraz regeneracją `jscpd-report.html` (z maszynowymi ścieżkami `\\?\C:\Users\aboczula\…`).                                                                                                                      | Rozbić na `fix:` / `docs:` / `chore(dev):`; raport jscpd trzymać poza repo.                                                                       |
| 10  | 🟡 Drobny    | `car-switcher-sheet-scroll.spec.ts`                                                                                      | `waitForTimeout(600/1000)` zamiast `expect.poll`. Symulacja klawiatury przez `setViewportSize` nie dotyka `adjustResize` ani wtyczki — native ma zero pokrycia automatycznego. Brak `checkAccessibility()` (AGENTS.md wymaga dla nowych ekranów).                                                                                                            | `expect.poll` + `checkAccessibility(page)`; native jawnie jako manual QA.                                                                         |
| 11  | 🔵 Nitpik    | `car-switcher.component.scss`                                                                                            | Padding uwzględnia tylko `--ion-safe-area-bottom`; brak górnego insetu — **podejrzenie**, że na notchu karta wchodzi pod status bar. Niezweryfikowane (brak urządzenia).                                                                                                                                                                                     | Sprawdzić na notchu; ewentualnie `padding-top: var(--ion-safe-area-top, 0)`.                                                                      |

---

## Szczegóły

### #1 — Natywna klawiatura: plugin nie jest wpięty

`android/capacitor.settings.gradle` zawiera tylko `:capacitor-community-speech-recognition`
i `:codetrix-studio-capacitor-google-auth`. To samo w `android/app/capacitor.build.gradle`.
Katalog `android/app/src/main/assets/` nie istnieje, więc `npx cap sync android` zatrzymuje się
na `Could not find the web assets directory: .\www.`.

Skutek: kod wtyczki się nie kompiluje → `Keyboard.resizeOnFullScreen: true` i
`windowSoftInputMode="adjustResize"` nie mają efektu, bez żadnego błędu.

### #2 — Przestarzały e2e

Test nadal asertuje kontrakt bottom sheeta, którego już nie ma. `expect(breakpoints.some((b) => b >= 0.9)).toBe(true)`
nie może przejść przy karcie z `--height: auto`.

### #4 — Klawiatura zostaje nad dashboardem

Ścieżki zamknięcia bez `dismissKeyboard()`:

- tapnięcie w backdrop (`ionModalDidDismiss`),
- „Dodaj auto" zapis (`addCar()`),
- „Zapisz" w edycji (`saveEdit()`),
- „Usuń auto" (`deleteEditingCar()`).

---

## Co zostało zweryfikowane jako poprawne

- `--height: auto !important` jest **konieczne, nie leniwe**: `content.js → readSizeToContent()`
  czyta wyliczone `--height`, a `modal.md.css:78` deklaruje `--height: 100%`.
- `@Service()` — zgodne z Angular 22; `init()` idempotentne; web = no-op;
  `Capacitor.isPluginAvailable()` sprawdzany przed każdym wywołaniem.
- Listenery nieusuwane — dla singletona żyjącego całe życie aplikacji akceptowalne.
- `resizeOnFullScreen` dotyczy tylko Androida — kod to respektuje (iOS przez `setScroll` /
  `setAccessoryBarVisible`).

---

## Pokrycie testami

| Obszar                                    | Unit | Component                  | E2E             |
| ----------------------------------------- | ---- | -------------------------- | --------------- |
| `KeyboardService.init()` (web no-op)      | ✅   | —                          | —               |
| Wywołania natywne w serwisie              | ✅   | —                          | ❌              |
| `dismissKeyboard()` z Anuluj/Zamknij      | —    | ✅                         | —               |
| `dismissKeyboard()` z pozostałych ścieżek | —    | ❌                         | ❌              |
| Układ karty                               | —    | ⚠️ częściowo tautologiczny | ✅              |
| Stary kontrakt breakpointów               | —    | —                          | 🔴 czerwony     |
| Dostępność dialogu                        | —    | —                          | ❌              |
| Klawiatura natywna                        | —    | —                          | ❌ tylko manual |

---

## Zgodność z AGENTS.md

| Reguła                                         | Status | Uwaga                                          |
| ---------------------------------------------- | ------ | ---------------------------------------------- |
| Standalone, `@Service()`, `input()`/`output()` | ✅     | Zgodne                                         |
| Inline template + `styleUrl`, polski UI        | ✅     | Zgodne                                         |
| `zone.run` wokół emitów                        | ✅     | `carSelected.emit` opakowane                   |
| `npm run quality` zielone                      | ✅     | `knip`, `duplication`, lint, format czyste     |
| Traceability `// spec:` / `// covers:`         | ⚠️     | Nieistniejące AC, sprzeczne statusy w 06/07/09 |
| Testy tworzone razem z kodem                   | ⚠️     | E2E niepełne, natywka bez pokrycia             |
| Komentarze po angielsku                        | ⚠️     | Polskie komentarze w `app.config.ts`           |
| `checkAccessibility()` dla nowych ekranów      | ❌     | Brak dla nowego dialogu                        |
| Conventional Commits, jeden temat na commit    | ⚠️     | Format poprawny, zakres za szeroki             |

---

## Kolejność prac

1. Naprawić `car-switcher-sheet.spec.ts` (#2) — jedyna rzecz zostawiająca czerwony test.
2. Wpiąć `@capacitor/keyboard` w build Androida (#1) + manual QA na urządzeniu.
3. Domknąć `dismissKeyboard()` w `ionModalDidDismiss` (#4) + test klikający Anuluj (#5).
4. Dopisać AC w `docs/bugs/10-native-keyboard-integration.md` i naprawić statusy (#3).
5. Porządki: martwy CSS (#6), sygnały i `try/catch` w serwisie (#7), `checkAccessibility` (#10).
6. Opcjonalnie `provideAppInitializer` (#8).
7. Rozbicie commita na mniejsze tematy (#9) — po 1-6.
