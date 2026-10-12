# Stand Paket 13 „Editor“

> Wird von jedem Bau-Lauf gepflegt (Brief: [`BRIEF.md`](BRIEF.md), Abschnitt 7). Zeiten in Europe/Berlin.

**Sperre:** belegt seit 12.10.2026 06:35, Lauf https://claude.ai/code/session_01USdbRq4mPurJPMkCKpGRm3

## Stufen

| # | Stufe | Stand | Getestet | Notiz |
|---|---|---|---|---|
| 1 | Grundgerüst + Ansehen | fertig (Electron-Start ungetestet) | npm test 313, e2e, e2e:editor, beide Test-Agenten | Lauf 1 |
| 2a | Bauen I | fertig (Electron-Speichern ungetestet; Raumgröße nur per Zahlenfeld, kein Ziehgriff) | npm test 340, e2e, e2e:editor, beide Test-Agenten | Lauf 2 |
| 2b | Bauen II | fertig (Electron ungetestet; Teile ohne Spielgrafik, Hindernis = Platzhalterbild) | npm test 357, e2e, e2e:editor, beide Test-Agenten | Lauf 3 |
| 3 | Spielen ab hier + Bezeichnung | fertig (nur Ost/West/Nord/Süd-Gänge spielbar; Electron ungetestet) | npm test 369, e2e, e2e:editor, beide Test-Agenten | Lauf 4 |
| 4 | Prüfer | fertig (Electron ungetestet; Marken nur bei offener Liste) | npm test 384, e2e, e2e:editor, beide Test-Agenten | Lauf 5 |
| 5 | Gebiete und Übergänge | offen | – | – |
| 6 | Tilesets und Spielgrafik | offen | – | – |
| 7 | Testmenü am Deck | offen | – | – |
| 8 | Notizen und Stempel | offen | – | – |
| 9 | Bot-Spieltest | offen | – | – |
| 10 | KI-Varianten nebeneinander | offen | – | – |
| 11 | Abschluss | offen | – | – |

## Fragen an Robin

- (keine offen) – Weg der Dateien beantwortet am 11.10.2026: lokaler Klon in einer VM mit Claude Desktop, Editor
  speichert direkt in `wendehals/levels/` (Brief Abschnitt 4).

## Auf Vorbehalt entschieden

- (Brief Abschnitt 8)
- Knotentyp `ende` (Sackgasse) im Katalog ergänzt; Kreuzungen/Räume tragen Rechteck-Maße `w`/`h`, die 45°-Kreuzung `form: "achteck"`.
- Zoom in 7 Stufen (0,5–32 Bildschirme), „Alles zeigen“ nimmt die stärkste passende Stufe.
- Esc/Klick ins Leere beendet Auswahl, Fahrt und Rahmen.

## Auf Vorbehalt entschieden (Stufe 2a)

- Gang-Anschluss an einen Knoten nur, wenn die Richtung im 45°-Raster liegt; sonst freies Ende im Raster. Knoten verschieben/x,y ändern wird abgelehnt, wenn ein Gang das Raster verließe.
- Neue Gangenden sind Typ `ende`, ab zwei Gängen automatisch `kreuzung`. Gang deckungsgleich auf einem Gang: abgewiesen. Koordinaten/Maße höchstens ±20000 E.
- Neue Gebiete aus „Öffnen“ kommen erst nach ihrer Speicherung in `welt.json`. Gelöschte IDs werden wieder vergeben (kleinste freie Nummer).

## Auf Vorbehalt entschieden (Stufe 2b)

- Werkzeuge Formteil (B), Wand (W), Hindernis (H): Klick = Standardmaße (konstanten.js), Ziehen = Länge/Winkel im 8er-Raster. Teile-Winkel auf [0,180) normiert (Rechtecke). Lage rastet auf 20 E. Kürzel R/Umschalt+R drehen, Strg+C/V/D kopieren/einfügen/duplizieren (Einfügen an der Maus, sonst Ansichtsmitte).
- Teile liegen in der Auswahl über Gängen/Knotenflächen; Ziehen auf ihnen verschiebt das Teil (Plan: mittlere/rechte Maustaste). Leisten haben feste Höhen (kein Umbrechen).

## Auf Vorbehalt entschieden (Stufe 3)

- „Spielen ab hier“ nutzt eine neue Karte (`src/proto/editor-karte.js`); `fenster-draw.js` nur additiv (extraFloor/blocks). Dackel startet 120 E hinter der Rahmenmitte (Bildstelle 120|135, wie im Rahmen gezeichnet).
- Nicht spielbar (Meldung vorher, nichts startet): Diagonal-Gänge, Achteck-Knoten, Teile mit Winkel ≠ 0°/90°, Gänge die sich ohne gemeinsamen Knoten kreuzen, getrennte Gangteile. Gegner = nur Hinweis. Daher ist „Beispiel“ (hat eine Diagonale) und „proto-achteck“ nicht spielbar, „proto-netz“ ja.
- Knochen (Spielziel des Prototyps) liegen an Gangenden und in Räumen; Taste P beendet auch im Spiel (ist dort „Pause“). Tasten: P spielen, N Bezeichnung.

