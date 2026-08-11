import type { SqlChallenge } from '../../../types';

export const challenge24_2: SqlChallenge = {
  num: '24.2',
  title: 'Mengendifferenz: EXCEPT',
  tutorial: `<code>EXCEPT</code> (auch <code>MINUS</code> in manchen Datenbanken) ist wie das Gegenteil von <code>UNION</code> — es zeigt die Zeilen aus der ersten Abfrage, die in der zweiten Abfrage <b>nicht</b> vorkommen: <pre>SELECT product FROM north_store
EXCEPT
SELECT product FROM south_store</pre>Das liefert die Produkte, die in der Nordregion verkauft werden, aber (noch) nicht in der Südregion. Oder umgekehrt formuliert: alle Nordprodukte minus die Südprodukte. Die Reihenfolge der Abfragen ist also wichtig!`,
  task: `<b>Hinweis:</b> Wieder nord_sales und sued_sales mit ihren Produkten.<br><br><b>Deine Aufgabe:</b> Zeige nur die Produkte, die in der Nordregion verkauft wurden, aber <b>nicht</b> in der Südregion. Das sind die Produkte, die exklusiv Nord sind. Sortiere alphabetisch.`,
  setup: `CREATE TABLE nord_sales (product TEXT);
INSERT INTO nord_sales VALUES ('Laptop'),('Monitor'),('Keyboard');

CREATE TABLE sued_sales (product TEXT);
INSERT INTO sued_sales VALUES ('Laptop'),('Mouse'),('Monitor');`,
  hints: [
    `nord_sales hat: Laptop, Monitor, Keyboard. sued_sales hat: Laptop, Mouse, Monitor. Welches Produkt ist nur in Nord, nicht in Süd?`,
    `<code>EXCEPT</code> liefert die Zeilen aus der <b>ersten</b> Abfrage, die in der <b>zweiten</b> Abfrage nicht vorkommen. Die Reihenfolge zählt!`,
    `So sieht die Lösung aus:<pre>SELECT product FROM nord_sales
EXCEPT
SELECT product FROM sued_sales
ORDER BY product;</pre>Das Ergebnis hat genau 1 Produkt: Keyboard.`,
  ] as const,
  solution: `SELECT product FROM nord_sales
EXCEPT
SELECT product FROM sued_sales
ORDER BY product;`,
  syntaxExplanation: `<ul><li><code>SELECT product FROM nord_sales</code> — erste Abfrage mit 3 Produkten (Laptop, Monitor, Keyboard).</li><li><code>EXCEPT</code> — entfernt alle Zeilen, die auch in der zweiten Abfrage vorkommen.</li><li><code>SELECT product FROM sued_sales</code> — zweite Abfrage mit 3 Produkten (Laptop, Mouse, Monitor).</li><li><code>ORDER BY product</code> — sortiert das Ergebnis.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 1 Produkt enthalten: Keyboard. Das ist das einzige Produkt, das in Nord vorkommt, aber nicht in Süd. Laptop und Monitor erscheinen nicht (weil sie auch in Süd stehen).`,
  extra: {
    pg: `In Postgres und Standard-SQL heißt der Operator <code>EXCEPT</code>. In Oracle und einigen anderen Datenbanken heißt das Äquivalent <code>MINUS</code>, funktioniert aber identisch.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: string[];
    try {
      const rows =
        engine.exec(`SELECT product FROM nord_sales EXCEPT SELECT product FROM sued_sales ORDER BY product`)[0]
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
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden nur die Nordprodukte, die nicht auch in Süd stehen: ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: 'Korrekt: EXCEPT findet die Produkte, die nur in Nord, nicht in Süd stehen.' };
  },
  distractors: [
    {
      code: `SELECT product FROM sued_sales
EXCEPT
SELECT product FROM nord_sales
ORDER BY product;`,
      reason: 'dreht die Reihenfolge um — zeigt die Produkte, die nur in Süd, nicht in Nord stehen (Mouse), nicht umgekehrt',
    },
    {
      code: `SELECT product FROM nord_sales
INTERSECT
SELECT product FROM sued_sales
ORDER BY product;`,
      reason: 'nutzt INTERSECT statt EXCEPT — zeigt die Produkte, die in BEIDEN Regionen stehen (Laptop, Monitor), nicht die, die nur in Nord stehen',
    },
  ],
};
