# Bau-Brief P2 „Minimap“ – drei Minimap-Versionen im Netz

> Für eine Code-Session. Modell: **Sonnet 5.5** (Bauen und Testen). Zeitbox: eine Sitzung (~3 h).
> Wegwerf-Prototyp. Baut auf P1c „Netz“ auf ([`P1c-netz.md`](P1c-netz.md), Abschnitt 9 = Stand des Netzes).
> **Vorher lesen und befolgen:** `wendehals/CLAUDE.md`, Abschnitt „Regeln für jede Prototyp-Arbeit“ (u. a. Regel 1: vor
> jeder Abweichung Robin fragen, ob es das ist, was er will).
> Status: **von Robin validiert am 08.10.2026** (Besprechung mit Opus 5.5; Wortlaut der Entscheidungen in Abschnitt 3).

## 1. Fragekarte

- **Frage:** Welche Minimap lässt mich im Netz am sichersten wissen, wo ich bin und wohin ich drehen muss –
  V1 „wie die Kamera“, V2 „Plan“ (Norden oben) oder V3 „Gang-Balken“?
- **Woran Robin es merkt (5 Minuten):** Er sammelt Knochen im Netz und schaltet mit M durch die Versionen; mit einer
  Version zögert er an Kreuzungen nicht und verfliegt sich nicht.
- **Bewusst nicht drin:** große Karte (eigener späterer Prototyp), Aufdecken (alles ist sichtbar), Zielfaden,
  Bildschirm-Striche, Spur auf der Minimap (außer der V3-Füllung), Landmarken, Gegner, 45°, jede Änderung an Drehen,
  Kamera, Bewegung oder der Netz-Karte.

## 2. Abnahme-Checkliste (zuerst; jede Zeile bekommt einen automatischen Test aus Spielersicht)

Alle Punkte aus [`../PROTOTYPEN.md`](../PROTOTYPEN.md) Abschnitt 4a gelten weiter (die P1c-Tests bleiben grün). Neu:

- [ ] **Die Minimap ändert das Spiel nicht:** gleiche Eingabefolge (inkl. Drücken von M) → Kartenposition und
      Bildschirmstelle des Dackels und Kamerabild in jedem Frame gleich, egal ob V1, V2, V3 oder „aus“.
- [ ] **Punkt stimmt:** Der Dackel ist ein Punkt (kein Pfeil). Seine Stelle auf der Minimap entspricht in V1 und V2 der
      Kartenposition des Dackels (≤ 1 px), in jeder Lage, auch kopfüber und während des Schwenks; in V3 seiner Lage
      entlang des Gangs (≤ 1 px).
- [ ] **V1 „wie die Kamera“:** Das Fenster-Rechteck liegt immer waagerecht; die Minimap ist eine verkleinerte Kopie
      des Kamerabilds (gleiche Drehung, gleiche Mitte): rechts auf der Minimap = rechts auf dem Bildschirm. N/S/W/O stehen
      am Rand an der richtigen Stelle (der Buchstabe der Kartenrichtung, in die man fliegt, steht auf der Seite, zu der
      man fliegt).
- [ ] **V2 „Plan“:** Norden immer oben, N/S/W/O fest; das Fenster-Rechteck liegt so auf dem Plan, wie das Fenster
      wirklich liegt (Winkel = θ).
- [ ] **V3 „Gang-Balken“:** zeigt nur den aktuellen Gang, immer waagerecht wie in der Kamera (Bildschirm-links =
      Balken-links); N/S/W/O an den Balkenenden und an den Abzweig-Stummeln stimmen mit der Karte überein.
- [ ] **V3-Füllung** (Abschnitt 3, Regel 6): Nach jeder Drehung und jeder Umkehr wird die bisherige Füllung grau, die
      neue Füllung beginnt an der Stelle des Dackels in diesem Moment; die Füllung wandert nie.
- [ ] **Drehen:** V1 dreht im Schwenk synchron mit der Welt (gleicher Winkel in jedem Frame), V2 dreht nur das
      Rechteck synchron; danach steht alles still. **Die 180°-Umkehr dreht nichts.**
- [ ] **Leuchtende Arme** (alle Versionen): Es leuchten genau die Arme bzw. Stummel, in die eine Drehung gerade
      erlaubt ist (`canTurnBy`), und das Dreh-Symbol leuchtet genau dann, wenn mindestens einer leuchtet.
