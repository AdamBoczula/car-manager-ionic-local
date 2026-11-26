# Spec: Skanowanie paragonu za tankowanie (OCR) i ujednolicenie `isPremium`

## Metadata

- **Author:** Adam / AI Analyst & Architect
- **Date:** 2026-11-25
- **Status:** implemented
- **Domain:** refuel

## Cel biznesowy

Użytkownik może zrobić telefonem zdjęcie paragonu za tankowanie, a lokalny silnik OCR (Google ML Kit) odczyta kwotę paliwa, ilość litrów, datę oraz flagę paliwa premium i otworzy wstępnie wypełniony formularz tankowania do podglądu, ewentualnej korekty i wpisania przebiegu; jednocześnie pole `isVerva` zostaje ujednolicone na `isPremium`.

## Zakres (Scope)

### W scope

- Skanowanie paragonu aparatem lub z galerii zdjęć (`ActionSheetController` → „Zrób zdjęcie” / „Wybierz z galerii”) z poziomu `RefuelFormPage` oraz szybka akcja z `DashboardPage` (przycisk / FAB → wybór źródła → OCR → nawigacja do `/refuel-form` zgodnie z `docs/conventions/navigation.md` przez `NgZone` + `NavController.navigateForward`).
- Natywny OCR na urządzeniu za pomocą `@capacitor/camera` (z jawnym sprawdzeniem/żądaniem uprawnienia `camera` oraz normalizacją ścieżki `file://` dla Androida) oraz `@capacitor-mlkit/text-recognition` (z rekonstrukcją układu dwukolumnowego z `TextBlock[]`).
- Czysta funkcja parsująca `parsePolishFuelReceipt(rawText: string): ReceiptScanResult` rozpoznająca:
  - `amount`: kwotę pozycji paliwowej (na paragonie mieszanym preferowana jest kwota linii paliwa zamiast `SUMA PLN`, z fallbackiem do `SUMA PLN`),
  - `liters`: ilość litrów (formaty z przecinkiem i kropką, w tym 2–3 miejsca po przecinku, np. `42,150 x 6,29`, `42.15 L`),
  - `date`: datę znormalizowaną do ISO `YYYY-MM-DD` (z `YYYY-MM-DD`, `DD-MM-YYYY`, `DD.MM.YYYY`, `DD/MM/YYYY`),
  - `isPremium`: wykrywanie paliw premium (`VERVA`, `V-POWER`, `VPOWER`, `ULTIMATE`, `MILESPLUS`, `MILES PLUS`, `DYNAMIC`, `SUPREMA`, `ECTO`, `PB98`, `98`, z wykluczeniem paliw standardowych takich jak `EFECTA`, `PB95`, `ON`).
- Współdzielony serwis `RefuelDraftService` (sygnał z jednorazowo konsumowanym draftem — gotowy również pod przyszłe integracje typu WebMCP).
- Abstrakcja `ReceiptOcrService` oddzielająca wtyczki natywne od komponentów (proste mockowanie w testach i łatwa podmiana silnika w przyszłości).
- Czysty rename `isVerva` → `isPremium` w modelu, serwisach, komponentach, testach i powiązanej dokumentacji (bez migracji wstecznej — aplikacja testowa bez danych produkcyjnych). Polskie etykiety UI: przełącznik „Paliwo premium?”, odznaka „Premium”.
- Zdjęcie paragonu nie jest zapisywane ani archiwizowane po zakończeniu OCR.
- Na platformie web/PWA (gdy `Capacitor.isNativePlatform()` zwraca `false`), akcja skanowania jest ukryta / niedostępna bez błędów w konsoli.

### Out of scope

- Skanowanie paragonów za naprawy (`repair-form`).
- Zapisywanie lub archiwizacja zdjęć paragonów (lokalnie lub w Firebase Storage).
- Chmurowy OCR / LLM (Gemini Flash / Firebase AI Logic).
- Implementacja narzędzi WebMCP (`document.modelContext` — ujęte w roadmapie `PLAN.md` na późniejszy etap).
- Migracja wsteczna zapisanych danych z `isVerva` na `isPremium` w Ionic Storage lub Firestore.

## Use Cases (UC)

### UC-1: Skanowanie paragonu z poziomu Dashboardu

