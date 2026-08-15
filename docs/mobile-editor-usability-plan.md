# Mobile Editor Usability Plan

**Datum:** 2026-08-15  
**Kontext:** Benutzer-Feedback: "Der Editor ist auf dem Handy nicht gut nutzbar. Er ist abgeschnitten und unübersichtlich."

## Problemanalyse

### 1. Aktuelle Situation (Baseline)

Gemessen auf 375×667 (iPhone-SE-Breite):

| Aspekt | Status | Auswirkung |
|---|---|---|
| **Horizontal-Overflow** | `overflow: auto` vorhanden (F-021 Fix) | Theoretisch behebbar, praktisch ungewöhnlich für Code-Input |
| **Layout-Stapel** | Vertikale Stapelung (SQL oben, Ergebnis unten) | Funktional, aber viel Scrollen erforderlich |
| **Editor-Größe** | Volle Breite (375px), aber variable Höhe | Zu klein zum komfortablen Schreiben |
| **Tastatur-Überlagern** | iOS/Android-Tastatur deckt Editor ab | `font-size: 16px` verhindert Auto-Zoom (F-022), aber keine Tastatur-UI-Toolbar |
| **Line-Numbers** | Sichtbar, beanspruchen ~42px (seit F-022-Fix) | Drückt Codezeilen nach rechts, Platzver­schwendung auf Mobile |
| **Hint-Panel** | Rechts, einkollabierbar | Vollständig versteckt auf Mobile, nicht gleich zugänglich wie auf Desktop |

### 2. Erkannte Usability-Probleme

#### 2.1 **Editor ist nicht prominent genug — "versteckt sich" durch Scroll-Tiefe**

- Auf Desktop: Tutorial (Flex-rechts), Editor unten (Flex-links)
- Auf Mobile: Tutorial oben, Editor darunter → Nutzer muss scrollen, um das Eingabefeld zu sehen
- **Folge:** Der Eindruck, als ob der Editor "abgeschnitten" ist (Nutzer sieht ihn erst nach Scroll)

#### 2.2 **Vergleich-Ansicht (Solution-Compare) ist unbrauchbar**

- Zwei Spalten à ~135px bei 375px Verfügbarkeit
- Zeilen brechen mehrfach um, sind nicht lesbar
- **Folge:** Der Eindruck von "unübersichtlich"

#### 2.3 **Touch-Targets zu klein (WCAG-Verstoß)**

- `.play-btn`: **20×20** (erwartet ≥24×24 AA, ≥44×44 HIG)
- `.sidebar-toggle-btn`: **22×22** (erwartet ≥24×24)
- **Folge:** Fehlgriffe, Frustration bei der Bedienung

#### 2.4 **Line-Numbers verschwenden Platz**

- 42px Margin-Left für Zeilennummern
- Auf 375px Gesamtbreite = 11,2% nur für Nummern
- Ohne Zeilennummern hätten wir ~333px für Code (13% mehr Lesbarkeit)
- **Folge:** Code-Zeilen sind zu eng, werden abgeschnitten, wenn die Anzeige zu schmal ist

#### 2.5 **Kein Read-and-Run-Optimierter Pfad**

- "Lösung in Editor" ist praktisch, aber nicht prominent
- Nutzer sollen theoretisch auch freies Schreiben können (vollwertige Authoring)
- In der Praxis: die Bildschirmtastatur ist frustrierend für SQL/Python-Syntax
- **Folge:** Nutzer verzweifeln am Tippen, nicht am Konzept

#### 2.6 **Ergebnis-Tabelle wird **unter** den Editor gequetscht**

- Bei Erfolg: Editor unten, Ergebnisse darunter
- Auf 375px scrollt Nutzer Ergebnisse gar nicht vs. Editor an
- Aus Nutzer-Perspektive: "Mein Code lief, aber ich sehe das Ergebnis nicht"

---

## Design-Richtungsfrage (blockiert aggressivere Optimierung)

Siehe `docs/mobile-roadmap.md` Abschnitt 0: **Read-and-Run vs. Full Authoring.**

Dieser Plan geht von **Read-and-Run als empfohlenem Pfad** aus, behält aber auch freies Schreiben als Option. Damit können wir:

1. **Sofort machen** (Layout, Touch-Targets, Typo-Skala): Profitiert beiden Modi
2. **Abwarten** (Tastatur-Toolbar, Snippets, Autovervollständigung): Nur nötig für Full Authoring

---

## Lösungsplan

### Phase 1: Sofort (keine Richtungs-Abhängigkeit)

#### 1.1 Touch-Targets vergrößern (WCAG-Compliance)

**Problem:** `.play-btn` (20×20) und `.sidebar-toggle-btn` (22×22) unterschreiten WCAG 24×24.

**Lösung:**

