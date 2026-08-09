import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge15_4: SqlChallenge = {
  num: '15.4',
  title: 'Laufende Summen: Fensterfunktionen ohne Gruppierung',
  tutorial: `<code>SUM(...)</code> kennst du bisher nur als Aggregatfunktion, die viele Zeilen zu einer zusammenfasst. Mit <code>OVER (ORDER BY ...)</code> dahinter wird daraus etwas anderes: eine <b>laufende Summe</b> ("running total") — jede Zeile zeigt die Summe aller Werte <i>bis einschließlich ihrer eigenen Position</i> in der Sortierreihenfolge: <pre>SELECT name, gehalt,
  SUM(gehalt) OVER (ORDER BY gehalt) AS laufende_summe
FROM mitarbeiter;</pre>Der Unterschied zu Challenge 15 (<code>OVER ()</code>, leere Klammern): Sobald ein <code>ORDER BY</code> in der <code>OVER</code>-Klausel steht, ist das Standardverhalten nicht mehr "über alle Zeilen", sondern "über alle Zeilen von Anfang bis zur aktuellen Position" — SQLite fasst das Fenster bei jeder Zeile automatisch enger.`,
  task: `Laufende Summen brauchst du überall dort, wo ein "bis hierhin"-Zwischenstand wichtig ist — z. B. ein Kontostand nach jeder Transaktion, oder wie viel Budget nach jeder Gehaltsstufe schon verplant ist.<br><br><b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> aus Challenge 15 wird automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Mitarbeiter (aufsteigend nach Gehalt sortiert) Name, Gehalt und eine Spalte <b>laufende_summe</b> aus, die die Summe aller Gehälter bis einschließlich der aktuellen Zeile zeigt.`,
  prereqNums: ['15'],
  prereqNote: `Setzt voraus, dass du Challenge 15 (Tabelle mitarbeiter) bereits ausgeführt hast.`,
  hints: [
    `<code>SUM(gehalt) OVER (ORDER BY gehalt)</code> — sobald ORDER BY im Fenster steht, wird pro Zeile nur bis zur eigenen Position aufsummiert, nicht über die ganze Tabelle.`,
    `Sortiere zusätzlich das sichtbare Ergebnis mit einem äußeren <code>ORDER BY gehalt</code>, damit die laufende Summe auch optisch nachvollziehbar aufsteigt.`,
    `So sieht die Lösung aus:<pre>SELECT name, gehalt,
  SUM(gehalt) OVER (ORDER BY gehalt) AS laufende_summe
FROM mitarbeiter
ORDER BY gehalt;</pre>`,
  ] as const,
  solution: `SELECT name, gehalt,
  SUM(gehalt) OVER (ORDER BY gehalt) AS laufende_summe
FROM mitarbeiter
ORDER BY gehalt;`,
  syntaxExplanation: `<ul><li><code>SUM(gehalt) OVER (ORDER BY gehalt)</code> — läuft von der niedrigsten Zeile aus aufwärts und summiert jedes Mal alles bis zur aktuellen Position.</li><li>Die letzte Zeile in der Sortierung zeigt automatisch die Gesamtsumme aller Gehälter, weil bei ihr "bis einschließlich hier" gleich "alle Zeilen" ist.</li></ul>`,
  successCriteria: `Jede Zeile muss in laufende_summe die echte kumulierte Summe aller Gehälter bis zur eigenen Position (aufsteigend nach Gehalt) zeigen.`,
  extra: {
    pg: `Identisch in Postgres — das implizite "bis zur aktuellen Zeile"-Fenster bei ORDER BY ohne explizite Frame-Angabe ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const gehaltIdx = cols.findIndex((c) => c.includes('gehalt') && !c.includes('summe'));
    const sumIdx = cols.findIndex((c) => c.includes('summe'));
    if (nameIdx === -1 || gehaltIdx === -1 || sumIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, gehalt und laufende_summe erwartet.' };
    }
    let expected: Map<string, { gehalt: number; sum: number }>;
    try {
      expected = new Map(
        (
          engine.exec(`SELECT name, gehalt, SUM(gehalt) OVER (ORDER BY gehalt) FROM mitarbeiter`)[0]?.values ?? []
        ).map((r) => [String(r[0]), { gehalt: Number(r[1]), sum: Number(r[2]) }]),
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
      if (Number(row[sumIdx]) !== exp.sum) {
        return { ok: false, message: `"${name}" zeigt laufende_summe = ${Number(row[sumIdx])}, erwartet wird ${exp.sum}.` };
      }
    }
    return { ok: true, message: 'Alle Mitarbeiter korrekt mit der laufenden Summe versehen.' };
  },
  distractors: [
    {
      code: `SELECT name, gehalt,
  SUM(gehalt) OVER () AS laufende_summe
FROM mitarbeiter
ORDER BY gehalt;`,
      reason: 'lässt ORDER BY innerhalb von OVER() weg — dadurch bekommt jede Zeile die Gesamtsumme aller Gehälter statt einer echten laufenden Summe',
    },
  ],
};
