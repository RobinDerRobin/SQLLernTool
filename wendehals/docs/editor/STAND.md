# Stand Paket 13 „Editor“

> Wird von jedem Bau-Lauf gepflegt (Brief: [`BRIEF.md`](BRIEF.md), Abschnitt 7). Zeiten in Europe/Berlin.

**Sperre:** frei

## Stufen

| # | Stufe | Stand | Getestet | Notiz |
|---|---|---|---|---|
| 1 | Grundgerüst + Ansehen | fertig (Electron-Start ungetestet) | npm test 313, e2e, e2e:editor, beide Test-Agenten | Lauf 1 |
| 2a | Bauen I | fertig (Electron-Speichern ungetestet; Raumgröße nur per Zahlenfeld, kein Ziehgriff) | npm test 340, e2e, e2e:editor, beide Test-Agenten | Lauf 2 |
| 2b | Bauen II | fertig (Electron ungetestet; Teile ohne Spielgrafik, Hindernis = Platzhalterbild) | npm test 357, e2e, e2e:editor, beide Test-Agenten | Lauf 3 |
| 3 | Spielen ab hier + Bezeichnung | fertig (nur Ost/West/Nord/Süd-Gänge spielbar; Electron ungetestet) | npm test 369, e2e, e2e:editor, beide Test-Agenten | Lauf 4 |
| 4 | Prüfer | fertig (Electron ungetestet; Marken nur bei offener Liste) | npm test 384, e2e, e2e:editor, beide Test-Agenten | Lauf 5 |
| 5 | Gebiete und Übergänge | fertig (Electron ungetestet; „Level zuordnen“ = Gebietsdatei, kein Verschieben von Gängen zwischen Gebieten) | npm test 401, e2e, e2e:editor, beide Test-Agenten | Lauf 6 |
| 6 | Tilesets und Spielgrafik | fertig (Electron ungetestet; Tileset-Look nur im Editor, „Spielen ab hier“ nutzt weiter Prototyp-Farben) | npm test 406, e2e, e2e:editor, beide Test-Agenten | Lauf 7 |
| 7 | Testmenü am Deck | fertig (`?testmenue` / `WENDEHALS_TESTMENUE=1`; Electron und echtes Gamepad ungetestet) | npm test 410, e2e, e2e:editor, beide Test-Agenten | Lauf 8 |
| 7b | Bedienung (Brief: BRIEF-7b-bedienung.md) | fertig: A0–A8 und Fehler „Spielen ab hier“ erfüllt (Electron ungetestet; obere Leisten bei 1280 px scrollen waagerecht) | npm test 422, e2e, e2e:editor (neu: e2e/editor-bedienung.mjs), beide Test-Agenten | Lauf 9 |
| 8 | Notizen und Stempel | fertig (Electron ungetestet; Stempel nur per Rechtsklick, kein Vorschaubild in der Liste) | npm test 435, e2e, e2e:editor (neu: e2e/editor-notizen.mjs), beide Test-Agenten | Lauf 10 |
| 9 | Bot-Spieltest | fertig: Knopf/Taste Z, Liste mit Bezeichnung, Sprung zur Stelle (Electron ungetestet; Bot fliegt nur Hinweg, kein Rückweg; weicht nicht in Nischen außerhalb des Gangs aus; Diagonalen nicht spielbar) | npm test 444, e2e, e2e:editor (neu: e2e/editor-bot.mjs), beide Test-Agenten | Lauf 11 |
| 10 | KI-Varianten nebeneinander | fertig: Knopf/Taste Y, bis 4 Varianten per Mehrfach-Dateiwahl, Kacheln mit Vorschau, Zahlen, Prüferstand, Unterschied; Übernehmen mit Strg+Z (Electron ungetestet; Varianten nur über den Dateidialog, kein Ordner `levels/varianten/`; Kacheln scrollen waagerecht ohne sichtbare Leiste) | npm test 451, e2e, e2e:editor (neu: e2e/editor-varianten.mjs), beide Test-Agenten | Lauf 12 |
| 11 | Abschluss | fertig: EDITOR.md vollständig, PROTOTYPEN nachgezogen, Gesamtprüfung beider Test-Agenten, Fehler behoben (Electron ungetestet) | npm test 453, e2e, e2e:editor, beide Test-Agenten | Lauf 13 |