- **Aktor:** Użytkownik (na telefonie)
- **Precondition:** Użytkownik jest zalogowany, ma aktywne auto i znajduje się na `DashboardPage`.
- **Main flow:**
  1. Użytkownik klika akcję „Skanuj paragon” na `DashboardPage` (sekcja akcji lub FAB).
  2. System uruchamia natywny aparat (`@capacitor/camera`), a po wykonaniu zdjęcia przekazuje plik do `@capacitor-mlkit/text-recognition`.
  3. System parsuje rozpoznany tekst przez `parsePolishFuelReceipt`, zapisuje wynik w `RefuelDraftService` i nawiguje do `/refuel-form` (`zone.run(() => navController.navigateForward('/refuel-form'))`).
  4. `RefuelFormPage` konsumuje draft (jednorazowo), wypełnia rozpoznane pola (`date`, `amountRaw`, `litersRaw`, `isPremium`), wyświetla toast podsumowujący odczyt i zostawia puste pole przebiegu (`mileage`) do wpisania przez użytkownika.
  5. Użytkownik weryfikuje dane, wpisuje przebieg i klika „Zapisz tankowanie”.
- **Postcondition:** Tankowanie zostaje zapisane z flagą `isPremium` w Ionic Storage i zsynchronizowane z Firestore, a draft w `RefuelDraftService` jest wyczyszczony.

### UC-2: Skanowanie paragonu bezpośrednio w formularzu tankowania

- **Aktor:** Użytkownik (na telefonie)
- **Precondition:** Użytkownik otworzył `RefuelFormPage` (np. wpisał już przebieg samochodu).
- **Main flow:**
  1. Użytkownik klika przycisk „Skanuj paragon” w `RefuelFormPage`.
  2. System wykonuje zdjęcie, uruchamia ML Kit OCR i parsuje tekst paragonu.
  3. System nadpisuje wyłącznie pola rozpoznane na paragonie (`date`, `amountRaw`, `litersRaw`, `isPremium`), zachowując wpisany wcześniej przebieg (`mileage`) oraz ewentualny stan `isSkipped` / `skippedReason`.
  4. System wyświetla toast z informacją o odczytanych danych.
- **Postcondition:** Formularz zawiera połączone dane z paragonu i wcześniejszy przebieg; zdjęcie jest usuwane z pamięci tymczasowej.

### UC-3: Częściowy odczyt lub nieczytelny paragon

- **Aktor:** Użytkownik (na telefonie)
- **Precondition:** Użytkownik uruchomił skanowanie paragonu na `DashboardPage` lub `RefuelFormPage`.
- **Main flow:**
  1. Użytkownik robi zdjęcie słabo oświetlonego lub pogniecionego paragonu.
  2. ML Kit i parser odczytują tylko część danych (np. kwotę bez litrów) lub nie rozpoznają żadnego z pól.
  3. Jeśli rozpoznano choć jedno pole, system otwiera/wypełnia `RefuelFormPage` tymi polami i pokazuje toast informujący o częściowym odczycie. Jeśli nie rozpoznano nic, wyświetla toast z prośbą o ręczne wpisanie danych i nie nadpisuje formularza.
- **Postcondition:** Użytkownik może ręcznie uzupełnić brakujące pola i zapisać tankowanie bez blokowania przepływu.

### UC-4: Ręczne i automatyczne oznaczanie paliwa premium (`isPremium`)

- **Aktor:** Użytkownik
- **Precondition:** Użytkownik przegląda formularz tankowania, listę tankowań lub dashboard.
- **Main flow:**
  1. W `RefuelFormPage` przełącznik ma etykietę „Paliwo premium?” i steruje polem `isPremium`.
  2. Parser OCR ustawia `isPremium = true`, gdy wykryje na paragonie nazwę paliwa premium (np. `VERVA`, `V-POWER`, `ULTIMATE`, `PB98`).
  3. Po zapisie na `DashboardPage` i `RefuelListPage` przy takim wpisie wyświetlana jest odznaka „Premium”.
- **Postcondition:** Pole `isPremium` jest spójnie używane w całym modelu, UI i testach zamiast `isVerva`.

## Edge Cases

