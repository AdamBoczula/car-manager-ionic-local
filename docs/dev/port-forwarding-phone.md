# Port forwarding dev servera na telefon (Chrome)

Uruchomienie aplikacji na fizycznym telefonie w Chrome przez USB, bez wystawiania
serwera dev do sieci Wi-Fi.

## Jak to działa

```
[Chrome na PC]  chrome://inspect
        │
        │  remote debugging
        ▼
[Telefon]  Chrome  ──►  http://localhost:4200
                              │
                              │  adb reverse (USB)
                              ▼
                   [PC]  127.0.0.1:4200  (nx serve car-manager)
```

`adb reverse tcp:4200 tcp:4200` sprawia, że `localhost:4200` **na telefonie**
jest tunelowane przez USB do `127.0.0.1:4200` **na PC**. Serwer dev pozostaje
przywiązany do localhost — nic nie jest wystawione do sieci lokalnej.

## Wymagania

- `adb` w PATH (Android SDK Platform-Tools)
- Telefon: **Opcje programisty → Debugowanie USB** włączone
- Kabel USB obsługujący dane (nie tylko ładowanie)
- Przy pierwszym połączeniu telefon pokaże prompt „Zezolić debugowanie USB?"

## Instalacja adb

```powershell
winget install --source winget --id Google.PlatformTools
```

Po instalacji **zrestartuj terminal** (PATH jest odświeżany przy starcie powłoki).

## Użycie

```bash
npm run dev:phone
```

Skrypt `scripts/dev-phone.mjs` wykonuje:

1. Sprawdza, czy `adb` jest dostępne
2. Czeka na podłączone urządzenie
3. Ustawia `adb reverse tcp:4200 tcp:4200`
4. Uruchamia `nx serve car-manager` (host `localhost`)

Następnie na PC:

1. Otwórz `chrome://inspect/#devices`
2. Poczekaj, aż urządzenie pojawi się na liście
3. Kliknij `inspect` przy karcie z `localhost:4200`

## Ręcznie (bez skryptu)

```bash
# 1. serwer dev
npm start

# 2. w drugim terminalu — tunel
adb reverse tcp:4200 tcp:4200

# 3. weryfikacja
adb reverse --list
```

Na telefonie otwórz `http://localhost:4200` w Chrome.

## Chrome z debugowaniem

`chrome://inspect` wymaga Chrome uruchomionego z `--remote-debugging-port`.
Uruchomienie **istniejącej** instancji Chrome z tą flagą nie działa — Chrome
ignoruje flagę, jeśli proces już działa. Potrzebny jest osobny profil:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\oc-chrome-debug" `
  "chrome://inspect/#devices"
```

Osobny `--user-data-dir` jest konieczny: Chrome dopuszcza debugowanie tylko dla
instancji, która wystartowała z tą flagą i własnym profilem. Dzięki temu Twoje
zwykłe okno Chrome pozostaje nietknięte (otwarte karty, sesje logowania).

## Rozwiązywanie problemów

| Objaw                              | Przyczyna                            | Rozwiązanie                                   |
| ---------------------------------- | ------------------------------------ | --------------------------------------------- |
| `adb devices` puste                | Brak sterownika / debug USB off      | Zainstaluj sterownik Samsung; włącz debug USB |
| Urządzenie `unauthorized`          | Nie zaakceptowano promptu            | Odblokuj telefon, zaakceptuj „Zezolić"        |
| `error: device not found`          | Brak `adb reverse`                   | `adb reverse tcp:4200 tcp:4200`               |
| Strona nie ładuje się na telefonie | Dev server nie działa                | Sprawdź `npm start`                           |
| `chrome://inspect` puste           | Chrome bez `--remote-debugging-port` | Uruchom z flagą i osobnym `--user-data-dir`   |
| `USB Composite Device` — Code 10   | Zły/brak sterownika Windows          | Zainstaluj sterownik Samsung USB              |

### Sprawdzenie stanu urządzenia

```powershell
Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like '*VID_04E8*' } |
  Select-Object Status, FriendlyName, InstanceId
```

`VID_04E8` = Samsung. Status `Error` z kodem 10 oznacza, że Windows nie potrafi
uruchomić sterownika — `adb` nie zobaczy telefonu, dopóki to nie zostanie naprawione.

## Alternatywa: dostęp przez Wi-Fi

Jeśli USB jest niedostępne, dev server można wystawić do sieci:

```bash
npx nx serve car-manager --host 0.0.0.0 --allowed-hosts all
```

Na telefonie otwórz `http://<IP-PC>:4200`. **Uwaga:** serwer dev staje się
wtedy dostępny dla każdego w sieci Wi-Fi, a `--allowed-hosts all` wyłącza
ochronę przed DNS rebinding. Używaj tylko w zaufanej sieci.
