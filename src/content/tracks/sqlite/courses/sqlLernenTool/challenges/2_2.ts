import type { SqlChallenge } from '../../../types';

export const challenge2_2: SqlChallenge = {
  num: '2.2',
  title: 'Ergebnisse kombinieren mit UNION ALL',
  tutorial: `<code>UNION ALL</code> hängt die Zeilen mehrerer SELECT-Abfragen aneinander — jede einzelne kann sogar ganz ohne FROM einen reinen Literalwert liefern: <pre>SELECT 1 AS n\nUNION ALL\nSELECT 2\nUNION ALL\nSELECT 3;</pre>Das ergibt drei Zeilen mit den Werten 1, 2, 3. Anders als <code>UNION</code> (ohne ALL) entfernt UNION ALL keine Duplikate — das macht es schneller und ist genau das, was eine rekursive CTE gleich in Challenge 3 zwischen Anker und rekursivem Teil braucht.`,
  task: `Zweiter und letzter Baustein vor Challenge 3: Dort verbindet <code>UNION ALL</code> den Start-Wert (Anker) mit dem Teil, der sich wiederholt. Hier übst du UNION ALL einmal ganz für sich allein, ohne Rekursion, ohne Tabelle.<br><br><b>Deine Aufgabe:</b> Erzeuge per UNION ALL eine Ergebnisliste mit genau den Werten 1, 2, 3, 4 und 5 in einer Spalte — fünf einzelne SELECT-Anweisungen, durch UNION ALL verbunden.`,
  hints: [
    `Jedes einzelne SELECT braucht kein FROM — <code>SELECT 1</code> ist als eigenständige Query gültig.`,
    `UNION ALL steht zwischen je zwei SELECTs, nicht am Ende: <code>SELECT ... UNION ALL SELECT ... UNION ALL SELECT ...</code>`,
    `So sieht die komplette Lösung aus:<pre>SELECT 1 AS n\nUNION ALL SELECT 2\nUNION ALL SELECT 3\nUNION ALL SELECT 4\nUNION ALL SELECT 5;</pre>`,
  ] as const,
  solution: `SELECT 1 AS n
UNION ALL SELECT 2
UNION ALL SELECT 3
UNION ALL SELECT 4
UNION ALL SELECT 5;`,
  syntaxExplanation: `<ul><li><code>SELECT 1 AS n</code> — ein einzelner Literalwert, ganz ohne FROM gültig.</li><li><code>UNION ALL</code> — hängt die Ergebnisse mehrerer SELECTs aneinander, ohne Duplikate zu entfernen (schneller als UNION).</li></ul>`,
  successCriteria: `Das letzte SELECT-Ergebnis muss genau 5 Zeilen mit den Werten 1, 2, 3, 4 und 5 (in irgendeiner Spalte) enthalten.`,
  extra: {
    pg: `Identisch in Postgres — UNION ALL ist Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const values = lastResult.values.map((row) => Number(row[0])).sort((a, b) => a - b);
    const expected = [1, 2, 3, 4, 5];
    if (values.length !== 5) return { ok: false, message: `Es sind ${values.length} Zeile(n) — erwartet werden genau 5.` };
    const matches = expected.every((v, idx) => values[idx] === v);
    if (!matches) return { ok: false, message: `Werte sind ${values.join(', ')} — erwartet werden genau 1, 2, 3, 4, 5.` };
    return { ok: true, message: 'Genau die Werte 1 bis 5 per UNION ALL erzeugt.' };
  },
};
