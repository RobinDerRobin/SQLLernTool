import type { PythonChallenge } from '../../../types';

export const challenge12_7: PythonChallenge = {
  num: '12.7',
  title: 'Funktionen ohne Namen: lambda',
  tutorial: `Für kurze, einfache Funktionen gibt es eine Kurzschreibweise ohne <code>def</code> und ohne Namen: den <b>lambda-Ausdruck</b>. <pre>quadrat = lambda x: x ** 2
quadrat(6)   # -&gt; 36</pre>ist gleichbedeutend mit: <pre>def quadrat(x):
    return x ** 2</pre><code>lambda</code> nimmt beliebige Parameter vor dem Doppelpunkt und genau <b>einen Ausdruck</b> danach — dessen Ergebnis wird automatisch zurückgegeben, ein explizites <code>return</code> gibt es nicht. Ein lambda ist wie jede andere Funktion ein Wert: Man kann es in einer Variable speichern (wie oben) oder direkt als Argument an eine andere Funktion übergeben, ohne ihm überhaupt einen Namen zu geben. Wichtig: <code>quadrat</code> allein ist nur die Funktion selbst — erst <code>quadrat(6)</code> mit Klammern ruft sie auf und liefert einen Wert.`,
  task: `<b>Deine Aufgabe:</b> Erzeuge mit einem lambda-Ausdruck eine Funktion <code>quadrat</code>, die eine Zahl quadriert (<code>x ** 2</code>). Rufe sie mit <code>6</code> auf, speichere das Ergebnis in <code>ergebnis</code> und gib es aus.`,
  hints: [
    `Die Syntax ist <code>lambda &lt;parameter&gt;: &lt;ausdruck&gt;</code>, ohne <code>def</code> und ohne <code>return</code>.`,
    `Wie jede Funktion muss <code>quadrat</code> mit Klammern <b>aufgerufen</b> werden, um einen Wert zu liefern: <code>quadrat(6)</code>, nicht nur <code>quadrat</code>.`,
    `So sieht die Lösung aus:<pre>quadrat = lambda x: x ** 2
ergebnis = quadrat(6)
print(ergebnis)</pre>`,
  ] as const,
  solution: `quadrat = lambda x: x ** 2
ergebnis = quadrat(6)
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>lambda x: x ** 2</code> — eine anonyme Funktion mit Parameter <code>x</code>, deren Ergebnis der Ausdruck <code>x ** 2</code> ist.</li><li><code>quadrat = ...</code> — das lambda wird trotzdem wie jeder andere Wert in einer Variable gespeichert und darüber aufrufbar.</li><li><code>quadrat(6)</code> — der eigentliche Aufruf, liefert <code>36</code>.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss 36 sein (6 zum Quadrat) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "ergebnis" — wurde quadrat(6) tatsächlich aufgerufen?' };
    }
    if (ergebnis !== 36) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet wird 36 (6 zum Quadrat).` };
    }
    if (!lastResult.stdout.includes('36')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 6 zum Quadrat ist 36.' };
  },
  distractors: [
    {
      code: `quadrat = lambda x: x ** 2
ergebnis = quadrat
print(ergebnis)`,
      reason: 'ruft das lambda nie tatsächlich auf (keine Klammern nach quadrat) — ergebnis enthält nur die Funktion selbst statt einer Zahl, es gibt also keine gültige Zahl-Variable "ergebnis"',
    },
  ],
};
