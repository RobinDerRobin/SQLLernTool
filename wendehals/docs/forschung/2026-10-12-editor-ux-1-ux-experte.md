# Editor-UX-Durchsicht 1 – UX-Experte

> **Rolle:** UX-Experte für Level-Editoren (Lunar Magic, Tiled, LDtk, Trenchbroom, Mario Maker, Metroidvania-Werkzeuge)
> **Datum:** 12.10.2026
> **Grundlage:** `origin/claude/wendehals-editor` @ `702d12e` („Editor Stufe 7: Befunde der Prüfung …“), gebaute
> `dist/index.html?editor`, selbst bedient in Chromium (Playwright, 1600 × 900 und 1280 × 720).
> **Auftrag:** nur Editor, keine Designentscheidungen am Spiel. Nichts am Code geändert.

---

## 1. Kurzfassung

1. **Der Zoom springt um den Faktor 2 je Mausrad-Raste** (9 feste Stufen 0,5–128 Bildschirme). Drei Rasten machen aus
   der Gesamtansicht eine Ansicht, in der man nur noch Boden sieht; „Alles“ füllt den Plan teils nur zu 42 %.
2. **Linksklick baut sofort**, sobald ein Bau-Werkzeug aktiv ist. Wer „nur mal draufklicken“ will, setzt Knoten oder
   Formteile. Das sieht man fast nur am Wort „ungespeichert“ und daran, dass der Prüfer von 1 auf 3 MUSS springt.
3. **Es gibt keine Levelansicht.** Ein Gang lässt sich nicht für sich allein anschauen. Die Gebietsansicht zeigt immer
   das ganze Netz, Doppelklick auf einen Gang tut nichts.
4. **Auswahl ist zu dünn:** keine Mehrfachauswahl, kein Auswahlrahmen, keine Hervorhebung unter der Maus, keine
   Feinverschiebung mit Pfeiltasten. Rückgängig hat keine Beschriftung, man sieht nicht, was es zurücknimmt.
5. **Aufteilung und Anzeigen:** Bei 1280 px Breite ist der Speicherstand abgeschnitten. Mauskoordinaten werden nirgends
   angezeigt. Beschriftungen überlappen sich. Meldungen und Hinweise stehen weit weg von der Maus, Prüfer-Marken
   erscheinen erst nach einem Klick.

---

## 2. Befunde mit Beleg

Screenshots und Skripte liegen in `scratchpad/ux-arbeit/` (Sitzungs-Scratchpad, nicht im Repo).

### 2.1 Zoom (Robin Punkt 1)

| Messung | Wert |
|---|---|
| Stufen (`konstanten.js: ZOOM_BILDSCHIRME`) | `[0.5, 1, 2.2, 4, 8, 16, 32, 64, 128]` Bildschirme Planbreite |
| Sprung je Stufe | ×2 (zwischen 1 und 2,2: ×2,2) |
| Mausrad (`main.js`, `wheel`) | jede Raste genau eine Stufe, **unabhängig von `deltaY`** |
| Touchpad-Wisch mit `deltaY = 4` | springt ebenfalls eine volle Stufe (2,2 → 4) |
| Start (Beispiel „Kanal“) | „Alles“ → Stufe 4 = **8 Bildschirme** (Brief sagt Normalansicht 2,2) |
| 3 Rasten hinein ab Start | 8 → 4 → 2,2 → **1 Bildschirm**: Screenshot `02-zoom-in.png` zeigt nur Boden und Leere, Orientierung weg |
| „Alles“ bei `proto-netz` | Inhalt 1600 × 1000 E, sichtbar 3840 × 2087 E → **42 % der Breite genutzt**, weil die Stufe 4 Bildschirme in der Höhe um 7 E nicht passt |
| Maßstab bei 8 Bildschirmen | 0,34 px je E: Gang 200 E = 68 px, Gegner (Radius 14 E) ≈ 5 px, Rahmen 164 px breit |
| Strg+Rad / waagerechtes Rad | Strg+Rad zoomt genauso grob. Waagerechtes Rad (Shift-Rad, Touchpad seitlich) verschiebt nichts. |
| Anzeige | nur oben rechts klein „Osten · 8,0 Bildschirme“, nicht anklickbar, keine Eingabe möglich |

Gut ist, dass um den Mauszeiger gezoomt wird (`ansicht.zoomen(px, py)`). Das bleibt.

### 2.2 Karten- und Levelansicht (Robin Punkt 2)

- Es gibt zwei Ansichten: **Welt** (`T`, alle Gebiete als Miniatur, `04-welt.png`) und **Gebiet** (ganzes Netz eines
  Gebiets). Eine dritte Ebene „Level“ fehlt.
- Ein gewählter Gang bekommt nur einen hellblauen Umriss (`01-start.png`). Alle anderen Gänge, Knoten, Notizen und
  Übergangsbeschriftungen bleiben gleich hell daneben stehen.
- Doppelklick auf einen Gang in der Gebietsansicht: **keine Wirkung** (gemessen). In der Welt öffnet Doppelklick ein
  Gebiet, dort gibt es das Muster also schon.
