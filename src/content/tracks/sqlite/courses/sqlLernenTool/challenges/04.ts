import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge04: SqlChallenge = {
  num: '04',
  title: 'Datumsreihe erzeugen',
  tutorial: `Diese Challenge baut direkt auf der rekursiven CTE aus Challenge 3 auf — nur zählt der Anker hier kein <code>n</code> mehr hoch, sondern ein Datum. Die Funktion <code>date(wert, modifikator)</code> addiert (oder subtrahiert) einen Zeitraum zu einem Datum, z. B. <code>date('2025-01-01', '+1 day')</code> ergibt '2025-01-02'. Kombiniert mit dem CTE-Muster von eben entsteht so eine fortlaufende Datumsreihe: Anker ist das Startdatum, der rekursive Teil zählt in Tagesschritten hoch, die WHERE-Bedingung vergleicht Datumswerte statt Zahlen.`,
  task: `Kalendertabellen sind ein Standardwerkzeug in echten Datenbanken — z. B. um Umsätze pro Tag auszuwerten, auch für Tage ohne Bestellung (die sonst einfach fehlen würden). Hier lernst du, wie man automatisiert eine durchgehende Reihe von Datumswerten erzeugt, statt sie mühsam einzeln einzutippen.<br><br><b>Deine Aufgabe:</b> Baue eine Kalendertabelle <b>calendar</b> mit jedem Tag des Jahres 2025 (365 Zeilen).`,
  hints: [
    `<code>date(wert, '+1 day')</code> addiert einen Tag zu einem Datum. Der Anker ist hier ein Startdatum statt einer Zahl.`,
    `Die Abbruchbedingung funktioniert wie bei der Zahlenreihe, nur mit einem Datumsvergleich: <code>WHERE d < '2025-12-31'</code>.`,
    `So sieht die CTE aus:<pre>WITH RECURSIVE days(d) AS (\n  SELECT date('2025-01-01')\n  UNION ALL\n  SELECT date(d, '+1 day') FROM days WHERE d < '2025-12-31'\n)\nINSERT INTO calendar SELECT d FROM days;</pre>`,
  ] as const,
  solution: `CREATE TABLE calendar (d TEXT);

WITH RECURSIVE days(d) AS (
  SELECT date('2025-01-01')
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2025-12-31'
)
INSERT INTO calendar SELECT d FROM days;

SELECT COUNT(*) AS anzahl_tage FROM calendar;`,
  syntaxExplanation: `<ul><li><code>CREATE TABLE calendar (d TEXT);</code> — Zieltabelle für die Datumsreihe.</li><li><code>WITH RECURSIVE days(d)</code> — Anker ist der 1. Januar, rekursiver Teil zählt per <code>date(d,'+1 day')</code> hoch, bis <code>d &lt; '2025-12-31'</code> nicht mehr zutrifft.</li><li><code>INSERT INTO calendar SELECT d FROM days;</code> — überträgt alle 365 Tage in die Tabelle.</li></ul>`,
  successCriteria: `Die Tabelle <b>calendar</b> muss genau 365 Zeilen enthalten (ein Eintrag pro Tag in 2025).`,
  extra: {
    pg: `In Postgres direkt über GENERATE_SERIES mit Timestamps:\n\nINSERT INTO calendar\nSELECT GENERATE_SERIES('2025-01-01'::date, '2025-12-31'::date, '1 day');`,
  },
  validate: (engine) => {
    try {
      const r = engine.exec('SELECT COUNT(*), MIN(d), MAX(d), COUNT(DISTINCT d) FROM calendar')[0]?.values[0];
      const count = Number(r?.[0]);
      const min = String(r?.[1]);
      const max = String(r?.[2]);
      const distinct = Number(r?.[3]);
      if (count === 365 && distinct === 365 && min === '2025-01-01' && max === '2025-12-31') {
        return { ok: true, message: 'calendar enthält alle 365 Tage.' };
      }
      return {
        ok: false,
        message: `calendar hat ${count} Zeile(n), ${distinct} davon unterschiedlich, von ${min} bis ${max} — erwartet werden 365 verschiedene Tage von 2025-01-01 bis 2025-12-31.`,
      };
    } catch (e) {
      if (!tableExists(engine, 'calendar')) return { ok: false, message: 'Tabelle calendar wurde noch nicht angelegt.' };
      return { ok: false, message: `Tabelle calendar existiert, aber die Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `CREATE TABLE calendar (d TEXT);

INSERT INTO calendar VALUES ('2025-01-01'), ('2025-12-31');

WITH RECURSIVE cnt(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM cnt WHERE n < 363
)
INSERT INTO calendar SELECT '2025-06-15' FROM cnt;

SELECT COUNT(*) AS anzahl_tage FROM calendar;`,
      reason: '365 Zeilen, min/max stimmen zufällig, aber 363 davon sind Duplikate desselben Tages statt echter fortlaufender Daten',
    },
  ],
};
