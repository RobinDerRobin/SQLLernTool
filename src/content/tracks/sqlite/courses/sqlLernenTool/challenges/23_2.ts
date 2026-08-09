import type { SqlChallenge } from '../../../types';

export const challenge23_2: SqlChallenge = {
  num: '23.2',
  title: 'Typen erzwingen: CAST',
  tutorial: `SQLite ist bei Datentypen ungewöhnlich locker — eine Spalte kann als <code>TEXT</code> deklariert sein und trotzdem Zahlen enthalten, z. B. nach einem unsauberen CSV-Import. Das Problem: <code>'12000' &gt; '4500'</code> vergleicht als <b>Text</b> Zeichen für Zeichen von links, nicht als Zahl — <code>'1'</code> ist "kleiner" als <code>'4'</code>, also gilt <code>'12000' &lt; '4500'</code>, obwohl 12000 die größere Zahl ist. <code>CAST(x AS INTEGER)</code> erzwingt eine echte Typumwandlung, bevor verglichen wird: <pre>WHERE CAST(gehalt_text AS INTEGER) > 4000</pre>Jetzt vergleicht SQLite echte Zahlen, nicht Zeichenketten.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, gehalt_text) ist bereits angelegt — <code>gehalt_text</code> ist als TEXT gespeichert, enthält aber Zahlen unterschiedlicher Länge.<br><br><b>Deine Aufgabe:</b> Finde alle Mitarbeiter mit einem Gehalt über 4000 — wandle <code>gehalt_text</code> dafür zuerst mit CAST in eine Zahl um, damit der Vergleich numerisch statt alphabetisch erfolgt. Zeige nur die Namen, sortiert alphabetisch.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, gehalt_text TEXT);
INSERT INTO mitarbeiter VALUES (1,'Anna','3000'),(2,'Ben','4500'),(3,'Clara','950'),(4,'David','12000');`,
  hints: [
    `<code>CAST(gehalt_text AS INTEGER)</code> wandelt den Text in eine echte Zahl um, bevor er mit 4000 verglichen wird.`,
    `Ohne CAST würde SQLite Zeichen für Zeichen vergleichen — '12000' wäre dann "kleiner" als '4000', obwohl 12000 die größere Zahl ist.`,
    `So sieht die Lösung aus:<pre>SELECT name FROM mitarbeiter WHERE CAST(gehalt_text AS INTEGER) > 4000 ORDER BY name;</pre>`,
  ] as const,
  solution: `SELECT name FROM mitarbeiter WHERE CAST(gehalt_text AS INTEGER) > 4000 ORDER BY name;`,
  syntaxExplanation: `<ul><li><code>CAST(gehalt_text AS INTEGER)</code> — wandelt den Text-Wert in eine echte Zahl um.</li><li><code>&gt; 4000</code> — der Vergleich erfolgt danach numerisch, nicht alphabetisch.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau Ben (4500) und David (12000) enthalten — Clara (950, aber alphabetisch "größer" als '4000') darf nicht fälschlich erscheinen, David nicht fälschlich fehlen.`,
  extra: {
    pg: `Identisch in Postgres — CAST(x AS type) ist Standard-SQL. Der Unterschied ist eher, dass Postgres von Anfang an strikt typisiert ist und diesen Fehler oft schon beim Anlegen der Spalte verhindert hätte.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: string[];
    try {
      const rows =
        engine.exec(`SELECT name FROM mitarbeiter WHERE CAST(gehalt_text AS INTEGER) > 4000 ORDER BY name`)[0]
          ?.values ?? [];
      expected = rows.map((row) => String(row?.[0]));
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const nameIdx = cols.indexOf('name');
    if (nameIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet wird eine Spalte "name".` };
    }
    const actual = lastResult.values.map((row) => String(row[nameIdx]));
    if (actual.length !== expected.length || actual.some((name, i) => name !== expected[i])) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die Mitarbeiter mit Gehalt über 4000: ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: 'Korrekt: der numerische Vergleich nach CAST findet genau die richtigen Mitarbeiter.' };
  },
  distractors: [
    {
      code: `SELECT name FROM mitarbeiter WHERE gehalt_text > '4000' ORDER BY name;`,
      reason: 'vergleicht gehalt_text als reinen Text ohne CAST — David (12000, eigentlich über 4000) fehlt, weil "12000" alphabetisch vor "4000" kommt, während Clara (950, eigentlich unter 4000) fälschlich erscheint, weil "950" alphabetisch nach "4000" kommt',
    },
  ],
};
