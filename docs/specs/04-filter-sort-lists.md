# Feature: Filtrowanie i sortowanie list (Zadanie 3A)

## User Story

```
Jako użytkownik Car Manager,
Chcę filtrować i sortować listy tankowań oraz napraw po miesiącu, roku, dacie i kwocie,
Aby szybko znaleźć interesujące mnie wpisy i analizować wydatki w wybranym okresie.
```

## Acceptance Criteria

### Filtrowanie – miesiąc i rok

- [ ] AC-1: Given: lista tankowań/napraw załadowana z danymi z różnych miesięcy, When: użytkownik wybierze miesiąc z segmentu, Then: lista pokazuje tylko wpisy z wybranego miesiąca, a segment podświetla aktywny miesiąc
- [ ] AC-2: Given: lista z aktywnym filtrem miesiąca, When: użytkownik wybierze rok, Then: lista filtruje się po kombinacji miesiąc + rok
- [ ] AC-3: Given: aktywny filtr miesiąc + rok, When: użytkownik kliknie „Wszystkie" (clear filter), Then: filtr zostaje usunięty i widoczne są wszystkie wpisy
- [ ] AC-4: Given: filtr zawężony do miesiąca bez wpisów, When: lista się ładuje, Then: wyświetlany jest empty state z komunikatem „Brak wpisów w wybranym okresie"
- [ ] AC-5: Given: użytkownik ma tankowania tylko w styczniu 2026, When: otworzy listę, Then: filtr domyślnie pokazuje „Wszystkie", a lista zawiera wszystkie dostępne wpisy
- [ ] AC-6: Given: użytkownik zmieni rok na taki bez wpisów, When: filtr się zastosuje, Then: wyświetla się empty state dla danego okresu

### Sortowanie – data i kwota

- [ ] AC-7: Given: lista tankowań/napraw, When: użytkownik pierwszy raz otwiera listę, Then: wpisy są domyślnie posortowane po dacie malejąco (najnowsze na górze)
- [ ] AC-8: Given: lista z domyślnym sortowaniem (data malejąco), When: użytkownik kliknie przycisk sortowania po dacie, Then: sortowanie przełącza się na datę rosnąco (najstarsze na górze)
- [ ] AC-9: Given: lista z sortowaniem po dacie, When: użytkownik wybierze sortowanie po kwocie, Then: wpisy są posortowane po kwocie malejąco (najdroższe na górze)
- [ ] AC-10: Given: lista z sortowaniem po kwocie malejąco, When: użytkownik kliknie ponownie przycisk sortowania po kwocie, Then: sortowanie przełącza się na kwotę rosnąco
- [ ] AC-11: Given: aktywny filtr miesiąc+rok, When: użytkownik zmieni sortowanie, Then: posortowane są tylko przefiltrowane wpisy (filtr + sort działają łącznie)

### Persystencja filtrów i sortowania

- [ ] AC-12: Given: użytkownik ustawił filtr „Styczeń 2026" i sortowanie „kwota malejąco", When: opuści listę i wróci na nią, Then: filtr i sortowanie są przywrócone
- [ ] AC-13: Given: użytkownik ustawił filtr i sortowanie, When: zamknie i otworzy aplikację ponownie, Then: filtry i sortowanie są przywrócone z Ionic Storage
- [ ] AC-14: Given: użytkownik ma ustawione filtry na liście tankowań, When: przejdzie na listę napraw, Then: lista napraw ma własne, niezależne ustawienia filtrów i sortowania
- [ ] AC-15: Given: lista tankowań z zapisanymi filtrami, When: użytkownik kliknie „Wyczyść filtry", Then: zarówno filtr jak i sortowanie wracają do domyślnych („Wszystkie" / data malejąco), a domyślne są zapisywane

### UI – segment filtrów

- [ ] AC-16: Given: ekran listy tankowań/napraw, When: strona się załaduje, Then: pod toolbar-em widoczny jest poziomy, przewijalny segment z miesiącami (Sty, Lut, ..., Gru) + chip „Wszystkie" oraz selektor roku
- [ ] AC-17: Given: segment miesięcy na małym ekranie (≤430px), When: użytkownik przewija segment, Then: miesiące przewijają się płynnie, a pierwszy i ostatni widoczny element mają fade-out
- [ ] AC-18: Given: segment filtrów, When: użytkownik kliknie miesiąc na tablecie, Then: segment jest wygodny do użycia również na większych ekranach (wyśrodkowany, nie rozciągnięty na full-width)

### Edge Cases

| Przypadek | Obsługa |
|-----------|---------|
| **Brak wpisów w wybranym okresie** | Empty state: „Brak wpisów w wybranym okresie. Zmień filtr lub dodaj nowy wpis." |
| **Wszystkie wpisy w tym samym miesiącu** | Segment wyświetla tylko dostępne miesiące (disabled dla pustych) lub pokazuje wszystkie – decyzja: pokazujemy wszystkie 12 miesięcy, puste pokazują empty state |
| **Użytkownik cofa filtr (back button / gesture)** | Nie dotyczy – filtry są zawsze widoczne, nie ma nawigacji modalnej |
| **Zmiana filtra gdy lista jest pusta (loading)** | Filtry są interaktywne dopiero po załadowaniu danych (zapobiegamy migotaniu) |
| **Bardzo długa lista (>100 wpisów)** | Filtrowanie i sortowanie odbywa się na sygnale w pamięci – O(n). Dla setek wpisów wydajność jest akceptowalna. |
| **Offline – brak Firestore** | Filtry i sortowanie działają w pełni na danych z Ionic Storage |
| **Zapisane filtry z nieistniejącego roku** | Przy odczycie z Ionic Storage walidujemy – jeśli rok nie istnieje w danych, reset do „Wszystkie" |

