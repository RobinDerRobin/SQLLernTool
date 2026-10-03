# Wendehals – Ein Dackel dreht durch

Ein **Metroidvania-Shoot'em-Up** im Geist von *Parodius*: Du fliegst als Dackel mit Raketenrucksack
durch eine Weltkarte voller Knotenpunkte. Jede Verbindung ist ein seitlich scrollendes Level.
Upgrades öffnen neue Wege, und die wichtigste Fähigkeit ist, **die Welt zu drehen**.

- Läuft komplett **offline**, ohne Installation im Browser oder als Desktop-App (Windows, Linux/Steam Deck)
- Steuerung mit Tastatur oder Controller (Xbox-Layout, Steam Deck)
- Kein Internet, keine externen Dateien: Grafik und Musik werden im Spiel erzeugt

## Spielen

**Am schnellsten:** `dist/index.html` bauen (siehe unten) und per Doppelklick im Browser öffnen.
Die Datei ist ein einzelnes, eigenständiges HTML-Dokument (ca. 90 KB).

**Desktop-App:**

| System | Datei | Hinweis |
|---|---|---|
| Windows | `Wendehals 0.1.0.exe` (portable) oder `Wendehals-0.1.0-win.zip` | ohne Installation startbar |
| Linux / Steam Deck | `Wendehals-0.1.0.AppImage` | ausführbar machen und starten |

Die Pakete entstehen mit `npm run dist:win` bzw. `npm run dist:linux` oder automatisch über den
GitHub-Workflow `.github/workflows/build.yml` (Artefakte `wendehals-windows`, `wendehals-linux-steamdeck`).
Der Workflow läuft erst, wenn das Projekt in einem eigenen Repository liegt (siehe unten).

### Steam Deck

1. Im Desktop-Modus `Wendehals-0.1.0.AppImage` herunterladen, Rechtsklick → Eigenschaften →
   Berechtigungen → „Ausführbar“.
2. In Steam: *Spiele → Ein Nicht-Steam-Spiel zu meiner Bibliothek hinzufügen* → AppImage wählen.
3. Im Spielmodus starten. Das Spiel erkennt den Spielmodus und startet im Vollbild.
   Als Steam-Input-Vorlage „Gamepad“ verwenden.

## Steuerung

| Aktion | Tastatur | Controller |
|---|---|---|
| Fliegen / Menü / Richtung wählen | Pfeiltasten, WASD | Stick, Steuerkreuz |
| Feuer · Abflug · Bestätigen | Leertaste, J, Enter | A |
| POWER kaufen · Zurück | K, Umschalt | B |
| Stationsmenü (Rohrpost, Pilot) | X, C, K | X (oder B) |
| Wenden (180°, braucht *Wendehals*) | L, Q | Y |
| Pause | Esc, P | Start / Menü |
| Vollbild | F11 | – |

## So funktioniert das Spiel

- **Weltkarte:** Du stehst an einem Knoten und schaust in eine Himmelsrichtung. Mit FEUER fliegst du
  das Level in dieser Richtung. Am Ende kommst du am nächsten Knoten an und schaust weiter in deine
  Flugrichtung.
- **Drehen:** An *Drehscheiben* (weißer Ring) darfst du die Richtung frei wählen. Später erlaubt der
  *Drehwurm* das überall. Manche Knoten sind *Wender*, die dich automatisch drehen.
- **Die Welt dreht sich mit:** Fliegst du nach Norden, ist das Level ein Vertikal-Shooter. Nach Westen
  steht alles Kopf. Quer zur Flugrichtung ist die Welt endlos: Oben und unten hängen zusammen.
- **Levels in beide Richtungen:** Die meisten Levels lassen sich hin und zurück fliegen. Hindernisse
  liegen dann gespiegelt. Einbahnstraßen sind auf der Karte mit einem Pfeil markiert.
- **Upgrades** öffnen Hindernisse: Felswände, enge Spalten, Stachelfelder und Dunkelzonen.
  Stachelfelder und Dunkelzonen sind **weiche** Hindernisse: Wer gut genug ist, kommt auch ohne das
  passende Item durch und kann die Welt in anderer Reihenfolge spielen.
- **Power-Leiste** wie bei Gradius/Parodius: Bonbons sammeln, mit POWER das markierte Upgrade kaufen
  (Tempo, Rakete, Doppel, Laser, Begleiter, Schild).
