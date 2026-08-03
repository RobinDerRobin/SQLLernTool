import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge08: SqlChallenge = {
  num: '08',
  title: 'Realistisch aussehende Fake-Daten',
  tutorial: `Neues Werkzeug: Der Verkettungsoperator <code>||</code> hängt zwei oder mehr Werte aneinander und macht daraus einen einzigen Text — auch Zahlen werden dabei automatisch in Text umgewandelt: <pre>SELECT 'user' || 5 || '@example.com';\n-- ergibt: user5@example.com</pre>Kombinierst du das mit der Zahlenreihen-Technik aus Challenge 3 (jede Zeile hat eine fortlaufende Nummer), entstehen daraus automatisch viele unterschiedliche, aber plausibel aussehende Fake-Werte auf einmal.`,
  task: `Für Demos, Tests oder Präsentationen brauchst du oft Daten, die echt aussehen, ohne echte Personendaten zu verwenden. Mit String-Verkettung baust du aus einer einfachen Zahlenreihe automatisiert plausible Namen und E-Mail-Adressen — eine Technik, die in praktisch jedem Testdaten-Generator steckt.<br><br><b>Deine Aufgabe:</b> Erzeuge 500 Zeilen <b>customers</b> (id, name, email, country). E-Mail und Name sollen aus der laufenden Nummer gebildet werden, country zufällig aus DE/AT/CH.`,
  hints: [
    `<code>||</code> verkettet mehrere Werte zu einem String, auch Zahlen werden dabei automatisch zu Text — praktisch für 'user' || n.`,
    `Für die zufällige Länderauswahl eignet sich ein CASE mit <code>ABS(RANDOM() % 3)</code>, ähnlich wie bei den Zufallswerten aus Challenge 5.`,
    `So baust du die E-Mail:<pre>'user' || n || '@example.com'</pre>und die Länderauswahl:<pre>CASE ABS(RANDOM() % 3)\n  WHEN 0 THEN 'DE'\n  WHEN 1 THEN 'AT'\n  ELSE 'CH'\nEND</pre>`,
  ] as const,
  solution: `CREATE TABLE customers (id INTEGER, name TEXT, email TEXT, country TEXT);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 500
)
INSERT INTO customers
SELECT
  n,
  'Kunde ' || n,
  'user' || n || '@example.com',
  CASE ABS(RANDOM() % 3)
    WHEN 0 THEN 'DE'
    WHEN 1 THEN 'AT'
    ELSE 'CH'
  END
FROM seq;

SELECT * FROM customers LIMIT 10;`,
  syntaxExplanation: `<ul><li>Die CTE <code>seq(n)</code> erzeugt wie gewohnt eine laufende Nummer.</li><li><code>'Kunde ' || n</code> und <code>'user' || n || '@example.com'</code> — Verkettung von Text und Zahl zu neuen Strings.</li><li><code>CASE ABS(RANDOM() % 3) WHEN 0 THEN ... END</code> — wählt zufällig eine von drei Länder-Optionen.</li></ul>`,
  successCriteria: `Die Tabelle <b>customers</b> muss genau 500 Zeilen enthalten, jede mit einer eindeutigen (nicht doppelten) E-Mail-Adresse.`,
  extra: {
    pg: `String-Verkettung mit || funktioniert identisch in Postgres. Für die RANDOM()-basierte CASE-Verteilung: FLOOR(RANDOM()*3)::int statt ABS(RANDOM() % 3).`,
  },
  validate: (engine) => {
    try {
      const count = Number(engine.exec('SELECT COUNT(*) FROM customers')[0]?.values[0]?.[0]);
      const distinctEmails = Number(engine.exec('SELECT COUNT(DISTINCT email) FROM customers')[0]?.values[0]?.[0]);
      if (count === 500 && distinctEmails === 500) return { ok: true, message: 'customers hat 500 Zeilen mit eindeutigen E-Mails.' };
      return { ok: false, message: `customers hat ${count} Zeile(n) (${distinctEmails} eindeutige E-Mails) — erwartet 500 mit je einzigartiger E-Mail.` };
    } catch (e) {
      if (!tableExists(engine, 'customers')) return { ok: false, message: 'Tabelle customers wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle customers existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
