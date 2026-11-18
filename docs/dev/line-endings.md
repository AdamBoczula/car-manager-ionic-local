# Line endings (CRLF vs LF)

## Problem

Na Windows z `core.autocrlf=true` git konwertuje LF → CRLF przy checkoutcie.
Prettier jest skonfigurowany z `endOfLine: "lf"`, a reguła `prettier/prettier`
w ESLint jest ustawiona jako **`error`**. Efekt:

```
✖ 3784 problems (3662 errors, 122 warnings)
   3662 × Delete `␍`  prettier/prettier
```

`npm run lint` i `npm run format:check` kończyły się błędem, a `npm run quality`
był czerwony — **wyłącznie lokalnie**. CI działa na Ubuntu, gdzie git nie
konwertuje line endings, więc CI pozostawało zielone.

## Rozwiązanie

Dodano `.gitattributes`:

```gitattributes
* text=auto eol=lf

# Binary assets must never be converted.
*.png binary
*.apk binary
*.jar binary
# ...

# Windows-only scripts keep CRLF for native tooling compatibility.
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf
```

Reguła `eol=lf` nadpisuje `core.autocrlf` dla plików tekstowych, a `.bat`/`.cmd`
zachowują CRLF, bo wymagają tego natywne narzędzia Windows.

Dodatkowo znormalizowano istniejące pliki w working tree (CRLF → LF).

## Ważne: pliki `.bat` muszą mieć CRLF

Konwersja `android/gradlew.bat` na LF **zepsułaby** build Androida.
`.gitattributes` chroni ten plik regułą `*.bat text eol=crlf`.

Jeśli kiedykolwiek normalizujesz line endings hurtowo, **wyklucz**
`*.bat`, `*.cmd`, `*.ps1` oraz pliki binarne.

## Weryfikacja

```bash
npm run lint          # exit 0
npm run format:check  # exit 0
```

## Uwaga dla współpracowników

Po zmianie `.gitattributes` istniejące klony mogą wymagać odświeżenia:

```bash
git add --renormalize .
git status            # zobacz, co się zmieniło
git commit -m "chore: normalize line endings to LF"
```

Na Linuksie/macOS nic się nie zmienia — problem dotyczy wyłącznie Windows.