- **Edge Case 1: Użytkownik anuluje robienie zdjęcia w aparacie**
  - **Oczekiwane zachowanie:** System nie wyświetla błędu ani toastu o awarii; pozostaje na bieżącym ekranie bez zmiany stanu formularza.

- **Edge Case 2: Brak uprawnień do aparatu**
  - **Oczekiwane zachowanie:** System wyświetla czytelny komunikat w `ion-toast` (kolor `danger`) z informacją o braku dostępu do aparatu i umożliwia ręczne wypełnienie formularza.

- **Edge Case 3: Paragon mieszany (paliwo + zakupy pozapaliwowe, np. kawa/hot-dog)**
  - **Oczekiwane zachowanie:** `parsePolishFuelReceipt` wybiera kwotę przypisaną do pozycji paliwowej, a nie `SUMA PLN` całego paragonu; użytkownik i tak weryfikuje kwotę na ekranie podglądu.

- **Edge Case 4: Różne formaty liczb i dat na polskich paragonach**
  - **Oczekiwane zachowanie:** Parser obsługuje przecinek i kropkę jako separator dziesiętny, formatuje `amount` i `liters` do 2 miejsc po przecinku (half-up) w formacie formularza oraz konwertuje daty `DD.MM.YYYY`, `DD-MM-YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` na ISO `YYYY-MM-DD`.

- **Edge Case 5: Brak przebiegu na paragonie**
  - **Oczekiwane zachowanie:** Parser nigdy nie zgaduje przebiegu z przypadkowych liczb (NIP, nr kasy, godzina); jeśli użytkownik wpisał wcześniej przebieg w `RefuelFormPage`, wartość zostaje zachowana.

- **Edge Case 6: Uruchomienie aplikacji w przeglądarce (PWA / desktop / testy E2E)**
  - **Oczekiwane zachowanie:** Gdy `Capacitor.isNativePlatform()` jest `false`, przyciski skanowania są ukryte (albo obsłużone bezpiecznie przez `ReceiptOcrService`), a nawigacja i formularz działają bez wyjątków.

- **Edge Case 7: Nawigacja Ionic z `DashboardPage` do `RefuelFormPage`**
  - **Oczekiwane zachowanie:** Przejście używa `this.zone.run(() => this.navController.navigateForward('/refuel-form'))` zgodnie z `docs/conventions/navigation.md`; `DashboardPage` nie wywołuje `stopListening()` w `ngOnDestroy`.

## Acceptance Criteria (AC)

### AC-1: Ujednolicenie `isVerva` → `isPremium`

- **Given:** Model `Refuel`, formularz `RefuelFormPage`, lista `RefuelListPage`, dashboard `DashboardPage` oraz testy istniejące w repozytorium.
- **When:** Zmiana nazewnictwa zostanie wdrożona w całym projekcie.
- **Then:** Interfejs `Refuel` używa pola `isPremium: boolean` (brak `isVerva` w kodzie i testach), formularz wyświetla przełącznik „Paliwo premium?”, a lista oraz dashboard wyświetlają odznakę „Premium”.

### AC-2: Parser typowych polskich paragonów paliwowych

- **Given:** Surowy tekst OCR typowego polskiego paragonu (np. Orlen, Shell, BP, Circle K, Moya) zawierający datę, ilość litrów, cenę za litr, wartość paliwa oraz nazwę paliwa.
- **When:** Wywołana zostanie funkcja `parsePolishFuelReceipt(rawText)`.
- **Then:** Zwraca poprawne `amount`, `liters`, `date` (w formacie `YYYY-MM-DD`) oraz `isPremium: true` dla paliw premium (np. `VERVA`, `V-POWER`, `ULTIMATE`, `MILESPLUS`, `PB98`) i `isPremium: false` dla paliw standardowych (np. `EFECTA`, `PB95`, `ON`).

### AC-3: Parser paragonu mieszanego (paliwo + inne produkty)

- **Given:** Tekst paragonu zawierający linię paliwa (np. `ON EFECTA 40,00 x 6,25 250,00`) oraz inne pozycje (np. `KAWA 12,99`, `SUMA PLN 262,99`).
- **When:** Wywołana zostanie funkcja `parsePolishFuelReceipt(rawText)`.
- **Then:** `amount` przyjmuje kwotę samej pozycji paliwowej (`250`), a nie sumę całego paragonu (`262.99`).

