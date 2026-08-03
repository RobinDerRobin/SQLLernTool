import type { SqlChallenge } from '../../../types';

export const challenge11_7: SqlChallenge = {
  num: '11.7',
  title: 'Gruppen filtern: HAVING',
  tutorial: `<code>WHERE</code> filtert einzelne Zeilen, <i>bevor</i> gruppiert wird — es kann sich deshalb nicht auf das Ergebnis einer Aggregatfunktion wie <code>COUNT(*)</code> beziehen (die gibt es zu diesem Zeitpunkt noch gar nicht). <code>HAVING</code> filtert dagegen die fertigen <i>Gruppen</i>, <i>nachdem</i> <code>GROUP BY</code> sie gebildet hat: <pre>SELECT kunde, COUNT(*) AS anzahl
FROM bestellungen
GROUP BY kunde
HAVING COUNT(*) > 2;</pre>Die Reihenfolge ist damit immer: <code>WHERE</code> (Zeilen filtern) → <code>GROUP BY</code> (gruppieren) → <code>HAVING</code> (Gruppen filtern).`,
  task: `"Zeig mir nur die Kunden mit mehr als 2 Bestellungen" lässt sich nicht mit WHERE lösen — WHERE kennt COUNT(*) noch nicht, weil zu diesem Zeitpunkt noch gar nicht gruppiert wurde. HAVING ist genau für solche Fälle da: Filtern anhand eines aggregierten Werts.<br><br><b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (7 Zeilen) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Zeige nur die Kunden, die <i>mehr als 2</i> Bestellungen haben, zusammen mit ihrer jeweiligen Anzahl.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, kunde TEXT);
INSERT INTO bestellungen VALUES (1,'Anna'),(2,'Anna'),(3,'Anna'),(4,'Ben'),(5,'Ben'),(6,'Clara'),(7,'Anna');`,
  hints: [
    `Erst wie gewohnt gruppieren und zählen: <code>SELECT kunde, COUNT(*) AS anzahl FROM bestellungen GROUP BY kunde</code>.`,
    `<code>HAVING</code> kommt <i>nach</i> <code>GROUP BY</code> und darf sich auf <code>COUNT(*)</code> beziehen — <code>WHERE COUNT(*) &gt; 2</code> wäre dagegen ein Fehler.`,
    `So sieht die Lösung aus:<pre>SELECT kunde, COUNT(*) AS anzahl
FROM bestellungen
GROUP BY kunde
HAVING COUNT(*) > 2;</pre>`,
  ] as const,
  solution: `SELECT kunde, COUNT(*) AS anzahl
FROM bestellungen
GROUP BY kunde
HAVING COUNT(*) > 2;`,
  syntaxExplanation: `<ul><li><code>GROUP BY kunde</code> — bildet eine Gruppe je Kunde, wie gewohnt.</li><li><code>HAVING COUNT(*) &gt; 2</code> — behält nur die Gruppen, deren Zeilenanzahl über 2 liegt; Ben (2) und Clara (1) fallen raus.</li><li>Anna hat 4 Bestellungen und bleibt als einzige übrig.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau eine Zeile enthalten: Anna mit 4 Bestellungen. Ben und Clara dürfen nicht erscheinen.`,
  extra: {
    pg: `Identisch in Postgres — HAVING ist Standard-SQL und funktioniert dort genauso nach GROUP BY.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const rows = lastResult.values;
    if (rows.length !== 1) return { ok: false, message: `Es sind ${rows.length} Zeile(n) — erwartet wird genau 1 (nur Anna).` };
    const row = rows[0] ?? [];
    const name = String(row[0]);
    const count = Number(row[1]);
    if (name !== 'Anna' || count !== 4) {
      return { ok: false, message: `Ergebnis ist "${name}" mit ${count} — erwartet wird Anna mit 4.` };
    }
    return { ok: true, message: 'HAVING korrekt: nur Anna mit mehr als 2 Bestellungen.' };
  },
};