- Uneinheitlich: In der Welt führt `Esc` ohne Auswahl **hinein** ins Gebiet (`main.js`, `zuGebiet()`), sonst hebt
  `Esc` die Auswahl auf. „Eine Ebene höher“ hat keine eigene Taste.
- Eine Brotkrume oder einen Rückweg gibt es nicht. Wo man ist, zeigt nur der Knopf „Welt“ (aktiv oder nicht) und die
  Gebiets-Auswahlliste.
- „Spielen ab hier“ lehnt den Gang „Schleuse“ (Ost, gerade) ab, weil **ein anderer** Gang im Gebiet diagonal ist
  („Noch nicht spielbar: Gang ‚Diagonale‘ …“). Das passt nicht zu „ich will *dieses* Level ansehen“.

### 2.3 Maus-Belegung (Robin Punkt 3)

Heute (`main.js` `pointerdown`, `werkzeuge/*.js`):

| Taste | Werkzeug „Auswahl“ | Bau-Werkzeuge (Gang, Knoten, Formteil, Wand, Hindernis, Gegner, Bereich) |
|---|---|---|
| Links-Klick | wählt | **setzt sofort** (Knoten, Teil, Gegner) |
| Links-Ziehen | Knoten/Teil verschieben, im Leeren Plan verschieben | **baut** (Gang, Teil mit Länge, Bereich) |
| Rechts | Plan verschieben | Plan verschieben |
| Mitte | Plan verschieben | Plan verschieben |
| Rad | Zoom (grob) | Zoom (grob) |
| Shift/Strg + Klick | keine Wirkung (Shift-Klick hebt die Auswahl auf) | – |

Versuch (`s1.cjs`): `K` drücken, zweimal links klicken (wie zum Anschauen) → **K6 und K7 entstehen**. Dann `B`
drücken und einmal klicken → **Formteil f2** entsteht (`07-nach-versehen.png`). Danach steht dort nur
„● ungespeichert“, der Prüfer zeigt 3 MUSS statt 1, und eine Meldung gibt es nicht. Im Werkzeug „Gang“ fängt auch ein
Linksklick auf einen vorhandenen Gang einen neuen Gang an (T-Kreuzung), statt den Gang zu wählen.

Weitere Fallen: `Backspace` löscht genauso wie `Entf` (gemessen: Gang weg). Ein Knoten verschiebt sich schon ab 5 px
Ziehen (`KLICK_TOLERANZ_PX`), und das Raster ist dabei 100 E.

### 2.4 Auswahl und Bearbeiten

- Nur **ein** Objekt lässt sich wählen. Kein Rahmen, kein Shift/Strg-Klick.
- **Unter der Maus wird nichts hervorgehoben**, und der Zeiger ändert sich nur zwischen Hand und Fadenkreuz. Ob ein
  Klick einen Knoten, einen Gang oder eine Raumfläche trifft, erfährt man erst danach.
- **Pfeiltasten verschieben immer den Plan** (60 px), nie das gewählte Objekt. Feinpositionieren geht nur über die
  Zahlenfelder rechts.
- Kopieren, Einfügen und Duplizieren gelten nur für Teile, nicht für Gänge, Knoten oder mehrere Objekte zusammen
  (das bremst auch die geplanten Stempel in Stufe 8).
- Rückgängig: `state.letzteAktion` wird zwar mitgeschrieben, **aber nirgends angezeigt**. Der Knopf heißt immer nur
  „Rückgängig“. Nach dem Rückgängigmachen ist die Auswahl leer (STAND 2b).

### 2.5 Aufteilung, Lesbarkeit, Anzeigen

- Oben stehen **zwei Knopfleisten und eine Hinweiszeile, zusammen 110 px**. Bei 1280 × 720 sind „Öffnen …“ und der
  **Speicherstand abgeschnitten** (`14-1280.png`). Rechts liegen Eigenschaften, Palette (14 Kacheln) und ein Absatz
  mit Tastenkürzeln, der bei 900 px Höhe unten abgeschnitten ist.
- **Statusleiste fehlt:** keine Mauskoordinate in E, kein Raster, keine Anzahl gewählter Objekte. Die Fahrtzeile unten
  zeigt dafür bei jedem Gang denselben langen Satz.
- **Beschriftungen** (12 px, ohne Hintergrund) überlappen sich: „Os[t]hier soll es eng werden“ (Gangname und Notiz,
  `01-start.png`). Im Netz heißen vier Gänge gleich („mitte-h“, `05-gebiet-proto-netz.png`). Gedreht läuft der Inhalt
  aus dem Bild, denn Drehen passt die Ansicht nicht neu ein (`23-gedreht.png`).
- **Meldungen** stehen unten rechts (`#melden`), **Hinweise** oben in der Hinweiszeile, die **Maus ist in der Mitte**.
  Ein abgelehnter Knoten-Zug springt zurück, die Begründung steht oben.
- **Prüfer:** Die Zählung im Knopf ist gut. Liste und Marken erscheinen aber erst nach einem Klick, und neue Probleme
  werden nicht hervorgehoben.
