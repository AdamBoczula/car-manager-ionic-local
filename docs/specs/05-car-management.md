# Feature: Zarządzanie autami – Wizard + Car Service (Zadanie 3B)

## User Story

```
Jako użytkownik Car Manager,
Chcę dodać swoje auto(a) do garażu przy pierwszym użyciu aplikacji i przełączać się między nimi,
Aby śledzić tankowania i naprawy osobno dla każdego pojazdu.
```

---

## Decyzja architektoniczna: jeden garaż na konto

> **ADR-002**: Model współdzielenia danych między użytkownikami został uproszczony:
>
> - Jedno konto (email/Google) = jeden **garaż** (zbiór aut rodziny)
> - Mąż i żona używają **tego samego konta** – logują się tymi samymi danymi
> - Odpada pole `sharedWith` w modelu `Car`, uproszczenie reguł Firestore
> - Odpada całe Faza 3 / Zadanie 2 (współdzielenie auta) z PLAN.md

---

## Acceptance Criteria

### Wizard (pierwsze użycie)

- [ ] AC-1: Given: użytkownik zalogowany po raz pierwszy (0 aut w garażu), When: dashboard się ładuje, Then: zamiast dashboardu widoczny jest wizard dodawania pierwszego auta
- [ ] AC-2: Given: wizard otwarty, When: użytkownik wpisze nazwę auta i kliknie „Dodaj auto", Then: auto pojawia się na liście poniżej, pole nazwy się czyści
- [ ] AC-3: Given: dodane już co najmniej jedno auto w wizardzie, When: użytkownik kliknie „Zacznij korzystać z aplikacji", Then: pierwsze dodane auto staje się aktywnym autem, użytkownik przechodzi na dashboard
- [ ] AC-4: Given: pole nazwy auta puste, When: użytkownik kliknie „Dodaj auto", Then: przycisk jest zablokowany (disabled), nic się nie dzieje
- [ ] AC-5: Given: użytkownik dodał 3 auta w wizardzie, When: kliknie „Zacznij korzystać", Then: wszystkie 3 są zapisane w Firestore i Ionic Storage, pierwsze jest aktywne
- [ ] AC-6: Given: wizard z co najmniej jednym autem, When: użytkownik usunie auto z listy (przycisk X), Then: auto znika z listy, jeśli to było ostatnie – przycisk „Zacznij korzystać" znika, a wizard wraca do stanu początkowego
- [ ] AC-7: Given: użytkownik w wizardzie, When: nie doda żadnego auta i spróbuje opuścić stronę, Then: nie może – wizard jest obowiązkowy (nie ma przycisku back / nie da się nawigować do innych ścieżek)

### Car-switcher w headerze

- [ ] AC-8: Given: dashboard/listy/formularze z co najmniej jednym autem, When: użytkownik patrzy na header, Then: widoczny jest car-switcher z nazwą aktywnego auta i strzałką rozwijania (dropdown)
- [ ] AC-9: Given: car-switcher otwarty, When: użytkownik wybierze inne auto z listy, Then: aktywne auto się zmienia, dane na ekranie przeładowują się dla nowego auta (listy, dashboard)
- [ ] AC-10: Given: car-switcher z 3 autami, When: użytkownik wybierze ostatnią opcję „➕ Dodaj auto", Then: otwiera się uproszczony widok dodawania auta (nie pełny wizard – tylko pole nazwy + przycisk „Dodaj")

### Car Service

- [ ] AC-11: Given: aplikacja uruchomiona, When: użytkownik jest zalogowany, Then: CarService ładuje listę aut z Ionic Storage (fast) i subskrybuje Firestore (live sync)
- [ ] AC-12: Given: CarService, When: zmieni się aktywne auto, Then: RefuelService i RepairService automatycznie przełączają listener na nowe carId
- [ ] AC-13: Given: nowo utworzone auto, When: użytkownik doda tankowanie, Then: `carId` w tankowaniu pochodzi z aktywnego auta (nie `'default-car'`)
- [ ] AC-14: Given: 0 aut w garażu, When: sprawdzany jest warunek routingu, Then: `carGuard` przekierowuje na `/add-car` (wizard)

### Formularz dodawania auta (poza wizardem)

- [ ] AC-15: Given: użytkownik na dowolnym ekranie z car-switcherem, When: wybierze „➕ Dodaj auto", Then: otwiera się `ion-modal` z polem nazwy auta i przyciskiem „Dodaj"
- [ ] AC-16: Given: modal dodawania auta, When: użytkownik wpisze nazwę i kliknie „Dodaj", Then: auto zostaje zapisane, modal się zamyka, nowe auto staje się aktywnym autem
- [ ] AC-17: Given: modal dodawania auta, When: użytkownik kliknie „Anuluj" lub backdrop, Then: modal się zamyka bez zmian

### Opcjonalne pola auta (przebieg, rocznik, VIN)

