import type { PythonChallenge } from '../../../types';

export const challenge19: PythonChallenge = {
  num: '19',
  title: 'Eine eigene Klasse iterierbar machen',
  tutorial: `Eine <code>for</code>-Schleife (und Funktionen wie <code>list(...)</code>) können über <b>jedes</b> Objekt laufen, das zwei spezielle Dunder-Methoden implementiert — das <b>Iterator-Protokoll</b>: <pre>class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current < 0:
            raise StopIteration
        wert = self.current
        self.current -= 1
        return wert</pre><code>__iter__(self)</code> muss ein Objekt zurückgeben, auf dem man <code>next(...)</code> aufrufen kann — hier einfach <code>self</code>. <code>__next__(self)</code> liefert bei jedem Aufruf den nächsten Wert und löst <code>StopIteration</code> aus, sobald nichts mehr kommt — genau das signalisiert einer <code>for</code>-Schleife (oder <code>list(...)</code>), dass sie aufhören soll.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Countdown</code> mit <code>__init__(self, start)</code> (speichert <code>start</code> in <code>self.current</code>), <code>__iter__(self)</code> (gibt <code>self</code> zurück) und <code>__next__(self)</code> (gibt den aktuellen Wert zurück und zählt ihn um 1 herunter, löst <code>StopIteration</code> aus, sobald <code>self.current</code> unter 0 fällt). Erzeuge <code>werte = list(Countdown(3))</code> und gib <code>werte</code> aus.`,
  hints: [
    `<code>__iter__(self)</code> ist der kürzeste Teil: einfach <code>return self</code>.`,
    `<code>__next__(self)</code> braucht zwei Dinge: den aktuellen Wert zurückgeben UND <code>self.current</code> um 1 verringern, bevor die Methode endet.`,
    `So sieht die Lösung aus:<pre>class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current < 0:
            raise StopIteration
        wert = self.current
        self.current -= 1
        return wert

werte = list(Countdown(3))
print(werte)</pre>`,
  ] as const,
  solution: `class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current < 0:
            raise StopIteration
        wert = self.current
        self.current -= 1
        return wert

werte = list(Countdown(3))
print(werte)`,
  syntaxExplanation: `<ul><li><code>__iter__(self)</code> — gibt das Objekt zurück, auf dem iteriert wird (hier sich selbst).</li><li><code>__next__(self)</code> — liefert den nächsten Wert oder löst <code>StopIteration</code> aus.</li><li><code>list(Countdown(3))</code> ruft automatisch <code>__iter__</code>, dann wiederholt <code>__next__</code> auf, bis <code>StopIteration</code> kommt.</li></ul>`,
  successCriteria: `Die Variable werte muss [3, 2, 1, 0] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { werte } = lastResult.variables;
    if (!Array.isArray(werte)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "werte" — wurde list(Countdown(3)) aufgerufen und gespeichert?' };
    }
    const expected = [3, 2, 1, 0];
    if (werte.length !== expected.length || werte.some((v, i) => v !== expected[i])) {
      return { ok: false, message: `werte ist ${JSON.stringify(werte)}, erwartet wird [3, 2, 1, 0].` };
    }
    if (!lastResult.stdout.includes('3') || !lastResult.stdout.includes('0')) {
      return { ok: false, message: 'werte muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Countdown implementiert das Iterator-Protokoll und zählt von 3 bis 0 herunter.' };
  },
  distractors: [
    {
      code: `class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        pass

    def __next__(self):
        if self.current < 0:
            raise StopIteration
        wert = self.current
        self.current -= 1
        return wert

werte = list(Countdown(3))
print(werte)`,
      reason: '__iter__ gibt nichts zurück (nur pass, also None) statt self — list(...) ruft zuerst __iter__ auf und erwartet ein iterierbares Objekt zurück, das löst den echten Fehler "iter() returned non-iterator of type NoneType" aus',
    },
  ],
};
