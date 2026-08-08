import type { PythonChallenge } from '../../../types';

export const challenge12_9: PythonChallenge = {
  num: '12.9',
  title: 'Elemente aussieben: filter()',
  tutorial: `<code>filter(funktion, iterable)</code> behält nur die Elemente eines Iterables, für die die Funktion <code>True</code> zurückgibt — alle anderen werden aussortiert. Wie bei <code>map()</code> passt auch hier ein lambda-Ausdruck genau als kurze "Testbedingung": <pre>zahlen = [1, 2, 3, 4, 5, 6]
gerade = filter(lambda x: x % 2 == 0, zahlen)</pre>Genau wie <code>map()</code> liefert auch <code>filter(...)</code> kein fertiges <code>list</code>, sondern ein lazy filter-Objekt — auch hier muss man explizit mit <code>list(...)</code> umwandeln, um damit weiterzuarbeiten: <pre>gerade = list(filter(lambda x: x % 2 == 0, zahlen))
print(gerade)   # [2, 4, 6]</pre>Der Unterschied zu <code>map()</code>: <code>map()</code> wandelt jedes Element um (gleiche Anzahl Elemente bleibt erhalten), <code>filter()</code> sortiert Elemente komplett aus (kann kürzer werden).`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist die Liste <code>zahlen = [1, 2, 3, 4, 5, 6]</code>. Erzeuge mit <code>filter()</code> und einem lambda-Ausdruck eine neue Liste <code>gerade</code>, die nur die geraden Zahlen aus <code>zahlen</code> enthält. Achte darauf, das Ergebnis von <code>filter()</code> mit <code>list(...)</code> in eine echte Liste umzuwandeln. Gib <code>gerade</code> aus.`,
  hints: [
    `<code>filter(lambda x: x % 2 == 0, zahlen)</code> behält nur die Elemente, für die <code>x % 2 == 0</code> (durch 2 teilbar, also gerade) wahr ist.`,
    `Das Ergebnis von <code>filter()</code> ist noch keine Liste — wickle den ganzen Ausdruck in <code>list(...)</code> ein, damit <code>gerade</code> tatsächlich eine Liste wird.`,
    `So sieht die Lösung aus:<pre>zahlen = [1, 2, 3, 4, 5, 6]
gerade = list(filter(lambda x: x % 2 == 0, zahlen))
print(gerade)</pre>`,
  ] as const,
  solution: `zahlen = [1, 2, 3, 4, 5, 6]
gerade = list(filter(lambda x: x % 2 == 0, zahlen))
print(gerade)`,
  syntaxExplanation: `<ul><li><code>filter(lambda x: x % 2 == 0, zahlen)</code> — behält nur Elemente, für die das lambda True liefert.</li><li><code>list(...)</code> — wandelt das lazy filter-Objekt in eine konkrete Liste um.</li><li>Ergebnis: <code>[2, 4, 6]</code> — die ungeraden Zahlen fallen weg.</li></ul>`,
  successCriteria: `Die Variable gerade muss die Liste [2, 4, 6] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gerade } = lastResult.variables;
    if (!Array.isArray(gerade)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "gerade" — wurde filter(...) mit list(...) umgewandelt?' };
    }
    const expected = [2, 4, 6];
    const matches = gerade.length === expected.length && expected.every((v, i) => gerade[i] === v);
    if (!matches) {
      return { ok: false, message: `gerade ist ${JSON.stringify(gerade)}, erwartet wird [2, 4, 6].` };
    }
    if (!lastResult.stdout.includes('2') || !lastResult.stdout.includes('6')) {
      return { ok: false, message: 'gerade muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Von [1, 2, 3, 4, 5, 6] bleiben nur die geraden Zahlen [2, 4, 6] übrig.' };
  },
  distractors: [
    {
      code: `zahlen = [1, 2, 3, 4, 5, 6]
gerade = filter(lambda x: x % 2 == 0, zahlen)
print(gerade)`,
      reason: 'wandelt das filter-Objekt nie mit list(...) um — gerade bleibt ein lazy filter-Objekt statt einer Liste, es gibt also keine gültige Listen-Variable "gerade"',
    },
  ],
};
