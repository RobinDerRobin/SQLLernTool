# Wendehals v0.2: Plan aus dem Spieltest-Feedback

## Kontext

Robin hat v0.1 (`wendehals/` auf Branch `ccr-d78728c5-ncws9h`) gespielt. Das Feedback hat drei Teile:

- **Probleme:** Ruckeln, laggy Bosse, Renderfehler bei horizontalen Stacheln, Disco zu flackernd.
- **Designkorrekturen:**
  - Knoten sind eigene Level, die Karte ist reine Ansicht.
  - Show don't tell.
  - Festes Terrain tötet sofort.
  - Level brauchen Identität durch Terrain statt nur Gegner.
  - Vertikale Level sind weiter rausgezoomt.
- **Neue Features:**
  - Item für schnelleres Scrollen.
  - Rückholstationen an Sackgassen.
  - Fortschrittsleiste pro Level.
  - Gegner, die sich verzögert teilen.
  - Power-Ups wie bei Parodius (beim Tod weg) plus ein Item, das das teilweise aufhebt.
- **Performance-Tests:** Ruckeln soll künftig durch End-to-End-Tests messbar sein.

**Entscheidungen aus der Rückfrage:**
- **Knoten sind Kreuzungs-Arenen:** Man fliegt frei darin, ohne Zwangsscrollen. Eine Arena kann **mehr als 4 Ausgänge** haben, also mehrere pro Seite.
- **Power-Ups:** Sie bleiben zwischen Leveln, beim Tod ist alles weg. Ein neues Item verhindert das teilweise.
- **Wrap:** Das Oben/Unten-Wrap wird pro Level einstellbar. Es ist unabhängig vom Terrain, und nicht jedes Level hat es.

**Messung vorab** (Chromium, 4× CPU-Drosselung, `Renderer.draw` vs. `Game.update`):
- Normale Level liegen im Median bei 33–50 ms pro Frame. Die Spiellogik braucht davon nur ca. 1 %.
- Die Bosse Diva und Wecker haben Frames von **1,1–1,8 s**.
- Ursache: `ctx.filter = 'brightness(...)'` für den Treffer-Blitz in `src/render/sprites.js` (`drawBoss`, `drawEnemy`) und für Felsblöcke in `renderer.js`. Bei Dauerfeuer ist er fast immer aktiv, und unter einem Filter wird jeder einzelne Zeichenbefehl gefiltert.
- Dazu kommt Bildzittern auf 90/120/144-Hz-Bildschirmen. Steam Deck OLED hat 90 Hz. Die Ursache ist der feste 60-Hz-Takt ohne Interpolation (`src/main.js`).

---

## Begleitende Test-Agenten (laufen während der ganzen Umsetzung mit)

Zwei Subagenten laufen parallel zu meiner Implementierung im Hintergrund (`Agent`, `run_background`), jeweils in einer eigenen Worktree-Kopie (`isolation: "worktree"`). So stören sie meine Änderungen nicht. Sie ändern keinen Spielcode, sondern liefern Befunde. Ich setze die Befunde um oder begründe, warum nicht.

**Software-Tester**
- Prüft nach jedem Phasen-Commit den Diff auf Fehler: Randfälle, Wrap und Nicht-Wrap, Spiegelung, NaN, Speicherstand-Migration, Löser-Annahmen.
- Lässt `npm test`, `npm run e2e`, `npm run e2e:perf` und den Flacker-Test laufen und vergleicht die Perf-Werte mit dem vorherigen Stand.
- Schreibt fehlende Testfälle als Vorschlag (Patch-Text im Bericht) und versucht gezielt, Softlocks und Abstürze zu provozieren: Zufallseingaben, Speicherstand-Manipulation, Pause/Abbrechen in jedem Zustand.
- Bericht: Liste von Befunden mit Schwere, Reproduktion (Seed/Eingaben) und Testvorschlag.