- **Fahrt:** Die Kamera folgt dem Rahmen nicht. Bei 2,2 Bildschirmen fährt der Rahmen aus dem Bild.
- **Start:** Beispielgebiet, Zoom 8 Bildschirme, erster Gang gewählt. Die Bedienung erklärt nur die lange Hinweiszeile.
  Die zuletzt benutzte Ansicht wird nicht gemerkt.
- Konsolenfehler: keine. Spielen ab hier → Esc → zurück funktioniert (`12-spielen-netz.png`, `13-zurueck.png`).

---

## 3. Vorschlagsliste (priorisiert)

Aufwand: **S** ≤ ½ Lauf, **M** ≈ 1 Lauf, **L** ≥ 2 Läufe. Alle Zahlen kommen nach `konstanten.js`, damit Robin sie
ändern kann.

### MUSS

#### M1 Stufenloser, feiner Zoom (Robin Punkt 1)
- **Problem:** Jede Raste verdoppelt, Touchpads springen, „Alles“ lässt Platz frei, der Zoom lässt sich nicht genau
  einstellen.
- **Vorschlag:**
  - Die Kamera speichert `bildschirme` als **Kommazahl** statt einer Stufennummer. Bereich `ZOOM_MIN = 0,25` bis
    `ZOOM_MAX = 160` Bildschirme.
  - **Mausrad:** Faktor = `ZOOM_RAD_FAKTOR ^ (deltaY / 100)` mit 1,15. Eine Raste ändert den Zoom also um 15 %, rund
    fünf Rasten verdoppeln. Touchpads zoomen dadurch von selbst weich, `deltaMode` (Zeilen/Seiten) wird umgerechnet.
    Gezoomt wird weiter um den Mauszeiger.
  - **Tastatur:** `+`/`−` = ×1,25, mit Shift ×2. `1` = 1 Bildschirm (so groß wie im Spiel), `2` = Normalansicht 2,2,
    `Pos1` = Alles einpassen, `Shift+Pos1` = Auswahl einpassen.
  - **Einpassen ohne Stufen:** genau passend mit 5 % Rand.
  - **Anzeige** in der Statusleiste: „2,2 Bildschirme · 100 E = 124 px“. Ein Klick öffnet ein Feld zum Eintippen und
    eine kurze Liste der Festwerte (1 / 2,2 / 4 / 8 / Alles).
  - Optional ein weiches Gleiten von 100 ms, abschaltbar.
  - Shift+Rad und waagerechtes Rad verschieben den Plan seitlich.
- **Vorbild:** Tiled (feine Stufen, Strg+Rad um den Zeiger, Zoom-Feld unten), LDtk (stufenlos, auch Touchpad).
  Lunar Magic hat nur wenige feste Zoomstufen. Hier ist Tiled das bessere Vorbild.
- **Aufwand:** S–M (Kamera und Wheel sind klein. Tests, die `stufe` benutzen, müssen angepasst werden: 10 Stellen in
  `tests/editor-daten.tests.mjs`, 9 in `e2e/editor.mjs`).
- **Dateien:** `konstanten.js` (`ZOOM_BILDSCHIRME` → `ZOOM_MIN/MAX/START`, `ZOOM_RAD_FAKTOR`, `ZOOM_TASTE_FAKTOR`,
  `ZOOM_FESTWERTE`), `ansicht.js` (`masstab`, `zoomen`, `einpassen`), `main.js` (Wheel, Tasten, Anzeige, `kamera()`),
  Tests.

#### M2 Maus-Belegung nach Lunar Magic: Rechtsklick setzt, Linksklick wählt (Robin Punkt 3)
- **Problem:** Linksklick baut, sobald ein Bau-Werkzeug aktiv ist. Versehentliche Knoten und Teile sind der Normalfall.
- **Vorschlag:** Statt „Werkzeug-Modus“ gibt es ein **„aktuelles Element“** wie bei Lunar Magic (dort das Objekt aus
  dem Fenster „Add Objects“). Die Knöpfe Gang, Knoten, Formteil, Wand, Hindernis, Gegner, Bereich und die Palette
  legen nur fest, **was Rechtsklick setzt**. Ein eigenes Werkzeug „Auswahl“ ist nicht mehr nötig.

  | Eingabe | Wirkung |
  |---|---|
  | **Links-Klick** | wählen (auf Objekt), Auswahl aufheben (ins Leere) |
  | **Links-Ziehen** auf Objekt | verschieben (eingerastet) |
  | **Links-Ziehen** im Leeren | Auswahlrahmen (siehe M4) |
  | **Shift+Links** / **Strg+Links** | zur Auswahl hinzufügen / umschalten |
  | **Rechts-Klick** | aktuelles Element an der Maus setzen (Knoten, Teil in Standardgröße, Gegner) |
  | **Rechts-Ziehen** | aktuelles Element aufziehen: Gang (8 Richtungen), Teil mit Länge und Winkel, Bereich |
  | **Mitte-Ziehen** | Plan verschieben |
  | **Rad** / **Shift+Rad** | zoomen (M1) / seitlich verschieben |
  | **Alt** beim Ziehen/Setzen | Einrasten aus bzw. feiner (siehe M4) |
  | **Esc** während eines Zugs | abbrechen, nichts ändert sich |

  Das Browser-Kontextmenü bleibt aus (ist schon so). Die Vorschau unter der Maus, also der grüne Geist des aktuellen
  Elements, wird **für alle Elemente** gezeigt, damit klar ist, was ein Rechtsklick setzen würde. Bei Gang und Bereich
  fehlt sie vor dem Zug heute. Die Hinweiszeile sagt kurz „Rechtsklick setzt: Formteil 260 × 120“.
