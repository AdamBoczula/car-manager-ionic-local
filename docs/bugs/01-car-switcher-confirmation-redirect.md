# Bug: [01] — Brak potwierdzenia zmiany auta i przekierowania na dashboard

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-04
**Data naprawy:** 2026-11-04
**Priorytet:** P1 (wysoki)
**Typ:** Nowy bug

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

1. W headerze dashboardu, po kliknięciu w `CarSwitcher` i wybraniu innego auta z listy, zmiana następuje **natychmiast** — bez żadnego potwierdzenia. Użytkownik nie ma szansy cofnąć decyzji.
2. Po zmianie auta, URL pozostaje `/dashboard`, ale w Ionic+Angular zdarza się, że widok nie odświeża się poprawnie — URL jest poprawny, ale treść ekranu pokazuje nieaktualne dane (dla starego auta).

**Zachowanie oczekiwane:**

1. Po wybraniu innego auta w popoverze `CarSwitcher`, powinien pojawić się confirmation popup (IonAlert): **"Czy na pewno chcesz zmienić auto na [nazwa auta]?"**
2. Po zatwierdzeniu ("Tak"):
   - Alert się zamyka
   - Popover się zamyka
   - Emitowane jest zdarzenie `carSelected`
   - Dashboard wykonuje `setActiveCar()` + `router.navigate(['/dashboard'])` aby wymusić pełne odświeżenie widoku
3. Po anulowaniu ("Nie"): alert się zamyka, nic się nie zmienia, popover zostaje otwarty (lub też się zamyka — do ustalenia)

---

## Kroki do reprodukcji

1. Zaloguj się do aplikacji
2. Przejdź na `/dashboard`
3. Kliknij przycisk `CarSwitcher` w headerze (pokazuje nazwę aktywnego auta)
4. Wybierz **inne** auto z listy
5. **Rezultat:** Auto zmienia się natychmiast, bez potwierdzenia. Brak przekierowania — potencjalnie nieaktualny widok.

---

## Root Cause Analysis

**Przyczyna techniczna:**

W pliku `car-switcher.component.ts`, metoda `selectCar()` (linia 364-367):

```typescript
selectCar(id: string): void {
  this.isPopoverOpen.set(false);
  this.carSelected.emit(id);
}
```

1. **Brak potwierdzenia**: Metoda natychmiast emituje `carSelected` bez żadnego confirmation stepu. Użytkownik nie ma możliwości cofnięcia decyzji o zmianie auta.
2. **Brak przekierowania**: W `dashboard.page.ts` (linia 58) handler `carSelected` wykonuje tylko `carService.setActiveCar($event)` — nie ma nawigacji do `/dashboard`. W Ionic+Angular, sama zmiana sygnału `activeCarId` może nie wystarczyć do pełnego odświeżenia widoku (szczególnie problematyczne gdy użytkownik wcześniej nawigował między podstronami i wrócił na dashboard).

**Dotknięte pliki:**

- `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts` — brak confirmation alertu
- `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts` — brak przekierowania po zmianie auta
- `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.spec.ts` — brak testów potwierdzenia
- `apps/car-manager/src/app/pages/dashboard/dashboard.page.spec.ts` — brak testów przekierowania po carSelected
- `apps/car-manager/src/app/pages/dashboard/routing-integration.spec.ts` — brak testu weryfikacji contentu po zmianie auta

---

## Proponowane rozwiązanie

### 1. CarSwitcher — dodanie AlertController

- Wstrzyknąć `AlertController` do komponentu
- Zmodyfikować `selectCar(id)`:
  - Jeśli wybrane auto === aktualne auto → nic nie robić (lub po prostu zamknąć popover)
  - Jeśli wybrane auto !== aktualne auto → pokazać `ion-alert` z pytaniem "Czy na pewno chcesz zmienić auto na [nazwa]?"
  - Alert ma przyciski "Nie" (rola: `cancel`) i "Tak" (rola: `confirm`)
  - Po "Tak": zamknąć popover, wyemitować `carSelected`

### 2. DashboardPage — nawigacja po zmianie auta

- Zmienić handler `(carSelected)` z inline na metodę `handleCarSelected(id: string)`
- W metodzie: `await carService.setActiveCar(id)`, potem `router.navigate(['/dashboard'])`

### 3. Testy

- **CarSwitcher spec**: testy dla confirmation flow (pokaż/ukryj alert, potwierdź/anuluj)
- **Dashboard spec**: test że `handleCarSelected` woła `setActiveCar` + `router.navigate(['/dashboard'])`
- **Routing integration spec**: test że po zmianie auta na dashboardzie, content strony to rzeczywiście dashboard (np. sprawdzenie obecności "Witaj!" i kart, nie tylko URL)

---

## Rozwiązanie (wypełnić po implementacji)

**Zastosowane podejście:**

### 1. CarSwitcherComponent — confirmation alert

- Wstrzyknięto `AlertController` via `inject()`
- Zmodyfikowano `selectCar()`: gdy wybrane auto === aktywne → zamyka popover i emituje natychmiast; gdy różne → pokazuje `ion-alert` z pytaniem "Czy na pewno chcesz zmienić auto na [nazwa]?"
- Alert ma przyciski "Nie" (cancel) i "Tak" (confirm — handler emituje `carSelected` i zamyka popover)

### 2. DashboardPage — redirect po zmianie auta

- Dodano metodę `handleCarSelected(id)`: `await carService.setActiveCar(id)` + `await router.navigate(['/dashboard'])`
- Zmieniono binding w template z `carService.setActiveCar($event)` na `handleCarSelected($event)`

---

## Naprawione pliki

| Plik                                                                                     | Zmiana                                                                                                          |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts`      | Dodano `AlertController`, zmodyfikowano `selectCar()` — confirmation alert przy zmianie auta                    |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts`                             | Dodano `handleCarSelected()` — `setActiveCar` + `router.navigate(['/dashboard'])`, zmieniono binding w template |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.spec.ts` | Dodano 3 testy w `selectCar confirmation` describe block                                                        |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.spec.ts`                        | Dodano 2 testy w `handleCarSelected` describe block                                                             |
| `apps/car-manager/src/app/pages/dashboard/routing-integration.spec.ts`                   | Dodano test weryfikacji contentu dashboardu po zmianie auta                                                     |
| `apps/car-manager-e2e/src/car-switcher-confirmation.spec.ts`                             | Dodano test E2E: pełny flow potwierdzenia zmiany auta + weryfikacja contentu                                    |

---

## Zweryfikowano przez

- [x] Test regresyjny przechodzi: `car-switcher.component.spec.ts` — `selectCar confirmation` (3 testy)
- [x] Test regresyjny przechodzi: `dashboard.page.spec.ts` — `handleCarSelected` (2 testy)
- [x] Unit testy przechodzą: `npm exec nx test car-manager` (220/226 passed; 6 failures są pre-existing, niezwiązane)
- [x] Build przechodzi: `npm exec nx build car-manager`
- [x] Lint przechodzi: `npm exec nx lint car-manager`
- [x] E2E test utworzony: `apps/car-manager-e2e/src/car-switcher-confirmation.spec.ts` (3 testy: happy path, cancel, same-car edge case)
- [x] Code Review: ✅ APPROVED (deep-review: poprawność, regresja, konwencje, testy, architektura)
