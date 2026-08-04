# Challenge-Anforderungen

Dieses Dokument wird im Code an mehreren Stellen per Abschnittsnummer
zitiert (`src/content/schema.ts`, `src/runtime/sql/prepareChallenge.ts`,
`src/runtime/python/README.md`, mehrere Challenge-Dateien), existierte aber
nie — auch nicht im Initial-Commit. Rekonstruiert aus dem, was der Code
tatsächlich bereits durchsetzt (Schema, Runner-Suite, Prereq-Replay), plus
den Kriterien aus der Konzept-Hierarchie-Planung
([`sql-concept-hierarchy.md`](sql-concept-hierarchy.md),
[`python-concept-hierarchy.md`](python-concept-hierarchy.md),
[`csharp-concept-hierarchy.md`](csharp-concept-hierarchy.md)), die dieselbe
Tag-Granularität voraussetzen.

**Leitprinzip:** Wer Challenges schreibt, muss sie nicht selbst als Experte
prüfen können — die Prüfung soll mechanisch sein, wo immer möglich
(Schema, Ausführung, Distraktoren), und nur dort auf Urteil angewiesen, wo
Mechanik echt nicht ausreicht (Ton, didaktische Reihenfolge).

## 1. Pflichtfelder

Jede Challenge (`BaseChallenge<TEngine, TResult, TExtra>`,
`src/domain/challenge.types.ts`) muss enthalten:

| Feld | Zweck |
|---|---|
| `num` | Eindeutige ID, auch für `prereqNums`-Referenzen |
| `title` | Kurztitel |
| `tutorial` | Erklärender Text — siehe Abschnitt 3 für Sprachanforderungen |
| `task` | Die eigentliche Aufgabenstellung — siehe Abschnitt 4 |
| `hints` | **Exakt 3**, aufsteigend konkret — siehe Abschnitt 2 |
| `solution` | Referenzlösung, wird vom Challenge-Runner (Abschnitt 10) automatisch gegen `validate` geprüft |
| `syntaxExplanation` | Syntax-Aufschlüsselung der Lösung |
| `successCriteria` | Für den Nutzer sichtbare Erfolgsbedingung |
| `validate` | `(engine, lastResult) => { ok, message }` |
| `extra` | Track-spezifische Zusatzfelder — siehe Abschnitt 9 |

Optional: `setup` (wird bei jedem Öffnen/Reset automatisch ausgeführt),
`prereqNums` (siehe Abschnitt 5), `prereqNote`, `nondeterministic` (siehe
Abschnitt 10). Durchgesetzt von `baseChallengeSchema`
(`src/content/schema.ts`) — track-agnostisch; jeder Track erweitert es per
`.extend()` um seine eigenen `extra`-Felder.

## 2. Hints: aufsteigende Konkretheit

Genau drei, mechanisch erzwungen (`z.tuple([...])`, nicht nur Konvention).
Die drei Stufen haben unterschiedliche Aufgaben, kein beliebiges
Umformulieren derselben Information:

1. **Denkanstoß** — erinnert an das relevante Konzept/Tag, ohne Syntax zu
   verraten.
2. **Konkretisierung** — nennt die relevante Syntax oder den Baustein, aber
   nicht die vollständige Lösung.
3. **Fast die Lösung** — zeigt i. d. R. Code (meist als `<pre>`-Block), lässt
   höchstens noch eine Kleinigkeit offen.

Ein Hint-Satz, der bei Stufe 3 nicht spürbar konkreter ist als bei Stufe 1,
ist ein Qualitätsmangel — mechanisch schwer prüfbar, daher Teil der
Stichprobe (Abschnitt 16), nicht der automatischen Gates.

## 3. Tutorial-Text: sprachliche Anforderungen

- **Fachbegriff-Timing:** Ein Fachbegriff darf im Tutorial-Text erst
  auftauchen, wenn er in einer *früheren* Challenge derselben Kursreihenfolge
  bereits **explizit benannt und definiert** wurde — nicht schon, wenn das
  zugrundeliegende Konzept nur geübt, aber nie benannt wurde (Beispiel:
  `logical-operators`/`dynamic-typing` werden laut den Konzept-Hierarchie-
  Dokumenten durchgehend demonstriert, aber nie explizit benannt — ihr
  Fachbegriff ist bis zur ersten expliziten Nennung nicht "verdient").
  Maßgeblich ist die **Kursreihenfolge**, nicht die DAG-Ordnung — ein Tag
  kann im Graphen Vorfahre sein und trotzdem erst später im Kurs
  drankommen (Kursreihenfolge ≠ Graph, siehe Prinzip 1.5 im SQL-Dokument).