- **Speichern** an Stationen. Wer stirbt, landet an der letzten Station. Items bleiben, Power-Ups nicht.
  Per *Rohrpost* reist du zwischen besuchten Stationen.
- **Nie stecken bleiben:** Im Pause-Menü gibt es immer „Etappe abbrechen“ und „Zur letzten Station“.
  Die Weltkarte ist außerdem per Test bewiesen sackgassenfrei (siehe unten).

Ausführlicher, mit Weltkarte (Spoiler!): [docs/DESIGN.md](docs/DESIGN.md)

## Entwicklung

Voraussetzung: Node.js 22.

```bash
npm install          # Abhängigkeiten (esbuild, Electron, electron-builder, playwright-core)
npm test             # alle Unit- und Simulationstests (~5 s)
npm run build        # dist/index.html bauen
npm run e2e          # bauen + Browser-Test mit Screenshots in e2e/screenshots/
npm start            # Desktop-App starten (Electron)
npm run dist:win     # Windows-Paket nach release/
npm run dist:linux   # AppImage nach release/
node tools/make-icon.mjs   # App-Icon aus der Spielgrafik neu erzeugen
```

Der Desktop-Test läuft mit `xvfb-run -a npm run e2e:desktop` (Linux), für das fertige Paket mit
`WENDEHALS_EXE=release/linux-unpacked/wendehals xvfb-run -a node e2e/electron.mjs`.
Mit `?unverwundbar` an der URL lässt sich die Browser-Version zum Ausprobieren unverwundbar spielen.

### Projektaufbau

```
src/
  core/      Mathe & Drehungen, Zufall, Eingabe (Tastatur/Gamepad), Audio-Synthesizer
  data/      Weltkarte, Items, Figuren, Gebiete, Texte
  game/      Spiellogik ohne DOM: Weltgraph, Softlock-Löser, Level-Generator,
             Level-Simulation, Gegner, Bosse, Power-Leiste, Spielstand, Spielablauf
  render/    Canvas-Zeichnungen (alle Grafiken als Vektoren) und Renderer
  main.js    Browser-Einstieg (Spielschleife mit festem 60-Hz-Takt)
electron/    Desktop-Hülle
tests/       node:test – Welt, Level, Spielablauf, Zeichnen
e2e/         Browser- und Electron-Tests (Playwright)
tools/       Build-Skript, Icon-Generator
```

### Was die Tests absichern

- **Keine Sackgassen:** Ein Löser durchsucht *alle* erreichbaren Zustände (Knoten × Blickrichtung ×
  Items). Er beweist, dass von jedem Zustand aus das Ende erreichbar ist, mit und ohne Können,
  auch nach Tod/Rohrpost.
- **100 %** aller Items und Knoten sind erreichbar. Mit Können gibt es echte Abkürzungen.
- **Jedes Level** wird in jeder Richtung vom Autopiloten durchgeflogen. Ohne Pflicht-Item kommt man
  nachweislich nicht durch.
- **Fairness:** Ein ausweichender Autopilot überlebt jedes Level ohne Unverwundbarkeit. Stachelfelder
  sind ohne Treffer passierbar. Die Uhrzeiger des Endbosses lassen immer einen sicheren Streifen frei.
- **Komplettdurchlauf:** Das ganze Spiel wird über die echte Spiellogik bis zum Abspann gespielt,
  einmal auf dem normalen Weg und einmal mit Abkürzungen.
- **Spielstand:** Speichern/Laden, kaputte oder manipulierte Spielstände, voller Speicher.
- **Zeichnen:** Jedes Level, jeder Boss, jedes Menü wird gezeichnet und auf ungültige Werte geprüft.
- **Browser/Electron:** Echte Tastatur- und Gamepad-Eingaben, alle Gebiete und Bosse, Zufallseingaben,
  keine JavaScript-Fehler.

### In ein eigenes Repository umziehen

Das Projekt liegt vorerst im Ordner `wendehals/` eines anderen Repositorys. So wird es mit
vollständiger Historie zu einem eigenen Repository:

```bash
git subtree split --prefix=wendehals -b wendehals-only
git push git@github.com:<benutzer>/wendehals.git wendehals-only:main
```
