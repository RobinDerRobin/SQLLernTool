import type { SqlChallenge } from '../../../types';

export const challenge4_2: SqlChallenge = {
  num: '4.2',
  title: 'Modulo verstehen: Werte in einen Bereich einklemmen',
  tutorial: `Der Modulo-Operator <code>%</code> gibt den Rest einer Ganzzahl-Division zurück — <code>n % 5</code> ergibt immer einen Wert zwischen 0 und 4, egal wie groß n ist, und wiederholt sich zyklisch: 0,1,2,3,4,0,1,2,... Das lässt sich an einer normalen Zahlenreihe gut beobachten, bevor man es auf Zufallswerte anwendet — dort sieht man das Muster nicht mehr direkt, weil die Eingabe selbst schon zufällig ist.`,
  task: `Letzter Baustein vor Kapitel 5: Dort wird RANDOM() über Modulo auf einen Bereich begrenzt — hier siehst du erstmal an nachvollziehbaren, festen Zahlen, wie Modulo sich verhält.<br><br><b>Deine Aufgabe:</b> Erzeuge über eine Zahlenreihe (CTE) die Werte 1 bis 20, und berechne für jede Zeile zusätzlich <code>n % 5</code> in einer zweiten Spalte.`,
  hints: [
    `Die CTE bleibt wie gewohnt — nur die SELECT-Liste bekommt eine zweite Spalte mit <code>n % 5</code>.`,
    `Beobachte das Ergebnis: Die zweite Spalte wiederholt sich alle 5 Zeilen (0,1,2,3,4,0,1,...).`,
    `So sieht die Lösung aus:<pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM seq WHERE n < 20\n)\nSELECT n, n % 5 AS rest FROM seq;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 20
)
SELECT n, n % 5 AS rest FROM seq;`,
  syntaxExplanation: `<ul><li><code>n % 5</code> — der Modulo-Operator liefert den Rest der Ganzzahldivision von n durch 5.</li><li>Das Ergebnis wiederholt sich dadurch zyklisch: 0, 1, 2, 3, 4, 0, 1, ...</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 20 Zeilen enthalten, wobei die zweite Spalte für jede Zeile exakt n % 5 entspricht.`,
  extra: {
    pg: `Der %-Operator funktioniert in Postgres identisch als Modulo.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const values = lastResult.values;
    if (values.length !== 20) return { ok: false, message: `Es sind ${values.length} Zeile(n) — erwartet werden genau 20.` };
    for (const row of values) {
      const n = Number(row[0]);
      const rest = Number(row[1]);
      if (rest !== n % 5) return { ok: false, message: `Für n=${row[0]} sollte der Rest ${n % 5} sein, ist aber ${row[1]}.` };
    }
    const firstCol = values.map((r) => Number(r[0])).sort((a, b) => a - b);
    const expected = Array.from({ length: 20 }, (_, i) => i + 1);
    if (!expected.every((v, i) => firstCol[i] === v)) {
      return { ok: false, message: `Die erste Spalte sollte genau die Zahlen 1 bis 20 enthalten, ist aber ${firstCol.join(', ')}.` };
    }
    return { ok: true, message: 'Modulo für alle 20 Zeilen korrekt berechnet.' };
  },
  distractors: [
    {
      code: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 20
)
SELECT 1 AS n, 1 % 5 AS rest FROM seq;`,
      reason: 'jede Zeile erfüllt rest = n % 5 (weil n konstant 1 ist), aber n deckt nie die Werte 2–20 ab',
    },
  ],
};
