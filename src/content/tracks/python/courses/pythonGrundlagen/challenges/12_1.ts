import type { PythonChallenge } from '../../../types';

export const challenge12_1: PythonChallenge = {
  num: '12.1',
  title: 'Mehrere Parameter',
  tutorial: `Eine Funktion kann mehrere Parameter haben, durch Komma getrennt: <pre>def rueckgeld(preis, bezahlt):
    return bezahlt - preis</pre>Beim Aufruf werden die Werte <b>der Reihenfolge nach</b> zugeordnet — der erste Wert an den ersten Parameter, der zweite an den zweiten. Das nennt man <b>positionale Argumente</b>. Vertauschst du die Reihenfolge beim Aufruf, rechnet die Funktion mit vertauschten Werten weiter, auch wenn sie äußerlich unauffällig aussieht — bei nicht-symmetrischen Operationen wie Subtraktion führt das zu einem klar falschen (oft sogar negativen) Ergebnis.`,
  task: `Die meisten nützlichen Funktionen brauchen mehr als einen Eingabewert. Wie bei eingebauten Funktionen mit mehreren Argumenten (z. B. <code>range(1, 10)</code>) zählt bei eigenen Funktionen die Reihenfolge der Parameter.<br><br><b>Deine Aufgabe:</b> Schreibe eine Funktion <code>rueckgeld(preis, bezahlt)</code>, die zurückgibt, wie viel Wechselgeld herauszugeben ist (<code>bezahlt - preis</code>). Rufe sie für einen Preis von 15 und einen bezahlten Betrag von 20 auf, speichere das Ergebnis in <code>wechselgeld</code> und gib es aus.`,
  hints: [
    `Zwei Parameter stehen einfach durch Komma getrennt in der Klammer: <code>def rueckgeld(preis, bezahlt):</code>.`,
    `Beim Aufruf zählt die Reihenfolge: <code>rueckgeld(15, 20)</code> setzt preis=15 und bezahlt=20 — nicht umgekehrt.`,
    `So sieht die Lösung aus:<pre>def rueckgeld(preis, bezahlt):
    return bezahlt - preis

wechselgeld = rueckgeld(15, 20)
print(wechselgeld)</pre>`,
  ] as const,
  solution: `def rueckgeld(preis, bezahlt):
    return bezahlt - preis

wechselgeld = rueckgeld(15, 20)
print(wechselgeld)`,
  syntaxExplanation: `<ul><li><code>def rueckgeld(preis, bezahlt):</code> — zwei Parameter, durch Komma getrennt.</li><li><code>rueckgeld(15, 20)</code> — der erste Wert (15) geht an preis, der zweite (20) an bezahlt.</li><li><code>bezahlt - preis</code> — 20 - 15 = 5 Wechselgeld.</li></ul>`,
  successCriteria: `Die Variable wechselgeld muss 5 sein (20 bezahlt minus 15 Preis) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { wechselgeld } = lastResult.variables;
    if (typeof wechselgeld !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "wechselgeld".' };
    }
    if (wechselgeld !== 5) {
      return { ok: false, message: `wechselgeld ist ${wechselgeld}, erwartet wird 5 (20 bezahlt minus 15 Preis).` };
    }
    if (!lastResult.stdout.includes('5')) {
      return { ok: false, message: 'wechselgeld muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Wechselgeld ist 5.' };
  },
  distractors: [
    {
      code: `def rueckgeld(preis, bezahlt):
    return bezahlt - preis

wechselgeld = rueckgeld(20, 15)
print(wechselgeld)`,
      reason: 'vertauscht die Reihenfolge der Argumente beim Aufruf — preis und bezahlt werden dadurch vertauscht, das Ergebnis wird -5 statt 5',
    },
  ],
};
