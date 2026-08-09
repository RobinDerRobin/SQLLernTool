import type { SqlChallenge } from '../../../types';

export const challenge23_1: SqlChallenge = {
  num: '23.1',
  title: 'Text bearbeiten: TRIM, UPPER und SUBSTR',
  tutorial: `Neben <code>||</code> (Verkettung) gibt es echte String-<b>Funktionen</b>: <code>TRIM(text)</code> entfernt führende und nachgestellte Leerzeichen, <code>UPPER(text)</code>/<code>LOWER(text)</code> wandeln Groß-/Kleinschreibung um, <code>SUBSTR(text, start, länge)</code> schneidet einen Teil heraus (Zählung beginnt bei 1, nicht bei 0), und <code>REPLACE(text, alt, neu)</code> ersetzt jedes Vorkommen eines Teilstrings. Sie lassen sich beliebig verschachteln: <pre>SUBSTR(UPPER(TRIM(name)), 1, 4)</pre>Von innen nach außen gelesen: erst Leerzeichen entfernen, dann groß schreiben, dann die ersten 4 Zeichen nehmen — genau wie bei <code>ROUND(ABS(...))</code> aus Kapitel 23 wird die innerste Funktion zuerst ausgewertet.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>produkte</b> (id, name) ist bereits angelegt — die Namen wurden unsauber importiert, mit überflüssigen Leerzeichen und uneinheitlicher Groß-/Kleinschreibung.<br><br><b>Deine Aufgabe:</b> Erzeuge aus jedem Produktnamen einen <code>code</code>: entferne zuerst überflüssige Leerzeichen, wandle den Namen in Großbuchstaben um, und nimm davon die ersten 4 Zeichen. Sortiere nach <code>id</code>.`,
  setup: `CREATE TABLE produkte (id INTEGER, name TEXT);
INSERT INTO produkte VALUES (1,'  Akkuschrauber  '),(2,'hammer'),(3,' Bohrmaschine');`,
  hints: [
    `Zuerst <code>TRIM(name)</code>, um die überflüssigen Leerzeichen loszuwerden — sonst würde ein führendes Leerzeichen selbst als eines der ersten 4 Zeichen mitgezählt.`,
    `Dann <code>UPPER(...)</code> um das getrimmte Ergebnis, und ganz außen <code>SUBSTR(..., 1, 4)</code> für die ersten 4 Zeichen.`,
    `So sieht die Lösung aus:<pre>SELECT id, SUBSTR(UPPER(TRIM(name)), 1, 4) AS code FROM produkte ORDER BY id;</pre>`,
  ] as const,
  solution: `SELECT id, SUBSTR(UPPER(TRIM(name)), 1, 4) AS code FROM produkte ORDER BY id;`,
  syntaxExplanation: `<ul><li><code>TRIM(name)</code> — entfernt Leerzeichen am Anfang/Ende, wirkt zuerst (innerste Funktion).</li><li><code>UPPER(...)</code> — wandelt das getrimmte Ergebnis in Großbuchstaben.</li><li><code>SUBSTR(..., 1, 4)</code> — schneidet die ersten 4 Zeichen des Ergebnisses heraus.</li></ul>`,
  successCriteria: `Jeder code muss genau 4 Großbuchstaben ohne führende Leerzeichen enthalten — z. B. '  Akkuschrauber  ' → 'AKKU', nicht '  Ak' oder 'akku'.`,
  extra: {
    pg: `Identisch in Postgres — TRIM/UPPER/SUBSTR sind Standard-SQL (Postgres kennt zusätzlich die Kurzform SUBSTRING).`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [number, string][];
    try {
      const rows =
        engine.exec(`SELECT id, SUBSTR(UPPER(TRIM(name)), 1, 4) FROM produkte ORDER BY id`)[0]?.values ?? [];
      expected = rows.map((row) => [Number(row?.[0]), String(row?.[1])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const idIdx = cols.indexOf('id');
    const codeIdx = cols.indexOf('code');
    if (idIdx === -1 || codeIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden id und code.` };
    }
    const actual = lastResult.values.map((row) => [Number(row[idIdx]), String(row[codeIdx])] as [number, string]);
    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die Codes ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: 'Korrekt: alle Codes sauber getrimmt, großgeschrieben und auf 4 Zeichen gekürzt.' };
  },
  distractors: [
    {
      code: `SELECT id, SUBSTR(name, 1, 4) AS code FROM produkte ORDER BY id;`,
      reason: 'vergisst TRIM und UPPER — bei "  Akkuschrauber  " landen die führenden Leerzeichen in den ersten 4 Zeichen ("  Ak" statt "AKKU"), bei "hammer" bleibt es kleingeschrieben ("hamm" statt "HAMM")',
    },
  ],
};
