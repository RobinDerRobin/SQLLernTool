# Bau-Brief P3 „45°-Kreuzung“ – die Kreuzung um vier Diagonal-Gänge erweitert

> Für eine Code-Session. Modell: **Sonnet 5.5** (Bauen und Testen). Zeitbox: eine Sitzung (~3 h).
> Wegwerf-Prototyp. Baut auf P1 „Kreuzung“ auf ([`P1-kreuzung.md`](P1-kreuzung.md), Abschnitt 9) mit den Regeln aus
> P1c „Netz“ Paket A ([`P1c-netz.md`](P1c-netz.md), Abschnitt 10). **Vorher lesen und befolgen:** `wendehals/CLAUDE.md`,
> Abschnitt „Regeln für jede Prototyp-Arbeit“ (u. a. Regel 1: vor jeder Abweichung Robin fragen).
> Status: **von Robin validiert am 10.10.2026** (Besprechung mit Opus 5.5). Robins Auftrag (Wortlaut): „Dieser soll den
> 90° Kreuzungsprototypen um die 45° Gänge erweitern.“
> Branch: `claude/wendehals-p3-45grad` (ab `claude/wendehals-p2-minimap`). Vor dem Bau den neuesten Stand von
> `origin/claude/wendehals-p1c-netz` **mergen** (nicht rebasen). Kein PR ohne Auftrag.

## 1. Fragekarte

- **Frage:** Nehme ich auch einen Diagonal-Gang mit derselben Aktion wie in der Kreuzung – beim ersten Mal, ohne
  nachzudenken –, auch wenn der Plan um 45°/135° gedreht oder kopfüber steht und ich nach links fliege?
- **Woran Robin es merkt (5 Minuten):** Er holt Knochen aus allen acht Armen und zögert an der Achteck-Kreuzung nicht –
  oder er kann sagen, wann er LT/RT und LB/RB verwechselt hat (nach einer 45°-Drehung? kopfüber? beim Linksflug?).
- **Bewusst nicht drin:** Minimap (Robin: „Nimm die Minimaps erstmal nicht mit rein.“), Netz, Türen, Gegner/Schießen,
  Drehformel, Drehzahl/Fähigkeiten, Speichern, achteckige Arenen/Räume.

## 2. Abnahme-Checkliste (zuerst; jede Zeile bekommt einen automatischen Test aus Spielersicht)

Alle Punkte aus [`../PROTOTYPEN.md`](../PROTOTYPEN.md) Abschnitt 4a gelten, an der Achteck-Kreuzung und in **allen acht**
Armen, nach 45°- wie nach 90°-Drehungen. Gemessen werden Kartenposition und Bildschirmstelle des Dackels (Regel 3).

- [ ] **Flüssige Kamera:** kein Sprung > 4 Einheiten/Frame, kein Richtungsknick > 0,1 rad/Frame (ohne 180°-Umkehr), auch
      in Diagonal-Gängen und beim Einfahren nach einer 45°-Drehung.
- [ ] **Position ändert sich nie von selbst:** ohne Eingabe nur in Scrollrichtung – nie durch Drehen (45° oder 90°),
      Folgen, Wände oder Bildrand. Tod und Neustart sind die einzige Ausnahme (wie Paket A).
- [ ] **Drehen nur in der Dreh-Zone** (Achteck plus `TURN_AHEAD` 160 in jedem Arm) und nur, wenn in der neuen
      Flugrichtung ein Gang wegführt; im Arm außerhalb der Zone wird jede Drehung (LT/RT, LB/RB) rot abgelehnt.
- [ ] **45°-Prüffall:** θ = Osten, RT (bzw. K) → R-Ende zeigt nach Südosten; LT (bzw. J) → Nordosten; s bleibt.
      Für alle 8 θ und beide s: LT/RT ändern θ um ∓/±45°, LB/RB um ∓/±90°, Y nur s.
- [ ] **Paritätsregel:** nach 45° wechselt die Klasse (Kreuz ↔ Diagonale), nach 90° und 180° nicht – geprüft an der
      Blickrichtung h nach jeder Drehung.
