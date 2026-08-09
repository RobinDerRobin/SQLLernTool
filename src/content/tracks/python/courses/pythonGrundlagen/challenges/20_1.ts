import type { PythonChallenge } from '../../../types';

export const challenge20_1: PythonChallenge = {
  num: '20.1',
  title: 'Wahr oder falsch? bool() und Falsy-Werte',
  tutorial: `<code>bool(x)</code> wandelt jeden Wert in <code>True</code> oder <code>False</code> um — nicht nur echte Wahrheitswerte. Python behandelt bestimmte Werte automatisch als "leer" bzw. <b>falsy</b>: die Zahl <code>0</code>, der leere Text <code>""</code>, die leere Liste <code>[]</code> und <code>None</code> werden alle zu <code>False</code>. Fast alles andere — auch scheinbar "kleine" Werte wie <code>1</code> oder ein Text mit nur einem Leerzeichen <code>" "</code> — ist <b>truthy</b>, also <code>True</code>: <pre>bool(0)      # False
bool(5)      # True
bool("")     # False (leerer Text)
bool("hi")   # True (Text mit Inhalt)
bool([])     # False (leere Liste)</pre>Wichtig: Es geht dabei nicht um den <b>Typ</b> des Werts (jede Liste, jeder Text ist "ein Wert"), sondern ob er <b>leer</b> ist.`,
  task: `<b>Deine Aufgabe:</b> Berechne mit <code>bool(...)</code> die Wahrheitswerte der folgenden sechs Ausdrücke und speichere sie in <code>a</code> bis <code>f</code>: <code>a = bool(0)</code>, <code>b = bool(5)</code>, <code>c = bool("")</code>, <code>d = bool("hallo")</code>, <code>e = bool([])</code>, <code>f = bool([1, 2])</code>. Gib alle sechs Werte aus.`,
  hints: [
    `0, "" (leerer Text) und [] (leere Liste) sind alle falsy — bool(...) liefert für sie False.`,
    `Ein Wert ist nicht deshalb truthy, weil er "ein Text" oder "eine Liste" ist — sondern nur, wenn er nicht leer ist. "hallo" und [1, 2] sind beide truthy.`,
    `So sieht die Lösung aus:<pre>a = bool(0)
b = bool(5)
c = bool("")
d = bool("hallo")
e = bool([])
f = bool([1, 2])
print(a, b, c, d, e, f)</pre>`,
  ] as const,
  solution: `a = bool(0)
b = bool(5)
c = bool("")
d = bool("hallo")
e = bool([])
f = bool([1, 2])
print(a, b, c, d, e, f)`,
  syntaxExplanation: `<ul><li><code>bool(0)</code> — die Zahl 0 ist falsy.</li><li><code>bool("")</code> — der leere Text ist falsy, ein Text mit Inhalt ist truthy.</li><li><code>bool([])</code> — die leere Liste ist falsy, eine Liste mit Elementen ist truthy.</li></ul>`,
  successCriteria: `a=False, b=True, c=False, d=True, e=False, f=True — alle sechs müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { a, b, c, d, e, f } = lastResult.variables;
    const vals = { a, b, c, d, e, f };
    const missing = Object.entries(vals).filter(([, v]) => typeof v !== 'boolean');
    if (missing.length > 0) {
      return { ok: false, message: `Es fehlen Bool-Variablen: ${missing.map(([k]) => k).join(', ')}.` };
    }
    const expected = { a: false, b: true, c: false, d: true, e: false, f: true };
    const wrong = (Object.keys(expected) as (keyof typeof expected)[]).filter((k) => vals[k] !== expected[k]);
    if (wrong.length > 0) {
      return {
        ok: false,
        message: `Falsche Werte bei: ${wrong.join(', ')}. Erwartet wird a=False, b=True, c=False, d=True, e=False, f=True.`,
      };
    }
    return { ok: true, message: 'Korrekt: 0, "" und [] sind falsy, alles andere hier ist truthy.' };
  },
  distractors: [
    {
      code: `a = bool(0)
b = bool(5)
c = True
d = bool("hallo")
e = True
f = bool([1, 2])
print(a, b, c, d, e, f)`,
      reason: 'geht davon aus, dass "" und [] trotzdem truthy sind, weil sie "ein Text" bzw. "eine Liste" sind — genau die Verwechslung, die dieses Konzept klärt: c und e sind fälschlich True statt False',
    },
  ],
};
