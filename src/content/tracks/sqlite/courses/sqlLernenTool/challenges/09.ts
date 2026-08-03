import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge09: SqlChallenge = {
  num: '09',
  title: 'Gewichtete Zufallsverteilung',
  tutorial: `Neues Konzept: <code>CASE WHEN bedingung THEN wert ELSE anderer_wert END</code> ist SQLs Version von 'wenn... dann... sonst...' — eine Bedingung wird geprüft, und je nachdem, ob sie zutrifft, wird der eine oder andere Wert zurückgegeben. Man kann auch mehrere WHEN-Zweige hintereinander schreiben; SQL prüft sie von oben nach unten und nimmt den ersten Treffer. Kombiniert mit RANDOM() lassen sich damit Werte erzeugen, die nicht gleich wahrscheinlich sind, sondern bewusst unterschiedlich häufig vorkommen — je größer der Zahlenbereich in einer Bedingung, desto wahrscheinlicher dieser Fall: <pre>CASE\n  WHEN ABS(RANDOM() % 100) < 80 THEN 'häufig'\n  ELSE 'selten'\nEND</pre>Hier trifft die erste Bedingung in 80 von 100 Fällen zu (Werte 0–79 von 0–99), der ELSE-Fall nur in den restlichen 20.<br><br><b>Eine Falle, in die fast jeder zuerst tappt:</b> Schreibst du in <i>jeden</i> WHEN-Zweig ein eigenes <code>RANDOM()</code>, würfelt SQL bei jedem Zweig <i>neu</i> — die Zweige sind dann nicht mehr dieselbe Zufallszahl, sondern unabhängige Würfe. Aus einer gewollten 70/20/10-Verteilung wird so real etwas wie 70/27/3, weil ein zweiter Wurf, der beim ersten Zweig durchgefallen ist, trotzdem noch eine Chance beim zweiten Zweig bekommt. Die Lösung: den Zufallswert <b>einmal</b> berechnen und in einer Spalte zwischenspeichern, dann in allen WHEN-Zweigen dieselbe Spalte abfragen — nicht mehrfach neu würfeln.`,
  task: `In der echten Welt sind Kategorien selten gleich häufig — die meisten Bestellungen werden z. B. erfolgreich verschickt, nur wenige storniert. Damit deine Testdaten diese Realität abbilden, kombinierst du CASE mit RANDOM(), um bewusst ungleiche Verteilungen zu erzeugen, statt reinen Zufall.<br><br><b>Deine Aufgabe:</b> Erzeuge 1000 <b>orders</b> (id, status) mit Status 'shipped' (70%), 'pending' (20%), 'cancelled' (10%).`,
  hints: [
    `In einem CASE WHEN wird von oben nach unten geprüft — die erste zutreffende Bedingung gewinnt, danach werden keine weiteren mehr geprüft.`,
    `Schreib <code>ABS(RANDOM() % 100)</code> nicht in jeden WHEN-Zweig einzeln — sonst würfelt jeder Zweig unabhängig neu, und die Verteilung stimmt am Ende nicht mehr. Berechne den Zufallswert stattdessen einmal als eigene Spalte in der rekursiven CTE.`,
    `So verteilst du 70/20/10 mit nur einem Wurf pro Zeile:<pre>WITH RECURSIVE seq(n, r) AS (\n  SELECT 1, ABS(RANDOM() % 100)\n  UNION ALL\n  SELECT n + 1, ABS(RANDOM() % 100) FROM seq WHERE n < 1000\n)\nSELECT n,\n  CASE\n    WHEN r < 70 THEN 'shipped'\n    WHEN r < 90 THEN 'pending'\n    ELSE 'cancelled'\n  END\nFROM seq;</pre>`,
  ] as const,
  solution: `CREATE TABLE orders (id INTEGER, status TEXT);

WITH RECURSIVE seq(n, r) AS (
  SELECT 1, ABS(RANDOM() % 100)
  UNION ALL
  SELECT n + 1, ABS(RANDOM() % 100) FROM seq WHERE n < 1000
)
INSERT INTO orders
SELECT
  n,
  CASE
    WHEN r < 70 THEN 'shipped'
    WHEN r < 90 THEN 'pending'
    ELSE 'cancelled'
  END
FROM seq;

SELECT status, COUNT(*) FROM orders GROUP BY status;`,
  syntaxExplanation: `<ul><li><code>seq(n, r)</code> — die rekursive CTE bekommt eine zweite Spalte <code>r</code>, die den Zufallswert für genau diese Zeile <i>einmal</i> festhält.</li><li><code>ABS(RANDOM() % 100)</code> steht nur noch zweimal im gesamten Statement (Anker + rekursiver Teil der CTE) — nicht mehr einmal pro WHEN-Zweig.</li><li><code>CASE WHEN r &lt; 70 ... WHEN r &lt; 90 ... ELSE ...</code> — alle drei Zweige lesen denselben, bereits gewürfelten Wert <code>r</code>, statt jeweils neu zu würfeln.</li><li><code>GROUP BY status</code> — zählt am Ende die Zeilen pro Kategorie.</li></ul>`,
  successCriteria: `Die Tabelle <b>orders</b> muss genau 1000 Zeilen enthalten, mit einer Verteilung nahe 70% 'shipped', 20% 'pending' und 10% 'cancelled' (nicht nur "shipped am häufigsten", sondern in etwa diese drei Anteile).`,
  nondeterministic: true,
  extra: {
    pg: `Gleiches Muster in Postgres, aber mit FLOOR(RANDOM()*100) statt ABS(RANDOM() % 100), da RANDOM() dort 0.0–1.0 liefert. Die "einmal würfeln, mehrfach lesen"-Regel gilt dort genauso — Postgres würfelt bei jedem RANDOM()-Aufruf ebenfalls unabhängig neu.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec("SELECT status, COUNT(*) FROM orders GROUP BY status")[0]?.values ?? [];
      const map: Record<string, number> = {};
      let total = 0;
      rows.forEach((r) => {
        const status = String(r[0]);
        const n = Number(r[1]);
        map[status] = n;
        total += n;
      });
      const shipped = map['shipped'] || 0;
      const pending = map['pending'] || 0;
      const cancelled = map['cancelled'] || 0;
      if (total !== 1000) {
        return { ok: false, message: `orders hat ${total} Zeile(n) — erwartet werden genau 1000.` };
      }
      // Generous bounds around the true 70/20/10 split — wide enough to tolerate normal
      // random variance across runs, but tight enough to catch the "independent rolls per
      // WHEN branch" bug (which skews the real distribution to roughly 70/27/3).
      const shippedPct = (shipped / total) * 100;
      const pendingPct = (pending / total) * 100;
      const cancelledPct = (cancelled / total) * 100;
      const inRange = shippedPct >= 60 && shippedPct <= 80 && pendingPct >= 12 && pendingPct <= 28 && cancelledPct >= 4 && cancelledPct <= 16;
      if (inRange) {
        return { ok: true, message: `orders hat 1000 Zeilen mit realistischer 70/20/10-Verteilung (shipped: ${shipped}, pending: ${pending}, cancelled: ${cancelled}).` };
      }
      return {
        ok: false,
        message: `Verteilung ist shipped ${shippedPct.toFixed(1)}%, pending ${pendingPct.toFixed(1)}%, cancelled ${cancelledPct.toFixed(1)}% — erwartet wird ungefähr 70/20/10. Wird pro WHEN-Zweig neu gewürfelt, statt den Zufallswert einmal wiederzuverwenden?`,
      };
    } catch (e) {
      if (!tableExists(engine, 'orders')) return { ok: false, message: 'Tabelle orders wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle orders existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