- **Absolute Grundbegriffe sind ausgenommen.** Dinge wie "Datei",
  "ausführen", "Text", "Zahl" brauchen keine Einführung — die Timing-Regel
  gilt für Fachbegriffe des jeweiligen Sprach-/Tool-Konzeptraums, nicht für
  allgemeines Weltwissen.
- **Begriffs-Glossar statt freier Übersetzung.** Ein Tag bekommt genau eine
  deutsche Bezeichnung, konsistent über alle Tutorials hinweg (nicht mal
  "Bedingung", mal "Ausdruck" für dieselbe Sache).
- **Symbol-Wiederverwendung explizit machen.** Wenn ein Zeichen in einem
  neuen Kontext etwas anderes bedeutet als zuvor gelernt (`%` als Modulo vs.
  `%` als LIKE-Platzhalter; `<>` als Ungleich-Operator vs. `<T>` als
  Generics-Syntax), muss das Tutorial die Verwechslungsgefahr benennen,
  nicht nur die neue Bedeutung.
- **Cross-Language-Fallen aktiv ansprechen**, nicht nur zufällig positive
  Parallelen (wie Challenge 05 im Python-Track, das `if`/`elif`/`else`
  bereits über SQLs `CASE WHEN` erklärt). Wo eine Sprache eine andere naive,
  aus einer vorherigen Sprache mitgebrachte Intuition widerlegt (`==` bei
  Strings, `NULL` vs. `0`/`""`, dynamische vs. statische Typisierung),
  gehört das in den Tutorial-Text der Challenge, die zuerst darauf trifft.
- **Ein bis zwei neue Fachbegriffe pro Challenge**, nicht mehr — deckt sich
  mit der bereits beobachteten Praxis (Prinzip 1.6 im SQL-Dokument: nicht
  jede Challenge führt neue Tags ein, manche sind reine Integration).
- **Kurze Sätze, aktiv formuliert**, eine Idee pro Satz — unabhängig vom
  Fachvokabular ist Schachtelsatz-Komplexität ein eigener Verständnis-
  Hemmschuh.

## 4. Aufgabenstellung (`task`): Eindeutigkeit

Jede Entscheidung, die die Lösung beeinflusst, muss explizit in der
Aufgabenstellung stehen — nicht implizit vorausgesetzt. "Sortiere die
Liste" ist unvollständig (aufsteigend? nach welchem Feld?); "Sortiere die
Liste aufsteigend nach Preis" ist vollständig. Ein Nutzer, der die
Aufgabenstellung wörtlich, aber ohne Kontextwissen liest, muss auf genau
eine erwartete Lösung schließen können.

## 5. `prereqNums`: strukturierte Abhängigkeiten

Ersetzt ein früheres freitextliches `prereq`-Feld, das an Session-Verlauf
gebunden war (Bug: eine Challenge, die eine Tabelle aus einer *früheren*
Challenge voraussetzte, aber das nirgends deklarierte, funktionierte nur,
wenn der Nutzer zufällig in der richtigen Reihenfolge geklickt hatte — siehe
Abschnitt 11). `prereqNums: string[]` referenziert Challenge-`num`s
explizit; `prepareChallenge()` (`src/runtime/sql/prepareChallenge.ts`)
löst die Abhängigkeitskette auf und materialisiert sie deterministisch, egal
in welcher Reihenfolge der Nutzer Challenges tatsächlich geöffnet hat.

**Jede Abhängigkeit auf vorher existierenden Zustand (Tabellen, Variablen,
Definitionen) muss über `prereqNums` und/oder `setup` deklariert sein** —
niemals stillschweigend vorausgesetzt. Der Challenge-Runner (Abschnitt 10)
öffnet jede Challenge auf einem frischen Engine und deckt undeklarierte
Abhängigkeiten dadurch automatisch auf.

## 6. `extra`: track-spezifische Felder

