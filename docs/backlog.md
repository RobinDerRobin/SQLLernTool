# Backlog

Vom Nutzer explizit zurückgestellte Feature-Wünsche — **nur auf direkten
Nutzer-Befehl umsetzen**, nicht im Rahmen der autonomen stündlichen
Routine (die deckt Bugs, Testabdeckung und neuen Lerninhalt ab, keine
neuen Produktfeatures). Jeder Eintrag bleibt hier stehen, bis er entweder
umgesetzt (dann in `docs/ui-ux-audit.md` als Durchgang dokumentiert und
hier entfernt/als erledigt markiert) oder bewusst verworfen wird.

## Offen

### Syntax-Highlighting in Tutorial-Text und Erklärungen

Code-Beispiele in `tutorial` (Tutorial-Tab) und `syntaxExplanation`
(Lösungs-Erklärung im Task-Tab) sind aktuell rohes, unstyled HTML
(`<pre>`/`<code>`-Blöcke, siehe `tutorialTab.ts`s eigener Kommentar dazu)
— keine Farbcodierung, obwohl der Editor selbst (`textarea.editor` +
`.highlight-layer`) für SQL/Python bereits einen echten Tokenizer mit
Syntax-Highlighting hat (`src/editor/languages/`).

Gewünscht: dieselbe Farbcodierung wie im Editor auch für die
Code-Beispiele in Tutorial und Erklärungen anwenden — sowohl für
mehrzeilige `<pre>`-Blöcke als auch für einzelne inline `<code>`-Wörter,
die einzelne Sprachelemente benennen (z. B. "das Schlüsselwort
<code>WHERE</code>").

**Betroffene Dateien (Ausgangspunkt für eine spätere Umsetzung):**
- `src/ui/views/tabs/tutorialTab.ts` — rendert `tutorial` roh als HTML.
- `src/ui/views/tabs/taskTab/solutionSection.ts` — rendert
  `syntaxExplanation` roh als HTML.
- `src/editor/languages/` — enthält die bereits vorhandenen Tokenizer für
  SQL und Python, die für den Editor selbst schon funktionieren; die
  gleiche Logik müsste auf Text innerhalb von `<pre>`/`<code>` in
  authored HTML angewendet werden, nicht nur auf den Editor-Inhalt.
- Alle Content-Dateien unter
  `src/content/tracks/*/courses/*/challenges/*.ts` — Quelle der
  `tutorial`/`syntaxExplanation`-Strings.

**Offene Fragen für die Umsetzung:** Inline-`<code>`-Wörter sind oft kein
vollständiges, syntaktisch gültiges Code-Fragment (z. B. nur ein einzelnes
Schlüsselwort) — der Tokenizer müsste robust genug für Teilausschnitte
sein, oder es braucht eine einfachere wortweise Klassifizierung statt des
vollen Editor-Tokenizers für diesen Fall. Track-Auswahl (SQL vs. Python vs.
künftig C#) muss pro Challenge korrekt an den richtigen Tokenizer
weitergereicht werden.

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
