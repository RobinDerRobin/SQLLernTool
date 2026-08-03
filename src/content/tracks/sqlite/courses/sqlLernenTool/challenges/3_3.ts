import type { SqlChallenge } from '../../../types';

export const challenge3_3: SqlChallenge = {
  num: '3.3',
  title: 'Rekursion steuern: Schrittweite und Richtung',
  tutorial: `Im rekursiven Teil einer CTE muss nicht zwingend <code>+ 1</code> stehen — jeder Rechenschritt ist erlaubt, und die Reihe darf auch abwärts laufen. Entscheidend ist nur, dass Schritt und Abbruchbedingung zusammenpassen: <pre>-- aufwaerts in Fuenferschritten\nSELECT n + 5 FROM seq WHERE n &lt; 20\n\n-- abwaerts\nSELECT n - 1 FROM seq WHERE n &gt; 1</pre>Zählt der Schritt hoch, muss die Bedingung eine Obergrenze setzen (<code>&lt;</code>); zählt er runter, eine Untergrenze (<code>&gt;</code>). Passt beides nicht zusammen, läuft die Rekursion entweder sofort ins Leere oder endlos.`,
  task: `Bevor es in Kapitel 4 an Datumsreihen geht, solltest du die Rekursion frei steuern können — dort ist der 'Schritt' schließlich ein Tag statt einer 1, und dasselbe Prinzip trägt.<br><br><b>Deine Aufgabe:</b> Erzeuge über eine rekursive CTE die Zehnerschritte <b>rückwärts</b>: 100, 90, 80, ... bis einschließlich 10 — genau 10 Zeilen, beginnend mit 100.`,
  hints: [
    `Der Anker ist bei einer Rückwärtsreihe der größte Wert: <code>SELECT 100</code>.`,
    `Der rekursive Teil rechnet <code>n - 10</code>; weil abwärts gezählt wird, lautet die Bedingung <code>WHERE n &gt; 10</code>.`,
    `So sieht die Lösung aus:<pre>WITH RECURSIVE seq(n) AS (\n  SELECT 100\n  UNION ALL\n  SELECT n - 10 FROM seq WHERE n &gt; 10\n)\nSELECT * FROM seq;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE seq(n) AS (
  SELECT 100
  UNION ALL
  SELECT n - 10 FROM seq WHERE n > 10
)
SELECT * FROM seq;`,
  syntaxExplanation: `<ul><li>Anker <code>SELECT 100</code> — Startwert ist der größte Wert, weil abwärts gezählt wird.</li><li><code>n - 10</code> — Schrittweite und Richtung stecken allein in dieser Rechnung.</li><li><code>WHERE n &gt; 10</code> — die Bedingung ist umgedreht (Untergrenze statt Obergrenze), passend zur Zählrichtung.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 10 Zeilen enthalten, die erste mit 100 und die letzte mit 10.`,
  extra: {
    pg: `In Postgres ginge das auch mit GENERATE_SERIES(100, 10, -10) — der dritte Parameter ist die Schrittweite, hier negativ.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values.map((r) => Number(r[0]));
    if (vals.length !== 10) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 10.` };
    if (vals[0] !== 100 || vals[9] !== 10) {
      return { ok: false, message: `Reihe läuft von ${vals[0]} bis ${vals[9]} — erwartet wird 100 abwärts bis 10.` };
    }
    for (let i = 1; i < vals.length; i++) {
      if ((vals[i - 1] ?? 0) - (vals[i] ?? 0) !== 10) {
        return { ok: false, message: `Schrittweite stimmt nicht: von ${vals[i - 1]} auf ${vals[i]}.` };
      }
    }
    return { ok: true, message: 'Rückwärtsreihe in Zehnerschritten korrekt erzeugt.' };
  },
};
