# Drehstufen und Tastenbelegung (P3 „45°-Kreuzung“) – Game-Designer

> Designrunde, 11.10.2026, Opus 5.5. Nur Material, **keine Entscheidung** – Robin entscheidet. Grundlage: `CLAUDE.md`,
> `docs/PROTOTYPEN.md` (Abschnitt 2, 3/E3, 4a), `docs/prototypen/P3-45grad.md` (Abschnitt 9), `src/core/input.js`,
> `src/proto/achteck.js`, `src/proto/fenster.js`.
> Anlass: Robin verwechselt LB/RB (±90°) und LT/RT (±45°) oft. Sein Vorschlag (Tastatur): Shift+A/D = 90° links/rechts,
> Shift+W+A/D = 45° links/rechts.

## 0. Empfehlung zuerst

1. **Zwei Drehstufen als Ergebnis ja, als zwei Tastenpaare nein.** Empfehlung: **ein Tastenpaar „links/rechts“** (Controller
   LB/RB, Tastatur U/O) mit **„Gang-Fang“**: Ein Druck dreht bis zum *nächsten* Gang in dieser Drehrichtung (am Achteck 45°, an einer
   rechtwinkligen Kreuzung 90°). **Ein zweiter Druck derselben Seite während des Schwenks** verlängert die Drehung zum
   *übernächsten* Gang (am Achteck 90°), in einem Schwenk. LT/RT werden frei (z. B. für P4 „Druck“).
   Damit kann man die Stufe nicht mehr verwechseln, nur noch zu kurz drehen, und das wird im Schwenk korrigiert.
2. **Robins Shift-Akkord ist machbar**, braucht aber feste Erkennungsregeln (Abschnitt 2): Shift ist Modus-Taste, nur
   *neue* Tastendrücke nach Shift zählen, **Korrekturfenster 4 Frames (67 ms) statt 2**, kein Warten vor dem Schwenk, sondern
   Umlenken im Schwenk. **Seine Zuordnung (mehr Tasten = kleinere Drehung) ist die richtige**, nicht umgekehrt.
   Stärker wäre der Akkord als **Richtungs-Akkord**: Shift + Richtung des Gangs, den man nehmen will (W = oberer Gang 90°,
   W+vorn = schräg oben 45°). Dann folgt die Zuordnung aus der Geometrie (zwei Richtungstasten = schräg = 45°), und die
   Taste hängt nicht mehr davon ab, ob man nach links oder rechts fliegt.
3. **Controller-Gegenstück:** zu 1. einfach LB/RB wie auf der Tastatur U/O. Zu 2.: LB halten = Shift, Stick bzw.
   Steuerkreuz = W/A/S/D, **gleiche Fenster in Frames**.
4. **Vorschlag zum Prüfen:** eine kleine P3-Iteration mit umschaltbarem Schema (heute / Gang-Fang / Akkord), dazu ein
   Zähler für „Verwechslungen“ (Drehung, die innerhalb von 2 s zurückgedreht wird). Robin spielt alle drei am Deck.
   Modell: Gespräch und Brief Opus 5.5, Bau Sonnet 5.5.

## 1. Braucht es zwei Drehstufen?

Ausgangslage im Code: `AchteckScene.rotInput` liefert k = ±1 (LT/RT, J/K) oder ±2 (LB/RB, U/O); `rotate(k)` macht immer
**einen** Schwenk von 0,5 s, das Spiel pausiert, Drücke im Schwenk werden ignoriert (Checkliste 4a). Die Dreh-Zone ist das
Achteck plus 160 E in jedem Arm, bei Tempo 70 also rund 11 s Zeit zum Drehen.

Wichtig für alle Varianten: **An einer rechtwinkligen Kreuzung (P1 „Kreuzung“, P1c „Netz“, v0.2-Welt) ist ein einzelner
45°-Druck ungültig** (in der neuen Flugrichtung führt kein Gang weg, Regel aus dem Netz). „Nur 45°“ ohne Zusatzregel hieße
dort: man kann gar nicht mehr drehen.

