# Wendehals – Hinweise für Claude Code

Metroidvania-Shoot'em-Up (Dackel mit Raketenrucksack). Reines JavaScript (ES-Module), gebaut mit
esbuild zu einer einzigen `dist/index.html`, Desktop über Electron. Keine externen Assets:
Grafik = Canvas-Vektoren, Ton = WebAudio-Synthese. Der Rest des Repos (SQL-Lern-Tool,
`csharp-engine/`) gehört nicht zum Spiel.

Aktueller Arbeitsauftrag: **v0.3** nach `docs/PLAN-v0.3.md` (Phasen 0–11 der Reihe nach).

## Befehle (alle im Ordner `wendehals/`)

| Befehl | Zweck | Dauer |
|---|---|---|
| `npm ci` | Abhängigkeiten installieren (Cloud-Container: mit `ELECTRON_SKIP_BINARY_DOWNLOAD=1`) | ~30 s |
| `npm test` | Unit- und Löser-Tests (`node --test tests/*.tests.mjs`) | ~15 s |
| `npm run build` | `dist/index.html` bauen | ~1 s |
| `npm run e2e` | Build + Smoke-Test im echten Chromium (`e2e/smoke.mjs`) | ~1 min |
| `npm run e2e:perf` | Build + Frame-Budget je Szene, normal und gedrosselt | ~3 min |
| `npm run e2e:flash` | Build + Flacker-Test (Fotosensibilität) | ~1 min |
| `npm run check:welt` | Referenz-Löser über `docs/welt.json` → muss „Keine Probleme gefunden.“ melden | ~12 s |
| `python3 tools/gegenpruefung.py` | unabhängige Gegenprüfung derselben Regeln (Zweitmeinung) | ~2 min |

- Chromium für die E2E-Tests: `/opt/pw-browsers/chromium` oder `CHROMIUM_PATH`. Nie `playwright install`.
- Ablauf jeder Phase: erkunden → Plan vorlegen → umsetzen → `npm test` + E2E → committen → pushen.
- Release: Ein Push auf `ccr-d78728c5-ncws9h` baut über `.github/workflows/wendehals-release.yml`
  (Repo-Wurzel) Windows-`.exe` und Steam-Deck-AppImage und veröffentlicht sie unter dem Tag
  `wendehals-latest`. Robin spielt diesen Stand auf dem Steam Deck.

## Ordnerstruktur

```
src/core/      math.js (Richtungen, Bildschirm-Transformationen), input.js, audio.js, rng.js
src/data/      world.js (v0.2-Welt), items.js (Fähigkeiten, Hindernistypen), levels.js (Profile,
               Set-Pieces), themes.js, characters.js, text.js
src/game/      worldgraph.js (Weltregeln), solver.js (Softlock-Löser), level.js (Etappe, reverse()),
               levelgen.js (prozedurale Etappen), arena.js (Kreuzungsraum), game.js, bosses.js, …
src/render/    renderer.js, sprites.js, canvas.js
tests/         *.tests.mjs (node --test), helpers/ (Bot, Treiber)
e2e/           smoke.mjs, perf.mjs, flash.mjs, electron.mjs (Desktop)
tools/         build.mjs, pruefe-welt.mjs (Referenz-Löser v3), gegenpruefung.py, make-icon.mjs
docs/          DESIGN.md (v0.2), PLAN-v0.2.md, PLAN-v0.3.md, WELT-DESIGN.md, welt.json
electron/      main.cjs, preload.cjs
```

## Grundprinzip: Spiel und Löser teilen die Regeln

Alle Weltregeln (wer darf wohin, wie wird gedreht, was passiert bei Ankunft) stehen **genau einmal**
in `src/game/worldgraph.js`. Das Spiel **und** `solver.js` rufen dieselben Funktionen auf. Neue
Regeln (Stationen, Drehstufen, Hindernisse) kommen dorthin, nie als Sonderfall nur ins Spiel.
Jede Regel bekommt einen Test „Spiel gegen Löser“.

## Koordinaten und Richtungen

- **Etappe lokal:** `a` = Flugrichtung („along“), `c` = Querachse („cross“). Sichtbare Strecke in
  Flugrichtung immer 480 E; senkrecht wird dafür herausgezoomt (`viewDims`).
