import type { SqlChallenge } from '../../../types';

export const challenge11_1: SqlChallenge = {
  num: '11.1',
  title: 'Daten ändern: UPDATE',
  tutorial: `Bisher hast du Daten nur eingefügt (<code>INSERT</code>) oder gelesen (<code>SELECT</code>) — nie eine bereits existierende Zeile verändert. Genau das macht <code>UPDATE</code>: <pre>UPDATE bestellungen
SET status = 'versendet'
WHERE id = 2;</pre><code>SET</code> legt fest, welche Spalte(n) welchen neuen Wert bekommen; <code>WHERE</code> legt fest, <i>welche</i> Zeilen betroffen sind — genau wie bei SELECT. <b>Ganz wichtig:</b> Ein <code>UPDATE</code> ohne <code>WHERE</code> ändert <i>jede einzige</i> Zeile der Tabelle. Das WHERE hier zu vergessen ist einer der teuersten Anfängerfehler in echten Datenbanken.`,
  task: `In einer echten Anwendung ändern sich Daten ständig — ein Bestellstatus wechselt von 'offen' zu 'versendet', ein Preis wird angepasst, ein Konto wird gesperrt. UPDATE ist das Werkzeug dafür.<br><br><b>Hinweis:</b> Die Tabelle <b>bestellungen</b> ist bereits angelegt, mit genau 3 Zeilen: <code>id</code> 1, 2 und 3, alle mit Status <code>'offen'</code>.<br><br><b>Deine Aufgabe:</b> Setze den Status von Bestellung <code>id = 2</code> auf <code>'versendet'</code> — die beiden anderen Bestellungen (id 1 und 3) müssen unverändert 'offen' bleiben.`,
  setup: `CREATE TABLE bestellungen (id INTEGER, status TEXT);
INSERT INTO bestellungen VALUES (1,'offen'),(2,'offen'),(3,'offen');`,
  hints: [
    `Der Aufbau ist immer: <code>UPDATE tabelle SET spalte = neuer_wert WHERE bedingung;</code>.`,
    `Ohne <code>WHERE id = 2</code> würden alle drei Zeilen auf 'versendet' gesetzt — das WHERE ist hier keine Option, sondern Pflicht.`,
    `So sieht die Lösung aus:<pre>UPDATE bestellungen
SET status = 'versendet'
WHERE id = 2;</pre>`,
  ] as const,
  solution: `UPDATE bestellungen
SET status = 'versendet'
WHERE id = 2;

SELECT * FROM bestellungen;`,
  syntaxExplanation: `<ul><li><code>SET status = 'versendet'</code> — legt den neuen Wert für die Spalte status fest.</li><li><code>WHERE id = 2</code> — begrenzt die Änderung auf genau diese eine Zeile.</li><li>Ohne WHERE würde die Änderung für die komplette Tabelle gelten.</li></ul>`,
  successCriteria: `Bestellung 2 muss den Status 'versendet' haben, Bestellungen 1 und 3 müssen weiterhin 'offen' sein.`,
  extra: {
    pg: `Identisch in Postgres — UPDATE ... SET ... WHERE ist Standard-SQL.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT id, status FROM bestellungen ORDER BY id')[0]?.values ?? [];
      const byId = new Map(rows.map((row) => [Number(row?.[0]), String(row?.[1])]));
      if (byId.get(2) !== 'versendet') {
        return { ok: false, message: `Bestellung 2 hat Status "${String(byId.get(2))}" — erwartet wird "versendet".` };
      }
      if (byId.get(1) !== 'offen' || byId.get(3) !== 'offen') {
        return { ok: false, message: 'Bestellung 1 und/oder 3 wurden ebenfalls verändert — nur Bestellung 2 sollte sich ändern.' };
      }
      return { ok: true, message: 'UPDATE korrekt: nur Bestellung 2 auf "versendet" gesetzt.' };
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
