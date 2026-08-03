import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge12: SqlChallenge = {
  num: '12',
  title: 'NULL-Werte gezielt einstreuen',
  tutorial: `<code>NULL</code> ist kein Wert, sondern die ausdrückliche Abwesenheit eines Wertes — 'unbekannt' oder 'nicht angegeben'. In SQL verhält es sich besonders: <code>spalte = NULL</code> funktioniert <i>nicht</i>, man prüft stattdessen mit <code>IS NULL</code> bzw. <code>IS NOT NULL</code>. Auch <code>COUNT(spalte)</code> zählt NULL-Werte nicht mit, <code>COUNT(*)</code> dagegen schon — ein Unterschied, über den man leicht stolpert. Erzeugen lässt sich NULL wie jeder andere Wert in einem CASE: <pre>CASE WHEN ABS(RANDOM() % 100) &lt; 20 THEN NULL ELSE 'wert' END</pre>`,
  task: `Echte Datenbanken sind voller Lücken: nicht jeder Kunde hinterlegt eine Telefonnummer, nicht jede Bestellung hat einen Kommentar. Testdaten ohne NULL-Werte verschweigen genau die Fälle, an denen Anwendungen später scheitern — deshalb gehört das gezielte Einstreuen von Lücken zu realistischen Testdaten dazu.<br><br><b>Deine Aufgabe:</b> Erzeuge eine Tabelle <b>profile</b> mit genau 100 Zeilen (id, telefon), bei der ungefähr 20% der Zeilen NULL als telefon haben und der Rest eine zusammengesetzte Nummer wie '0170-1234'.`,
  hints: [
    `Die 100 Zeilen entstehen über die bekannte rekursive CTE.`,
    `Mit <code>ABS(RANDOM() % 100) &lt; 20</code> trifft die Bedingung in etwa 20 von 100 Fällen zu (siehe 8.2).`,
    `NULL schreibst du ohne Anführungszeichen — es ist ein Schlüsselwort, kein Text:<pre>CASE WHEN ABS(RANDOM() % 100) &lt; 20 THEN NULL\n     ELSE '0170-' || n END AS telefon</pre>`,
  ] as const,
  solution: `CREATE TABLE profile (id INTEGER, telefon TEXT);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 100
)
INSERT INTO profile
SELECT n,
  CASE WHEN ABS(RANDOM() % 100) < 20 THEN NULL
       ELSE '0170-' || n
  END
FROM seq;

SELECT COUNT(*) AS gesamt, COUNT(telefon) AS mit_nummer FROM profile;`,
  syntaxExplanation: `<ul><li><code>CASE WHEN ... THEN NULL ELSE ... END</code> — NULL ist ein Schlüsselwort und steht ohne Anführungszeichen.</li><li><code>ABS(RANDOM() % 100) &lt; 20</code> — trifft in rund 20% der Zeilen zu und bestimmt so den Anteil der Lücken.</li><li><code>COUNT(*)</code> zählt alle Zeilen, <code>COUNT(telefon)</code> nur die mit einem Wert — die Differenz sind genau die NULL-Zeilen.</li></ul>`,
  successCriteria: `Die Tabelle <b>profile</b> muss genau 100 Zeilen enthalten, davon einige (aber nicht alle) mit NULL in telefon.`,
  nondeterministic: true,
  extra: {
    pg: `Identisch in Postgres, nur die Zufallszahl anders: CASE WHEN RANDOM() < 0.2 THEN NULL ELSE ... END — dort ist RANDOM() bereits ein Wert zwischen 0 und 1, der sich direkt als Wahrscheinlichkeit lesen lässt.`,
  },
  validate: (engine) => {
    try {
      const r = engine.exec('SELECT COUNT(*), COUNT(telefon) FROM profile')[0]?.values[0];
      const total = Number(r?.[0]);
      const withValue = Number(r?.[1]);
      const nulls = total - withValue;
      if (total !== 100) return { ok: false, message: `profile hat ${total} Zeile(n), erwartet 100.` };
      if (nulls === 0) return { ok: false, message: 'Es gibt keine NULL-Werte — die Bedingung für die Lücken greift noch nicht.' };
      if (withValue === 0) return { ok: false, message: 'Alle Zeilen sind NULL — es sollten nur etwa 20% sein.' };
      // Generous bounds for a ~20% target, per challenge-anforderungen.md section 8.
      if (nulls < 5 || nulls > 45) return { ok: false, message: `${nulls} von 100 Zeilen sind NULL — erwartet werden ungefähr 20.` };
      return { ok: true, message: `100 Profile, davon ${nulls} ohne Telefonnummer.` };
    } catch (e) {
      if (!tableExists(engine, 'profile')) return { ok: false, message: 'Tabelle profile wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle profile existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
