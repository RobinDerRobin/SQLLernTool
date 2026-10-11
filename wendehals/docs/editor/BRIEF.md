# Bau-Brief Paket 13 „Editor“ – Level-Editor für Wendehals

> Für **automatische Bau-Läufe** (Routine, nachts 23–09 Uhr) und jede Session, die am Editor arbeitet.
> Modell: **Sonnet 5.5** (Bauen und Testen). Erstellt am 11.10.2026 mit Opus 5.5 nach der Leveldesign-Runde mit Robin.
> **Vorher lesen:** `CLAUDE.md` (Repo-Wurzel), `wendehals/CLAUDE.md` (Befehle, Do-not-Liste, Regeln für Prototyp-Arbeit),
> `wendehals/docs/LEVELDESIGN.md` (alle Entscheidungen zum Editor), dann [`STAND.md`](STAND.md).
> Branch: **`claude/wendehals-editor`** (ab `claude/wendehals-leveldesign`). Kein PR ohne Auftrag.

## 0. Auftrag (Robin, 11.10.2026, Wortlaut)

- „Ich möchte, dass der Editor funktioniert und dass er ohne große Mühe änderbar ist, wenn mich etwas daran stört. Es darf
  auch 2 Wochen dauern.“
- „Ich habe keine Zeit das alles zu testen.“ → **Testen übernehmen automatische Tests und Test-Agenten**; Robin wird nur
  bei großen Entscheidungen gefragt und probiert am Ende einmal aus.
- „Mehrere Sessions pro Tag. Nachts ab 23 Uhr bis 09 Uhr morgens dürfen sie stattfinden. Mach die Läufe so, dass es
  funktioniert und es schnell erledigt ist, ohne die Qualität zu vernachlässigen.“

## 1. Was der Editor ist (Kurzfassung aus LEVELDESIGN.md – dort steht der Wortlaut)

- Ein **Werkzeug** im selben Repo und Build: `dist/index.html?editor` (Electron: `WENDEHALS_EDITOR=1`). Vorbild Lunar Magic.
  Robin arbeitet **am PC** mit Maus und Tastatur; gespielt wird zusätzlich auf dem Steam Deck.
- **Ein durchgehender Grundriss** (Welt): **Gebiete** sind Bereiche, **Level** sind Gänge zwischen **Knoten** (Kreuzung,
  Raum/Arena, Speicherort, Boss). Norden oben, Ansicht in 45°-Schritten drehbar, „wie im Spiel“ = in Flugrichtung.
- **Echtes Spielbild statt Symbolen**, Normalansicht ≈ 2,2 Bildschirme breit; **Bildschirmrahmen** 480 × 270 E mit Dackel;
  **Fahrt-Schieber** (Rahmen fährt mit 70 E/s durchs Level); Längen immer auch in Bildschirmen und Sekunden.
- **Objekte mit Maßen** (Lage, Länge, Breite, Winkel in 45°-Schritten), Raster nur zum Einrasten. **Formteile** erweitern
  den Boden (Nischen, Verbreiterungen, Stufen) – Formen aus geraden Teilen; unregelmäßige Formen sind geparkt.
- **Tilesets = Aussehen eines Gebiets** (Muster, Farben, Set-Pieces, passende Hindernisse); die Form bleibt frei.
  Platzhalter-Tilesets aus den v0.2-Themen (`src/data/themes.js`), bis das Setting steht.
- **Hindernisse und Gegner in echter Spielgrafik** (dieselben Zeichenfunktionen wie das Spiel). **Gegner sind Platzhalter**
  (v0.2-Gegner, deutlich markiert; ihr Verhalten im Fenster ist ungeprüft – Paket 10/„Druck“).
- **Schlösser** sind ein allgemeiner Platz an Arm/Übergang; Typen (Tür, Hindernis, unbesiegbarer Gegner, Dunkelheit …)
  kommen je Feature – in diesem Brief **nur als ausgegrauter Platzhalter**.
- **Bezeichnung kopieren:** `Wendehals-Level <gebiet>/<level>@<stelle>` (Stelle in E ab Gang-Anfang), Knoten
  `<gebiet>/<knoten>`. Robin gibt sie Claude Code zum Prüfen. Keine Pflicht-Vorprüfung durch die KI.
- Optik-Vorlage: Skizze 2, [`../editor-skizze.html`](../editor-skizze.html) (Bedienung, Werkzeuge, Anzeigen). Die Skizze
  ist Vorlage, kein Code zum Übernehmen.

## 2. Abnahme-Checkliste (zuerst – jede Zeile bekommt einen automatischen Test)

Getestet wird aus Nutzersicht: Editor-Tests im echten Chromium (Playwright, `/opt/pw-browsers/chromium`) klicken, ziehen,
tippen und messen Ergebnis in Datei **und** Bild (Regel 3: messen, was man sieht – z. B. Pixel am Rahmen, Lage im Plan).