- **Vorbild:** Lunar Magic (Rechtsklick fügt das gewählte Objekt ein, Linksklick wählt und zieht). Tiled und LDtk für
  Shift/Strg-Mehrfachauswahl und mittlere Taste zum Verschieben.
- **Aufwand:** M (Eingabe in `main.js` umbauen. Jedes Werkzeug bekommt `setzen`/`aufziehen` statt `down`/`klick`, die
  Auswahl-Logik aus `auswahl.js` gilt immer. Die E2E-Tests klicken links, sie müssen auf `button: 'right'` umgestellt
  werden).
- **Dateien:** `main.js` (Pointer-Handler, `setzeWerkzeug`, Hinweise), `werkzeuge/index.js` (Werkzeug-Form im
  Kopfkommentar), alle `werkzeuge/*.js`, `konstanten.js` (`MAUS = { waehlen: 0, setzen: 2, verschieben: 1 }`, damit
  die Belegung an einer Stelle umstellbar bleibt), `docs/EDITOR.md`, `e2e/editor.mjs`.

#### M3 Kartenansicht und Levelansicht (Robin Punkt 2)
- **Problem:** Ein Level lässt sich nicht für sich anschauen, der Rest stört immer mit.
- **Vorschlag:** Drei Ebenen mit gleicher Bedienung: **Welt → Karte (ein Gebiet: Level und Knoten) → Level (ein
  Gang)**.
  - **Hinein:** Doppelklick auf einen Gang oder `Enter` bei gewähltem Gang öffnet die **Levelansicht**. In der Welt
    öffnet Doppelklick wie heute die Karte.
  - **Hinaus:** `Esc`, wenn nichts gewählt ist und kein Zug läuft (Esc mit Auswahl hebt wie heute erst die Auswahl auf),
    außerdem `Alt+↑` und der Knopf „↑ Karte“. Damit gilt `Esc` überall als „eine Ebene höher“. Der heutige Sonderfall
    in der Welt (Esc führt hinein) fällt weg. `T` bleibt der Sprung zur Welt.
  - **Brotkrume** links oben, jeder Teil anklickbar: `Welt › Kanal › Level „Schleuse“ (K1 → K2)`.
  - **Was die Levelansicht zeigt:** den Gang, seine beiden Endknoten mit Fläche (bis zur Drehzone) und alle Formteile,
    Wände, Hindernisse, Gegner und Notizen, die die Gangfläche berühren. Diese Zuordnung wird aus der Geometrie
    berechnet, das **Datenformat bleibt unverändert**. Alles andere wird **auf 15 % abgedunkelt** (`H` schaltet auf
    „ganz ausblenden“) und ist **nicht anklickbar**. Das schützt zugleich vor Änderungen am Rest.
  - **Kamera:** eingepasst auf den Gang, optional gleich „wie im Spiel“ gedreht (Frage 2). Fahrt-Schieber und Rahmen
    sind dort die Hauptanzeige, die Kamera folgt dem Rahmen (S7).
  - Mit `Bild↑` und `Bild↓` geht man zum nächsten oder vorigen Gang derselben Karte, ohne hinauszugehen.
  - Jede Ebene merkt sich ihre Kamera (das gibt es heute schon für Welt und Gebiet in `state.kameras`).
  - „Spielen ab hier“ in der Levelansicht spielt **nur dieses Level**, wenn es selbst spielbar ist. Dafür baut
    `baueKarte()` die Karte nur aus den gezeigten Dingen. Das ist eine Änderung an der Editor-Funktion `spielen.js`,
    nicht am Prototyp.
- **Vorbild:** Lunar Magic (Overworld-Editor zeigt die Karte mit Level-Kacheln, das Level öffnet man getrennt im
  Level-Editor), LDtk (Weltansicht `W`, Doppelklick öffnet ein Level, Nachbarn bleiben blass sichtbar).
- **Aufwand:** M–L (Ansichtsart `level` neben `gebiet` und `welt`, Filter im Zeichnen und in `treffer()`, Brotkrume,
  Tasten; Spielen nur dieses Levels gesondert, eher M).