## Verbindliche Anforderungen von Robin – gelten für jeden Lauf (Liste: BRIEF.md Abschnitt 9)

Stand 12.10.2026: A0–A8 (Grundsatz Lunar Magic, Rechtsklick bei Auswahl = Kopie, Tileset-Fenster) und A1–A6 (Maus wie Lunar Magic + Shift-Ziehen verschiebt, stufenloser Zoom, Karten-/Levelansicht mit Ausgangsperspektive, Auswahl, Schutz + Strg+Z/Y, kein Feinraster). **Vor jeder neuen Stufe
umsetzen** (höchste Priorität), danach weiter mit den Stufen. **Fehler zuerst beheben:** „Spielen ab hier“ lehnt einen geraden Gang ab, sobald ein anderer Gang im Gebiet diagonal ist (UX-Bericht). Weitere UX-Vorschläge des Experten (S1–S7, K1–K5)
(`docs/forschung/2026-10-12-editor-ux-1-ux-experte.md`) sind **keine** Anforderungen, bis Robin sie bestätigt.

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

## Auf Vorbehalt entschieden (Stufe 6)

- Look-Schalter (Knopf „Look“, Taste J): Standard „Prototyp“ (Farben des Fenster-Prototyps, damit alle Pixeltests unverändert gelten); „Tileset“ färbt Boden/Schachbrett/Wand/Hindernis mit den Terrainfarben des Gebiets-Themas (`katalog.js: tilesetFarben`). Tileset des Gebiets wählbar im Eigenschaftenfeld (mit Rückgängig).
- Gegner: neues Werkzeug X, Spielgrafik über `drawEnemy`, oranger gestrichelter Ring = Platzhalter. Hindernis = Vollfläche in der Fensterfarbe (kein Kreuz). Palette rechts mit Bildern (Formteil, Wand, Hindernis, 11 Gegner, Gegner des Tilesets zuerst). `pruefeFormat` meldet unbekannte Gegnerart.

## Auf Vorbehalt entschieden (Stufe 5)

- `welt.json` additiv erweitert: je Gebiet optional `lage {x,y}` (nur Versatz im Welt-Plan), Liste `uebergaenge [{id, von:"gebiet/K", nach:"gebiet/K"}]`. Ohne `lage` ordnet `weltLagen` automatisch an; beim ersten Verschieben werden alle Lagen festgeschrieben.
- Neue Ansicht „Welt“ (Taste T), Werkzeug „Bereich“ (A). Welt-Prüfer W1 MUSS (Übergänge gültig), W2/W3/W4 SOLL (Überlappung, Zusammenhang, Inhalt im Bereich) in `welt.js`, nicht in `regeln.js` (Gebiets-Prüfer unverändert). Zoomstufen um 64 und 128 Bildschirme ergänzt.
- Löscht man einen Knoten mit Übergang, bleibt der Übergang stehen (W1 meldet); Knoten-IDs mit Übergang werden nicht neu vergeben. Welt-Rückgängig setzt nur Lage und Übergänge zurück, nicht die Gebietsliste.

## Offen aus Stufe 6 (Agenten-Prüfung, Hinweise)

- Obere Leisten scrollen jetzt waagerecht (vorher abgeschnitten); Palette bei 1024×600 nur gescrollt nutzbar; Gegner bei Normalzoom winzig; Beschriftungen überlappen; Hindernisfarbe im Look „Disco“ kaum von der Wand unterscheidbar.
- „Spielen ab hier“ ignoriert das Tileset (Prototyp-Farben); Look „Tileset“ meldet bei unbekanntem Tileset trotzdem Erfolg (nur handgebaute Daten); Palette wird bei jedem `refresh()` neu gezeichnet; kein Pixelvergleich Editor ↔ Spielzeichnung für Gegner (gleiche Funktion `drawEnemy`).

