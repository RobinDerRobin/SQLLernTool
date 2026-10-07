# Retrospektive P1 „Kreuzung“ (05.–07.10.2026)

> Urteil Robin (07.10.2026): „I am happy with the feature for now.“ → **keep** (Feature, mit Abnahme-Checkliste in
> [`../PROTOTYPEN.md`](../PROTOTYPEN.md), Abschnitt 4a). Bau-Brief: [`P1-kreuzung.md`](P1-kreuzung.md), Änderungen
> nach den Spieltests dort in Abschnitt 9.

## 1. Was passiert ist

| Runde | Robins Rückmeldung | Ergebnis |
|---|---|---|
| 0 | Brief gebaut (Logik, Zeichnen, Tests, Screenshots) | Prototyp lag hinter „Optionen → Prototyp“ – Robin sah ihn nie |
| 1 | „Wenn ich das Spiel öffne, spiele ich den Prototyp.“ | Direktstart; `?spiel` öffnet v0.2 |
| 2 | Scrollen im Gang ≠ auf der Kreuzung; Welt „landet auf dem Spieler“ | Schwenk um den Dackel statt um die Bildmitte; Scrollen überall gleich |
| 3 | Gamepad-Fehler im Artifact | `getGamepads` abgesichert (Berechtigungsrichtlinie im eingebetteten Fenster) |
| 4 | Scroll-Behälter, Kamera folgt quer | Behälter ±40 um die Gangmitte |
| 5 | Recherche nach ähnlichen Spielen | Workflow lief leer (Proxy sperrt Webseiten); Robin recherchierte selbst: „das Feature gibt es so nicht“ |
| 6 | Steckenbleiben an der Ecke nach 90° | **Missverständnis:** Wandecken abgerundet statt die Kameraführung |
| 7 | „Completely wrong … not the player, the camera“ – „Validiere“ | Ecken zurück; Kamera gleitet an Kanten; Ansatz vorher bestätigt |
| 8 | Kurve statt L; Drehen nur, wo Platz ist; Anzeige | Drehen nur auf der Kreuzung, Tastensymbole, Folgen stetig (Knick 1,2 → 0,04 rad/Frame) |
| 9 | Ein Symbol reicht; mehr Toleranz | Ein Dreh-Symbol; Toleranz 160 vor/hinter der Kreuzung – **mit Hineingleiten des Dackels** |
| 10 | „Der Spieler soll gar nicht hineingleiten.“ | Gleiten raus; Folgeproblem (hinter geschlossener Tür gefangen) vorgelegt statt still gelöst |
| 11 | „Der Spieler wird immer noch geschoben. Entferne die Türen.“ | Drei Schiebe-Ursachen gefunden und entfernt; Türen weg |

## 2. Was gut lief

- **Spielbarer Stand nach jeder Runde**: Datei im Chat + Artifact-Link (gleiche URL, 10 Versionen). Robin konnte
  sofort spielen, ohne Release-Workflow.
- **v0.2 blieb unberührt**: Golden Master über alle Runden unverändert, `npm test` immer grün vor dem Push (bis auf
  einen Fall, s. u.).
- **Simulationen statt Raten**: Zufallsspiel über 100.000–300.000 Frames und Gitter über ~1.000–2.000 Startlagen
  fanden Steckenbleiben, Sprünge, Knicke und Türlecks, bevor Robin sie sah.
- **Vorlegen statt eigenmächtig lösen** (ab Runde 10): Wo eine Änderung eine von Robins Regeln berührt hätte
  (Türregel E9), kam die Frage zuerst.

## 3. Was schlecht lief

1. **Gebaut, bevor verstanden.** Dreimal setzte ich eine Deutung um, die nicht Robins Idee war: runde Wandecken
   (gemeint: Kameraführung), Dackel schieben (gemeint: Kamera schieben), Hineingleiten des Dackels (gemeint: nur die
   Kamera). Robin musste zweimal ausdrücklich „Validiere“ verlangen.