| | **A: heute, 45° und 90° getrennt** (4 Tasten) | **B: nur 45°, zweimal drücken** (2 Tasten) | **C: Gang-Fang + Nachlegen** (2 Tasten, Empfehlung) |
|---|---|---|---|
| Verwechseln | hoch: zwei Tasten je Seite, Schulter/Abzug liegen übereinander; Robin bestätigt es | keins bei der Stufe | keins bei der Stufe; nur „zu kurz“ am Achteck, im Schwenk korrigierbar |
| 90° an rechtwinkliger Kreuzung | 1 Druck, 0,5 s | geht nicht ohne Zusatzregel (erster 45°-Druck wird abgelehnt) | 1 Druck, 0,5 s |
| 90° am Achteck | 1 Druck, 0,5 s | 2 Drücke; ohne Nachlegen 2 × 0,5 s und dazwischen kurz Diagonalflug | 2 Drücke, **ein** Schwenk (Hypothese ~0,7 s) |
| Tempo im Kampf (P4) | schnell, aber Fingerweg zwischen LB und LT; Steam-Deck-Abzüge sind lang (Schwelle `value > 0,5`) | langsam am Achteck | wie A an Kreuzungen, am Achteck ein Doppeltipp mit dem Zeigefinger |
| Controller-Tasten | 4 (LB, RB, LT, RT) | 2 | 2 – LT/RT frei für P4 |
| Regel-Aufwand | keiner | Nachleg-Regel nötig | Eingabe wählt aus den erlaubten Drehungen (`turnOptions`) die kleinste in Drehrichtung; die Weltregel selbst bleibt unverändert |
| Was 4a ändert | nichts | „Drücke im Schwenk ignoriert“ bekommt eine Ausnahme | dieselbe Ausnahme |

Zum Tempo: Der Schwenk **pausiert** das Spiel. Eine zweite halbe Sekunde kostet im Kampf also keine Sicherheit, nur Fluss.
Gefährlich ist eher die **Denklast**: Bei A muss man unter Beschuss „wie weit?“ *und* „wohin?“ entscheiden, bei C nur
„wohin?“. Das spricht für C, besonders für P4. Gegen C spricht: Dieselbe Taste dreht je nach Kreuzung verschieden weit. Das ist
nur dann fair, wenn man den Zielgang sieht. Im Fenster ist er zu sehen, und das Dreh-Symbol könnte die Stufe zeigen.

**Empfehlung zu Frage 1: C.** Die Häufigkeit von 45° gegenüber 90° ist offen, solange es kein Leveldesign gibt. C ist
gegen beide Fälle robust, A nur, wenn Robin die vier Tasten auf Dauer sicher trifft. Nachweisen kann das nur der Spieltest.

**Nachlegen, Hypothesen (als Konstanten):** Ein zweiter Druck derselben Seite zählt bis **18 Frames (300 ms) nach dem
ersten Druck**, später kommende Drücke werden wie bisher ignoriert. Der Schwenk wird dabei aus der laufenden
Winkelgeschwindigkeit heraus auf das neue Ziel umgelenkt, nicht neu gestartet, damit die Grenze von 0,1 rad/Frame für
Kamera-Knicke hält. Testwerte: 12/18/30 Frames. **Ein Verzögerungsfenster vor dem ersten Schwenk (warten, ob ein zweiter
Druck kommt) wird nicht empfohlen**: Ein Doppeltipp braucht etwa 150–250 ms, so lange würde jede einzelne Drehung zögern.

## 2. Robins Shift-Akkord auf der Tastatur

### Probleme

1. **Gehaltene Steuertasten werden fälschlich als Akkord gelesen.** Wer nach links lenkt (A gehalten) und dann Shift drückt,
   löst ohne Regel eine 90°-Drehung aus. Wer nach oben lenkt (W gehalten) und Shift+A drückt, bekommt 45° statt 90°.
2. **Nachlaufende Akkord-Tasten lenken nach dem Schwenk.** Nach Shift+A hält man A noch kurz. Endet der Schwenk vorher,
   schiebt A den Dackel nach links (120 E/s). Das läuft gegen die Regel „Position ändert sich nie von selbst“.
3. **Tippfehler 90° statt 45°:** Kommt bei Shift+W+A das W einen Frame nach dem A, wäre bei sofortiger Auswertung schon 90°
   ausgelöst, also genau die Verwechslung, die vermieden werden soll. Das gilt in jeder Zuordnung: Der kleinere Akkord ist
   immer eine Teilmenge des größeren und muss auf eine mögliche dritte Taste „warten“ oder sich korrigieren lassen.
4. **Shift ist in v0.2 Power und im Menü „Zurück“** (`KEYMAP`: ShiftLeft/Right → `power`, `back = pressed('power')`). Im
   Prototyp stört das nicht (er liest `power` nicht), im echten Spiel bräuchte Power eine andere Taste. Auch K ist heute
   doppelt belegt (Power in v0.2, 45° rechts im Prototyp). Das bleibt eine offene Frage für Robin.
