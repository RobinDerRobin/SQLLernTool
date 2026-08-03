import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge03: SqlChallenge = {
  num: '03',
  title: 'Zahlenreihe erzeugen',
  tutorial: `Neues Konzept: Eine <b>CTE</b> ('Common Table Expression', geschrieben als <code>WITH name AS (...)</code>) ist eine temporäre, benannte Zwischen-Query — du gibst einer SELECT-Abfrage einen Namen, den du danach wie eine Tabelle verwenden kannst. Eine <b>rekursive</b> CTE (<code>WITH RECURSIVE</code>) darf sich dabei sogar selbst referenzieren, ähnlich wie eine Schleife in einer Programmiersprache. Sie besteht immer aus zwei Teilen, verbunden durch <code>UNION ALL</code>: einem <b>Anker</b> (der Startwert, läuft nur einmal) und einem <b>rekursiven Teil</b>, der sich selbst aufruft und dabei etwas verändert — bis eine <code>WHERE</code>-Bedingung nicht mehr zutrifft und die Wiederholung stoppt: <pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1                              -- Anker: Start bei 1\n  UNION ALL\n  SELECT n + 1 FROM seq WHERE n < 5     -- wiederholt sich, bis n = 5\n)\nSELECT * FROM seq;</pre>Das ergibt die Zahlen 1 bis 5. Ohne die WHERE-Bedingung würde das endlos weiterlaufen. In Postgres gibt es für genau diesen Zweck zusätzlich die eingebaute Funktion GENERATE_SERIES(start, ende) als Abkürzung.`,
  task: `In echten Projekten brauchst du oft mehr Testdaten, als du von Hand tippen willst — 100, 1000 oder mehr Zeilen. Die Technik, die du hier lernst (eine ‚rekursive CTE', die sich selbst hochzählt), ist dafür die Grundlage: Sie erzeugt beliebig viele Zahlen auf einmal, die du später als IDs, Testdaten oder Zähler weiterverwenden kannst.<br><br><b>Deine Aufgabe:</b> Erzeuge 100 Zeilen mit Zahlen 1–100 in einer Tabelle <b>numbers</b> — hier über eine rekursive CTE (SQLite kennt GENERATE_SERIES nicht als Tabellenfunktion).`,
  hints: [
    `Eine rekursive CTE beginnt mit <code>WITH RECURSIVE name(spalte) AS (...)</code>.`,
    `Der Ankerteil (erster SELECT vor UNION ALL) startet bei 1, der rekursive Teil zählt hoch, bis die WHERE-Bedingung nicht mehr zutrifft — hier also bis n < 100.`,
    `So sieht die CTE aus:<pre>WITH RECURSIVE seq(n) AS (\n  SELECT 1\n  UNION ALL\n  SELECT n + 1 FROM seq WHERE n < 100\n)\nINSERT INTO numbers SELECT n FROM seq;</pre>`,
  ] as const,
  solution: `CREATE TABLE numbers (n INTEGER);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 100
)
INSERT INTO numbers SELECT n FROM seq;

SELECT * FROM numbers LIMIT 10;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE numbers (n INTEGER);</code> — die Zieltabelle für die erzeugten Werte.</li><li><code>WITH RECURSIVE seq(n) AS (Anker UNION ALL rekursiver Teil)</code> — der Anker startet bei 1, der rekursive Teil zählt hoch, bis <code>WHERE n &lt; 100</code> nicht mehr zutrifft.</li><li><code>INSERT INTO numbers SELECT n FROM seq;</code> — überträgt das CTE-Ergebnis in die Tabelle.</li></ul>`,
  successCriteria: `Die Tabelle <b>numbers</b> muss genau 100 Zeilen enthalten, mit Werten von genau 1 bis 100 (kein Wert darunter oder darüber).`,
  extra: {
    pg: `In echtem Postgres reicht eine Zeile:\n\nINSERT INTO numbers\nSELECT * FROM GENERATE_SERIES(1, 100);`,
  },
  validate: (engine) => {
    try {
      const res = engine.exec('SELECT * FROM numbers');
      if (!res.length || !res[0]?.values.length) return { ok: false, message: 'numbers ist leer — erwartet 100 Zeilen von 1–100.' };
      const nums = res[0].values.map((row) => Number(row[0]));
      const count = nums.length;
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      if (count === 100 && min === 1 && max === 100) return { ok: true, message: 'numbers enthält genau die Zahlen 1–100.' };
      return { ok: false, message: `numbers hat ${count} Zeile(n) (min ${min}, max ${max}) — erwartet 100 Zeilen von 1–100.` };
    } catch (e) {
      if (!tableExists(engine, 'numbers')) return { ok: false, message: 'Tabelle numbers wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle numbers existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
