# UI/UX Audit Log

Lebendes Dokument. Jeder Durchgang bekommt einen eigenen Abschnitt mit Datum;
neue Findings werden an die Tabelle angehängt, nichts wird rückwirkend
gelöscht (Status-Spalte zeigt den aktuellen Stand). Ziel: nachvollziehbar
machen, was geprüft wurde, was behoben ist, was bewusst offen bleibt — und
wie gut das jeweils testabgedeckt ist.

## Wie ein neuer Durchgang abläuft

1. App bauen und mit Playwright (headless Chromium) auf mehreren Viewports
   durchklicken (siehe `run`-Skill / `examples/playwright.md`). sql.js/Pyodide
   laden von einem CDN — in Sandboxen ohne Zugriff auf cdnjs per
   `page.route()` lokal aus dem npm-Paket `sql.js` servieren, siehe
   Vorgehen in dieser PR-Historie.
2. Findings gegen die Tabelle unten prüfen: schon bekannt (Status
   aktualisieren) oder neu (neue Zeile, neue ID `F-0xx`)?
3. Für jedes neue Finding vor dem Fix kurz durchdenken: was genau ist der
   Testplan (Unit-Test, Playwright-Screenshot, beides)? Erst danach fixen.
4. Nach den Fixes: `npm run typecheck && npm run build:check && npm run
   test:coverage`. Coverage-Snapshot unten aktualisieren, wenn sich die
   Gesamtzahlen sichtbar bewegt haben.
5. Diesen Datei-Abschnitt mit Datum, Commit-Range und Ergebnis ergänzen.

## Status-Legende

| Status | Bedeutung |
|---|---|
| ✅ Fixed | Behoben, mit Test abgesichert |
| 🟡 Deferred | Bewusst zurückgestellt, Begründung in der Zeile |
| 🔴 Open | Bekannt, noch nicht angegangen |

## Findings

