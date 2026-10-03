# Wendehals – Spieldesign (Achtung: Spoiler!)

## Idee

Metroidvania trifft Parodius. Die Welt besteht aus **Knoten** (Stationen) und **Etappen**
(seitlich scrollende Level) dazwischen. Man fliegt immer in die Richtung, in die man schaut.
Der Kniff: **Richtung ist eine Ressource.** Anfangs kann man sich nur an Drehscheiben drehen,
später mit dem *Drehwurm* überall und mit dem *Wendehals* sogar mitten im Level.

Der Humor setzt auf Alltagsgegenstände, die durchdrehen: fliegende Toastscheiben,
Kaffeebohnen, Gummienten, Nilpferde im Schwimmring, Gartenzwerge in UFOs, Klappergebisse,
Tanzwürste, Wecker. Eine Story gibt es kaum: Ein Dackel träumt. Am Ende klingelt der Wecker.

## Weltkarte

```
        x=0            x=1              x=2              x=3             x=4             x=5             x=6
 y=0                 Butterdose       Brotkorb ──── Handtuchhaken ──── Duschkopf                        Uhrturm
                         │               │                                 ║(Boss)                     ↑ Endboss, Einbahn
 y=1                 Marmelade ═════ Untertasse ──── Stöpsel ───────── Seifenschale ──── Entenhafen ─── Pendel
                         │      (Boss)   │              │                                    │             │
 y=2   Toastständer ─ Eierbecher ──▦── Kellertreppe   Blubberblase                        Discotür ───── Lavalampe
                         ↑ (Einbahn)     │                                                   │             │
 y=3   Gurkenfass ── Kartoffelkiste ══ Einmachregal ─────────────── ⇔ ───────────────── Tanzfläche ══ DJ-Pult
                                (Boss)   │ ⇔                                                 │      (Boss)
 y=4                                   Kohlenkeller                                     Konfettikanone
```

`═` Boss-Etappe · `▦` Felswand · `⇔` enge Spalte · `↑` Einbahnstraße.
Die genaue Lage aller Hindernisse steht in `src/data/world.js`.

### Gebiete

| Gebiet | Gegner | Boss | Belohnung |
|---|---|---|---|
| Frühstückstisch | Toast, Brezel, Spiegelei-UFO, Kaffeebohne | Graf Kaffeekanne | Drehwurm |
| Badewannen-Ozean | Gummiente, Seifenblase, Nilpferd, Sockenschwarm | Admiral Walross (nur Kopf verwundbar) | Quietscheentenhaut |
| Omas Keller | Gartenzwerg-UFO, Socken, Gebiss, Einmachglas | Kaiser Kartoffel | Zahnarztbohrer |
| Disco-Vulkan | Discokugel, Tanzwurst, Gebiss, Schallplatte | Diskokugel-Diva (rotierende Laser) | Schrumpfpilz |
| Uhrwerk-Himmel | Zahnrad (unzerstörbar), Wecker, Kuckuck, UFO | Der Große Wecker (Uhrzeiger als Gefahr) | Spielende |

### Items

| Item | Wirkung | öffnet |
|---|---|---|
| Drehwurm | an jedem Knoten 90° drehen | Richtungswechsel überall |
| Zahnarztbohrer | Schüsse zerstören Felsen | Felswand (hart) |
| Schrumpfpilz | Figur winzig | enge Spalte (hart) |
| Quietscheentenhaut | Stacheln harmlos | Stachelfeld (weich) |
| Opas Grubenlampe | großer Lichtkreis | Dunkelzone (weich) |
| Wendehals | 180°-Wende, auch im Level | Komfort, Abkürzungen |
| Oma Turbo, Toaster Tim | weitere Piloten | – |
| 3 × Extrawürstchen | +1 Energie | – |

**Weiche Hindernisse** (Stacheln, Dunkelheit) sind mit Geschick auch ohne Item schaffbar.
So entstehen Abkürzungen: Gute Spieler können zum Beispiel den Walross-Boss ganz auslassen und
direkt in die Disco fliegen.

## Regeln gegen das Steckenbleiben

1. Jede Speicherstation hat eine Drehscheibe. Wer dort landet, kann immer in jede Richtung.
2. Sackgassen-Knoten mit Item haben einen **Wender**, der einen zurück in die Etappe dreht,
   aus der man kam.
3. Im Pause-Menü gibt es immer **„Etappe abbrechen“** (zurück zum Zustand vor dem Abflug) und
   **„Zur letzten Station“**.
4. Ein Test-Löser (`src/game/solver.js`) prüft alle erreichbaren Zustände und beweist: Von jedem
   aus ist das Ende erreichbar. Das gilt mit und ohne Können und auch nach Tod oder Rohrpost.
5. Bei festen Wänden hält die Kamera an, statt den Spieler zu zerquetschen.

## Technik

- Feste Simulationsrate (60 Hz) und deterministischer Zufall, darum lassen sich Level in Tests
  beschleunigt durchspielen.
- Level-Koordinaten: `a` = Flugrichtung, `c` = Querachse (periodisch, 540 px). Der Renderer dreht
  die gesamte Szene passend zur Himmelsrichtung, die Eingabe wird zurückgedreht.
- Der Inhalt der Level wird aus der Kantenbeschreibung erzeugt, für jede Flugrichtung getrennt
  und reproduzierbar.
- Grafik als Canvas-Vektorzeichnungen, Klänge und Musik per WebAudio-Synthese.

## Ideen für später

- Schräge Winkel (45°-Etappen) und Drehstationen mitten im Level
- Weitere Piloten mit eigenen Spezialwaffen
- Touch-Steuerung für eine Handy-Version (das Spiel kommt mit wenigen Knöpfen aus)
- Glocken wie in Parodius (anschießen, um die Farbe/den Effekt zu wechseln)
