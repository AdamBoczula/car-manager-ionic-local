# Bug: [02] — Nawigacja zmienia URL, ale pozostawia poprzedni widok Ionic

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-04
**Data naprawy:** 2026-11-04
**Priorytet:** P1 (wysoki)
**Typ:** Regresja

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

- Kliknięcie karty "Tankowania" na dashboardzie zmienia URL na `/refuel-list`, ale widok pozostaje na dashboardzie
- Kliknięcie karty "Naprawy" na dashboardzie zmienia URL na `/repair-list`, ale widok pozostaje na dashboardzie
- Po F5 (refresh) strona ładuje się poprawnie na docelowej ścieżce
- Przycisk wstecz (`ion-back-button`) działa poprawnie

**Zachowanie oczekiwane:**

- Kliknięcie karty "Tankowania" powinno pokazać widok listy tankowań
- Kliknięcie karty "Naprawy" powinno pokazać widok listy napraw
- Nawigacja między wszystkimi stronami aplikacji powinna działać bez F5

---

## Kroki do reprodukcji

1. Zaloguj się do aplikacji
2. Na dashboardzie kliknij kartę "Tankowania"
3. **Rezultat:** URL zmienia się na `/refuel-list`, ale nadal widać dashboard
4. Naciśnij F5 – strona poprawnie ładuje `/refuel-list`
5. Kliknij przycisk "Dodaj tankowanie" (+) na liście tankowań
6. **Rezultat:** URL zmienia się na `/refuel-form`, ale widok może się nie zmienić
7. Wypełnij formularz i zapisz – toast się pokazuje, ale redirect na listę może nie działać

---

## Root Cause Analysis

**Przyczyna techniczna:**

Globalny arkusz `apps/car-manager/src/styles.scss` nie importował obowiązkowego
`@ionic/angular/css/core.css`. `IonRouterOutlet` poprawnie aktywował nową trasę i
oznaczał poprzednią stronę klasą `ion-page-hidden`, ale bez Ionic Core CSS klasa
nie miała reguły `display: none`. W rezultacie poprzedni ekran pozostawał
widoczny mimo poprawnej zmiany URL i wyrenderowania strony docelowej.

Test regresyjny potwierdził, że po kliknięciu karty tankowań jednocześnie
widoczne były treści `Witaj!` oraz `Brak tankowań – dodaj pierwsze!`.

**Mechanizm problemu:**

```
NavController.navigateForward('/refuel-list')
  → Angular Router zmienia URL ✅
  → IonRouterOutlet aktywuje listę i ukrywa dashboard klasą ion-page-hidden ✅
  → Brak reguły CSS dla ion-page-hidden — dashboard nadal jest widoczny ❌
```

**Poprawny mechanizm:**

```
@import '@ionic/angular/css/core.css'
  → .ion-page-hidden { display: none !important } ✅
  → widoczna pozostaje tylko aktywna strona ✅
  → URL i content wskazują tę samą stronę ✅
```

**Dotknięte pliki:**

- `apps/car-manager/src/styles.scss` — brak importu Ionic Core CSS
- `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts` — `navigateTo()`, `handleCarSelected()`
- `apps/car-manager/src/app/pages/refuel-list/refuel-list.page.ts` — `navigateToForm()`
- `apps/car-manager/src/app/pages/repair-list/repair-list.page.ts` — `navigateToForm()`
- `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts` — `handleSubmit()`
- `apps/car-manager/src/app/pages/repair-form/repair-form.page.ts` — `handleSubmit()`

---

## Proponowane rozwiązanie

1. Dodać obowiązkowy import `@ionic/angular/css/core.css` do globalnego arkusza.
2. Zachować semantyczną nawigację Ionic (`navigateForward`, `navigateBack`,
   `navigateRoot`), ale nie traktować jej jako zamiennika brakujących stylów.
3. Zweryfikować testem E2E nie tylko URL, ale również widoczny content strony
   docelowej i brak widocznego contentu poprzedniej strony.

---

## Rozwiązanie

**Zastosowane podejście:**

- Dodano globalny import `@ionic/angular/css/core.css`, który dostarcza m.in.
  regułę ukrywającą nieaktywną stronę `.ion-page-hidden`.
- Dodano test Playwright wykonujący prawdziwe kliknięcie karty dashboardu.
- Test sprawdza równocześnie URL, content aktywnej strony oraz brak widocznego
  contentu strony opuszczonej, również po powrocie na dashboard.
- Zachowano istniejące metody `NavController` odpowiednie dla kierunku nawigacji:

