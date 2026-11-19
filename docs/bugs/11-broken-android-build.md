# Bug: [11] — `npm run build:android` / `deploy:android` nie działają (rozjazd `capacitor.config.ts` ↔ `android/`)

**Status:** 🔴 Otwarty — wykryty przy naprawie [buga 10](./10-native-keyboard-integration.md), świadomie **poza zakresem** tamtej poprawki
**Data zgłoszenia:** 2026-11-19
**Priorytet:** P2 (średni) — blokuje build i instalację APK, ale nie web/PWA
**Typ:** Błąd konfiguracji / tooling (Capacitor CLI 8.6 w monorepo Nx)
**Powiązane:** [bug 08](./08-broken-root-capacitor-config.md) (uszkodzony config w root), [bug 10](./10-native-keyboard-integration.md)

---

## Objaw

```bash
$ npm run build:android
> nx build car-manager && npx cap sync android && ...
[error] Could not find the web assets directory: .\www.
        Please create it and make sure it has an index.html file.
```

Z katalogu aplikacji błąd jest inny:

```bash
$ cd apps/car-manager && npx cap sync android
[error] android platform has not been added yet.
```

## Root Cause Analysis

W repo są **dwie prawdy o tym, gdzie „mieszka” Capacitor**:

| Artefakt                   | Lokalizacja             |
| -------------------------- | ----------------------- |
| `capacitor.config.ts`      | `apps/car-manager/`     |
| `android/` (platforma)     | **root repo**           |
| `scripts` w `package.json` | uruchamiane z **roota** |

CLI 8.6 liczy wszystkie ścieżki od `process.cwd()`:

- `loadConfig()` → `appRootDir = process.cwd()` (nie katalog pliku configu!),
- `config.android.platformDirAbs = resolve(appRootDir, 'android')`,
- `config.app.webDirAbs = resolve(appRootDir, webDir)`.

Stąd:

- **z roota**: platforma `android/` jest widoczna, ale `capacitor.config.ts`
  nie jest wczytywany → `webDir` spada do domyślnego `'www'` → brak katalogu,
- **z `apps/car-manager/`**: config jest czytany, ale `apps/car-manager/android/`
  nie istnieje → „platform has not been added yet”.

Nie ma kombinacji, która zadziała dla obu połówek. Dodatkowo skrypty
`build:android`, `install:phone`, `deploy:android` zakładają root (`cd android`,
`./gradlew`, `cp ... ../car-manager.apk`) — czyli nawet po naprawie ścieżek
siebie nie znajdą.

**Uwaga o symptomie `www`:** `npx cap sync android` wywala się **przed**
aktualizacją wtyczek, więc `npm run build:android` nigdy nie dojdzie do
`cap update` ani do Gradle.

## Wpływ

- `npm run build:android`, `npm run deploy:android`, `npm run deploy:phone` —
  nie działają od momentu przeniesienia `android/` do roota.
- Nowe pluginy Capacitora **nie są** automatycznie wpisywane do
  `capacitor.settings.gradle` / `app/capacitor.build.gradle` — trzeba to robić
  ręcznie (tak zrobiono dla `@capacitor/keyboard`, bug 10).
- Manual QA natywki (m.in. AC-8 z buga 10) jest zablokowane.
- Web build, testy, lint — **nie** są dotknięte.

## Możliwe kierunki rozwiązania (do decyzji)

1. **Przenieść `android/` do `apps/car-manager/android/`** i uruchamiać CLI z
   katalogu aplikacji (`cd apps/car-manager && npx cap sync android`). Najbliżej
   domyślnych założeń CLI; wymaga poprawy skryptów w `package.json` i `.gitignore`.
2. **Zostawić `android/` w roocie** i dodać rootowy `capacitor.config.ts`
   (re-eksport configu z `apps/car-manager/`, z `webDir: 'dist/car-manager/browser'`).
   Ryzyko: powtórka buga 08, jeśli plik znowu trafi do repo w złej formie —
   wymaga, by `knip`/`lint` go nie wywalały.
3. Obejście jednorazowe: skrypt generujący wpisy Gradle z manifestów wtyczek
   dla `android/` w roocie — **już dodany** jako `scripts/capacitor-gradle-sync.mjs`
   (używa `loadConfig()`/`getPlugins()`/`installGradlePlugins()` z CLI).
   Nie rozwiązuje kopiowania `webDir` ani `adjustResize` z configu.

## Zapobieganie

- Po każdej zmianie `capacitor.config.ts` sprawdź, czy `android/` i skrypty
  npm wskazują ten sam katalog.
- Smoke test `npm run build:android` w CI (lub przynajmniej przed releasem) —
  brak builda Androida nie był niczym sygnalizowany.
- Wtyczka Capacitora **działa** dopiero po wpisie `:capacitor-<id>` w obu
  plikach Gradle; brak wpisu nie daje błędu kompilacji.

## Pliki

| Plik                                   | Zmiana                                                    |
| -------------------------------------- | --------------------------------------------------------- |
| `package.json`                         | skrypty `build:android` / `install:phone` (root-relative) |
| `apps/car-manager/capacitor.config.ts` | config (`webDir: 'dist/car-manager/browser'`)             |
| `android/`                             | platforma Capacitora w root repo                          |
| `scripts/capacitor-gradle-sync.mjs`    | obejście: regeneracja wpisów Gradle (dodane przy bugu 10) |
