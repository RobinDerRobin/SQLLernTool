import type { PythonChallenge } from '../../../types';

export const challenge14_2: PythonChallenge = {
  num: '14.2',
  title: 'Ein Dictionary in einer Zeile bauen: Dict Comprehension',
  tutorial: `Genau wie bei Listen gibt es auch für Dictionaries eine Kurzschreibweise — die <b>Dict Comprehension</b>. Statt geschweifter Klammern mit nur einem Ausdruck (wie bei einer Set Comprehension) schreibst du hier <code>schlüssel: wert</code>: <pre>laengen = {wort: len(wort) for wort in woerter}</pre>Für jedes <code>wort</code> in <code>woerter</code> wird ein Eintrag <code>wort: len(wort)</code> ins neue Dictionary aufgenommen — das Wort selbst wird zum Schlüssel, seine Länge zum Wert. Das entspricht: <pre>laengen = {}
for wort in woerter:
    laengen[wort] = len(wort)</pre>`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>woerter = ["Apfel", "Kiwi", "Banane"]</code>. Erzeuge mit einer Dict Comprehension ein Dictionary <code>laengen</code>, das jedes Wort auf seine Länge abbildet (Wort als Schlüssel, <code>len(wort)</code> als Wert). Gib <code>laengen</code> aus.`,
  hints: [
    `Die Struktur ist <code>{SCHLÜSSEL_AUSDRUCK: WERT_AUSDRUCK for VARIABLE in ITERABLE}</code>.`,
    `Hier ist <code>wort</code> selbst der Schlüssel und <code>len(wort)</code> der Wert: <code>{wort: len(wort) for wort in woerter}</code>.`,
    `So sieht die Lösung aus:<pre>woerter = ["Apfel", "Kiwi", "Banane"]
laengen = {wort: len(wort) for wort in woerter}
print(laengen)</pre>`,
  ] as const,
  solution: `woerter = ["Apfel", "Kiwi", "Banane"]
laengen = {wort: len(wort) for wort in woerter}
print(laengen)`,
  syntaxExplanation: `<ul><li><code>{wort: len(wort) for wort in woerter}</code> — jedes Wort wird zum Schlüssel, seine Länge zum Wert.</li><li>Ergebnis: <code>{"Apfel": 5, "Kiwi": 4, "Banane": 6}</code>.</li></ul>`,
  successCriteria: `laengen muss {"Apfel": 5, "Kiwi": 4, "Banane": 6} sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { laengen } = lastResult.variables;
    if (typeof laengen !== 'object' || laengen === null || Array.isArray(laengen)) {
      return { ok: false, message: 'Es fehlt eine Dictionary-Variable "laengen".' };
    }
    const dict = laengen as Record<string, unknown>;
    const expected: Record<string, number> = { Apfel: 5, Kiwi: 4, Banane: 6 };
    const keys = Object.keys(dict);
    const matches =
      keys.length === 3 && Object.entries(expected).every(([k, v]) => dict[k] === v);
    if (!matches) {
      return {
        ok: false,
        message: `laengen ist ${JSON.stringify(laengen)}, erwartet wird {"Apfel": 5, "Kiwi": 4, "Banane": 6}.`,
      };
    }
    if (!lastResult.stdout.includes('Apfel') || !lastResult.stdout.includes('5')) {
      return { ok: false, message: 'laengen muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Jedes Wort wird auf seine Länge abgebildet.' };
  },
  distractors: [
    {
      code: `woerter = ["Apfel", "Kiwi", "Banane"]
laengen = {len(wort): wort for wort in woerter}
print(laengen)`,
      reason: 'vertauscht Schlüssel und Wert — die Längen (Zahlen) werden zu Schlüsseln und die Wörter zu Werten, also {5: "Apfel", 4: "Kiwi", 6: "Banane"} statt umgekehrt',
    },
  ],
};
