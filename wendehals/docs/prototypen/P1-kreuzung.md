# Bau-Brief P1 „Kreuzung“ – das drehende Fenster

> Für eine **neue Code-Session**. Modell: **Sonnet 5.5**. Zeitbox: **eine Sitzung (~3 h)**.
> Wegwerf-Prototyp: nichts davon geht direkt ins Spiel. Prozess und Entscheidungen:
> [`../PROTOTYPEN.md`](../PROTOTYPEN.md). Hintergrund (nur bei Bedarf lesen):
> [`../forschung/2026-10-05-richtungen-6-prototyping-p1.md`](../forschung/2026-10-05-richtungen-6-prototyping-p1.md),
> Robins Skizze: [`../forschung/2026-10-05-richtungen-skizze-robin.png`](../forschung/2026-10-05-richtungen-skizze-robin.png).

## 1. Fragekarte

- **Frage:** Nehme ich die Gabelung, die ich will, indem ich das Fenster drehe – richtige Taste beim
  ersten Mal, ohne nachzudenken –, auch wenn ich nach einer 180°-Umkehr nach links fliege und der Plan
  kopfüber steht?
- **Woran Robin es merkt (2–5 Minuten):** Er holt Knochen, ohne an der Kreuzung zu zögern – oder er
  öffnet falsche Türen und kann sagen, wann (beim Linksflug? kopfüber?).
- **Bewusst nicht drin:** siehe Abschnitt 4 (OUT).

## 2. Robins Regeln (verbindlich, nicht neu interpretieren)

- Die Welt ist ein **Grundriss von oben**, Norden oben auf dem Plan.
- **Der Bildschirm ist ein Fenster** auf dem Plan. Das Bild kippt nie; der Plan erscheint gedreht.
  Gespielt wird waagerecht, man fliegt nach links oder rechts.
- Zustand: **θ** = Kartenrichtung, in die das **rechte Fensterende (R)** zeigt; **s** ∈ {R, L} = Seite,
  zu der gescrollt wird. Blickrichtung **h = θ** bei s = R, **h = θ + 180°** bei s = L.
- **Drehen links/rechts** = θ − 90° / θ + 90° (gegen/im Uhrzeigersinn), **s bleibt**. Das ist immer eine
  Links-/Rechtsdrehung des Dackels. Prüffall aus der Skizze: θ = Osten, rechts drehen → R-Ende zeigt nach
  Süden, das L-Ende steht oben.
- **180° (Y)** = nur s wechselt (Scrollrichtung kehrt um). Das Fenster dreht sich nicht, der Dackel dreht
  sich sichtbar um.
- **Die Bilddrehung pausiert das Spiel.** Eingabe bleibt bildschirmbezogen: wer durch die Drehung „rechts“
  hält, bewegt sich danach nach rechts (kein Festhalten der alten Bedeutung).
- **Türen** (Entscheidung E9, Standard): Die Tür eines Arms ist offen, solange das Fenster **entlang der
  Kartenachse dieses Arms** scrollt (egal in welche Richtung) – also wenn h oder h + 180° die Richtung des
  Arms ist. Sonst ist sie zu (wirkt wie eine Wand).
- Kopfüber ist erlaubt. Nichts wird gespiegelt.

## 3. IN – was gebaut wird

**Karte** (Kartenkoordinaten, y nach unten, Norden oben), Werte als Konstanten oben in der Datei:
- Eine **Kreuzung** (Quadrat, Mittelpunkt 0,0) mit **4 Sackgassen-Armen** nach N, O, S, W, je ~8 s Flug
  lang. Farben: Norden rot, Osten blau, Süden grün, Westen gelb.
- Startwerte: `SPEED = 90` (Einheiten/s), `ARM = 720`, `WIDTH = 200` (Gangbreite; der Bildschirm ist
  480×270, oben und unten sind die Wände zu sehen).