- [ ] **Zweimal 45° = einmal 90°:** gleiches Bild (θ, Kamera, Bildschirmstelle des Dackels) wie nach der 90°-Drehung.
- [ ] **Hin und zurück / achtmal 45°** in dieselbe Richtung (auch kopfüber und bei s = L): wieder dasselbe Bild.
- [ ] **Diagonal fühlt sich nicht anders an** (Robin, 05.10.2026): Scrollgeschwindigkeit 70 Karteneinheiten/s in allen
      8 Richtungen (Diagonalvektor normiert), Dackel-Geschwindigkeit auf dem Bildschirm gleich, ein Diagonal-Gang liegt
      im Bild waagerecht und gleich breit wie ein gerader Gang.
- [ ] **Schwenk:** auch bei 45° um den Dackel, 0,5 s, Spiel pausiert, Eingaben im Schwenk ignoriert; danach „rechts“ =
      rechts.
- [ ] **Zu früh gedreht** in einen Diagonal-Arm: ohne Lenken Tod und Neustart an der Kreuzung, mit Lenken überlebt.
- [ ] **Nie festsitzen:** ein Bot erreicht von einem Gitter von Startlagen (alle 8 Arme, beide s) aus jeden der 8
      Knochen ohne Tod.
- [ ] **Sichtbare Rückmeldung:** das Dreh-Symbol leuchtet in der Dreh-Zone; ein abgelehnter Druck (LT/RT wie LB/RB)
      wackelt rot mit Ton. Nichts im HUD dreht mit.
- [ ] **Steuerung:** LT/RT und J/K drehen ±45° im Prototyp; im v0.2-Spiel bleiben J = Schießen, K = Power (Test über
      `Input`), LT/RT tun dort nichts.
- [ ] **Unberührt:** Golden Master unverändert; P1-„Kreuzung“-, P1c-„Netz“- und P2-„Minimap“-Tests grün und unverändert.
- [ ] **60 fps** im Browser (Messung wie `e2e/netz.mjs`, nur diese Szene).
- [ ] **Start:** Build startet direkt in der 45°-Kreuzung; Kreuzung über `?proto=fenster`, Netz (mit Minimap) über
      `?proto=netz`, v0.2 über `?spiel`; alle auch über Optionen.

## 3. Robins Regeln (verbindlich, 10.10.2026)

Alles aus P1 „Kreuzung“ (Brief Abschnitt 2 und 9) und P1c „Netz“ Paket A (Abschnitt 10) gilt weiter: Fenster-Modell
(θ, s), Schwenk um den Dackel, Drehung ändert die Position nie, Dackel wird immer mitgetragen, Kamera hält nie an, Tod an
Wand und Bildrand mit Neustart an der letzten Kreuzung, Tempo 70, Dreh-Zone 160, 180°-Umkehr überall, keine Türen.
Neu:

1. **Basis ist die Kreuzung** (Robin: „Ja die Kreuzung ist die Basis.“), erweitert zu einer **achteckigen Kreuzung mit
   8 Sackgassen-Armen**: die vier geraden Arme (N, O, S, W) plus vier diagonale (NO, SO, SW, NW). Eigene Szene; die
   Kreuzung, das Netz und die Minimap bleiben unverändert im Build.
2. **Steuerung:** LT/RT = Fenster −45°/+45°, Tastatur **J/K** (Robin: „Nimm für die Steuerung j und k“); LB/RB bleiben
   −90°/+90° (U/O), Y bleibt die Umkehr (L/Q).
3. **Paritätsregel:** gerade Richtungen = Kreuz (+), ungerade = Diagonale (×); 90° und 180° bleiben in der Klasse, nur
   45° wechselt sie. Jede Drehung geht nur, wenn in der neuen Flugrichtung ein Gang von der Kreuzung wegführt (Regel
   aus dem Netz). An der Achteck-Kreuzung führt in jede der 8 Richtungen ein Gang weg.
4. **Keine Minimap** in diesem Prototyp.

## 4. Karte und Hypothesen (Regel 5 – der Spieltest entscheidet; Werte als Konstanten oben in der Datei)