### AC-4: Skanowanie paragonu z poziomu `RefuelFormPage`

- **Given:** Użytkownik jest na `RefuelFormPage` i wpisał przebieg `125400`.
- **When:** Kliknie „Skanuj paragon”, a `ReceiptOcrService` zwróci rozpoznane dane (`date`, `amount`, `liters`, `isPremium`).
- **Then:** Pola formularza (`date`, `amountRaw`, `litersRaw`, `isPremium`) zostają uzupełnione wynikami OCR, przebieg `125400` pozostaje nienaruszony, a użytkownik widzi toast potwierdzający odczyt.

### AC-5: Skanowanie paragonu z poziomu `DashboardPage` i jednorazowy draft

- **Given:** Użytkownik jest na `DashboardPage` na platformie natywnej.
- **When:** Wybierze akcję „Skanuj paragon” i `ReceiptOcrService` zwróci rozpoznane dane.
- **Then:** `RefuelDraftService` zapisuje draft, aplikacja przechodzi do `/refuel-form` przez `zone.run(() => navController.navigateForward('/refuel-form'))`, `RefuelFormPage` wypełnia pola z draftu i czyści draft, aby ponowne otwarcie formularza nie powielało starych danych.

### AC-6: Anulowanie aparatu przez użytkownika

- **Given:** Użytkownik uruchomił skanowanie paragonu na `DashboardPage` lub `RefuelFormPage`.
- **When:** Zamknie aparat bez zrobienia zdjęcia (anulowanie).
- **Then:** Nie pojawia się toast z błędem, nie następuje nawigacja (z `DashboardPage`), a istniejące wartości w formularzu nie ulegają zmianie.

### AC-7: Błąd OCR lub brak rozpoznanych pól

- **Given:** Użytkownik wykonał zdjęcie, z którego nie udało się wyciągnąć żadnego pola lub wystąpił błąd aparatu/OCR.
- **When:** `ReceiptOcrService` zakończy działanie z pustym wynikiem lub błędem uprawnień/sprzętu.
- **Then:** System wyświetla czytelny komunikat w `ion-toast` i pozwala normalnie wypełnić formularz ręcznie.

### AC-8: Dostępność (a11y) i bezpieczne zachowanie na webie

- **Given:** Renderowane widoki `DashboardPage` i `RefuelFormPage` po zmianach (zarówno w trybie web, jak i z zamockowanym trybem natywnym).
- **When:** Uruchamiane są testy Playwright z `checkAccessibility()` oraz renderowanie w przeglądarce.
- **Then:** Brak naruszeń WCAG wykrytych przez `axe-core`, nowe elementy mają poprawne `aria-label`, a w trybie web nie pojawiają się błędy związane z brakiem natywnego ML Kit.

## Model danych

```typescript
// apps/car-manager/src/app/core/models/refuel.model.ts
import type { Timestamp } from 'firebase/firestore';

export interface Refuel {
  id: string;
  carId: string;
  date: string; // ISO 8601
  amount: number; // zapłacona kwota (PLN)
  mileage: number; // przebieg (km)
  liters?: number; // opcjonalnie – ilość litrów
  isPremium: boolean; // czy tankowano paliwo premium (zmiana z isVerva)
  isSkipped: boolean; // pominięty wpis
  skippedReason?: string; // powód pominięcia
  consumption?: number; // l/100km – wyliczane automatycznie po zapisie
  createdBy: string; // uid użytkownika
  createdAt: Timestamp;
}

export interface RefuelDraft {
  date?: string; // YYYY-MM-DD
  amount?: number;
  liters?: number;
  isPremium?: boolean;
}

export interface ReceiptScanResult {
  draft: RefuelDraft;
  rawText: string;
  matchedFields: Array<keyof RefuelDraft>;
}
```

- **Walidacja:** Bez zmian wobec `RefuelFormPage` — `date` wymagana, `amount > 0`, `mileage > 0`, `liters` opcjonalne (`>= 0`), `skippedReason` wymagane gdy `isSkipped === true`. Wartości liczbowe z OCR przed wpisaniem do inputów są formatowane przez istniejący `formatDecimalInput(..., 2)`.

