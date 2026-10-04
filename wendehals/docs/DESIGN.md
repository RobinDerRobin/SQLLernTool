# Wendehals – Spieldesign (Achtung: Spoiler!)

## Idee

Metroidvania trifft Parodius. Die Welt besteht aus **Arenen** (Kreuzungen, frei durchfliegbar)
und **Etappen** (scrollende Level mit eigenem Terrain) dazwischen. Aus einer Arena kommt man nur
durch einen Ausgang hinaus, in dessen Richtung man schaut.
Der Kniff: **Richtung ist eine Ressource.** Anfangs dreht man sich nur an Drehscheiben (Ring zum
Durchfliegen), später mit dem *Drehwurm* überall und mit dem *Wendehals* sogar mitten im Level.

**Show, don't tell:** Erklärt wird nur die Steuerung. Wie die Welt funktioniert, zeigt sie selbst:
offene und geschlossene Klappen, Pfeile am Ring, Risse in zerbrechlichen Blöcken, Stoppuhren an der
Zeitschranke, Kopfschütteln mit „?“, wenn etwas nicht geht.

Der Humor setzt auf Alltagsgegenstände, die durchdrehen: fliegende Toastscheiben,
Kaffeebohnen, Gummienten, Nilpferde im Schwimmring, Gartenzwerge in UFOs, Klappergebisse,
Tanzwürste, Wecker. Eine Story gibt es kaum: Ein Dackel träumt. Am Ende klingelt der Wecker.

## Weltkarte

```
        x=0            x=1              x=2              x=3             x=4             x=5             x=6
 y=0                 Butterdose       Brotkorb ──── Handtuchhaken ──── Duschkopf                        Uhrturm
                         │               │              ↓ Fallrohr        ║(Boss)                     ↑ Endboss, Einbahn
 y=1                 Marmelade ═════ Untertasse ──── Stöpsel ───────── Seifenschale ──── Entenhafen ─── Pendel
                         │      (Boss)   │              │  ↖ Überlauf (Einbahn)              │             │
 y=2   Toastständer ─ Eierbecher ──▦── Kellertreppe   Blubberblase ──⌚── Sockenschublade   Discotür ─── Lavalampe
                         ↑ (Einbahn)     │                                                   │             │
 y=3   Gurkenfass ── Kartoffelkiste ══ Einmachregal ─────────────── ⇔ ───────────────── Tanzfläche ══ DJ-Pult
                                (Boss)   │ ⇔                                                 │      (Boss)
 y=4                                   Kohlenkeller                                     Konfettikanone
```

`═` Boss-Etappe · `▦` Felswand · `⇔` enge Spalte · `⌚` Zeitschranke · `↑ ↓ ↖` Einbahnstraße.
Der Stöpsel hat fünf Ausgänge, zwei davon an der Ostseite.
Die genaue Lage aller Hindernisse steht in `src/data/world.js`, das Terrain-Profil jeder Etappe in
`src/data/levels.js`.

### Arenen

- Bildschirmgroßer Raum, freier Flug, kein Zwangsscrollen. Wände blocken, töten aber nicht.
- **Ausgänge** in den Wänden, beliebig viele pro Seite (`fromPos`/`toPos` in `world.js`).
  Offen ist nur die Klappe in Blickrichtung. Einbahn-Eingänge zeigen einen roten Pfeil nach innen.
  Nach einem Rückzug bleibt der Ausgang, durch den man kam, zu, bis man die Richtung loslässt.
- **Drehscheibe:** Ring in der Ecke. Durchfliegen dreht um 90°, und zwar in dem Umlaufsinn, in dem
  man hindurchfliegt.
- **Speicherstation:** Berühren speichert. Mit X: Rohrpost, Pilot wechseln.
- **Rückholstation** (Wirbel in der Farbe des Ziels) an Sackgassen: X bringt zu einer Kreuzung mit
  Ausweg.

### Gebiete

| Gebiet | Gegner (★ = teilt sich) | Boss | Belohnung |
|---|---|---|---|
| Frühstückstisch | Toast, Brezel★, Spiegelei-UFO, Kaffeebohne | Graf Kaffeekanne | Drehwurm |
| Badewannen-Ozean | Gummiente, Seife★, Nilpferd, Sockenschwarm | Admiral Walross (nur Kopf verwundbar) | Quietscheentenhaut |
| Omas Keller | Gartenzwerg-UFO, Socken, Gebiss, Einmachglas★ | Kaiser Kartoffel | Zahnarztbohrer |
| Disco-Vulkan | Discokugel, Tanzwurst★, Gebiss, Schallplatte | Diskokugel-Diva (rotierende Laser) | Schrumpfpilz |
| Uhrwerk-Himmel | Zahnrad (unzerstörbar), Wecker★, Kuckuck, UFO | Der Große Wecker (Uhrzeiger als Gefahr) | Spielende |

**Terrain-Identität:** Jedes Gebiet hat eigene Bausteine und ein Leit-Gimmick:
- Frühstück: Tassen, Toastberge, Eierbecher, Zuckertürme;
- Bad: Rohre, Shampoo, Schaum, Strömungen;
- Keller: Regale, Einmachgläser, Spinnweben, Dunkelheit;
- Disco: Lautsprecher, Spiegelkugeln, Kolben im Takt, Lava;
- Uhrwerk: Messing, Zahnräder, Pendel.

