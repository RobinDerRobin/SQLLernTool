# Wendehals v0.3: Plan für Claude Code

Thema dieses Plans: Richtungssystem, neue Welt, dynamische Level.

> **An Claude Code:** Dieser Plan ist die Arbeitsgrundlage für v0.3. Lies ihn vollständig, bevor du anfängst. Lies danach die Design-Grundlagen (Abschnitt 2).
> - Arbeite die Phasen in der angegebenen Reihenfolge ab. Halte in jeder Phase den Ablauf ein: erkunden → Plan vorlegen → umsetzen → `npm test` + E2E → committen → pushen.
> - Ein Push auf `ccr-d78728c5-ncws9h` baut automatisch ein Release. Robin spielt es auf dem Steam Deck.
> - **Triff keine Designentscheidungen, die hier oder in `WELT-DESIGN.md` nicht stehen.** Offene Punkte stehen in Abschnitt 4. Wenn du blockiert bist, frag Robin.

---

## 1. Kontext

### 1.1 Wo das Spiel liegt

Repo: `RobinDerRobin/SQLLernTool`, Branch `ccr-d78728c5-ncws9h`, Ordner **`wendehals/`**. Der Rest des Repos gehört zum SQL-Lern-Tool und ist hier nicht relevant, auch `csharp-engine/` nicht.

**Technik (Stand 04.10.2026, v0.2):**
- **Sprache und Build:** reines JavaScript (ES-Module), gebaut mit esbuild zu einer einzigen `dist/index.html`.
- **Desktop:** Electron 44.
  - Windows: portable `.exe`.
  - Linux/Steam Deck: AppImage mit `--no-sandbox`.
- **Tests:** `npm test` (node --test, 180 Tests, alle grün) und E2E über playwright-core (`npm run e2e`, `e2e:perf`, `e2e:flash`).
- **CI:** `.github/workflows/wendehals-release.yml` baut beim Push und veröffentlicht unter dem Tag `wendehals-latest`.
- **Simulation:** fester 60-Hz-Takt, deterministischer Zufall. Gezeichnet wird interpoliert.
- **Assets:** Grafik besteht aus Canvas-Vektoren, Ton aus WebAudio-Synthese. Es gibt keine externen Dateien.

**Wichtige Dateien:**
- Daten: `src/data/world.js` (25 Arenen, 32 Etappen), `items.js`, `levels.js` (Profile und Set-Pieces).
- Logik: `src/game/worldgraph.js` (Weltregeln, die Spiel **und** Löser gemeinsam nutzen) und `solver.js` (Softlock-Löser).
- Level: `levelgen.js` (erzeugt Level prozedural), `level.js` (Etappe, `reverse()`), `arena.js` (Kreuzungsraum, Drehscheibe).
- Richtungsmodell: `src/core/math.js`, bisher mit 4 Richtungen (`E=0..N=3`, `& 3`).
- Dokumentation: `docs/DESIGN.md` und `docs/PLAN-v0.2.md`. Die Arbeitsweise mit Test-Agenten aus PLAN-v0.2 wird beibehalten.

### 1.2 Robins Feedback zu v0.2

- Das Leveldesign ist „noch eine Katastrophe“. Das Pacing pro Level ist „bei weitem zu undynamisch“.
  - Ursache im Code: Gegnerwellen kommen gleichmäßig getaktet aus dem Generator. Tempozonen gibt es nicht.
- Das Erkundungs- und Fortschrittsprinzip der Metroid-Teile fehlt. Die Level-Qualität von Parodius fehlt.
- Die Richtungsfähigkeit kommt **viel zu früh**: Der Drehwurm (90° in jeder Arena) ist die Belohnung des ersten Bosses.
- Gewünscht sind **Drehungen um 45°, 90° und 180°**.
  - „Erstmal nur an bestimmten Stationen im Level, irgendwann dann immer und überall.“
  - „Einmal benutzen, weiterfliegen, dann wieder.“
