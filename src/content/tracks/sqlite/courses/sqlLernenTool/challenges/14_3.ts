import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge14_3: SqlChallenge = {
  num: '14.3',
  title: 'Mehrere Werte aus einer Subquery: IN (SELECT ...)',
  tutorial: `Eine Scalar Subquery liefert genau einen Wert — aber eine Subquery kann auch <b>mehrere</b> Zeilen (eine Spalte) zurückgeben. Dann funktioniert <code>=</code> nicht mehr, weil SQL nicht weiß, mit welchem der Werte verglichen werden soll. Stattdessen benutzt du <code>IN</code>, genau wie du es schon mit einer festen Werteliste kennst — nur dass die Liste diesmal aus einer Abfrage kommt: <pre>SELECT * FROM bestellungen
WHERE produkt_id IN (
  SELECT id FROM produkte WHERE preis > 100
);</pre>SQL berechnet zuerst die innere Liste aller passenden IDs, und prüft danach für jede äußere Zeile, ob ihr Wert darin vorkommt.`,
  task: `Bisher hast du IN nur mit fest hingeschriebenen Werten benutzt (<code>IN (1, 2, 3)</code>). Meistens kennst du diese Werte aber gar nicht im Voraus — sie ergeben sich erst aus einer anderen Tabelle. Eine Subquery in IN berechnet die Liste live.<br><br><b>Hinweis:</b> Die Tabelle <b>produkte</b> aus Challenge 14 wird automatisch bereitgestellt. Zusätzlich legt diese Challenge eine Tabelle <b>bestellungen</b> (id, produkt_id, menge) mit 6 Zeilen an.<br><br><b>Deine Aufgabe:</b> Gib alle Bestellungen aus, deren Produkt mehr als 100 kostet.`,
  prereqNums: ['14'],
  prereqNote: `Setzt voraus, dass du Challenge 14 (Tabelle produkte) bereits ausgeführt hast.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, produkt_id INTEGER, menge INTEGER);
INSERT INTO bestellungen VALUES (1,1,3),(2,2,1),(3,4,2),(4,5,1),(5,3,5),(6,4,4);`,
  hints: [
    `Ermittle zuerst, wie du an die passenden Produkt-IDs kommst: <code>SELECT id FROM produkte WHERE preis > 100</code>.`,
    `Diese Abfrage kommt komplett in Klammern hinter <code>produkt_id IN (...)</code>.`,
    `So sieht die Lösung aus:<pre>SELECT * FROM bestellungen
WHERE produkt_id IN (
  SELECT id FROM produkte WHERE preis > 100
);</pre>`,
  ] as const,
  solution: `SELECT * FROM bestellungen
WHERE produkt_id IN (
  SELECT id FROM produkte WHERE preis > 100
);`,
  syntaxExplanation: `<ul><li><code>SELECT id FROM produkte WHERE preis > 100</code> — die innere Subquery liefert eine Liste von IDs (hier: Monitor, Laptop).</li><li><code>produkt_id IN (...)</code> — die äußere Abfrage behält nur Bestellungen, deren produkt_id in dieser Liste vorkommt.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Bestellungen enthalten, deren zugehöriges Produkt tatsächlich mehr als 100 kostet — nicht mehr, nicht weniger.`,
  extra: {
    pg: `Identisch in Postgres — IN (SELECT ...) ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const idIdx = cols.findIndex((c) => c === 'id');
    if (idIdx === -1) {
      return { ok: false, message: 'Es wird eine Spalte id (der Bestellung) erwartet.' };
    }
    let expectedIds: number[];
    try {
      expectedIds = (
        engine.exec(
          'SELECT id FROM bestellungen WHERE produkt_id IN (SELECT id FROM produkte WHERE preis > 100) ORDER BY id',
        )[0]?.values ?? []
      ).map((r) => Number(r[0]));
    } catch (e) {
      if (!tableExists(engine, 'bestellungen')) return { ok: false, message: 'Tabelle bestellungen wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    const gotIds = lastResult.values.map((r) => Number(r[idIdx])).sort((a, b) => a - b);
    const matches =
      gotIds.length === expectedIds.length && gotIds.every((id, i) => id === expectedIds[i]);
    if (!matches) {
      return {
        ok: false,
        message: `Ergebnis enthält ${gotIds.length} Bestellung(en) (IDs ${gotIds.join(', ')}), erwartet werden genau die ${expectedIds.length} Bestellungen mit IDs ${expectedIds.join(', ')}.`,
      };
    }
    return { ok: true, message: `Korrekt: ${gotIds.length} Bestellung(en) für Produkte über 100.` };
  },
  distractors: [
    {
      code: `SELECT * FROM bestellungen
WHERE produkt_id IN (
  SELECT id FROM produkte WHERE preis > 30
);`,
      reason: 'nimmt eine zu niedrige Preisgrenze in der inneren Subquery — schließt dadurch ein zusätzliches Produkt (und damit eine falsche Bestellung) mit ein',
    },
  ],
};
