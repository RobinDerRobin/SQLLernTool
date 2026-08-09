import type { PythonChallenge } from '../../../types';

export const challenge20_3: PythonChallenge = {
  num: '20.3',
  title: 'if/else in einer Zeile: der Ternary-Operator',
  tutorial: `Ein volles <code>if</code>/<code>else</code> braucht mehrere Zeilen, nur um einer Variable einen von zwei Werten zuzuweisen. Für genau diesen Fall gibt es eine kompakte Schreibweise, den <b>Ternary-Operator</b> (auch "bedingter Ausdruck" genannt) — <code>x if bedingung else y</code> ist ein <b>Ausdruck</b>, der direkt zu einem der beiden Werte auswertet: <pre>alter = 15
status = "volljährig" if alter >= 18 else "minderjährig"</pre>Das ist gleichwertig zu, aber kürzer als: <pre>if alter >= 18:
    status = "volljährig"
else:
    status = "minderjährig"</pre>Die Reihenfolge ist wichtig: erst der Wert für den <b>wahren</b> Fall, dann die Bedingung, dann der Wert für den <b>falschen</b> Fall.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>punkte = 45</code>. Weise <code>ergebnis</code> mit einem Ternary-Ausdruck (in einer Zeile, kein <code>if</code>/<code>else</code>-Block) den Text <code>"bestanden"</code> zu, falls <code>punkte &gt;= 50</code>, sonst <code>"durchgefallen"</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `Die Form ist <code>wert_wenn_wahr if bedingung else wert_wenn_falsch</code> — alles in einer Zeile, als Ausdruck.`,
    `Achte auf die Reihenfolge: zuerst "bestanden" (der Wert für den wahren Fall), dann die Bedingung punkte >= 50, dann "durchgefallen".`,
    `So sieht die Lösung aus:<pre>punkte = 45
ergebnis = "bestanden" if punkte >= 50 else "durchgefallen"
print(ergebnis)</pre>`,
  ] as const,
  solution: `punkte = 45
ergebnis = "bestanden" if punkte >= 50 else "durchgefallen"
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>"bestanden" if punkte >= 50 else "durchgefallen"</code> — ein einzelner Ausdruck, der zu einem der beiden Texte auswertet.</li><li>45 &gt;= 50 ist False, also wird "durchgefallen" gewählt.</li></ul>`,
  successCriteria: `ergebnis muss "durchgefallen" sein (weil 45 < 50) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "ergebnis".' };
    }
    if (ergebnis !== 'durchgefallen') {
      return { ok: false, message: `ergebnis ist "${ergebnis}", erwartet wird "durchgefallen" (45 Punkte sind unter 50).` };
    }
    if (!lastResult.stdout.includes('durchgefallen')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: der Ternary-Ausdruck wählt "durchgefallen", weil 45 < 50 ist.' };
  },
  distractors: [
    {
      code: `punkte = 45
ergebnis = "durchgefallen" if punkte >= 50 else "bestanden"
print(ergebnis)`,
      reason: 'vertauscht die beiden Werte im Ternary-Ausdruck — bei punkte=45 (Bedingung False) wird jetzt "bestanden" gewählt statt des erwarteten "durchgefallen", genau umgekehrt zur richtigen Logik',
    },
  ],
};
