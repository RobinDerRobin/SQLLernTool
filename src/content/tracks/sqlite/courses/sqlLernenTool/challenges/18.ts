import type { SqlChallenge } from '../../../types';

export const challenge18: SqlChallenge = {
  num: '18',
  title: 'Ein Register für die Tabelle: Indizes',
  tutorial: `Ein Buch ohne Stichwortverzeichnis zwingt dich, jede Seite zu durchsuchen, um ein Wort zu finden. Ein <b>Index</b> ist genau dieses Stichwortverzeichnis, nur für eine Tabellenspalte: <pre>CREATE INDEX idx_mitarbeiter_name ON mitarbeiter(name);</pre>Danach kann SQLite bei einer Suche nach einem bestimmten Namen direkt zur richtigen Stelle springen, statt jede Zeile der Tabelle einzeln zu prüfen. Ein Index kostet zusätzlichen Speicherplatz und muss bei jedem <code>INSERT</code>/<code>UPDATE</code> mitgepflegt werden — er lohnt sich vor allem für Spalten, nach denen häufig gesucht wird.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, abteilung, gehalt) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Lege einen Index namens <code>idx_mitarbeiter_name</code> auf die Spalte <code>name</code> der Tabelle <code>mitarbeiter</code> an.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, abteilung TEXT, gehalt INTEGER);
INSERT INTO mitarbeiter VALUES (1,'Anna','Vertrieb',3000),(2,'Ben','IT',4500),(3,'Clara','IT',4000),(4,'David','Vertrieb',3200);`,
  hints: [
    `<code>CREATE INDEX &lt;name&gt; ON &lt;tabelle&gt;(&lt;spalte&gt;);</code> — der Index-Name ist frei wählbar, hier aber genau <code>idx_mitarbeiter_name</code> gefragt.`,
    `Die Spalte in den Klammern ist die, nach der später oft gesucht wird — hier <code>name</code>, nicht <code>id</code> oder <code>abteilung</code>.`,
    `So sieht die Lösung aus:<pre>CREATE INDEX idx_mitarbeiter_name ON mitarbeiter(name);</pre>`,
  ] as const,
  solution: `CREATE INDEX idx_mitarbeiter_name ON mitarbeiter(name);`,
  syntaxExplanation: `<ul><li><code>CREATE INDEX idx_mitarbeiter_name</code> — legt den Index unter diesem Namen an.</li><li><code>ON mitarbeiter(name)</code> — auf der Tabelle <code>mitarbeiter</code>, für die Spalte <code>name</code>.</li></ul>`,
  successCriteria: `Es muss einen Index namens <code>idx_mitarbeiter_name</code> auf der Spalte <code>name</code> der Tabelle <code>mitarbeiter</code> geben.`,
  extra: {
    pg: `Identisch in Postgres — CREATE INDEX ist Standard-SQL.`,
  },
  validate: (engine) => {
    try {
      const idxRows = engine.exec(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mitarbeiter_name' AND tbl_name='mitarbeiter'`)[0]?.values ?? [];
      if (idxRows.length === 0) {
        return { ok: false, message: 'Es gibt noch keinen Index namens idx_mitarbeiter_name auf der Tabelle mitarbeiter.' };
      }
      const infoRows = engine.exec(`PRAGMA index_info(idx_mitarbeiter_name)`)[0]?.values ?? [];
      const indexedColumns = infoRows.map((row) => String(row?.[2]));
      if (!indexedColumns.includes('name')) {
        return { ok: false, message: `Der Index idx_mitarbeiter_name zeigt auf ${JSON.stringify(indexedColumns)}, erwartet wird die Spalte name.` };
      }
      return { ok: true, message: 'Korrekt: idx_mitarbeiter_name indiziert die Spalte name.' };
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE INDEX idx_mitarbeiter_name ON mitarbeiter(abteilung);`,
      reason: 'legt den Index unter dem richtigen Namen an, aber auf der falschen Spalte (abteilung statt name) — PRAGMA index_info(idx_mitarbeiter_name) zeigt dann abteilung statt name als indizierte Spalte',
    },
  ],
};