**Spieletester**
- Spielt über Playwright im echten Browser: Tastatur-Eingaben, Screenshots und Bildsequenzen, die er sich ansieht.
- Bewertet aus Spielersicht:
  - Lesbarkeit (auch vertikal gezoomt);
  - Reaktionszeit;
  - Fairness von Terrain-Toden;
  - „Show don't tell“: Versteht man ohne Text, was zu tun ist?
  - Identität und Abwechslung der Level;
  - Flackern;
  - Ruckeln (Frame-Messung);
  - Spaß- und Frustpunkte;
  - Schwierigkeitskurve;
  - Orientierung über die Kartenansicht.
- Vergleicht mit dem Parodius-Vorbild: Terrain, Humor, Power-Leiste.
- Bericht: priorisierte Liste mit Screenshot-Pfaden (`e2e/playtest/`), getrennt nach „Fehler“, „Gefühl/Balancing“ und „Ideen“.

**Takt**
- **Vor Phase 1** gibt es einen Basislauf beider Agenten auf v0.1. Er dient als Vergleichswert und findet Fehler wie den Stachel-Renderfehler unabhängig von mir.
- **Nach jeder Phase** starten beide neu auf dem frischen Stand. Ihre Befunde fließen vor Beginn der nächsten Phase ein.
- Die Befunde fasse ich dir am Ende jeder Phase kurz zusammen.

---

## Phase 1: Performance, Ruckeln, Renderfehler (zuerst, weil es alles betrifft)

1. **Messbarkeit**
   - `src/main.js` bekommt einen Ringpuffer mit Update-ms, Draw-ms und Frame-Abstand, abrufbar unter `window.__wendehals.perf`.
   - Neuer Test `e2e/perf.mjs`, Szenen:
     - jedes Gebiet;
     - Dunkelzone;
     - alle 5 Bosse unter Dauerfeuer;
     - Arena-Drehung;
     - Kartenansicht.
   - Jede Szene läuft einmal ungedrosselt und einmal mit 4× CPU-Drosselung als grobe Steam-Deck-Näherung.
   - **Budgets** (Bestehen = alle eingehalten):
     - Draw+Update p95 < 8 ms ungedrosselt;
     - p95 < 25 ms gedrosselt;
     - nach dem Aufwärmen kein Frame > 50 ms.
   - Ergebnisse gehen nach `e2e/perf-report.json`; Script `npm run e2e:perf`.
2. **Boss-Lag beheben:** `ctx.filter` komplett entfernen. Der Treffer-Blitz wird eine vorgerenderte weiße Silhouette des Sprites, die mit `globalAlpha` darübergelegt wird.
3. **Sprite-Cache** (neu: `src/render/spritecache.js`)
   - Statische Sprites und Animationsframes von Gegnern, Kugeln, Bossen und Figuren werden einmal in Offscreen-Canvas gerendert, danach nur noch per `drawImage` gezeichnet.
   - Die bestehenden Zeichenfunktionen in `sprites.js` bleiben die Quelle; der Cache ruft sie einmal pro Frame-Variante auf.
4. **Hintergründe** in `renderer.drawBackground`: vorgerenderte Kacheln mit `createPattern` statt Schleifen über Einzelrechtecke. Die Dunkelmaske wird ein einmal gerendertes Canvas statt `createRadialGradient` in jedem Frame.
5. **Backbuffer begrenzen:** Gerendert wird mit höchstens 2× interner Auflösung, hochskaliert per CSS. `getContext('2d', { alpha: false, desynchronized: true })`.
6. **Bildzittern:** Positionen werden zwischen den Simulationsschritten interpoliert. Der Renderer bekommt `alpha = acc / STEP`, und Entities merken sich die Position des vorherigen Schritts.
7. **Allokationen in der Simulation:** `level.js` (`cleanup`, `collide*`) entfernt Objekte per Swap-Remove direkt im Array statt mit `filter()` in jedem Frame. Partikel kommen aus einem Pool.
8. **Renderfehler „horizontale Stacheln“**
   - Reproduktion: Screenshot-Test für Stacheln in allen 4 Flugrichtungen.
   - Vermutliche Ursachen in `renderer.drawGates` (Zweig `spikes`):
     - Die Zackenreihe ist nicht am Lückenrand ausgerichtet und wird dort nicht abgeschnitten (bis 8 px Überstand).
     - Optik und Kollision stimmen nicht überein (`gap/2` vs. `gap/2 - hc`).
   - In Phase 3 werden Stacheln ohnehin Terrain-Kacheln. Der Screenshot-Test bleibt als Regressionstest.
