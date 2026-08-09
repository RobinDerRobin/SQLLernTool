import type { PythonChallenge } from '../../../types';

export const challenge14_3: PythonChallenge = {
  num: '14.3',
  title: 'Eindeutige Werte in einer Zeile: Set Comprehension',
  tutorial: `Auch für Sets gibt es eine Comprehension — sie sieht aus wie eine List Comprehension, aber mit geschweiften statt eckigen Klammern und ohne Schlüssel-Wert-Paar: <pre>laengen_set = {len(wort) for wort in woerter}</pre>Wie bei jedem Set werden doppelte Ergebniswerte automatisch zu einem einzigen zusammengefasst — wenn zwei Wörter zufällig dieselbe Länge haben, taucht diese Länge im Ergebnis trotzdem nur einmal auf. Das ist der entscheidende Unterschied zu einer List Comprehension mit denselben Zutaten, die jeden Wert einzeln behält, auch mehrfach.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>woerter = ["Apfel", "Kiwi", "Banane", "Birne"]</code> (Längen: 5, 4, 6, 5 — "Apfel" und "Birne" sind gleich lang). Erzeuge mit einer Set Comprehension ein Set <code>laengen_set</code> mit den <b>eindeutigen</b> Wortlängen. Speichere in <code>anzahl</code>, wie viele eindeutige Längen es sind, und gib <code>anzahl</code> aus.`,
  hints: [
    `<code>{len(wort) for wort in woerter}</code> — geschweifte Klammern, ein einzelner Ausdruck (kein Doppelpunkt wie beim Dict).`,
    `Die Längen sind 5, 4, 6, 5 — als Set bleiben nur die eindeutigen Werte 4, 5, 6 übrig, also 3 Stück.`,
    `So sieht die Lösung aus:<pre>woerter = ["Apfel", "Kiwi", "Banane", "Birne"]
laengen_set = {len(wort) for wort in woerter}
anzahl = len(laengen_set)
print(anzahl)</pre>`,
  ] as const,
  solution: `woerter = ["Apfel", "Kiwi", "Banane", "Birne"]
laengen_set = {len(wort) for wort in woerter}
anzahl = len(laengen_set)
print(anzahl)`,
  syntaxExplanation: `<ul><li><code>{len(wort) for wort in woerter}</code> — berechnet die Länge jedes Worts, Duplikate werden automatisch entfernt.</li><li>Längen 5, 4, 6, 5 → eindeutig nur 4, 5, 6 → <code>len(laengen_set)</code> ist <code>3</code>.</li></ul>`,
  successCriteria: `Die Variable anzahl muss 3 sein (die drei eindeutigen Wortlängen 4, 5 und 6) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { anzahl } = lastResult.variables;
    if (typeof anzahl !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "anzahl".' };
    }
    if (anzahl !== 3) {
      return { ok: false, message: `anzahl ist ${anzahl}, erwartet werden 3 eindeutige Längen (4, 5, 6).` };
    }
    if (!lastResult.stdout.includes('3')) {
      return { ok: false, message: 'anzahl muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "Apfel" und "Birne" haben beide Länge 5, macht 3 eindeutige Längen.' };
  },
  distractors: [
    {
      code: `woerter = ["Apfel", "Kiwi", "Banane", "Birne"]
laengen_liste = [len(wort) for wort in woerter]
anzahl = len(laengen_liste)
print(anzahl)`,
      reason: 'verwendet eine List Comprehension (eckige Klammern) statt einer Set Comprehension — Duplikate bleiben erhalten, anzahl wird 4 statt 3',
    },
  ],
};
