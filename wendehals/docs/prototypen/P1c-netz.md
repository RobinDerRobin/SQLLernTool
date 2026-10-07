# Bau-Brief P1c „Netz“ – das drehende Fenster an vielen Kreuzungsformen

> Für eine Code-Session. Modell: **Sonnet 5.5** (Bauen und Testen). Zeitbox: eine Sitzung (~3 h).
> Wegwerf-Prototyp. Baut auf P1 „Kreuzung“ auf ([`P1-kreuzung.md`](P1-kreuzung.md), Abschnitt 9 = aktueller Stand;
> [`P1-retro.md`](P1-retro.md)). **Vorher lesen und befolgen:** `wendehals/CLAUDE.md`, Abschnitt „Regeln für jede
> Prototyp-Arbeit“ (u. a. Regel 1: vor jeder Abweichung Robin fragen, ob es das ist, was er will).
> Status: **von Robin validiert am 07.10.2026** (Regeln Abschnitt 3, Karte, Direktstart, Prüfmaße, Technik).

## 1. Fragekarte

- **Frage:** Hält das Drehen alle Punkte der Abnahme-Checkliste auch an anderen Kreuzungsformen, an dicht
  beieinanderliegenden Kreuzungen und bei vielen Drehungen hintereinander?
- **Woran Robin es merkt (5 Minuten):** Er fliegt durch ein kleines Netz und holt Knochen; nirgends ruckelt es, nichts
  schiebt ihn, er kommt überall weiter, und das Dreh-Symbol leuchtet genau dort, wo er drehen kann.
- **Bewusst nicht drin:** Orientierung/Minimap (P2), 45° (P3), Gegner/Schießen (P4), Türen, Speichern.

## 2. Abnahme-Checkliste (zuerst; jede Zeile bekommt einen automatischen Test aus Spielersicht)

Alle Punkte aus [`../PROTOTYPEN.md`](../PROTOTYPEN.md) Abschnitt 4a, an **jeder** Stelle A–I (Abschnitt 4):

- [ ] Flüssige Kamera: kein Sprung > 4 Einheiten/Frame, kein Richtungsknick > 0,1 rad/Frame (ohne 180°-Umkehr).
- [ ] Die Kartenposition des Dackels ändert sich ohne Eingabe nur in Scrollrichtung – nie durch Drehen, Folgen,
      Wände oder den Bildrand.
- [ ] Drehen geht nur in der Dreh-Zone einer Kreuzung und nur, wenn in der neuen Flugrichtung ein Gang von dieser
      Kreuzung wegführt (Abschnitt 3).
- [ ] Nie festsitzen: von jeder erreichbaren Lage kommt der Dackel mit dem Stick (und ggf. Drehen/Umkehr) weiter.
- [ ] Zu früh gedreht: die Kamera gleitet ohne Ruck in den neuen Gang und scrollt dort weiter; die Kartenposition des
      Dackels ändert sich dabei nicht; am Bildrand wartet die Kamera, bis der Dackel nachkommt.
- [ ] Hin- und Zurückdrehen ergibt dasselbe Bild; die Kamera zeigt nicht mehr Leere als nötig.
- [ ] Schwenk um den Dackel, 0,5 s, Spiel pausiert, Eingaben im Schwenk ignoriert; „rechts“ bleibt rechts.
- [ ] Sichtbare Rückmeldung: Symbol leuchtet, wenn mindestens eine Drehung möglich ist; abgelehnter Druck wackelt rot
      mit Ton. Nichts im HUD dreht mit.

Zusätzlich für P1c:

- [ ] **Überlappende Dreh-Zonen** (Stelle D) verhalten sich wie eine: Das Symbol flackert nicht und erlischt nicht
      zwischen den beiden Kreuzungen, solange eine von ihnen eine Drehung erlaubt.
- [ ] **Viele Drehungen** hintereinander (Ring I, auch kopfüber) zurück zur Ausgangsrichtung: wieder dasselbe Bild.
- [ ] **Breiter Raum (F):** Die Kamera folgt quer bis an die Raumwände, ohne Ruck; **schmaler Gang (G):** kein Zittern.
- [ ] 60 fps im Browser (Perf-Messung wie `e2e/perf.mjs`, nur für diese Szene, nicht in `npm run e2e:perf`).

## 3. Robins Regeln (verbindlich)

Alles aus P1 (Brief Abschnitt 2 und 9) gilt weiter, insbesondere: Schwenk um den Dackel, Drehung ändert die Position
nie, keine Türen, 180°-Umkehr überall, ein Dreh-Symbol. Neu bzw. präzisiert (Robin, 07.10.2026):

1. **Drehen nur, wenn ein Gang da ist:** In der Dreh-Zone einer Kreuzung geht eine 90°-Drehung nur, wenn in der
   neuen Flugrichtung (h nach der Drehung) ein Gang von dieser Kreuzung wegführt. Am L-Knick geht also nur eine der
   beiden Drehungen, an der T-Kreuzung je nach Flugrichtung eine oder zwei. Das Symbol leuchtet, sobald mindestens
   eine Drehung möglich ist; die andere wird rot abgelehnt.