- [ ] **Unberührt:** `npm test && npm run e2e` grün, **Golden Master unverändert**, alle Prototyp-Tests unverändert grün,
      Prototyp- und `?spiel`-Start wie bisher. Kein Code in `src/game/`, `src/data/` (außer neue, rein lesende Importe).
- [ ] **Öffnen:** `?editor` öffnet den Editor ohne Konsolenfehler, in Chromium und in Electron.
- [ ] **Laden/Speichern ist verlustfrei:** Datei laden → speichern → gleiche Datei (Byte-Vergleich nach Formatierung);
      ungültige Datei → verständliche Meldung, nichts geht verloren.
- [ ] **Rückgängig/Wiederholen** stellt nach jeder Aktion exakt den vorigen Zustand her (Zustandsvergleich).
- [ ] **Gang ziehen** rastet auf 8 Richtungen und 20 E; im Leeren entsteht ein Knoten; nahe einem Knoten wird verbunden.
- [ ] **Knoten** setzen und Gang teilen (T-Kreuzung) erhalten alle übrigen Daten.
- [ ] **Ansicht:** Drehen in 45°-Schritten und zurück ergibt dasselbe Bild; Zoom/Verschieben ändern keine Daten.
- [ ] **Bildschirmrahmen** ist exakt 480 × 270 E, liegt in Flugrichtung des Levels; Fahrt mit 70 E/s; Anzeige Bildschirme
      und Sekunden stimmt mit Länge/480 und Länge/70 überein.
- [ ] **Spielbild:** Editor zeichnet Boden, Wände, Hindernisse, Gegner mit denselben Funktionen/Farben wie Spiel bzw.
      Prototyp (Test: gleiche Pixel für dasselbe Objekt in Editor und Spielzeichnung, Toleranz nur für Skalierung).
- [ ] **Spielen ab hier** startet den Fenster-Prototyp an der Rahmenstelle mit der Blickrichtung des Levels; Esc führt
      zurück in den Editor mit unverändertem Stand. Was der Prototyp nicht spielen kann, meldet der Prüfer vorher
      („noch nicht spielbar: …“) – nie still falsch spielen.
- [ ] **Prüfer** meldet jede MUSS-Regel (Abschnitt 5) richtig: je Regel ein Test mit gutem und schlechtem Beispiel.
- [ ] **Bezeichnung** wird im richtigen Format kopiert (Fallback: markiertes Textfeld).
- [ ] **Leistung:** Editor bleibt bei 300 Objekten flüssig (Zeichnen < 16 ms im Browser, gemessen).
- [ ] **Änderbarkeit:** Tastenkürzel, Raster, Zoomstufen, Farben in `src/editor/konstanten.js`; Objekttypen, Tilesets,
      Gegner in `src/editor/katalog.js`; Prüfregeln in `src/editor/regeln.js`; ein neues Werkzeug = eine neue Datei in
      `src/editor/werkzeuge/` plus ein Eintrag in der Werkzeugliste. `docs/EDITOR.md` erklärt das.

## 3. Aufbau (verbindlich, damit Änderungen billig bleiben)

```
src/editor/
  main.js          Einstieg (?editor): baut Oberfläche, verbindet Module
  konstanten.js    alle Zahlen und Kürzel (SCREEN 480×270, SPEED 70, Raster 20, Knotenraster 100, Drehzone 160 …)
  katalog.js       Objekttypen, Knotentypen, Tilesets (aus themes.js), Gegner-Platzhalter (aus sprites.js), Schloss-Platz
  daten.js         Datenmodell, Laden/Prüfen des Formats, IDs, Rückgängig (Befehle oder Schnappschüsse)
  speicher.js      Adapter: Datei öffnen/speichern (File System Access API in Chrome/Edge/Electron, sonst Download/Upload)
  ansicht.js       Kamera (Mitte, Maßstab, Drehung), Welt↔Bildschirm
  zeichnen.js      Spielbild des Plans (nutzt Prototyp-/Spiel-Zeichenfunktionen), Rahmen, Auswahl, Beschriftung
  werkzeuge/       auswahl.js, gang.js, knoten.js, formteil.js, wand.js, hindernis.js, gegner.js, notiz.js, stempel.js
  eigenschaften.js rechtes Feld
  regeln.js        Prüfregeln als Liste {id, art: 'MUSS'|'SOLL', text, pruefe(welt) → Meldungen}
  pruefer.js       führt regeln.js aus, Leiste unten, Klick springt zur Stelle
  spielen.js       Editor-Daten → Spielkarte für den Fenster-Prototyp, Start/Rückkehr
  testmenue.js     Level/Knoten aus Datei im Build direkt starten (Deck)
levels/            (Ordner wendehals/levels/) die Leveldateien – Quelle der Wahrheit
docs/EDITOR.md     Aufbau, Datenformat, „so ändere ich X“
tests/editor-*.tests.mjs, e2e/editor*.mjs
```

