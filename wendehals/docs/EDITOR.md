# Level-Editor (Paket 13) – Aufbau und „so ändere ich X“

> Stand: Stufe 5 (Gebiete und Übergänge). Wird in Stufe 11 vervollständigt. Bau-Brief: [`editor/BRIEF.md`](editor/BRIEF.md), Stand:
> [`editor/STAND.md`](editor/STAND.md), Entscheidungen: [`LEVELDESIGN.md`](LEVELDESIGN.md).

## Starten

| Weg | Befehl |
|---|---|
| Desktop (Hauptweg, Robin) | `npm run editor` (baut, öffnet Electron mit `WENDEHALS_EDITOR=1`) |
| Browser | `npm run build`, dann `dist/index.html?editor` öffnen |
| Automatischer Test | `npm run e2e:editor` (echtes Chromium, klickt/zieht/tippt, misst Pixel) |

## Bedienung (Stufe 1)

Klick wählt Gang oder Knoten, Ziehen verschiebt, Mausrad zoomt (9 Stufen, Normalansicht 2,2 Bildschirme breit).
`Q`/`E` drehen in 45°-Schritten, `0` Norden oben, `F` „wie im Spiel“ (Flugrichtung des gewählten Gangs nach rechts),
`L` Beschriftung aus/an, Pfeiltasten verschieben, `+`/`−` zoomen. Der **gelbe Rahmen** ist der Bildschirm (480 × 270 E) mit
dem Dackel; der Fahrt-Schieber unten (oder Leertaste) fährt ihn mit 70 E/s durch den Gang. Angezeigt werden Länge in E,
Bildschirmen und Sekunden.

## Spielen ab hier und Bezeichnung (Stufe 3)

Gang wählen, Rahmen an die Stelle fahren, `P` (oder „▶ Spielen ab hier“): der Fenster-Prototyp startet über dem Editor, der
Dackel steht dort, wo ihn der Rahmen zeigt (120 E hinter der Rahmenmitte, Blickrichtung = Richtung des Gangs). `Esc` oder
Start-Taste am Controller führt zurück; der Editorzustand (Daten, Auswahl, Ansicht) bleibt unverändert. `N` (oder „Bezeichnung
kopieren“) kopiert `Wendehals-Level <gebiet>/<gang>@<stelle>` bzw. `<gebiet>/<knoten>`; ist die Zwischenablage gesperrt, steht
der Text markiert in einem Feld unten.

**Was der Fenster-Prototyp (noch) nicht kann**, meldet „Spielen“ vorher als „Noch nicht spielbar: …“ und startet nichts:
Gänge außerhalb von Ost-West/Nord-Süd (Diagonalen), Achteck-Knoten, Teile mit Winkel ≠ 0°/90°. Gegner werden nicht gespielt
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
src/editor/konstanten.js      alle Zahlen, Tastenkürzel, Farben, Zoomstufen
src/editor/katalog.js         Knotentypen, Objekttypen, Tilesets, Gegner-Platzhalter, Schloss-Platz
src/editor/daten.js           Format prüfen/formatieren, Geometrie (Gang, Rahmen, Boden), Bezeichnung
src/editor/ansicht.js         Kamera: Mitte, Zoomstufe, Drehung (blick = Richtung, die nach rechts zeigt)
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

Siehe Brief Abschnitt 4. Einheiten E, x nach Osten, y nach Süden, Winkel in Grad (Vielfache von 45). Ein **Gang** ist das
Rechteck von Knoten `von` zu Knoten `nach` mit `breite`. Ein **Knoten** mit `w`/`h` hat zusätzlich ein Rechteck als Boden
(Raum, Kreuzungsquadrat), mit `form: "achteck"` und `seite` ein regelmäßiges Achteck (die 45°-Kreuzung). **Formteile** sind
zusätzlicher Boden, **Wand-Objekte** schneiden Boden aus. Gespeichert wird immer im Standardformat (`formatiere` in `daten.js`):
2 Leerzeichen, feste Schlüsselreihenfolge, ein Listenelement pro Zeile – ein Test prüft, dass Laden → Speichern dieselben Bytes ergibt.

## So ändere ich …

| Wunsch | Wo |
|---|---|
| Tastenkürzel, Raster, Zoomstufen, Farben, Tempo, Maße | `src/editor/konstanten.js` |
| neuer Knoten-/Objekttyp, Gegner, Tileset | `src/editor/katalog.js` |
| anderes Aussehen eines Typs im Plan | `src/editor/zeichnen.js` |
| neue Prüfregel (Gebiet) / (Welt) | `src/editor/regeln.js` / `pruefeWelt()` in `src/editor/welt.js` |
| neues Werkzeug | neue Datei in `src/editor/werkzeuge/` und ein Eintrag in der Werkzeugliste (ab Stufe 2a) |
| was „Spielen ab hier“ kann / meldet | `spielbarkeit()`/`baueKarte()` in `src/editor/spielen.js` |
| Anzeigen rechts/unten | `eigenschaften()`/`refreshFahrt()` in `src/editor/main.js` |
