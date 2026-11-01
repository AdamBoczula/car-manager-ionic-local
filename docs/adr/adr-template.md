# ADR-<NNN>: <Tytuł decyzji>

- **Status:** proposed | accepted | deprecated | superseded
- **Date:** YYYY-MM-DD
- **Deciders:** [lista osób/decydentów]
- **Supersedes:** ADR-<NNN> (jeśli dotyczy)
- **Superseded by:** ADR-<NNN> (jeśli dotyczy)

## Kontekst

[Opisz problem lub potrzebę, która wymaga podjęcia decyzji architektonicznej.
Co jest siłą napędową tej decyzji? Jakie są ograniczenia (techniczne, biznesowe, czasowe)?]

## Decyzja

[Krótko opisz podjętą decyzję – co zostało wybrane i dlaczego.]

## Rozważane alternatywy

### Alternatywa 1: [Nazwa]

- **Opis:** [Krótki opis rozwiązania]
- **Plusy:**
  - [Zaleta 1]
  - [Zaleta 2]
- **Minusy:**
  - [Wada 1]
  - [Wada 2]
- **Dlaczego odrzucono:** [Powód odrzucenia]

### Alternatywa 2: [Nazwa]

- **Opis:** [Krótki opis rozwiązania]
- **Plusy:**
  - [Zaleta 1]
- **Minusy:**
  - [Wada 1]
- **Dlaczego odrzucono:** [Powód odrzucenia]

## Konsekwencje

### Pozytywne

- [Co zyskujemy dzięki tej decyzji]
- [Łatwiejsze do zrobienia, szybsze, bezpieczniejsze itp.]

### Negatywne

- [Co tracimy lub co staje się trudniejsze]
- [Potencjalne ryzyka, dług technologiczny]

### Neutralne / warte odnotowania

- [Rzeczy, które warto wiedzieć, ale nie są bezpośrednio plusem/minusem]

## Diagramy

[Diagramy architektoniczne w formacie Mermaid – opcjonalna sekcja.
Używaj gdy diagram lepiej wyjaśnia strukturę, flow danych lub zależności.]

```mermaid
<!-- Przykład: diagram sekwencji -->
sequenceDiagram
    participant A as Komponent A
    participant B as Serwis B
    A->>B: wywołanie metody()
    B-->>A: odpowiedź
```

```mermaid
<!-- Przykład: diagram komponentów / architektury -->
graph TD
    A[Komponent A] --> B[Service]
    B --> C[Ionic Storage]
    B --> D[Firestore]
```

## Powiązane

- [Link do speca: `docs/specs/<domain>/<name>.md`]
- [Link do innego ADR: `docs/adr/<NNN>-<title>.md`]
- [Link do dokumentacji technicznej]