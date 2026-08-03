import type { SqlChallenge } from '../../../types';

export const challenge4_1: SqlChallenge = {
  num: '4.1',
  title: 'Rekursive CTE kombiniert mit RANDOM()',
  tutorial: `Die SELECT-Liste einer rekursiven CTE ist nicht auf die Zähl-Spalte beschränkt — du kannst beliebige weitere Ausdrücke ergänzen, auch Funktionen wie <code>RANDOM()</code>: <pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM seq WHERE n < 5\n)\nSELECT n, RANDOM() AS wert FROM seq;</pre>Das erzeugt 5 Zeilen mit laufender Nummer und je einem eigenen, noch unbegrenzten Zufallswert.`,
  task: `Vorbereitung auf Kapitel 5: Dort wird der Zufallswert noch auf einen festen Bereich begrenzt — hier übst du erstmal, RANDOM() überhaupt in eine bestehende CTE-Struktur einzubauen.<br><br><b>Deine Aufgabe:</b> Erzeuge über eine rekursive CTE 10 Zeilen mit einer laufenden Nummer und einem zweiten, unbegrenzten Zufallswert aus RANDOM().`,
  hints: [
    `Die CTE selbst bleibt exakt wie bei der Zahlenreihe aus Kapitel 3 — nur die SELECT-Liste danach bekommt eine zweite Spalte.`,
    `RANDOM() kannst du direkt mit in die SELECT-Liste schreiben, ganz ohne ABS() oder Modulo — das kommt erst in Kapitel 5.`,
    `So sieht die Lösung aus:<pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM seq WHERE n < 10\n)\nSELECT n, RANDOM() AS wert FROM seq;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 10
)
SELECT n, RANDOM() AS wert FROM seq;`,
  syntaxExplanation: `<ul><li>Die CTE <code>seq(n)</code> ist identisch zur Zahlenreihe aus Kapitel 3.</li><li><code>SELECT n, RANDOM() AS wert FROM seq;</code> — die zweite Spalte mit dem Zufallswert ist unabhängig von der CTE-Logik, einfach mit in die SELECT-Liste geschrieben.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 10 Zeilen mit zwei Spalten liefern: die Zahlen 1–10 sowie eine zweite Spalte mit unterschiedlichen Zufallswerten.`,
  // nondeterministic: RANDOM() drives the second column; validated below via
  // variation rather than an exact value, but still re-run 10x by the
  // challenge-runner suite per challenge-anforderungen.md section 10.
  nondeterministic: true,
  extra: {
    pg: `RANDOM() liefert in Postgres direkt einen Float zwischen 0.0 und 1.0 — ein unbegrenzter Roh-Zufallswert ist dort also schon eine Kommazahl statt einer großen Ganzzahl.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const values = lastResult.values;
    if (values.length !== 10) return { ok: false, message: `Es sind ${values.length} Zeile(n) — erwartet werden genau 10.` };
    if (!lastResult.columns || lastResult.columns.length < 2) {
      return { ok: false, message: 'Es werden zwei Spalten erwartet: laufende Nummer und Zufallswert.' };
    }
    const firstCol = values.map((r) => Number(r[0])).sort((a, b) => a - b);
    const expectedFirst = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (!expectedFirst.every((v, i) => firstCol[i] === v)) {
      return { ok: false, message: 'Die erste Spalte sollte genau die Zahlen 1 bis 10 enthalten.' };
    }
    const uniqueCount = new Set(values.map((r) => String(r[1]))).size;
    if (uniqueCount < 2) return { ok: false, message: 'Die zweite Spalte sieht nicht zufällig aus (zu wenig Variation).' };
    return { ok: true, message: '10 Zeilen mit laufender Nummer und Zufallswert erzeugt.' };
  },
};
