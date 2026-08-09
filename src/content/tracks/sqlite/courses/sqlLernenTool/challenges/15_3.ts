import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge15_3: SqlChallenge = {
  num: '15.3',
  title: 'Auf Nachbarzeilen zugreifen: LAG()',
  tutorial: `<code>LAG(spalte)</code> liest den Wert der <b>vorherigen</b> Zeile (in der durch <code>ORDER BY</code> festgelegten Reihenfolge) direkt in die aktuelle Zeile hinein — etwas, das ohne Fensterfunktion nur über einen umständlichen Self-Join ginge. Das Gegenstück <code>LEAD(spalte)</code> macht dasselbe mit der <b>nächsten</b> Zeile: <pre>SELECT name, gehalt,
  LAG(gehalt) OVER (ORDER BY gehalt) AS vorheriges_gehalt
FROM mitarbeiter;</pre>Für die allererste Zeile in der Sortierreihenfolge gibt es keine vorherige Zeile — <code>LAG</code> liefert dort <code>NULL</code>. Bei <code>LEAD</code> ist es symmetrisch die letzte Zeile, die <code>NULL</code> bekommt.`,
  task: `Manchmal willst du eine Zeile direkt mit ihrer Nachbarin vergleichen — z. B. "wie viel mehr verdient diese Person als die nächstniedrigere?". LAG/LEAD holen den Nachbarwert direkt in die Zeile, ohne Self-Join.<br><br><b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> aus Challenge 15 wird automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Mitarbeiter Name, Gehalt (aufsteigend sortiert) und eine Spalte <b>vorheriges_gehalt</b> mit dem Gehalt der/des nächstniedriger bezahlten Person aus. Die niedrigst bezahlte Person zeigt dort NULL.`,
  prereqNums: ['15'],
  prereqNote: `Setzt voraus, dass du Challenge 15 (Tabelle mitarbeiter) bereits ausgeführt hast.`,
  hints: [
    `<code>LAG(gehalt)</code> braucht wie die Rangfolge-Funktionen ein <code>OVER (ORDER BY ...)</code>, das die Reihenfolge der "Nachbarschaft" festlegt.`,
    `Für "aufsteigend" (niedrigstes Gehalt zuerst) brauchst du <code>ORDER BY gehalt</code> — ohne <code>DESC</code>.`,
    `So sieht die Lösung aus:<pre>SELECT name, gehalt,
  LAG(gehalt) OVER (ORDER BY gehalt) AS vorheriges_gehalt
FROM mitarbeiter
ORDER BY gehalt;</pre>`,
  ] as const,
  solution: `SELECT name, gehalt,
  LAG(gehalt) OVER (ORDER BY gehalt) AS vorheriges_gehalt
FROM mitarbeiter
ORDER BY gehalt;`,
  syntaxExplanation: `<ul><li><code>LAG(gehalt) OVER (ORDER BY gehalt)</code> — holt für jede Zeile das Gehalt der Zeile mit dem nächstniedrigeren Wert.</li><li>Die niedrigst bezahlte Person hat keine "vorherige" Zeile — dort steht NULL.</li><li>Das äußere <code>ORDER BY gehalt</code> am Ende sortiert zusätzlich das sichtbare Ergebnis (das OVER-ORDER BY allein sortiert nur die Fensterberechnung, nicht die Ausgabe).</li></ul>`,
  successCriteria: `Jede Zeile muss in vorheriges_gehalt das Gehalt der nächstniedriger bezahlten Person zeigen (NULL bei der niedrigsten).`,
  extra: {
    pg: `Identisch in Postgres — LAG/LEAD sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const gehaltIdx = cols.findIndex((c) => c.includes('gehalt') && !c.includes('vorherig'));
    const lagIdx = cols.findIndex((c) => c.includes('vorherig'));
    if (nameIdx === -1 || gehaltIdx === -1 || lagIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, gehalt und vorheriges_gehalt erwartet.' };
    }
    let expected: Map<string, { gehalt: number; lag: number | null }>;
    try {
      expected = new Map(
        (
          engine.exec(`SELECT name, gehalt, LAG(gehalt) OVER (ORDER BY gehalt) FROM mitarbeiter`)[0]?.values ?? []
        ).map((r) => [String(r[0]), { gehalt: Number(r[1]), lag: r[2] === null ? null : Number(r[2]) }]),
      );
    } catch (e) {
      if (!tableExists(engine, 'mitarbeiter')) return { ok: false, message: 'Tabelle mitarbeiter wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    if (lastResult.values.length !== expected.size) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet werden alle ${expected.size} Mitarbeiter.` };
    }
    for (const row of lastResult.values) {
      const name = String(row[nameIdx]);
      const exp = expected.get(name);
      if (!exp) return { ok: false, message: `"${name}" ist kein bekannter Mitarbeiter.` };
      if (Number(row[gehaltIdx]) !== exp.gehalt) {
        return { ok: false, message: `"${name}" hat ein falsches gehalt.` };
      }
      const got = row[lagIdx] === null ? null : Number(row[lagIdx]);
      if (got !== exp.lag) {
        return { ok: false, message: `"${name}" zeigt vorheriges_gehalt = ${String(got)}, erwartet wird ${String(exp.lag)}.` };
      }
    }
    return { ok: true, message: 'Alle Mitarbeiter korrekt mit dem Gehalt der nächstniedriger bezahlten Person versehen.' };
  },
  distractors: [
    {
      code: `SELECT name, gehalt,
  LEAD(gehalt) OVER (ORDER BY gehalt) AS vorheriges_gehalt
FROM mitarbeiter
ORDER BY gehalt;`,
      reason: 'benutzt LEAD() statt LAG() — zeigt das Gehalt der nächsthöheren statt der nächstniedrigeren Person, also die falsche Richtung',
    },
  ],
};
