import type { PythonChallenge } from '../../../types';

export const challenge19_2: PythonChallenge = {
  num: '19.2',
  title: 'Eigene Fehlerarten definieren',
  tutorial: `Eingebaute Fehlerarten wie <code>ValueError</code> oder <code>ZeroDivisionError</code> sind allgemein — manchmal will man einen Fehler, dessen Name genau beschreibt, was in <b>deinem</b> Programm schiefging. Weil jede Exception in Python letztlich eine ganz normale Klasse ist, kannst du dir eine eigene bauen — sie muss nur (direkt oder indirekt) von <code>Exception</code> erben: <pre>class NichtGenugGeldError(Exception):
    pass</pre><code>pass</code> reicht bereits, denn <code>Exception</code> bringt alles Nötige mit (unter anderem, dass sie sich per <code>raise</code> auslösen und per <code>except</code> abfangen lässt, und dass <code>str(...)</code> die übergebene Nachricht zurückgibt). Ab jetzt ist <code>NichtGenugGeldError</code> ein vollwertiger, eigener Fehlertyp: <code>raise NichtGenugGeldError("Nicht genug Geld auf dem Konto")</code>.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine eigene Exception-Klasse <code>NichtGenugGeldError(Exception)</code>. Definiere eine Funktion <code>abheben(kontostand, betrag)</code>, die <code>NichtGenugGeldError("Nicht genug Geld auf dem Konto")</code> auslöst, falls <code>betrag</code> größer als <code>kontostand</code> ist, sonst <code>kontostand - betrag</code> zurückgibt. Rufe <code>abheben(100, 150)</code> in einem <code>try</code>-Block auf, fange <code>NichtGenugGeldError</code> ab und speichere die Fehlermeldung (als String) in <code>ergebnis</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `<code>class NichtGenugGeldError(Exception): pass</code> — eine eigene Exception-Klasse braucht meist nicht mehr als das.`,
    `<code>except NichtGenugGeldError as fehler:</code> — <code>str(fehler)</code> liefert die Nachricht, mit der die Exception ausgelöst wurde.`,
    `So sieht die Lösung aus:<pre>class NichtGenugGeldError(Exception):
    pass

def abheben(kontostand, betrag):
    if betrag > kontostand:
        raise NichtGenugGeldError("Nicht genug Geld auf dem Konto")
    return kontostand - betrag

try:
    ergebnis = abheben(100, 150)
except NichtGenugGeldError as fehler:
    ergebnis = str(fehler)

print(ergebnis)</pre>`,
  ] as const,
  solution: `class NichtGenugGeldError(Exception):
    pass

def abheben(kontostand, betrag):
    if betrag > kontostand:
        raise NichtGenugGeldError("Nicht genug Geld auf dem Konto")
    return kontostand - betrag

try:
    ergebnis = abheben(100, 150)
except NichtGenugGeldError as fehler:
    ergebnis = str(fehler)

print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>class NichtGenugGeldError(Exception): pass</code> — erbt alles Nötige von Exception.</li><li><code>raise NichtGenugGeldError("...")</code> — löst die eigene Fehlerart mit einer Nachricht aus.</li><li><code>except NichtGenugGeldError as fehler:</code> fängt genau diesen (und nur diesen) Fehlertyp ab.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss "Nicht genug Geld auf dem Konto" sein (der abgefangene eigene Fehler) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "ergebnis" — wurde der eigene Fehler abgefangen und die Nachricht gespeichert?' };
    }
    if (ergebnis !== 'Nicht genug Geld auf dem Konto') {
      return { ok: false, message: `ergebnis ist "${ergebnis}", erwartet wird "Nicht genug Geld auf dem Konto".` };
    }
    if (!lastResult.stdout.includes('Nicht genug Geld auf dem Konto')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: NichtGenugGeldError wird ausgelöst und über den eigenen Exception-Typ abgefangen.' };
  },
  distractors: [
    {
      code: `class NichtGenugGeldError(Exception):
    pass

def abheben(kontostand, betrag):
    if betrag > kontostand:
        raise ValueError("Nicht genug Geld auf dem Konto")
    return kontostand - betrag

try:
    ergebnis = abheben(100, 150)
except NichtGenugGeldError as fehler:
    ergebnis = str(fehler)

print(ergebnis)`,
      reason: 'löst ein eingebautes ValueError statt des eigenen NichtGenugGeldError aus — das except NichtGenugGeldError fängt es deshalb nicht ab, der echte ValueError bleibt unbehandelt und beendet das Programm',
    },
  ],
};
