# Wendehals – Leveldesign und Editor

> Design-Runde mit Robin am 11.10.2026 (Opus 5.5). Was hier als **entschieden** markiert ist, hat Robin bestätigt;
> alles mit **Vorschlag** ist besprochen, aber noch nicht bestätigt. Verbindlich bleibt
> [`PROTOTYPEN.md`](PROTOTYPEN.md) (Register E11–E13, Paket 13, Protokoll F5).

## 1. Entschieden (Robin, 11.10.2026)

**Leveldesign läuft parallel zur Logik** (ersetzt „Kein Leveldesign, solange Logik und Konzept nicht stehen“).
Robin: „Das Leveldesign soll doch schon stattfinden. Es ergibt keinen Sinn alle Logik zu bauen, ohne Level in denen
sie getestet werden kann. Stattdessen: Kein Grundkonzept ohne Prototypentests.“
Folge: Level sind der Prüfstand für die Logik und müssen billig umzubauen sein; fest wird ein Konzept erst, wenn es
in echten Leveln gespielt wurde.

**Begriffe.** Robin: „Ein Level ist ein Gang zwischen Knotenpunkten. Gebiete sind ebenfalls relevant, ich will
themenbezogene Level in Gruppen, das sind Gebiete.“

| Ebene | Inhalt |
|---|---|
| Welt | Gebiete und ihre Verbindungen |
| Gebiet | Thema; eine Gruppe von Knoten und Leveln |
| Knoten | Kreuzung, Raum, Boss, Speicherort (Drehorte) |
| Level | ein Gang von Knoten zu Knoten |
| Bausteine | Objekte, Gegnerwellen, Set-Pieces |

**Daten: Objekte mit Maßen statt Kachelraster** (Weg B; Robin: „B klingt gut.“). Ein Level ist eine Liste von
Teilen (Wandstück, Hindernis, Set-Piece, Gegnergruppe, Drehort …) mit Lage, Länge, Breite, Winkel. Ein Raster dient
nur zum Einrasten im Editor und wird nicht gespeichert; freie Polygone nur als Ausnahme-Objekt. Begründung: Robins
Sorge, Kachelraster seien zu einschränkend (45°-Gänge würden zu Treppen); die Gang-Listen der Prototypen
(`src/proto/karte.js`) sind schon so gebaut.

**Manuelles Design mit einem Editor**, Vorbild Lunar Magic (Robin hat Erfahrung mit Spiel-Editoren).

**Rolle der KI** (Robin): Varianten erzeugen; prüfen und Fehler melden; Gebiete nach Regeln entwerfen; Robins
Designstücke verbinden oder extrapolieren, analysieren, Regeln daraus ableiten und dann generieren.

**Selbstständigkeit der KI** (Robin): „Die KI soll teilweise selbst arbeiten. Das ist dann im Szenario zu bewerten.
Wenn die Entscheidungen zu groß sind, soll gefragt werden. Ähnlich wie in dem Projekt hier allgemein.“

**Editor als eigenes Arbeitspaket im selben Repo** (Paket 13; Robin: „Arbeitspaket auf jeden Fall so festlegen.“).
Gebaut von Claude in Bau-Sessions (Sonnet 5.5), Stufe für Stufe:

| Stufe | Inhalt | Schätzung |
|---|---|---|
| E1 | Einen Gang bearbeiten: Objekte setzen/ziehen/löschen, Rückgängig, Speichern/Laden, „Spielen ab hier“ | 2–3 Sessions |
| E2 | Prüfer-Meldungen im Editor | 1 |
| E3 | Gebiet-Ebene (Knoten, Gänge, Themen) | 2 |
| E4 | Gegner und Wellen setzen | 2–3 |
| E5 | Welt-Ebene, KI-Varianten nebeneinander vergleichen | 1–2 |

Regeln für das Paket:
- **Selbes Repo, selber Code:** Editor, Spiel und Prüfer teilen Geometrie und Regeln (Grundprinzip „Spiel und Löser
  teilen die Regeln“, erweitert auf den Editor). Einstieg z. B. über `?editor` im Build.
- **Eine Stufe wird erst gebaut, wenn Robin sie beim Bauen eines echten Levels vermisst** (gegen den Editor als
  Selbstzweck).
- **Die Textdatei geht immer auch ohne Editor**; die KI arbeitet direkt mit ihr.
- **Objekttypen aus einer Katalogdatei**, damit neue Typen kaum Editor-Code brauchen (Regeln ändern sich noch).
- Der Editor ist ein Werkzeug, keine allgemeine Engine: die Engine ist das Spiel selbst; der Editor bearbeitet nur die
  Daten, die sie liest (wie Lunar Magic für Super Mario World).

**Robin arbeitet am PC** (Maus, Tastatur); der Editor muss nicht auf dem Steam Deck laufen. Gespielt und abgenommen
wird weiterhin auf dem Deck (Regel 8). **Klickbare Optik-Skizze gewünscht** („Ja sehr gut.“):
[`editor-skizze.html`](editor-skizze.html), veröffentlicht unter https://claude.ai/artifact/Sp9Ncg4tAyzVZqk2jrKo1P
(nur Optik, Prüfregeln darin sind Beispiele).

