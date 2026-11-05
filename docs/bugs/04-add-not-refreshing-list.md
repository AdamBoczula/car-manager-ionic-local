# Bug: [04] — Dodanie tankowania/naprawy nie odświeża listy

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-04
**Data naprawy:** 2026-11-04
**Priorytet:** P0 (krytyczny)
**Typ:** Regresja

---

## Objawy

**Zachowanie rzeczywiste (BUG):**
Po dodaniu tankowania lub naprawy przez formularz i powrocie na listę, nowy wpis nie jest widoczny.
Dzieje się tak zarówno online jak i offline — w przypadku offline wpis nigdy się nie pojawia.

**Zachowanie oczekiwane:**
Po dodaniu tankowania/naprawy i powrocie na listę, nowy wpis powinien być natychmiast widoczny,
nawet bez połączenia z siecią (offline-first).

---

## Kroki do reprodukcji

1. Otwórz aplikację, zaloguj się
2. Przejdź do listy tankowań
3. Kliknij FAB → formularz dodawania tankowania
4. Wypełnij formularz i zatwierdź
5. **Rezultat:** Powrót na listę, ale nowego tankowania nie widać

---

## Root Cause Analysis

**Przyczyna techniczna:**

Sygnały `refuels` i `repairs` w serwisach `RefuelService` i `RepairService` są aktualizowane
tylko w dwóch miejscach:

1. `startListening()` — przy pierwszym załadowaniu z cache (Ionic Storage)
2. Callback `onSnapshot` — gdy Firestore wyemituje zmianę

Metody `add()`, `update()`, `delete()` zapisują dane do Ionic Storage i Firestore,
ale **nigdy nie wywołują `this.refuels.set()` / `this.repairs.set()`**.

Ponieważ formularz używa `navController.navigateBack()`, strona listy nie jest niszczona
i tworzona od nowa — `startListening()` nie jest ponownie wywoływane. Jedyną szansą
na zobaczenie nowego wpisu jest callback `onSnapshot` z Firestore. Przy offline
`addDoc()` rzuca wyjątek → `onSnapshot` nie emituje zmiany → wpis nigdy się nie pojawia.

Kontrast: `CarService.addCar()` (linia 190) robi to poprawnie — po zapisie lokalnym
natychmiast woła `this.cars.set(list)`.

**Dotknięte pliki:**

- `apps/car-manager/src/app/core/services/refuel.service.ts` — `add()`, `update()`, `delete()`
- `apps/car-manager/src/app/core/services/repair.service.ts` — `add()`, `update()`, `delete()`

---

## Proponowane rozwiązanie

Po każdej operacji mutującej lokalny storage (`add`, `update`, `delete`), odczytać
pełną listę z cache i natychmiast zaktualizować sygnał. Wzorzec z `CarService`:

```typescript
// Po saveLocal / storage.set:
const allLocal = await this.storage.get<T[]>(this.storageKey(carId));
this.refuels.set(allLocal ?? []);
```

Dotyczy to również `update()` i `delete()` — obie metody modyfikują storage bez
aktualizacji sygnału.

---

## Rozwiązanie (wypełnić po implementacji)

**Zastosowane podejście:**
Dodano natychmiastową aktualizację sygnału po każdej operacji mutującej local storage:

- **`add()`**: po `saveLocal()`, odczyt pełnej listy z cache i `this.refuels.set(allLocal)` / `this.repairs.set(allLocal)`
- **`update()`**: po `storage.set()`, bezpośrednie `this.refuels.set(updated)` / `this.repairs.set(updated)` (mamy już zmodyfikowaną tablicę w pamięci)
- **`delete()`**: po `storage.set()`, bezpośrednie `this.refuels.set(filtered)` / `this.repairs.set(filtered)`

Wzorzec zgodny z `CarService.addCar()` (linia 190) i `CarService.deleteCar()` (linia 234).

---

## Naprawione pliki

| Plik                                                       | Zmiana                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/car-manager/src/app/core/services/refuel.service.ts` | `add()`: sygnał aktualizowany po `saveLocal()`; `update()`: sygnał aktualizowany po storage.set; `delete()`: sygnał aktualizowany po storage.set |
| `apps/car-manager/src/app/core/services/repair.service.ts` | `add()`: sygnał aktualizowany po `saveLocal()`; `update()`: sygnał aktualizowany po storage.set; `delete()`: sygnał aktualizowany po storage.set |

---

## Zweryfikowano przez

- [x] Test regresyjny przechodzi: `refuel.service.spec.ts`, `repair.service.spec.ts`
- [x] Unit testy przechodzą: `npm exec nx test car-manager`
- [x] Build przechodzi: `npm exec nx build car-manager`
- [x] Quality Gate przechodzi: `npm exec nx affected -t lint test build e2e`
- [x] Code Review: ✅ APPROVED (1 minor fix applied)
