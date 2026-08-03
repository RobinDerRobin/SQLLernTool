import type { SqlChallenge } from '../../../types';

export const challenge3_1: SqlChallenge = {
  num: '3.1',
  title: 'Mit Datum rechnen (date()-Funktion)',
  tutorial: `Die Funktion <code>date(wert, modifikator)</code> verändert ein Datum um einen Zeitraum — <code>date('2025-01-01', '+90 days')</code> ergibt z. B. '2025-04-01'. Du kannst sie auch mit einem Wert aus deiner Tabelle kombinieren, nicht nur mit einem festen Datum: <code>date(MAX(spalte), '+30 days')</code> rechnet z. B. ab dem spätesten Wert einer Spalte weiter. Mehrere Modifikatoren lassen sich sogar verketten: <code>date('2025-01-01', '+1 month', '-3 days')</code>.`,
  task: `Vorbereitung auf Kapitel 4, wo du date() innerhalb einer rekursiven CTE brauchst — hier übst du die Funktion erstmal für sich allein, mit einem echten Wert aus einer Tabelle statt einem festen Datum.<br><br><b>Deine Aufgabe:</b> Finde mit einer einzigen Query heraus, welches Datum 90 Tage nach dem <b>spätesten</b> signup_date in der Tabelle <b>users</b> liegt.`,
  prereqNums: ['01'],
  prereqNote: `Setzt voraus, dass du Challenge 1 (Tabelle users) bereits ausgeführt hast.`,
  hints: [
    `MAX(signup_date) liefert das späteste Datum aus der Tabelle — genau wie MAX() bei Zahlen funktioniert.`,
    `Kombiniere das direkt mit date(): <code>date(MAX(signup_date), '+90 days')</code>.`,
    `So sieht die Lösung aus:<pre>SELECT date(MAX(signup_date), '+90 days') AS zieldatum FROM users;</pre>`,
  ] as const,
  solution: `SELECT date(MAX(signup_date), '+90 days') AS zieldatum FROM users;`,
  syntaxExplanation: `<ul><li><code>MAX(signup_date)</code> — ermittelt das späteste Datum in der Tabelle.</li><li><code>date(..., '+90 days')</code> — addiert 90 Tage auf dieses Datum.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau eine Zeile mit dem Datum 90 Tage nach dem spätesten signup_date aus users enthalten.`,
  extra: {
    pg: `In Postgres rechnest du mit echten DATE-Werten meist über INTERVAL: signup_date + INTERVAL '90 days'.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values || !lastResult.values.length) {
      return { ok: false, message: 'Es gibt noch kein Ergebnis.' };
    }
    let expected: unknown;
    try {
      expected = engine.exec("SELECT date(MAX(signup_date), '+90 days') FROM users")[0]?.values[0]?.[0];
    } catch {
      return { ok: false, message: 'Tabelle users wird benötigt (aus Challenge 1).' };
    }
    const got = lastResult.values[0]?.[0];
    if (String(got) === String(expected)) return { ok: true, message: `Richtig berechnet: ${String(got)}.` };
    return { ok: false, message: `Dein Ergebnis ist ${String(got)}, erwartet wäre ${String(expected)}.` };
  },
};
