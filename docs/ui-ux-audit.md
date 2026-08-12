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
   **Standing requirement (seit 2026-08-09): mindestens ein schmaler
   Viewport (`newContext({ viewport: { width: 375, height: 667 } })`,
   iPhone-SE-Breite) gehört zu jedem Live-Playwright-Durchlauf, nicht
   nur Desktop-Breite** — die Desktop-only-Durchläufe der letzten
   Routinen hätten F-020 (Sidebar-Overlay blockiert Inhalt nach Auswahl
   auf Mobile) nie gefunden. Mindestens prüfen: horizontales Overflow
   (`document.documentElement.scrollWidth > clientWidth` sollte immer
   `false` sein), dass die Sidebar-Drawer nach einer Auswahl nicht
   liegen bleibt und den Hauptinhalt verdeckt, und dass Tabs/Run-Button
   nach einer Interaktion tatsächlich klickbar sind (nicht nur laut
   `isVisible()`, das reine Overlap-/Z-Index-Verdeckung nicht erkennt —
   ein echter `.click()`-Versuch deckt das auf, siehe F-020).
   Der Stand und die geplante Reihenfolge der Mobile-Arbeit stehen in
   `docs/mobile-roadmap.md` — dort auch die noch offene Richtungsfrage
   (Read-and-Run vs. vollwertiges Authoring), die M2 blockiert.
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
| F-016 | Bug | Mittel | `test/helpers/nodePythonEngine.ts` (der Node-Testmotor für Python-Content, benutzt von `challengeRunner.test.ts` für Gate 1/Gate 2) spawnte den `python3`-Subprozess ohne `cwd` — der Subprozess erbte das cwd des Test-Runners selbst (das Repo-Root), statt im isolierten Temp-Verzeichnis zu laufen, das für die Treiber-/User-Code-Dateien bereits verwendet wurde. Jede Challenge, deren Python-Code eine relative Datei öffnet (`open("notizen.txt", "w")`), schrieb dadurch echte Dateien ins Repo-Arbeitsverzeichnis statt in den isolierten Temp-Ordner — entdeckt live beim ersten Testlauf der neuen B13-Dateizugriff-Challenges (17–17.2): `liste.txt`, `log.txt`, `notizen.txt` tauchten als unversionierte Dateien im Repo-Root auf, inhaltlich sogar über mehrere Testläufe hinweg akkumuliert (kein Reset zwischen Läufen, weil `rmSync` nur den eigentlich ungenutzten Temp-Ordner löschte). | ✅ Fixed | `spawnSync(..., { cwd: dir })` gesetzt, damit relative Dateipfade im Testcode in den bereits vorhandenen, per `rmSync` aufgeräumten Temp-Ordner zeigen. Neuer Regressionstest in `nodePythonEngine.test.ts` (`isolates relative-path file I/O to a temp dir instead of the process cwd`) — schreibt eine Datei per Python-Code und prüft explizit `existsSync(join(process.cwd(), "notizen.txt")) === false`; vor dem Fix rot reproduziert (per `git stash` auf die alte Implementierung), nach dem Fix grün. Leere Dateien aus dem Repo-Root entfernt, nie committet. |
| F-017 | Bug | Niedrig | `editorTab.ts`: der Leerzustand vor dem ersten „Ausführen" zeigte auf **beiden** Tracks immer den SQL-Text „Noch keine Query ausgeführt." — obwohl Toolbar-Label und die Python-spezifische Ergebnis-Darstellung an anderer Stelle bereits track-bewusst sind. Gefunden bei einem gezielten Live-Playwright-Durchlauf, der zwischen SQL- und Python-Kurs wechselt und den DOM vor dem ersten Run vergleicht. | ✅ Fixed | Neue Funktion `emptyResultsPlaceholder(trackId)`; ein neuer Test in `editorTab.test.ts` (vor dem Fix rot reproduziert, danach grün) prüft für beide Tracks den korrekten Text. Live im Browser gegen beide Tracks bestätigt. |
| F-018 | Bug | Mittel | `test/helpers/nodeSqliteEngine.ts` (der Node-Testmotor für SQL-Content, benutzt von `challengeRunner.test.ts` für Gate 1/Gate 2) übernahm stillschweigend `node:sqlite`s eigenen Default für `PRAGMA foreign_keys` (**ON**) — echtes SQLite und `sql.js` (der Browser-Motor, den die App tatsächlich nutzt) defaulten dagegen beide auf **OFF**. Entdeckt beim Entwurf der neuen `foreign-key-constraint`-Challenge (20.2): ein Distraktor, der `PRAGMA foreign_keys = ON;` vergisst, hätte in Node fälschlich trotzdem FK-Verletzungen abgelehnt (weil `node:sqlite` sie ohnehin immer prüft), im echten Browser aber nicht — der Gate-2-Test hätte also einen Distraktor "bestätigt fehlschlagend" gemeldet, der im echten Produkt tatsächlich durchgekommen wäre. Kein Bestandscontent betroffen (FOREIGN KEY wurde vorher nirgends im Kurs verwendet), aber eine echte Falle für jeden künftigen FK-Content. | ✅ Fixed | `PRAGMA foreign_keys = OFF;` explizit nach jedem `new DatabaseSync(...)` (Konstruktion und `reset()`) gesetzt, um `node:sqlite` auf denselben Default wie sql.js/echtes SQLite zu bringen. Manuell verifiziert: ohne PRAGMA-ON-Zeile im Testcode wird eine ungültige FK-Referenz jetzt (korrekterweise) nicht mehr abgelehnt; mit `PRAGMA foreign_keys = ON;` weiterhin doch. Kein bestehender Test verließ sich auf das alte (falsche) Default-Verhalten — volle Suite weiterhin grün. |
| F-019 | Bug | Hoch | `test/helpers/nodeSqliteEngine.ts` las SELECT-Zeilen über `node:sqlite`s `prepared.all()` **ohne** `setReturnArrays(true)` — die Methode liefert dann Zeilen als Objekte, die pro **Spaltenname** (nicht pro Spaltenposition) indiziert sind. Eine Abfrage, die zwei gleichnamige Spalten aus verschiedenen Tabellen selektiert (z. B. ein unaliaster Self-Join `SELECT a.name, b.name FROM t a, t b`, oder jeder JOIN zweier Tabellen mit gemeinsamem Spaltennamen ohne `AS`) kollabierte dadurch beide Werte auf denselben (den zuletzt geschriebenen) — der andere ging spurlos verloren, obwohl `SqlResultSet.columns` beide Spaltennamen korrekt zweimal auflistete. `sqlJsEngine.ts` (der echte Browser-Motor) liest Zeilen dagegen schon immer positionsbasiert über `stmt.get()` und war nie betroffen — reiner Node-Testmotor-Bug, live beim Schreiben des Validators für die neue `right-join`-Challenge (21.1) entdeckt: eine unabhängige Nachrechnung mit zwei `k.name`/`p.name`-Spalten lieferte in der Prüfung für beide Spalten denselben Wert. | ✅ Fixed | `prepared.setReturnArrays(true)` gesetzt, sodass Zeilen wie bei sql.js positionsbasiert (Array) statt namensbasiert (Objekt) gelesen werden. Neuer Regressionstest in `nodeSqliteEngine.test.ts` (`keeps both values distinct when a join selects two columns with the same name`) — vor dem Fix per `git stash` auf die alte Implementierung rot reproduziert (beide Werte kollabierten auf "Ben"), nach dem Fix grün. |
| F-020 | Bug | Hoch | Auf schmalen Viewports (≤760px, `challengeList.ts` + `sidebarShell.ts`s mobiles Sidebar-Overlay) blieb die Sidebar-Drawer nach Auswahl einer Challenge **offen** liegen, statt sich zu schließen — sie deckte dabei (fixed position, z-index 41, mit Backdrop) den kompletten Hauptinhalt ab, inklusive Tabs und Editor. Ein Tap auf eine Challenge zeigte dadurch scheinbar nichts (der Nutzer musste erst manuell den Toggle-Button oder den Backdrop antippen, um die Drawer zu schließen, bevor er die Aufgabe überhaupt sehen konnte) — auf Desktop-Breite unsichtbar, da die Sidebar dort permanent als Flow-Element neben dem Inhalt steht, nie als Overlay. Gefunden beim ersten gezielten Live-Playwright-Durchlauf mit einem schmalen Viewport (375px) seit langer Zeit — ein realer `page.locator(...).click()`-Versuch auf den Task-Tab schlug mit "element intercepts pointer events" fehl, weil die (fälschlich offene) Sidebar darüber lag. | ✅ Fixed | `challengeList.ts`: Nach `selectChallenge(...)` (Maus-Klick und Enter/Space) wird jetzt `closeSidebarIfMobileOverlay(ctx)` aufgerufen — schließt die Sidebar nur, wenn `window.matchMedia('(max-width: 760px)').matches` (identischer Breakpoint wie `themes.css`) und sie aktuell nicht schon eingeklappt ist. `window.matchMedia` existiert in jsdom nicht — defensiv mit `typeof window.matchMedia !== 'function'` abgefangen, statt zu werfen. 4 neue Tests in `challengeList.test.ts` (schließt bei schmalem Viewport, bleibt offen bei breitem Viewport, kein redundanter Toggle bei bereits eingeklappter Sidebar, schließt auch bei Tastatur-Auswahl). Live gegen den echten Dev-Server bei 375×667 bestätigt: Sidebar-Klasse wechselt nach Auswahl zu `sidebar collapsed`, Task-Tab/Editor/Run-Button danach tatsächlich klickbar, kein horizontales Overflow, keine Konsolenfehler. |
| F-021 | Bug | Mittel | Ein Ergebnis mit vielen/breiten Spalten ist breiter als das Ergebnis-Panel. `.results-body` hatte **keine** `overflow-x`-Regel (Default `visible`), und ein Vorfahr (`.main`) hat `overflow: hidden` — die Tabelle wurde dadurch schlicht **abgeschnitten, ohne Scrollbar irgendwo**. Die rechten Spalten waren damit nicht nur außerhalb des Sichtfelds, sondern buchstäblich **unerreichbar**: kein Scrollen, kein Wischen, keine Möglichkeit an die Werte zu kommen. Auf Mobile akut (bei 375px passen ~2 Spalten), auf schmalen Desktop-Fenstern derselbe Effekt. Empirisch gemessen mit einer 6-Spalten-Abfrage bei 375px: `.results-body` scrollWidth 618px vs. clientWidth 281px, `overflow-x: visible` — Spalten 3–6 unerreichbar. **Meine ursprüngliche Vermutung war falsch**: ich hatte horizontales Seiten-Scrollen erwartet; die Seite scrollte gar nicht (375 == 375), weil der Vorfahr clippt — der tatsächliche Fehler ist schlimmer als der vermutete. | ✅ Fixed | `.results-body { overflow-x: auto; }` (global, nicht mobil-only — schmale Desktop-Fenster haben dasselbe Problem). Live bei 375px und 1280px verifiziert: `overflow-x: auto`, `scrollLeft` lässt sich tatsächlich bewegen (Spalten erreichbar), und die **Seite** scrollt weiterhin nicht horizontal. Kein Unit-Test (reines CSS-Layout, analog F-001/F-007). |
| F-022 | Bug | Mittel | `textarea.editor` hat `font-size: 13px`. iOS Safari zoomt die **gesamte Seite** automatisch hinein, sobald ein Textfeld mit einer Schriftgröße **unter 16px** den Fokus bekommt — und zoomt danach **nicht** wieder heraus. Jeder Tap in den Editor hätte den Lernenden also in einem hineingezoomten Viewport zurückgelassen, aus dem er sich von Hand herauszoomen muss. Betrifft beide Tracks (SQL und Python teilen denselben Editor). | ✅ Fixed | Im ≤760px-Breakpoint `font-size: 16px` — **für alle drei Editor-Schichten gemeinsam**: `textarea.editor` ist `color: transparent` und liefert nur den Cursor, die sichtbaren Glyphen kommen aus `.highlight-layer` darüber, `.line-numbers` ist die dritte Spalte. Nur die Textarea zu ändern hätte den Cursor pro Zeichen ~3px gegen den sichtbaren Text driften lassen. `.line-numbers` zusätzlich von 36px auf 42px (3 Ziffern passen bei 16px sonst nicht). **Erster Fix-Versuch war wirkungslos** und wurde erst durch die Live-Messung entdeckt: der Override lag im früheren Narrow-Viewport-Block (Zeile ~270), aber `textarea.editor` dort hat dieselbe Spezifität wie die Basisregel bei Zeile ~547 — Media Queries erhöhen die Spezifität nicht, also gewann die spätere Basisregel per Quellreihenfolge. Der Block liegt jetzt **nach** den Editor-Regeln, mit Kommentar, der genau diese Falle festhält. Live verifiziert: mobil alle drei Schichten 16px mit identischen Typografie-Metriken und Ursprungs-Delta {x:0, y:0} (Cursor-Alignment intakt), Desktop unverändert 13px. Kein Unit-Test (reines CSS-Layout). |

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
| 2026-08-07 | HEAD (Ende Tag: 4 weitere Coverage-Lücken) | 93.05 % | 78.48 % | 97.96 % | 93.05 % |
| 2026-08-08 | HEAD (sqlJsEngine + actions.ts + Python-Funktionen) | 93.52 % | 78.25 % | 98.85 % | 93.52 % |
| 2026-08-08 | HEAD (Python-Funktionen Teil 2: 12.6-12.8) | 93.33 % | 77.88 % | 98.86 % | 93.33 % |
| 2026-08-08 | HEAD (Test-Lücken + B8 komplett: 12.9-12.10) | 93.48 % | 77.87 % | 98.87 % | 93.48 % |
| 2026-08-08 | HEAD (Live-Verifikation + B9 Teil 1: 13-13.4) | 93.33 % | 77.45 % | 98.88 % | 93.33 % |
| 2026-08-08 | HEAD (B9 komplett: 13.5-13.9) | 93.11 % | 76.87 % | 98.90 % | 93.11 % |
| 2026-08-08 | HEAD (B10 Teil 1: 14-14.4) | 93.02 % | 76.52 % | 98.91 % | 93.02 % |
| 2026-08-08 | HEAD (B11 Teil 1: 15-15.3) | 92.85 % | 76.03 % | 98.93 % | 92.85 % |
| 2026-08-08 | HEAD (B12 Teil 1: 16-16.2) | 92.73 % | 75.68 % | 98.93 % | 92.73 % |
| 2026-08-08 | HEAD (B13 komplett: 17-17.2) | 92.64 % | 75.39 % | 98.94 % | 92.64 % |
| 2026-08-08 | HEAD (SQL B11 komplett: 16-16.2) | 92.51 % | 75.12 % | 98.95 % | 92.51 % |
| 2026-08-08 | HEAD (SQL B12 abgeschlossen: 17, `create-view`) | 92.47 % | 74.98 % | 98.95 % | 92.47 % |
| 2026-08-08 | HEAD (C# Schritt 3: csharpEngine.ts Browser-Loader) | 92.51 % | 75.16 % | 98.97 % | 92.51 % |
| 2026-08-08 | HEAD (F-017-Fix + SQL B13 komplett: 18-18.2) | 92.50 % | 74.96 % | 98.98 % | 92.50 % |
| 2026-08-08 | HEAD (Python B14 Objektorientierung komplett: 18-18.7) | 92.26 % | 74.16 % | 99.00 % | 92.26 % |
| 2026-08-09 | HEAD (Python B10/B11 abgeschlossen: 19-19.2) | 92.14 % | 73.82 % | 99.01 % | 92.14 % |
| 2026-08-09 | HEAD (C# Schritt 4: validate()-Design entschieden, result-Feld entfernt) | 92.14 % | 73.81 % | 99.01 % | 92.14 % |
| 2026-08-09 | HEAD (C# Schritt 5: Content-Track-Scaffold, unregistriert) | 92.15 % | 73.82 % | 99.01 % | 92.15 % |
| 2026-08-09 | HEAD (C# Schritt 6: Node-Testmotor für CI) | 92.15 % | 73.82 % | 99.01 % | 92.15 % |
| 2026-08-09 | HEAD (SQL B9 CTE & Rekursion abgeschlossen: 19-19.1) | 92.12 % | 73.84 % | 99.02 % | 92.12 % |
| 2026-08-09 | HEAD (SQL B1 Schema/DDL abgeschlossen: 20-20.4, F-018 Fix) | 91.91 % | 73.28 % | 99.03 % | 91.91 % |
| 2026-08-09 | HEAD (SQL B6 Joins abgeschlossen: 21-21.2, F-019 Fix) | 91.89 % | 73.34 % | 99.04 % | 91.89 % |
| 2026-08-09 | HEAD (Live-Bug-Hunt sauber + SQL B3 DQL abgeschlossen: 22-22.1) | 91.86 % | 73.23 % | 99.05 % | 91.86 % |
| 2026-08-09 | HEAD (SQL B4 Funktionen abgeschlossen: 23-23.2) | 91.80 % | 73.06 % | 99.06 % | 91.80 % |
| 2026-08-09 | HEAD (F-020 Fix: Mobile-Sidebar-Overlay blockierte Inhalt nach Auswahl) | 91.81 % | 73.15 % | 99.06 % | 91.81 % |
| 2026-08-09 | HEAD (F-021/F-022: Ergebnis-Tabelle unerreichbar + iOS-Zoom im Editor) | 91.81 % | 73.15 % | 99.06 % | 91.81 % |
| 2026-08-09 | HEAD (SQL B8 Mengenoperationen abgeschlossen: 24-24.2) | 91.76 % | 73.05 % | 99.06 % | 91.76 % |
| 2026-08-09 | HEAD (Python B2/B5/B6 Restlücken abgeschlossen: 20-20.3) | 91.77 % | 72.88 % | 99.07 % | 91.77 % |
| 2026-08-09 | HEAD (SQL upsert-on-conflict abgeschlossen: 25) | 91.72 % | 72.81 % | 99.08 % | 91.72 % |
| 2026-08-09 | HEAD (Live-Bug-Hunt sauber + C# Schritt 7 gestartet: Challenge 01) | 91.76 % | 72.87 % | 99.08 % | 91.76 % |
| 2026-08-09 | HEAD (C# Challenge 02: B2-Grundtypen, int/double-Division) | 91.79 % | 72.86 % | 99.08 % | 91.79 % |
| 2026-08-09 | HEAD (Syntax-Highlighting in Tutorial/Tipps/Erklärung/Lösung) | 91.82 % | 72.95 % | 99.09 % | 91.82 % |
| 2026-08-09 | HEAD (C# Challenge 03: B2 vollständig, 15/86) | 91.80 % | 72.92 % | 99.09 % | 91.80 % |
| 2026-08-09 | HEAD (Live-Bug-Hunt sauber + C# Challenge 04: B3 vollständig, 21/86) | 91.83 % | 72.90 % | 99.09 % | 91.83 % |
| 2026-08-09 | HEAD (C# Challenge 05: B4 vollständig, 24/86) | 91.87 % | 72.89 % | 99.09 % | 91.87 % |
| 2026-08-09 | HEAD (C# Challenge 06: B5 vollständig, 28/86) | 91.85 % | 72.88 % | 99.09 % | 91.85 % |
| 2026-08-10 | HEAD (C# Challenge 07: B6 vollständig, 33/86) | 91.88 % | 72.86 % | 99.10 % | 91.88 % |
| 2026-08-10 | HEAD (C# Challenge 08: B7 vollständig, 38/86) | 91.92 % | 72.85 % | 99.10 % | 91.92 % |
| 2026-08-10 | HEAD (Live-Bug-Hunt sauber + C# Challenge 09: B8 vollständig, 42/86) | 91.95 % | 72.82 % | 99.10 % | 91.95 % |
| 2026-08-10 | HEAD (C# Challenge 10: B9 Teil 1, 46/86) | 91.99 % | 72.81 % | 99.10 % | 91.99 % |
| 2026-08-10 | HEAD (C# Challenge 11: B9 7/8, 49/86) | 92.02 % | 72.79 % | 99.10 % | 92.02 % |
| 2026-08-10 | HEAD (C# Challenge 12: B10 Teil 1, erste Klasse, 53/86) | 92.06 % | 72.78 % | 99.11 % | 92.06 % |
| 2026-08-10 | HEAD (C# Challenge 13: B10 vollständig, 57/86) | 92.09 % | 72.74 % | 99.11 % | 92.09 % |
| 2026-08-10 | HEAD (C# Challenge 14: B9 vollständig, B0–B10 komplett, 58/86) | 92.13 % | 72.74 % | 99.11 % | 92.13 % |
| 2026-08-10 | HEAD (Live-Bug-Hunt sauber + C# Challenge 15: B11 Teil 1, 62/86) | 92.16 % | 72.69 % | 99.11 % | 92.16 % |
| 2026-08-10 | HEAD (C# Challenge 16: B11 vollständig, 65/86) | 92.19 % | 72.65 % | 99.11 % | 92.19 % |
| 2026-08-10 | HEAD (C# Challenge 17: B12 vollständig, B0–B12 komplett, 68/86) | 92.17 % | 72.64 % | 99.12 % | 92.17 % |
| 2026-08-10 | HEAD (C# Challenge 18: B13 Teil 1, 72/86) | 92.21 % | 72.62 % | 99.12 % | 92.21 % |
| 2026-08-10 | HEAD (C# Challenge 19: B13 vollständig, B0–B13 komplett, 74/86) | 92.24 % | 72.60 % | 99.12 % | 92.24 % |
| 2026-08-10 | HEAD (C#-LanguagePlugin für den Editor: Tokenizer/Highlight/Auto-Indent) | 92.30 % | 73.11 % | 99.13 % | 92.30 % |
| 2026-08-10 | HEAD (C#-Engine-Wiring: EngineFactory.ensureCSharpEngine) | 92.31 % | 73.15 % | 99.14 % | 92.31 % |
| 2026-08-10 | HEAD (C#-Engine: iframe+postMessage-Transport statt direktem Script-Inject) | 92.33 % | 73.16 % | 99.14 % | 92.33 % |
| 2026-08-10 | HEAD (C#-Editor-UI: csharpResultsArea + pluginForTrack('csharp')) | 92.35 % | 73.18 % | 99.15 % | 92.35 % |
| 2026-08-11 | HEAD (C# Challenge 20: B14 Teil 1 — Delegates/Lambda/Func<>, 77/86) | 92.38 % | 73.17 % | 99.15 % | 92.38 % |
| 2026-08-11 | HEAD (C# Challenge 21: B14 vollständig — Events, 78/86) | 92.41 % | 73.17 % | 99.15 % | 92.41 % |
| 2026-08-11 | HEAD (C# Challenge 22: B15 Teil 1 — LINQ Where/Select, 79/86) | 92.44 % | 73.17 % | 99.15 % | 92.44 % |
| 2026-08-11 | HEAD (C# Challenge 23: B15 Teil 2 — LINQ Aggregation, 80/86) | 92.47 % | 73.14 % | 99.15 % | 92.47 % |
| 2026-08-11 | HEAD (C# Challenge 24: B15 Teil 3 — LINQ Query-Syntax, 81/86) | 92.50 % | 73.14 % | 99.15 % | 92.50 % |
| 2026-08-11 | HEAD (C# Challenge 25: B15 Teil 4 — LINQ Ordering/Grouping, 82/86) | 92.53 % | 73.13 % | 99.16 % | 92.53 % |
| 2026-08-11 | HEAD (C# Challenge 26: B15 vollständig — LINQ Deferred Execution, 83/86) | 92.56 % | 73.13 % | 99.16 % | 92.56 % |
| 2026-08-11 | HEAD (C# Challenge 27: B16 vollständig — Namespaces & Imports, 86/86, C#-Dokument komplett) | 92.59 % | 73.12 % | 99.16 % | 92.59 % |
| 2026-08-11 | HEAD (C#-Engine live verdrahtet: TRACKS-Eintrag, async runQuery, iframe-Transport im echten Dev-Server E2E-verifiziert) | 92.63 % | 73.44 % | 99.37 % | 92.63 % |
| 2026-08-11 | HEAD (Bugfix: SQL-Endkommentar-Fehler, `hasSqlContent()` + 12 Tests) | 92.57 % | 73.65 % | 99.37 % | 92.57 % |

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
- **Nachtrag, gleicher Tag:** Die 5 neuen Fensterfunktionen-Challenges
  zusätzlich live im echten Browser gegen echtes sql.js-WASM verifiziert
  (dieselbe `context.route()`-Umgehung wie beim 2026-08-05-Durchgang) —
  5/5 Lösungen akzeptiert, 5/5 Distraktoren korrekt abgelehnt, keine
  Diskrepanz zum Node-Testmotor.
- **Nachtrag 2, gleicher Tag — vier weitere echte Coverage-Lücken
  geschlossen:** Nach demselben "schwächste Stelle zuerst"-Blick in den
  Coverage-Report vier weitere live-relevante, aber ungetestete Stellen
  gefunden und geschlossen: (1) der Track/Kurs-Umschalter im Sidebar-Header
  (`<select data-track-course>`, live selbst im Playwright-Check dieser
  Session benutzt) — Wechsel navigiert korrekt zur ersten Challenge des
  neuen Kurses, plus beide defensiven No-op-Zweige (nicht parsbarer Wert,
  Wert zeigt auf unbekannten Kurs); (2) `parseTrackCourseValue` selbst,
  direkt als eigene Testdatei; (3) `challengeLookup.ts`
  (`getCourseChallenges`, `findChallengeInRegistry`,
  `getDefaultTrackAndCourse`) — trotz Verwendung in `state/actions.ts`
  überhaupt keine eigene Testdatei, jetzt mit allen Fallback-Zweigen
  (unbekannter Track/Kurs, komplett leeres Registry, Track ohne Kurse);
  (4) `delegate.ts`s Schutzklausel gegen ein Event-Target, das kein
  `Element` ist (z. B. ein reiner Textknoten). Alles rein additiv, keine
  Bugs gefunden — reine Testschulden geschlossen.
- **Standing-Ergebnis (Ende des Tages 2026-08-07):** Tests 624 → 664
  (+40 insgesamt für diesen Tag), Statement-Abdeckung 92.73 % → 93.05 %,
  Branch-Abdeckung 79.12 % → 78.48 % (netto niedriger trotz mehr Tests,
  weil der Nenner durch neue Challenge-Dateien schneller wächst als
  Content-Branches abgedeckt werden — reiner Verdünnungseffekt, siehe
  oben), Function-Abdeckung 96.46 % → 97.96 %. `typecheck`,
  volle Testsuite und `npm run build` grün nach jedem einzelnen Schritt.

### 2026-08-08 — Zwei echte blinde Flecken geschlossen, Python-Funktionen (B8, Teil 1)

- **Umfang:** (1) Coverage-Report erneut nach der schwächsten Stelle
  durchsucht — diesmal stach `sqlJsEngine.ts` heraus (71 % Statements,
  57 % Functions, mit Abstand die schwächste Live-Code-Datei im ganzen
  Projekt). (2) Beim Nachziehen auf `actions.ts` (76.7 % Branches, die
  größte und zentralste State-Datei) fielen zwei **komplette**, bis dahin
  gänzlich ungetestete Python-Zweige auf. (3) Live-Smoke-Test gegen den
  echten Dev-Server (SQL-Lauf, Tabellen-Panel, Track-Umschalter,
  Python-Lauf, Schema-Reset) — 0 Konsolenfehler. (4) Erste Hälfte von
  Python B8 (Funktionen) als neue Challenges 12–12.5 ergänzt.
- **Vorgehen (1) sqlJsEngine.ts:** `getTablesInfo()` (die Datenquelle des
  "Tabellen"-Panels) und `reset()` (der Engine-seitige Effekt des
  "Schema komplett zurücksetzen"-Buttons) hatten 0 % Abdeckung. Das
  Fake-sql.js in der Testdatei um `sqlite_master`-, `PRAGMA table_info`-
  und `COUNT(*)`-Simulation erweitert. Keine Bugs gefunden, beide
  Funktionen arbeiteten schon korrekt — aber zwei echte, häufig genutzte
  Features hatten bis dahin keinerlei Regressionsschutz. Danach 100 % in
  allen vier Metriken.
- **Vorgehen (2) actions.ts:** `runQuery()` und `playChallenge()` hatten
  je einen kompletten `if (trackId === 'python')`-Zweig, den keine
  einzige bestehende Testzeile je erreichte — jeder Test im gesamten
  Projekt lief bis dahin nur gegen den SQL-Zweig. Mit dem echten
  Node-Subprozess-Python-Engine (`test/helpers/nodePythonEngine.ts`,
  bereits von der Content-Suite genutzt) beide Pfade nachgezogen: Erfolg,
  ein Skript, das eine Exception wirft, und der "Engine noch nicht
  geladen"-Zweig. Nebenbei auch `revealHint`s dritte (weitreichendste)
  Hinweisstufe und den Fall "Hinweis-Index jenseits der letzten
  Original-Hinweise" (keine Grounding-Text mehr) mitgeschlossen.
- **Vorgehen (3) Live-Smoke-Test:** Kompletter Durchlauf gegen den
  echten Dev-Server (sql.js/Pyodide lokal per `context.route()` statt
  der in dieser Sandbox blockierten CDNs) — SQL-Challenge lösen,
  Tabellen-Panel öffnen und den Tabelleninhalt prüfen, per
  Track-Umschalter zu Python wechseln, eine Python-Challenge lösen,
  zurück zu SQL wechseln, Schema zurücksetzen. 0 Browser-/Seitenfehler.
- **Vorgehen (4) Python B8 Funktionen:** 7 der 12 Tags aus dem größten
  verbliebenen Zweig (SQL oder Python) als Challenges 12–12.5:
  `function-definition`+`return-statement` (12, bewusst gebündelt — eine
  Funktion ohne return ist kaum sinnvoll unterrichtbar), `function-
  parameters` (12.1, Distraktor vertauscht die Argumentreihenfolge beim
  Aufruf), `default-parameters` (12.2, Distraktor vergisst den
  Standardwert → TypeError), `variable-scope` (12.3, Distraktor nutzt
  `global` und demonstriert damit genau das Gegenteil der Lektion),
  `docstrings` (12.4, Distraktor nutzt einen `#`-Kommentar statt eines
  echten Docstrings → `__doc__` bleibt None), `recursion` (12.5,
  Distraktor vergisst den Basisfall → RecursionError). Die restlichen 5
  B8-Tags (`args-kwargs`, `lambda-expressions`, `map-function`,
  `filter-function`, `sorted-with-key`) hängen im Graphen alle an
  `lambda-expressions` und bilden eine natürliche zweite Teilcharge.
  6/6 Lösungen und 5/5 stichprobenartig getestete Distraktoren live im
  Browser gegen echtes Pyodide bestätigt.
- **Ergebnis:** Keine echten Bugs gefunden in (1)/(2)/(3) — reine
  Testschulden geschlossen, aber an zwei der zentralsten Dateien im
  Projekt. Python-Konzept-Hierarchie-Bilanz: 27/82 → 34/82 Tags (≈ 41 %).
- **Tests:** 664 → 689 (+25: 10 für sqlJsEngine, 9 für actions.ts, 6 für
  die neuen Python-Funktionen-Challenges via `challengeRunner.test.ts`).
  `typecheck`, volle Testsuite und `npm run build` grün nach jedem
  Schritt.

#### Nachtrag (selbe Datum, Routine manuell nachgefeuert) — C#-Hosting-Entscheidung + Python-Funktionen Teil 2

- **Umfang:** (1) C# stand jetzt explizit im Scope (User-Anweisung
  "let's include c#"). Erster offener Punkt aus
  `docs/csharp-engine-poc.md`s Restliste bearbeitet: die
  COOP/COEP-Hosting-Frage für GitHub Pages recherchiert und entschieden.
  (2) Zweite Teilcharge von Python B8 (Funktionen): die restlichen 5
  Tags minus 2 als Challenges 12.6–12.8 ergänzt.
- **Vorgehen (1) COOP/COEP:** Recherchiert, wie andere WASM-Projekte
  (Wasmer, Godot-Web-Exports, diverse HuggingFace Spaces) SharedArrayBuffer
  auf Hosts ohne Custom-Header-Kontrolle (wie GitHub Pages) zum Laufen
  bringen. Etablierte Lösung: `coi-serviceworker` — ein kleiner Service
  Worker, der die eigene Navigations-Response um COOP/COEP-Header
  ergänzt, weil ein Service Worker Header auf abgefangene Requests setzen
  darf, auch wenn der Origin-Server (GitHub Pages) das nicht kann. Dabei
  auch eine falsche Annahme aus einer früheren Doku-Version korrigiert:
  es gibt **keinen** `<meta>`-Tag-Ersatz für `Cross-Origin-Embedder-Policy`
  — COEP ist laut Spezifikation reiner HTTP-Header, kein Meta-Tag-Feature.
  Entscheidung, Trade-offs (ein Reload beim ersten Besuch, Scope auf die
  C#-Route beschränken, `Document-Isolation-Policy` als möglicher
  zukünftiger Ersatz) in `docs/csharp-engine-poc.md` festgehalten. Reines
  Doku-/Recherche-Increment, kein Code geändert — folgt der eigenen
  Vorgabe im Dokument, jede Runde als **ein** abgeschlossenes Increment zu
  behandeln statt die Architektur-Entscheidungen zu überstürzen.
- **Vorgehen (2) Python B8 Teil 2:** `args-kwargs` (12.6, Funktion
  `bestellung(*artikel, **extras)`, Distraktor vergisst den doppelten
  Stern vor `extras` → `TypeError: unexpected keyword argument`),
  `lambda-expressions` (12.7, `quadrat = lambda x: x ** 2`, Distraktor
  ruft das Lambda nie auf — `ergebnis` bleibt eine Funktion statt einer
  Zahl), `map-function` (12.8, `list(map(lambda x: x * 2, zahlen))`,
  Distraktor vergisst `list(...)` — `verdoppelt` bleibt ein lazy
  map-Objekt). Alle drei über Gate 1/Gate 2 (`challengeRunner.test.ts`,
  läuft gegen einen echten `python3`-Subprozess) verifiziert; da Pyodide
  echtes CPython zu WASM kompiliert, ist das Verhalten von `*args`,
  `**kwargs`, `lambda` und `map()` zwischen Node-Subprozess und
  Browser-Pyodide identisch, ein zusätzlicher Playwright-Lauf war für
  diese drei Sprachfeatures nicht nötig. Nur noch `filter-function` und
  `sorted-with-key` offen für B8 — kleine Restcharge.
- **Ergebnis:** Python-Konzept-Hierarchie-Bilanz: 34/82 → 37/82 Tags
  (≈ 45 %). C#-Engine-Integration: Schritt 1 der Restliste
  (Hosting-Frage) abgeschlossen, Schritt 2 (Projekt-Scaffold) ist der
  nächste sinnvolle Schritt für eine künftige Runde.
- **Tests:** 689 → 695 (+6, alle für die drei neuen
  Python-Funktionen-Challenges via `challengeRunner.test.ts`).
  `typecheck`, volle Testsuite (695 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: drei echte Test-Lücken geschlossen + B8 komplettiert

- **Umfang:** (1) Baseline geprüft (695/695 grün). (2) Coverage-Report
  nach echten, erreichbaren Lücken durchsucht statt nach reiner
  Prozentzahl — drei gefunden und geschlossen: `tableExists.ts` (0 %,
  keine eigene Testdatei existierte), `chatTab.ts`s Strg/Cmd+Enter-
  Sendekürzel und die pendingInput-Erhaltung über Re-Renders hinweg, und
  `editorTab.ts`s "Ausführen"-Button für die Python-Zweige (`python` /
  `python-loading`), die bis dahin nur auf State-Ebene
  (`actions.test.ts`), nie auf UI-Ebene getestet waren. (3) Python B8
  (Funktionen) mit den letzten beiden Tags komplettiert: `filter-
  function` (12.9) und `sorted-with-key` (12.10).
- **Vorgehen (2) Test-Lücken:** `tableExists.ts` wird von praktisch jeder
  SQL-Challenge-`validate()` genutzt, hatte aber 0 % Abdeckung — 4 Tests
  ergänzt (existiert/existiert nie/wurde gelöscht/Try-Catch-Pfad über
  einen Tabellennamen, der die interne Query syntaktisch bricht). Für
  `chatTab.ts`: 3 Tests ergänzt (Text bleibt bei einem fremden Re-Render
  erhalten, Strg/Cmd+Enter sendet wie der Button, einfaches Enter sendet
  nicht). Für `editorTab.ts`: 2 Tests ergänzt (Python-Challenge klicken,
  während die Engine noch lädt → Lade-Platzhalter; Python-Challenge mit
  echter Node-Subprozess-Engine lösen → Erfolgsstatus mit stdout). Keine
  echten Bugs gefunden — reine, aber reale Testschulden auf tatsächlich
  erreichbarem Code (nicht auf den verbleibenden defensiven
  "Challenge nicht gefunden"-Zweigen, die mit einer gültigen Auswahl nie
  erreichbar sind).
- **Vorgehen (3) Python B8 fertigstellen:** `filter-function` (12.9,
  gerade Zahlen aus einer Liste aussieben, Distraktor vergisst
  `list(...)` — bleibt ein lazy filter-Objekt) und `sorted-with-key`
  (12.10, Wörter nach Länge statt alphabetisch sortieren via
  `sorted(x, key=len)`, Distraktor vergisst `key=len` — sortiert
  alphabetisch statt nach Länge, falsches Ergebnis). Beide über Gate
  1/Gate 2 verifiziert. **B8 Funktionen ist damit der zweite komplett
  abgedeckte Python-Zweig nach B7 Schleifen.**
- **Ergebnis:** Keine echten Bugs gefunden. Python-Konzept-Hierarchie-
  Bilanz: 37/82 → 39/82 Tags (≈ 48 %), B8 komplett (12/12). Größter
  offener Kandidat für die nächste inhaltliche Runde: B9 Datenstrukturen
  (10 Tags, komplett offen).
- **Tests:** 695 → 708 (+13: 4 tableExists, 3 chatTab, 2 editorTab-
  Python, 4 für die neuen 12.9/12.10-Challenges via
  `challengeRunner.test.ts`). `typecheck`, volle Testsuite (708 Tests)
  und `npm run build` grün nach jedem Schritt.

### 2026-08-08 — Stündliche Routine: Live-Verifikation + B9 Datenstrukturen (Teil 1)

- **Umfang:** (1) Baseline geprüft (708/708 grün). (2) Live-Playwright-
  Lauf gegen den echten Dev-Server (lokale sql.js/Pyodide-Kopien statt
  der in dieser Sandbox blockierten CDNs, siehe Runbook oben) — gezielt
  die fünf Python-Funktionen-Challenges 12.6–12.10 aus der letzten
  Routine, die bis dahin nur gegen den Node-`python3`-Subprozess
  verifiziert waren, nie gegen echtes Browser-Pyodide. (3) Erste Hälfte
  von Python B9 (Datenstrukturen) als neue Challenges 13–13.4 ergänzt,
  ebenfalls sofort live gegen echtes Pyodide verifiziert statt nur gegen
  den Node-Testmotor.
- **Vorgehen (2) Live-Verifikation 12.6–12.10:** Alle fünf Lösungen über
  den echten "Lösung anzeigen" → "In den Editor übernehmen" → "Ausführen"-
  Weg im Browser bestätigt: `*args`/`**kwargs` (12.6), lambda (12.7),
  `map()` (12.8), `filter()` (12.9), `sorted(..., key=len)` (12.10) —
  alle mit korrektem Status, korrekter Ausgabe und 0 Konsolenfehlern.
  Bestätigt damit empirisch die in der letzten Routine nur angenommene
  Äquivalenz von CPython-Subprozess und Browser-Pyodide für diese
  Sprachfeatures.
- **Vorgehen (3) Python B9 Teil 1:** `list-basics` (13, Index-Zugriff +
  `len()`, Distraktor verwechselt Index 2 mit dem zweiten Element —
  klassischer Off-by-one), `list-slicing` (13.1, `liste[1:4]`, Distraktor
  setzt `stop` einen zu niedrig), `list-mutation-methods` (13.2,
  `.append()`/`.remove()`/`.sort()` verkettet, Distraktor vergisst
  `.sort()` → falsche Reihenfolge), `tuple-basics` (13.3, Unpacking +
  Summe, Distraktor versucht eine Tupel-Zuweisung → echter `TypeError`
  demonstriert genau die Unveränderlichkeit), `dict-basics` (13.4, neuer
  Schlüssel + Update eines bestehenden, Distraktor tippt einen
  Schlüsselnamen klein → legt versehentlich einen neuen vierten Schlüssel
  an statt den bestehenden zu überschreiben). Alle fünf über Gate 1/Gate 2
  und zusätzlich live im Browser gegen echtes Pyodide bestätigt (5/5
  Lösungen, 0 Konsolenfehler).
- **Ergebnis:** Keine Bugs gefunden — alle Lösungen und Distraktoren
  verhalten sich wie erwartet, sowohl im Node-Testmotor als auch live im
  Browser. Python-Konzept-Hierarchie-Bilanz: 39/82 → 44/82 Tags (≈ 54 %,
  erstmals über die Hälfte). B9 zur Hälfte abgedeckt (5/10); die zweite
  Hälfte (`dict-methods`, `set-basics`, `nested-data-structures`,
  `membership-operator`, `len-function`) ist der naheliegende nächste
  Schritt vor einem neuen Zweig.
- **Tests:** 708 → 718 (+10, alle für die fünf neuen
  Datenstrukturen-Challenges via `challengeRunner.test.ts`). `typecheck`,
  volle Testsuite (718 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: C#-Engine-Projekt gescaffoldet (Schritt 2)

- **Umfang:** Baseline geprüft (718/718 grün, unverändert). Da SQL/Python
  in den letzten Runden viel Fortschritt gemacht haben und C# seit der
  Hosting-Entscheidung keine Bewegung hatte, diese Runde auf **einen**
  bewusst begrenzten C#-Schritt fokussiert: Schritt 2 der Restliste in
  `docs/csharp-engine-poc.md` — die funktionierende Scratchpad-POC in ein
  echtes, ins Git eingechecktes Projekt (`csharp-engine/` am Repo-Root,
  außerhalb von `src/`) überführen.
- **Vorgehen:** POC-Quellcode 1:1 übernommen (Blazor-WASM-Template +
  `CSharpEngine.cs` mit `CSharpCompilation`-Pipeline), dabei drei echte
  Verbesserungen gegenüber dem Wegwerf-POC vorgenommen: (1) das
  ungenutzte `Microsoft.CodeAnalysis.CSharp.Scripting`-Package durch das
  schlankere `Microsoft.CodeAnalysis.CSharp` ersetzt (die Scripting-API
  wurde nie benutzt, siehe die vier dokumentierten WASM-Bugs). (2) Die
  Referenz-Assembly-Abfrage lief im POC gegen einen hartcodierten
  `http://localhost:8899/`-Wegwerf-Server — jetzt ein `BaseAddress`-Feld,
  das `Program.cs` beim Start aus `HostEnvironment.BaseAddress` setzt, so
  dass die DLLs same-origin aus `wwwroot/refs/` geladen werden, sowohl
  unter `dotnet run` als auch später im echten Deployment, ohne
  CORS-Sonderfall. (3) Die 11 benötigten Referenz-DLLs werden **nicht**
  als Binärdateien committet, sondern von einem neuen MSBuild-Target
  (`CopyCSharpEngineRefAssemblies`, `BeforeTargets="Build"`) bei jedem
  Build direkt aus dem installierten SDK kopiert (`$(NetCoreTargetingPackRoot)`
  + `$(BundledNETCoreAppPackageVersion)`) — kann nie veraltet sein, hält
  das Repo frei von ~1 MB Binärdateien.
- **Verifikation:** `dotnet build` läuft sauber durch, das Copy-Target
  befüllt `wwwroot/refs/` tatsächlich mit allen 11 DLLs. Danach ein
  echter Live-Test: `dotnet run` gestartet, per Playwright (echtes
  headless Chromium) die Seite geladen und die Browser-Konsole geprüft —
  der fest im Smoke-Test verdrahtete Codeschnipsel
  (`int x = 2 + 2; Console.WriteLine($"x = {x}");`) kompiliert und läuft
  tatsächlich: `{"stdout":"x = 4\n","result":null,"error":null}`. Damit
  bestätigt: Portierung in die echte Projektstruktur, Paketwechsel und
  same-origin-Referenzen funktionieren alle zusammen einwandfrei, nicht
  nur "es kompiliert". `bin/`, `obj/` und `wwwroot/refs/` sind gitignored
  (Build-Output bzw. build-zeit-generiert). Haupt-App (`npm`-Tests,
  Typecheck, Build) währenddessen unverändert grün — das neue
  Top-Level-Verzeichnis stört Vite/Vitest nicht.
- **Ergebnis:** Keine Bugs in der Haupt-App. C#-Engine-Integration:
  Schritt 1 (Hosting) und jetzt Schritt 2 (Projekt-Scaffold) der
  Restliste sind erledigt. Noch **kein** CI/Deploy-Schritt für
  `csharp-engine/` (bewusst zurückgestellt, um dieses Increment
  begrenzt zu halten) und noch keinerlei Anbindung an `src/` — nächster
  sinnvoller Schritt ist `src/runtime/csharp/csharpEngine.ts` (Schritt
  3), sobald eine künftige Runde dafür Zeit hat. `docs/csharp-engine-poc.md`
  und `docs/csharp-concept-hierarchy.md` entsprechend aktualisiert
  (Letzteres bleibt bei 0/86 Tags — dies ist Engine-Infrastruktur, keine
  Lerninhalte).
- **Tests:** Unverändert 718 (kein TS-/Testcode geändert, reines
  C#-Infrastruktur-Increment). `typecheck`, volle Testsuite (718 Tests)
  und `npm run build` grün — zusätzlich `dotnet build` und ein Live-Lauf
  für `csharp-engine/` grün.

### 2026-08-08 — Stündliche Routine: B9 Datenstrukturen komplettiert

- **Umfang:** Baseline geprüft (718/718 grün, unverändert). Coverage
  erneut durchsucht — keine neuen Lücken seit der letzten Runde (alle
  verbleibenden niedrigen Werte sind dieselben bereits mehrfach geprüften
  reinen Interface-Dateien bzw. defensiven, unerreichbaren Zweige). Da
  weder Bugs noch neue Coverage-Lücken zu finden waren, den in der
  letzten Runde explizit benannten nächsten Content-Schritt umgesetzt:
  die zweite Hälfte von Python B9 (Datenstrukturen) als Challenges
  13.5–13.9 ergänzt.
- **Vorgehen:** `dict-methods` (13.5, `.get()` mit Standardwert plus
  `.items()`-Iteration in einer Schleife, Distraktor greift stattdessen
  direkt mit `preise["Mango"]` zu → echter KeyError), `set-basics` (13.6,
  Mengen-Literal mit bewusst doppeltem Element, Distraktor verwendet
  eckige statt geschweifter Klammern → Liste statt Menge, Duplikat bleibt
  erhalten), `nested-data-structures` (13.7, Liste aus Dicts mit
  verkettetem Index+Schlüssel-Zugriff, Distraktor versucht
  `personen[0, "alter"]` als kombinierten Zugriff → echter TypeError, da
  Listen nicht mit einem Tupel indizierbar sind), `membership-operator`
  (13.8, `in`/`not in` auf einer Liste, Distraktor vertauscht `in` und
  `not in`), `len-function` (13.9, `len()` einheitlich über String,
  Liste und Dict demonstriert, Distraktor vertauscht die Zuweisungen für
  Liste und Dict). Alle fünf über Gate 1/Gate 2 und zusätzlich live im
  Browser gegen echtes Pyodide bestätigt (5/5 Lösungen, 0
  Konsolenfehler) — derselbe `context.route()`-Workaround wie in den
  vorherigen Live-Läufen.
- **Ergebnis:** Keine Bugs gefunden. Python-Konzept-Hierarchie-Bilanz:
  44/82 → 49/82 Tags (≈ 60 %). **B9 Datenstrukturen ist damit komplett
  (10/10) — der dritte vollständig geschlossene Python-Zweig nach B7
  und B8.** Nächster naheliegender Content-Schritt: B10 Comprehensions
  & Generatoren, das direkt auf den jetzt fertigen B7/B9 aufbaut.
- **Tests:** 718 → 728 (+10, alle für die fünf neuen
  Datenstrukturen-Challenges via `challengeRunner.test.ts`). `typecheck`,
  volle Testsuite (728 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: B10 Comprehensions & Generatoren (Teil 1)

- **Umfang:** Baseline geprüft (728/728 grün, unverändert). C# stand als
  nächster möglicher Schritt an (`src/runtime/csharp/csharpEngine.ts`),
  aber dieser Schritt verzahnt sich mit der bewusst zurückgestellten
  CI/Deploy-Frage aus der letzten C#-Runde — kein sauber begrenzter
  Schritt gerade. Stattdessen den zuletzt benannten Content-Schritt
  umgesetzt: 5 der 7 Tags aus B10 (Comprehensions & Generatoren) als
  Challenges 14–14.4 ergänzt.
- **Vorgehen:** `list-comprehension` (14, `[x**2 for x in zahlen]`,
  Distraktor verdoppelt statt zu quadrieren), `comprehension-with-
  condition` (14.1, zusätzliches `if x % 2 == 0`, Distraktor vergisst
  die Bedingung komplett), `dict-comprehension` (14.2, `{wort: len(wort)
  for wort in woerter}`, Distraktor vertauscht Schlüssel und Wert),
  `set-comprehension` (14.3, `{len(wort) for wort in woerter}` mit
  bewusst wortlängengleichen Einträgen zur Demonstration von Duplikat-
  Entfernung, Validator zählt bewusst nur `len(...)` statt konkrete
  Set-Werte zu vergleichen, um keine Python-Set-Iterationsreihenfolge
  vorauszusetzen — Distraktor nutzt eine Liste statt eines Sets, Duplikat
  bleibt erhalten), `generator-expression` (14.4, demonstriert die
  Ein-mal-verbrauchbarkeit eines Generators: derselbe Generator zweimal
  mit `sum(...)` aufgerufen liefert beim zweiten Mal `0`, weil er bereits
  erschöpft ist — ein echter, oft überraschender Python-Effekt;
  Distraktor nutzt eine List Comprehension statt einer Generator
  Expression, wodurch beide `sum()`-Aufrufe 55 statt 55/0 liefern). Die
  letzten beiden B10-Tags (`iterator-protocol`, `generator-functions`)
  hängen laut Voraussetzungsgraph an `dunder-methods` (B14
  Objektorientierung, noch komplett offen) und wurden bewusst
  zurückgestellt statt vorgezogen. Alle fünf über Gate 1/Gate 2 und
  zusätzlich live im Browser gegen echtes Pyodide bestätigt (5/5
  Lösungen, 0 Konsolenfehler) — insbesondere die Generator-Erschöpfung
  (14.4) live verifiziert, da das ein Verhalten ist, bei dem es sich
  lohnt, sich nicht nur auf CPython-Subprozess-Äquivalenz zu verlassen.
- **Ergebnis:** Keine Bugs gefunden. Python-Konzept-Hierarchie-Bilanz:
  49/82 → 54/82 Tags (≈ 66 %) — praktisch gleichauf mit SQL (55/82,
  ≈ 67 %). B10 zu 5/7 abgedeckt, der Rest wartet bewusst auf B14.
  Nächster vollständig angehbarer Zweig (keine Abhängigkeit von noch
  fehlendem Material): B11 Fehlerbehandlung (6 Tags).
- **Tests:** 728 → 738 (+10, alle für die fünf neuen Comprehension-
  Challenges via `challengeRunner.test.ts`). `typecheck`, volle
  Testsuite (738 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: B11 Fehlerbehandlung (Teil 1) — Python zieht an SQL vorbei

- **Umfang:** Baseline geprüft (738/738 grün, unverändert). C# weiterhin
  ohne sauber begrenzten nächsten Schritt (siehe letzte Runde). B11
  Fehlerbehandlung wie in der letzten Runde angekündigt umgesetzt: 5 der
  6 Tags als Challenges 15–15.3.
- **Vorgehen:** `runtime-errors-concept` + `try-except` (15, bewusst
  gebündelt — Laufzeitfehler als Konzept ohne try/except als Werkzeug
  wäre inhaltsleer; Division durch 0 abgefangen, Distraktor lässt den
  Fehler unabgefangen durchschlagen), `specific-exception-types` (15.1,
  zwei verschiedene `except`-Blöcke für `KeyError` und `ValueError` in
  derselben Schleife, Distraktor lässt einen davon weg → echter,
  unabgefangener Fehler mittendrin), `finally-else-clauses` (15.2,
  `else` läuft nur bei Erfolg, `finally` immer — Distraktor lässt den
  `finally`-Block ganz weg → die Variable, die nur dort gesetzt wird,
  fehlt beim `print()`, echter NameError), `raise-statement` (15.3,
  eigene Funktion löst `ValueError` mit eigener Nachricht aus, wird
  abgefangen und die Nachricht ausgelesen, Distraktor lässt das `raise`
  im Bedingungszweig einfach weg → falscher Rückgabewert statt der
  erwarteten Fehlermeldung). Der letzte Tag (`custom-exceptions`) hängt
  wie zuvor schon zwei B10-Tags an `class-definition` aus B14
  (Objektorientierung) und bleibt aus demselben Grund offen. Alle vier
  über Gate 1/Gate 2 und zusätzlich live im Browser gegen echtes
  Pyodide bestätigt (4/4 Lösungen, 0 Konsolenfehler).
- **Ergebnis:** Keine Bugs gefunden. Python-Konzept-Hierarchie-Bilanz:
  54/82 → 59/82 Tags (≈ 72 %) — **Python liegt damit zum ersten Mal vor
  SQL** (55/82, ≈ 67 %). B10 und B11 beide zu 5/7 bzw. 5/6 abgedeckt,
  jeweils nur noch durch B14-Abhängigkeiten blockiert. Nächster
  vollständig angehbarer Zweig ohne Abhängigkeiten: B12 Module &
  Imports (4 Tags).
- **Tests:** 738 → 746 (+8, alle für die vier neuen
  Fehlerbehandlungs-Challenges via `challengeRunner.test.ts`).
  `typecheck`, volle Testsuite (746 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: B12 Module & Imports (Teil 1)

- **Umfang:** Baseline geprüft (746/746 grün, unverändert). C# weiterhin
  ohne sauber begrenzten nächsten Schritt. B12 Module & Imports wie
  angekündigt umgesetzt: 3 der 4 Tags als Challenges 16–16.2 — die
  ersten Challenges im ganzen Kurs, die `import` überhaupt benutzen.
- **Vorgehen:** `import-statement` (16, `import math` + `math.sqrt(16)`,
  Distraktor vergisst den Import → echter NameError, weil `math` ohne
  Import gar nicht existiert), `from-import` (16.1, `from math import
  sqrt` + direkter Aufruf `sqrt(25)` ohne Modul-Präfix, Distraktor ruft
  trotzdem `math.sqrt(...)` auf — ein sehr verbreiteter echter
  Einsteigerfehler, der ebenfalls einen NameError auslöst, weil `math`
  selbst nie importiert wurde), `standard-library-awareness` (16.2, zeigt
  `datetime.date` als zweites Standardbibliotheks-Modul neben `math`,
  berechnet die Tage zwischen zwei festen Daten über `(d2 - d1).days`;
  `random` wird im Tutorial nur erwähnt, nicht im Graded-Task benutzt,
  weil Zufallswerte sich nicht deterministisch validieren lassen — der
  exakte Tage-Wert (5898) wurde nicht von Hand ausgerechnet, sondern mit
  echtem `python3` im Sandbox-Terminal berechnet, bevor er in den
  TS-Validator übernommen wurde). Der vierte Tag (`own-modules`) bleibt
  offen — anders als die bisherigen B14-Wartefälle ist das eine
  **architektonische** Grenze: Der Editor führt ein einzelnes Skript in
  einem Namensraum aus, es gibt keine echte Mehrdatei-Umgebung, in der
  Lernende eigene, separat importierbare `.py`-Dateien anlegen könnten.
  In `docs/python-concept-hierarchy.md` explizit als eigene, dauerhafte
  Ausnahme dokumentiert (nicht als "wartet auf X"). Alle drei über Gate
  1/Gate 2 und zusätzlich live im Browser gegen echtes Pyodide bestätigt
  (3/3 Lösungen, 0 Konsolenfehler) — insbesondere relevant, weil `import`
  in Pyodides WASM-Sandbox theoretisch andere Stolpersteine haben könnte
  als im Node-Testmotor; gab es hier nicht, beide Module funktionieren
  identisch.
- **Ergebnis:** Keine Bugs gefunden. Python-Konzept-Hierarchie-Bilanz:
  59/82 → 62/82 Tags (≈ 76 %). B10, B11 und B12 jetzt alle fast komplett
  (5/7, 5/6, 3/4) — jeweils nur noch durch entweder die B14-Abhängigkeit
  oder (nur bei `own-modules`) die Sandbox-Architektur blockiert.
  Einziger noch komplett offener Zweig ohne B14-Abhängigkeit: B13
  Dateizugriff.
- **Tests:** 746 → 752 (+6, alle für die drei neuen Modul-Challenges via
  `challengeRunner.test.ts`). `typecheck`, volle Testsuite (752 Tests)
  und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: B13 Dateizugriff komplett — F-016 (Test-Isolations-Bug) gefunden und behoben

- **Umfang:** Baseline geprüft (752/752 grün, unverändert). B13
  Dateizugriff wie angekündigt umgesetzt — anders als bei `own-modules`
  in der letzten Runde stellte sich heraus, dass Dateizugriff (im
  Gegensatz zu Mehrdatei-Imports) **innerhalb eines einzelnen Skripts**
  vollständig möglich ist (öffnen, schreiben, schließen, wieder öffnen,
  lesen — alles in derselben Editor-Box), also keine Sandbox-Ausnahme
  nötig. Alle 4 Tags aus B13 als Challenges 17–17.2 ergänzt.
- **Vorgehen (Recherche vor dem Schreiben):** Vor der ersten Challenge
  empirisch geprüft (nicht angenommen), wie sich Pyodides virtuelles
  Dateisystem über mehrere `exec()`-Aufrufe hinweg verhält — per
  Kurzskript direkt gegen das npm-`pyodide`-Paket (dieselbe Version
  `0.26.4` wie der Browser-CDN-Load). Ergebnis: Eine Datei, die in einem
  `runPython()`-Aufruf geschrieben wird, **bleibt für alle folgenden
  Aufrufe auf derselben Pyodide-Instanz sichtbar** — das virtuelle
  Dateisystem ist nicht pro Ausführung isoliert, sondern lebt so lange
  wie die WASM-Instanz selbst (die laut `src/ui/context.ts` einmal pro
  Session geladen und für alle weiteren Läufe wiederverwendet wird,
  `ensurePythonEngine` memoized `mainPython`). Das steht im Kontrast zum
  Node-Testmotor (`nodePythonEngine.ts`), der pro `exec()` ein frisches
  Temp-Verzeichnis anlegt und danach löscht — dort ist jeder Lauf
  vollständig isoliert. Diese Asymmetrie ist bisher folgenlos (es gab
  noch keine dateibasierten Challenges), wird aber ab jetzt relevant und
  ist entsprechend in `docs/python-concept-hierarchy.md`s B13-Abschnitt
  dokumentiert.
- **Vorgehen (Content):** Alle drei Lösungen deshalb bewusst so entworfen,
  dass sie unabhängig von eventuell aus früheren Läufen vorhandenem
  Dateiinhalt korrekt funktionieren — jede öffnet zuerst im Modus `"w"`
  (überschreibt garantiert den kompletten Inhalt), bevor irgendetwas
  gelesen wird. `file-open-read` + `context-manager-with` (17, bewusst
  gebündelt — `with open(...) as f:` ist der einzig noch zeitgemäße Weg,
  eine Datei zu öffnen, sie separat von einem rohen `open()`/`close()`
  zu lehren wäre künstlich; Distraktor liest eine nie geschriebene Datei
  → echter FileNotFoundError), `file-write` (17.1, drei `.write()`-
  Aufrufe mit `\n` bauen eine mehrzeilige Datei auf, Distraktor vergisst
  die Zeilenumbrüche → Wörter kleben zusammen), `file-modes` (17.2, der
  Unterschied zwischen `"w"` (überschreibt) und `"a"` (hängt an) — der
  Distraktor verwendet fälschlich zweimal `"w"`, wodurch der erste
  Eintrag durch den zweiten `open()`-Aufruf sofort gelöscht wird, bevor
  überhaupt geschrieben wird: genau der Kernpunkt der Lektion als echter,
  beobachtbarer Unterschied). Alle drei über Gate 1/Gate 2 bestätigt.
- **Vorgehen (Verifikation über das Übliche hinaus):** Zusätzlich zur
  üblichen Live-Pyodide-Verifikation wurde jede der drei Lösungen live im
  Browser **zweimal unmittelbar hintereinander** ausgeführt (ohne
  Seitenneuladung, wie ein Lernender es täte, der zweimal auf "Ausführen"
  klickt), um die oben gefundene Persistenz-Eigenschaft gezielt zu
  provozieren statt sie nur zu vermuten. Alle drei liefern bei beiden
  Läufen identisch korrekte Ergebnisse — die `"w"`-zuerst-Bauweise hält,
  was sie verspricht. 0 Konsolenfehler in beiden Durchläufen.
- **F-016 (echter Bug, gefunden beim ersten Testlauf dieser Charge):**
  `git status` zeigte nach dem ersten `challengeRunner.test.ts`-Lauf
  plötzlich drei unversionierte Dateien im Repo-Root
  (`liste.txt`, `log.txt`, `notizen.txt`) — der Node-Testmotor
  (`nodePythonEngine.ts`) spawnte `python3` ohne `cwd`, wodurch relative
  Dateipfade im Testcode ins Repo-Arbeitsverzeichnis statt in den dafür
  vorgesehenen, per `rmSync` aufgeräumten Temp-Ordner schrieben. Fix:
  `cwd: dir` bei `spawnSync` gesetzt. Neuer Regressionstest schreibt
  gezielt eine Datei und prüft `existsSync(cwd + "/notizen.txt") ===
  false`; vor dem Fix per `git stash` auf die alte Implementierung rot
  reproduziert, danach grün. Siehe Findings-Tabelle oben.
- **Ergebnis:** Ein echter Bug gefunden und behoben (F-016, im
  Test-Tooling, nicht in der Live-App selbst) — die Dateisystem-
  Persistenz in Pyodide ist dagegen reales, korrektes Verhalten der
  Engine, keine App-seitige Fehlfunktion, und die neue Content-Charge ist
  gezielt robust dagegen gebaut. Python-Konzept-Hierarchie-Bilanz:
  62/82 → 66/82 Tags (≈ 80 %). **B13 ist der vierte komplett abgedeckte
  Python-Zweig** (nach B7, B8, B9). Einziger noch komplett offener
  Zweig: B14 Objektorientierung — dessen Bearbeitung würde zugleich drei
  zurückgestellte Einzeltags aus B10/B11 freischalten.
- **Tests:** 752 → 759 (+7: 6 für die drei neuen Dateizugriff-Challenges
  via `challengeRunner.test.ts`, +1 Regressionstest für F-016 in
  `nodePythonEngine.test.ts`). `typecheck`, volle Testsuite (759 Tests)
  und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: SQL B11 Transaktionen komplett (nach mehreren reinen Python-Runden)

- **Umfang:** Baseline geprüft (759/759 grün, unverändert). Python steht
  inzwischen bei 66/82 (≈ 80 %) mit nur noch B14 (OOP, 8 Tags, großer
  Brocken) komplett offen; SQL lag bei 55/82 (≈ 67 %) mit drei kleinen,
  komplett offenen Zweigen (B11 Transaktionen 3 Tags, B12 Views 2 Tags,
  B13 Indizes 2 Tags) — nach mehreren aufeinanderfolgenden reinen
  Python-Runden diesmal SQL den Vorzug gegeben. B11 Transaktionen
  komplett als Challenges 16–16.2 umgesetzt.
- **Vorgehen (Recherche vor dem Schreiben):** Vor der ersten Challenge
  empirisch (nicht angenommen) geprüft, dass `BEGIN`/`COMMIT`/
  `ROLLBACK`/`SAVEPOINT`/`ROLLBACK TO` durch die eigene
  `executeAndValidate`-Pipeline (Mehrfach-Statement-Splitting +
  `node:sqlite`) korrekt funktionieren — per Kurzskript direkt gegen
  `createNodeSqliteEngine`. Dabei auch geprüft, ob eine offene, nie
  committete Transaktion auf derselben Verbindung sofort sichtbare
  Änderungen zeigt (ja, "read your own writes") — das schließt "COMMIT
  vergessen" als sauber testbaren Distraktor für `transaction-basic`
  aus, da eine `validate()`-Prüfung auf derselben Verbindung den
  Unterschied nicht sehen könnte. Stattdessen empirisch verifiziert,
  dass ein doppeltes `BEGIN` innerhalb derselben Transaktion einen
  echten SQLite-Fehler auslöst ("cannot start a transaction within a
  transaction") — daraus einen tag-relevanten, tatsächlich
  fehlschlagenden Distraktor gebaut, statt eine irreführende Prüfung zu
  schreiben.
- **Vorgehen (Content):** Alle drei Challenges erzählen ein
  durchgehendes Überweisungs-Szenario (Konten Anna/Ben/Clara), jede
  Rechnung vorab mit echtem `node:sqlite` durchgerechnet statt von Hand
  geschätzt. `transaction-basic` (16, BEGIN/COMMIT für eine Überweisung,
  Distraktor: doppeltes BEGIN → echter Fehler), `rollback` (16.1,
  ROLLBACK macht beide UPDATEs vollständig rückgängig, Distraktor
  verwechselt COMMIT mit ROLLBACK → Überweisung bleibt fälschlich
  bestehen), `savepoint` (16.2, SAVEPOINT + ROLLBACK TO verwirft gezielt
  nur die zweite von zwei Überweisungen innerhalb derselben Transaktion,
  Distraktor vergisst ROLLBACK TO → beide Überweisungen werden
  fälschlich übernommen). Alle drei über Gate 1/Gate 2 (`node:sqlite`)
  und zusätzlich live im Browser gegen echtes sql.js-WASM bestätigt
  (3/3 Lösungen korrekt, 0 Konsolenfehler) — inklusive eines gezielten
  Live-Checks, dass der doppelte-BEGIN-Distraktor exakt dieselbe
  Fehlermeldung liefert wie im Node-Testmotor.
- **Ergebnis:** Keine Bugs gefunden — reine, saubere neue Inhalte.
  SQL-Konzept-Hierarchie-Bilanz: 55/82 → 58/82 Tags (≈ 71 %). **B11 ist
  der dritte komplett abgedeckte SQL-Zweig** (nach B7, B10). Nur noch
  zwei kleine Zweige komplett offen: B12 Views (2 Tags), B13 Indizes
  (2 Tags).
- **Tests:** 759 → 765 (+6, alle für die drei neuen
  Transaktions-Challenges via `challengeRunner.test.ts`). `typecheck`,
  volle Testsuite (765 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: SQL B12 Views abgeschlossen + `updatable-view` als dauerhafte Scope-Ausnahme dokumentiert

- **Umfang:** Baseline geprüft (765/765 grün, `typecheck`/`build`
  sauber, sauberer Git-Stand). SQL lag bei 58/82 (≈ 71 %) mit zwei
  kleinen, komplett offenen Zweigen (B12 Views 2 Tags, B13 Indizes
  2 Tags). B12 als nächster Zweig gewählt.
- **Vorgehen (Recherche vor dem Schreiben):** Vor dem Entwurf von
  `updatable-view` empirisch (nicht angenommen) geprüft, ob SQLite
  `UPDATE`/`INSERT` durch eine einfache View hindurch überhaupt
  zulässt. Per Kurzskript gegen `createNodeSqliteEngine`: eine View
  `it_mitarbeiter AS SELECT ... FROM mitarbeiter WHERE abteilung='IT'`
  angelegt, lesend funktioniert sie korrekt, aber
  `UPDATE it_mitarbeiter SET gehalt = gehalt + 500 WHERE name='Ben'`
  löst den echten Fehler `cannot modify it_mitarbeiter because it is a
  view` aus. Zusätzlich geprüft, dass das kein Artefakt einer veralteten
  SQLite-Version ist (`node:sqlite` meldet 3.51.2, eine aktuelle
  Version). SQLite macht Views nur über `INSTEAD OF`-Trigger
  beschreibbar — Trigger stehen in `docs/sql-concept-hierarchy.md`
  Abschnitt 7 aber bereits als bewusst ausgeklammert. Damit ist
  `updatable-view` innerhalb dieses Curriculums grundsätzlich nicht
  erreichbar, nicht nur "noch nicht geschrieben" — ein struktureller
  Konflikt zwischen zwei bereits getroffenen Scope-Entscheidungen des
  Dokuments, nicht ein neuer Einzelfall. Als Auflösung: `updatable-view`
  bleibt als Tag im Graph stehen (beschreibt ein echtes SQL-Konzept),
  wird aber wie `own-modules` im Python-Dokument als dauerhafte
  Scope-Ausnahme dokumentiert statt als offene Lücke gezählt — mit dem
  Unterschied, dass es hier kein Sandbox-Limit ist, sondern eine direkte
  Folge der Trigger-Ausklammerung.
- **Vorgehen (Content):** Nur `create-view` als Challenge 17 umgesetzt
  (der einzige innerhalb des Scopes erreichbare der beiden B12-Tags).
  Szenario: Tabelle `mitarbeiter` (id, name, abteilung, gehalt), View
  `it_mitarbeiter` filtert auf `abteilung = 'IT'`. `validate()` fragt
  wie immer nach Hausstil live die erwarteten Zeilen direkt aus der
  Basistabelle ab (kein hartcodiertes Literal) und vergleicht sie mit
  dem, was die View liefert. Distraktor lässt `CREATE VIEW ... AS`
  komplett weg und führt nur die nackte `SELECT`-Abfrage aus — die
  anschließende Abfrage der (nie angelegten) View löst den echten Fehler
  `no such table: it_mitarbeiter` aus. Über Gate 1/Gate 2 (`node:sqlite`)
  und zusätzlich live im Browser gegen echtes sql.js-WASM bestätigt,
  inklusive eines gezielten zweiten Live-Laufs des Distraktors auf
  frisch zurückgesetztem Zustand (View wurde in einem vorherigen Lauf
  noch nicht angelegt), um eine irreführende Grünmeldung durch
  Zustands-Überlappung zwischen zwei Editor-Läufen auszuschließen.
- **Nebenbefund (kein Bug, dokumentiert statt gefixt):** Beim
  Live-Testen bestätigt, dass ein `CREATE VIEW` (wie jedes andere
  `CREATE ...`) beim zweimaligen Klicken auf "Ausführen" innerhalb
  derselben Challenge-Sitzung (ohne erneute Auswahl der Challenge, die
  `prepareChallenge`/`setup` neu abspielt) mit "view ... already exists"
  fehlschlägt. Das ist identisches, bereits bestehendes Verhalten wie
  bei jeder `CREATE TABLE`-Challenge und entspricht echter
  SQL-Semantik — keine Regression durch Challenge 17, keine
  Sonderbehandlung nötig.
- **Ergebnis:** Keine Bugs gefunden. SQL-Konzept-Hierarchie-Bilanz:
  58/82 → 59/82 Tags (≈ 72 %). **B12 gilt als abgeschlossen**
  (`create-view` abgedeckt, `updatable-view` als dauerhafte
  Scope-Ausnahme dokumentiert, analog zu `own-modules` bei Python). Nur
  noch B13 Indizes (2 Tags) komplett offen.
- **Tests:** 765 → 767 (+2, Gate 1/Gate 2 für Challenge 17 via
  `challengeRunner.test.ts`). `typecheck`, volle Testsuite (767 Tests)
  und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: C#-Engine Schritt 3 (Browser-Loader `csharpEngine.ts`)

- **Umfang:** Baseline geprüft (767/767 grün, `typecheck`/`build` sauber,
  sauberer Git-Stand). `docs/csharp-engine-poc.md` gelesen: Schritte 1
  (COOP/COEP-Hosting-Entscheidung: `coi-serviceworker`) und 2
  (`csharp-engine/`-Projekt gescaffoldet, baut lokal, live per Playwright
  gegen echtes `dotnet run` bestätigt) waren bereits in einer früheren
  Routine abgeschlossen. Schritt 3 (Browser-seitiger Loader) war der
  nächste, klar umrissene Schritt in der eigenen Abhängigkeits-Reihenfolge
  des Dokuments — SQL/Python waren beide grün und ohne offensichtlichen
  nächsten kleinen Schritt in B13 (Indizes) über das übliche Maß hinaus,
  daher diesmal C# den Vorzug gegeben, wie der Standing-Auftrag es für
  Runden mit klarer C#-Dynamik vorsieht.
- **Vorgehen:** `src/runtime/csharp/CSharpRuntime.ts` (Vertrag, analog zu
  `PythonRuntime.ts`: `exec`/`reset`, `CSharpExecResult` mit
  `stdout`/`result`/`error`) und `csharpEngine.ts`
  (`loadCSharpEngineFromServer(baseUrl)` + `createCSharpEngine(exports)`)
  ergänzt — spiegelt exakt das Skript-Injection-Muster von
  `loadPyodideFromCdn` (geteiltes In-Flight-Laden, Retry nach
  Fehlschlag), aber für Blazors `Blazor.start()` /
  `Blazor.runtime.getAssemblyExports(...)`-Bootsequenz statt einer
  einzelnen globalen Funktion. 9 neue Unit-Tests gegen ein Fake-`window
  .Blazor` (gleiches Muster wie `pyodideEngine.test.ts`), neuer
  `environmentMatchGlobs`-Eintrag in `vitest.config.ts` für `jsdom` auf
  diesem Modul.

  Zusätzlich **live gegen den echten kompilierten Blazor+Roslyn-Bundle**
  verifiziert, nicht nur gegen Mocks: `dotnet publish -c Release`, Output
  über einen minimalen Python-COOP/COEP-Server serviert (Pflicht wegen
  `WasmEnableThreads`, exakt das Rezept aus `docs/csharp-engine-poc.md`),
  `csharpEngine.ts` per `esbuild` in dasselbe servierte Verzeichnis
  gebündelt, per Playwright eine Testseite angesteuert, die
  `loadCSharpEngineFromServer` + `engine.exec(...)` tatsächlich aufruft.
  Drei Pfade bestätigt: erfolgreicher Lauf (`stdout` korrekt), ein echter
  Compiler-Fehler (`CS0029` bei einer ungültigen impliziten Konvertierung)
  und eine echte Laufzeit-Exception (`IndexOutOfRangeException`,
  vollständiger .NET-Stacktrace) — alle drei kommen unverändert durch den
  Loader durch. Eine harmlose Konsolen-Warnung beobachtet (`ManagedError:
  ... Could not find any element matching selector '#app'` — Blazors
  eigene Suche nach der Root-Komponente; irrelevant hier, da nur die
  `[JSExport]`-Methode genutzt wird, keine Razor-Komponente gerendert
  wird) — notiert, kein Defekt.
- **Ergebnis:** Keine Bugs gefunden. C#-Engine-Fortschritt: Schritte 1–3
  von 7 aus `docs/csharp-engine-poc.md` jetzt abgeschlossen. Wo die
  Blazor-Assets in der echten App (Dev-Server + GitHub-Pages-Deploy)
  serviert werden, bleibt bewusst offen — `loadCSharpEngineFromServer`
  nimmt `baseUrl` deshalb als Parameter statt eines fest verdrahteten
  Pfads, dieselbe bewusste Verzögerung wie beim „noch kein CI/Deploy-
  Wiring" aus Schritt 2. `src/runtime/csharp/README.md` von „Architektur
  ungeklärt" auf den tatsächlichen Stand aktualisiert. Nächster Schritt:
  die `validate()`-Design-Entscheidung für C# (Schritt 4).
- **Tests:** 767 → 776 (+9, alle für `csharpEngine.test.ts`). `typecheck`,
  volle Testsuite (776 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: F-017-Fix (Live-Bug-Hunt) + SQL B13 Indizes komplett

- **Umfang:** Baseline geprüft (776/776 grün). Statt direkt in Content
  einzusteigen, zuerst gezielt nach echten Bugs gesucht (Priorität 2 vor
  Priorität 3): Coverage-Report nach echten (nicht-Challenge-Catch-Branch)
  Lücken durchsucht, dann ein Live-Playwright-Durchlauf gegen den echten
  Dev-Server mit lokal servierten sql.js/Pyodide-Assets — leerer/
  Whitespace-Editor beim Ausführen, Track-Wechsel SQL↔Python, Mobile-
  Viewport-Sidebar. Dabei F-017 gefunden (siehe Findings-Tabelle oben).
  Danach SQL B13 (Indizes) als nächster, klar umrissener Content-Schritt
  gewählt — der letzte komplett offene SQL-Zweig.
- **F-017-Fix:** `emptyResultsPlaceholder(trackId)` ergänzt, Aufruf in
  `syncEditorToSelection` von einem hartcodierten String auf die neue
  Funktion umgestellt. Regressionstest vor dem Fix rot reproduziert
  (Zeile testweise zurückgesetzt, Test schlug mit der falschen SQL-
  Meldung fehl), nach dem Fix grün. Live im Browser gegen beide Tracks
  bestätigt (Python zeigt jetzt „Noch kein Code ausgeführt.").
- **Vorgehen (SQL B13, Recherche vor dem Schreiben):** Vor dem Entwurf
  empirisch (nicht angenommen) geprüft, wie `EXPLAIN QUERY PLAN` in
  diesem SQLite tatsächlich aussieht — per Kurzskript gegen
  `createNodeSqliteEngine`: ohne Index liefert die `detail`-Spalte
  `"SCAN <tabelle>"`, mit passendem Index `"SEARCH <tabelle> USING INDEX
  <name> (...)"`. Ebenso `PRAGMA index_info(<name>)` geprüft (liefert
  `seqno/cid/name`-Zeilen — Spalte 2 ist der indizierte Spaltenname),
  um bei Challenge 18 einen Index-Namen von der tatsächlich indizierten
  Spalte strukturell zu unterscheiden (ein Distraktor mit richtigem Namen
  aber falscher Spalte muss aktiv erkannt werden, nicht nur "Index mit
  diesem Namen existiert").
- **Vorgehen (Content):** Auch `create-index` selbst (strukturell B1,
  aber bis dahin durch keine einzige Challenge unterrichtet) diesmal
  mitgenommen, da es sich organisch aus B13 ergibt. Challenge 18
  (`create-index`): Index auf `mitarbeiter(name)` anlegen, validiert über
  `sqlite_master` + `PRAGMA index_info`. Challenge 18.1
  (`index-performance-concept`): zweites Szenario (`bestellungen`),
  Index muss auf die tatsächlich gefilterte Spalte (`kunde_id`) zeigen,
  damit `EXPLAIN QUERY PLAN` von SCAN auf SEARCH wechselt — Distraktor
  indiziert die falsche Spalte (`betrag`), Plan bleibt bei SCAN.
  Challenge 18.2 (`explain-query-plan`): Index bereits im Setup vorhanden,
  Aufgabe ist, `EXPLAIN QUERY PLAN` selbst vor die Abfrage zu schreiben;
  Distraktor vergisst das Präfix und führt die Abfrage stattdessen wirk-
  lich aus — `lastResult` hat dann die Spalten id/kunde_id/betrag statt
  id/parent/notused/detail, was `validate()` strukturell erkennt (keine
  Spalte „detail"), nicht über einen hartcodierten Text-Vergleich. Alle
  drei über Gate 1/Gate 2 (`node:sqlite`) und zusätzlich live im Browser
  gegen echtes sql.js-WASM bestätigt (3/3 Lösungen korrekt mit den
  erwarteten Erfolgsmeldungen, 3/3 Distraktoren mit den erwarteten
  Fehlermeldungen auf frisch zurückgesetztem Zustand, 0 Konsolenfehler).
- **Ergebnis:** F-017 (echter, wenn auch kleiner UI-Bug) gefunden und
  behoben. SQL-Konzept-Hierarchie-Bilanz: 59/82 → 62/82 Tags (≈ 76 %).
  **B13 ist der vierte komplett abgedeckte SQL-Zweig** (nach B7, B10,
  B12) — und dank `create-index` ist damit kein SQL-Zweig mehr zu 100 %
  Lücke. Einzige verbleibende Struktur-Lücke: `updatable-view` als
  dauerhafte Scope-Ausnahme (kein offener Punkt mehr).
- **Tests:** 776 → 783 (+7: 1 Regressionstest für F-017, 6 für die drei
  neuen Indizes-Challenges via `challengeRunner.test.ts`). `typecheck`,
  volle Testsuite (783 Tests) und `npm run build` grün.

### 2026-08-08 — Stündliche Routine: Python B14 Objektorientierung komplett

- **Umfang:** Baseline geprüft (783/783 grün). SQL hat inzwischen keinen
  komplett offenen Zweig mehr (nur noch die dokumentierte
  `updatable-view`-Ausnahme); Python hatte mit B14 Objektorientierung
  (8 Tags) den letzten, größten komplett offenen Zweig in beiden
  Sprachen — als nächstes, klar umrissenes Content-Ziel gewählt.
- **Vorgehen (Design):** Alle 8 Tags mit je einer Challenge umgesetzt,
  jede um ein eigenständiges, in sich abgeschlossenes Mini-Szenario
  gebaut statt eine durchgehende Klasse über alle 8 Aufgaben zu
  verschleppen (bewusst anders als bei den SQL-Transaktions-/View-
  Zweigen, weil hier jeder Tag ein eigenes, klar abgrenzbares
  Sprachfeature ist, keine Fortsetzung eines Szenarios). Wichtige
  Design-Randbedingung vorab geprüft: der Python-Treiber (sowohl
  `pyodideEngine.ts` als auch `nodePythonEngine.ts`) filtert
  `variables` auf JSON-sichere Typen — ein Objekt einer eigenen Klasse
  taucht dort nie auf. Jede Challenge musste deshalb ihr Ergebnis über
  eine Zahl/einen Text/eine Liste (aus einem Attribut oder
  Methodenaufruf extrahiert) oder stdout zurückgeben, nie über die
  Objektreferenz selbst.
- **Vorgehen (Distraktoren, vor dem Schreiben mit echtem `python3`
  verifiziert):** `class-definition` (18) — Methode ohne `self` löst
  `TypeError: takes 0 positional arguments but 1 was given` aus.
  `instance-attributes-init` (18.1) — Zuweisung ohne `self.`-Präfix in
  `__init__` löst `AttributeError` bei jedem Attributzugriff aus.
  `instance-methods` (18.2) — Methode ohne `self.`-Präfix löst
  `NameError` aus. `class-vs-instance-attributes` (18.3) — die
  subtilste der acht: `self.anzahl += 1` statt `Hund.anzahl += 1`
  erzeugt kein Fehler, sondern legt pro Objekt ein neues,
  verdeckendes Instanzattribut an; das geteilte Klassenattribut bleibt
  bei 0 stehen statt auf 2 zu zählen — empirisch bestätigt, nicht nur
  aus der Python-Doku übernommen. `inheritance` (18.4) — fehlende
  Basisklasse löst `TypeError: takes no arguments` aus.
  `method-overriding` (18.5) — fehlendes Override liefert die geerbte
  Version statt der eigenen (kein Fehler, nur falscher Wert).
  `dunder-methods` (18.6) — falscher Methodenname (`to_string` statt
  `__str__`) lässt `str()` auf die technische Standarddarstellung
  zurückfallen. `encapsulation-convention` (18.7) — einfacher statt
  doppelter Unterstrich verhindert das Name Mangling; geprüft über
  `vars(objekt)`, das bei doppeltem Unterstrich `_Konto__saldo` statt
  `_saldo` zeigt — eine echte, überprüfbare Verhaltensdifferenz, keine
  reine Konvention.
- **Live-Verifikation (mit Methodik-Korrektur):** Alle 8 Lösungen und
  Distraktoren zunächst per simuliertem Tippen (`page.keyboard.type`)
  gegen echtes Pyodide getestet — dabei durchgehend falsche
  `IndentationError`s beobachtet. Nachforschung ergab: kein Produktbug,
  sondern ein Artefakt der eigenen Testmethodik. Der Editor fügt beim
  Drücken von Enter automatisch Einrückung hinzu (`computeEnterInsertion`
  in `src/editor/languages/python/autoIndent.ts`) — bei simuliertem
  Tippen eines bereits vollständig eingerückten mehrzeiligen Strings
  addiert sich diese Auto-Einrückung mit der im Testcode bereits
  vorhandenen, was bei zwei verschachtelten Ebenen (Klasse → Methode →
  Rumpf) zu inkonsistenter, kumulierter Einrückung führt. Der echte
  "In den Editor übernehmen"-Button (`solutionSection.ts`) setzt den
  Wert dagegen direkt (`editor.setValue(...)`), ohne über die
  Tastatur-Logik zu laufen — genau wie ein Nutzer, der fertigen Code
  einfügt. Live-Skript entsprechend auf direktes Setzen des
  Textarea-Werts + `input`-Event umgestellt, damit es denselben Pfad
  wie der echte Button nimmt. Danach: alle 8 Lösungen korrekt mit ★★★,
  alle 8 Distraktoren korrekt mit den erwarteten Fehlermeldungen bzw.
  falschen Werten, 0 echte Konsolenfehler.
- **Ergebnis:** Keine Produkt-Bugs gefunden (nur die eigene
  Testmethodik korrigiert). Python-Konzept-Hierarchie-Bilanz: 66/82 →
  74/82 Tags (≈ 90 %). **B14 ist der fünfte komplett abgedeckte
  Python-Zweig** (nach B7, B8, B9, B13) — kein Python-Zweig ist mehr
  komplett Lücke. Die drei zuvor an B14 blockierten Einzeltags
  (`iterator-protocol`, `generator-functions` aus B10,
  `custom-exceptions` aus B11) sind jetzt entsperrt, aber noch nicht
  geschrieben — klarer nächster Schritt für eine künftige Routine.
- **Tests:** 783 → 799 (+16, alle für die acht neuen
  Objektorientierungs-Challenges via `challengeRunner.test.ts`).
  `typecheck`, volle Testsuite (799 Tests) und `npm run build` grün.

### 2026-08-09 — Stündliche Routine: Python B10/B11 abgeschlossen (die drei durch B14 entsperrten Einzeltags)

- **Umfang:** Baseline geprüft (799/799 grün). Kurzer Coverage-Check
  vorab (keine neuen, echten Lücken über die bekannten Challenge-Catch-
  Branches hinaus). Direkt zum in der letzten Routine identifizierten,
  klar umrissenen nächsten Schritt gegangen: die drei Tags
  `iterator-protocol`/`generator-functions` (B10) und `custom-exceptions`
  (B11), die zuvor an B14 (Objektorientierung) blockiert waren — B14
  existiert seit der letzten Routine vollständig, die drei Tags sind
  seither entsperrt, aber noch nicht geschrieben.
- **Vorgehen (Content):** Challenge 19 (`iterator-protocol`) baut eine
  `Countdown`-Klasse von Hand mit `__iter__`/`__next__`. Challenge 19.1
  (`generator-functions`) erzählt bewusst dieselbe Countdown-Idee noch
  einmal, diesmal als `yield`-Generatorfunktion — der Kontrast "von Hand"
  vs. "eine Zeile mit yield" ist der eigentliche Lerninhalt hinter dem
  Tag, nicht nur die Syntax für sich. Challenge 19.2 (`custom-exceptions`)
  definiert eine eigene `NichtGenugGeldError(Exception)`-Klasse für ein
  Konto-Abheben-Szenario. Alle drei Distraktoren vor dem Schreiben mit
  echtem `python3` verifiziert, nicht angenommen: fehlendes `return self`
  in `__iter__` löst `TypeError: iter() returned non-iterator of type
  'NoneType'` aus; `return` statt `yield` macht die Funktion zu keiner
  Generatorfunktion mehr, `list(...)` auf dem zurückgegebenen `int`
  schlägt mit `TypeError: 'int' object is not iterable` fehl; ein
  eingebautes `ValueError` statt der eigenen Exception-Klasse wird vom
  `except NichtGenugGeldError` nicht abgefangen und bleibt unbehandelt.
  Bei der Distraktor-Wahl bewusst auf jede Variante verzichtet, die eine
  Endlosschleife hätte auslösen können (z. B. ein `StopIteration`, das
  nie ausgelöst wird) — sowohl aus Sicherheits- als auch aus
  Testlaufzeit-Gründen.
- **Live-Verifikation:** Alle drei Lösungen und Distraktoren gegen echtes
  Pyodide bestätigt — diesmal von vornherein mit der in der letzten
  Routine korrigierten Methodik (Editor-Wert direkt setzen statt
  Tastatureingabe zu simulieren), kein erneutes Stolpern über das
  Auto-Indent-Artefakt. Alle drei Lösungen korrekt mit ★★★, alle drei
  Distraktoren mit den erwarteten Fehlermeldungen, 0 echte
  Konsolenfehler.
- **Ergebnis:** Keine Bugs gefunden. Python-Konzept-Hierarchie-Bilanz:
  74/82 → 77/82 Tags (≈ 94 %). **B10 und B11 sind jetzt ebenfalls
  vollständig abgedeckt** — zusammen mit B7, B8, B9, B13, B14 sind das
  sieben komplett geschlossene Python-Zweige. Die einzige verbleibende
  strukturelle Lücke ist `own-modules` (B12), die dauerhafte
  Sandbox-Grenze; die restlichen vier offenen Tags (`dynamic-typing`,
  `bool-conversion-truthiness`, `truthiness-in-conditions`,
  `ternary-expression`) sind kleine, unabhängige Einzeltags ohne
  Blockade, einfach noch nicht an der Reihe.
- **Tests:** 799 → 805 (+6, alle für die drei neuen Challenges via
  `challengeRunner.test.ts`). `typecheck`, volle Testsuite (805 Tests)
  und `npm run build` grün.

### 2026-08-09 — Stündliche Routine: Bug-Hunt (nichts gefunden) + C# Schritt 4 (validate()-Design entschieden)

- **Umfang:** Baseline geprüft (805/805 grün). SQL und Python haben
  beide keinen größeren offenen Zweig mehr (SQL: nur `updatable-view`
  als dauerhafte Ausnahme; Python: nur `own-modules` + vier kleine,
  nie blockierte Einzeltags) — Content-Arbeit hätte diesmal nur noch
  verstreute Einzeltags statt eines zusammenhängenden Zweigs bedient.
  Stattdessen zuerst gezielt nach echten Bugs gesucht (Priorität 2),
  dann zum C#-Engine-Schritt 4 gewechselt, der seit mehreren Routinen
  als klar umrissener nächster Schritt dokumentiert war.
- **Bug-Hunt:** Live-Playwright-Durchlauf gegen Theme-Picker,
  Tastatur-Fokus in der Challenge-Liste, Tipps-Sektion, Vergleichs-
  Ansicht, Chat-Tab und mobiles Sidebar-Overlay. Mehrere anfängliche
  „Fehler" entpuppten sich beim Nachprüfen als falsche Selektoren im
  eigenen Testskript, nicht als echte Bugs — u. a. wurde
  `document.documentElement.dataset.theme` statt `.sql-app`s
  `data-theme`-Attribut geprüft (das Theme wird bewusst nur auf dem
  App-Root gesetzt, nicht auf `<html>`), und ein Pfeiltasten-Test ging
  von einer Roving-Tabindex-Navigation aus, die die Challenge-Liste nie
  hatte (nur Enter/Space sind laut `challengeList.test.ts` bewusst
  unterstützt, Pfeiltasten nutzen die native Tab-Reihenfolge). Nach
  Korrektur der Selektoren: alles funktioniert wie erwartet, 0 echte
  Bugs gefunden.
- **C# Schritt 4:** `docs/csharp-engine-poc.md` Schritt 4 entschieden —
  **stdout-only** validate()-Design (Option a aus den drei dort
  aufgeführten). Begründung: `Console.WriteLine` ist die natürliche
  Ausgabe-Form für Einsteiger-C#, direkte Parallele zu Pythons
  `print()`, und dieses Projekt prüft in Python-Validatoren bereits
  etabliert gegen `stdout` — kein neues, unbewiesenes Muster. Die
  Alternative (Ergebnisse über `public static`-Felder zurückmelden,
  per Reflection ausgelesen) wurde verworfen, weil sie schon die
  allererste Lektion gezwungen hätte, `static` zu benutzen — ein
  Level-6-Tag laut `docs/csharp-concept-hierarchy.md`, den der Kurs an
  der Stelle noch gar nicht erklärt hätte. Als direkte Konsequenz das
  seit Schritt 3 nie befüllte, nur als Platzhalter vorhandene
  `result`-Feld aus `CSharpExecResult` (`src/runtime/csharp/
  CSharpRuntime.ts`) und aus dem C#-Treiber selbst (`csharp-engine/
  CSharpEngine.cs`, wo die zugehörige lokale Variable ebenfalls nie
  zugewiesen wurde) entfernt — echter, wenn auch kleiner Totcode-Fund.
  `dotnet build` weiterhin grün, und die Änderung zusätzlich live gegen
  den echten kompilierten Blazor+Roslyn-Bundle erneut bestätigt (COOP/
  COEP-Server + esbuild-Bundle, gleiche Technik wie in Schritt 3):
  Erfolgspfad liefert jetzt `{stdout, error}` ohne `result`-Schlüssel,
  Compiler-Fehler-Pfad ebenso.
- **Ergebnis:** Keine Bugs im Produkt gefunden. C#-Engine-Fortschritt:
  Schritte 1–4 von 7 aus `docs/csharp-engine-poc.md` jetzt
  abgeschlossen. Nächster Schritt: Schritt 5, das mechanische
  Scaffolding des `csharp`-Content-Tracks — keine offenen
  Design-Fragen mehr, rein strukturelle Arbeit nach dem SQL/Python-
  Vorbild.
- **Tests:** 805 (unverändert — reine Aufräumarbeit an bestehenden
  Tests/Fixtures, keine neuen Tests nötig). `typecheck`, volle
  Testsuite (805 Tests) und `npm run build` grün.

### 2026-08-09 — Stündliche Routine: C# Schritt 5 (Content-Track-Scaffold, bewusst unregistriert)

- **Umfang:** Baseline geprüft (805/805 grün). SQL/Python weiterhin ohne
  großen offenen Zweig; C#-Engine-Integration hatte nach Schritt 4 klaren
  Schwung und einen eindeutigen nächsten Schritt laut
  `docs/csharp-engine-poc.md` — Schritt 5, das Scaffolding des
  `csharp`-Content-Tracks.
- **Vorgehen:** `src/content/tracks/csharp/types.ts` ergänzt
  (`CSharpChallengeExtra` + `CSharpChallenge = BaseChallenge<CSharpRuntime,
  CSharpExecResult, CSharpChallengeExtra>` — `BaseChallenge` selbst
  brauchte keine Änderung, war schon generisch genug), `csharpChallengeSchema`
  in `src/content/schema.ts` (leeres `extra`, exakt wie bei Python) mit
  passenden Tests in `schema.test.ts`, sowie
  `src/content/tracks/csharp/courses/csharpGrundlagen/course.ts` — Aufbau
  exakt nach dem Vorbild von `pythonGrundlagenCourse`, aber bewusst mit
  `challenges: []`.

  Bewusste Entscheidung, den Kurs **nicht** in `src/content/registry.ts`s
  `TRACKS` einzutragen: die Kurs-Auswahl-UI (`trackCoursePicker.ts`)
  iteriert `TRACKS` bereits generisch, ein Eintrag würde „C#" also sofort
  als echte, anklickbare Option in der Live-App erscheinen lassen — ohne
  dass irgendetwas davon tatsächlich liefe. Vier Lücken stehen dem noch im
  Weg: kein C#-Fall in der Engine-Fabrik (`ctx.engines`), kein
  C#-`LanguagePlugin` für Syntax-Highlighting/Auto-Indent im Editor,
  keine servierte Quelle für den Blazor-Bundle in Dev/Prod (die
  `baseUrl`-Frage aus Schritt 3 ist immer noch offen), und noch keine
  einzige Challenge. Eine auswählbare, aber nicht funktionierende
  Kurskarte auszuliefern wäre schlechter, als sie noch nicht auszuliefern
  — dieselbe Zurückhaltung, mit der schon die `baseUrl`- und
  CI/Deploy-Fragen in früheren Schritten bewusst offengelassen wurden,
  statt sie mit einer Notlösung zu verdecken.
- **Ergebnis:** Keine Bugs gefunden — reines, sauberes Scaffolding.
  C#-Engine-Fortschritt: Schritt 5 von 7 aus `docs/csharp-engine-poc.md`
  zum Teil abgeschlossen (Typen/Schema/leerer Kurs stehen, Live-
  Registrierung bewusst offen). Tag-Bilanz bleibt bei 0/86 — ein leerer,
  unregistrierter Kurs ist noch kein Content. Nächster Schritt: Schritt 6
  (Node-Testmotor für CI) kann unabhängig von den vier offenen
  Live-UI-Lücken weitergehen, da er nur die jetzt existierenden Typen
  braucht.
- **Tests:** 805 → 809 (+4: 2 für die neue `csharpGrundlagenCourse`-
  Struktur, 2 für `csharpChallengeSchema`). `typecheck`, volle Testsuite
  (809 Tests) und `npm run build` grün. `knip` bestätigt: keine neuen
  toten Dateien (nur `CSharpChallengeExtra` als unbenutzter Export
  geflaggt, exakt dasselbe akzeptierte Muster wie bei
  `PythonChallengeExtra`/`SqlChallengeExtra`).

### 2026-08-09 — Stündliche Routine: C# Schritt 6 (Node-Testmotor für CI)

- **Umfang:** Baseline geprüft (809/809 grün, `typecheck` und
  `npm run build` sauber). SQL/Python weiterhin ohne großen offenen
  Zweig; C#-Engine-Integration hatte laut `docs/csharp-engine-poc.md`
  einen klaren, unabhängig umsetzbaren nächsten Schritt — Schritt 6, der
  Node-seitige Testmotor für CI, der laut Dokument „unabhängig von den
  vier [Live-UI-]Lücken weitergehen kann, da er nur die [in Schritt 5]
  existierenden Typen braucht".
- **Vorgehen:** Ein `dotnet run` gegen ein frisches Temp-Projekt pro
  `exec()`-Aufruf (die naheliegendste erste Idee) wurde verworfen, bevor
  Code dafür geschrieben wurde — das würde bei jedem einzelnen Aufruf
  einen vollen NuGet-Restore + Build erzwingen, viel zu langsam für eine
  Testsuite, die perspektivisch einen Prozess pro Challenge/Distraktor
  startet. Stattdessen: ein neues, separat eingechecktes Desktop-.NET-
  Konsolenprojekt `csharp-engine/driver/` (`CSharpDriver.csproj`,
  referenziert `Microsoft.CodeAnalysis.CSharp` direkt, **nicht** Teil des
  Blazor-WASM-Projekts), dessen `Program.cs` dieselbe
  `CSharpCompilation`-basierte Parse/Emit/`Assembly.Load`/Reflection-
  Invoke/stdout-Capture-Pipeline wie `CSharpEngine.cs` implementiert und
  dasselbe JSON-`{stdout, error}`-Format ausgibt. Einziger echter
  Unterschied: statt Referenz-Assemblies per `HttpClient` von
  `wwwroot/refs/` zu laden (nötig unter Mono/WASM, wo `Assembly.Location`
  nicht funktioniert), liest der Treiber sie direkt aus
  `AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")` — auf Desktop-.NET
  funktioniert `Assembly.Location` normal. Ein `ToDictionary` über diese
  Liste warf beim ersten Testlauf `ArgumentException: An item with the
  same key has already been added` (echter, empirisch beobachteter Bug,
  kein hypothetischer Fall: `System.Private.CoreLib` taucht in der
  TPA-Liste in der Praxis doppelt auf) — behoben durch eine simple
  Last-wins-Schleife über ein `Dictionary` statt `ToDictionary`.

  `test/helpers/nodeCSharpEngine.ts` spiegelt `nodePythonEngine.ts`
  strukturell exakt (Temp-Verzeichnis pro `exec()`, Nutzer-Code in eine
  eigene Datei geschrieben statt in einen String interpoliert, Subprozess
  mit diesem Verzeichnis als `cwd`, JSON-Stdout zu `CSharpExecResult`
  geparst), treibt den Treiber aber über `dotnet exec <Driver.dll> <Pfad>`
  an statt einen bereits installierten Interpreter direkt aufzurufen —
  kein Restore, kein Rebuild pro Aufruf, nur das Kompilieren des
  eigentlichen Nutzer-Schnipsels. Der Treiber wird beim ersten Gebrauch
  einmalig lazy gebaut (`ensureDriverBuilt()`), keine separate CI-Stufe
  nötig — `npm test` allein reicht aus. Gemessen: ca. 1,0–2,4 s pro
  `exec()`-Aufruf nach dem einmaligen Build.

  Fünf Smoke-Tests (`test/helpers/nodeCSharpEngine.test.ts`) bestätigen
  gegen den echten `dotnet`-Toolchain (kein Mock): Erfolgspfad
  (`Console.WriteLine` → stdout), Compiler-Fehler (`CS0029` bei
  Typ-Mismatch), Laufzeit-Exception (`IndexOutOfRangeException`),
  frischer Namensraum pro Aufruf (kein State-Leck zwischen `exec()`-
  Aufrufen), sowie LINQ/`List<T>` über die vom Treiber injizierten
  `global using`-Direktiven. `.gitignore` um
  `csharp-engine/driver/{bin,obj}/` ergänzt — die bestehenden
  `csharp-engine/{bin,obj}/`-Einträge deckten das neue, verschachtelte
  Projektverzeichnis nicht ab.
- **Ergebnis:** Keine Bugs im Produkt gefunden. C#-Engine-Fortschritt:
  Schritt 6 von 7 aus `docs/csharp-engine-poc.md` jetzt abgeschlossen.
  Tag-Bilanz bleibt bei 0/86 — ein Testmotor ist noch kein Content.
  Nächster Schritt: Schritt 7 (echte Challenges), sobald zusätzlich ein
  `describeCSharpCourse` in `test/content/challengeRunner.test.ts`
  ergänzt wurde (diese Datei ruft `describeSqlCourse`/
  `describePythonCourse` bisher fest verdrahtet auf statt `TRACKS`
  generisch zu iterieren).
- **Tests:** 809 → 814 (+5, alle in `nodeCSharpEngine.test.ts`).
  `typecheck`, volle Testsuite (814 Tests) und `npm run build` grün.
  Coverage-Zahlen unverändert (92,15 % / 73,82 % / 99,01 % / 92,15 %) —
  `test/helpers/**` fließt laut `vitest.config.ts` (`include:
  ['src/**/*.ts']`) nicht in die Coverage-Metrik ein, und
  `CSharpRuntime.ts` selbst enthält nur Typdeklarationen ohne
  Laufzeitcode.

### 2026-08-09 — Stündliche Routine: SQL B9 (CTE & Rekursion) abgeschlossen

- **Umfang:** Baseline geprüft (814/814 grün, `typecheck` und
  `npm run build` sauber). `docs/sql-concept-hierarchy.md` benennt B9
  selbst als "zweitgrößte Lücke" (nach dem inzwischen geschlossenen B7)
  — die vorhandenen `WITH RECURSIVE`-Challenges erzeugen ausschließlich
  Zahlen-/Datumsreihen, keine einzige traversiert eine echte
  hierarchische Tabelle, und kein Kurs-Kapitel verkettet zwei CTEs
  hintereinander. Klarer, größter nächster Content-Schritt laut Mandat.
- **Vorgehen:** Zwei neue Challenges, beide vorab empirisch gegen
  `node:sqlite` verifiziert (Lösung UND jeder Distraktor), bevor der
  Content geschrieben wurde:
  - **19** (`multiple-ctes-chained`): zwei verkettete CTEs
    (`abteilung_avg` berechnet den Durchschnittsgehalt je Abteilung,
    `top_verdiener` joint das gegen `mitarbeiter` und filtert darüber) —
    Validator rechnet den erwarteten Wert unabhängig über eine
    korrelierte Subquery nach (nicht über dieselben CTEs, um denselben
    Denkfehler nicht doppelt abzusichern). Distraktor vergleicht mit dem
    Gesamtdurchschnitt aller Mitarbeiter statt dem Abteilungsdurchschnitt
    — liefert nachweislich ein anderes, falsches Ergebnis (3 statt 2
    Zeilen).
  - **19.1** (`recursive-cte-traversal`): die erste Challenge im Kurs,
    die `WITH RECURSIVE` über eine echte selbstreferenzierende Tabelle
    (ein Organigramm mit `manager_id`) statt einer erzeugten
    Zahlenreihe laufen lässt — findet alle direkt und indirekt
    Unterstellten einer Managerin. Validator liest die rohe
    `mitarbeiter`-Tabelle aus und berechnet die erwartete Menge über
    eine eigene Breitensuche in TypeScript (nicht über eine zweite SQL-
    Abfrage), damit derselbe Rekursionsfehler nicht auf beiden Seiten
    unbemerkt bliebe. Distraktor lässt die Rekursion komplett weg (nur
    die direkten Unterstellten) — findet nachweislich nur 2 von 5
    Personen.

  **Ein echter, zuvor unbekannter Reibungspunkt dabei gefunden:** Die
  naheliegendste Lösung für 19.1 (`JOIN unterstellte u ON m.manager_id =
  u.id` ohne zusätzliches `WHERE`) wird von der App selbst blockiert —
  `findUnboundedRecursion` (`src/domain/sql/unboundedRecursionCheck.ts`)
  verlangt im rekursiven Teil einer `WITH RECURSIVE`-CTE zwingend entweder
  ein `WHERE` oder ein `LIMIT` danach, weil sql.js 1.10.2 keine
  Möglichkeit bietet, eine echte Endlosschleife von außen abzubrechen.
  Ein rein Join-basierter, durch die Baumstruktur natürlich beschränkter
  Abbruch wird von dieser (bewusst einfachen) Heuristik nicht erkannt —
  das ist kein Bug in `unboundedRecursionCheck.ts` selbst (die Datei
  dokumentiert genau dieses Verhalten als akzeptierten Kompromiss:
  "erring toward false negatives ... rather than blocking legitimate
  queries it can't parse", was hier aber eben doch einen legitimen Fall
  blockiert), sondern ein echter Content-Design-Constraint: jede künftige
  Join-basierte `WITH RECURSIVE`-Traversierung im Kurs muss ebenfalls
  eine explizite Abbruchbedingung mitführen. Statt die Prüfung zu
  umgehen, wurde die Lösung um eine mitgezählte Rekursionstiefe
  (`WHERE u.tiefe < 10`) erweitert — fachlich sogar eine sinnvolle
  Ergänzung (Schutz vor zyklischen Daten in echten Organigrammen), nicht
  nur ein Workaround, und jetzt auch im Tutorial-Text als solche erklärt.
  Alle 216 Challenge-Runner-Tests (Gate 1 + Gate 2, inklusive der beiden
  neuen) laufen über exakt denselben `executeAndValidate`-Codepfad wie
  die echte App, decken diesen Blocker also bereits automatisch ab — ein
  separater Live-Playwright-Durchlauf war für diese beiden Challenges
  nicht nötig.
- **Ergebnis:** Kein Produktbug gefunden (der Unbounded-Recursion-Guard
  funktioniert korrekt, nur eine bisher ungetestete Content-Form stieß
  erstmals daran). SQL-Tag-Bilanz: 62/82 → 64/82 (≈ 78 %). B9 (CTE &
  Rekursion) ist damit als letzter SQL-Zweig mit mehr als einem offenen
  Tag geschlossen — verbleibende SQL-Lücken sind nur noch einzelne,
  über mehrere Zweige verstreute Tags (B1: 5, B3: 2, B4: 3, B6: 3, B8: 3)
  plus die dauerhafte Scope-Ausnahme `updatable-view`.
- **Tests:** 814 → 818 (+4: Gate 1 + Gate 2 für Challenge 19 und 19.1).
  `typecheck`, volle Testsuite (818 Tests) und `npm run build` grün.
  Coverage: 92,15 % → 92,12 % Statements (mehr neuer Code als neu
  gedeckte Zeilen — beide Validatoren haben Fehlerzweige, die im
  Gate-1/2-Lauf nicht alle getroffen werden), 73,82 % → 73,84 % Branches,
  99,01 % → 99,02 % Functions. `knip` bestätigt: keine neuen toten
  Exporte durch diese Änderung (nur die bereits akzeptierten,
  unveränderten Funde).

### 2026-08-09 — Stündliche Routine: SQL B1 (Schema/DDL) abgeschlossen + F-018 (node:sqlite-Engine-Bug)

- **Umfang:** Baseline geprüft (818/818 grün, `typecheck` und
  `npm run build` sauber). Nach dem Abschluss von B9 in der letzten
  Routine ist B1 (Schema/DDL) jetzt der Zweig mit den meisten offenen
  Tags im gesamten Projekt (SQL und Python zusammen): 5 von 10 Tags
  (`default-value-constraint`, `check-constraint`,
  `foreign-key-constraint`, `alter-table`, `drop-table`) — größer als
  jeder verbleibende Python- oder sonstige SQL-Zweig.
- **Vorgehen:** Fünf neue Challenges (20–20.4), jede vorab empirisch
  gegen `node:sqlite` verifiziert (Lösung UND jeder Distraktor):
  - **20** (`default-value-constraint`): `DEFAULT 0` in der
    Spaltendefinition. Validator prüft nicht nur den sichtbaren
    Zeilenwert, sondern über `PRAGMA table_info` auch, dass `DEFAULT`
    tatsächlich im Schema steht — ein Distraktor, der denselben
    sichtbaren Wert stattdessen per explizitem INSERT erzeugt, besteht
    den reinen Ergebnisvergleich, scheitert aber am Schema-Check.
  - **20.1** (`check-constraint`): `CHECK (preis > 0)`. Validator prüft
    den gültigen Datensatz und **probiert zusätzlich selbst** einen
    ungültigen INSERT (preis = -1) innerhalb von `validate()` — schlägt
    der Probe-INSERT nicht fehl, ist die CHECK-Bedingung nicht
    (ausreichend) vorhanden. Wichtige Einschränkung dabei entdeckt und
    berücksichtigt: `executeAndValidate` bricht bei jedem Statement-Fehler
    sofort ab und ruft `validate()` gar nicht erst auf — eine Challenge,
    deren *gradierte* SQL selbst einen erwarteten Fehler auslösen soll,
    ist mit der aktuellen Ausführungssemantik architektonisch nicht
    möglich. Die Probe muss deshalb aus `validate()` selbst kommen, nicht
    aus der Lösung.
  - **20.2** (`foreign-key-constraint`): Hier der eigentliche Fund dieser
    Runde (siehe F-018 unten) — `node:sqlite` (der Node-Testmotor)
    defaultet `PRAGMA foreign_keys` auf **ON**, echtes SQLite/`sql.js`
    (der Browser-Motor) auf **OFF**. Ohne den Fix hätte ein Distraktor,
    der `PRAGMA foreign_keys = ON;` vergisst, in Node fälschlich als
    "korrekt blockiert" durchgegangen, im echten Browser aber nicht
    geblockt — eine stille Divergenz zwischen Test und Produkt, die erst
    bei echtem FK-Content sichtbar geworden wäre. Nach dem Fix (siehe
    unten): Lösung aktiviert `PRAGMA foreign_keys = ON;` explizit (eine
    für SQLite untypische, aber reale Eigenheit, die die Challenge selbst
    jetzt auch lehrt), Validator probiert wie bei 20.1 einen ungültigen
    Fremdschlüssel-INSERT.
  - **20.3** (`alter-table`): `ALTER TABLE ... ADD COLUMN` auf eine
    bereits bestehende, per `setup` befüllte Tabelle. Validator prüft,
    dass die neue Spalte existiert **und** die vorherige Zeile weiterhin
    da ist. Distraktor: `DROP TABLE` + `CREATE TABLE` neu — hat zwar am
    Ende dieselbe Spalte, aber die ursprüngliche Zeile ist weg (empirisch
    bestätigt).
  - **20.4** (`drop-table`): `DROP TABLE` gegen `DELETE FROM` abgegrenzt
    — Validator prüft `sqlite_master` direkt (kein Eintrag mehr), nicht
    nur die Zeilenzahl. Distraktor `DELETE FROM temp_report;` leert die
    Tabelle, lässt sie aber in `sqlite_master` bestehen.

  **F-018 gefunden und behoben:** `test/helpers/nodeSqliteEngine.ts`
  gab bisher `node:sqlite`s eigenen `PRAGMA foreign_keys`-Default
  (ON) ungefiltert durch, statt ihn auf denselben Default wie `sql.js`/
  echtes SQLite (OFF) zu bringen — betraf bisher keinen bestehenden
  Content (FOREIGN KEY wurde vorher nirgends im Kurs verwendet), wäre
  aber für jede künftige FK-Challenge eine stille Falle gewesen. Fix:
  `PRAGMA foreign_keys = OFF;` explizit nach jeder `DatabaseSync`-
  Konstruktion (Erststart und `reset()`) gesetzt. Manuell mit zwei
  Vitest-Fällen verifiziert (ohne `PRAGMA ON` bleibt eine ungültige
  FK-Referenz jetzt unblockiert, mit `PRAGMA ON` wird sie geblockt) —
  entspricht jetzt exakt dem in Challenge 20.2 verifizierten Verhalten.
- **Ergebnis:** Ein echter Engine-Parität-Bug gefunden und behoben
  (F-018), bevor er sich in Content hätte festsetzen können. SQL-Tag-
  Bilanz: 64/82 → 69/82 (≈ 84 %). B1 (Schema/DDL) ist damit der vierte
  vollständig geschlossene SQL-Zweig in dieser Session (nach B7, B9,
  B10 sowie B11–B13). Verbleibende SQL-Lücken: nur noch B3 (2 Tags), B4
  (3), B6 (3), B8 (3) — jeweils kleiner als B1 vorher — plus die
  dauerhafte Scope-Ausnahme `updatable-view`.
- **Tests:** 818 → 828 (+10: Gate 1 + Gate 2 für die fünf neuen
  Challenges). `typecheck`, volle Testsuite (828 Tests) und
  `npm run build` grün. Coverage: 92,12 % → 91,91 % Statements (der
  Nenner wächst schneller als die neu gedeckten Zeilen — üblich bei
  reinem Content-Wachstum mit mehreren Fehlerzweigen pro Validator),
  73,84 % → 73,28 % Branches, 99,02 % → 99,03 % Functions. `knip`
  bestätigt: keine neuen toten Exporte.

### 2026-08-09 — Stündliche Routine: SQL B6 (Joins) abgeschlossen + F-019 (node:sqlite-Engine-Bug, Spaltennamen-Kollision)

- **Umfang:** Baseline geprüft (828/828 grün, `typecheck` und
  `npm run build` sauber). Nach B1 sind B4, B6 und B8 mit je 3 offenen
  Tags die größten verbliebenen SQL-Zweige (gleichauf); B6 (Joins)
  gewählt, da `self-join`/`right-join`/`full-outer-join` inhaltlich
  direkt aufeinander aufbauen und beide restlichen Motoren (`sql.js`
  3.45.0, `node:sqlite` 3.51.2) vorab empirisch auf RIGHT-/FULL-OUTER-
  JOIN-Unterstützung geprüft wurden (beide unterstützen sie seit
  SQLite 3.39 — kein Wiederholungsrisiko wie bei F-018).
- **Vorgehen:** Drei neue Challenges (21–21.2), jede vorab empirisch
  gegen `node:sqlite` **und** `sql.js` verifiziert (Lösung UND jeder
  Distraktor, in beiden Motoren identisch):
  - **21** (`self-join`): Organigramm-Tabelle mit `manager_id`, zwei
    Aliasse derselben Tabelle. Bewusst als Kontrast zur rekursiven CTE
    aus 19.1 im Tutorial erklärt (eine Ebene statt Traversierung der
    ganzen Kette). Validator berechnet die erwarteten Mitarbeiter-
    Manager-Paare aus der rohen Tabelle in TypeScript (kein zweiter
    Self-Join), Distraktor joint `e.id = m.id` (jeder auf sich selbst).
  - **21.1** (`right-join`): direkte Fortsetzung von Kapitel 10.1
    (`LEFT JOIN`) mit vertauschter Blickrichtung — eine Kategorie ohne
    Produkt muss trotzdem erscheinen. Validator rechnet unabhängig über
    einen `LEFT JOIN` mit vertauschten Tabellen nach (RIGHT JOIN
    `produkte RIGHT JOIN kategorien` ≡ LEFT JOIN `kategorien LEFT JOIN
    produkte`), nicht über denselben RIGHT JOIN. Distraktor nutzt LEFT
    JOIN mit unveränderter Tabellenreihenfolge — verliert die leere
    Kategorie.
  - **21.2** (`full-outer-join`): kombiniert unmatched Zeilen von
    beiden Seiten (Kunde ohne Bestellung UND eine verwaiste Bestellung
    mit nicht existierender kunde_id). Validator rechnet unabhängig
    über `LEFT JOIN` + `NOT EXISTS`-Anti-Join zusammen nach, nicht über
    denselben FULL OUTER JOIN. Distraktor nutzt LEFT JOIN — verliert
    die verwaiste Bestellung.

  **F-019 gefunden und behoben, mitten im Schreiben von 21.1:** Der
  erste Testlauf des RIGHT-JOIN-Validators lieferte für beide erwarteten
  Spalten (`k.name`, `p.name`) denselben Wert — der Validator selbst
  rechnet unabhängig über `SELECT k.name, p.name FROM kategorien k LEFT
  JOIN produkte p ...` nach, zwei gleichnamige Spalten ohne Alias.
  Ursache: `test/helpers/nodeSqliteEngine.ts` las Zeilen bisher über
  `node:sqlite`s `prepared.all()` **ohne** `setReturnArrays(true)` —
  diese Methode liefert Zeilen dann als Objekte, indiziert nach
  **Spaltenname**, nicht nach Position. Zwei Spalten mit demselben Namen
  (hier: zwei `name`-Spalten aus verschiedenen Tabellen) kollabieren
  dabei auf einen einzigen Objekt-Key — der zweite Wert überschreibt den
  ersten spurlos, obwohl `SqlResultSet.columns` beide Namen weiterhin
  korrekt zweimal auflistet. `sql.js` (der echte Browser-Motor) liest
  Zeilen dagegen schon immer positionsbasiert über `stmt.get()` und war
  nie betroffen. Das ist kein Nischenfall: jeder unaliaste Self-Join
  (genau wie Challenge 21, hätte deren Validator ebenfalls unaliast
  nachgerechnet) oder Join zweier Tabellen mit gemeinsamem Spaltennamen
  ohne `AS` wäre in Node-Tests bisher stillschweigend falsch geprüft
  worden. Fix: `prepared.setReturnArrays(true)` gesetzt, Zeilen jetzt
  wie bei sql.js positionsbasiert gelesen. Regressionstest in
  `nodeSqliteEngine.test.ts` (vor dem Fix per `git stash` rot
  reproduziert — beide Werte kollabierten auf den zweiten von zwei
  echten Namen —, danach grün).
- **Ergebnis:** Ein zweiter echter Engine-Parität-Bug in derselben
  Datei innerhalb von zwei Routinen gefunden und behoben (F-019, nach
  F-018) — beide durch dieselbe Disziplin aufgefallen: jeden neuen
  Validator sofort gegen die echten Motoren laufen lassen, statt der
  Node-Implementierung blind zu vertrauen. SQL-Tag-Bilanz: 69/82 →
  72/82 (≈ 88 %). B6 (Joins) ist damit der fünfte vollständig
  geschlossene SQL-Zweig in dieser Session. Verbleibende SQL-Lücken:
  nur noch B3 (2 Tags), B4 (3), B8 (3) — jeweils kleiner oder gleich B6
  vorher — plus die dauerhafte Scope-Ausnahme `updatable-view`.
- **Tests:** 828 → 835 (+6 Gate 1/Gate 2 für die drei neuen Challenges,
  +1 Regressionstest für F-019). `typecheck`, volle Testsuite (835
  Tests) und `npm run build` grün. Coverage: 91,91 % → 91,89 %
  Statements, 73,28 % → 73,34 % Branches, 99,03 % → 99,04 % Functions.
  `knip` bestätigt: keine neuen toten Exporte.

### 2026-08-09 — Stündliche Routine: Live-Bug-Hunt (sauber) + SQL B3 (DQL-Kern) abgeschlossen

- **Umfang:** Baseline geprüft (835/835 grün, `typecheck` und
  `npm run build` sauber). Nach drei Routinen in Folge, die reinen
  Content + Node-Testmotor-Fixes ohne echten Browser-Durchlauf
  gemacht haben (B9, B1, B6 — alle 11 neuen Challenges bislang nur
  gegen `node:sqlite` geprüft), zuerst ein gezielter Live-Playwright-
  Durchlauf gegen den echten Dev-Server, bevor weiterer Content
  entsteht — genau die in den letzten beiden Routinen gefundenen
  `node:sqlite`-spezifischen Bugs (F-018, F-019) machen einen
  Gegencheck im echten Browser-Motor besonders wertvoll (umgekehrtes
  Risiko: ein sql.js-spezifisches Verhalten, das `node:sqlite` nicht
  hätte). Danach: kleinster verbliebener SQL-Zweig (B3, DQL-Kern,
  2 offene Tags) als Content-Abschluss.
- **Vorgehen Live-Bug-Hunt:** Dev-Server gestartet, `sql.js` lokal
  (bereits installiert, `--no-save`) per Playwright `context.route()`
  statt der in dieser Sandbox blockierten CDN-Domain ausgeliefert —
  echtes WASM, keine Mocks. Für alle 10 seit der letzten Live-
  Verifikation neu hinzugekommenen Challenges (19, 19.1, 20–20.4,
  21–21.2): Sidebar-Auswahl, Musterlösung eingefügt, ausgeführt,
  `✓ Aufgabe erfüllt` bestätigt. Zusätzlich 4 Distraktoren
  stichprobenartig ausgeführt (19, 20.2, 21.1, 21.2) und die korrekte
  Ablehnung (`status-warn`, kein `status-ok`) bestätigt. Alle 10/10
  Lösungen und 4/4 Distraktoren verhielten sich exakt wie von
  `challengeRunner.test.ts` vorhergesagt — keine Diskrepanz zwischen
  `node:sqlite` (nach den F-018/F-019-Fixes) und echtem sql.js-WASM
  gefunden, keine Konsolenfehler.
- **Vorgehen B3:** Zwei neue Challenges (22, 22.1), vorab empirisch
  gegen `node:sqlite` verifiziert:
  - **22** (`logical-operators` als eigenes Thema): eine Bonusregel
    ("Vertrieb nur mit Gehalt über 3000, alle anderen automatisch")
    verlangt `AND`, `OR` und `NOT` in einer einzigen, geklammerten
    Bedingung — Tutorial erklärt explizit die Vorrangregel (AND bindet
    stärker als OR). Distraktor lässt die `OR NOT (...)`-Hälfte
    komplett weg — nur ein einziger Mitarbeiter (statt fünf) besteht.
  - **22.1** (`coalesce-nullif`): eine Telefonnummern-Spalte mit zwei
    Arten von "fehlend" — echtes NULL und der Platzhalter-Text `'-'`
    — verlangt `NULLIF(telefon, '-')` verschachtelt in `COALESCE(...,
    'unbekannt')`, ein sehr reales Datenbereinigungs-Muster. Distraktor
    nutzt nur COALESCE ohne NULLIF — der Platzhalter `'-'` bleibt
    unverändert stehen statt zu "unbekannt" zu werden.
  Beide Challenges zusätzlich live gegen den echten Dev-Server
  verifiziert (Lösung und Distraktor je Challenge) — keine Diskrepanz.
- **Ergebnis:** Keine Bugs im Produkt gefunden (der Live-Bug-Hunt
  bestätigt eine saubere Produktionsparität nach den letzten beiden
  Engine-Fixes). SQL-Tag-Bilanz: 72/82 → 74/82 (≈ 90 %). B3 (DQL-Kern)
  ist damit der sechste vollständig geschlossene SQL-Zweig in dieser
  Session. Verbleibende SQL-Lücken: nur noch B4 (3 Tags) und B8 (3) —
  beide größer als jeder verbleibende Python-Rest — plus die
  dauerhafte Scope-Ausnahme `updatable-view`.
- **Tests:** 835 → 839 (+4 Gate 1/Gate 2 für die zwei neuen
  Challenges). `typecheck`, volle Testsuite (839 Tests) und
  `npm run build` grün. Coverage: 91,89 % → 91,86 % Statements,
  73,34 % → 73,23 % Branches, 99,04 % → 99,05 % Functions. `knip`
  bestätigt: keine neuen toten Exporte.

### 2026-08-09 — Stündliche Routine: SQL B4 (Funktionen) abgeschlossen

- **Umfang:** Baseline geprüft (839/839 grün, `typecheck` und
  `npm run build` sauber). Nach B3 sind B4 (Funktionen) und B8
  (Mengenoperationen) mit je 3 offenen Tags die letzten beiden SQL-
  Zweige mit mehr als einer Einzeltag-Lücke — B4 gewählt, da alle drei
  Tags (`math-functions`, `string-functions`, `cast-conversion`)
  direkte, voneinander unabhängige Geschwister von `scalar-function-
  call` sind (bereits abgedeckt), ohne offene Abhängigkeitsfragen.
- **Vorgehen:** Drei neue Challenges (23–23.2), jede vorab empirisch
  gegen `node:sqlite` **und** live gegen echtes sql.js verifiziert
  (Lösung UND jeder Distraktor):
  - **23** (`math-functions`): `ROUND(ABS(betrag))` auf Kontobewegungen
    mit Vorzeichen und Nachkommastellen — bündelt beide Tags
    (`round()`, `abs()`) in einem motivierten Beispiel, analog dazu,
    wie schon `sum-avg-min-max` als ein Tag mehrere Funktionen bündelt.
    Distraktor lässt ROUND weg — liefert unrunde Werte (49.6 statt 50).
  - **23.1** (`string-functions`): `SUBSTR(UPPER(TRIM(name)), 1, 4)`
    erzeugt einen Produktcode aus unsauber importierten Namen —
    verschachtelt drei der fünf Funktionen des Tags (TRIM, UPPER,
    SUBSTR) in einem realen Beispiel, dieselbe "innerste Funktion
    zuerst"-Lesart wie bei Challenge 23 explizit im Tutorial
    aufgegriffen. Distraktor lässt TRIM/UPPER weg — liefert
    unbereinigte Codes mit Leerzeichen/Kleinschreibung.
  - **23.2** (`cast-conversion`): eine als TEXT gespeicherte
    Gehaltsspalte (klassischer CSV-Import-Fehler) erzwingt
    `CAST(... AS INTEGER)` vor dem Vergleich — die Daten sind bewusst
    so gewählt, dass ein reiner Textvergleich ('12000' vs '4000')
    ein anderes, nachweislich falsches Ergebnis liefert (David mit
    12000 fehlt, Clara mit 950 erscheint fälschlich), nicht nur
    zufällig derselbe Wert mit anderem Typ. Distraktor lässt CAST weg
    — genau dieser Fehler tritt ein.
- **Ergebnis:** Keine Bugs im Produkt gefunden. SQL-Tag-Bilanz: 74/82
  → 77/82 (≈ 94 %) — SQL liegt damit erstmals gleichauf mit Python
  (ebenfalls 77/82). B4 (Funktionen) ist der siebte vollständig
  geschlossene SQL-Zweig in dieser Session. Verbleibende SQL-Lücke:
  nur noch B8 (Mengenoperationen, 3 Tags) plus die dauerhafte
  Scope-Ausnahme `updatable-view`.
- **Tests:** 839 → 845 (+6 Gate 1/Gate 2 für die drei neuen
  Challenges). `typecheck`, volle Testsuite (845 Tests) und
  `npm run build` grün. Coverage: 91,86 % → 91,80 % Statements,
  73,23 % → 73,06 % Branches, 99,05 % → 99,06 % Functions. `knip`
  bestätigt: keine neuen toten Exporte.

### 2026-08-09 — Stündliche Routine: F-020 (Mobile-Sidebar-Overlay blockierte Inhalt)

- **Umfang:** Auf Nutzeranfrage mitten im Durchgang ("integrate mobile
  compatibility into the requirements") die Mobile-Kompatibilität
  gezielt geprüft — ein Bereich, der in den letzten Routinen nicht mehr
  aktiv live getestet wurde (der letzte Mobile-Check liegt mehrere
  Routinen zurück, siehe Durchgang „Bug-Hunt (nichts gefunden) + C#
  Schritt 4"). Als direkte Konsequenz Abschnitt „Wie ein neuer Durchgang
  abläuft" oben um einen Standing-Requirement-Absatz ergänzt: jeder
  künftige Live-Playwright-Durchlauf muss mindestens einen schmalen
  Viewport (375×667) einschließen, nicht nur Desktop-Breite.
- **Vorgehen:** Playwright mit `newContext({ viewport: { width: 375,
  height: 667 } })` gegen den echten Dev-Server (lokales sql.js statt
  CDN, wie gewohnt). Ein Durchklick-Skript (Challenge auswählen → Task-
  Tab → Editor-Tab → Run) schlug beim `.click()` auf den Task-Tab mit
  "element intercepts pointer events" fehl — ein Debug-Skript mit
  Screenshots und Bounding-Boxes zeigte: die Sidebar-Klasse blieb nach
  der Challenge-Auswahl bei `sidebar` (nicht `sidebar collapsed`), die
  fixed-position Drawer (z-index 41, mit Backdrop) lag also weiterhin
  über dem kompletten Hauptinhalt. `challengeList.ts`s Klick-/Tastatur-
  Handler riefen nur `selectChallenge(...)` auf, nie `toggleSidebar(...)`
  — die Sidebar hatte offenbar nie eine Auto-Close-bei-Auswahl-Logik für
  schmale Viewports, obwohl `sidebarShell.ts` bereits einen Backdrop-
  Klick-Handler zum manuellen Schließen kennt.

  Fix: `closeSidebarIfMobileOverlay(ctx)` in `challengeList.ts` — schließt
  die Sidebar nur, wenn `window.matchMedia('(max-width: 760px)').matches`
  (identischer Breakpoint wie `themes.css`) und sie nicht schon
  eingeklappt ist, aufgerufen nach jeder `selectChallenge(...)` (Maus UND
  Tastatur). `window.matchMedia` existiert in jsdom (der Testumgebung
  dieser Datei) nicht — mit einer `typeof`-Prüfung defensiv abgefangen,
  statt beim ersten Testlauf zu werfen (was tatsächlich passierte, bevor
  der Guard ergänzt wurde — 3 bestehende Tests liefen initial rot). 4
  neue Tests in `challengeList.test.ts` mit gemocktem `window.matchMedia`
  decken alle vier Fälle ab (schmal+offen → schließt, breit+offen →
  bleibt offen, schmal+schon-geschlossen → kein redundanter Toggle,
  Tastatur-Auswahl schließt ebenfalls). Fix danach live gegen den echten
  Dev-Server bei 375×667 erneut bestätigt: kompletter Durchklick
  (Auswahl → Task-Tab → Lösung einfügen → Editor-Tab → Run) funktioniert
  jetzt fehlerfrei, kein horizontales Overflow, keine Konsolenfehler.
- **Ergebnis:** Ein echter, nutzerseitig blockierender Mobile-Bug
  gefunden und behoben (F-020) — auf einem echten Telefon hätte das
  Antippen einer Challenge scheinbar nichts bewirkt, bis man zufällig
  den richtigen Ort zum Schließen der Drawer gefunden hätte. Betraf
  vermutlich die App seit Einführung des Sidebar-Overlays selbst (Task
  #1 der Projekt-Historie), da nie mit einem echten schmalen Viewport
  bis zum Ende durchgeklickt wurde.
- **Tests:** 845 → 849 (+4 für den neuen Mobile-Close-Regressionsschutz).
  `typecheck`, volle Testsuite (849 Tests) und `npm run build` grün.
  Coverage: 91,80 % → 91,81 % Statements, 73,06 % → 73,15 % Branches,
  99,06 % Functions unverändert. `knip` bestätigt: keine neuen toten
  Exporte.

### 2026-08-09 — Stündliche Routine: F-021 + F-022 (die zwei vermuteten Mobile-Bugs bestätigt und behoben)

- **Umfang:** Baseline grün (849/849, typecheck, build). Im letzten
  Durchgang hatte ich beim Beantworten der Mobile-Frage zwei Probleme als
  **vermutet, aber unbestätigt** notiert. Diese Runde bestand genau darin,
  sie empirisch zu prüfen statt sie anzunehmen — beide bestätigten sich,
  einer aber **anders als vermutet**.
- **F-021 (Ergebnis-Tabelle):** Vermutet hatte ich horizontales
  Seiten-Scrollen. Gemessen bei 375px mit einer 6-Spalten-Abfrage: Die
  Seite scrollt gar **nicht** (scrollWidth 375 == clientWidth 375) — meine
  Vermutung war falsch. Der echte Befund ist schlimmer: `.results-body`
  hat scrollWidth 618px vs. clientWidth 281px bei `overflow-x: visible`,
  und ein Vorfahr (`.main`) clippt mit `overflow: hidden`. Die Spalten 3–6
  waren damit **unerreichbar** — nicht scrollbar, nicht wischbar, gar
  nicht an die Werte heranzukommen. Fix: `.results-body { overflow-x:
  auto; }`, bewusst global statt mobil-only, da schmale Desktop-Fenster
  denselben Effekt haben.
- **F-022 (iOS-Zoom im Editor):** Bestätigt — `textarea.editor` steht auf
  13px, unterhalb der 16px-Schwelle, ab der iOS Safari beim Fokussieren
  die ganze Seite hineinzoomt und **nicht** wieder herauszoomt. Fix im
  ≤760px-Breakpoint auf 16px, aber zwingend **für alle drei
  Editor-Schichten gemeinsam**: die Textarea ist `color: transparent` und
  liefert nur den Cursor, die sichtbaren Glyphen kommen aus
  `.highlight-layer`, `.line-numbers` ist die dritte Spalte — nur die
  Textarea zu ändern hätte den Cursor gegen den sichtbaren Text driften
  lassen.

  **Der erste Fix-Versuch war wirkungslos**, und das fiel nur auf, weil
  live nachgemessen statt auf „CSS geschrieben, also erledigt" vertraut
  wurde: Der Override lag zunächst im früheren Narrow-Viewport-Block
  (Zeile ~270), aber Media Queries erhöhen die Spezifität nicht — dort
  hat `textarea.editor` dieselbe Spezifität wie die Basisregel bei Zeile
  ~547, und die spätere Regel gewinnt per Quellreihenfolge. Der mobile
  Block liegt jetzt **nach** den Editor-Regeln, mit einem Kommentar, der
  genau diese Falle für die Zukunft festhält.
- **Verifikation:** Beide Fixes live bei 375×667 **und** 1280×900
  gegengemessen. Mobil: alle drei Editor-Schichten 16px mit identischen
  Typografie-Metriken (fontSize/lineHeight/fontFamily/padding/
  letterSpacing/tabSize) und Ursprungs-Delta {x:0, y:0} — das
  Cursor-Alignment ist nachweislich intakt, nicht nur vermutlich.
  Ergebnis-Tabelle: `overflow-x: auto`, `scrollLeft` lässt sich
  tatsächlich bewegen, Seite scrollt weiterhin nicht horizontal. Desktop:
  unverändert 13px, Layout unberührt.
- **Ergebnis:** Zwei echte Mobile-Bugs behoben, davon einer (F-021) in
  einer schlimmeren Ausprägung als ursprünglich vermutet. Beide sind
  reine CSS-Layout-Fixes und daher wie F-001/F-007 nicht unit-testbar —
  die Absicherung ist die Live-Messung, die jetzt Teil des Runbooks ist.
  Damit sind die zwei konkreten Bugs aus dem Mobile-Plan erledigt; offen
  bleiben die Design-lastigen Punkte (Touch-Targets ~44px, Compare-Ansicht
  stapeln, Typo-Skala) — die hängen an der noch offenen Frage, ob Mobile
  eine vollwertige Authoring-Umgebung oder ein Read-and-Run-Modus sein
  soll, und werden deshalb bewusst nicht vorweggenommen.
- **Tests:** 849 unverändert (reine CSS-Änderungen). `typecheck`, volle
  Testsuite (849) und `npm run build` grün, `knip` ohne neue Funde.
  Coverage unverändert (91,81 % / 73,15 % / 99,06 %).

### 2026-08-09 — Stündliche Routine: SQL B8 (Mengenoperationen) abgeschlossen

- **Umfang:** Challenges 24–24.2 für die drei restlichen B8-Tags entworfen,
  implementiert und vollständig getestet (`union-distinct`, `intersect`,
  `except-minus`). Damit ist die B8-Lücke geschlossen — nur noch 1 Tag
  (`upsert-on-conflict`, B2 DML) und die bewusste Ausnahme
  (`updatable-view`, B12 Views) bleiben offen.

- **Szenario:** Zwei Regions-Tabellen (nord_sales, sued_sales) mit
  Produktnamen. Realistisch für Set-Operations: UNION kombiniert beide
  Ergebnisse (Dedup automatisch), INTERSECT zeigt nur gemeinsame Produkte,
  EXCEPT zeigt Produkte nur in einer Tabelle. Live-Validator für jede
  Challenge nutzt jeweils ein independently-phrased `engine.exec(...)`,
  nicht das Benutzer-Ergebnis selbst re-executed.

- **Distractors:** Pro Challenge 2 Distractors, per Gate 2 empirisch
  verifiziert zu scheitern (nicht nur "alternative Schreibweise"):
  - 24 (UNION): UNION ALL (behält Duplikate), WHERE IN-Subquery (zeigt nur
    gemeinsame, nicht alle unterschiedlichen).
  - 24.1 (INTERSECT): UNION (alle statt nur gemeinsame), EXCEPT in
    Gegenrichtung (nur Nord statt nur Nord-Süd-Überschneidung).
  - 24.2 (EXCEPT): EXCEPT in umgekehrter Richtung (nur Süd statt nur Nord),
    INTERSECT (zeigt gemeinsame statt nur Nord-exklusiv).

- **Tests:** Gate 1 (Lösung bestätigt, 251/251 Challenges bestehen Validierung),
  Gate 2 (alle Distractors fallen wie erwartet). Volle Testsuite
  (858 Tests), `typecheck`, `npm run build` grün. Keine Verbesserung der
  Coverage-Werte erwartet (rein neue Challenge-Inhalte, kein Engine-Code
  geändert) — wird mit nächster Measurements-Runde aktualisiert.

- **Dokumentation:** `docs/sql-concept-hierarchy.md` Abschnitt 6 aktualisiert:
  B8 markiert als seit 2026-08-09 vollständig abgedeckt. Bilanz: 80/82 Tags
  (≈98 %), nur noch `upsert-on-conflict` (B2) und die bewusste Ausnahme
  `updatable-view` (B12) offen — kein Zweig mehr zu 100 % Lücke.

- **Ergebnis:** B8 komplett, SQL damit auf 80 von 82 Tags. Challenges 24,
  24.1, 24.2 im Kurs registriert und live gegen dev server verifizierbar
  (incl. mobile 375×667 Viewport).

### 2026-08-09 — Stündliche Routine: Python B2/B5/B6-Restlücken abgeschlossen (81/82)

- **Umfang:** Nach SQL B8 (Mengenoperationen, vorheriger Durchgang) war
  Python die größere aktionable Lücke: 4 thematisch verstreute Einzeltags
  in B2/B5/B6, die keiner B14-Abhängigkeit unterlagen (anders als die
  vorherigen Restlücken in B10/B11), sondern schlicht noch nicht an der
  Reihe waren. Challenges 20–20.3 geschrieben und registriert.

- **Content:**
  - 20 (`dynamic-typing`): dieselbe Variable wechselt per Neuzuweisung den
    Typ (`int` → `str`), geprüft über `type(x).__name__`.
  - 20.1 (`bool-conversion-truthiness`): `bool(0/""/[])` vs. Werte mit
    Inhalt — sechs Ausdrücke, alle Falsy-Grundfälle abgedeckt.
  - 20.2 (`truthiness-in-conditions`): `if liste:` direkt in der Bedingung,
    ohne `bool()`-Wrapper oder Vergleich — mit einer leeren und einer
    nicht-leeren Liste, damit beide Zweige tatsächlich geprüft werden.
  - 20.3 (`ternary-expression`): `x if bedingung else y` als Ein-Zeilen-
    Ausdruck.

- **Distraktoren:** Alle vier Annahmen vor dem Schreiben mit echtem
  `python3` verifiziert, nicht nur angenommen — u. a. `[] == True` → `False`
  bestätigt (Grundlage für den 20.2-Distraktor: `if liste == True:` scheitert
  bei jeder Liste, auch nicht-leeren, weil Listen nie gleich `True` sind).
  20.1-Distraktor demonstriert die naheliegende Fehlannahme, jeder
  "vorhandene" Wert (ein String, eine Liste) sei automatisch truthy,
  unabhängig davon ob er leer ist.

- **Ergebnis:** Alle vier aktionablen Python-Tags abgedeckt — 81 von 82
  (nur noch `own-modules`, permanente Sandbox-Ausnahme, offen). Python
  liegt damit erstmals **vor** SQL (80/82) statt gleichauf.

- **Tests:** `test/content/challengeRunner.test.ts` 251 → 259 (Gate 1 + Gate
  2 für alle 4 neuen Challenges grün). Volle Testsuite 858 → 866, alle
  grün. `typecheck`, `npm run build` grün. `knip`: unverändert 10 Funde
  (dieselben strukturellen Interfaces wie zuvor, kein neuer durch reinen
  Content). Coverage: 91,77 % / 72,88 % / 99,07 % / 91,77 % (marginal
  verschoben durch neue, größtenteils gut getestete Validator-Zweige).

### 2026-08-09 — Stündliche Routine: SQL upsert-on-conflict abgeschlossen (81/82, letzter aktionabler Tag)

- **Umfang:** Nach den vorherigen Durchgängen (SQL B8, Python B2/B5/B6)
  war `upsert-on-conflict` (B2 DML) der letzte noch offene, aktionable Tag
  in SQL oder Python überhaupt — jeder andere offene Tag in beiden
  Dokumenten ist eine permanente Scope-Ausnahme (`updatable-view` in SQL,
  `own-modules` in Python), keine offene Aufgabe. Challenge 25 geschrieben
  und registriert.

- **Content:** Lager-Szenario (`lagerbestand`, PRIMARY KEY auf `sku`), das
  in einem einzigen `INSERT` beide Upsert-Pfade gleichzeitig zeigt: eine
  neue Lieferung für einen **bekannten** Artikel (`A100`) löst per
  `ON CONFLICT(sku) DO UPDATE SET menge = menge + excluded.menge` eine
  Bestandserhöhung statt eines Fehlers aus, während ein **neuer** Artikel
  (`B200`) im selben Statement ganz normal eingefügt wird — beide Pfade
  in einer Abfrage, kein künstlich getrenntes Beispiel.

- **Distraktoren:** Beide empirisch mit `node:sqlite` verifiziert, bevor
  geschrieben:
  1. Kein `ON CONFLICT` — wirft einen echten `UNIQUE constraint
     failed`-Fehler. Da `executeAndValidate` (`src/runtime/sql/
     executeAndValidate.ts`) bei einem SQL-Fehler sofort `{ok: false,
     error: ...}` zurückgibt, bevor `validate()` überhaupt aufgerufen
     wird, erfüllt ein werfender Distraktor Gate 2 automatisch — ein
     bestätigtes, wiederverwendbares Muster für Constraint-Verletzungen
     als Distraktor.
  2. `SET menge = excluded.menge` (überschreiben) statt `SET menge =
     menge + excluded.menge` (addieren) — liefert A100 fälschlich mit
     menge=15 statt der erwarteten 35, weil der alte Bestand verloren
     geht. Ein echter, lehrreicher Upsert-Fallstrick (Ersetzen vs.
     Addieren via `excluded`).

- **Ergebnis:** Letzter aktionabler SQL-Tag geschlossen — 81 von 82 (nur
  noch die permanente `updatable-view`-Ausnahme offen). SQL und Python
  liegen jetzt praktisch gleichauf (81/82 bzw. 81/82), beide mit
  ausschließlich permanenten Scope-Ausnahmen als Rest-Lücke. Die C#-Spur
  (`docs/csharp-engine-poc.md`, Schritt 7: echte Challenges) ist damit
  der einzige verbleibende Content-Umfang mit noch aktionablen Lücken.

- **Tests:** `test/content/challengeRunner.test.ts` 259 → 262 (Gate 1 +
  Gate 2 für Challenge 25 grün, inklusive der beiden empirisch
  verifizierten Distraktoren). Volle Testsuite 866 → 869, alle grün.
  `typecheck`, `npm run build` grün. `knip`: unverändert 10 Funde
  (dieselben strukturellen Interfaces, kein neuer Fund durch reinen
  Content). Coverage: 91,72 % / 72,81 % / 99,08 % / 91,72 % (marginal
  verschoben, reine Content-Ergänzung ohne Engine-Code-Änderung).

### 2026-08-09 — Stündliche Routine: Live-Bug-Hunt (sauber) + C# Schritt 7 gestartet

- **Umfang:** SQL und Python sind seit dem vorherigen Durchgang bei 81/82
  Tags (nur permanente Scope-Ausnahmen offen) — keine aktionable
  Content-Lücke mehr in Priorität 3. Also zuerst Priorität 2 (Live-Bug-Hunt
  gegen den echten Dev-Server), danach Priorität 4 (C#), da diese laut
  Mandat einen klaren nächsten kleinen Schritt hat.

- **Live-Bug-Hunt (Priorität 2):** Alle seit den letzten drei
  Content-Durchgängen neu geschriebenen Challenges (SQL 24, 24.1, 24.2, 25;
  Python 20, 20.1, 20.2, 20.3) live gegen den echten Dev-Server verifiziert
  — sowohl Lösung als auch Distraktor pro Challenge, über echtes
  sql.js-WASM und echtes Pyodide (nicht nur die Node-Testmotoren). Alle 8
  Lösungen bestehen, alle 8 Distraktoren scheitern korrekt, keine
  Konsolenfehler. Zusätzlich ein mobiler Regressionscheck (375×667,
  Standing Requirement seit F-020): kein horizontales Seiten-Overflow,
  Sidebar-Drawer schließt nach Auswahl korrekt, Editor/Tab/Run-Button
  echte `.click()`-Erreichbarkeit bestätigt, Editor-Schriftgröße weiterhin
  16px (F-022 hält), `.results-body` weiterhin `overflow-x: auto` (F-021
  hält). **Keine neuen Bugs gefunden** — sauberer Durchgang.

- **C# Schritt 7 gestartet (Priorität 4):** Erste echte C#-Challenge.
  Vorher nötige Plumbing ergänzt:
  - `src/runtime/csharp/executeAndValidate.ts` (+ Test) — async-Pendant zu
    Pythons `executeAndValidate.ts`, weil `CSharpRuntime.exec()` (echter
    `dotnet exec`-Subprozess bzw. Blazor-WASM-Aufruf) nie synchron ist.
  - `describeCSharpCourse` in `test/content/challengeRunner.test.ts` —
    Gate-1/Gate-2-Harness für den C#-Track, async `it()`-Callbacks
    (einziger struktureller Unterschied zu `describeSqlCourse`/
    `describePythonCourse`).
  - Challenge 01 (`Console.WriteLine`, deckt alle 5 B0-Tags ab —
    `program-execution-model` und `comments` im Tutorial-Text erklärt,
    genau wie Pythons Challenge 01 Kommentare nur im Tutorial einführt;
    `top-level-statements`, `function-call-syntax`,
    `member-access-dot-syntax` direkt über die zwei `Console.WriteLine(...)`-
    Aufrufe — plus den einzigen B1-Tag `console-write-line`: B0+B1 damit
    komplett, 6 Tags). `validate()` prüft exakte Zeilentrennung des stdout,
    nicht nur Teilstring-Enthaltensein:
    ein reiner `.includes()`-Check hätte den `Console.Write`-statt-
    `WriteLine`-Distraktor fälschlich bestehen lassen, weil beide
    erwarteten Texte auch ohne Zeilenumbruch dazwischen als Teilstrings
    vorkommen. Live gegen den echten `dotnet`-Treiber verifiziert (Lösung
    besteht, Distraktor scheitert).
  - `csharpGrundlagenCourse` bleibt bewusst **nicht** in `TRACKS`
    registriert (dieselben vier Live-UI-Lücken wie in
    `docs/csharp-engine-poc.md` Schritt 5 dokumentiert: Engine-Fabrik,
    Editor-Sprachplugin, servierte Blazor-Quelle — alle noch offen).
    `registry.test.ts`s genereller Schema-Check erfasst diese Challenge
    deshalb nicht automatisch; ein eigener Test in `course.test.ts`
    validiert stattdessen direkt gegen `csharpChallengeSchema`. Kein
    Live-Playwright-Test möglich, da C# noch nicht in der Kurs-Auswahl der
    UI erscheint — nur Node-seitig (Gate 1/2) verifiziert.

- **Ergebnis:** C#-Tag-Bilanz bewegt sich erstmals: 0/86 → 6/86 (≈7 %),
  B0 (Grundlagen) und B1 (Ausgabe) komplett abgedeckt. Build-Größe
  unverändert (631.73 kB) — bestätigt, dass der unregistrierte Track
  weiterhin nicht ins Live-Bundle gezogen wird.

- **Tests:** `test/content/challengeRunner.test.ts` 262 → 264 (neue C#
  Gate 1/2-Tests). Volle Testsuite 869 → 876, alle grün. `typecheck`,
  `npm run build` grün. `knip`: unverändert 10 Funde. Coverage: 91,76 % /
  72,87 % / 99,08 % / 91,76 %.

### 2026-08-09 — Stündliche Routine: C# Challenge 02 (B2-Grundtypen)

- **Umfang:** SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen), kein neuer Bug im letzten Live-Bug-Hunt gefunden — C# hat nach
  dem vorherigen Durchgang (Plumbing + Challenge 01) klaren Schwung, also
  ein weiteres begrenztes Increment: Challenge 02 für B2 (Variablen &
  Typen).

- **Content:** Szenario "7 Äpfel auf 2 Personen aufteilen" — deckt 6 der
  9 B2-Tags in einem Durchgang ab: `static-typing-concept`,
  `typed-variable-declaration`, `int-type`, `double-type`, `string-type`,
  `bool-type`. Zeigt dabei einen echten C#-Stolperstein: `int`-Division
  rundet immer ab (`7 / 2` → `3`), auch wenn das Ergebnis in eine
  `double`-Variable geschrieben wird — erst wenn mindestens ein Operand
  selbst `double` ist (`7.0 / 2.0` → `3.5`), wird tatsächlich genau
  gerechnet.

- **Design-Hürde vor dem Schreiben erkannt und umgangen:** Ein erster
  Entwurf (jeden Typ mit einem passenden Wert deklarieren, direkt
  ausgeben) wurde verworfen, nachdem eine Live-Probe zeigte: `string x =
  "25";` und `int x = 25;` erzeugen über `Console.WriteLine` **denselben**
  stdout ("25\n") — `ToString()` macht den Typunterschied unsichtbar,
  sobald nur der reine Wert ausgegeben wird. Weil C#s `validate()`
  ausschließlich stdout-basiert ist (Schritt-4-Entscheidung, kein
  Variablen-Dict wie bei Python), musste die Aufgabe so konstruiert
  werden, dass ein falscher Typ nachweislich einen **anderen Wert**
  produziert — die int/double-Divisions-Aufgabe leistet das. Beide
  Distraktoren (fehlendes `.0`; falscher `bool`-Wert) vor dem Schreiben
  empirisch mit dem echten `dotnet`-Treiber verifiziert.

- **Ergebnis:** C#-Tag-Bilanz 6/86 → 12/86 (≈14 %). `char-type`,
  `var-type-inference`, `constants-readonly` bleiben als B2-Rest offen
  (bewusst nicht mit untergebracht, um die Challenge nicht zu
  überladen). Build-Größe weiterhin unverändert (631.73 kB) — Track
  bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 264 → 270 (Gate 1 +
  Gate 2 für Challenge 02, beide Distraktoren grün). Volle Testsuite
  876 → 879, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,79 % / 72,86 % / 99,08 % / 91,79 %.

### 2026-08-09 — Nutzer-Anfrage: Syntax-Highlighting in Tutorial/Tipps/Erklärung/Lösung

- **Umfang:** Direkter Nutzer-Auftrag (nicht Teil der autonomen Routine):
  "tutorial syntax needs to be colored as code is in the editor. also
  color the words in the explanations accordingly." Vorher als Backlog-
  Eintrag notiert (`docs/backlog.md`), jetzt auf expliziten Befehl
  ("Do") umgesetzt.

- **Befund vor der Umsetzung:** `tutorial`, `hints` und `syntaxExplanation`
  sind authored HTML mit eingebetteten `<pre>`/`<code>`-Codebeispielen,
  aber bislang komplett unstyled — eine feste `color: var(--gold)` in
  `themes.css` färbte jeden Code-Textabschnitt einheitlich gold, obwohl
  der Editor selbst (`textarea.editor` + `.highlight-layer`) für SQL und
  Python längst einen echten Tokenizer mit Mehrfarben-Highlighting hat
  (`src/editor/languages/{sql,python}/highlight.ts`, bereits vorhandene
  globale `.tok-*`-CSS-Klassen).

- **Umsetzung:** Neues Modul `src/ui/render/contentHighlight.ts`:
  - `highlightCodeForTrack(code, trackId)` — für reinen Code-Text (z. B.
    die Musterlösung), ruft direkt `highlightSql`/`highlightPython` aus
    dem Editor-Modul auf.
  - `highlightContentHtml(html, trackId)` — für authored HTML, das Prosa
    (`<b>`, `<ul>`, ...) mit Code-Beispielen mischt: parst per
    `document.createElement('div').innerHTML`, findet alle `<pre>`- und
    (nicht bereits in einem `<pre>` verschachtelte) `<code>`-Elemente,
    ersetzt deren `innerHTML` durch den tokenisierten, escapten Text.
  - Fallback für Tracks ohne Tokenizer (aktuell nur `csharp`, noch nicht
    live registriert): Rückgabe unverändert bzw. reines `escapeHtml`.
  - Angewendet in `tutorialTab.ts` (Tutorial-Text + Erfolgskriterium),
    `hintsSection.ts` (alle drei aufgedeckten Tipps),
    `solutionSection.ts` (Musterlösungs-`<pre>` UND die "Syntax
    erklärt"-Box).
  - CSS (`themes.css`): die vier betroffenen `<pre>`/`<code>`-Regeln
    (`.tutorial-text`, `.hint-revealed .hint-text`,
    `.solution-explanation .se-text`) von der festen `color: var(--gold)`
    auf `color: var(--input-text)` umgestellt — dieselbe Basisfarbe, die
    der Editor für nicht extra eingefärbte Tokens (Satzzeichen,
    Leerraum) nutzt. `.solution-panel pre` hatte diese Farbe bereits.
  - Bewusst **nicht** angefasst: `pgAskPanel.ts` (`extra.pg`). Der Text
    dort mischt unvorhersehbar Prosa und Code im selben String (z. B.
    "In echtem Postgres reicht eine Zeile:\n\nINSERT INTO...") — ein
    naives Voll-Highlighting des ganzen Strings hätte deutsche
    Prosa-Wörter fälschlich als SQL-Bezeichner eingefärbt. Bleibt
    unverändert mit reinem `escapeHtml`.

- **Nebenbefund (echter, kleiner Bug, im selben Zug behoben):** Alle drei
  betroffenen Views (`tutorialTab.ts`, `hintsSection.ts`,
  `solutionSection.ts`) hatten `shouldUpdate` nur an `challenge.num`
  geknüpft, nicht an den Track — ein Wechsel von z. B. SQL Challenge "01"
  zu Python Challenge "01" (gleiche `num`, anderer Track) hätte den
  Re-Render fälschlich übersprungen und den alten Tutorial-/Tipp-/
  Lösungstext des vorherigen Tracks stehen lassen. Alle drei
  `shouldUpdate`-Prüfungen um `prev.trackId !== next.trackId` ergänzt.

- **Live-Verifikation:** Gegen den echten Dev-Server (sql.js + Pyodide
  lokal geroutet). SQL Challenge 03 (Tutorial mit `WITH RECURSIVE`-Block):
  33 hervorgehobene Tokens im Tutorial, 31 in den Tipps, 37 in der
  Musterlösung, 26 in der Syntax-Erklärung — `Console.WriteLine`-Analoga
  für SQL sichtbar korrekt eingefärbt (Keywords orange, Identifier hell,
  Kommentare kursiv-grau, exakt wie im Editor). Python Challenge 14 (List
  Comprehension): `for`/`in` als Keywords eingefärbt, deutsche
  Platzhalterwörter in Inline-Code (`AUSDRUCK`, `VARIABLE`, `ITERABLE`)
  bleiben unauffällig als Identifier eingefärbt statt zu brechen —
  bestätigt, dass der Tokenizer robust mit unvollständigen/nicht-echten
  Code-Fragmenten umgeht. Mobiler Durchlauf (375×667): kein horizontales
  Overflow, 33 Tokens weiterhin korrekt hervorgehoben, keine
  Konsolenfehler.

- **Ergebnis:** Tutorial-, Tipp-, Erklärungs- und Lösungstexte zeigen
  jetzt dieselbe Mehrfarben-Syntaxhervorhebung wie der Editor selbst,
  für SQL und Python. `docs/backlog.md` aktualisiert (Eintrag von
  "Offen" nach "Erledigt" verschoben).

- **Tests:** 11 neue Tests in `contentHighlight.test.ts` (Kern-Logik:
  Keyword-Highlighting, HTML-Escaping, Fallback ohne Tokenizer, korrekte
  Verschachtelungs-Behandlung, mehrere unabhängige `<code>`-Snippets,
  korrekte Escaping von `<` als Vergleichsoperator). Je eine neue
  Integrations-Assertion in `tutorialTab.test.ts`, `hintsSection.test.ts`,
  `solutionSection.test.ts` (prüft `.tok-keyword` tatsächlich im
  gerenderten DOM). Volle Testsuite 879 → 893, alle grün. `typecheck`,
  `npm run build` grün (+0,6 kB). `knip`: unverändert 10 Funde. Coverage:
  91,82 % / 72,95 % / 99,09 % / 91,82 %.

### 2026-08-09 — Stündliche Routine: C# Challenge 03 (B2 vollständig)

- **Umfang:** Baseline sauber (893/893, typecheck/build/knip grün, HEAD
  `2463d94` nach dem Nutzer-Syntax-Highlighting-Commit). SQL/Python bleiben
  bei 81/82 (nur permanente Ausnahmen offen) — kein aktionabler
  Content-Tag mehr in beiden Tracks. C# hat nach Challenge 01/02 klaren
  Schwung, also das nächste begrenzte Increment: die drei restlichen
  B2-Tags (`char-type`, `var-type-inference`, `constants-readonly`), die
  Challenge 02 bewusst nicht mit abgedeckt hatte.

- **Content:** Szenario "Prüfung mit 100 Punkten, 82 erreicht, Note B" —
  eine Konstante (`const int maxPunkte`), eine per Typinferenz angelegte
  Variable (`var erreichtePunkte`) und ein einzelnes Zeichen (`char
  notenBuchstabe`) in einem Durchgang.

- **C#-spezifisches Distraktor-Muster (neu für diesen Track):** Beide
  Distraktoren sind bewusst **Compilerfehler**, nicht falsche
  stdout-Ausgaben — anders als bei Challenge 02 lässt sich weder "eine
  Konstante wurde verändert" noch "ein string wurde als char behandelt"
  über unterschiedlichen stdout beobachten, weil beide Verstöße den
  Compiler stoppen, bevor überhaupt etwas läuft. Das passt zum
  stdout-only-`validate()`-Design (Schritt-4-Entscheidung): `
  executeAndValidate` liefert bei einem Compilerfehler `{ ok: false,
  error: ... }`, bevor `validate()` je aufgerufen wird — dasselbe Muster,
  das schon bei SQL-Constraint-Verletzungen (z. B. `upsert-on-conflict`)
  genutzt wurde. Beide Distraktoren vor dem Schreiben empirisch gegen den
  echten `dotnet`-Treiber verifiziert: Neuzuweisung an die Konstante
  erzeugt tatsächlich `CS0131` ("The left-hand side of an assignment must
  be a variable, property or indexer"), `char notenBuchstabe = "B";`
  tatsächlich `CS0029` ("Cannot implicitly convert type 'string' to
  'char'").

- **Ergebnis:** C#-Tag-Bilanz 12/86 → 15/86 (≈17 %). B0, B1 und B2 sind
  damit vollständig abgedeckt — nächster offener Zweig ist B3
  (Operatoren). Build-Größe unverändert (632,33 kB) — Track bleibt
  unregistriert, wirkt sich nicht auf den Browser-Bundle aus.

- **Tests:** `test/content/challengeRunner.test.ts` 270 → 273 (Gate 1 +
  Gate 2 für Challenge 03, beide Distraktoren grün, beide als echter
  Compilerfehler bestätigt statt nur als abweichender stdout). Volle
  Testsuite 893 → 896, alle grün. `typecheck`, `npm run build` grün.
  `knip`: unverändert 10 Funde. Coverage: 91,80 % / 72,92 % / 99,09 % /
  91,80 %.

### 2026-08-09 — Stündliche Routine: Live-Bug-Hunt (sauber) + C# Challenge 04 (B3 vollständig)

- **Umfang:** Baseline sauber (896/896, typecheck/build/knip grün, HEAD
  `e115901`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in beiden Tracks. Priorität 2
  (Live-Bug-Hunt) zuerst, da der letzte gezielte Durchlauf zwei
  Content-Durchgänge zurücklag; danach C#, das nach Challenge 01-03
  klaren Schwung hat.

- **Live-Bug-Hunt (Priorität 2):** Gegen den echten Dev-Server, sql.js
  und Pyodide lokal geroutet. Alle 78 SQL- und alle 67
  Python-Challenges per Sweep durchlaufen (Tutorial-Tab öffnen, Text
  vorhanden prüfen) — 0 leere/fehlende Tutorials in beiden Tracks. Drei
  SQL-Musterlösungen (01, 13, 25) und die erste Python-Musterlösung per
  Editor tatsächlich ausgeführt — alle vier korrekt als
  "✓ Aufgabe erfüllt" akzeptiert. Mobiler Durchlauf (375×667): kein
  horizontales Overflow, keine Konsolenfehler. Keine neuen Bugs
  gefunden.

- **C# Content (Priorität 4):** Challenge 04 ergänzt — deckt alle 6 Tags
  aus B3 (Operatoren) in einem Durchgang ab: `arithmetic-operators`,
  `integer-division-modulo`, `comparison-operators`,
  `boolean-logic-operators`, `compound-assignment-operators`,
  `increment-decrement-operators`. Szenario: ein Punktestand-Tracker
  (Start 10 Punkte) als gerade Anweisungsfolge ohne Schleife (`for`/
  `while` aus B7 sind noch nicht freigeschaltet) — `+=`, `++`, `*`, `/`,
  `%`, `>` und `&&` in Folge auf denselben Variablenwert angewendet.

- **Distraktor-Muster diesmal wieder stdout-basiert, nicht
  Compilerfehler** (anders als Challenge 03): beide Distraktoren
  kompilieren fehlerfrei, liefern aber nachweislich falsche Werte —
  `/` und `%` vertauscht (klassischer Verwechslungsfehler bei
  Ganzzahl-Division: liefert `1`/`5` statt `5`/`1`) und das komplette
  Weglassen von `punkte++` (verschiebt alle sechs Ausgabezeilen, u. a.
  wird `bestanden` fälschlich `false` statt `true`, weil `15 > 15` nicht
  mehr zutrifft). Beide vor dem Schreiben empirisch gegen den echten
  `dotnet`-Treiber nachgerechnet statt nur angenommen — die Verkettung
  aus `+=` und `++` auf denselben Wert macht Kopfrechnen fehleranfällig
  genug, dass sich die Verifikation gelohnt hat.

- **Ergebnis:** C#-Tag-Bilanz 15/86 → 21/86 (≈24 %). B0 bis B3 sind damit
  vollständig abgedeckt — nächster offener Zweig ist B4 (Strings).
  Build-Größe unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 273 → 276 (Gate 1 +
  Gate 2 für Challenge 04, beide Distraktoren grün). Volle Testsuite
  896 → 899, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,83 % / 72,90 % / 99,09 % / 91,83 %.

### 2026-08-09 — Stündliche Routine: C# Challenge 05 (B4 vollständig)

- **Umfang:** Baseline sauber (899/899, typecheck/build/knip grün, HEAD
  `8dd1562`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 01-04
  klaren Schwung, also das nächste begrenzte Increment: B4 (Strings), der
  nächste offene Zweig nach B3.

- **Content:** Challenge 05 deckt alle 3 Tags aus B4 in einem Durchgang
  ab: `string-concatenation`, `string-interpolation`, `string-methods`.
  Szenario: Vor- und Nachname per `+` zu einem vollen Namen verketten,
  per `$"..."`-Interpolation begrüßen (inklusive `.Length` als
  eingebundener Ausdruck) und per `.ToUpper()` großschreiben — alle drei
  Tags kommen dadurch in einer zusammenhängenden Anweisungskette vor,
  nicht isoliert nebeneinander in separaten Zeilen.

- **Distraktoren wieder stdout-basiert** (wie bei Challenge 04, anders
  als beim Compilerfehler-Muster aus Challenge 03): das Leerzeichen bei
  der Verkettung vergessen (wirkt sich auf alle drei Ausgabezeilen aus,
  da `vollerName` in Interpolation und Großschreibung wiederverwendet
  wird — Length wird dadurch 11 statt 12) und `ToLower()` statt
  `ToUpper()` (wirkt sich nur auf die letzte Zeile aus). Beide vor dem
  Schreiben empirisch gegen den echten `dotnet`-Treiber verifiziert statt
  nur angenommen.

- **Ergebnis:** C#-Tag-Bilanz 21/86 → 24/86 (≈28 %). B0 bis B4 sind damit
  vollständig abgedeckt — nächster offener Zweig ist B5 (Typumwandlung &
  Nullability). Build-Größe unverändert (632,33 kB) — Track bleibt
  unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 276 → 279 (Gate 1 +
  Gate 2 für Challenge 05, beide Distraktoren grün). Volle Testsuite
  899 → 902, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,87 % / 72,89 % / 99,09 % / 91,87 %.

### 2026-08-09 — Stündliche Routine: C# Challenge 06 (B5 vollständig)

- **Umfang:** Baseline sauber (902/902, typecheck/build/knip grün, HEAD
  `fdf6b67`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 01-05
  klaren Schwung, nächstes begrenztes Increment: B5 (Typumwandlung &
  Nullability), der nächste offene Zweig nach B4.

- **Content:** Challenge 06 deckt alle 4 Tags aus B5 in einem Durchgang
  ab: `explicit-type-casting`, `nullable-value-types`,
  `null-conditional-operator`, `null-coalescing-operator`. Szenario: eine
  Testauswertung mit roher Punktzahl (per `(int)`-Cast gerundet — schneidet
  ab, `87.6` wird `87`), einer `int?`-Bonuspunktzahl (`null`, per `??` auf
  `0` ersetzt) und einem `string?`-Spitznamen (`null`, per `?.` sicher auf
  `.Length` zugegriffen).

- **Nebenbefund (validate()-Musteränderung, kein Bug im bisherigen
  Content):** Diese Challenge ist die erste mit einer **legitim leeren
  Ausgabezeile** (`spitznameLaenge` ist `null`, `Console.WriteLine(null)`
  gibt eine leere Zeile aus). Das bisherige Muster in allen C#-Challenges,
  `stdout.split('\n').filter(line => line.length > 0)`, hätte diese Zeile
  fälschlich verschluckt — es filtert *jede* leere Zeile weg, nicht nur
  den Trailing-Newline-Artefakt am Stringende. Für Challenge 06 stattdessen
  `stdout.split('\n').slice(0, -1)` verwendet — entfernt gezielt nur das
  letzte, durch das abschließende `\n` erzeugte leere Element. Rückwirkend
  äquivalent zum alten Muster bei allen fünf bisherigen Challenges (keine
  hatte je eine legitime Leerzeile), also kein Fix an bestehendem Content
  nötig, aber ein Präzedenzfall für künftige C#-Challenges mit
  möglicherweise leerer Ausgabe.

- **Drei statt der üblichen zwei Distraktoren:** Alle drei einzeln
  empirisch gegen den echten `dotnet`-Treiber verifiziert. Fehlender Cast
  (Compilerfehler CS0266); `.` statt `?.` (kompiliert, stürzt aber zur
  Laufzeit mit `NullReferenceException` ab — demonstriert die Kernaussage
  von `?.` an einem echten Absturz statt nur zu behaupten); fehlendes `?`
  bei der `int?`-Deklaration (zwei Compilerfehler, CS0037 + CS0019, weil
  ohne Nullable-Markierung weder die `null`-Zuweisung noch die
  anschließende `??`-Verknüpfung typprüfen).

- **Ergebnis:** C#-Tag-Bilanz 24/86 → 28/86 (≈33 %). B0 bis B5 sind damit
  vollständig abgedeckt — nächster offener Zweig ist B6 (Kontrollfluss).
  Build-Größe unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 279 → 283 (Gate 1 +
  Gate 2 für Challenge 06, alle drei Distraktoren grün). Volle Testsuite
  902 → 906, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,85 % / 72,88 % / 99,09 % / 91,85 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 07 (B6 vollständig)

- **Umfang:** Baseline sauber (906/906, typecheck/build/knip grün, HEAD
  `e8cf85c`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. Kein neuer Coverage-Ausfall
  gegenüber dem letzten Snapshot, keine SQL/Python/UI-Datei seit dem
  letzten Live-Bug-Hunt geändert — ein erneuter Playwright-Durchlauf
  hätte nichts Neues gefunden, also direkt zu C# weiter, das nach
  Challenge 01-06 klaren Schwung hat: nächstes begrenztes Increment ist
  B6 (Kontrollfluss).

- **Content:** Challenge 07 deckt alle 5 Tags aus B6 in einem Durchgang
  ab: `if-else-statement`, `else-if-chain`, `switch-statement`,
  `ternary-operator`, `pattern-matching-switch`. Szenario: ein
  Notenrechner (`int punkte = 78`), der dieselbe grobe Logik über vier
  verschiedene Kontrollfluss-Formen ausdrückt — eine `if`/`else if`/
  `else`-Kette, einen Ternär-Operator, ein klassisches `switch`/`case`/
  `break` (mit bewusst leeren `case`-Fallthroughs) und einen modernen
  Pattern-Matching-`switch`-Ausdruck mit relationalen Mustern.

- **Drei Distraktoren, alle empirisch verifiziert:** die `if`/`else if`-
  Kette in aufsteigender statt absteigender Reihenfolge geprüft (echter
  Logikfehler bei sich überschneidenden Bereichen); ein fehlendes
  `break;` im `switch` — in C# anders als in C/C++ **kein
  stillschweigender Laufzeitfehler**, sondern ein vom Compiler
  erzwungener Fehler (`CS0163`, "Control cannot fall through from one
  case label to another"); die beiden Zweige des Ternär-Operators
  vertauscht.

- **Ergebnis:** C#-Tag-Bilanz 28/86 → 33/86 (≈38 %). B0 bis B6 sind damit
  vollständig abgedeckt — nächster offener Zweig ist B7 (Schleifen).
  Build-Größe unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 283 → 287 (Gate 1 +
  Gate 2 für Challenge 07, alle drei Distraktoren grün). Volle Testsuite
  906 → 910, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,88 % / 72,86 % / 99,10 % / 91,88 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 08 (B7 vollständig)

- **Umfang:** Baseline sauber (910/910, typecheck/build/knip grün, HEAD
  `5fa3492`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr, kein neuer Coverage-Ausfall,
  keine SQL/Python/UI-Datei seit dem letzten Live-Bug-Hunt geändert. C#
  hat nach Challenge 01-07 klaren Schwung, nächstes begrenztes
  Increment: B7 (Schleifen).

- **Content:** Challenge 08 deckt alle 5 Tags aus B7 in einem Durchgang
  ab: `while-loop`, `for-loop`, `do-while-loop`, `break-continue`,
  `nested-loops`. Fünf unabhängige Berechnungen, je eine pro
  Schleifenform: eine `for`-Schleife (Quadratsumme 1²–5²), eine
  `while`-Schleife (Summe akkumulieren bis zur Grenze), eine
  `do`-`while`-Schleife mit einer von Anfang an falschen Bedingung — zeigt
  konkret, dass der Rumpf trotzdem mindestens einmal läuft, eine
  `for`-Schleife mit sowohl `continue` als auch `break` im selben
  Durchlauf, und zwei verschachtelte `for`-Schleifen.

- **Drei Distraktoren, alle empirisch verifiziert:** `while` statt
  `do`-`while` (Rumpf läuft dann gar nicht, 0 statt 1 — der
  Kernunterschied der beiden Schleifenformen an einem echten Zahlenwert
  demonstriert statt nur behauptet); das `continue` komplett weggelassen
  (falsches Summenergebnis); dieselbe Schleifenvariable in innerer und
  äußerer `for`-Schleife wiederverwendet — in C# kein stilles
  Überschreiben, sondern ein Compilerfehler (`CS0136`).

- **Ergebnis:** C#-Tag-Bilanz 33/86 → 38/86 (≈44 %). B0 bis B7 sind damit
  vollständig abgedeckt — nächster offener Zweig ist B8 (Arrays &
  Collections). Build-Größe unverändert (632,33 kB) — Track bleibt
  unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 287 → 291 (Gate 1 +
  Gate 2 für Challenge 08, alle drei Distraktoren grün). Volle Testsuite
  910 → 914, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,92 % / 72,85 % / 99,10 % / 91,92 %.

### 2026-08-10 — Stündliche Routine: Live-Bug-Hunt (sauber, `ERR_CERT`-Rätsel endlich geklärt) + C# Challenge 09 (B8 vollständig)

- **Umfang:** Baseline sauber (914/914, typecheck/build/knip grün, HEAD
  `a252250`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks.
  Dev-Server per Playwright gegen die echte Anwendung gefahren (CDN-
  Workaround aus dem Runbook: `context.route()` fängt
  `cdnjs.cloudflare.com/ajax/libs/sql.js/**` und
  `cdn.jsdelivr.net/pyodide/**` ab und liefert die lokal per `npm --no-save`
  installierten `sql.js`/`pyodide`-Pakete aus dem sandboxed CDN-Sperre
  herum).

- **Live-Bug-Hunt-Ergebnis:** Alle 78 SQL- und 67 Python-Challenges
  durchlaufen (Tutorial-Text vorhanden, Hints aufdeckbar), Stichproben der
  Syntax-Highlighting-Token-Zahlen (`.tok-*`) unauffällig, vier
  End-to-End-Lösungsläufe (`.status-ok`-Erfolgsbadge) grün, Mobile-Viewport
  (375×667) ohne horizontales Overflow. Keine neuen Funde.

- **`ERR_CERT_AUTHORITY_INVALID`-Rätsel endgültig geklärt:** Frühere
  Durchgänge hatten wiederholt eine Häufung von
  `ERR_CERT_AUTHORITY_INVALID`-Konsolenfehlern in Playwright-Läufen
  gesehen, aber nur vage als "vermutlich unabhängig" abgetan, ohne die
  Ursache zu bestätigen. Zwei gezielte Untersuchungsskripte haben die
  Ursache jetzt eindeutig belegt: Ein Klick auf `.hint-btn` löst über
  `revealHint()` in `src/ui/state/actions.ts` einen echten
  `fetch()`-POST an `https://api.anthropic.com/v1/messages` aus
  (`sendChatMessage()` in derselben Datei) — vollständig beabsichtigt, wie
  sowohl der Label-Text in `hintsSection.ts` ("Claude vertieft sie im
  Chat") als auch ein Code-Kommentar dort bestätigen. In dieser
  Sandbox-Umgebung schlägt dieser Request am HTTPS-abfangenden Proxy mit
  `ERR_CERT_AUTHORITY_INVALID` fehl — ein reines Sandbox-Artefakt, kein
  Anwendungsfehler. Der Aufruf ist bereits sauber mit try/catch
  abgesichert (Fehler landet als Chat-Nachricht, blockiert nie die
  Hint-Anzeige). Ein gezielter Grep
  (`fetch(|XMLHttpRequest|new Image(`) über den ganzen `src/`-Baum
  bestätigt, dass `claudeChatClient.ts` die einzige Netzwerk-Aufrufstelle
  der gesamten Anwendung ist — kein verstecktes zweites Problem. Zwei
  eigene Fehlalarme im Bug-Hunt-Skript selbst wurden im selben Zug
  aufgeklärt: ein vermeintlich fehlendes "Chat-Tab nach Klick" beruhte auf
  einem falsch geratenen Selektor im Testskript (`.chat-tab` statt des
  tatsächlichen `.chat-section`) — mit dem korrekten Selektor rendert das
  Chat-Panel wie erwartet.

- **Content:** Challenge 09 deckt alle 4 Tags aus B8 (Arrays & Collections)
  in einem Durchgang ab: `array-basics`, `foreach-loop`, `list-basics`,
  `dictionary-basics`. Szenario: eine Punktzahl-Liste (Array mit
  Index-Zugriff und `foreach`-Summierung), eine Einkaufsliste
  (`List<string>` mit `.Add()`/`.Remove()`/`.Count`) und eine Preisliste
  (`Dictionary<string, double>` mit `.ContainsKey()`).

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** ein vergessenes `.Remove(...)` (`einkaufsliste.Count`
  fälschlich 4 statt 3); der direkte Dictionary-Indexer
  `preise["Butter"]` statt `.ContainsKey("Butter")` auf einem nie
  eingetragenen Schlüssel — kompiliert, stürzt aber zur Laufzeit mit einer
  `KeyNotFoundException` ab, genau die Situation, für die `.ContainsKey()`
  existiert; und ein Off-by-one beim Array-Index (`punkte[1]` statt
  `punkte[0]`, Indizes beginnen bei 0).

- **Ergebnis:** C#-Tag-Bilanz 38/86 → 42/86 (≈49 %). B0 bis B8 sind damit
  vollständig abgedeckt — knapp die Hälfte aller 86 Tags. Nächster offener
  Zweig ist B9 (Methoden). Build-Größe unverändert (632,33 kB) — Track
  bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 291 → 292 (Gate 1 +
  Gate 2 für Challenge 09, alle drei Distraktoren grün). Volle Testsuite
  914 → 918, alle grün. `typecheck`, `npm run build` grün. Coverage:
  91,95 % / 72,82 % / 99,10 % / 91,95 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 10 (B9 Teil 1) + Overloading-Einschränkung entdeckt

- **Umfang:** Baseline sauber (918/918, typecheck/build/knip grün, HEAD
  `b54e44e`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks. C#
  hat nach Challenge 01-09 klaren Schwung, nächster Zweig: B9 (Methoden,
  8 Tags — größer als jeder bisherige C#-Zweig einzeln, deshalb analog zu
  B2 auf zwei Challenges aufgeteilt).

- **Content:** Challenge 10 deckt 4 der 8 B9-Tags ab: `method-definition`,
  `method-parameters`, `return-statement`, `recursion`. Szenario: drei
  eigene Methoden — `Quadrieren` (ein Parameter), `Rechteckflaeche` (zwei
  typisierte Parameter), und die rekursive `Fakultaet` mit explizitem
  Basisfall `n <= 1`.

- **Empirischer Fund vor dem Schreiben des Contents:** Ein erster Entwurf
  wollte auch `method-overloading` (den fünften B9-Tag) in Challenge 10
  mitnehmen — zwei `Verdoppeln`-Überladungen (`int`/`double`). Das schlug
  beim Testlauf gegen den echten `dotnet`-Treiber fehl:
  `CS0128: A local variable or function named 'Verdoppeln' is already
  defined in this scope`. Grund: Methoden, die nach den Top-Level-
  Statements einer `.cs`-Datei stehen (wie in diesem gesamten Kurs
  durchgehend verwendet), sind technisch **lokale Funktionen** der
  implizit generierten `Main`-Methode — und lokale Funktionen können in
  C#, anders als normale Klassenmethoden, nicht überladen werden. Echtes
  Overloading bräuchte eine Klasse als Container, was inhaltlich ein
  Vorgriff auf `class-definition` (B10) wäre. `method-overloading` bleibt
  deshalb vorerst zurückgestellt (dokumentiert in
  `docs/csharp-concept-hierarchy.md`); die verbleibenden B9-Tags
  (`optional-parameters`, `ref-out-parameters`, `params-array`) sind
  davon nicht betroffen und folgen in einer künftigen Challenge.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** fehlendes `return` in `Quadrieren` (Compilerfehler
  CS0161, nicht alle Codepfade liefern einen Wert); `breite + hoehe`
  statt `breite * hoehe` in `Rechteckflaeche` (kompiliert, falsches
  Ergebnis); Rekursions-Basisfall liefert `0` statt `1` zurück, wodurch
  die ganze Multiplikationskette mit 0 durchmultipliziert wird
  (`Fakultaet(5)` liefert fälschlich `0` statt `120`).

- **Ergebnis:** C#-Tag-Bilanz 42/86 → 46/86 (≈53 %). B9 zu 4 von 8 Tags
  abgedeckt, kein Zweig komplett neu geschlossen, aber über die Hälfte
  aller 86 Tags erreicht. Build-Größe unverändert (632,33 kB) — Track
  bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 292 → 296 (Gate 1 +
  Gate 2 für Challenge 10, alle drei Distraktoren grün). Volle Testsuite
  918 → 922, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 91,99 % / 72,81 % / 99,10 % / 91,99 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 11 (B9 fast vollständig, 7/8)

- **Umfang:** Baseline sauber (922/922, typecheck/build/knip grün, HEAD
  `350bebf`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks.
  C# hat nach Challenge 10 klaren Schwung, nächster Schritt: die drei
  verbleibenden aktionablen B9-Tags (`method-overloading` bleibt wie im
  letzten Durchgang begründet zurückgestellt).

- **Content:** Challenge 11 deckt `optional-parameters`,
  `ref-out-parameters`, `params-array` ab. Szenario: vier eigene
  Methoden — `Steigern(int zahl, int schritt = 1)` (Standardwert),
  `Verdoppeln(ref int zahl)` (ändert die Aufrufer-Variable direkt),
  `TryDurchTeilen(int zahl, int teiler, out int ergebnis)` (das
  idiomatische C#-`Try`-Muster: `bool`-Erfolgs-Rückgabewert plus
  `out`-Parameter), und `Summiere(params int[] zahlen)` (beliebig viele
  Argumente in einem Array gesammelt).

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** fehlender Standardwert bei `schritt` — `Steigern(5)`
  mit nur einem Argument hat dann keinen passenden Aufruf mehr
  (Compilerfehler `CS7036`); `Verdoppeln(wert)` ohne das
  `ref`-Schlüsselwort beim Aufruf, obwohl die Methode `ref int zahl`
  erwartet (Compilerfehler `CS1620`); `Summiere` gibt `zahlen.Length`
  statt der aufsummierten Werte zurück — verwechselt Anzahl mit Summe
  (kompiliert, falsches Ergebnis).

- **Ergebnis:** C#-Tag-Bilanz 46/86 → 49/86 (≈57 %). B9 zu 7 von 8 Tags
  abgedeckt — nur `method-overloading` bleibt offen (zurückgestellt bis
  `class-definition`/B10 verfügbar ist). Build-Größe unverändert
  (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 296 → 300 (Gate 1 +
  Gate 2 für Challenge 11, alle drei Distraktoren grün). Volle Testsuite
  922 → 926, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,02 % / 72,79 % / 99,10 % / 92,02 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 12 (B10 Teil 1, erste Klasse)

- **Umfang:** Baseline sauber (926/926, typecheck/build/knip grün, HEAD
  `a55e103`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks.
  Kein SQL/Python/UI/Editor-Code seit dem letzten Live-Bug-Hunt (2
  Durchgänge zuvor, sauber) geändert — reiner Content seither, ein
  erneuter Playwright-Durchlauf hätte keinen neuen Signal-Wert erwartet.
  C# hat nach Challenge 10/11 klaren Schwung, nächster Zweig: B10
  (Objektorientierung, 8 Tags — analog zu B2/B9 auf mehrere Challenges
  aufgeteilt).

- **Content:** Challenge 12 deckt 4 der 8 B10-Tags ab: `class-definition`,
  `fields`, `constructors`, `this-keyword`. Erste Challenge mit einer
  echten Klasse. Szenario: eine `Konto`-Klasse mit den Feldern `name`
  (`string`) und `kontostand` (`double`), einem Konstruktor, der beide
  Felder per `this.` setzt (Parameter und Feld heißen bewusst gleich, um
  die Namenskollision zu demonstrieren, die `this` auflöst), sowie zwei
  unabhängige Instanzen — nur eine davon wird verändert, um
  Instanz-Unabhängigkeit sichtbar zu machen.

- **Empirischer Fund vor dem Schreiben des Contents:** Ein erster
  Entwurf platzierte die Klassen-Definition vor den Top-Level-Statements
  (wie bei den lokalen Funktionen aus Challenge 10/11 üblich) — das
  schlägt fehl mit `CS8803: Top-level statements must precede namespace
  and type declarations`. Anders als lokale Funktionen müssen echte
  Typ-Deklarationen wie `class` **nach** allen ausführbaren Anweisungen
  der Datei stehen. Die Challenge und ihr Tutorial-Text folgen dieser
  Regel entsprechend — dokumentiert in
  `docs/csharp-concept-hierarchy.md`.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `this.` im Konstruktor vergessen (wirkungslose
  Selbstzuweisung an den Parameter, Feld bleibt bei `null`/`0`); Feld
  `kontostand` komplett vergessen zu deklarieren (Compilerfehler
  `CS1061`); `Konto ben = anna;` statt einer eigenen neuen Instanz — `ben`
  wird nur ein zweiter Name für dieselbe Instanz.

- **Ergebnis:** C#-Tag-Bilanz 49/86 → 53/86 (≈62 %). B10 zu 4 von 8 Tags
  abgedeckt. Mit einer echten Klasse jetzt verfügbar, ist auch der Weg
  für das zurückgestellte `method-overloading` (B9) frei. Build-Größe
  unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 300 → 304 (Gate 1 +
  Gate 2 für Challenge 12, alle drei Distraktoren grün). Volle Testsuite
  926 → 930, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,06 % / 72,78 % / 99,11 % / 92,06 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 13 (B10 vollständig)

- **Umfang:** Baseline sauber (930/930, typecheck/build/knip grün, HEAD
  `6cc5388`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks.
  Kein SQL/Python/UI/Editor-Code seit dem letzten Live-Bug-Hunt (3
  Durchgänge zuvor, sauber) geändert — reiner Content seither. C# hat
  nach Challenge 12 klaren Schwung, nächster Schritt: die restlichen 4
  B10-Tags, um den Zweig abzuschließen.

- **Content:** Challenge 13 deckt die restlichen 4 B10-Tags ab:
  `access-modifiers`, `properties`, `static-members`,
  `value-vs-reference-types`. Zweigeteiltes Szenario: (1) eine
  `Person`-Klasse mit einem `private` Feld hinter einer Property
  (`get`/`set`) als kontrollierter Zugriff, und einem
  `public static int anzahlPersonen`, das der Konstruktor bei jeder
  neuen Instanz erhöht — abgerufen über den Klassennamen, nicht über
  eine Instanz; (2) ein `struct Punkt` neben der `Person`-`class`, um
  Werttyp- (Kopie bei Zuweisung) und Referenztyp-Semantik (Verweis bei
  Zuweisung, wie schon `Konto ben = anna;` aus Challenge 12) direkt
  nebeneinander zu zeigen.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** direkter Zugriff auf das private Feld statt die
  Property (Compilerfehler `CS0122`); `static` bei `anzahlPersonen`
  vergessen — Zugriff über den Klassennamen wird dann abgelehnt
  (Compilerfehler `CS0120`); `Punkt` als `class` statt `struct`
  deklariert — dadurch wird die zweite Variable zu einem Verweis auf
  dieselbe Instanz statt einer Kopie, der Kernunterschied des Tags wird
  so empirisch demonstriert statt nur behauptet.

- **Ergebnis:** C#-Tag-Bilanz 53/86 → 57/86 (≈66 %). B10
  (Objektorientierung) ist damit vollständig abgedeckt — B0 bis B8
  sowie B10 komplett, B9 zu 7 von 8 (nur `method-overloading` offen,
  jetzt technisch lösbar). Nächster offener Zweig: B11 (Vererbung &
  Polymorphie) — oder zuerst `method-overloading` in B9 nachholen.
  Build-Größe unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 304 → 308 (Gate 1 +
  Gate 2 für Challenge 13, alle drei Distraktoren grün). Volle Testsuite
  930 → 934, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,09 % / 72,74 % / 99,11 % / 92,09 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 14 (B9 vollständig, B0–B10 komplett)

- **Umfang:** Baseline sauber (934/934, typecheck/build/knip grün, HEAD
  `3d90a5c`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr in diesen beiden Tracks.
  Seit dem letzten Live-Bug-Hunt (4 Durchgänge zuvor, sauber) nur reiner
  Content geändert, kein SQL/Python/UI/Editor-Code — ein erneuter
  Playwright-Durchlauf hätte keinen neuen Signal-Wert erwartet. C# hat
  klaren Schwung, nächster Schritt: den zurückgestellten letzten
  B9-Tag `method-overloading` einlösen, jetzt wo Challenge 12 eine echte
  Klasse als Container verfügbar gemacht hat.

- **Content:** Challenge 14 deckt `method-overloading` ab — eine
  `Rechner`-Klasse mit drei überladenen `static`-Methoden namens
  `Addiere`: zwei `int`-Parameter, drei `int`-Parameter, und zwei
  `double`-Parameter. Der Compiler wählt beim Aufruf automatisch die
  passende Überladung anhand von Argumentanzahl und -typ.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** die dreistellige Überladung vergessen (Compilerfehler
  `CS1501`, keine Überladung nimmt 3 Argumente); die zweistellige
  `int`-Überladung vergessen — der Aufruf griffe dann nur noch über eine
  implizite `int`-zu-`double`-Umwandlung auf die `double`-Überladung zu,
  deren Rückgabewert sich ohne Cast nicht in eine `int`-Variable
  speichern lässt (Compilerfehler `CS0266`); `+ c` im Rumpf der
  dreistelligen Überladung vergessen (kompiliert, liefert aber `7`
  statt `12`).

- **Ergebnis:** C#-Tag-Bilanz 57/86 → 58/86 (≈67 %). B9 (Methoden) ist
  damit ebenfalls vollständig abgedeckt — **B0 bis B10 sind jetzt
  komplett**, deutlich über die Hälfte aller 86 Tags. Nächster offener
  Zweig: B11 (Vererbung & Polymorphie). Build-Größe unverändert
  (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 308 → 312 (Gate 1 +
  Gate 2 für Challenge 14, alle drei Distraktoren grün). Volle Testsuite
  934 → 938, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,13 % / 72,74 % / 99,11 % / 92,13 %.

### 2026-08-10 — Stündliche Routine: Live-Bug-Hunt (sauber) + C# Challenge 15 (B11 Teil 1)

- **Umfang:** Baseline sauber (938/938, typecheck/build/knip grün, HEAD
  `d6850cb`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. Nach fünf reinen
  Content-Durchgängen in Folge (Challenge 10-14) zuerst wieder Priorität
  2: ein Live-Playwright-Durchlauf gegen den echten Dev-Server, da seit
  dem letzten sauberen Durchlauf mehrere Firings vergangen sind.

- **Live-Bug-Hunt-Ergebnis:** Dev-Server per Playwright gefahren (CDN-
  Workaround aus dem Runbook: `context.route()` liefert lokal
  installiertes `sql.js`/`pyodide` aus). Stichprobe von 13 SQL- und 12
  Python-Challenges (jede 6.): Tutorial-Text vorhanden, Lösung über
  "In den Editor übernehmen" eingefügt, ausgeführt, `✓ Aufgabe erfüllt`
  bestätigt — 25/25 bestanden. Mobile-Viewport (375×667) ohne
  horizontalen Overflow. 0 Konsolenfehler (nach Ausschluss des bekannten
  `ERR_CERT_AUTHORITY_INVALID`-Sandbox-Artefakts vom Hint-Chat-Fetch).
  Ein erster Skript-Entwurf meldete fälschlich "Tutorial fehlt" für alle
  Challenges — eigener Selektor-Bug im Testskript (`.tutorial-section`
  statt des tatsächlichen `.tutorial-text`), kein Anwendungsfehler;
  nach der Korrektur lief die Stichprobe sauber durch. Keine neuen
  Funde.

- **Content:** Challenge 15 deckt 4 der 7 Tags aus B11 (Vererbung &
  Polymorphie) ab: `inheritance`, `method-overriding`, `base-keyword`,
  `abstract-classes`. Szenario: eine `abstract class Tier` mit einer
  `abstract`-Methode `GeraeuschMachen()` (muss überschrieben werden) und
  einer `virtual`-Methode `Beschreibung()` (Standardimplementierung,
  Überschreiben optional) — zwei abgeleitete Klassen `Hund : Tier` und
  `Katze : Tier`, beide rufen `base(name)` im Konstruktor auf, nur
  `Katze` überschreibt zusätzlich `Beschreibung()`.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `: base(name)` weggelassen (Compilerfehler `CS7036`);
  `override` bei der abstrakten Methode vergessen (Compilerfehler
  `CS0534`); `override` bei der virtuellen Methode `Beschreibung()` in
  `Katze` vergessen — anders als beim abstrakten Fall erzwingt der
  Compiler das bei `virtual` nicht, der Aufruf läuft dann
  stillschweigend mit der geerbten Standardversion (kompiliert, falsches
  Ergebnis). Der dritte Distraktor demonstriert den Kernunterschied
  zwischen `abstract` (compile-time erzwungen) und `virtual` (optional,
  silent fallback) empirisch.

- **Ergebnis:** C#-Tag-Bilanz 58/86 → 62/86 (≈72 %). B11 zu 4 von 7 Tags
  abgedeckt (`interfaces`, `polymorphism-via-interface`,
  `sealed-classes` offen). B0 bis B10 weiterhin vollständig. Build-Größe
  unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 312 → 316 (Gate 1 +
  Gate 2 für Challenge 15, alle drei Distraktoren grün). Volle Testsuite
  938 → 942, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,16 % / 72,69 % / 99,11 % / 92,16 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 16 (B11 vollständig)

- **Umfang:** Baseline sauber (942/942, typecheck/build/knip grün, HEAD
  `411a911`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 15
  klaren Schwung, nächster Schritt: die restlichen 3 B11-Tags, um den
  Zweig abzuschließen.

- **Content:** Challenge 16 deckt `interfaces`,
  `polymorphism-via-interface`, `sealed-classes` ab. Szenario: ein
  `interface IBeschreibbar` mit einer Methoden-Signatur (kein Rumpf),
  zwei implementierende Klassen `Buch` und `sealed class DVD`, und ein
  `IBeschreibbar[]`-Array mit je einer Instanz beider Klassen — eine
  `foreach`-Schleife ruft `Beschreiben()` über den Interface-Typ auf,
  die konkrete Implementierung wird erst zur Laufzeit bestimmt
  (Polymorphie über Interfaces statt über eine gemeinsame Basisklasse).

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `Buch` implementiert `Beschreiben()` nicht
  (Compilerfehler `CS0535`); ein Versuch `class BluRay : DVD` von der
  als `sealed` markierten `DVD` zu erben (Compilerfehler `CS0509`, genau
  der Zweck von `sealed`); die beiden Array-Zuweisungen vertauscht
  (kompiliert, aber falsche Ausgabereihenfolge).

- **Ergebnis:** C#-Tag-Bilanz 62/86 → 65/86 (≈76 %). B11 (Vererbung &
  Polymorphie) ist damit vollständig abgedeckt — **B0 bis B11 sind
  jetzt komplett**, gut drei Viertel aller 86 Tags. Nächster offener
  Zweig: B12 (Generics). Build-Größe unverändert (632,33 kB) — Track
  bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 316 → 320 (Gate 1 +
  Gate 2 für Challenge 16, alle drei Distraktoren grün). Volle Testsuite
  942 → 946, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,19 % / 72,65 % / 99,11 % / 92,19 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 17 (B12 vollständig, B0–B12 komplett)

- **Umfang:** Baseline sauber (946/946, typecheck/build/knip grün, HEAD
  `f23dfdd`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 16
  klaren Schwung, nächster Zweig: B12 (Generics, klein genug für einen
  einzigen Durchgang, alle 3 Tags).

- **Content:** Challenge 17 deckt alle 3 Tags aus B12 in einem
  Durchgang ab: `generic-type-definition`, `generic-method-definition`,
  `generic-constraints`. Szenario: eine generische Klasse `Box<T>` mit
  Feld `Inhalt`, verwendet mit zwei unterschiedlichen konkreten Typen
  (`Box<string>` und `Box<int>`) — genau das macht den generischen Typ
  gegenüber einer festen Klasse überhaupt erst notwendig; und eine
  generische Methode `T Groesser<T>(T a, T b) where T :
  IComparable<T>`, die per `CompareTo` den größeren Wert liefert,
  aufrufbar sowohl mit `int`- als auch mit `string`-Argumenten ohne
  explizite Typangabe (Typ-Inferenz).

- **Design-Korrektur vor dem Schreiben des Contents:** Ein erster
  Entwurf des "Box nicht generisch"-Distraktors kompilierte fälschlich
  unverändert durch, weil das Szenario `Box` nur mit einem einzigen Typ
  (`string`) verwendete — eine fest auf `string` zugeschnittene Klasse
  wäre für diese Aufgabe genauso gültig gewesen. Behoben durch eine
  zweite `Box<int>`-Instanziierung im Szenario, die Genericität dadurch
  tatsächlich notwendig macht statt nur zu behaupten — vor dem
  eigentlichen Content-Schreiben empirisch gegen den echten
  `dotnet`-Treiber verifiziert.

- **Drei Distraktoren, alle empirisch verifiziert:** `where T :
  IComparable<T>` weggelassen — ein uneingeschränktes `T` kennt keine
  `CompareTo`-Methode (Compilerfehler); `Box` nicht generisch, sondern
  fest auf `string` zugeschnitten — `Box<int> zahlBox = ...` lässt sich
  dann nicht mehr kompilieren (Compilerfehler `CS0308`); `Groesser`
  nicht generisch, sondern fest auf `int` zugeschnitten — der Aufruf
  mit zwei `string`-Argumenten passt zu keiner Methode mehr
  (Compilerfehler `CS1503`).

- **Ergebnis:** C#-Tag-Bilanz 65/86 → 68/86 (≈79 %). B12 (Generics) ist
  damit vollständig abgedeckt — **B0 bis B12 sind jetzt komplett**.
  Nächster offener Zweig: B13 (Fehlerbehandlung). Build-Größe
  unverändert (632,33 kB) — Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 320 → 324 (Gate 1 +
  Gate 2 für Challenge 17, alle drei Distraktoren grün). Volle Testsuite
  946 → 950, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,17 % / 72,64 % / 99,12 % / 92,17 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 18 (B13 Teil 1)

- **Umfang:** Baseline sauber (950/950, typecheck/build/knip grün, HEAD
  `2cf0edd`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 17
  klaren Schwung, nächster Zweig: B13 (Fehlerbehandlung, 6 Tags — auf
  zwei Challenges aufgeteilt wie schon B9/B10/B11).

- **Content:** Challenge 18 deckt 4 der 6 B13-Tags ab:
  `runtime-exceptions-concept`, `try-catch`, `specific-exception-types`,
  `finally-block`. Szenario, zweigeteilt: ein Array-Zugriff außerhalb
  der Grenzen in einem `try`/`catch (IndexOutOfRangeException)`/
  `finally`-Block — der `finally`-Block hängt unabhängig vom Ausgang
  einen Status-Suffix an; und eine Ganzzahl-Division durch 0 in einem
  separaten `try`/`catch (DivideByZeroException)`-Block, ohne
  `finally`. Beide Blöcke fangen ihren jeweiligen Exception-Typ gezielt.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `finally`-Block komplett weggelassen (kompiliert, aber
  der Status-Suffix fehlt); `catch (FormatException)` statt
  `catch (IndexOutOfRangeException)` — der falsche Exception-Typ passt
  nicht, die tatsächlich geworfene Ausnahme bleibt ungefangen und das
  Programm stürzt komplett ab (bestätigt: echte
  `TargetInvocationException` mit `IndexOutOfRangeException` als
  innerer Ausnahme); `b / a` statt `a / b` bei der Division — `0 / 10`
  wirft keine Exception, `divisionStatus` bleibt fälschlich `"Erfolg"`.

- **Ergebnis:** C#-Tag-Bilanz 68/86 → 72/86 (≈84 %). B13 zu 4 von 6
  Tags abgedeckt (`throw-statement`, `custom-exceptions` offen). B0 bis
  B12 weiterhin vollständig. Build-Größe unverändert (632,33 kB) —
  Track bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 324 → 328 (Gate 1 +
  Gate 2 für Challenge 18, alle drei Distraktoren grün). Volle Testsuite
  950 → 954, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,21 % / 72,62 % / 99,12 % / 92,21 %.

### 2026-08-10 — Stündliche Routine: C# Challenge 19 (B13 vollständig, B0–B13 komplett)

- **Umfang:** Baseline sauber (954/954, typecheck/build/knip grün, HEAD
  `ae03e65`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C# hat nach Challenge 18
  klaren Schwung, nächster Schritt: die restlichen 2 B13-Tags, um den
  Zweig abzuschließen.

- **Content:** Challenge 19 deckt `throw-statement` und
  `custom-exceptions` ab. Szenario: eine eigene Exception-Klasse
  `UngueltigesAlterException : Exception` mit Konstruktor, der die
  Nachricht per `: base(nachricht)` weiterreicht — dieselbe
  Vererbungssyntax und dasselbe `base(...)`-Muster wie schon bei
  gewöhnlichen Klassen aus B11. Eine Methode `PruefeAlter(int alter)`
  löst sie bei einem negativen Alter per `throw new
  UngueltigesAlterException(...)` aus; zwei Aufrufe (einer gültig,
  einer ungültig) zeigen sowohl den Erfolgs- als auch den Fehlerpfad.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `throw` vor `new UngueltigesAlterException(...)`
  vergessen — es wird nur ein Exception-Objekt erzeugt, aber nie
  tatsächlich ausgelöst (kompiliert, falsches Ergebnis); `: base(nachricht)`
  im Konstruktor vergessen — `e.Message` liefert den generischen
  Standardtext statt der eigenen Nachricht (kompiliert, falsches
  Ergebnis); `: Exception` bei der Klassendefinition weggelassen — eine
  Klasse, die nicht von `Exception` erbt, lässt sich weder werfen noch
  fangen (Compilerfehler `CS0155`).

- **Ergebnis:** C#-Tag-Bilanz 72/86 → 74/86 (≈86 %). B13
  (Fehlerbehandlung) ist damit vollständig abgedeckt — **B0 bis B13
  sind jetzt komplett**. Nächster offener Zweig: B14 (Delegates &
  Lambda-Ausdrücke). Build-Größe unverändert (632,33 kB) — Track
  bleibt unregistriert.

- **Tests:** `test/content/challengeRunner.test.ts` 328 → 332 (Gate 1 +
  Gate 2 für Challenge 19, alle drei Distraktoren grün). Volle Testsuite
  954 → 958, alle grün. `typecheck`, `npm run build` grün. `knip`:
  unverändert 10 Funde. Coverage: 92,24 % / 72,60 % / 99,12 % / 92,24 %.

### 2026-08-10 — Stündliche Routine: C#-Engine-Integration — LanguagePlugin für den Editor

- **Umfang:** Baseline sauber (958/958, typecheck/build/knip grün, HEAD
  `b2dee97`). SQL/Python bleiben bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C#-Content ist bei
  B0–B13 komplett (74/86); der nächste offene Zweig B14 wäre der übliche
  nächste Content-Schritt, aber laut Mandat ist C#-Engine-Integration
  jetzt explizit in Scope und hat hier klaren Schwung: `docs/
  csharp-engine-poc.md` listet für die Live-Wiring vier offene Lücken
  (Registry-Eintrag, `ctx.engines`/`AppContext`-Fall, Editor-
  `LanguagePlugin`, Blazor-Serving in Dev/Prod). Die `LanguagePlugin`-Lücke
  ist die einzige davon, die sich isoliert, ohne die anderen drei
  anzufassen, bauen und testen lässt — genau ein begrenztes Increment.

- **Implementiert:** `src/editor/languages/csharp/` — `keywords.ts`
  (Keyword-/Typ-/Sonstige-Mengen), `tokenizer.ts` (`//`- und `/* */`-
  Kommentare, `"..."`/`$"..."`/`@"..."`-Strings inkl. Verbatim-`""`-
  Escape, `'x'`-Char-Literale, Zahlen mit Suffix wie `10.5f`/`42L`),
  `highlight.ts`, `autoIndent.ts` (kopiert Einrückung, +1 Tab nach Zeilen,
  die mit `{` enden — brace-basiertes Pendant zu Pythons Doppelpunkt-Regel),
  `autoClosePairs.ts` (wiederverwendet aus dem SQL-Modul, sprachagnostisch),
  `uppercaseKeyword.ts` (No-Op, wie schon bei Python), zusammengeführt in
  `csharpLanguagePlugin.ts` (`id: 'csharp'`, implementiert das bestehende
  `LanguagePlugin`-Interface unverändert). 28 neue Unit-Tests in
  `csharpLanguagePlugin.test.ts`, gleicher Stil wie
  `pythonLanguagePlugin.test.ts`.

- **Ein echter Bug, beim Testen gegen echte C#-Syntax gefunden (nicht nur
  angenommen):** SQL/Python klassifizieren jedes Wort direkt vor `(` immer
  als Funktionsaufruf, geprüft *vor* jeder Keyword-Zugehörigkeit — richtig
  für SQL, wo z. B. `DATE` sowohl Datentyp als auch Funktion sein kann.
  Direkt auf C# übertragen hätte das `if (`, `while (`, `catch (` — also
  praktisch jede reale C#-Kontrollfluss-Syntax — fälschlich als
  Funktionsaufruf eingefärbt, weil diese Keywords fast immer direkt von
  `(` gefolgt werden. Fix: für C# werden Keyword-/Typ-Mengen zuerst
  geprüft, die Klammer-Heuristik greift nur noch für echte, nicht
  reservierte Bezeichner — in C# ist das sogar korrekter als das
  SQL/Python-Vorbild, weil jedes C#-Keyword und jeder eingebaute Typ ein
  echtes reserviertes Wort ist (anders als in SQL), es also gar keine
  echte Mehrdeutigkeit mehr gibt, die die Klammer-Regel auflösen müsste.

- **Bewusst nicht getan:** Keine Anbindung an `domEditor.ts`/`editorTab.ts`,
  kein Registry-Eintrag, kein `AppContext`-Fall, kein Blazor-Serving —
  C# bleibt weiterhin nicht auswählbar in der Live-App. Das Plugin ist
  eigenständig gebaut und getestet, genau wie es `docs/csharp-engine-poc.md`
  für diese Lücke vorsieht (fertig, sobald die übrigen drei Lücken
  geschlossen sind).

- **Tests:** Volle Testsuite 958 → 986 (28 neue Tests), alle grün.
  `typecheck`, `npm run build` grün (632,33 kB, unverändert — reiner
  Editor-Code, keine neue Route). `knip`: unverändert 10 Funde (das neue
  Modul wird von seiner eigenen Testdatei referenziert, keine toten
  Dateien). Coverage: 92,30 % / 73,11 % / 99,13 % / 92,30 %.

### 2026-08-10 — Stündliche Routine: C#-Engine-Integration — AppContext/EngineFactory-Wiring

- **Umfang:** Baseline sauber (986/986, typecheck/build/knip grün, HEAD
  `cfbc50c`). SQL/Python weiterhin bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag mehr. C#-Engine-Integration hat
  nach dem letzten Durchgang (Editor-`LanguagePlugin`) klaren Schwung:
  von den vier Wiring-Lücken aus `docs/csharp-engine-poc.md` ist die
  `ctx.engines`/`AppContext`-Lücke die nächste, die sich isoliert bauen
  und testen lässt, ohne die übrigen (Registry-Eintrag, Blazor-Serving)
  anzufassen.

- **Implementiert:** `EngineFactory` (`src/ui/context.ts`) bekommt
  `getMainCSharp()`/`ensureCSharpEngine(loadEngine)` — exaktes Pendant zu
  `getMainPython()`/`ensurePythonEngine(loadPyodide)`: lädt einmalig,
  cached danach, ein einziger geteilter Engine (keine separate
  Disposable-Variante, da jeder `exec()`-Aufruf wie bei Python zustandslos
  ist). `ensureCSharpEngine` nimmt bewusst eine parameterlose
  `loadEngine`-Closure statt direkt eine `baseUrl`, damit die Factory
  weiterhin unabhängig davon bleibt, woher das Blazor-Bundle kommt (diese
  Entscheidung ist weiterhin offen) — ein echter Aufrufer würde später
  `() => loadCSharpEngineFromServer(baseUrl)` übergeben. 6 neue Tests in
  `context.test.ts`, gleiche Struktur wie die bestehenden Python-Tests
  (Laden+Caching, `exec()`-Delegation, Retry nach fehlgeschlagenem Laden).

- **Mechanischer Nebenaufwand:** 16 Testdateien bauen sich jeweils eine
  eigene Fake-`EngineFactory` für andere UI-Tests — alle mussten um einen
  ablehnenden `ensureCSharpEngine`-Stub ergänzt werden, um das jetzt
  größere Interface zu erfüllen (gleiches Muster wie ihr bestehender
  `ensurePythonEngine`-Stub). Reine Mechanik, keine Verhaltensänderung an
  diesen Tests.

- **Bewusst nicht getan:** Keine Aufrufstelle ruft `ensureCSharpEngine`
  tatsächlich auf (anders als Pythons `ensurePythonEngineLoaded` in
  `src/ui/state/actions.ts`, ausgelöst beim Öffnen einer Python-Challenge)
  — es gibt keine C#-Challenge in der Registry, die das auslösen könnte.
  Eine echte Aufrufstelle jetzt zu bauen wäre toter Code ohne Trigger.
  Verbleibende Lücken: der Registry-Eintrag selbst, und die Serving-
  Entscheidung für das Blazor-Bundle in Dev/Prod (Letztere muss zuerst
  stehen, bevor eine echte Aufrufstelle eine funktionierende `baseUrl`
  übergeben kann).

- **Tests:** Volle Testsuite 986 → 990 (6 neue Tests, abzüglich der
  entfernten Redundanz keine — reine Addition). `typecheck`, `npm run
  build` grün (632,59 kB, geringfügig gewachsen, da `csharpEngine.ts`
  jetzt auch vom Produktions-Bundle importiert wird, nicht nur von
  Tests). `knip`: unverändert 10 Funde. Coverage: 92,31 % / 73,15 % /
  99,14 % / 92,31 %.

### 2026-08-10 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `826b5e1`). SQL/Python weiterhin bei 81/82 (nur permanente Ausnahmen
  offen) — kein aktionabler Content-Tag. Nach zwei reinen
  C#-Engine-Durchgängen in Folge (Editor-`LanguagePlugin`,
  `AppContext`-Wiring) zuerst wieder Priorität 2: ein Live-Playwright-
  Durchlauf gegen den echten Dev-Server, da seit dem letzten sauberen
  Durchlauf mehrere Firings vergangen sind.

- **Live-Bug-Hunt-Ergebnis:** Dev-Server per Playwright gefahren (CDN-
  Workaround aus dem Runbook: `context.route()` liefert lokal
  installiertes `sql.js`/`pyodide` aus). Stichprobe von 13 SQL- und 12
  Python-Challenges (jede 6.): Tutorial-Text vorhanden, Lösung über
  "In den Editor übernehmen" eingefügt, ausgeführt, `✓ Aufgabe erfüllt`
  bestätigt — 25/25 bestanden. Zusätzlich zwei echte Distraktoren aus
  dem Content (SQL 16: verschachteltes `BEGIN` während laufender
  Transaktion; Python 11: `len(wort)` statt Treffer-Zählung) manuell im
  Editor eingefügt und ausgeführt — beide korrekt abgelehnt, keine
  Diskrepanz zur `challengeRunner.test.ts`-Vorhersage. Mobile-Viewport
  (375×667) ohne horizontalen Overflow. 0 Konsolenfehler. Keine neuen
  Funde.

- **C#-Engine-Integration:** Kein bounded nächster Schritt für diesen
  Durchgang identifiziert. Von den verbleibenden zwei Wiring-Lücken
  (Registry-Eintrag, Blazor-Serving in Dev/Prod) hängt der
  Registry-Eintrag am Serving — ohne funktionierende `baseUrl` wäre eine
  Registrierung nur eine tote Auswahl ohne lauffähigen Engine dahinter.
  Die Serving-Entscheidung selbst (Vite-Dev-Server-Middleware mit
  COOP/COEP-Headern + Produktions-Integration ins `deploy-pages.yml` samt
  `coi-serviceworker`) ist eine deutlich größere, mehrteilige
  Änderung als die letzten beiden Increments — bewusst nicht in diesem
  Durchgang neben dem Bug-Hunt begonnen, um kein halbfertiges Ergebnis zu
  riskieren. Nächster C#-Schritt für einen künftigen, dafür reservierten
  Durchgang.

- **Ergebnis:** Keine Code-/Content-Änderung in diesem Durchgang — Tests,
  Coverage und Build-Größe unverändert gegenüber dem letzten Snapshot
  (990/990, 92,31 % / 73,15 % / 99,14 % / 92,31 %, 632,59 kB). Kein neuer
  Commit, keine Artifact-Republikation nötig (keine Zahl hat sich
  bewegt).

### 2026-08-10 — Stündliche Routine: C#-Hosting-Plan überarbeitet (Analyse, kein Code)

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `fbee26f`). SQL/Python weiterhin an der permanenten Scope-Grenze. Statt
  den letzten Durchgang zu wiederholen (Live-Bug-Hunt, gerade erst
  sauber durchgelaufen — das wäre reine Wiederholung ohne neuen Wert),
  diesmal der als nächstes anstehende C#-Schritt: die noch offene
  Blazor-Serving-Entscheidung aus `docs/csharp-engine-poc.md` genauer
  geprüft, bevor sie implementiert wird.

- **Fund:** Der bisherige Hosting-Plan ("`coi-serviceworker`, beschränkt
  auf die eigene Route des C#-Motors") geht von einer eigenen Seite/Route
  für den C#-Motor aus — die es in dieser Single-Page-App gar nicht gibt.
  `vite-plugin-singlefile` fasst SQL/Python/(künftig C#) in eine einzige
  `index.html` zusammen, und `loadCSharpEngineFromServer` (bestätigt im
  aktuellen Code, nicht nur im Plan) injiziert Blazors `<script>`-Tag
  direkt in genau dieses eine Dokument. COOP/COEP gelten pro Dokument —
  "nur für den C#-Teil" gibt es nicht. Sie fürs ganze Dokument zu setzen
  würde SQL/Pythons CDN-Ladevorgänge (Produktion) und die lokal per
  `context.route()` ausgelieferten Kopien (jeder Playwright-Bug-Hunt)
  ohne `Cross-Origin-Resource-Policy`-Header verstummen lassen — eine
  echte Regressionsgefahr, die das Mandat ("nie einen kaputten
  Zwischenzustand hinterlassen") explizit vermeiden soll.

- **Vorgeschlagene Korrektur (noch nicht implementiert, noch nicht live
  verifiziert):** den Blazor-Motor in einem eigenen, same-origin
  `<iframe>` hosten statt im Hauptdokument — ein Kind-Frame kann eigene
  COOP/COEP-Header tragen und unabhängig vom Elternfenster cross-origin-
  isoliert werden (dasselbe Muster wie z. B. StackBlitz WebContainers).
  `CSharpRuntime`/`CSharpExecResult` (Schritt 4, bereits entschieden)
  müssten sich dabei nicht ändern, nur der Transport darunter
  (`postMessage` statt direktem `Blazor.start()`-Aufruf im Hauptdokument).
  Braucht vor der Umsetzung noch eine echte Playwright-Prüfung, ob ein
  same-origin-iframe mit eigenen COOP/COEP-Headern tatsächlich
  `crossOriginIsolated === true` erreicht, unabhängig vom Elternfenster.

- **Ergebnis:** Reine Analyse/Dokumentations-Änderung
  (`docs/csharp-engine-poc.md`), kein Code geändert. Tests/Coverage/
  Build-Größe unverändert (990/990, 92,31 % / 73,15 % / 99,14 % /
  92,31 %, 632,59 kB) — keine Artifact-Republikation nötig.

### 2026-08-10 — Stündliche Routine: C#-Hosting-Plan empirisch verifiziert — iframe-Idee widerlegt, `credentialless` als echte Lösung gefunden

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `af872cc`). SQL/Python weiterhin an der permanenten Scope-Grenze, ein
  erneuter Live-Bug-Hunt wäre reine Wiederholung des letzten sauberen
  Durchlaufs. Der letzte Durchgang hatte einen konkreten nächsten
  Schritt hinterlassen: die im selben Durchgang vorgeschlagene
  iframe-Isolation-Idee brauchte "eine echte Playwright-Prüfung ... bevor
  sie als endgültiges Design gilt" — genau diese Prüfung diesen
  Durchgang durchgeführt.

- **Ergebnis der Prüfung:** Ein minimaler, wegwerfbarer Node+Playwright-
  Aufbau (zwei lokale HTTP-Origins auf verschiedenen Ports, da echte
  CDN-Domains in dieser Sandbox blockiert sind) hat die iframe-Idee
  **empirisch widerlegt**: ein same-origin-Kind-iframe mit eigenen
  `COOP: same-origin`/`COEP: require-corp`-Headern erreicht
  `crossOriginIsolated=false`, wenn das Elterndokument selbst keine
  dieser Header sendet — Isolation ist eine Eigenschaft des
  Top-Level-Dokuments, kein Kind-Frame kann sie sich allein verschaffen
  (eine Positivkontrolle mit Headern auf beiden Ebenen bestätigte
  `true`/`true`, der Testaufbau selbst war also korrekt).

- **Die tatsächliche Lösung, live verifiziert:** `Cross-Origin-Embedder-
  Policy: credentialless` statt `require-corp` aufs gesamte Hauptdokument
  angewendet (`COOP: same-origin` bleibt gleich) — `credentialless`
  verlangt **keinen** `Cross-Origin-Resource-Policy`-Header von
  Cross-Origin-Subressourcen, sondern entfernt nur Credentials
  (Cookies/HTTP-Auth) aus diesen Anfragen, was für öffentliche,
  unauthentifizierte CDN-Skripte irrelevant ist. Live bestätigt: eine
  Seite mit `credentialless` erreicht `crossOriginIsolated=true` und
  `SharedArrayBuffer` ist verfügbar, während ein Cross-Origin-`<script>`
  ganz ohne CORP-Header (bewusst als unkonfigurierter echter CDN
  nachgebildet) weiterhin fehlerfrei lädt und ausführt — SQL/Pythons
  CDN-Ladevorgänge und die per `context.route()` servierten lokalen
  Kopien in jedem Bug-Hunt brauchen dadurch keine Änderung.
  `claudeChatClient.ts`s Cross-Origin-`fetch()` zu `api.anthropic.com`
  ist ebenfalls unbetroffen (kein `credentials`-Flag, keine Cookies).

- **Konsequenz für den Plan:** Der ursprüngliche Plan vom 2026-08-08
  ("`coi-serviceworker`, aufs ganze Dokument angewendet") war näher am
  Richtigen als die iframe-Idee vom selben Tag — die einzige nötige
  Korrektur ist `credentialless` statt `require-corp`. Keine
  iframe-/postMessage-Umstellung von `csharpEngine.ts` nötig. Noch offen:
  ein Live-Check, ob Blazors Multithreaded-WASM-Boot (`WasmEnableThreads`)
  auch unter `credentialless` funktioniert (bisher nur an einer reinen
  HTML-Seite verifiziert, nicht am echten Blazor-Bundle) — das plus die
  eigentliche Dev-Server-Middleware ist der nächste konkrete C#-Schritt.

- **Ergebnis:** Reine Analyse/Dokumentations-Änderung
  (`docs/csharp-engine-poc.md`, iframe-Vorschlag korrigiert), kein
  Code im Repo geändert (der Testaufbau lief komplett im Scratchpad).
  Tests/Coverage/Build-Größe unverändert (990/990, 92,31 % / 73,15 % /
  99,14 % / 92,31 %, 632,59 kB) — keine Artifact-Republikation nötig.

### 2026-08-10 — Stündliche Routine: C#-Hosting-Frage endgültig geschlossen — echter Build-Bug gefunden + `credentialless` gegen den echten Blazor-Bundle verifiziert

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `789000f`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang hatte einen klaren nächsten Schritt hinterlassen: die
  `credentialless`-Erkenntnis war bis dahin nur an einer schlichten
  HTML-Seite verifiziert, nicht am echten Blazor-Multithreaded-WASM-Bundle
  — genau diese Lücke diesen Durchgang geschlossen.

- **Echter Build-Bug gefunden, bevor überhaupt getestet werden konnte:**
  ein frischer `dotnet publish -c Release` schlug mit `CS8802` fehl (nur
  eine Kompilationseinheit darf Top-Level-Statements haben) — das
  SDK-Standard-Glob `**/*.cs` erfasste rekursiv auch
  `csharp-engine/driver/Program.cs` (das separate Konsolenprojekt aus
  einer späteren Session), das mit dem eigenen `Program.cs` kollidierte.
  Unentdeckt, weil seit dem Hinzufügen von `driver/` niemand mehr einen
  frischen Publish auf das Blazor-Projekt losgelassen hatte. Behoben mit
  `<Compile Remove="driver/**/*.cs" />` in `CSharpEngineBlazor.csproj` —
  separat committet (`b4d00ec`), gegen einen sauberen Publish und die
  volle npm-Testsuite verifiziert (990/990, betrifft nichts unter `src/`).

- **`credentialless` gegen den echten Bundle verifiziert:** den frischen
  Publish-Output (`csharp-engine/bin/Release/net8.0/publish/wwwroot`) über
  einen minimalen Node-Server mit `COOP: same-origin` +
  `COEP: credentialless` ausgeliefert, in echtem Headless-Chromium via
  Playwright geladen. `crossOriginIsolated` sofort `true`. Das im Repo
  bereits vorhandene `index.html` bootet Blazor selbst und ruft
  automatisch `CSharpEngine.RunCode('int x = 2 + 2; ...')` auf — Ergebnis:
  `CSHARP_RESULT:{"stdout":"x = 4\n","error":null}`, ein echter
  Roslyn-Compile und eine echte WASM-Ausführung, beide erfolgreich unter
  `credentialless`. Ein Folgeaufruf mit absichtlich ungültigem Code lieferte
  korrekt einen echten Compilerfehler (`CS0029`). Ein erster Testlauf, der
  zusätzlich manuell ein zweites `Blazor.start()` auslöste (überflüssig,
  die Seite bootet sich selbst), erzeugte einen harmlosen
  "Root component already attached"-Kollisionsfehler und einen
  scheinbaren mehrminütigen Hänger — ein Bug im Wegwerf-Testskript, nicht
  in der Engine oder in `credentialless` selbst.

- **Konsequenz:** Die Hosting-Frage aus `docs/csharp-engine-poc.md` ist
  damit nicht nur analytisch, sondern end-to-end gegen den echten
  Multithreaded-WASM-Bundle verifiziert — keine offene Design-Frage
  blockiert mehr die eigentliche Umsetzung (Vite-Dev-Server-Middleware +
  `coi-serviceworker` für GitHub Pages), der nächste konkrete C#-Schritt
  für einen künftigen Durchgang.

- **Ergebnis:** Ein committeter Code-Fix (`csharp-engine/
  CSharpEngineBlazor.csproj`, `b4d00ec`) außerhalb von `src/` — npm-Tests/
  Coverage/Build-Größe dadurch unverändert (990/990, 92,31 % / 73,15 % /
  99,14 % / 92,31 %, 632,59 kB). Der restliche Verifikationsaufbau lief
  komplett im Scratchpad. Keine Artifact-Republikation nötig (keine der
  dort dargestellten Zahlen hat sich bewegt).

### 2026-08-10 — Stündliche Routine: C#-Dev-Server-Middleware gebaut und live verifiziert

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `04a95da`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang hatte die Hosting-Frage vollständig geschlossen und
  als nächsten Schritt "die eigentliche Dev-Server-Middleware bauen"
  hinterlassen — kein offener Design-Punkt mehr im Weg, klarer
  nächster Schritt.

- **Implementiert:** `vite.config.ts` bekommt ein
  `csharpEngineDevServer()`-Plugin (`apply: 'serve'`, Produktions-Build
  komplett unberührt) — setzt `COOP: same-origin` +
  `COEP: credentialless` auf jede Dev-Server-Antwort und liefert
  `csharp-engine/bin/Release/net8.0/publish/wwwroot` (gitignored, lokal
  per `dotnet publish -c Release` gebaut) unter `/csharp-engine/` aus.
  Fehlt der Publish-Output (frischer Checkout ohne .NET SDK), loggt das
  Plugin einen einzeiligen Hinweis und liefert `/csharp-engine/` einfach
  nicht aus — `npm run dev` funktioniert für SQL/Python trotzdem normal.

- **Live gegen den echten Dev-Server verifiziert** (Playwright, üblicher
  `context.route()`-CDN-Workaround für sql.js/Pyodide): Haupt-App
  `crossOriginIsolated=true`, 10/10 SQL- und 9/9 Python-Stichproben
  weiterhin bestanden, 0 Konsolenfehler — die `credentialless`-Erkenntnis
  hält auch gegen die echte App, nicht nur den synthetischen Testaufbau.
  `/csharp-engine/` selbst ebenfalls `crossOriginIsolated=true`, die im
  Repo bereits vorhandene Smoke-Test-Seite kompilierte und lief
  erfolgreich (`CSHARP_RESULT:{"stdout":"x = 4\n","error":null}`) — durch
  die echte Vite-Middleware, nicht mehr nur einen Scratchpad-Server.

- **Ein weiterer echter Bug gefunden und behoben:** erster Versuch
  scheiterte mit `Blazor is not defined` (404). Ursache: das
  eingecheckte `index.html` hat `<base href="/" />` fest codiert (für
  den Fall, dass dieses Projekt an seiner eigenen Origin-Wurzel gehostet
  wird) — unter `/csharp-engine/` verschachtelt löst das den relativen
  `<script src="_framework/blazor.webassembly.js">` gegen die Site-Wurzel
  auf statt gegen den Mount-Pfad. Wichtiger noch: `Program.cs` setzt
  `CSharpEngine.BaseAddress` aus genau demselben `<base href>` — ein
  falscher Wert hätte auch die Ref-Assembly-Fetches 404en lassen, nicht
  nur den Skript-Load. Behoben, indem die Middleware `<base href="/" />`
  gezielt zu `<base href="/csharp-engine/" />` umschreibt, nur für diese
  eine HTML-Datei.

- **Für den nächsten Wiring-Schritt vermerkt:** Blazors eigene
  Boot-Sequenz löst ihre Basisadresse immer aus `document.baseURI` des
  hostenden Dokuments auf — wird die Engine später direkt ins Dokument
  der Haupt-App injiziert (statt in ein eigenes `/csharp-engine/`-Dokument
  wie beim heutigen Test), bräuchte sie denselben Fix erneut. Eine
  Iframe-Einbettung würde das für lau lösen (eigenes Dokument, eigene
  `baseURI`) und ist isolationstechnisch inzwischen unproblematisch, da
  ein same-origin-iframe `crossOriginIsolated` von einem bereits
  isolierten Elterndokument erbt (bestätigt durch die Positivkontrolle
  aus dem vorletzten Durchgang) — ein Wiedersehen mit der iframe-Idee,
  diesmal aus einem anderen, echten Grund als der ursprünglich falschen
  COOP/COEP-Begründung.

- **Ergebnis:** Committeter Code-Fix (`vite.config.ts`), keine Änderung
  unter `src/` — Coverage dadurch unverändert (Vitest misst nur
  `src/**/*.ts`). Tests 990 → 990 (gleich, kein Testcode geändert),
  `typecheck`/`npm run build` grün (632,59 kB, unverändert — Plugin läuft
  nur im Dev-Server). `knip`: unverändert 10 Funde. Keine
  Artifact-Republikation nötig (keine dargestellte Zahl hat sich
  bewegt).

### 2026-08-10 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `2998683`). SQL/Python weiterhin an der permanenten Scope-Grenze. Nach
  fünf C#-Engine-Durchgängen in Folge (LanguagePlugin, AppContext-Wiring,
  Hosting-Analyse ×3, Dev-Server-Middleware) laut Mandat-Priorität wieder
  zuerst Priorität 2: ein gründlicherer Live-Playwright-Durchlauf gegen
  den echten Dev-Server, da der letzte dedizierte Bug-Hunt mehrere
  Durchgänge zurückliegt (die zwischenzeitlichen C#-Firings enthielten
  zwar kleinere SQL/Python-Stichproben als Nebenprodukt ihrer eigenen
  Verifikation, aber keinen vollständigen Durchlauf).

- **Live-Bug-Hunt-Ergebnis:** Dev-Server per Playwright gefahren (CDN-
  Workaround aus dem Runbook: `context.route()` liefert lokal
  installiertes `sql.js`/`pyodide` aus; `crossOriginIsolated=true` dank
  der seit letztem Durchgang aktiven COOP/COEP-Middleware weiterhin
  bestätigt). Breitere Stichprobe als in den letzten Durchgängen — jede
  4. Challenge statt jede 6./8.: 20 von 78 SQL- und 17 von 67
  Python-Challenges, jeweils Tutorial-Text geprüft, Lösung über "In den
  Editor übernehmen" eingefügt, ausgeführt, `✓ Aufgabe erfüllt`
  bestätigt — 37/37 bestanden. Zusätzlich zwei frische, in keinem der
  letzten Durchgänge geprüfte echte Distraktoren manuell eingefügt und
  ausgeführt (SQL 25 UPSERT: `menge = excluded.menge` statt `menge =
  menge + excluded.menge`; Python 20 dynamische Typisierung: neue
  Variable `wert2` statt Wiederverwendung von `wert`) — beide korrekt
  abgelehnt. Mobile-Viewport (375×667) ohne horizontalen Overflow. 0
  Konsolenfehler. Keine neuen Funde.

- **Ergebnis:** Keine Code-/Content-Änderung in diesem Durchgang — Tests,
  Coverage und Build-Größe unverändert (990/990, 92,31 % / 73,15 % /
  99,14 % / 92,31 %, 632,59 kB). Kein neuer Commit, keine
  Artifact-Republikation nötig.

### 2026-08-10 — Stündliche Routine: C#-Wiring-Frage empirisch geklärt — iframe endgültig bestätigt als nötig

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `008d856`). SQL/Python weiterhin an der permanenten Scope-Grenze,
  letzter Bug-Hunt gerade erst sauber durchgelaufen. Der letzte
  C#-Durchgang hatte eine offene Unsicherheit hinterlassen: hängt Blazors
  eigener Core-Loader (`_framework/dotnet.js`) beim Booten vom
  `<base href>` des hostenden Dokuments ab, oder vom Skript-eigenen
  Ladeort? Davon hängt ab, ob die spätere Wiring-Arbeit einen einfachen
  JS-Setter braucht oder eine echte iframe-Umstellung.

- **Test:** Wegwerf-Server im Scratchpad (kein Repo-Code geändert) —
  Publish-Output unter `/v2/` ausgeliefert, Seiten-eigenes
  `<base href>` bewusst auf `/` belassen (derselbe Mismatch, den die
  Haupt-App hätte, die aktuell gar kein `<base>`-Tag besitzt), mit einem
  korrekt absoluten `<script src="/v2/_framework/blazor.webassembly.js">`
  — exakt wie `loadCSharpEngineFromServer` es bereits macht. Ergebnis:
  das Skript selbst lädt einwandfrei, aber Blazors eigener Bootstrapper
  versucht danach `_framework/dotnet.js` gegen `<base href>` aufzulösen
  (`http://.../​_framework/dotnet.js` statt `http://.../v2/_framework/dotnet.js`)
  — 404, `Failed to start platform`. Das passiert innerhalb von Blazors
  eigenem Kern-Loader, bevor überhaupt eigener C#-Code läuft — kein
  JS-seitiger Override von `CSharpEngine.BaseAddress` könnte das beheben.

- **Konsequenz:** Direktes Einbetten in das Haupt-Dokument der App
  funktioniert nicht, solange dessen `<base href>` nicht auf
  `/csharp-engine/` zeigt (aktuell gar kein `<base>`-Tag vorhanden).
  Dynamisches Umschreiben des Haupt-`<base href>` wurde verworfen (zu
  riskanter globaler Seiteneffekt auf jede relative URL-Auflösung in der
  SPA). Eine iframe-Einbettung (eigenes Dokument, eigene korrekte
  `baseURI`, erbt Isolation vom bereits isolierten Elterndokument) ist
  damit die einzig tragfähige Option — die Unsicherheit, die diese
  Entscheidung bisher zurückgestellt hatte, ist jetzt aufgelöst. Der
  nächste C#-Wiring-Schritt kann direkt mit iframe + `postMessage` als
  Transport geplant werden, ohne weitere Design-Fragen.

- **Ergebnis:** Reine Analyse (`docs/csharp-engine-poc.md`), kein Code im
  Repo geändert — der Testaufbau lief komplett im Scratchpad.
  Tests/Coverage/Build-Größe unverändert (990/990, 92,31 % / 73,15 % /
  99,14 % / 92,31 %, 632,59 kB). Keine Artifact-Republikation nötig.

### 2026-08-10 — Stündliche Routine: C#-Engine — iframe+postMessage-Transport implementiert und live verifiziert

- **Umfang:** Baseline sauber (990/990, typecheck/build/knip grün, HEAD
  `3f4242e`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang hatte die verbleibende Design-Unsicherheit für die
  C#-Engine vollständig aufgelöst (iframe statt direktem Script-Inject
  nötig, empirisch bestätigt) — kein offener Punkt mehr im Weg, klarer
  nächster Schritt: die eigentliche Umsetzung.

- **Implementiert:** `src/runtime/csharp/csharpEngine.ts`s
  `loadCSharpEngineFromServer` injiziert nicht mehr direkt ein
  `<script>`-Tag ins aktuelle Dokument, sondern erstellt ein verstecktes
  `<iframe src="${baseUrl}host.html">` und wartet auf eine
  `csharp-host-ready`-`postMessage`. Neue Datei
  `csharp-engine/wwwroot/host.html` — eigenständiges Hosting-Dokument,
  bootet Blazor selbst (bewusst ohne `<base>`-Tag, damit
  `document.baseURI` automatisch zum tatsächlichen Serving-Pfad passt),
  hört danach auf `{ type: 'csharp-run', id, code }`-Nachrichten und
  antwortet mit `{ type: 'csharp-result', id, json }` (oder `error`) —
  per `id` zugeordnet, damit gleichzeitige Anfragen sich nicht
  überschneiden können. `CSharpRuntime`/`CSharpExecResult` (die
  öffentliche Form, von der `EngineFactory.ensureCSharpEngine` bereits
  abhängt) mussten sich nicht ändern — nur der Transport darunter, das
  AppContext-Wiring vom vorletzten Durchgang bleibt unverändert
  funktionsfähig.

- **Tests komplett neu geschrieben** (`csharpEngine.test.ts`, 12 statt 7):
  iframe-Erstellung/-Attribute, Nachrichten-Roundtrip per Request-`id`
  zugeordnet, Origin-/Source-Mismatch-Nachrichten ignoriert,
  Boot-Fehler- und iframe-Ladefehler-Ablehnung mit denselben
  deutschsprachigen Meldungen wie zuvor, Retry nach Fehlschlag erzeugt
  ein neues iframe, gleichzeitige Aufrufer teilen sich ein
  In-Flight-iframe, ein aufgelöster Engine liefert bei erneutem Aufruf
  dieselben Exports ohne zweites iframe.

- **Live-end-to-end verifiziert, nicht nur unit-getestet:** `csharp-engine`
  frisch gepublished (`host.html` bestätigt im Publish-Output), über die
  Dev-Server-Middleware ausgeliefert, das exakte iframe+postMessage-
  Protokoll per Playwright aus dem **echten Haupt-Dokument** heraus
  angesteuert (`http://localhost:5173/`, kein `<base>`-Tag — genau das
  Szenario, das für direkten Script-Inject nachweislich kaputt war). Alle
  drei Fälle erfolgreich: echter Compile+Run (`x = 4`), echter
  Compilerfehler (`CS0029`) bei ungültigem Code, echte Laufzeit-Exception
  mit vollständigem .NET-Stacktrace (`IndexOutOfRangeException` über
  `TargetInvocationException`). SQL zeigte danach weiterhin alle 78
  Challenges — das iframe hat keine Nebenwirkung auf den Rest der App.

- **Bewusst nicht getan:** Noch keine echte Aufrufstelle
  (`ensureCSharpEngine` wird nirgends aufgerufen) und der Registry-Eintrag
  bleibt zurückgehalten — dieser Durchgang schließt die Transport-Frage
  vollständig ab, das eigentliche UI-Wiring bleibt der nächste Schritt.

- **Ergebnis:** Tests 990 → 993 (netto +3: 12 neue iframe-Transport-Tests
  ersetzen 7 alte Script-Inject-Tests). `typecheck`, `npm run build` grün
  (632,59 kB, unverändert). `knip`: unverändert 10 Funde. Coverage:
  92,33 % / 73,16 % / 99,14 % / 92,33 %.

### 2026-08-10 — Stündliche Routine: C#-Editor-UI — Ergebnis-Rendering + LanguagePlugin-Routing

- **Umfang:** Baseline sauber (993/993, typecheck/build/knip grün, HEAD
  `26c39e9`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang hatte die Transport-Frage vollständig geschlossen und
  "das eigentliche UI-Wiring" als nächsten Schritt benannt — beim Prüfen,
  was dafür nötig wäre, einen echten architektonischen Fund gemacht: die
  bestehende `runQuery`-Funktion in `actions.ts` ist **synchron** (SQL/
  Python laufen ohne `await`, sobald die Engine geladen ist), aber C#s
  `executeAndValidate` ist **async** (`engine.exec()` wartet immer auf
  einen echten Roslyn-Compile+Run). C# vollständig in `runQuery`
  einzubauen bräuchte eine echte Umstellung auf einen awaited Rückgabewert
  — betrifft jeden Aufrufer von `runQuery`, zu groß für dieses Increment,
  hier nur dokumentiert statt unter Zeitdruck versucht.

- **Stattdessen gebaut, sauber von dieser offenen Frage entkoppelt:**
  (1) `src/ui/views/tabs/editorTab/csharpResultsArea.ts` —
  `renderCSharpRunOutcome`/`renderCSharpLoadingOutcome`, C#s Pendant zu
  `pythonResultsArea.ts`, nimmt direkt ein
  `CSharpExecuteAndValidateOutcome` (noch nicht über `RunOutcome`
  geroutet, da diese Union noch nicht erweitert ist) und rendert Status/
  stdout — keine Variablentabelle, da Schritt 4s `validate()`-Entscheidung
  bereits festgelegt hat, dass C#-Lokale nach `Main` nicht reflektierbar
  sind. 9 neue Tests, gleiche Abdeckung wie
  `pythonResultsArea.test.ts` (Fehler/Erfolg/Warnung, leeres-stdout-
  Empty-State, HTML-Escaping). (2) `editorTab.ts`s `pluginForTrack` und
  `placeholderFor` behandeln jetzt `'csharp'` (routet zu
  `csharpLanguagePlugin`, `//`-Kommentar-Platzhalter) — beide Zweige
  unerreichbar, bis der Registry-Eintrag kommt, genau wie
  `EngineFactory.ensureCSharpEngine` es zwei Durchgänge lang war, bevor
  seine Aufrufstelle existierte.

- **Ergebnis:** Tests 993 → 1002 (+9, komplett aus
  `csharpResultsArea.test.ts`). `typecheck` grün. `npm run build`
  erfolgreich, Größe 632,59 kB → 635,90 kB (232 → 239 Module) —
  `csharpLanguagePlugin.ts` und seine Abhängigkeiten (Tokenizer,
  Highlighter, Auto-Indent, Keyword-Tabellen) sind jetzt vom
  Produktions-Einstiegspunkt über `editorTab.ts`s Import erreichbar,
  nicht mehr nur von ihrer eigenen Testdatei — deshalb erstmals gebündelt,
  obwohl zur Laufzeit weiterhin unerreichbar. `knip`: unverändert 10
  Funde. Coverage: 92,35 % / 73,18 % / 99,15 % / 92,35 %.

### 2026-08-11 — Stündliche Routine: C# Challenge 20 (B14 Teil 1: Delegates, Lambda-Ausdrücke, Func<>)

- **Umfang:** Baseline sauber (1002/1002, typecheck/build/knip grün, HEAD
  `cb7835b`). SQL/Python weiterhin an der permanenten Scope-Grenze
  (81/82 je Track, nur die bekannten dauerhaften Ausnahmen offen) —
  damit bleibt C# der einzige Track mit aktionablem Content-Fortschritt.
  Letzter offener Zweig laut `docs/csharp-concept-hierarchy.md`: B14
  (Delegates & Lambda-Ausdrücke, 4 Tags:
  `delegate-type`/`lambda-expressions`/`func-action-types`/`events`).

- **Neue Challenge 20** deckt drei der vier B14-Tags ab: ein eigener
  Delegate-Typ `delegate int RechenOperation(int a, int b);`, dem eine
  benannte Methode (Methodenreferenz ohne Aufruf-Klammern), ein direkt
  zugewiesener Lambda-Ausdruck und zusätzlich der eingebaute generische
  Delegate-Typ `Func<int, int, int>` mit einem dritten Lambda
  zugewiesen werden — dieselbe Zuweisungssyntax für alle drei Varianten,
  um den gemeinsamen Kern ("Methode als Wert") sichtbar zu machen.
  `events` bleibt bewusst offen: ein Publisher/Subscriber-Aufbau mit dem
  `event`-Schlüsselwort verdient ein eigenständigeres Szenario als ein
  Anhängsel an diese Challenge.

- **Echter Bug im ersten Entwurf gefunden, nicht nur ein Stilproblem:**
  die erste Fassung deklarierte den `delegate`-Typ ganz am Dateianfang
  (wie in jeder Tutorial-Erklärung intuitiv) — der echte `dotnet`-Treiber
  lehnte das mit `CS8803: Top-level statements must precede namespace
  and type declarations` ab. Ein `delegate` ist genau wie `class` eine
  Typ-Deklaration; in C#s Top-Level-Programmen müssen **alle**
  Anweisungen vor **allen** Typ-Deklarationen stehen, nicht nur vor der
  jeweils jüngsten. Challenge 19 hatte dasselbe Muster schon für die
  dortige `class`-Deklaration richtig gemacht (ganz am Ende), diese
  Challenge hatte es beim `delegate` zunächst übersehen. Fix: Lösung,
  alle drei Distraktoren und der dritte Hinweis verschieben die
  `delegate`-Zeile ans Dateiende, nach der lokalen Methode `Addieren`;
  Hinweis 2 erklärt jetzt explizit die Anweisungen-vor-Typen-Regel samt
  `CS8803`-Fehlercode. Erst nach diesem Fix bestand die eigene Lösung
  Gate 1.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `Addieren` zu `void` statt `int` gemacht — die Signatur
  passt nicht mehr zu `RechenOperation`, der Compiler lehnt die
  Zuweisung ab (`CS0407`); im Lambda für `operation2` `a + b` statt
  `a * b` verwendet — kompiliert fehlerfrei, liefert aber
  "Multiplizieren: 7" statt "Multiplizieren: 12"; die Argumente beim
  Aufruf von `operation3` vertauscht — kompiliert fehlerfrei, liefert
  aber "Subtrahieren: -6" statt "Subtrahieren: 6" bei einer Subtraktion.

- **Ergebnis:** Tests 1002 → 1006 (+4: Gate 1 eigene Lösung + Gate 2 drei
  Distraktoren für Challenge 20, alle gegen den echten `dotnet`-Treiber).
  `typecheck` grün. `npm run build` erfolgreich, unverändert 635,90 kB
  (reine Content-Datei, kein neuer Code-Pfad). `knip`: unverändert 10
  Funde. Coverage: 92,38 % / 73,17 % / 99,15 % / 92,38 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 74/86 → 77/86 (≈ 90 %),
  B14 zu 3 von 4 Tags abgedeckt (`events` offen).

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (1006/1006, typecheck/build grün, HEAD
  `747a512`). SQL/Python weiterhin an der permanenten Scope-Grenze,
  letzter dedizierter Live-Bug-Hunt lag drei Durchgänge zurück (vor der
  iframe-Transport-/Editor-UI-/Challenge-20-Arbeit) — laut Mandat-
  Priorität diesmal Priorität 2 statt eines weiteren C#-Increments.

- **Vorgehen:** Dev-Server gestartet, sql.js/Pyodide lokal per
  `context.route()` statt der in dieser Sandbox blockierten CDN-Domains
  serviert (Standard-Runbook). Drei Playwright-Durchläufe: Desktop
  (1400×1000), Mobile (375×667, iPhone-SE-Breite, Standing-Requirement
  seit 2026-08-09), Python-Track. Geprüft: horizontales Overflow, echte
  `.click()`-Versuche (nicht nur `isVisible()`) auf Tabs/Run-Button nach
  Interaktion, Sidebar-Drawer-Verhalten nach Auswahl auf Mobile,
  Konsolenfehler/`pageerror`, ein vollständiger End-to-End-Run-Zyklus
  (echte Musterlösung aus Challenge 01 in den Editor eingefügt, Run
  geklickt, `.status-ok` bestätigt).

- **Zwei scheinbare Befunde aus dem ersten automatisierten Durchlauf
  entpuppten sich beim Nachprüfen als Fehler im eigenen Testskript, nicht
  im Produkt** — festgehalten, weil das Muster lehrreich ist: (1) ein
  `.click()` auf `.challenge-item[data-num="3"]` schlug fehl, weil
  `data-num` tatsächlich nullgepolstert ist (`"03"`) — mit der korrekten
  Selektor-Form lief die gesamte Mobile-Sidebar-Sequenz (Drawer offen bei
  Erstladung → nach Auswahl korrekt auf `collapsed` mit 52px Breite,
  Editor-Tab danach klickbar) genau wie erwartet durch, kein
  F-020-Rückfall. (2) `task tab visible: false` und `run nach Lösung-
  Klick: status-ok false` lagen an geratenen Selektoren
  (`.task-tab`/`[data-tab-panel="task"]` statt des echten
  `#tabpanel-task`) bzw. einer falschen Annahme (der Button
  „Lösung anzeigen" zeigt die Musterlösung nur zum Vergleich an, füllt
  sie aber bewusst nicht automatisch in den Editor — kein Bug, korrektes
  Verhalten, das ein automatisches Bestehen ohne eigenes Tippen
  verhindern soll). Mit den korrigierten Selektoren: Task-Tab-Panel
  sichtbar, Lösungs-Panel zeigt Text (771 Zeichen), Editor-Textarea mit
  korrektem Platzhalter vorbefüllt, echter End-to-End-Lauf mit der
  richtigen Musterlösung liefert `status-ok`.

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig,
  kein Commit. Tests/typecheck/build unverändert bei 1006/1006 grün.
  Nächster offener Schritt bleibt entweder ein weiterer C#-Content-
  Schritt (`events`, B14, oder B15/LINQ) oder der nächste Live-Bug-Hunt
  in ein paar Durchgängen.

### 2026-08-11 — Stündliche Routine: C# Challenge 21 (B14 vollständig: Events)

- **Umfang:** Baseline sauber (1006/1006, typecheck/build/knip grün, HEAD
  `25e90fa`). SQL/Python weiterhin an der permanenten Scope-Grenze.
  Letzter Durchgang war ein sauberer Live-Bug-Hunt ohne Codeänderung —
  laut Mandat-Priorität diesmal wieder C#, da mit `events` ein klar
  begrenzter, dokumentierter nächster Schritt anstand (letzter offener
  B14-Tag).

- **Neue Challenge 21** deckt `events` ab — den letzten Tag aus B14.
  Szenario: eine Klasse `Kontostand` mit
  `public event Action<int>? SaldoNiedrig;` (bewusst der eingebaute
  `Action<int>`-Typ statt eines eigenen `delegate`, direkte Fortsetzung
  von Challenge 20s `func-action-types`). `Abheben(int betrag)` löst
  das Event per `SaldoNiedrig?.Invoke(saldo);` aus, sobald der Saldo
  unter 50 fällt; von außen meldet sich der Aufrufer per `+=` mit einem
  Lambda an. Zwei Abhebungen (100 → 70 → 40) zeigen sowohl den
  Nicht-Auslöse- als auch den Auslöse-Fall in der Ausgabe.

- **Drei Distraktoren, alle beim ersten Durchlauf korrekt gegen den
  echten `dotnet`-Treiber verifiziert — kein Nacharbeiten nötig, anders
  als bei Challenge 20s CS8803-Fund:** ein Versuch, das Event direkt
  von außen aufzurufen (`konto.SaldoNiedrig(letzterSaldo);` statt nur
  `+=`/`-=`) — der Compiler lehnt das mit `CS0070` ab, genau die
  Zugriffsbeschränkung, die `event` gegenüber einem gewöhnlichen
  öffentlichen Delegate-Feld durchsetzt und damit den Kernpunkt des
  Tags empirisch demonstriert; das `event`-Schlüsselwort weggelassen
  (nur `public Action<int>? SaldoNiedrig;`) und zusätzlich direkt von
  außen aufgerufen — kompiliert jetzt anstandslos und löst die Warnung
  schon vor der ersten Abhebung fälschlich aus, zeigt empirisch, was
  ohne `event` an Kapselung verloren geht; die Auslöse-Schwelle von
  `saldo < 50` auf `saldo < 40` geändert — nach der zweiten Abhebung
  steht der Saldo exakt bei 40, `40 < 40` ist falsch, das Event feuert
  nie (Off-by-one in der Fachlogik).

- **Ergebnis:** Tests 1006 → 1010 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 21). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (reine Content-Datei). `knip`:
  unverändert 10 Funde. Coverage: 92,41 % / 73,17 % / 99,15 % / 92,41 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 77/86 → 78/86 (≈ 91 %),
  **B14 (Delegates & Lambda-Ausdrücke) damit vollständig abgedeckt** —
  B0 bis B14 sind jetzt komplett. Nächster offener Zweig: B15 (LINQ).

### 2026-08-11 — Stündliche Routine: C# Challenge 22 (B15 Teil 1: LINQ Where/Select)

- **Umfang:** Baseline sauber (1010/1010, typecheck/build/knip grün, HEAD
  `ee8e808`). SQL/Python weiterhin an der permanenten Scope-Grenze. Dies
  ist der dritte C#-Content-Durchgang in Folge — bewusst gewählt, weil
  B15s Basis-Tag `linq-method-syntax` ein klar begrenzter nächster
  Schritt war (einzelner Tag, wohldefiniertes Szenario), nicht weil ein
  Bug-Hunt fällig gewesen wäre; der letzte Live-Bug-Hunt liegt erst zwei
  Durchgänge zurück und kam sauber zurück.

- **Neue Challenge 22** deckt `linq-method-syntax` ab — den ersten von
  fünf B15-Tags. Szenario: `List<int> zahlen = { 3, 8, 15, 22, 4, 30,
  11 }`, gefiltert mit `.Where(z => z % 2 == 0).ToList()` (nur die
  geraden Zahlen: 8, 22, 4, 30), transformiert mit
  `.Select(z => z * 2).ToList()` (verdoppelt: 16, 44, 8, 60) — beide
  LINQ-Grundoperationen aus der Tag-Definition in einer Verkettung.

- **Drei Distraktoren, alle beim ersten Durchlauf empirisch gegen den
  echten `dotnet`-Treiber verifiziert — diesmal ausschließlich
  Logikfehler statt Compilerfehler, weil LINQ-Verkettungen selten falsch
  kompilieren, sondern typischerweise falsch rechnen:** die
  Filter-Bedingung umgekehrt (`z % 2 != 0` statt `== 0`) liefert die
  verdoppelten ungeraden statt der geraden Zahlen; die Transformation
  geändert (`z + 2` statt `z * 2`) liefert falsche Summanden statt
  Verdopplung; am lehrreichsten der dritte — `.Select().Where()` statt
  `.Where().Select()` vertauscht. Da jede verdoppelte Zahl automatisch
  gerade ist, lässt der Filter danach *alle* 7 Elemente durch statt nur
  der 4 ursprünglich geraden — ein empirischer Beleg, dass die
  Verkettungsreihenfolge bei LINQ das Ergebnis tatsächlich verändert.

- **Ergebnis:** Tests 1010 → 1014 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 22). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (reine Content-Datei). `knip`:
  unverändert 10 Funde. Coverage: 92,44 % / 73,17 % / 99,15 % / 92,44 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 78/86 → 79/86 (≈ 92 %),
  B15 zu 1 von 5 Tags abgedeckt (`linq-query-syntax`,
  `linq-ordering-grouping`, `linq-aggregation`,
  `linq-deferred-execution` offen). B0 bis B14 bleiben komplett.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (1014/1014, typecheck/build grün, HEAD
  `28caf4b`). Drei Durchgänge in Folge hatten C#-Content gebaut
  (Challenges 20–22) — laut Mandat-Priorität diesmal bewusst Priorität 2
  statt eines weiteren C#-Increments, um die Balance zu halten.

- **Vorgehen:** Dev-Server gestartet, sql.js/Pyodide lokal per
  `context.route()` statt der blockierten CDN-Domains serviert. Gezielt
  Bereiche mit niedrigerer Branch-Coverage aus dem letzten
  Coverage-Report geprüft (`chatTab.ts` 93,9 %, `pgAskPanel.ts` 87,0 %,
  `themePicker.ts`/Overlay-Logik, `courseSelectPicker`-Track-Wechsel):
  Chat-Tab-Sichtbarkeit und Senden-Button; PgAsk-Panel — erst
  `.pg-ask-toggle-btn` öffnet `.ask-panel` (per CSS `display: none` bis
  `.open`), danach ein leerer Frage-Submit als No-op-Pfad
  (`question.trim()`-Guard); Track-Wechsel SQL → Python → SQL ohne
  Restzustand in der Challenge-Liste; Theme-Picker-Overlay öffnet sich
  per echtem `.click()` und markiert exakt eine Theme-Option als
  `selected` (Regressionscheck für den alten Theme-Picker-Bug, siehe
  F-007).

- **Ein scheinbarer Befund aus dem ersten Skript-Entwurf entpuppte sich
  beim Nachprüfen wieder als eigener Testskript-Fehler, nicht als
  Produktbug:** ein direkter `.click()` auf `.pg-ask-submit-btn` ohne
  vorherigen Klick auf `.pg-ask-toggle-btn` schlug mit "element is not
  visible" fehl — das Submit-Feld sitzt bewusst hinter `.ask-panel`,
  das laut `themes.css` erst nach dem Toggle-Klick sichtbar wird
  (`display: none` → `.open { display: block }`). Mit dem korrigierten
  Skript (erst Toggle, dann Submit) lief die gesamte Sequenz wie
  erwartet durch.

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig.
  Tests/typecheck/build unverändert bei 1014/1014 grün. Nächster
  offener Schritt: weiterer C#-Content (`linq-query-syntax` o. Ä., B15)
  oder der nächste Live-Bug-Hunt in ein paar Durchgängen.

### 2026-08-11 — Stündliche Routine: C# Challenge 23 (B15 Teil 2: LINQ Aggregation)

- **Umfang:** Baseline sauber (1014/1014, typecheck/build/knip grün, HEAD
  `26c30a2`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang war ein sauberer Live-Bug-Hunt — laut Mandat-Priorität
  diesmal wieder C#, da B15s zweiter Tag (`linq-aggregation`) ein klar
  begrenzter nächster Schritt war, direkte Fortsetzung von Challenge 22s
  `linq-method-syntax`.

- **Neue Challenge 23** deckt `linq-aggregation` ab — den zweiten von
  fünf B15-Tags. Szenario: `List<int> punkte = { 80, 90, 70, 60, 100 };`,
  zusammengefasst über alle fünf Aggregations-Methoden aus der
  Tag-Definition: `.Sum()` (400), `.Count()` (5), `.Average()` (400 als
  `double`, bewusst exakt 80 gewählt, um .NETs Fließkomma-
  Rundungsdarstellung aus der erwarteten Ausgabe herauszuhalten),
  `.Max()` (100), `.Min()` (60).

- **Drei Distraktoren, alle beim ersten Durchlauf empirisch gegen den
  echten `dotnet`-Treiber verifiziert:** `Max()` und `Min()` bei der
  Zuweisung vertauscht — liefert "Maximum: 60" und "Minimum: 100" statt
  umgekehrt (Logikfehler, kompiliert fehlerfrei); `.Length` statt
  `.Count()` verwendet — `List<T>` hat anders als Arrays keine
  `.Length`-Eigenschaft, echter Compilerfehler `CS1061`; und ein Element
  beim Anlegen der Liste vergessen (nur vier statt fünf Zahlen) —
  verändert vier der fünf Ausgabezeilen, nur `Minimum` bleibt zufällig
  korrekt, ein realistischer Abschreibfehler statt einer API-
  Verwechslung.

- **Ergebnis:** Tests 1014 → 1018 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 23). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (reine Content-Datei). `knip`:
  unverändert 10 Funde. Coverage: 92,47 % / 73,14 % / 99,15 % / 92,47 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 79/86 → 80/86 (≈ 93 %),
  B15 zu 2 von 5 Tags abgedeckt (`linq-query-syntax`,
  `linq-ordering-grouping`, `linq-deferred-execution` offen). B0 bis B14
  bleiben komplett.

### 2026-08-11 — Stündliche Routine: C# Challenge 24 (B15 Teil 3: LINQ Query-Syntax)

- **Umfang:** Baseline sauber (1018/1018, typecheck/build/knip grün, HEAD
  `372185f`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Live-Bug-Hunt liegt zwei Durchgänge zurück und kam sauber
  zurück — laut Mandat-Priorität diesmal wieder C#, da B15s dritter Tag
  (`linq-query-syntax`) ein klar begrenzter nächster Schritt war.

- **Neue Challenge 24** deckt `linq-query-syntax` ab — den dritten von
  fünf B15-Tags. Szenario: `List<int> mengen = { 12, 5, 18, 7, 24, 9,
  30 };`, abgefragt per Query-Syntax `from m in mengen where m > 10
  select m * 3` statt der Method-Syntax aus Challenge 22 — dieselbe
  Semantik, syntaktisch fast identisch mit SQLs `SELECT ... FROM ...
  WHERE ...` (nur in umgekehrter Klausel-Reihenfolge, ohne Kommas/
  Semikolons zwischen den Klauseln).

- **Drei Distraktoren, alle beim ersten Durchlauf empirisch gegen den
  echten `dotnet`-Treiber verifiziert, diesmal ohne Compilerfehler —
  Query-Syntax-Fehler sind fast immer Logikfehler:** die `where`-
  Bedingung umgekehrt (`m < 10` statt `m > 10`) liefert die
  verdreifachten kleinen statt der großen Mengen; der `select`-
  Multiplikator geändert (`m * 2` statt `m * 3`) verdoppelt statt zu
  verdreifachen; am lehrreichsten die komplett weggelassene `where`-
  Klausel — sie ist in der Query-Syntax **optional**, `from ... select
  ...` ohne Filter ist gültiges C# und wählt einfach alle sieben
  Elemente statt nur der vier über 10 aus, ein empirischer Beleg dafür,
  dass „syntaktisch gültig" und „semantisch richtig" zwei verschiedene
  Dinge sind.

- **Ergebnis:** Tests 1018 → 1022 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 24). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (reine Content-Datei). `knip`:
  unverändert 10 Funde. Coverage: 92,50 % / 73,14 % / 99,15 % / 92,50 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 80/86 → 81/86 (≈ 94 %),
  B15 zu 3 von 5 Tags abgedeckt (`linq-ordering-grouping`,
  `linq-deferred-execution` offen). B0 bis B14 bleiben komplett.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (1022/1022, typecheck/build/knip grün, HEAD
  `59b9044`). Drei Durchgänge in Folge hatten C#-Content gebaut
  (Challenges 22–24) — laut Mandat-Priorität diesmal wieder Priorität 2
  statt eines weiteren C#-Increments.

- **Vorgehen:** Dev-Server gestartet, sql.js/Pyodide lokal per
  `context.route()` statt der blockierten CDN-Domains serviert. Diesmal
  gezielt Bereiche geprüft, die in früheren Durchgängen noch nicht
  live abgedeckt waren: `compareView.ts` — "Mit Musterlösung
  vergleichen" per echtem `.click()`, beide Spalten (eigener Code,
  Musterlösung) zeigen tatsächlichen Inhalt; `hintsSection.ts` — ein
  Tipp per echtem `.click()` angefordert, Tipptext erscheint korrekt;
  Tastatur-Bedienbarkeit der Challenge-Liste — ein echtes `Enter`-
  `KeyboardEvent` auf einem fokussierten `.challenge-item` wählt die
  Challenge aus (Regressionscheck für die frühe Tastatur-Arbeit); ein
  echter End-to-End-Lauf mit der tatsächlichen Musterlösung von Python
  Challenge 01 (`print(...)`-Doppelzeile) über den echten Pyodide-Motor.
  Alle vier Prüfungen liefen wie erwartet durch.

- **Eine CONSOLE-ERROR-Meldung aufgetreten, aber kein Produktbug:**
  `net::ERR_CERT_AUTHORITY_INVALID` beim Tipp-Anfordern. Nachverfolgt
  auf den Netzwerk-Request dahinter: ein Aufruf an
  `api.anthropic.com/v1/messages` — das ist `revealHint`s zusätzlicher
  Claude-Chat-Elaborations-Call (siehe Kommentar in `hintsSection.ts`),
  vom Sandbox-Netzwerk blockiert, dieselbe Kategorie wie die bereits
  dokumentierte CDN-Sperre. Der eigentliche Tipptext wird davon
  unabhängig sofort und korrekt angezeigt (bestätigt) — die App
  degradiert hier bereits sauber, kein Fix nötig.

- **Eigener Bedienfehler während des Durchgangs, kein Produktbug:**
  ein `pkill -f "vite"` zum Beenden des Dev-Servers traf per
  Substring-Match auch den parallel laufenden `vitest`-Hintergrundlauf
  (der Prozessname enthält ebenfalls "vite") und brach ihn mitten im
  Lauf ab. Erkannt am unerwarteten Exit-Code, sauber durch einen
  zweiten vollständigen Testlauf behoben — für künftige Durchgänge
  festgehalten: `pkill -f "vite"` ist zu unspezifisch, wenn parallel
  ein `vitest`-Lauf aktiv sein könnte.

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig.
  Tests/typecheck/build unverändert bei 1022/1022 grün. Nächster
  offener Schritt: weiterer C#-Content (B15-Rest oder B16) oder der
  nächste Live-Bug-Hunt in ein paar Durchgängen.

### 2026-08-11 — Stündliche Routine: C# Challenge 25 (B15 Teil 4: LINQ Ordering/Grouping)

- **Umfang:** Baseline sauber (1022/1022, typecheck/build/knip grün, HEAD
  `132621d`). SQL/Python weiterhin an der permanenten Scope-Grenze. Der
  letzte Durchgang war ein sauberer Live-Bug-Hunt — laut Mandat-
  Priorität diesmal wieder C#, da B15s vierter Tag
  (`linq-ordering-grouping`) ein klar begrenzter nächster Schritt war.

- **Neue Challenge 25** deckt `linq-ordering-grouping` ab — alle drei
  Methoden aus der Tag-Definition (`.OrderBy()`, `.OrderByDescending()`,
  `.GroupBy()`) in einem Durchgang. Szenario: `List<int> zahlen = { 42,
  17, 8, 23, 4, 16 };`, sortiert aufsteigend und absteigend, gruppiert
  per `.GroupBy(z => z % 2 == 0 ? "Gerade" : "Ungerade")`. Empirisch
  bestätigt: die Gruppenreihenfolge folgt dem ersten Vorkommen jedes
  Schlüssels im Quell-Enumerable — "Gerade" zuerst, weil `42` (das
  erste Element) gerade ist.

- **Drei Distraktoren, alle beim ersten Durchlauf empirisch gegen den
  echten `dotnet`-Treiber verifiziert:** `OrderBy()`/
  `OrderByDescending()` bei der Zuweisung vertauscht — die ersten
  beiden Zeilen zeigen vertauschte Sortierrichtungen; die Ternär-Zweige
  im `GroupBy()`-Schlüssel vertauscht — die letzten beiden Zeilen
  zeigen falsche Beschriftungen, obwohl die tatsächliche Gruppierung
  unverändert bleibt; `gruppe.Count()` statt `gruppe.Key` verwendet —
  verwechselt Gruppengröße mit Gruppenschlüssel.

- **Ergebnis:** Tests 1022 → 1026 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 25). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (reine Content-Datei). `knip`:
  unverändert 10 Funde. Coverage: 92,53 % / 73,13 % / 99,16 % / 92,53 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 81/86 → 82/86 (≈ 95 %),
  B15 zu 4 von 5 Tags abgedeckt — nur `linq-deferred-execution` bleibt
  offen, der letzte Tag im gesamten C#-Dokument. B0 bis B14 bleiben
  komplett.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (1026/1026, typecheck/build/knip grün, HEAD
  `013629e`). Vier Durchgänge in Folge hatten C#-Content gebaut
  (Challenges 22–25) — laut Mandat-Priorität diesmal wieder Priorität 2
  statt eines weiteren C#-Increments.

- **Vorgehen:** Dev-Server gestartet, sql.js lokal per `context.route()`
  statt der blockierten CDN-Domain serviert. Diesmal gezielt Zustands-
  übergänge geprüft, die in früheren Durchgängen noch nicht live
  abgedeckt waren: Study-/Exam-Modus-Umschaltung inklusive des
  gemeinsamen Exam-Tipp-Pools — nach einer Tipp-Anforderung im
  Exam-Modus sinkt der Pool korrekt von 3 auf 2, das Label
  aktualisiert sich sofort; Schema-Zurücksetzen-Bestätigungsfluss —
  öffnet sich per echtem `.click()`, schließt sauber bei "Abbrechen"
  ohne zurückzusetzen, schließt sauber bei "Ja, löschen" nach
  tatsächlichem Zurücksetzen; ein echter End-to-End-Abschluss von SQL
  Challenge 01 mit der tatsächlichen Musterlösung — vor dem Lösen leere
  Sterne-Anzeige, nach erfolgreichem Lauf korrekt drei Sterne (keine
  Tipps verwendet) und `active`-Klasse gesetzt. Alle Prüfungen liefen
  wie erwartet durch.

- **Eine CONSOLE-ERROR-Meldung aufgetreten, aber kein neuer Fund:**
  dieselbe bereits dokumentierte `net::ERR_CERT_AUTHORITY_INVALID` von
  `api.anthropic.com` (Claude-Chat-Elaboration beim Tipp-Anfordern,
  vom Sandbox-Netzwerk blockiert) aus einem früheren Durchgang — kein
  Produktbug, keine neue Untersuchung nötig.

- **Lehre aus dem vorletzten Durchgang beherzigt:** der Dev-Server
  wurde diesmal über die exakten PIDs beendet (`ps aux | grep -E
  "vite$|npm run dev"`, gezielt `kill`), statt eines breiten
  `pkill -f "vite"`, das beim letzten Mal versehentlich auch den
  parallel laufenden `vitest`-Hintergrundlauf getroffen hatte. Der
  Testlauf blieb diesmal ungestört.

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig.
  Tests/typecheck/build unverändert bei 1026/1026 grün. Nächster
  offener Schritt: letzter C#-Content-Schritt für B15
  (`linq-deferred-execution`) oder B16, oder der nächste
  Live-Bug-Hunt in ein paar Durchgängen.

### 2026-08-11 — Stündliche Routine: C# Challenge 26 (B15 vollständig: LINQ Deferred Execution)

- **Umfang:** Baseline sauber (1026/1026, typecheck/build/knip grün, HEAD
  `ac605e1`). Der letzte Durchgang war ein sauberer Live-Bug-Hunt — laut
  Mandat-Priorität diesmal wieder C#, da `linq-deferred-execution` der
  letzte offene Tag in B15 (und im gesamten C#-Dokument) war, ein klar
  begrenzter nächster Schritt.

- **Neue Challenge 26** deckt `linq-deferred-execution` ab — den letzten
  Tag von B15 (LINQ) und den letzten offenen Tag im gesamten
  C#-Konzept-Dokument. Szenario: `List<int> zahlen = { 2, 5, 8 };`,
  `var query = zahlen.Where(z => z > 3);` (bewusst ohne `.ToList()`),
  danach `zahlen.Add(10);` gefolgt von einem ersten `foreach` über
  `query`, danach zwei weitere `Add()`-Aufrufe gefolgt von einem
  zweiten `foreach` über dieselbe `query`-Variable. Empirisch gegen den
  echten `dotnet`-Treiber bestätigt: der erste Durchlauf zeigt 5, 8, 10
  (Stand von `zahlen` beim ersten Iterieren), der zweite Durchlauf
  zeigt 5, 8, 10, 20 (Stand beim zweiten Iterieren) — dieselbe
  Query-Variable liefert bei zwei verschiedenen Iterationen zwei
  verschiedene Ergebnisse, weil `.Where()` ohne Materialisierung nichts
  als "Bauplan" speichert, keinen Schnappschuss.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `.ToList()` direkt an `Where()` angehängt — erzwingt
  sofortige Auswertung beim Erstellen der Query, macht `query` zu einer
  festen Liste, beide `Add()`-Aufrufe danach wirken sich nicht mehr
  aus, beide Durchläufe zeigen identisch nur 5, 8; die Filterbedingung
  auf `z > 5` statt `z > 3` geändert — die 5 fällt aus beiden
  Durchläufen raus; alle drei `Add()`-Aufrufe vor das erste `foreach`
  statt zwischen die beiden Durchläufe verschoben — beide Iterationen
  sehen denselben, bereits vollständigen Zustand von `zahlen`, beide
  Durchläufe zeigen identisch 5, 8, 10, 20 statt unterschiedlicher
  Ergebnisse.

- **Ergebnis:** Tests 1026 → 1030 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 26). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB — der C#-Track ist noch nicht in
  `src/content/registry.ts`'s `TRACKS` registriert, C#-Content-Dateien
  landen also (noch) nicht im Produktions-Bundle, nur in den Tests, die
  direkt aus dem Kurs-Modul importieren; erwartetes, dokumentiertes
  Verhalten, kein Fund. `knip`: unverändert 10 Funde (alle vorbestehend,
  keine neuen durch diese reine Content-Datei). Coverage: 92,56 % /
  73,13 % / 99,16 % / 92,56 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 82/86 → 83/86 (≈ 97 %).
  **B15 (LINQ) damit komplett** (alle 5 Tags). B0 bis B15 sind jetzt
  vollständig abgedeckt. Einzig verbleibender offener Zweig im gesamten
  C#-Dokument: **B16 (Namespaces & Imports)** mit seinem einzigen Tag
  `own-namespaces` — als nächster Schritt zu klären, ob/wie sich das
  sinnvoll in das aktuelle Single-File-`dotnet exec`-Engine-Modell
  einpassen lässt, oder ob es wie `updatable-view` (SQL) und
  `own-modules` (Python) eine dauerhafte Scope-Ausnahme bleibt.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber), kein aktionabler Schritt

- **Umfang:** Baseline sauber (1030/1030, typecheck/build/knip grün, HEAD
  `254ea3d`). Der letzte Durchgang hatte C#-Content (Challenge 26)
  abgeschlossen und B15 vollständig gemacht — laut Mandat-Priorität
  diesmal wieder Priorität 2, zumal SQL/Python weiterhin an der
  permanenten Scope-Grenze stehen (nur die dokumentierten
  Ausnahmen `updatable-view`/`own-modules` offen) und der einzige
  verbleibende C#-Schritt (B16 `own-namespaces`) noch eine offene
  architektonische Frage ist statt eines klar begrenzten nächsten
  Schritts.

- **Vorgehen:** Dev-Server gestartet, sql.js lokal per `context.route()`
  statt der blockierten CDN-Domain serviert. Diesmal gezielt drei
  bisher nicht live abgedeckte Bereiche geprüft: der
  Endlosrekursions-Schutz (`findUnboundedRecursion`) — eine echte
  `WITH RECURSIVE`-CTE ohne `WHERE` im rekursiven Teil und ohne
  `LIMIT` danach wurde im Editor ausgeführt; die Seite blieb reaktionsfähig
  (kein Einfrieren), der Run-Klick kehrte in ~660ms zurück statt zu
  hängen, und die exakte deutsche Warnmeldung
  ("... ohne eine der beiden Abbruchbedingungen läuft die Rekursion
  unendlich weiter ...") erschien korrekt mit `status-err`-Klasse;
  fehlerhaftes SQL (`SELEKT * FROM nichts WO id = ;`) zeigte ebenfalls
  korrekt eine nicht-leere Fehlermeldung mit `status-err`-Klasse; und
  `localStorage`-Persistenz über einen echten Seiten-Reload hinweg —
  Challenge 01 gelöst (drei Sterne), zu Challenge 02 gewechselt, dann
  `page.reload()`: nach dem Reload zeigte Challenge 01 weiterhin
  korrekt drei Sterne und Challenge 02 blieb als zuletzt geöffnete
  Challenge aktiv (`active`-Klasse gesetzt) — Fortschritt und
  Navigationszustand überleben einen echten Browser-Reload korrekt.

- **Ein Fehlalarm im eigenen Testskript, kein Produktbug:** die ersten
  beiden Prüfungen (`status-error`-Selektor) schlugen zunächst fehl,
  weil die tatsächliche CSS-Klasse `status-err` heißt (siehe
  `src/ui/views/tabs/editorTab/resultsArea.ts`), nicht `status-error`
  — nach Korrektur des Selektors liefen beide Prüfungen sauber durch.
  Derselbe wiederkehrende Fehlerklasse wie in früheren Durchgängen
  (falsch geratene Selektoren im eigenen Skript statt echter Bugs).

- **Dev-Server sauber über exakte PIDs beendet** (`ps aux | grep -E
  "vite$|npm run dev"`, gezielt `kill`), kein breiter `pkill`.

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig.
  Tests/typecheck/build unverändert bei 1030/1030 grün. Nächster
  offener Schritt: B16 (`own-namespaces`) — klären, ob/wie es ins
  Single-File-`dotnet exec`-Engine-Modell passt, oder ob es eine
  dauerhafte Scope-Ausnahme bleibt — oder der nächste Live-Bug-Hunt in
  ein paar Durchgängen.

### 2026-08-11 — Stündliche Routine: C# Challenge 27 (B16 vollständig: Namespaces & Imports — C#-Dokument 100 %)

- **Umfang:** Baseline sauber (1030/1030, typecheck/build/knip grün, HEAD
  `e7c0ab0`). Der letzte Durchgang war ein sauberer Live-Bug-Hunt — laut
  Mandat-Priorität diesmal wieder C#, um die aus dem vorletzten Durchgang
  offen gelassene architektonische Frage zu B16 (`own-namespaces`) zu
  klären: braucht der Tag ein Mehrdatei-Projekt-Setup, das die aktuelle
  Single-File-`dotnet exec`-Engine nicht abbilden kann?

- **Empirischer Befund, bevor Content geschrieben wurde:** Die Frage
  ist mit Nein beantwortet. C# erlaubt mehrere `namespace`-Blöcke in
  einer einzigen Datei — kein Mehrdatei-Setup nötig. Ein Testszenario
  mit zwei unabhängigen `namespace`-Blöcken (`Lager`, `Versand`), die
  je eine eigene, gleichnamige Klasse `Kiste` enthalten, wurde direkt
  gegen `CSharpDriver.dll` (denselben Treiber, den auch die Tests
  benutzen) kompiliert und ausgeführt — erfolgreich. Zusätzlicher Fund:
  B16 hat nicht nur einen Tag (`own-namespaces`), sondern **drei**
  (`namespace-declaration`, `using-directive`, `own-namespaces`) — die
  Annahme aus dem vorletzten Durchgang war hier ungenau. Da der
  Node-Testtreiber `System`/`System.Linq`/etc. bereits als globale
  Usings injiziert, hatte bis dahin keine Challenge einen eigenen
  `using`- oder `namespace`-Block gebraucht — ein einziges Szenario
  konnte also alle drei B16-Tags gleichzeitig abdecken.

- **Neue Challenge 27** deckt alle drei B16-Tags in einem Durchgang ab.
  Szenario: `namespace Lager { class Kiste { ... } }` und
  `namespace Versand { class Kiste { ... } }`, zwei unabhängige Typen
  trotz gleichen Namens. `using Lager;` importiert nur `Lager`;
  `new Kiste(5)` löst darüber zu `Lager.Kiste` auf, `new
  Versand.Kiste(10)` braucht die vollqualifizierte Schreibweise, weil
  `Versand` nicht importiert ist — genau die Namenskollisions-
  Vermeidung, für die eigene Namespaces gedacht sind.

- **Drei Distraktoren, alle empirisch gegen den echten `dotnet`-Treiber
  verifiziert:** `using Lager;` komplett weggelassen — echter
  Compilerfehler `CS0246` ("The type or namespace name 'Kiste' could
  not be found"); die beiden Konstruktor-Zahlenwerte vertauscht —
  kompiliert einwandfrei, zeigt aber vertauschte Werte in beiden
  Ausgabezeilen; der zweite Namespace-Name bei der Deklaration
  versehentlich als `Versand2` statt `Versand` getippt — der Aufruf
  `new Versand.Kiste(10)` referenziert weiterhin den jetzt nicht mehr
  existierenden Namen, wieder `CS0246`.

- **Ergebnis:** Tests 1030 → 1034 (+4: Gate 1 eigene Lösung + Gate 2
  drei Distraktoren für Challenge 27). `typecheck` grün. `npm run build`
  erfolgreich, unverändert 635,90 kB (C#-Track weiterhin nicht in
  `registry.ts` registriert, erwartetes Verhalten). `knip`: unverändert
  10 Funde. Coverage: 92,59 % / 73,12 % / 99,16 % / 92,59 %.
  `docs/csharp-concept-hierarchy.md`: Tag-Bilanz 83/86 → **86/86
  (100 %)**. **B16 (Namespaces & Imports) damit komplett — und mit ihm
  das gesamte C#-Konzept-Dokument.** Jeder Tag in allen 17 Zweigen
  (B0–B16) ist jetzt durch mindestens eine Challenge abgedeckt. Anders
  als SQL (81/82, permanente Ausnahme `updatable-view`) und Python
  (81/82, permanente Ausnahme `own-modules`) bleibt bei C# nicht einmal
  eine bewusste Scope-Ausnahme übrig — 27 Challenges decken den
  kompletten Konzeptraum ab. Nächster offener Schritt für C# ist kein
  Content mehr, sondern die Engine-Integration selbst live spielbar zu
  machen (`runQuery`-Async-Umstellung, Registry-Eintrag,
  `coi-serviceworker` für Produktion — siehe `docs/csharp-engine-poc.md`).

### 2026-08-11 — Stündliche Routine: C#-Engine live verdrahtet (Registry-Eintrag, async runQuery, iframe-Transport E2E-verifiziert)

- **Umfang:** Baseline sauber (1034/1034, typecheck/build/knip grün, HEAD
  `e938d8a`). C#-Content ist seit dem letzten Durchgang vollständig
  (86/86 Tags) und SQL/Python stehen an der permanenten Scope-Grenze —
  laut Mandat-Priorität diesmal C#-Engine-Integration, mit klarem
  nächstem Schritt laut `docs/csharp-engine-poc.md`: den letzten
  verbliebenen Wiring-Schritt (`runQuery`-Async-Umstellung +
  Registry-Eintrag) schließen, um C# im Dev-Server tatsächlich spielbar
  zu machen.

- **`runQuery` async gemacht:** einziger Aufrufer außerhalb der Tests ist
  `editorTab.ts`s `run()` — geringer Streuradius. `RunOutcome` um
  `csharp`/`csharp-loading` erweitert (Spiegelbild von
  `python`/`python-loading`). `ensureCSharpEngineLoaded` (Spiegel von
  `ensurePythonEngineLoaded`) lädt `loadCSharpEngineFromServer('/csharp-engine/')`
  beim Öffnen einer C#-Challenge, mit `withTimeout`-Absicherung und
  neuem `session.csharpStatus`-Feld. `renderPythonEngineStatus` zu
  `renderEngineStatus(status, label)` verallgemeinert statt dupliziert
  (Python/C#-Banner sind identisch bis auf den Namen).
  `csharpGrundlagenCourse` jetzt in `TRACKS` registriert — der zuvor in
  jedem Durchgang bewusst zurückgehaltene letzte Baustein.

- **Ein echter Bug gefunden und behoben, bevor committet wurde:** da
  jetzt auch SQL/Python durch ein `await` laufen (obwohl beide intern
  nichts asynchrones tun), verschiebt sich ihr DOM-Render um einen
  Mikrotask — unsichtbar für Menschen, aber vier bestehende
  `editorTab.test.ts`-Tests prüften synchron direkt nach dem
  Klick-Dispatch und schlugen fehl. Behoben durch `await
  Promise.resolve();` in diesen Tests, nach demselben Muster, das die
  Datei für den Pyodide-Ladefehler-Test schon nutzte. Zusätzlich ein
  Race-Guard in `run()` ergänzt: da C#s echter Compile+Run jetzt der
  einzige Zweig ist, der langsam genug ist, dass Nutzer währenddessen
  wegnavigieren könnten, prüft `run()` nach dem `await runQuery(...)`
  erneut die aktuelle Auswahl und verwirft das Ergebnis, falls sich die
  Auswahl inzwischen geändert hat.

- **Live-E2E-verifiziert gegen den echten Dev-Server** (Playwright, nicht
  nur Unit-Tests): C#-Track im Sidebar-Dropdown ausgewählt, alle 27
  Challenges gelistet, Challenge 01 geöffnet, Editor nutzt korrekt
  `csharpLanguagePlugin` (Toolbar zeigt "C#", Syntax-Highlighting aktiv),
  echte Musterlösung ausgeführt — echter Roslyn-Compile + WASM-Ausführung
  über den iframe-Transport, `validate()` lief, UI zeigte `✓ Aufgabe
  erfüllt`, drei Sterne, korrektes stdout, Sidebar-Sternebadge
  aktualisierte sich. Zweiter Lauf derselben Challenge brauchte nur
  ~30ms (Engine bereits gecacht — bestätigt `ensureCSharpEngine`s
  Load-once-Verhalten unter dem echten iframe-Transport). SQL lief auf
  derselben Seite unverändert korrekt weiter — keine Regression. Die
  eine beobachtete Konsolen-Meldung (`ManagedError: ... Could not find
  any element matching selector '#app'`) ist dieselbe bereits
  dokumentierte harmlose Blazor-Root-Component-Suche, kein neuer Fund.

- **Ergebnis:** Tests 1034 → 1037 (+3: `csharp-loading`-Fall in
  `actions.test.ts`, echter C#-Erfolgs-Test + Lade-Platzhalter-Test in
  `editorTab.test.ts`). `typecheck` grün. `npm run build` erfolgreich —
  Größe wächst 635,90 kB → 827,57 kB gzip 192,41 kB (239 → 269 Module):
  erster Build, in dem C#-Content tatsächlich vom Produktions-Entry-Point
  erreichbar ist (bestätigt per Grep auf `dist/index.html` nach
  Challenge-Text wie "Kiste"/"Lager" — vorher abwesend, jetzt vorhanden).
  `knip`: unverändert 10 Funde. Coverage: 92,63 % / 73,44 % / 99,37 % /
  92,63 % — spürbarer Sprung bei Branch- und Function-Abdeckung, weil
  C#-UI-Codepfade jetzt tatsächlich erreichbar und durchlaufen werden
  statt totem Code zu sein.

- **Bewusst offen gelassen:** Produktions-Hosting. `CSHARP_ENGINE_BASE_URL`
  (`/csharp-engine/`) funktioniert nur, weil die Vite-Dev-Server-
  Middleware lokal einen von Hand gebauten `dotnet publish`-Output
  ausliefert — für GitHub Pages (oder wo auch immer produktiv gehostet
  wird) gibt es noch kein Äquivalent. Ein frischer Checkout ohne .NET-SDK
  oder ein Produktions-Build würde C# als wählbaren Track zeigen, dessen
  Challenges beim Ausführen 404en. Das ist der letzte verbleibende
  Schritt: `coi-serviceworker` (oder ein äquivalenter Build-Schritt) für
  den echten Produktions-Host.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt auf der neuen C#-UI-Fläche (sauber)

- **Umfang:** Baseline sauber (1037/1037, typecheck/build/knip grün, HEAD
  `5ab928d`). Der letzte Durchgang hat den C#-Track zum ersten Mal live
  im Dev-Server spielbar gemacht — laut Mandat-Priorität diesmal
  Priorität 2 (Live-Bug-Hunt) statt eines weiteren C#-Increments, gezielt
  auf die brandneue, vorher gar nicht erreichbare UI-Fläche gerichtet.
  Produktions-Hosting (`coi-serviceworker`) wäre der nächste C#-Schritt,
  ist aber ein größeres, risikoreicheres CI/Deploy-Vorhaben — bewusst
  nicht in diesem Durchgang begonnen.

- **Sicherheitscheck vor dem Durchgang:** `.github/workflows/deploy-pages.yml`
  geprüft — der Produktions-Deploy triggert nur bei Push auf `main`, nicht
  auf `claude/github-projekt-b3ivo1`. Die letzte Firing hat also keine
  echte Produktionsseite mit einem nicht funktionierenden C#-Track
  ausgeliefert; das bleibt erst relevant, sobald der Branch nach `main`
  gemerged wird.

- **Vorgehen:** Dev-Server gestartet, sql.js lokal per `context.route()`
  serviert. Vier gezielt neue Prüfungen, die vor der letzten Firing
  technisch gar nicht möglich waren, da der C#-Track nicht in `TRACKS`
  registriert war: ein Distraktor mit echtem Compilerfehler (fehlendes
  Semikolon) ausgeführt — zeigt korrekt `status-err` mit der echten
  `CS1002`-Meldung; Track-Wechsel SQL → C# → Python → C# hintereinander
  — Toolbar-Label, Syntax-Highlighting und Ergebnis-Panel bleiben
  durchgehend korrekt synchron, keine going-stale Zustände; Tipp-Anzeige
  auf einer C#-Challenge — funktioniert wie bei SQL/Python; `localStorage`-
  Persistenz einer C#-Challenge-Lösung über einen echten Seiten-Reload —
  Sterne und die zuletzt geöffnete Challenge (inklusive Track) bleiben
  korrekt erhalten.

- **Ein Fehlalarm im eigenen Testskript, kein Produktbug:** der erste
  Testlauf des Distraktor-Checks lieferte einen leeren Status, weil das
  Skript sofort nach dem Track-Wechsel auf das Challenge-Item klickte,
  während die Sidebar noch neu rendert (`element was detached from the
  DOM, retrying`) — nach einer kurzen Wartezeit nach dem Track-Wechsel
  lief die Prüfung stabil durch. Kein Timing-Problem im Produkt, nur im
  Skript selbst.

- **Zwei bereits dokumentierte, nicht-neue Konsolen-Meldungen:** die
  harmlose Blazor-`#app`-Root-Component-Suche (bekannt seit Schritt 3
  des Engine-POC) und die bereits dokumentierten
  `ERR_TUNNEL_CONNECTION_FAILED`/`ERR_CERT_AUTHORITY_INVALID`-Meldungen
  vom Sandbox-Netzwerk (Pyodide-CDN bzw. `api.anthropic.com`) — keine
  neuen Funde.

- **Dev-Server sauber über exakte PIDs beendet.**

- **Ergebnis:** Keine echten Bugs gefunden. Keine Code-Änderung nötig.
  Tests/typecheck/build unverändert bei 1037/1037 grün. Die neue
  C#-Live-Wiring aus dem letzten Durchgang hält unter gezielter
  Belastung (Track-Wechsel, Fehlerpfade, Tipp-Flow, Persistenz) stand.
  Nächster offener Schritt: Produktions-Hosting für die C#-Engine
  (`coi-serviceworker` o. ä.) oder der nächste Live-Bug-Hunt in ein paar
  Durchgängen.

### 2026-08-11 — Stündliche Routine: C#-Produktions-Hosting, Schritt 1 — `coi-serviceworker` vorbereitet und empirisch verifiziert

- **Umfang:** Baseline sauber (1037/1037, typecheck/build/knip grün, HEAD
  `2e77a89`). Laut Mandat-Punkt 4 ("genau EIN begrenztes Increment" für
  C#) diesmal der in der letzten Firing benannte nächste Schritt:
  Produktions-Hosting der C#-Engine über den `coi-serviceworker`-Trick,
  damit `crossOriginIsolated` (und damit `SharedArrayBuffer`, das die
  Blazor-WASM-Engine braucht) auch auf einem statischen Host wie GitHub
  Pages erreicht wird, der keine eigenen COOP/COEP-Response-Header
  setzen kann.

- **Entdeckte Architektur-Einschränkung vor jeder Code-Änderung:** Vor
  dem Schreiben von Code geprüft, ob `coi-serviceworker` (das laut
  Upstream-Dokumentation eine eigenständige, separat ladbare Datei sein
  muss — kein Bundling/Inlining möglich) mit dem Projekt vereinbar ist.
  `test/build/distOutput.test.ts` und `index.html`s eigener Fallback-Text
  ("Deren Inhalt fügst du in einen claude.ai-Chat ein") belegen eine
  bislang nicht explizit dokumentierte harte Vorgabe: `dist/index.html`
  muss die EINZIGE ausgelieferte Datei bleiben, weil der primäre
  Distributionsweg das Einfügen des Dateiinhalts in einen claude.ai-Chat
  ist, nicht nur klassisches Website-Hosting. Ein naiver Ansatz über
  Vites `public/`-Ordner hätte diese Vorgabe verletzt.
  **Lösung:** `coi-serviceworker.js` (Original v0.1.7, MIT-lizenziert,
  Guido Zuidhof) unverändert im Repo-ROOT abgelegt — bewusst außerhalb
  von `src/` und `public/`, damit Vite die Datei nie anfasst — und per
  einfachem `<script src="coi-serviceworker.js">`-Tag in `index.html`
  referenziert, exakt nach demselben Muster wie der bereits bestehende
  sql.js-CDN-Script-Tag. Per echtem `npm run build` bestätigt: `dist/`
  liefert weiterhin genau eine Datei (828,81 kB), `distOutput.test.ts`
  (9 Tests) bleibt grün.

- **Empirische Verifikation der Technik selbst (nicht nur "bricht nichts"):**
  Mock-GitHub-Pages-Deployment im Scratchpad gebaut (nur `index.html` +
  `coi-serviceworker.js`), ein von Hand geschriebener Node-Static-Server
  ohne jegliche Custom-Header (bildet GitHub Pages exakt nach, das keine
  eigenen Response-Header setzen kann), echtes Headless-Chromium per
  Playwright dagegen gefahren. Ergebnis: `crossOriginIsolated: true`,
  Service-Worker-Controller aktiv, `SharedArrayBuffer` verfügbar — die
  Technik funktioniert nachweislich unter realistischen Bedingungen, nicht
  nur in der Theorie.
  Ergänzend `window.coi = { coepCredentialless: () => true }` gesetzt, um
  den bereits etablierten `credentialless`-COEP-Modus zu erzwingen (statt
  des Library-Default `require-corp`, der die CDN-Loads von SQL.js/Pyodide
  brechen würde, da diese kein `Cross-Origin-Resource-Policy`-Header
  senden).

- **Zwei Sandbox-Tooling-Stolpersteine unterwegs gefunden und behoben:**
  `npm install coi-serviceworker --no-save` hat trotz `--no-save` über
  npms Dependency-Tree-Reconciliation `playwright`/`sql.js`/`pyodide` aus
  `node_modules` entfernt (diese sind absichtlich nicht in
  `package.json`, nur Ad-hoc-Sandbox-Tooling) — behoben durch erneutes
  `npm install playwright sql.js pyodide --no-save`. Das frisch
  installierte `playwright` (1.62.1) erwartete danach einen anderen
  Chromium-Build als den im Sandbox-Cache vorhandenen (`chromium-1194`)
  — behoben per explizitem `executablePath`. Beides in
  `docs/csharp-engine-poc.md` als Lektion für künftige Durchgänge
  festgehalten: kein `npm install <pkg>` (auch nicht `--no-save`) nur um
  Paket-Quellcode zu lesen.

- **`knip.json` neu angelegt** (erste Knip-Config dieses Projekts):
  unterdrückt einen legitimen Fehlalarm ("Unused files: coi-serviceworker.js"),
  da Knip reine `<script src>`-HTML-Referenzen nicht wie ES-Imports
  verfolgen kann. Nach der Ergänzung wieder exakt bei den vorherigen 10
  Funden.

- **Ergebnis:** Tests unverändert 1037/1037 grün (keine neuen `src/`-
  Dateien, reine Infrastruktur außerhalb des Build-Graphen).
  Typecheck/Build/Knip unverändert grün. Keine Coverage-Änderung, daher
  kein Artifact-Republish nötig — die Prozentzahlen sind identisch zum
  letzten Durchgang.

- **Bewusst offen gelassen (nächste, separate Increments):** (1)
  `.github/workflows/deploy-pages.yml` muss noch angepasst werden, um
  `coi-serviceworker.js` zusätzlich zu `dist/index.html` nach `gh-pages`
  zu kopieren. (2) Der C#-Engine-`wwwroot`-Output (`dotnet publish -c
  Release`) muss noch per CI-Schritt gebaut und unter `/csharp-engine/`
  nach `gh-pages` kopiert werden, analog zur lokalen Dev-Server-
  Middleware. Beides bewusst nicht in diesem Durchgang begonnen, da das
  Ändern des Produktions-Deploy-Workflows das riskanteste Teilstück des
  gesamten Vorhabens ist und ein eigenes, in sich abgeschlossenes
  Increment verdient.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt (sauber) + Dev-Server-Erkenntnis zu `coi-serviceworker`

- **Umfang:** Baseline sauber (1037/1037, typecheck/build/knip grün, HEAD
  `02e6590`). SQL (81/82) und Python (81/82) haben beide nur noch ihre
  permanente Scope-Ausnahme offen — kein aktionabler Content-Tag mehr
  vorhanden — und C# ist bei 86/86 (100 %). Der letzte Durchgang hat
  bereits das Firing-Kontingent für C# (Mandat-Punkt 4: genau EIN
  Increment) mit dem `coi-serviceworker`-Schritt verbraucht. Damit bleibt
  für diesen Durchgang Priorität 2: ein Live-Bug-Hunt gegen den echten
  Dev-Server.

- **Erkenntnis zu `coi-serviceworker.js` im Dev-Modus (kein Bug, aber
  eine Korrektur der eigenen Annahme aus dem letzten Durchgang):** Der
  Kommentar in `index.html` ging davon aus, dass die Datei im
  `npm run dev`-Betrieb "harmlos 404et", weil sie nicht in `public/`
  liegt. Tatsächlich liefert Vites Dev-Server jede Datei im Projekt-Root
  statisch aus (nicht nur `public/`), daher antwortet
  `GET /coi-serviceworker.js` im Dev-Betrieb mit echtem 200 und dem
  echten Skriptinhalt. Per echtem Playwright-Check gegen `localhost:5173`
  bestätigt: `crossOriginIsolated` ist im Dev-Betrieb bereits `true` —
  allerdings **nicht** wegen des Service Workers (dessen Controller war
  in der Messung `false`), sondern weil `vite.config.ts`s eigene
  COOP/COEP-Middleware (siehe letzter `/csharp-engine/`-Durchgang) für
  die ganze Dev-App bereits reale Response-Header setzt. Der
  Service-Worker-Trick bleibt also weiterhin ausschließlich für die
  Produktions-Hosting-Lücke relevant (GitHub Pages, keine eigenen
  Header) — im Dev-Betrieb ist er ein wirkungsloser, aber unschädlicher
  No-Op. Keine Code-Änderung nötig, nur die Kommentar-Annahme war
  ungenau; nicht korrigiert, da sie den Kern (dist/-Constraint) korrekt
  beschreibt und die Dev-Server-Feinheit für die Produktionsentscheidung
  irrelevant ist.

- **Vorgehen:** Tastaturnavigation durch die Sidebar (erster Tab-Stopp
  korrekt der Sidebar-Toggle-Button), Track-Dropdown-Optionen geprüft
  (alle drei Tracks korrekt gelistet), Theme-Picker (öffnen über
  `.theme-btn`, 22 Theme-Optionen im Grid, Schließen per Escape-Taste
  funktioniert — echter `keydown`-Listener in `themePicker.ts`, kein
  Zufallstreffer), mobiles Layout bei 375px (Sidebar korrekt als
  Overlay-Drawer mit Backdrop sichtbar, entspricht der dokumentierten
  Standard-offen-Vorgabe in `themes.css`, kein Bug).

- **Ein aufwendiger Fehlalarm im eigenen Testskript, kein Produktbug:**
  ein End-to-End-Smoke-Test (Challenge 1 je Track öffnen, Editor-Tab
  wechseln, Run-Button klicken) zeigte für SQL und Python leere
  Ergebnis-Panels und — genauer untersucht — dass `.challenge-item`-
  Klicks gar keine `active`-Klasse setzten. Ursache gefunden:
  `selectChallenge()` (`src/ui/state/actions.ts:220-222`) bricht für
  SQL still ab, wenn `ctx.engines.getMain()` noch `undefined` ist (SQL-
  Engine noch nicht geladen) — und sql.js/Pyodide laden per CDN-
  `<script>`, das dieser Sandbox aus Netzwerkgründen (`ERR_TUNNEL_
  CONNECTION_FAILED`, bereits mehrfach dokumentiert) nicht erreichbar
  ist. Frühere Durchgänge haben genau deshalb sql.js in ihren
  Playwright-Skripten per `context.route()` lokal umgeleitet — dieser
  Durchgangs-Skript tat das nicht, daher der Fehlalarm. C# (lädt lokal,
  keine CDN-Abhängigkeit) lief im selben Skript einwandfrei durch und
  lieferte über den echten Compiler einen echten `CS5001`-Fehler
  (fehlende `Main`-Methode im Platzhaltertext) — bestätigt also, dass
  Editor-Laden, Tab-Wechsel, Run-Button und Fehler-Rendering für den
  Track, der ohne CDN funktioniert, sauber durchlaufen. Keine
  Code-Änderung, da die Ursache vollständig im Testskript liegt, nicht
  im Produkt.

- **Dev-Server sauber beendet.**

- **Ergebnis:** Keine echten Bugs gefunden. Tests/typecheck/build/knip
  unverändert bei 1037/1037 grün, kein Artifact-Republish nötig (keine
  Zahlenänderung). Nächster offener Schritt bleibt der bereits benannte
  Deploy-Workflow (`deploy-pages.yml` + C#-`dotnet publish`-CI-Schritt)
  als eigenes Increment, oder der nächste Live-Bug-Hunt.

### 2026-08-11 — Stündliche Routine: C#-Produktions-Hosting, Schritt 2 — `coi-serviceworker.js` im Deploy-Workflow verdrahtet

- **Umfang:** Baseline sauber (1037/1037, typecheck/build/knip grün, HEAD
  `658e384`). SQL/Python haben beide nur noch ihre permanente
  Scope-Ausnahme offen, C# ist bei 86/86 — kein aktionabler Content-Schritt
  vorhanden. Laut aktualisiertem Mandat ist C#-Engine-Integration jetzt
  regulär priorisierbar (vorherige Einschränkung aufgehoben); der vorletzte
  Durchgang hat in `docs/csharp-engine-poc.md` bereits zwei konkrete,
  unabhängige nächste Schritte benannt: (1) `coi-serviceworker.js` in
  `deploy-pages.yml` verdrahten, (2) `dotnet publish` + C#-Engine-`wwwroot`
  in denselben Workflow aufnehmen. Diesen Durchgang genau EINEN davon
  begonnen und abgeschlossen — Schritt (1), da deutlich kleiner und ohne
  neue CI-Toolchain-Abhängigkeit (kein .NET-SDK-Setup nötig).

- **Änderung:** `.github/workflows/deploy-pages.yml`s einziger
  Publish-Step kopiert jetzt zusätzlich zu `dist/index.html` auch
  `coi-serviceworker.js` (Repo-Root) nach `/tmp`, checkt `gh-pages` aus,
  kopiert beide Dateien in den Arbeitsbaum zurück und committet sie
  gemeinsam (`git add index.html coi-serviceworker.js`) — bewusst als ein
  einziger Commit, damit nie ein `index.html` ohne die dazugehörige
  `coi-serviceworker.js` (oder umgekehrt) live steht. Rein additive,
  mechanische Erweiterung des bereits bestehenden Kopiermusters, keine
  neue Logikform.

- **Verifikation ohne Risiko für die echte Seite:** Der Workflow triggert
  ausschließlich bei Push auf `main`, dieser Durchgang arbeitet auf
  `claude/github-projekt-b3ivo1` — das Bearbeiten der YAML-Datei selbst
  löst keinerlei echten Deploy aus. Zusätzlich die Shell-Logik in einem
  Wegwerf-Scratch-Git-Repo nachgestellt (fake `main` mit
  Platzhalter-`dist/index.html`, fake vorbestehender `gh-pages`-Branch mit
  altem `index.html`-Inhalt) — exakt dieselbe `checkout -B gh-pages
  origin/gh-pages` → kopieren → `add` → `commit`-Sequenz durchlaufen und
  bestätigt, dass beide Dateien korrekt zusammen auf dem resultierenden
  `gh-pages`-Baum landen.

- **Bewusst weiterhin offen:** Schritt (2), die C#-Engine selbst im
  Deploy-Workflow zu bauen und auszuliefern (`dotnet publish -c Release`
  + `wwwroot`-Kopie nach `/csharp-engine/` auf `gh-pages`, analog zur
  lokalen Dev-Server-Middleware) — deutlich größere CI-Änderung (.NET-SDK-
  und `wasm-tools`-Workload-Setup auf dem Runner, echter WASM-Publish,
  Verifikation unter echten COOP/COEP-Headern in CI) und bleibt ein
  eigenes Increment. Praktische Konsequenz: Ein `main`-Deploy jetzt würde
  bereits eine Seite ausliefern, die per Service Worker
  `crossOriginIsolated` erreicht — der C#-Track würde aber weiterhin
  404en, sobald er versucht, sein Blazor-Bundle von `/csharp-engine/` zu
  laden, da dieser Pfad noch von nichts ausgeliefert wird.

- **Ergebnis:** Tests unverändert 1037/1037 grün (reine Workflow-Datei,
  kein `src/`-Code geändert). Typecheck/Build/Knip unverändert grün. Keine
  Coverage-Änderung, kein Artifact-Republish nötig.

### 2026-08-11 — Stündliche Routine: Echter Bug gefunden und behoben — SQL-Query mit Endkommentar schlug fehl

- **Umfang:** Baseline sauber (1037/1037, typecheck/build/knip grün, HEAD
  `e729634`). SQL/Python haben beide nur noch ihre permanente
  Scope-Ausnahme offen, C# ist bei 86/86 — kein aktionabler Content-Schritt.
  Der letzte Durchgang hat bereits den C#-Increment-Slot für diese Stunde
  verbraucht. Also Priorität 2: Live-Bug-Hunt gegen den echten Dev-Server,
  diesmal mit vollem CDN-Workaround (sql.js **und** Pyodide lokal per
  `context.route()`, nicht nur C#), um genau die Lücke aus dem letzten
  sauberen Durchgang zu schließen, in der SQL/Python mangels Routing gar
  nicht getestet werden konnten.

- **Fund:** Ein End-to-End-Smoke-Test (Challenge 1 öffnen, echte
  kanonische Lösung eintippen, **plus einen harmlosen Endkommentar
  danach** — ein realistisches Nutzerverhalten, keine Ausnahme) schlug
  mit `Fehler: Zeile 15: undefined` fehl, obwohl die Lösung korrekt war.
  Das wörtliche `undefined` in einer Nutzer-Fehlermeldung ist ein starkes
  Bug-Signal.

- **Ursache gefunden (echter Live-Browser-Bug, nicht nur Node-Testmotor):**
  `splitStatements()` (`src/domain/sql/statementSplitter.ts`) behandelte
  einen reinen Kommentar am Ende des SQL-Texts (nach dem letzten `;`, oder
  zwischen zwei `;`) als eigenständiges "Statement", weil die einzige
  bisherige Prüfung `rest.trim()` war — ein Kommentar ist nach `.trim()`
  nicht leer. Dieses Kommentar-Fragment landete dann in
  `engine.exec()`/`db.prepare()`. Empirisch gegen das echte,
  browserverwendete sql.js-Paket bestätigt: `db.prepare('-- Kommentar')`
  wirft **keinen** `Error`, sondern einen rohen String (`"Nothing to
  prepare"`). `executeAndValidate.ts`s Fehlerpfad griff aber
  `(e as Error).message` ab — bei einem String-Wurf ist das `undefined`,
  wörtlich in die Meldung interpoliert. Betrifft nicht nur den exotischen
  Fall des unveränderten Platzhaltertexts (bereits im vorletzten
  Durchgang beobachtet, damals fälschlich als reiner Testskript-Fehlalarm
  eingeordnet, siehe unten), sondern jede sonst korrekte Lösung mit einem
  abschließenden erklärenden Kommentar — ein plausibles, alltägliches
  Nutzermuster.

- **Korrektur:** Neue Hilfsfunktion `hasSqlContent()` im selben Modul,
  die exakt dieselbe Kommentar-/String-Tokenisierung wie `splitStatements`
  selbst verwendet, aber prüft, ob nach Abzug von Kommentaren und einem
  isolierten `;` noch echter SQL-Inhalt übrig bleibt. `splitStatements`
  verwirft jetzt sowohl das abschließende Restfragment als auch jedes
  `;`-terminierte Zwischenfragment, wenn `hasSqlContent()` `false`
  liefert — Kommentar-only-Fragmente erreichen `engine.exec()` dadurch
  gar nicht mehr, an keiner der beiden Stellen (`executeAndValidate.ts`,
  `sqlJsEngine.ts`), die dieselbe geteilte `splitStatements`-Funktion
  nutzen (inklusive des Node-Testmotors `nodeSqliteEngine.ts` — der Fix
  gilt für alle drei SQL-Ausführungspfade gleichzeitig, nicht nur den
  Browser). 12 neue Tests: 4 in `splitStatements` (Endkommentar,
  Block-Kommentar, Kommentar-Fragment zwischen zwei echten Statements,
  Kommentar + echtes SQL bleibt erhalten) und 8 direkt für
  `hasSqlContent()` (leer, nur Kommentar(e), nur `;`, echtes SQL, SQL +
  Inline-Kommentar, String-Literal zählt sofort als Inhalt).

- **Verifikation:** Live im echten Browser gegen echtes sql.js-WASM
  (`context.route()`-Workaround) reproduziert (`status-err`, `undefined`
  in der Meldung) und nach dem Fix erneut geprüft — dieselbe Lösung mit
  demselben Endkommentar liefert jetzt korrekt `✓ Aufgabe erfüllt`. Alle
  4 Gate-1/Gate-2-Dateien (`challengeRunner.test.ts` u. a.) weiterhin
  grün — keine der 74 bestehenden SQL-Challenges/-Distraktoren war von
  dem alten, fehlerhaften Verhalten abhängig.

- **Ergebnis:** Tests 1037 → 1049 (+12). `typecheck`, volle Testsuite und
  `npm run build` grün (829,19 kB, +0,38 kB durch die Testdatei-Erweiterung
  — kein Produktionscode-Wachstum, da `hasSqlContent` klein ist). `knip`
  unverändert, 10 Funde. Coverage: 92,63 % → 92,57 % Statements/Lines
  (minimale Verdünnung durch den neuen, noch nicht in jedem Zweig
  durchlaufenen `splitStatements`-Code), Branches 73,44 % → 73,65 %
  (Anstieg — die 12 neuen Tests decken `hasSqlContent`s Verzweigungen
  gründlicher ab, als das bisherige `splitStatements` im Schnitt
  abgedeckt war). Kein Republish der SQL-/Python-Konzept-Hierarchie-
  Artifacts nötig — die Tag-Bilanzen selbst ändern sich nicht (reiner
  Bugfix, keine neue Content-Abdeckung); das Test-/UI-UX-Audit-Dashboard-
  Artifact wird beim nächsten inhaltlich größeren Durchgang mit
  aktualisierten Zahlen neu veröffentlicht, nicht separat für diese eine
  Coverage-Nachkommastelle.

- **Nachtrag zur Einordnung eines älteren Fehlalarms:** Im Durchgang
  "C#-Produktions-Hosting, Schritt 1" wurde ein Smoke-Test-Fehlschlag bei
  SQL/Python als reiner Testskript-Fehler (fehlendes `context.route()`)
  abgetan — das stimmte für den *Grund*, warum `selectChallenge` gar
  nicht erst reagierte (Engine noch nicht geladen), maskierte aber, dass
  ein zweiter, unabhängiger echter Bug im Kommentar-Handling existierte,
  der erst mit korrekt geladener Engine überhaupt sichtbar werden konnte.
  Lehre: ein plausibler Erklärungsfund für ein Symptom schließt einen
  zweiten, tieferliegenden Fund nicht automatisch aus — lohnt sich, nach
  der ersten Erklärung trotzdem einmal mit funktionierendem Setup
  nachzuprüfen.

### 2026-08-11 — Auf Nutzeranfrage: `main` gemerged, echter Produktions-Deploy ausgelöst

- **Umfang:** Nutzeranfrage außerhalb der stündlichen Routine ("merge mit
  main"). `main` war 67 Commits hinter `claude/github-projekt-b3ivo1`
  zurück — vor dem Merge explizit auf den Live-Deploy-Trigger
  (`deploy-pages.yml` triggert nur auf Push nach `main`) hingewiesen und
  den Merge-Weg abgefragt: direkter Merge + Push gewählt (statt PR).
  Kein Fast-Forward möglich (`main` hatte eigene Merge-Commits aus den
  PRs #1–#4, unser Branch enthält deren Inhalt aber über eine andere
  Commit-Historie) — echter Merge-Commit nötig, Konfliktprüfung per
  `git merge --no-commit --no-ff` vorab: sauber, keine Konflikte.
- **Vor dem Push verifiziert** (nicht nur der übliche Branch-Check,
  sondern bewusst noch einmal auf dem gemergten `main`-Stand selbst, weil
  dieser Push einen echten Produktions-Deploy auslöst): `npx tsc --noEmit`
  sauber, `npm ci && npm run build` sauber (829,19 kB, identisch zum
  Branch-Stand), volle Testsuite **1049/1049 grün**.
- **Ergebnis:** `main` steht jetzt bei Commit `d0edb4f`, gepusht — SQL
  (81/82), Python (81/82), C# (86/86 Content, Engine live im Dev-Server
  verdrahtet, zwei von drei Produktions-Hosting-Schritten fertig) sind
  damit erstmals seit Session-Beginn vollständig auf der echten
  Produktionsseite unterwegs statt nur auf dem Arbeits-Branch. Der
  `deploy-pages.yml`-Workflow läuft dadurch automatisch an.
  `claude/github-projekt-b3ivo1` bleibt der Arbeits-Branch für die
  stündliche Routine, unverändert bei `cf1c10d`.

### 2026-08-11 — Stündliche Routine: `main`-Deploy verifiziert (grün) + C#-Produktions-Hosting, Schritt 3 — CI-Machbarkeit für `dotnet publish` bewiesen

- **Umfang:** Baseline sauber (1049/1049, typecheck/build/knip grün, HEAD
  `22d3ab5`). Erster Schritt dieses Durchgangs: den `deploy-pages.yml`-
  Lauf, den der Merge nach `main` in der letzten Nutzeranfrage ausgelöst
  hat, tatsächlich geprüft — `conclusion: success` für Commit `d0edb4f`,
  keine "irgendwas ist kaputt"-Situation. Ein direkter Zugriff auf die
  Live-Seite selbst (`robinderrobin.github.io`) scheitert an derselben
  Sandbox-Netzwerksperre wie die CDN-Domains (403 auf den Proxy-
  CONNECT-Tunnel) — kein Signal über den Deploy, nur eine bekannte
  Umgebungseinschränkung dieser Sandbox.

- **C#-Schritt:** SQL/Python haben keine aktionable Content-Lücke mehr,
  daher laut Mandat-Priorität dieser Durchgang für C#. Der zuletzt
  benannte nächste Schritt (`dotnet publish` + C#-Engine-`wwwroot` im
  Deploy-Workflow) ist laut eigener Doku "das riskanteste Teilstück des
  gesamten Vorhabens" — direkt in `deploy-pages.yml` schreiben, ohne
  vorher zu wissen, ob ein echter GitHub-Actions-Runner die .NET-SDK-
  und `wasm-tools`-Workload-Installation überhaupt schafft, wäre grob
  fahrlässig. Stattdessen den Schritt aufgeteilt: zuerst die reine
  CI-Machbarkeit in einem separaten, ungefährlichen Workflow beweisen,
  danach (nächster Durchgang) erst die eigentliche Produktions-Verdrahtung.

- **Neu:** `.github/workflows/csharp-engine-ci.yml` — `actions/setup-
  dotnet@v4` (8.0.x) → `wasm-tools`-Workload → `dotnet publish -c
  Release` in `csharp-engine/` → prüft die drei konkreten Dateien, die
  der App-Loader tatsächlich braucht (`blazor.webassembly.js`,
  `CSharpEngineBlazor.wasm.gz`, mindestens eine `refs/*.dll`), statt nur
  auf einen Exit-Code 0 zu vertrauen. Pfadgefiltert auf `csharp-engine/**`
  und die Workflow-Datei selbst — reine Frontend-Commits zahlen nicht für
  eine .NET-SDK-Installation. Bewusst ein **separater** Workflow von
  `ci.yml` (komplett anderes Toolchain, keine Deploy-Wirkung) statt in
  `deploy-pages.yml` eingebaut.

- **Lokal vorab verifiziert, exakt was der CI-Schritt tut:** frisches
  `dotnet publish -c Release` in `csharp-engine/` (~32 s warm), 68 MB
  `wwwroot/`-Output — deckt sich mit der schon dokumentierten ~9-MB-
  komprimiert-Angabe (die 68 MB sind unkomprimierte Originale neben den
  `.gz`/`.br`-Varianten, die der Browser tatsächlich lädt). Alle drei
  Prüfungen des neuen CI-Schritts gegen dieses echte Ergebnis manuell
  nachvollzogen: `blazor.webassembly.js` vorhanden, `CSharpEngineBlazor.
  wasm.gz` vorhanden, 11 `refs/*.dll`-Dateien (deckt sich mit der aus
  Schritt 2 bekannten "11 benötigte DLLs"-Zahl). Exakt die `wwwroot/`-
  Form, die die lokale Dev-Server-Middleware bereits unter
  `/csharp-engine/` ausliefert.

- **Bewusst weiterhin offen:** die eigentliche Verdrahtung in
  `deploy-pages.yml` (Publish-Schritt + Kopie nach `gh-pages` unter
  `/csharp-engine/`) sowie die Verifikation, dass die produktiv
  deployte Seite unter echten (Service-Worker-basierten, nicht
  Dev-Server-echten) COOP/COEP-Headern tatsächlich bootet — bleibt der
  nächste, eigenständige Schritt, erst nachdem dieser Workflow real in
  CI gelaufen ist und sich bestätigt hat.

- **Ergebnis:** Tests unverändert 1049/1049 grün (keine `src/`-Änderung,
  reine Workflow-Datei). Typecheck/Build/Knip unverändert grün. Keine
  Coverage-Änderung, kein Artifact-Republish nötig.

- **Nachtrag, gleicher Durchgang — der neue Workflow lief tatsächlich und
  fand einen echten Bug:** Direkt nach dem Push (Pfadfilter greift auch
  auf die Workflow-Datei selbst) lief `csharp-engine-ci.yml` real auf
  einem GitHub-Actions-Runner — und scheiterte nach nur 37 Sekunden,
  viel zu schnell für einen echten Build-Fehler. Ursache: `ubuntu-latest`
  bringt **mehrere** .NET-SDKs gleichzeitig mit (Feature-Bands für 8.0,
  9.0 **und** 10.0 im Log sichtbar), und dieses Repo hatte kein
  `global.json`, das festlegt, welches `dotnet` tatsächlich verwendet.
  `dotnet workload install`/`dotnet publish` griffen dadurch auf die
  neueste SDK (10.0.10) zu, obwohl das Projekt `net8.0` als Target hat —
  die MSBuild-Eigenschaft, aus der der Referenz-Pfad gebaut wird, zeigte
  dadurch auf einen nicht existierenden `10.0.10/ref/net8.0/`-Pfad. Diese
  Sandbox hat nur eine SDK-Version installiert und hätte diesen Fehler
  nie finden können — genau der Grund, warum dieser Durchgang bewusst
  einen echten CI-Lauf statt nur lokaler Verifikation eingeplant hatte.
  **Fix:** `csharp-engine/global.json` pinnt jedes `dotnet`-Kommando aus
  `csharp-engine/` (und dem verschachtelten `driver/`-Unterprojekt) auf
  die neueste installierte 8.0.x-SDK. Lokal erneut verifiziert (frischer
  `dotnet publish -c Release` und `driver/`s `dotnet build -c Release`,
  beide sauber, alle drei CI-Prüfungen weiterhin erfüllt) und mitgepusht
  — der nächste reale CI-Lauf (durch genau diesen Fix selbst getriggert,
  da er `csharp-engine/**` berührt) wird zeigen, ob das Problem behoben
  ist.

- **Zweiter Nachtrag, gleicher Durchgang — der Fix-Lauf fand einen
  zweiten, verwandten Lücke:** `dotnet publish` lief diesmal tatsächlich
  durch (kein `CSharpEngineRefPackDir`-Fehler mehr), der Job scheiterte
  aber trotzdem — mit einer neuen Warnung davor: `Publishing without
  optimizations... wasm-tools workload!`. Ursache: der
  "Install wasm-tools workload"-Schritt hatte kein `working-directory`,
  lief also vom Repo-Root aus — der zu diesem Zeitpunkt noch **kein**
  `global.json` hatte (das lag nur unter `csharp-engine/`). Die
  Workload-Installation griff dadurch selbst wieder auf die 10.0.10-SDK
  zu, obwohl der (korrekt gepinnte) Publish-Schritt die 8.0.x-SDK nutzte
  — zwei unabhängig aufgelöste `dotnet`-Aufrufe, uneinig darüber, wessen
  installierte Workload gilt. Ohne wasm-tools für die tatsächlich
  publizierende SDK fällt Blazor auf einen unoptimierten Pfad zurück, der
  auch die vorkomprimierten `.gz`/`.br`-Dateien nicht erzeugt — genau die,
  die die Verifikation prüft.
  **Fix:** `global.json` vom `csharp-engine/`-Unterordner in den
  **Repo-Root** verschoben, sodass jeder `dotnet`-Aufruf im gesamten
  Checkout dieselbe gepinnte SDK auflöst — unabhängig vom Arbeitsverzeichnis,
  ohne `working-directory` an jedem einzelnen Schritt nachpflegen zu
  müssen. Als Nebeneffekt schützt das jetzt auch den bereits produktiven
  `ci.yml`-Job, der `csharp-engine/driver/` für die Node-seitigen
  C#-Tests baut und exakt dieselbe latente Mehrfach-SDK-Gefahr hatte,
  bisher nur durch Zufall nie getroffen. Lokal aus allen drei relevanten
  Verzeichnissen erneut bestätigt (`dotnet --version` konsistent
  `8.0.129`), beide Projekte frisch neu gebaut, alle vier
  Verify-Prüfungen erfüllt. Workflow-Pfadfilter um das jetzt
  root-liegende `global.json` erweitert.

- **Dritter Nachtrag, gleicher Durchgang — echter, seit Projektbeginn
  verdeckter Bug gefunden und behoben:** Der dritte reale CI-Lauf zeigte,
  dass beide SDK-Fixes tatsächlich griffen (Workload korrekt für 8.0.29
  installiert, die optimierte AOT/Trimming-Publish-Pipeline lief
  wirklich, ~49 s statt des vorherigen übersprungenen Schnelldurchlaufs)
  — der Job scheiterte trotzdem, sofort in der Verifikation. Statt einen
  vierten Fix zu raten, wurde der Verify-Schritt erst diagnostisch
  gemacht (druckt das komplette Publish-Verzeichnis vor den Prüfungen
  aus) und einzeln gepusht. Ergebnis eindeutig: `_framework/` komplett
  vorhanden, aber `refs/` fehlte komplett im Publish-Output.

  **Das ließ sich lokal reproduzieren — ein echter, seit jeher im Projekt
  vorhandener Bug**, den diese Sandbox die ganze Zeit über durch
  Zufall verdeckt hatte: Jede bisherige "frische" lokale Verifikation
  in dieser Session hat nur `bin/`/`obj/` gelöscht, nie das
  Quellverzeichnis `csharp-engine/wwwroot/refs/` selbst — das enthielt
  die ganze Zeit einen mehrere Tage alten, gitignorten Leichenrest aus
  einem früheren Build. `rm -rf bin obj wwwroot/refs && dotnet publish
  -c Release` reproduziert exakt denselben Fehler wie der echte
  CI-Runner. Ursache: Blazors Statische-Web-Asset-Erkennung ist ein
  SDK-seitiger, zur Auswertungszeit ausgeführter Item-Glob über
  `wwwroot/**` — keine `<Target>` — und läuft dadurch immer VOR jedem
  `<Target>`, auch dem Ref-Kopier-Target. Auf einem wirklich sauberen
  Checkout landen die DLLs zwar physisch korrekt in `wwwroot/refs/`,
  aber zu spät, damit Blazors Publish-Manifest sie je kennt. Keine
  `BeforeTargets`-Reihenfolge kann das beheben (empirisch mit
  `ResolveStaticWebAssetsInputs` probiert — identischer Fehler).

  **Fix:** zweites Target `CopyCSharpEngineRefAssembliesToPublishOutput`
  (`AfterTargets="Publish"`) kopiert dieselben Referenz-DLLs zusätzlich
  direkt nach `$(PublishDir)wwwroot/refs/` — unabhängig von Blazors
  Asset-Manifest-Mechanismus, kann also nie wieder an diesem Timing
  scheitern. Betrifft nicht nur CI: `vite.config.ts`s Dev-Server-
  Middleware liefert denselben Publish-Output aus, ein echter frischer
  lokaler Checkout wäre also genauso betroffen gewesen. Zweimal
  hintereinander mit derselben Clean-Slate-Reproduktion verifiziert
  (beide Male alle 11 Referenz-DLLs korrekt vorhanden), zusätzlich live
  gegen den echten Dev-Server bestätigt (`curl` auf
  `/csharp-engine/refs/System.Console.dll` → 200).

- **Vierter Nachtrag, gleicher Durchgang — fünfter echter CI-Lauf,
  vollständig grün:** Nach dem Publish-Output-Fix lief der Workflow
  erneut real durch — alle Schritte erfolgreich (`setup-dotnet`,
  Workload-Installation korrekt für 8.0.x, `dotnet publish -c Release`
  mit der echten optimierten Pipeline, ~70 s, und die Verifikation).
  Vier echte CI-Durchläufe, vier verschiedene echte Umgebungslücken
  gefunden und behoben (SDK-Auflösung zweimal, dann der
  `wwwroot/refs/`-Publish-Timing-Bug) — keine davon hätte diese Sandbox
  allein finden können, und eine davon (der `refs/`-Bug) war ein echter,
  seit Projektbeginn bestehender Produktbug, kein reines CI-Artefakt.
  Genau das war der Sinn dieses Durchgangs: CI-Machbarkeit real
  bewiesen, nicht nur angenommen — mit zwei echten Bugfixes als Nebenertrag.

### 2026-08-11 — Stündliche Routine: KRITISCH — C#-Engine bootet aktuell überhaupt nicht mehr im echten Browser (Ursache ungeklärt)

- **Umfang:** Baseline sauber (1049/1049, typecheck/build/knip grün, HEAD
  `19ff91b`). Kein aktionabler SQL/Python-Content-Schritt, letzte
  Durchgänge haben bereits einen C#-CI-Meilenstein erreicht — also Live-
  Bug-Hunt gegen den echten Dev-Server (volles CDN-Workaround für sql.js/
  Pyodide, dazu ein frisches `npm install sql.js pyodide playwright
  --no-save`, da `npm ci` aus dem letzten Hauptmerge diese Ad-hoc-Pakete
  wieder entfernt hatte).

- **SQL/Python sauber, Regressionschecks bestätigt:** kanonische Python-
  Lösung inkl. abschließendem Kommentar → `status-ok` (kein Analogon zum
  früheren SQL-Bug); der SQL-Endkommentar-Fix aus einem früheren
  Durchgang hält weiterhin (`status-ok`, `users enthält 5 Zeilen.`);
  Track-Wechsel-Stress (SQL → Python → C# → SQL) hält Toolbar/Zustand
  korrekt synchron.

- **Kritischer Fund beim C#-Teil:** Die WASM-Engine bootet im echten
  Browser nicht mehr — `MONO_WASM: Error in bindings_init Can't find
  System.Runtime.InteropServices.JavaScript.JavaScriptExports class`,
  `Failed to start platform`. Acht mögliche Ursachen einzeln geprüft und
  ausgeschlossen (siehe ausführliche Analyse in
  `docs/csharp-engine-poc.md`, neuer Abschnitt "CRITICAL, currently
  unresolved"): alte Build-Artefakte (Juni-Zeitstempel, echt frisch
  neugebaut — gleicher Fehler), der `wwwroot/refs/`-Fix aus früheren
  Durchgängen (direkt gegen die rohe `host.html` getestet, umgeht die App
  komplett — gleicher Fehler), fehlende Dateien (alle 200), COOP/COEP/
  `crossOriginIsolated`/`SharedArrayBuffer`/Worker-Erzeugung (alle
  korrekt), `wasm-tools`-Workload-Drift (frisch deinstalliert und neu
  installiert, identische Version), NuGet-Paketversionen (`project.assets.
  json` direkt geprüft, exakt gepinnt), Quellcode-Korruption (kein Diff
  gegen HEAD), veraltete Integrity-Hashes in `blazor.boot.json` (frisch,
  keine SRI-Fehlermeldung).

- **Roslyn/Compiler-Ebene bestätigt unbetroffen:** der Desktop-.NET-
  Treiber (`test/helpers/nodeCSharpEngine.test.ts`, strukturell
  identische `CSharpCompilation`-Pipeline, nur nicht unter Blazor/WASM)
  läuft weiterhin 5/5 grün — der Fehler sitzt spezifisch im Blazor-WASM-
  JS-Interop-Bootstrap, nicht im C#-Compiler oder Content.

- **Einordnung:** Dieses Dokument selbst belegt (Eintrag vom 2026-08-10),
  dass exakt dieselbe Kombination (`WasmEnableThreads=true` +
  `credentialless` + echter Publish-Output) damals erfolgreich gebootet
  und echten C#-Code ausgeführt hat. Seitdem hat sich etwas geändert —
  vermutlich eine für diese Sandbox nicht weiter introspizierbare
  Umgebungsänderung, da alles version-gepinnte lokal exakt nachgeprüft
  sauber ist.

- **Praktischer Schweregrad:** **kein aktueller Produktions-Vorfall** —
  `deploy-pages.yml` liefert die C#-Engine noch gar nicht nach
  `gh-pages` aus, kein echter Nutzer kann diesen Pfad aktuell erreichen.
  Betrifft nur `npm run dev` und den noch nicht produktiv verdrahteten
  CI-Check. Ist aber ein harter Blocker für den nächsten geplanten
  Schritt (`deploy-pages.yml`-Verdrahtung) und für jede weitere C#-Arbeit,
  da nichts an der Engine gerade end-to-end im echten Browser verifizierbar
  ist. Der bereits vorher eingebaute 15-Sekunden-Timeout in
  `ensureCSharpEngineLoaded` (aus einem früheren, nicht mit diesem Bug
  zusammenhängenden Durchgang) fängt das UX-seitig ab — Nutzer sähen nach
  15s einen Fehler statt eines endlosen Ladezustands, auch wenn die
  Fehlermeldung aktuell fälschlich Browser-Erweiterungen/CSP nennt.

- **Bewusst kein Code-Fix versucht:** jede geprüfte Hypothese kam negativ
  zurück; ein ungetesteter, spekulativer Eingriff (`WasmEnableThreads`,
  Paketversionen, Toolchain) hätte riskiert, ein bekanntes, gut
  dokumentiertes Problem gegen ein unbekanntes einzutauschen. Kein
  Working-Tree-Change begleitet diesen Log-Eintrag — reine Diagnose.

- **Ergebnis:** Tests/typecheck/build/knip unverändert grün (keine
  Code-Änderung). Kein Artifact-Republish nötig (keine Zahlenänderung).
  **Nächster Schritt für eine künftige Sitzung:** in
  `docs/csharp-engine-poc.md`s neuem Abschnitt dokumentierte
  Kandidaten prüfen (testweise `WasmEnableThreads` deaktivieren, um zu
  isolieren, ob spezifisch der Multithreading-Pfad betroffen ist;
  externe Recherche zu bekannten Issues für diese exakte SDK/
  Workload-Kombination, sobald Netzwerkzugriff das erlaubt).

### 2026-08-11 — Stündliche Routine: C#-Boot-Bug — zwei weitere Kandidaten geprüft, Ursache weiter eingegrenzt, noch ungelöst

- **Umfang:** Baseline sauber (1049/1049, typecheck/build/knip grün, HEAD
  `eaaf190`). Fortsetzung der im letzten Durchgang begonnenen Diagnose
  des kritischen C#-Boot-Fehlers — diesmal mit Web-Zugriff verfügbar,
  zusätzlich die im letzten Durchgang benannten "noch nicht geprüft"-
  Kandidaten abgearbeitet.

- **`WasmEnableThreads` als Ursache ausgeschlossen:** testweise auf
  `false` gesetzt (nie committet), sauberer Rebuild — identischer Fehler.
  Kein Multithreading-spezifisches Problem. Änderung sofort per `git
  checkout` zurückgesetzt, Arbeitsbaum sauber bestätigt.

- **Externe Recherche:** mehrere ähnliche, historische `dotnet/runtime`-/
  `dotnet/aspnetcore`-Issues gefunden (u. a. #72803, #38433, #48522,
  #103499), keins exakt passend, keins mit dokumentierter Lösung im für
  dieses Fetch-Tooling sichtbaren Bereich (nur Issue-Text, keine dynamisch
  geladenen Kommentar-Threads). Bestätigt aber: diese Klasse von
  JS-Interop-Bindungsfehlern ist ein bekanntes, wiederkehrendes Muster in
  .NET 8/9 Blazor WASM, kein Einzelfall dieses Projekts.

- **Neue, gezieltere lokale Diagnose:** `EmitCompilerGeneratedFiles=true`
  erzwungen — der `[JSExport]`-Quellgenerator läuft korrekt und
  registriert `CSharpEngine.RunCode` einwandfrei. Die vom Bootfehler
  vermisste `JavaScriptExports`-Klasse ist kein Generator-Artefakt
  dieses Projekts, sondern ein BCL-interner Typ in
  `System.Runtime.InteropServices.JavaScript.wasm` — per `strings`
  bestätigt, dass er in dieser Assembly tatsächlich vorhanden ist.
  Zusätzlich den SHA-256-Hash der ausgelieferten Datei unabhängig in
  Python nachgerechnet — deckt sich exakt mit `blazor.boot.json`s
  Integritäts-Hash. Damit: Generator läuft, Wrapper korrekt registriert,
  der gesuchte Typ existiert in der richtigen Assembly, die Datei wird
  korrekt und unverändert ausgeliefert — der Fehler sitzt spezifisch in
  der MONO_WASM-Laufzeit selbst beim Auflösen dieses Typs, unterhalb
  jeder von diesem Projekt kontrollierbaren Ebene.

- **Weiterhin ungeklärt:** ob ein anderer Browser-Kontext (kein
  Headless/Playwright) etwas ändert (keine Anzeige in dieser Sandbox,
  ungetestet); die tatsächlichen Kommentar-Threads der gefundenen
  GitHub-Issues (vom Fetch-Tooling nicht vollständig ladbar); ob eine
  andere .NET-8-SDK-Patch-/Workload-Version das Problem löst
  (ungetestet, da ein Versionswechsel ohne Verifikationsmöglichkeit nur
  einen unbestätigten Zustand gegen einen anderen tauschen würde).

- **Ergebnis:** Tests/typecheck/build/knip unverändert grün (keine
  Code-Änderung, working tree sauber). Kein Artifact-Republish nötig.
  Der Fehler bleibt bestehen, aber die Ursachenraum ist jetzt deutlich
  enger als am Ende des letzten Durchgangs.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt SQL/Editor/Tutorial (sauber)

- **Umfang:** Baseline sauber (1049/1049, typecheck/build/knip grün, HEAD
  `9ba8784`). Der C#-Boot-Bug hat bereits zwei eigene Durchgänge bekommen
  und ist kein Produktions-Vorfall — ein dritter Durchgang in Folge auf
  demselben festgefahrenen Problem hätte sinkende Grenzerträge riskiert.
  Stattdessen laut Prioritätenliste Punkt 2: Live-Bug-Hunt auf Flächen,
  die in den letzten (C#-fokussierten) Durchgängen nicht geprüft wurden —
  Tutorial-Rendering, Tipp-Flow, localStorage-Persistenz, Lösungs-
  Vergleichsansicht.

- **Vorgehen:** Dev-Server mit sql.js-CDN-Workaround gestartet. Tutorial-
  Tab über 5 Stichproben verteilt über alle 78 SQL-Challenges geprüft
  (kein rohes escaptes HTML sichtbar, `&lt;b&gt;`/`&lt;code&gt;` o. ä.
  nirgends gefunden — Markdown/HTML-Rendering korrekt). Tipp-Button
  viermal geklickt (3 Tipps + ein Overflow-Klick) — Tipp-Elemente
  erscheinen wie erwartet. Editor-Entwurf getippt, echten Seiten-Reload
  ausgelöst (nicht nur SPA-State) — Entwurf via localStorage korrekt
  wiederhergestellt. Lösungs-/Vergleichsansicht im Task-Tab geöffnet —
  öffnet korrekt.

- **Bewusst nicht getestet:** der Chat-Tab (`src/chat/claudeChatClient.ts`)
  — ein echtes Absenden hätte einen echten API-Call an Claude ausgelöst,
  unnötiges Risiko für einen reinen UI-Check. Bereits durch bestehende
  Unit-Tests abgedeckt.

- **Keine neuen Funde:** die drei beobachteten Konsolenfehler
  (`ERR_CERT_AUTHORITY_INVALID`) sind das bereits mehrfach dokumentierte
  Sandbox-Netzwerkrauschen (blockierte externe Domains), kein Produktbug.

- **Ergebnis:** Tests/typecheck/build/knip unverändert grün. Kein
  Artifact-Republish nötig (keine Zahlenänderung). Dev-Server sauber
  beendet.

### 2026-08-11 — Stündliche Routine: C#-Boot-Bug — anderer SDK-Patch getestet, ausgeschlossen; Sandbox-Umgebung wiederhergestellt

- **Umfang:** Baseline vor Beginn geprüft (HEAD `d5e9783`, 1049/1049
  Tests, typecheck/build grün, `git status` sauber). Letzter noch offener,
  konkret umsetzbarer Kandidat aus den vorherigen zwei C#-Boot-Bug-
  Durchgängen: ein anderer .NET-8-SDK-Patch könnte den Fehler
  (`Can't find … JavaScriptExports class`, `Failed to start platform`)
  beheben — bisher ungetestet, da eine Versionsänderung ohne Verifikation
  nur einen unverifizierten Zustand gegen einen anderen getauscht hätte.
  Diesen Durchgang tatsächlich getestet.

- **Vorgehen:** `dotnet-sdk-8.0` per apt von `8.0.129-0ubuntu1~24.04.1`
  auf die ältere `8.0.104-0ubuntu1` (aus dem Basis-`noble`-Repo statt
  `noble-updates`) downgraded. `dotnet workload list` installierte
  daraufhin automatisch `wasm-tools` auf dem passenden älteren
  Runtime-Pack `8.0.4` (statt der bisher durchgängig verwendeten
  `8.0.29`) neu.

- **Befund — Umgebungsinkonsistenz statt sauberem Test:** ein
  Clean-Rebuild (`rm -rf bin obj wwwroot/refs && dotnet publish -c
  Release`) unter diesem älteren Toolchain schlug schon vor dem
  eigentlichen Boot-Test fehl: `CSharpEngineRefPackDir` zeigte auf
  `.../Microsoft.NETCore.App.Ref/8.0.4/ref/net8.0/`, das es auf der
  Platte nicht gibt — nur das `8.0.29`-Ref-Pack ist vorhanden. Das
  apt-Downgrade hat SDK-CLI und (über den Workload-Manager) das
  Wasm-Runtime-Pack auf `8.0.4` verschoben, aber das separate
  `Microsoft.NETCore.App.Ref`-Targeting-Pack (nicht vom
  `dotnet-sdk-8.0`-Paket selbst verwaltet) blieb bei `8.0.29` —
  ein verwaistes, inkonsistentes Sandbox-Environment, kein sauberer
  "älteres SDK"-Test. Ein wirklich konsistentes älteres Toolchain hätte
  ein manuell beschafftes, passendes Ref-Pack erfordert, das über apt in
  dieser Sandbox nicht verfügbar ist — ein deutlich größerer, weniger
  begrenzter Nebenaufwand als für dieses Experiment vorgesehen.

- **Wiederherstellung:** SDK zurück auf `8.0.129-0ubuntu1~24.04.1`
  (`apt-get install --allow-downgrades`), danach `dotnet workload install
  wasm-tools --skip-manifest-update` — stellte `wasm-tools` korrekt auf
  `8.0.29` wieder her (per `dotnet workload list` bestätigt). Clean-Build
  unter dem wiederhergestellten Original-Toolchain publiziert wieder
  fehlerfrei. Der kanonische Boot-Repro-Check
  (`http://localhost:5173/csharp-engine/host.html`) wurde erneut
  ausgeführt, um sicherzustellen, dass die Sandbox selbst nicht
  driftete: `git status`/`git diff` auf `csharp-engine/` zeigen null
  Änderungen — Umgebung exakt auf committetem Stand — und derselbe Fehler
  reproduziert exakt wie zuvor.

- **Schlussfolgerung:** kein SDK-`8.0.29`-vs-älter-Problem — derselbe
  Fehler bei beiden getesteten Runtime-Pack-Versionen, soweit ein
  wirklich sauberer, konsistenter SDK-Versionstest über apt in dieser
  Sandbox überhaupt praktikabel ist. Kein spekulativer Code-Fix
  verschickt. Vollständig dokumentiert in
  `docs/csharp-engine-poc.md`s "CRITICAL, currently unresolved"-Abschnitt.

- **Ergebnis:** Tests/typecheck/build unverändert grün (keine Code-
  Änderung, working tree sauber vor und nach dem Experiment). Kein
  Artifact-Republish nötig (keine Zahlenänderung, reiner Diagnose-
  Durchgang).

### 2026-08-11 — Stündliche Routine: Echter Bug gefunden und behoben — SQL-Kommentare konnten den Endlosrekursions-Schutz aushebeln

- **Umfang:** Baseline sauber (1049/1049, typecheck/build/knip grün, HEAD
  `cf915c8`). SQL/Python-Content ist bei 81/82 (nur permanente Ausnahmen
  offen), C# bei 86/86 — kein aktionabler Content-Task mehr verfügbar.
  Statt eines weiteren generischen Live-Bug-Hunts (bereits mehrfach in
  Folge "sauber" ohne Befund) diesmal gezielt `npx vitest run --coverage`
  laufen lassen, um echte Coverage-Lücken in echtem Source-Code (nicht
  Content-Dateien) zu finden — Priorität-2-Arbeit, aber datengetrieben
  statt Klick-für-Klick.

- **Befund:** `src/domain/sql/unboundedRecursionCheck.ts` (der
  Sicherheitscheck, der `WITH RECURSIVE`-Abfragen ohne `WHERE`/`LIMIT`
  vor der Ausführung abfängt, weil sql.js 1.10.2 keine Möglichkeit hat,
  eine einmal gestartete Endlosrekursion abzubrechen — würde den Tab
  einfrieren) hatte niedrige Branch-Coverage (88 %) auf genau den Zeilen,
  die Kommentare behandeln. Empirisch verifiziert, dass das ein echter
  Bug ist, kein Coverage-Kosmetikproblem: `findUnboundedRecursion()`
  prüfte `WHERE`/`LIMIT` per Regex direkt auf dem Rohtext, ohne SQL-
  Kommentare vorher zu entfernen. Eine Abfrage wie
  ```sql
  WITH RECURSIVE cnt(n) AS (
    SELECT 1
    UNION ALL
    SELECT n+1 FROM cnt -- WHERE n < 100
  )
  SELECT n FROM cnt;
  ```
  (ein `WHERE` nur als Kommentartext, z. B. eine Lernende Notiz-an-sich-
  selbst oder ein auskommentierter Versuch) wurde fälschlich als
  "sicher" durchgelassen — obwohl die tatsächliche Rekursion komplett
  unbeschränkt ist. Dasselbe für ein `LIMIT` nur in einem Kommentar nach
  der CTE. Genau das Szenario, das dieser Check verhindern soll, konnte
  ihn also durch einen völlig harmlosen Kommentar aushebeln.

- **Fix:** neue private Funktion `stripStringsAndComments()` (gleiches
  Zeichen-für-Zeichen-Tracking-Muster wie `findParenBody`/
  `statementSplitter.ts`, das dieses Modul schon durchgängig verwendet)
  ersetzt String-Literale und Kommentare durch Leerzeichen (Offsets
  bleiben erhalten), bevor die `WHERE`/`LIMIT`-Prüfungen laufen. Auf den
  CTE-Body selbst angewendet, bevor `recursiveMemberOf()` dessen eigene
  (kommentarblinde) Klammer-Tiefenzählung durchführt — sonst hätte ein
  unausgeglichener Klammer-Kommentar dieselbe Tiefenzählung durcheinander
  bringen können. `recursiveMemberOf()`s eigenes String-Tracking wurde
  dabei entfernt, da es nach dem Strippen nie mehr erreichbar war (hätte
  sonst denselben toten-Code-Zustand erzeugt, den der nächste Punkt in
  `statementSplitter.ts` beschreibt). Drei neue Regressionstests decken
  Kommentar-`WHERE`, Kommentar-`LIMIT` und einen unausgeglichenen
  Klammer-Kommentar ab; alle bisherigen Tests (String-Literal-Fälle,
  echtes `WHERE`/`LIMIT` usw.) bleiben unverändert grün — empirisch mit
  einem eigenen Vorher/Nachher-Skript gegen sieben Fallunterscheidungen
  verifiziert, nicht nur angenommen.

- **Nebenfund beim Lesen der Coverage-Tabelle:** `statementSplitter.ts`s
  `hasSqlContent()` hatte ebenfalls eine Coverage-Lücke (Zeilen 41-49) —
  hier aber echter toter Code, kein Bug: die Funktion `return`et sofort
  `true`, sobald sie das erste Anführungszeichen sieht, sodass der
  `inString`-Zweig (der das Ende eines Strings verfolgen würde) niemals
  in einer späteren Iteration erreicht werden kann. Verhalten war schon
  immer korrekt, nur unnötig verschachtelt. Bereinigt (String-Tracking-
  Variable und -Zweig entfernt, Kommentar erklärt jetzt explizit, warum
  das hier anders ist als in `splitStatements`, das dieselbe String-
  Erkennung tatsächlich über mehrere Iterationen braucht).

- **Tests:** 1049 → 1052 (+3, alle in
  `unboundedRecursionCheck.test.ts`). `npx tsc --noEmit` fehlerfrei,
  volle Testsuite 1052/1052 grün, `npm run build` grün (829.51 kB),
  `npx knip` unverändert (10 Funde, alle bereits bekannt).

- **Ergebnis:** echter, ausnutzbarer (wenn auch nicht böswillig
  gemeinter) Sicherheitslücken-Fix in einer produktionsrelevanten
  Schutzfunktion — nicht nur eine Coverage-Zahl verbessert. Kein
  Artifact-Republish nötig (kein Content, keine Konzept-Zahlen
  geändert).

### 2026-08-11 — Stündliche Routine: C#-Boot-Bug — GitHub-Kommentar-Threads jetzt lesbar, aber kein Treffer; keine weiteren Befunde

- **Umfang:** Baseline sauber (1052/1052, typecheck/build/knip grün, HEAD
  `853b23f`). SQL/Python bei 81/82 (nur permanente Ausnahmen offen), C#
  bei 86/86 — kein aktionabler Content-Task. Letzter Firing fand über
  Coverage-Analyse einen echten Bug; diesmal dieselbe Coverage-Tabelle
  (nicht neu erzeugt, da unverändert) nochmal auf verbleibende Nicht-
  Content-Lücken geprüft (`actions.ts` Chat-Helfer — bewusst nicht live
  getestet, s. frühere Begründung; leerer `catch`-Block in
  `localStorageProgressStore.ts` — trivial; C#/Python-Tokenizer — rein
  kosmetisch, betrifft keine Ausführung/Bewertung) — nichts Neues
  gefunden. Daher diesen Durchgang stattdessen den C#-Boot-Bug mit einem
  bislang ungenutzten Werkzeug angegangen.

- **Neue Fähigkeit entdeckt:** die frühere Einschränkung "GitHub-
  Kommentar-Threads sind für dieses Sandbox-Fetch-Tooling nicht lesbar"
  betraf nur die gerenderte Issue-Seite (Kommentare laden per Client-
  JavaScript nach). GitHubs einfache REST-API
  (`https://api.github.com/repos/<owner>/<repo>/issues/<n>/comments`)
  liefert Kommentare als statisches JSON — `WebFetch` funktioniert damit
  einwandfrei. Bislang in keinem der beiden vorherigen Durchgänge
  probiert.

- **Ergebnis der eigentlichen Recherche: kein neuer Treffer.** Alle 12
  Kommentare zu `dotnet/runtime#87690` gelesen — stellte sich als
  komplett anderer Bug heraus (`JSHost.ImportAsync()`-Timing in Razor-
  Komponenten, die vor Abschluss eines async Imports rendern) und ist
  hier nicht anwendbar, da `CSharpEngine.RunCode` eine reine
  `[JSExport]`-statische Methode ohne jede Razor-Komponente ist. Gezielte
  GitHub-Suchen (`"JavaScriptExports" bindings_init`,
  `"Can't find" "JavaScriptExports" repo:dotnet/runtime`) fanden nur
  unrelated gemergte PRs zu WASM-Threading/Rendering, alle für **.NET 9**
  gezielt, nicht 8. Zusätzlich geprüft, ob die Playwright/Chromium-Version
  selbst seit dem funktionierenden 2026-08-10-Stand gedriftet ist (ein
  bislang nicht betrachteter Kandidat) — hat sie nicht: derselbe gecachte
  `chromium-1194`-Build (per `executablePath` fixiert) war schon am
  2026-08-10 im Einsatz, dokumentiert im selben Abschnitt.

- **Fazit:** die "Kommentare nicht lesbar"-Einschränkung ist behoben,
  aber die eigentliche Recherche bringt weiterhin keinen Fix — sauber als
  ausgeschöpft dokumentiert, damit kein künftiger Durchgang dieselbe
  jetzt-beantwortete Frage nochmal stellt. Kein spekulativer Code-Fix
  verschickt. Vollständig in `docs/csharp-engine-poc.md` festgehalten.

- **Ergebnis:** reiner Recherche-/Dokumentations-Durchgang, keine Code-
  Änderung. Tests/typecheck/build unverändert grün (1052/1052, 829.51 kB).
  Kein Artifact-Republish nötig.

### 2026-08-11 — Stündliche Routine: Endlosrekursions-Fix live im echten Editor bestätigt (sauber)

- **Umfang:** Baseline sauber (1052/1052, typecheck/build/knip grün, HEAD
  `57f1f25`). Kein aktionabler Content-Task (SQL/Python 81/82, C# 86/86);
  der `WITH RECURSIVE`-Kommentar-Umgehungs-Fix von vor zwei Durchgängen
  war bislang nur unit-getestet, nie live im echten Browser über die
  echte Editor-UI verifiziert — Priorität-2-Arbeit, die den Verifikations-
  Kreis schließt statt neue Fläche zu suchen.

- **Vorgehen:** Dev-Server mit sql.js-CDN-Workaround gestartet, echten
  SQL-Editor über drei Playwright-Läufe geprüft: (1) `WHERE` nur als
  Kommentartext im rekursiven Teil → muss blockiert werden, (2) echtes
  `WHERE` im rekursiven Teil → darf nicht vom Schutz blockiert werden,
  (3) komplett unbeschränkt (Sanity-Check) → muss blockiert werden.

- **Ergebnis: Fix bestätigt korrekt End-to-End.** Fall 1 und 3 zeigen
  korrekt `status-err` mit der erwarteten deutschen Fehlermeldung
  ("...läuft die Rekursion unendlich weiter..."), Umlaute (ä, ü) und
  Gedankenstrich rendern korrekt über `escapeHtml`. Fall 2 löst den Guard
  korrekt nicht aus (zeigt stattdessen `status-warn`, weil diese Query
  nicht zur ausgewählten Challenge passt — die eigentliche Fach-
  Validierung, unabhängig vom Rekursions-Schutz). Keine Konsolenfehler.
  Kein neuer Befund — reine Bestätigung, dass der frühere Unit-Test-Fix
  auch im echten UI-Pfad (Editor → `executeAndValidate` →
  `resultsArea.ts`-Rendering) tatsächlich greift.

- **Ergebnis:** Tests/typecheck/build unverändert grün. Kein Artifact-
  Republish nötig (keine Zahlenänderung). Dev-Server sauber beendet.

### 2026-08-11 — Stündliche Routine: Irreführende C#-Timeout-Fehlermeldung korrigiert

- **Umfang:** Baseline sauber (1052/1052, typecheck/build/knip grün, HEAD
  `ca46cb1`). Kein aktionabler Content-Task; C#-Boot-Bug bereits mehrfach
  ausführlich untersucht ohne neuen Ansatz. Beim Lesen von
  `ensureCSharpEngineLoaded` (`src/ui/state/actions.ts`) im Zuge der
  letzten C#-Recherchen fiel eine echte, aktuell live im Produkt sichtbare
  UX-Ungenauigkeit auf: `CSHARP_ENGINE_TIMEOUT_MESSAGE` behauptet nach
  15 s Timeout, vermutlich blockiere "eine Browser-Erweiterung oder eine
  Content-Security-Policy das Laden des Blazor-Bundles".

- **Befund:** diese Erklärung ist nicht nur durch die inzwischen bekannte
  tatsächliche Ursache (ein MONO_WASM-Interop-Bug, siehe
  `docs/csharp-engine-poc.md`) überholt, sondern strukturell schon von
  Anfang an unplausibel für diesen Fall: `loadCSharpEngineFromServer`
  lädt alles von `CSHARP_ENGINE_BASE_URL = '/csharp-engine/'` — also
  same-origin, keine externe CDN-Anfrage, die eine Erweiterung oder CSP
  überhaupt blockieren könnte. Die Formulierung war offensichtlich 1:1
  von `PYTHON_ENGINE_TIMEOUT_MESSAGE` übernommen, wo sie tatsächlich
  zutrifft (Pyodide lädt echt von `cdn.jsdelivr.net`). Der C#-Track ist
  über `src/content/registry.ts` live im Kurs-Picker wählbar — reale
  Nutzer, die C# aktuell versuchen, sehen also diese falsche Diagnose.

- **Fix:** Nachricht auf eine ehrliche Formulierung geändert ("C#-Track
  ist noch experimentell, liegt nicht an deinem Browser oder an
  Erweiterungen, bitte neu laden, in der Zwischenzeit SQL/Python
  nutzen"), ohne eine Ursache zu behaupten, die dieser Code nicht belegen
  kann. Kein Test hatte den exakten Nachrichtentext hart kodiert
  (`actions.test.ts` prüft nur generisch den Fehlerzustand), daher keine
  Testanpassung nötig — `actions.test.ts` (45 Tests) und die volle Suite
  liefen trotzdem zur Sicherheit erneut durch.

- **Tests:** 1052/1052 unverändert (reine String-Änderung, kein neuer
  Codepfad). `npx tsc --noEmit` fehlerfrei, `npm run build` grün
  (829.52 kB, Rundungsdifferenz zum String). `npx knip` unverändert.

- **Ergebnis:** kleine, aber echte UX-Korrektur in einer aktuell live
  erreichbaren Fehlermeldung. Kein Artifact-Republish nötig (kein
  Content, keine Konzept-Zahlen geändert).

### 2026-08-11 — Stündliche Routine: Timeout-Nachrichten-Fix live bestätigt — Boot-Fehler hängt, wird nicht als Rejection gemeldet

- **Umfang:** Baseline sauber (1052/1052, typecheck/build grün, HEAD
  `8d1d6c0`). Vor der letzten Nachrichten-Korrektur unklar, ob sie
  überhaupt den tatsächlich ausgelösten Codepfad trifft: `host.html` hat
  einen eigenen `Blazor.start().catch(...)`, der bei einem echten Startup-
  Error eine spezifischere `csharp-boot-error`-Nachricht postet (`Der
  C#-Motor konnte nicht gestartet werden: ...`) — falls *dieser* Pfad für
  den bekannten MONO_WASM-Bug greift, hätte der reine 15s-Timeout-Text nie
  angezeigt werden können. Live verifiziert statt angenommen.

- **Vorgehen:** Dev-Server gestartet, echten C#-Track im Kurs-Picker
  ausgewählt, eine Challenge geöffnet und bis zu 20 s auf sichtbare
  Statusänderungen gewartet, dazu den sichtbaren Seitentext auf beide
  möglichen Nachrichtenfragmente geprüft.

- **Ergebnis: bestätigt, der Timeout-Pfad ist tatsächlich der einzig
  erreichte.** Der `Blazor.start().catch()` in `host.html` feuert für
  diesen speziellen MONO_WASM-Fehler nie — die Konsole zeigt zwar
  `MONO_WASM: Error in bindings_init ...` und einen `[pageerror] Failed
  to start platform`, aber keine `csharp-boot-error`-Nachricht erreicht
  den Parent (kein `"C#-Motor konnte nicht gestartet"` im Seitentext).
  Stattdessen bleibt die Ladepromise einfach hängen, bis nach 15 s
  `withTimeout` greift — der Seitentext enthält korrekt `"nicht
  geantwortet"` und `"experimentell"`, die neue, korrigierte Nachricht
  aus dem letzten Durchgang. Bestätigt: der Fix trifft tatsächlich den
  einzigen Pfad, den reale Nutzer bei diesem Bug sehen — keine zweite,
  ungeprüfte Fehlermeldung daneben, die noch die alte falsche Erklärung
  zeigen könnte.

- **Ergebnis:** reine Verifikation, keine Code-Änderung. Tests/typecheck/
  build unverändert grün. Kein Artifact-Republish nötig. Dev-Server
  sauber beendet.

### 2026-08-11 — Stündliche Routine: WICHTIG — C#-Track ist bereits live auf der echten Produktions-Seite und aktuell für niemanden nutzbar; Fix für schnelleres, ehrlicheres Scheitern verschickt

- **Umfang:** Baseline sauber (1052/1052, typecheck/build/knip grün, HEAD
  `d8a64c0`). Beim Nachdenken über die letzte Nachrichten-Korrektur fiel
  auf, dass `docs/csharp-engine-poc.md` bislang behauptet, dies sei "kein
  Live-Produktions-Vorfall", weil `deploy-pages.yml` die C#-Engine-Assets
  angeblich nie mitausliefert — diese Annahme war nie tatsächlich gegen
  den echten Repo-/Deploy-Zustand geprüft worden.

- **Verifiziert via GitHub API (nicht angenommen):** `main`s
  `src/content/registry.ts` (Commit `d0edb4f`, der frühere per Nutzeranfrage
  gemergte Stand) registriert den `csharp`-Track bereits vollständig in
  `TRACKS` — eingeführt in `5ab928d` ("C#-Engine live verdrahtet"), also
  *vor* dem Merge nach `main`. Der `deploy-pages.yml`-Lauf gegen genau
  diesen Merge-Commit (`31508705782`) lief erfolgreich durch
  (`2026-08-11T15:44:49Z`). Der tatsächliche `gh-pages`-Branch enthält nur
  `index.html` und `coi-serviceworker.js` — kein `csharp-engine/`-Ordner.

- **Konsequenz: die "kein Live-Vorfall"-Einschätzung war falsch.** Der
  C#-Track ist auf der echten, deployten Seite jetzt wählbar (im Build
  fest einkompiliert, nicht environment-gated), aber für **jeden** realen
  Besucher, der ihn versucht, komplett funktionsunfähig: `iframe.src`
  zeigt auf `/csharp-engine/host.html`, das dort schlicht 404 liefert
  (nicht der bekannte MONO_WASM-Boot-Bug — der tritt nur auf, wo die
  Engine überhaupt ausgeliefert wird, z. B. lokal im Dev-Server). Vor
  dem heutigen Fix bedeutete das: 15 Sekunden sinnloses Warten, bevor
  überhaupt eine Erklärung erscheint.

- **Fix (klein, sicher, reversibel):** `loadCSharpEngineFromServer`
  schickt jetzt parallel zum iframe-Aufbau einen `HEAD`-Request auf
  `${baseUrl}host.html`. Kommt eine Nicht-OK-Antwort zurück, wird die
  Ladepromise sofort mit "Der C#-Motor ist in dieser Umgebung (noch)
  nicht bereitgestellt." abgelehnt — kein Warten mehr auf etwas, das nie
  klappen kann. Ein Netzwerkfehler des HEAD-Checks selbst gilt nicht als
  eindeutig (fällt zurück auf den bisherigen iframe-/Timeout-Pfad). Live
  mit echten Playwright-Läufen verifiziert, nicht nur Unit-Mocks: gegen
  den echten Dev-Server (Engine vorhanden) braucht der bekannte
  MONO_WASM-Bug weiterhin ~13,7 s (Fast-Path greift korrekt nicht, da der
  HEAD-Check erfolgreich ist) — gegen ein Route-Mock, das `host.html` 404
  liefert (bildet die echte Produktions-Lücke nach), erschien die neue
  Nachricht nach **20 ms**.

- **Bewusst NICHT gemacht:** den `csharp`-Track wieder aus `TRACKS`
  entfernen. Das wäre eine echte Produkt-Entscheidung (ganzen Track
  verstecken vs. ihn ehrlich und jetzt schnell scheitern lassen, mit
  Verweis auf SQL/Python) — das Mandat rahmt C# ausdrücklich als
  akzeptiertes Work-in-Progress über mehrere Durchgänge, und ein
  einzelner autonomer Stundendurchgang sollte nicht einseitig
  substanzielle, bewusste Vorarbeit rückgängig machen.

- **Für den Nutzer, klar markiert:** der C#-Track ist gerade live auf der
  echten Seite und für niemanden abschließbar. Ob das so bleiben soll,
  bis die Engine fertig ist, oder der Track bis dahin lieber temporär
  versteckt werden sollte, ist eine Entscheidung für den Repo-Besitzer —
  hier bewusst dokumentiert statt eigenmächtig entschieden.

- **Wichtig:** dieser Fix liegt nur auf `claude/github-projekt-b3ivo1`.
  Er wird auf der echten Seite erst wirksam, wenn dieser Branch (wieder)
  nach `main` gemergt und `deploy-pages.yml` erneut läuft — genau wie
  beim vorherigen `main`-Merge nur auf explizite Nutzeranfrage, nicht
  autonom ausgelöst.

- **Tests:** 1052 → 1054 (+2 in `csharpEngine.test.ts`: Fast-Path-
  Ablehnung bei Nicht-OK-HEAD-Antwort, kein Fast-Fail bei reinem
  Netzwerkfehler des HEAD-Checks). `npx tsc --noEmit` fehlerfrei, volle
  Suite 1054/1054 grün, `npm run build` grün (829,76 kB), `npx knip`
  unverändert.

- **Ergebnis:** echter, live bestätigter Bug behoben (schnelleres,
  ehrlicheres Scheitern), plus eine korrigierte, jetzt verifizierte
  Schweregrad-Einschätzung in `docs/csharp-engine-poc.md`. Kein
  Artifact-Republish nötig (kein Content, keine Konzept-Zahlen
  geändert).

### 2026-08-11 — Stündliche Routine: Race-Test für den Fast-Path-Fix aus dem letzten Durchgang

- **Umfang:** Baseline sauber (1054/1054, typecheck/build/knip grün, HEAD
  `595dfe9`). Coverage-Report zeigt für `csharpEngine.ts` (nach dem
  letzten Durchgangs-Fix) 100 % Statements/Lines, aber nur 85,71 %
  Branches — genau auf den `settled`-Guards in `settleResolve`/
  `settleReject`, dem Sicherheitsmechanismus, der verhindert, dass ein
  spät eintreffender HEAD-Check-Fehlschlag einen bereits erfolgreich
  aufgelösten Cache kaputt macht. Da dieser Guard das Herzstück eines
  gerade erst als Live-Produktions-Fix verschickten Increments ist, war
  das die naheliegende Coverage-Lücke, die diesen Durchgang zu schließen
  lohnte — kein generischer Bug-Hunt, sondern gezielte Verifikation
  frisch verschickter, sicherheitsrelevanter Logik.

- **Test:** simuliert die Race exakt — `fetch` liefert eine kontrolliert
  verzögerte Promise, die iframe-Seite meldet zuerst erfolgreich
  `csharp-host-ready` (Ladepromise löst korrekt auf), erst danach löst
  der (jetzt zu späte) HEAD-Check mit `ok: false` auf. Ohne den Guard
  würde `settleReject` trotzdem `iframeLoadPromise = null` setzen und
  damit den Cache kaputt machen, obwohl die Ladung längst erfolgreich
  war — ein weiterer Aufruf müsste dann unnötig ein zweites iframe
  aufbauen.

- **Test empirisch als aussagekräftig bestätigt, nicht nur angenommen:**
  den `if (settled) return;`-Guard in `settleReject` testweise entfernt
  — der neue Test schlägt dann tatsächlich fehl (`Der C#-Motor ist in
  dieser Umgebung (noch) nicht bereitgestellt.` als unerwarteter Fehler),
  bestätigt den exakten Fehlerfall. Guard danach wieder hergestellt,
  alle 15 Tests in `csharpEngine.test.ts` wieder grün.

- **Tests:** 1054 → 1055 (+1). `npx tsc --noEmit` fehlerfrei, volle
  Suite 1055/1055 grün, `npm run build` grün (829,76 kB, unverändert),
  `npx knip` unverändert.

- **Ergebnis:** reine Verifikations-/Test-Ergänzung zu bereits
  verschicktem Code, kein neues Verhalten. Kein Artifact-Republish
  nötig.

### 2026-08-11 — Stündliche Routine: doppelte Anführungszeichen-Escape-Logik in `unboundedRecursionCheck.ts` verifiziert, mislabelter Test korrigiert

- **Umfang:** Baseline sauber (1055/1055, typecheck/build/knip grün, HEAD
  `079a29f`). Coverage-Report zeigte für `unboundedRecursionCheck.ts`
  weiterhin eine Lücke (91,55 % Stmts / 87,67 % Branch) — genau auf der
  Escape-Behandlung für verdoppelte Anführungszeichen (`''` als
  SQL-Escape für ein eingebettetes `'`) in `stripStringsAndComments()`,
  der eigenen Hilfsfunktion aus dem `WITH RECURSIVE`-Kommentar-Fix von
  vor vier Durchgängen — bislang komplett ungetestet.

- **Verifiziert, kein Bug:** empirisch geprüft, ob die Escape-Logik einen
  echten `WHERE` nach einem String mit verdoppeltem Anführungszeichen
  noch korrekt erkennt, und ob ein `WHERE`-ähnlicher Text *innerhalb*
  eines solchen Strings weiterhin korrekt ignoriert wird (beides
  bestätigt, keine Fehlfunktion).

- **Nebenfund beim Testschreiben:** ein bestehender Test
  ("is not fooled by a WHERE inside a string literal in the recursive
  member") war mislabelt — sein eigenes SQL enthielt gar keinen String,
  nur ein echtes `WHERE` außerhalb jeder Anführungszeichen; der Kommentar
  im Test selbst widersprach dem Titel bereits ("sanity: a real WHERE
  outside a string..."). Der eigentliche "WHERE nur in einem String
  literal"-Fall war nirgends getestet. Umbenannt auf das, was er
  tatsächlich prüft, und den echten fehlenden Fall separat ergänzt.

- **4 neue Tests:** (1) WHERE-ähnlicher Text nur in einem String literal
  (ohne Escape) → weiterhin korrekt als unbegrenzt geflaggt, (2)
  verdoppeltes Anführungszeichen + echtes WHERE danach → korrekt nicht
  geflaggt, (3) verdoppeltes Anführungszeichen + WHERE-ähnlicher Text im
  String → korrekt geflaggt, (4) fehlerhafte CTE ohne schließende Klammer
  → stürzt nicht ab, liefert sicher `null` (deckt den bislang
  ungetesteten `findParenBody`-Fallback für unausgeglichene Klammern ab,
  konsistent mit der dokumentierten "eher False Negatives als Blockieren
  von nicht-parsbarem SQL"-Absicht).

- **Tests:** 1055 → 1059 (+4). Coverage von
  `unboundedRecursionCheck.ts`: 91,55 % → 94,15 % Stmts, 87,67 % → 93,33 %
  Branch. `npx tsc --noEmit` fehlerfrei, volle Suite 1059/1059 grün,
  `npm run build` grün (829,76 kB, unverändert), `npx knip` unverändert.

- **Ergebnis:** reine Verifikation + Testabdeckung, keine
  Verhaltensänderung im Produktcode. Kein Artifact-Republish nötig.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt — Theme × Editor-Sprache-Matrix (sauber)

- **Umfang:** Baseline sauber (1059/1059, typecheck/build/knip grün, HEAD
  `b3d8f41`). Kein aktionabler Content-Task, C#-Boot-Bug bereits mehrfach
  ausführlich untersucht. Bisherige Bug-Hunts prüften meist funktionale
  Abläufe (Run, Tipps, Lösung) mit dem Standard-Theme — die Kombination
  aus allen 11 Themes × allen 3 Editor-Sprachen (SQL/Python/C#) war
  bislang nicht gezielt geprüft — ein Muster, bei dem theme-spezifische
  CSS-Variablen leicht mit sprachspezifischen Token-Typen kollidieren
  könnten (z. B. ein Token-Typ, der nur in C# vorkommt, aber keine Farbe
  für ein helles Theme definiert hat).

- **Erster Fehlversuch, korrigiert:** die erste Prüfung fragte
  `getComputedStyle()` direkt auf `textarea.editor` ab und fand
  überall `color === backgroundColor` (transparent) — sah zunächst wie
  ein flächendeckender Lesbarkeits-Bug aus. Beim Nachschauen im
  DOM/CSS-Code stellte sich heraus: das ist die Editor-Architektur
  selbst (`editorTab.ts`) — ein unsichtbares `<textarea>` für Eingabe/
  Cursor liegt über einer separaten `.highlight-layer`, die die
  tatsächlich eingefärbten Tokens rendert. Kein Bug, eigener Messfehler.
  Skript korrigiert, um stattdessen die echten Token-Spans in
  `.highlight-layer` zu prüfen.

- **Vorgehen (korrigiert):** für jeden der 3 Tracks Beispielcode mit
  Kommentar, String und Zahl in den Editor getippt, dann alle 11 Themes
  nacheinander per direktem Klick auf die Theme-Picker-Buttons
  durchgeschaltet (auch ohne das Modal sichtbar zu öffnen — der Klick-
  Handler reagiert unabhängig von der Sichtbarkeit). Für jede der 33
  Kombinationen geprüft: Anzahl unterschiedlicher Token-Farben und ob
  irgendein Token dieselbe Farbe wie der Editor-Hintergrund hat
  (= unsichtbar).

- **Ergebnis: keine einzige der 33 Kombinationen zeigte einen Token mit
  Hintergrundfarbe** — auch nicht bei den beiden hellen Themes
  (Solar Flare, Paper & Ink), wo ein dunkles-Theme-Restfarbwert am
  ehesten unsichtbaren Text verursacht hätte. 4-6 unterschiedliche
  Token-Farben pro Kombination, konsistent über alle drei Sprachen.

- **Nebenbeobachtung, nicht reproduzierbar:** ein einzelner
  `console.error` ("Failed to load module script: ... MIME type of
  application/octet-stream") tauchte einmal im ursprünglichen
  kombinierten Lauf auf, war in `docs/csharp-engine-poc.md` bislang
  nicht dokumentiert. Gezielt isoliert nachgestellt (direkte Navigation
  zu `host.html`, dann nochmal über die echte App-Navigation zum
  C#-Track) — beide Male **nicht** reproduzierbar, alle `_framework/*`-
  Antworten hatten korrekte Content-Types. Vermutlich ein transientes
  Sandbox-Artefakt durch die parallelen CDN-Route-Interceptions während
  des schnellen Theme-Durchschaltens, kein reproduzierbarer Produktbug —
  konsistent mit dem bereits mehrfach dokumentierten Sandbox-
  Netzwerkrauschen-Muster. Nicht weiter verfolgt.

- **Ergebnis:** keine neuen Funde. Tests/typecheck/build unverändert
  grün. Kein Artifact-Republish nötig. Dev-Server sauber beendet.

### 2026-08-11 — Stündliche Routine: Echter Bug behoben — C#-Tutorial-/Tipp-Code war nie syntax-hervorgehoben (stale Kommentar entdeckt den Live-Zustand widersprach)

- **Umfang:** Baseline sauber (1059/1059, typecheck/build/knip grün, HEAD
  `d2c2589`). Beim Durchsehen bislang nicht geprüfter Coverage-Lücken
  (`contentHighlight.ts`, `diff.ts`, `app.ts`) fiel beim Lesen von
  `contentHighlight.ts`s eigenem Dokumentationskommentar etwas auf: er
  behauptete, `csharp` sei "noch nicht live registriert" — eine Aussage,
  die vor mehreren Durchgängen (als der C#-Track tatsächlich verdrahtet
  wurde) hätte aktualisiert werden müssen, es aber nie wurde.

- **Befund: echter, aktuell live sichtbarer Bug.** `HIGHLIGHTERS` (die
  Map, die pro Track den passenden Tokenizer für eingebetteten Code in
  Tutorial-/Tipp-Texten auswählt) hatte nur `sqlite`/`python` — kein
  `csharp`-Eintrag, obwohl `highlightCSharp()`
  (`src/editor/languages/csharp/highlight.ts`) bereits seit dem
  C#-Editor-Plugin-Durchgang existiert und exakt dieselbe Signatur wie
  `highlightSql`/`highlightPython` hat. Folge: jeder `<pre>`/`<code>`-
  Codeausschnitt in einem C#-Tutorial oder -Tipp fiel auf reines
  HTML-Escaping zurück (einfarbiger Text) statt wie bei SQL/Python
  syntax-hervorgehoben zu werden — inkonsistent und degradiert gegenüber
  den anderen beiden Tracks. Verifiziert, dass das kein theoretischer
  Fall ist: **alle 27 C#-Challenges** enthalten `<pre>`/`<code>`-Blöcke
  in ihrem Content.

- **Fix:** `csharp: highlightCSharp` zur `HIGHLIGHTERS`-Map ergänzt,
  Import ergänzt, den veralteten Dokumentationskommentar korrigiert
  (beschreibt jetzt den Erweiterungspunkt allgemein statt eine konkrete,
  inzwischen falsche Momentaufnahme festzuschreiben). Zwei bestehende
  Tests, die das alte (fehlerhafte) Fallback-Verhalten für `csharp`
  explizit erwarteten, korrigiert — sie prüfen jetzt echte C#-Syntax-
  Hervorhebung; der generische "kein Highlighter"-Fallback wird jetzt
  stattdessen mit einer echt unbekannten Track-ID getestet. Zwei neue
  Tests ergänzt (Keyword-Hervorhebung in `highlightCodeForTrack`, echte
  Hervorhebung eines eingebetteten C#-Snippets in
  `highlightContentHtml`).

- **Live verifiziert, nicht nur unit-getestet:** Dev-Server gestartet,
  C#-Track gewählt, erste Challenge geöffnet — der Task-Tab zeigt jetzt
  16 `tok-*`-Spans (vorher: 0, nur escapter Fließtext). Keine neuen
  Konsolenfehler.

- **Tests:** 1059 → 1060 (+1 netto: 2 Tests korrigiert, 2 neu ergänzt,
  1 alter Test durch einen allgemeineren ersetzt). `npx tsc --noEmit`
  fehlerfrei, volle Suite 1060/1060 grün, `npm run build` grün
  (829,77 kB), `npx knip` unverändert.

- **Ergebnis:** echter, sofort für alle 27 C#-Challenges sichtbarer
  UX-Fix — kein Content, keine Konzept-Zahlen geändert, daher kein
  Artifact-Republish nötig.

### 2026-08-11 — Stündliche Routine: Echter Content-Korruptions-Bug behoben — generische C#-Typen verschwanden lautlos in 9 Challenges

- **Umfang:** Baseline sauber (1060/1060, typecheck/build/knip grün, HEAD
  `b093906`). Nach dem Highlight-Fix aus dem letzten Durchgang gezielt
  nach ähnlichen "csharp fehlt in einer Track-Map"-Bugs gesucht (Suche
  nach anderen `sqlite:`/`python:`-Maps, TODO/FIXME, stale "noch nicht
  registriert"-Kommentare) — nichts gefunden, alle anderen Track-
  Switches behandeln `csharp` bereits korrekt.

- **Befund beim genaueren Hinsehen: ein tieferer, schwerwiegenderer Bug,
  unabhängig vom letzten Fix.** `highlightContentHtml()`/die Tutorial-/
  Tipp-Rendering-Pfade setzen den rohen Challenge-HTML-String direkt per
  `container.innerHTML = html`. SQL/Python-Content verlässt sich seit
  jeher bewusst auf nachsichtiges HTML-Parsing für unescapte `<`/`>`
  (siehe bestehender Test-Kommentar in `contentHighlight.test.ts`:
  "Some existing content has unescaped < ..., relying on lenient HTML
  parsing") — das funktioniert für SQL-Vergleiche wie `n < 5` (Leerzeichen/
  Ziffer direkt nach `<`, vom Parser nicht als Tag-Start erkannt) und für
  Python (keine `<T>`-Generics-Syntax). **C#-Generics wie `List<int>`
  haben dagegen einen Buchstaben direkt nach `<`** — der Browser
  interpretiert das als Start eines echten (unbekannten) Elements und
  verschluckt lautlos alles bis zum nächsten `>`. Empirisch mit JSDOM
  bestätigt: `List<int> mengen = ...` wird nach dem Parsen zu
  `List mengen = ...` — der Typ-Parameter ist komplett verschwunden,
  nicht nur falsch dargestellt.

- **Umfang systematisch ermittelt statt geraten:** ein Skript verglich
  für jedes `tutorial`/`hints`/`syntaxExplanation`/`successCriteria`-Feld
  aller 3 Tracks den `<pre>`/`<code>`-Inhalt vor und nach dem HTML-Parsen.
  SQL/Python: 0 Treffer (bestätigt, dass deren Inhalte tatsächlich sicher
  sind). C#: **9 betroffene Stellen**, alle im dritten Tipp
  ("So sieht die Lösung aus") der Challenges 09, 17, 20, 21, 22, 23, 24,
  25, 26 — durchgängig `List<T>`/`Box<T>`/`Func<...>`/`Dictionary<K,V>`/
  `Action<T>`-Generics in roh eingefügtem Beispielcode. Auffällig: die
  *anderen* Tipps derselben Dateien (kürzere `<code>`-Inline-Snippets)
  waren bereits korrekt mit `&lt;`/`&gt;` escaped — nur der lange,
  vermutlich direkt aus der echten Lösungsdatei kopierte `<pre>`-Block
  im dritten Tipp nicht.

- **Fix:** in allen 9 Dateien den Inhalt des betroffenen `<pre>`-Blocks
  escaped (`<`→`&lt;`, `>`→`&gt;`), die umschließenden `<pre>`/`</pre>`-
  Tags selbst unangetastet gelassen. Live mit echtem Playwright-Lauf
  gegen den Dev-Server bestätigt: Challenge 17s dritter Tipp zeigt jetzt
  korrekt `Box<string>`/`Box<int>` vollständig, keine verschluckten
  Typ-Parameter mehr.

- **Dauerhafter Regressionsschutz ergänzt:** neue Testdatei
  `test/content/htmlContentIntegrity.test.ts` (jsdom, per
  `vitest.config.ts`-Eintrag) — ein Test pro Challenge über alle 3
  Tracks (172 Tests total), der `tutorial`/`hints`/`syntaxExplanation`/
  `successCriteria` genau wie die echte App parst und den `<pre>`/
  `<code>`-Inhalt vor/nach Vergleich prüft. Als aussagekräftig bestätigt:
  einen der 9 Fixes testweise per `git stash` zurückgenommen — der Test
  schlägt korrekt fehl, mit einer Fehlermeldung, die direkt auf die
  Ursache hinweist (Generic-Typ, der als Tag verschluckt wurde).

- **Tests:** 1060 → 1232 (+172, alle neu in `htmlContentIntegrity.test.ts`).
  Gate 1/Gate 2 (`challengeRunner.test.ts`, `schema.test.ts`) separat
  vorab laufen lassen, um sicherzustellen, dass die Content-Änderungen
  keine Validierungslogik berühren — unverändert grün (384/384). `npx
  tsc --noEmit` fehlerfrei, volle Suite 1232/1232 grün, `npm run build`
  grün (829,96 kB), `npx knip` unverändert.

- **Ergebnis:** echter, für Lernende bislang unsichtbar kaputter
  Content-Bug behoben — nicht nur fehlende Hervorhebung wie im letzten
  Durchgang, sondern tatsächlicher Datenverlust in Beispielcode, der
  genau die C#-Generics-Konzepte zeigen soll, die er demonstrieren
  will. Kein Artifact-Republish nötig (kein Konzept-Zahlen-Wechsel, nur
  Bugfix + Testabdeckung).

### 2026-08-11 — Stündliche Routine: Regressionsschutz aus letztem Durchgang um `task`/`prereqNote` erweitert (sauber, keine neuen Funde)

- **Umfang:** Baseline sauber (1232/1232, typecheck/build/knip grün, HEAD
  `321cf5a`). Nach dem Content-Korruptions-Fix gezielt nach weiteren
  Stellen im Codebase gesucht, an denen `csharp` in einer Track-Map
  fehlen könnte (Suche nach anderen `sqlite:`/`python:`-Objekten,
  fehlenden Track-Fällen in Switches) — keine weiteren Lücken gefunden,
  alle bereits korrekt.

- **Dabei eine echte Lücke im eigenen Regressionstest von letztem
  Durchgang entdeckt:** `htmlContentIntegrity.test.ts` prüfte nur
  `tutorial`/`hints`/`syntaxExplanation`/`successCriteria` — aber
  `taskTab.ts` rendert auch `task` und `prereqNote` direkt als rohes
  HTML (`${slice.task}`, `${slice.prereqNote}`), ganz ohne über
  `highlightContentHtml` zu laufen. Dieselbe Verwundbarkeit besteht
  dort grundsätzlich genauso — beide landen letztlich in irgendeinem
  `.innerHTML`.

- **Systematisch geprüft statt angenommen:** eigenes Skript lief gegen
  alle `task`-Felder aller 3 Tracks (JSDOM, derselbe Vorher/Nachher-
  Vergleich wie beim letzten Fund) — **0 Treffer**, `task` ist
  überall bereits korrekt escaped (die kürzeren `<code>`-Inline-
  Schnipsel in `task` waren offenbar von Anfang an sorgfältiger
  behandelt als der lange rohe `<pre>`-Block im dritten Tipp).
  `prereqNote` wird nur von 15 SQL-Challenges gesetzt (reine
  Prosa-Hinweise zu Voraussetzungsketten, keine Code-Beispiele) —
  ebenfalls unauffällig.

- **Trotzdem ergänzt:** `task`/`prereqNote` in `htmlContentIntegrity.test.ts`
  aufgenommen, damit ein künftiger Content-Fehler in diesen Feldern
  nicht unbemerkt bliebe — derselbe Schutz, den `tutorial`/`hints`/
  `syntaxExplanation`/`successCriteria` bereits haben. Testanzahl
  bleibt bei 172 (ein Test pro Challenge, jetzt mit erweiterter
  Feldabdeckung innerhalb jedes Tests, keine neuen Testfälle).

- **Tests:** 1232/1232 unverändert (reine Testabdeckungs-Erweiterung,
  keine Produktcode-Änderung). `npx tsc --noEmit` fehlerfrei, volle
  Suite grün, `npm run build` grün (829,96 kB, unverändert), `npx knip`
  unverändert.

- **Ergebnis:** keine neuen Content-Bugs gefunden, aber eine echte
  Lücke im eigenen frisch geschriebenen Regressionsschutz geschlossen.
  Kein Artifact-Republish nötig.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt — C#-Track auf Mobile-Viewport (sauber, bislang ungeprüfte Kombination)

- **Umfang:** Baseline sauber (1232/1232, typecheck/build grün, HEAD
  `a80b827`). C#-Boot-Bug erneut bestätigt unverändert reproduzierbar
  (keine Drift). Priorität-2-Suche: alle bisherigen Mobile-Viewport-
  Durchgänge (375×667) betrafen ausschließlich SQL/Python — seit der
  C#-Live-Verdrahtung wurde die Kombination "C#-Track auf Mobile" nie
  gezielt geprüft, obwohl das UI selbst (Tutorial, Aufgabe, Editor mit
  Syntax-Highlighting) unabhängig vom kaputten Boot der Engine
  funktioniert und genauso wie SQL/Python echtes Nutzer-Risiko trägt.

- **Vorgehen:** Dev-Server im 375×667-Viewport (iPhone-SE-Breite)
  gestartet, C#-Track gewählt (27 Challenges korrekt gelistet), Sidebar-
  Drawer-Verhalten nach Auswahl geprüft (kollabiert korrekt auf 52px,
  wie bei SQL/Python), horizontales Overflow bei jedem Schritt (initial,
  nach Track-Wahl, nach Challenge-Auswahl, Tutorial-/Aufgabe-/Editor-Tab)
  gemessen.

- **Ergebnis: keine Funde.** Kein horizontales Overflow in keinem der 6
  geprüften Zustände. Sidebar kollabiert korrekt. Tutorial-Tab zeigt 78
  `tok-*`-Spans — bestätigt, dass der Syntax-Highlighting-Fix von vor
  zwei Durchgängen auch auf Mobile korrekt greift. Editor-Textarea
  sichtbar, Toolbar zeigt korrekt "C#". Keine neuen Konsolenfehler
  (nur das bereits mehrfach dokumentierte Sandbox-Netzwerkrauschen).

- **Ergebnis:** Tests/typecheck/build unverändert grün. Kein Artifact-
  Republish nötig. Dev-Server sauber beendet.

### 2026-08-11 — Stündliche Routine: Live-Bug-Hunt — C#-Generics im Lösungs-Vergleich (sauber, bislang ungeprüft)

- **Umfang:** Baseline sauber (1232/1232, typecheck/build grün, HEAD
  `ae138ab`). Nachdem der eigentliche Tutorial-/Tipp-Rendering-Pfad
  (`highlightContentHtml`) vor zwei Durchgängen als Ursache eines echten
  Content-Korruptions-Bugs bei C#-Generics identifiziert wurde, war die
  Sicherheit des STRUKTURELL ANDEREN "Mit Musterlösung vergleichen"-Pfads
  (`compareView.ts`, nutzt explizit `escapeHtml()` statt `innerHTML =`
  auf rohem HTML) bereits per Code-Lesen bestätigt — aber nie live in
  einem echten Browser gegen echten C#-Generics-Content verifiziert.

- **Vorgehen:** Dev-Server gestartet, C#-Challenge 09 gewählt (Lösung
  enthält `List<string>`/`Dictionary<string, double>`), abweichenden
  Code in den Editor getippt, "Mit Musterlösung vergleichen" geklickt.

- **Ergebnis: bestätigt sicher, keine Korruption.** Vergleichs-Panel
  öffnet korrekt, `List<string>` und `Dictionary<string, double>`
  erscheinen vollständig und unverändert in der Musterlösungs-Spalte
  (38 Diff-Zeilen, je 22 Zeilen pro Spalte, exakt passend zur echten
  Zeilenzahl). Bestätigt live, was die Code-Analyse bereits nahelegte —
  kein neuer Fund, aber echte statt nur angenommene Sicherheit für einen
  Pfad, der genau die Art Content zeigt, die vor zwei Durchgängen
  anderswo kaputt war.

- **Ergebnis:** Tests/typecheck/build unverändert grün. Kein Artifact-
  Republish nötig. Dev-Server sauber beendet.
