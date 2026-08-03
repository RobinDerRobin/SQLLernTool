import type { SqlChallenge } from '../../../types';

export const challenge11_4: SqlChallenge = {
  num: '11.4',
  title: 'Duplikate entfernen: DISTINCT',
  tutorial: `<code>SELECT spalte FROM tabelle</code> gibt jeden Wert so oft aus, wie er vorkommt — auch mehrfach. <code>DISTINCT</code> direkt nach SELECT entfernt Duplikate aus dem Ergebnis, sodass jeder Wert nur noch einmal erscheint: <pre>SELECT DISTINCT kunde FROM bestellungen;</pre>Bei mehreren Spalten gilt DISTINCT für die <i>Kombination</i> aller Spalten — zwei Zeilen zählen nur dann als Duplikat, wenn sie in <i>allen</i> ausgewählten Spalten übereinstimmen.`,
  task: `Manchmal willst du nicht jede Zeile sehen, sondern nur wissen, <i>welche unterschiedlichen</i> Werte überhaupt vorkommen — z. B. welche Kunden bestellt haben, unabhängig davon, wie oft. DISTINCT filtert genau darauf.<br><br><b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (6 Zeilen, einige Kunden mehrfach) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Gib jeden Kundennamen aus <b>bestellungen</b> nur einmal aus, auch wenn er mehrfach bestellt hat.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, kunde TEXT);
INSERT INTO bestellungen VALUES (1,'Anna'),(2,'Ben'),(3,'Anna'),(4,'Clara'),(5,'Ben'),(6,'Anna');`,
  hints: [
    `<code>DISTINCT</code> steht direkt hinter <code>SELECT</code>, vor der Spaltenliste.`,
    `<code>SELECT DISTINCT kunde FROM bestellungen;</code> reicht bereits aus — kein GROUP BY nötig.`,
    `So sieht die Lösung aus:<pre>SELECT DISTINCT kunde FROM bestellungen;</pre>`,
  ] as const,
  solution: `SELECT DISTINCT kunde FROM bestellungen;`,
  syntaxExplanation: `<ul><li><code>SELECT DISTINCT kunde</code> — gibt jeden unterschiedlichen Wert in kunde nur einmal zurück.</li><li>Ohne DISTINCT wären es 6 Zeilen (eine je Bestellung); mit DISTINCT nur noch 3 (Anna, Ben, Clara).</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 3 Zeilen enthalten: Anna, Ben und Clara — jeweils genau einmal.`,
  extra: {
    pg: `Identisch in Postgres — DISTINCT ist Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const names = lastResult.values.map((row) => String(row?.[0]));
    if (names.length !== 3) return { ok: false, message: `Es sind ${names.length} Zeile(n) — erwartet werden genau 3 (Anna, Ben, Clara je einmal).` };
    const unique = new Set(names);
    if (unique.size !== names.length) return { ok: false, message: 'Es sind noch Duplikate im Ergebnis enthalten.' };
    for (const expected of ['Anna', 'Ben', 'Clara']) {
      if (!unique.has(expected)) return { ok: false, message: `"${expected}" fehlt im Ergebnis.` };
    }
    return { ok: true, message: 'DISTINCT korrekt: jeder Kunde genau einmal.' };
  },
};
