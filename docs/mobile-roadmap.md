# Mobile-Roadmap

Lebendes Planungsdokument, analog zu `docs/csharp-engine-poc.md`: Was für
Mobile schon erledigt ist, was offen ist, in welcher Reihenfolge — und was
bewusst **nicht** gemacht wird. Messwerte in diesem Dokument stammen aus
echten Playwright-Läufen gegen den Dev-Server bei 375×667 (iPhone-SE-Breite),
nicht aus dem Stylesheet abgelesen.

Stand: 2026-08-09.

## 0. Die Richtungsentscheidung (offen, blockiert Meilenstein M2)

Die technischen Punkte unten hängen alle an **einer** Frage:

> Soll Mobile eine vollwertige **Authoring-Umgebung** sein, oder ein
> **Read-and-Run-Modus**?

Der Kern des Problems ist nicht CSS, sondern die Bildschirmtastatur: SQL und
Python bestehen zu einem großen Teil aus Zeichen, die auf Telefontastaturen
hinter Modifier-Ebenen liegen (`_ * ( ) " ' ; % |`). Wer eine
Fensterfunktion auf dem Telefon tippt, kämpft mit der Tastatur, nicht mit SQL
— das Werkzeug würde am eigentlichen Lernziel vorbei frustrieren.

**Empfehlung: Read-and-Run.** Mobile optimiert für Tutorial lesen, Aufgabe
lesen, Hinweise aufklappen, „Lösung in den Editor übernehmen" antippen,
ausführen, Ergebnis lesen. Freies Schreiben bleibt möglich, wird aber nicht
zum Zielpfad erklärt. Das ist ehrlich gegenüber dem Medium und macht den
Arbeitsumfang klein und abgrenzbar, statt einen offenen Kampf gegen die
Bildschirmtastatur zu beginnen (Symbolleiste über der Tastatur, Snippet-
Buttons, Autovervollständigung — jeweils eigene, große Projekte).

Solange diese Frage offen ist, wird M2 **nicht** vorweggenommen: Ob z. B. der
Editor auf Mobile prominent oder beiläufig platziert wird, folgt direkt aus
der Antwort.

## 1. Erledigt

| ID | Was | Wann |
|---|---|---|
| F-001 | Überhaupt eine `@media`-Query — Sidebar wird unter 760px zum Overlay-Drawer mit Backdrop, statt den Inhalt auf ~80px zu quetschen | 2026-08-04 |
| F-020 | Drawer schließt nach Auswahl einer Challenge; vorher verdeckte sie den kompletten Inhalt und ein Tap schien wirkungslos | 2026-08-09 |
| F-021 | `.results-body { overflow-x: auto }` — breite Ergebnistabellen waren vorher **unerreichbar** (kein Scrollbar, Vorfahr clippt) | 2026-08-09 |
| F-022 | Editor-Schichten auf 16px unter 760px — verhindert iOS-Safari-Auto-Zoom beim Fokussieren, der nicht wieder herauszoomt | 2026-08-09 |

Damit ist der Bestand **funktional**: Man kann auf dem Telefon eine Challenge
auswählen, lesen, lösen lassen, ausführen und das Ergebnis vollständig sehen.
Was fehlt, ist Bedienkomfort und Barrierefreiheit — siehe M2.

## 2. M2 — Bedienbarkeit (gated auf Abschnitt 0)

### 2.1 Touch-Targets (teils WCAG-Verstoß, nicht nur Komfort)

Gemessen bei 375×667:

| Element | Ist | WCAG 2.5.8 (24×24) | Apple HIG (44×44) |
|---|---|---|---|
| `.play-btn` | **20 × 20** | ❌ verfehlt | ❌ |
| `.sidebar-toggle-btn` | **22 × 22** | ❌ verfehlt | ❌ |
| `.tab-btn` | 86,5 × 29 | ✅ | ❌ |
| `.mode-btn` | 137 × 25 | ✅ | ❌ |
| `.theme-btn` / `.reset-btn` | 282 × 30 | ✅ | ❌ |
| `.challenge-item` | 294 × 60,9 | ✅ | ✅ |

`.play-btn` und `.sidebar-toggle-btn` liegen **unter dem AA-Minimum von
24×24 CSS-Pixeln** aus WCAG 2.5.8 (Target Size, Minimum) — das ist ein
Konformitätsproblem, kein Geschmacksurteil, und sollte unabhängig von der
Richtungsentscheidung behoben werden. Die übrigen erfüllen AA, verfehlen aber
die 44×44-Empfehlung, unter der Fehlgriffe spürbar zunehmen.

Ansatz: Trefferfläche vergrößern, ohne die Optik umzubauen — Padding und ggf.
ein `::after`-Overlay, statt die Icons selbst aufzublasen. `.play-btn` sitzt
in einer dichten Liste; hier ist die Trefferfläche wichtiger als die
sichtbare Buttongröße.

### 2.2 Compare-Ansicht stapeln

Gemessen: 2 Spalten à **135,5px** bei 375px Breite. Zwei SQL-Abfragen
nebeneinander in je 135px sind nicht lesbar. Unter 760px sollten die Spalten
untereinander stapeln (`flex-direction: column`), statt sich die Breite zu
teilen.

### 2.3 Typo-Skala

Sidebar-Labels und Statuszeilen stehen auf 10–11px (`.challenge-num`,
`.stars`, `.course-name`, `.mode-btn`, `.reset-confirm-text`). Auf einem
Telefon in der Hand ist das klein. Kein eigener Bug, aber der Punkt, der
„fühlt sich nach Desktop-Seite auf dem Handy an" am stärksten trägt.

## 3. Bewusst nicht geplant

- **Eigene Bildschirmtastatur-Symbolleiste / Snippet-Buttons.** Eigenes
  Projekt, und laut Abschnitt 0 die falsche Richtung, solange Read-and-Run
  gilt.
- **Native App / PWA-Offline-Modus.** Das Tool ist bewusst eine
  Single-File-HTML-Anwendung (siehe `vite-plugin-singlefile`); ein
  Service-Worker-Offline-Modus widerspricht dem Auslieferungsmodell.
- **Landscape-spezifische Layouts.** Erst sinnvoll, wenn Portrait steht.
- **Tablet-Zwischenbreiten (760–1024px).** Der aktuelle Breakpoint behandelt
  sie wie Desktop; bisher kein gemessener Schaden. Erst angehen, wenn ein
  echter Befund vorliegt, nicht auf Verdacht.

## 4. Wie das abgesichert wird

Reine CSS-Layout-Fixes sind nicht unit-testbar (wie F-001 und F-007 schon
festhalten). Die Absicherung ist die **Live-Messung**, die seit 2026-08-09
Standing Requirement im Runbook von `docs/ui-ux-audit.md` ist: jeder
Live-Playwright-Durchlauf schließt mindestens einen schmalen Viewport
(375×667) ein und prüft horizontales Overflow, Drawer-Verdeckung und echte
Klickbarkeit per `.click()` statt `isVisible()`.

Zwei Lehren aus dem F-020/F-022-Durchgang, die für alles Weitere hier gelten:

1. **`isVisible()` erkennt keine Verdeckung.** F-020 fiel nur auf, weil ein
   echter `.click()` mit „element intercepts pointer events" scheiterte.
2. **Media Queries erhöhen die Spezifität nicht.** Der erste F-022-Fix war
   wirkungslos, weil der Override vor der Basisregel stand und per
   Quellreihenfolge verlor — sichtbar nur durch erneutes Nachmessen, nicht
   durch Lesen des Diffs. Mobile-Overrides gehören **hinter** die Regeln,
   die sie überschreiben.
