# Stand Paket 13 „Editor“

> Wird von jedem Bau-Lauf gepflegt (Brief: [`BRIEF.md`](BRIEF.md), Abschnitt 7). Zeiten in Europe/Berlin.

**Sperre:** belegt seit 12.10.2026 01:12, Lauf https://claude.ai/code/session_0189CMazp9chAXpeuqDHdUEA

## Stufen

| # | Stufe | Stand | Getestet | Notiz |
|---|---|---|---|---|
| 1 | Grundgerüst + Ansehen | fertig (Electron-Start ungetestet) | npm test 313, e2e, e2e:editor, beide Test-Agenten | Lauf 1 |
| 2a | Bauen I | offen | – | – |
| 2b | Bauen II | offen | – | – |
| 3 | Spielen ab hier + Bezeichnung | offen | – | – |
| 4 | Prüfer | offen | – | – |
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