9. **Disco und Flackern entschärfen**
   - Tanzboden: höchstens 2 Wechsel pro Sekunde, kleinere Leuchtfläche, Deckkraft ≤ 0,15.
   - Abspann: Der Vollbild-Blitz (`Math.floor(t*12) % 2` in `drawEnding`) wird durch ein Wackeln ersetzt.
   - Neue Option „Reduzierte Effekte“ in den Optionen (`game.js` `openOptions`): kein Wackeln, kein Pulsieren.
   - Neuer Test: 30 Screenshots pro Sekunde in Disco, Bosskampf und Abspann. Die mittlere Helligkeit darf höchstens 3-mal pro Sekunde stark springen (an WCAG 2.3.1 angelehnt).

## Aktueller Stand (vor Phase 6)

Fertig und gepusht auf `ccr-d78728c5-ncws9h`:
- Phase 1–3 (inkl. 3c Splitter): 301e90c
- Phase 4, Arenen und Kartenansicht: 16382c8
- Tester-Befunde zu Phase 3: a64b729
- Phase 5, Espresso und Zeitschranken: 22d9e0f

Tests: 169/169 grün. Smoke-E2E und der Flacker-Test sind grün. Perf war beim letzten Lauf unzuverlässig, weil die Test-Agenten parallel Chromium laufen ließen. Das muss ohne Parallel-Last nachgemessen werden.

Test-Agenten Phase 4:
- **Software-Tester:** Am Sitzungslimit abgebrochen, kein Bericht. Läuft in Phase 6 neu, zusammen mit Phase 5.
- **Spieletester:** Bericht liegt vor. Die Befunde stehen in Phase 6a.

## Phase 6a: Befunde des Spieletesters zu Phase 4

1. **Rückzug/Abbruch-Schleife (Fehler).**
   - Problem: Nach dem Rückzug vor der Wand oder „Etappe abbrechen“ steht man 70 px vor derselben offenen Klappe. Gehaltenes „vorwärts“ startet die Etappe sofort wieder.
   - Fix: In `game.abortLevel` wird die Arena mit umgekehrter Blickrichtung betreten (`opposite(o.heading)`), wie nach einer Kehrtwende. Die Klappe ist dann zu, und man schaut in die Arena.
   - Erlaubt ist das, weil der Löser denselben Zustand über Wendehals bzw. Ankunft ohnehin kennt. Damit kein neuer Zustand ohne Ausweg entsteht, wird der Löser um den Übergang „Rückzug“ erweitert: `(node, h) → (node, opposite(h))` für Kanten mit harten Hindernissen, deren Item fehlt.
   - Danach sorgen die Garantietests dafür, dass es keine Sackgassen gibt.
   - Test: Rückzug, dann 2 s „vorwärts“ halten → man ist weiter in der Arena.
2. **Karte zeigt versperrte Kanten nicht (Fehler).**
   - `progress.blockedEdges` wird beim Rückzug gesetzt und beim Durchfliegen wieder gelöscht.
   - In `drawMap` bekommt eine solche Kante ein Schloss bzw. ein Hindernis-Symbol (Fels, Spalt, Uhr) in der Mitte.
   - Die Liste wird in `sanitizeProgress` geprüft.