## UI / UX

### Stany komponentu

| Stan     | Opis                                 | Zachowanie                                                                    |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Idle     | Gotowość do skanowania (native)      | Widoczny przycisk „Skanuj paragon” (`<ion-button>` / `<ion-fab-button>`)      |
| Scanning | Trwa obsługa aparatu / ML Kit OCR    | Przycisk zablokowany + `<ion-spinner>` / wskaźnik przetwarzania               |
| Success  | Odczytano co najmniej kwotę/litry    | Wypełnione pola formularza + `<ion-toast color="success">`                    |
| Partial  | Odczytano część pól (np. tylko datę) | Wypełnione rozpoznane pola + `<ion-toast>` z informacją o braku części danych |
| Error    | Błąd uprawnień / OCR / pusty odczyt  | `<ion-toast color="danger">` lub `warning`, formularz gotowy do wpisu         |

### Interakcje

- Projekt wyłącznie w komponentach Ionic (`<ion-button>`, `<ion-icon>`, `<ion-spinner>`, `<ion-toast>`, `<ion-fab-button>`), układ mobile-first (`max-width: 430px`).
- W `RefuelFormPage`: przycisk skanowania umieszczony nad listą pól lub w widocznej karcie akcji, z wyraźnym `aria-label="Skanuj paragon za tankowanie"`.
- W `DashboardPage`: dodatkowy przycisk w FAB-ie (lub wierszu szybkich akcji) widoczny na platformie natywnej, uruchamiający ten sam przepływ skanowania.

## Offline behavior

- **Tryb offline:** Skanowanie paragonu przez `@capacitor-mlkit/text-recognition` odbywa się w 100% lokalnie na urządzeniu (bez połączenia z internetem). Zapis tankowania trafia najpierw do Ionic Storage i kolejki synchronizacji.
- **Powrót online:** Zapisane tankowanie (wraz z polem `isPremium`) synchronizuje się z Firestore standardowym mechanizmem `RefuelService` / `SyncService`.

## Architektura

### Dotknięte moduły

