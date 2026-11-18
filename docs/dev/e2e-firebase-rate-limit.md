# E2E tests hit the real Firebase project

## Problem

Lokalnie (bez emulatora) testy e2e **nie używają mocków** — łączą się z prawdziwym
projektem Firebase. Każdy test woła `seedAuthUser()`, które wykonuje realne
`accounts:signUp`.

Po kilku pełnych przebiegach suity Firebase zwraca:

```
Auth signUp failed (400): {
  "error": { "code": 400, "message": "TOO_MANY_ATTEMPTS_TRY_LATER" }
}
```

Wtedy **wszystkie** testy zależne od auth padają — nie z powodu kodu, tylko
z powodu rate limitingu.

## Objaw diagnostyczny

Kluczowe: sprawdź typ błędu, **zanim** uznasz awarię za regresję.

```bash
grep -c "TOO_MANY_ATTEMPTS_TRY_LATER" <log>
```

Jeśli liczba awarii ≈ liczbie wystąpień tego komunikatu → to rate limit.

Pewna weryfikacja przez bezpośrednie wywołanie API:

```bash
KEY=$(grep -oE "apiKey: '[^']+'" apps/car-manager/src/environments/environment.ts \
  | head -1 | sed "s/apiKey: '//;s/'//")

curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"probe-'$RANDOM'@test.local","password":"Password123!","returnSecureToken":false}'
```

`TOO_MANY_ATTEMPTS_TRY_LATER` = blokada aktywna. Poczekaj, aż wygaśnie.

## Jak tego uniknąć

### 1. Używaj emulatora Firebase (zalecane)

```bash
npx firebase emulators:start --only auth,firestore
```

Wtedy `skipIfFirebaseUnavailable()` wykryje emulator i testy nie dotkną
produkcyjnego projektu. Emulator nie ma rate limitingu.

### 2. Nie uruchamiaj pełnej suity wielokrotnie pod rząd

Każdy przebieg rejestruje nowych użytkowników w prawdziwym projekcie.
Przy debugowaniu używaj zawężenia:

```bash
npx playwright test -c apps/car-manager-e2e/playwright.config.ts \
  car-switcher-sheet --project=chromium
```

### 3. Testy niezależne od auth uruchamiaj pierwsze

Arkusz auta (`car-switcher-sheet.spec.ts`) nie wymaga sesji — warto go
uruchamiać osobno, gdy auth jest zablokowany.

## Uwaga o CI

`ci.yml` ustawia `FIREBASE_AUTH_EMULATOR_HOST` i `FIRESTORE_EMULATOR_HOST`,
więc CI korzysta z emulatora i rate limit go nie dotyczy. Problem jest lokalny.

## Powiązane

- `docs/bugs/07-dashboard-logout-alert-test-redirect.md` — pierwsza obserwacja
  tego zjawiska, początkowo błędnie uznana za trwały błąd
