# Wendehals – Hinweise für Claude Code

Metroidvania-Shoot'em-Up (Dackel mit Raketenrucksack). Reines JavaScript (ES-Module), gebaut mit
esbuild zu einer einzigen `dist/index.html`, Desktop über Electron. Keine externen Assets:
Grafik = Canvas-Vektoren, Ton = WebAudio-Synthese. Der Rest des Repos (SQL-Lern-Tool,
`csharp-engine/`) gehört nicht zum Spiel.

Aktueller Arbeitsauftrag (seit 05.10.2026): **Prototypen nach `docs/PROTOTYPEN.md`** – kleine
Wegwerf-Prototypen, ein Konzept nach dem anderen, Bau nach einem Brief in `docs/prototypen/`.
`docs/PLAN-v0.3.md` ist **nach Phase 1 pausiert** (nicht löschen). Das Haus als Setting ist für das echte
Spiel gestrichen, **Setting offen**.

**Modellwahl:** Jeder Plan und jeder Schritt nennt, welches Claude-Modell Robin wählen soll (Opus 5.5 für
Design/Konzept/Planung, Sonnet 5.5 zum Bauen und Testen, Haiku 4.5 für Kleinkram; **kein Fable**).
Tabelle in `docs/PROTOTYPEN.md`.

**Recherche** und Agenten-Berichte liegen in `docs/forschung/` (Index: `docs/forschung/README.md`);
neue Recherche dort ablegen.

## Befehle (alle im Ordner `wendehals/`)

| Befehl | Zweck | Dauer |
|---|---|---|
| `npm ci` | Abhängigkeiten installieren (Cloud-Container: mit `ELECTRON_SKIP_BINARY_DOWNLOAD=1`) | ~30 s |
| `npm test` | Unit-, Löser- und Golden-Master-Tests (`node --test tests/*.tests.mjs`, ~1 GB Speicher) | ~35 s |
| `npm run build` | `dist/index.html` bauen | ~1 s |
| `npm run e2e` | Build + Smoke-Test im echten Chromium (`e2e/smoke.mjs`) | ~1 min |
| `npm run e2e:perf` | Build + Frame-Budget je Szene, normal und gedrosselt | ~3 min |
| `npm run e2e:flash` | Build + Flacker-Test (Fotosensibilität) | ~1 min |
| `npm run check:welt` | Referenz-Löser über `docs/welt.json` → muss „Keine Probleme gefunden.“ melden | ~12 s |
| `python3 tools/gegenpruefung.py` | unabhängige Gegenprüfung derselben Regeln (Zweitmeinung) | ~2 min |
| `npm run gen:welt3` | `src/data/welt3.js` aus `docs/welt.json` neu erzeugen (nach jeder Änderung an welt.json) | <1 s |
| `npm run golden:update` | Golden Master der v0.2-Welt neu schreiben (nur bei beabsichtigter Änderung, s. u.) | ~7 s |
| `node tools/golden.mjs --dump` | Rohdaten des Golden Masters nach `tests/golden/out/` (zum Vergleichen per diff) | ~7 s |

- Chromium für die E2E-Tests: `/opt/pw-browsers/chromium` oder `CHROMIUM_PATH`. Nie `playwright install`.
- Ablauf jeder Phase: erkunden → Plan vorlegen → umsetzen → `npm test` + E2E → committen → pushen.
- Release: Ein Push auf `ccr-d78728c5-ncws9h` baut über `.github/workflows/wendehals-release.yml`
  (Repo-Wurzel) Windows-`.exe` und Steam-Deck-AppImage und veröffentlicht sie unter dem Tag
  `wendehals-latest`. Robin spielt diesen Stand auf dem Steam Deck.

## Ordnerstruktur

