import type { PythonChallenge } from '../../../types';

export const challenge18_2: PythonChallenge = {
  num: '18.2',
  title: 'Methoden, die mit self rechnen',
  tutorial: `Eine Methode wird erst richtig nützlich, wenn sie die Instanzattribute des Objekts benutzt, auf dem sie aufgerufen wird — über <code>self</code>: <pre>class Rechteck:
    def __init__(self, breite, hoehe):
        self.breite = breite
        self.hoehe = hoehe

    def flaeche(self):
        return self.breite * self.hoehe</pre><code>flaeche(self)</code> greift über <code>self.breite</code> und <code>self.hoehe</code> auf genau die Werte <b>dieses</b> Objekts zu — ruft man <code>flaeche()</code> auf einem anderen Rechteck auf, rechnet sie automatisch mit dessen Werten. Ohne <code>self.</code> gäbe es innerhalb der Methode gar keine Variablen namens <code>breite</code>/<code>hoehe</code>, nur die Instanzattribute des Objekts.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Rechteck</code> mit <code>__init__(self, breite, hoehe)</code> und einer Methode <code>flaeche(self)</code>, die <code>self.breite * self.hoehe</code> zurückgibt. Erzeuge <code>r = Rechteck(4, 5)</code>, rufe <code>r.flaeche()</code> auf und speichere das Ergebnis in <code>ergebnis</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `<code>flaeche(self)</code> braucht <code>self.breite</code> und <code>self.hoehe</code> — nicht nur <code>breite</code> und <code>hoehe</code>, die gibt es innerhalb der Methode gar nicht.`,
    `<code>return self.breite * self.hoehe</code> greift auf die Attribute des Objekts zu, auf dem die Methode aufgerufen wurde.`,
    `So sieht die Lösung aus:<pre>class Rechteck:
    def __init__(self, breite, hoehe):
        self.breite = breite
        self.hoehe = hoehe

    def flaeche(self):
        return self.breite * self.hoehe

r = Rechteck(4, 5)
ergebnis = r.flaeche()
print(ergebnis)</pre>`,
  ] as const,
  solution: `class Rechteck:
    def __init__(self, breite, hoehe):
        self.breite = breite
        self.hoehe = hoehe

    def flaeche(self):
        return self.breite * self.hoehe

r = Rechteck(4, 5)
ergebnis = r.flaeche()
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>self.breite</code>, <code>self.hoehe</code> — die Instanzattribute des konkreten Objekts, auf dem die Methode läuft.</li><li><code>r.flaeche()</code> — Python übergibt <code>r</code> automatisch als <code>self</code>.</li><li>4 × 5 = 20.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss 20 sein (4 × 5) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "ergebnis" — wurde r.flaeche() aufgerufen und das Ergebnis gespeichert?' };
    }
    if (ergebnis !== 20) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet werden 20 (4 × 5).` };
    }
    if (!lastResult.stdout.includes('20')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Rechteck.flaeche() rechnet mit den Attributen des Objekts.' };
  },
  distractors: [
    {
      code: `class Rechteck:
    def __init__(self, breite, hoehe):
        self.breite = breite
        self.hoehe = hoehe

    def flaeche(self):
        return breite * hoehe

r = Rechteck(4, 5)
ergebnis = r.flaeche()
print(ergebnis)`,
      reason: 'vergisst self. in der Methode — breite und hoehe existieren als solche gar nicht innerhalb von flaeche(), nur self.breite/self.hoehe, das löst den echten Fehler "name breite is not defined" aus',
    },
  ],
};