- **Achteck:** regelmäßig, Mittelpunkt (0,0), jede Seite zeigt in eine der 8 Richtungen; Seitenlänge = Gangbreite
  `WIDTH` 200 (Abstand Mitte–Seite ≈ 241). An jeder Seite beginnt ein Arm, `ARM` 720 lang, Breite 200 quer zur Gangachse.
  Zwischen benachbarten Armen steht ein Wandkeil, der an der Achteckecke beginnt.
- **Farben:** wie in der Kreuzung N rot, O blau, S grün, W gelb; Diagonalen in vier weiteren, klar unterscheidbaren
  Farben (Vorschlag: NO orange, SO türkis, SW violett, NW rosa), Knochen und Armboden in Armfarbe. Diagonal-Arme
  zusätzlich mit einem Streifenmuster am Boden, damit die Klasse auch ohne Farbsehen lesbar ist.
- **Ablauf:** „Knochen holen“ wie in der Kreuzung; neue Zielfarbe = ein anderer der 7 Arme (Zufall, fester Startwert).
  Start am Ende des westlichen Arms, θ = Osten, s = R.
- **Neustart:** Mitte des Achtecks, mit der Ausrichtung, mit der der Dackel es verließ.
- **Schwenk bei 45°:** dieselbe Dauer 0,5 s wie bei 90° (Hypothese).
- **Kamera im Diagonal-Gang:** dieselben Regeln wie im geraden Gang (Scroll-Behälter quer zur Gangachse, `K` laufend
  gewählt), nur gedreht.
- **HUD:** dasselbe Dreh-Symbol wie bisher (eines für alle Drehungen); Kurzhinweis am Anfang mit selbst gezeichneten
  Symbolen für LB/RB 90°, LT/RT 45°, Y.

## 5. Dateien und Anbindung

- **Geometrie:** `src/proto/karte.js` kennt nur waagerechte und senkrechte Gänge (Rechtecke). Für die Diagonalen entweder
  `karte.js` um Gänge beliebiger der 8 Richtungen (Mittellinie + Breite, gedrehtes Rechteck) und polygonale Kreuzungen
  erweitern **oder** eine eigene Karte `src/proto/achteck-map.js` mit derselben Schnittstelle (`walkable`,
  `freeDistance`, `junctions` mit `ports`, Dreh-Zonen, Kamera-Gänge) bauen. Bedingung in beiden Fällen: das Verhalten
  von Kreuzung und Netz bleibt bitgleich (deren Tests unverändert grün).
- `src/proto/fenster.js`: `FensterScene` mit `rotate(k)` für k ∈ {±1, ±2} (45°/90°), Bewegungsvektoren normiert. Nur
  über `math.js`-Helfer (`turnBy`, `isDiagonal`, `DIR_VEC`, `headingAngle`); `tests/directions.tests.mjs` nicht abschwächen.
- `src/proto/fenster-draw.js`: Boden, Wände und Streifen für gedrehte Gänge; Achteck.
- `src/core/input.js`: neue Aktionen `rot45Left`/`rot45Right` – Pad 6/7 (LT/RT, analog über `value > 0.5`) und
  zusätzlich KeyJ/KeyK, **ohne** deren v0.2-Belegung (fire/power) zu ändern (eine Taste darf zwei Aktionen auslösen;
  der Prototyp liest nur die 45°-Aktionen, v0.2 nur seine).
- `src/game/game.js`: `startProto('45grad')`; Optionen zusätzlich „Prototyp: 45°-Kreuzung“; die Minimap-Zeile
  (`updateMinimap`) und das Minimap-Zeichnen laufen für diese Szene **nicht**.
- `src/main.js`: Direktstart in der 45°-Kreuzung; `?proto=netz` startet das Netz, `?proto=fenster` die Kreuzung,
  `?spiel` v0.2.
- Tests: `tests/achteck.tests.mjs` (+ Bot-Helfer) – je Zeile der Checkliste mindestens ein Test aus Spielersicht, dazu
  ein Zufallsspiel (≥ 100.000 Frames, fester Startwert, LT/RT/LB/RB/Y zufällig).
