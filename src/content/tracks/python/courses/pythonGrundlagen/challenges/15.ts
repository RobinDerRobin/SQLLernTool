import type { PythonChallenge } from '../../../types';

export const challenge15: PythonChallenge = {
  num: '15',
  title: 'Wenn Code zur Laufzeit scheitert: try/except',
  tutorial: `Nicht jeder Fehler zeigt sich schon beim Ausführen von Python selbst — manche Operationen scheitern erst zur <b>Laufzeit</b>, abhängig von den tatsächlichen Werten. Eine Division durch <code>0</code> ist das klassische Beispiel: <code>10 / 0</code> ist syntaktisch völlig korrekt, löst aber beim Ausführen einen <code>ZeroDivisionError</code> aus und beendet das Programm — es sei denn, du fängst den Fehler ab. Genau dafür gibt es <code>try</code>/<code>except</code>: <pre>try:
    ergebnis = zahl / nenner
except ZeroDivisionError:
    ergebnis = -1</pre>Python führt zuerst den <code>try</code>-Block aus. Löst eine Zeile darin den angegebenen Fehlertyp aus, springt die Ausführung sofort in den passenden <code>except</code>-Block, statt das Programm abstürzen zu lassen — der Rest des <code>try</code>-Blocks wird dabei übersprungen.`,
  task: `<b>Deine Aufgabe:</b> Gegeben sind <code>zahl = 10</code> und <code>nenner = 0</code>. Berechne <code>ergebnis = zahl / nenner</code> innerhalb eines <code>try</code>-Blocks. Fange einen <code>ZeroDivisionError</code> ab und setze <code>ergebnis</code> in diesem Fall auf <code>-1</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `Die Division steht im <code>try</code>-Block: <code>try: ergebnis = zahl / nenner</code>.`,
    `<code>except ZeroDivisionError:</code> fängt genau den Fehler ab, den <code>10 / 0</code> auslöst — darin setzt du <code>ergebnis = -1</code>.`,
    `So sieht die Lösung aus:<pre>zahl = 10
nenner = 0
try:
    ergebnis = zahl / nenner
except ZeroDivisionError:
    ergebnis = -1
print(ergebnis)</pre>`,
  ] as const,
  solution: `zahl = 10
nenner = 0
try:
    ergebnis = zahl / nenner
except ZeroDivisionError:
    ergebnis = -1
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>try:</code> — der riskante Code, der einen Fehler auslösen könnte.</li><li><code>except ZeroDivisionError:</code> — läuft nur, wenn genau dieser Fehlertyp auftritt.</li><li><code>zahl / nenner</code> mit <code>nenner = 0</code> löst den Fehler aus, <code>ergebnis</code> wird auf <code>-1</code> gesetzt statt das Programm abstürzen zu lassen.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss -1 sein (abgefangener ZeroDivisionError) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "ergebnis" — wurde der ZeroDivisionError abgefangen?' };
    }
    if (ergebnis !== -1) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet wird -1.` };
    }
    if (!lastResult.stdout.includes('-1')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Die Division durch 0 wurde abgefangen, ergebnis ist -1.' };
  },
  distractors: [
    {
      code: `zahl = 10
nenner = 0
ergebnis = zahl / nenner
print(ergebnis)`,
      reason: 'fängt den Fehler nicht ab — die Division durch 0 löst einen echten ZeroDivisionError aus, der das Programm beendet, bevor ergebnis überhaupt einen Wert bekommt',
    },
  ],
};
