import type { PythonChallenge } from '../../../types';

export const challenge13_5: PythonChallenge = {
  num: '13.5',
  title: 'Sicher auf Dictionaries zugreifen: .get()',
  tutorial: `Ein direkter Zugriff <code>preise["Mango"]</code> auf einen Schlüssel, der nicht existiert, löst einen <code>KeyError</code> aus und stoppt das Programm. <code>.get(schlüssel, standardwert)</code> ist der sichere Weg: existiert der Schlüssel, liefert er den Wert; existiert er nicht, liefert er den <code>standardwert</code> statt eines Fehlers: <pre>preise = {"Apfel": 2, "Birne": 3}
preise.get("Apfel", 0)   # 2 — existiert
preise.get("Mango", 0)   # 0 — existiert nicht, kein Fehler</pre>Weitere nützliche Dict-Methoden: <code>.keys()</code> (alle Schlüssel), <code>.values()</code> (alle Werte), <code>.items()</code> (Schlüssel-Wert-Paare, ideal zum Durchlaufen mit einer Schleife): <pre>for schluessel, wert in preise.items():
    print(schluessel, wert)</pre>`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>preise = {"Apfel": 2, "Birne": 3, "Kiwi": 4}</code>. Berechne <code>gesamt</code>, indem du mit einer <code>for</code>-Schleife über <code>preise.items()</code> gehst und alle Werte aufsummierst. Frage außerdem mit <code>.get("Mango", 0)</code> nach einem Schlüssel, der nicht existiert, und speichere das Ergebnis in <code>bonus</code>. Gib beide aus.`,
  hints: [
    `<code>for schluessel, wert in preise.items():</code> gibt dir in jedem Durchlauf ein Schlüssel-Wert-Paar — addiere <code>wert</code> in einer Summenvariable.`,
    `<code>preise.get("Mango", 0)</code> liefert <code>0</code>, weil "Mango" kein Schlüssel in <code>preise</code> ist — ganz ohne <code>KeyError</code>.`,
    `So sieht die Lösung aus:<pre>preise = {"Apfel": 2, "Birne": 3, "Kiwi": 4}
gesamt = 0
for schluessel, wert in preise.items():
    gesamt = gesamt + wert
bonus = preise.get("Mango", 0)
print(gesamt, bonus)</pre>`,
  ] as const,
  solution: `preise = {"Apfel": 2, "Birne": 3, "Kiwi": 4}
gesamt = 0
for schluessel, wert in preise.items():
    gesamt = gesamt + wert
bonus = preise.get("Mango", 0)
print(gesamt, bonus)`,
  syntaxExplanation: `<ul><li><code>preise.items()</code> — liefert Schlüssel-Wert-Paare zum Durchlaufen.</li><li><code>gesamt = gesamt + wert</code> — Summe über alle drei Werte (2+3+4=9).</li><li><code>preise.get("Mango", 0)</code> — sicherer Zugriff, liefert 0 statt eines Fehlers.</li></ul>`,
  successCriteria: `gesamt muss 9 sein (2+3+4), bonus muss 0 sein, beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gesamt, bonus } = lastResult.variables;
    if (gesamt !== 9) {
      return { ok: false, message: `gesamt ist ${JSON.stringify(gesamt)}, erwartet werden 9 (2+3+4).` };
    }
    if (bonus !== 0) {
      return { ok: false, message: `bonus ist ${JSON.stringify(bonus)}, erwartet wird 0 (Standardwert von .get()).` };
    }
    if (!lastResult.stdout.includes('9') || !lastResult.stdout.includes('0')) {
      return { ok: false, message: 'gesamt und bonus müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Summe der Preise ist 9, .get() liefert 0 für den fehlenden Schlüssel.' };
  },
  distractors: [
    {
      code: `preise = {"Apfel": 2, "Birne": 3, "Kiwi": 4}
gesamt = 0
for schluessel, wert in preise.items():
    gesamt = gesamt + wert
bonus = preise["Mango"]
print(gesamt, bonus)`,
      reason: 'greift mit preise["Mango"] statt .get("Mango", 0) direkt auf einen nicht existierenden Schlüssel zu — das löst einen echten KeyError aus, bevor überhaupt etwas ausgegeben wird',
    },
  ],
};
