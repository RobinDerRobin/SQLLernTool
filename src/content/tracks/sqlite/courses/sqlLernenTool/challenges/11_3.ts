import type { SqlChallenge } from '../../../types';

export const challenge11_3: SqlChallenge = {
  num: '11.3',
  title: 'Weitere Aggregatfunktionen: SUM, AVG, MIN, MAX',
  tutorial: `<code>COUNT</code> ist nur eine von mehreren <b>Aggregatfunktionen</b> — Funktionen, die viele Zeilen zu einem einzigen Wert zusammenfassen. <code>SUM(spalte)</code> addiert alle Werte, <code>AVG(spalte)</code> berechnet den Durchschnitt, <code>MIN(spalte)</code>/<code>MAX(spalte)</code> finden den kleinsten bzw. größten Wert: <pre>SELECT SUM(betrag), AVG(betrag), MIN(betrag), MAX(betrag)
FROM bestellungen;</pre>Alle vier lassen sich beliebig kombinieren und, genau wie COUNT, auch mit <code>GROUP BY</code> verwenden, um sie pro Gruppe statt für die ganze Tabelle zu berechnen.`,
  task: `Eine einzelne Zahl — die Gesamtsumme aller Bestellungen, der teuerste Einkauf, der durchschnittliche Bestellwert — ist oft aussagekräftiger als hunderte Einzelzeilen. Diese vier Funktionen sind das Standardwerkzeug, um aus vielen Zeilen genau diese eine Kennzahl zu gewinnen.<br><br><b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (5 Zeilen mit Beträgen) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Berechne mit einer einzigen Query Summe, Durchschnitt, kleinsten und größten Betrag aus <b>bestellungen</b> — als eine einzige Ergebniszeile mit vier Spalten.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, betrag INTEGER);
INSERT INTO bestellungen VALUES (1,50),(2,120),(3,30),(4,200),(5,100);`,
  hints: [
    `Alle vier Funktionen lassen sich in einer einzigen SELECT-Liste kombinieren, durch Komma getrennt.`,
    `<code>SUM(betrag)</code>, <code>AVG(betrag)</code>, <code>MIN(betrag)</code>, <code>MAX(betrag)</code> — jede nimmt die gleiche Spalte als Argument.`,
    `So sieht die Lösung aus:<pre>SELECT SUM(betrag) AS gesamt, AVG(betrag) AS durchschnitt, MIN(betrag) AS minimum, MAX(betrag) AS maximum
FROM bestellungen;</pre>`,
  ] as const,
  solution: `SELECT SUM(betrag) AS gesamt, AVG(betrag) AS durchschnitt, MIN(betrag) AS minimum, MAX(betrag) AS maximum
FROM bestellungen;`,
  syntaxExplanation: `<ul><li><code>SUM(betrag)</code> — Summe aller Beträge (500).</li><li><code>AVG(betrag)</code> — Durchschnitt (100).</li><li><code>MIN(betrag)</code> / <code>MAX(betrag)</code> — kleinster (30) und größter (200) Betrag.</li><li>Alle vier zusammen ergeben genau eine Ergebniszeile mit vier Spalten.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau eine Zeile mit Summe 500, Durchschnitt 100, Minimum 30 und Maximum 200 enthalten.`,
  extra: {
    pg: `Identisch in Postgres — SUM/AVG/MIN/MAX sind Standard-SQL-Aggregatfunktionen.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values.length) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const row = lastResult.values[0] ?? [];
    const [sum, avg, min, max] = row.map((v) => Number(v));
    if (row.length !== 4) return { ok: false, message: `Es werden 4 Spalten erwartet (Summe, Durchschnitt, Min, Max) — gefunden: ${row.length}.` };
    if (sum !== 500) return { ok: false, message: `Summe ist ${sum}, erwartet wird 500.` };
    if (avg !== 100) return { ok: false, message: `Durchschnitt ist ${avg}, erwartet wird 100.` };
    if (min !== 30) return { ok: false, message: `Minimum ist ${min}, erwartet wird 30.` };
    if (max !== 200) return { ok: false, message: `Maximum ist ${max}, erwartet wird 200.` };
    return { ok: true, message: 'Alle vier Aggregatwerte korrekt berechnet.' };
  },
};