| ID | Bereich | Schweregrad | Beschreibung | Status | Tests |
|---|---|---|---|---|---|
| F-001 | Layout | Kritisch | Keine `@media`-Query im gesamten Stylesheet; Sidebar (fix 310px) quetscht Hauptinhalt auf schmalen Viewports auf ~80px. | ✅ Fixed | Playwright-Screenshots 360/390/820px; kein Unit-Test möglich (CSS-Layout) |
| F-002 | Accessibility | Kritisch | Challenge-Liste (`<li>` mit Click-Handler) war per Tastatur nicht erreichbar — zentrale Navigation der App unbedienbar ohne Maus. | ✅ Fixed | `challengeList.test.ts`: Tab-Index, Enter/Space, aria-current, Nicht-Doppel-Feuern mit Play-Button |
| F-003 | Bug | Hoch | Theme-Picker-Modal lag im DOM außerhalb von `.sql-app`, erbte nie die `[data-theme]`-CSS-Variablen des aktiven Themes — zeigte immer die Default-Palette. Erst bei vertiefter Testrunde (Nicht-Standard-Theme + Mobile) gefunden. | ✅ Fixed | `app.test.ts`: DOM-Nesting-Regressionstest; Playwright vorher/nachher-Vergleich (computed `--panel`) |
| F-004 | Accessibility | Mittel | 21 von 21 `<button>`-Elementen ohne `type="button"` (Default wäre "submit"). | ✅ Fixed | Mechanischer Sweep, abgesichert durch bestehende + neue Render-Tests je View |
| F-005 | Accessibility | Mittel | Icon-only Buttons (Sidebar-Toggle „‹/›", Theme-Picker-Close „✕") ohne `aria-label`; nur `title`. | ✅ Fixed | Render-Assertions in `sidebarShell.test.ts`, `themePicker.test.ts` |
| F-006 | Accessibility | Mittel | Tab-Leiste im Header ohne `role=tablist/tab/tabpanel`, kein `aria-selected`. | ✅ Fixed | `mainHeader.test.ts` |
| F-007 | Accessibility | Niedrig | Kein einheitlicher `:focus-visible`-Stil für Custom-Elemente (Challenge-Item, Tab-Buttons, Theme-Optionen). | ✅ Fixed | Playwright-Screenshot mit sichtbarem Fokusring; kein Unit-Test (reines CSS) |
| F-008 | Accessibility | Niedrig | Theme-Picker-Modal ließ sich nicht per Escape schließen (nur Klick auf ✕ oder Backdrop). | ✅ Fixed | `themePicker.test.ts`: Escape schließt, Escape im geschlossenen Zustand ist No-op, Listener wird bei Unmount entfernt |
| F-009 | Kontrast | Niedrig | WCAG-Kontrast-Check über alle 10 Themes (Skript, siehe unten) zeigt Grenzfälle: `solar-flare` fällt bei Button-Text auf 3.56–3.69:1 (Ziel 4.5:1), mehrere andere Themes liegen bei 4.1–4.4:1 für `muted`-Text auf `panel-2`. | 🟡 Deferred | Kein Test — Farbwahl ist eine Design-Entscheidung, nicht automatisch verändert. Nächster Schritt: bewusst pro Theme die `*-ink`-Farbwerte nachjustieren und mit Screenshot gegenprüfen. |
| F-010 | Coverage-Lücke | Niedrig | `pyodideEngine.ts` (25%) kaum getestet — lädt Pyodide/WASM vom CDN, wirkte schwer isoliert zu testen. (Die ursprünglich mitgenannte „Python-Sprachplugin-Index (0%)" war beim Nachprüfen `LanguagePlugin.ts`, ein reines Interface — kein echtes Test-Loch, siehe Hinweis unten.) | ✅ Fixed | `pyodideEngine.test.ts` (10 Tests: `createPyodideEngine` inkl. Driver-Script, `loadPyodideFromCdn` inkl. Script-Tag-Simulation für Erfolg/Fehler/Retry/gleichzeitige Aufrufe); `runtime/python/executeAndValidate.test.ts` (4 Tests, Fehler- und Catch-Branch) |
| F-011 | Coverage-Lücke | Niedrig | `loadSqlJsFromCdn` in `app.ts` (der SQL-Gegenpart zu F-010) ist der einzige verbliebene ungetestete CDN-Loader im Projekt — Tests injizieren immer einen Fake-`loadSqlJs`, der echte Ladepfad läuft nie. | ✅ Fixed | `app.test.ts`, neue `describe('default sql.js loader ...')`: 3 Tests (erfolgreicher Boot über echtes `window.initSqlJs` inkl. `locateFile`-Assertion, Fehlermeldung bei fehlendem `window.initSqlJs`, 10s-Timeout-Meldung via `vi.useFakeTimers`). Anders als bei F-010 kein `<script>`-Tag-Injection-Pfad zu testen — `loadSqlJsFromCdn` geht von einem bereits im HTML verdrahteten `<script>` aus, nicht von dynamischer Injektion. |
| F-012 | Toter Code | Niedrig | `knip`-Analyse (TS-Modulgraph, nicht Regex — manuell gegen False Positives geprüft, z. B. Prosa-Treffer auf das deutsche Wort „Track"): 2 nie aufgerufene Funktionen (`getCurrentChallenge`/`getChallengeSolution` in `actions.ts` — der „In den Editor übernehmen"-Button holt die Lösung längst über einen eigenen Selector), 1 vollständig ungenutztes Interface (`Track<TChallenge>`, superseded durch `ContentTrack`), 5 Funktionen/Konstanten + 25 Typen nur intern genutzt aber unnötig exportiert, ein dupliziertes `Unsubscribe`-Type (`delegate.ts` vs. `state/store.ts`), 2 unbenutzte devDependencies (`@testing-library/dom`, `linkedom`). | ✅ Fixed | `knip` danach: 0 Findings. Volle Testsuite (558 Tests) + `build:check` grün nach jeder Änderung. |
| F-013 | Bug | Hoch | SQL-Editor: `maybeUppercaseLastWord` (Auto-Uppercase für SQL-Keywords beim Tippen) hatte keine String-/Kommentar-Awareness, obwohl der Tokenizer sie für die Syntax-Hervorhebung längst korrekt berechnet. Ein Wort, das zufällig wie ein Keyword aussieht, wurde auch **innerhalb eines String-Literals oder Kommentars** großgeschrieben und damit der eigentliche Wert verfälscht — reproduziert live im Browser: `SELECT 'select ` wurde beim Tippen zu `SELECT 'SELECT '`. | ✅ Fixed | `uppercaseKeyword.test.ts`: 5 neue Tests (String-Literal, Kommentar `--` und `/* */`, sowie Bestätigung, dass echte Keywords *nach* einem geschlossenen String weiterhin großgeschrieben werden). Live in Playwright gegen den echten Dev-Server nachgestellt (vorher/nachher). |
| F-014 | Bug | Mittel | SQL/Python-Editor: Auto-Close für Klammern/Anführungszeichen (`applyAutoClose`, von SQL für Python mitübernommen) kannte `{`/`}` nicht — 1:1 aus einem SQL-only-Prototyp portiert, der nie geschweifte Klammern braucht. Für Python (Dict-/Set-Literale, f-String-Ausdrücke `f"{x}"`) fehlt dadurch ein zentrales Auto-Close-Paar; `{` blieb beim Tippen einfach offen. | ✅ Fixed | `autoClosePairs.test.ts`: 2 neue Tests (Einfügen + Skip-over). Live in Playwright bestätigt: `d = {"a": 1` schließt jetzt korrekt zu `d = {"a": 1}`. |
| F-015 | Coverage-Lücke | Mittel | `pythonResultsArea.ts` (10 % Statements, 0 % Functions) hatte überhaupt keine Testdatei — obwohl es der komplette Render-Pfad für jedes Python-Ergebnis ist (Status, stdout, Variablen-Tabelle) und mehrfach `escapeHtml` auf nutzergenerierten Inhalt anwendet (stdout, Variablennamen, JSON-stringifizierte Werte). Beim Nachprüfen: keine XSS-Lücke gefunden, alle Stellen escapen bereits korrekt — aber komplett unabgesichert gegen eine künftige Regression. | ✅ Fixed | `pythonResultsArea.test.ts` (11 neue Tests): Error/Success/Warn-Status, leere stdout/Variablen als Empty-State, `result: null` ohne Fehler, Escaping von stdout/Variablennamen/verschachtelten JSON-Werten, `renderPythonLoadingOutcome`. |

**Hinweis zu 0%-Dateien in der Coverage:** `ProgressStore.ts`, `Runtime.ts`,
`SqlEngine.ts`, `editorBridge.ts`, `LanguagePlugin.ts`, `PythonRuntime.ts`
zeigen 0%, sind aber reine TypeScript-Interfaces ohne ausführbaren Code —
kein echtes Test-Loch, sondern ein Artefakt der Zählweise (0/0 Statements).

## Coverage-Snapshot

Erzeugt mit `npm run test:coverage` (V8-Provider). Volles Detail lokal unter
`coverage/index.html` nach dem Lauf (Verzeichnis ist gitignored).

| Datum | Commit | Statements | Branches | Functions | Lines |
|---|---|---|---|---|---|
| 2026-08-04 | ece5451 | 91.58 % | 80.31 % | 93.84 % | 91.58 % |
| 2026-08-04 | HEAD (F-010-Fix) | 92.26 % | 80.67 % | 95.10 % | 92.26 % |
| 2026-08-04 | HEAD (F-012-Cleanup) | 92.38 % | 80.58 % | 95.69 % | 92.38 % |
| 2026-08-04 | HEAD (F-013/F-014-Fix) | 92.88 % | 80.85 % | 96.01 % | 92.88 % |
| 2026-08-05 | HEAD (F-011-Fix + 12 neue Challenges) | 92.73 % | 79.12 % | 96.46 % | 92.73 % |
| 2026-08-07 | HEAD (SQL-Fensterfunktionen + F-015-Fix) | 92.82 % | 78.15 % | 97.38 % | 92.82 % |

CI führt `npm run test:coverage` bei jedem Push/PR aus (`.github/workflows/ci.yml`)
und lädt den Report als Artefakt hoch — Zahlen sind also nicht nur hier,
sondern pro PR direkt in den Checks sichtbar.

## Durchgänge

### 2026-08-04 — Erster strukturierter Durchgang

- **Umfang:** Vollständige App per Playwright durchgeklickt (SQL- und
  Python-Track, Study/Exam-Modus, alle 4 Tabs, Theme-Picker, 10 Themes
  stichprobenartig) auf 360px/390px/820px/1440px sowie am tatsächlich
  gebauten `dist/index.html` (Single-File-Distributionsartefakt).
- **Ergebnis:** F-001 bis F-009 gefunden und behoben (bis auf F-009,
  bewusst zurückgestellt), F-010 als offene Coverage-Lücke dokumentiert.
- **Tests:** 534 → 543 Unit-Tests (11 neu), `build:check` grün,
  Coverage-Tooling und dieses Dokument neu eingeführt.
- **Commits:** `91e46bd` (Mobile-Layout, Tastatur, Buttons, Tab-Rollen),
  `ece5451` (Theme-Picker-Bug).

### 2026-08-04 — F-010 gezielt geschlossen

- **Umfang:** Auf explizite Anfrage nur F-010 (Coverage-Lücke `pyodideEngine.ts`)
  bearbeitet, keine erneute volle UI/UX-Runde.
- **Vorgehen:** Beim Nachprüfen stellte sich heraus, dass die ursprüngliche
  Beschreibung teils ungenau war — der "Python-Sprachplugin-Index" war ein
  reines Interface (kein echtes Loch), der eigentliche Gewinn liegt komplett
  in `pyodideEngine.ts`. `loadPyodideFromCdn`/`loadPyodideScript` per
  simuliertem `<script>`-Tag in jsdom getestet (onload/onerror, Retry nach
  Fehlschlag, geteiltes In-Flight-Promise bei gleichzeitigen Aufrufen),
  `createPyodideEngine` per Fake-`PyodideInterface`. `runtime/python/executeAndValidate.ts`
  bekam dabei ebenfalls einen eigenen direkten Unit-Test (vorher nur
  indirekt über `challengeRunner.test.ts` mitgetestet).
  `vitest.config.ts` bekam dafür einen neuen jsdom-Match für
  `src/runtime/python/pyodideEngine.{ts,test.ts}`.
- **Ergebnis:** `src/runtime/python` (Verzeichnis) 41.5 % → 100 % Statements.
  F-010 auf Fixed gesetzt; ein Analogfall (F-011, der SQL-seitige
  `loadSqlJsFromCdn` in `app.ts`) neu dokumentiert und bewusst offen gelassen,
  da nicht angefragt.
- **Tests:** 543 → 558 (+15: 10 `pyodideEngine.test.ts`, 4
  `python/executeAndValidate.test.ts`, siehe Test-Dateien), `build:check` grün.

### 2026-08-04 — Toter Code (F-012)

- **Umfang:** Auf explizite Anfrage `knip` (TS-Modulgraph-Analyse) laufen
  lassen und jeden Fund manuell gegen False Positives geprüft (z. B. Prosa-
  Treffer auf "SQL-Track" vs. den TS-Typ `Track`, oder gleichnamige aber
  unabhängige Typen in verschiedenen Dateien wie zwei separate
  `Unsubscribe`-Deklarationen).
- **Vorgehen:** Drei Kategorien unterschieden — (1) wirklich toter Code:
  `getCurrentChallenge`/`getChallengeSolution` (nie aufgerufen) und
  `Track<TChallenge>` (nicht mal intern referenziert) komplett gelöscht;
  (2) nur intern genutzt, aber unnötig exportiert: `export` bei 5
  Funktionen/Konstanten + 25 Typen entfernt, nichts gelöscht; (3)
  `delegate.ts`s eigene `Unsubscribe`-Deklaration durch einen Import aus
  `state/store.ts` ersetzt (Duplikat). Dazu 2 unbenutzte devDependencies
  (`@testing-library/dom`, `linkedom`) entfernt.
- **Ergebnis:** `knip` meldet danach 0 Findings. Keine Verhaltensänderung —
  nur Löschungen/Sichtbarkeits-Downgrades, nichts Neues gebaut.
- **Tests:** 558 unverändert (kein neuer Code, der Tests bräuchte),
  `typecheck` + `build:check` grün nach jedem Schritt.

### 2026-08-04 — Editor ausgiebig getestet (F-013, F-014)

- **Umfang:** Auf explizite Anfrage der Code-Editor selbst (nicht die
  umgebende UI) — statische Durchsicht aller Dateien in `src/editor/`
  (domEditor, textOps, beide LanguagePlugins, Tokenizer, Auto-Indent,
  Auto-Close, Auto-Uppercase), dann Live-Verifikation gegen den echten
  Dev-Server per Playwright (lokale sql.js-Kopie statt CDN, siehe
  Abschnitt oben).
- **Vorgehen:** Coverage-Report zeigte bereits vor dem Durchgang zwei
  ungetestete Zweige (`autoIndent.ts` beider Sprachen, Python-Tokenizer
  2-Zeichen-Operatoren) — beim Nachvollziehen, *warum* sie ungetestet
  waren, stellte sich einer als echte Sicherheitslücke heraus: die
  Auto-Uppercase-Funktion tokenisiert den Code nicht selbst, sondern
  scannt naiv rückwärts nach Buchstaben — ohne zu wissen, ob diese
  Buchstaben in einem String stehen. Per Playwright reproduziert, dann
  behoben, indem `maybeUppercaseLastWord` denselben Tokenizer wiederverwendet,
  den die Syntax-Hervorhebung schon nutzt (eine Quelle der Wahrheit für
  „was ist ein String", statt zwei unabhängige Annäherungen). Die zweite
  Lücke (fehlendes `{`/`}` beim Auto-Close) kam beim gezielten Testen
  Python-typischer Eingaben (Dict-Literale, f-String-Ausdrücke) zutage —
  das Paar-Set war 1:1 aus dem SQL-only-Prototyp übernommen worden, ohne
  je für Python (das `{}` intensiv nutzt) überprüft zu werden.
- **Ergebnis:** F-013 (Hoch, verfälscht String-Inhalte) und F-014 (Mittel,
  fehlende Editor-Funktionalität für einen ganzen Zeichentyp in Python)
  gefunden und behoben. Beide live im Browser vorher/nachher bestätigt,
  nicht nur per Unit-Test. Nebenbei: eine veraltete Code-Doku-Zeile in
  `LanguagePlugin.ts` korrigiert (nannte den längst existierenden
  Python-Plugin fälschlich „zukünftig"). Zwei tote Ternary-Zweige in
  beiden `autoIndent.ts`-Dateien (`indentMatch ? ... : ''`, technisch
  unerreichbar, weil ein `*`-Quantifier-Regex nie `null` zurückgibt)
  bewusst **nicht** angefasst — echtes, aber folgenloses Dead-Code-Detail,
  kein Bug, geringste Priorität.
- **Tests:** 577 → 597 (+20: 2 Auto-Close-Tests für `{`/`}`, 5 neue
  String-/Kommentar-Awareness-Tests für Auto-Uppercase, 13
  parametrisierte Tests für die bisher ungetesteten Python-
  Zwei-Zeichen-Operatoren), `typecheck` + volle Testsuite grün.

### 2026-08-05 — F-011 geschlossen, 12 neue Challenges live im Browser verifiziert

- **Umfang:** (1) F-011 (letzte offene Coverage-Lücke: `loadSqlJsFromCdn`
  in `app.ts`) gezielt geschlossen. (2) Die in dieser Session neu
  angelegten Challenges SQL 14–14.5 (Subqueries-Zweig) und Python
  11–11.5 (Schleifen-Zweig) — bis dahin nur gegen den Node-Testmotor
  (`node:sqlite`) geprüft — zusätzlich live im echten Browser gegen
  echtes sql.js- bzw. Pyodide-WASM verifiziert, nicht nur die
  Node-Testersatz-Engines.
- **Vorgehen F-011:** Nach dem Vorbild von `pyodideEngine.test.ts`
  (F-010) — aber `loadSqlJsFromCdn` unterscheidet sich strukturell: es
  injiziert keinen `<script>`-Tag selbst (das `<script src="https://
  cdnjs...">` steht schon statisch in `index.html`), sondern geht direkt
  von einem bereits gesetzten `window.initSqlJs` aus und wrapped den
  Aufruf in `withTimeout`. Drei neue Tests in `app.test.ts`, alle über
  `createApp` **ohne** `deps.loadSqlJs`-Override (damit der echte
  Default-Pfad läuft, nicht der in jedem anderen Test injizierte Fake):
  erfolgreicher Boot inkl. Assertion auf die `locateFile`-URL-Zusammensetzung,
  Fehlermeldung bei fehlendem `window.initSqlJs`, und die 10s-Timeout-Meldung
  via `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(10_000)`.
- **Vorgehen Browser-Verifikation:** Dev-Server gestartet, `sql.js`
  und `pyodide` als npm-Pakete lokal installiert (`--no-save`, nicht in
  `package.json`) und per Playwright `context.route()` anstelle der in
  dieser Sandbox blockierten CDN-Domains (`cdnjs.cloudflare.com`,
  `cdn.jsdelivr.net`) ausgeliefert — echtes WASM, keine Mocks. Für jede
  der 12 neuen Challenges: Sidebar-Auswahl, Tutorial-/Task-Tab-Rendering
  geprüft (kein rohes HTML im Text sichtbar), die kanonische `solution`
  in den Editor eingefügt, ausgeführt, `✓ Aufgabe erfüllt` bestätigt;
  zusätzlich bei 4 Challenges (SQL 14, 14.1, 14.4; Python 11, 11.5) einen
  `distractor` probeweise ausgeführt und die korrekte Ablehnung
  (`status-warn`, kein `status-ok`) bestätigt. Alle 12/12 Lösungen und
  4/4 stichprobenartig getesteten Distraktoren verhielten sich exakt wie
  von der `challengeRunner.test.ts`-Suite vorhergesagt — keine
  Diskrepanz zwischen Node-Testmotor und echtem Browser-WASM gefunden.
- **Ergebnis:** F-011 auf Fixed gesetzt, keine offenen Findings mehr
  außer dem bewusst zurückgestellten F-009 (Kontrast). Coverage-Snapshot
  sinkt leicht (92.88 % → 92.73 % Statements, 80.85 % → 79.12 % Branches)
  — kein Regressionssignal, sondern reiner Verdünnungseffekt durch 12
  neue Challenge-Dateien: deren `validate()`-Fehlerzweige (z. B. "Tabelle
  existiert noch nicht") werden von Gate 1/Gate 2 bewusst nicht alle
  durchlaufen, genau wie bei den 41 bereits vorhandenen SQL-Challenges.
- **Tests:** 621 → 624 (+3: F-011). `typecheck`, volle Testsuite und
  `npm run build` grün. Browser-Verifikation lief separat via
  Playwright-Skript (nicht Teil der CI-Suite, da echtes WASM + externe
  CDN-Domains — lokal per `context.route()` umgangen, siehe oben).

### 2026-08-07 — SQL-Fensterfunktionen (B10) + F-015 geschlossen

- **Umfang:** (1) Nächstgrößter komplett fehlender SQL-Zweig laut
  `docs/sql-concept-hierarchy.md` — B10 Fensterfunktionen (5 Tags) — als
  neue Challenges 15–15.4 ergänzt. (2) Coverage-Report nach dem üblichen
  "schwächste Stelle zuerst"-Blick durchsucht: `pythonResultsArea.ts`
  stach mit 10 % Statements / 0 % Functions heraus — der komplette
  Render-Pfad für jedes Python-Ergebnis (Status, stdout, Variablen-
  Tabelle), bis dahin ohne jede Testdatei.
- **Vorgehen B10:** Neue Tabelle `mitarbeiter` (6 Zeilen, 2 Abteilungen,
  bewusst mit einem Gehaltsgleichstand zwischen zwei Mitarbeitern) als
  gemeinsame Grundlage für alle 5 Sub-Challenges. `window-function-basic`
  (`AVG(...) OVER ()`), `partition-by`, `ranking-functions` (`RANK()`
  gegen den Gleichstand getestet — der Distraktor tauscht auf
  `ROW_NUMBER()`, das den Gleichstand fälschlich auflöst),
  `offset-functions` (`LAG()`, Distraktor vertauscht auf `LEAD()`,
  also die falsche Richtung) und `running-aggregates`
  (`SUM(...) OVER (ORDER BY ...)`, Distraktor lässt das `ORDER BY`
  im Fenster weg). Gleiches Validator-Muster wie den ganzen Rest der
  Session: live gegen die echte Engine nachgerechnet, nichts
  hartkodiert.
- **Vorgehen F-015:** Beim Nachprüfen von `pythonResultsArea.ts` (nutzt
  `escapeHtml` auf stdout, Variablennamen und JSON-stringifizierte
  Werte) keine tatsächliche XSS-Lücke gefunden — alle Stellen escapen
  bereits korrekt. Trotzdem komplett ungetestet und damit ungeschützt
  gegen eine künftige Regression. 11 neue Tests decken Error-/Success-/
  Warn-Status, leere stdout/Variablen als Empty-State, den defensiven
  `result: null`-Zweig ohne Fehler, und Escaping bei verschachtelten
  JSON-Werten (Listen, Objekte, `<script>`-artige Variablennamen) ab.
- **Ergebnis:** `pythonResultsArea.ts` 10 % → faktisch vollständig
  getestet (0 offene Functions mehr). Keine offenen Findings außer dem
  bewusst zurückgestellten F-009. SQL-Konzept-Hierarchie-Bilanz: 50/82 →
  55/82 Tags (≈ 67 %), nur noch drei Zweige komplett Lücke
  (Transaktionen, Views, Indizes).
- **Tests:** 624 → 645 (+21: 10 für die 5 neuen Window-Function-
  Challenges via `challengeRunner.test.ts`, 11 für F-015). `typecheck`,
  volle Testsuite und `npm run build` grün.
- **Standing:** Ab jetzt läuft dieselbe Art Durchgang automatisch einmal
  täglich weiter (Routine `SQLLernTool daily polish`, 08:00 UTC) — jeder
  Durchgang bekommt wie bisher einen eigenen Abschnitt hier.