- [ ] AC-18: Given: wizard/AddCarPage lub modal car-switchera, When: rendered, Then: wyświetla opcjonalne pola: przebieg (km), rocznik, numer VIN
- [ ] AC-19: Given: pole VIN z wartością, When: użytkownik kliknie przycisk kopiowania, Then: VIN jest kopiowany do schowka i pojawia się feedback "Skopiowano!"
- [ ] AC-20: Given: opcjonalne pola są puste, When: użytkownik doda auto, Then: auto jest tworzone poprawnie bez tych pól

### Edge Cases

| Przypadek                               | Obsługa                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **0 aut – próba wejścia na /dashboard** | `carGuard` przekierowuje na `/add-car` (wizard)                                                    |
| **Usunięcie ostatniego auta**           | Przekierowanie na `/add-car` (wizard), wszystkie listy puste                                       |
| **Aktywne auto usunięte**               | Jeśli usunięto aktywne auto → ustaw pierwsze dostępne jako aktywne. Jeśli brak → wizard            |
| **Offline przy dodawaniu auta**         | Auto zapisane lokalnie, zsynchronizowane po powrocie online (standardowy flow Storage → Firestore) |
| **Bardzo długa nazwa auta**             | Ograniczenie do 50 znaków, walidacja w polu input                                                  |
| **Duplikat nazwy auta**                 | Dozwolone – użytkownik może mieć dwa auta o tej samej nazwie (np. dwa służbowe)                    |
| **Wizard przy restarcie apki (0 aut)**  | Zawsze gdy `cars.length === 0`, niezależnie czy to pierwsze logowanie czy usunięto wszystkie       |

---

## Data Model

### Model `Car` (uproszczony)

```typescript
// spec: docs/specs/05-car-management.md
// Zmiany: usunięto pole `sharedWith`, dodano opcjonalne pola
interface Car {
  id: string;
  name: string; // np. "Toyota Corolla", "Żony Clio"
  ownerId: string; // uid użytkownika (garaż)
  currentMileage?: number; // optional – aktualny przebieg
  year?: number; // optional – rocznik auta
  vin?: string; // optional – numer VIN
  createdAt: Timestamp;
}
```

### CarService – sygnały

```typescript
// spec: docs/specs/05-car-management.md
interface CarServiceState {
  cars: Signal<Car[]>; // wszystkie auta w garażu
  activeCar: Signal<Car | null>; // aktywne auto
  activeCarId: Signal<string | null>; // computed: activeCar()?.id ?? null
  hasCars: Signal<boolean>; // computed: cars().length > 0
  isLoading: Signal<boolean>;
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                       CarService                         │
│                                                          │
│  cars() ←──── Ionic Storage ('cars:USER_UID') ────┐     │
│  activeCar() ←── Ionic Storage ('active_car:UID') │     │
│                                 │                  │     │
│  startListening() ──→ Firestore onSnapshot ───────┘     │
│  addCar(name) ──→ Storage → Firestore                   │
│  setActiveCar(id) ──→ Storage → Firestore               │
│  deleteCar(id) ──→ Storage → Firestore                  │
└─────────────┬───────────────────────────────────────────┘
              │
              │ activeCarId()
              ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│       RefuelService          │    │       RepairService          │
│                               │    │                               │
│  startListening(carId) ──→   │    │  startListening(carId) ──→   │
│    refuels(): Refuel[]       │    │    repairs(): Repair[]       │
└─────────────────────────────┘    └─────────────────────────────┘
```

### Routing

```
/login ──→ /register ──→ /add-car (wizard, jeśli 0 aut)
                              │
                              ▼
                         /dashboard
                         /refuel-list
                         /repair-list
                         /refuel-form
                         /repair-form
```

**Nowy guard `carGuard`:**

- Jeśli `carService.hasCars() === false` → przekierowanie na `/add-car`
- W przeciwnym razie → przepuszcza

---

## UI Sketches

### Wizard – stan początkowy (0 aut)

```
┌──────────────────────────────────┐
│                                  │
│        🚗 Witaj w swoim         │
│           garażu!                │
│                                  │
│   Dodaj swoje pierwsze auto,     │
│   aby zacząć śledzić tankowania  │
│   i naprawy.                     │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Nazwa auta               │   │  ← ion-input
│  │ np. Toyota Corolla       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │     ➕ Dodaj auto        │   │  ← ion-button (disabled gdy puste)
│  └──────────────────────────┘   │
│                                  │
│  ─── Twoje auta ───             │
│                                  │
│     (pusto – brak aut)          │
│                                  │
└──────────────────────────────────┘
```

### Wizard – po dodaniu aut