- An jeder Armmündung eine **Tür** in Armfarbe (offen: nur Rahmen; zu: gefüllter Balken).

**Ablauf („Knochen holen“, endlos, kein Gewinnen/Verlieren):**
- Das HUD zeigt die Farbe des gesuchten Knochens. Der Knochen liegt am Ende des Arms dieser Farbe.
  Erreicht → Zähler +1, neue Zielfarbe = ein **anderer** Arm (Zufall mit festem Startwert; Notlösung bei
  Zeitmangel: feste Reihenfolge).
- Start am Ende des westlichen (gelben) Arms, θ = Osten, s = R (man fliegt zur Kreuzung). Erstes Ziel:
  nicht Gelb.

**Bewegung:**
- Das Fenster (Kamera-Mittelpunkt auf dem Plan) scrollt mit `SPEED` in Blickrichtung h und **hält an**,
  wenn es nicht weiter kann (Sackgasse, geschlossene Tür, Wand nach einer Drehung im Gang).
- Der Dackel bewegt sich mit dem Stick **innerhalb des Bildschirms** (bildschirmbezogen, Bildrand als
  Grenze). Wände und geschlossene Türen schieben zurück; kein Schaden, kein Tod.

**Steuerung:**

| Aktion | Controller | Tastatur |
|---|---|---|
| Bewegen | Stick / Steuerkreuz | Pfeile / WASD |
| Fenster links drehen (−90°) | **LB** (Pad-Taste 4, heute frei) | **U** |
| Fenster rechts drehen (+90°) | **RB** (Pad-Taste 5 = heute Espresso) | **O** (und E) |
| 180°-Umkehr | **Y** (Aktion `wende`) | L / Q |
| Zurück zum Titel | Start / Menü (Aktion `pause`) | Esc |

- **Drehung („Schwenk“):** 0,5 s, **Spiel pausiert**, Tastendrücke währenddessen werden ignoriert. Der
  Dackel bleibt an seiner Bildschirmstelle, der Plan dreht sich darunter (Winkel weich interpoliert).
  Liegt die Kreuzungsmitte im Bild, gleitet das Fenster während des Schwenks zusätzlich auf die
  Kreuzungsmitte. Drehen geht überall; im Gang zeigt man danach eben in eine Wand und das Fenster steht.
- **Umkehr (Y):** s wechselt, die Scrollgeschwindigkeit läuft weich durch null in die neue Richtung
  (~0,4 s), der Dackel dreht sich sichtbar um. **Keine** Pause.

**Grafik:** nur einfache Formen. Boden als Rechtecke mit Gitter (damit Scrollen und Drehung sichtbar
sind), dunkle Wände, Türbalken in Armfarbe, Knochen als Kreis/Knochenform in Armfarbe, der vorhandene
Dackel-Sprite `drawDackel(ctx, t)` aus `src/render/sprites.js` (schaut nach rechts; bei s = L gespiegelt
bzw. um 180° gedreht, mit Dreh-Animation bei der Umkehr). Kein Text in der Welt. HUD-Text (Zielfarbe,
Zähler, kurz am Anfang „LB/RB drehen · Y umkehren“) wird nie mitgedreht.

## 4. OUT – bewusst nicht bauen

Schleife/Landmarken/„wo ist zuhause“ (P2), 45°-Drehungen und Diagonalen (P3), Gegner und Schießen (P4),
Minimap oder Kompass, Halt-Zonen, Protokolle und Messungen, Festhalten der Stick-Bedeutung, Speichern,
Fähigkeiten/Drehzahl, jede Änderung an `worldgraph*`/Löser/`welt.json`/`Level`/`Arena`, Bot- und
Render-Tests, Perf-/Flacker-Szenen, Tester-Agenten. Diese Liste kommt als Kommentar an den Anfang von
`src/proto/fenster.js` („geparkt, nicht vergessen“).

## 5. Dateien und Anbindung

