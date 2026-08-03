import type { SqlChallenge } from '../../../types';

export const challenge9_1: SqlChallenge = {
  num: '9.1',
  title: 'Rangliste bauen: GROUP BY, ORDER BY und LIMIT',
  tutorial: `Drei Bausteine ergeben zusammen eine Rangliste: <code>GROUP BY</code> fasst Zeilen zu Gruppen zusammen (siehe 8.1), <code>ORDER BY ... DESC</code> sortiert absteigend (größte Werte zuerst), und <code>LIMIT n</code> schneidet nach n Zeilen ab: <pre>SELECT k.name, COUNT(b.id) AS anzahl\nFROM kunden k\nJOIN bestellungen b ON b.kunde_id = k.id\nGROUP BY k.name\nORDER BY anzahl DESC\nLIMIT 2;</pre>Die Reihenfolge der Klauseln ist fest vorgegeben: erst FROM/JOIN, dann GROUP BY, dann ORDER BY, zuletzt LIMIT.`,
  task: `Erster Baustein vor Kapitel 10: Dort erstellst du zum Abschluss eine Top-10-Liste der Kunden mit den meisten Bestellungen. Hier baust du dieselbe Rangliste im Kleinen — mit dem JOIN aus Kapitel 7 und dem GROUP BY aus 8.1.<br><br><b>Hinweis:</b> <b>kunden</b> und <b>bestellungen</b> sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Zeige die 2 Kunden mit den meisten Bestellungen, absteigend sortiert — mit Name und Anzahl.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER);
INSERT INTO bestellungen VALUES (1,1),(2,1),(3,2),(4,3),(5,1);`,
  hints: [
    `Beginne mit dem JOIN aus Kapitel 7 und ergänze <code>COUNT(b.id)</code> sowie <code>GROUP BY k.name</code>.`,
    `<code>ORDER BY anzahl DESC</code> sortiert die größte Anzahl nach oben, <code>LIMIT 2</code> behält nur die ersten beiden Zeilen.`,
    `So sieht die Lösung aus:<pre>SELECT k.name, COUNT(b.id) AS anzahl\nFROM kunden k\nJOIN bestellungen b ON b.kunde_id = k.id\nGROUP BY k.name\nORDER BY anzahl DESC\nLIMIT 2;</pre>`,
  ] as const,
  solution: `SELECT k.name, COUNT(b.id) AS anzahl
FROM kunden k
JOIN bestellungen b ON b.kunde_id = k.id
GROUP BY k.name
ORDER BY anzahl DESC
LIMIT 2;`,
  syntaxExplanation: `<ul><li><code>COUNT(b.id)</code> mit <code>GROUP BY k.name</code> — zählt die Bestellungen je Kunde.</li><li><code>ORDER BY anzahl DESC</code> — sortiert absteigend, größte Anzahl zuerst.</li><li><code>LIMIT 2</code> — behält nur die ersten beiden Zeilen der sortierten Liste.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 2 Zeilen enthalten, absteigend sortiert — an erster Stelle Anna mit 3 Bestellungen.`,
  extra: {
    pg: `Identisch in Postgres — GROUP BY, ORDER BY und LIMIT sind Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 2) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 2 (LIMIT 2).` };
    if (String(vals[0]?.[0]) !== 'Anna') {
      return { ok: false, message: `An erster Stelle steht "${String(vals[0]?.[0])}" — erwartet wird Anna mit den meisten Bestellungen.` };
    }
    if (Number(vals[0]?.[1]) !== 3) return { ok: false, message: `Anna hat ${String(vals[0]?.[1])} Bestellungen im Ergebnis, erwartet werden 3.` };
    if (Number(vals[0]?.[1]) < Number(vals[1]?.[1])) return { ok: false, message: 'Die Sortierung ist nicht absteigend.' };
    return { ok: true, message: 'Rangliste korrekt: Top 2 absteigend sortiert.' };
  },
};