- Die **Flugrichtung ist ein Weltfaktor**, der bestimmt, wo man langfliegen kann. Es soll explizit nicht nur nach rechts und links gehen.
- Die Welt soll **wesentlich komplexer** werden, mit Abzweigungen wie in Metroid Dread.
- Level brauchen:
  - dynamische Geschwindigkeitsverläufe;
  - Anhalten, wo es passt;
  - schnelleres Fliegen in Gebieten, für die man schon zu stark ist;
  - Rätsel mit Items.

---

## 2. Design-Grundlagen (verbindlich)

| Datei | Inhalt | Status |
|---|---|---|
| `docs/WELT-DESIGN.md` | Richtungssystem, Fähigkeiten, Weltstruktur, Rhythmus, Leveldesign-Anbindung, Regeln gegen Steckenbleiben | verbindlich |
| `docs/welt.json` | Die komplette neue Welt als Daten: 8 Gebiete, 71 Arenen, 86 Etappen, 11 Abzweig-Etappen, Fähigkeiten, Hindernistypen, Sequence Breaks | verbindlich, **Quelle der Wahrheit** |
| `tools/pruefe-welt.mjs` | Referenz-Löser des Game Designers (`node tools/pruefe-welt.mjs`) | Referenz für den Port |
| `tools/gegenpruefung.py` | Unabhängige Gegenprüfung der Leitung mit eigener Implementierung derselben Regeln | Zweitmeinung |

**Prüfstand beider Löser (04.10.2026): identische Ergebnisse.**
- Ohne Können: 197.188 Zustände. Mit Können: 394.368 Zustände.
- **0 Sackgassen ohne Respawn**, mit und ohne Können.
- 36 von 36 Fundstücken erreichbar.
- Die Pflichtreihenfolge hält. Sequence Breaks: SB1 (früher Wendehals) und SB3 (früher Schrumpfpilz) existieren nur mit Können.
- Die Gegenprüfung fand eine Verletzung der Drehzahl-Invariante R9: `kaltluftschwall`, die Weiche lag nur 400 E hinter dem Start. Sie ist in `welt.json` behoben (Länge 2.000).

### 2.1 Die Kernentscheidungen in Kürze

Details stehen in WELT-DESIGN.md, Kapitel 2–3.

- **8 Blickrichtungen** (`E, SE, S, SW, W, NW, N, NE` = 0–7).
  - **Paritätsregel:** 90° und 180° bleiben in der Klasse Kreuz (+) bzw. Diagonale (×). Nur 45° wechselt die Klasse.
  - Diagonale Ausgänge liegen als **Eck-Klappen** in den Arena-Ecken.
- **Drei Etappentypen:** waagerecht, senkrecht und neu **diagonal** (Rinne ohne Wrap, kürzer, Zoom 0,68).
- **Fünf Drehstufen:**
  1. Stationen (Start).
  2. *Drehwurm*: 90° an Kreiseln, bei 14 %.
  3. *Schiefe Wasserwaage*: 45° an Kreiseln, bei 32 %. Schlüsselfähigkeit, öffnet 10 Schlösser.
  4. *Wendehals*: 180° überall, bei ~40 %. *Kreiselkompass*: freies Drehen in jeder Arena, bei ~55 %.
  5. *Wirbelwind*: immer und überall, auch an Seitenklappen mitten in Etappen, bei 67 %. Zweite Schlüsselfähigkeit.
- **Drehzahl als Ladung:**
  - 4 Segmente; jede 45°-Drehung kostet 1 Segment, eine Wende also 4.
  - Aufladen über die **geflogene Strecke**. Stationen sind kostenlos und füllen voll auf.
- **Drehen mitten in der Etappe:**
  - Abbiegen nur an definierten **Weichenräumen** (`midStations`): Die Kamera steht, die Etappe verzweigt dort.
  - 180° geht mit dem Wendehals überall. Das Arena-/Etappen-Modell bleibt erhalten.
