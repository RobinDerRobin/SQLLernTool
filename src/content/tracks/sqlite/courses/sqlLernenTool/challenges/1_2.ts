import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge1_2: SqlChallenge = {
  num: '1.2',
  title: 'Tabelle aus einer Abfrage erzeugen',
  tutorial: `Ein SELECT-Ergebnis muss nicht nur angezeigt werden — mit <code>CREATE TABLE neue_tabelle AS SELECT ...</code> speicherst du es direkt als eigene, neue Tabelle. Das kombiniert Tabellen-Erstellung und Befüllung in einem Schritt: <pre>CREATE TABLE erwachsene AS\nSELECT * FROM personen WHERE alter >= 18;</pre>Die neue Tabelle übernimmt automatisch die Spalten (und, je nach Datenbank, teils auch die Typen) der Quelle.`,
  task: `Das ist der zweite Baustein auf dem Weg zu Challenge 2, wo du Daten aus einer SELECT-Abfrage in eine bereits existierende Tabelle einfügst. Hier übst du die einfachere Variante zuerst: eine komplett neue Tabelle direkt aus einer Abfrage erzeugen.<br><br><b>Deine Aufgabe:</b> Erzeuge eine neue Tabelle <b>active_users</b>, die alle Zeilen aus <b>users</b> mit signup_date ab '2025-01-10' enthält (genau der Filter aus 1.1) — diesmal aber als gespeicherte Tabelle statt nur als Anzeige.`,
  prereqNums: ['01'],
  prereqNote: `Setzt voraus, dass du Challenge 1 (Tabelle users) bereits ausgeführt hast.`,
  hints: [
    `CREATE TABLE ... AS SELECT ... legt die Tabelle an und füllt sie in einem einzigen Statement — kein separates INSERT nötig.`,
    `Die WHERE-Bedingung funktioniert genau wie in 1.1: <code>WHERE signup_date >= '2025-01-10'</code>.`,
    `So sieht die Lösung aus:<pre>CREATE TABLE active_users AS\nSELECT * FROM users\nWHERE signup_date >= '2025-01-10';</pre>`,
  ] as const,
  solution: `CREATE TABLE active_users AS
SELECT * FROM users
WHERE signup_date >= '2025-01-10';

SELECT * FROM active_users;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE active_users AS SELECT ...</code> — erzeugt die Tabelle direkt aus dem Abfrageergebnis, ohne separates INSERT.</li><li><code>WHERE signup_date >= '2025-01-10'</code> — identischer Filter wie in 1.1, hier innerhalb der Tabellenerzeugung.</li></ul>`,
  successCriteria: `Die Tabelle <b>active_users</b> muss existieren und ausschließlich Zeilen mit signup_date ab '2025-01-10' enthalten.`,
  extra: {
    pg: `Identisch in Postgres — CREATE TABLE ... AS SELECT ist Standard-SQL und funktioniert dort genauso.`,
  },
  validate: (engine) => {
    try {
      const res = engine.exec('SELECT * FROM active_users');
      if (!res.length || !res[0]?.values.length) {
        return { ok: false, message: 'active_users enthält keine Zeilen — erwartet werden alle Nutzer ab 2025-01-10.' };
      }
      const rows = res[0].values;
      for (const row of rows) {
        if (String(row[2]) < '2025-01-10') return { ok: false, message: 'active_users enthält auch Zeilen vor 2025-01-10.' };
      }
      const expectedCount = Number(
        engine.exec("SELECT COUNT(*) FROM users WHERE signup_date >= '2025-01-10'")[0]?.values[0]?.[0],
      );
      if (rows.length !== expectedCount) {
        return {
          ok: false,
          message: `active_users hat ${rows.length} Zeile(n), aber users enthält tatsächlich ${expectedCount} passende — es fehlen Zeilen (WHERE zu eng gefasst?).`,
        };
      }
      return { ok: true, message: `active_users enthält ${rows.length} passende Zeile(n).` };
    } catch (e) {
      if (!tableExists(engine, 'active_users')) return { ok: false, message: 'Tabelle active_users wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle active_users existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE active_users AS
SELECT * FROM users
WHERE signup_date >= '2025-01-20';

SELECT * FROM active_users;`,
      reason: 'jede Zeile erfüllt die Bedingung, aber die WHERE-Grenze ist zu eng — echte Treffer zwischen 2025-01-10 und 2025-01-20 fehlen unbemerkt',
    },
  ],
};
