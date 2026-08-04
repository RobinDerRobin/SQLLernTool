import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge14_2: SqlChallenge = {
  num: '14.2',
  title: 'Eine Subquery als Tabelle: Derived Table',
  tutorial: `Eine Subquery kann auch komplett anstelle einer Tabelle stehen — hinter <code>FROM</code>. SQL führt sie zuerst aus, und das Ergebnis wird für die äußere Abfrage wie eine ganz normale (temporäre) Tabelle behandelt. Man nennt das eine <b>Derived Table</b> ('abgeleitete Tabelle'): <pre>SELECT COUNT(*) AS anzahl FROM (
  SELECT name FROM produkte WHERE preis > 100
) AS teure;</pre>Wichtig: Nach der schließenden Klammer <b>muss</b> ein Alias stehen (hier <code>AS teure</code>) — SQL braucht einen Namen, um die abgeleitete Tabelle referenzieren zu können, auch wenn du ihn hier gar nicht weiter benutzt.`,
  task: `In Challenge 14 hast du direkt gefiltert. Manchmal willst du aber erst eine Zwischenmenge bilden (z. B. "alle teuren Produkte") und dann etwas <i>darüber</i> berechnen, z. B. sie zählen oder weiter einschränken. Dafür schachtelst du eine Subquery in <code>FROM</code> statt in <code>WHERE</code>.<br><br><b>Hinweis:</b> Die Tabelle <b>produkte</b> aus Challenge 14 wird automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Ermittle mit einer Subquery in <code>FROM</code>, wie viele Produkte teurer als der Durchschnittspreis sind. Gib eine Zeile mit einer Spalte <b>anzahl</b> aus.`,
  prereqNums: ['14'],
  prereqNote: `Setzt voraus, dass du Challenge 14 (Tabelle produkte) bereits ausgeführt hast.`,
  hints: [
    `Bau zuerst die innere Abfrage genau wie in Challenge 14 (Produkte über dem Durchschnitt), aber ohne sie direkt auszuführen — sie kommt in Klammern hinter FROM.`,
    `Vergiss den Alias nach der Klammer nicht: <code>FROM (...) AS irgendein_name</code>.`,
    `So sieht die Lösung aus:<pre>SELECT COUNT(*) AS anzahl FROM (
  SELECT name FROM produkte
  WHERE preis > (SELECT AVG(preis) FROM produkte)
) AS teure_produkte;</pre>`,
  ] as const,
  solution: `SELECT COUNT(*) AS anzahl FROM (
  SELECT name FROM produkte
  WHERE preis > (SELECT AVG(preis) FROM produkte)
) AS teure_produkte;`,
  syntaxExplanation: `<ul><li><code>FROM (SELECT ... ) AS teure_produkte</code> — die Klammer-Subquery wird zuerst berechnet, ihr Ergebnis danach wie eine normale Tabelle behandelt.</li><li><code>AS teure_produkte</code> — der Pflicht-Alias für die abgeleitete Tabelle.</li><li><code>COUNT(*)</code> zählt anschließend ganz normal die Zeilen dieser Zwischenmenge.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau eine Zeile mit einer Spalte anzahl liefern, die die tatsächliche Anzahl der Produkte über dem echten Durchschnittspreis zeigt.`,
  extra: {
    pg: `Identisch in Postgres — Derived Tables in FROM sind Standard-SQL. Der Alias nach der Klammer ist dort ebenfalls Pflicht.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values || lastResult.values.length === 0) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    if (lastResult.values.length !== 1) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet wird genau 1 Zeile mit der Anzahl.` };
    }
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    let anzahlIdx = cols.findIndex((c) => c.includes('anzahl') || c.includes('count'));
    if (anzahlIdx === -1) anzahlIdx = 0;
    let expected: number;
    try {
      expected = Number(
        engine.exec(
          'SELECT COUNT(*) FROM (SELECT name FROM produkte WHERE preis > (SELECT AVG(preis) FROM produkte)) AS t',
        )[0]?.values[0]?.[0],
      );
    } catch (e) {
      if (!tableExists(engine, 'produkte')) return { ok: false, message: 'Tabelle produkte wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    const got = Number(lastResult.values[0]?.[anzahlIdx]);
    if (got !== expected) {
      return { ok: false, message: `anzahl ist ${got}, erwartet wird die echte Anzahl ${expected}.` };
    }
    return { ok: true, message: `Korrekt: ${expected} Produkt(e) über dem Durchschnittspreis.` };
  },
  distractors: [
    {
      code: `SELECT COUNT(*) AS anzahl FROM (
  SELECT name FROM produkte
  WHERE preis > (SELECT MIN(preis) FROM produkte)
) AS teure_produkte;`,
      reason: 'vergleicht in der inneren Subquery gegen das Minimum statt den Durchschnitt — zählt bei dieser Datenlage zu viele Produkte',
    },
  ],
};