- [ ] **Ziel-Knochen** ist auf der Minimap in Zielfarbe zu sehen (V1/V2: liegt er außerhalb des Ausschnitts, ein
      Randpfeil in seine Richtung; V3: nur wenn er im aktuellen Gang liegt).
- [ ] **Flüssig:** Beim Scrollen kein Sprung des Minimap-Inhalts > 1 px/Frame (außer der Drehung im Schwenk); der
      Wechsel des V3-Balkens bei einer Drehung ist eine Überblendung, kein Sprung.
- [ ] **Umschalten mit M** (Aktion `map`: Taste M, Tab, Deck-View-Taste) V1 → V2 → V3 → aus → V1; geht jederzeit,
      auch im Schwenk; ein gezeichnetes Zeichen „1“/„2“/„3“ am Rahmen zeigt die Version.
- [ ] **Keine Schrift:** Der Minimap-Code ruft nie `fillText`/`strokeText` auf (Prüfung mit aufzeichnender Canvas);
      N/S/W/O und Ziffern sind Striche (Regel 8: Steam Deck, keine Abhängigkeit von Schriftarten).
- [ ] **Jede Karte:** Die Minimap liest nur Karte und Szene (keine festen Netz-Werte) – Test mit der Netz-Karte und mit
      der P1-Kreuz-Karte.
- [ ] **60 fps** im Netz mit jeder Version (Perf-Messung wie in P1c, `e2e/netz.mjs` bzw. eigenes `e2e/minimap.mjs`).

## 3. Robins Regeln (verbindlich, 08.10.2026)

1. **Grundlage ist das Netz aus P1c, unverändert.** Ändert sich das Netz (Robin arbeitet in einer anderen Session
   daran weiter), soll sich P2 mit aktualisieren: Die Minimap hängt nur lesend an Karte und Szene, die Netz-Dateien
   werden nicht angefasst (Abschnitt 5).
2. **Der Spieler ist ein Punkt**, kein Pfeil.
3. **Drei Versionen, Umschalten mit M:**
   - **V1 „wie die Kamera“:** Das Fenster-Rechteck ist immer waagerecht wie in der Kamera-Ansicht; die Karte darunter
     liegt so gedreht wie im Bild; N, S, W, O werden an der richtigen Stelle eingezeichnet (sie wandern beim Drehen
     am Rand mit). Im Schwenk dreht V1 synchron mit der Welt – **bewusste Ausnahme** zu 4a „Nichts im HUD dreht mit“,
     zum Vergleich.
   - **V2 „Plan“:** N oben, S unten, W links, O rechts, immer; das Fenster-Rechteck wird so gezeigt, wie es in der
     Orientierung der Welt liegt (dreht sich beim Drehen).
   - **V3 „Gang-Balken“:** der Gang, in dem man fliegt, als Fortschrittsbalken (ersetzt die Level-Anzeige); ebenfalls
     immer waagerecht wie V1; mit N/S/W/O.
4. **Ausschnitt V1/V2: etwa 3 Bildschirme breit** (1.440 Einheiten) als Richtwert; **je Level einstellbar**.
5. **Position oben** (Mitte). Raum F darf dabei teilweise verdeckt werden. **Alles aufgedeckt**, **Ziel-Knochen auf der
   Minimap**, **leuchtende Arme** an Kreuzungen, wo gedreht werden kann.
6. **V3-Füllung (Robins Wortlaut):** „Die Füllung wandert nicht, sie wird grau und die neue Füllung kommt ab dem Moment
   der Drehung. Dadurch wird sichtbar, von wo bis wo man geflogen ist. Dreht man dann nochmal, wird es wieder grau.“
7. **Große Karte:** eigener späterer Prototyp, hier nicht.

## 4. Hypothesen für Darstellung und Verhalten (Regel 5 – der Spieltest entscheidet; Werte als Konstanten oben in der Datei)

- **Rahmen:** 120 × 60 px (Bildschirm 480 × 270), oben in der Mitte, 4 px vom Rand, halbtransparent dunkel. Die
  Knochen-Anzeige oben links und das Dreh-Symbol unten bleiben, wo sie sind.
