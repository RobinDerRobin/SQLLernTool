import type { SqlChallenge } from '../../../types';

export const challenge10_2: SqlChallenge = {
  num: '10.2',
  title: 'Über drei Tabellen hinweg verknüpfen',
  tutorial: `Ein JOIN muss nicht bei zwei Tabellen aufhören — du kannst beliebig viele <code>JOIN</code>-Klauseln aneinanderreihen, jede mit ihrer eigenen ON-Bedingung. SQL arbeitet sie einfach der Reihe nach ab: erst wird die erste Verknüpfung gebildet, dann wird an deren Ergebnis die nächste Tabelle drangehängt: <pre>SELECT a.name, b.name, c.name
FROM a
JOIN b ON b.a_id = a.id
JOIN c ON c.b_id = b.id;</pre>Jede zusätzliche Tabelle bringt so ihre eigenen Spalten mit ins Ergebnis, ohne dass du irgendetwas anders schreiben müsstest als bei zwei Tabellen.`,
  task: `Echte Datenbanken bestehen selten aus nur zwei verknüpften Tabellen — eine Bestellung hat einen Kunden <i>und</i> einen bestellten Artikel, oft in getrennten Tabellen gespeichert. Um beides gleichzeitig auszugeben, reicht ein zweiter JOIN direkt an den ersten angehängt.<br><br><b>Hinweis:</b> <b>kunden</b> (3 Zeilen), <b>artikel</b> (3 Zeilen) und <b>bestellungen</b> (5 Zeilen, mit kunde_id <i>und</i> artikel_id) sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Zeige zu jeder Bestellung die Bestell-ID, den Kundennamen und den Artikelnamen — verknüpft über beide JOINs gleichzeitig. Sortiere nach Bestell-ID.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara');

CREATE TABLE artikel (id INTEGER, name TEXT);
INSERT INTO artikel VALUES (1,'Tastatur'),(2,'Monitor'),(3,'Maus');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER, artikel_id INTEGER);
INSERT INTO bestellungen VALUES (1,1,2),(2,1,3),(3,2,1),(4,3,2),(5,1,1);`,
  hints: [
    `Starte wie gewohnt mit dem JOIN aus Kapitel 7 zwischen bestellungen und kunden.`,
    `Häng direkt danach einen zweiten JOIN an, diesmal gegen artikel: <code>JOIN artikel a ON a.id = b.artikel_id</code>. Die Reihenfolge der JOINs spielt hier keine Rolle.`,
    `So sieht die komplette Lösung aus:<pre>SELECT b.id AS bestellung, k.name AS kunde, a.name AS artikel
FROM bestellungen b
JOIN kunden k ON k.id = b.kunde_id
JOIN artikel a ON a.id = b.artikel_id
ORDER BY b.id;</pre>`,
  ] as const,
  solution: `SELECT b.id AS bestellung, k.name AS kunde, a.name AS artikel
FROM bestellungen b
JOIN kunden k ON k.id = b.kunde_id
JOIN artikel a ON a.id = b.artikel_id
ORDER BY b.id;`,
  syntaxExplanation: `<ul><li><code>FROM bestellungen b</code> — Ausgangstabelle, weil sie beide Fremdschlüssel (kunde_id und artikel_id) enthält.</li><li><code>JOIN kunden k ON k.id = b.kunde_id</code> — erste Verknüpfung, bringt den Kundennamen mit.</li><li><code>JOIN artikel a ON a.id = b.artikel_id</code> — zweite Verknüpfung direkt angehängt, bringt zusätzlich den Artikelnamen mit.</li><li><code>ORDER BY b.id</code> — sortiert das Ergebnis nach Bestell-ID.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 5 Zeilen enthalten (eine je Bestellung), nach Bestell-ID sortiert — die erste Zeile muss Bestellung 1, Kunde Anna, Artikel Monitor sein.`,
  extra: {
    pg: `Identisch in Postgres — beliebig viele JOINs aneinanderzureihen ist Standard-SQL, dort genau wie hier ohne zusätzliche Klammern oder Sondersyntax.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 5) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 5 (eine je Bestellung).` };
    const ids = vals.map((row) => Number(row?.[0]));
    const sortedIds = [...ids].sort((a, b) => a - b);
    if (JSON.stringify(ids) !== JSON.stringify(sortedIds)) {
      return { ok: false, message: 'Die Zeilen sind nicht nach Bestell-ID sortiert.' };
    }
    const first = vals[0];
    if (Number(first?.[0]) !== 1 || String(first?.[1]) !== 'Anna' || String(first?.[2]) !== 'Monitor') {
      return {
        ok: false,
        message: `Erste Zeile ist Bestellung ${String(first?.[0])}, Kunde "${String(first?.[1])}", Artikel "${String(first?.[2])}" — erwartet wird Bestellung 1, Anna, Monitor.`,
      };
    }
    const trueRows =
      engine.exec(
        'SELECT b.id AS bestellung, k.name AS kunde, a.name AS artikel FROM bestellungen b JOIN kunden k ON k.id = b.kunde_id JOIN artikel a ON a.id = b.artikel_id ORDER BY b.id',
      )[0]?.values ?? [];
    const gotTriples = vals.map((r) => `${String(r[0])}|${String(r[1])}|${String(r[2])}`);
    const trueTriples = trueRows.map((r) => `${String(r[0])}|${String(r[1])}|${String(r[2])}`);
    if (JSON.stringify(gotTriples) !== JSON.stringify(trueTriples)) {
      return {
        ok: false,
        message: 'Die erste Zeile stimmt, aber mindestens eine der übrigen 4 Zeilen weicht von der echten Kunde/Artikel-Zuordnung ab.',
      };
    }
    return { ok: true, message: 'Drei-Tabellen-JOIN korrekt: alle 5 Bestellungen mit Kunden- und Artikelnamen.' };
  },
  distractors: [
    {
      code: `SELECT 1 AS bestellung, 'Anna' AS kunde, 'Monitor' AS artikel
UNION ALL SELECT 2, 'Anna', 'Monitor'
UNION ALL SELECT 3, 'Anna', 'Monitor'
UNION ALL SELECT 4, 'Anna', 'Monitor'
UNION ALL SELECT 5, 'Anna', 'Monitor';`,
      reason: 'erste Zeile stimmt, aber alle weiteren Zeilen wiederholen einfach Anna/Monitor statt der echten Kunde/Artikel-Zuordnung je Bestellung',
    },
  ],
};