## Offen aus Stufe 5 (Agenten-Prüfung, Hinweise)

- Layout bei 1024×600: Werkzeugleiste schneidet Löschen/Speichern/Öffnen ab (alt, jetzt etwas besser oben); „Übergang anlegen“ liegt dort unter dem Sichtbereich. Beschriftungen in der Welt-Ansicht überlagern sich (Übergangstexte, Gebietsnamen, gedreht schlimmer); Linie eines verwaisten Übergangs wird nicht gezeichnet. Strg+S in der Welt schreibt welt.json auch bei offenen W1-Fehlern; Anzeige „gespeichert“ in der Welt zeigt nur welt.json. Lage wird bei Überlauf still begrenzt. Bereichsfelder nur sichtbar, wenn nichts gewählt ist. Gebiets-Prüfer zählt Inhalt außerhalb des Bereichs nicht (nur W4). Gebietsname „Beispiel „Kanal““ hat doppelte Anführungszeichen (Daten). Einmal trat im Smoke-Test (v0.2, Drehscheibe) ein Fehler auf, Wiederholung grün (bekannter Flake, nichts am Spiel geändert).

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

## Auf Vorbehalt entschieden (Stufe 7)

- Testmenü als eigener Start `?testmenue` (Electron `WENDEHALS_TESTMENUE=1`), nicht im Spiel-Titel. Je Gang und je Knoten ein Eintrag; Knoten am Gangende: Dackel 120 E vor dem Knoten (Rahmen auf dem Knoten). Im Spiel steht noch der Hinweis „zurück zum Editor“ (kosmetisch). Stick hat kein Auto-Repeat in langen Listen.

## Auf Vorbehalt entschieden (Stufe 8)

- Notiz = neue Dingart `notiz` (eigene sperrbare Ebene „Notizen“), wählbar/verschiebbar/kopierbar/löschbar wie ein Teil; Strg+A und Auswahlrahmen nehmen sie mit. **Dafür zwei bestehende Zähl-Erwartungen um `+ notizen` ergänzt** (`tests/editor-bedienung.tests.mjs` „A4 Auswahlrahmen“, `e2e/editor-bedienung.mjs` „Strg+A wählt alles“) – die Prüfungen sind sonst unverändert und gelten weiter für alle anderen Arten. Notizen ändern nichts am Spiel; „Spielen ab hier“ und Prüfer ignorieren sie.
- Notiztext: eine Zeile (Zeilenumbrüche werden zu Leerzeichen), höchstens 200 Zeichen; Eingabe rechts, Cursor springt nach dem Setzen dorthin. Kürzel M (Notiz), U (Stempel).
- Stempel = benannte Zwischenablage (`merkeDinge`), Datei `levels/stempel.json`, wird mit Strg+S (Gebiets-Speichern) mitgeschrieben; Welt-Ansicht-Speichern schreibt sie nicht. Stempel wählen → Rechtsklick setzt (A7 bleibt: bei Auswahl kopiert Rechtsklick die Auswahl; Stempel wählen hebt sie auf). Electron: Pfad `stempel.json` zusätzlich erlaubt.
- Das Notiz-Bild liegt im Abschnitt „Notiz“ über der Stempelliste, nicht in der Palette (die Palette-Tests zählen 3 Teile + 11 Gegner).

## Offen aus Stufe 8 (Agenten-Prüfung, Hinweise)

- Stempel anlegen/löschen/umbenennen sind nicht mit Strg+Z rückgängig (Datei bleibt bis Strg+S unverändert; Auf Vorbehalt, ob A5 das umfasst – Frage an Robin unten). Ist `stempel.json` beim Laden ungültig, wird sie nicht überschrieben. Stempel wird nur mit einem gültigen Gebiet gespeichert; in der Welt-Ansicht schreibt Strg+S ihn nicht und die „ungespeichert“-Anzeige ignoriert ihn.
- Stempel-Liste liegt tief im rechten Feld (bei 720 px scrollen); keine Meldung beim Umbenennen/Löschen/Setzen; Listeneintrag abgeschnitten; Notiztexte überdecken Beschriftungen; Prüfer-Zahl steigt mit gesetzten Stempeln (SOLL S2 Gegner); M/U in der Welt-Ansicht wechseln still zurück ins Gebiet; Notiz-Länge wird nur in `setzeTeil` erzwungen, nicht beim Laden von Gebieten.

