import type { SqlChallenge } from '../../../types';

export const challenge20_3: SqlChallenge = {
  num: '20.3',
  title: 'Eine bestehende Tabelle erweitern: ALTER TABLE',
  tutorial: `Eine Tabelle ist nach <code>CREATE TABLE</code> nicht für immer festgelegt — mit <code>ALTER TABLE</code> kannst du sie nachträglich ändern, ohne die vorhandenen Daten zu verlieren: <pre>ALTER TABLE produkte ADD COLUMN preis INTEGER DEFAULT 0;</pre>Das fügt der Tabelle eine neue Spalte hinzu; alle <b>bestehenden</b> Zeilen bekommen dabei automatisch den <code>DEFAULT</code>-Wert. Der entscheidende Unterschied zu "Tabelle löschen und neu anlegen": <code>ALTER TABLE</code> behält alle vorhandenen Zeilen, während <code>DROP TABLE</code> + <code>CREATE TABLE</code> sie unwiderruflich löschen würde.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>produkte</b> (id, name) ist bereits angelegt und enthält bereits das Produkt 'Schrauben' (id 1).<br><br><b>Deine Aufgabe:</b> Füge der bestehenden Tabelle <code>produkte</code> eine neue Spalte <code>preis INTEGER DEFAULT 0</code> hinzu, <b>ohne</b> die Tabelle neu anzulegen — das vorhandene Produkt 'Schrauben' muss danach weiterhin existieren.`,
  setup: `CREATE TABLE produkte (id INTEGER, name TEXT);
INSERT INTO produkte VALUES (1, 'Schrauben');`,
  hints: [
    `Die Syntax ist <code>ALTER TABLE &lt;tabelle&gt; ADD COLUMN &lt;spalte&gt; &lt;typ&gt;</code> — kein CREATE TABLE, kein DROP TABLE.`,
    `Ein DEFAULT-Wert direkt in der neuen Spaltendefinition (<code>DEFAULT 0</code>) sorgt dafür, dass 'Schrauben' automatisch preis = 0 bekommt.`,
    `So sieht die Lösung aus:<pre>ALTER TABLE produkte ADD COLUMN preis INTEGER DEFAULT 0;</pre>`,
  ] as const,
  solution: `ALTER TABLE produkte ADD COLUMN preis INTEGER DEFAULT 0;`,
  syntaxExplanation: `<ul><li><code>ALTER TABLE produkte ADD COLUMN preis INTEGER DEFAULT 0</code> — ergänzt die Spalte, ohne die Tabelle neu anzulegen.</li><li>Bestehende Zeilen (hier: Schrauben) bleiben erhalten und bekommen den DEFAULT-Wert für die neue Spalte.</li></ul>`,
  successCriteria: `Die Tabelle produkte muss danach eine Spalte preis haben, und das vorhandene Produkt Schrauben muss weiterhin existieren (mit preis = 0) — nicht durch eine neu angelegte, leere Tabelle ersetzt worden sein.`,
  extra: {
    pg: `Identisch in Postgres — ALTER TABLE ... ADD COLUMN ist Standard-SQL.`,
  },
  validate: (engine) => {
    let columns: unknown[][];
    try {
      columns = engine.exec(`PRAGMA table_info(produkte)`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const preisCol = columns.find((row) => String(row[1]) === 'preis');
    if (!preisCol) {
      return { ok: false, message: 'Die Tabelle produkte hat noch keine Spalte preis — wurde ALTER TABLE ... ADD COLUMN ausgeführt?' };
    }
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT name, preis FROM produkte WHERE name = 'Schrauben'`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    if (rows.length === 0) {
      return {
        ok: false,
        message: 'Das ursprüngliche Produkt Schrauben existiert nicht mehr — wurde die Tabelle statt geändert neu angelegt (und damit die Daten gelöscht)?',
      };
    }
    if (Number(rows[0]?.[1]) !== 0) {
      return { ok: false, message: `Schrauben hat preis = ${rows[0]?.[1]}, erwartet wird 0 (aus DEFAULT).` };
    }
    return { ok: true, message: 'Korrekt: produkte hat jetzt eine Spalte preis, und das vorhandene Produkt Schrauben blieb erhalten.' };
  },
  distractors: [
    {
      code: `DROP TABLE produkte;
CREATE TABLE produkte (id INTEGER, name TEXT, preis INTEGER DEFAULT 0);`,
      reason: 'die neue Tabelle hat zwar die richtige Spalte preis mit DEFAULT 0, aber DROP TABLE löscht dabei das vorhandene Produkt Schrauben unwiderruflich — die Prüfung findet danach keine Zeile mehr für Schrauben',
    },
  ],
};
