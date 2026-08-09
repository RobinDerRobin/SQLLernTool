import type { SqlChallenge } from '../../../types';

export const challenge17: SqlChallenge = {
  num: '17',
  title: 'Eine gespeicherte Abfrage: Views',
  tutorial: `Manche Abfragen braucht man immer wieder — zum Beispiel "alle Mitarbeiter der IT-Abteilung". Statt die <code>SELECT</code>-Anweisung jedes Mal neu zu tippen, kann man sie unter einem eigenen Namen <b>speichern</b>: <pre>CREATE VIEW it_mitarbeiter AS
SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT';</pre>Danach lässt sich <code>it_mitarbeiter</code> wie eine ganz normale Tabelle abfragen — <code>SELECT * FROM it_mitarbeiter</code> liefert immer den aktuellen Stand, denn eine <b>View</b> speichert keine eigenen Daten, sondern nur die Abfrage selbst. Ändert sich die Tabelle <code>mitarbeiter</code>, ändert sich sofort auch das, was die View zeigt.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, abteilung, gehalt) ist bereits angelegt und enthält Mitarbeiter aus mehreren Abteilungen.<br><br><b>Deine Aufgabe:</b> Lege eine View namens <code>it_mitarbeiter</code> an, die <code>name</code> und <code>gehalt</code> aller Mitarbeiter der Abteilung <code>'IT'</code> zeigt. Frage die View danach mit <code>SELECT * FROM it_mitarbeiter</code> ab.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, abteilung TEXT, gehalt INTEGER);
INSERT INTO mitarbeiter VALUES (1,'Anna','Vertrieb',3000),(2,'Ben','IT',4500),(3,'Clara','IT',4000),(4,'David','Vertrieb',3200);`,
  hints: [
    `<code>CREATE VIEW &lt;name&gt; AS &lt;SELECT-Anweisung&gt;;</code> — danach ist die View eine eigene, abfragbare "Tabelle".`,
    `Die <code>SELECT</code>-Anweisung hinter <code>AS</code> ist genau die Abfrage, die du sonst jedes Mal einzeln schreiben müsstest: <code>SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT'</code>.`,
    `So sieht die Lösung aus:<pre>CREATE VIEW it_mitarbeiter AS
SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT';

SELECT * FROM it_mitarbeiter;</pre>`,
  ] as const,
  solution: `CREATE VIEW it_mitarbeiter AS
SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT';

SELECT * FROM it_mitarbeiter;`,
  syntaxExplanation: `<ul><li><code>CREATE VIEW it_mitarbeiter AS ...</code> — speichert die Abfrage unter dem Namen <code>it_mitarbeiter</code>.</li><li>Die View selbst speichert keine Daten, nur die Abfrage-Definition.</li><li><code>SELECT * FROM it_mitarbeiter</code> — fragt die View wie eine Tabelle ab.</li></ul>`,
  successCriteria: `Die View <code>it_mitarbeiter</code> muss existieren und beim Abfragen genau die Mitarbeiter der Abteilung IT (Name + Gehalt) liefern.`,
  extra: {
    pg: `Identisch in Postgres — CREATE VIEW ist Standard-SQL.`,
  },
  validate: (engine) => {
    let expected: [string, number][];
    try {
      const rows = engine.exec(`SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT' ORDER BY name`)[0]?.values ?? [];
      expected = rows.map((row) => [String(row?.[0]), Number(row?.[1])]);
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    try {
      const rows = engine.exec(`SELECT name, gehalt FROM it_mitarbeiter ORDER BY name`)[0]?.values ?? [];
      const actual = rows.map((row) => [String(row?.[0]), Number(row?.[1])]);
      if (actual.length !== expected.length || actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])) {
        return { ok: false, message: `Die View liefert ${JSON.stringify(actual)}, erwartet werden die IT-Mitarbeiter ${JSON.stringify(expected)}.` };
      }
      return { ok: true, message: `Korrekt: Die View it_mitarbeiter zeigt genau die ${expected.length} Mitarbeiter der IT-Abteilung.` };
    } catch (e) {
      return { ok: false, message: `View it_mitarbeiter existiert noch nicht oder ist fehlerhaft: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `SELECT name, gehalt FROM mitarbeiter WHERE abteilung = 'IT';

SELECT * FROM it_mitarbeiter;`,
      reason: 'vergisst CREATE VIEW ... AS komplett und führt nur die SELECT-Abfrage direkt aus — die View it_mitarbeiter wird nie angelegt, die zweite Abfrage löst den echten Fehler "no such table: it_mitarbeiter" aus',
    },
  ],
};