3. **Kartenfarben verwechselbar.** Die aktive Blickrichtung wird nicht mehr gelb gezeichnet, sondern weiß-pulsierend mit Pfeilspitze. Bekannte Kanten behalten ihre Themenfarbe.
4. **Ring dreht nur rechts.**
   - Die Drehscheibe dreht je nach Einflugrichtung:
     - im Uhrzeigersinn umrundet → rechts;
     - gegen den Uhrzeigersinn → links.
   - Umgesetzt wird das über den Winkel beim Eintritt relativ zum Ringmittelpunkt bzw. die Querbewegung (Kreuzprodukt aus Ortsvektor und Geschwindigkeit). Die Pfeile am Ring zeigen beide Richtungen: außen rechts herum, innen links herum.
   - Der Löser (`turnOptions`) bekommt an Drehscheiben `turnCW` **und** `turnCCW`.
   - Der Test-Bot fliegt den Ring passend an.
5. **Erste Drehung lernen:** Der Toastständer bekommt einen zweiten, sinnvollen Ausgang nach Süden. Das ist eine kurze, leichte Etappe, die als Einbahn zum Eierbecher führt. So lernt man den Ring, bevor die Krümelmauer einen abweist.
   - Das wird nur gemacht, wenn der Löser grün bleibt. Sonst bleibt es weg, und der Spieler erfährt davon.
6. **Kleinigkeiten:**
   - Toast nach Rückholstation, z. B. „Rückholung: Marmeladenglas“.
   - Dialog „Extrawürstchen“ mit Zeile „+1 Energie“.
   - Drehwurm-Text: „K / B: Drehen“.
   - K ohne Drehwurm zeigt sichtbares Kopfschütteln und „?“ wie beim Rückzug, statt nur Wackeln.
   - Butterdose: Ankunftsposition einen Tick weiter in die Arena (`depth` 70), damit ↓ nicht sofort zurückführt.
   - Überlauf-Kante auf der Karte als Ecklinie (erst horizontal raus, dann vertikal) statt diagonal.

## Phase 6b: Abschluss

1. Perf ohne parallele Agenten zweimal messen. Liegt Walross/Diva gedrosselt dauerhaft über 16 ms, mit Profil nachbessern (z. B. Walross-Sprite als Cache).
2. `README.md` und `docs/DESIGN.md` aktualisieren:
   - Arenen, Ring, Stationen, Rückholstation, Karte (M / Tab / View);
   - Espresso (E / RB), Zeitschranke, Splitter, Sofort-Tod, Sparstrumpf, Vertikal-Zoom.
   - `docs/PLAN-v0.2.md` mit diesem Stand synchronisieren.
3. `npm run dist:linux` (und `dist:win`, falls wine/Tooling vorhanden, sonst nur zip/portable wie bisher) bauen. Danach `xvfb-run -a npm run e2e:desktop` gegen Electron und gegen `release/linux-unpacked`.
4. Beide Test-Agenten auf dem Endstand neu starten (Software-Tester prüft Phase 4+5+6, Spieletester das Gesamtspiel). Ihre Fehler-Befunde werden vor dem letzten Commit eingearbeitet.
5. Commit „Phase 6“ und Push, danach kurze Zusammenfassung an Robin. Offener Punkt aus dem Spieltest: Die vertikale Größe (Zoom 0,56) bleibt wie gewünscht; der Spieler soll sie auf dem Steam Deck beurteilen.

## Verifikation Phase 6
- `npm test`, darunter neue Tests für:
  - Rückzug ohne Schleife;
  - Ring in beide Richtungen;
  - blockedEdges im Spielstand;
  - Löser-Garantien mit Rückzug-Übergang.
- `npm run e2e`: Ring links und rechts per Tastatur; Screenshot der Karte mit Schloss-Symbol.
- `node e2e/flash.mjs`, `node e2e/perf.mjs` (zweimal, ohne Parallel-Last).
- `xvfb-run -a npm run e2e:desktop` gegen das gepackte Linux-Release.

## Stand bei Unterbrechung (Limit, historisch)

