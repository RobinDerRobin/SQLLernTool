# Bau-Brief Stufe 7b „Bedienung“ – Editor wie Lunar Magic bedienbar machen

> Für **eine Bau-Session** (Sonnet 5.5), gestartet auf Robins Auftrag vom 12.10.2026 („Baubrief aufsetzen und einen Chat
> zur Erstellung machen.“). Ergänzt [`BRIEF.md`](BRIEF.md); dessen Abschnitte 2 (Checkliste), 3 (Aufbau), 7 (Ablauf, ohne
> das Nacht-Zeitfenster) und 9 (Anforderungen) gelten weiter. **Vorher lesen:** `CLAUDE.md`, `wendehals/CLAUDE.md`
> (Regeln 1–9), `docs/LEVELDESIGN.md`, `docs/editor/BRIEF.md`, `docs/editor/STAND.md`, `docs/editor/../EDITOR.md`, und den
> UX-Bericht [`../forschung/2026-10-12-editor-ux-1-ux-experte.md`](../forschung/2026-10-12-editor-ux-1-ux-experte.md)
> (Befunde, Details zu M1–M5).
> Branch: **`claude/wendehals-editor`**. Kein PR. Sperre in STAND.md wie in BRIEF.md Abschnitt 7 (setzen, sofort pushen,
> am Ende freigeben) – die nächtlichen Läufe warten dann.

## 1. Fragekarte

- **Frage:** Kann Robin mit dem Editor arbeiten wie in Lunar Magic, ohne versehentlich etwas zu setzen, mit feinem Zoom
  und mit einer Levelansicht, in der nur das eine Level zu sehen ist?
- **Woran Robin es merkt:** Er zoomt fein auf eine Stelle, öffnet ein Level per Doppelklick, sieht nur dieses Level in
  seiner Ausgangsperspektive, setzt mit Rechtsklick Teile, wählt und verschiebt mit Links, macht mit Strg+Z/Strg+Y
  rückgängig/wieder – und nichts entsteht ungewollt.
- **Bewusst nicht drin:** UX-Vorschläge S1–S7 und K1–K5 (nicht bestätigt), Feinraster unter 20 E (A6), Kontextmenü, Spiel- und Prototyp-Verhalten.

## 2. Abnahme-Checkliste (zuerst; jede Zeile ein automatischer Test aus Nutzersicht im echten Chromium)

- [ ] **Unberührt:** `npm test && npm run e2e && npm run e2e:editor` grün, Golden Master unverändert, alle bisherigen
      Editor-Tests grün (angepasst nur, wo die neue Maus-Belegung es verlangt – nie abgeschwächt).
- [ ] **A1 Rechtsklick setzt:** Rechtsklick ins Leere setzt das aktuelle Element (Knoten, Formteil, Wand, Hindernis,
      Gegner; Gang per Rechts-Ziehen von einem Knoten); **Linksklick setzt in keinem Zustand etwas** (Test: 50 zufällige
      Linksklicks mit jedem gewählten Element → Datei unverändert). Kein Browser-Kontextmenü über dem Plan.
- [ ] **A1 Verschieben:** mittlere Maustaste und **Shift+Ziehen** verschieben den Plan, ändern keine Daten.
- [ ] **A7 Rechtsklick bei Auswahl:** ist ein Objekt ausgewählt, setzt Rechtsklick eine Kopie davon an die Mausstelle;
      ohne Auswahl das aktuelle Palettenelement; kein Menü.
- [ ] **A8 Tileset-Fenster:** verschiebbares Fenster mit allen Teilen des Gebiet-Tilesets als Bilder, Klick wählt das
      aktuelle Element, per Taste ein-/ausblendbar (Vorbild „Add Objects“ in Lunar Magic).
- [ ] **A2 Zoom:** eine Mausrad-Raste ändert den Maßstab um ≈ 15 % (nicht mehr), der Punkt unter dem Mauszeiger bleibt
      auf ±1 px stehen; Touchpad-Kleinstschritte zoomen anteilig; Tasten zoomen; „Alles“ passt ohne Stufen ein (≥ 90 %
      der Breite oder Höhe genutzt); Zoomanzeige in Bildschirmen, Eingabefeld setzt den Zoom.