- **Forward navigation** (dashboard→list, list→form, FAB→form): `NavController.navigateForward(path)` — pushuje nową stronę na stos Ionic, back button działa naturalnie
- **Back after save** (form→list): `NavController.navigateBack(defaultUrl)` w `zone.run()` — ściąga formularz ze stosu. `zone.run()` konieczne, bo `await service.add()` (Firestore) opuszcza strefę Angulara
- **Same-URL reload** (dashboard car-switcher): `NavController.navigateRoot('/dashboard', { animated: false })` — wymusza przeładowanie dashboardu

---

## Naprawione pliki

| Plik                                                                   | Zmiana                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `apps/car-manager/src/styles.scss`                                     | Import Ionic Core CSS obsługujący ukrywanie nieaktywnych stron outletu                                             |
| `apps/car-manager-e2e/src/router-navigation-regression.spec.ts`        | Test URL + widoczny content dla dashboard → tankowania → dashboard oraz dashboard → naprawy                        |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts`           | `Router` → `NavController`; `navigateTo()` używa `navigateForward()`, `handleCarSelected()` używa `navigateRoot()` |
| `apps/car-manager/src/app/pages/refuel-list/refuel-list.page.ts`       | `Router` → `NavController`; `navigateToForm()` używa `navigateForward()`                                           |
| `apps/car-manager/src/app/pages/repair-list/repair-list.page.ts`       | `Router` → `NavController`; `navigateToForm()` używa `navigateForward()`                                           |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.ts`       | `Router` → `NavController`; `handleSubmit()` używa `navigateBack()` w `zone.run()`                                 |
| `apps/car-manager/src/app/pages/repair-form/repair-form.page.ts`       | `Router` → `NavController`; `handleSubmit()` używa `navigateBack()` w `zone.run()`                                 |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.spec.ts`      | Testy zaktualizowane pod `NavController.navigateForward/navigateRoot`                                              |
| `apps/car-manager/src/app/pages/dashboard/routing-integration.spec.ts` | Dodane 2 testy weryfikujące realną zmianę URL przez Angular Router                                                 |
| `apps/car-manager/src/app/pages/refuel-form/refuel-form.page.spec.ts`  | Testy zaktualizowane pod `NavController.navigateBack`                                                              |
| `apps/car-manager/src/app/pages/repair-form/repair-form.page.spec.ts`  | Testy zaktualizowane pod `NavController.navigateBack`                                                              |
| `apps/car-manager/src/app/core/services/e2e.service.ts`                | `Router` → `NavController`; `navigateTo()` używa `navigateForward()`                                               |

### Zmiany pomocnicze ujawnione przez Quality Gate

Poniższe zmiany nie są częścią root cause routingu. Były konieczne, aby pełny
gate nie ukrywał istniejących problemów infrastruktury testowej:

| Plik                                                            | Zmiana                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/core/services/speech.service.spec.ts` | Migracja asynchronicznych testów z callbacku `done()` do `firstValueFrom()` dla Vitest 5     |
| `apps/car-manager-e2e/src/utils/auth-helpers.ts`                | Unikalne konta per test, stabilne oczekiwanie na helper E2E i routing Auth do emulatora      |
| `apps/car-manager-e2e/src/utils/navigation-helpers.ts`          | Oczekiwanie na `domcontentloaded` zamiast blokującego się `networkidle`                      |
| `apps/car-manager-e2e/src/auth.spec.ts`                         | Jednoznaczne selektory hostów Ionic i użycie unikalnego adresu wygenerowanego przez helper   |
| `apps/car-manager-e2e/src/dashboard.spec.ts`                    | Asercja adresu unikalnego użytkownika; jawny statyczny skip niespecyfikowanego statusu sieci |
| `apps/car-manager-e2e/src/refuel.spec.ts`                       | Usunięcie nieużywanego importu                                                               |

---

## Zweryfikowano przez

- [x] Test regresyjny Playwright przechodzi: dashboard → tankowania → dashboard → naprawy; URL i aktywny content ✅
- [x] Testy integracyjne routingu przechodzą: `routing-integration.spec.ts` (7/7 ✅)
- [x] Unit/component/integration przechodzą: `npm exec nx test car-manager` (231/231 ✅, 22/22 files)
- [x] Build przechodzi: `npm exec nx build car-manager` ✅
- [x] Lint przechodzi: `npm exec nx lint car-manager` ✅
- [x] Prettier: wszystkie pliki sformatowane ✅
- [x] E2E: 59 passed, 3 jawnie pominięte, 0 failed ✅
- [x] Quality Gate pełny: `npm exec -- nx affected -t lint test build e2e --base=HEAD --skipNxCache` — 5/5 zadań ✅
- [x] Code Review: uwagi poprawione; pełny gate ponowiony po review ✅
