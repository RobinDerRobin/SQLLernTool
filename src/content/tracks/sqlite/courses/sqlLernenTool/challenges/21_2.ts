import type { SqlChallenge } from '../../../types';

export const challenge21_2: SqlChallenge = {
  num: '21.2',
  title: 'Nichts von beiden Seiten verlieren: FULL OUTER JOIN',
  tutorial: `<code>LEFT JOIN</code> behält alles von links, <code>RIGHT JOIN</code> alles von rechts — <code>FULL OUTER JOIN</code> behält <b>beides gleichzeitig</b>. Er zeigt jede Zeile aus beiden Tabellen, egal auf welcher Seite ein Treffer fehlt: <pre>SELECT k.name, b.id, b.betrag
FROM kunden k
FULL OUTER JOIN bestellungen b ON b.kunde_id = k.id;</pre>Das ist besonders nützlich, um <b>Dateninkonsistenzen</b> aufzuspüren: Kunden ganz ohne Bestellung tauchen genauso auf wie Bestellungen, deren <code>kunde_id</code> auf gar keinen existierenden Kunden mehr zeigt (z. B. weil der Kunde später gelöscht wurde) — beides wäre mit einem normalen JOIN unsichtbar geblieben.`,
  task: `<b>Hinweis:</b> Die Tabellen <b>kunden</b> (id, name) und <b>bestellungen</b> (id, kunde_id, betrag) sind bereits angelegt. Ben und Clara haben keine Bestellung; eine Bestellung (id 3) hat eine kunde_id, die zu keinem existierenden Kunden gehört.<br><br><b>Deine Aufgabe:</b> Zeige mit <code>FULL OUTER JOIN</code> für jeden Kunden und jede Bestellung den Kundennamen, die Bestellungs-ID und den Betrag — auch Kunden ohne Bestellung und die verwaiste Bestellung müssen erscheinen. Sortiere nach Kundenname, dann nach Bestellungs-ID.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER, betrag INTEGER);
INSERT INTO bestellungen VALUES (1,1,50),(2,1,30),(3,99,80);`,
  hints: [
    `<code>FULL OUTER JOIN</code> steht anstelle von <code>JOIN</code>, die ON-Bedingung bleibt wie gewohnt: <code>ON b.kunde_id = k.id</code>.`,
    `Die verwaiste Bestellung (kunde_id 99, existiert nicht in kunden) erscheint dabei mit NULL statt Kundenname — genau das soll passieren, nicht rausgefiltert werden.`,
    `So sieht die Lösung aus:<pre>SELECT k.name AS kunde, b.id AS bestellung_id, b.betrag
FROM kunden k
FULL OUTER JOIN bestellungen b ON b.kunde_id = k.id
ORDER BY k.name, b.id;</pre>`,
  ] as const,
  solution: `SELECT k.name AS kunde, b.id AS bestellung_id, b.betrag
FROM kunden k
FULL OUTER JOIN bestellungen b ON b.kunde_id = k.id
ORDER BY k.name, b.id;`,
  syntaxExplanation: `<ul><li><code>FULL OUTER JOIN bestellungen b ON b.kunde_id = k.id</code> — behält jede Zeile aus kunden UND jede Zeile aus bestellungen.</li><li>Ein Kunde ohne Bestellung bekommt NULL bei bestellung_id/betrag; eine Bestellung ohne echten Kunden bekommt NULL bei kunde.</li></ul>`,
  successCriteria: `Das Ergebnis muss 5 Zeilen enthalten: 2 für Anna (ihre beiden Bestellungen), je 1 für Ben und Clara ohne Bestellung (NULL), und 1 für die verwaiste Bestellung ohne Kunde (NULL bei kunde) — nichts von beiden Seiten darf fehlen.`,
  extra: {
    pg: `Identisch in Postgres — FULL OUTER JOIN ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [string | null, number | null, number | null][];
    try {
      const leftPart =
        engine.exec(
          `SELECT k.name, b.id, b.betrag FROM kunden k LEFT JOIN bestellungen b ON b.kunde_id = k.id`,
        )[0]?.values ?? [];
      const rightOnly =
        engine.exec(
          `SELECT NULL, b.id, b.betrag FROM bestellungen b WHERE NOT EXISTS (SELECT 1 FROM kunden k WHERE k.id = b.kunde_id)`,
        )[0]?.values ?? [];
      const toRow = (row: unknown[]): [string | null, number | null, number | null] => [
        row[0] === null || row[0] === undefined ? null : String(row[0]),
        row[1] === null || row[1] === undefined ? null : Number(row[1]),
        row[2] === null || row[2] === undefined ? null : Number(row[2]),
      ];
      expected = [...leftPart.map(toRow), ...rightOnly.map(toRow)];
      expected.sort((a, b) => {
        const nameCmp = (a[0] ?? '').localeCompare(b[0] ?? '');
        if (nameCmp !== 0) return a[0] === null ? -1 : b[0] === null ? 1 : nameCmp;
        return (a[1] ?? -1) - (b[1] ?? -1);
      });
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }

    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const kundeIdx = cols.indexOf('kunde');
    const bestellungIdx = cols.indexOf('bestellung_id');
    const betragIdx = cols.indexOf('betrag');
    if (kundeIdx === -1 || bestellungIdx === -1 || betragIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden kunde, bestellung_id und betrag.` };
    }
    const toActual = (row: unknown[]): [string | null, number | null, number | null] => [
      row[kundeIdx] === null || row[kundeIdx] === undefined ? null : String(row[kundeIdx]),
      row[bestellungIdx] === null || row[bestellungIdx] === undefined ? null : Number(row[bestellungIdx]),
      row[betragIdx] === null || row[betragIdx] === undefined ? null : Number(row[betragIdx]),
    ];
    const actual = lastResult.values.map(toActual).sort((a, b) => {
      const nameCmp = (a[0] ?? '').localeCompare(b[0] ?? '');
      if (nameCmp !== 0) return a[0] === null ? -1 : b[0] === null ? 1 : nameCmp;
      return (a[1] ?? -1) - (b[1] ?? -1);
    });

    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1] || row[2] !== expected[i]?.[2])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden alle Kunden- und Bestellungszeilen (auch unverknüpfte) ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: Alle ${expected.length} Zeilen — Kunden ohne Bestellung und die verwaiste Bestellung fehlen nicht.` };
  },
  distractors: [
    {
      code: `SELECT k.name AS kunde, b.id AS bestellung_id, b.betrag
FROM kunden k
LEFT JOIN bestellungen b ON b.kunde_id = k.id
ORDER BY k.name, b.id;`,
      reason: 'nutzt LEFT JOIN statt FULL OUTER JOIN — behält Kunden ohne Bestellung, aber die verwaiste Bestellung (kunde_id 99, kein passender Kunde) fehlt komplett, weil sie von der linken Tabelle aus nie erreicht wird',
    },
  ],
};
