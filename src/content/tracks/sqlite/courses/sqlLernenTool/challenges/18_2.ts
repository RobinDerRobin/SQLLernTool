import type { SqlChallenge } from '../../../types';

export const challenge18_2: SqlChallenge = {
  num: '18.2',
  title: 'Den Query-Plan selbst lesen: EXPLAIN QUERY PLAN',
  tutorial: `Statt zu raten, ob eine Abfrage einen Index nutzt, kannst du es SQLite direkt fragen: <pre>EXPLAIN QUERY PLAN SELECT * FROM bestellungen WHERE kunde_id = 2;</pre>Das führt die Abfrage nicht wirklich aus, sondern zeigt in der Spalte <code>detail</code>, <i>wie</i> SQLite sie ausführen würde. Zwei Muster sind entscheidend: <code>SCAN &lt;tabelle&gt;</code> bedeutet "jede Zeile wird geprüft" (langsam bei großen Tabellen), <code>SEARCH &lt;tabelle&gt; USING INDEX &lt;name&gt;</code> bedeutet "der Index wird genutzt, um gezielt zu springen" (schnell). Diesen Unterschied selbst am Query-Plan abzulesen ist die eigentliche Fähigkeit — nicht nur zu wissen, dass Indizes helfen, sondern zu sehen, ob sie es in einem konkreten Fall auch tun.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (id, kunde_id, betrag) und ein Index <code>idx_bestellungen_kunde</code> auf <code>kunde_id</code> sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Schreibe <code>EXPLAIN QUERY PLAN</code> für die Abfrage <code>SELECT * FROM bestellungen WHERE kunde_id = 2</code>, um den Query-Plan zu sehen.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER, betrag INTEGER);
INSERT INTO bestellungen VALUES (1,1,50),(2,2,80),(3,2,30),(4,3,120),(5,1,20);
CREATE INDEX idx_bestellungen_kunde ON bestellungen(kunde_id);`,
  hints: [
    `<code>EXPLAIN QUERY PLAN</code> kommt einfach vor die eigentliche Abfrage, wie ein Präfix.`,
    `Die Abfrage selbst bleibt unverändert: <code>SELECT * FROM bestellungen WHERE kunde_id = 2</code>.`,
    `So sieht die Lösung aus:<pre>EXPLAIN QUERY PLAN SELECT * FROM bestellungen WHERE kunde_id = 2;</pre>`,
  ] as const,
  solution: `EXPLAIN QUERY PLAN SELECT * FROM bestellungen WHERE kunde_id = 2;`,
  syntaxExplanation: `<ul><li><code>EXPLAIN QUERY PLAN</code> — zeigt den Ausführungsplan statt der eigentlichen Ergebniszeilen.</li><li>Die Spalte <code>detail</code> im Ergebnis beschreibt den Zugriffspfad (SCAN oder SEARCH).</li></ul>`,
  successCriteria: `Das Ergebnis muss eine echte Query-Plan-Ausgabe sein (Spalte <code>detail</code>), die zeigt, dass die Abfrage den Index <code>idx_bestellungen_kunde</code> nutzt (SEARCH ... USING INDEX), nicht die ganze Tabelle scannt.`,
  extra: {
    pg: `Postgres hat dasselbe Werkzeug unter dem Namen EXPLAIN (ohne QUERY PLAN) — Ausgabeformat und Begriffe (Seq Scan / Index Scan) unterscheiden sich, die Idee ist identisch.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.columns) {
      return { ok: false, message: 'Es gibt noch kein Ergebnis — führe EXPLAIN QUERY PLAN für die Abfrage aus.' };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const detailIdx = cols.indexOf('detail');
    if (detailIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — das ist kein Query-Plan (fehlende Spalte "detail"). Hast du EXPLAIN QUERY PLAN vor die Abfrage geschrieben?` };
    }
    const detail = lastResult.values.map((row) => String(row?.[detailIdx] ?? '')).join(' | ');
    if (!detail.includes('SEARCH') || !detail.includes('USING INDEX')) {
      return { ok: false, message: `Der Query-Plan ist "${detail}" — das zeigt keine Index-Nutzung (SEARCH ... USING INDEX).` };
    }
    return { ok: true, message: `Korrekt: Der Query-Plan "${detail}" zeigt, dass die Abfrage den Index idx_bestellungen_kunde nutzt.` };
  },
  distractors: [
    {
      code: `SELECT * FROM bestellungen WHERE kunde_id = 2;`,
      reason: 'vergisst EXPLAIN QUERY PLAN und führt die Abfrage stattdessen wirklich aus — das Ergebnis hat die Spalten id/kunde_id/betrag statt id/parent/notused/detail, also keine Spalte "detail"',
    },
  ],
};
