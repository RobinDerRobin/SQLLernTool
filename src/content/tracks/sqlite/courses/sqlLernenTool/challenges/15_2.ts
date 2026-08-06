import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge15_2: SqlChallenge = {
  num: '15.2',
  title: 'Zeilen durchnummerieren: RANK()',
  tutorial: `Neben Aggregatfunktionen gibt es eigene <b>Rangfolge-Funktionen</b> fürs Fenster, die keine Werte zusammenfassen, sondern jede Zeile nummerieren. Die wichtigsten drei: <code>ROW_NUMBER()</code> (1, 2, 3, 4, ... immer fortlaufend, auch bei Gleichstand), <code>RANK()</code> (Gleichstand bekommt denselben Rang, danach entsteht eine Lücke — z. B. 1, 2, 2, 4), und <code>DENSE_RANK()</code> (Gleichstand bekommt denselben Rang, aber <i>ohne</i> Lücke — 1, 2, 2, 3). Alle drei brauchen eine Sortierreihenfolge, festgelegt mit <code>ORDER BY</code> <b>innerhalb</b> der <code>OVER</code>-Klammern: <pre>SELECT name, gehalt,
  RANK() OVER (ORDER BY gehalt DESC) AS rang
FROM mitarbeiter;</pre>Wichtig: Das <code>ORDER BY</code> hier legt nur fest, in welcher Reihenfolge <i>innerhalb des Fensters</i> gerechnet wird — es sortiert nicht automatisch das Endergebnis (dafür bräuchtest du weiterhin ein <code>ORDER BY</code> ganz am Ende der Abfrage).`,
  task: `Bisher konntest du nur nach einer Spalte sortieren (ORDER BY) — aber du konntest keine Zeile fragen "an welcher Stelle stehe ich?". Rangfolge-Funktionen beantworten genau das, inklusive dem richtigen Umgang mit Gleichstand.<br><br><b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> aus Challenge 15 wird automatisch bereitgestellt — Ben und David verdienen beide 4500 (Gleichstand!).<br><br><b>Deine Aufgabe:</b> Gib zu jedem Mitarbeiter Name, Gehalt und eine Spalte <b>rang</b> mit dem Rang nach Gehalt absteigend aus (höchstes Gehalt = Rang 1). Nutze <code>RANK()</code>, damit Ben und David bei Gleichstand denselben Rang bekommen.`,
  prereqNums: ['15'],
  prereqNote: `Setzt voraus, dass du Challenge 15 (Tabelle mitarbeiter) bereits ausgeführt hast.`,
  hints: [
    `<code>RANK()</code> braucht keine Argumente in den runden Klammern — die Sortierreihenfolge kommt separat in <code>OVER (ORDER BY ...)</code>.`,
    `Für "höchstes Gehalt zuerst" brauchst du <code>ORDER BY gehalt DESC</code> innerhalb der OVER-Klammern.`,
    `So sieht die Lösung aus:<pre>SELECT name, gehalt,
  RANK() OVER (ORDER BY gehalt DESC) AS rang
FROM mitarbeiter;</pre>`,
  ] as const,
  solution: `SELECT name, gehalt,
  RANK() OVER (ORDER BY gehalt DESC) AS rang
FROM mitarbeiter;`,
  syntaxExplanation: `<ul><li><code>RANK() OVER (ORDER BY gehalt DESC)</code> — nummeriert die Zeilen nach absteigendem Gehalt.</li><li>Ben und David verdienen beide 4500 und bekommen deshalb beide Rang 2 — der nächste Rang danach ist 4, nicht 3 (die Lücke ist das Kennzeichen von RANK, im Unterschied zu DENSE_RANK).</li></ul>`,
  successCriteria: `Jeder Mitarbeiter muss den korrekten RANK()-Wert nach Gehalt absteigend zeigen — Ben und David (beide 4500) müssen denselben Rang haben, mit einer Lücke danach.`,
  extra: {
    pg: `Identisch in Postgres — ROW_NUMBER/RANK/DENSE_RANK sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const gehaltIdx = cols.findIndex((c) => c.includes('gehalt'));
    const rangIdx = cols.findIndex((c) => c.includes('rang'));
    if (nameIdx === -1 || gehaltIdx === -1 || rangIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, gehalt und rang erwartet.' };
    }
    let expected: Map<string, { gehalt: number; rang: number }>;
    try {
      expected = new Map(
        (
          engine.exec(`SELECT name, gehalt, RANK() OVER (ORDER BY gehalt DESC) FROM mitarbeiter`)[0]?.values ?? []
        ).map((r) => [String(r[0]), { gehalt: Number(r[1]), rang: Number(r[2]) }]),
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
      if (Number(row[rangIdx]) !== exp.rang) {
        return { ok: false, message: `"${name}" zeigt rang = ${Number(row[rangIdx])}, erwartet wird ${exp.rang}.` };
      }
    }
    return { ok: true, message: 'Alle Mitarbeiter korrekt gerankt, inklusive Gleichstand bei Ben und David.' };
  },
  distractors: [
    {
      code: `SELECT name, gehalt,
  ROW_NUMBER() OVER (ORDER BY gehalt DESC) AS rang
FROM mitarbeiter;`,
      reason: 'benutzt ROW_NUMBER() statt RANK() — bei Gleichstand (Ben/David, beide 4500) vergibt ROW_NUMBER trotzdem zwei verschiedene Ränge statt desselben',
    },
  ],
};
