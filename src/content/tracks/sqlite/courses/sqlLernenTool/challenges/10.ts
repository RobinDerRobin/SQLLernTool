import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge10: SqlChallenge = {
  num: '10',
  title: 'Synthetisches Datenset mit Beziehung',
  tutorial: `Zwei Konzepte kommen hier zusammen. Erstens: Ein <b>Fremdschlüssel</b> ist eine Spalte, die auf die ID-Spalte einer anderen Tabelle verweist — so entsteht eine Beziehung zwischen zwei Tabellen (z. B. 'diese Order gehört zu diesem Kunden'). Um das zufällig zu simulieren, würfelst du bei jeder neuen Zeile eine existierende ID der anderen Tabelle: <pre>-- customer_id zufällig zwischen 1 und 100\nABS(RANDOM() % 100) + 1</pre>Zweitens: Anders als der CROSS JOIN aus Challenge 6 (jede Zeile mit jeder) verknüpft ein normaler <code>JOIN ... ON</code> Zeilen gezielt dort, wo eine Bedingung zutrifft — hier: wo die customer_id der Order mit der id des Kunden übereinstimmt. So bekommst du zu jeder Order automatisch die passenden Kundendaten dazu.`,
  task: `Die meisten echten Datenbanken bestehen aus mehreren verknüpften Tabellen, nicht aus einer einzigen. Hier bringst du alles zusammen, was du bisher gelernt hast — Zahlenreihen, Zufallswerte und Verknüpfungen —, um ein realistisches, zusammenhängendes Mini-Datenset mit einer echten Kunden-Bestellungs-Beziehung zu bauen, so wie es in einem echten Projekt aussehen könnte.<br><br><b>Deine Aufgabe:</b> Erzeuge <b>customers</b> (100 Zeilen) und <b>orders</b> (1000 Zeilen), wobei jede Order per customer_id auf eine zufällige, existierende Kunden-ID verweist. Zeig danach mit einem JOIN, wie viele Bestellungen die Top-10-Kunden haben. <b>Wichtig:</b> Dieser JOIN muss das <b>letzte</b> SELECT-Statement deiner Query sein — das ist das Ergebnis, das geprüft wird.`,
  hints: [
    `Baue zuerst customers auf, genau wie die Zahlenreihe aus Challenge 3 — nur mit einer Namensspalte statt nur Zahlen.`,
    `customer_id entsteht wie der Zufallswert aus Challenge 5: <code>ABS(RANDOM() % 100) + 1</code>, begrenzt auf die 100 existierenden Kunden-IDs.`,
    `Der abschließende JOIN gruppiert nach Kunde:<pre>SELECT c.name, COUNT(o.id) AS anzahl_bestellungen\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.name\nORDER BY anzahl_bestellungen DESC\nLIMIT 10;</pre>`,
  ] as const,
  solution: `CREATE TABLE customers (id INTEGER, name TEXT);
WITH RECURSIVE c(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM c WHERE n < 100
)
INSERT INTO customers SELECT n, 'Kunde ' || n FROM c;

CREATE TABLE orders (id INTEGER, customer_id INTEGER);
WITH RECURSIVE o(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM o WHERE n < 1000
)
INSERT INTO orders
SELECT n, ABS(RANDOM() % 100) + 1 FROM o;

SELECT c.name, COUNT(o.id) AS anzahl_bestellungen
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY anzahl_bestellungen DESC
LIMIT 10;`,
  syntaxExplanation: `<ul><li>Zwei unabhängige CTE-Zahlenreihen erzeugen customers (100) und orders (1000).</li><li><code>ABS(RANDOM() % 100) + 1</code> als customer_id — simuliert einen Fremdschlüssel auf eine zufällige, existierende Kunden-ID.</li><li><code>JOIN orders o ON o.customer_id = c.id</code> — verknüpft Zeilen gezielt über Gleichheit, statt jede mit jeder (wie CROSS JOIN); <code>GROUP BY</code>, <code>ORDER BY</code> und <code>LIMIT</code> erzeugen das Top-10-Ranking.</li></ul>`,
  successCriteria: `customers muss genau 100 Zeilen haben, orders genau 1000 Zeilen mit gültigen customer_id-Verweisen, und die Query muss abschließend ein JOIN-Ergebnis (Top-10-Kunden) liefern.`,
  nondeterministic: true,
  extra: {
    pg: `In Postgres würdest du üblicherweise einen echten Fremdschlüssel definieren:\n\ncustomer_id INTEGER REFERENCES customers(id)\n\nund die Zufallszahl über FLOOR(RANDOM()*100+1)::int erzeugen.`,
  },
  validate: (engine, lastResult) => {
    try {
      const custCount = Number(engine.exec('SELECT COUNT(*) FROM customers')[0]?.values[0]?.[0]);
      const orderCount = Number(engine.exec('SELECT COUNT(*) FROM orders')[0]?.values[0]?.[0]);
      if (custCount !== 100 || orderCount !== 1000) {
        return { ok: false, message: `customers: ${custCount}, orders: ${orderCount} — erwartet 100 bzw. 1000.` };
      }
      const invalidRefs = Number(
        engine.exec('SELECT COUNT(*) FROM orders WHERE customer_id NOT IN (SELECT id FROM customers)')[0]?.values[0]?.[0],
      );
      if (invalidRefs > 0) {
        return {
          ok: false,
          message: `${invalidRefs} orders-Zeile(n) verweisen per customer_id auf keine existierende Kunden-ID — die Beziehung muss auf echte, existierende Kunden zeigen.`,
        };
      }
      const rows = lastResult?.values ?? [];
      if (rows.length === 0 || rows.length > 10) {
        return {
          ok: false,
          message: `Das letzte SELECT-Ergebnis hat ${rows.length} Zeile(n) — erwartet werden 1 bis 10 (Top-10-Kunden per LIMIT 10).`,
        };
      }
      const counts = rows.map((r) => Number(r[1]));
      if (counts.some((n) => !Number.isFinite(n) || n <= 0) || counts.reduce((a, b) => a + b, 0) > orderCount) {
        return {
          ok: false,
          message: 'Das letzte SELECT-Ergebnis sieht nicht wie ein echtes JOIN-Ranking aus (Bestellzahlen fehlen, sind 0/negativ, oder summieren sich auf mehr als es orders gibt).',
        };
      }
      return {
        ok: true,
        message: `customers (100) und orders (1000) sind korrekt per FK verknüpft, dein JOIN liefert ${rows.length} plausible Top-Kunden-Zeile(n).`,
      };
    } catch (e) {
      if (!tableExists(engine, 'customers')) return { ok: false, message: 'Tabelle customers wurde noch nicht angelegt.' };
      if (!tableExists(engine, 'orders')) return { ok: false, message: 'Tabelle orders wurde noch nicht angelegt.' };
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE customers (id INTEGER, name TEXT);
WITH RECURSIVE c(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM c WHERE n < 100
)
INSERT INTO customers SELECT n, 'Kunde ' || n FROM c;

CREATE TABLE orders (id INTEGER, customer_id INTEGER);
WITH RECURSIVE o(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM o WHERE n < 1000
)
INSERT INTO orders SELECT n, 99999 FROM o;

SELECT 'Kunde 1' AS name, 5 AS anzahl_bestellungen;`,
      reason: 'customers/orders haben die richtige Zeilenzahl, aber jede customer_id verweist auf eine nicht existierende Kunden-ID, und das letzte SELECT ist ein frei erfundenes Ergebnis statt eines echten JOIN',
    },
  ],
};