```css
/* Mobile breakpoint (max-width: 760px) */

.play-btn {
  /* Sichtbare Buttongröße bleibt gleich, aber Trefferfläche wächst */
  padding: 12px;      /* statt aktuell ~10px */
  /* oder: ::after-Pseudo-Overlay, Größe 24×24 */
  position: relative;
}

.play-btn::after {
  content: '';
  position: absolute;
  inset: -2px;        /* macht 24×24 aus 20×20 */
  pointer-events: none;
}

.sidebar-toggle-btn {
  padding: 11px;      /* statt aktuell ~10px */
}
```

**Test:** Playwright `locator('.play-btn').boundingBox()` ≥ 24×24.

---

#### 1.2 Line-Numbers auf Mobile verstecken

**Problem:** 42px Margin für Zeilennummern = 11% Breite verschwendet.

**Lösung:**

```css
@media (max-width: 760px) {
  .line-numbers {
    display: none;
  }
  
  textarea.editor {
    /* Kein Margin-Left mehr */
    margin-left: 0;
    /* Ausgleich: Padding statt Margin, damit Cursor nicht gegen Rand sitzt */
    padding-left: 8px;
  }
}
```

**Begründung:**
- Zeilennummern sind auf Mobile nicht nötig (viel kleinere Skripte, weniger Fehlerdiagnose per Zeile)
- Gibt Code ~13% mehr Breite, reduziert Umbrüche drastisch
- Cursor-Ausrichtung über Editor/Highlight bleibt intakt (beide kriegen gleiche `padding-left`)

**Test:** Bei einer 10-Zeilen-SQL-Abfrage mit `WITH RECURSIVE` — Text sollte ohne Umbruch passen (was aktuell nicht der Fall ist).

---

#### 1.3 Typography vergrößern (unter 760px)

**Problem:** Statuszeilen, Challenge-Nummern, Mode-Label sind auf 10–11px → wirkt "zu Desktop gemacht".

**Lösung:**

```css
@media (max-width: 760px) {
  .challenge-num    { font-size: 12px; }  /* statt 11px */
  .course-name      { font-size: 12px; }  /* statt 10px */
  .mode-btn         { font-size: 13px; }  /* statt 11px */
  .stars            { font-size: 12px; }  /* statt 10px */
  .reset-confirm-text { font-size: 13px; } /* statt 11px */
  
  /* Main labels erhöhen */
  .main-header h1   { font-size: 18px; }  /* statt aktuell ggf. 16px */
}
```

**Begründung:** 10–11px auf einem Telefon (in der Hand) ist spürbar klein; 12–13px bleibt lesbar und wirkt "für Mobile gemacht", nicht "Desktop gequetscht".

**Test:** Subjektive Lesbarkeit bei 20cm Lesedistanz auf echtem iPhone; keine automatisierter Test (reine Typografie).

---

### Phase 2: Read-and-Run-Optimierungen (falls Richtung entschieden: Read-and-Run)

#### 2.1 Compare-Ansicht stapeln (unter 760px)

**Problem:** Zwei Spalten à 135px nebeneinander = Text bricht mehrfach, unlesbar.

**Lösung:**

```css
@media (max-width: 760px) {
  .solution-compare-container {
    flex-direction: column;  /* statt row */
  }
  
  .solution-compare-column {
    width: 100%;  /* statt 50% */
    margin-bottom: 16px;
  }
}
```

**Begründung:** Unter Vollbreite lesen ist immer besser als Spalten-Umbruch.

**Test:** Playwright: `locator('.solution-compare-column:first-child').boundingBox().width` sollte ~350px sein (statt ~135px).

---

#### 2.2 "Lösung in Editor übernehmen" prominent platzieren

**Problem:** Der Button sitzt unter "Vorschau", ist aber das Einstiegs-UX für Read-and-Run.

**Lösung (nur wenn Read-and-Run Richtung):**

- Platzierung: Direkt neben/über dem Editor (statt unten in der Vergleich-Ansicht)
- Label: "Lösung laden" (oder kürzer: Icon + Tooltip)
- Mobile-spezifisch: Größer als andere Action-Buttons (kein WCAG-Problem, aber visueller Fokus)

---

#### 2.3 Editor-Panel auf Mobile Swap (Editor oben, Tutorial unten)

**Problem:** Tutorial ist wichtiger (Tutorial lesen → Aufgabe verstehen → Editor laden), aber Editor kommt zuerst im Scroll-Order.

**Lösung (nur wenn Read-and-Run Richtung):**

```css
@media (max-width: 760px) {
  .main {
    display: flex;
    flex-direction: column-reverse;  /* Editor oben, Tutorial unten */
  }
  
  /* oder mit CSS Grid und grid-row */
  .main {
    display: grid;
    grid-template-rows: auto 1fr;
  }
  
  .editor-section  { grid-row: 1; }
  .tutorial-section { grid-row: 2; }
}
```

