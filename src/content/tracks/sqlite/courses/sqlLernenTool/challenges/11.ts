import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge11: SqlChallenge = {
  num: '11',
  title: 'Zufällige Zeitstempel in einem Zeitraum',
  tutorial: `Bisher waren Datum (Kapitel 4) und Zufall (Kapitel 5) getrennte Themen — für realistische Testdaten brauchst du beides zusammen. Der Trick: Du addierst eine zufällige Anzahl Tage auf ein Startdatum. Da der Modifikator von <code>date()</code> ein Text ist, wird er per Verkettung zusammengebaut: <pre>date('2025-01-01', '+' || ABS(RANDOM() % 365) || ' days')</pre>Von innen nach außen gelesen: Zufallszahl 0–364 erzeugen, daraus den Text '+123 days' bauen, diesen auf das Startdatum addieren. Damit liegt jedes erzeugte Datum garantiert im Jahr 2025.`,
  task: `Fast jede echte Tabelle hat ein Datumsfeld — Bestelldatum, Registrierung, letzter Login. Testdaten, in denen alle Zeilen denselben Tag tragen, taugen deshalb wenig: Zeitreihen-Auswertungen, Sortierungen und Filter lassen sich damit gar nicht prüfen. Hier lernst du, Datumswerte realistisch zu streuen.<br><br><b>Deine Aufgabe:</b> Erzeuge eine Tabelle <b>events</b> mit genau 200 Zeilen (id, event_date), wobei jedes event_date ein zufälliger Tag im Jahr 2025 ist.`,
  hints: [
    `Die 200 Zeilen entstehen wie gewohnt über eine rekursive CTE mit laufender Nummer.`,
    `Die Zufallszahl für die Tage begrenzt du wie in Kapitel 5: <code>ABS(RANDOM() % 365)</code> ergibt 0 bis 364.`,
    `Der Modifikator wird als Text zusammengesetzt:<pre>date('2025-01-01', '+' || ABS(RANDOM() % 365) || ' days')</pre>`,
  ] as const,
  solution: `CREATE TABLE events (id INTEGER, event_date TEXT);

WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 200
)
INSERT INTO events
SELECT n, date('2025-01-01', '+' || ABS(RANDOM() % 365) || ' days')
FROM seq;

SELECT * FROM events LIMIT 10;`,
  syntaxExplanation: `<ul><li><code>ABS(RANDOM() % 365)</code> — zufällige Tagesverschiebung zwischen 0 und 364.</li><li><code>'+' || ... || ' days'</code> — baut daraus den Text, den date() als Modifikator erwartet (z. B. '+123 days').</li><li><code>date('2025-01-01', ...)</code> — addiert die Verschiebung auf den Jahresanfang, sodass alle Werte in 2025 liegen.</li></ul>`,
  successCriteria: `Die Tabelle <b>events</b> muss genau 200 Zeilen enthalten, alle event_date im Jahr 2025 — und die Daten müssen sich unterscheiden (nicht überall derselbe Tag).`,
  nondeterministic: true,
  extra: {
    pg: `In Postgres rechnest du mit echten Datumstypen und INTERVAL:\n\nDATE '2025-01-01' + (FLOOR(RANDOM()*365)::int || ' days')::interval\n\noder kürzer über GENERATE_SERIES, wenn die Tage nicht zufällig, sondern lückenlos sein sollen.`,
  },
  validate: (engine) => {
    try {
      const r = engine.exec('SELECT COUNT(*), MIN(event_date), MAX(event_date), COUNT(DISTINCT event_date) FROM events')[0]?.values[0];
      const count = Number(r?.[0]);
      const min = String(r?.[1]);
      const max = String(r?.[2]);
      const distinct = Number(r?.[3]);
      if (count !== 200) return { ok: false, message: `events hat ${count} Zeile(n), erwartet 200.` };
      if (min < '2025-01-01' || max > '2025-12-31') {
        return { ok: false, message: `Daten reichen von ${min} bis ${max} — erwartet wird alles innerhalb 2025.` };
      }
      if (distinct < 50) return { ok: false, message: `Nur ${distinct} verschiedene Datumswerte — die Streuung sieht nicht zufällig aus.` };
      return { ok: true, message: `200 Events zwischen ${min} und ${max}, ${distinct} verschiedene Tage.` };
    } catch (e) {
      if (!tableExists(engine, 'events')) return { ok: false, message: 'Tabelle events wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle events existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
