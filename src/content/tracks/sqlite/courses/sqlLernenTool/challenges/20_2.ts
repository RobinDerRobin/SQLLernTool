import type { SqlChallenge } from '../../../types';

export const challenge20_2: SqlChallenge = {
  num: '20.2',
  title: 'Verweise absichern: FOREIGN KEY',
  tutorial: `Bisher hast du Tabellen nur über zufällig passende IDs verknüpft — nichts hat verhindert, dass eine <code>kategorie_id</code> auf eine Kategorie zeigt, die gar nicht existiert. Ein <code>FOREIGN KEY</code> macht diesen Verweis verbindlich: <pre>CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  kategorie_id INTEGER,
  FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)
);</pre>Danach lehnt SQLite jedes <code>INSERT</code> ab, dessen <code>kategorie_id</code> keine existierende <code>kategorien.id</code> ist. Eine echte Überraschung dabei: SQLite prüft Fremdschlüssel <b>standardmäßig gar nicht</b> — du musst die Prüfung erst selbst pro Verbindung aktivieren, mit <code>PRAGMA foreign_keys = ON;</code>. Ohne diese Zeile würde die <code>FOREIGN KEY</code>-Angabe zwar im Schema stehen, aber nichts durchsetzen.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>kategorien</b> (id, name) ist bereits angelegt und enthält 'Werkzeug' (id 1) und 'Elektronik' (id 2).<br><br><b>Deine Aufgabe:</b> Aktiviere zuerst die Fremdschlüssel-Prüfung mit <code>PRAGMA foreign_keys = ON;</code>. Lege danach eine Tabelle <code>produkte</code> an mit <code>id INTEGER</code>, <code>name TEXT</code>, <code>kategorie_id INTEGER</code> und einem <code>FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)</code>. Füge ein gültiges Produkt ein: <code>id 1</code>, <code>name 'Schrauben'</code>, <code>kategorie_id 1</code>.`,
  setup: `CREATE TABLE kategorien (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO kategorien VALUES (1, 'Werkzeug'), (2, 'Elektronik');`,
  hints: [
    `Ohne <code>PRAGMA foreign_keys = ON;</code> ganz am Anfang bleibt der FOREIGN KEY wirkungslos — SQLite prüft ihn sonst nicht.`,
    `Die FOREIGN-KEY-Zeile steht wie CHECK als eigene Zeile in der Tabellendefinition: <code>FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)</code>.`,
    `So sieht die Lösung aus:<pre>PRAGMA foreign_keys = ON;
CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  kategorie_id INTEGER,
  FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)
);
INSERT INTO produkte VALUES (1, 'Schrauben', 1);</pre>`,
  ] as const,
  solution: `PRAGMA foreign_keys = ON;
CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  kategorie_id INTEGER,
  FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)
);
INSERT INTO produkte VALUES (1, 'Schrauben', 1);`,
  syntaxExplanation: `<ul><li><code>PRAGMA foreign_keys = ON;</code> — aktiviert die Fremdschlüssel-Prüfung für diese Verbindung; SQLite hat sie standardmäßig aus.</li><li><code>FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)</code> — erklärt kategorie_id zu einem verbindlichen Verweis auf kategorien.id.</li></ul>`,
  successCriteria: `Ein Testeinfügen mit einer nicht existierenden kategorie_id muss tatsächlich abgelehnt werden — nicht nur der FOREIGN KEY im Schema stehen, ohne dass er durchgesetzt wird.`,
  extra: {
    pg: `In Postgres ist FOREIGN KEY identisch, aber die Prüfung ist immer aktiv — es gibt kein Äquivalent zu PRAGMA foreign_keys, das man erst einschalten müsste.`,
  },
  validate: (engine) => {
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT kategorie_id FROM produkte WHERE name = 'Schrauben'`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    if (rows.length === 0) {
      return { ok: false, message: 'Es gibt kein Produkt namens Schrauben in der Tabelle produkte.' };
    }
    if (Number(rows[0]?.[0]) !== 1) {
      return { ok: false, message: `Schrauben hat kategorie_id = ${rows[0]?.[0]}, erwartet wird 1.` };
    }
    let fkBlocked = false;
    try {
      engine.exec(`INSERT INTO produkte VALUES (9999, '__fk_probe__', 999)`);
    } catch {
      fkBlocked = true;
    }
    if (!fkBlocked) {
      engine.exec(`DELETE FROM produkte WHERE id = 9999`);
      return {
        ok: false,
        message: 'Ein Testeinfügen mit kategorie_id = 999 (existiert nicht in kategorien) wurde nicht abgelehnt — entweder fehlt der FOREIGN KEY, oder PRAGMA foreign_keys = ON wurde nicht (rechtzeitig) gesetzt.',
      };
    }
    return { ok: true, message: 'Korrekt: Der FOREIGN KEY ist aktiv und lehnt eine nicht existierende kategorie_id tatsächlich ab.' };
  },
  distractors: [
    {
      code: `CREATE TABLE produkte (
  id INTEGER,
  name TEXT,
  kategorie_id INTEGER,
  FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)
);
INSERT INTO produkte VALUES (1, 'Schrauben', 1);`,
      reason: 'deklariert den FOREIGN KEY korrekt und fügt den gültigen Datensatz ein, vergisst aber PRAGMA foreign_keys = ON — SQLite prüft Fremdschlüssel standardmäßig gar nicht, der Testeinfügeversuch mit einer ungültigen kategorie_id wird deshalb nicht abgelehnt',
    },
  ],
};