**Begründung:** Lessees sieht zuerst das Eingabefeld, nicht den Tutorial-Text, der Eindruck ist "Editor ist prominent, Tutorial ist versteckt". Swap verbessert das Gefühl, dass Tutorial das Zentrum ist.

**Aber:** Das erfordert sicherzustellen, dass Mobile-Nutzern es üblich ist, nach unten zu scrollen. Nicht alle UX-Handbücher empfehlen das. Sollte mit Live-Nutzer-Tests validiert werden.

---

### Phase 3: Full-Authoring Unterstützung (blockiert auf Richtungsentscheidung)

Falls Full Authoring gewählt wird:

#### 3.1 Bildschirmtastatur-Toolbar

- Schnellzugriff für Symbole: `_ * ( ) " ' ; % |`
- Buttons über/unter dem Editor
- Große Projekt (eigenes Ticket)

#### 3.2 SQL-Snippets

- "SELECT * FROM" Vorlage
- "INSERT INTO" Vorlage
- Etc.

#### 3.3 Auto-Vervollständigung

- Spaltennamen-Suggestions
- Python-Builtin-Funktionen
- Große Projekt

---

## Implementierungs-Reihenfolge

1. **Sprint A (sofort, Low-Risk):**
   - 1.1 Touch-Targets (WCAG-Compliance)
   - 1.2 Line-Numbers verstecken
   - 1.3 Typography vergrößern
   - **Tests:** Playwright Mobile-Lauf (375×667), kein Unit-Test nötig (CSS)
   - **Ergebnis:** Bedienung wird besser, Code-Lesbarkeitsteigt, Eindruck "für Mobile gemacht" sinkt

2. **Sprint B (abhängig von Richtungsentscheidung):**
   - Wenn Read-and-Run: 2.1 (Compare stapeln) + 2.2 (Lösung-Button) + 2.3 (Editor-Swap)
   - Wenn Full-Authoring: 3.x verzögert, Richtung klären zuerst

---

## Versuchsplan und Validierung

### Lokal testen

```bash
# Dev-Server bei Mobile-Breite öffnen
npm run dev
# Browser: F12 → Toggle Device Toolbar → iPhone SE (375×667)
# Live-Änderungen: Spielen mit CSS, Screenshot vor/nach
```

### Playwright-Regression

```bash
# Nach Sprint A: Playwright-Lauf mit Mobile-Viewport
npx playwright test examples/playwright.mjs --headed
# Prüfen: horizontales Overflow (scrollWidth ≤ clientWidth), keine Verdeckung, Buttons klickbar
```

### Metriken

| Metrik | Baseline | Ziel | Test-Methode |
|---|---|---|---|
| `.play-btn` Größe | 20×20 | ≥24×24 | `boundingBox()` |
| Effective Code-Width | ~333px | ~375px | Messlineal in Dev-Tools |
| Touch-Fehler-Rate | Subjektiv hoch | Gering | Nutzer-Testing (manuell) |
| Compare-Lesbarkeit | Mehrfach-Umbruch | Vollbreite | Visuell |

---

## Bekannte Unsicherheiten und Open Questions

1. **Read-and-Run vs. Full Authoring:** Blockiert strategische Phase 2–3 Punkte
2. **Editor-Swap (Punkt 2.3):** Könnte gegen Mobile-UX-Norm verstößen; sollte mit echten Nutzern validiert werden
3. **Line-Numbers komplett verstecken:** Einige Nutzer mögen Zeilennummern zur Fehlerdiagnose; Alternativpfad unbekannt
4. **Typography-Größen:** 12–13px ist ein Schätzwert; echtes Auge auf Gerät vor Finalisierung nötig

---

## Nächste Schritte

1. **Diese Plan reviewen** — Feedback von Nutzern oder UX-Team
2. **Richtungsfrage klären** (Read-and-Run ja/nein) — blockiert Punkt 2/3
3. **Sprint A implementieren** — sofort machbar, Low-Risk
4. **Live-Playwright-Lauf** → Mobile (375×667) testen
5. **Sprint B planen** — wenn Richtung klar ist

---

## Ergänzung: Nicht-Änderungen (bewusst ausgenommen)

Siehe auch `docs/mobile-roadmap.md` Abschnitt 3:

- **Bildschirmtastatur-Symbolleiste:** Großes Projekt, wartend auf Richtungsfrage
- **Offline-PWA:** Widerspreitet Single-File-Modell
- **Landscape-Layouts:** Erst sinnvoll, wenn Portrait steht
- **Tablet (760–1024px):** Kein gemessener Schaden, "Just Works" als Desktop aktuell

