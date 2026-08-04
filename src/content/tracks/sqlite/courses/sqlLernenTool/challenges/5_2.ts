import type { SqlChallenge } from '../../../types';

export const challenge5_2: SqlChallenge = {
  num: '5.2',
  title: 'Zwei Tabellen gleichzeitig abfragen',
  tutorial: `Nach <code>FROM</code> darf mehr als eine Tabelle stehen, durch Komma getrennt: <pre>SELECT * FROM tabelle_a, tabelle_b;</pre>Das Ergebnis ist das sogenannte <b>kartesische Produkt</b> — jede Zeile der einen Tabelle wird mit jeder Zeile der anderen kombiniert. Aus 3 × 2 Zeilen werden 6. Genau dieses Verhalten bekommt in Kapitel 6 einen eigenen, ausdrücklichen Namen: CROSS JOIN.`,
  task: `Letzter Baustein vor Kapitel 6: Dort lernst du CROSS JOIN als ausdrückliche Schreibweise kennen — hier siehst du erstmal, dass das Kombinieren zweier Tabellen auch ganz ohne JOIN-Schlüsselwort passiert, allein durch das Komma nach FROM.<br><br><b>Hinweis:</b> Die Tabellen <b>zutaten</b> (3 Zeilen) und <b>saucen</b> (2 Zeilen) sind bereits automatisch angelegt.<br><br><b>Deine Aufgabe:</b> Gib alle Kombinationen aus zutaten und saucen aus — erwartet werden 6 Zeilen.`,
  setup: `CREATE TABLE zutaten (zutat TEXT);
INSERT INTO zutaten VALUES ('Nudeln'),('Reis'),('Kartoffeln');

CREATE TABLE saucen (sauce TEXT);
INSERT INTO saucen VALUES ('Tomate'),('Rahm');`,
  hints: [
    `Beide Tabellennamen stehen nach FROM, getrennt durch ein Komma — kein JOIN-Schlüsselwort nötig.`,
    `Ohne WHERE-Bedingung entsteht automatisch jede mögliche Kombination.`,
    `So sieht die Lösung aus:<pre>SELECT zutat, sauce FROM zutaten, saucen;</pre>`,
  ] as const,
  solution: `SELECT zutat, sauce FROM zutaten, saucen;`,
  syntaxExplanation: `<ul><li><code>FROM zutaten, saucen</code> — zwei Tabellen nach FROM erzeugen das kartesische Produkt (jede Zeile mit jeder).</li><li>3 Zutaten × 2 Saucen ergeben 6 Ergebniszeilen.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 6 Zeilen enthalten (3 Zutaten × 2 Saucen).`,
  extra: {
    pg: `Identisch in Postgres. Guter Stil ist dort aber die ausdrückliche Schreibweise CROSS JOIN, weil die Absicht dann klarer erkennbar ist.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const values = lastResult.values;
    if (values.length !== 6) return { ok: false, message: `Es sind ${values.length} Zeile(n) — erwartet werden genau 6.` };
    const zutaten = new Set(['Nudeln', 'Reis', 'Kartoffeln']);
    const saucen = new Set(['Tomate', 'Rahm']);
    const seenZutaten = new Set(values.map((r) => String(r[0])));
    const seenSaucen = new Set(values.map((r) => String(r[1])));
    const allFromZutaten = [...seenZutaten].every((v) => zutaten.has(v));
    const allFromSaucen = [...seenSaucen].every((v) => saucen.has(v));
    if (!allFromZutaten || !allFromSaucen || seenZutaten.size !== 3 || seenSaucen.size !== 2) {
      return {
        ok: false,
        message: `6 Zeilen, aber die Werte stammen nicht (vollständig) aus zutaten/saucen — gefunden: ${[...seenZutaten].join(', ')} × ${[...seenSaucen].join(', ')}.`,
      };
    }
    return { ok: true, message: 'Alle 6 Kombinationen erzeugt.' };
  },
  distractors: [
    {
      code: `SELECT 'x' AS zutat, 'y' AS sauce
FROM (SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6);`,
      reason: 'liefert genau 6 Zeilen, aber ohne jeden Bezug zu zutaten/saucen — kein kartesisches Produkt, nur 6 identische erfundene Zeilen',
    },
  ],
};