- **Maßstab V1/V2:** `span / 120` (Standard `MINIMAP_SPAN` = 1.440 → 1:12). Je Level: Feld `minimapSpan` in der
  Kartenbeschreibung, sonst der Standard. **Mitte der Minimap = Fenstermitte**, nicht der Dackel.
- **V1 als Formel:** Minimap-Punkt = Rahmenmitte + (Bildschirmpunkt − Bildschirmmitte) / Maßstab. Damit ist V1 im
  Schwenk automatisch synchron und das Rechteck immer waagerecht (Größe = sichtbarer Bereich / Maßstab ≈ 40 × 22 px).
- **V2 als Formel:** Minimap-Punkt = Rahmenmitte + (Kartenpunkt − Kamera-Kartenmitte) / Maßstab; Rechteck um θ gedreht
  (im Schwenk mit dem aktuellen Schwenkwinkel).
- **V1/V2-Inhalt:** Gänge als helle Flächen, Kreuzungen ohne eigene Markierung, Fenster-Rechteck als Umriss, Punkt
  weiß mit dunklem Rand, Ziel-Knochen als Punkt in Zielfarbe (außerhalb: Pfeil am Rahmenrand), leuchtende Arme in der
  Farbe des Dreh-Symbols (Gelb, pulsierend wie das Symbol). N/S/W/O als Strich-Buchstaben innen am Rahmenrand: V2 fest
  (N oben Mitte usw.), V1 auf dem Rahmenrand in Richtung der jeweiligen Himmelsrichtung, immer aufrecht.
- **V3 „Gang-Balken“:**
  - Aktueller Gang = der Gang, durch den das Fenster scrollt (`sc.K`). Der ganze Gang (`a0..a1`) wird auf die
    Balkenbreite (~110 px) skaliert, Balkenhöhe ~6 px, mittig im Rahmen.
  - Abzweige (Kreuzungen auf diesem Gang) als kurze Stummel nach oben/unten an ihrer Stelle, so wie sie auf dem
    Bildschirm abgehen; leuchten, wenn dort gerade gedreht werden kann; Strich-Buchstabe der Abzweig-Richtung am
    Stummel-Ende. Strich-Buchstaben der Gangrichtungen links und rechts neben dem Balken.
  - **Füllung:** farbig = Strecke entlang des Gangs seit der letzten Drehung/Umkehr (von der Stelle des Dackels in
    diesem Moment bis zu seiner jetzigen Stelle; fliegt er mit dem Stick zurück, wächst sie nicht zurück, sie deckt
    `min..max` ab). Bei jeder Drehung (90°) und Umkehr (180°) wird sie grau, eine neue beginnt.
  - **Grau bleibt je Gang für den ganzen Lauf gespeichert**: Kommt man später in denselben Gang zurück, sieht man die
    grauen Stücke der früheren Besuche. (Deutung; falls Robin das anders meint, nur dieser Punkt ändert sich.)
  - Wechsel des Gangs bei einer Drehung: Überblendung über die Dauer des Schwenks (0,5 s).
- **Start:** Netz startet mit V1. P1 „Kreuzung“ (`?proto=fenster`) startet mit „aus“, M schaltet ein.

## 5. Dateien und Anbindung

- **Vor dem Bau** den neuesten Stand des Netzes holen: `git fetch origin claude/wendehals-p1c-netz` und in den
  Bau-Branch mergen (nicht rebasen). Vor jedem Push erneut prüfen, ob es dort Neues gibt, und ggf. mergen.
- `src/proto/minimap.js` (neu): Zustand (Version, V3-Füllung je Gang), `updateMinimap(state, scene, input)` und
  `drawMinimap(ctx, state, scene)`. Liest nur aus Szene und Karte (`cam`, `theta`, `s`, `swing`, `K`, `dogMap()`,
  `canTurnBy`, `turnJunction`, `map.corridors`, `map.junctions`, `map.bones`, `target`, `minimapSpan`); schreibt nie in
  die Szene.
- `src/proto/fenster-draw.js`: **eine** Zeile Anbindung am Ende des HUD-Zeichnens.
- Wo die Szene ihre Eingabe bekommt (`game.js` bzw. der Prototyp-Takt): **eine** Zeile, die `updateMinimap` mit der
  Eingabe aufruft. `FensterScene.update`, `karte.js` und `netz-map.js` bleiben **unverändert** (sonst Konflikte mit der
  Netz-Session); `minimapSpan` wird mit `map.minimapSpan ?? MINIMAP_SPAN` gelesen.
