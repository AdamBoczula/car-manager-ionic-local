# Bug: [07] — Test alertu wylogowania nie widzi `ion-alert`, bo `authGuard` przekierowuje na `/login`

## Status

**Zamknięty jako niereprodukowalny (flaky)** — 18.11.2026.

## Wynik ponownej weryfikacji

Po naprawie problemów z line endings test **przechodzi stabilnie**:

| Przebieg                        | Wynik                          |
| ------------------------------- | ------------------------------ |
| Pełna suita e2e                 | 66 passed, 7 skipped, 0 failed |
| `dashboard.spec.ts` (całość) ×2 | 10 passed / 10 passed          |
| Pojedynczy test ×3              | 3 × passed                     |

Emulator Firebase nadal nie działa, a test mimo to przechodzi — czyli pierwsza
awaria była **przejściowa** (najprawdopodobniej timeout sieci do realnego
`identitytoolkit.googleapis.com`), a nie deterministyczna.

### Dlaczego wyglądało to na trwałe

Błąd powtórzył się w izolacji i na czystym `HEAD`, co sugerowało determinizm.
W rzeczywistości oba przebiegi przypadły na ten sam okres niedostępności sieci.
Wniosek: pojedynczy „czerwony” przebieg nie dowodzi determinizmu — potrzebne
są powtórzenia (jak wyżej).

## Objaw (archiwalny)

Test e2e `dashboard.spec.ts:90` — `should have a logout button and show confirmation dialog when clicked`
kończy się błędem:

```
Error: expect(locator).toBeVisible() failed
Locator: locator('ion-alert')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

W `error-context.md` widać, że po kliknięciu przycisku strona **nie jest** dashboardem —
jest to ekran logowania („Zaloguj się, aby zarządzać kosztami auta”, przycisk „🔑 Zaloguj się”
w stanie `disabled`).

## Wpływ

- E2E: 1 failed, 65 passed, 7 skipped
- Test pada również w izolacji (`--grep`/pojedynczy plik) — nie jest flaky
- **Nie jest regresją** — powtarza się na czystym `HEAD` bez lokalnych zmian (zweryfikowane `git stash`)

## Analiza przyczyny (archiwalna)

Test używa `seedAuthUser()` do wstawienia użytkownika do IndexedDB, zakładając że
`authGuard` przepuści na `/dashboard`. W tym środowisku:

1. **Emulator Firebase nie działa** — brak nasłuchu na `:9099` i `:8080`.
2. `skipIfFirebaseUnavailable()` **nie pomija** testu, bo realne
   `identitytoolkit.googleapis.com` odpowiada (status < 500). Funkcja sprawdza
   tylko osiągalność API, nie to, czy sesja zostanie nawiązana.
3. `seedAuthUser()` zapisuje dane do **lokalnego** IndexedDB, ale Firebase Auth
   SDK nie widzi w ten sposób ważnej sesji (`onAuthStateChanged` nie emituje usera).
4. `authGuard` nie widzi zalogowanego użytkownika → `navigateRoot('/login')`.
5. `ion-alert` nigdy się nie pojawia, bo `handleLogout()` nie zostaje wywołane.

`handleLogout()` w `dashboard.page.ts` jest **poprawne** — tworzy alert z właściwym
komunikatem i `alert.present()`. Błąd leży w warstwie testowej (setup sesji),
nie w kodzie produkcyjnym.

## Dlaczego CI jest zielone

`ci.yml` ustawia `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST`
i uruchamia `npm ci` na Ubuntu. W CI emulator jest osiągalny, więc
`skipIfFirebaseUnavailable()` pomija test (albo sesja działa). Lokalnie na Windows
bez emulatora test wchodzi w gałąź „real Firebase”, gdzie seeding nie tworzy sesji.

## Proponowane rozwiązanie

Mimo że test obecnie przechodzi, setup jest **kruchy** — zależy od sieci do
realnego Firebase. Warto go utwardzić:

| Opcja                                      | Opis                                                                  | Ryzyko                                                |
| ------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------- |
| A. Uruchomić emulator lokalnie             | `firebase emulators:start` przed e2e                                  | Wymaga Javy + konfiguracji; test staje się wiarygodny |
| B. Zaostrzyć `skipIfFirebaseUnavailable`   | Sprawdzać realne `signInWithEmailAndPassword`, nie tylko HTTP 200 API | Niskie — mniej fałszywych przejść                     |
| C. Testować `handleLogout` component-level | Test jednostkowy z mockiem `AlertController`                          | Niskie, ale nie pokrywa ścieżki w przeglądarce        |

**Rekomendacja:** B + C. B eliminuje fałszywie „zielone” testy zależne od sieci,
C daje deterministyczne pokrycie logiki alertu bez emulatora.

## Pliki

| Plik                                                             | Rola                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `apps/car-manager-e2e/src/dashboard.spec.ts:90`                  | Test, który pada                            |
| `apps/car-manager-e2e/src/utils/auth-helpers.ts`                 | `skipIfFirebaseUnavailable`, `seedAuthUser` |
| `apps/car-manager/src/app/pages/dashboard/dashboard.page.ts:354` | `handleLogout()` — kod poprawny             |
| `.github/workflows/ci.yml`                                       | Ustawia zmienne emulatora                   |

## Jak odtworzyć

```bash
# bez emulatora
npx playwright test -c apps/car-manager-e2e/playwright.config.ts \
  dashboard.spec.ts --project=chromium --reporter=line
```