- **Richtung als Weltfaktor:** Strömung/Sog, Rückschlagklappen, Eck-Klappen, Kompassschlösser, Rückschalter, drehbare Arena (Schleudertrommel), stille Arenen, Ratschen-Gebiet, Eiszapfen, Gebiets-Wind, Spiegel-Etappen, Bad abgelassen.
- **Welt:**
  - Gebiete: Frühstückstisch, Bad, Keller, **Kinderzimmer, Kühlschrank, Waschküche** (neu), Disco, Uhrwerk.
  - Ziel: 4 h Erstdurchgang, 5,5 h für 100 %.
  - Rhythmus der offenen Pflichtziele: **1 → 1 → 1 → 3 parallel → 1 → 3 parallel → 1**.
- **Level:**
  - Tempo-Zonen: Gefecht mit Keyframes, Halt, Anker (Flexileine), Freiflug, Sog, Cruise.
  - Aufbau: Aufrüst-Prolog → Einführen → Entwickeln → Wendung → Abschluss.
  - Kein Tempo-Abschnitt länger als 60–90 s.
  - Rätsel mit Items stehen immer in einer Halt-Zone.

### 2.2 Korrekturen am Recherchebericht aus Runde 1

Der erste Bericht konnte den Code nicht einsehen. Folgende Aussagen daraus sind **überholt**:

