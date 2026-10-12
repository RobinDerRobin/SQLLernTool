# Level-Editor (Paket 13) – Aufbau und „so ändere ich X“

> Stand: Stufe 7b (Bedienung wie Lunar Magic). Wird in Stufe 11 vervollständigt. Bau-Brief: [`editor/BRIEF.md`](editor/BRIEF.md), Stand:
> [`editor/STAND.md`](editor/STAND.md), Entscheidungen: [`LEVELDESIGN.md`](LEVELDESIGN.md).

## Starten

| Weg | Befehl |
|---|---|
| Desktop (Hauptweg, Robin) | `npm run editor` (baut, öffnet Electron mit `WENDEHALS_EDITOR=1`) |
| Browser | `npm run build`, dann `dist/index.html?editor` öffnen |
| Automatischer Test | `npm run e2e:editor` (echtes Chromium, klickt/zieht/tippt, misst Pixel) |

## Bedienung (Stufe 7b, Robins Anforderungen A0–A8)

Grundsatz **A0**: wo nichts festgelegt ist, so wie Lunar Magic. Die Maus-Belegung steht an einer Stelle: `MAUS` in `src/editor/konstanten.js`.

| Eingabe | Wirkung |
|---|---|
| **Linksklick** | wählt (Strg+Klick ergänzt oder entfernt). Linksklick **setzt nie etwas**. |
| **Links ziehen** (ab 8 px) auf einem Ding | verschiebt die ganze Auswahl (Knoten 100 E, Teile 20 E; Gänge nehmen ihre Knoten mit) |
| **Links ziehen** im Leeren | Auswahlrahmen: wählt, was ganz drin liegt; **Alt** beim Loslassen: auch, was nur hineinragt; **Strg** ergänzt |
| **Rechtsklick** | setzt das aktuelle Element (Knoten, Formteil, Wand, Hindernis, Gegner; Gang und Bereich per Rechts-Ziehen). Ist ein Objekt oder Knoten **gewählt**, setzt er stattdessen eine **Kopie der Auswahl** (A7). Ein Element wählen (G K B W H X A, Palette, Tileset-Fenster) hebt die Auswahl auf. Kein Browser-Menü. |
| **Mittlere Taste** oder **Shift+Ziehen** | verschiebt den Plan |
| **Mausrad** | zoomt stufenlos um den Mauszeiger (15 % je Raste, Touchpad anteilig); waagerechtes Rad schiebt seitlich |
| **Doppelklick** / **Enter** auf einem Gang | öffnet das Level (siehe unten); **Esc**: eine Ebene höher |

Tasten: `+`/`−` zoomen (×1,25), `1` = ein Bildschirm, `2` = Normalansicht 2,2, `Pos1` = alles einpassen; das Zoomfeld oben nimmt eine Zahl in Bildschirmen an.
`Q`/`E` drehen die Ansicht in 45°-Schritten, `0` Norden oben, `F` „wie im Spiel“, `L` Beschriftung, `J` Look, `T` Welt-Ansicht, `I` Tileset-Fenster.
`Strg+A` wählt alles in der Ansicht, **Pfeiltasten** verschieben die Auswahl (Umschalt ×5; ohne Auswahl oder bei nur einem Gang den Plan), `R` dreht gewählte Teile, `Strg+C`/`V`/`D` kopieren, einfügen, duplizieren (auch mehrere, Gänge samt Knoten),
**Entf** löscht (Backspace nicht), `Strg+Z`/`Strg+Y` (auch `Strg+Umschalt+Z`) Rückgängig/Wiederholen – für jede Aktion, in jeder Ansicht, mit jedem Fokus außer im Textfeld; die Knöpfe nennen die Aktion („Rückgängig: Wand setzen“).
Ziehen beginnt erst ab 8 px. **Ebenen sperren** (Leiste „Sperren“: Knoten, Gänge, Formteile, Wände/Hindernisse, Gegner): gesperrte Ebenen sind nicht wählbar, nicht verschiebbar, und es lässt sich nichts hineinsetzen.
Der **gelbe Rahmen** ist der Bildschirm (480 × 270 E) mit dem Dackel; der Fahrt-Schieber unten (oder Leertaste) fährt ihn mit 70 E/s durch den Gang. Angezeigt werden Länge in E, Bildschirmen und Sekunden.