Jeder Track erweitert `baseChallengeSchema` um sein eigenes `extra`-Schema
(z. B. `sqliteChallengeExtraSchema` mit `pg`). Neue Tracks (Python, künftig
C#) fügen nur hinzu, was für sie sinnvoll ist — kein Feld eines anderen
Tracks wird wiederverwendet, nur weil es zufällig ähnlich aussieht (siehe
Abschnitt 9 zur Placeholder-Regel).

## 7. Qualitätskriterien-Katalog

Verdichteter Rubrik, gegen den jede neue Challenge geprüft wird (mechanisch
wo möglich, sonst Stichprobe — siehe Abschnitt 16):

| Kriterium | Prüfbar durch |
|---|---|
| Korrektheit | Gate 1 — Referenzlösung läuft und besteht `validate` (Abschnitt 10) |
| Validität | Gate 2 — Distraktoren fallen durch (Abschnitt 12) |
| Eindeutigkeit | Mehrere stilistisch unterschiedliche korrekte Lösungen bestehen `validate` |
| Scope-Treue | Testet genau die geplanten Tag(s), keine versteckten zusätzlichen |
| Level-Kalibrierung | Schwierigkeit passt zum DAG-Level (Abschnitt 15) |
| Feedback-Qualität | `validate`-Message zeigt auf die tatsächliche Lücke, nicht nur "falsch" |
| Sprachliche Präzision | Abschnitt 3 |
| Stilkonsistenz | Stichprobe gegen bestehende Challenges |

## 8. Validierungs-Design: pro Track vorab entscheiden

**Vor** dem Schreiben von Content für einen Track festlegen, wonach
`validate` prüft — das ist die teuerste Fehlentscheidung, um sie im
Nachhinein zu korrigieren, weil sie jede einzelne Challenge betrifft. SQL
prüft Datenbankzustand nach Ausführung; Python kann auf `stdout`, auf
Rückgabewerte oder auf definierte Funktionen/Variablen prüfen (siehe
`lastResult.variables`/`lastResult.stdout` in den bestehenden Python-
Challenges). Für nondeterministische Challenges (z. B. `RANDOM()`) gilt:
großzügige, aber nicht beliebige Grenzen — Challenge 12 akzeptiert 5–45 von
100 Zeilen für ein ~20 %-Ziel, nicht exakt 20, weil `RANDOM()` das nie exakt
träfe, aber auch nicht jeden Wert, weil das die Bedingung entwerten würde.

## 9. Keine Platzhalter in `extra`-Feldern

`extra`-Felder (z. B. `pg`) müssen echten, spezifischen Inhalt haben — ein
leerer String oder eine generische Phrase wie "identisch" ohne Begründung
zählt als Platzhalter und wird vom Schema abgelehnt (`z.string().min(1)`
reicht dafür nicht allein — Review-Pflicht bei der Formulierung).

## 10. Automatisiertes Gate 1: Challenge-Runner

`test/content/challengeRunner.test.ts` ersetzt das, was früher ein
manuelles QA-Skript gewesen wäre: für jede Challenge, auf einem frischen
Engine, die Voraussetzungskette deterministisch materialisieren
(`prepareChallenge`), die eigene `solution` ausführen und die *echte*
`validate`-Funktion prüfen — niemals eine nachgebaute Kopie der Logik.
Nondeterministische Challenges laufen 10× (`REPS_FOR_NONDETERMINISTIC`),
jeder Durchlauf muss bestehen. Ein frischer Engine pro Durchlauf ist
bewusst so gewählt: er beweist, dass die Prereq-Kette auch **standalone**
funktioniert, nicht nur, wenn Challenges zufällig in Kursreihenfolge in
derselben Session geöffnet werden (siehe Abschnitt 11).

**Jede neue Challenge muss diesen Gate automatisch mitlaufen** — sie wird
einfach der jeweiligen Course-Datei hinzugefügt, `challengeRunner.test.ts`
iteriert die Registry (`src/content/registry.ts`) und braucht keine
manuelle Ergänzung pro Challenge.

## 11. Warum `prereqNums` statt Session-Verlauf

Die frühere, freitextliche `prereq`-Angabe war nicht maschinell auflösbar
und funktionierte nur zufällig, wenn der Nutzer Challenges in der "richtigen"
Reihenfolge geöffnet hatte. `prepareChallenge` behebt das strukturell:
Voraussetzungen werden bei jedem Öffnen/Reset aus den `num`-Referenzen neu
aufgelöst und materialisiert (Ancestor-`setup`+`solution` in
Abhängigkeitsreihenfolge, gemeinsame Vorfahren nur einmal), nie aus dem
bisherigen Sitzungszustand abgeleitet.

## 12. Automatisiertes Gate 2 (neu, noch nicht implementiert): Distraktor-Batterie

Existiert noch nicht im Code — das ist die konkrete Lücke, die eine Person
beim manuellen Review schließen würde, wenn sie das Konzept schon
beherrschte. Ziel: für jede Challenge 2–4 plausible **Fast-Lösungen**
hinterlegen, die das geplante Tag *nicht* beherrschen, aber naheliegend
falsch sind (z. B. bei `WHERE` vs. `HAVING`: eine Lösung mit der falschen
Klausel, die zufällig dieselbe Zeilenzahl liefert). Ein neuer Runner
(Erweiterung von `challengeRunner.test.ts` oder eigene Datei) führt jeden
Distraktor gegen `validate` aus und **erwartet `ok: false`**. Schlägt ein
Distraktor nicht fehl, testet die Challenge nicht das behauptete Tag,
sondern etwas Schwächeres (z. B. nur Zeilenanzahl statt tatsächlicher
Klausel-Semantik) — mechanisch feststellbar, ohne dass die prüfende Person
das Konzept selbst schon verstanden haben muss. Vorschlag für das Schema:
ein optionales Feld `distractors: readonly { code: string; reason: string }[]`
auf `BaseChallenge`, `reason` als Dokumentation, welches Missverständnis
simuliert wird (füttert zugleich die Missverständnis-Bibliothek aus
Abschnitt 14).

## 13. Level-Teilung ist zulässig

Mehrere Challenges dürfen auf demselben DAG-Level liegen — es gibt keine
Regel "ein Level, eine Challenge". Das Level beschreibt Abhängigkeitstiefe,
nicht Kurs-Kapazität pro Stufe.

## 14. Festigungs-Challenges sind erwünscht

Eine Challenge muss kein neues Tag einführen, um wertvoll zu sein — auch
Aufgaben, die ausschließlich bereits eingeführte Tags/Begriffe wiederholen
oder in leicht neuer Kombination üben, sind ausdrücklich Teil des Contents
(nicht nur toleriert, siehe bereits Prinzip 1.6 im SQL-Dokument zur
Integrations-Challenge 08). Solche Challenges brauchen keinen neuen
Tutorial-Abschnitt, wenn sie kein neues Vokabular einführen.

## 15. Sonstige Verständnishürden (Katalog für Abschnitt 3/7)

- **Kognitive Last:** max. 1–2 neue Fachbegriffe pro Challenge (siehe
  Abschnitt 3), unabhängig davon, ob Timing-Regel eingehalten ist.
- **Fehlermeldungen als eigener Vermittlungskanal:** Was der Nutzer bei
  einer fehlgeschlagenen `validate`-Prüfung sieht, unterliegt denselben
  Anforderungen wie Tutorial-Text — keine durchgereichten Roh-Fehler
  (Stacktraces, interne Ausnahmen) ohne Übersetzung in verständliche
  Sprache.
- **Bedeutungsvolle Beispieldaten:** Variablennamen/Testdaten in Setup und
  Lösung sollten dem Kontext der Aufgabe entsprechen (`punkte`, `farben`),
  nicht `foo`/`x`/`a`, wenn nicht der Name selbst irrelevant für das Tag ist.
- **Missverständnis-Bibliothek:** dieselbe Sammlung typischer Fehlannahmen,
  die Abschnitt 12 für Distraktoren braucht, sollte auch aktiv in
  Tutorial-Texten vor Fallen warnen (siehe Cross-Language-Punkt in
  Abschnitt 3) — eine Quelle, zwei Verwendungen.

## 16. Rollout und Abnahme

- **Reihenfolge:** entlang der DAG-Level pro Zweig ausrollen (erst L0–L2),
  nicht alle offenen Tags eines Dokuments gleichzeitig — echte Nutzung
  früher Batches informiert spätere.
- **Policy pro Tag:** vor Umsetzung entscheiden, ob ein Tag eine eigene
  Challenge bekommt, in eine bestehende gebündelt wird, oder — wie
  `relational-model`/`iterable-concept`/`static-typing-concept` — reiner
  Tutorial-Kontext ohne eigene Aufgabe bleibt (siehe Abschnitt 8/9 der
  jeweiligen Konzept-Hierarchie-Dokumente).
- **Freigabe-Schwelle:** Gate 1 (Abschnitt 10) und Gate 2 (Abschnitt 12)
  müssen grün sein, bevor eine Charge als abgeschlossen gilt. Menschliche
  Stichprobe (Ton, Level-Kalibrierung, Hint-Progression) auf einem kleinen
  Anteil pro Charge, nicht auf jeder einzelnen Challenge.