5. **Ghosting/Rollover:** Shift+W+A ist mit Feuer (Leertaste/J) im Kampf ein Griff aus 4 Tasten. Billige Folientastaturen
   melden nicht jede Kombination aus 3–4 Tasten. Der WASD-Shift-Block ist meist darauf ausgelegt, eine Garantie gibt es nicht.
   Abhilfe ist der Richtungs-Akkord (s. u.), der ohne Feuer-Taste auskommt, oder J/L als Ausweich-Belegung.
6. **Windows-Einrastfunktion:** Fünfmal Shift öffnet unter Windows (.exe-Build) den Dialog der Einrastfunktion und nimmt dem
   Spiel den Fokus. Beim Steam-Deck-AppImage tritt das nicht auf, bei Robins Windows-Tests schon.
7. **Linksflug:** Shift+A dreht immer gleich herum (`rotate(k)` dreht unabhängig von s). Je nach Flugseite führt dieselbe
   Taste also zum *oberen* oder zum *unteren* Gang. P3 fragt genau danach („Verwechselt beim Linksflug?“). Der Akkord
   ändert daran nichts.

### Erkennungsverfahren (Vorschlag)

Je Taste wird der Frame des letzten Drückens gemerkt (keydown ohne Wiederholung, wie `tapped` heute). N = Korrekturfenster.

1. **Shift ist Modus, nicht Akkordpartner.** Shift darf beliebig lange vorher gedrückt sein, oder **bis N Frames nach** A/D.
   War A/D schon länger als N Frames gehalten, als Shift kam, passiert nichts. Damit ist Problem 1 gelöst.
2. **Auslöser ist der Druck auf A bzw. D** (oder ←/→), nie das Halten.
3. **W zählt nur, wenn es neu ist:** gedrückt nach Shift oder höchstens N Frames vor oder nach A/D. Ein seit dem Lenken
   gehaltenes W zählt nicht.
4. **Kein Warten:** Beim Auslöser beginnt der 90°-Schwenk sofort. Kommt W innerhalb von N Frames danach, wird der Schwenk
   auf 45° umgelenkt. Bei N = 4 hat der Schwenk (Ease-In) bis dahin erst ~4° von 90° zurückgelegt, das Umlenken ist kaum zu
   sehen. Das ist dieselbe Umlenk-Mechanik wie beim Nachlegen in Abschnitt 1.
5. **Akkord-Tasten sind bis zum Loslassen gesperrt.** A/D/W aus dem Akkord lenken erst wieder, wenn sie losgelassen und neu
   gedrückt werden. Damit ist Problem 2 gelöst.

**2 oder 4 Frames?** 4 Frames (67 ms) werden empfohlen. Wenn Menschen zwei Tasten „gleichzeitig“ drücken, liegen die
Anschläge erfahrungsgemäß einige Dutzend Millisekunden auseinander. 2 Frames (33 ms) würden viele echte Akkorde als
90° lesen. Weil Schritt 4 nicht wartet, kostet das größere Fenster **keine Verzögerung**. Mehr als ~6 Frames werden nicht
empfohlen, weil ein später Druck dann wie eine eigene Absicht wirkt. Messen statt schätzen: Der Prototyp sollte den
Frame-Abstand jedes Akkords mitschreiben, dann zeigt Robins eigene Streuung den richtigen Wert. Falls doch ein
**Verzögerungsfenster** gewünscht ist (erst auswerten, dann drehen): ebenfalls 4 Frames. 67 ms vor einem Schwenk von 500 ms
fallen kaum auf. Umlenken ist trotzdem besser, weil sich ein Druck dann sofort auswirkt.

**WASD während Shift:** Empfohlen wird die Regel **„Was vor Shift gedrückt war, lenkt weiter. Was danach kommt, dreht und
lenkt nicht.“** Shift sollte nicht alles Lenken anhalten, denn wer im Kampf ausweicht und dabei Shift greift, soll nicht
plötzlich stehen. Zwar treibt der Dackel ohne Eingabe nur in Scrollrichtung, ein Halt wäre also sicher, er fühlt sich aber
wie ein Hänger an. Shift ohne A/D tut nichts.