- „Zwei Engines (TypeScript und C#), konsolidieren“ ist falsch. Das Spiel ist reines JavaScript, `csharp-engine/` gehört zum Lern-Tool. **Kein Stack-Wechsel.**
- „Level als JSON aus LDtk/Tiled“: In v0.3 gibt es **keinen externen Editor**. Die Daten bleiben JS-Module bzw. JSON unter `src/data/`. Claude kann sie direkt bearbeiten, Tests können sie validieren. Ein visueller Editor ist eine spätere Option.
- „Softlock-Löser bauen“: Ein Löser existiert bereits (`solver.js`). Er wird **erweitert**. Der Grundsatz bleibt: Spiel und Löser teilen sich dieselben Regelfunktionen in `worldgraph.js`.
- Der Bericht empfahl „Wende als einzige Mittelpunkt-Fähigkeit bei 30–40 %“. Das ersetzen die **fünf Drehstufen** aus Abschnitt 2.1.

Gültig bleiben aus Runde 1: die Genre-Erkenntnisse, Tempo-Zonen, Level-Aufbau, Parodius-Lektionen, Karte nach Dread-Vorbild, Steam-Deck-Anforderungen (1280×800, Text ≥ 12 px, voll per Controller) und Telemetrie für Playtests.

---

## 3. Arbeitsweise

1. **CLAUDE.md** anlegen, in `wendehals/CLAUDE.md`, unter 200 Zeilen (Phase 0). Inhalt:
   - Befehle;
   - Ordnerstruktur;
   - das Prinzip „Spiel und Löser teilen Regeln“;
   - Koordinatenkonventionen (`a`/`c`, 8 Richtungen);
   - Verweise auf `docs/WELT-DESIGN.md` und `docs/welt.json`;
   - Do-not-Liste: keine Designentscheidungen ohne Robin, keine Tests löschen oder abschwächen, `welt.json` nicht ändern, ohne den Löser grün zu halten und WELT-DESIGN.md nachzuziehen.
2. **Altes und neues Spiel parallel.** Die neue Welt entsteht hinter einem Schalter (z. B. `?welt=3` bzw. Electron-Argument `--welt=3`). Das **v0.2-Spiel bleibt Standard**, bis Slice A spielbar ist (Phase 8). So bleibt jedes Release für Robin spielbar.
3. **Test-Agenten wie in PLAN-v0.2.** Ein Software-Tester prüft jeden Phasen-Diff, ein Spieletester spielt den Stand. Befunde der Schwere „Fehler“ werden vor der nächsten Phase behoben.
4. **Spieltest-Tore mit Robin:** nach Phase 4 (Prototyp-Gefühl), nach Phase 8 (Slice A) und nach Phase 10 (Slice B). Erst danach geht es weiter.
5. **Zahlen sind Startwerte.** Tempo, Zoom, Drehzahl-Strecken und Spielzeiten aus WELT-DESIGN.md sind Designvorgaben, keine Messwerte. Sie werden über Konstanten an einer Stelle gepflegt und nach Spieltests angepasst.

---

## 4. Entscheidungen von Robin

Pro Frage gibt es einen Standard. Er gilt, falls keine Antwort kommt.

| # | Frage | Standard | Benötigt vor |
|---|---|---|---|
| E1 | Diagonal-Etappen: Bild um 45° drehen oder gerader Bildschirm mit Treppen-Terrain? | Beides als Prototyp bauen; Robin entscheidet am Steam Deck | Ende Phase 2 |
| E2 | Drehzahl: Kosten pro 45° (4 Segmente) oder feste Ladungen („2 Drehungen, egal welcher Winkel“)? | Kosten pro 45° | Phase 3 |
| E3 | Steuerung: B halten + Stick (8-Wege mit Rastung), Y = Wende? Oder Schultertasten für ±45°? | B + Stick, Y = Wende | Phase 3 |
| E4 | Kreisel ohne Fähigkeit schubst um 180° zurück (Schutzregel). Ok? | ja | Phase 3 |
| E5 | Wendehals erst bei ~40 % in der Parallelphase, oder früher als Highlight? | ~40 % | Slice B |
| E6 | Umfang: 8 Gebiete / 4 h ok, oder Keller und Waschküche zusammenlegen (spart ~8 Arenen und einen Boss)? | 8 Gebiete | Phase 9 |
| E7 | Neue Gebiete und Bosse ok (Kinderzimmer/Brummkreisel-Baron, Kühlschrank/Pinguin-Admiral Pingo, Waschküche/Wäschekönigin Wilma)? | ja | Phase 9 |

---

## 5. Phasen

### Phase 0: Grundlagen ins Repo, Basislauf

**Aufgaben:**
1. Dateien aus diesem Paket ablegen: `docs/PLAN-v0.3.md`, `docs/WELT-DESIGN.md`, `docs/welt.json`, `tools/pruefe-welt.mjs`, `tools/gegenpruefung.py`.
2. `wendehals/CLAUDE.md` anlegen (siehe Abschnitt 3).
3. Basislauf: `npm ci`, `npm test`, `npm run e2e`, `npm run e2e:perf`. Zahlen festhalten.
4. `node tools/pruefe-welt.mjs` als npm-Skript `check:welt` aufnehmen.

**Akzeptanz:**
- Alle bestehenden Tests sind grün.
- `npm run check:welt` meldet „Keine Probleme gefunden“.
- CLAUDE.md enthält nur Befehle, die nachweislich funktionieren.

### Phase 1: Weltmodell v3 in Daten und Löser (ohne Grafik)

**Aufgaben:**
1. `src/core/math.js` auf **8 Richtungen** umstellen:
   - `turn(h,k) = (h+k)&7`, `opposite = (h+4)&7`;
   - `DIR_VEC`, Namen, Kürzel.
   - Alle Stellen mit `& 3` bzw. 4er-Annahmen finden und anpassen. Die alte Welt nutzt nur gerade Indizes, Index ×2.
2. `docs/welt.json` als Datenquelle einbinden (esbuild importiert JSON direkt) oder daraus `src/data/welt3.js` erzeugen. Ein Generator-Skript ist besser, wenn sonst Felder umbenannt werden müssten.
3. `worldgraph.js` für das Modell v3 erweitern. Alle Regeln stehen in WELT-DESIGN.md, Kap. 2 und 7, sowie in `welt.json` → `turnRules`:
   - Stationstypen (`ring90`, `ring45`, `wender180`, `kompass`, `kreisel`, `ratsche`, `klappe`, `null`) und `softStation`;
   - Weichenräume als eigene Punkte (`<kante>#<i>`) mit Teilstrecken und Abzweig-Etappen;
   - `appliesTo` (both, forward, backward, against-current mit `current`);
   - Zustands-Hindernisse (Trommel), `opensAfterPass`, Hebel (`toggles`), Rückholstationen (`ret`);
   - Drehstufen der Fähigkeiten.
4. `solver.js` auf diese Regeln portieren. Zustand: (Punkt, Blick 0–7, Items, Flags).
5. Tests in `tests/world3.tests.mjs`:
   - I1–I8 aus WELT-DESIGN.md, Kap. 7;
   - Phasentest gegen die Tabelle in Kap. 4.6/7;
   - SB1 und SB3 existieren nur mit Können;
   - ein absichtlich eingebauter Softlock lässt den Test rot werden (Mutationstest).

**Akzeptanz:**
- Der portierte Löser liefert dieselbe Phasentabelle wie `tools/pruefe-welt.mjs`.
- Er meldet 0 Sackgassen ohne Respawn, mit und ohne Können.
- Alte Tests bleiben grün, die alte Welt läuft weiter.

### Phase 2: 8 Richtungen in der Engine, Diagonal-Etappe als Prototyp

**Aufgaben:**
1. Renderer:
   - Die Szene dreht sich um `h · 45°`.
   - Die Eingabe wird zurückgedreht (`screenToLocalVec`). Der Stick bleibt bildschirmbezogen.
2. Diagonal-Etappen:
   - Querachse 320, kein Wrap, Zoom 0,68 (Startwert);
   - Kamera so versetzt, dass in Flugrichtung **480 E Vorschau** bleiben;
   - Terrain als Rinne; der Dackel-Sprite ist um 45° gekippt.
3. Arenen: Eck-Klappen für diagonale Ausgänge, höchstens eine pro Ecke (R14).
4. Den bestehenden Reaktionszeit-Test auf alle 8 Richtungen erweitern.
5. **Prototyp für E1:** eine Test-Etappe in beiden Varianten (gedrehtes Bild bzw. Treppen-Terrain), umschaltbar.

**Akzeptanz:**
- Gleiche Reaktionszeit in allen 8 Richtungen (Test).
- `e2e:perf` liegt im bisherigen Frame-Budget, auch diagonal.
- Robin hat E1 entschieden.

### Phase 3: Stationen, Drehstufen, Drehzahl

**Aufgaben:**
1. Alle Stationstypen in Arenen umsetzen, jeweils mit eigener Form, Farbe und eigenem Ton (WELT-DESIGN.md 2.3):
   - Kompassrose an jeder Speicherstation;
   - Zwischenspitzen grau, bis man die Wasserwaage hat.
2. Fähigkeiten `DREHWURM`, `WASSERWAAGE`, `WENDEHALS`, `KREISELKOMPASS`, `WIRBELWIND` mit den Stufenregeln. Die alten Items Drehwurm und Wendehals werden umgebaut.
3. Drehzahl:
   - HUD-Halbkreis mit 4 Segmenten;
   - Kosten pro 45°;
   - Laden über die Strecke: 120 E pro Segment in Etappen, 80 px Flugweg in Arenen, mit Wirbelwind die halbe Strecke;
   - Brummkreisel-Erweiterungen bis maximal 8 Segmente.
   - Bei leerer Drehzahl: Kopfschütteln mit „?“.
4. Eingabe nach E3. Uhrwerk-Regel: Ratsche bzw. freie Drehung nur im Uhrzeigersinn.
5. Die Drehregeln liegen **in derselben Funktion**, die auch der Löser nutzt.

**Akzeptanz:**
- Unit-Tests für jede Station und jede Fähigkeitskombination, jeweils Spiel gegen Löser.
- Ohne Wasserwaage ist die Klasse ohne Station nie wechselbar (Paritätstest).

### Phase 4: Weichenräume und Seitenklappen

**Aufgaben:**
1. Etappen an `midStations` in Teilstrecken teilen. Am Stationspunkt sitzt ein **Weichenraum**:
   - die `Arena`-Klasse im Grafikstil der Etappe;
   - Kamera steht, nahtloser Übergang ohne Titelkarte;
   - Ausgänge: weiter, zurück (Kehrschleife) und Abzweig.
2. Kreisel-Weichen (ab Drehwurm) und Seitenklappen (ab Wirbelwind; vorher grau, nach Erstkontakt auf der Karte markiert).
3. Rückzug und Abbruch führen zum **letzten Entscheidungspunkt** (R6).
4. Speicherstand: die Position innerhalb einer Kante muss für Rohrpost und Respawn eindeutig sein.
5. **Prototyp-Welt** (`?welt=proto`): 3 Arenen, 1 Diagonal-Etappe, 1 Kreisel-Weiche, 1 Seitenklappe, 1 Rückschalter.

**Akzeptanz:**
- Löser-Tests grün.
- **Spieltest-Tor 1:** Robin spielt den Prototyp und bestätigt, dass sich das Drehen gut anfühlt. Danach werden E2–E4 gegebenenfalls nachjustiert.

### Phase 5: Tempo-Zonen, Anker, Cruise, handgebaute Wellen

**Aufgaben:**
1. Jede Etappe bekommt eine Liste `tempo` mit Keyframes: `at`, `zone`, `speed`, gegebenenfalls `station`. Das Format steht in WELT-DESIGN.md 5.1.
   - Zonen: Gefecht, Halt, Anker, Freiflug, Sog, Cruise.
   - Beim Rückflug wird gespiegelt, Sog wird dann zu Gegenwind.
2. **Flexileine:** Leinenpflöcke etwa alle 600 E. Solange man angeleint ist, steht die Kamera („anhalten, wo es passt“).
3. **Cruise** nach WELT-DESIGN.md 6.5:
   - Bedingungen: Etappe schon geschafft, alles lösbar, keine offene Abzweigung, Gebietsboss besiegt.
   - Tempo 2,5, mit Espresso 3,5. Halbe Wellen, Bonbons werden angezogen.
   - Weichen-Vorwahl per Stick; Bremsen bei Unbekanntem.
4. **Wellen als Daten:** Pro Etappe gibt es eine Liste von Formationen mit Position, Typ, Muster und Absicht (lehren, testen, belohnen, überraschen). Sie ersetzt den gleichmäßig getakteten Generator. Der Generator bleibt nur als Füller, und seine Dichte richtet sich nach der Zone.
5. Abschnittsstruktur pro Etappe: Prolog → Einführen → Entwickeln → Wendung → Abschluss.

**Akzeptanz:**
- Ein Test stellt sicher, dass in keiner Etappe eine Zone bei ihrem Tempo länger als 90 s dauert.
- Jede Etappe hat einen Prolog und mindestens einen Tempowechsel.
- Cruise greift nur unter den vier Bedingungen (Test).

### Phase 6: Neue Hindernisse und Weltmechaniken

**Aufgaben:**
1. Umsetzen, jeweils mit klarem Signal ohne Text und mit Kartensymbol:
   - `gegenstrom` + `current` (Sog bzw. Gegenwind; Föhn);
   - `rueckschalter` (Halt zwei Bildschirme tief, R10);
   - `kompassschloss` (Halt mit Kreisel, Richtungsfolge);
   - `zugschalter` (Flexileine), `flusen` (Föhn), `eiszapfen` (nur rückwärts, weich);
   - `abgelassen` (Ereignis `STOEPSEL`, Bad dauerhaft verändert);
   - Schleudertrommel A/B (drehbare Arena, Hebel in Trommel und Wäschekorb);
   - `opensAfterPass`;
   - stille Arenen mit Rückholstation (R11);
   - Gebiets-Wind (Kühlschrank, Disco).
2. Neue Fähigkeiten: Flexileine (Lasso, Anker, Zugschalter) und Föhn (Pusten, Gegenstrom, Flusen). Jede Fähigkeit hat einen Kampf-, einen Bewegungs- und einen Rätselnutzen.

**Akzeptanz:**
- Jedes Hindernis hat einen Löser-Test und einen Spiel-Test, der dieselbe Regel prüft.
- Jedes Hindernis ist im Screenshot-Test ohne Text erkennbar (Spieletester-Agent).

### Phase 7: Karte und Orientierung

**Aufgaben:**
1. Karte mit 8 Richtungen: Eck-Klappen, Weichen, Abzweige.
2. Hindernissymbole erscheinen nach dem Erstkontakt. Graue Klappen dienen als Teaser.
3. **Icon-Highlight** für alle Stellen eines Typs, z. B. nach dem Erhalt einer Fähigkeit.
4. Mindestens 6 Marker, auch auf der Minikarte.
5. Rohrpost-Stufen I–III: Eine Station ist ab der ersten Berührung aktiv. Gesehene, aber unberührte Stationen sind grau (WELT-DESIGN.md 4.5).
6. Gesäuberte Gebiete werden umgefärbt.

**Akzeptanz:**
- Ein Test stellt sicher, dass jede Kante, jeder Abzweig und jedes Hindernis aus `welt.json` ein Kartensymbol hat.
- Die Karte ist voll per Controller bedienbar und bei 1280×800 lesbar (Text ≥ 12 px).

### Phase 8: Slice A, Frühstückstisch, Bad, Keller (P1–P3, ~77 min)

**Aufgaben:**
1. Die Gebiete aus `welt.json` bauen, inklusive Abzweigungen und Teasern (WELT-DESIGN.md 4.7/4.8):
   - Tempo-Keyframes, Set-Pieces, Wellen;
   - Leit-Gimmick pro Gebiet.
2. Bosse:
   - Graf Kaffeekanne (bestehend, Belohnung jetzt Espresso);
   - Admiral Walross (Kreisel in der Boss-Arena, Belohnung Föhn);
   - Kaiser Kartoffel (weiche Rückseite für SB2);
   - optional Gartenzwerg-General (neu).
3. Das Slice endet mit der Wasserwaage. Danach folgt ein „Fortsetzung folgt“-Tor.
4. **Telemetrie light:** lokales Log mit Zeit und Toden pro Raum, Kartenöffnungen und „verloren“-Zeiten (über 3 min ohne neuen Raum bzw. Fund). Dazu ein Auswertungsskript.
5. Die neue Welt wird Standard. Die v0.2-Welt bleibt per Schalter erreichbar, bis Phase 10 fertig ist.

**Akzeptanz:**
- Spielzeit 60–90 min (Telemetrie).
- Nach dem Erhalt einer Fähigkeit liegt der nächste Pflicht-Einsatzort im Median unter 2 min Suchzeit.
- **Spieltest-Tor 2:** Robin bestätigt, dass Pacing und Erkundung jetzt stimmen.

### Phase 9: Slice B, Kinderzimmer, Kühlschrank, Waschküche (P4)

**Aufgaben:**
1. Drei parallele Ziele in freier Reihenfolge.
2. Bosse: Brummkreisel-Baron (nur der Rücken ist verwundbar), Pinguin-Admiral Pingo und Wäschekönigin Wilma (ihr Schleudergang dreht die Arena).
3. Optional: Wackelpudding, Haarknäuel-Hydra (nach dem Abpumpen).
4. Zustandswechsel „Bad abgelassen“. Sequence Breaks SB1–SB3 mit ihren Gags.

**Akzeptanz:**
- Phasentest grün.
- SB1–SB3 sind spielbar (Spieletester-Agent).
- **Spieltest-Tor 3** nach Phase 10.

### Phase 10: Slice C, Disco, Zeiger-Jagd, Uhrwerk-Finale (P5–P7)

**Aufgaben:**
1. Disco hinter drei Schlössern (Spalt → stille Arena → Rückschalter). Diskokugel-Diva vergibt den Wirbelwind.
2. Zeiger-Jagd über die Seitenklappen. Zifferblatt-Tor, Uhrwerk mit zwei Routen, Der Große Wecker.
3. Alte Welt und alte Weltdaten entfernen. `docs/DESIGN.md` neu schreiben, als Kurzfassung mit Verweis auf WELT-DESIGN.md.

**Akzeptanz:**
- Spielbar von Anfang bis Ende.
- Telemetrie: Erstdurchgang 3,5–5 h.
- Alle Löser- und Spieltests grün.

### Phase 11: Balancing und Steam-Deck-Qualität

**Aufgaben:**
1. Werte nach der Telemetrie justieren: Tempo, Drehzahl, Wellendichte.
2. Test auf dem echten Deck: 90-Hz-OLED, Akku, Suspend/Resume, Steam-Input-Symbole.
3. Prüfung gegen die Deck-Verified-Kriterien.

**Akzeptanz:**
- Stabile Bildrate.
- Keine Maus- oder Tastaturpflicht.
- Text ≥ 12 px bei 1280×800.

---

## 6. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| **Umfang:** etwa das Dreifache von v0.2 (71 statt 25 Arenen, 97 statt 32 Etappen) | Bau in Slices mit Spieltest-Toren. Handarbeit (Wellen, Keyframes) zuerst auf dem Pflichtweg, Nebenwege nutzen den Generator als Füller. E6 als Notbremse. |
| Diagonale Lesbarkeit | Prototyp in Phase 2, Entscheidung E1 am Deck, Reaktionszeit-Test |
| Regeln laufen zwischen Spiel und Löser auseinander | Eine gemeinsame Regelfunktion in `worldgraph.js`, Tests Spiel gegen Löser |
| Softlocks durch Drehzahl | Invariante R9 (≥ 480 E zwischen Entscheidungspunkten) als Test über `welt.json`; Stationen füllen auf |
| Pacing bleibt trotz Keyframes flach | Test „keine Zone > 90 s“, Wellen mit Absicht, Spieltest-Tor 2 |
| KI-typische Abkürzungen (Tests abschwächen, Daten still ändern) | Do-not-Liste in CLAUDE.md, Software-Tester-Agent prüft jeden Diff, `check:welt` in CI |

---

## 7. Quellen der Design-Entscheidungen

- **Genre-Recherche** (Runde 1, Bericht als Artifact): Metroid Dread, Super Metroid, Prime, Hollow Knight/Silksong, Parodius/Gradius, Steam Deck, Claude-Code-Workflow.
- **Rhythmus-Recherche** (Runde 2): Besuchsfolgen, Fähigkeits-Takt, Abzweigungstypen, Öffnungsschübe. Die Zahlen sind in WELT-DESIGN.md mit [b] (belegt) bzw. [g] (geschätzt) markiert. Die wichtigsten Quellen:
  - Gameranx-Walkthroughs zu Dread;
  - game8 (Sammelobjekte, Teleportale, Sequence Breaks);
  - Wikitroid;
  - GMTK-Transkripte (Super Metroid, Prime);
  - GMTK Substack zu Silksong;
  - Hugo Bille, „The Invisible Hand of Super Metroid“;
  - Ruben Bimmel, „The pacing of metroidvania games“;
  - Kayin, „Metroid: Dread – How Metroid Lost its Way“.
