import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge06: SqlChallenge = {
  num: '06',
  title: 'CROSS JOIN für Kombinationen',
  tutorial: `Neues Konzept: Ein <b>JOIN</b> kombiniert Zeilen aus zwei Tabellen zu einer gemeinsamen Ergebnis-Tabelle. Es gibt verschiedene Arten von JOINs — die einfachste ist <code>CROSS JOIN</code>: Er verlangt keine Bedingung und kombiniert einfach <i>jede</i> Zeile der einen Tabelle mit <i>jeder</i> Zeile der anderen. Aus 3 × 2 Zeilen werden so 6 Kombinationen: <pre>SELECT * FROM tabelle_a CROSS JOIN tabelle_b;</pre>Andere JOIN-Arten (die du später kennenlernst) verknüpfen Zeilen stattdessen gezielt über eine <code>ON</code>-Bedingung, z. B. wenn eine ID in beiden Tabellen übereinstimmt — CROSS JOIN kennt so eine Einschränkung bewusst nicht.`,
  task: `Manchmal brauchst du nicht zufällige, sondern jede mögliche Kombination zweier Eigenschaften — z. B. jede Farbe in jeder Größe für einen Produktkatalog. CROSS JOIN ist genau dafür da: Er kombiniert konsequent jede Zeile der einen mit jeder Zeile der anderen Tabelle.<br><br><b>Hinweis:</b> Die Tabellen <b>colors</b> (5 Zeilen) und <b>sizes</b> (4 Zeilen) sind für diese Challenge bereits automatisch angelegt — hier geht es um den CROSS JOIN, nicht ums Anlegen der Ausgangsdaten.<br><br><b>Deine Aufgabe:</b> Erzeuge aus <b>colors</b> und <b>sizes</b> alle 20 Kombinationen als neue Tabelle <b>products</b>.`,
  setup: `CREATE TABLE colors (color TEXT);
INSERT INTO colors VALUES ('Rot'),('Blau'),('Grün'),('Gelb'),('Schwarz');

CREATE TABLE sizes (size TEXT);
INSERT INTO sizes VALUES ('S'),('M'),('L'),('XL');`,
  hints: [
    `colors und sizes sind schon da — schau bei Bedarf in der Tabellenübersicht nach, welche Spalten sie haben.`,
    `CROSS JOIN steht einfach zwischen den beiden Tabellennamen — keine ON-Bedingung nötig, im Unterschied zu einem normalen JOIN.`,
    `So sieht die Lösung aus:<pre>CREATE TABLE products AS\nSELECT color, size FROM colors CROSS JOIN sizes;</pre>`,
  ] as const,
  solution: `CREATE TABLE products AS
SELECT color, size FROM colors CROSS JOIN sizes;

SELECT * FROM products;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE products AS SELECT color, size FROM colors CROSS JOIN sizes;</code> — kombiniert jede Zeile aus colors mit jeder Zeile aus sizes, ganz ohne ON-Bedingung.</li></ul>`,
  successCriteria: `Die Tabelle <b>products</b> muss genau 20 Zeilen enthalten (alle Kombinationen aus 5 Farben × 4 Größen).`,
  extra: {
    pg: `Identisch in Postgres — CROSS JOIN und CREATE TABLE AS SELECT funktionieren genauso.`,
  },
  validate: (engine) => {
    try {
      const count = Number(engine.exec('SELECT COUNT(*) FROM products')[0]?.values[0]?.[0]);
      if (count === 20) return { ok: true, message: 'products enthält alle 20 Kombinationen.' };
      return { ok: false, message: `products hat ${count} Zeile(n), erwartet 20 (5 Farben × 4 Größen).` };
    } catch (e) {
      if (!tableExists(engine, 'products')) return { ok: false, message: 'Tabelle products wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle products existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