```
src/core/      math.js (Richtungen, Bildschirm-Transformationen), input.js, audio.js, rng.js
src/data/      world.js (v0.2-Welt), welt3.js (v0.3-Welt, ERZEUGT aus docs/welt.json), items.js
               (Fähigkeiten, Hindernistypen), levels.js (Profile, Set-Pieces), themes.js, …
src/game/      worldgraph.js + solver.js (Regeln/Löser v0.2), worldgraph3.js + solver3.js (v0.3),
               level.js (Etappe, reverse()), levelgen.js, arena.js (Kreuzungsraum), game.js, …
src/render/    renderer.js, sprites.js, canvas.js
tests/         *.tests.mjs (node --test), helpers/ (Bot, Treiber, Fingerabdruck), golden/ (Golden Master)
e2e/           smoke.mjs, perf.mjs, flash.mjs, electron.mjs (Desktop)
tools/         build.mjs, gen-welt3.mjs, golden.mjs, pruefe-welt.mjs (Referenz-Löser v3),
               gegenpruefung.py, make-icon.mjs
docs/          DESIGN.md (v0.2), PLAN-v0.2.md, PLAN-v0.3.md, WELT-DESIGN.md, welt.json
electron/      main.cjs, preload.cjs
```

## Grundprinzip: Spiel und Löser teilen die Regeln

Alle Weltregeln (wer darf wohin, wie wird gedreht, was passiert bei Ankunft) stehen **genau einmal**
in der Regeldatei der Welt: v0.2 `src/game/worldgraph.js`, v0.3 `src/game/worldgraph3.js`. Das
Spiel **und** der Löser rufen dieselben Funktionen auf. Neue Regeln (Stationen, Drehstufen,
Hindernisse) kommen dorthin, nie als Sonderfall nur ins Spiel. Jede Regel bekommt einen Test
„Spiel gegen Löser“. Achtung: Das v0.2-Spiel dreht noch selbst (`arena.updateRing`, `game.js`);
für v0.3 ruft das Spiel ab Phase 3 `worldgraph3.turnOptions`/`stationTurns` auf.
`worldgraph3.js` ist an eine übersetzte Welt gebunden (`compileWorld3(data)`), nichts läuft beim
Import. Der Port muss mit `tools/pruefe-welt.mjs` übereinstimmen (Test in `tests/world3.tests.mjs`).

## Koordinaten und Richtungen

- **Etappe lokal:** `a` = Flugrichtung („along“), `c` = Querachse („cross“). Sichtbare Strecke in
  Flugrichtung immer 480 E; senkrecht wird dafür herausgezoomt (`viewDims`).
- **Eingabe bleibt bildschirmbezogen:** `screenToLocalVec(heading, sx, sy)` dreht den Stick in
  lokale Koordinaten, `localToScreen` zurück.
- **8 Richtungen** (seit Phase 1): `E,SE,S,SW,W,NW,N,NE = 0..7` im Uhrzeigersinn, `turnBy(h,k)`
  in 45°-Schritten, `turnCW`/`turnCCW` = 90°, `opposite` = 180°, `headingAngle` = h·45°.
  Klassen: gerade = Kreuz (+), ungerade = Diagonale (×); 90°/180° bleiben in der Klasse, nur 45°
  wechselt sie (Paritätsregel). Die v0.2-Welt benutzt nur `CARDINALS` (E, S, W, N = 0, 2, 4, 6).
- **Nie mit Richtungszahlen rechnen** außerhalb von `math.js`: Konstanten und Hilfen benutzen
  (`CARDINALS`, `isHorizontal/isVertical/isDiagonal`, `quarterTurns`, `turnBy`, `rotationSteps`,
  `HEADING_CODES` für welt.json). `tests/directions.tests.mjs` scannt danach; begründete Ausnahmen
  tragen `// richtung-ok` in derselben Zeile.
- Diagonalen werfen in `viewDims`/`crossPeriod`/`localToScreen*`, bis Phase 2 sie baut.
- Spielstand: Version 2 speichert 8er-Richtungen; Version 1 (bis v0.2, Richtungen 0..3) wird beim
  Laden umgerechnet (`save.js`), gleicher Schlüssel.
- Simulation: fester 60-Hz-Takt, deterministischer Zufall (`core/rng.js`); Zeichnen interpoliert.

## Design-Quellen

- **Verbindlich:** `docs/PROTOTYPEN.md` (Robins Entscheidungen, Entscheidungsregister, Prototyp-Leiter,
  Entscheidungsprotokoll) und der jeweilige Bau-Brief in `docs/prototypen/`. Wo die folgenden Dokumente
  widersprechen, gilt PROTOTYPEN.md.