2. **Dreh-Zone = Kreuzungsquadrat plus Toleranz `TURN_AHEAD` (160) davor und dahinter** in jedem angeschlossenen Gang.
3. **Zu früh gedreht** (Dackel noch im Gang vor oder hinter der Kreuzung, innerhalb der Toleranz): **Nur die Kamera
   gleitet weich in den neuen Gang.** Der Dackel bleibt an seiner Kartenstelle (die Drehung verschiebt ihn nie); im
   Bild wandert er dadurch ein Stück zur Seite. Im neuen Gang scrollt die Kamera weiter, ohne anzuhalten; der Spieler
   fliegt den Dackel mit dem Stick hinterher. **Erreicht der Dackel dabei den Bildrand, wartet die Kamera am Rand auf
   ihn** (Robin: Variante a), bis er in den Gang fliegt – der Bildrand schiebt den Dackel nie.
4. **Breiter Raum:** Die Kamera folgt dem Dackel quer bis an die Raumwände (nicht Kernaufgabe, aber ruckfrei).

## 4. Karte (Daten, Werte als Konstanten oben in der Datei)

Die Karte wird eine **Liste von Gängen** (Mittellinie, Achse, Breite) statt des festen Kreuzes. Kreuzungen werden
dort erkannt, wo sich Gänge überschneiden; Kreuzungsquadrat = Überschneidungsfläche. Skizze (Norden oben, nicht
maßstabsgetreu):

```
   ┌─────C──────B──────────B─────C┐       C = L-Knick (Ringecke)
   │G            │ E↑            │       B = T-Kreuzung (Ring trifft Mittelgang)
   │(schmal)     │  │      H     │       A = + Kreuzung (Mitte)
   B─────E───────A──D───D(stub)  B       D = zwei Kreuzungen dicht (Zonen überlappen), mit Stummel H
   │       E↓    │               │       E = versetzte Abzweige (links ab, kurz danach rechts ab)
   │             │      [F]      │       F = breiter Raum (400 hoch) im Ring
   └─────C──────B────[ F ]───────C┘       I = der Ring selbst (viele Drehungen hintereinander)
```

- Ring (I): Quadrat aus vier Gängen, Ecken = vier L-Knicks (C). Westseite schmal (G, Breite 120).
- Mittelgänge: waagerecht und senkrecht durch die Mitte → + Kreuzung (A), wo sie den Ring treffen T-Kreuzungen (B).
- D/H: auf dem östlichen Mittelgang eine zweite Kreuzung so nah an A, dass sich die Dreh-Zonen überlappen
  (Abstand der Kreuzungsmitten ≈ 260); von ihr geht ein kurzer Stummel (H, kürzer als ein Bildschirm) nach Norden.
- E: auf dem westlichen Mittelgang ein Abzweig nach Norden und ~120 weiter einer nach Süden (versetzt).
- F: ein Abschnitt der Ring-Südseite ist ein breiter Raum (400 hoch).
- Standardbreite 200, Tempo 90 wie P1. Knochen an mehreren Stellen (Stummel-Ende, Raum F, Ringecken, Mitte eines
  Gangs); Zielfarbe wechselt wie in P1 (fester Startwert).
- Der Erbauer darf Abstände anpassen, solange jede Stelle ihren Grenzfall behält (z. B. D: Zonen überlappen wirklich).

## 5. Dateien und Anbindung

- `src/proto/fenster.js`: `FensterScene` bekommt die Karte als Parameter (P1-Kreuz = eine Karte, P1c-Netz = eine
  andere). P1 bleibt spielbar und `tests/fenster.tests.mjs` bleibt grün (Anpassungen nur, wo sich die Karte als
  Parameter ändert).
- `src/proto/netz-map.js` (neu): die Netz-Karte als Daten.
- Zeichnen in `src/proto/fenster-draw.js` für beliebige Gänge verallgemeinern.
- `src/game/game.js`: `startProto('netz')`; Optionen (vom Titel) zusätzlich „Prototyp: Netz“.
- `src/main.js`: **Direktstart in P1c „Netz“**; `?spiel` öffnet v0.2 wie bisher; `?proto=fenster` startet P1.
- Tests: `tests/netz.tests.mjs` – je Zeile der Checkliste mindestens ein Test, gemessen an Position und
  Bildschirmstelle des Dackels; dazu ein Zufallsspiel (≥ 100.000 Frames, fester Startwert) und ein Gitter von
  Startlagen um jede Stelle A–I.
- `e2e/netz.mjs` (Wegwerf): Screenshots an jeder Stelle A–I (vor, im und nach dem Schwenk) nach
  `e2e/screenshots/netz-*.png`; ansehen, bevor gepusht wird.

## 6. Sicherheitsnetz