Editor-Skizze als Text (Aussehen, nicht bestätigt):

```
┌ Welt ▸ Gebiet „Kanal“ ▸ Gang „Schleuse“ ─────────── [▶ Spielen ab hier] ┐
│ Palette    │                                          │ Eigenschaften  │
│ ▭ Wand     │   Draufsicht (Norden oben)               │ Länge  1800    │
│ ◇ Hindernis│   zoomen / schieben / einrasten          │ Breite  200    │
│ ✦ Gegner   │   ═══════╦═════════════                  │ Winkel  45°    │
│ ⟳ Drehort  │          ║                               │ Thema  Rost    │
│ ☐ Set-Piece│                                          │                │
├────────────┴──────────────────────────────────────────┴────────────────┤
│ Prüfer: ✔ passierbar  ✘ Drehort K3 zu eng (R4)  ⚠ 3 Engstellen in Folge │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1b. Entschieden in Runde 2 (Robin, 11.10.2026)

- **Echtes Spielbild statt Symbolen.** Robin zur ersten Skizze: „Die symbolische Darstellung ist unpraktisch. Das Level
  fühlt sich auch viel kleiner an, als in dem eigentlichen Spiel.“ Daher: der Editor zeichnet mit der Spielzeichnung,
  Normalansicht 1:1 mit **Bildschirmrahmen** (480 × 270 E, so viel sieht der Spieler auf einmal), Längen immer auch in
  Bildschirmen und Sekunden Flug (Prototyp: 70 E/s → 1800 E ≈ 3,8 Bildschirme ≈ 26 s).
- **Ein durchgehender Grundriss** statt getrennter Bildschirme für Welt/Gebiet/Gang: Gebiete sind Bereiche auf dem
  Plan, Level (Gänge) und Knoten liegen darin; Lage und Länge ergeben sich aus dem Plan. Werkzeuge: Gang von einem
  Knoten aus in 8 Richtungen ziehen (neuer Knoten am Ende im Leeren), Knoten setzen, Gang anklicken = T-Kreuzung.
  Robin: „Klingt alles gut.“
- **Ansicht:** normal Norden oben, drehen möglich.
- **Der Editor kennt nur, was ein Prototyp bestätigt hat** (Robin: „Ja“). Erst Geometrie; Gegner, Drehen begrenzen,
  Tempo, Schlösser kommen erst nach ihrem Prototyp bzw. Paket in den Katalog.
- Die Stufen E1–E5 aus Abschnitt 1 werden dadurch neu zugeschnitten (E1 = Grundriss-Editor); neuer Zuschnitt folgt
  nach Robins Bestätigung.

## 2. Vorschläge (besprochen, noch nicht bestätigt)

- **Quelle der Wahrheit:** eine Textdatei (JSON) pro Gebiet; Editor, KI und Prüfer lesen und schreiben dieselbe Datei.
- **Ablauf mit der KI:** Robin baut Stücke → KI analysiert und schlägt Regeln vor → Robin bestätigt → Regelwerk
  „Level-Regeln“ → KI erzeugt (Varianten, Verbindungen, Gebiete) → Prüfer + Bot-Spieltest → Robin spielt und urteilt.
- **Regelwerk „Level-Regeln“** mit zwei Sorten: MUSS-Regeln (automatisch geprüft: passierbar, Drehort hat Platz,
  keine Sackgasse …) und SOLL-Regeln (Stil, Rhythmus, belegt mit Robins Beispielen). Weltebene: bestehender Löser
  (`tools/pruefe-welt.mjs`, Invarianten I1–I8, Regeln R1–R15 in `WELT-DESIGN.md`) als Vorbild.
- **Stufen der Selbstständigkeit:** frei = Varianten und Füll-Level innerhalb bestätigter Regeln, Prüfer grün;
  vorschlagen = neue Gebietsstruktur, neue Knotentypen; fragen = neue Regel, Regelbruch, Progression, Setting.
- **Reihenfolge:** (1) Format + Gang-Prüfer, (2) Vorschau: Datei im Prototyp spielbar, (3) Editor E1,
  (4) Robin baut ein erstes kleines Gebiet (3–4 Knoten, 4–5 Level), KI leitet erste Regeln ab.
- Vorbilder für „Handgebaute Stücke + Generator“: Spelunky, Dead Cells (Recherche noch nicht gemacht).

## 3. Offen

- Gegner/Wellen von Anfang an im Editor oder erst die Geometrie?
- Robins Rückmeldung zur Optik-Skizze.
- Was kommt in den Editor, solange Konzepte noch im Prototyp sind (Robin, 11.10.2026: „es ist wichtig, zuerst die
  Konzepte durchzuprüfen, bevor man sie editieren kann“)? Vorschlag in Arbeit.
- Bestätigung der Vorschläge in Abschnitt 2.
