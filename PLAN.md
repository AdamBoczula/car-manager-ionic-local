# Car Manager – Plan Aplikacji

## 1. Cel i założenia

Prosta, mobilna aplikacja CRUD do zarządzania kosztami samochodu dla Ciebie i żony.
Dwa główne moduły: **tankowanie** i **naprawy**. Mobile-first, działa offline.

---

## 2. Stos technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| **Framework UI** | Ionic 9 + Angular 22 | Komponenty gotowe pod mobile, dojrzały ekosystem |
| **Native runtime** | Capacitor 8 | Most do API natywnych (Android/iOS), plugin do speech-to-text |
| **Backend (start)** | Firebase v13 (Auth + Firestore) | Darmowy start, real-time sync, brak serwera |
| **Backend (future)** | NestJS + PostgreSQL | Gdy potrzeba własnego API, więcej kontroli |
| **Offline storage** | `@ionic/storage` (IndexedDB) + Firestore offline persistence | Dane lokalnie, sync gdy online |
| **Stan aplikacji** | Signals + RxJS | Angularowy standard, reaktywność |
| **Speech-to-text** | `@capacitor-community/speech-recognition` | Dyktowanie treści napraw podczas jazdy |
| **Auth** | Firebase Auth (email lub Google) | Proste logowanie dla 2 osób |
| **Hosting** | Firebase Hosting (PWA) + App Store / Google Play (Capacitor) | Szeroki zasięg |

---

## 3. Architektura projektu (monorepo Nx ✅)

Struktura wzorowana na `budget-fort-pwa`: Nx workspace + Angular + Ionic + Capacitor.

```
car-manager/
├── apps/
│   └── car-manager/                  # Główna apka Ionic/Angular
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/             # Serwisy, guardy, interceptory
│       │   │   │   ├── services/
│       │   │   │   │   ├── auth.service.ts
│       │   │   │   │   ├── refuel.service.ts
│       │   │   │   │   ├── repair.service.ts
│       │   │   │   │   ├── sync.service.ts
│       │   │   │   │   └── speech.service.ts
│       │   │   │   ├── guards/
│       │   │   │   └── models/
│       │   │   │       ├── car.model.ts
│       │   │   │       ├── refuel.model.ts
│       │   │   │       └── repair.model.ts
│       │   │   ├── pages/
│       │   │   │   ├── login/
│       │   │   │   ├── dashboard/      # Podsumowanie, statystyki
│       │   │   │   ├── refuel-list/    # Lista tankowań
│       │   │   │   ├── refuel-form/    # Dodaj/edytuj tankowanie
│       │   │   │   ├── repair-list/    # Lista napraw
│       │   │   │   └── repair-form/    # Dodaj/edytuj naprawę
│       │   │   └── shared/
│       │   │       ├── components/     # Współdzielone komponenty
│       │   │       └── pipes/
│       │   ├── environments/
│       │   └── theme/
│       └── capacitor.config.ts
├── libs/
│   └── shared/                        # Typy, stałe, utils (do przyszłego użycia)
├── nx.json
├── package.json
└── PLAN.md
```

Alternatywa prostsza: standardowy projekt Ionic-Angular bez Nx (szybszy start).

---

## 4. Modele danych

### 4.1 Samochód (`cars`)
```typescript
interface Car {
  id: string;
  name: string;           // np. "Toyota Corolla"
  ownerId: string;        // uid użytkownika
  sharedWith: string[];   // uid żony/męża do współdzielenia
  createdAt: Timestamp;
}
```
> Na start: jeden samochód, później możliwość dodania kolejnych.

### 4.2 Tankowanie (`refuels`)
```typescript
interface Refuel {
  id: string;
  carId: string;
  date: string;           // ISO 8601
  amount: number;         // zapłacona kwota
  mileage: number;        // przebieg (km)
  liters?: number;        // opcjonalnie – ilość litrów
  isVerva: boolean;       // czy tankowano Vervę / paliwo premium
  isSkipped: boolean;     // pominięty wpis (ktoś zatankował bez wiedzy)
  skippedReason?: string; // powód pominięcia
  consumption?: number;   // l/100km – wyliczane automatycznie
  createdBy: string;
  createdAt: Timestamp;
}
```