**Ebenen Welt → Karte → Level (A3).** Die Brotkrume oben links zeigt `Welt › Gebiet › Level „Name“ (K1 → K2)`; jeder Teil außer dem letzten ist anklickbar. Die **Levelansicht** zeigt nur den Gang, seine zwei Knoten und alle Teile, die diese Flächen berühren (`src/editor/level.js: levelInhalt`, aus der Geometrie berechnet; das Datenformat kennt kein „Level“-Objekt). Alles andere ist ausgeblendet und nicht wählbar; das gerade Gewählte bleibt sichtbar. `Bild↑`/`Bild↓` wechseln das Level. In der Karte hebt das erste `Esc` die Auswahl auf, das zweite geht in die Welt.
**Ausgangsperspektive:** Feld `ansicht` am Gang (`"E"`, `"SE"`, `"S"` … = die Richtung, die im Plan nach rechts zeigt; fehlt das Feld, ist Norden oben). Beim Öffnen des Levels wird sie angewendet. Rechts im Gang: Auswahlfeld „Ausgangsansicht“ und „Ansicht merken“ (speichert die aktuelle Drehung); beides mit Rückgängig.

**Tileset-Fenster (A8, Taste `I` oder Knopf „Tileset“):** verschiebbares Fenster (am Titel ziehen) mit allen Elementen des Gebiets als Bilder – Gang, die fünf Knotentypen, Formteil, Wand, Hindernis, die Gegner des Tilesets (dann die übrigen). Klick wählt das aktuelle Element für den Rechtsklick. Die Palette rechts zeigt Formteil/Wand/Hindernis/Gegner wie bisher.

## Spielen ab hier und Bezeichnung (Stufe 3)

Gang wählen, Rahmen an die Stelle fahren, `P` (oder „▶ Spielen ab hier“): der Fenster-Prototyp startet über dem Editor, der
Dackel steht dort, wo ihn der Rahmen zeigt (120 E hinter der Rahmenmitte, Blickrichtung = Richtung des Gangs). `Esc` oder
Start-Taste am Controller führt zurück; der Editorzustand (Daten, Auswahl, Ansicht) bleibt unverändert. `N` (oder „Bezeichnung
kopieren“) kopiert `Wendehals-Level <gebiet>/<gang>@<stelle>` bzw. `<gebiet>/<knoten>`; ist die Zwischenablage gesperrt, steht
der Text markiert in einem Feld unten.

**Was der Fenster-Prototyp (noch) nicht kann**, meldet „Spielen“ vorher als „Noch nicht spielbar: …“ und startet nichts:
Gänge außerhalb von Ost-West/Nord-Süd (Diagonalen), Achteck-Knoten, Teile mit Winkel ≠ 0°/90°. Geprüft wird die Karte **um den gewählten Gang** (`spielbarkeit(g, gangId)`: der Gang und alles, was über gerade Gänge an ihm hängt, samt berührender Teile): ein gerader Gang startet auch, wenn irgendwo im Gebiet ein diagonaler Gang liegt (er steht dann als Hinweis dabei); der diagonale Gang selbst bleibt „noch nicht spielbar“. Die Prüfregel M7 und das Testmenü nutzen dieselbe Funktion. Gegner werden nicht gespielt
(Hinweis). Die Prüfung steht in `spielbarkeit()` (`src/editor/spielen.js`); die Prüfregel M7 (Stufe 4) ruft dieselbe Funktion auf.
Die Karte baut `baueKarte()` aus den Editor-Daten (Gänge → Rechtecke, Knotenflächen und Formteile → Boden, Wände und Hindernisse →
feste Blöcke) über `src/proto/editor-karte.js`; Kamera, Drehen und Tod bleiben unverändert in `FensterScene`.

