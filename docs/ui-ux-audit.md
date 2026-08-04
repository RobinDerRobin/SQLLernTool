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
| F-010 | Coverage-Lücke | Niedrig | `pyodideEngine.ts` (25%) und Python-Sprachplugin-Index (0%) kaum getestet — beides lädt Pyodide/WASM vom CDN, schwer isoliert zu testen. `sqlJsEngine.ts` CDN-Ladepfad ähnlich (71%). | 🔴 Open | Noch keine — bräuchte gemockte `window.initSqlJs`/Pyodide-Ladepfade als eigene Testfälle. |

**Hinweis zu 0%-Dateien in der Coverage:** `ProgressStore.ts`, `Runtime.ts`,
`SqlEngine.ts`, `editorBridge.ts` zeigen 0%, sind aber reine
TypeScript-Interfaces ohne ausführbaren Code — kein echtes Test-Loch,
sondern ein Artefakt der Zählweise (0/0 Statements).

## Coverage-Snapshot

Erzeugt mit `npm run test:coverage` (V8-Provider). Volles Detail lokal unter
`coverage/index.html` nach dem Lauf (Verzeichnis ist gitignored).

| Datum | Commit | Statements | Branches | Functions | Lines |
|---|---|---|---|---|---|
| 2026-08-04 | ece5451 | 91.58 % | 80.31 % | 93.84 % | 91.58 % |

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
