# Bug: [11] — `npm run build:android` / `deploy:android` nie działają (rozjazd `capacitor.config.ts` ↔ `android/`)

**Status:** 🟢 Naprawiony — 2026-11-25
**Data zgłoszenia:** 2026-11-19
**Data naprawy:** 2026-11-25
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

## Rozwiązanie

Wybrano **kierunek 2 (root jako jedyne źródło prawdy)** oraz usunięto blokady kompilacji Gradle na Linuksie:

1. **Rozszerzona diagnoza:**
   - W commicie `aeb7604` rootowy `capacitor.config.ts` był symlinkiem gita (`mode 120000`) wskazującym na `apps/car-manager/capacitor.config.ts`. Na Windowsie symlink zmaterializował się jako plik z samą ścieżką (co wywołało [buga 08](./08-broken-root-capacitor-config.md)) i został usunięty.
   - `android/gradlew` był zapisany w repo z uprawnieniami `100644` (bez bitu wykonywalności `+x`), co powodowało `Permission denied` na Linuksie.
   - `android/build.gradle` w bloku `allprojects { afterEvaluate { ... } }` narzucał `JavaVersion.VERSION_17`, co kolidowało z `kotlin { jvmToolchain(21) }` wymaganym przez `@capacitor/camera@8.2.6` (Capacitor 8).
2. **Zastosowana poprawka:**
   - Przeniesiono `capacitor.config.ts` do roota repozytorium jako **zwykły plik** (`mode 100644`) obok `android/` i `dist/car-manager/browser` (jedyne źródło prawdy, bez duplikatu w `apps/car-manager/`).
   - Usunięto `apps/car-manager/capacitor.config.ts` oraz tymczasowe obejście `scripts/capacitor-gradle-sync.mjs`.
   - Nadano bit wykonywalności dla `android/gradlew` (`chmod +x`, `100755`).
   - Usunięto przestarzałe nadpisanie `JavaVersion.VERSION_17` z `android/build.gradle`.
   - Zaktualizowano `eslint.config.mjs` (przeniesiono wpis w `ignores` na rootowy `capacitor.config.ts`) oraz `knip.json` (usunięto ręczny `ignore` dla `apps/car-manager/capacitor.config.ts`).
   - Dodano test regresyjny `apps/car-manager/src/capacitor-config.spec.ts` (weryfikuje brak symlinka, brak duplikatu w `apps/car-manager/`, wynik `npx cap config --json`, spójność wtyczek Androida w Gradle oraz `+x` na `android/gradlew`).

## Weryfikacja

- `npx cap config --json` — wczytuje `<repo>/capacitor.config.ts`, `webDir: "dist/car-manager/browser"`, `android.platformDirAbs: "<repo>/android"`, zawiera konfigurację `SocialLogin` i `Keyboard.resizeOnFullScreen: true`.
- `JAVA_HOME=/home/adam/.jdks/temurin-21 ANDROID_HOME=/home/adam/Android/Sdk npm run deploy:android` — pełny pipeline przeszedł end-to-end:
  - `nx build car-manager` zbudował paczkę produkcyjną,
  - `npx cap sync android` skopiował zasoby do `android/app/src/main/assets/public`, wygenerował `capacitor.config.json` i `capacitor.plugins.json` oraz zsynchronizował wszystkie 5 wtyczek (`@capacitor-community/speech-recognition`, `@capacitor-mlkit/text-recognition`, `@capacitor/camera`, `@capacitor/keyboard`, `@capgo/capacitor-social-login`),
  - `./gradlew assembleDebug` zakończył się `BUILD SUCCESSFUL in 55s` i zapisał `car-manager.apk` w rootcie repo,
  - `adb install -r` zainstalował APK (`Success`) i uruchomił `com.carmanager.app/.MainActivity` na urządzeniu Samsung Galaxy S24 (`SM_S921B`, `R3CXC01ANZP`).
- `npm exec nx test car-manager` — **32 pliki / 382 testy przeszły** (w tym `src/capacitor-config.spec.ts`).
- `npm run quality` — `lint` (0 błędów), `format:check` (Prettier OK), `knip` (brak problemów) i `duplication` (`jscpd`) zakończone kodem `0`.

## Zapobieganie

- Po każdej zmianie `capacitor.config.ts` sprawdź, czy `android/` i skrypty
  npm wskazują ten sam katalog.
- Smoke test `npm run build:android` w CI (lub przynajmniej przed releasem) —
  brak builda Androida nie był niczym sygnalizowany.
- Wtyczka Capacitora **działa** dopiero po wpisie `:capacitor-<id>` w obu
  plikach Gradle; brak wpisu nie daje błędu kompilacji.
- Na hoście budującym APK muszą być dostępne: `ANDROID_HOME` (lub lokalny gitignorowany `android/local.properties`) oraz JDK 21 wymagane przez Capacitor 8.

## Pliki

| Plik                                            | Zmiana                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `capacitor.config.ts`                           | **dodany** w root repo jako zwykły plik (przeniesiony z aplikacji)        |
| `apps/car-manager/capacitor.config.ts`          | **usunięty** — usunięto rozjazd ścieżek względem `android/`               |
| `scripts/capacitor-gradle-sync.mjs`             | **usunięty** — obejście zbędne po naprawie `npx cap sync android`         |
| `android/gradlew`                               | nadano uprawnienia wykonywania (`100755`)                                 |
| `android/build.gradle`                          | usunięto wymuszenie `JavaVersion.VERSION_17` kolidujące z JDK 21          |
| `eslint.config.mjs`                             | zaktualizowano `ignores` z `apps/car-manager/capacitor.config.ts` na root |
| `knip.json`                                     | usunięto ręczny `ignore` dla `apps/car-manager/capacitor.config.ts`       |
| `apps/car-manager/src/capacitor-config.spec.ts` | **dodany** — test regresyjny konfiguracji Capacitor i spójności Gradle    |
| `docs/bugs/11-broken-android-build.md`          | aktualizacja statusu, rozwiązania, weryfikacji i tabeli plików            |
