# Feature: Ekran logowania (Zadanie 2A)

## User Story

```
Jako użytkownik Car Manager,
Chcę zalogować się do aplikacji za pomocą emaila/hasła lub konta Google,
Aby mieć bezpieczny dostęp do moich danych (tankowania, naprawy).
```

## Acceptance Criteria

### Logowanie email/hasłem
- [ ] Given: użytkownik na stronie logowania, When: wpisze poprawny email i hasło i kliknie "Zaloguj się", Then: zostaje przekierowany na dashboard
- [ ] Given: użytkownik na stronie logowania, When: wpisze błędne dane, Then: zobaczy komunikat błędu w toaście (np. "Nieprawidłowy email lub hasło")
- [ ] Given: użytkownik nie ma konta, When: kliknie "Zarejestruj się", Then: zostanie przekierowany do formularza rejestracji

### Rejestracja email/hasłem
- [ ] Given: nowy użytkownik w formularzu rejestracji, When: poda email, hasło (min. 6 znaków) i kliknie "Utwórz konto", Then: konto zostanie utworzone i użytkownik jest zalogowany
- [ ] Given: użytkownik w formularzu rejestracji, When: poda już istniejący email, Then: zobaczy komunikat "Konto z tym emailem już istnieje"
- [ ] Given: użytkownik w formularzu rejestracji, When: poda za słabe hasło (<6 znaków), Then: zobaczy błąd walidacji pod polem hasła

### Google Sign-In
- [ ] Given: użytkownik na stronie logowania, When: kliknie "Kontynuuj z Google", Then: otworzy się okno wyboru konta Google, po wyborze zostaje zalogowany
- [ ] Given: użytkownik bez konta, When: zaloguje się przez Google, Then: konto zostanie automatycznie utworzone w Firebase Auth

### Sesja i bezpieczeństwo
- [ ] Given: zalogowany użytkownik zamknie i otworzy aplikację ponownie, Then: pozostaje zalogowany (Firebase Auth persist)
- [ ] Given: niezalogowany użytkownik, When: spróbuje wejść na /dashboard lub inny chroniony route, Then: zostanie przekierowany na /login
- [ ] Given: zalogowany użytkownik na /login, When: strona się załaduje, Then: zostanie automatycznie przekierowany na /dashboard

### Wylogowanie
- [ ] Given: zalogowany użytkownik, When: kliknie "Wyloguj się", Then: sesja Firebase zostaje zakończona i użytkownik widzi stronę logowania

---

## Data Model

Brak nowych modeli danych. Firebase Auth zarządza użytkownikami automatycznie.
Używamy istniejących modeli z `core/models/`.

**Stan użytkownika (AuthService):**
```typescript
// Signal-based state
currentUser: Signal<User | null>;   // firebase.User lub null
isLoggedIn: Signal<boolean>;        // computed: !!currentUser()
authReady: Signal<boolean>;         // czy Firebase Auth zakończył inicjalizację
```

---

## UI Sketch

### Strona logowania (`/login`)

```
┌──────────────────────────────────┐
│                                  │
│         🚗 Car Manager          │  ← Logo/apka nazwa
│                                  │
│  ┌──────────────────────────┐   │
│  │ Email                     │   │  ← ion-input, type="email"
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Hasło                     │   │  ← ion-input, type="password"
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │     🔑 Zaloguj się       │   │  ← ion-button, expand="block"
│  └──────────────────────────┘   │
│                                  │
│  ─────── lub ───────            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  G  Kontynuuj z Google   │   │  ← ion-button, fill="outline"
│  └──────────────────────────┘   │
│                                  │
│     Nie masz konta?             │
│     Zarejestruj się →           │  ← link do /register
│                                  │
└──────────────────────────────────┘
```

### Strona rejestracji (`/register`)