- `e2e/achteck.mjs` (Wegwerf): Screenshots nach `e2e/screenshots/achteck-*.png` – Start, in jedem Diagonal-Arm, mitten im
  45°-Schwenk, nach 45°, kopfüber (θ = Nordwesten), s = L; dazu die fps-Messung. Ansehen, bevor gepusht wird.

## 6. Sicherheitsnetz

- `npm test && npm run e2e` grün (als eine Kette), Golden Master unverändert, Tests der Kreuzung, des Netzes und der
  Minimap grün und unverändert.
- Golden Master nie neu schreiben; `worldgraph*`, Löser, `welt.json`, `Level`, `Arena` unberührt.
- Nach jeder Runde `dist/index.html` an Robin und Artifact unter derselben URL aktualisieren; einmal im Artifact prüfen.

## 7. Fertig, wenn

- [ ] Jede Zeile der Checkliste (Abschnitt 2) hat einen grünen Test aus Spielersicht.
- [ ] Screenshots angesehen.
- [ ] Build startet direkt in der 45°-Kreuzung; Kreuzung, Netz und v0.2 erreichbar wie in Abschnitt 2.
- [ ] Commit und Push auf `claude/wendehals-p3-45grad`; Datei + Artifact an Robin.

## 8. Rückmeldung an Robin

Was gebaut ist, jede Abweichung vom Brief mit Grund (vorher gefragt, Regel 1), Testergebnisse, und die Fragen:
„Wann hast du LT/RT und LB/RB verwechselt?“, „Fühlt sich ein Diagonal-Gang anders an als ein gerader?“ und „Passt der
0,5-s-Schwenk auch für 45°?“ Antwort als nächster F-Eintrag ins Entscheidungsprotokoll.

## 9. Stand nach dem Bau (10.10.2026, Sonnet 5.5)

**Gebaut:** P3 „45°-Kreuzung“ nach diesem Brief. Der Build startet direkt im Achteck; Kreuzung `?proto=fenster`, Netz mit Minimap
`?proto=netz`, v0.2 `?spiel`, alle auch über Optionen („Prototyp: 45°-Kreuzung“).

**Dateien:** `src/proto/achteck-map.js` (Karte: Achteck, 8 Arme, Wandkeile, Farben, Knochen), `src/proto/achteck.js`
(`AchteckScene extends FensterScene`: 45°-Schritte, Dreh-Zone, Neustart in der Mitte), `src/proto/fenster-draw.js` (Achteck, Streifen,
Kurzhinweis mit selbst gezeichneten Symbolen), `src/core/input.js` (LT/RT = Pad 6/7 analog über `value > 0.5`, Zweitbelegung J/K),
`src/game/game.js` und `src/main.js` (Anbindung), `tests/achteck.tests.mjs` + `tests/helpers/achteck-bot.mjs`, `e2e/achteck.mjs`.
Geänderter gemeinsamer Code (Kreuzung/Netz bleiben bitgleich, ihre Tests unverändert grün): `fenster.js` rechnet mit
Einheitsvektoren (Geraden unverändert, Diagonalen normiert) und hat den Haken `rotInput()`.

**Tests:** je Zeile der Checkliste (Abschnitt 2) mindestens ein Test aus Spielersicht (Karten- und Bildschirmstelle des Dackels), dazu
Zufallsspiel (120.000 Frames, LT/RT/LB/RB/Y zufällig: 858 Drehungen, davon 460 mit 45°, 163 Tode, größter Kamera-Knick 0,06 rad/Frame,
größter Kamera-Sprung 2,6 E), Bot-Dauerlauf (25 min, 0 Tode) und Bot-Gitter (64 Startlagen × 8 Knochen, 0 Tode).
`npm test` 285/285, `npm run e2e` grün, Golden Master unverändert. fps im Browser nur diese Szene: Arbeit je Frame p95 0,6 ms,
Bildabstand p95 16,8 ms, 0 Hänger > 50 ms.

**Abweichungen vom Brief / Folgeprobleme – zur Bestätigung durch Robin:**