- Anbindung: wenige Zeilen in `src/main.js` (`?editor`) und `electron/main.cjs` (`WENDEHALS_EDITOR=1`), wie bei `?spiel`.
- `spielen.js` nutzt die vorhandene Fenster-Logik (`src/proto/fenster.js`, `achteck.js`). Falls deren Kartenformat etwas
  nicht ausdrücken kann (beliebige Netze mit Diagonalen, Wände im Gang, Formteile): **neues** Kartenmodul ergänzen
  (z. B. `src/proto/editor-karte.js`), bestehende Prototyp-Dateien nur additiv ändern, alle Prototyp-Tests unverändert
  grün. Die Fenster-Regeln (PROTOTYPEN.md 4a) gelten dabei unverändert.
- Keine neuen Laufzeit-Abhängigkeiten, keine externen Assets, keine Schriftart-Abhängigkeit im Spielbild.

## 4. Datenformat (Version 1)

`wendehals/levels/welt.json` (Gebiete und Lage) und je Gebiet `wendehals/levels/gebiete/<id>.json`:

```json
{ "format": 1, "id": "kanal", "name": "Kanal", "tileset": "bad",
  "bereich": { "x0": -500, "y0": -1600, "x1": 2700, "y1": 1200 },
  "knoten":  [ { "id": "K1", "typ": "speicher", "x": 0, "y": 0 },
               { "id": "K3", "typ": "raum", "x": 1800, "y": -1100, "w": 520, "h": 400 } ],
  "gaenge":  [ { "id": "schleuse", "name": "Schleuse", "von": "K1", "nach": "K2", "breite": 200 } ],
  "formteile": [ { "id": "f1", "x": 900, "y": 160, "laenge": 260, "breite": 120, "winkel": 0 } ],
  "objekte": [ { "id": "o1", "typ": "wand", "x": 420, "y": -70, "laenge": 240, "breite": 60, "winkel": 0 },
               { "id": "o2", "typ": "gegner", "art": "ente", "x": 900, "y": 0, "platzhalter": true } ],
  "notizen": [ { "id": "n1", "x": 1200, "y": 0, "text": "hier soll es eng werden" } ] }
```

- Einheiten E, x nach Osten, y nach Süden, Winkel in Grad (Vielfache von 45). IDs stabil (Bezeichnung hängt daran).
- Formatiert speichern (2 Leerzeichen, feste Schlüsselreihenfolge), damit Diffs lesbar sind.
- Startinhalt: die Karten „Netz“ und „45°-Kreuzung“ als Gebiete `proto-netz`, `proto-achteck` (zum Ansehen) und ein
  Beispielgebiet `beispiel` wie Skizze 2.
- **Offen (Frage an Robin):** wie Robins Dateien vom PC ins Repo kommen (lokaler Klon / GitHub Desktop, Hochladen,
  Artifact mit gemeinsamem Speicher …). Deshalb `speicher.js` als Adapter; bis zur Antwort: Ordner öffnen/speichern
  (File System Access) und Download/Upload.

## 5. Prüfregeln (Start; in `regeln.js`, Zahlen aus `konstanten.js`)

| ID | Art | Regel |
|---|---|---|
| M1 | MUSS | Jeder Gang liegt im 45°-Raster (8 Richtungen). |
| M2 | MUSS | Jeder Gang ist passierbar: an jeder Stelle ≥ 60 E freier Querweg (Formteile zählen als Boden). |
| M3 | MUSS | Drehzone frei: 160 E vor jeder Kreuzung im Gang kein Wand-/Hindernisobjekt. |
| M4 | MUSS | Kein Objekt außerhalb des Bodens. |
| M5 | MUSS | Jeder Knoten hat mindestens einen Gang; jedes Gebiet mindestens einen Speicherort. |
| M6 | MUSS | IDs eindeutig; jeder Gang verweist auf vorhandene Knoten. |
| M7 | MUSS | Was der Fenster-Prototyp nicht spielen kann, wird als „noch nicht spielbar“ gemeldet. |
| S1 | SOLL | Gang nicht kürzer als 1 Bildschirm (Drehzonen überlappen sonst). |
| S2 | SOLL | Gegner sind Platzhalter (Hinweis, kein Fehler). |

## 6. Stufen (Reihenfolge; jede mit Definition of Done = ihre Checklisten-Zeilen grün)