---

## Data Model

### Nowy model: preferencje listy

```typescript
// spec: docs/specs/04-filter-sort-lists.md
interface ListPreferences {
  /** 'all' = wszystkie miesiące, lub 0-11 (0 = styczeń) */
  selectedMonth: number | 'all';
  /** Rok do filtrowania, lub 'all' */
  selectedYear: number | 'all';
  /** Kryterium sortowania */
  sortBy: 'date' | 'amount';
  /** Kierunek sortowania */
  sortDirection: 'asc' | 'desc';
}
```

**Storage keys:**
- `list_prefs:refuel` – preferencje listy tankowań
- `list_prefs:repair` – preferencje listy napraw

### Komponent współdzielony: `FilterSortBarComponent`

```typescript
// spec: docs/specs/04-filter-sort-lists.md
interface FilterSortChange {
  month: number | 'all';
  year: number | 'all';
  sortBy: 'date' | 'amount';
  sortDirection: 'asc' | 'desc';
}
```

---

## UI Sketch

### Lista z filtrami (tankowania)

```
┌──────────────────────────────────┐
│  ← Tankowania              ➕     │  ← ion-header + toolbar
├──────────────────────────────────┤
│ [Wszystkie] Sty Lut Mar ... Gru  │  ← ion-segment (przewijany poziomo)
│ 2026 ▼                           │  ← ion-select (rok)
│ Sortuj: Data ▼  ↑↓               │  ← przycisk sortowania
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐   │
│  │ 15.03.2026               │   │
│  │ 245,50 zł  ·  123 456 km │   │  ← ion-item
│  │ 42,5 L  ·  Spalanie 6,8  │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 01.03.2026               │   │
│  │ 230,00 zł  ·  122 800 km │   │
│  │ 41,0 L  ·  Spalanie 6,9  │   │
│  └──────────────────────────┘   │
│                                  │
│  ... (lista przewijana)         │
│                                  │
└──────────────────────────────────┘
```

### Empty state z aktywnym filtrem

```
┌──────────────────────────────────┐
│  ← Tankowania                    │
├──────────────────────────────────┤
│ [Wszystkie] Sty Lut Mar ... Gru  │
│ 2025 ▼                           │
├──────────────────────────────────┤
│                                  │
│         ┌──────────┐            │
│         │  🔍      │            │  ← ikona wyszukiwania/pustego stanu
│         └──────────┘            │
│                                  │
│   Brak wpisów w wybranym        │
│   okresie. Zmień filtr lub      │
│   dodaj nowy wpis.              │
│                                  │
│        [➕ Dodaj tankowanie]     │  ← CTA button
│                                  │
└──────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────┐
│  FilterSortBar  │ ←→ │  ListaPage            │ ←→ │  Service       │
│  (komponent)    │     │  (refuel/repair)      │     │  (sygnął)      │
│  - segment      │     │                       │     │                │
│  - select roku  │     │  computed:            │     │  refuels()     │
│  - sort button  │     │    filteredList()     │     │  repairs()     │
│                  │     │    = filter(sort(     │     │                │
│                  │     │      data(),          │     │                │
│                  │     │      prefs()          │     │                │
│                  │     │    ))                 │     │                │
└────────┬────────┘     └──────────┬───────────┘     └────────────────┘
         │                         │
         │  emituje FilterSortChange│
         │                         │
         ▼                         ▼
┌──────────────────────────────────────────────┐
│              Ionic Storage                     │
│  'list_prefs:refuel' → { month, year, ... }  │
│  'list_prefs:repair' → { month, year, ... }  │
└──────────────────────────────────────────────┘
```

---

## Komponenty i pliki

| Plik | Opis |
|------|------|
| `shared/components/filter-sort-bar/filter-sort-bar.component.ts` | Nowy komponent współdzielony – segment miesięcy, select roku, przycisk sortowania |
| `shared/components/filter-sort-bar/filter-sort-bar.component.scss` | Style komponentu |
| `shared/components/filter-sort-bar/filter-sort-bar.component.spec.ts` | Testy komponentu |
| `pages/refuel-list/refuel-list.page.ts` | Integracja FilterSortBar, `computed` dla filtrowanej listy |
| `pages/refuel-list/refuel-list.page.spec.ts` | Aktualizacja testów – testy filtrowania i sortowania |
| `pages/repair-list/repair-list.page.ts` | Integracja FilterSortBar, `computed` dla filtrowanej listy |
| `pages/repair-list/repair-list.page.spec.ts` | Aktualizacja testów |
| `core/services/storage.service.ts` | (istniejący – używany do persystencji preferencji) |

---

## Implemented in

| Plik | Cel |
|------|-----|
| `shared/components/filter-sort-bar/filter-sort-bar.component.ts` | Komponent FilterSortBar – segment miesięcy, select roku, przyciski sortowania |
| `shared/components/filter-sort-bar/filter-sort-bar.component.scss` | Style – przewijalny segment, fade-out, controls row |
| `shared/components/filter-sort-bar/filter-sort-bar.component.spec.ts` | Testy jednostkowe (15 testów) – rendering, emisja zdarzeń, ikony |
| `pages/refuel-list/refuel-list.page.ts` | Integracja FilterSortBar, `filteredRefuels()`, `availableYears()`, persystencja preferencji |
| `pages/refuel-list/refuel-list.page.spec.ts` | Aktualizacja mocków (StorageService) |
| `pages/repair-list/repair-list.page.ts` | Integracja FilterSortBar, `filteredRepairs()`, `availableYears()`, persystencja preferencji |
| `pages/repair-list/repair-list.page.spec.ts` | Aktualizacja mocków (StorageService) |