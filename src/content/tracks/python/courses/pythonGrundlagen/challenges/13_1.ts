import type { PythonChallenge } from '../../../types';

export const challenge13_1: PythonChallenge = {
  num: '13.1',
  title: 'Einen Ausschnitt einer Liste holen: Slicing',
  tutorial: `Mit <code>liste[start:stop]</code> holst du dir nicht nur ein einzelnes Element, sondern einen ganzen <b>Ausschnitt</b> (Slice) der Liste — eine neue Liste mit den Elementen von Index <code>start</code> bis <b>vor</b> Index <code>stop</code> (das Element bei <code>stop</code> ist nicht mehr dabei): <pre>zahlen = [10, 20, 30, 40, 50]
zahlen[1:4]    # [20, 30, 40]  — Index 1, 2, 3 (nicht 4!)
zahlen[:2]     # [10, 20]      — start weggelassen = ab Anfang
zahlen[3:]     # [40, 50]      — stop weggelassen = bis Ende</pre>Die "stop nicht inklusive"-Regel wirkt am Anfang gewöhnungsbedürftig, hat aber einen praktischen Vorteil: <code>stop - start</code> ergibt direkt die Länge des Ausschnitts (<code>4 - 1 = 3</code> Elemente oben).`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist die Liste <code>zahlen = [10, 20, 30, 40, 50]</code>. Erzeuge mit Slicing eine neue Liste <code>ausschnitt</code>, die genau die Elemente an Index 1 bis 3 enthält (also <code>[20, 30, 40]</code>, ohne das erste und letzte Element). Gib <code>ausschnitt</code> aus.`,
  hints: [
    `<code>liste[start:stop]</code> liefert die Elemente ab Index <code>start</code> bis <b>vor</b> Index <code>stop</code>.`,
    `Um Index 1 bis 3 (also 3 Elemente) zu bekommen, muss <code>stop</code> 4 sein, nicht 3 — <code>zahlen[1:4]</code>.`,
    `So sieht die Lösung aus:<pre>zahlen = [10, 20, 30, 40, 50]
ausschnitt = zahlen[1:4]
print(ausschnitt)</pre>`,
  ] as const,
  solution: `zahlen = [10, 20, 30, 40, 50]
ausschnitt = zahlen[1:4]
print(ausschnitt)`,
  syntaxExplanation: `<ul><li><code>zahlen[1:4]</code> — Slice von Index 1 bis vor Index 4, also Index 1, 2, 3.</li><li>Ergebnis: <code>[20, 30, 40]</code> — das erste (Index 0) und letzte (Index 4) Element bleiben außen vor.</li></ul>`,
  successCriteria: `Die Variable ausschnitt muss die Liste [20, 30, 40] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ausschnitt } = lastResult.variables;
    if (!Array.isArray(ausschnitt)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "ausschnitt".' };
    }
    const expected = [20, 30, 40];
    const matches = ausschnitt.length === expected.length && expected.every((v, i) => ausschnitt[i] === v);
    if (!matches) {
      return { ok: false, message: `ausschnitt ist ${JSON.stringify(ausschnitt)}, erwartet wird [20, 30, 40].` };
    }
    if (!lastResult.stdout.includes('20') || !lastResult.stdout.includes('40')) {
      return { ok: false, message: 'ausschnitt muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: zahlen[1:4] ergibt [20, 30, 40].' };
  },
  distractors: [
    {
      code: `zahlen = [10, 20, 30, 40, 50]
ausschnitt = zahlen[1:3]
print(ausschnitt)`,
      reason: 'setzt stop auf 3 statt 4 — dadurch fehlt das dritte gewünschte Element (40), das Ergebnis ist nur [20, 30] statt [20, 30, 40]',
    },
  ],
};
