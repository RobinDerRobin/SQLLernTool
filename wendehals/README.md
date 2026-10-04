# Wendehals – Ein Dackel dreht durch

Ein **Metroidvania-Shoot'em-Up** im Geist von *Parodius*: Du fliegst als Dackel mit Raketenrucksack
durch eine Welt aus **Kreuzungs-Arenen** und den **Etappen** dazwischen, scrollenden Leveln mit
eigenem Terrain. Upgrades öffnen neue Wege, und die wichtigste Fähigkeit ist, **die Richtung zu wechseln**.

- Läuft komplett **offline**, ohne Installation im Browser oder als Desktop-App (Windows, Linux/Steam Deck)
- Steuerung mit Tastatur oder Controller (Xbox-Layout, Steam Deck)
- Kein Internet, keine externen Dateien: Grafik und Musik werden im Spiel erzeugt

## Spielen

**Am schnellsten:** `dist/index.html` bauen (siehe unten) und per Doppelklick im Browser öffnen.
Die Datei ist ein einzelnes, eigenständiges HTML-Dokument (ca. 130 KB).

**Desktop-App:**

| System | Datei | Hinweis |
|---|---|---|
| Windows | `Wendehals 0.2.0.exe` (portable) oder `Wendehals-0.2.0-win.zip` | ohne Installation startbar |
| Linux / Steam Deck | `Wendehals-0.2.0.AppImage` | ausführbar machen und starten |

Die Pakete entstehen mit `npm run dist:win` bzw. `npm run dist:linux` oder automatisch über den
GitHub-Workflow `.github/workflows/build.yml` (Artefakte `wendehals-windows`, `wendehals-linux-steamdeck`).
Der Workflow läuft erst, wenn das Projekt in einem eigenen Repository liegt (siehe unten).

### Steam Deck

1. Im Desktop-Modus `Wendehals-0.2.0.AppImage` herunterladen, Rechtsklick → Eigenschaften →
   Berechtigungen → „Ausführbar“.
2. In Steam: *Spiele → Ein Nicht-Steam-Spiel zu meiner Bibliothek hinzufügen* → AppImage wählen.
3. Im Spielmodus starten. Das Spiel erkennt den Spielmodus und startet im Vollbild.
   Als Steam-Input-Vorlage „Gamepad“ verwenden.

## Steuerung

| Aktion | Tastatur | Controller |
|---|---|---|
| Fliegen / Menü | Pfeiltasten, WASD | Stick, Steuerkreuz |
| Feuer · Bestätigen | Leertaste, J, Enter | A |
| POWER kaufen · Drehen (*Drehwurm*) · Zurück | K, Umschalt | B |
| Station benutzen (Speichermenü, Rückholung) | X, C | X |
| Wenden (180°, braucht *Wendehals*) | L, Q | Y |
| Turbo halten (braucht *Doppelten Espresso*) | E | RB |
| Karte | M, Tab | View / Select |
| Pause | Esc, P | Start / Menü |
| Vollbild | F11 | – |

## So funktioniert das Spiel

- **Arenen:** Jeder Knoten ist ein Raum, den du frei durchfliegst. In den Wänden liegen Ausgänge,
  manchmal mehrere an einer Seite. **Offen ist nur, wohin du schaust**; alle anderen Klappen sind zu.
  Durch die offene Klappe startet die Etappe, und am Ende kommst du am passenden Ausgang der
  nächsten Arena an.
- **Drehen:** Durch den Ring einer **Drehscheibe** fliegen dreht dich: rechts herum hindurch nach
  rechts, links herum nach links. Mit dem *Drehwurm* drehst du per Taste überall, mit dem
  *Wendehals* wendest du um 180°, sogar mitten in der Etappe.
- **Etappen:** In waagerechten Etappen begrenzen Boden und Decke das Bild, manche sind oben und
  unten offen (endlos). Fliegst du nach Norden oder Süden, ist das Level ein Vertikal-Shooter und
  weiter herausgezoomt, damit du gleich viel Reaktionszeit hast. Die meisten Etappen lassen sich
  hin und zurück fliegen. Einbahnstraßen erkennst du an der Klappe mit rotem Pfeil.
- **Terrain ist tödlich:** Wände, Stacheln, Zahnräder und Pendel kosten sofort ein Leben. Gegner und
  Kugeln ziehen nur Energie ab. Zerbrechliche Blöcke (mit Rissen) lassen sich zerschießen.
- **Upgrades** öffnen Hindernisse: Felswände, enge Spalten, Zeitschranken, Stachelfelder und
  Dunkelzonen. Stacheln und Dunkelheit sind **weich**: Wer gut genug ist, kommt auch ohne Item durch
  und spielt die Welt in anderer Reihenfolge.