- **Dateien:** `main.js` (`state.ansichtArt`, `zuWelt`/`zuGebiet` → allgemeines `geheZu(ebene)`, Tasten, Brotkrume),
  `zeichnen.js` (Abdunkeln/Ausblenden, Filter), `daten.js` (neu: `levelInhalt(gebiet, gangId)`), `spielen.js`
  (`baueKarte` mit Filter, `spielbarkeit` je Level), `konstanten.js` (`LEVEL_ABDUNKELN = 0.15`, Tasten).

#### M4 Auswahl: Hervorhebung, Mehrfachauswahl, Rahmen, Pfeiltasten
- **Problem:** Man sieht nicht, was ein Klick trifft. Man kann nicht mehrere Dinge bewegen und nicht fein verschieben.
- **Vorschlag:**
  - **Hover:** Das Objekt unter der Maus bekommt einen dünnen hellen Umriss, und die Statusleiste nennt es
    („Knoten K2 · Kreuzung – Ziehen verschiebt“). Über verschiebbaren Objekten wird der Zeiger zum Verschiebe-Kreuz.
  - **Auswahlrahmen:** Links-Ziehen im Leeren wählt alles, was **ganz** im Rahmen liegt. Mit Alt zählt schon
    Berühren.
  - **Mehrfachauswahl:** Shift addiert, Strg schaltet um, `Strg+A` wählt alles in der aktuellen Ansicht (Karte bzw.
    Level).
  - Ziehen verschiebt die ganze Auswahl. Knoten rasten auf 100 E, Teile auf 20 E, wie heute. Gänge folgen ihren Knoten.
  - **Pfeiltasten** verschieben die Auswahl um ein Raster (20 E, Knoten 100 E), mit Shift um 5 Raster, mit Alt um
    5 E (Feinlage, sofern das Format das zulässt). Ohne Auswahl verschieben sie wie heute den Plan.
  - Das rechte Feld zeigt bei Mehrfachauswahl „3 Objekte“ und die Felder, die alle gemeinsam haben (z. B. Breite).
  - Kopieren, Einfügen und Duplizieren gelten für die ganze Auswahl, also auch für Gänge samt ihrer Knoten. Das ist
    die Grundlage für die Stempel in Stufe 8.
- **Vorbild:** Lunar Magic (Rahmen ziehen, Pfeiltasten verschieben um eine Kachel), Tiled (Shift/Strg-Auswahl).
- **Aufwand:** M–L (Auswahl wird zur Liste: `state.auswahl` → `state.auswahl[]`. Das berührt Eigenschaften, Löschen,
  Kopieren und Fahrt. Die Fahrt gilt weiter nur bei genau einem gewählten Gang).
- **Dateien:** `main.js`, `werkzeuge/auswahl.js` (wird zum festen Teil der Eingabe), `teile.js`, `befehle.js`
  (Verschieben mehrerer), `zeichnen.js` (Hover, Rahmen), `konstanten.js` (`FARBEN.hover`, Schritte der Pfeiltasten).

#### M5 Schutz vor versehentlichen Änderungen, sichtbares Rückgängig
- **Problem:** Änderungen passieren still. Backspace löscht. Rückgängig sagt nicht, was es zurücknimmt.
- **Vorschlag:**
  - Der Rückgängig-Knopf zeigt die letzte Aktion: „↶ Formteil setzen“ (`state.letzteAktion` gibt es schon). Im
    Tooltip stehen die letzten fünf Schritte.
  - Nach jeder Änderung erscheint 3 s lang eine **kurze Einblendung an der Maus**: „Formteil f2 gesetzt · Strg+Z“.
  - **Nur `Entf` löscht**, `Backspace` nicht mehr (Lunar Magic: Entf). Wer einen Knoten mit Gängen löscht, bekommt eine
    Nachfrage, wenn dabei mehr als ein Gang mitgeht.
  - Ziehen schwellt erst ab **8 px** an (heute 5 px) und erst nach 120 ms gedrückter Taste. Dann löst Zittern beim
    Klicken kein Verschieben aus.
  - Optional **Ebenen sperren** (Schloss-Knopf je Art: Gänge/Knoten, Formteile, Wände/Hindernisse, Gegner, Notizen).
    Gesperrte Arten lassen sich nicht wählen und nicht verschieben (wie in Tiled).
  - Nach Rückgängig und Wiederholen bleibt die Auswahl erhalten bzw. kommt zurück (offener Punkt aus STAND 2b).
- **Vorbild:** Tiled (Ebenen sperren, Verlauf), Photoshop/Tiled-Verlaufsliste, Lunar Magic (Entf).
- **Aufwand:** S (Beschriftung, Backspace, Schwelle, Einblendung), M mit Ebenen sperren.
- **Dateien:** `main.js` (`aendere`, `refresh`, Tasten), `daten.js` (`Verlauf` merkt das Label), `konstanten.js`
  (`KUERZEL.loeschen = ['Delete']`, `ZUG_SCHWELLE_PX = 8`, `ZUG_VERZOEGERUNG_MS`).

### SOLLTE

#### S1 Aufteilung: Werkzeugleiste links, Statusleiste unten, Eigenschaften und Palette als Reiter
- **Problem:** Oben belegen die Leisten 110 px, und bei 1280 px fehlen Knöpfe und der Speicherstand. Rechts ist es voll
  (Tastenkürzel abgeschnitten).
