# Bug: [12] — Skanowanie paragonu na Androidzie kończy się błędem odczytu obrazu i błędnym parsowaniem paragonu Orlen

**Status:** 🟢 Naprawiony — 2026-11-25
**Data zgłoszenia:** 2026-11-25
**Data naprawy:** 2026-11-25
**Priorytet:** P1 (wysoki) — funkcja skanowania paragonów niedziałająca na urządzeniu Android
**Typ:** Nowy bug / Edge case

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

1. Na telefonie Android (Samsung `R3CXC01ANZP`) zrobienie zdjęcia paragonu otwiera aparat i zapisuje plik w cache aplikacji, ale po powrocie z aparatu aplikacja wyświetla toast błędu (`Nie udało się zeskanować paragonu. Wpisz dane ręcznie.`). W `adb logcat` widoczny jest błąd:
   ```text
   {"type":0,"uri":"/data/user/0/com.carmanager.app/cache/PIC_20261125_212321.jpg",...}
   Receipt OCR failed: Error: image could not be loaded.
   ```
2. `ReceiptOcrService` nie sprawdzał ani nie żądał jawnie uprawnień aparatu przed wywołaniem `Camera.takePhoto()`, a anulowanie aparatu w `@capacitor/camera` v8 (`OS-PLUG-CAMR-0006` / `"No picture was taken."`) nie zawiera słowa `cancel` i było traktowane jako błąd.
3. Brakowało możliwości wyboru istniejącego zdjęcia paragonu z galerii urządzenia.
4. Na rzeczywistym paragonie Orlen (`recipts/paragon_orlen_1.jpeg`, `recipts/paragon_orlen_3.jpeg`) parser:
   - mylił pozycję napoju `ENERG VERVA SUGAR FREE 0,25l (A) 1*5.49` z paliwem premium `VERVA`,
   - nie odejmował linii rabatu `OBNIŻKA -6.06A` po paliwie `EFECTA DIESEL ... 60.68*6.99 / 424.15A` (prawidłowa kwota to `418.09`, nie `424.15`),
   - nie rekonstruował wierszy z dwukolumnowych bloków ML Kit (`boundingBox`),
   - nie rozpoznawał formatu `SUMA: PLN 437.41` z dwukropkiem po `SUMA`.

**Zachowanie oczekiwane:**

- Po kliknięciu „Skanuj paragon” użytkownik może wybrać **Zrób zdjęcie** lub **Wybierz z galerii**.
- Dla aparatu aplikacja jawnie sprawdza i prosi o uprawnienie `camera`, jeśli nie zostało jeszcze przyznane.
- Ścieżki plikowe zwracane przez `@capacitor/camera` na Androidzie są normalizowane do URI `file://...` przed przekazaniem do `TextRecognition.processImage()`.
- Anulowanie aparatu lub galerii (`OS-PLUG-CAMR-0006`, `OS-PLUG-CAMR-0013`, `OS-PLUG-CAMR-0020`) nie wyświetla komunikatu o błędzie.
- Parser ignoruje napoje/produkty sklepowe (np. `ENERG VERVA`), rekonstruuje wiersze z bloków ML Kit i uwzględnia rabat `OBNIŻKA` po pozycji paliwa.

---

## Kroki do reprodukcji

1. Uruchomić aplikację na telefonie Android i kliknąć „Skanuj paragon”.
2. Zrobić zdjęcie paragonu i zatwierdzić w aplikacji aparatu.
3. **Rezultat:** `Camera.takePhoto()` zwraca `uri: "/data/user/0/com.carmanager.app/cache/PIC_....jpg"`, po czym `TextRecognition.processImage()` odrzuca obietnicę z `Error: image could not be loaded.`.

---

## Root Cause Analysis

**Przyczyna techniczna:**

