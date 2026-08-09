import type { SqlChallenge } from '../../../types';

export const challenge21_1: SqlChallenge = {
  num: '21.1',
  title: 'Von der anderen Seite: RIGHT JOIN',
  tutorial: `<code>LEFT JOIN</code> aus Kapitel 10.1 behält jede Zeile der <b>linken</b> Tabelle, auch ohne Treffer auf der rechten Seite. <code>RIGHT JOIN</code> macht genau das Gegenteil: Er behält jede Zeile der <b>rechten</b> Tabelle, auch ohne Treffer links. <pre>SELECT k.name, p.name
FROM produkte p
RIGHT JOIN kategorien k ON p.kategorie_id = k.id;</pre>Hier ist <code>kategorien</code> die rechte Tabelle — jede Kategorie erscheint im Ergebnis, auch eine, die noch kein einziges Produkt hat. Fehlt ein Produkt, wird <code>p.name</code> einfach mit <code>NULL</code> aufgefüllt. Ein <code>RIGHT JOIN</code> lässt sich immer auch als <code>LEFT JOIN</code> mit vertauschten Tabellen schreiben — manche Teams verbieten <code>RIGHT JOIN</code> deshalb sogar aus Stilgründen, um nur eine Richtung im Team zu pflegen. Trotzdem lohnt es sich, die Syntax zu kennen, weil du sie in fremdem Code garantiert antriffst.`,
  task: `<b>Hinweis:</b> Die Tabellen <b>produkte</b> (id, name, kategorie_id) und <b>kategorien</b> (id, name) sind bereits angelegt. Die Kategorie 'Sale' (id 3) hat noch kein einziges Produkt.<br><br><b>Deine Aufgabe:</b> Zeige zu <b>jeder</b> Kategorie den Kategorienamen und den Produktnamen — auch die Kategorie 'Sale' ohne Produkt muss erscheinen (mit NULL statt Produktname). Nutze dafür <code>RIGHT JOIN</code>, mit <code>produkte</code> links und <code>kategorien</code> rechts. Sortiere nach Kategoriename, dann nach Produktname.`,
  setup: `CREATE TABLE produkte (id INTEGER, name TEXT, kategorie_id INTEGER);
INSERT INTO produkte VALUES (1,'Schrauben',1),(2,'Hammer',1),(3,'Kabel',2);

CREATE TABLE kategorien (id INTEGER, name TEXT);
INSERT INTO kategorien VALUES (1,'Werkzeug'),(2,'Elektronik'),(3,'Sale');`,
  hints: [
    `Die Tabellenreihenfolge ist vorgegeben: <code>FROM produkte p RIGHT JOIN kategorien k ON ...</code> — produkte links, kategorien rechts, damit kategorien (die rechte Tabelle) komplett erhalten bleibt.`,
    `Die ON-Bedingung ist dieselbe wie bei einem normalen JOIN: <code>p.kategorie_id = k.id</code>.`,
    `So sieht die Lösung aus:<pre>SELECT k.name AS kategorie, p.name AS produkt
FROM produkte p
RIGHT JOIN kategorien k ON p.kategorie_id = k.id
ORDER BY k.name, p.name;</pre>`,
  ] as const,
  solution: `SELECT k.name AS kategorie, p.name AS produkt
FROM produkte p
RIGHT JOIN kategorien k ON p.kategorie_id = k.id
ORDER BY k.name, p.name;`,
  syntaxExplanation: `<ul><li><code>FROM produkte p RIGHT JOIN kategorien k ON p.kategorie_id = k.id</code> — behält jede Zeile aus kategorien (rechts), auch ohne passendes Produkt.</li><li>Fehlt ein Produkt zu einer Kategorie, liefert <code>p.name</code> NULL, statt die Kategorie ganz wegzulassen.</li></ul>`,
  successCriteria: `Das Ergebnis muss alle 3 Kategorien enthalten (auch 'Sale' ohne Produkt, mit NULL als Produktname) — nicht nur die Kategorien, die tatsächlich ein Produkt haben.`,
  extra: {
    pg: `Identisch in Postgres — RIGHT JOIN ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: [string, string | null][];
    try {
      const rows =
        engine.exec(
          `SELECT k.name, p.name FROM kategorien k LEFT JOIN produkte p ON p.kategorie_id = k.id ORDER BY k.name, p.name`,
        )[0]?.values ?? [];
      expected = rows.map((row) => [String(row?.[0]), row?.[1] === null || row?.[1] === undefined ? null : String(row[1])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }

    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const kategorieIdx = cols.indexOf('kategorie');
    const produktIdx = cols.indexOf('produkt');
    if (kategorieIdx === -1 || produktIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden kategorie und produkt.` };
    }
    const actual = lastResult.values.map((row) => {
      const p = row[produktIdx];
      return [String(row[kategorieIdx]), p === null || p === undefined ? null : String(p)] as [string, string | null];
    });
    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden alle Kategorien inklusive ihrer Produkte ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: Alle ${expected.length} Kategorie-Produkt-Zeilen, inklusive 'Sale' ohne Produkt.` };
  },
  distractors: [
    {
      code: `SELECT k.name AS kategorie, p.name AS produkt
FROM produkte p
LEFT JOIN kategorien k ON p.kategorie_id = k.id
ORDER BY k.name, p.name;`,
      reason: 'nutzt LEFT JOIN statt RIGHT JOIN mit derselben Tabellenreihenfolge — behält damit jede Zeile aus produkte (links) statt kategorien (rechts), die Kategorie "Sale" ohne Produkt fehlt komplett im Ergebnis',
    },
  ],
};
