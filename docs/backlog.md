# Backlog

Vom Nutzer explizit zurückgestellte Feature-Wünsche — **nur auf direkten
Nutzer-Befehl umsetzen**, nicht im Rahmen der autonomen stündlichen
Routine (die deckt Bugs, Testabdeckung und neuen Lerninhalt ab, keine
neuen Produktfeatures). Jeder Eintrag bleibt hier stehen, bis er entweder
umgesetzt (dann in `docs/ui-ux-audit.md` als Durchgang dokumentiert und
hier entfernt/als erledigt markiert) oder bewusst verworfen wird.

## Offen

### Nachvollziehbare gemerkte Chat-Nachrichten

Der eingebaute Chat (`chatTab.ts`, siehe `docs/csharp-engine-poc.md`-
Nachbarthema "wie der Chat überhaupt läuft") soll eine Möglichkeit bieten,
einzelne Nachrichten zu markieren/speichern, sodass sie später
nachvollziehbar und wiederauffindbar sind — aktuell gibt es nur den
linearen `chatHistory`-Verlauf pro Challenge (`ChatMessage[]` in
`progressModel.ts`), keine Markier-/Merkfunktion.

**Betroffene Dateien (Ausgangspunkt für eine spätere Umsetzung):**
- `src/ui/views/tabs/chatTab.ts` — rendert den Chat-Verlauf.
- `src/domain/progress/progressModel.ts` — `ChatMessage`-Typ und
  `chatHistory`-Speicherung pro Challenge-Fortschritt.
- `src/persistence/localStorageProgressStore.ts` — Persistenz-Schicht,
  müsste ein neues Feld (z. B. `pinned: boolean` pro Nachricht) mit
  speichern.

**Offene Frage für die Umsetzung:** Wo "gemerkte" Nachrichten sichtbar
sein sollen — nur hervorgehoben im normalen Verlauf, oder zusätzlich in
einer eigenen, challenge-übergreifenden Übersicht? Letzteres bräuchte
einen neuen Speicherort außerhalb der pro-Challenge-`chatHistory`.

## Erledigt

### Syntax-Highlighting in Tutorial-Text und Erklärungen (2026-08-09)

Umgesetzt auf direkten Nutzer-Befehl. Neues Modul
`src/ui/render/contentHighlight.ts` (`highlightCodeForTrack` für reinen
Code, `highlightContentHtml` für authored HTML mit eingebetteten
`<pre>`/`<code>`-Blöcken) parst das HTML per DOM, re-rendert jeden
`<pre>`/`<code>`-Textinhalt durch denselben Tokenizer wie der Editor
(`src/editor/languages/{sql,python}/highlight.ts`) und ersetzt die
Farbgebung so, dass sie exakt der Editor-Farbcodierung entspricht.
Angewendet in: `tutorialTab.ts` (Tutorial + Erfolgskriterium),
`hintsSection.ts` (alle drei Tipps), `solutionSection.ts` (Musterlösung +
Syntax-Erklärung). CSS in `themes.css`: die vier betroffenen
`<pre>`/`<code>`-Regeln von einer festen `color: var(--gold)` auf
`color: var(--input-text)` (Editor-Basisfarbe) umgestellt, damit die
neuen `.tok-*`-Spans (bereits vorhandene, globale Klassen) sichtbar
durchscheinen. Bewusst **nicht** angefasst: `pgAskPanel.ts` (der
`extra.pg`-Text mischt Prosa und Code unvorhersehbar, ein naives
Voll-Highlighting hätte deutsche Prosa-Sätze fälschlich als SQL
tokenisiert). Live gegen den echten Dev-Server verifiziert (Desktop und
375px mobil, SQL und Python, keine Konsolenfehler, kein horizontales
Overflow). Details siehe `docs/ui-ux-audit.md`, Durchgang vom 2026-08-09.
