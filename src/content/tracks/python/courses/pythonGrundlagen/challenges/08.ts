import type { PythonChallenge } from '../../../types';

export const challenge08: PythonChallenge = {
  num: '08',
  title: 'Kurzschreibweise: += und Co.',
  tutorial: `Eine Variable anhand ihres eigenen Werts zu verändern — <code>punkte = punkte + 5</code> — ist so häufig, dass Python eine Kurzschreibweise dafür hat: <code>punkte += 5</code> bedeutet genau dasselbe. Das funktioniert für alle Rechenoperatoren: <code>-=</code>, <code>*=</code>, <code>/=</code> und mehr. Mehrere solche Anweisungen hintereinander verändern die Variable Schritt für Schritt:<pre>punkte = 10
punkte += 5   # punkte ist jetzt 15
punkte *= 2   # punkte ist jetzt 30</pre>Wichtig: Diese Kurzschreibweise verändert die Variable, sie erzeugt keine neue.`,
  task: `Werte schrittweise zu verändern — einen Zähler hochzählen, einen Kontostand anpassen, eine Punktzahl erhöhen — ist eines der häufigsten Muster in echtem Code. Die Kurzschreibweise dafür begegnet dir ständig, sobald du anderen Code liest.<br><br><b>Deine Aufgabe:</b> Speichere <code>punkte = 10</code>. Erhöhe es mit <code>+=</code> um 5, verdopple es danach mit <code>*=</code>. Gib das Endergebnis aus.`,
  hints: [
    `<code>punkte += 5</code> ist die Kurzform für <code>punkte = punkte + 5</code>.`,
    `Die Reihenfolge zählt: erst <code>+=</code>, danach erst <code>*=</code> auf das schon erhöhte Ergebnis anwenden.`,
    `So sieht die Lösung aus:<pre>punkte = 10
punkte += 5
punkte *= 2
print(punkte)</pre>`,
  ] as const,
  solution: `punkte = 10
punkte += 5
punkte *= 2
print(punkte)`,
  syntaxExplanation: `<ul><li><code>punkte += 5</code> — addiert 5 zum aktuellen Wert von punkte und speichert das Ergebnis zurück in punkte.</li><li><code>punkte *= 2</code> — verdoppelt den (bereits erhöhten) Wert.</li><li>Am Ende steht (10 + 5) * 2 = 30 in punkte.</li></ul>`,
  successCriteria: `Die Variable punkte muss am Ende den Wert 30 haben (10, dann +5, dann verdoppelt) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { punkte } = lastResult.variables;
    if (typeof punkte !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "punkte".' };
    }
    if (punkte !== 30) {
      return { ok: false, message: `punkte ist ${punkte}, erwartet wird 30 ((10 + 5) * 2).` };
    }
    if (!lastResult.stdout.includes('30')) {
      return { ok: false, message: 'punkte muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'punkte korrekt berechnet: 30.' };
  },
};