- `npm test && npm run e2e` grün (als eine Kette), Golden Master unverändert, P1-Tests grün.
- Golden Master nie neu schreiben; `worldgraph*`, Löser, `welt.json`, `Level`, `Arena` unberührt.
- Nach jeder Runde `dist/index.html` an Robin und Artifact unter derselben URL aktualisieren; einmal im Artifact prüfen.

## 7. Fertig, wenn

- [ ] Jede Zeile der Checkliste (Abschnitt 2) hat einen grünen Test aus Spielersicht.
- [ ] Screenshots aller Stellen A–I angesehen.
- [ ] Build startet direkt in P1c; P1 über `?proto=fenster` und Optionen erreichbar; v0.2 über `?spiel`.
- [ ] Commit und Push auf den Branch der Session; Datei + Artifact an Robin.

## 8. Rückmeldung an Robin

Was gebaut ist, jede Abweichung vom Brief mit Grund (vorher gefragt, Regel 1), Testergebnisse, und die Frage:
„An welcher Stelle (A–I) hat sich das Drehen falsch angefühlt?“ Antwort als F2 ins Entscheidungsprotokoll.

## 9. Stand nach dem Bau (07.10.2026, Sonnet 5.5)

**Gebaut:** `src/proto/karte.js` (Gänge als Rechtecke, Kreuzungen = Überschneidungen, Ports, Dreh-Zonen), `src/proto/netz-map.js`
(Netz mit den Stellen A–I, `STELLEN`), `FensterScene` mit Karte als Parameter (P1 = Kreuz, P1c = Netz), `tests/netz.tests.mjs`
(+ `tests/helpers/netz-bot.mjs`), `e2e/netz.mjs`. Direktstart im Netz, `?proto=fenster` = P1, `?spiel` = v0.2, Optionen → „Prototyp: Netz“.

**Kamera (alles Hypothesen, Regel 5 – der Spieltest entscheidet):**
- Das Fenster scrollt durch den Gang K (Kamerabereich = Gang ±60 an den Enden, quer ±40 % der halben Breite; im Raum F bis zu den
  Wänden: ±87). K wird beim Drehen gesetzt: der Gang der Kreuzung, der in der neuen Flugrichtung wegführt.
- Steht der Dackel beim Drehen schon im neuen Gang (Kreuzungsquadrat), trägt ihn die Kamera wie in P1. Steht er noch im alten Gang
  („zu früh“, `glide`), gleitet nur die Kamera und scrollt weiter; der Dackel bleibt an seiner Kartenstelle und wandert im Bild zurück;
  am Bildrand wartet sie (weich, `EASE` = 100). Sobald er im neuen Gang steht, trägt sie ihn wieder.
- Weiches Anfahren/Bremsen (`SCROLL_RAMP` 1/s, `SCROLL_DECEL` 1,5/s, Auslauf `EASE`), Quer-Folgen mit begrenzter Beschleunigung
  (`FOLLOW_ACC` 90, `FOLLOW_MAX` 120), Komfortzone `COMFORT` 95 (Dackel weicht quer höchstens so weit von der Bildmitte ab).
  Das gilt jetzt auch in P1 (gleiche Klasse); die P1-Tests sind unverändert grün.

**Checkliste → Tests** (`tests/netz.tests.mjs`, alle aus Spielersicht: Kartenposition und Bildschirmstelle des Dackels):
Flüssige Kamera → `Monitor` in jedem Test (Sprung ≤ 4, Knick ≤ 0,1 rad/Frame; im Schwenk Drehwinkel ≤ 0,1 rad/Frame);
Position ändert sich nie von selbst → `Monitor` (seitlich 0, im Schwenk 0, `shoves` = 0); Drehregeln → Orakel an allen Stellen +
Grenzfälle; nie festsitzen → Bot erreicht von 254 Startlagen aus jeden der 6 Knochen (1.524 Wege, längster 39 s); zu früh gedreht → eigener Test + Gitter; Hin- und
Zurückdrehen → exakt gleiches Bild; Schwenk/Eingabe → eigener Test; Rückmeldung → HUD-Zeichnung geprüft; D → Symbol erlischt nie;
viele Drehungen → Ring-Runden (rechts, links, kopfüber) und 4×/12× Drehen auf A/D; F und G → eigene Tests; 60 fps → `e2e/netz.mjs`.

**Bekannte Grenzen (ehrlich):**
- Kamera-Knick ≤ 0,1 rad/Frame gilt ab 0,5 E/Frame sichtbarer Bewegung (wie im P1-Test) und **nicht** für das harte Anhalten vor
  einer Wand, in die der Spieler den Dackel gerade gesteuert hat (wie in P1; im Zufallsspiel 20 von 120.000 Frames).
- Nach einem Schwenk um einen Dackel am Bildrand liegt die Fenstermitte bis zu einer halben Bildbreite neben dem Dackel (außerhalb der
  Karte möglich); das Scrollen bringt sie zurück (`pullBack`).
- Die Stellen A–I und ihre Maße stehen in `netz-map.js`; Knochen: Stummel, Raum, Ecke NO, Ecke SW, Gangmitte, Abzweig.
