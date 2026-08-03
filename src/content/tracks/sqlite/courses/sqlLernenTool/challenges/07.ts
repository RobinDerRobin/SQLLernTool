import type { SqlChallenge } from '../../../types';

export const challenge07: SqlChallenge = {
  num: '07',
  title: 'Verknüpfen mit JOIN ... ON',
  tutorial: `Die ausdrückliche Schreibweise für das, was du in 6.1 und 6.2 mit Komma und WHERE gebaut hast, ist der <b>JOIN</b>: <pre>SELECT k.name, b.betrag\nFROM kunden k\nJOIN bestellungen b ON b.kunde_id = k.id;</pre>Die Verknüpfungsbedingung steht hinter <code>ON</code> und ist damit klar getrennt von einem inhaltlichen Filter, der weiterhin in WHERE gehört. Anders als der CROSS JOIN aus Kapitel 6 (jede Zeile mit jeder) behält ein JOIN nur die Zeilenpaare, bei denen die ON-Bedingung zutrifft. Das ist die Form, in der Verknüpfungen in echten Projekten praktisch immer geschrieben werden.`,
  task: `Fast alle echten Datenbanken bestehen aus mehreren verknüpften Tabellen — Kunden und ihre Bestellungen, Artikel und ihre Kategorien. Der JOIN ist das Werkzeug, mit dem du diese getrennt gespeicherten Daten wieder zusammenführst, und damit eines der wichtigsten überhaupt.<br><br><b>Hinweis:</b> <b>kunden</b> (4 Zeilen) und <b>bestellungen</b> (6 Zeilen, mit Betrag) sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Gib zu jeder Bestellung den Kundennamen und den Betrag aus, absteigend nach Betrag sortiert — erwartet werden 6 Zeilen, die teuerste zuerst.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara'),(4,'David');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER, betrag INTEGER);
INSERT INTO bestellungen VALUES (1,1,120),(2,1,45),(3,2,300),(4,3,80),(5,1,15),(6,4,210);`,
  hints: [
    `Der Aufbau ist: <code>FROM erste_tabelle alias JOIN zweite_tabelle alias ON bedingung</code>.`,
    `Die ON-Bedingung vergleicht wie in 6.1 den Fremdschlüssel mit der ID: <code>ON b.kunde_id = k.id</code>.`,
    `Das Sortieren kommt wie gewohnt ganz zum Schluss:<pre>SELECT k.name, b.betrag\nFROM kunden k\nJOIN bestellungen b ON b.kunde_id = k.id\nORDER BY b.betrag DESC;</pre>`,
  ] as const,
  solution: `SELECT k.name, b.betrag
FROM kunden k
JOIN bestellungen b ON b.kunde_id = k.id
ORDER BY b.betrag DESC;`,
  syntaxExplanation: `<ul><li><code>FROM kunden k</code> / <code>JOIN bestellungen b</code> — beide Tabellen mit Alias (wie in 6.2).</li><li><code>ON b.kunde_id = k.id</code> — die Verknüpfungsbedingung; nur passende Zeilenpaare bleiben erhalten.</li><li><code>ORDER BY b.betrag DESC</code> — sortiert das verknüpfte Ergebnis absteigend nach Betrag.</li><li>Da jede der 6 Bestellungen genau einen Kunden hat, entstehen 6 Ergebniszeilen — David erscheint, Kunden ohne Bestellung nicht.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 6 Zeilen mit Kundenname und Betrag enthalten, absteigend nach Betrag sortiert (erste Zeile: Ben mit 300).`,
  extra: {
    pg: `Identisch in Postgres — JOIN ... ON ist Standard-SQL. Dort schreibt man oft INNER JOIN, was aber genau dasselbe bedeutet.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 6) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 6 (eine je Bestellung).` };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const betragIdx = cols.findIndex((c) => c.includes('betrag'));
    if (nameIdx === -1 || betragIdx === -1) return { ok: false, message: 'Es werden eine Namens- und eine Betragsspalte erwartet.' };
    const betraege = vals.map((r) => Number(r[betragIdx]));
    for (let i = 1; i < betraege.length; i++) {
      if ((betraege[i] ?? 0) > (betraege[i - 1] ?? 0)) return { ok: false, message: 'Die Beträge sind nicht absteigend sortiert.' };
    }
    if (betraege[0] !== 300 || String(vals[0]?.[nameIdx]) !== 'Ben') {
      return { ok: false, message: `Oben steht "${String(vals[0]?.[nameIdx])}" mit ${betraege[0]} — erwartet wird Ben mit 300.` };
    }
    return { ok: true, message: 'JOIN korrekt: 6 Bestellungen mit Kundennamen, absteigend sortiert.' };
  },
};
