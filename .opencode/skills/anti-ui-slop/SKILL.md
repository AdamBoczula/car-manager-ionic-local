---
description: Anti-UI-Slop dla Car Manager. Zapobiega generowaniu generycznego UI przez AI. Wymusza spójność z design systemem Ionic, SCSS+iONIC CSS vars, i istniejącymi komponentami Car Manager. USE WHEN tworzysz nowy komponent, redesign, review UI.
mode: subagent
tools:
  - read
  - glob
  - grep
---

# Anti-UI-Slop — Stop Generycznemu UI

**Nie pozwól AI generować generycznych interfejsów w Car Manager.**

Każdy nowy komponent musi pasować do istniejącego design systemu, używać
Ionic Framework (`<ion-*>`) zgodnie z dotychczasowymi wzorcami i respektować konwencje
SCSS + Ionic CSS vars używane w projekcie.

## Kontekst Design Systemu Car Manager

- **Framework:** Ionic (ion-card, ion-list, ion-item, ion-input, ion-button, ion-toolbar, ion-content, ion-modal)
- **Styl:** SCSS + BEM (`&__element`, `&--modifier`)
- **Pliki styli:** `styleUrl: './*.component.scss'` — NIGDY inline `styles`
- **Kolorystyka:** Angular Material theme + custom properties
- **Typografia:** Angular Material typography scale
- **Komponenty:** Container/Presenter pattern, inline template, osobny SCSS
- **Layout:** CSS Grid + Flexbox, Angular Material grid

## Zasady

### Pracuj z produktu, nie z trendu

Zanim zaprojektujesz nowy komponent, przeczytaj:
1. Istniejące komponenty w tym samym feature module
2. Reusable UI w `libs/*/ui-*`
3. Jak inne komponenty używają Angular Material
4. Istniejące wzorce SCSS w podobnych komponentach

**NIGDY nie wymyślaj nowego design systemu.** Rozszerzaj istniejący.

### Nowy komponent — checklista

- [ ] Używa istniejących komponentów Angular Material
- [ ] Template jest inline (`template: \`...\``)
- [ ] Style są w osobnym pliku SCSS (`styleUrl: './*.component.scss'`)
- [ ] Nazewnictwo BEM: `&__element`, `&--modifier`
- [ ] Container/Presenter pattern (jeśli jest z danymi)
- [ ] Wszystkie stany: loading, empty, error, success
- [ ] Responsywność strukturalna (nie tylko skalowanie)
- [ ] Dostępne: kontrast, labelki, fokus, aria
- [ ] i18n: wszystkie stringi przez `@@` lub `i18n` atrybuty

### Review UI — checklista

- [ ] Czy komponent wygląda jak reszta aplikacji?
- [ ] Czy używa tych samych komponentów Material?
- [ ] Czy spacing, typografia, kolory są spójne?
- [ ] Czy BEM jest poprawny?
- [ ] Czy style nie wyciekają poza komponent?
- [ ] Czy są wszystkie stany (loading, empty, error)?
- [ ] Czy układ nie psuje się na mobile (< 768px)?

## Anti-patterny — NIGDY tego nie rób

| Złe | Dobre |
|-----|-------|
| Wymyślanie własnych kontrolek | Używaj MatDialog, MatFormField, MatTable |
| Inline styles | `styleUrl: './*.component.scss'` |
| Inne nazewnictwo CSS | Tylko BEM (`&__element`, `&--modifier`) |
| Generyczny "ładny" design | Spójny z resztą aplikacji |
| Nowa kolorystyka | Używaj theme variables |
| Brak stanów pustych/ładowania | Każdy komponent z danymi ma loading + empty state |
| Pomijanie i18n | Każdy string użytkownika przez `@@` |

## Finish Gate

Po stworzeniu komponentu zweryfikuj:
1. Czy użyto istniejących komponentów Material?
2. Czy style są w SCSS, nie inline?
3. Czy BEM jest poprawny?
4. Czy komponent pasuje wizualnie do reszty?
5. Czy stany są pokryte?
6. Czy i18n jest zrobione?