- **Eingabe bleibt bildschirmbezogen:** `screenToLocalVec(heading, sx, sy)` dreht den Stick in
  lokale Koordinaten, `localToScreen` zurück.
- **v0.2 (Stand heute):** 4 Richtungen `E=0, S=1, W=2, N=3`, im Uhrzeigersinn, `& 3`.
- **v0.3 (Ziel Phase 1):** 8 Richtungen `E,SE,S,SW,W,NW,N,NE = 0..7`, `turn(h,k) = (h+k)&7`,
  `opposite = (h+4)&7`, Bildwinkel `h·45°`. Alter Index ×2 = neuer Index.
  Klassen: gerade = Kreuz (+), ungerade = Diagonale (×). 90°/180° bleiben in der Klasse,
  nur 45° wechselt sie (Paritätsregel). Diagonale Ausgänge = Eck-Klappen, max. eine je Ecke.
- Simulation: fester 60-Hz-Takt, deterministischer Zufall (`core/rng.js`); Zeichnen interpoliert.

## Design-Quellen (verbindlich)

- `docs/WELT-DESIGN.md`: Richtungssystem, Drehstufen, Drehzahl, Weltstruktur, Tempo-Zonen,
  Löser-Invarianten (Kap. 7: I1–I8), Regeln gegen Steckenbleiben (Kap. 8: R1–R15).
- `docs/welt.json`: **Quelle der Wahrheit** für die neue Welt (8 Gebiete, 71 Arenen, 86 Etappen +
  11 Abzweige, Fähigkeiten, Hindernistypen, Sequence Breaks). Gleiche IDs wie WELT-DESIGN.md.
- `tools/pruefe-welt.mjs`: Referenz für den Port nach `worldgraph.js`/`solver.js`. Der portierte
  Löser muss dieselbe Phasentabelle liefern.
- `docs/PLAN-v0.3.md`: Phasen, Akzeptanzkriterien, offene Entscheidungen E1–E7 (Abschnitt 4).
- Zahlen (Tempo, Zoom, Drehzahl-Strecken) sind Startwerte: als Konstanten an **einer** Stelle pflegen.

## Altes und neues Spiel parallel

Die v0.3-Welt entsteht hinter einem Schalter (`?welt=3` bzw. Electron `--welt=3`, Prototyp
`?welt=proto`). Die v0.2-Welt bleibt Standard, bis Slice A spielbar ist (Phase 8). Jedes Release
muss für Robin spielbar bleiben.

## Do-not-Liste

- **Keine Designentscheidungen**, die nicht in `PLAN-v0.3.md` oder `WELT-DESIGN.md` stehen.
  Offene Punkte (E1–E7) haben einen Standard; bei echter Blockade Robin fragen.
- **Keine Tests löschen, überspringen oder abschwächen**, keine Toleranzen hochsetzen, um grün zu werden.
- **`docs/welt.json` nicht ändern**, ohne dass `npm run check:welt` grün bleibt und
  `docs/WELT-DESIGN.md` im selben Commit nachgezogen wird.
- Keine Regel nur im Spiel oder nur im Löser implementieren (siehe Grundprinzip).
- Keine externen Assets, keine neuen Laufzeit-Abhängigkeiten, kein Stack-Wechsel.
- Nicht `csharp-engine/` oder das SQL-Lern-Tool anfassen.

## Test-Agenten (wie in PLAN-v0.2)

Nach jeder Phase prüft ein Software-Tester-Agent den Diff, ein Spieletester-Agent spielt den Stand.
Befunde der Schwere „Fehler“ werden vor der nächsten Phase behoben. Spieltest-Tore mit Robin nach
Phase 4, 8 und 10.

## Basislauf v0.2 (04.10.2026, vor v0.3)

- `npm test`: 180/180 grün.
- `npm run e2e`: grün (7 von 8 Läufen; ein Lauf meldete einmalig „1 Prüfungen fehlgeschlagen“,
  nicht reproduziert).
- `npm run e2e:perf`: Budgets eingehalten (normal: Frame p95 16,7 ms in allen Szenen).
- `npm run e2e:flash`: bestanden (0 Blitze/s).
- `npm run check:welt` und `gegenpruefung.py`: identisch, „Keine Probleme gefunden.“
  (ohne Können 197.188 Zustände, mit Können 394.368, 0 Sackgassen, 36/36 Fundstücke).
