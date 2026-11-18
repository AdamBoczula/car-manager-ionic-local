# Bug: [05] — Bottom sheet „Dodaj auto” ucieka poza ekran (nie da się zapisać)

**Status:** 🟢 Naprawiony
**Data zgłoszenia:** 2026-11-17
**Data naprawy:** 2026-11-17
**Priorytet:** P0 (krytyczny)
**Typ:** Błąd konfiguracji UI (Ionic sheet modal)

---

## Objawy

**Zachowanie rzeczywiste (BUG):**

Arkusz dolny (bottom sheet) „Dodaj nowe auto" otwiera się, ale przycisk
**„Dodaj auto"** w `ion-footer` znajduje się **poza ekranem** i nie da się do niego
przewinąć ani doprowadzić gestem. Użytkownik nie jest w stanie dodać nowego auta
na telefonie.

Analogicznie zachowuje się arkusz „Edytuj auto" (przycisk „Zapisz").

**Zachowanie oczekiwane:**

Po otwarciu arkusza przycisk zapisu jest osiągalny — arkusz można rozsunąć
(gest lub scroll), a zawartość przewija się, gdy nie mieści się na ekranie.

---

## Kroki do reprodukcji

1. Zaloguj się, otwórz `/dashboard`
2. Kliknij przełącznik auta w headerze → „Dodaj auto"
3. **Rezultat:** arkusz otwiera się na breakpoincie `0.55`, przycisk „Dodaj auto"
   jest ~294 px poniżej dolnej krawędzi ekranu; nie da się go dotknąć

Zmierzone na viewportcie `390 × 664` (typowy telefon):

| Element                              | Wartość           |
| ------------------------------------ | ----------------- |
| Wysokość viewportu                   | `664 px`          |
| Wrapper arkusza (top → bottom)       | `304 px → 958 px` |
| Przycisk „Dodaj auto" (top → bottom) | `912 px → 948 px` |
| Nadwyżka poza ekranem                | **`294 px`**      |

---

## Root Cause Analysis

**Przyczyna techniczna:**

Arkusz był zdefiniowany z jednym breakpointem otwarcia i **bez żadnego wyższego
breakpointu, do którego mógłby się rozsunąć**:

```html
<ion-modal [initialBreakpoint]="0.55" [breakpoints]="[0, 0.55]"></ion-modal>
```

Ionic implementuje sheet modal przez przesunięcie wrappera o
`(1 - breakpoint) * 100%` jego wysokości (`translateY`). Wysokość wrappera to
`calc(100% - 10px)` = `654 px`, więc przy `0.55` widoczne jest jedynie
`0.55 × 654 ≈ 360 px`, a wrapper zostaje przesunięty o `≈ 294 px` w dół.

Zawartość arkusza (header + 4 pola + footer) ma ~`542 px`, czyli **więcej niż
widoczne 360 px**. Ponieważ dostępne były tylko breakpointy `[0, 0.55]`, jedyną
alternatywą dla otwarcia było **zamknięcie arkusza** — nie istniał stan
„większy niż 0.55". Stąd brak możliwości rozsunięcia i brak dostępu do stopki.

**Dlaczego `expandToScroll` nie pomagał:** mechanizm ten rozwija arkusz do
_następnego_ breakpointu. Przy `[0, 0.55]` następnym jest `0`, więc scroll/gest
prowadził donikąd.

**Dlaczego to nie dotyczy tankowania i naprawy:** formularze
`/refuel-form` i `/repair-form` to **osobne strony** z `ion-footer`
(przyciski „Zapisz tankowanie" / „Zapisz naprawę"), a nie arkusze dolne —
na viewportcie `390 × 664` ich przyciski są w pełni widoczne
(y ≈ `616–618 px`, wysokość `36 px`). `car-switcher` jest jedynym
`ion-modal` w aplikacji, więc problem był punktowy, nie globalny.

**Rozwiązanie:**

Dodanie wyższych breakpointów, do których arkusz może się rozsunąć:

```html
<ion-modal [initialBreakpoint]="0.55" [breakpoints]="[0, 0.55, 0.9, 1]"></ion-modal>
```

Po rozsunięciu do `1` przycisk ląduje na `y = 618 px` — w całości na ekranie.
Działa zarówno przez API (`setCurrentBreakpoint(1)`), jak i przez naturalny
gest przeciągnięcia uchwytu w górę.

**Naprawione pliki:**

| Plik                                                                                | Zmiana                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/car-manager/src/app/shared/components/car-switcher/car-switcher.component.ts` | breakpointy arkusza „Dodaj auto": `[0, 0.55]` → `[0, 0.55, 0.9, 1]`; „Edytuj auto": `[0, 0.6]` → `[0, 0.6, 0.9, 1]` |

**Test regresyjny:**

`apps/car-manager-e2e/src/car-switcher-sheet.spec.ts` — sprawdza, że po rozsunięciu
arkusza przycisk „Dodaj auto" znajduje się w całości w viewportcie (widok `390 × 664`).

---

## Zapobieganie

- Każdy `ion-modal` z `breakpoints` **musi** zawierać breakpoint ≥ `0.9`,
  jeśli zawiera `ion-footer` z akcją — inaczej stopka może wypaść poza ekran.
- Preferuj `--height: auto` dla arkuszy o zmiennej wysokości treści.
- Weryfikuj arkusze na niskich viewportach (`390 × 664`, `360 × 640`).