**Neu:**
- `src/proto/fenster.js` – Logik, rein und testbar (~200 Zeilen): Klasse `FensterScene` mit
  `update(dt, input)`, Zustand `{ cam, dog, theta, s, swing, flip, target, score }`, Karte als Daten,
  Türregel, Drehen/Umkehr. Optional `rng`-Parameter für Tests.
- `src/proto/fenster-draw.js` – Zeichnen (~120 Zeilen): Bildschirmmitte, dann Drehung um
  `−headingAngle(theta)` (+ Schwenk-Interpolation), dann Kamera; Boden, Wände, Türen, Knochen; Dackel und
  HUD im Bildschirmraum.
- `tests/fenster.tests.mjs` – siehe Abschnitt 6.
- `e2e/fenster.mjs` – Wegwerf-Skript für Screenshots, siehe Abschnitt 6.

**Richtungen nur über `src/core/math.js`** (`E, S, W, N`, `turnBy`, `turnCW`, `turnCCW`, `opposite`,
`DIR_VEC`, `headingAngle`, `isHorizontal`, `isVertical`). `tests/directions.tests.mjs` scannt `src/` und
schlägt fehl bei Richtungs-Arithmetik wie `& 3`, `% 2` auf Richtungen, `heading * Math.PI`, Zahlen als
Richtung. Nicht abschwächen – die Helfer benutzen.

**Anbindung an das bestehende Spiel (nur diese Stellen, ~20–30 Zeilen):**
- `src/core/input.js`: neue Aktionen `rotLeft` (Pad 4, Taste `KeyU`) und `rotRight` (Taste `KeyO`) in
  `KEYMAP`/`PADMAP`/`ACTIONS`; in `poll()` zusätzlich `rotLeft: pressed('rotLeft')`,
  `rotRight: pressed('rotRight')`, `espressoPressed: pressed('espresso')`. Der Prototyp nimmt
  `rotRight || espressoPressed` als „rechts drehen“ (RB bleibt im Spiel Espresso).
- `src/game/game.js`: `startProto(name)` setzt `screen = 'proto'` und `this.proto = new FensterScene()`;
  in `update()` ein `case 'proto'` (Pause/Start → zurück zum Titel, sonst `this.proto.update(dt, input)`);
  `openOptions(back, { fromTitle })` – nur wenn vom Titel geöffnet, Eintrag **„Prototyp: Fenster“**.
  Im Titelmenü-Aufruf `fromTitle: true` übergeben. (Nicht ins Titelmenü selbst: das zeichnet der Golden
  Master. Nicht aus dem Pausenmenü: das würde ein laufendes Spiel verwerfen.)
- `src/render/renderer.js`: in `draw()` ein `case 'proto'` → `drawFenster(ctx, game.proto, alpha)`.
- `src/main.js`: **P1-Builds starten direkt im Prototyp; vor dem Übernehmen eines späteren Prototyps oder zurück zu v0.2 wird das wieder umgestellt.** Ohne Parameter wird nach dem Erzeugen von `Game` direkt `game.startProto('fenster')` aufgerufen; `?spiel` öffnet das alte Spiel (Electron: `WENDEHALS_SPIEL=1`).

## 6. Sicherheitsnetz und Prüfung

- `npm ci` (in Cloud-Containern mit `ELECTRON_SKIP_BINARY_DOWNLOAD=1`), dann:
- **`npm test` grün – insbesondere `tests/golden.tests.mjs` unverändert grün** (beweist: das v0.2-Spiel
  ist unberührt). Den Golden Master **nicht** neu schreiben. Schlägt er an, ist etwas am Spiel verändert
  worden → zurücknehmen.