- Tests: `tests/minimap.tests.mjs` – je Zeile der Checkliste mindestens ein Test, gemessen an Kartenposition und
  Bildschirmstelle des Dackels und an den gezeichneten Minimap-Stellen (aufzeichnende Canvas wie in den P1c-Tests).
  Dazu ein Zufallsspiel (≥ 100.000 Frames, fester Startwert, M zufällig gedrückt) gegen denselben Lauf ohne Minimap.
- `e2e/minimap.mjs` (Wegwerf): Screenshots jeder Version an den Stellen A, C, D, E, F und kopfüber, vor, im und nach dem
  Schwenk, nach `e2e/screenshots/minimap-*.png`; ansehen, bevor gepusht wird. Dazu die fps-Messung.

## 6. Sicherheitsnetz

- `npm test && npm run e2e` grün (als eine Kette), Golden Master unverändert, P1- und P1c-Tests grün und unverändert.
- Golden Master nie neu schreiben; `worldgraph*`, Löser, `welt.json`, `Level`, `Arena` unberührt.
- Nach jeder Runde `dist/index.html` an Robin und Artifact unter derselben URL aktualisieren; einmal im Artifact prüfen.

## 7. Fertig, wenn

- [ ] Jede Zeile der Checkliste (Abschnitt 2) hat einen grünen Test aus Spielersicht.
- [ ] Screenshots aller drei Versionen angesehen.
- [ ] Build startet direkt im Netz mit Minimap V1; P1 über `?proto=fenster`, v0.2 über `?spiel` wie bisher.
- [ ] Commit und Push auf den Branch der Session; Datei + Artifact an Robin.

## 8. Rückmeldung an Robin

Was gebaut ist, jede Abweichung vom Brief mit Grund (vorher gefragt, Regel 1), Testergebnisse, und die Fragen:
„Mit welcher Version (1, 2, 3) hast du am wenigsten gezögert? Was hat an den anderen gestört?“ und „Stimmt die
V3-Füllung so, wie du sie gemeint hast (grau bleibt je Gang gespeichert)?“ Antwort als nächster F-Eintrag ins
Entscheidungsprotokoll.

## 9. Stand nach dem Bau (08.10.2026, Sonnet 5.5)

**Gebaut:** `src/proto/minimap.js` (Zustand je Szene in einer WeakMap, `updateMinimap`, `layoutMinimap`, `drawMinimap`; Striche statt Schrift),
Anbindung: je eine Zeile in `fenster-draw.js` (Zeichnen) und `game.js` (Update nach `proto.update`), plus die Imports. `karte.js`, `netz-map.js`,
`FensterScene` unverändert. `tests/minimap.tests.mjs` (19 Tests, eine Gruppe je Checklisten-Zeile, Zufallsspiel 120.000 Frames mit zufälligem M),
`e2e/minimap.mjs` (Screenshots `e2e/screenshots/minimap-*.png`, fps je Version). Stand des Netzes: mit Paket A (`d71fca2`) gemergt.

**Abweichungen / Deutungen (zur Bestätigung durch Robin):**
- Balkenbreite V3 100 px statt ~110 (10 px je Seite für die Buchstaben der Gangenden).
- **Gangwechsel ohne Drehung:** Das Netz wählt den Kamera-Gang jetzt laufend (`selectK`, Paket A). Wechselt dabei der Gang, blendet V3 den Balken über
  0,5 s um und beginnt eine neue Füllung (die alte wird grau) – nicht nur bei Drehung/Umkehr.
- **Tod/Neustart** (Paket A) versetzt den Dackel: neue Füllung am Neustartort, die alte wird grau.
- Eine Drehung, die nur durch die Zone einer Kreuzung erlaubt ist, die nicht am aktuellen Gang liegt, leuchtet in V3 als Stummel an der Stelle der Kreuzung.
- Dicht beieinander liegende Stummel gleicher Richtung teilen sich einen Buchstaben.
- Rahmen und alle Zahlen sind Konstanten oben in `minimap.js`; Standardausschnitt `MINIMAP_SPAN` 1.440, je Karte `minimapSpan` (in der Beschreibung oder an der Karte).

