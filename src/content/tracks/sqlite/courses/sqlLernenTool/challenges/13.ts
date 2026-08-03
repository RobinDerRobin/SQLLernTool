import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge13: SqlChallenge = {
  num: '13',
  title: 'Testdaten, die Constraints einhalten',
  tutorial: `Eine Tabelle kann Regeln festlegen, die jede Zeile erfüllen muss — sogenannte <b>Constraints</b>. Die wichtigsten: <code>NOT NULL</code> (Spalte darf nicht leer sein), <code>UNIQUE</code> (kein Wert darf doppelt vorkommen) und <code>PRIMARY KEY</code> (beides zusammen, als eindeutige Kennung). Die Datenbank weist jede Einfügung zurück, die dagegen verstößt: <pre>CREATE TABLE konten (\n  id INTEGER PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE\n);</pre>Für Testdaten heißt das: Zufällige Werte sind gefährlich, weil sie sich wiederholen können. Werte, die aus der laufenden Nummer abgeleitet sind, sind dagegen garantiert eindeutig — genau deshalb baut Kapitel 8 die E-Mails aus <code>n</code> statt aus Zufall.`,
  task: `Der häufigste Grund, warum generierte Testdaten in einem echten Schema scheitern, sind Constraints: Ein zufälliger Wert taucht doppelt auf, und der komplette Import bricht ab. Hier lernst du, Daten von vornherein so zu erzeugen, dass sie die Regeln einhalten.<br><br><b>Deine Aufgabe:</b> Lege eine Tabelle <b>konten</b> an, deren Spalte <b>email</b> ausdrücklich <code>NOT NULL</code> und <code>UNIQUE</code> ist, und fülle sie mit genau 50 Zeilen, deren E-Mails garantiert eindeutig sind.`,
  hints: [
    `Die Constraints schreibst du direkt hinter den Spaltentyp: <code>email TEXT NOT NULL UNIQUE</code>.`,
    `Eindeutigkeit erreichst du nicht über Zufall, sondern indem du die laufende Nummer in den Wert einbaust (siehe Kapitel 8).`,
    `So sieht der Aufbau aus:<pre>CREATE TABLE konten (\n  id INTEGER PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE\n);\n-- danach 50 Zeilen mit 'konto' || n || '@example.com'</pre>`,
  ] as const,
  solution: `CREATE TABLE konten (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 50
)
INSERT INTO konten
SELECT n, 'konto' || n || '@example.com' FROM seq;

SELECT * FROM konten LIMIT 10;`,
  syntaxExplanation: `<ul><li><code>id INTEGER PRIMARY KEY</code> — eindeutige Kennung, automatisch NOT NULL.</li><li><code>email TEXT NOT NULL UNIQUE</code> — die Spalte muss gefüllt und darf nirgends doppelt sein.</li><li><code>'konto' || n || '@example.com'</code> — weil n je Zeile verschieden ist, kann kein Wert doppelt entstehen; mit einer Zufallszahl wäre genau das dagegen möglich.</li></ul>`,
  successCriteria: `Die Tabelle <b>konten</b> muss die Constraints NOT NULL und UNIQUE auf email tragen und genau 50 Zeilen mit 50 verschiedenen E-Mails enthalten.`,
  extra: {
    pg: `Identisch in Postgres — NOT NULL, UNIQUE und PRIMARY KEY sind Standard-SQL. Postgres meldet Verstöße allerdings mit deutlich ausführlicheren Fehlermeldungen, inklusive des verletzten Constraint-Namens.`,
  },
  validate: (engine) => {
    try {
      const schema = engine.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='konten'")[0]?.values[0]?.[0];
      const schemaUpper = String(schema).toUpperCase();
      if (!schemaUpper.includes('UNIQUE') && !schemaUpper.includes('PRIMARY KEY (EMAIL')) {
        return { ok: false, message: 'Der Spalte email fehlt das UNIQUE-Constraint in der Tabellendefinition.' };
      }
      if (!schemaUpper.includes('NOT NULL')) {
        return { ok: false, message: 'Der Spalte email fehlt das NOT NULL-Constraint in der Tabellendefinition.' };
      }
      const r = engine.exec('SELECT COUNT(*), COUNT(DISTINCT email) FROM konten')[0]?.values[0];
      const count = Number(r?.[0]);
      const distinct = Number(r?.[1]);
      if (count !== 50) return { ok: false, message: `konten hat ${count} Zeile(n), erwartet 50.` };
      if (distinct !== 50) return { ok: false, message: `Nur ${distinct} verschiedene E-Mails bei ${count} Zeilen — sie müssen alle eindeutig sein.` };
      return { ok: true, message: '50 Konten mit eindeutigen E-Mails, Constraints eingehalten.' };
    } catch (e) {
      if (!tableExists(engine, 'konten')) return { ok: false, message: 'Tabelle konten wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle konten existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
