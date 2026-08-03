import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge05: SqlChallenge = {
  num: '05',
  title: 'Zufallswerte',
  tutorial: `<code>RANDOM()</code> liefert in SQLite eine große Zufallszahl — auch negative. Zwei neue Bausteine, um daraus eine kontrollierte Zahl in einem bestimmten Bereich zu machen: <code>ABS(x)</code> macht aus x immer eine positive Zahl (entfernt ein eventuelles Minus). Der <b>Modulo-Operator</b> <code>%</code> gibt den <i>Rest einer Ganzzahl-Division</i> zurück — z. B. ist <code>17 % 5</code> gleich 2 (17 geteilt durch 5 = 3 Rest 2). Damit lässt sich jede Zahl auf einen festen Bereich 'einklemmen': <code>x % 6</code> ergibt immer einen Wert zwischen 0 und 5. Kombiniert: <pre>SELECT ABS(RANDOM() % 6) + 1; -- Zufallszahl 1-6, wie ein Würfel</pre>Erst der Rest begrenzt den Bereich auf 0–5, <code>+1</code> verschiebt ihn auf 1–6.`,
  task: `Realistische Testdaten brauchen Variation — lauter identische Werte helfen dir beim Testen nicht weiter. RANDOM() ist das Werkzeug, mit dem du kontrollierten Zufall in deine Daten bringst, z. B. für Testbewertungen, Platzhalterpreise oder Beispielmesswerte.<br><br><b>Deine Aufgabe:</b> Fülle <b>random_scores</b> mit 1000 Zeilen (id, score), jede mit einem zufälligen Integer zwischen 1 und 100.`,
  hints: [
    `RANDOM() erzeugt in SQLite auch negative Zahlen — <code>ABS()</code> macht das Ergebnis positiv.`,
    `Der Modulo-Operator <code>%</code> begrenzt den Wertebereich: <code>% 100</code> ergibt Werte von 0 bis 99.`,
    `So kombinierst du beides für 1–100:<pre>SELECT n, ABS(RANDOM() % 100) + 1 FROM seq;</pre>`,
  ] as const,
  solution: `CREATE TABLE random_scores (id INTEGER, score INTEGER);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 1000
)
INSERT INTO random_scores
SELECT n, ABS(RANDOM() % 100) + 1 FROM seq;

SELECT * FROM random_scores LIMIT 10;`,
  syntaxExplanation: `<ul><li><code>WITH RECURSIVE seq(n)</code> — die bekannte Zahlenreihe als Basis für 1000 Zeilen.</li><li><code>ABS(RANDOM() % 100) + 1</code> — RANDOM() liefert auch negative Zahlen, <code>ABS()</code> macht sie positiv, <code>% 100</code> begrenzt auf 0–99, <code>+1</code> verschiebt den Bereich auf 1–100.</li></ul>`,
  successCriteria: `Die Tabelle <b>random_scores</b> muss genau 1000 Zeilen enthalten, mit score-Werten zwischen 1 und 100 — und nicht überall demselben Wert.`,
  nondeterministic: true,
  extra: {
    pg: `Postgres' RANDOM() liefert einen Float zwischen 0.0 und 1.0, daher dort: FLOOR(RANDOM() * 100 + 1)::int statt ABS(RANDOM() % 100) + 1.`,
  },
  validate: (engine) => {
    try {
      const r = engine.exec('SELECT COUNT(*), MIN(score), MAX(score) FROM random_scores')[0]?.values[0];
      const count = Number(r?.[0]);
      const min = Number(r?.[1]);
      const max = Number(r?.[2]);
      if (count === 1000 && min >= 1 && max <= 100 && min < max) {
        return { ok: true, message: `random_scores hat 1000 Zeilen mit Werten zwischen ${min} und ${max}.` };
      }
      return { ok: false, message: `random_scores hat ${count} Zeile(n) (min ${min}, max ${max}) — erwartet 1000 Zeilen zwischen 1 und 100.` };
    } catch (e) {
      if (!tableExists(engine, 'random_scores')) return { ok: false, message: 'Tabelle random_scores wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle random_scores existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