- **Power-Leiste** wie bei Gradius/Parodius: Bonbons sammeln, mit POWER das markierte Upgrade kaufen
  (Tempo, Rakete, Doppel, Laser, Begleiter, Schild). Power-Ups bleiben über alle Etappen erhalten,
  beim Tod sind sie weg. *Omas Sparstrumpf* rettet die erste Hälfte.
- **Speichern:** Speicherstation in einer Arena berühren. Wer stirbt, landet an der letzten Station.
  Mit X an der Station: Rohrpost zu anderen Stationen, Pilot wechseln.
- **Nie stecken bleiben:**
  - Sackgassen haben eine Rückholstation.
  - Vor einer Wand, die man noch nicht überwinden kann, kehrt der Dackel von selbst um.
  - Das Pause-Menü bietet „Etappe abbrechen“ und „Zur letzten Station“.
  - Die Welt ist per Test bewiesen sackgassenfrei (siehe unten).
- **Karte (M):** zeigt erkundete Arenen und Etappen, deine Blickrichtung und Etappen, an denen du
  schon abgeprallt bist, mit dem Symbol des Hindernisses.

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
  data/      Welt (Arenen/Etappen), Level-Profile & Terrain-Bausteine, Items, Figuren, Gebiete, Texte
  game/      Spiellogik ohne DOM: Weltgraph, Softlock-Löser, Arena, Terrain (Kachelraster),
             bewegliches Terrain, Level-Generator, Level-Simulation, Gegner, Bosse,
             Power-Leiste, Spielstand, Spielablauf
  render/    Canvas-Zeichnungen (alle Grafiken als Vektoren) und Renderer
  main.js    Browser-Einstieg (60-Hz-Simulation, interpolierte Darstellung für 90/120/144 Hz)
electron/    Desktop-Hülle
tests/       node:test – Welt, Level, Spielablauf, Zeichnen
e2e/         Browser- und Electron-Tests (Playwright)
tools/       Build-Skript, Icon-Generator
```

### Was die Tests absichern

- **Keine Sackgassen:** Ein Löser durchsucht *alle* erreichbaren Zustände (Arena × Blickrichtung ×
  Items) mit allen Ausgängen, Drehungen und Rückholstationen. Er beweist, dass von jedem Zustand aus
  das Ende erreichbar ist, mit und ohne Können, auch nach Tod/Rohrpost.
- **100 %** aller Items und Knoten sind erreichbar. Mit Können gibt es echte Abkürzungen.
- **Jedes Level** wird in jeder Richtung vom Autopiloten durchgeflogen. Ohne Pflicht-Item kommt man
  nachweislich nicht durch.
- **Fairness:** Ein ausweichender Autopilot überlebt jedes Level ohne Unverwundbarkeit. Stachelfelder
  sind ohne Treffer passierbar. Die Uhrzeiger des Endbosses lassen immer einen sicheren Streifen frei.
- **Komplettdurchlauf:** Das ganze Spiel wird über die echte Spiellogik bis zum Abspann gespielt,
  einmal auf dem normalen Weg und einmal mit Abkürzungen. Ein Test-Pilot fliegt dabei die Arenen
  wie ein Mensch: durch Ringe, an Stationen vorbei, durch den richtigen Ausgang.
- **Zeitschranke:** Mit Espresso bleibt in beiden Richtungen mindestens 1,2 s Luft, ohne kommt man
  nicht durch.
- **Spielstand:** Speichern/Laden, kaputte oder manipulierte Spielstände, voller Speicher.
- **Zeichnen:** Jedes Level, jeder Boss, jedes Menü wird gezeichnet und auf ungültige Werte geprüft.
- **Browser/Electron:** Echte Tastatur- und Gamepad-Eingaben, Arena mit Ring und Ausgang, Karte,
  alle Gebiete und Bosse, Zufallseingaben, keine JavaScript-Fehler.
- **Performance** (`npm run e2e:perf`): Frame-Budgets in allen Gebieten, Bossen, Arena und Karte,
  normal und mit 4-facher CPU-Drosselung.
- **Flackern** (`npm run e2e:flash`): höchstens 3 starke Helligkeitssprünge pro Sekunde
  (angelehnt an WCAG 2.3.1). Optionen: „Reduzierte Effekte“.

### In ein eigenes Repository umziehen

Das Projekt liegt vorerst im Ordner `wendehals/` eines anderen Repositorys. So wird es mit
vollständiger Historie zu einem eigenen Repository:

```bash
git subtree split --prefix=wendehals -b wendehals-only
git push git@github.com:<benutzer>/wendehals.git wendehals-only:main
```