- **Vorschlag:**
  - **Oben eine Leiste:** Brotkrume, Ansicht (Drehen, Norden, Wie im Spiel, Look, Beschriftung), rechts Speichern und
    Öffnen.
  - **Links eine senkrechte Leiste** mit den Elementen (Gang, Knoten mit Typ-Auswahl, Formteil, Wand, Hindernis, Gegner,
    Bereich) als Symbole mit Taste.
  - **Rechts zwei Reiter**, „Eigenschaften“ und „Palette“, oder die Palette oben einklappbar.
  - **Unten** Fahrt und darunter eine **Statusleiste** (S2).
  - Die Kürzelliste wandert in eine Übersicht hinter `?` (S6).
  - Ziel: Bei 1280 × 720 ist alles ohne Scrollen sichtbar.
- **Vorbild:** Tiled und LDtk (Werkzeuge links, Eigenschaften rechts, Status unten), Lunar Magic (Objektfenster
  getrennt).
- **Aufwand:** M. **Dateien:** `main.js` (CSS und Aufbau der Oberfläche; es wäre sinnvoll, eine eigene `oberflaeche.js`
  abzutrennen, `main.js` hat 1356 Zeilen), `docs/EDITOR.md`.

#### S2 Statusleiste mit Koordinaten und Speicherstand
- **Vorschlag:** Die Statusleiste zeigt immer, links nach rechts:
  - Mausstelle in E (`x 1440 | y −320`), im Level zusätzlich die Stelle im Gang (`@560 E = 1,2 Bildschirme`),
  - Raster (20 / 100 E, Alt = aus),
  - aktuelles Element,
  - Anzahl gewählter Objekte,
  - Zoom (M1),
  - **Speicherstand je Gebiet** („Kanal ● ungespeichert · welt.json ✓“).
  Die Gebiets-Auswahlliste markiert ungespeicherte Gebiete mit `*`.
- **Vorbild:** Tiled und LDtk (Koordinate und Zoom unten).
- **Aufwand:** S. **Dateien:** `main.js` (`refresh`, `pointermove`).

#### S3 Lesbare Beschriftungen
- **Problem:** Texte überlappen, gleiche Namen sind nicht zu unterscheiden, 12 px Schrift ohne Hintergrund.
- **Vorschlag:**
  - Texte bekommen ein dunkles Schild mit 70 % Deckkraft.
  - **Kollisionen vermeiden:** Bei Überlappung gewinnt die Reihenfolge Auswahl > Knoten-ID > Gangname > Notiz >
    Platzhalter-Text, die unterlegenen Texte werden ausgeblendet.
  - Der Gangname läuft entlang des Gangs, gedreht wie der Gang, aber nie kopfüber.
  - Doppelte Gangnamen zeigen die ID dazu („mitte-h · gang7“). Der Prüfer meldet doppelte Namen als SOLL.
  - `L` schaltet in drei Stufen: alles / nur Namen / aus.
  - Schriftgröße steht in `konstanten.js` (`SCHRIFT_PX`).
- **Vorbild:** LDtk (Level-Namen mit Schild), Kartenwerkzeuge (Beschriftungen nach Rang).
- **Aufwand:** M. **Dateien:** `zeichnen.js`, `zeichnen-welt.js`, `regeln.js` (SOLL-Regel), `konstanten.js`.

#### S4 Meldungen und Prüfer näher an die Arbeit
- **Vorschlag:**
  - Abgelehnte Aktionen („Dorthin geht der Knoten nicht …“) erscheinen **an der Maus** als Einblendung (rot, 4 s) und
    zusätzlich in der Statusleiste.
  - Info-Meldungen verschwinden nach 5 s, Fehler bleiben, bis man sie wegklickt.
  - **Prüfer-Marken sind immer an**, nur dezent als kleine rote oder gelbe Punkte. Die Liste bleibt per Klick.
  - Kommt durch eine Änderung ein **neuer** MUSS-Fehler dazu, blinkt der Prüfer-Knopf einmal und die Einblendung nennt
    ihn („neu: M4 Objekt außerhalb des Bodens“).
  - `F8` springt zur nächsten Meldung (wie „nächster Fehler“ in IDEs).
  - Die Prüfer-Liste ist verschiebbar und schließt mit `Esc`.
- **Vorbild:** IDE-Fehlerleiste, Lunar Magic (Warnungen beim Speichern).
- **Aufwand:** S–M. **Dateien:** `main.js` (`melde`, `prueferZeigen`), `zeichnen.js` (Marken), `konstanten.js`.
- **Hinweis:** Laut STAND (Stufe 4) erscheinen die Marken nur bei offener Liste, damit die Pixeltests unberührt
  bleiben. Die Tests müssten die Marken dann gezielt ausschalten (`window.__editor`).