- **Phase 1 ist fertig** und gepusht (Commit 212e869). Alle Tests und E2E-Budgets sind grün.
- **Phase 2 ist teilweise erledigt**, noch nicht committet:
  - Sofort-Tod an Terrain, Stacheln und Zahnrädern;
  - Wandvorschau im Test-Bot;
  - Kauf-Reihenfolge der Power-Ups und `powerupsAfterDeath`;
  - Item Sparstrumpf mit Knoten `sockenschublade` und Etappe `flusensieb`;
  - ruhigere Stachel-Lücken.
  - Letzter Testlauf: 130/130 grün.
- **Offen in Phase 2:** Fortschrittsleiste, „Show don't tell“-Texte, Tests für Sparstrumpf und Power-Up-Erhalt, danach Commit.
- **Test-Agenten:** Die Prüfläufe nach Phase 1 sind am Limit abgebrochen. Sie starten nach dem Phase-2-Commit neu (Prüfung von Phase 1 und 2 zusammen).

## Phase 2: Regeln und Oberfläche

1. **Schadensmodell** (`level.js`)
   - Gegner, Kugeln und Bosskontakt kosten 1 Energie (bisher `damage()`).
   - **Festes Terrain, Stacheln, Felsen, Metall und Zerquetschen durch den Bildrand töten sofort.** Neue Methode `instantDeath()`.
   - Mit Quietscheentenhaut sind Stacheln harmlos (Abprallen mit Quietschen).
2. **Power-Ups wie Parodius**
   - Sie bleiben über alle Level und Arenen hinweg erhalten; die Übergaben in `game.js` werden per Test abgesichert.
   - Beim Tod wird alles zurückgesetzt (`returnToStation`).
   - **Neues Item „Omas Sparstrumpf“:** Beim Tod bleibt die erste Hälfte der gekauften Power-Ups erhalten, abgerundet.
     - Dafür führt `powerups.js` eine Kauf-Reihenfolge (`p.order`).
     - Neue Funktion `powerupsAfterDeath(p, hasSparstrumpf)`.
3. **Fortschrittsleiste** in `renderer.drawHud`: eine dünne Leiste mit `camA / (L - va)`, Markierung für den Boss und Symbol für den Zielknoten. Arenen zeigen stattdessen den Raumnamen.
4. **Show don't tell**
   - **Raus fliegen:**
     - `GATE_HINTS` und die Hindernis-Hinweise in `text.js` und `level.gateHints`;
     - „(fehlt: …)“ im Kartenpanel;
     - die Item-Zuordnung der Kartensymbole;
     - die Item-Beschreibungen mit Spielmechanik.
   - **Bleibt:** Steuerungshilfe (Tutorial-Hinweise, Steuerungsbildschirm). Ein Item-Fund zeigt nur Name, Jingle und, falls nötig, die Taste („Drehwurm – R: drehen“).
   - **Optisch zeigen statt sagen:**
     - Risse in zerstörbarem Fels, Funken beim Abprallen.
     - Bohrer-Schüsse sehen anders aus.
     - Enge Spalten haben einen sichtbaren Einlauf.

## Phase 3: Terrain-Engine und Level-Identität

1. **Terrain-Format:** Neuer Ordner `src/data/levels/`, eine Datei pro Gebiet.
   - Jedes Level und jede Arena hat:
     - ein ASCII-Kachelraster (Kachel 16 px, Zeilen = Querachse, Spalten = Flugrichtung);
     - ein Flag `wrap: true|false`;
     - `H` (Höhe der Querachse);
     - eine Liste dynamischer Objekte;
     - Gegnerwellen.
   - Kachelzeichen:

     | Zeichen | Bedeutung |
     |---|---|
     | `#` | fest |
     | `R` | Fels (Bohrer) |
     | `M` | Metall |
     | `^` | Stachel |
     | `~` | zäh/Wasser (verlangsamt) |
     | `.` | frei |

   - Rückwärtsflug spiegelt das Raster, wie heute `mirrorGates` in `levelgen.js`.
