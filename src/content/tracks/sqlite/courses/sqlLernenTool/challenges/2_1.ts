import type { SqlChallenge } from '../../../types';

export const challenge2_1: SqlChallenge = {
  num: '2.1',
  title: 'Eine Abfrage mit WITH benennen (einfache CTE)',
  tutorial: `Mit <code>WITH name AS (SELECT ...)</code> gibst du einer Abfrage einen Namen, den du danach wie eine ganz normale Tabelle in einem SELECT verwenden kannst — das nennt sich <b>CTE</b> ('Common Table Expression'). Sie ist rein temporär und existiert nur für die Dauer dieser einen Query: <pre>WITH teuer AS (\n  SELECT * FROM produkte WHERE preis > 100\n)\nSELECT * FROM teuer;</pre>Das ist erstmal nur eine andere Schreibweise für eine Unterabfrage — der eigentliche Nutzen kommt in Challenge 3, wo eine CTE sich sogar selbst referenzieren darf.`,
  task: `Erster Baustein auf dem Weg zu Challenge 3: Dort brauchst du eine <i>rekursive</i> CTE — hier übst du erstmal die einfache, nicht-rekursive Variante, damit dir die WITH-Syntax schon vertraut ist, wenn die Rekursion dazukommt.<br><br><b>Deine Aufgabe:</b> Nutze eine CTE namens <b>recent</b>, die alle Zeilen aus <b>users_backup</b> mit signup_date ab '2025-01-10' enthält (der gleiche Filter wie in 1.1), und gib das Ergebnis per <code>SELECT * FROM recent</code> aus.`,
  prereqNums: ['02'],
  prereqNote: `Setzt voraus, dass du Challenge 2 (Tabelle users_backup) bereits ausgeführt hast.`,
  hints: [
    `Die Struktur ist immer: <code>WITH name AS (SELECT ...) SELECT ... FROM name;</code> — zwei SELECTs in einem Statement.`,
    `Die WHERE-Bedingung innerhalb der CTE funktioniert genau wie in einer normalen Abfrage.`,
    `So sieht die Lösung aus:<pre>WITH recent AS (\n  SELECT * FROM users_backup WHERE signup_date >= '2025-01-10'\n)\nSELECT * FROM recent;</pre>`,
  ] as const,
  solution: `WITH recent AS (
  SELECT * FROM users_backup WHERE signup_date >= '2025-01-10'
)
SELECT * FROM recent;`,
  syntaxExplanation: `<ul><li><code>WITH recent AS (...)</code> — gibt der inneren Abfrage den Namen 'recent'.</li><li><code>SELECT * FROM recent;</code> — nutzt die CTE anschließend wie eine ganz normale Tabelle.</li></ul>`,
  successCriteria: `Das letzte SELECT-Ergebnis muss nur Zeilen mit signup_date ab '2025-01-10' enthalten, erzeugt über eine CTE.`,
  extra: {
    pg: `Identisch in Postgres — CTEs sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.columns) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const dateIdx = cols.indexOf('signup_date');
    if (dateIdx === -1) return { ok: false, message: 'Das Ergebnis muss eine signup_date-Spalte enthalten (z. B. über SELECT *).' };
    const values = lastResult.values;
    if (!values.length) return { ok: false, message: 'Das Ergebnis enthält keine Zeilen — prüfe deine WHERE-Bedingung.' };
    for (const row of values) {
      if (String(row[dateIdx]) < '2025-01-10') return { ok: false, message: 'Es sind auch Zeilen vor 2025-01-10 enthalten.' };
    }
    const expectedCount = Number(
      engine.exec("SELECT COUNT(*) FROM users_backup WHERE signup_date >= '2025-01-10'")[0]?.values[0]?.[0],
    );
    if (values.length !== expectedCount) {
      return {
        ok: false,
        message: `Das Ergebnis hat ${values.length} Zeile(n), aber users_backup enthält tatsächlich ${expectedCount} passende — es fehlen Zeilen (WHERE zu eng gefasst?).`,
      };
    }
    return { ok: true, message: `Ergebnis korrekt über eine CTE gefiltert (${values.length} Zeile(n)).` };
  },
  distractors: [
    {
      code: `WITH recent AS (
  SELECT * FROM users_backup WHERE signup_date >= '2025-01-20'
)
SELECT * FROM recent;`,
      reason: 'jede zurückgegebene Zeile erfüllt die Bedingung, aber die WHERE-Grenze ist zu eng — echte Treffer zwischen 2025-01-10 und 2025-01-20 fehlen unbemerkt',
    },
  ],
};