## Auf Vorbehalt entschieden (Stufe 4)

- Prüfer-Knopf unten zeigt die Zählung (rot/gelb/grün); Liste und Marken im Plan erscheinen erst nach Klick (damit Pixeltests der Spielbilder unberührt bleiben). M7 = `spielbarkeit().probleme`. M4 prüft Mittelpunkt + 4 um 2 E eingezogene Ecken; M3 misst ab Knotenmitte, nur Knoten vom Typ `kreuzung`. M2 tastet alle 20 E längs und 10 E quer ab.

## Offen aus Stufe 4 (Agenten-Prüfung, Hinweise)

- Layout bei 1024×600: Werkzeugleiste schneidet „Speichern/Öffnen“ ab (nicht neu, Stufe 2a/2b). Liste (440 px) verdeckt Plan und fängt Klicks; Schließen nur über den Knopf. Rahmen bleibt nach Objektwahl am früheren Gang. `teilSetzen` rundet bei Klick exakt auf Zellenmitte falsch (20×60). M7/M5-„kein Speicherort“/M6 ohne Ort (Klick springt nicht). M2 übersieht Wände < 20 E Dicke und rundet bis 10 E großzügig; M4 übersieht schmale Wand über Lücke; Gegner auf der Gangkante asymmetrisch; Zahlen der Marken in zeichnen.js. M2 braucht bei 300 Objekten/10 Gängen ca. 180 ms je Änderung.

## Offen aus Stufe 3 (Agenten-Prüfung, Hinweise)

- Knochen-Lage wird nicht auf Erreichbarkeit geprüft (Wand/Hindernis auf dem Knochen); Rahmenstelle <120 E: Dackel wird auf Boden gesetzt, ohne Meldung; Konstanten (KNOCHEN_ABSTAND, PROBEN, SCHRITT) noch nicht in konstanten.js; Kreisprobe 16 Randpunkte (≈2 % Ungenauigkeit an Innenecken); Wand wirkt im Spiel wie ein Loch in Hintergrundfarbe; Rahmen zeigt den Dackel erst bei großem Zoom; M7 noch nicht als Regel in regeln.js (Stufe 4 ruft `spielbarkeit()` auf); untere Leiste bricht bei Meldung um; keine Bezeichnung für Wand/Formteil; SpielModus ohne Node-Test.

## Offen aus Stufe 2b (Agenten-Prüfung, Hinweise)

- Wand auf leerem Grund unsichtbar (nur Auswahlumriss); Doppelklick setzt zwei Teile; Hinweis-Label breiter als kleines Hindernis; Auswahl nach Rückgängig leer; alte Meldungen bleiben bei wirkungslosen Tasten; „Öffnen“ markiert Gebiet als ungespeichert; Zahlenfeld mit Komma im Nicht-Deutsch-Chrome ungeprüft; TEILSORTEN liegt in teile.js statt katalog.js (Änderbarkeit); obere Leiste bei 1280 Breite knapp.

## Offen aus Stufe 2a (Agenten-Prüfung, Hinweise)

- Gänge dürfen sich ohne Knoten kreuzen (Prüfer Stufe 4 soll es melden); `bereich` wird nicht nachgeführt (Stufe 5); beide Hälften eines geteilten Gangs heißen gleich; Namenslänge unbegrenzt; Beschriftungen können sich überlagern; Alles-zeigen-Zoomstufen grob; Raum-Ziehgriff fehlt.
- Electron (`npm run editor`, IPC, Schließen-Dialog) in der Cloud nicht ausführbar, nur Code-Review.

## Offen aus der Agenten-Prüfung (Stufe 1)

- Test „Drehen und zurück = dasselbe Bild“ vergleicht nur Zustand; echter Pixelvergleich der Drehung fehlt.
- Spielbild-Test nutzt Konstanten des Prototyps, ruft dessen Zeichenfunktion nicht auf; Hindernisse/Gegner-Grafik kommt in Stufe 6.
- `treffer()` trifft Raumflächen nicht; Knoten bei ausgeblendeter Beschriftung klickbar; Zeichenzahlen (Gegnerradius, Schrift) noch in zeichnen.js.
- `?editor` ist im Release-Bundle erreichbar (Brief: selber Build).

## Laufprotokoll

| Start | Lauf | Ergebnis |
|---|---|---|
| 11.10.2026 22:30 | Opus 5.5 (Leveldesign-Session) | Brief und Stand angelegt |
| 11.10.2026 23:28 | Sonnet 5.5, Lauf 1 | Stufe 1 gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 01:08 | Sonnet 5.5, Lauf 2 | Stufe 2a gebaut, Agenten-Befunde behoben, gepusht |
| 12.10.2026 03:10 | Sonnet 5.5, Lauf 3 | Stufe 2b gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 05:12 | Sonnet 5.5, Lauf 4 | Stufe 3 gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 05:57 | Sonnet 5.5, Lauf 5 | Stufe 4 gebaut, Agenten-Befund (Leistung M2) behoben, gepusht |
