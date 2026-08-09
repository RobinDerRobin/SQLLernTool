import type { PythonChallenge } from '../../../types';

export const challenge19_1: PythonChallenge = {
  num: '19.1',
  title: 'Iteratoren einfacher bauen: yield',
  tutorial: `Die letzte Aufgabe hat gezeigt, wie viel Code eine eigene, iterierbare Klasse braucht — <code>__init__</code>, <code>__iter__</code>, <code>__next__</code>, alles von Hand. Mit <code>yield</code> schreibst du dieselbe Idee als ganz normale Funktion: <pre>def countdown(start):
    current = start
    while current >= 0:
        yield current
        current -= 1</pre>Eine Funktion, die irgendwo <code>yield</code> statt <code>return</code> benutzt, heißt <b>Generatorfunktion</b>. Ihr Aufruf, <code>countdown(3)</code>, führt den Funktionskörper <b>nicht sofort aus</b> — er liefert stattdessen automatisch ein Objekt, das bereits das komplette Iterator-Protokoll aus der letzten Aufgabe implementiert. Jeder <code>yield</code> pausiert die Funktion und gibt einen Wert heraus; beim nächsten <code>next(...)</code>-Aufruf läuft sie genau dort weiter, wo sie stehengeblieben ist.`,
  task: `<b>Deine Aufgabe:</b> Schreibe eine Generatorfunktion <code>countdown(start)</code>, die mit <code>yield</code> beginnend bei <code>start</code> bis <code>0</code> herunterzählt (jeden Wert einzeln, absteigend, inklusive 0). Erzeuge <code>werte = list(countdown(3))</code> und gib <code>werte</code> aus.`,
  hints: [
    `<code>while current >= 0:</code> als Schleifenbedingung, <code>current</code> beginnt bei <code>start</code>.`,
    `<code>yield current</code> statt <code>return current</code> — <code>return</code> würde die Funktion sofort beenden, <code>yield</code> pausiert sie nur.`,
    `So sieht die Lösung aus:<pre>def countdown(start):
    current = start
    while current >= 0:
        yield current
        current -= 1

werte = list(countdown(3))
print(werte)</pre>`,
  ] as const,
  solution: `def countdown(start):
    current = start
    while current >= 0:
        yield current
        current -= 1

werte = list(countdown(3))
print(werte)`,
  syntaxExplanation: `<ul><li><code>yield current</code> — liefert einen Wert und pausiert die Funktion, statt sie zu beenden.</li><li><code>countdown(3)</code> gibt sofort ein Generator-Objekt zurück, ohne den Funktionskörper auszuführen.</li><li><code>list(...)</code> ruft <code>next(...)</code> wiederholt auf, bis die Funktion durchläuft und automatisch <code>StopIteration</code> auslöst.</li></ul>`,
  successCriteria: `Die Variable werte muss [3, 2, 1, 0] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { werte } = lastResult.variables;
    if (!Array.isArray(werte)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "werte" — wurde list(countdown(3)) aufgerufen und gespeichert?' };
    }
    const expected = [3, 2, 1, 0];
    if (werte.length !== expected.length || werte.some((v, i) => v !== expected[i])) {
      return { ok: false, message: `werte ist ${JSON.stringify(werte)}, erwartet wird [3, 2, 1, 0] — wurde yield statt return benutzt?` };
    }
    if (!lastResult.stdout.includes('3') || !lastResult.stdout.includes('0')) {
      return { ok: false, message: 'werte muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: countdown() ist eine Generatorfunktion und zählt von 3 bis 0 herunter.' };
  },
  distractors: [
    {
      code: `def countdown(start):
    current = start
    while current >= 0:
        return current
        current -= 1

werte = list(countdown(3))
print(werte)`,
      reason: 'benutzt return statt yield — dadurch ist countdown() gar keine Generatorfunktion mehr, der Aufruf liefert direkt die Zahl 3 statt eines iterierbaren Generators, list(3) löst den echten Fehler "int object is not iterable" aus',
    },
  ],
};
