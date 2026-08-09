import type { PythonChallenge } from '../../../types';

export const challenge14_1: PythonChallenge = {
  num: '14.1',
  title: 'Nur bestimmte Elemente: Comprehension mit if',
  tutorial: `Eine List Comprehension kann zusätzlich zum Ausdruck auch eine Bedingung enthalten — dann landen nur die Elemente in der neuen Liste, für die die Bedingung wahr ist: <pre>gerade_quadrate = [x ** 2 for x in zahlen if x % 2 == 0]</pre>Das <code>if x % 2 == 0</code> steht <b>hinter</b> dem <code>for</code>-Teil und filtert die Quellwerte, bevor der Ausdruck überhaupt berechnet wird — nur gerade Zahlen aus <code>zahlen</code> werden quadriert und aufgenommen, ungerade werden komplett übersprungen. Das entspricht: <pre>gerade_quadrate = []
for x in zahlen:
    if x % 2 == 0:
        gerade_quadrate.append(x ** 2)</pre>`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>zahlen = [1, 2, 3, 4, 5, 6]</code>. Erzeuge mit einer List Comprehension mit Bedingung eine neue Liste <code>gerade_quadrate</code>, die nur die Quadrate der <b>geraden</b> Zahlen enthält. Gib <code>gerade_quadrate</code> aus.`,
  hints: [
    `Die Bedingung steht nach dem <code>for</code>-Teil: <code>[AUSDRUCK for VARIABLE in ITERABLE if BEDINGUNG]</code>.`,
    `<code>x % 2 == 0</code> ist wahr für gerade Zahlen — genau wie beim normalen <code>if</code>.`,
    `So sieht die Lösung aus:<pre>zahlen = [1, 2, 3, 4, 5, 6]
gerade_quadrate = [x ** 2 for x in zahlen if x % 2 == 0]
print(gerade_quadrate)</pre>`,
  ] as const,
  solution: `zahlen = [1, 2, 3, 4, 5, 6]
gerade_quadrate = [x ** 2 for x in zahlen if x % 2 == 0]
print(gerade_quadrate)`,
  syntaxExplanation: `<ul><li><code>if x % 2 == 0</code> — filtert, welche Zahlen überhaupt in die Comprehension einfließen.</li><li>Nur 2, 4, 6 sind gerade → quadriert: <code>[4, 16, 36]</code>.</li></ul>`,
  successCriteria: `Die Variable gerade_quadrate muss die Liste [4, 16, 36] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gerade_quadrate } = lastResult.variables;
    if (!Array.isArray(gerade_quadrate)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "gerade_quadrate".' };
    }
    const expected = [4, 16, 36];
    const matches =
      gerade_quadrate.length === expected.length && expected.every((v, i) => gerade_quadrate[i] === v);
    if (!matches) {
      return {
        ok: false,
        message: `gerade_quadrate ist ${JSON.stringify(gerade_quadrate)}, erwartet wird [4, 16, 36].`,
      };
    }
    if (!lastResult.stdout.includes('36')) {
      return { ok: false, message: 'gerade_quadrate muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Nur 2, 4 und 6 sind gerade, quadriert ergibt das [4, 16, 36].' };
  },
  distractors: [
    {
      code: `zahlen = [1, 2, 3, 4, 5, 6]
gerade_quadrate = [x ** 2 for x in zahlen]
print(gerade_quadrate)`,
      reason: 'vergisst die Bedingung "if x % 2 == 0" komplett — es werden alle Zahlen quadriert statt nur die geraden, das Ergebnis hat 6 statt 3 Elemente',
    },
  ],
};
