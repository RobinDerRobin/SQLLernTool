import type { SqlChallenge } from '../../../types';

export const challenge20_4: SqlChallenge = {
  num: '20.4',
  title: 'Eine Tabelle komplett entfernen: DROP TABLE',
  tutorial: `<code>DELETE FROM tabelle</code> leert eine Tabelle, aber die Tabelle selbst bleibt bestehen (mit ihrem Schema, bereit für neue Zeilen). Willst du die Tabelle <b>selbst</b> loswerden — Schema und Daten —, brauchst du <code>DROP TABLE</code>: <pre>DROP TABLE temp_report;</pre>Danach existiert <code>temp_report</code> nicht mehr; eine Abfrage dagegen würde mit "no such table" fehlschlagen. Das ist der endgültigste DDL-Befehl, den es gibt — anders als bei <code>DELETE</code> gibt es hinterher nichts mehr, das man mit einem weiteren <code>INSERT</code> wieder befüllen könnte.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>temp_report</b> (id, wert) ist bereits angelegt und wird nicht mehr gebraucht.<br><br><b>Deine Aufgabe:</b> Entferne die Tabelle <code>temp_report</code> vollständig — nicht nur ihren Inhalt.`,
  setup: `CREATE TABLE temp_report (id INTEGER, wert TEXT);
INSERT INTO temp_report VALUES (1, 'Zwischenstand');`,
  hints: [
    `<code>DROP TABLE &lt;name&gt;;</code> entfernt die Tabelle komplett — Schema und Daten.`,
    `Verwechsle es nicht mit <code>DELETE FROM temp_report;</code> — das würde nur die Zeilen löschen, die Tabelle selbst bliebe bestehen.`,
    `So sieht die Lösung aus:<pre>DROP TABLE temp_report;</pre>`,
  ] as const,
  solution: `DROP TABLE temp_report;`,
  syntaxExplanation: `<ul><li><code>DROP TABLE temp_report</code> — entfernt Tabelle und Daten vollständig aus der Datenbank.</li><li>Ein anschließendes <code>SELECT * FROM temp_report</code> würde mit "no such table: temp_report" fehlschlagen.</li></ul>`,
  successCriteria: `Die Tabelle temp_report darf danach nicht mehr existieren (nicht nur leer sein) — sqlite_master darf keinen Eintrag mehr für sie enthalten.`,
  extra: {
    pg: `Identisch in Postgres — DROP TABLE ist Standard-SQL.`,
  },
  validate: (engine) => {
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'temp_report'`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    if (rows.length > 0) {
      return { ok: false, message: 'Die Tabelle temp_report existiert noch — wurde vielleicht nur ihr Inhalt gelöscht (DELETE) statt die Tabelle selbst (DROP TABLE)?' };
    }
    return { ok: true, message: 'Korrekt: Die Tabelle temp_report existiert nicht mehr.' };
  },
  distractors: [
    {
      code: `DELETE FROM temp_report;`,
      reason: 'leert die Tabelle (keine Zeilen mehr), aber die Tabelle temp_report existiert danach immer noch in sqlite_master — DROP TABLE wurde nicht verwendet',
    },
  ],
};