## Gebiete und Übergänge (Stufe 5)

**Bereich** (`bereich` im Gebiet): das Rechteck, in dem das Gebiet auf dem Plan liegt; er ändert weder Gänge noch Boden. Im
Gebiet als gestrichelter Rahmen mit Namen. Werkzeug **Bereich** (`A`): Rechteck aufziehen (rastet auf 100 E, mindestens ein
Bildschirm, zu kleine Bereiche werden mit Meldung abgelehnt). Rechts (nichts gewählt): die vier Seiten als Zahlenfelder und
„Bereich an Inhalt anpassen“ (Rand 200 E). Alles mit Rückgängig/Wiederholen.

**Welt-Ansicht** (`T`, Knopf „Welt“): alle Gebiete nebeneinander im Spielbild-Farbton, Bereiche als Rahmen, Übergänge als rosa
Linien. Klick wählt ein Gebiet oder einen Übergang, **Ziehen verschiebt ein Gebiet** (100 E; die Gebietsdatei bleibt unberührt,
nur `lage` in `welt.json` ändert sich), Doppelklick/Enter öffnet es, `T` geht zurück. Gebiete ohne `lage` ordnet `weltLagen()`
automatisch von links nach rechts an; beim ersten Verschieben werden alle Lagen festgeschrieben, damit nichts springt.
Rückgängig/Wiederholen/Speichern (Strg+Z/Y/S) wirken in der Welt-Ansicht auf `welt.json`.

**Übergang** = Verbindung zweier Knoten verschiedener Gebiete (`"von": "beispiel/K5", "nach": "proto-netz/K1"`). Anlegen: Gebiet
wählen, rechts „Von Knoten / Nach Gebiet / Nach Knoten“, „Übergang anlegen“ (oder im Gebiet am Knoten „Übergang anlegen …“).
Knoten mit Übergang tragen im Gebiet einen rosa Ring mit „→ Ziel“; im rechten Feld springt ein Klick ins andere Gebiet.
Wird ein Knoten mit Übergang gelöscht, bleibt der Übergang stehen und der Welt-Prüfer meldet ihn (W1) – nichts verschwindet still.

**Welt-Prüfer** (Prüfer-Knopf in der Welt-Ansicht, Regeln in `pruefeWelt()` in `src/editor/welt.js`):
W1 MUSS Übergänge verbinden zwei vorhandene Knoten verschiedener Gebiete, IDs eindeutig · W2 SOLL Bereiche überlappen sich im
Welt-Plan nicht · W3 SOLL alle Gebiete hängen über Übergänge zusammen · W4 SOLL alles im Gebiet liegt im Bereich.

`welt.json`: `{ format, gebiete: [{ id, name, datei, lage?: {x, y} }], uebergaenge?: [{ id, von, nach }] }`, formatiert von
`formatiereWelt()` (ein Gebiet und ein Übergang je Zeile). Geschrieben wird nur, was es als Datei gibt (neu geöffnete, noch
ungespeicherte Gebiete und ihre Übergänge bleiben draußen).

## Dateien

