import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge01: SqlChallenge = {
  num: '01',
  title: 'Basis-INSERT',
  tutorial: `Bevor es losgeht, ein paar Grundbegriffe: Eine <b>Tabelle</b> ist wie ein Excel-Blatt mit festen Spalten — jede Spalte hat einen Namen und einen <b>Datentyp</b>, der festlegt, was für Werte reinpassen. Die wichtigsten Typen hier: <code>INTEGER</code> (ganze Zahl), <code>TEXT</code> (Text/String). Eine Tabelle legst du mit <code>CREATE TABLE name (spalte1 typ1, spalte2 typ2, ...)</code> an. Zeilen fügst du danach mit <code>INSERT INTO name (spalten) VALUES (werte)</code> ein — pro Zeile ein Klammerpaar, mit Komma getrennt für mehrere Zeilen in einem Statement. Wichtig: Jede Anweisung ('Statement') endet mit einem Semikolon <code>;</code> — das markiert das Ende eines Befehls, bevor der nächste beginnt:<pre>CREATE TABLE animals (id INTEGER, art TEXT);\nINSERT INTO animals (id, art) VALUES\n  (1, 'Katze'),\n  (2, 'Hund');</pre>Text-Werte stehen dabei immer in einfachen Anführungszeichen <code>'so'</code>, Zahlen nicht.`,
  task: `Jede Datenbank beginnt mit leeren Tabellen — bevor du Daten auswerten kannst, musst du wissen, wie sie überhaupt hineinkommen. Das ist die Grundlage für alles Weitere: Egal ob du später Testdaten für dein Projekt brauchst oder einfach nur ausprobierst, wie sich eine neue Tabelle verhält — INSERT ist der Einstieg dafür.<br><br><b>Deine Aufgabe:</b> Lege eine Tabelle <b>users</b> (id, name, signup_date) an und füge 5 Zeilen manuell ein. Prüfe am Ende mit einem SELECT, ob alle 5 Zeilen drin sind.`,
  hints: [
    `Jede Anweisung muss mit einem Semikolon <code>;</code> enden — sonst denkt SQL, die nächste Zeile gehört noch zur selben Anweisung.`,
    `Textwerte (Namen, Datumsangaben) brauchen einfache Anführungszeichen: <code>'Anna'</code>, <code>'2025-01-04'</code>. Das SQL-Standardformat für Datumsangaben ist Jahr-Monat-Tag.`,
    `So könnte der Anfang aussehen:<pre>CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name TEXT,\n  signup_date TEXT\n);\n\nINSERT INTO users (id, name, signup_date) VALUES\n  (1, 'Anna', '2025-01-04'),\n  ...\n  ;</pre>`,
  ] as const,
  solution: `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  signup_date TEXT
);

INSERT INTO users (id, name, signup_date) VALUES
  (1, 'Anna', '2025-01-04'),
  (2, 'Ben', '2025-01-09'),
  (3, 'Clara', '2025-01-15'),
  (4, 'David', '2025-02-01'),
  (5, 'Emma', '2025-02-20');

SELECT * FROM users;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE users (...)</code> — legt die Tabelle mit drei Spalten unterschiedlichen Typs an.</li><li><code>INSERT INTO ... VALUES (...),(...)</code> — fügt mehrere Zeilen in einem einzigen Statement ein.</li><li><code>SELECT * FROM users;</code> — gibt zur Kontrolle alle Spalten und Zeilen zurück.</li></ul>`,
  successCriteria: `Die Tabelle <b>users</b> muss existieren und mindestens 5 Zeilen enthalten.`,
  extra: {
    pg: `Identisch in Postgres — signup_date würdest du dort meist als echten DATE-Typ anlegen: signup_date DATE.`,
  },
  validate: (engine) => {
    try {
      const count = Number(engine.exec('SELECT id, name, signup_date FROM users')[0]?.values.length ?? 0);
      if (count >= 5) return { ok: true, message: `users enthält ${count} Zeilen.` };
      return { ok: false, message: `users enthält nur ${count} Zeile(n) — erwartet mindestens 5.` };
    } catch (e) {
      if (!tableExists(engine, 'users')) return { ok: false, message: 'Tabelle users wurde noch nicht angelegt.' };
      return {
        ok: false,
        message: `users existiert, aber es fehlt eine der erwarteten Spalten id, name, signup_date: ${(e as Error).message}`,
      };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE users (x INTEGER);
INSERT INTO users VALUES (1),(2),(3),(4),(5);
SELECT * FROM users;`,
      reason: 'hat 5 Zeilen, aber nicht die geforderten Spalten id/name/signup_date',
    },
  ],
};
