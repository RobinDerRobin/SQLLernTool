import type { SqlChallenge } from '../../../types';

export const challenge8_2: SqlChallenge = {
  num: '8.2',
  title: 'CASE mit Wertebereichen',
  tutorial: `Statt auf Gleichheit zu prüfen, kann ein CASE auch Bereiche abdecken — mit Vergleichsoperatoren wie <code>&lt;</code> oder <code>&gt;=</code>: <pre>CASE\n  WHEN wert &lt; 8 THEN 'niedrig'\n  WHEN wert &lt; 15 THEN 'mittel'\n  ELSE 'hoch'\nEND</pre>Wichtig ist die Reihenfolge: Da von oben nach unten geprüft wird und der erste Treffer gewinnt, muss der zweite Zweig nur noch 'ab 8' abdecken — die Fälle unter 8 sind ja schon abgefangen. Genau dieses Prinzip macht in Kapitel 9 die gewichtete Zufallsverteilung möglich.`,
  task: `Letzter Baustein vor Kapitel 9: Dort bestimmen Zahlenbereiche, wie wahrscheinlich ein Status ist. Hier siehst du das Bereichs-Prinzip an festen, nachvollziehbaren Zahlen.<br><br><b>Deine Aufgabe:</b> Erzeuge die Zahlen 1 bis 20 und ordne jeder in einer zweiten Spalte eine Kategorie zu: unter 8 = 'niedrig', ab 8 und unter 15 = 'mittel', ab 15 = 'hoch'.`,
  hints: [
    `Die Zahlenreihe entsteht wie gewohnt über eine rekursive CTE bis 20.`,
    `Weil der erste zutreffende Zweig gewinnt, reicht im zweiten Zweig die Bedingung <code>n &lt; 15</code> — Werte unter 8 sind schon abgefangen.`,
    `So sieht der CASE aus:<pre>CASE\n  WHEN n &lt; 8 THEN 'niedrig'\n  WHEN n &lt; 15 THEN 'mittel'\n  ELSE 'hoch'\nEND</pre>`,
  ] as const,
  solution: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 20
)
SELECT n,
  CASE
    WHEN n < 8 THEN 'niedrig'
    WHEN n < 15 THEN 'mittel'
    ELSE 'hoch'
  END AS kategorie
FROM seq;`,
  syntaxExplanation: `<ul><li>Die CTE liefert die Zahlen 1 bis 20.</li><li><code>WHEN n &lt; 8</code> / <code>WHEN n &lt; 15</code> — Bereiche statt Gleichheit; da der erste Treffer gewinnt, deckt der zweite Zweig automatisch nur noch 8 bis 14 ab.</li><li><code>ELSE 'hoch'</code> — fängt alle übrigen Werte (ab 15) ab.</li></ul>`,
  successCriteria: `Das Ergebnis muss 20 Zeilen enthalten, korrekt eingeteilt in 'niedrig' (1–7), 'mittel' (8–14) und 'hoch' (15–20).`,
  extra: {
    pg: `Identisch in Postgres — CASE mit Vergleichsoperatoren ist Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 20) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 20.` };
    for (const row of vals) {
      const n = Number(row[0]);
      const label = String(row[1]);
      const expected = n < 8 ? 'niedrig' : n < 15 ? 'mittel' : 'hoch';
      if (label !== expected) return { ok: false, message: `Für n=${n} steht "${label}", erwartet wird "${expected}".` };
    }
    return { ok: true, message: 'Alle 20 Zeilen korrekt kategorisiert.' };
  },
};
