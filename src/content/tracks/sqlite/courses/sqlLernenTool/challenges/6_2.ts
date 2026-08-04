import type { SqlChallenge } from '../../../types';

export const challenge6_2: SqlChallenge = {
  num: '6.2',
  title: 'Tabellen-Aliase bei zwei Tabellen',
  tutorial: `Spalten mit dem vollen Tabellennamen zu qualifizieren (<code>bestellungen.kunde_id</code>) wird schnell unübersichtlich. Deshalb bekommt jede Tabelle ein kurzes Kürzel — direkt hinter ihrem Namen, ganz ohne AS: <pre>FROM kunden k, bestellungen b\nWHERE b.kunde_id = k.id</pre>Danach steht <code>k</code> für kunden und <code>b</code> für bestellungen. Das ist keine Kosmetik: In Kapitel 7 und 10 sind die Abfragen lang genug, dass ohne Aliase kaum noch zu erkennen ist, welche Spalte woher kommt.`,
  task: `Letzter Baustein vor Kapitel 7: Dort ist die Alias-Schreibweise die übliche Form, in der JOINs geschrieben werden. Hier übst du sie an der Abfrage aus 6.1.<br><br><b>Hinweis:</b> <b>kunden</b> und <b>bestellungen</b> sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Schreibe dieselbe Abfrage wie in 6.1 (5 zusammengehörende Zeilen), diesmal aber mit den Tabellen-Aliasen <b>k</b> und <b>b</b> statt der ausgeschriebenen Tabellennamen. Die Ergebnisspalten sollen <b>kunde</b> und <b>bestellnummer</b> heißen.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER);
INSERT INTO bestellungen VALUES (1,1),(2,1),(3,2),(4,3),(5,1);`,
  hints: [
    `Das Alias steht direkt hinter dem Tabellennamen: <code>FROM kunden k, bestellungen b</code>.`,
    `Danach schreibst du überall <code>k.</code> bzw. <code>b.</code> statt der langen Tabellennamen — auch in der WHERE-Bedingung.`,
    `Die Spaltennamen kommen wie in 5.1 über AS:<pre>SELECT k.name AS kunde, b.id AS bestellnummer\nFROM kunden k, bestellungen b\nWHERE b.kunde_id = k.id;</pre>`,
  ] as const,
  solution: `SELECT k.name AS kunde, b.id AS bestellnummer
FROM kunden k, bestellungen b
WHERE b.kunde_id = k.id;`,
  syntaxExplanation: `<ul><li><code>FROM kunden k, bestellungen b</code> — die Kürzel k und b gelten ab sofort in der ganzen Abfrage.</li><li><code>b.kunde_id = k.id</code> — dieselbe Bedingung wie in 6.1, nur kürzer geschrieben.</li><li><code>AS kunde</code> / <code>AS bestellnummer</code> — benennen die Ergebnisspalten (wie in 5.1).</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 5 Zeilen mit den Spalten <b>kunde</b> und <b>bestellnummer</b> enthalten.`,
  extra: {
    pg: `Identisch in Postgres — Tabellen-Aliase sind Standard-SQL und dort ebenfalls ohne AS üblich.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.columns) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const kundeIdx = cols.indexOf('kunde');
    const bestellIdx = cols.indexOf('bestellnummer');
    if (kundeIdx === -1 || bestellIdx === -1) {
      return { ok: false, message: `Spalten sind ${cols.join(', ')} — erwartet werden kunde und bestellnummer.` };
    }
    const n = lastResult.values.length;
    if (n !== 5) return { ok: false, message: `Es sind ${n} Zeile(n) — erwartet werden genau 5.` };
    const expectedPairs = new Set(
      engine
        .exec('SELECT k.name, b.id FROM kunden k, bestellungen b WHERE b.kunde_id = k.id')[0]
        ?.values.map((r) => `${String(r[0])}|${String(r[1])}`) ?? [],
    );
    const gotPairs = new Set(lastResult.values.map((r) => `${String(r[kundeIdx])}|${String(r[bestellIdx])}`));
    const allMatch = gotPairs.size === expectedPairs.size && [...gotPairs].every((p) => expectedPairs.has(p));
    if (!allMatch) {
      return {
        ok: false,
        message: '5 Zeilen mit den richtigen Spaltennamen, aber die kunde/bestellnummer-Paare stimmen nicht mit den echten Fremdschlüssel-Beziehungen überein.',
      };
    }
    return { ok: true, message: '5 verknüpfte Zeilen mit benannten Spalten.' };
  },
  distractors: [
    {
      code: `SELECT 'Anna' AS kunde, n AS bestellnummer
FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5);`,
      reason: 'liefert 5 Zeilen mit den richtigen Spaltennamen, aber ordnet jede Bestellung fälschlich Anna zu, statt den echten Fremdschlüssel auszuwerten',
    },
  ],
};
