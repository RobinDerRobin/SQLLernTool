import type { PythonChallenge } from '../../../types';

export const challenge11_1: PythonChallenge = {
  num: '11.1',
  title: 'Zahlenfolgen erzeugen: range()',
  tutorial: `Willst du eine Schleife nicht über einen Text, sondern über eine feste Anzahl von Zahlen laufen lassen, brauchst du kein fertiges Iterable — <code>range(...)</code> erzeugt eine Zahlenfolge direkt: <code>range(n)</code> läuft von 0 bis <code>n - 1</code>, <code>range(start, stop)</code> von <code>start</code> bis <code>stop - 1</code>: <pre>for i in range(1, 5):
    print(i)
# gibt aus: 1, 2, 3, 4 — NICHT 5!</pre>Die obere Grenze ist immer <b>ausgeschlossen</b> — das ist die häufigste Stolperfalle beim Einstieg. <code>range(1, 5)</code> hat also genau <code>5 - 1 = 4</code> Werte, nicht 5.`,
  task: `range() ist die Standardmethode, um eine Schleife eine bestimmte Anzahl Mal (oder über einen bestimmten Zahlenbereich) laufen zu lassen — viel häufiger als das Iterieren über einen Text aus Challenge 11.<br><br><b>Deine Aufgabe:</b> Berechne mit einer for-Schleife über <code>range(...)</code> die Summe aller ganzen Zahlen von 1 bis einschließlich 10, gespeichert in <code>summe</code>. Gib <code>summe</code> aus.`,
  hints: [
    `Die obere Grenze von range() ist ausgeschlossen — um 10 noch mitzuzählen, muss die zweite Zahl 11 sein, nicht 10.`,
    `<code>summe</code> muss vor der Schleife bei 0 starten, dann in jedem Durchlauf mit <code>summe += i</code> erhöht werden.`,
    `So sieht die Lösung aus:<pre>summe = 0
for i in range(1, 11):
    summe += i
print(summe)</pre>`,
  ] as const,
  solution: `summe = 0
for i in range(1, 11):
    summe += i
print(summe)`,
  syntaxExplanation: `<ul><li><code>range(1, 11)</code> — erzeugt die Zahlen 1 bis 10 (11 ist ausgeschlossen).</li><li><code>summe += i</code> — addiert bei jedem Durchlauf die aktuelle Zahl zur laufenden Summe.</li><li>1 + 2 + ... + 10 ergibt am Ende 55.</li></ul>`,
  successCriteria: `Die Variable summe muss am Ende 55 sein (Summe von 1 bis 10) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { summe } = lastResult.variables;
    if (typeof summe !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "summe".' };
    }
    if (summe !== 55) {
      return { ok: false, message: `summe ist ${summe}, erwartet wird 55 (Summe von 1 bis 10).` };
    }
    if (!lastResult.stdout.includes('55')) {
      return { ok: false, message: 'summe muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Summe von 1 bis 10 ist 55.' };
  },
  distractors: [
    {
      code: `summe = 0
for i in range(1, 10):
    summe += i
print(summe)`,
      reason: 'nimmt range(1, 10) statt range(1, 11) — die obere Grenze ist ausgeschlossen, deshalb fehlt die 10 in der Summe',
    },
  ],
};
