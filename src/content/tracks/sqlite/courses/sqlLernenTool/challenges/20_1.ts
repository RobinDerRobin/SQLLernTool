import type { SqlChallenge } from '../../../types';

export const challenge20_1: SqlChallenge = {
  num: '20.1',
  title: 'Selbst gebaute Regeln: CHECK',
  tutorial: `<code>NOT NULL</code> und <code>UNIQUE</code> decken nur zwei feste Regeln ab — für alles andere gibt es <code>CHECK</code>, eine <b>eigene Bedingung</b>, die jede Zeile erfüllen muss: <pre>CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  preis INTEGER,
  CHECK (preis > 0)
);</pre>Ab jetzt lehnt SQLite jedes <code>INSERT</code> oder <code>UPDATE</code> ab, das <code>preis &lt;= 0</code> setzen würde — mit einem echten Fehler ("CHECK constraint failed"), nicht nur einer Warnung. Die Bedingung hinter <code>CHECK</code> ist ein ganz normaler Ausdruck, wie du ihn schon aus <code>WHERE</code> kennst.`,
  task: `<b>Deine Aufgabe:</b> Lege eine Tabelle <code>produkte</code> an mit den Spalten <code>id INTEGER</code>, <code>name TEXT</code>, <code>preis INTEGER</code> — und einer <code>CHECK</code>-Bedingung, die sicherstellt, dass <code>preis</code> immer größer als 0 ist. Füge danach ein gültiges Produkt ein: <code>id 1</code>, <code>name 'Schrauben'</code>, <code>preis 5</code>.`,
  hints: [
    `<code>CHECK (...)</code> steht als eigene Zeile in der Tabellendefinition, wie eine zusätzliche Spalte — die Bedingung selbst ist ein normaler Vergleich.`,
    `Die Bedingung muss <code>preis &gt; 0</code> lauten, damit 0 oder negative Preise abgelehnt werden.`,
    `So sieht die Lösung aus:<pre>CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  preis INTEGER,
  CHECK (preis > 0)
);
INSERT INTO produkte VALUES (1, 'Schrauben', 5);</pre>`,
  ] as const,
  solution: `CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  preis INTEGER,
  CHECK (preis > 0)
);
INSERT INTO produkte VALUES (1, 'Schrauben', 5);`,
  syntaxExplanation: `<ul><li><code>CHECK (preis &gt; 0)</code> — eine eigene Regel, die jede Zeile beim Einfügen und Ändern erfüllen muss.</li><li>Ein <code>INSERT</code>, das dagegen verstößt, schlägt mit einem echten Fehler fehl, statt die Zeile stillschweigend zu akzeptieren.</li></ul>`,
  successCriteria: `Die Tabelle produkte muss eine CHECK-Bedingung haben, die preis &lt;= 0 tatsächlich ablehnt — nicht nur eine Zeile mit positivem Preis enthalten.`,
  extra: {
    pg: `Identisch in Postgres — CHECK-Constraints sind Standard-SQL und funktionieren dort genauso.`,
  },
  validate: (engine) => {
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT preis FROM produkte WHERE name = 'Schrauben'`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    if (rows.length === 0) {
      return { ok: false, message: 'Es gibt kein Produkt namens Schrauben in der Tabelle produkte.' };
    }
    if (Number(rows[0]?.[0]) !== 5) {
      return { ok: false, message: `Schrauben hat preis = ${rows[0]?.[0]}, erwartet wird 5.` };
    }
    let checkBlocked = false;
    try {
      engine.exec(`INSERT INTO produkte VALUES (9999, '__check_probe__', -1)`);
    } catch {
      checkBlocked = true;
    }
    if (!checkBlocked) {
      engine.exec(`DELETE FROM produkte WHERE id = 9999`);
      return {
        ok: false,
        message: 'Ein Testeinfügen mit preis = -1 wurde nicht abgelehnt — die Tabelle hat noch keine (oder eine zu lockere) CHECK-Bedingung auf preis.',
      };
    }
    return { ok: true, message: 'Korrekt: Die CHECK-Bedingung lässt gültige Preise zu und lehnt preis <= 0 tatsächlich ab.' };
  },
  distractors: [
    {
      code: `CREATE TABLE produkte (id INTEGER, name TEXT, preis INTEGER);
INSERT INTO produkte VALUES (1, 'Schrauben', 5);`,
      reason: 'fügt den gültigen Datensatz genauso korrekt ein, vergisst aber die CHECK-Bedingung komplett — der Testeinfügeversuch mit preis = -1 in der Prüfung wird dadurch nicht abgelehnt',
    },
  ],
};