**Zuordnung „mehr Tasten = kleinere Drehung“: sinnvoll, beibehalten.** Gründe: (a) Die 90°-Drehung ist an allen
rechtwinkligen Kreuzungen die nötige und bekommt den einfacheren Griff. (b) W+A bzw. W+D ist im WASD-Block die
Schräg-Richtung, „schräg = 45°“ lässt sich also merken. (c) Umgekehrt („mehr = mehr“) würde 90° = 2 × 45° zwar abbilden,
der häufigere Fall bekäme aber den schwereren Griff. Einschränkung: Bei Robin ist W kein „oben“, sondern ein reiner
„Halb“-Schalter. Shift+W+D kann, je nach Flugseite, zu einem Gang *unten* führen, und das widerspricht dem W.

**Variante Richtungs-Akkord (Vorschlag zum Mittesten):** Shift + **Richtung des Gangs, den man nehmen will**, auf dem
Bildschirm: Shift+W = oberer Gang (90°), Shift+S = unterer Gang (90°), Shift+W+vorn = schräg oben vorn (45°), Shift+S+vorn =
schräg unten vorn (45°). „Vorn“ ist D beim Rechtsflug und A beim Linksflug. Schräg nach hinten (135°) wird rot abgelehnt.
Vorteile: Das passt zu Robins Regel „Gabelung nehmen, indem man in diese Richtung fliegt“ (PROTOTYPEN.md Abschnitt 2) und
zur bildschirmbezogenen Eingabe (4a). Es ist unabhängig von Linksflug und kopfüber, und die Tastenzahl folgt der Geometrie.
Dieselben Fenster wie oben gelten, mit W/S als Auslöser und vorn als Zusatz. Nachteil: Der Drehsinn ist nicht mehr fest an
eine Taste gebunden, und diese Abweichung vom bisherigen Modell muss Robin bestätigen.

## 3. Controller mit derselben Logik

| Tastatur | Controller (Steam Deck, Standard-Mapping) |
|---|---|
| **Empfehlung C:** U / O (Gang-Fang, Nachlegen durch zweiten Druck) | **LB / RB**, gleiche Regeln und Fenster; LT/RT bleiben frei |
| Robin: Shift halten | **LB halten** = Drehmodus (A = Feuer und Y = Umkehr bleiben). RB wird frei |
| Robin: + A / D (90°) | + Stick oder Steuerkreuz **links / rechts** |
| Robin: + W+A / W+D (45°) | + Stick/Steuerkreuz **schräg oben links / oben rechts** |
| Richtungs-Akkord: + W / S / W+vorn / S+vorn | LB halten + Stick **zum Zielgang** (oben, unten, schräg vorn oben/unten) |

Regeln, die für den Controller dazukommen:
- **Stick in 8 Sektoren zu je 45°**, Auslösen erst ab Ausschlag 0,8 (über den 0,6 der Menü-Hysterese in `input.js`). Wer
  den Stick nach schräg drückt, streift oft zuerst eine Hauptrichtung. Dafür gilt dasselbe **Korrekturfenster von 4 Frames**:
  Wird innerhalb davon der schräge Sektor erreicht, wird auf 45° umgelenkt. Das entspricht dem zu spät gedrückten W auf der
  Tastatur.
- **Nach dem Schwenk lenkt der Stick erst wieder, wenn er einmal in der Mitte war** (Deadzone). Das entspricht Schritt 5,
  „Akkord-Tasten bis zum Loslassen gesperrt“.
- Während LB gehalten wird, wählt der Stick die Drehung und lenkt nicht. Im Kampf (P4) kann man in diesem kurzen Moment
  nicht ausweichen. Das ist ein Punkt für den P4-Test.
- Die Rückentasten des Deck (L4/L5/R4/R5) erscheinen in der Gamepad-API nicht als eigene Tasten. Man kann sie über Steam Input
  auf LB/RB legen, das Spiel muss dafür nichts tun.

Für die Verwechslung ist das Entscheidende: Bei C gibt es **je Seite genau eine Taste**, Schulter und Abzug liegen nicht
mehr übereinander. Beim Akkord ist die Stufe eine Stickrichtung, die man sieht, keine zweite Taste.

## 4. Offene Fragen an Robin

1. Ein Tastenpaar mit Gang-Fang (C) oder vier Tasten wie heute (A) oder dein Shift-Akkord? Zuerst alle drei umschaltbar testen?
2. Nachlegen bzw. Umlenken im Schwenk ist eine Ausnahme zu 4a („Drücke im Schwenk ignoriert“). Ist das in Ordnung?
3. Akkord: Drehsinn (deine Zuordnung) oder Richtung des Zielgangs (Richtungs-Akkord)?
4. Wenn Shift dreht: Wohin kommt Power im echten Spiel (heute Shift und K)?