2. **Neues Modul `src/game/terrain.js`:**
   - Kollision Box gegen Kacheln: Wrap-sicher, nur die Kacheln unter der Box prüfen.
   - Schuss gegen Kachel (ersetzt `wallHit` und den Felsen-Zweig in `collideShots`).
   - Pro Kachelzeile vorgerenderte Canvas-Stücke für den Renderer.
   - Die heutigen Gates (`rock`, `narrow`, `spikes`, `dark`) werden zu Kachelbereichen bzw. Zonen. Die Kamera-Halte-Logik aus `updateCamera` bleibt für blockierende Wände.
3. **Dynamisches Terrain** als wiederverwendbare Bausteine, alle datengetrieben:
   - bewegter Block (Pfad), drehendes Zahnrad, Kolben (getaktet), Pendel;
   - Strömung (Kraftfeld), Zähzone;
   - zeitgesteuerte Schranke (für das Espresso-Item).
4. **Eigene Level-Identitäten:** jede Etappe handgebaut, je ein Leit-Gimmick pro Gebiet plus Variationen.

   | Gebiet | Terrain-Ideen |
   |---|---|
   | Frühstück | Toastscheiben schießen aus Toastern (bewegte Plattformen), Kaffeetassen-Türme, Marmeladenfluss (zäh), Zuckerstreuer-Regen |
   | Bad | steigender/fallender Wasserstand, Duschstrahlen im Takt, Abflussstrudel (Strömung), Fliesenwände |
   | Keller | Regal-Labyrinth, Einmachglas-Stapel als zerschießbares Terrain, Spinnweben (zäh), Dunkelheit |
   | Disco | Lautsprechertürme mit Schallwellen (Rückstoß), im Musiktakt hebende Tanzplattformen, Lavalampen-Blasen |
   | Uhrwerk | rotierende Zahnräder, Pendel, Uhrzeiger-Schranken |

   Gegnerwellen werden pro Level gesetzt statt nur zufällig. `buildEvents` in `levelgen.js` bleibt als Füller für Lücken.
5. **Wrap pro Level:** `H` wird pro Level festgelegt. Ohne Wrap begrenzen tödliche Ränder oder Terrain die Querachse; Kamera und Kollision bekommen einen Nicht-Wrap-Zweig neben `wrapDelta`.
6. **Vertikale Level rauszoomen**
   - Die sichtbare Länge in Flugrichtung ist immer 480 Einheiten.
   - Bei Nord/Süd skaliert der Renderer mit 270/480 = 0,5625. Die sichtbare Breite quer wird damit 853, also bekommen vertikale Wrap-Level `H ≥ 960`.
   - `viewDims` in `src/core/math.js` liefert zusätzlich `zoom`, `Renderer.drawLevel` skaliert damit.
   - Die Drehanimation interpoliert den Zoom mit.
   - Gleiche Reaktionszeit wird per Test geprüft: Abstand Spieler → Vorderkante geteilt durch Gegnertempo ist in allen Richtungen gleich.
7. **Splitternde Gegner**
   - Generisches `split`-Feld in `enemies.js`: `{ into, count, delay: 0.35, maxGeneration: 1 }`.
   - Kinder entstehen erst nach der Verzögerung (sichtbares Wackeln), sind bis dahin unverwundbar und teilen sich selbst nicht weiter.
   - Seife und Wurst werden darauf umgestellt. Neu in jedem Gebiet mindestens einer, z. B. Brezel → 2 Hälften, Wecker → Zahnrädchen, Kartoffel → Pommes.

## Phase 4: Welt-Umbau (Knoten werden Arenen, Karte wird Ansicht)

1. **Datenmodell** `src/data/world.js`
   - **Knoten:** `{ name, area, map: {x, y}, room: <Arena-Layout>, exits: [{ id, side, pos }], objects: [...] }`.
     - `side` ist eine der 4 Seiten, `pos` die Position entlang der Seite (0..1). Mehrere Ausgänge pro Seite sind erlaubt.
     - Objekte: `save`, `turntable`, `return` (Rückholstation), `item`.
   - **Kanten verbinden Ausgänge:** `{ from: {node, exit}, to: {node, exit} }`. Die Ausgänge müssen auf gegenüberliegenden Seiten liegen. `oneWay`, `boss` und `reward` bleiben.
   - Das Kartenraster entfällt als Pflicht. `map.x/y` dient nur der Darstellung, Kanten werden achsenparallel mit Versatz gezeichnet.
