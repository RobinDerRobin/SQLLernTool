import type { PythonChallenge } from '../../../types';

export const challenge11_4: PythonChallenge = {
  num: '11.4',
  title: 'Schleife in Schleife: verschachtelte Schleifen',
  tutorial: `Eine Schleife kann eine andere komplett enthalten. Bei jedem einzelnen Durchlauf der <b>äußeren</b> Schleife läuft die <b>innere</b> Schleife dann von vorne bis hinten komplett durch — nicht nur einmal insgesamt: <pre>for a in range(1, 3):
    for b in range(1, 3):
        print(a, b)
# gibt aus: 1 1 / 1 2 / 2 1 / 2 2  (4 Zeilen, nicht 2)</pre>Bei 2 äußeren und 2 inneren Werten entstehen also <code>2 * 2 = 4</code> Kombinationen — jede Zeile der äußeren Schleife trifft auf jede Zeile der inneren.`,
  task: `Verschachtelte Schleifen brauchst du überall dort, wo du jede Kombination aus zwei Wertereihen einzeln behandeln willst — zum Beispiel ein kleines Einmaleins, bei dem jede Zahl mit jeder anderen multipliziert wird.<br><br><b>Deine Aufgabe:</b> Berechne mit zwei verschachtelten for-Schleifen über <code>range(1, 4)</code> (also 1, 2, 3) die Summe <b>aller</b> Produkte <code>a * b</code> für jede Kombination von a und b. Speichere das Ergebnis in <code>gesamtsumme</code> und gib es aus.`,
  hints: [
    `Die äußere Schleife läuft über a, die komplett eingerückte innere Schleife darin über b — pro a-Wert läuft b komplett von 1 bis 3 durch.`,
    `Bei jeder Kombination addierst du <code>a * b</code> zu <code>gesamtsumme</code>, die vor beiden Schleifen bei 0 starten muss.`,
    `So sieht die Lösung aus:<pre>gesamtsumme = 0
for a in range(1, 4):
    for b in range(1, 4):
        gesamtsumme += a * b
print(gesamtsumme)</pre>`,
  ] as const,
  solution: `gesamtsumme = 0
for a in range(1, 4):
    for b in range(1, 4):
        gesamtsumme += a * b
print(gesamtsumme)`,
  syntaxExplanation: `<ul><li><code>for a in range(1, 4):</code> — die äußere Schleife, 3 Durchläufe (a = 1, 2, 3).</li><li><code>for b in range(1, 4):</code> — läuft komplett (3 Durchläufe) bei <i>jedem einzelnen</i> a-Wert erneut durch, macht insgesamt 3 * 3 = 9 Kombinationen.</li><li>Summe aller a * b für a, b in 1..3 ergibt (1+2+3) * (1+2+3) = 36.</li></ul>`,
  successCriteria: `Die Variable gesamtsumme muss am Ende 36 sein (Summe aller a*b für a und b von 1 bis 3) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gesamtsumme } = lastResult.variables;
    if (typeof gesamtsumme !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "gesamtsumme".' };
    }
    if (gesamtsumme !== 36) {
      return { ok: false, message: `gesamtsumme ist ${gesamtsumme}, erwartet wird 36.` };
    }
    if (!lastResult.stdout.includes('36')) {
      return { ok: false, message: 'gesamtsumme muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: gesamtsumme ist 36.' };
  },
  distractors: [
    {
      code: `gesamtsumme = 0
for a in range(1, 4):
    for b in range(1, 3):
        gesamtsumme += a * b
print(gesamtsumme)`,
      reason: 'nimmt für b range(1, 3) statt range(1, 4) — die innere Schleife deckt dadurch nur b = 1, 2 statt 1, 2, 3 ab, es fehlen alle Produkte mit b = 3',
    },
  ],
};
