import type { SqlChallenge } from '../../../types';

export const challenge23: SqlChallenge = {
  num: '23',
  title: 'Zahlen aufräumen: ROUND und ABS',
  tutorial: `Zwei kleine, aber häufig gebrauchte Zahlenfunktionen: <code>ROUND(x)</code> rundet auf eine ganze Zahl (oder mit einer zweiten Angabe wie <code>ROUND(x, 2)</code> auf eine bestimmte Nachkommastellenzahl), <code>ABS(x)</code> liefert den Betrag — negative Zahlen werden positiv, positive bleiben unverändert. Kombiniert lösen sie ein sehr reales Problem: Bei Kontobewegungen ist oft egal, ob Geld ein- oder ausgezahlt wurde (das Vorzeichen zeigt nur die Richtung), aber wichtig, <i>wie groß</i> die Bewegung war — dafür willst du den Betrag ohne Vorzeichen, auf ganze Einheiten gerundet: <pre>SELECT ROUND(ABS(betrag)) FROM bewegungen;</pre>`,
  task: `<b>Hinweis:</b> Die Tabelle <b>bewegungen</b> (id, betrag) ist bereits angelegt — <code>betrag</code> ist positiv bei Einzahlungen, negativ bei Auszahlungen, mit Nachkommastellen.<br><br><b>Deine Aufgabe:</b> Zeige zu jeder Bewegung <code>id</code> und die Bewegungsgröße als <code>groesse</code> — das ist der Betrag ohne Vorzeichen, auf eine ganze Zahl gerundet. Sortiere nach <code>id</code>.`,
  setup: `CREATE TABLE bewegungen (id INTEGER, betrag REAL);
INSERT INTO bewegungen VALUES (1,-49.6),(2,12.3),(3,-8.75),(4,100.0);`,
  hints: [
    `<code>ABS(betrag)</code> entfernt zuerst das Vorzeichen — Auszahlungen (negativ) und Einzahlungen (positiv) sehen danach gleich aus.`,
    `<code>ROUND(...)</code> um <code>ABS(betrag)</code> herum rundet das Ergebnis danach auf eine ganze Zahl.`,
    `So sieht die Lösung aus:<pre>SELECT id, ROUND(ABS(betrag)) AS groesse FROM bewegungen ORDER BY id;</pre>`,
  ] as const,
  solution: `SELECT id, ROUND(ABS(betrag)) AS groesse FROM bewegungen ORDER BY id;`,
  syntaxExplanation: `<ul><li><code>ABS(betrag)</code> — macht aus -49.6 und 49.6 dasselbe Ergebnis (49.6).</li><li><code>ROUND(...)</code> — rundet das Ergebnis von ABS auf eine ganze Zahl (49.6 → 50).</li></ul>`,
  successCriteria: `Das Ergebnis muss für jede Zeile den gerundeten Betrag ohne Vorzeichen zeigen (z. B. -49.6 → 50, nicht -50 oder 49.6), sortiert nach id.`,
  extra: {
    pg: `Identisch in Postgres — ROUND und ABS sind Standard-SQL-Funktionen.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [number, number][];
    try {
      const rows = engine.exec(`SELECT id, ROUND(ABS(betrag)) FROM bewegungen ORDER BY id`)[0]?.values ?? [];
      expected = rows.map((row) => [Number(row?.[0]), Number(row?.[1])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const idIdx = cols.indexOf('id');
    const groesseIdx = cols.indexOf('groesse');
    if (idIdx === -1 || groesseIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden id und groesse.` };
    }
    const actual = lastResult.values.map((row) => [Number(row[idIdx]), Number(row[groesseIdx])] as [number, number]);
    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden gerundete Beträge ohne Vorzeichen ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: 'Korrekt: alle Beträge ohne Vorzeichen und gerundet.' };
  },
  distractors: [
    {
      code: `SELECT id, ABS(betrag) AS groesse FROM bewegungen ORDER BY id;`,
      reason: 'entfernt das Vorzeichen korrekt (ABS), rundet aber nicht — liefert 49.6/12.3/8.75 statt der geforderten ganzen Zahlen 50/12/9',
    },
  ],
};
