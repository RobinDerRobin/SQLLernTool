import type { SqlChallenge } from '../../../types';

export const challenge18_1: SqlChallenge = {
  num: '18.1',
  title: 'Warum ein Index eine Abfrage beschleunigt',
  tutorial: `Ohne Index muss SQLite bei <code>WHERE kunde_id = 2</code> jede einzelne Zeile der Tabelle durchgehen und prüfen, ob sie passt — das nennt man einen <b>Scan</b> (kompletter Tabellendurchlauf). Mit einem passenden Index kann SQLite stattdessen direkt zu den Zeilen mit <code>kunde_id = 2</code> springen — eine <b>Search</b> (gezielte Suche). Bei kleinen Tabellen macht das kaum einen Unterschied, aber bei großen Tabellen mit vielen tausend Zeilen ist der Unterschied enorm: ohne Index wächst die Suchzeit mit der Tabellengröße, mit Index kaum. Entscheidend ist dabei, dass der Index genau auf die Spalte zeigt, die in der <code>WHERE</code>-Bedingung steht — ein Index auf der falschen Spalte hilft dieser Abfrage nicht.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>bestellungen</b> (id, kunde_id, betrag) ist bereits angelegt. Abfragen wie <code>SELECT * FROM bestellungen WHERE kunde_id = 2</code> sind häufig, aber ohne Index muss dafür jede Zeile geprüft werden.<br><br><b>Deine Aufgabe:</b> Lege einen Index namens <code>idx_bestellungen_kunde</code> auf die Spalte <code>kunde_id</code> der Tabelle <code>bestellungen</code> an, damit diese Abfrage nicht mehr die ganze Tabelle durchsuchen muss.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER, betrag INTEGER);
INSERT INTO bestellungen VALUES (1,1,50),(2,2,80),(3,2,30),(4,3,120),(5,1,20);`,
  hints: [
    `<code>CREATE INDEX &lt;name&gt; ON &lt;tabelle&gt;(&lt;spalte&gt;);</code> — die Spalte in Klammern muss zur <code>WHERE</code>-Bedingung passen, die beschleunigt werden soll.`,
    `Die Abfrage filtert nach <code>kunde_id</code>, also muss der Index auch auf <code>kunde_id</code> zeigen — nicht auf <code>betrag</code> oder <code>id</code>.`,
    `So sieht die Lösung aus:<pre>CREATE INDEX idx_bestellungen_kunde ON bestellungen(kunde_id);</pre>`,
  ] as const,
  solution: `CREATE INDEX idx_bestellungen_kunde ON bestellungen(kunde_id);`,
  syntaxExplanation: `<ul><li><code>CREATE INDEX idx_bestellungen_kunde ON bestellungen(kunde_id)</code> — legt den Index auf genau der Spalte an, nach der <code>WHERE kunde_id = ...</code> filtert.</li><li>SQLites Optimizer entscheidet danach selbst, den Index für passende Abfragen zu nutzen — das prüfst du in der nächsten Aufgabe mit <code>EXPLAIN QUERY PLAN</code>.</li></ul>`,
  successCriteria: `Eine Abfrage wie <code>SELECT * FROM bestellungen WHERE kunde_id = 2</code> darf danach laut Query-Plan nicht mehr die ganze Tabelle scannen (SCAN), sondern muss den Index nutzen (SEARCH ... USING INDEX).`,
  extra: {
    pg: `Das Konzept ist identisch in Postgres — auch dort wechselt der Query-Planer bei einem passenden Index von einem Seq Scan zu einem Index Scan.`,
  },
  validate: (engine) => {
    try {
      const planRows = engine.exec(`EXPLAIN QUERY PLAN SELECT * FROM bestellungen WHERE kunde_id = 2`)[0]?.values ?? [];
      const detail = planRows.map((row) => String(row?.[3] ?? '')).join(' | ');
      if (!detail.includes('SEARCH') || !detail.includes('USING INDEX')) {
        return { ok: false, message: `Der Query-Plan ist "${detail}" — die Abfrage nutzt noch keinen passenden Index (kein SEARCH ... USING INDEX).` };
      }
      return { ok: true, message: `Korrekt: Der Query-Plan zeigt "${detail}" — die Abfrage nutzt jetzt den Index statt die ganze Tabelle zu scannen.` };
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE INDEX idx_bestellungen_kunde ON bestellungen(betrag);`,
      reason: 'legt den Index auf der falschen Spalte an (betrag statt kunde_id) — der Query-Plan für WHERE kunde_id = 2 zeigt danach immer noch "SCAN bestellungen", weil der Index dieser Abfrage nicht hilft',
    },
  ],
};
