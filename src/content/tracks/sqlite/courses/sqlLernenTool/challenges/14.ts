import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge14: SqlChallenge = {
  num: '14',
  title: 'Ein Wert aus einer Abfrage: Scalar Subquery',
  tutorial: `Bisher standen in einer WHERE-Bedingung immer feste Werte (<code>WHERE preis > 50</code>) oder Spalten. Eine <b>Subquery</b> ('Unterabfrage') ist eine komplette SELECT-Abfrage in Klammern, die du überall dort einsetzen kannst, wo sonst ein Wert stünde — SQL führt sie zuerst aus und rechnet mit ihrem Ergebnis weiter: <pre>SELECT * FROM produkte
WHERE preis > (SELECT AVG(preis) FROM produkte);</pre>Wichtig: An dieser Stelle (nach einem Vergleichsoperator wie <code>&gt;</code>) muss die Subquery <b>genau einen einzigen Wert</b> zurückgeben — eine Zeile, eine Spalte. Man nennt das eine <b>Scalar Subquery</b>. Gibt sie mehrere Zeilen zurück, weiß SQL nicht, mit welcher es vergleichen soll.`,
  task: `Bisher konntest du nur mit einem <i>festen</i> Wert vergleichen, den du selbst ausgerechnet hast — z. B. "Preis über 50". Meistens willst du aber relativ zu den Daten selbst vergleichen, z. B. "teurer als der Durchschnitt" — und dieser Durchschnitt ändert sich, sobald sich die Daten ändern. Eine Subquery berechnet ihn live mit.<br><br><b>Hinweis:</b> Die Tabelle <b>produkte</b> (id, name, preis) mit 5 Zeilen ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Gib Name und Preis aller Produkte aus, deren Preis <b>über dem Durchschnittspreis</b> aller Produkte liegt.`,
  setup: `CREATE TABLE produkte (id INTEGER, name TEXT, preis INTEGER);
INSERT INTO produkte VALUES (1,'Kabel',20),(2,'Maus',30),(3,'Tastatur',50),(4,'Monitor',200),(5,'Laptop',400);`,
  hints: [
    `Der Durchschnitt entsteht wie gewohnt über <code>AVG(preis)</code> — hier aber als eigene Abfrage in Klammern, nicht als Teil der äußeren SELECT-Liste.`,
    `Die Subquery steht direkt hinter dem Vergleichsoperator: <code>WHERE preis > (SELECT AVG(preis) FROM produkte)</code>.`,
    `So sieht die Lösung aus:<pre>SELECT name, preis FROM produkte
WHERE preis > (SELECT AVG(preis) FROM produkte);</pre>`,
  ] as const,
  solution: `SELECT name, preis FROM produkte
WHERE preis > (SELECT AVG(preis) FROM produkte);`,
  syntaxExplanation: `<ul><li><code>(SELECT AVG(preis) FROM produkte)</code> — eine vollständige Abfrage in Klammern, liefert genau einen Wert (den Durchschnittspreis).</li><li><code>WHERE preis > (...)</code> — die äußere Abfrage vergleicht jede Zeile gegen diesen einen Wert.</li><li>SQL führt die Subquery zuerst aus, danach die äußere Abfrage mit dem fertigen Ergebnis.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Produkte enthalten, deren Preis über dem tatsächlichen Durchschnittspreis aller Produkte liegt — nicht mehr, nicht weniger.`,
  extra: {
    pg: `Identisch in Postgres — Scalar Subqueries sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const preisIdx = cols.findIndex((c) => c.includes('preis'));
    if (nameIdx === -1 || preisIdx === -1) {
      return { ok: false, message: 'Es werden eine Namens- und eine Preisspalte erwartet.' };
    }
    let expectedRows: [string, number][];
    try {
      expectedRows = (
        engine.exec(
          'SELECT name, preis FROM produkte WHERE preis > (SELECT AVG(preis) FROM produkte) ORDER BY name',
        )[0]?.values ?? []
      ).map((r) => [String(r[0]), Number(r[1])]);
    } catch (e) {
      if (!tableExists(engine, 'produkte')) return { ok: false, message: 'Tabelle produkte wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    const gotRows = lastResult.values
      .map((r) => [String(r[nameIdx]), Number(r[preisIdx])] as [string, number])
      .sort((a, b) => a[0].localeCompare(b[0]));
    const matches =
      gotRows.length === expectedRows.length &&
      gotRows.every(([n, p], i) => n === expectedRows[i]?.[0] && p === expectedRows[i]?.[1]);
    if (!matches) {
      return {
        ok: false,
        message: `Ergebnis hat ${gotRows.length} Zeile(n), erwartet werden genau die ${expectedRows.length} Produkte über dem echten Durchschnittspreis.`,
      };
    }
    return { ok: true, message: `Korrekt: ${gotRows.length} Produkt(e) über dem Durchschnittspreis.` };
  },
  distractors: [
    {
      code: `SELECT name, preis FROM produkte
WHERE preis > (SELECT MIN(preis) FROM produkte);`,
      reason: 'vergleicht gegen das Minimum statt den Durchschnitt — liefert bei dieser Datenlage zu viele Zeilen (falsches Aggregat in der Subquery)',
    },
  ],
};