- Referenz (pausiert, nicht mehr bindend wo widersprochen):
- `docs/WELT-DESIGN.md`: Richtungssystem, Drehstufen, Drehzahl, Weltstruktur, Tempo-Zonen,
  Löser-Invarianten (Kap. 7: I1–I8), Regeln gegen Steckenbleiben (Kap. 8: R1–R15).
- `docs/welt.json`: **Quelle der Wahrheit** für die neue Welt (8 Gebiete, 71 Arenen, 86 Etappen +
  11 Abzweige, Fähigkeiten, Hindernistypen, Sequence Breaks). Gleiche IDs wie WELT-DESIGN.md.
- `tools/pruefe-welt.mjs`: Referenz für den Port nach `worldgraph.js`/`solver.js`. Der portierte
  Löser muss dieselbe Phasentabelle liefern.
- `docs/PLAN-v0.3.md`: Phasen, Akzeptanzkriterien, offene Entscheidungen E1–E7 (Abschnitt 4).
- Zahlen (Tempo, Zoom, Drehzahl-Strecken) sind Startwerte: als Konstanten an **einer** Stelle pflegen.

## Prototypen und das v0.2-Spiel

- Die v0.2-Welt bleibt das Standardspiel; jedes Release muss für Robin spielbar bleiben.
- Prototyp-Code liegt nur in `src/proto/` (plus wenige Zeilen Anbindung laut Brief). Prototyp-Builds starten
  **direkt im Prototyp** (`src/main.js`); `?spiel` (Electron: `WENDEHALS_SPIEL=1`) öffnet v0.2, Start/Esc im
  Prototyp führt zum v0.2-Titel, dort „Optionen → Prototyp: …“ zurück.
- Regeln aus Prototypen gehen nie direkt ins Spiel: nach Robins „keep“ werden sie in den echten Modulen
  neu geschrieben (Spiel gegen Löser getestet), der Prototyp wird gelöscht.
- Überholt durch Robins Entscheidungen vom 05.10.2026 (siehe PROTOTYPEN.md): vertikale Etappen mit
  Zoom-out, gedrehte 45°-Diagonal-Etappen (E1), „Diagonalen werfen bis Phase 2“ als Plan.

## Regeln für jede Prototyp-Arbeit (Robin, 07.10.2026 – gelten immer)

Aus der Retrospektive zu P1 ([`docs/prototypen/P1-retro.md`](docs/prototypen/P1-retro.md)). Gelten in jeder
Session, für jeden Prototyp, ohne dass Robin sie wiederholen muss.

1. **Erst validieren, dann bauen.** „Validieren“ heißt: Robin fragen, ob es das ist, was er will. Ändert eine
   Rückmeldung mehr als einen Zahlenwert, oder ist ein neuer Prototyp/Brief geplant: zuerst Deutung und
   Lösungsansatz kurz an Robin, mit der ausdrücklichen Frage „Ist es das, was du willst?“; erst nach seinem „ja“
   (oder seiner Korrektur) bauen. Folgeprobleme, die eine von Robins Regeln berühren, vorlegen statt still lösen.
2. **Abnahme-Checkliste zuerst.** Jeder Bau-Brief beginnt mit einer Checkliste der Invarianten (Vorbild:
   `docs/PROTOTYPEN.md` Abschnitt 4a, die für alles mit dem drehenden Fenster gilt). Jede Zeile bekommt einen
   automatischen Test aus Spielersicht.
3. **Messen, was der Spieler sieht.** Prüfungen und Simulationen messen Position und Bildschirmstelle der
   Spielfigur, nicht nur Kamerawerte. Nichts als „erledigt“ oder „greift nie“ melden, was nicht so gemessen ist.
4. **Direkt spielbar ausliefern.** Prototyp-Builds starten direkt im Prototyp. Nach jeder Runde `dist/index.html`
   als Datei an Robin schicken und das Artifact unter derselben URL aktualisieren; einmal im Artifact selbst prüfen
   (eingebettetes Fenster hat andere Rechte, z. B. kein Gamepad).