2. **Falsche Messgröße.** Ich habe die Kamera gemessen (Sprung, Knick, Stecken), Robin bewertet aber den
   **Dackel**. Dass der Dackel geschoben wurde, fiel meinen Simulationen nicht auf. Meine Aussage „das Gleiten greift
   praktisch nie“ war falsch: Es griff genau in dem Fall, den Robin dann zeigte.
3. **Brief-Regeln erzeugten die Probleme.** Gleiten auf die Kreuzungsmitte und die Türregel standen im Brief und
   führten zu „Welt landet auf dem Spieler“ bzw. „hinter der Tür gefangen“. Das ist der Zweck eines Prototyps – aber es
   hätte schneller auffallen können, wenn die Invarianten (Abschnitt 4a) von Anfang an festgestanden hätten.
4. **Die Frage der Fragekarte ist nicht beantwortet.** P1 sollte zeigen, ob man die gewünschte Gabelung ohne Zögern
   nimmt. Die Runden drehten sich um Kamera und Bewegung; die drei Fragen aus Abschnitt 8 des Briefs sind offen, und
   ohne Türen gibt es keine „falsche Tür“ mehr.
5. **Ein roter Test gepusht** (Befehle mit `;` statt `&&` verkettet). Sofort korrigiert, aber vermeidbar.
6. **Prototyp zuerst unsichtbar.** Die Anbindung „nur über Optionen“ stand im Brief; für Robins Art zu testen
   (Datei öffnen, spielen) war das falsch.
7. **Recherche-Lauf verbrannt**, ohne vorher zu prüfen, ob Webseiten im Container abrufbar sind.
8. **Offen gelassen:** Der v0.2-Smoke-Test (`npm run e2e`) war dreimal sporadisch rot und beim Wiederholen grün;
   Ursache nicht untersucht.

## 4. Was wir fürs nächste Mal ändern

1. **Rückmeldung → Deutung + Ansatz in drei Sätzen → Robins Ja → bauen.** Bei jeder Rückmeldung, die mehr als einen
   Wert ändert. (Robin braucht dafür nur „ja“ oder eine Korrektur.)
2. **Invarianten zuerst.** Jeder Brief bekommt eine Abnahme-Checkliste (wie 4a) und jede Zeile einen automatischen
   Test aus Spielersicht (z. B. „ohne Eingabe ändert sich die Kartenposition nur in Blickrichtung“).
3. **Messen, was der Spieler sieht**: Position und Bildschirmstelle der Figur, nicht nur Kamerawerte.
4. **Direktstart als Standard** für jeden Prototyp-Build (siehe Abschnitt 4 in PROTOTYPEN.md), Auslieferung als Datei
   + Artifact, und einmal im Artifact selbst prüfen (eingebettetes Fenster hat andere Rechte).
5. **Brief-Regeln, die Bewegung oder Kamera betreffen, als Hypothese markieren**, nicht als feste Regel – sie werden
   im Spieltest am ehesten umgeworfen.
6. **Vor dem Push**: `npm test && npm run e2e` als eine Kette; den sporadischen Smoke-Fehler als eigene kleine Aufgabe
   klären (Sonnet 5.5).
7. **Modellwahl nach PROTOTYPEN.md**: Deutungs- und Design-Runden mit Opus 5.5, reines Bauen und Testen mit
   Sonnet 5.5.

## 5. Ergebnis für das Spiel

- Abnahme-Checkliste Fenster und spielweite Regeln: [`../PROTOTYPEN.md`](../PROTOTYPEN.md), Abschnitt 4a.
- Konkrete Werte, die sich bewährt haben (Startwerte für die Übernahme): Schwenk 0,5 s pausiert um die Figur,
  Dreh-Toleranz 160 vor/hinter der Kreuzung, Scroll-Behälter ±40 quer, Kamera-Nachziehen höchstens 150/s.
- Offen für Robin: die drei Fragen aus Abschnitt 8 des Briefs; ob Türen in anderer Form zurückkommen; nächster
  Prototyp (P2 „Orientierung“ laut Leiter).
