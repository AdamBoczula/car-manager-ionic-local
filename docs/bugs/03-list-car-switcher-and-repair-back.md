# Bug: [03] — Przełączanie auta na listach i brak powrotu z napraw

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-04
**Data naprawy:** 2026-11-04
**Priorytet:** P1 (wysoki)
**Typ:** Regresja

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

- `/repair-list` nie ma strzałki powrotu do dashboardu.
- Zmiana aktywnego auta z headera `/refuel-list` i `/repair-list` nie przełącza
  niezawodnie auta ani danych listy.
- Popover wyboru auta może pozostać otwarty po zatwierdzeniu wyboru.

**Zachowanie oczekiwane:**

- Obie listy mają strzałkę powrotu z `defaultHref="/dashboard"`.
- Po potwierdzeniu innego auta popover znika, aktywne auto zostaje zapisane, a
  bieżąca lista przeładowuje się i nasłuchuje danych wybranego auta.
- URL i aktywny widok pozostają odpowiednio `/refuel-list` lub `/repair-list`.

---

## Kroki do reprodukcji

1. Zaloguj się na konto z co najmniej dwoma autami.
2. Wejdź na `/refuel-list` lub `/repair-list`.
3. Otwórz wybór auta, wskaż inne auto i potwierdź.
4. **Rezultat:** wybór lub odświeżenie danych nie działa niezawodnie, a overlay
   może pozostać otwarty. Na `/repair-list` dodatkowo brak powrotu.

---

## Root Cause Analysis

`CarSwitcherComponent` używa stałego, globalnego
`id="car-switcher-trigger"`. `IonRouterOutlet` cache'uje odwiedzone strony, więc
w DOM może istnieć kilka triggerów o tym samym ID. Ionic może wtedy powiązać
popover z nieaktywną instancją komponentu. Listy obsługują `carSelected` jedynie
przez `CarService.setActiveCar()`, podczas gdy dashboard po zapisie wykonuje
również `navigateRoot()` wymuszające ponowne wejście na trasę. `RepairListPage`
nie importuje ani nie renderuje `IonBackButton`.

**Dotknięte pliki:**

- `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts`
- `apps/car-manager/src/app/pages/refuel-list/refuel-list.page.ts`
- `apps/car-manager/src/app/pages/repair-list/repair-list.page.ts`
- testy komponentowe i E2E powyższych przepływów

---

## Proponowane rozwiązanie

1. Sterować popoverem lokalnym stanem i zdarzeniem kliknięcia, bez globalnego ID.
2. Zamykać popover przed pokazaniem potwierdzenia i przed emisją wyboru.
3. Na obu listach obsłużyć wybór przez `setActiveCar()` i
   `navigateRoot(bieżąca-trasa, { animated: false })`.
4. Dodać `IonBackButton` do `/repair-list`.
5. Pokryć URL, aktywny content, zamknięty overlay i nazwę wybranego auta testem
   regresyjnym.

---

## Rozwiązanie

- Usunięto globalny trigger ID z `CarSwitcherComponent`; każda instancja steruje
  swoim `IonPopover` przez lokalny sygnał i event kliknięcia.
- Przed pokazaniem alertu komponent czeka na faktyczne `dismiss()` popovera.
- Wybranie już aktywnego auta tylko zamyka popover — bez alertu, emisji
  `carSelected` i przeładowania strony.
- Obie listy zapisują aktywne auto i wykonują `navigateRoot()` na własnej trasie,
  co odtwarza widok oraz uruchamia nasłuch dla wybranego auta.
- `RepairListPage` ma `IonBackButton` z fallbackiem `/dashboard`.
- Serwisy list natychmiast czyszczą poprzednie dane i używają tokenu generacji,
  aby spóźniony cache lub listener starego auta nie nadpisał nowego stanu.
- Usunięto podwójny start nasłuchu (`effect` + `ngOnInit`); pozostał jeden
  reaktywny punkt startu.

---

## Naprawione pliki

| Plik                                                            | Zmiana                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `shared/components/car-switcher/car-switcher.component.ts`      | Lokalnie sterowany popover i oczekiwanie na dismiss           |
| `shared/components/car-switcher/car-switcher.component.spec.ts` | Regresja globalnego triggera i zamykania wyboru               |
| `pages/refuel-list/refuel-list.page.ts`                         | Handler zmiany auta i reload `/refuel-list`                   |
| `pages/refuel-list/refuel-list.page.spec.ts`                    | Test zapisu auta i nawigacji root                             |
| `pages/repair-list/repair-list.page.ts`                         | Back button oraz handler zmiany auta                          |
| `pages/repair-list/repair-list.page.spec.ts`                    | Test back buttona i nawigacji root                            |
| `core/services/refuel.service.ts`                               | Czyszczenie starej listy i ochrona przed wyścigiem listenerów |
| `core/services/refuel.service.spec.ts`                          | Test pustego cache i spóźnionego odczytu starego auta         |
| `core/services/repair.service.ts`                               | Czyszczenie starej listy i ochrona przed wyścigiem listenerów |
| `core/services/repair.service.spec.ts`                          | Test pustego cache i spóźnionego odczytu starego auta         |
| `apps/car-manager-e2e/src/car-switcher-confirmation.spec.ts`    | E2E obu list, overlayu, aktywnego widoku i powrotu            |

---

## Zweryfikowano przez

- [x] Test regresyjny RED: 4 błędy odpowiadające zgłoszonym objawom
- [x] Testy celowane unit/component/service: 53/53
- [x] E2E CarSwitcher: 6/6
- [x] Pełny Quality Gate przed review: 5/5 zadań
- [x] Code Review: poprawiono wyścig listenerów, lifecycle overlayu i testy serwisów
- [x] Pełny Quality Gate po review: 5/5 zadań, bez cache
