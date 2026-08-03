import type { PythonChallenge } from '../../../types';

export const challenge10: PythonChallenge = {
  num: '10',
  title: 'Mehrere Werte auf einmal zuweisen',
  tutorial: `Python erlaubt es, mehrere Variablen in einer einzigen Zeile zuzuweisen: <code>a, b = 1, 2</code> setzt <code>a</code> auf 1 und <code>b</code> auf 2 — beide Zuweisungen passieren gleichzeitig. Das eröffnet einen eleganten Trick: zwei Variablen tauschen, <b>ohne</b> eine dritte Hilfsvariable zu brauchen:<pre>a = 1
b = 2
a, b = b, a
print(a, b)  # 2 1</pre>Die rechte Seite (<code>b, a</code>) wird komplett ausgewertet, <i>bevor</i> irgendetwas zugewiesen wird — deshalb überschreibt die neue Zuweisung nicht schon den Wert, den die andere Seite noch braucht.`,
  task: `Mehrfachzuweisung und das Vertauschen von Werten begegnen dir später ständig wieder — z. B. beim Sortieren, wo zwei Werte an vertauschten Stellen landen müssen. Hier lernst du den Kern-Trick dahinter, ganz ohne Schleifen oder Listen.<br><br><b>Deine Aufgabe:</b> Setze <code>a = 5</code> und <code>b = 10</code> in einer einzigen Zeile (Mehrfachzuweisung). Tausche danach ihre Werte in einer einzigen Zeile, sodass <code>a</code> 10 und <code>b</code> 5 ist. Gib beide aus.`,
  hints: [
    `Mehrfachzuweisung sieht so aus: <code>a, b = 5, 10</code> — beide Werte in einer Zeile, durch Komma getrennt.`,
    `Zum Tauschen brauchst du keine dritte Variable: <code>a, b = b, a</code> vertauscht beide Werte in einem Schritt.`,
    `So sieht die Lösung aus:<pre>a, b = 5, 10
a, b = b, a
print(a, b)</pre>`,
  ] as const,
  solution: `a, b = 5, 10
a, b = b, a
print(a, b)`,
  syntaxExplanation: `<ul><li><code>a, b = 5, 10</code> — weist beiden Variablen in einer Zeile ihren Startwert zu.</li><li><code>a, b = b, a</code> — vertauscht die Werte, ohne eine Hilfsvariable zu brauchen.</li><li>Nach dem Tausch ist a = 10 und b = 5 — genau umgekehrt zum Start.</li></ul>`,
  successCriteria: `Nach der Zuweisung und dem Tausch muss a den Wert 10 und b den Wert 5 haben, beide ausgegeben.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { a, b } = lastResult.variables;
    if (typeof a !== 'number' || typeof b !== 'number') {
      return { ok: false, message: 'Es fehlen die Zahl-Variablen "a" und/oder "b".' };
    }
    if (a !== 10 || b !== 5) {
      return { ok: false, message: `a=${a}, b=${b} — erwartet wird a=10, b=5 nach dem Tausch.` };
    }
    if (!lastResult.stdout.includes('10') || !lastResult.stdout.includes('5')) {
      return { ok: false, message: 'Beide Werte müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Vertauschen korrekt: a=10, b=5.' };
  },
};