2. **Arena-Spiel** (neu: `src/game/room.js`, nutzt Terrain, Spieler, Waffen und Gegner aus `level.js`)
   - **Grundregeln:**
     - Kein Zwangsscrollen; die Kamera folgt dem Spieler innerhalb der Raumgrenzen.
     - Die Welt ist nach der Blickrichtung gedreht.
     - Ein Ausgang öffnet sich nur, wenn man in seine Richtung schaut (sichtbare Klappe).
     - Durchfliegen startet die Etappe nahtlos.
   - **Drehen:**
     - Drehscheibe = Ring zum Durchfliegen: 90° rechts, mit Drehanimation.
     - Drehwurm = Taste.
     - Wendehals = 180° (auch in Etappen, wie bisher `level.tryWende` / `reverse`).
   - **Stationen:**
     - Speicherstation = Objekt; Hineinfliegen speichert.
     - Rückholstation = Objekt an Sackgassen-Arenen; bringt sofort zurück zur Herkunfts-Arena (fest pro Station im Datenmodell).
   - **Gemeinsamen Code herausziehen:** Spieler-Logik (`updatePlayer`, `fireWeapons`, `collidePlayer`, Partikel, Kugeln) wandert aus der Klasse `Level` in ein gemeinsames Modul `src/game/actors.js`. Arena und Etappe teilen es.
3. **Spielablauf** `src/game/game.js`
   - **Ersetzt:** Die Bildschirme `map` und `level` werden zu `play`, mit `current` = Arena oder Etappe.
   - **Übergänge:**
     - Etappen-Ende → Ankunft am Zielausgang der Arena, Blickrichtung bleibt.
     - Tod → letzte Speicherstation.
     - „Etappe abbrechen“ → zurück in die Herkunfts-Arena.
   - **Kartenansicht:** neue Taste Karte (Tab/M bzw. Select/View). Sie zeigt erkundete Arenen und Etappen, die eigene Position, Stationen und gefundene, aber nicht eingesammelte Items. Keine Auswahl.
   - **Wiederverwenden:** `drawMap` in `renderer.js` als Ausgangspunkt. Schnellreise (Rohrpost) bleibt als Funktion der Speicherstation.
4. **Weltgraph und Löser** (`worldgraph.js`, `solver.js`)
   - Der Zustand bleibt (Knoten, Blickrichtung, Items).
   - `linkAt` liefert pro Seite eine **Liste** von Ausgängen → mehrere Nachfolger.
   - Neue Übergänge: Rückholstation, Drehscheibe als Objekt.
   - Neue Hindernistypen: Zeit-Schranke (Espresso, hart), Zähzone (weich).
   - Alle bestehenden Garantie-Tests bleiben und werden an das neue Modell angepasst:
     - Sackgassenfreiheit mit und ohne Können;
     - Respawn;
     - 100 % erreichbar;
     - Abkürzungen.

## Phase 5: Neues Item „Doppelter Espresso“ (schneller scrollen)

- Taste halten: Scrollgeschwindigkeit ×2 (Spieler-Tempo steigt mit, Anzeige in der Fortschrittsleiste).
- **Nutzen:** schnelleres Zurückfliegen (Metroidvania-Backtracking) und **zeitgesteuerte Schranken**, die nur offen sind, wenn man schnell genug ankommt. Das ist ein hartes Hindernis, im Löser mit Item `ESPRESSO`.
- Taste: Tastatur `E`, Controller rechte Schultertaste (RB). Wird in `input.js` ergänzt.

## Phase 6: Balancing, Doku, Abschluss

