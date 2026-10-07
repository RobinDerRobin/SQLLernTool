# Wendehals – Prototypen, Arbeitspakete, Entscheidungen

> **Verbindlich seit 05.10.2026.** Dieses Dokument ist der aktuelle Arbeitsauftrag. `PLAN-v0.3.md` ist
> nach Phase 1 **pausiert**; `WELT-DESIGN.md` und `welt.json` sind Referenz, nicht mehr bindend, wo sie
> diesem Dokument widersprechen. Recherche und Agenten-Berichte: [`forschung/`](forschung/README.md).

## 1. Arbeitsweise

Ein Konzept nach dem anderen, in kleinen Wegwerf-Prototypen. Kein Leveldesign, solange Logik und
Konzept nicht stehen (Level werden mehrfach neu gebaut).

1. **Fragekarte** (3 Zeilen): die eine Frage, woran Robin die Antwort erkennt, was bewusst fehlt.
2. **Design-Runde** (bei neuen Konzepten): Game-Designer wägt ab, Kritiker prüft, bei Bedarf
   Prototyping-Experte schneidet zu. Berichte nach `forschung/`. Dann Gespräch mit Robin.
3. **Bau in einer eigenen Code-Session**, Zeitbox eine Sitzung, nach einem Bau-Brief in
   [`prototypen/`](prototypen/).
4. **Spielen:** Robin spielt ~5 Minuten auf dem Steam Deck und antwortet in 3 Zeilen.
5. **Entscheidung** (keep / kill / iterate / park) mit Datum und Robins Wortlaut ins
   Entscheidungsprotokoll (Abschnitt 5).
6. **Übernahme** („Graduierung“) erst nach „keep“: die Mechanik wird in den echten Modulen neu
   geschrieben (Regeln einmal, Spiel gegen Löser getestet, Werte als Konstanten), der Prototyp wird
   gelöscht. Prototyp-Code wird nie direkt übernommen.

### Regeln für Prototypen

- Code nur in `src/proto/` (plus wenige Zeilen Anbindung, siehe Brief). `Level`, `Arena`,
  `worldgraph*`, Löser und Spielstand bleiben unberührt.
- `npm test` bleibt grün, **der Golden Master der v0.2-Welt bleibt unverändert** (beweist: das Spiel ist
  unberührt), `npm run e2e` grün.
- Erreichbar auf dem Deck über **Optionen → Prototyp: …** (nur vom Titel aus), im Browser über
  `?proto=<name>`. v0.2 bleibt das Standardspiel.

### Modellwahl (feste Regel)

Jeder Plan und jeder Schritt sagt, welches Claude-Modell Robin wählen soll. Fable ist keine Option.

| Modell | Wofür |
|---|---|
| **Opus 5.5** | Design und Konzept: Designer/Kritiker/Prototyping-Runden, Pakete validieren, Planung, Regel- und Löser-Logik, knifflige Fehler, große Engine-Umbauten |
| **Sonnet 5.5** | Bauen: Wegwerf-Prototypen, Tests, E2E-Skripte, Tester-Agenten, CI-Reparaturen |
| **Haiku 4.5** | Kleinkram: Dateien ablegen, kleine Text- oder Konfig-Änderungen |

## 2. Robins Entscheidungen vom 05.10.2026 (verbindlich)

**Richtungen – das Fenster-Konzept** (Skizze: [`forschung/2026-10-05-richtungen-skizze-robin.png`](forschung/2026-10-05-richtungen-skizze-robin.png)):
- Die Welt ist ein **Grundriss von oben**; Norden ist eine Himmelsrichtung auf dem Plan.
- **Der Bildschirm ist ein Fenster** (Streifen mit linkem Ende L und rechtem Ende R), das schräg auf dem
  Plan liegt (45°-Raster). Das Bild kippt nie; der Plan erscheint gedreht. Gespielt wird waagerecht,
  man fliegt nach links oder rechts.
- **Drehung nach links oder rechts** dreht das Fenster auf dem Plan (im Uhrzeigersinn 90° → L oben,
  R unten; gegen den Uhrzeigersinn → R oben, L unten). Welches Ende eines Gangs L oder R ist, hängt davon
  ab, wie man gedreht hat.
- Modell: θ = Kartenrichtung des R-Endes, s ∈ {R, L} = Flugseite; Blickrichtung h = θ (s = R) bzw.
  θ + 180° (s = L). Drehen = θ ± 90° (später ± 45°), s bleibt. θ ist nur Darstellung: der Löser bleibt bei
  (Punkt, Blickrichtung, Items); nach Respawn/Laden ist θ = h.
- **180° ist nur ein Wechsel der Scrollrichtung**; das Fenster dreht sich nicht, der Dackel dreht sich
  sichtbar um.
- **Die Bilddrehung pausiert das Spiel. Wer durch die Drehung „rechts“ hält, bewegt sich danach nach
  rechts** (Eingabe bleibt bildschirmbezogen).
- **Gabelungen:** Man nimmt eine Gabelung, indem man in diese Richtung fliegt. Scrollt das Bild nicht mit,
  geht es nicht (nicht durchschießbar o. Ä., je nach Situation). Im Prototyp: Türen öffnen nur bei
  passender Scrollrichtung.