```
levels/welt.json              Liste der Gebiete, ihre Lage, die Übergänge
levels/gebiete/<id>.json      ein Gebiet: Knoten, Gänge, Formteile, Objekte, Notizen  (Quelle der Wahrheit)
src/editor/konstanten.js      alle Zahlen, Tastenkürzel, Farben, Zoom, Maus-Belegung
src/editor/katalog.js         Knotentypen, Objekttypen, Tilesets, Gegner-Platzhalter, Schloss-Platz
src/editor/daten.js           Format prüfen/formatieren, Geometrie (Gang, Rahmen, Boden), Bezeichnung
src/editor/ansicht.js         Kamera: Mitte, stufenloser Zoom (in Bildschirmen), Drehung (blick = Richtung, die nach rechts zeigt)
src/editor/level.js           Levelinhalt (Levelansicht) und spielbare Karte um einen Gang (reine Geometrie)
src/editor/mehrfach.js        Mehrfachauswahl: Rahmen, gemeinsam verschieben/kopieren/einfügen/löschen/drehen
src/editor/ebenen.js          sperrbare Ebenen: Zuordnung der Dinge und Werkzeuge
src/editor/werkzeuge/auswahl.js  linke Maustaste: wählen, ziehen, Auswahlrahmen, Hervorhebung
src/editor/zeichnen.js        Plan im Spielbild (Farben und Schachbrett wie der Prototyp), Rahmen, Beschriftung
src/editor/startdaten.js      bettet levels/*.json in den Build ein
src/editor/welt.js            Bereich, Lage, Übergänge, welt.json laden/formatieren, Welt-Prüfer (W1–W4)
src/editor/zeichnen-welt.js   Zeichnung der Welt-Ansicht; werkzeuge/welt-ansicht.js ihre Mausbedienung
src/editor/spielen.js         Editor-Daten → Karte des Fenster-Prototyps, Startlage, Spielbarkeit
src/editor/spielmodus.js      Oberfläche „Spielen ab hier“ (eigene Eingabe, Esc zurück)
src/proto/editor-karte.js     Karte mit Boden ohne Kreuzungswirkung und festen Blöcken
src/editor/main.js            Oberfläche und Eingabe, `window.__editor` für Tests
tools/gen-editor-start.mjs    erzeugt proto-netz/proto-achteck aus den Prototyp-Karten (einmalig; danach sind die Dateien maßgeblich)
tests/editor-daten.tests.mjs  Einheitentests; e2e/editor.mjs  Browser-Test
```

## Datenformat (Version 1)

Siehe Brief Abschnitt 4. Ein Gang hat optional `ansicht` (Ausgangsperspektive, Richtung als Code `E`…`NE`, fehlt = Norden oben). Einheiten E, x nach Osten, y nach Süden, Winkel in Grad (Vielfache von 45). Ein **Gang** ist das
Rechteck von Knoten `von` zu Knoten `nach` mit `breite`. Ein **Knoten** mit `w`/`h` hat zusätzlich ein Rechteck als Boden
(Raum, Kreuzungsquadrat), mit `form: "achteck"` und `seite` ein regelmäßiges Achteck (die 45°-Kreuzung). **Formteile** sind
zusätzlicher Boden, **Wand-Objekte** schneiden Boden aus. Gespeichert wird immer im Standardformat (`formatiere` in `daten.js`):
2 Leerzeichen, feste Schlüsselreihenfolge, ein Listenelement pro Zeile – ein Test prüft, dass Laden → Speichern dieselben Bytes ergibt.

## So ändere ich …

| Wunsch | Wo |
|---|---|
| Tastenkürzel, Maus-Belegung (`MAUS`), Raster, Zoom (`ZOOM_*`), Ziehschwelle (`KLICK_TOLERANZ_PX`), Farben, Tempo, Maße | `src/editor/konstanten.js` |
| welche Ebenen sich sperren lassen / welches Werkzeug in welche schreibt | `src/editor/ebenen.js` |
| Verhalten von Auswahl, Rahmen, Kopieren mehrerer Dinge | `src/editor/mehrfach.js`, `src/editor/werkzeuge/auswahl.js` |
| was das Level zeigt / was „Spielen ab hier“ mitnimmt | `src/editor/level.js` |
| neuer Knoten-/Objekttyp, Gegner, Tileset | `src/editor/katalog.js` |
| anderes Aussehen eines Typs im Plan | `src/editor/zeichnen.js` |
| neue Prüfregel (Gebiet) / (Welt) | `src/editor/regeln.js` / `pruefeWelt()` in `src/editor/welt.js` |
| neues Werkzeug | neue Datei in `src/editor/werkzeuge/` und ein Eintrag in der Werkzeugliste (ab Stufe 2a) |
| was „Spielen ab hier“ kann / meldet | `spielbarkeit()`/`baueKarte()` in `src/editor/spielen.js` |
| Anzeigen rechts/unten | `eigenschaften()`/`refreshFahrt()` in `src/editor/main.js` |
