import type { PythonChallenge } from '../../../types';

export const challenge12_5: PythonChallenge = {
  num: '12.5',
  title: 'Eine Funktion, die sich selbst aufruft: Rekursion',
  tutorial: `Eine Funktion darf sich innerhalb ihres eigenen Körpers selbst aufrufen — das nennt man <b>Rekursion</b>. Damit das nicht endlos weiterläuft, braucht jede rekursive Funktion einen <b>Basisfall</b>, der ohne weiteren Selbstaufruf direkt einen Wert zurückgibt: <pre>def fakultaet(n):
    if n <= 1:
        return 1          # Basisfall: stoppt die Rekursion
    return n * fakultaet(n - 1)   # Rekursionsfall: ruft sich selbst auf</pre><code>fakultaet(5)</code> ruft <code>fakultaet(4)</code> auf, das <code>fakultaet(3)</code>, und so weiter bis <code>fakultaet(1)</code> den Basisfall erreicht und mit <code>1</code> antwortet — danach werden die Ergebnisse auf dem Rückweg wieder zusammenmultipliziert. Fehlt der Basisfall, ruft sich die Funktion unendlich oft auf, bis Python mit einem <code>RecursionError</code> abbricht.`,
  task: `Manche Probleme lassen sich besonders natürlich beschreiben, indem man sie auf eine kleinere Version von sich selbst zurückführt — die Fakultät 5! ist genau 5 mal die Fakultät von 4!. Rekursion drückt das direkt im Code aus, ohne eine Schleife zu brauchen.<br><br><b>Deine Aufgabe:</b> Schreibe eine rekursive Funktion <code>fakultaet(n)</code>, die <code>n!</code> (n Fakultät) berechnet. Rufe sie mit <code>5</code> auf, speichere das Ergebnis in <code>ergebnis</code> und gib es aus.`,
  hints: [
    `Der Basisfall ist <code>n <= 1</code> — dort direkt <code>return 1</code>, ohne die Funktion nochmal aufzurufen.`,
    `Der Rekursionsfall multipliziert n mit dem Ergebnis des Selbstaufrufs für n-1: <code>return n * fakultaet(n - 1)</code>.`,
    `So sieht die Lösung aus:<pre>def fakultaet(n):
    if n <= 1:
        return 1
    return n * fakultaet(n - 1)

ergebnis = fakultaet(5)
print(ergebnis)</pre>`,
  ] as const,
  solution: `def fakultaet(n):
    if n <= 1:
        return 1
    return n * fakultaet(n - 1)

ergebnis = fakultaet(5)
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>if n <= 1: return 1</code> — der Basisfall, stoppt die Rekursion garantiert irgendwann.</li><li><code>n * fakultaet(n - 1)</code> — der Selbstaufruf mit einem kleineren Wert, bis der Basisfall erreicht wird.</li><li>5 * 4 * 3 * 2 * 1 = 120.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss 120 sein (5 Fakultät) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "ergebnis".' };
    }
    if (ergebnis !== 120) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet wird 120 (5!).` };
    }
    if (!lastResult.stdout.includes('120')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 5! ist 120.' };
  },
  distractors: [
    {
      code: `def fakultaet(n):
    return n * fakultaet(n - 1)

ergebnis = fakultaet(5)
print(ergebnis)`,
      reason: 'vergisst den Basisfall komplett — die Funktion ruft sich unendlich oft auf und bricht mit einem RecursionError ab, statt jemals ein Ergebnis zurückzugeben',
    },
  ],
};