5. **Bewegungs- und Kameraregeln im Brief sind Hypothesen**, keine festen Regeln – der Spieltest entscheidet.
6. **Push nur nach** `npm test && npm run e2e` (als eine Kette, nie mit `;`), Golden Master unverändert.
7. **Modellwahl** laut `docs/PROTOTYPEN.md`: Deutungs- und Design-Runden Opus 5.5, Bauen und Testen Sonnet 5.5.
8. **Alles muss auf dem Steam Deck funktionieren** (Controller und Tastatur, 60 fps, Symbole selbst gezeichnet,
   keine Abhängigkeit von Schriftarten) – gilt fürs ganze Spiel.

## Golden Master der v0.2-Welt

`tests/golden.tests.mjs` vergleicht einen Fingerabdruck von Logik (kompletter Durchlauf), allen
Etappen und der Zeichnung (aufzeichnende Canvas) mit `tests/golden/v02-fingerprint.json`. Er muss
bei jedem Umbau gleich bleiben, solange das v0.2-Spiel nicht absichtlich geändert wird. Abweichung →
erst verstehen (`node tools/golden.mjs --dump` vor/nach, `diff`), nie einfach neu schreiben. Neu
schreiben (`npm run golden:update`) nur bei beabsichtigter Änderung am v0.2-Spiel, mit Grund in der
Commit-Nachricht.

## Do-not-Liste

- **Keine Designentscheidungen**, die nicht in `docs/PROTOTYPEN.md`, dem Bau-Brief oder (als Referenz)
  `PLAN-v0.3.md`/`WELT-DESIGN.md` stehen. Offene Punkte stehen im Entscheidungsregister; bei echter
  Blockade Robin fragen.
- **Golden Master nicht neu schreiben**, um Prototypen grün zu bekommen: Prototypen dürfen das v0.2-Spiel
  nicht verändern.
- **Keine Tests löschen, überspringen oder abschwächen**, keine Toleranzen hochsetzen, um grün zu werden.
- **`docs/welt.json` nicht ändern**, ohne dass `npm run check:welt` grün bleibt und
  `docs/WELT-DESIGN.md` im selben Commit nachgezogen wird.
- Keine Regel nur im Spiel oder nur im Löser implementieren (siehe Grundprinzip).
- Keine externen Assets, keine neuen Laufzeit-Abhängigkeiten, kein Stack-Wechsel.
- Nicht `csharp-engine/` oder das SQL-Lern-Tool anfassen.

## Test-Agenten

Bei Produktionsarbeit (z. B. Übernahme eines Prototyps in die Engine) prüft ein Software-Tester-Agent
den Diff, ein Spieletester-Agent spielt den Stand; Befunde „Fehler“ werden vorher behoben. Bei
Wegwerf-Prototypen reicht das Sicherheitsnetz aus dem Brief; das eigentliche Tor ist Robin am Deck.

## Basislauf v0.2 (04.10.2026, vor v0.3)

- `npm test`: 180/180 grün.
- `npm run e2e`: grün (7 von 8 Läufen; ein Lauf meldete einmalig „1 Prüfungen fehlgeschlagen“,
  nicht reproduziert).
- `npm run e2e:perf`: Budgets eingehalten (normal: Frame p95 16,7 ms in allen Szenen).
- `npm run e2e:flash`: bestanden (0 Blitze/s).
- `npm run check:welt` und `gegenpruefung.py`: identisch, „Keine Probleme gefunden.“
  (ohne Können 197.188 Zustände, mit Können 394.368, 0 Sackgassen, 36/36 Fundstücke).

## Stand nach Phase 1 (05.10.2026)

- `npm test` 209/209 grün (~30–35 s): Golden Master unverändert über den Umbau auf 8 Richtungen,
  Richtungs-Wächter, Spielstand-Umrechnung, v3-Invarianten I1–I8, Port = Referenz-Löser
  (197.188 / 197.669 / 394.368 / 396.470 Zustände, gleiche Phasentabelle).
- e2e, e2e:perf, e2e:flash grün. Das Spiel nutzt die v3-Welt noch nicht (nicht im Bundle).