## Fragen an Robin (Stufe 8)

- Sollen Stempel (anlegen, löschen, umbenennen) mit Strg+Z rückgängig zu machen sein? (Bisher nein: sie sind eine eigene Datei, ✕ löscht bis Strg+S nur im Editor.)

## Laufprotokoll

| Start | Lauf | Ergebnis |
|---|---|---|
| 11.10.2026 22:30 | Opus 5.5 (Leveldesign-Session) | Brief und Stand angelegt |
| 11.10.2026 23:28 | Sonnet 5.5, Lauf 1 | Stufe 1 gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 01:08 | Sonnet 5.5, Lauf 2 | Stufe 2a gebaut, Agenten-Befunde behoben, gepusht |
| 12.10.2026 03:10 | Sonnet 5.5, Lauf 3 | Stufe 2b gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 05:12 | Sonnet 5.5, Lauf 4 | Stufe 3 gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 05:57 | Sonnet 5.5, Lauf 5 | Stufe 4 gebaut, Agenten-Befund (Leistung M2) behoben, gepusht |
| 12.10.2026 06:35 | Sonnet 5.5, Lauf 6 | Stufe 5 gebaut, Agenten-Befunde (Fehler) behoben, gepusht |
| 12.10.2026 07:06 | Sonnet 5.5, Lauf 7 | Stufe 6 gebaut, Agenten-Befund (Leisten abgeschnitten) behoben, gepusht |
| 12.10.2026 07:42 | Lauf 8 (Sonnet 5.5) | Stufe 7 fertig, grün |
| 12.10.2026 18:34 | Lauf 9 (Sonnet 5.5, Bau-Session 7b) | Stufe 7b gebaut (A0–A8), Agenten-Befunde behoben, gepusht |
| 13.10.2026 01:12 | Lauf 10 (Sonnet 5.5) | Stufe 8 gebaut (Notizen, Stempel), Prüfkette grün, Agenten-Befunde (Fehler) behoben, gepusht |
| 13.10.2026 01:47 | Lauf 11 (Sonnet 5.5) | Stufe 9 gebaut (Bot-Spieltest), Kette grün, Agenten ohne Fehler; Hinweise teils behoben. Einmaliger e2e-Smoke-Fehler (Drehscheibe) trat 2× auf, danach 3× grün, ohne Basisvergleich eindeutig: Flake |
| 13.10.2026 02:38 | Lauf 12 (Sonnet 5.5) | Stufe 10 gebaut (Varianten), Kette grün, Agenten-Befunde behoben (Übergangsknoten-Warnung, Vergleich nach Reihenfolge/unbekannten Feldern, Fenster modal, Meldung im Fenster). P3-Branch nicht gemergt: unverbundene Historie, Editor-Branch enthält ihn schon |

## Auf Vorbehalt entschieden (Stufe 7b)

