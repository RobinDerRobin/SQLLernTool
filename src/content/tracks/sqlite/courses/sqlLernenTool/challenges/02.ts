import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge02: SqlChallenge = {
  num: '02',
  title: 'Bulk-INSERT mit SELECT',
  tutorial: `Ein <code>SELECT</code>-Statement liefert dir immer eine Ergebnis-Tabelle zurück — auch wenn du sie nicht extra speicherst. Der Trick bei diesem Muster: INSERT muss nicht nur feste Werte einfügen — es kann auch genau dieses Ergebnis einer SELECT-Query direkt als Quelle übernehmen, ganz ohne VALUES: <pre>INSERT INTO ziel_tabelle\nSELECT * FROM quell_tabelle;</pre>Die Spaltenanzahl und -typen von Ziel- und Quelltabelle müssen dabei zusammenpassen (gleiche Reihenfolge, kompatible Typen).`,
  task: `Kopien von Tabellen brauchst du ständig — z. B. um vor einer riskanten Änderung ein Backup zu haben, oder um Daten aus einer Tabelle in eine andere zu übernehmen. Statt jede Zeile einzeln neu zu tippen, lässt sich der Inhalt einer ganzen Tabelle mit einer einzigen Anweisung kopieren.<br><br><b>Deine Aufgabe:</b> Lege <b>users_backup</b> mit gleicher Struktur wie users an und fülle sie über INSERT INTO … SELECT aus users.`,
  // Audit fix during migration: the prototype relied on `users` existing without
  // declaring a prereq/setup — undeclared dependency per challenge-anforderungen.md
  // section 5. Declared explicitly here so the engine can materialize it deterministically.
  prereqNums: ['01'],
  prereqNote: `Setzt voraus, dass du Challenge 1 (Tabelle users) bereits ausgeführt hast.`,
  hints: [
    `INSERT INTO … SELECT braucht kein VALUES — nach dem Tabellennamen folgt direkt eine SELECT-Query, keine Klammern mit Werten.`,
    `Wenn Ziel- und Quelltabelle die gleiche Spaltenreihenfolge haben, reicht <code>SELECT *</code> als Quelle.`,
    `So sieht das INSERT aus:<pre>INSERT INTO users_backup\nSELECT * FROM users;</pre>`,
  ] as const,
  solution: `CREATE TABLE users_backup (
  id INTEGER PRIMARY KEY,
  name TEXT,
  signup_date TEXT
);

INSERT INTO users_backup
SELECT * FROM users;

SELECT * FROM users_backup;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE users_backup (...)</code> — legt eine Tabelle mit identischer Struktur wie users an.</li><li><code>INSERT INTO users_backup SELECT * FROM users;</code> — übernimmt alle Zeilen der Quelltabelle, statt feste Werte aufzulisten.</li></ul>`,
  successCriteria: `Die Tabelle <b>users_backup</b> muss existieren und genauso viele Zeilen wie <b>users</b> enthalten (mindestens 5).`,
  extra: {
    pg: `Gleiche Syntax in Postgres. Praktisch: CREATE TABLE users_backup AS SELECT * FROM users; erstellt Tabelle + Daten in einem Schritt (bekannt als CTAS).`,
  },
  validate: (engine) => {
    try {
      const usersCount = Number(engine.exec('SELECT COUNT(*) FROM users')[0]?.values[0]?.[0]);
      const backupCount = Number(engine.exec('SELECT COUNT(*) FROM users_backup')[0]?.values[0]?.[0]);
      if (backupCount < 5 || backupCount !== usersCount) {
        return { ok: false, message: `users_backup hat ${backupCount} Zeilen, users hat ${usersCount} — sollte gleich sein.` };
      }
      const mismatched = Number(
        engine.exec(
          'SELECT COUNT(*) FROM (SELECT id, name, signup_date FROM users EXCEPT SELECT id, name, signup_date FROM users_backup)',
        )[0]?.values[0]?.[0],
      );
      if (mismatched > 0) {
        return {
          ok: false,
          message: `users_backup hat gleich viele Zeilen wie users, aber ${mismatched} davon stimmen inhaltlich nicht überein — die Daten müssen tatsächlich aus users übernommen sein, nicht nur die Zeilenzahl passen.`,
        };
      }
      return { ok: true, message: `users_backup enthält ${backupCount} Zeilen, inhaltlich identisch mit users.` };
    } catch (e) {
      if (!tableExists(engine, 'users_backup')) return { ok: false, message: 'Tabelle users_backup wurde noch nicht angelegt.' };
      if (!tableExists(engine, 'users')) return { ok: false, message: 'Tabelle users existiert nicht (mehr) — wird für den Vergleich benötigt.' };
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE users_backup (
  id INTEGER PRIMARY KEY,
  name TEXT,
  signup_date TEXT
);

INSERT INTO users_backup
SELECT id, 'X', 'X' FROM users;

SELECT * FROM users_backup;`,
      reason: 'gleiche Zeilenzahl wie users, aber name/signup_date sind erfunden statt kopiert — INSERT INTO ... SELECT nie inhaltlich genutzt',
    },
  ],
};