**Logika wyliczania spalania (l/100km):**
1. Znajdź poprzednie tankowanie dla tego samego auta (posortowane po dacie).
2. Jeśli poprzednie istnieje – oblicz: `(liters / (mileage - prevMileage)) * 100`.
3. Pomiń wyliczenie jeśli `isSkipped = true` lub brak poprzedniego wpisu.
4. Uwzględnij flagę Vervy: jeśli poprzednie tankowanie miało Vervę, wyświetl informację, że spalanie mogło być inne.

### 4.3 Naprawa (`repairs`)
```typescript
interface Repair {
  id: string;
  carId: string;
  date: string;           // ISO 8601
  amount: number;         // zapłacona kwota
  mileage: number;        // przebieg
  location: string;       // gdzie robiono (warsztat, adres)
  description: string;    // co robiono (textarea, dużo tekstu)
  mechanicNote: string;   // komentarz o wykonawcy (textarea)
  createdBy: string;
  createdAt: Timestamp;
}
```

---

## 5. Flow aplikacji

### 5.1 Ekrany

```
Login → Dashboard → [Lista tankowań] → [Formularz tankowania]
                  → [Lista napraw]    → [Formularz naprawy]
                  → [Ustawienia]
```

### 5.2 Dashboard
- Ostatnie tankowanie + wyliczone spalanie
- Suma wydatków w tym miesiącu (tankowanie + naprawy)
- Szybkie przyciski: ➕ Tankowanie, 🔧 Naprawa
- Mini wykres spalania (ostatnie 5 wpisów)

### 5.3 Formularz tankowania
- **Data** – date picker, domyślnie dzisiejsza
- **Kwota** – number input
- **Przebieg** – number input
- **Verva?** – toggle switch
- **Ilość litrów** – opcjonalnie (jeśli znana)
- **Pomiń wpis** – checkbox z polem na powód (np. "Żona tankowała, nie powiedziała")
- Automatyczne wyliczenie spalania widoczne po zapisie (lub komunikat "Brak danych do wyliczenia")

### 5.4 Formularz naprawy
- **Data** – date picker, domyślnie dzisiejsza
- **Kwota** – number input
- **Przebieg** – number input
- **Miejsce** – text input (warsztat, adres)
- **Opis prac** – `<ion-textarea>` z dużą ilością miejsca
- **Komentarz o wykonawcy** – `<ion-textarea>`
- **🎤 Przycisk mowy** – uruchamia speech-to-text, wypełnia pole tekstowe

### 5.5 Listy z filtrowaniem
- Sortowanie po dacie (domyślnie malejąco)
- Filtry: miesiąc, rok
- Swipe-to-delete lub długie przytrzymanie → edycja/usuwanie

---

## 6. Offline-first (Ionic Storage + Firestore)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Ionic UI   │ ←→ │  Service (Facade) │ ←→ │  Ionic       │
│  (Angular)   │     │  refuel.service   │     │  Storage     │
│              │     │  repair.service   │     │  (IndexedDB) │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   Firebase       │
                     │   Firestore      │
                     └──────────────────┘
