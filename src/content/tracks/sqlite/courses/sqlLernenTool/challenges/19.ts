import type { SqlChallenge } from '../../../types';

export const challenge19: SqlChallenge = {
  num: '19',
  title: 'Mehrere CTEs hintereinander',
  tutorial: `Eine CTE kann auf einer anderen aufbauen — du schreibst dafür einfach mehrere <code>WITH</code>-Blöcke, durch Komma getrennt, bevor die eigentliche Abfrage kommt: <pre>WITH erste_cte AS (
  ...
),
zweite_cte AS (
  SELECT ... FROM erste_cte ...
)
SELECT ... FROM zweite_cte;</pre>Jede CTE sieht dabei alle vorher definierten CTEs, so wie eine Tabelle. Das erlaubt, eine komplizierte Frage in kleine, benannte Zwischenschritte zu zerlegen, statt eine einzige verschachtelte Subquery zu schreiben.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, abteilung, gehalt) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Finde alle Mitarbeiter, die <b>mehr verdienen als der Durchschnitt ihrer eigenen Abteilung</b>. Baue dafür zwei CTEs hintereinander: Die erste (<code>abteilung_avg</code>) berechnet den Durchschnittsgehalt je Abteilung, die zweite (<code>top_verdiener</code>) nutzt diesen Durchschnitt, um die Mitarbeiter darüber herauszufiltern. Gib <code>name</code>, <code>abteilung</code> und <code>gehalt</code> aus, sortiert nach <code>name</code>.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, abteilung TEXT, gehalt INTEGER);
INSERT INTO mitarbeiter VALUES (1,'Anna','Vertrieb',3000),(2,'Ben','IT',4500),(3,'Clara','IT',4000),(4,'David','Vertrieb',3200),(5,'Eva','IT',3800),(6,'Frank','Vertrieb',2900);`,
  hints: [
    `Die erste CTE ist eine ganz normale <code>GROUP BY</code>-Abfrage: <code>SELECT abteilung, AVG(gehalt) AS durchschnitt FROM mitarbeiter GROUP BY abteilung</code>.`,
    `Die zweite CTE joint <code>mitarbeiter</code> mit der ersten CTE über <code>abteilung</code> und filtert mit <code>WHERE m.gehalt > a.durchschnitt</code> — genau wie ein Join mit einer echten Tabelle.`,
    `So sieht die Lösung aus:<pre>WITH abteilung_avg AS (
  SELECT abteilung, AVG(gehalt) AS durchschnitt FROM mitarbeiter GROUP BY abteilung
),
top_verdiener AS (
  SELECT m.name, m.abteilung, m.gehalt
  FROM mitarbeiter m
  JOIN abteilung_avg a ON m.abteilung = a.abteilung
  WHERE m.gehalt > a.durchschnitt
)
SELECT name, abteilung, gehalt FROM top_verdiener ORDER BY name;</pre>`,
  ] as const,
  solution: `WITH abteilung_avg AS (
  SELECT abteilung, AVG(gehalt) AS durchschnitt FROM mitarbeiter GROUP BY abteilung
),
top_verdiener AS (
  SELECT m.name, m.abteilung, m.gehalt
  FROM mitarbeiter m
  JOIN abteilung_avg a ON m.abteilung = a.abteilung
  WHERE m.gehalt > a.durchschnitt
)
SELECT name, abteilung, gehalt FROM top_verdiener ORDER BY name;`,
  syntaxExplanation: `<ul><li><code>WITH abteilung_avg AS (...), top_verdiener AS (...)</code> — zwei CTEs, durch Komma getrennt; die zweite darf die erste wie eine Tabelle verwenden.</li><li><code>JOIN abteilung_avg a ON m.abteilung = a.abteilung</code> — verknüpft jeden Mitarbeiter mit dem Durchschnitt seiner eigenen Abteilung.</li><li><code>WHERE m.gehalt > a.durchschnitt</code> — der eigentliche Vergleich, erst durch die Verkettung der beiden CTEs möglich.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Mitarbeiter enthalten, deren Gehalt über dem Durchschnitt ihrer eigenen Abteilung liegt (nicht über dem Gesamtdurchschnitt aller Mitarbeiter) — mit den Spalten name, abteilung, gehalt, sortiert nach name.`,
  extra: {
    pg: `Identisch in Postgres — mehrere durch Komma getrennte CTEs in einem WITH sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [string, string, number][];
    try {
      const rows =
        engine.exec(
          `SELECT name, abteilung, gehalt FROM mitarbeiter m1
           WHERE gehalt > (SELECT AVG(gehalt) FROM mitarbeiter m2 WHERE m2.abteilung = m1.abteilung)
           ORDER BY name`,
        )[0]?.values ?? [];
      expected = rows.map((row) => [String(row?.[0]), String(row?.[1]), Number(row?.[2])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const nameIdx = cols.indexOf('name');
    const abtIdx = cols.indexOf('abteilung');
    const gehaltIdx = cols.indexOf('gehalt');
    if (nameIdx === -1 || abtIdx === -1 || gehaltIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden name, abteilung, gehalt.` };
    }
    const actual = lastResult.values.map((row) => [String(row[nameIdx]), String(row[abtIdx]), Number(row[gehaltIdx])]);
    const sameRow = (a: [string, string, number], b: [string, string, number]) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    if (actual.length !== expected.length || actual.some((row, i) => !sameRow(row as [string, string, number], expected[i]!))) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die Mitarbeiter über ihrem Abteilungsdurchschnitt: ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: ${expected.length} Mitarbeiter verdienen mehr als der Durchschnitt ihrer eigenen Abteilung.` };
  },
  distractors: [
    {
      code: `WITH gesamt_avg AS (
  SELECT AVG(gehalt) AS durchschnitt FROM mitarbeiter
)
SELECT m.name, m.abteilung, m.gehalt
FROM mitarbeiter m, gesamt_avg a
WHERE m.gehalt > a.durchschnitt
ORDER BY m.name;`,
      reason: 'vergleicht mit dem Gesamtdurchschnitt aller Mitarbeiter statt mit dem Durchschnitt der eigenen Abteilung — liefert Ben, Clara und Eva (alle aus der besser bezahlten IT-Abteilung) statt der korrekten Ben und David',
    },
  ],
};