- Kopfüber ist in Ordnung (vielleicht später ein Spielelement). Keine gespiegelten Räume.
  Diagonal-Etappen fühlen sich nicht anders an. Kein vertikales Fliegen, kein Zoom-out.
- Spielergesteuerte Schächte und sanftes Steigen: später mögliche Level-Konzepte.
- **Minimap:** eigenes Konzept, später besprechen.

**Setting:** Das Haus als Schauplatz ist für das echte Spiel **gestrichen – Setting offen**. Prototypen
dürfen es als Platzhalter nutzen.

## 3. Entscheidungsregister (offene und erledigte Fragen)

| # | Frage | Stand |
|---|---|---|
| E1 | Diagonal-Etappen: Bild 45° drehen oder Treppen-Terrain? | **erledigt/obsolet** – Fenster-Konzept |
| E2 | Drehzahl: Kosten pro 45° oder feste Ladungen? | offen (Paket „Drehen begrenzen“) |
| E3 | Steuerung zum Drehen | **neu zu fragen**: P1 nutzt LB/RB statt „B halten + Stick“ |
| E4 | Kreisel ohne Fähigkeit schubst 180° zurück? | offen; 180° ist jetzt nur Scroll-Umkehr |
| E5 | Wendehals früh oder bei ~40 %? | ersetzt durch E8 |
| E6 | Umfang (8 Gebiete, 4 h) | **ruht** bis das Setting steht |
| E7 | Neue Gebiete und Bosse des Hauses | **ruht/entfällt** – Setting offen |
| E8 | Ist die 180°-Umkehr frei oder an eine Fähigkeit (Wendehals) gebunden? | **offen** (im P1 frei) |
| E9 | P1-Türen: „passende Scrollrichtung“ = Kartenrichtung des Gangs oder Bildschirmseite? | offen; Standard im P1: **Kartenrichtung** (Tür offen, wenn das Fenster entlang dieses Arms scrollt, egal in welche Richtung) |
| E10 | Gelten die Umfangsziele (4 h, ~70 Arenen) noch? | offen, zusammen mit dem Setting |

## 4. Prototyp-Leiter Paket 1 „Fenster“

**P1-Builds starten direkt im Prototyp; vor dem Übernehmen eines späteren Prototyps oder zurück zu v0.2 wird das wieder umgestellt.** (`?spiel` in der URL bzw. `WENDEHALS_SPIEL=1` für Electron öffnet das alte Spiel direkt; Start/Esc im Prototyp → v0.2-Titelmenü, dort „Optionen → Prototyp: Fenster“ zurück.)

| ID | Frage | Stand |
|---|---|---|
| **P1 „Kreuzung“** | Nehme ich die Gabelung, die ich will, indem ich das Fenster drehe – beim ersten Mal, ohne nachzudenken, auch nach der 180°-Umkehr und mit dem Plan kopfüber? | **keep (07.10.2026)** – [Brief](prototypen/P1-kreuzung.md), [Retrospektive](prototypen/P1-retro.md) |
| P1b | Nur falls P1 „nein“: dog-bezogen vs. bildschirmbezogen drehen, umschaltbar | wartet auf P1 |
| P2 „Orientierung“ | Behalte ich in einer Schleife mit Landmarken die Orientierung, ohne Karte? (→ Minimap nötig?) | wartet auf P1 |
| P3 „45°“ | Passen 45°-Drehungen zur selben Aktion? (Diagonal-Arm, achteckige Kreuzung, LT/RT) | wartet auf P1 |
| P4 „Druck“ | Funktioniert die pausierte Drehung und das Schießen von oben im Kampf, in beide Richtungen? | wartet auf P1 |

Geparkt (nicht vergessen): Minimap (nach P2), Gabelungen mit Drehfähigkeiten (nach P3), sanftes
Steigen, Schächte, kopfüber als Spielelement, Form der Arenen im gedrehten Fenster.

## 4a. Abnahme-Checkliste „Fenster drehen“ (aus P1, Robin 07.10.2026)

Gilt für die Übernahme ins Spiel (Paket 8) und jeden weiteren Fenster-Prototyp.

- [ ] **Flüssige Kamera:** keine Sprünge, keine harten Knicke – auch beim Quer-Folgen und beim Einfahren nach einer
      Drehung.
- [ ] **Die Spielerposition ändert sich nie von selbst:** nicht durch Drehen, Kamera-Folgen, Wände oder den Bildrand.
      Ohne Eingabe bewegt sich die Figur nur in Scrollrichtung.
- [ ] **Drehen nahe einem Ort mit Platz dafür** (Kreuzung), mit Toleranz davor und dahinter; im Gang nicht.
- [ ] **Auf festem Boden nie festsitzen:** nach jeder erlaubten Drehung kommt man weiter oder mit dem Stick heraus.
      (Im echten Spiel töten die meisten Flächen; die Regel gilt für festen Boden.)