```
┌──────────────────────────────────┐
│                                  │
│       Utwórz konto              │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Email                     │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Hasło (min. 6 znaków)    │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Powtórz hasło             │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │   ✨ Utwórz konto        │   │
│  └──────────────────────────┘   │
│                                  │
│  ─────── lub ───────            │
│                                  │
│  ┌──────────────────────────┐   │
│  │  G  Kontynuuj z Google   │   │
│  └──────────────────────────┘   │
│                                  │
│     Masz już konto?             │
│     Zaloguj się →               │  ← link do /login
│                                  │
└──────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  LoginPage   │ ──→ │   AuthService   │ ──→ │  Firebase Auth   │
│  (UI)        │ ←── │   (stan sesji)  │ ←── │  (backend auth)  │
└──────────────┘     └────────┬────────┘     └──────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   authGuard     │
                     │   (router guard)│
                     └─────────────────┘
```

1. **Logowanie email/hasło**: `AuthService.login(email, password)` → Firebase `signInWithEmailAndPassword`
2. **Rejestracja email/hasło**: `AuthService.register(email, password)` → Firebase `createUserWithEmailAndPassword`
3. **Google Sign-In**: `AuthService.loginWithGoogle()` → Firebase `signInWithPopup` (web) / Capacitor Google Auth plugin (native)
4. **Wylogowanie**: `AuthService.logout()` → Firebase `signOut()`
5. **Auto-login**: Firebase Auth `onAuthStateChanged` → `AuthService` aktualizuje signal `currentUser`

---

## Komponenty i pliki

| Plik | Opis |
|------|------|
| `pages/login/login.page.ts` | Strona logowania (formularz email/hasło + Google) |
| `pages/register/register.page.ts` | Strona rejestracji (formularz email/hasło + Google) |
| `core/services/auth.service.ts` | Serwis Auth – logowanie, rejestracja, wylogowanie, stan sesji |
| `core/guards/auth.guard.ts` | Route guard – przekierowuje niezalogowanych na /login |
| `core/guards/no-auth.guard.ts` | Route guard – przekierowuje zalogowanych na /dashboard |

---

## Edge Cases

| Przypadek | Obsługa |
|-----------|---------|
| **Brak internetu przy logowaniu** | Toast: "Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie." |
| **Nieprawidłowy email/hasło** | Toast: "Nieprawidłowy email lub hasło." (Firebase error `auth/invalid-credential`) |
| **Email już zajęty (rejestracja)** | Toast: "Konto z tym adresem email już istnieje." (Firebase error `auth/email-already-in-use`) |
| **Zbyt słabe hasło** | Walidacja inline: "Hasło musi mieć co najmniej 6 znaków." |
| **Hasła nie pasują (rejestracja)** | Walidacja inline: "Hasła nie są identyczne." |
| **Google Sign-In anulowane** | Nic – użytkownik zostaje na stronie logowania bez komunikatu |
| **Firebase Auth jeszcze się nie zainicjalizował** | `authReady` signal → pokazujemy loader/spinner zamiast formularza |
| **Użytkownik już zalogowany, wszedł na /login** | `noAuthGuard` automatycznie przekierowuje na /dashboard |
| **Użytkownik niezalogowany, wszedł na /dashboard** | `authGuard` automatycznie przekierowuje na /login |
| **Wylogowanie bez internetu** | Firebase `signOut()` działa lokalnie – sesja usuwana z cache |

---

## Implemented in

| Plik | Cel |
|------|-----|
| `apps/car-manager/src/app/core/services/auth.service.ts` | Serwis autoryzacji (login, register, Google, logout, signals) |
| `apps/car-manager/src/app/core/guards/auth.guard.ts` | Guard chronionych tras → przekierowanie na /login |
| `apps/car-manager/src/app/core/guards/no-auth.guard.ts` | Guard dla niezalogowanych → przekierowanie zalogowanych na /dashboard |
| `apps/car-manager/src/app/pages/login/login.page.ts` | Strona logowania (email + Google) |
| `apps/car-manager/src/app/pages/register/register.page.ts` | Strona rejestracji (email + Google) |
| `apps/car-manager/src/app/app.routes.ts` | Aktualizacja tras + lazy loading + guardy |