```

**Strategia:**
1. **Zapis**: zawsze najpierw do Ionic Storage (lokalnie), potem w tle do Firestore.
2. **Odczyt**: z Ionic Storage (szybkie), Firestore jako source-of-truth + listener na zmiany.
3. **Konflikt**: prosty – ostatni zapis wygrywa (Last-Write-Wins). Dla 2 osób to wystarczy.
4. **Sync queue**: jeśli offline → zapisz lokalnie, dodaj do kolejki sync. Po powrocie online → wyślij kolejkę.

---

## 7. Firebase – plan wdrożenia

| Usługa | Zastosowanie |
|---|---|
| **Firebase Auth** | Email/Password lub Google Sign-In. Użytkownik + żona, współdzielone auto. |
| **Firestore** | Kolekcje: `cars`, `refuels`, `repairs`. Proste reguły bezpieczeństwa. |
| **Firestore Rules** | Tylko właściciel/współdzielący widzi dane swojego auta. |
| **Firebase Hosting** | Opcjonalnie – PWA jako fallback. |

### Reguły Firestore (szkielet):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cars/{carId} {
      allow read, write: if request.auth != null 
        && (resource.data.ownerId == request.auth.uid 
            || request.auth.uid in resource.data.sharedWith);
    }
    match /refuels/{id} {
      allow read, write: if request.auth != null;
      // walidacja po stronie aplikacji + reguły
    }
    match /repairs/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 8. Migracja na NestJS + PostgreSQL (plan przyszły)

Gdy zajdzie potrzeba:
1. **API Gateway**: NestJS wystawia REST API (lub GraphQL).
2. **Baza**: PostgreSQL z TypeORM lub Prisma.
3. **Auth**: JWT zamiast Firebase Auth.
4. **Sync**: własny mechanizm sync lub po prostu HTTP requesty.
5. **Zmiana w apce**: podmiana serwisów – interfejsy w warstwie abstrakcji.

> Rekomendacja: od razu pisać serwisy za interfejsem (`IRefuelService`, `IRepairService`),
> żeby później podmiana na NestJS była tylko kwestią nowej implementacji.

---

## 9. UI / UX – wytyczne

- **Mobile-first**: wszystko projektowane pod telefon (max 430px), tablet jako rozszerzenie.
- **Ionic components**: `ion-header`, `ion-fab` (FAB button do szybkiego dodawania), `ion-modal`, `ion-toast`.
- **FAB (Floating Action Button)**: na dole ekranu, rozwija się w 2 opcje: ⛽ Tankowanie / 🔧 Naprawa.
- **Bottom tabs** (opcjonalnie): Dashboard | Tankowania | Naprawy | Ustawienia.
- **Kolorystyka**: ciemny/auto theme (systemowy), akcent np. petrol-blue (#1B6B4A) lub klasyczny blue.
- **Swipe actions**: na listach – swipe w lewo → usuń, swipe w prawo → edytuj.
- **Puste stany**: ilustracja + tekst zachęcający (np. "Brak tankowań – dodaj pierwsze!").
- **Speech-to-text**: duży przycisk z mikrofonem 🎤 w formularzu naprawy. Po tapnięciu odpala natywne rozpoznawanie mowy.

---

## 10. Harmonogram prac (propozycja)

### Faza 1 – Fundament (MVP)
- [ ] Inicjalizacja projektu Ionic + Angular + Capacitor
- [ ] Konfiguracja Firebase (projekt, Auth, Firestore)
- [ ] Ekran logowania (email + Google)
- [ ] Modele danych + serwisy bazowe (refuel, repair)
- [ ] Ionic Storage – offline-first

### Faza 2 – Główne funkcje
- [ ] Dashboard (podsumowanie, szybkie akcje)
- [ ] CRUD tankowania (lista + formularz)
- [ ] Automatyczne wyliczanie spalania
- [ ] CRUD napraw (lista + formularz z textarea)
- [ ] Speech-to-text dla napraw

### Faza 3 – Szlify
- [ ] Filtrowanie i sortowanie list
- [ ] Współdzielenie auta między użytkownikami
- [ ] PWA + deployment
- [ ] Testy na Android/iOS (Capacitor build)

### Faza 4 – Opcjonalne dodatki
- [ ] Wykresy spalania (Chart.js / ngx-charts)
- [ ] Eksport danych do CSV/PDF
- [ ] Powiadomienia push (przypomnienie o przeglądzie)
- [ ] Wiele samochodów ✅ (od razu w MVP)

---

## 11. Pomysły dodatkowe (do rozważenia)

1. **Przypomnienia serwisowe** – na podstawie przebiegu lub daty (np. wymiana oleju co 15k km / rok).
2. **Skanowanie paragonów** – OCR z aparatu, auto-uzupełnianie kwoty i daty.
3. **Eksport roczny** – PDF z podsumowaniem kosztów do rozliczenia.
4. **Widget na ekran główny** – szybkie dodanie tankowania bez otwierania apki (Android).
5. **Dark mode** – automatyczny lub wymuszony.
6. **Tryb oszczędzania danych** – mniej sync w tle, tylko manualny refresh.

---

## 12. Konwencje nazewnicze i kodowe

- Angular: standalone components, OnPush change detection (standalone is default in Angular 22+)
- Stylowanie: SCSS + Ionic CSS variables
- Nazwy plików: `kebab-case.component.ts`
- Serwisy: `PascalCaseService` (np. `RefuelService`)
- Commity: Conventional Commits (`feat:`, `fix:`, `chore:`)

---

*Ostatnia aktualizacja: 01.11.2026*