- Fairness-Test (`dodgeInput` in `tests/helpers/bot.mjs`) auf Terrain erweitern: Der Bot weicht festen Kacheln aus.
- Gegnerdichte, Bosse und Gimmicks nachjustieren.
- `README.md` und `docs/DESIGN.md` aktualisieren (Welt, Regeln, Steuerung inkl. Karten- und Espresso-Taste).
- Windows- und Linux-Paket neu bauen und den Electron-Test auf das Paket laufen lassen.

---

## Kritische Dateien

| Bereich | Dateien |
|---|---|
| Performance | `src/main.js`, `src/render/renderer.js`, `src/render/sprites.js`, neu `src/render/spritecache.js` |
| Simulation | `src/game/level.js` (aufteilen), neu `src/game/actors.js`, `src/game/room.js`, `src/game/terrain.js` |
| Daten | `src/data/world.js` (neues Modell), neu `src/data/levels/*.js`, `src/data/items.js` (Sparstrumpf, Espresso), `src/data/text.js` |
| Logik | `src/game/worldgraph.js`, `src/game/solver.js`, `src/game/powerups.js`, `src/game/game.js`, `src/game/enemies.js`, `src/game/levelgen.js` |
| Eingabe | `src/core/input.js`, `src/core/math.js` (`viewDims` + Zoom) |
| Tests | `tests/*.tests.mjs`, `tests/helpers/*.mjs`, `e2e/smoke.mjs`, neu `e2e/perf.mjs`, `e2e/flash.mjs` |

Wiederverwendet werden:
- `wrapDelta`, `screenToLocalVec`, `localToScreenVec`, `headingAngle` (`math.js`);
- `Rng` (`rng.js`);
- `traverse`, `arrive`, `canTurnAt` (`worldgraph.js`) als Basis für Mehrfach-Ausgänge;
- `explore`, `canReachGoal`, `analyzeWithRespawn` (`solver.js`);
- `botInput`, `dodgeInput`, `runLevel` (`tests/helpers/bot.mjs`);
- `planToGoal`, `flyLevel` (`tests/helpers/driver.mjs`);
- alle Zeichenfunktionen in `sprites.js` (als Quelle für den Sprite-Cache);
- Audio unverändert.

## Verifikation

1. `npm test`: alle Unit- und Simulationstests. Neu:
   - Terrain-Kollision (Wrap und Nicht-Wrap);
   - Sofort-Tod vs. Energie;
   - Power-Ups über Level und Arenen hinweg;
   - Tod mit und ohne Sparstrumpf;
   - verzögertes Splitten ohne Kettenreaktion;
   - gleiche Reaktionszeit in allen Richtungen;
   - Espresso-Schranken;
   - Mehrfach-Ausgänge, Rückholstationen;
   - Löser-Garantien;
   - Komplettdurchlauf und 100-%-Lauf über das neue Arena-Modell.
2. `npm run e2e`: Browser-Test mit Screenshots, darunter Stacheln in allen 4 Richtungen (Regression des Renderfehlers), Arena, Kartenansicht und Drehung. Ich sehe mir die Screenshots selbst an.
3. `npm run e2e:perf`: Frame-Budgets ungedrosselt und mit 4× Drosselung, inkl. aller Bosse. Messwerte vorher/nachher kommen in die Commit-Beschreibung.
4. `e2e/flash.mjs`: Flacker-Grenze in Disco, Bosskampf und Abspann.
5. `xvfb-run -a npm run e2e:desktop` gegen Electron und gegen das gepackte `release/linux-unpacked/wendehals`.
6. Berichte von Software- und Spieletester-Agent pro Phase: Keine offenen Befunde der Schwere „Fehler“ dürfen in die nächste Phase mitgenommen werden.
7. **Reihenfolge der Commits:** Phase 1 zuerst und einzeln. Die schnellen Gewinne (Boss-Lag, Ruckeln, Disco, Stacheln) sind dann sofort spielbar, bevor der große Umbau beginnt. Jede Phase endet mit grünen Tests und einem Push auf `ccr-d78728c5-ncws9h`.
