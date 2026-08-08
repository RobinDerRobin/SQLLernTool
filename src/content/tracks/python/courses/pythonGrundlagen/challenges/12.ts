import type { PythonChallenge } from '../../../types';

export const challenge12: PythonChallenge = {
  num: '12',
  title: 'Eigene Funktionen schreiben: def und return',
  tutorial: `Bisher hast du nur fertige Funktionen benutzt (<code>print()</code>, <code>range()</code>, <code>len()</code>). Mit <code>def</code> schreibst du deine eigenen: <pre>def verdopple(zahl):
    return zahl * 2</pre><code>def name(parameter):</code> beginnt die Definition, der eingerückte Block darunter ist der Funktionskörper. <code>return</code> beendet die Funktion sofort und gibt einen Wert an die Stelle zurück, von der aus die Funktion aufgerufen wurde — anders als <code>print()</code>, das nur etwas <i>anzeigt</i>, aber der aufrufenden Stelle keinen Wert zurückgibt, mit dem man weiterrechnen könnte.`,
  task: `Fertige Funktionen wie <code>print()</code> kennst du schon — aber echte Programme bestehen zu großen Teilen aus <i>eigenen</i> Funktionen, die einmal geschrieben und beliebig oft wiederverwendet werden. <code>return</code> ist dabei der Schlüssel: Nur damit kann der Rückgabewert einer Variable zugewiesen oder weiterverarbeitet werden.<br><br><b>Deine Aufgabe:</b> Schreibe eine Funktion <code>verdopple(zahl)</code>, die das Doppelte von <code>zahl</code> zurückgibt. Rufe sie mit <code>21</code> auf, speichere das Ergebnis in <code>ergebnis</code> und gib es aus.`,
  hints: [
    `Die Funktion beginnt mit <code>def verdopple(zahl):</code>, der Rückgabewert kommt über <code>return zahl * 2</code>.`,
    `Der Funktionsaufruf sieht aus wie bei eingebauten Funktionen: <code>verdopple(21)</code> — das Ergebnis musst du selbst in einer Variable speichern.`,
    `So sieht die Lösung aus:<pre>def verdopple(zahl):
    return zahl * 2

ergebnis = verdopple(21)
print(ergebnis)</pre>`,
  ] as const,
  solution: `def verdopple(zahl):
    return zahl * 2

ergebnis = verdopple(21)
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>def verdopple(zahl):</code> — definiert eine Funktion mit einem Parameter <code>zahl</code>.</li><li><code>return zahl * 2</code> — beendet die Funktion und gibt den berechneten Wert zurück.</li><li><code>ergebnis = verdopple(21)</code> — der Rückgabewert wird in einer Variable gespeichert, genau wie bei jeder eingebauten Funktion.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss 42 sein (das Doppelte von 21) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "ergebnis" — hat verdopple() wirklich einen Wert per return zurückgegeben?' };
    }
    if (ergebnis !== 42) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet wird 42 (das Doppelte von 21).` };
    }
    if (!lastResult.stdout.includes('42')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: verdopple(21) ergibt 42.' };
  },
  distractors: [
    {
      code: `def verdopple(zahl):
    print(zahl * 2)

ergebnis = verdopple(21)
print(ergebnis)`,
      reason: 'druckt das Ergebnis innerhalb der Funktion statt es per return zurückzugeben — ergebnis wird dadurch None, nicht 42, weil die Funktion ohne return automatisch None liefert',
    },
  ],
};
