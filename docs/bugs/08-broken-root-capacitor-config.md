# Bug: [08] — Uszkodzony `capacitor.config.ts` w root blokuje `cap sync` i `knip`

## Status

**Naprawiony** — 18.11.2026.

## Objaw

`npm run knip` kończył się błędem:

```
ERROR: Error loading capacitor.config.ts (apps is not defined)
```

Ten sam błąd wywalał Capacitor CLI:

```bash
$ npx cap config
[error] Parsing capacitor.config.ts failed.
        ReferenceError: apps is not defined
        at Object.<anonymous> (capacitor.config.ts:2:1)
```

## Przyczyna

W katalogu głównym repo znajdował się plik `capacitor.config.ts` o zawartości
**36 bajtów** — samo `apps/car-manager/capacitor.config.ts`, bez nowej linii:

```
apps/car-manager/capacitor.config.ts
```

To nie jest konfiguracja Capacitora, tylko przypadkowo zapisana **ścieżka**.
Plik trafił do repo w commicie `aeb7604` (`feat(android): add Capacitor Android
native platform and Google Auth support`).

Node próbuje sparsować ten plik jako TypeScript: `apps/car-manager/capacitor.config.ts`
jest interpretowane jako wyrażenie `apps / car-manager / capacitor.config.ts` →
`ReferenceError: apps is not defined`.

Prawdziwy config istnieje pod `apps/car-manager/capacitor.config.ts` i jest poprawny.

## Wpływ

- **`npm run deploy:android` / `build:android` było zepsute** — `npx cap sync android`
  uruchamiane z roota znajdowało uszkodzony plik i przerywało pracę.
- `npm run knip` (guardrail) kończył się exit 2 — blokowało `npm run quality`.
- Testy, build web i lint **nie** były dotknięte.

## Rozwiązanie

Usunięto uszkodzony plik `capacitor.config.ts` z root. Capacitor CLI poprawnie
odnajduje konfigurację w `apps/car-manager/`.

## Weryfikacja

```bash
npx cap config     # zwraca poprawny obiekt konfiguracji
npm run knip       # exit 0
```

## Zapobieganie

- `npm run quality` (zawiera `knip`) wykrywa ten typ błędu — warto uruchamiać
  przed każdym PR, nie tylko w CI.
- Nie zapisywać ścieżek do plików o rozszerzeniach `.ts`/`.js` w root — narzędzia
  traktują je jako kod.

## Pliki

| Plik                                   | Zmiana                                |
| -------------------------------------- | ------------------------------------- |
| `capacitor.config.ts` (root)           | **usunięty** — zawierał tylko ścieżkę |
| `apps/car-manager/capacitor.config.ts` | bez zmian — to prawdziwy config       |
