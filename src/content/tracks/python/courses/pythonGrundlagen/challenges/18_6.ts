import type { PythonChallenge } from '../../../types';

export const challenge18_6: PythonChallenge = {
  num: '18.6',
  title: 'Objekte lesbar machen: __str__',
  tutorial: `Ohne weitere Angaben zeigt <code>str(objekt)</code> nur eine technische Standarddarstellung wie <code>&lt;__main__.Buch object at 0x...&gt;</code> — nicht besonders hilfreich. Mit der speziellen <b>Dunder-Methode</b> <code>__str__</code> (Dunder = "double underscore", <code>__...__</code>) bestimmst du selbst, was <code>str(objekt)</code> zurückgibt: <pre>class Buch:
    def __init__(self, titel):
        self.titel = titel
    def __str__(self):
        return f"Buch: {self.titel}"</pre><code>__str__</code> wird nicht direkt aufgerufen wie eine normale Methode — Python ruft sie automatisch auf, wann immer eine lesbare Textdarstellung des Objekts gebraucht wird, zum Beispiel bei <code>str(buch)</code> oder <code>print(buch)</code>.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Buch</code> mit <code>__init__(self, titel)</code> und <code>__str__(self)</code>, die <code>f"Buch: {self.titel}"</code> zurückgibt. Erzeuge <code>buch = Buch("Python lernen")</code>, rufe <code>str(buch)</code> auf und speichere das Ergebnis in <code>text</code>. Gib <code>text</code> aus.`,
  hints: [
    `Der Methodenname ist exakt <code>__str__</code> — zwei Unterstriche vor und nach "str", sonst erkennt Python die Methode nicht als Sonderfall.`,
    `<code>return f"Buch: {self.titel}"</code> — ein f-String, der den Titel des jeweiligen Buchs einsetzt.`,
    `So sieht die Lösung aus:<pre>class Buch:
    def __init__(self, titel):
        self.titel = titel
    def __str__(self):
        return f"Buch: {self.titel}"

buch = Buch("Python lernen")
text = str(buch)
print(text)</pre>`,
  ] as const,
  solution: `class Buch:
    def __init__(self, titel):
        self.titel = titel
    def __str__(self):
        return f"Buch: {self.titel}"

buch = Buch("Python lernen")
text = str(buch)
print(text)`,
  syntaxExplanation: `<ul><li><code>__str__(self)</code> — Dunder-Methode, die Python automatisch bei <code>str(objekt)</code> aufruft.</li><li><code>f"Buch: {self.titel}"</code> — baut die Textdarstellung aus dem Instanzattribut.</li><li><code>str(buch)</code> ruft <code>buch.__str__()</code> auf, nicht andersherum.</li></ul>`,
  successCriteria: `Die Variable text muss "Buch: Python lernen" sein und ausgegeben werden — nicht die technische Standarddarstellung.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { text } = lastResult.variables;
    if (typeof text !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "text" — wurde str(buch) aufgerufen und das Ergebnis gespeichert?' };
    }
    if (text !== 'Buch: Python lernen') {
      return { ok: false, message: `text ist "${text}", erwartet wird "Buch: Python lernen" — wurde die Methode exakt __str__ genannt?` };
    }
    if (!lastResult.stdout.includes('Buch: Python lernen')) {
      return { ok: false, message: 'text muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: __str__ liefert die lesbare Textdarstellung des Buchs.' };
  },
  distractors: [
    {
      code: `class Buch:
    def __init__(self, titel):
        self.titel = titel
    def to_string(self):
        return f"Buch: {self.titel}"

buch = Buch("Python lernen")
text = str(buch)
print(text)`,
      reason: 'nennt die Methode to_string statt __str__ — Python erkennt nur den exakten Namen __str__ als Sonderfall, str(buch) fällt deshalb auf die technische Standarddarstellung zurück (z. B. "<__main__.Buch object at 0x...>") statt "Buch: Python lernen"',
    },
  ],
};
