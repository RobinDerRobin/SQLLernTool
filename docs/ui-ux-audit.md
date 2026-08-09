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
| F-016 | Bug | Mittel | `test/helpers/nodePythonEngine.ts` (der Node-Testmotor für Python-Content, benutzt von `challengeRunner.test.ts` für Gate 1/Gate 2) spawnte den `python3`-Subprozess ohne `cwd` — der Subprozess erbte das cwd des Test-Runners selbst (das Repo-Root), statt im isolierten Temp-Verzeichnis zu laufen, das für die Treiber-/User-Code-Dateien bereits verwendet wurde. Jede Challenge, deren Python-Code eine relative Datei öffnet (`open("notizen.txt", "w")`), schrieb dadurch echte Dateien ins Repo-Arbeitsverzeichnis statt in den isolierten Temp-Ordner — entdeckt live beim ersten Testlauf der neuen B13-Dateizugriff-Challenges (17–17.2): `liste.txt`, `log.txt`, `notizen.txt` tauchten als unversionierte Dateien im Repo-Root auf, inhaltlich sogar über mehrere Testläufe hinweg akkumuliert (kein Reset zwischen Läufen, weil `rmSync` nur den eigentlich ungenutzten Temp-Ordner löschte). | ✅ Fixed | `spawnSync(..., { cwd: dir })` gesetzt, damit relative Dateipfade im Testcode in den bereits vorhandenen, per `rmSync` aufgeräumten Temp-Ordner zeigen. Neuer Regressionstest in `nodePythonEngine.test.ts` (`isolates relative-path file I/O to a temp dir instead of the process cwd`) — schreibt eine Datei per Python-Code und prüft explizit `existsSync(join(process.cwd(), "notizen.txt")) === false`; vor dem Fix rot reproduziert (per `git stash` auf die alte Implementierung), nach dem Fix grün. Leere Dateien aus dem Repo-Root entfernt, nie committet. |
| F-017 | Bug | Niedrig | `editorTab.ts`: der Leerzustand vor dem ersten „Ausführen" zeigte auf **beiden** Tracks immer den SQL-Text „Noch keine Query ausgeführt." — obwohl Toolbar-Label und die Python-spezifische Ergebnis-Darstellung an anderer Stelle bereits track-bewusst sind. Gefunden bei einem gezielten Live-Playwright-Durchlauf, der zwischen SQL- und Python-Kurs wechselt und den DOM vor dem ersten Run vergleicht. | ✅ Fixed | Neue Funktion `emptyResultsPlaceholder(trackId)`; ein neuer Test in `editorTab.test.ts` (vor dem Fix rot reproduziert, danach grün) prüft für beide Tracks den korrekten Text. Live im Browser gegen beide Tracks bestätigt. |
| F-018 | Bug | Mittel | `test/helpers/nodeSqliteEngine.ts` (der Node-Testmotor für SQL-Content, benutzt von `challengeRunner.test.ts` für Gate 1/Gate 2) übernahm stillschweigend `node:sqlite`s eigenen Default für `PRAGMA foreign_keys` (**ON**) — echtes SQLite und `sql.js` (der Browser-Motor, den die App tatsächlich nutzt) defaulten dagegen beide auf **OFF**. Entdeckt beim Entwurf der neuen `foreign-key-constraint`-Challenge (20.2): ein Distraktor, der `PRAGMA foreign_keys = ON;` vergisst, hätte in Node fälschlich trotzdem FK-Verletzungen abgelehnt (weil `node:sqlite` sie ohnehin immer prüft), im echten Browser aber nicht — der Gate-2-Test hätte also einen Distraktor "bestätigt fehlschlagend" gemeldet, der im echten Produkt tatsächlich durchgekommen wäre. Kein Bestandscontent betroffen (FOREIGN KEY wurde vorher nirgends im Kurs verwendet), aber eine echte Falle für jeden künftigen FK-Content. | ✅ Fixed | `PRAGMA foreign_keys = OFF;` explizit nach jedem `new DatabaseSync(...)` (Konstruktion und `reset()`) gesetzt, um `node:sqlite` auf denselben Default wie sql.js/echtes SQLite zu bringen. Manuell verifiziert: ohne PRAGMA-ON-Zeile im Testcode wird eine ungültige FK-Referenz jetzt (korrekterweise) nicht mehr abgelehnt; mit `PRAGMA foreign_keys = ON;` weiterhin doch. Kein bestehender Test verließ sich auf das alte (falsche) Default-Verhalten — volle Suite weiterhin grün. |
| F-019 | Bug | Hoch | `test/helpers/nodeSqliteEngine.ts` las SELECT-Zeilen über `node:sqlite`s `prepared.all()` **ohne** `setReturnArrays(true)` — die Methode liefert dann Zeilen als Objekte, die pro **Spaltenname** (nicht pro Spaltenposition) indiziert sind. Eine Abfrage, die zwei gleichnamige Spalten aus verschiedenen Tabellen selektiert (z. B. ein unaliaster Self-Join `SELECT a.name, b.name FROM t a, t b`, oder jeder JOIN zweier Tabellen mit gemeinsamem Spaltennamen ohne `AS`) kollabierte dadurch beide Werte auf denselben (den zuletzt geschriebenen) — der andere ging spurlos verloren, obwohl `SqlResultSet.columns` beide Spaltennamen korrekt zweimal auflistete. `sqlJsEngine.ts` (der echte Browser-Motor) liest Zeilen dagegen schon immer positionsbasiert über `stmt.get()` und war nie betroffen — reiner Node-Testmotor-Bug, live beim Schreiben des Validators für die neue `right-join`-Challenge (21.1) entdeckt: eine unabhängige Nachrechnung mit zwei `k.name`/`p.name`-Spalten lieferte in der Prüfung für beide Spalten denselben Wert. | ✅ Fixed | `prepared.setReturnArrays(true)` gesetzt, sodass Zeilen wie bei sql.js positionsbasiert (Array) statt namensbasiert (Objekt) gelesen werden. Neuer Regressionstest in `nodeSqliteEngine.test.ts` (`keeps both values distinct when a join selects two columns with the same name`) — vor dem Fix per `git stash` auf die alte Implementierung rot reproduziert (beide Werte kollabierten auf "Ben"), nach dem Fix grün. |

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
