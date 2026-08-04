import type { PythonChallenge } from '../../../types';

export const challenge11_3: PythonChallenge = {
  num: '11.3',
  title: 'Schleifen steuern: break und continue',
  tutorial: `Zwei Befehle greifen direkt in den Ablauf einer Schleife ein: <code>continue</code> überspringt den Rest des aktuellen Durchlaufs und macht sofort mit dem nächsten weiter. <code>break</code> verlässt die gesamte Schleife sofort, egal was danach noch gekommen wäre: <pre>for i in range(1, 6):
    if i == 2:
        continue   # überspringt nur die 2
    if i == 4:
        break      # beendet die Schleife komplett
    print(i)
# gibt aus: 1, 3</pre>Der Unterschied: <code>continue</code> springt nur zurück zum Schleifenkopf (weiter zum nächsten Wert), <code>break</code> verlässt die Schleife für immer — der Code nach der Schleife läuft danach ganz normal weiter.`,
  task: `Manchmal willst du bestimmte Werte in einer Schleife einfach ignorieren (continue), oder ganz aufhören, sobald eine Bedingung erreicht ist (break) — beides spart dir, den Rest umständlich mit zusätzlichen if-Verschachtelungen abzufangen.<br><br><b>Deine Aufgabe:</b> Gehe mit einer for-Schleife über <code>range(1, 21)</code>. Überspringe (continue) jede Zahl, die durch 3 teilbar ist. Addiere alle übrigen Zahlen zu <code>summe</code>, und beende die Schleife (break) sofort, sobald <code>summe</code> größer als 50 ist. Gib <code>summe</code> am Ende aus.`,
  hints: [
    `"Durch 3 teilbar" prüfst du mit <code>i % 3 == 0</code> — bei Treffer sofort <code>continue</code>, ohne die Zahl zu addieren.`,
    `Die break-Prüfung kommt <i>nach</i> dem Addieren, nicht davor — sonst würdest du die Zahl mitzählen, die die Grenze überschreitet, gar nicht mehr.`,
    `So sieht die Lösung aus:<pre>summe = 0
for i in range(1, 21):
    if i % 3 == 0:
        continue
    summe += i
    if summe > 50:
        break
print(summe)</pre>`,
  ] as const,
  solution: `summe = 0
for i in range(1, 21):
    if i % 3 == 0:
        continue
    summe += i
    if summe > 50:
        break
print(summe)`,
  syntaxExplanation: `<ul><li><code>if i % 3 == 0: continue</code> — Vielfache von 3 (3, 6, 9, ...) werden nie zu summe addiert.</li><li><code>summe += i</code> — läuft nur noch für die übrig gebliebenen Zahlen.</li><li><code>if summe > 50: break</code> — sobald die Summe 50 überschreitet, wird die Schleife sofort verlassen, unabhängig davon, wie viele Zahlen aus range(1, 21) noch übrig gewesen wären.</li></ul>`,
  successCriteria: `Die Variable summe muss am Ende 61 sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { summe } = lastResult.variables;
    if (typeof summe !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "summe".' };
    }
    if (summe !== 61) {
      return { ok: false, message: `summe ist ${summe}, erwartet wird 61.` };
    }
    if (!lastResult.stdout.includes('61')) {
      return { ok: false, message: 'summe muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: summe endet bei 61.' };
  },
  distractors: [
    {
      code: `summe = 0
for i in range(1, 21):
    summe += i
    if summe > 50:
        break
print(summe)`,
      reason: 'vergisst das continue für Vielfache von 3 — zählt dadurch auch 3, 6, 9, ... mit und erreicht die 50er-Grenze bei einer ganz anderen Summe',
    },
  ],
};
