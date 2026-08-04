import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge9_2: SqlChallenge = {
  num: '9.2',
  title: 'Zwei verknüpfte Tabellen auf einmal erzeugen',
  tutorial: `Bisher hast du immer nur eine Tabelle pro Aufgabe erzeugt. Für ein realistisches Datenset brauchst du aber mehrere, die aufeinander verweisen — und die Reihenfolge ist dabei entscheidend: Zuerst entsteht die Tabelle mit den IDs, danach die Tabelle, die auf diese IDs verweist. Der Fremdschlüssel wird dabei als Zufallszahl im gültigen ID-Bereich erzeugt: <pre>-- verweist zufaellig auf eine der 5 Abteilungen\nABS(RANDOM() % 5) + 1</pre>Die Obergrenze im Modulo muss exakt zur Zeilenzahl der ersten Tabelle passen — sonst entstehen Verweise auf IDs, die es gar nicht gibt.`,
  task: `Letzter Baustein vor Kapitel 10: Dort erzeugst du 100 Kunden und 1000 dazu passende Bestellungen. Hier übst du genau dieses Zusammenspiel zweier Tabellen erstmal im kleinen Maßstab.<br><br><b>Deine Aufgabe:</b> Erzeuge zwei Tabellen: <b>abteilungen</b> mit genau 5 Zeilen (id, name) und <b>mitarbeiter</b> mit genau 20 Zeilen (id, abteilung_id), wobei jede abteilung_id zufällig auf eine existierende Abteilung (1 bis 5) verweist.`,
  hints: [
    `Beide Tabellen entstehen über je eine rekursive CTE — die eine zählt bis 5, die andere bis 20.`,
    `Für den Namen der Abteilung reicht eine Verkettung wie <code>'Abteilung ' || n</code> (siehe 7.1).`,
    `Die zufällige abteilung_id erzeugst du wie in Kapitel 5:<pre>ABS(RANDOM() % 5) + 1</pre>Damit liegen alle Werte garantiert zwischen 1 und 5.`,
  ] as const,
  solution: `CREATE TABLE abteilungen (id INTEGER, name TEXT);
WITH RECURSIVE a(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM a WHERE n < 5
)
INSERT INTO abteilungen SELECT n, 'Abteilung ' || n FROM a;

CREATE TABLE mitarbeiter (id INTEGER, abteilung_id INTEGER);
WITH RECURSIVE m(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM m WHERE n < 20
)
INSERT INTO mitarbeiter SELECT n, ABS(RANDOM() % 5) + 1 FROM m;

SELECT * FROM mitarbeiter LIMIT 10;`,
  syntaxExplanation: `<ul><li>Zwei getrennte CTEs erzeugen die laufenden Nummern für beide Tabellen (5 bzw. 20 Zeilen).</li><li><code>'Abteilung ' || n</code> — Verkettung für einen sprechenden Namen.</li><li><code>ABS(RANDOM() % 5) + 1</code> — Zufallszahl exakt im gültigen ID-Bereich 1 bis 5, damit jeder Verweis ins Leere ausgeschlossen ist.</li><li>Reihenfolge: erst abteilungen anlegen, dann mitarbeiter, die darauf verweisen.</li></ul>`,
  successCriteria: `<b>abteilungen</b> muss genau 5 Zeilen haben, <b>mitarbeiter</b> genau 20 — und jede abteilung_id muss zwischen 1 und 5 liegen.`,
  nondeterministic: true,
  extra: {
    pg: `In Postgres würdest du beide Tabellen über GENERATE_SERIES füllen und die zufällige ID über FLOOR(RANDOM()*5+1)::int erzeugen — zusätzlich ließe sich abteilung_id als echter Fremdschlüssel deklarieren (REFERENCES abteilungen(id)).`,
  },
  validate: (engine) => {
    try {
      const a = Number(engine.exec('SELECT COUNT(*) FROM abteilungen')[0]?.values[0]?.[0]);
      const m = engine.exec('SELECT COUNT(*), MIN(abteilung_id), MAX(abteilung_id) FROM mitarbeiter')[0]?.values[0];
      const mCount = Number(m?.[0]);
      const mMin = Number(m?.[1]);
      const mMax = Number(m?.[2]);
      if (a !== 5) return { ok: false, message: `abteilungen hat ${a} Zeile(n), erwartet 5.` };
      if (mCount !== 20) return { ok: false, message: `mitarbeiter hat ${mCount} Zeile(n), erwartet 20.` };
      if (mMin < 1 || mMax > 5) return { ok: false, message: `abteilung_id reicht von ${mMin} bis ${mMax} — erlaubt ist nur 1 bis 5.` };
      const invalidRefs = Number(
        engine.exec('SELECT COUNT(*) FROM mitarbeiter WHERE abteilung_id NOT IN (SELECT id FROM abteilungen)')[0]
          ?.values[0]?.[0],
      );
      if (invalidRefs > 0) {
        return {
          ok: false,
          message: `${invalidRefs} mitarbeiter-Zeile(n) verweisen per abteilung_id auf keine existierende Abteilung — abteilung_id liegt zwar in 1–5, aber abteilungen.id hat andere Werte.`,
        };
      }
      return { ok: true, message: `5 Abteilungen und 20 Mitarbeiter mit gültigen Verweisen erzeugt.` };
    } catch (e) {
      if (!tableExists(engine, 'abteilungen')) return { ok: false, message: 'Tabelle abteilungen wurde noch nicht angelegt.' };
      if (!tableExists(engine, 'mitarbeiter')) return { ok: false, message: 'Tabelle mitarbeiter wurde noch nicht angelegt.' };
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE abteilungen (id INTEGER, name TEXT);
INSERT INTO abteilungen VALUES (10,'X'),(11,'X'),(12,'X'),(13,'X'),(14,'X');

CREATE TABLE mitarbeiter (id INTEGER, abteilung_id INTEGER);
WITH RECURSIVE m(n) AS (
  SELECT 1 UNION ALL SELECT n+1 FROM m WHERE n < 20
)
INSERT INTO mitarbeiter SELECT n, ABS(RANDOM() % 5) + 1 FROM m;

SELECT * FROM mitarbeiter LIMIT 10;`,
      reason: 'abteilung_id liegt korrekt zwischen 1 und 5, aber abteilungen hat IDs 10–14 — jeder Verweis zeigt auf eine nicht existierende Abteilung',
    },
  ],
};