| Moduł              | Plik                                                    | Zmiana                                                                              |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/car-manager` | `src/app/core/models/refuel.model.ts`                   | Rename `isVerva` → `isPremium`, dodanie typów OCR/Draft                             |
| `apps/car-manager` | `src/app/core/utils/receipt-parser.util.ts`             | Nowy czysty parser polskich paragonów paliwowych                                    |
| `apps/car-manager` | `src/app/core/services/refuel-draft.service.ts`         | Nowy serwis przechowujący jednorazowy draft tankowania                              |
| `apps/car-manager` | `src/app/core/services/receipt-ocr.service.ts`          | Nowy serwis integrujący `@capacitor/camera` i ML Kit OCR                            |
| `apps/car-manager` | `src/app/pages/refuel-form/refuel-form.page.ts`         | Rename UI na `isPremium`, konsumpcja draftu, przycisk skanu                         |
| `apps/car-manager` | `src/app/pages/refuel-list/refuel-list.page.ts`         | Rename `isVerva` → `isPremium`, etykieta „Premium”                                  |
| `apps/car-manager` | `src/app/pages/dashboard/dashboard.page.ts`             | Rename `isVerva` → `isPremium`, akcja „Skanuj paragon”                              |
| `apps/car-manager` | `src/app/**/*.spec.ts`, `apps/car-manager-e2e/src/*.ts` | Aktualizacja testów pod `isPremium` + nowe testy OCR/parsera                        |
| Workspace / Native | `package.json`, `android/`, `ios/`                      | Instalacja `@capacitor/camera`, `@capacitor-mlkit/text-recognition`, `npx cap sync` |

### Flow danych

```
[DashboardPage / RefuelFormPage]
        │ (klik: "Skanuj paragon")
        ▼
[ReceiptOcrService] ──► [@capacitor/camera] ──► [@capacitor-mlkit/text-recognition]
        │                                                       │
        │◄───────────── rawText ◄───────────────────────────────┘
        ▼
[parsePolishFuelReceipt(rawText)]
        │
        ▼ (ReceiptScanResult)
[RefuelDraftService] ──► [NavController.navigateForward('/refuel-form')]
                                │
                                ▼
                        [RefuelFormPage] ──(użytkownik dopisuje przebieg)──► [RefuelService]
```

### Task Board

| #   | Task                                                                                | Status  | Assignee | Notes                                        |
| --- | ----------------------------------------------------------------------------------- | ------- | -------- | -------------------------------------------- |
| 1   | Zainstalować `@capacitor/camera` i `@capacitor-mlkit/text-recognition` + `cap sync` | ✅ Done | Dev      | Uprawnienia `CAMERA` w `AndroidManifest.xml` |
| 2   | Wykonać czysty rename `isVerva` → `isPremium` w modelu, UI i testach                | ✅ Done | Dev      | Etykiety: „Paliwo premium?” i „Premium”      |
| 3   | Zaimplementować `receipt-parser.util.ts` wraz z testami jednostkowymi               | ✅ Done | Dev      | Polskie stacje, paragony mieszane, formaty   |
| 4   | Zaimplementować `RefuelDraftService` i `ReceiptOcrService` + testy                  | ✅ Done | Dev      | Mockowanie Capacitor Camera i ML Kit         |
| 5   | Zintegrować skanowanie i pre-fill w `RefuelFormPage` i `DashboardPage`              | ✅ Done | Dev      | Reguły nawigacji z `navigation.md`           |
| 6   | Dodać testy komponentowe, E2E i a11y (`checkAccessibility()`)                       | ✅ Done | QA       | Pokrycie AC-1 do AC-8                        |
| 7   | Uruchomić `npm run quality` i `nx affected -t lint test build e2e`                  | ✅ Done | QA       | Zweryfikowane w bramie jakości               |

## Implemented in

| Plik                                                                  | Data       | AC pokryte                         |
| --------------------------------------------------------------------- | ---------- | ---------------------------------- |
| `apps/car-manager/src/app/core/models/refuel.model.ts`                | 2026-11-25 | AC-1, AC-2                         |
| `apps/car-manager/src/app/core/utils/receipt-parser.util.ts`          | 2026-11-25 | AC-2, AC-3, bugfix 12              |
| `apps/car-manager/src/app/core/utils/receipt-parser.util.spec.ts`     | 2026-11-25 | AC-2, AC-3, bugfix 12              |
| `apps/car-manager/src/app/core/services/refuel-draft.service.ts`      | 2026-11-25 | AC-5                               |
| `apps/car-manager/src/app/core/services/refuel-draft.service.spec.ts` | 2026-11-25 | AC-5                               |
| `apps/car-manager/src/app/core/services/receipt-ocr.service.ts`       | 2026-11-25 | AC-4, AC-6, AC-7, AC-8, bugfix 12  |
| `apps/car-manager/src/app/core/services/receipt-ocr.service.spec.ts`  | 2026-11-25 | AC-4, AC-6, AC-7, AC-8, bugfix 12  |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts`      | 2026-11-25 | AC-1, AC-4, AC-5, AC-6, AC-7, AC-8 |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.spec.ts` | 2026-11-25 | AC-1, AC-4, AC-5, AC-6, AC-7, AC-8 |
| `apps/car-manager/src/app/pages/refuel-list/refuel-list.page.ts`      | 2026-11-25 | AC-1                               |
| `apps/car-manager/src/app/pages/refuel-list/refuel-list.page.spec.ts` | 2026-11-25 | AC-1                               |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts`          | 2026-11-25 | AC-1, AC-5, AC-6, AC-7, AC-8       |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.spec.ts`     | 2026-11-25 | AC-1, AC-5, AC-6, AC-7, AC-8       |
| `apps/car-manager-e2e/src/refuel.spec.ts`                             | 2026-11-25 | AC-1, AC-8                         |

## Zależności

- `docs/adr/004-receipt-ocr-mlkit.md` — decyzja architektoniczna dotycząca wyboru ML Kit, parsera oraz braku migracji wstecznej.
- `docs/conventions/navigation.md` — zasady użycia `NgZone` + `NavController.navigateForward`.
- `apps/car-manager/src/app/core/utils/decimal-input.util.ts` — formatowanie i parsowanie liczb dziesiętnych w formularzu.

## Otwarte pytania

- Brak — wszystkie wymagania biznesowe i techniczne zostały uzgodnione przed fazą implementacji.
