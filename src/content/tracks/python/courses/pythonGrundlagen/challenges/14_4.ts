import type { PythonChallenge } from '../../../types';

export const challenge14_4: PythonChallenge = {
  num: '14.4',
  title: 'Werte erst bei Bedarf berechnen: Generator Expressions',
  tutorial: `Eine <b>Generator Expression</b> sieht aus wie eine List Comprehension, aber mit runden statt eckigen Klammern: <pre>quadrate_gen = (x ** 2 for x in zahlen)</pre>Der entscheidende Unterschied: Eine List Comprehension berechnet <b>sofort</b> alle Werte und speichert sie als fertige Liste. Eine Generator Expression berechnet <b>gar nichts</b>, bis jemand tatsächlich danach fragt (z. B. mit <code>sum(...)</code> oder in einer <code>for</code>-Schleife) — "verzögerte Auswertung". Das spart Speicher bei großen Datenmengen, hat aber eine wichtige Konsequenz: Ein Generator lässt sich nur <b>einmal</b> durchlaufen. Ist er einmal komplett verbraucht, liefert ein zweiter Durchlauf keine Werte mehr: <pre>gen = (x for x in [1, 2, 3])
sum(gen)   # 6 — erster Durchlauf
sum(gen)   # 0 — der Generator ist bereits leer</pre>Eine Liste dagegen lässt sich beliebig oft erneut durchlaufen, weil sie ihre Werte tatsächlich gespeichert hat.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>zahlen = [1, 2, 3, 4, 5]</code>. Erzeuge eine Generator Expression <code>quadrate_gen</code>, die jede Zahl quadriert. Berechne <code>erste_summe = sum(quadrate_gen)</code> und danach <code>zweite_summe = sum(quadrate_gen)</code> (derselbe Generator, ein zweites Mal). Gib beide aus.`,
  hints: [
    `Eine Generator Expression nutzt runde Klammern: <code>(x ** 2 for x in zahlen)</code>, nicht eckige.`,
    `<code>sum(quadrate_gen)</code> verbraucht den Generator beim ersten Aufruf komplett — der zweite Aufruf auf demselben Generator hat nichts mehr zu summieren und liefert <code>0</code>.`,
    `So sieht die Lösung aus:<pre>zahlen = [1, 2, 3, 4, 5]
quadrate_gen = (x ** 2 for x in zahlen)
erste_summe = sum(quadrate_gen)
zweite_summe = sum(quadrate_gen)
print(erste_summe, zweite_summe)</pre>`,
  ] as const,
  solution: `zahlen = [1, 2, 3, 4, 5]
quadrate_gen = (x ** 2 for x in zahlen)
erste_summe = sum(quadrate_gen)
zweite_summe = sum(quadrate_gen)
print(erste_summe, zweite_summe)`,
  syntaxExplanation: `<ul><li><code>(x ** 2 for x in zahlen)</code> — eine Generator Expression, berechnet noch nichts.</li><li><code>sum(quadrate_gen)</code> — verbraucht den Generator: 1+4+9+16+25 = <code>55</code>.</li><li>Der zweite <code>sum(quadrate_gen)</code>-Aufruf findet nichts mehr vor: <code>0</code>.</li></ul>`,
  successCriteria: `erste_summe muss 55 sein, zweite_summe muss 0 sein (der Generator ist nach dem ersten sum() leer), beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { erste_summe, zweite_summe } = lastResult.variables;
    if (erste_summe !== 55) {
      return { ok: false, message: `erste_summe ist ${JSON.stringify(erste_summe)}, erwartet wird 55.` };
    }
    if (zweite_summe !== 0) {
      return {
        ok: false,
        message: `zweite_summe ist ${JSON.stringify(zweite_summe)}, erwartet wird 0 — der Generator sollte nach dem ersten sum() bereits leer sein.`,
      };
    }
    if (!lastResult.stdout.includes('55') || !lastResult.stdout.includes('0')) {
      return { ok: false, message: 'erste_summe und zweite_summe müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 55 beim ersten Durchlauf, 0 beim zweiten — der Generator ist dann erschöpft.' };
  },
  distractors: [
    {
      code: `zahlen = [1, 2, 3, 4, 5]
quadrate_gen = [x ** 2 for x in zahlen]
erste_summe = sum(quadrate_gen)
zweite_summe = sum(quadrate_gen)
print(erste_summe, zweite_summe)`,
      reason: 'verwendet eckige statt runde Klammern — das ist eine List Comprehension, keine Generator Expression, die Liste bleibt nach dem ersten sum() erhalten, also ist zweite_summe wieder 55 statt 0',
    },
  ],
};
