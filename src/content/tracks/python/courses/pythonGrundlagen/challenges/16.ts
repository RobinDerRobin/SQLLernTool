import type { PythonChallenge } from '../../../types';

export const challenge16: PythonChallenge = {
  num: '16',
  title: 'Fertigen Code nutzen: import',
  tutorial: `Python bringt eine große Sammlung fertiger <b>Module</b> mit — Sammlungen von Funktionen und Werten, die du nicht selbst schreiben musst. Mit <code>import</code> machst du ein Modul in deinem Skript verfügbar: <pre>import math

math.sqrt(16)   # 4.0</pre>Nach <code>import math</code> steht dir alles aus dem <code>math</code>-Modul über den Namen <code>math.</code> zur Verfügung — <code>math.sqrt(...)</code> für die Quadratwurzel, <code>math.pi</code> für die Kreiszahl π, und vieles mehr. Ohne den <code>import</code> kennt Python den Namen <code>math</code> überhaupt nicht.`,
  task: `<b>Deine Aufgabe:</b> Importiere das <code>math</code>-Modul. Berechne mit <code>math.sqrt(...)</code> die Quadratwurzel von <code>16</code> und speichere sie in <code>wurzel</code>. Gib <code>wurzel</code> aus.`,
  hints: [
    `<code>import math</code> steht als erste Zeile, bevor du irgendetwas aus dem Modul benutzt.`,
    `<code>math.sqrt(16)</code> liefert die Quadratwurzel von 16, also <code>4.0</code>.`,
    `So sieht die Lösung aus:<pre>import math

wurzel = math.sqrt(16)
print(wurzel)</pre>`,
  ] as const,
  solution: `import math

wurzel = math.sqrt(16)
print(wurzel)`,
  syntaxExplanation: `<ul><li><code>import math</code> — macht das math-Modul unter dem Namen "math" verfügbar.</li><li><code>math.sqrt(16)</code> — ruft die Funktion sqrt aus diesem Modul auf, liefert <code>4.0</code>.</li></ul>`,
  successCriteria: `Die Variable wurzel muss 4.0 sein (Quadratwurzel von 16) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { wurzel } = lastResult.variables;
    if (typeof wurzel !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "wurzel" — wurde math importiert?' };
    }
    if (wurzel !== 4) {
      return { ok: false, message: `wurzel ist ${wurzel}, erwartet wird 4.0 (Quadratwurzel von 16).` };
    }
    if (!lastResult.stdout.includes('4')) {
      return { ok: false, message: 'wurzel muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Die Quadratwurzel von 16 ist 4.0.' };
  },
  distractors: [
    {
      code: `wurzel = math.sqrt(16)
print(wurzel)`,
      reason: 'vergisst "import math" komplett — math ist Python ohne den Import völlig unbekannt, das löst einen echten NameError aus',
    },
  ],
};