- W `@capacitor/camera` v8 (`IonCameraFlow.kt`) `takePhoto()` i `chooseFromGallery()` zwracają `uri = mediaResult.uri`, czyli surową ścieżkę systemu plików (`/data/user/0/...`) bez schematu `file://`.
- W `@capacitor-mlkit/text-recognition` (`TextRecognition.java`) metoda `InputImage.fromFilePath(context, Uri.parse(path))` wymaga poprawnego URI ze schematem (`file://` lub `content://`). Dla ścieżki bez schematu `Uri.parse` zwraca URI o `scheme == null`, co powoduje niepowodzenie otwarcia pliku i rzucenie `ERROR_LOAD_IMAGE_FAILED`.
- Testy jednostkowe wcześniej mockowały `uri: 'file:///tmp/receipt.jpg'`, przez co rozbieżność z Androidem pozostała niewykryta.

**Dotknięte pliki:**

- `apps/car-manager/src/app/core/services/receipt-ocr.service.ts`
- `apps/car-manager/src/app/core/utils/receipt-parser.util.ts`

---

## Rozwiązanie

**Zastosowane podejście:**

1. Dodano `normalizeNativeImagePath()` w `receipt-ocr.service.ts`, które zamienia ścieżki zaczynające się od `/` na `file://${encodeURI(path)}`.
2. Dodano wybór źródła (`ActionSheetController`: „Zrób zdjęcie” / „Wybierz z galerii”) oraz obsługę `Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, ... })`.
3. Dodano jawne `Camera.checkPermissions()` / `Camera.requestPermissions({ permissions: ['camera'] })` przed uruchomieniem aparatu oraz mapowanie kodów `CameraErrorCode` (`OS-PLUG-CAMR-0003`, `0005`, `0006`, `0007`, `0013`, `0020`).
4. Dodano `buildReceiptTextFromOcr()` w `receipt-parser.util.ts` (rekonstrukcja wierszy po współrzędnych `boundingBox` z `TextBlock[]`), normalizację spacji po separatorze dziesiętnym (`424. 15A` → `424.15A`, `437. 41` → `437.41` bez psucia kodów pocztowych `28, 02-675`), wykluczenie produktów pozapaliwowych (`ENERG`, `SUGAR FREE`, `0,25l`, `HOT DOG`, `KAWA` itp.), tolerancję artefaktów ML Kit (`60.68+6.99`, `0BNIŽKA` / `0BNI ŻKA`), odejmowanie linii `OBNIŻKA` / `RABAT` pod paliwem, obsługę `SUMA: PLN` oraz pomijanie jednostek `SZT` w fallbacku litrów.

---

## Naprawione pliki

| Plik                                                                 | Zmiana                                                                                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/core/services/receipt-ocr.service.ts`      | Normalizacja URI `file://`, ActionSheet aparat/galeria, check/request permissions, obsługa `CameraErrorCode`                                             |
| `apps/car-manager/src/app/core/utils/receipt-parser.util.ts`         | Rekonstrukcja wierszy z `TextBlock[]`, normalizacja artefaktów ML Kit (`+`, `•`, `0BNIŽKA`, spacje po kropce), filtr produktów pozapaliwowych, `OBNIŻKA` |
| `apps/car-manager/src/app/core/services/receipt-ocr.service.spec.ts` | Testy normalizacji ścieżki Androida, uprawnień, galerii i `CameraErrorCode`                                                                              |
| `apps/car-manager/src/app/core/utils/receipt-parser.util.spec.ts`    | Testy rzeczywistego paragonu Orlen (`ENERG VERVA` + `EFECTA DIESEL` + `OBNIŻKA`), artefaktów ML Kit, bloków i `SZT`                                      |

---

## Zweryfikowano przez

- [x] Unit testy przechodzą: `npm exec nx test car-manager`
- [x] Quality check przechodzi: `npm run quality`
- [x] Build przechodzi: `npm exec nx build car-manager`
- [x] Wdrożono APK na podłączony telefon Samsung (`npm run deploy:phone`) oraz zweryfikowano rzeczywisty odczyt ML Kit + parsera na paragonach `paragon_orlen_1.jpeg` i `paragon_orlen_3.jpeg` (`amount: 418.09`, `liters: 60.68`, `isPremium: false`)