#### S5 Bildschirmrahmen und Fahrt
- **Vorschlag:**
  - **Kamera folgt dem Rahmen** während der Fahrt und beim Ziehen des Schiebers, umschaltbar mit `Shift+Leertaste`. In
    der Levelansicht ist das die Grundeinstellung.
  - Der Rahmen lässt sich **direkt mit der Maus** am Gang entlangziehen.
  - Tempo-Knopf ×1 / ×2 / ×4 (die Anzeige rechnet weiter mit 70 E/s).
  - Der Schieber zeigt Marken für Knoten, Drehzonen (160 E vor Kreuzungen) und Prüfer-Stellen.
  - Zoom-Festwert `1` = Rahmen füllt den Plan („so sieht es der Spieler“).
- **Vorbild:** Lunar Magic (Bildschirmgrenzen im Level sichtbar), Mario Maker (Probefahrt aus dem Editor).
- **Aufwand:** S–M. **Dateien:** `main.js` (`tick`, `setzeFahrt`, `refreshFahrt`), `zeichnen.js` (Rahmen-Griff,
  Schieber-Marken).

#### S6 Einheitliche Tastenkürzel und eine Übersicht
- **Problem:**
  - `Esc` hat in der Welt eine andere Richtung als sonst.
  - `A` (Bereich) und `X` (Gegner) liegen auf Tasten, bei denen man an `Strg+A` (alles wählen) und `Strg+X`
    (ausschneiden) denkt.
  - `P` startet das Spielen, im Spiel ist `P` aber Pause.
  - Es gibt keine Übersicht der Kürzel.
- **Vorschlag:**
  - Ebenen: `Enter` = hinein, `Esc` = hinaus (M3).
  - `Strg+A` alles wählen, `Strg+X` ausschneiden.
  - Bereich auf `U` legen (frei).
  - `F5` = Spielen ab hier, zusätzlich zu `P` (üblich in Editoren).
  - `?` bzw. `F1` blendet eine Kürzel-Übersicht ein, erzeugt aus `KUERZEL`, damit sie nie veraltet.
  - Werkzeugknöpfe zeigen ihre Taste als Hochzeichen.
  - Alle Kürzel bleiben in `konstanten.js`.
- **Vorbild:** Tiled und LDtk (Kürzelübersicht), allgemeine Editor-Gewohnheiten.
- **Aufwand:** S. **Dateien:** `konstanten.js`, `main.js` (Tasten, Übersicht).

#### S7 Drehen behält den Blick auf die Auswahl
- **Vorschlag:** `Q`/`E` drehen um die **Auswahl** oder die Mausstelle statt um die Planmitte. Danach wird bei Bedarf
  neu eingepasst, damit nichts aus dem Bild läuft (heute passiert das, `23-gedreht.png`). Eine kleine
  **Nordnadel** in der Ecke zeigt die Drehung, Klick darauf = Norden.
- **Aufwand:** S. **Dateien:** `ansicht.js` (`drehen(schritte, px, py)`), `zeichnen.js`, `zeichnen-welt.js`.

### KANN

#### K1 Start-Erlebnis
- Der Editor startet mit **zuletzt offenem Gebiet, Ansicht und Kamera** (Browser-Speicher, nur Bequemlichkeit, mit
  Rückfall).
- Beim ersten Start erscheint einmal eine kleine Karte „Linksklick wählt · Rechtsklick setzt · Mitte verschiebt · Rad
  zoomt · ? Hilfe“.
- Die lange Hinweiszeile oben fällt weg, ihr Inhalt steht in Statusleiste und Tooltip.
- **Aufwand:** S. **Dateien:** `main.js`.

#### K2 Verlaufsliste
- Ein Feld zeigt die letzten 200 Schritte mit Namen. Ein Klick springt zu einem früheren Stand (wie das Verlaufsfenster
  in Photoshop/Tiled).
- **Aufwand:** M. **Dateien:** `daten.js` (`Verlauf`), `main.js`.

#### K3 Rechtsklick-Varianten
- `Shift+Rechtsklick` = Pipette: übernimmt das Objekt unter der Maus als aktuelles Element, samt Maßen und Gegnerart
  (wie das Kopieren eines Objekts in Lunar Magic).
- `Strg+Rechts-Ziehen` setzt eine Reihe gleicher Teile im Abstand ihrer Länge.
- **Aufwand:** S–M. **Dateien:** `main.js`, `teile.js`.

#### K4 Notfall-Sicherung
- Alle 60 s wird der ungespeicherte Stand jedes Gebiets im Browser-Speicher abgelegt. Beim nächsten Start kommt die
  Frage „Ungespeicherte Änderungen von 14:32 wiederherstellen?“.
- Nie automatisch auf die Platte schreiben: Robin committet selbst.
- **Aufwand:** S. **Dateien:** `main.js`, `speicher.js`.

#### K5 Raum-Ziehgriffe
- Räume und Teile bekommen Griffe an Ecken und Kanten zum Ändern der Größe. Bisher geht das nur über Zahlenfelder
  (offen aus STAND 2a).
- **Aufwand:** M. **Dateien:** `werkzeuge/auswahl.js`, `zeichnen.js`, `befehle.js`.