- [ ] **Gleiches Bild nach Hin- und Zurückdrehen:** Kamera bleibt im Levelbereich, zeigt nicht mehr Leere als nötig.
- [ ] **Vorhersehbares Drehen:** Bild dreht um die Figur, feste Dauer (0,5 s), Spiel pausiert; die Welt „landet“ nie
      auf der Figur.
- [ ] **Eingabe bleibt bildschirmbezogen:** nach der Drehung ist „rechts“ rechts; Drücke im Schwenk werden ignoriert.
- [ ] **Sichtbare Rückmeldung, dass Drehen gerade geht** (nicht unbedingt ein Knopf; im P1 ein leuchtendes Symbol),
      und dass ein Druck abgelehnt wurde. Nichts im HUD dreht mit.

**Für das ganze Spiel (nicht nur das Fenster):**
- 180°-Umkehr geht überall, ohne Pause, Figur dreht sichtbar um.
- Gleiches Verhalten überall – keine Sonderfälle, die der Spieler bemerkt.
- **Alles muss auf dem Steam Deck funktionieren:** Controller und Tastatur, 60 fps, Symbole selbst gezeichnet (keine
  Abhängigkeit von Schriftarten).

## 5. Entscheidungsprotokoll

| ID | Datum | Prototyp/Thema | Robins Antwort (Wortlaut) | Urteil | Nächster Schritt |
|---|---|---|---|---|---|
| F0 | 05.10.2026 | Richtungen: Fenster-Konzept | siehe Abschnitt 2 | keep (Konzept) | P1 bauen |
| F1 | 07.10.2026 | P1 „Kreuzung“ | „I am happy with the feature for now.“ (Änderungen nach Spieltests: Brief Abschnitt 9) | keep (Feature) | Checkliste 4a; [Retrospektive](prototypen/P1-retro.md); nächster Prototyp offen (P2 laut Leiter) |

## 6. Arbeitspakete – **Entwurf, in Validierung**

Noch nicht freigegeben. Designer und Prototyping-Experte haben unterschiedlich zugeschnitten
([`forschung/2026-10-05-pakete-1-designer.md`](forschung/2026-10-05-pakete-1-designer.md),
[`…-pakete-2-prototyping.md`](forschung/2026-10-05-pakete-2-prototyping.md)); der Kritiker hat beide
zusammengeführt ([`…-pakete-3-kritik-abgleich.md`](forschung/2026-10-05-pakete-3-kritik-abgleich.md)).
Diese zusammengeführte Liste ist der aktuelle Entwurf und wird mit Robin besprochen:

| # | Paket | Art | Kernfrage | Erster Prototyp / Ergebnis | Hängt ab von |
|---|---|---|---|---|---|
| 1 | Fenster | Prototyp | Lässt sich das drehende Fenster (90°, 45°, Umkehr) lesen und steuern, auch unter Beschuss? | P1 → P3 → P4 | – |
| 2 | Orientierung & Karte | Prototyp | Bleibt man orientiert? Braucht es eine Minimap? | P2 | P1 |
| 3 | Gabelungen | Prototyp | Wie nimmt man eine Gabelung mitten in der Etappe? | ein Gang mit einer Gabelung | P1 |
| 4 | Drehen begrenzen | Prototyp | Drehorte, Drehzahl oder beides? | kleine Schleife, Stationen vs. Ladung | 1, 3 |
| 5 | Richtung als Weltfaktor | Prototyp | Kann die Richtung fair sperren, schieben, töten? | Strömung + Einbahntür + tödliche falsche Richtung | 4, 6 |
| 6 | Tod & Neustart | Entscheidung | Wo startet man neu, mit welcher Blickrichtung? | Regel auf Papier, getestet in 5 | – |
| 7 | Tempo & Rhythmus | Prototyp | Welche Mischung aus Gefecht/Halt/Anker/Cruise ergibt Rhythmus? | eine Etappe mit Keyframes | P4 |
| 8 | Fenster in die Engine | Produktion | Bewährte Regeln in die echten Module übernehmen | Ansicht, Kreuzungen, gedrehte Arenen, Deck-Leistung, Löser-Türregel | 1–3 „keep“ |
| S | Setting, Ton & Look | Entscheidung | Was ersetzt das Haus? | 2–3 einseitige Pitches | – |
| 9 | Fähigkeiten (je drei Nutzen) | Prototyp → Produktion | Trägt jede Fähigkeit Kampf, Bewegung und Rätsel? | Leine | S, 4, 5 |
| 10 | Gegner & Bosse | Produktion | Funktionieren Gegner und Bosse im drehenden Fenster? | ein Boss im Fenster | S, P4 |
| 11 | Progression | Papier + Löser | Halten Reihenfolge, Schlösser und Sequence Breaks auf dem Grundriss? | Graph + Löserlauf | 4, 5, 9 |
| 12 | Welt bauen | Produktion | Gebiete, Räume, Etappen | erstes Slice | 8, 11, S |
| Q | Querschnitt | Produktion | – | Steuerungsbudget, Telemetrie, Speicherposition, Datenformat für Begegnungen, Deck-Leistung, Löser synchron | laufend |
