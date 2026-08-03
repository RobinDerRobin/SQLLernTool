import type { SqlChallenge } from '../../../types';

export const challenge3_2: SqlChallenge = {
  num: '3.2',
  title: 'Rekursive CTE mit Datum als Zustand',
  tutorial: `Die rekursive CTE aus Kapitel 3 zählte eine Zahl hoch — der Anker und der 'Zustand', der sich pro Wiederholung ändert, kann aber genauso gut ein Datum sein, kombiniert mit der date()-Funktion aus 3.1: <pre>WITH RECURSIVE tage(d) AS (\n  SELECT date('2025-06-01')\n  UNION ALL\n  SELECT date(d, '+1 day') FROM tage WHERE d < '2025-06-03'\n)\nSELECT * FROM tage;</pre>Das ergibt drei Tage: 2025-06-01, 06-02, 06-03. Struktur und Logik sind identisch zur Zahlenreihe — nur der Datentyp des Zustands ändert sich.`,
  task: `Letzter Baustein vor Kapitel 4: Dort erzeugst du eine ganze Jahres-Datumsreihe als Tabelle — hier übst du das Muster erstmal in kleinem Maßstab, nur als SELECT-Ergebnis.<br><br><b>Deine Aufgabe:</b> Erzeuge über eine rekursive CTE (ohne Tabelle) die 7 Tage von einschließlich '2025-06-01' bis '2025-06-07'.`,
  hints: [
    `Anker und rekursiver Teil funktionieren wie bei der Zahlenreihe — nur der Startwert ist hier ein Datum statt einer Zahl.`,
    `Der rekursive Teil nutzt <code>date(d, '+1 day')</code>, die Abbruchbedingung vergleicht Datumswerte: <code>WHERE d < '2025-06-07'</code>.`,
    `So sieht die komplette Lösung aus:<pre>WITH RECURSIVE days(d) AS (\n  SELECT date('2025-06-01')\n  UNION ALL\n  SELECT date(d, '+1 day') FROM days WHERE d < '2025-06-07'\n)\nSELECT * FROM days;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE days(d) AS (
  SELECT date('2025-06-01')
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2025-06-07'
)
SELECT * FROM days;`,
  syntaxExplanation: `<ul><li>Anker: <code>SELECT date('2025-06-01')</code> — der Startwert ist hier ein Datum statt einer Zahl.</li><li>Rekursiver Teil: <code>date(d, '+1 day')</code> zählt Tage hoch, <code>WHERE d &lt; '2025-06-07'</code> stoppt die Wiederholung.</li></ul>`,
  successCriteria: `Das letzte SELECT-Ergebnis muss genau die 7 Tage von 2025-06-01 bis 2025-06-07 enthalten.`,
  extra: {
    pg: `In Postgres ließe sich das direkt über GENERATE_SERIES mit Timestamps lösen, wie in Kapitel 4 beschrieben.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const values = lastResult.values.map((r) => String(r[0])).sort();
    const expected = ['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-04', '2025-06-05', '2025-06-06', '2025-06-07'];
    if (values.length !== 7) return { ok: false, message: `Es sind ${values.length} Zeile(n) — erwartet werden genau 7.` };
    const matches = expected.every((v, i) => values[i] === v);
    if (!matches) return { ok: false, message: `Werte sind ${values.join(', ')} — erwartet wird 2025-06-01 bis 2025-06-07.` };
    return { ok: true, message: 'Genau die 7 Tage vom 01.06. bis 07.06.2025 erzeugt.' };
  },
};
