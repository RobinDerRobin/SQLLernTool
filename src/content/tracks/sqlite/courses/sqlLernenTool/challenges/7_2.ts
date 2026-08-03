import type { SqlChallenge } from '../../../types';

export const challenge7_2: SqlChallenge = {
  num: '7.2',
  title: 'Feste Zuordnung mit CASE',
  tutorial: `<code>CASE</code> ordnet einem Wert je nach Fall ein Ergebnis zu. Es gibt zwei Schreibweisen; hier lernst du die <b>Gleichheits-Form</b>, bei der der zu prüfende Ausdruck direkt hinter CASE steht: <pre>CASE spalte\n  WHEN 0 THEN 'null'\n  WHEN 1 THEN 'eins'\n  ELSE 'etwas anderes'\nEND</pre>Jedes WHEN nennt nur noch den Vergleichswert — SQL prüft von oben nach unten auf Gleichheit und nimmt den ersten Treffer; <code>ELSE</code> fängt alle übrigen Fälle ab. Genau diese Form kommt gleich in Kapitel 8 zum Einsatz, um zufällig einen von mehreren Ländercodes zuzuweisen. (Die zweite Schreibweise mit Bedingungen statt Werten lernst du später in 8.2 kennen.)`,
  task: `Zweiter Baustein vor Kapitel 8: Dort weist ein CASE anhand einer Zufallszahl einen von drei Ländercodes zu. Damit du das Muster ohne Zufall verstehst, ordnest du hier feste Zahlen festen Texten zu — mit exakt derselben Schreibweise.<br><br><b>Deine Aufgabe:</b> Erzeuge über eine CTE die Zahlen 1 bis 6 und ordne jeder Zahl in einer zweiten Spalte namens <b>wort</b> einen Text zu: 1 = 'eins', 2 = 'zwei', 3 = 'drei', alles andere = 'viele'.`,
  hints: [
    `Die Zahlenreihe erzeugst du wie gewohnt mit einer rekursiven CTE bis 6.`,
    `Bei der Gleichheits-Form steht die zu prüfende Spalte direkt hinter CASE, jedes WHEN nennt nur den Wert: <code>CASE n WHEN 1 THEN 'eins' ... END</code>.`,
    `So sieht die Lösung aus:<pre>SELECT n,\n  CASE n\n    WHEN 1 THEN 'eins'\n    WHEN 2 THEN 'zwei'\n    WHEN 3 THEN 'drei'\n    ELSE 'viele'\n  END AS wort\nFROM seq;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 6
)
SELECT n,
  CASE n
    WHEN 1 THEN 'eins'
    WHEN 2 THEN 'zwei'
    WHEN 3 THEN 'drei'
    ELSE 'viele'
  END AS wort
FROM seq;`,
  syntaxExplanation: `<ul><li>Die CTE <code>seq(n)</code> liefert die Zahlen 1 bis 6.</li><li><code>CASE n WHEN 1 THEN ...</code> — der Prüfwert steht einmal hinter CASE, jedes WHEN nennt nur noch den Vergleichswert.</li><li><code>ELSE 'viele'</code> — fängt alle Zahlen ab, für die es kein eigenes WHEN gibt (hier 4, 5 und 6).</li><li><code>AS wort</code> benennt die berechnete Spalte.</li></ul>`,
  successCriteria: `Das Ergebnis muss 6 Zeilen enthalten, wobei 1, 2 und 3 auf 'eins', 'zwei' und 'drei' abgebildet sind und 4 bis 6 auf 'viele'.`,
  extra: {
    pg: `CASE funktioniert in Postgres identisch — beide Schreibweisen sind Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 6) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 6.` };
    const map: Record<number, string> = { 1: 'eins', 2: 'zwei', 3: 'drei' };
    for (const row of vals) {
      const n = Number(row[0]);
      const label = String(row[1]);
      const expected = map[n] || 'viele';
      if (label !== expected) return { ok: false, message: `Für n=${n} steht "${label}", erwartet wird "${expected}".` };
    }
    return { ok: true, message: 'Alle 6 Zuordnungen korrekt.' };
  },
};