- [ ] **A3 Ebenen:** Doppelklick oder Enter auf einem Gang öffnet die Levelansicht; Esc geht eine Ebene hoch (Level →
      Karte → Welt); Brotkrume zeigt und schaltet die Ebene.
- [ ] **A3 Ausgeblendet:** in der Levelansicht werden nur das Level, seine zwei Knoten und seine Teile gezeichnet und sind
      klickbar; alles andere ist nicht zu sehen (Pixeltest: außerhalb nur Wandfarbe) und nicht wählbar.
- [ ] **A3 Ausgangsperspektive:** jedes Level hat eine speicherbare Ausgangsperspektive (Drehung in 45°-Schritten, Feld
      am Gang im Datenformat, z. B. `ansicht`); beim Öffnen wird sie angewendet; ohne Angabe Norden oben. Laden/Speichern
      bleibt verlustfrei; alte Dateien ohne das Feld laden fehlerfrei.
- [ ] **A4 Auswahl:** Hervorhebung unter der Maus; Linksziehen im Leeren zieht einen Auswahlrahmen; Strg+Klick ergänzt/
      entfernt; Pfeiltasten verschieben die Auswahl im 20-E-Raster (Shift+Pfeil: größerer Schritt); Kopieren/Einfügen/
      Duplizieren mehrerer Objekte.
- [ ] **A5 Rückgängig:** Strg+Z und Strg+Y (auch Strg+Umschalt+Z) funktionieren für **jede** Aktion (Setzen, Ziehen,
      Löschen, Eigenschaft ändern, Mehrfach-Aktionen, Ansicht-Perspektive) in jeder Ansicht, auch wenn der Fokus nicht
      in einem Textfeld liegt; im Textfeld gilt das Rückgängig des Felds. Test: zufällige Folge von 30 Aktionen, dann
      30× Strg+Z = Ausgangszustand, 30× Strg+Y = Endzustand.
- [ ] **A5 Schutz:** Rückgängig-Knopf zeigt die letzte Aktion („Rückgängig: Wand setzen“); nur Entf löscht (Backspace
      nicht); Ziehen beginnt erst ab 8 px Bewegung; Ebenen (z. B. Gegner, Teile, Knoten) lassen sich sperren.
- [ ] **A6:** keine Lage feiner als 20 E.
- [ ] **Fehler behoben:** „Spielen ab hier“ startet einen geraden Gang auch dann, wenn ein anderer Gang im Gebiet diagonal
      ist (siehe UX-Bericht); Diagonalen selbst bleiben bis auf Weiteres „noch nicht spielbar“ gemeldet.
- [ ] **Hilfe aktuell:** Tastenhinweise im Editor und `docs/EDITOR.md` beschreiben die neue Belegung.

## 3. Reihenfolge (aus dem UX-Bericht, nur bestätigte Teile)

1. B1: A2 Zoom (+ Fehler „Spielen ab hier“)
2. B2: A1 Maus-Belegung, A5 Schutz und Strg+Z/Y
3. B3: A3 Ebenen und Levelansicht mit Ausgangsperspektive
4. B4: A4 Auswahl, A7 Rechtsklick-Kopie
5. B5: A8 Tileset-Fenster

Grundsatz A0: offene Bedienfragen wie in Lunar Magic lösen.

Nach jedem Block Prüfkette grün, committen, pushen. Am Ende Software-Tester-Agent und Spieletester-Agent (Spieletester
bedient wie Robin: zoomen, Level öffnen, mit Rechtsklick bauen, rückgängig, speichern, spielen); Befunde „Fehler“ beheben.
Danach STAND.md: neue Zeile 7b „Bedienung“ als fertig, Anforderungen A1–A6 als erfüllt markieren, Sperre frei, und
`dist/index.html` bauen.

## 4. Entscheidungen

Was Robin nicht festgelegt hat (Tastenwahl für Zoom, Ebenen-Sperre-Bedienung, Feldname der Perspektive …): selbst wählen,
naheliegend an Lunar Magic/Tiled, in STAND.md unter „Auf Vorbehalt entschieden“ eintragen. Was Robins Regeln oder
Anforderungen berührt oder widerspricht: nicht entscheiden, unter „Fragen an Robin“ eintragen, weiterarbeiten.