---

## 4. Vorschlag für die Reihenfolge (Bau-Schritte)

Am besten als eingeschobene **Stufe 7b „Bedienung“** vor Stufe 8 (Notizen und Stempel). Stempel brauchen die
Mehrfachauswahl, Notizen brauchen die neue Maus-Belegung.

| Schritt | Inhalt | Warum hier |
|---|---|---|
| **B1** | M1 Zoom, S2 Statusleiste, S6 Kürzel-Aufräumen (ohne Ebenen-Tasten) | Robins dringendster Punkt, klein, berührt kaum anderes |
| **B2** | M2 Maus-Belegung, M5 Schutz (Rückgängig-Anzeige, Backspace, Schwelle, Einblendung) | gehört zusammen: neue Belegung plus sofort sichtbares Ergebnis. E2E-Tests auf Rechtsklick umstellen |
| **B3** | M3 Karten- und Levelansicht mit Brotkrume, Esc/Enter-Ebenen, S5 Kamera folgt Rahmen | baut auf B2 auf (Doppelklick und Esc sind dann frei) |
| **B4** | M4 Auswahl (Hover, Rahmen, Mehrfach, Pfeiltasten, Kopieren mehrerer) | größter Umbau am Zustand, danach ist Stufe 8 (Stempel) leicht |
| **B5** | S1 Aufteilung, S3 Beschriftungen, S4 Meldungen und Prüfer, S7 Drehen | Feinschliff, wenn die Bedienung steht |
| **B6** | K1–K5 nach Lust | nur auf Wunsch |

Nach jedem Schritt: die bestehende Prüfkette (`npm test && npm run e2e && npm run e2e:editor`). Dazu kommt ein neuer
E2E-Fall je Vorschlag aus Nutzersicht, zum Beispiel: „Linksklick mit aktivem Element Formteil ändert keine Daten“,
„Rad mit deltaY = 100 ändert den Maßstab um 15 %“, „Doppelklick auf Gang → nur dieser Gang hell“. Danach probiert Robin
einmal aus.

---

## 5. Was ich bewusst NICHT vorschlage

- **Kachel-Malen wie in Tiled/Lunar Magic** (Pinsel, Füllen): Das Datenformat besteht aus Objekten mit Maßen. Das ist
  entschieden (LEVELDESIGN, Weg B).
- **Freie Formen, Bézier-Gänge:** Robin hat sie geparkt. Formteile aus geraden Teilen genügen.
- **Mehrere Ansichtsfenster wie Trenchbroom** (oben, seitlich, 3D): Das Spiel ist ein Grundriss von oben, ein Plan
  reicht. Neben der Levelansicht bringt ein zweites Fenster mehr Pflege als Nutzen.
- **Mario-Maker-Bedienung** (Linksklick malt, große Kacheln, Touch): Das ist genau das Muster, das Robin stört.
- **Eine Oberfläche zum freien Belegen der Tasten:** `konstanten.js` erfüllt Robins Wunsch „ohne große Mühe änderbar“
  schon, ein Einstellungsdialog wäre zusätzlicher Code ohne Mehrwert.
- **Automatisch auf die Platte speichern:** Robin committet selbst. Stilles Überschreiben der Leveldateien wäre ein
  Risiko. Nur die Notfall-Sicherung im Browser (K4).
- **Editor am Steam Deck oder per Touch:** Robin arbeitet am PC, so ist es entschieden.
- **Änderungen am Spiel oder am Fenster-Prototyp:** „Nur dieses Level spielen“ (M3) ändert nur die Editor-Seite
  (`spielen.js`), nicht das Spielverhalten.
- **Optischer Neuanstrich** (neues Farbschema, Animationen): Das löst keines der genannten Probleme.

---

## 6. Offene Fragen an Robin

1. **Plan verschieben:** Reicht die **mittlere Maustaste**? Oder willst du zusätzlich **Leertaste halten + Ziehen**
   (wie Tiled/Photoshop)? Dann bräuchte die Fahrt eine andere Taste, z. B. `Enter` in der Levelansicht.
2. **Levelansicht drehen:** Soll sie sich beim Öffnen **automatisch „wie im Spiel“ drehen** (Flugrichtung nach
   rechts)? Oder bleibt Norden oben, und `F` dreht bei Bedarf?
3. **Rest in der Levelansicht:** Lieber **abgedunkelt** (Vorschlag: 15 %, Nachbarn bleiben erkennbar) oder **ganz
   ausgeblendet**? Beides wird umschaltbar, gefragt ist nur die Grundeinstellung.
4. **Rechtsklick auf ein vorhandenes Objekt:** Soll er auch dort das aktuelle Element setzen (genau wie Lunar Magic)?
   Oder soll er dort ein kleines Menü öffnen (Löschen, Drehen, Kopieren)?
5. **Feinlage:** Sollen Teile mit Alt+Pfeil auch **feiner als das 20-E-Raster** liegen dürfen (z. B. 5 E)? Oder bleibt
   20 E die kleinste Lage, damit die Prüfregeln einfach bleiben?
