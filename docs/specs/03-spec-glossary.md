# Spec Glossary

Last updated: 2026-11-01

Słownik pojęć używanych w procesie Spec-Driven Development.

## Pojęcia podstawowe

| Pojęcie                 | Skrót | Definicja                                                                                             |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| **Spec**                | —     | Plik specyfikacji w `docs/specs/`, opisujący feature od strony biznesowej i technicznej               |
| **Use Case**            | UC    | Jeden przypadek użycia – sekwencja kroków użytkownika prowadząca do konkretnego rezultatu             |
| **Acceptance Criteria** | AC    | Testowalne kryterium akceptacji w formacie Given/When/Then. Każde AC musi mieć co najmniej jeden test |
| **Edge Case**           | —     | Nietypowa sytuacja (np. pusta baza, brak sieci, duplikat) z opisem oczekiwanego zachowania            |
| **Scope**               | —     | Zakres feature'a – co wchodzi, a co jest poza (out of scope)                                          |
| **Precondition**        | —     | Warunek który musi być spełniony przed rozpoczęciem UC                                                |
| **Postcondition**       | —     | Stan systemu po pomyślnym zakończeniu UC                                                              |

## Role w SDD

| Rola                        | Odpowiedzialność                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Analityk biznesowy (BA)** | Zbiera wymagania, tworzy speca (sekcje: Cel, Scope, UC, Edge Cases, AC, Model danych, UI/UX, Offline) |
| **Architekt**               | Projektuje strukturę techniczną (sekcje: Architektura, Flow danych, Dotknięte moduły)                 |
| **Developer**               | Tworzy plan implementacji i implementuje kod (TDD)                                                    |
| **Tester (QA)**             | Tworzy testy E2E, odpala quality gate, raportuje regresję                                             |
| **QA Coordinator**          | Orkiestruje przegląd UI/UX/A11y/Responsive, generuje zunifikowany raport QA                           |
| **UI Reviewer**             | Analizuje spójność wizualną, layout, typografię, stany komponentów Ionic                              |
| **UX Analyzer**             | Ocenia user experience, heurystyki Nielsena, efektywność kliknięć                                     |
| **A11y Auditor**            | Audytuje dostępność WCAG 2.1 AA, Axe-core, ARIA, nawigację klawiaturą                                 |
| **Responsive Checker**      | Testuje viewporty, touch targety, adaptację layoutu na różnych urządzeniach                           |

## Śladowalność (Traceability)

| Pojęcie            | Definicja                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| **Trace link**     | Powiązanie między specyfikacją a implementacją                                  |
| **Forward trace**  | Od speca do kodu: "Które pliki implementują AC-3?"                              |
| **Backward trace** | Od kodu do speca: "Który spec definiuje ten plik?"                              |
| **Adnotacja**      | Komentarz w kodzie: `// spec: docs/specs/.../file.md` lub `// covers: ...#AC-1` |
| **Coverage gap**   | AC które nie ma żadnego testu z adnotacją `// covers:`                          |

## Statusy speca

| Status        | Definicja                                                   |
| ------------- | ----------------------------------------------------------- |
| `draft`       | Spec w trakcie tworzenia przez analityka, niezatwierdzony   |
| `confirmed`   | Spec zatwierdzony przez użytkownika, gotowy do architektury |
| `implemented` | Kod i testy gotowe, quality gate przeszedł                  |

## Formaty

### Adnotacja w pliku kodu

```typescript
// spec: docs/specs/<domain>/<name>.md
// uc: UC-1, UC-3
```

### Adnotacja w teście

```typescript
// covers: docs/specs/<domain>/<name>.md#AC-1
it('should calculate consumption from two refuels', () => { ... });
```

### Referencja między specami

```markdown
## Zależności

- `docs/specs/refuel/add-refuel.md` (używa tego samego modelu danych)
```

## Domeny

| Domena      | Folder w `docs/specs/`  | Przykładowe feature'y                                        |
| ----------- | ----------------------- | ------------------------------------------------------------ |
| `refuel`    | `docs/specs/refuel/`    | Dodawanie, edycja, usuwanie tankowań, wyliczanie spalania    |
| `repair`    | `docs/specs/repair/`    | Dodawanie, edycja, usuwanie napraw, speech-to-text           |
| `dashboard` | `docs/specs/dashboard/` | Podsumowanie miesięczne, szybkie akcje, mini wykres spalania |
| `auth`      | `docs/specs/auth/`      | Logowanie (email + Google), rejestracja, wylogowanie         |
| `pwa`       | `docs/specs/pwa/`       | Offline, service worker, instalacja PWA, Capacitor build     |
| `settings`  | `docs/specs/settings/`  | Profil użytkownika, współdzielenie auta, konfiguracja        |
