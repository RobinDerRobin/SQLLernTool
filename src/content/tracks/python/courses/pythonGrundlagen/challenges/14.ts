import type { PythonChallenge } from '../../../types';

export const challenge14: PythonChallenge = {
  num: '14',
  title: 'Eine Liste in einer Zeile bauen: List Comprehension',
  tutorial: `Eine neue Liste aus einer bestehenden zu bauen, indem man jedes Element irgendwie verändert, ist so häufig, dass Python dafür eine eigene Kurzschreibweise hat — die <b>List Comprehension</b>. Statt: <pre>quadrate = []
for x in zahlen:
    quadrate.append(x ** 2)</pre>schreibst du direkt: <pre>quadrate = [x ** 2 for x in zahlen]</pre>Beide Varianten machen exakt dasselbe — die Comprehension ist nur kompakter. Die Struktur ist immer <code>[AUSDRUCK for VARIABLE in ITERABLE]</code>: <code>x ** 2</code> ist der Ausdruck, der für jedes <code>x</code> berechnet und in die neue Liste aufgenommen wird.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>zahlen = [1, 2, 3, 4, 5]</code>. Erzeuge mit einer List Comprehension eine neue Liste <code>quadrate</code>, die jede Zahl quadriert enthält. Gib <code>quadrate</code> aus.`,
  hints: [
    `Die Struktur ist <code>[AUSDRUCK for VARIABLE in ITERABLE]</code> — hier <code>x ** 2</code> als Ausdruck.`,
    `<code>quadrate = [x ** 2 for x in zahlen]</code> — das ist die komplette Zeile, keine Schleife nötig.`,
    `So sieht die Lösung aus:<pre>zahlen = [1, 2, 3, 4, 5]
quadrate = [x ** 2 for x in zahlen]
print(quadrate)</pre>`,
  ] as const,
  solution: `zahlen = [1, 2, 3, 4, 5]
quadrate = [x ** 2 for x in zahlen]
print(quadrate)`,
  syntaxExplanation: `<ul><li><code>[x ** 2 for x in zahlen]</code> — für jedes <code>x</code> in <code>zahlen</code> wird <code>x ** 2</code> berechnet und in die neue Liste aufgenommen.</li><li>Ergebnis: <code>[1, 4, 9, 16, 25]</code>.</li></ul>`,
  successCriteria: `Die Variable quadrate muss die Liste [1, 4, 9, 16, 25] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { quadrate } = lastResult.variables;
    if (!Array.isArray(quadrate)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "quadrate".' };
    }
    const expected = [1, 4, 9, 16, 25];
    const matches = quadrate.length === expected.length && expected.every((v, i) => quadrate[i] === v);
    if (!matches) {
      return { ok: false, message: `quadrate ist ${JSON.stringify(quadrate)}, erwartet wird [1, 4, 9, 16, 25].` };
    }
    if (!lastResult.stdout.includes('25')) {
      return { ok: false, message: 'quadrate muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: [1, 2, 3, 4, 5] quadriert ergibt [1, 4, 9, 16, 25].' };
  },
  distractors: [
    {
      code: `zahlen = [1, 2, 3, 4, 5]
quadrate = [x * 2 for x in zahlen]
print(quadrate)`,
      reason: 'verdoppelt statt zu quadrieren (x * 2 statt x ** 2) — quadrate wird [2, 4, 6, 8, 10] statt [1, 4, 9, 16, 25]',
    },
  ],
};
