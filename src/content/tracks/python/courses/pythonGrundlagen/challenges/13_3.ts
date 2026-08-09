import type { PythonChallenge } from '../../../types';

export const challenge13_3: PythonChallenge = {
  num: '13.3',
  title: 'Unveränderliche Wertepaare: Tupel',
  tutorial: `Ein <b>Tupel</b> sieht aus wie eine Liste, wird aber mit runden statt eckigen Klammern geschrieben — und ist, anders als eine Liste, <b>unveränderlich</b> (immutable): <pre>punkt = (4, 9)</pre>Zugriff und Iteration funktionieren wie bei Listen (<code>punkt[0]</code>, <code>len(punkt)</code>), aber es gibt keine <code>.append()</code>, <code>.remove()</code> oder Zuweisung an ein Element — jeder Versuch, ein Tupel zu verändern, löst einen <code>TypeError</code> aus. Tupel eignen sich deshalb für Werte, die als Einheit zusammengehören und sich nicht mehr ändern sollen, z. B. Koordinaten. Sie lassen sich außerdem direkt entpacken: <pre>x, y = punkt   # x wird 4, y wird 9</pre>Das ist derselbe Mechanismus wie beim Multiple Assignment.`,
  task: `<b>Deine Aufgabe:</b> Erstelle ein Tupel <code>punkt = (4, 9)</code>. Entpacke es in zwei Variablen <code>x</code> und <code>y</code>. Berechne <code>summe = x + y</code> und gib <code>summe</code> aus.`,
  hints: [
    `Ein Tupel wird mit runden Klammern geschrieben: <code>punkt = (4, 9)</code>.`,
    `Entpacken funktioniert wie beim Multiple Assignment: <code>x, y = punkt</code>.`,
    `So sieht die Lösung aus:<pre>punkt = (4, 9)
x, y = punkt
summe = x + y
print(summe)</pre>`,
  ] as const,
  solution: `punkt = (4, 9)
x, y = punkt
summe = x + y
print(summe)`,
  syntaxExplanation: `<ul><li><code>(4, 9)</code> — ein unveränderliches Tupel mit zwei Werten.</li><li><code>x, y = punkt</code> — entpackt das Tupel in zwei Variablen, x=4, y=9.</li><li><code>x + y</code> — <code>13</code>.</li></ul>`,
  successCriteria: `Die Variable summe muss 13 sein (4 + 9) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { summe } = lastResult.variables;
    if (typeof summe !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "summe".' };
    }
    if (summe !== 13) {
      return { ok: false, message: `summe ist ${summe}, erwartet wird 13 (4 + 9).` };
    }
    if (!lastResult.stdout.includes('13')) {
      return { ok: false, message: 'summe muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: (4, 9) entpackt zu x=4, y=9, Summe 13.' };
  },
  distractors: [
    {
      code: `punkt = (4, 9)
punkt[0] = 10
x, y = punkt
summe = x + y
print(summe)`,
      reason: 'versucht, ein Tupel-Element per Zuweisung zu verändern — Tupel sind unveränderlich, das löst einen TypeError ("tuple object does not support item assignment") aus, bevor überhaupt entpackt wird',
    },
  ],
};
