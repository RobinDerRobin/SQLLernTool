import type { SqlChallenge } from '../../../types';

export const challenge24_1: SqlChallenge = {
  num: '24.1',
  title: 'Schnittmenge finden: INTERSECT',
  tutorial: `Während <code>UNION</code> alle unterschiedlichen Zeilen aus zwei Abfragen vereinigt, wird es oft auch umgekehrt interessant: Welche Zeilen kommen in <b>beiden</b> Abfragen vor? Dafür gibt es <code>INTERSECT</code>: <pre>SELECT product FROM north_store
INTERSECT
SELECT product FROM south_store</pre>Das liefert nur die Produkte, die in <b>beiden</b> Stores verkauft wurden. Im Gegensatz zu <code>WHERE ... IN (SELECT ...)</code> schreibt man bei INTERSECT nicht, welche Spalte verbunden wird — die Struktur der beiden Abfragen muss einfach identisch sein, dann vergleicht SQL alle Spalten automatisch.`,
  task: `<b>Hinweis:</b> Wieder die zwei Tabellen nord_sales und sued_sales von vorher (beide mit product-Spalten).<br><br><b>Deine Aufgabe:</b> Zeige nur die Produkte, die in <b>beiden</b> Regionen verkauft wurden — also die Produkte, die in nord_sales <b>und</b> in sued_sales vorkommen. Sortiere alphabetisch.`,
  setup: `CREATE TABLE nord_sales (product TEXT);
INSERT INTO nord_sales VALUES ('Laptop'),('Monitor'),('Keyboard');

CREATE TABLE sued_sales (product TEXT);
INSERT INTO sued_sales VALUES ('Laptop'),('Mouse'),('Monitor');`,
  hints: [
    `nord_sales hat: Laptop, Monitor, Keyboard. sued_sales hat: Laptop, Mouse, Monitor. Welche Produkte stehen in beiden?`,
    `<code>INTERSECT</code> vergleicht alle Spalten beider Ergebnisse und gibt nur die Zeilen zurück, die in beiden Abfragen vorkommen.`,
    `So sieht die Lösung aus:<pre>SELECT product FROM nord_sales
INTERSECT
SELECT product FROM sued_sales
ORDER BY product;</pre>Das Ergebnis hat genau 2 Produkte: Laptop und Monitor.`,
  ] as const,
  solution: `SELECT product FROM nord_sales
INTERSECT
SELECT product FROM sued_sales
ORDER BY product;`,
  syntaxExplanation: `<ul><li><code>SELECT product FROM nord_sales</code> — erste Abfrage mit 3 Produkten.</li><li><code>INTERSECT</code> — findet die Zeilen, die in BEIDEN Abfragen vorkommen.</li><li><code>SELECT product FROM sued_sales</code> — zweite Abfrage mit 3 Produkten.</li><li><code>ORDER BY product</code> — sortiert das Ergebnis alphabetisch.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 2 Produkte enthalten (Laptop und Monitor) — genau die Produkte, die in beiden Regions-Tabellen stehen. Keyboard und Mouse dürfen nicht erscheinen.`,
  extra: {
    pg: `Identisch in Postgres — INTERSECT ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: string[];
    try {
      const rows =
        engine.exec(`SELECT product FROM nord_sales INTERSECT SELECT product FROM sued_sales ORDER BY product`)[0]
          ?.values ?? [];
      expected = rows.map((row) => String(row?.[0]));
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const productIdx = cols.indexOf('product');
    if (productIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet wird eine Spalte "product".` };
    }
    const actual = lastResult.values.map((row) => String(row[productIdx]));
    if (actual.length !== expected.length || actual.some((prod, i) => prod !== expected[i])) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden nur die Produkte aus beiden Regionen: ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: 'Korrekt: INTERSECT findet die Produkte aus beiden Regionen.' };
  },
  distractors: [
    {
      code: `SELECT product FROM nord_sales
UNION
SELECT product FROM sued_sales
ORDER BY product;`,
      reason: 'nutzt UNION statt INTERSECT — liefert alle 4 unterschiedlichen Produkte, nicht nur die, die in beiden Regions-Tabellen stehen',
    },
    {
      code: `SELECT product FROM nord_sales
EXCEPT
SELECT product FROM sued_sales
ORDER BY product;`,
      reason: 'nutzt EXCEPT statt INTERSECT und dreht damit die Logik um — zeigt die Produkte, die nur in Nord stehen (Keyboard), nicht die, die in BEIDEN stehen',
    },
  ],
};