1. **„Zu früh gedreht“ ist nicht immer tödlich.** Dreht man in einem geraden Arm nach *innen* um 45° (z. B. im Ostarm Blick nach Westen,
   LT), fliegt der Dackel schräg ins Achteck hinein – dort ist Platz, ohne Lenken geht es eine Weile gut. Tödlich ohne Lenken sind: jede
   90°-Drehung im Arm und jede 45°-Drehung nach *außen*. Das folgt aus der Regel „Drehen geht, wenn in der neuen Flugrichtung ein Gang
   wegführt“ (an der Achteck-Kreuzung führt in jede der 8 Richtungen einer weg). Brief-Test dazu angepasst (Ausnahme dokumentiert).
2. **Nach einer 90°-Fehldrehung im Arm hält man sich nur ~3,4 s im Arm.** Mit Lenken überlebt man, aber der Dackel wandert auf dem
   Bildschirm zur Seite (das Scrollen läuft quer zum Arm) und erreicht dann den Bildrand. Die Rettung ist Zurückdrehen (die Zone reicht
   noch) – so ist der Test „mit Lenken überlebt“ gebaut. Das ist dieselbe Regel wie in der Kreuzung, nur jetzt häufiger sichtbar.
3. **`rotate(k)` mit k ∈ {±1, ±2} = 45°/90°** (Brief Abschnitt 5) steht in `AchteckScene`, nicht in `FensterScene`: dort bleibt
   `rotate(±1)` = 90°, weil die unveränderten Tests von Kreuzung/Netz das voraussetzen. Rein technisch.
4. **Eigene Karte** `achteck-map.js` statt `karte.js` zu erweitern (der Brief erlaubt beides). Dadurch gibt es im Achteck keine
   „Gänge“ zum Umschalten der Kamera: alle Mittellinien laufen durch (0,0), der Scroll-Behälter ist überall ±40 (wie im geraden Gang).
5. **Start:** am Ende des Westarms mit denselben 8 Einheiten Wandabstand wie in der Kreuzung; wer vor der ersten Achteck-Durchfahrt
   stirbt, beginnt am Start neu (wie in der Kreuzung), danach immer in der Mitte.
6. **HUD-Text „Knochen: n“** ist noch Schrift (stammt aus P1/P1c, nicht neu). Der neue Kurzhinweis und das Dreh-Symbol sind selbst
   gezeichnet. Für Regel 8 (keine Schriftarten) müsste die Zahl später ebenfalls gezeichnet werden.
7. **e2e-Skripte angepasst:** `e2e/netz.mjs` und `e2e/minimap.mjs` öffnen jetzt `?proto=netz`, weil der Build ohne Parameter im Achteck
   startet (Brief Abschnitt 2, „Start“). Keine Prüfung wurde abgeschwächt.
8. **Schon vorher rot, nicht von P3:** `e2e/fenster-runde.mjs` meldet „Knochen geholt“ auch auf dem Stand vor P3 (gleiche Meldung ohne meine
   Änderungen geprüft). Es gehört nicht zu `npm run e2e`. Außerdem meldete ein einzelner `npm run e2e`-Lauf „1 Prüfungen fehlgeschlagen“
   (der bekannte, nicht reproduzierbare Ausreißer aus der CLAUDE.md); zwei Wiederholungen waren grün.

**Hypothesen aus Abschnitt 4 (Werte als Konstanten in `achteck-map.js`/`fenster.js`, der Spieltest entscheidet):** Achteck Seite =
`WIDTH` 200, `ARM` 720, Farben NO orange, SO türkis, SW violett, NW rosa, Streifenmuster in den Diagonal-Armen (Abstand
`STRIPE_GAP` 40), Schwenk 0,5 s auch bei 45°, Kamera im Diagonal-Gang wie im geraden Gang.

**Fragen an Robin (Abschnitt 8):** (1) Wann hast du LT/RT und LB/RB verwechselt – nach einer 45°-Drehung, kopfüber, beim Linksflug?
(2) Fühlt sich ein Diagonal-Gang anders an als ein gerader? (3) Passt der 0,5-s-Schwenk auch für 45°? Antwort als nächster F-Eintrag
(F4) ins Entscheidungsprotokoll.
