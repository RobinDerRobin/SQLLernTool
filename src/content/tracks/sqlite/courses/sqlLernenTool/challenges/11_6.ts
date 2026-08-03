import type { SqlChallenge } from '../../../types';

export const challenge11_6: SqlChallenge = {
  num: '11.6',
  title: 'Kurzschreibweisen: BETWEEN und IN',
  tutorial: `Zwei Abkürzungen für Bedingungen, die du auch schon anders schreiben könntest: <code>BETWEEN a AND b</code> ist die kürzere Schreibweise für <code>&gt;= a AND &lt;= b</code> (beide Grenzen eingeschlossen). <code>IN (...)</code> ist die kürzere Schreibweise für mehrere <code>OR</code>-Vergleiche auf Gleichheit: <pre>-- so:
WHERE betrag BETWEEN 50 AND 100
-- ist dasselbe wie:
WHERE betrag >= 50 AND betrag <= 100

-- und so:
WHERE status IN ('offen', 'versendet')
-- ist dasselbe wie:
WHERE status = 'offen' OR status = 'versendet'</pre>Beide lassen sich miteinander kombinieren, genau wie jede andere WHERE-Bedingung.`,
  task: `Bereichs- und Listen-Filter ("zwischen X und Y", "einer von diesen drei Werten") kommen in echten Abfragen ständig vor — BETWEEN und IN machen sie kürzer und lesbarer als lange AND/OR-Ketten.<br><br><b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (6 Zeilen) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Zeige alle Bestellungen mit einem Betrag zwischen 50 und 100 (beide Grenzen eingeschlossen), deren Status entweder 'offen' oder 'versendet' ist.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, betrag INTEGER, status TEXT);
INSERT INTO bestellungen VALUES
  (1,50,'offen'),
  (2,120,'offen'),
  (3,30,'versendet'),
  (4,100,'storniert'),
  (5,75,'versendet'),
  (6,90,'offen');`,
  hints: [
    `<code>betrag BETWEEN 50 AND 100</code> deckt den Bereich inklusive beider Grenzen ab.`,
    `<code>status IN ('offen', 'versendet')</code> ersetzt <code>status = 'offen' OR status = 'versendet'</code>.`,
    `So sieht die Lösung aus:<pre>SELECT * FROM bestellungen
WHERE betrag BETWEEN 50 AND 100
  AND status IN ('offen', 'versendet');</pre>`,
  ] as const,
  solution: `SELECT * FROM bestellungen
WHERE betrag BETWEEN 50 AND 100
  AND status IN ('offen', 'versendet');`,
  syntaxExplanation: `<ul><li><code>betrag BETWEEN 50 AND 100</code> — Beträge 50 bis 100, beide Grenzen eingeschlossen.</li><li><code>status IN ('offen', 'versendet')</code> — passt auf jeden der beiden genannten Status.</li><li>Beide Bedingungen mit <code>AND</code> verknüpft: nur Zeilen, die beides erfüllen, bleiben übrig.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Bestellungen 1 (50, offen), 5 (75, versendet) und 6 (90, offen) enthalten — sonst keine.`,
  extra: {
    pg: `Identisch in Postgres — BETWEEN und IN sind Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const rows = lastResult.values;
    const idCol = (lastResult.columns ?? []).findIndex((c) => c.toLowerCase() === 'id');
    if (idCol === -1) return { ok: false, message: 'Das Ergebnis muss eine id-Spalte enthalten (z. B. über SELECT *).' };
    const ids = rows.map((row) => Number(row[idCol])).sort((a, b) => a - b);
    if (JSON.stringify(ids) !== JSON.stringify([1, 5, 6])) {
      return { ok: false, message: `Zurückgegebene IDs sind ${ids.join(', ') || '(keine)'} — erwartet werden genau 1, 5 und 6.` };
    }
    return { ok: true, message: 'BETWEEN und IN korrekt kombiniert: genau die Bestellungen 1, 5 und 6.' };
  },
};
