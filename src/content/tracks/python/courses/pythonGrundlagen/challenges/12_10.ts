import type { PythonChallenge } from '../../../types';

export const challenge12_10: PythonChallenge = {
  num: '12.10',
  title: 'Nach eigenen Regeln sortieren: sorted() mit key',
  tutorial: `<code>sorted(iterable)</code> sortiert normalerweise nach der "natürlichen" Ordnung (Zahlen aufsteigend, Strings alphabetisch). Mit dem Parameter <code>key</code> kannst du stattdessen festlegen, <b>wonach</b> sortiert werden soll: <code>key</code> bekommt eine Funktion, die aus jedem Element den Wert berechnet, nach dem tatsächlich sortiert wird. <pre>woerter = ["Banane", "Kiwi", "Apfel"]
sorted(woerter)             # ["Apfel", "Banane", "Kiwi"]  — alphabetisch
sorted(woerter, key=len)    # ["Kiwi", "Apfel", "Banane"]  — nach Länge</pre><code>key=len</code> übergibt die eingebaute Funktion <code>len</code> selbst (ohne Klammern — sie wird von <code>sorted()</code> selbst aufgerufen, für jedes Element einmal). Für kompliziertere Sortierregeln steht wieder ein lambda-Ausdruck bereit: <code>key=lambda x: x[1]</code> würde z. B. nach dem zweiten Element eines Tupels sortieren.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist die Liste <code>woerter = ["Banane", "Kiwi", "Apfel"]</code>. Erzeuge mit <code>sorted()</code> und <code>key=len</code> eine neue Liste <code>sortiert</code>, in der die Wörter nach ihrer <b>Länge</b> aufsteigend sortiert sind (kürzestes zuerst). Gib <code>sortiert</code> aus.`,
  hints: [
    `<code>sorted(woerter, key=len)</code> sortiert nicht alphabetisch, sondern danach, wie lang jedes Wort ist.`,
    `Ohne <code>key=len</code> würde <code>sorted()</code> alphabetisch sortieren — das ist eine andere Reihenfolge als nach der Länge.`,
    `So sieht die Lösung aus:<pre>woerter = ["Banane", "Kiwi", "Apfel"]
sortiert = sorted(woerter, key=len)
print(sortiert)</pre>`,
  ] as const,
  solution: `woerter = ["Banane", "Kiwi", "Apfel"]
sortiert = sorted(woerter, key=len)
print(sortiert)`,
  syntaxExplanation: `<ul><li><code>sorted(woerter, key=len)</code> — sortiert nach dem Rückgabewert von <code>len(element)</code> statt nach dem Element selbst.</li><li>Wortlängen: "Kiwi" (4), "Apfel" (5), "Banane" (6) — daher <code>["Kiwi", "Apfel", "Banane"]</code>.</li><li><code>sorted()</code> verändert <code>woerter</code> nicht, sondern liefert eine neue, sortierte Liste zurück.</li></ul>`,
  successCriteria: `Die Variable sortiert muss die Liste ["Kiwi", "Apfel", "Banane"] sein (nach Länge sortiert) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { sortiert } = lastResult.variables;
    if (!Array.isArray(sortiert)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "sortiert".' };
    }
    const expected = ['Kiwi', 'Apfel', 'Banane'];
    const matches = sortiert.length === expected.length && expected.every((v, i) => sortiert[i] === v);
    if (!matches) {
      return {
        ok: false,
        message: `sortiert ist ${JSON.stringify(sortiert)}, erwartet wird ["Kiwi", "Apfel", "Banane"] (nach Länge sortiert).`,
      };
    }
    if (!lastResult.stdout.includes('Kiwi')) {
      return { ok: false, message: 'sortiert muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Nach Länge sortiert ergibt sich ["Kiwi", "Apfel", "Banane"].' };
  },
  distractors: [
    {
      code: `woerter = ["Banane", "Kiwi", "Apfel"]
sortiert = sorted(woerter)
print(sortiert)`,
      reason: 'vergisst key=len — sortiert dadurch ganz normal alphabetisch (["Apfel", "Banane", "Kiwi"]) statt nach der Wortlänge, also genau die falsche Reihenfolge',
    },
  ],
};