- Maus: Die linke Taste ist immer „Auswählen/Ziehen“; die Werkzeugknöpfe und -tasten wählen das „aktuelle Element“ für den Rechtsklick (`Auswahl (V)` = keines). In der Welt-Ansicht setzt Rechtsklick nichts (links ziehen im Leeren verschiebt dort weiter den Plan). Ziehschwelle 8 px für alles.
- Zoom: ×1,15 je Rasten (deltaY 100), Strg+Rad ×4, Tasten +/− ×1,25, `1` = 1 Bildschirm, `2` = 2,2, Pos1 = alles (5 % Rand), Bereich 0,25–160; waagerechtes Rad schiebt seitlich.
- Esc: erst Auswahl aufheben, dann eine Ebene hoch (Level → Karte → Welt); in der Levelansicht zählt das Level selbst als „nichts gewählt“; in der Welt gibt es keine höhere Ebene (früher führte Esc dort ins Gebiet). Bild↑/↓ wechselt das Level.
- Level = Gang + zwei Knoten + Teile, die diese Flächen berühren (aus der Geometrie, `level.js`); das Gewählte bleibt sichtbar; im Level ist das Level immer gewählt. Die Rechtsklick-Werkzeuge arbeiten dort auf dem ganzen Gebiet (können an unsichtbare Knoten/Gänge anschließen).
- Feld `ansicht` am Gang: Richtung (`E`…`NE`), die im Plan nach rechts zeigt; `E` = Norden oben = Standard, wird nicht gespeichert. Auswahlfeld und „Ansicht merken“ rechts.
- Ebenen (5): Knoten, Gänge, Formteile, Wände/Hindernisse, Gegner. Gesperrt = nicht wählbar, nicht per Rahmen/Strg+A, und Setzen/Kopieren/Einfügen dorthin wird abgelehnt (Meldung). Gang-/Knoten-Werkzeug brauchen beide Ebenen.
- A7: Kopie bei gewählten Teilen/Knoten (auch gemischt mit Gängen); ein Gang allein (und das Level in der Levelansicht) zählt nicht → Palettenelement. Ein Element wählen (Taste, Palette, Tileset-Fenster, Knotentyp-Liste) hebt die Auswahl auf; V behält sie. Rechts ziehen bei Auswahl setzt nichts (Meldung).
- Mehrfach: Gruppe verschiebt im Raster (100 E mit Knoten/Gängen, sonst 20 E), ein einzelnes Ding rastet absolut wie bisher; Gang ziehen = seine zwei Knoten. Pfeile: nächste Kartenachse zur Bildschirmrichtung, Umschalt ×5; bei nur einem Gang oder ohne Auswahl wandert der Plan. Duplizieren +40 E (mit Knoten +100 E). Kollision mit vorhandenem Knoten lehnt die ganze Aktion ab. Rahmen: ganz drin, Alt = berührend, Strg ergänzt. Drehen mehrerer: jedes um die eigene Mitte.
- Tileset-Fenster (Taste I, anfangs aus, in der Welt-Ansicht aus): Aufbau (Gang, Knotentypen), Boden/Wand/Hindernis, Gegner (Tileset zuerst). Die Palette rechts bleibt.
- „Spielen ab hier“ und Testmenü prüfen die Karte um den gewählten Gang (`spielbarkeit(g, gangId)`); der Prüfer M7 prüft weiter das ganze Gebiet.
- Speichern/Öffnen stehen jetzt vorn in der zweiten Leiste (waren abgeschnitten).

## Offen aus Stufe 7b (Agenten-Prüfung, Hinweise)

- Obere Leisten bei 1280 px noch breiter als das Fenster (scrollen); Hinweiszeile abgeschnitten; Beschriftungen überlappen („Ostgang“/Notiz); Wände im Leeren unsichtbar (Wandfarbe = Hintergrund). UX-Vorschläge S1–S7, K1–K5 nicht umgesetzt.
- Drehen mit Q/E passt den Zoom nicht an; jeder Pfeildruck ist ein eigener Rückgängig-Schritt; Eigenschaftenfelder x/y nehmen Werte abseits des 20-E-Rasters an (A6 gilt für Maus, Pfeile, Einfügen); „Hier teilen“ und Prüfer-Sprung umgehen die Ebenen-Sperre; `state.zeiger` ist nach Tastenzoom veraltet (Strg+V an alter Stelle); Esc hält eine laufende Fahrt nicht an; Strg+C nach „Bezeichnung kopieren“ wird abgefangen (schon vor 7b); Mehrfachauswahl zeigt rechts nur Anzahlen, keine gemeinsamen Felder.
- Electron und echtes Speichern-Dialog-Verhalten nicht ausführbar getestet.

## Fragen an Robin (7b)

- (keine neuen)

## Auf Vorbehalt entschieden (Stufe 9)

