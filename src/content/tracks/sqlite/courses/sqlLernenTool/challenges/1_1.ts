import type { SqlChallenge } from '../../../types';

export const challenge1_1: SqlChallenge = {
  num: '1.1',
  title: 'Gezielt abfragen: SELECT, WHERE, ORDER BY',
  tutorial: `Bisher hast du nur <code>SELECT * FROM tabelle</code> genutzt — das gibt alle Spalten und Zeilen unverändert zurück. Meistens willst du aber gezielter arbeiten: <code>SELECT spalte1, spalte2 FROM tabelle</code> gibt nur bestimmte Spalten zurück. Mit <code>WHERE bedingung</code> filterst du Zeilen — nur die, die die Bedingung erfüllen, erscheinen im Ergebnis. Mit <code>ORDER BY spalte ASC</code> (oder <code>DESC</code> für absteigend) sortierst du das Ergebnis: <pre>SELECT name, signup_date FROM users\nWHERE signup_date >= '2025-01-10'\nORDER BY signup_date ASC;</pre>Text-Datumswerte im Format JJJJ-MM-TT lassen sich dabei problemlos wie Zahlen vergleichen, weil sie alphabetisch genauso sortieren wie chronologisch.`,
  task: `Diese kleine Zwischen-Challenge bereitet dich auf Challenge 2 vor: Dort wirst du Daten aus einer SELECT-Abfrage direkt in eine andere Tabelle übernehmen — dafür musst du erstmal sattelfest darin sein, gezielt (nicht nur alles) abzufragen.<br><br><b>Deine Aufgabe:</b> Gib aus der Tabelle <b>users</b> nur die Spalten <b>name</b> und <b>signup_date</b> aus — gefiltert auf Nutzer mit signup_date ab (einschließlich) '2025-01-10', aufsteigend sortiert nach signup_date.`,
  prereqNums: ['01'],
  prereqNote: `Setzt voraus, dass du Challenge 1 (Tabelle users) bereits ausgeführt hast.`,
  hints: [
    `Die Spaltenliste nach SELECT bestimmt, was zurückgegeben wird — <code>SELECT name, signup_date FROM ...</code> statt <code>SELECT * FROM ...</code>.`,
    `WHERE steht vor ORDER BY: erst filtern, dann sortieren. Der Vergleich <code>&gt;=</code> funktioniert bei Text-Datumswerten im ISO-Format wie erwartet.`,
    `So sieht die komplette Query aus:<pre>SELECT name, signup_date FROM users\nWHERE signup_date >= '2025-01-10'\nORDER BY signup_date ASC;</pre>`,
  ] as const,
  solution: `SELECT name, signup_date FROM users
WHERE signup_date >= '2025-01-10'
ORDER BY signup_date ASC;`,
  syntaxExplanation: `<ul><li><code>SELECT name, signup_date</code> — begrenzt das Ergebnis auf genau diese zwei Spalten.</li><li><code>WHERE signup_date >= '2025-01-10'</code> — filtert Zeilen, bevor sortiert wird.</li><li><code>ORDER BY signup_date ASC</code> — sortiert das gefilterte Ergebnis aufsteigend.</li></ul>`,
  successCriteria: `Das letzte SELECT-Ergebnis muss genau die Spalten <b>name</b> und <b>signup_date</b> enthalten, nur Zeilen ab '2025-01-10', aufsteigend nach signup_date sortiert.`,
  extra: {
    pg: `Identisch in Postgres. Bei einer echten DATE-Spalte würdest du dort ohne Anführungszeichen um das Datum herum genauso filtern, z. B. WHERE signup_date >= DATE '2025-01-10'.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.columns) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    if (cols.length !== 2 || !cols.includes('name') || !cols.includes('signup_date')) {
      return { ok: false, message: 'Das Ergebnis muss genau die Spalten name und signup_date enthalten.' };
    }
    const dateIdx = cols.indexOf('signup_date');
    const values = lastResult.values;
    if (!values.length) return { ok: false, message: 'Das Ergebnis enthält keine Zeilen — prüfe deine WHERE-Bedingung.' };
    for (const row of values) {
      if (String(row[dateIdx]) < '2025-01-10') return { ok: false, message: 'Es sind auch Zeilen vor 2025-01-10 enthalten.' };
    }
    for (let i = 1; i < values.length; i++) {
      if (String(values[i]?.[dateIdx]) < String(values[i - 1]?.[dateIdx])) {
        return { ok: false, message: 'Die Zeilen sind nicht aufsteigend nach signup_date sortiert.' };
      }
    }
    const expectedCount = Number(
      engine.exec("SELECT COUNT(*) FROM users WHERE signup_date >= '2025-01-10'")[0]?.values[0]?.[0],
    );
    if (values.length !== expectedCount) {
      return {
        ok: false,
        message: `Das Ergebnis hat ${values.length} Zeile(n), aber users enthält tatsächlich ${expectedCount} passende — es fehlen Zeilen (WHERE zu eng gefasst?).`,
      };
    }
    return { ok: true, message: `Ergebnis korrekt gefiltert und sortiert (${values.length} Zeile(n)).` };
  },
  distractors: [
    {
      code: `SELECT name, signup_date FROM users
WHERE signup_date >= '2025-01-20'
ORDER BY signup_date ASC;`,
      reason: 'jede zurückgegebene Zeile erfüllt die Bedingung und ist sortiert, aber die WHERE-Grenze ist zu eng — echte Treffer zwischen 2025-01-10 und 2025-01-20 fehlen unbemerkt',
    },
  ],
};