| # | Stufe | Inhalt |
|---|---|---|
| 1 | Grundgerüst + Ansehen | Aufbau aus Abschnitt 3, Datenformat, Startinhalt, Ansicht (Zoom, Verschieben, Drehen, Norden oben, wie im Spiel), Spielbild, Rahmen, Fahrt |
| 2a | Bauen I | Auswahl, Gang ziehen, Knoten setzen/teilen, Raumgröße, Breite, Speichern/Laden |
| 2b | Bauen II | Formteile, Wand, Hindernis, Kopieren, Löschen, Drehen, Rückgängig/Wiederholen |
| 3 | Spielen ab hier + Bezeichnung | `spielen.js`, Rückkehr mit Esc, Bezeichnung kopieren |
| 4 | Prüfer | `regeln.js`/`pruefer.js`, Leiste, Sprung zur Stelle, Engstellen im Bild |
| 5 | Gebiete und Übergänge | Bereiche zeichnen/ändern, Zuordnung, Übergänge anzeigen, `welt.json` |
| 6 | Tilesets und Spielgrafik | Tileset je Gebiet (v0.2-Themen als Platzhalter), Palette mit Bildern, Hindernisse und Gegner (Platzhalter) in Spielgrafik |
| 7 | Testmenü am Deck | im Build jedes Gebiet/Level/jeden Knoten aus den Leveldateien starten, mit Controller bedienbar |
| 8 | Notizen und Stempel | Notizen an Stellen; Auswahl als Stempel speichern und einsetzen |
| 9 | Bot-Spieltest | Bot fliegt jedes Level im Prototyp ab, meldet Tod/Steckenbleiben mit Bezeichnung |
| 10 | KI-Varianten nebeneinander | mehrere Dateien/Varianten nebeneinander ansehen, eine übernehmen |
| 11 | Abschluss | `docs/EDITOR.md` vollständig, Gesamtprüfung durch beide Test-Agenten, LEVELDESIGN/PROTOTYPEN nachziehen |

## 7. Ablauf jedes Laufs (Routine)

1. `git fetch origin claude/wendehals-editor && git checkout claude/wendehals-editor && git pull` (fehlt der Branch: von
   `origin/claude/wendehals-leveldesign` anlegen). **Nur auf diesem Branch arbeiten und pushen.**
2. **Zeitfenster:** nur 23:00–09:00 (Europe/Berlin). Letzter Push spätestens 08:55; nach 07:00 nur Arbeit, die bis dahin
   sicher fertig wird.
3. **Sperre** in `STAND.md`: steht dort „belegt seit“ < 2 h 15 min → sofort beenden, nichts ändern. Sonst eintragen
   („belegt seit <Zeit>, Lauf <Session-Link>“), committen, **sofort pushen**. Push abgelehnt (jemand war schneller) →
   beenden.
4. Neuesten Stand von `origin/claude/wendehals-p3-45grad` **mergen** (nicht rebasen), falls neuer; Konflikt außerhalb
   `src/editor/` → Merge abbrechen, in STAND notieren, ohne Merge weiterarbeiten.
5. Nächste offene Stufe aus STAND nehmen (eine halbfertige zuerst). In kleinen, getesteten Schritten arbeiten,
   **Zeitbox ≈ 100 min** ab Start.
6. Vor jedem Push: `npm ci` (falls nötig, mit `ELECTRON_SKIP_BINARY_DOWNLOAD=1`), dann
   `npm test && npm run e2e && npm run e2e:editor` als **eine Kette**. Golden Master unverändert. Am Stufenende zusätzlich:
   **Software-Tester-Agent** prüft den Diff, **Spieletester-Agent** bedient den Editor im Browser (Gang bauen, speichern,
   spielen); Befunde „Fehler“ vorher beheben.
7. STAND aktualisieren (Stufe, was getestet ist, was offen ist, Laufprotokoll), **Sperre freigeben**, committen, pushen.
   Wenn die Zeit vorher endet: nur grünen Stand pushen; Halbfertiges als „in Arbeit“ mit nächstem Schritt notieren.
8. **Entscheidungen:** klein und umkehrbar → mit der Empfehlung aus LEVELDESIGN.md/Brief selbst entscheiden und unter
   „Auf Vorbehalt entschieden“ eintragen. **Groß** (Robins Regeln, Bauform, Datenformat-Grundsatz, Änderungen am Spiel
   oder Prototyp-Verhalten) → unter „Fragen an Robin“ eintragen, an anderer Stufe weiterarbeiten.
9. Sind alle Stufen fertig: nur „fertig“ melden, nichts ändern.

## 8. Auf Vorbehalt (Robins Antworten stehen aus; Empfehlungen, denen Robin nicht widersprochen hat)

- Tileset = Aussehen eines Gebiets, Form bleibt frei. · v0.2-Themen als Platzhalter-Tilesets. · Gegner als markierte
  Platzhalter. · Formen aus geraden Teilen, unregelmäßige geparkt. · Weg der Dateien ins Repo: offen (Abschnitt 4).
