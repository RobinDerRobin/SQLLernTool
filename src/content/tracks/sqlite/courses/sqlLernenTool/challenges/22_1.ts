import type { SqlChallenge } from '../../../types';

export const challenge22_1: SqlChallenge = {
  num: '22.1',
  title: 'Fehlende Werte behandeln: COALESCE und NULLIF',
  tutorial: `<code>COALESCE(a, b, ...)</code> liefert den ersten Wert in der Liste, der <b>nicht</b> <code>NULL</code> ist — perfekt, um einen Standardwert für fehlende Daten einzusetzen: <code>COALESCE(telefon, 'unbekannt')</code> zeigt die echte Telefonnummer, oder 'unbekannt', falls <code>telefon</code> NULL ist. <code>NULLIF(a, b)</code> macht das Gegenteil: Es liefert <code>NULL</code>, wenn <code>a</code> und <code>b</code> gleich sind, sonst <code>a</code> unverändert — nützlich, wenn "fehlend" in echten Daten nicht als NULL, sondern als Platzhalter-Text wie <code>'-'</code> gespeichert wurde. Kombiniert lösen sie ein sehr reales Problem: <pre>COALESCE(NULLIF(telefon, '-'), 'unbekannt')</pre>Erst macht <code>NULLIF</code> aus dem Platzhalter <code>'-'</code> ein echtes NULL, dann füllt <code>COALESCE</code> sowohl dieses NULL als auch jedes "richtige" NULL mit demselben Standardwert auf.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, telefon) ist bereits angelegt. Manche Mitarbeiter haben gar keine Telefonnummer hinterlegt (NULL), bei einem weiteren steht statt einer echten Nummer der Platzhalter <code>'-'</code>.<br><br><b>Deine Aufgabe:</b> Zeige <code>name</code> und <code>telefon</code> aller Mitarbeiter — aber sowohl NULL-Werte als auch der Platzhalter <code>'-'</code> sollen als <code>'unbekannt'</code> erscheinen, echte Nummern unverändert. Sortiere nach Name.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, telefon TEXT);
INSERT INTO mitarbeiter VALUES (1,'Anna','030-123456'),(2,'Ben',NULL),(3,'Clara','-'),(4,'David','040-999999');`,
  hints: [
    `Der Platzhalter <code>'-'</code> ist kein echtes NULL — <code>COALESCE</code> allein würde ihn nicht ersetzen. Wandle ihn zuerst mit <code>NULLIF(telefon, '-')</code> in ein echtes NULL um.`,
    `Erst danach greift <code>COALESCE(..., 'unbekannt')</code> für beide Fälle (ursprüngliches NULL und das aus NULLIF erzeugte NULL).`,
    `So sieht die Lösung aus:<pre>SELECT name, COALESCE(NULLIF(telefon, '-'), 'unbekannt') AS telefon
FROM mitarbeiter
ORDER BY name;</pre>`,
  ] as const,
  solution: `SELECT name, COALESCE(NULLIF(telefon, '-'), 'unbekannt') AS telefon
FROM mitarbeiter
ORDER BY name;`,
  syntaxExplanation: `<ul><li><code>NULLIF(telefon, '-')</code> — verwandelt den Platzhalter '-' in ein echtes NULL, alle anderen Werte bleiben unverändert.</li><li><code>COALESCE(..., 'unbekannt')</code> — füllt jedes NULL (egal ob ursprünglich oder aus NULLIF entstanden) mit 'unbekannt' auf.</li></ul>`,
  successCriteria: `Ben (ursprünglich NULL) und Clara (ursprünglich '-') müssen beide 'unbekannt' zeigen, Anna und David ihre echten Nummern unverändert.`,
  extra: {
    pg: `Identisch in Postgres — COALESCE und NULLIF sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [string, string][];
    try {
      const rows =
        engine.exec(
          `SELECT name, COALESCE(NULLIF(telefon, '-'), 'unbekannt') FROM mitarbeiter ORDER BY name`,
        )[0]?.values ?? [];
      expected = rows.map((row) => [String(row?.[0]), String(row?.[1])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const nameIdx = cols.indexOf('name');
    const telefonIdx = cols.indexOf('telefon');
    if (nameIdx === -1 || telefonIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden name und telefon.` };
    }
    const actual = lastResult.values.map((row) => [String(row[nameIdx]), String(row[telefonIdx])] as [string, string]);
    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden ${JSON.stringify(expected)} — sowohl NULL als auch '-' müssen zu 'unbekannt' werden.`,
      };
    }
    return { ok: true, message: 'Korrekt: NULL und der Platzhalter "-" werden beide zu "unbekannt", echte Nummern bleiben unverändert.' };
  },
  distractors: [
    {
      code: `SELECT name, COALESCE(telefon, 'unbekannt') AS telefon
FROM mitarbeiter
ORDER BY name;`,
      reason: 'nutzt nur COALESCE ohne NULLIF — Bens echtes NULL wird korrekt zu "unbekannt", aber Claras Platzhalter "-" bleibt unverändert stehen, weil COALESCE ihn nicht als fehlenden Wert erkennt',
    },
  ],
};
