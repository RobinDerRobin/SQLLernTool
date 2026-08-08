import type { PythonChallenge } from '../../../types';

export const challenge13_8: PythonChallenge = {
  num: '13.8',
  title: 'Ist etwas enthalten? Der in-Operator',
  tutorial: `Mit <code>in</code> prüfst du, ob ein Wert in einer Liste, einem String, einem Dict (dann gegen die Schlüssel) oder einem Set enthalten ist — das Ergebnis ist immer <code>True</code> oder <code>False</code>: <pre>warenkorb = ["Milch", "Eier", "Brot"]
"Milch" in warenkorb        # True
"Käse" in warenkorb         # False</pre><code>not in</code> ist das Gegenteil — <code>True</code>, wenn der Wert <b>nicht</b> enthalten ist: <pre>"Käse" not in warenkorb     # True</pre>Das ist deutlich lesbarer als der Umweg über eine Schleife mit manuellem Vergleich, und funktioniert identisch für Strings (<code>"a" in "Banane"</code>).`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>warenkorb = ["Milch", "Eier", "Brot"]</code>. Prüfe mit <code>in</code>, ob <code>"Milch"</code> enthalten ist, und speichere das Ergebnis in <code>hat_milch</code>. Prüfe mit <code>not in</code>, ob <code>"Käse"</code> <b>nicht</b> enthalten ist, und speichere das Ergebnis in <code>hat_kaese_nicht</code>. Gib beide aus.`,
  hints: [
    `<code>"Milch" in warenkorb</code> liefert <code>True</code>, weil "Milch" in der Liste steht.`,
    `<code>"Käse" not in warenkorb</code> liefert <code>True</code>, weil "Käse" <b>nicht</b> in der Liste steht.`,
    `So sieht die Lösung aus:<pre>warenkorb = ["Milch", "Eier", "Brot"]
hat_milch = "Milch" in warenkorb
hat_kaese_nicht = "Käse" not in warenkorb
print(hat_milch, hat_kaese_nicht)</pre>`,
  ] as const,
  solution: `warenkorb = ["Milch", "Eier", "Brot"]
hat_milch = "Milch" in warenkorb
hat_kaese_nicht = "Käse" not in warenkorb
print(hat_milch, hat_kaese_nicht)`,
  syntaxExplanation: `<ul><li><code>"Milch" in warenkorb</code> — True, "Milch" ist enthalten.</li><li><code>"Käse" not in warenkorb</code> — True, "Käse" ist nicht enthalten.</li></ul>`,
  successCriteria: `hat_milch muss True sein, hat_kaese_nicht muss True sein, beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { hat_milch, hat_kaese_nicht } = lastResult.variables;
    if (hat_milch !== true) {
      return { ok: false, message: `hat_milch ist ${JSON.stringify(hat_milch)}, erwartet wird True.` };
    }
    if (hat_kaese_nicht !== true) {
      return { ok: false, message: `hat_kaese_nicht ist ${JSON.stringify(hat_kaese_nicht)}, erwartet wird True.` };
    }
    if (!lastResult.stdout.includes('True')) {
      return { ok: false, message: 'hat_milch und hat_kaese_nicht müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "Milch" ist enthalten, "Käse" nicht.' };
  },
  distractors: [
    {
      code: `warenkorb = ["Milch", "Eier", "Brot"]
hat_milch = "Milch" not in warenkorb
hat_kaese_nicht = "Käse" not in warenkorb
print(hat_milch, hat_kaese_nicht)`,
      reason: 'verwechselt in mit not in bei hat_milch — "Milch" ist enthalten, also müsste "Milch" in warenkorb True liefern, aber not in liefert hier False',
    },
  ],
};