- **`npm run e2e` grün.**
- `tests/fenster.tests.mjs` (4–5 Tests):
  1. Drehen ändert θ um ±90°, s bleibt; Prüffall der Skizze (θ = Osten, rechts drehen → R-Ende nach Süden).
  2. Y ändert nur s (Blickrichtung +180°), θ bleibt.
  3. Türregel: Tür offen genau dann, wenn h oder h + 180° die Armrichtung ist.
  4. Während des Schwenks wird Eingabe ignoriert; danach wirkt „rechts“ bildschirmbezogen.
  5. 3 Minuten Zufallseingabe (fester Startwert): kein Fehler, der Dackel verlässt nie den Boden.
- `e2e/fenster.mjs` (Wegwerf, nicht in `npm test`): lädt `dist/index.html?proto=fenster` in Chromium
  (`/opt/pw-browsers/chromium` oder `CHROMIUM_PATH`, siehe `e2e/smoke.mjs`), macht 4 Screenshots nach
  `e2e/screenshots/fenster-*.png`: Start, mitten im Schwenk, nach Linksdrehung, kopfüber (z. B. Kreuzung
  von Süden kommend mit θ = Westen). Die Bilder selbst ansehen, bevor gepusht wird.
- Kurzer Selbst-Review nur der Anbindungsstellen (Abschnitt 5). Keine Tester-Agenten nötig.

## 7. Fertig, wenn

- [ ] Optionen (vom Titel) → „Prototyp: Fenster“ startet die Szene; Start/Esc führt zurück zum Titel.
- [ ] LB/RB drehen das Fenster wie in der Skizze, mit pausiertem 0,5-s-Schwenk.
- [ ] Y kehrt die Scrollrichtung um, der Dackel dreht sich sichtbar, das Fenster dreht sich nicht.
- [ ] Türen öffnen nur entlang der Achse, auf der das Fenster scrollt; falsche Drehung → falsche Tür.
- [ ] Knochen-Schleife läuft endlos, die Zielfarbe wechselt.
- [ ] `npm test` (mit unverändertem Golden Master) und `npm run e2e` grün; Fenster-Tests grün.
- [ ] Screenshots angesehen.
- [ ] Commit und Push auf den Branch der Session.

## 8. Rückmeldung an Robin (am Ende der Session)

1. Was gebaut ist, Abweichungen vom Brief (mit Grund), Testergebnisse.
2. **So kommt es aufs Steam Deck:** den Branch in `ccr-d78728c5-ncws9h` übernehmen → der Workflow
   `.github/workflows/wendehals-release.yml` baut die AppImage unter dem Tag `wendehals-latest` →
   herunterladen, starten – das Spiel startet direkt im Prototyp.
3. Die drei Fragen für Robin nach 2–5 Minuten Spielen:
   - Wann hast du die falsche Drehung gedrückt?
   - Fühlte sich der pausierte Schwenk wie Lenken an oder wie eine Unterbrechung?
   - Passte „links = der Dackel dreht nach links“ zu deinem Denken?
4. Robins Antwort kommt als **F1** ins Entscheidungsprotokoll in `docs/PROTOTYPEN.md`.

## 9. Änderungen nach Robins Spieltests (05./06.10.2026)

- Direktstart im Prototyp (siehe Abschnitt 5).
- Schwenk dreht um den Dackel (nicht um die Bildmitte); die Drehung ändert die Position des Dackels nie.
- Scroll-Behälter: Kamera folgt dem Dackel quer, höchstens ±40 um die Gangmitte, stetig ohne Ruck.
- Drehen nur auf der Kreuzung, mit Toleranz bis 160 Einheiten davor/dahinter; ein Dreh-Symbol unten in der Mitte
  leuchtet, wenn Drehen geht, und wackelt rot mit Ton bei Ablehnung. Die 180°-Umkehr geht überall.
- **Türen entfernt** (Robin). Damit entfällt die Türregel E9 im P1.
- Der Dackel wird von der Kamera nie seitlich geschoben; ohne Eingabe ändert sich seine Kartenposition nur durch das
  Scrollen in Blickrichtung.