```
┌──────────────────────────────────┐
│                                  │
│        🚗 Witaj w swoim         │
│           garażu!                │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Nazwa auta               │   │
│  │ np. Toyota Corolla       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │     ➕ Dodaj auto        │   │
│  └──────────────────────────┘   │
│                                  │
│  ─── Twoje auta ───             │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 🚙 Toyota Corolla    ✕   │   │  ← lista dodanych aut z X do usunięcia
│  │ 🚗 Żony Clio          ✕   │   │
│  └──────────────────────────┘   │
│                                  │
│  ═══════════════════════════    │
│  ┌──────────────────────────┐   │
│  │ ✅ Zacznij korzystać    │   │  ← CTA – przejście do dashboardu
│  │    z aplikacji           │   │
│  └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

### Header z car-switcherem (dashboard/listy)

```
┌──────────────────────────────────┐
│  ☰  Toyota Corolla  ▼           │  ← car-switcher z dropdownem
│                                  │
│  ┌──────────────────────────┐   │  ← dropdown (popover)
│  │ 🚙 Toyota Corolla   ✓   │   │  ← aktywne auto (zaznaczone)
│  │ 🚗 Żony Clio             │   │
│  │ ─────────────────────    │   │
│  │ ➕ Dodaj auto             │   │
│  └──────────────────────────┘   │
│                                  │
│  [Dashboard content...]         │
└──────────────────────────────────┘
```

---

## Komponenty i pliki

| Plik                                                            | Opis                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `core/models/car.model.ts`                                      | Aktualizacja modelu `Car` – usunięcie `sharedWith`   |
| `core/services/car.service.ts`                                  | Nowy serwis – CRUD aut, aktywne auto, sygnały        |
| `core/services/car.service.spec.ts`                             | Testy jednostkowe CarService                         |
| `core/guards/car.guard.ts`                                      | Nowy guard – przekierowanie na wizard gdy 0 aut      |
| `core/guards/car.guard.spec.ts`                                 | Testy guarda                                         |
| `pages/add-car/add-car.page.ts`                                 | Nowa strona wizarda dodawania aut                    |
| `pages/add-car/add-car.page.scss`                               | Style wizarda                                        |
| `pages/add-car/add-car.page.spec.ts`                            | Testy komponentu wizarda                             |
| `shared/components/car-switcher/car-switcher.component.ts`      | Nowy komponent – dropdown wyboru auta w headerze     |
| `shared/components/car-switcher/car-switcher.component.scss`    | Style car-switchera                                  |
| `shared/components/car-switcher/car-switcher.component.spec.ts` | Testy car-switchera                                  |
| `app.routes.ts`                                                 | Nowa ścieżka `/add-car`, dodanie `carGuard`          |
| `pages/dashboard/dashboard.page.ts`                             | Integracja CarSwitcher w headerze                    |
| `pages/refuel-list/refuel-list.page.ts`                         | Integracja CarSwitcher, zastąpienie `DEFAULT_CAR_ID` |
| `pages/refuel-form/refuel-form.page.ts`                         | Zastąpienie `DEFAULT_CAR_ID`                         |
| `pages/repair-list/repair-list.page.ts`                         | Integracja CarSwitcher, zastąpienie `default-car`    |
| `pages/repair-form/repair-form.page.ts`                         | Zastąpienie `default-car`                            |

---

## Implemented in

| Plik                                                            | Cel                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `core/models/car.model.ts`                                      | Usunięcie `sharedWith` z modelu Car (ADR-002)            |
| `core/services/car.service.ts`                                  | Nowy serwis: CRUD aut, aktywne auto, offline-first       |
| `core/services/car.service.spec.ts`                             | Testy jednostkowe CarService                             |
| `core/guards/car.guard.ts`                                      | Nowy guard: przekierowanie na `/add-car` gdy 0 aut       |
| `core/guards/car.guard.spec.ts`                                 | Testy carGuard                                           |
| `pages/add-car/add-car.page.ts`                                 | Wizard + tryb dodawania auta                             |
| `pages/add-car/add-car.page.scss`                               | Style wizarda                                            |
| `pages/add-car/add-car.page.spec.ts`                            | Testy komponentu AddCarPage                              |
| `shared/components/car-switcher/car-switcher.component.ts`      | Komponent wyboru auta w headerze                         |
| `shared/components/car-switcher/car-switcher.component.scss`    | Style car-switchera                                      |
| `shared/components/car-switcher/car-switcher.component.spec.ts` | Testy car-switchera                                      |
| `app.routes.ts`                                                 | Trasa `/add-car` + `carGuard` na chronionych trasach     |
| `pages/dashboard/dashboard.page.ts`                             | CarSwitcher w headerze, integracja z CarService          |
| `pages/dashboard/dashboard.page.spec.ts`                        | Testy dashboard z CarService mockiem                     |
| `pages/refuel-list/refuel-list.page.ts`                         | CarSwitcher, efekt reactywny, zastąpienie DEFAULT_CAR_ID |
| `pages/refuel-list/refuel-list.page.spec.ts`                    | Testy refuel-list z CarService mockiem                   |
| `pages/repair-list/repair-list.page.ts`                         | CarSwitcher, efekt reactywny, zastąpienie 'default-car'  |
| `pages/repair-list/repair-list.page.spec.ts`                    | Testy repair-list z CarService mockiem                   |
| `pages/refuel-form/refuel-form.page.ts`                         | CarSwitcher, zastąpienie DEFAULT_CAR_ID                  |
| `pages/refuel-form/refuel-form.page.spec.ts`                    | Testy refuel-form z CarService mockiem                   |
| `pages/repair-form/repair-form.page.ts`                         | CarSwitcher, zastąpienie 'default-car'                   |
| `pages/repair-form/repair-form.page.spec.ts`                    | Testy repair-form z CarService mockiem                   |
| `app.component.ts`                                              | CarService.startListening() po zalogowaniu               |
