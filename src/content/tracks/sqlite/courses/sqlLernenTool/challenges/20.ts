import type { SqlChallenge } from '../../../types';

export const challenge20: SqlChallenge = {
  num: '20',
  title: 'Ein Startwert ohne Angabe: DEFAULT',
  tutorial: `Manche Spalten sollen einen sinnvollen Startwert bekommen, wenn beim <code>INSERT</code> nichts anderes angegeben wird. Dafür gibt es <code>DEFAULT</code> direkt in der Spaltendefinition: <pre>CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  lagerbestand INTEGER DEFAULT 0
);</pre>Lässt ein <code>INSERT</code> die Spalte <code>lagerbestand</code> weg, setzt SQLite automatisch <code>0</code> ein — ganz ohne dass du das im <code>INSERT</code> selbst wiederholen musst. Wichtig: <code>DEFAULT</code> ist Teil der <b>Tabellendefinition</b>, kein Trick im <code>INSERT</code> — ein <code>INSERT</code>, das den Wert stattdessen von Hand mitgibt, sieht zwar im Ergebnis gleich aus, hat aber den eigentlichen Mechanismus nicht genutzt.`,
  task: `<b>Deine Aufgabe:</b> Lege eine Tabelle <code>produkte</code> an mit den Spalten <code>id INTEGER</code>, <code>name TEXT</code> und <code>lagerbestand INTEGER DEFAULT 0</code>. Füge danach das Produkt <code>'Schrauben'</code> mit <code>id 1</code> ein, <b>ohne</b> <code>lagerbestand</code> im INSERT anzugeben — er soll automatisch auf 0 gesetzt werden. Frage abschließend alle Produkte ab.`,
  hints: [
    `Die DEFAULT-Angabe steht direkt hinter dem Spaltentyp in der Tabellendefinition: <code>lagerbestand INTEGER DEFAULT 0</code>.`,
    `Beim INSERT gibst du nur die Spalten <code>id</code> und <code>name</code> explizit an: <code>INSERT INTO produkte (id, name) VALUES (1, 'Schrauben')</code> — nicht alle drei Spalten.`,
    `So sieht die Lösung aus:<pre>CREATE TABLE produkte (id INTEGER, name TEXT, lagerbestand INTEGER DEFAULT 0);
INSERT INTO produkte (id, name) VALUES (1, 'Schrauben');
SELECT * FROM produkte;</pre>`,
  ] as const,
  solution: `CREATE TABLE produkte (id INTEGER, name TEXT, lagerbestand INTEGER DEFAULT 0);
INSERT INTO produkte (id, name) VALUES (1, 'Schrauben');
SELECT * FROM produkte;`,
  syntaxExplanation: `<ul><li><code>lagerbestand INTEGER DEFAULT 0</code> — der Startwert ist Teil der Spaltendefinition, nicht des INSERT.</li><li><code>INSERT INTO produkte (id, name) VALUES (1, 'Schrauben')</code> — lässt lagerbestand bewusst weg, damit DEFAULT greift.</li></ul>`,
  successCriteria: `Die Tabelle produkte muss lagerbestand tatsächlich als DEFAULT 0 deklarieren (nicht nur zufällig eine Zeile mit dem Wert 0 enthalten), und die eingefügte Zeile für 'Schrauben' muss lagerbestand = 0 haben.`,
  extra: {
    pg: `Identisch in Postgres — DEFAULT ist Teil des SQL-Standards und wird dort genauso in der Spaltendefinition angegeben.`,
  },
  validate: (engine) => {
    let columns: unknown[][];
    try {
      columns = engine.exec(`PRAGMA table_info(produkte)`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const lagerbestandCol = columns.find((row) => String(row[1]) === 'lagerbestand');
    if (!lagerbestandCol) {
      return { ok: false, message: 'Die Tabelle produkte hat noch keine Spalte lagerbestand.' };
    }
    const dfltValue = lagerbestandCol[4];
    if (dfltValue === null || dfltValue === undefined || Number(dfltValue) !== 0) {
      return {
        ok: false,
        message: `Die Spalte lagerbestand hat keinen DEFAULT-Wert von 0 in der Tabellendefinition (aktuell: ${JSON.stringify(dfltValue)}) — auch wenn eine Zeile zufällig lagerbestand = 0 zeigt, muss DEFAULT selbst gesetzt sein.`,
      };
    }
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT lagerbestand FROM produkte WHERE name = 'Schrauben'`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    if (rows.length === 0) {
      return { ok: false, message: 'Es gibt kein Produkt namens Schrauben in der Tabelle.' };
    }
    if (Number(rows[0]?.[0]) !== 0) {
      return { ok: false, message: `Schrauben hat lagerbestand = ${rows[0]?.[0]}, erwartet wird 0 (aus DEFAULT).` };
    }
    return { ok: true, message: 'Korrekt: lagerbestand ist als DEFAULT 0 definiert und wurde beim INSERT automatisch genutzt.' };
  },
  distractors: [
    {
      code: `CREATE TABLE produkte (id INTEGER, name TEXT, lagerbestand INTEGER);
INSERT INTO produkte (id, name, lagerbestand) VALUES (1, 'Schrauben', 0);
SELECT * FROM produkte;`,
      reason: 'liefert optisch dasselbe Ergebnis (lagerbestand = 0 für Schrauben), aber ohne DEFAULT in der Spaltendefinition — PRAGMA table_info(produkte) zeigt für lagerbestand keinen dflt_value, der Mechanismus wurde also gar nicht benutzt, nur sein sichtbarer Effekt nachgestellt',
    },
  ],
};
