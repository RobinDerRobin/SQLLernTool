import type { PythonChallenge } from '../../../types';

export const challenge12_8: PythonChallenge = {
  num: '12.8',
  title: 'Eine Funktion auf jedes Element anwenden: map()',
  tutorial: `<code>map(funktion, iterable)</code> wendet eine Funktion auf <b>jedes</b> Element eines Iterables an und liefert die Ergebnisse zurück — ohne eine Schleife von Hand zu schreiben. Praktischerweise passt genau hier ein lambda-Ausdruck als kurze "Wegwerf-Funktion" hinein, die man nicht extra mit <code>def</code> benennen muss: <pre>zahlen = [1, 2, 3, 4]
verdoppelt = map(lambda x: x * 2, zahlen)</pre><code>map(...)</code> liefert dabei kein fertiges <code>list</code> zurück, sondern ein spezielles <b>map-Objekt</b>, das die Werte erst bei Bedarf berechnet ("lazy"). Um daraus wieder eine normale Liste zu bekommen, mit der man weiterarbeiten (z. B. ausgeben) kann, muss man es explizit mit <code>list(...)</code> umwandeln: <pre>verdoppelt = list(map(lambda x: x * 2, zahlen))
print(verdoppelt)   # [2, 4, 6, 8]</pre>`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist die Liste <code>zahlen = [1, 2, 3, 4]</code>. Erzeuge mit <code>map()</code> und einem lambda-Ausdruck eine neue Liste <code>verdoppelt</code>, in der jede Zahl aus <code>zahlen</code> verdoppelt ist. Achte darauf, das Ergebnis von <code>map()</code> mit <code>list(...)</code> in eine echte Liste umzuwandeln. Gib <code>verdoppelt</code> aus.`,
  hints: [
    `<code>map(lambda x: x * 2, zahlen)</code> wendet das lambda auf jedes Element von <code>zahlen</code> an.`,
    `Das Ergebnis von <code>map()</code> ist noch keine Liste — wickle den ganzen Ausdruck in <code>list(...)</code> ein, damit <code>verdoppelt</code> tatsächlich eine Liste wird.`,
    `So sieht die Lösung aus:<pre>zahlen = [1, 2, 3, 4]
verdoppelt = list(map(lambda x: x * 2, zahlen))
print(verdoppelt)</pre>`,
  ] as const,
  solution: `zahlen = [1, 2, 3, 4]
verdoppelt = list(map(lambda x: x * 2, zahlen))
print(verdoppelt)`,
  syntaxExplanation: `<ul><li><code>map(lambda x: x * 2, zahlen)</code> — wendet das lambda auf jedes Element von <code>zahlen</code> an.</li><li><code>list(...)</code> — wandelt das lazy map-Objekt in eine konkrete Liste um.</li><li>Ergebnis: <code>[2, 4, 6, 8]</code>.</li></ul>`,
  successCriteria: `Die Variable verdoppelt muss die Liste [2, 4, 6, 8] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { verdoppelt } = lastResult.variables;
    if (!Array.isArray(verdoppelt)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "verdoppelt" — wurde map(...) mit list(...) umgewandelt?' };
    }
    const expected = [2, 4, 6, 8];
    const matches =
      verdoppelt.length === expected.length && expected.every((v, i) => verdoppelt[i] === v);
    if (!matches) {
      return {
        ok: false,
        message: `verdoppelt ist ${JSON.stringify(verdoppelt)}, erwartet wird [2, 4, 6, 8].`,
      };
    }
    if (!lastResult.stdout.includes('2') || !lastResult.stdout.includes('8')) {
      return { ok: false, message: 'verdoppelt muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: [1, 2, 3, 4] verdoppelt ist [2, 4, 6, 8].' };
  },
  distractors: [
    {
      code: `zahlen = [1, 2, 3, 4]
verdoppelt = map(lambda x: x * 2, zahlen)
print(verdoppelt)`,
      reason: 'wandelt das map-Objekt nie mit list(...) um — verdoppelt bleibt ein lazy map-Objekt statt einer Liste, es gibt also keine gültige Listen-Variable "verdoppelt"',
    },
  ],
};