**Splitter (★):** Getroffen wackeln sie kurz und blähen sich auf, dann platzen sie in zwei Teile.
Die Teile wachsen erst heran und teilen sich nie weiter, es gibt also keine Kettenreaktion.

### Items

| Item | Wirkung | öffnet |
|---|---|---|
| Drehwurm | in jeder Arena per Taste 90° drehen | Richtungswechsel überall |
| Zahnarztbohrer | Schüsse zerstören Felsen | Felswand (hart) |
| Schrumpfpilz | Figur winzig | enge Spalte (hart) |
| Quietscheentenhaut | Stacheln harmlos | Stachelfeld (weich) |
| Opas Grubenlampe | großer Lichtkegel nach vorn | Dunkelzone (weich) |
| Doppelter Espresso | Taste halten: doppelt so schnell scrollen | Zeitschranke (hart) |
| Omas Sparstrumpf | beim Tod bleibt die erste Hälfte der gekauften Power-Ups | – |
| Wendehals | 180°-Wende, auch im Level | Komfort, Abkürzungen |
| Oma Turbo, Toaster Tim | weitere Piloten | – |
| 3 × Extrawürstchen | +1 Energie | – |

**Weiche Hindernisse** (Stacheln, Dunkelheit) sind mit Geschick auch ohne Item schaffbar.
So entstehen Abkürzungen: Gute Spieler können zum Beispiel den Walross-Boss ganz auslassen und
direkt in die Disco fliegen.

## Regeln

- **Schaden:** Festes Terrain, Stacheln, Zahnräder, Pendel, Kolben und das Zerquetschen am Bildrand
  töten sofort. Gegner, Kugeln und Bosskontakt kosten 1 Energie.
- **Power-Ups** bleiben über alle Etappen. Beim Tod sind sie weg, mit *Sparstrumpf* nur die zweite Hälfte.

## Regeln gegen das Steckenbleiben

1. Jede Speicherstation hat eine Drehscheibe. Dort kann man sich immer in jede Richtung drehen.
2. Sackgassen haben eine **Rückholstation** und einen **Wender**, der einen zurück zur Etappe dreht.
3. Vor einer Wand, die man noch nicht überwinden kann, hält die Kamera an. Nach einigen Sekunden
   schüttelt der Dackel den Kopf und kehrt um, ohne Strafe. Die Karte zeigt die Etappe danach als
   versperrt, mit dem Symbol des Hindernisses.
4. Im Pause-Menü gibt es immer **„Etappe abbrechen“** und **„Zur letzten Station“**.
5. Ein Test-Löser (`src/game/solver.js`) prüft alle erreichbaren Zustände (Arena × Blickrichtung ×
   Items, inklusive Mehrfach-Ausgängen und Rückholstationen). Er beweist: Von jedem aus ist das Ende
   erreichbar. Das gilt mit und ohne Können und auch nach Tod oder Rohrpost.

## Technik

- Feste Simulationsrate (60 Hz) und deterministischer Zufall, darum lassen sich Level in Tests
  beschleunigt durchspielen.
- Level-Koordinaten: `a` = Flugrichtung, `c` = Querachse.
  - Die Querachse ist 288 breit mit Boden und Decke, 544 bei endlosem Wrap und 960 bei vertikalen
    Etappen.
  - Vertikal wird mit Faktor 0,5625 herausgezoomt, damit man in Flugrichtung immer 480 Einheiten
    weit sieht.
  - Der Renderer dreht die Szene passend zur Himmelsrichtung, die Eingabe wird zurückgedreht.
- **Terrain** ist ein Kachelraster (16 Einheiten):
  - Boden und Decke entstehen als Zufallsprofil, dazu kommen ASCII-Set-Pieces.
  - Ein Set-Piece wird nur behalten, wenn ein Pfadfinder bestätigt, dass die Etappe weiter
    durchfliegbar ist.
  - Für den Rückflug wird das Raster gespiegelt. Bei der Kehrtwende spiegeln sich Raster und
    bewegliches Terrain in beiden Achsen.
- Der Inhalt der Level wird aus der Kantenbeschreibung erzeugt, für jede Flugrichtung getrennt
  und reproduzierbar.
- **Darstellung:**
  - Die Simulation läuft mit 60 Hz, gezeichnet wird interpoliert (flüssig auf 90/120/144 Hz).
  - Es gibt keine `ctx.filter`. Muster und Masken werden vorgerendert.
  - Das Frame-Budget ist per E2E-Test abgesichert.
- Grafik als Canvas-Vektorzeichnungen, Klänge und Musik per WebAudio-Synthese.

## Ideen für später

- Schräge Winkel (45°-Etappen) und Drehstationen mitten im Level
- Handgebaute Gegnerwellen pro Etappe (bisher Generator mit Terrain-Profil)
- Weitere Piloten mit eigenen Spezialwaffen
- Touch-Steuerung für eine Handy-Version (das Spiel kommt mit wenigen Knöpfen aus)
- Glocken wie in Parodius (anschießen, um die Farbe/den Effekt zu wechseln)
