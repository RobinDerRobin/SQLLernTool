import type { SqlChallenge } from '../../../types';

export const challenge24: SqlChallenge = {
  num: '24',
  title: 'Ergebnisse zusammenfassen: UNION',
  tutorial: `Manchmal musst du zwei separate SELECT-Abfragen kombinieren, als hätten sie die gleiche Tabelle befragt. Ein klassisches Beispiel: zwei Shops mit unterschiedlichen Produkttabellen. Mit <code>UNION</code> (nicht <code>UNION ALL</code>) kannst du die Ergebnisse zusammenfassen <b>und dabei Duplikate automatisch entfernen</b>: <pre>SELECT product FROM north_store
UNION
SELECT product FROM south_store</pre>Das liefert jedes Produkt nur einmal, auch wenn es in beiden Stores verkauft wurde. (Wer alle Zeilen dupliziert haben möchte, schreibt <code>UNION ALL</code> statt <code>UNION</code>.)`,
  task: `<b>Hinweis:</b> Zwei Tabellen sind bereits angelegt: <b>nord_sales</b> (product) mit Produkten aus der Nordregion, und <b>sued_sales</b> (product) mit Produkten aus der Südregion. Einige Produkte wurden in beiden Regionen verkauft.<br><br><b>Deine Aufgabe:</b> Zeige alle unterschiedlichen Produkte, die in einer der beiden Regionen (oder in beiden) verkauft wurden — ohne Duplikate. Sortiere alphabetisch.`,
  setup: `CREATE TABLE nord_sales (product TEXT);
INSERT INTO nord_sales VALUES ('Laptop'),('Monitor'),('Keyboard');

CREATE TABLE sued_sales (product TEXT);
INSERT INTO sued_sales VALUES ('Laptop'),('Mouse'),('Monitor');`,
  hints: [
    `<code>SELECT product FROM nord_sales</code> gibt 3 Produkte, <code>SELECT product FROM sued_sales</code> gibt ebenfalls 3 Produkte — aber Laptop und Monitor kommen vor.`,
    `<code>UNION</code> führt die beiden Ergebnisse zusammen und entfernt dabei Zeilen-Duplikate — jedes Produkt erscheint nur einmal, egal in wie vielen Regions-Tabellen es vorkam.`,
    `So sieht die Lösung aus:<pre>SELECT product FROM nord_sales
UNION
SELECT product FROM sued_sales
ORDER BY product;</pre>Das Ergebnis hat genau 4 unterschiedliche Produkte, alphabetisch sortiert.`,
  ] as const,
  solution: `SELECT product FROM nord_sales
UNION
SELECT product FROM sued_sales
ORDER BY product;`,
  syntaxExplanation: `<ul><li><code>SELECT product FROM nord_sales</code> — erste Abfrage mit 3 Zeilen.</li><li><code>UNION</code> — kombiniert die Ergebnisse und entfernt Duplikate.</li><li><code>SELECT product FROM sued_sales</code> — zweite Abfrage mit 3 Zeilen.</li><li><code>ORDER BY product</code> — sortiert das kombinierte Ergebnis alphabetisch.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 4 unterschiedliche Produkte enthalten (Keyboard, Laptop, Monitor, Mouse) — Laptop und Monitor dürfen nicht zweimal erscheinen, auch wenn sie in beiden Regions-Tabellen stehen.`,
  extra: {
    pg: `Identisch in Postgres — UNION ist Standard-SQL. Wer statt Duplikate-Entfernen alle Zeilen behalten möchte, schreibt UNION ALL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: string[];
    try {
      const rows =
        engine.exec(`SELECT product FROM nord_sales UNION SELECT product FROM sued_sales ORDER BY product`)[0]
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
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die 4 unterschiedlichen Produkte ${JSON.stringify(expected)} (ohne Duplikate, alphabetisch sortiert).`,
      };
    }
    return { ok: true, message: 'Korrekt: UNION kombiniert die Produkte und entfernt Duplikate.' };
  },
  distractors: [
    {
      code: `SELECT product FROM nord_sales
UNION ALL
SELECT product FROM sued_sales
ORDER BY product;`,
      reason: 'nutzt UNION ALL statt UNION — liefert alle 6 Zeilen statt die 4 unterschiedlichen Produkte, da Duplikate nicht entfernt werden',
    },
    {
      code: `SELECT product FROM nord_sales
WHERE product IN (SELECT product FROM sued_sales)
ORDER BY product;`,
      reason: 'zeigt nur die Produkte, die in BEIDEN Regionen verkauft wurden (Laptop, Monitor) — das ist INTERSECT, nicht UNION',
    },
  ],
};