- Bot (`src/editor/bot.js`) = Wegfinder aus `tests/helpers/netz-bot.mjs` (Kopie, weil der Build nichts aus tests/ nimmt), plus Quersteuerung am Weg (Hindernisse im Gang umfliegen) und Fallback auf 16 E Wandabstand. Je Gang: Start am Gang-Anfang, Ziel 30 E vor dem Ende; Meldungen ok/tod/stecken/zeit/nicht spielbar; Bezeichnung nennt die Stelle des Fehlers. Knopf „Bot-Spieltest“ und Taste Z (Strg+Z bleibt Rückgängig); nur im Gebiet, nicht in der Welt-Ansicht.
- **Fund:** `FensterScene.pickTarget` lief bei einer Karte mit nur einem Knochen endlos (Editor-Karten, auch „Spielen ab hier“). Guard in `src/proto/fenster.js` (Verhalten ab zwei Knochen unverändert, Golden Master grün) – berührt eine Prototyp-Datei, bitte bei Gelegenheit ansehen.

## Offen aus Stufe 9

- Kein Rückweg, keine Gegner, Ausweichen in Nischen außerhalb des Gangs fehlt; Liste ohne Schließen-Kreuz, verdeckt Plan unten rechts; Lauf blockiert synchron (Netz ≈ 0,5 s).

## Auf Vorbehalt entschieden (Stufe 10)

- Variante = Gebietsdatei, per Dateidialog (Mehrfachauswahl) geladen; liegt nur in der Ansicht (`state.varianten`), nie in `welt.json`; Gebietswechsel leert sie mit Hinweis. Höchstens 4 (`MAX_VARIANTEN`). Taste `Y`, Fenster ist modal (nur Y, Esc, Strg+Z/Y/S gehen durch).
- Übernehmen = Inhalt der Variante ins offene Gebiet, **ID und Name bleiben**; ein Rückgängig-Schritt. Vergleich nach IDs, mit Reihenfolge und allen Feldern. Warnung, wenn ein Knoten mit Übergang geändert würde.
- P3-Branch (`claude/wendehals-p3-45grad`): `git merge` meldet „unrelated histories“ (Historie neu aufgebaut); nicht gemergt, nichts am Spiel geändert.

## Offen aus Stufe 10

- Kein Ordner `levels/varianten/` (Electron-Preload erlaubt nur bekannte Pfade); Bot-Ergebnis je Variante fehlt; Kacheln: kein sichtbares Scrollzeichen; Fenster wird bei jedem `refresh()` neu aufgebaut (Scrollposition der Kachelreihe geht verloren); Varianten-Fenster bleibt beim Wechsel in die Welt als „offen“ gemerkt.

| 13.10.2026 03:12 | Lauf 13 (Sonnet 5.5) | Stufe 11 fertig: Doku, Gesamtprüfung. Behoben: riesige Koordinaten beim Laden (Obergrenze + M2-Messstellen begrenzt), welt.json-ID passt nicht zur Datei (wird übersprungen, mit Meldung), M7 springt zur Stelle, Testmenü scrollt/Statuszeile überlappt nicht mehr. **Editor fertig.** |

## Offen aus Stufe 11 (Hinweise der Gesamtprüfung)

- Stempel anlegen/löschen/umbenennen nicht im Rückgängig-Verlauf; Zahlenfelder nehmen Werte abseits des 20-E-Rasters an; Testmenü zeigt gleichnamige Level (P1c „Netz“: nord/sued/west/ost mehrfach) ohne Unterscheidung; geteilte Gänge heißen beide „Gang 1“; Überschrift in der Welt-Ansicht mit doppelten Anführungszeichen; kein Knopf „Neues Gebiet“; frisch geöffnete identische Datei zählt als „ungespeichert“; Bot-Zeit weicht von der Editor-Flugzeit ab (Startversatz?); Speichern meldet bei Fehler in welt.json/stempel.json „Nicht gespeichert“, obwohl das Gebiet geschrieben ist; Overlaps in der Welt-Ansicht (Beschriftungen). Electron nicht getestet. Smoke-Test `npm run e2e` kann sporadisch rot sein (v0.2-Prüfungen, nicht Editor).
