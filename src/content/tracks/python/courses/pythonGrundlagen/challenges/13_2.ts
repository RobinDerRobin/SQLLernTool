import type { PythonChallenge } from '../../../types';

export const challenge13_2: PythonChallenge = {
  num: '13.2',
  title: 'Listen verändern: append, remove, sort',
  tutorial: `Im Gegensatz zu einem String ist eine Liste <b>veränderlich</b> (mutable) — sie hat Methoden, die sie direkt verändern, statt eine neue Liste zurückzugeben: <pre>warenkorb = ["Milch", "Brot"]
warenkorb.append("Eier")     # fügt am Ende hinzu: ["Milch", "Brot", "Eier"]
warenkorb.remove("Brot")     # entfernt den ersten Treffer: ["Milch", "Eier"]
warenkorb.sort()             # sortiert an Ort und Stelle: ["Eier", "Milch"]</pre>Wichtig: Alle drei Methoden geben <code>None</code> zurück — sie verändern <code>warenkorb</code> selbst, statt eine neue Liste zu liefern. <code>zahlen.pop()</code> entfernt (und liefert) das letzte Element, falls du eines später brauchst.`,
  task: `<b>Deine Aufgabe:</b> Beginne mit <code>warenkorb = ["Milch", "Brot"]</code>. Füge <code>"Eier"</code> mit <code>.append(...)</code> hinzu, entferne <code>"Brot"</code> mit <code>.remove(...)</code>, und sortiere die Liste anschließend mit <code>.sort()</code>. Gib <code>warenkorb</code> am Ende aus.`,
  hints: [
    `<code>warenkorb.append("Eier")</code> fügt ein Element ans Ende, <code>warenkorb.remove("Brot")</code> entfernt es wieder.`,
    `Alle drei Aufrufe verändern <code>warenkorb</code> direkt (in dieser Reihenfolge) — es gibt keine neue Variable, der du das Ergebnis zuweisen musst.`,
    `So sieht die Lösung aus:<pre>warenkorb = ["Milch", "Brot"]
warenkorb.append("Eier")
warenkorb.remove("Brot")
warenkorb.sort()
print(warenkorb)</pre>`,
  ] as const,
  solution: `warenkorb = ["Milch", "Brot"]
warenkorb.append("Eier")
warenkorb.remove("Brot")
warenkorb.sort()
print(warenkorb)`,
  syntaxExplanation: `<ul><li><code>.append("Eier")</code> — fügt hinzu: <code>["Milch", "Brot", "Eier"]</code>.</li><li><code>.remove("Brot")</code> — entfernt: <code>["Milch", "Eier"]</code>.</li><li><code>.sort()</code> — sortiert alphabetisch an Ort und Stelle: <code>["Eier", "Milch"]</code>.</li></ul>`,
  successCriteria: `Die Variable warenkorb muss am Ende die Liste ["Eier", "Milch"] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { warenkorb } = lastResult.variables;
    if (!Array.isArray(warenkorb)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "warenkorb".' };
    }
    const expected = ['Eier', 'Milch'];
    const matches = warenkorb.length === expected.length && expected.every((v, i) => warenkorb[i] === v);
    if (!matches) {
      return { ok: false, message: `warenkorb ist ${JSON.stringify(warenkorb)}, erwartet wird ["Eier", "Milch"].` };
    }
    if (!lastResult.stdout.includes('Eier') || !lastResult.stdout.includes('Milch')) {
      return { ok: false, message: 'warenkorb muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Nach append/remove/sort ist warenkorb ["Eier", "Milch"].' };
  },
  distractors: [
    {
      code: `warenkorb = ["Milch", "Brot"]
warenkorb.append("Eier")
warenkorb.remove("Brot")
print(warenkorb)`,
      reason: 'vergisst .sort() — die Liste bleibt in Einfügereihenfolge ["Milch", "Eier"] statt alphabetisch sortiert ["Eier", "Milch"]',
    },
  ],
};
