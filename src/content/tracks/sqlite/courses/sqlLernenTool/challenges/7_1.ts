import type { SqlChallenge } from '../../../types';

export const challenge7_1: SqlChallenge = {
  num: '7.1',
  title: 'Texte zusammensetzen mit ||',
  tutorial: `Der Verkettungsoperator <code>||</code> fügt mehrere Werte zu einem einzigen Text zusammen. Zahlen werden dabei automatisch in Text umgewandelt, du musst nichts umrechnen: <pre>SELECT 'Hallo' || ' ' || 'Welt' AS gruss;\n-- ergibt: Hallo Welt</pre>Beliebig viele Teile lassen sich hintereinanderhängen — feste Texte in Anführungszeichen, Zahlen und Spaltenwerte ohne.`,
  task: `Vorbereitung auf Kapitel 8, wo du aus laufenden Nummern automatisch plausible E-Mail-Adressen baust. Hier übst du die Verkettung erstmal an einem festen Beispiel, ohne CTE.<br><br><b>Deine Aufgabe:</b> Erzeuge mit einer einzigen Query den Text <b>user42@example.com</b>, zusammengesetzt aus den drei Teilen 'user', der Zahl 42 und '@example.com'.`,
  hints: [
    `Zwischen je zwei Teilen steht <code>||</code>.`,
    `Die Zahl 42 schreibst du ohne Anführungszeichen — SQL wandelt sie beim Verketten automatisch in Text um.`,
    `So sieht die Lösung aus:<pre>SELECT 'user' || 42 || '@example.com' AS email;</pre>`,
  ] as const,
  solution: `SELECT 'user' || 42 || '@example.com' AS email;`,
  syntaxExplanation: `<ul><li><code>'user' || 42 || '@example.com'</code> — drei Teile werden zu einem Text verkettet, die Zahl automatisch umgewandelt.</li><li><code>AS email</code> — benennt die Ergebnisspalte.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau eine Zeile mit dem Text <b>user42@example.com</b> enthalten.`,
  extra: {
    pg: `Identisch in Postgres — || ist der Standard-SQL-Operator für Textverkettung.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values || !lastResult.values.length) return { ok: false, message: 'Es gibt noch kein Ergebnis.' };
    const got = String(lastResult.values[0]?.[0]);
    if (got === 'user42@example.com') return { ok: true, message: 'Text korrekt zusammengesetzt.' };
    return { ok: false, message: `Ergebnis ist "${got}" — erwartet wird user42@example.com.` };
  },
};
