import type { SqlChallenge } from '../../../types';

export const challenge14_1: SqlChallenge = {
  num: '14.1',
  title: 'Subquery in der SELECT-Liste',
  tutorial: `Eine Scalar Subquery muss nicht in <code>WHERE</code> stehen — sie funktioniert überall, wo ein einzelner Wert erwartet wird, auch direkt in der <code>SELECT</code>-Spaltenliste. So bekommt jede Zeile eine zusätzliche, berechnete Spalte dazu, ohne <code>GROUP BY</code> oder einen JOIN zu brauchen: <pre>SELECT name, preis,
  (SELECT AVG(preis) FROM produkte) AS durchschnitt
FROM produkte;</pre>Der Wert der Subquery ist bei jeder Zeile identisch (der Durchschnitt ändert sich ja nicht pro Zeile) — nützlich, um einen Einzelwert direkt neben die Zeilendaten zum Vergleich zu stellen.`,
  task: `In Challenge 14 hast du mit einer Subquery gefiltert. Jetzt willst du den Vergleichswert selbst sehen, nicht nur danach filtern — z. B. um in einer Tabelle direkt Preis und Durchschnitt nebeneinander zu haben.<br><br><b>Hinweis:</b> Die Tabelle <b>produkte</b> aus Challenge 14 wird automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Produkt Name, Preis und zusätzlich eine Spalte <b>durchschnitt</b> mit dem Durchschnittspreis aller Produkte aus (alle 5 Zeilen, überall derselbe Durchschnittswert).`,
  prereqNums: ['14'],
  prereqNote: `Setzt voraus, dass du Challenge 14 (Tabelle produkte) bereits ausgeführt hast.`,
  hints: [
    `Die Subquery steht diesmal nicht in WHERE, sondern direkt als weiterer Ausdruck in der SELECT-Liste, durch Komma getrennt.`,
    `Vergiss <code>AS durchschnitt</code> nicht — sonst hat die berechnete Spalte keinen sprechenden Namen.`,
    `So sieht die Lösung aus:<pre>SELECT name, preis,
  (SELECT AVG(preis) FROM produkte) AS durchschnitt
FROM produkte;</pre>`,
  ] as const,
  solution: `SELECT name, preis,
  (SELECT AVG(preis) FROM produkte) AS durchschnitt
FROM produkte;`,
  syntaxExplanation: `<ul><li><code>(SELECT AVG(preis) FROM produkte) AS durchschnitt</code> — die Subquery liefert einen einzigen Wert, der als eigene Spalte erscheint.</li><li>Dieser Wert ist bei jeder der 5 Zeilen identisch, weil die Subquery nicht von der jeweiligen Zeile abhängt.</li></ul>`,
  successCriteria: `Das Ergebnis muss alle 5 Produkte enthalten, jeweils mit name, preis und einer Spalte durchschnitt, die überall den echten Durchschnittspreis (140) zeigt.`,
  extra: {
    pg: `Identisch in Postgres — eine Subquery in der SELECT-Liste ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const preisIdx = cols.findIndex((c) => c === 'preis');
    const avgIdx = cols.findIndex((c) => c.includes('durchschnitt'));
    if (nameIdx === -1 || preisIdx === -1 || avgIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, preis und durchschnitt erwartet.' };
    }
    const trueAvg = Number(engine.exec('SELECT AVG(preis) FROM produkte')[0]?.values[0]?.[0]);
    const trueRows = new Map(
      (engine.exec('SELECT name, preis FROM produkte')[0]?.values ?? []).map((r) => [String(r[0]), Number(r[1])]),
    );
    if (lastResult.values.length !== trueRows.size) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet werden alle ${trueRows.size} Produkte.` };
    }
    for (const row of lastResult.values) {
      const name = String(row[nameIdx]);
      const preis = Number(row[preisIdx]);
      const avg = Number(row[avgIdx]);
      if (!trueRows.has(name) || trueRows.get(name) !== preis) {
        return { ok: false, message: `"${name}" mit Preis ${preis} stimmt nicht mit den echten Produktdaten überein.` };
      }
      if (Math.abs(avg - trueAvg) > 0.001) {
        return { ok: false, message: `Spalte durchschnitt zeigt ${avg} bei "${name}", erwartet wird der echte Durchschnitt ${trueAvg}.` };
      }
    }
    return { ok: true, message: `Alle Produkte korrekt mit Durchschnittspreis ${trueAvg} versehen.` };
  },
  distractors: [
    {
      code: `SELECT name, preis, 100 AS durchschnitt FROM produkte;`,
      reason: 'trägt eine geratene, falsche Zahl fest ein, statt den Durchschnitt per Subquery live zu berechnen',
    },
  ],
};
