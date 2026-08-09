import type { PythonChallenge } from '../../../types';

export const challenge18_5: PythonChallenge = {
  num: '18.5',
  title: 'Eine geerbte Methode neu definieren: Overriding',
  tutorial: `Eine Unterklasse kann eine geerbte Methode <b>neu definieren</b>, um sie für sich anders zu machen — das nennt man <b>Overriding</b>: <pre>class Tier:
    def laut(self):
        return "..."

class Katze(Tier):
    def laut(self):
        return "Miau"</pre><code>Katze</code> erbt <code>laut</code> von <code>Tier</code>, definiert aber eine eigene Version mit demselben Namen. Ruft man <code>laut()</code> auf einer <code>Katze</code> auf, gewinnt immer die <b>eigene</b> Definition der Unterklasse — die geerbte Version von <code>Tier</code> wird für <code>Katze</code>-Objekte komplett überschrieben, nicht etwa kombiniert.`,
  task: `<b>Deine Aufgabe:</b> Definiere <code>Tier</code> mit einer Methode <code>laut(self)</code>, die <code>"..."</code> zurückgibt. Definiere <code>Katze(Tier)</code> mit einer eigenen Methode <code>laut(self)</code>, die stattdessen <code>"Miau"</code> zurückgibt. Erzeuge <code>katze = Katze()</code>, rufe <code>katze.laut()</code> auf und speichere das Ergebnis in <code>ergebnis</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `<code>Katze</code> braucht eine eigene <code>def laut(self):</code> mit demselben Namen wie in <code>Tier</code>.`,
    `Die eigene Version von <code>Katze</code> gibt <code>"Miau"</code> zurück, nicht <code>"..."</code>.`,
    `So sieht die Lösung aus:<pre>class Tier:
    def laut(self):
        return "..."

class Katze(Tier):
    def laut(self):
        return "Miau"

katze = Katze()
ergebnis = katze.laut()
print(ergebnis)</pre>`,
  ] as const,
  solution: `class Tier:
    def laut(self):
        return "..."

class Katze(Tier):
    def laut(self):
        return "Miau"

katze = Katze()
ergebnis = katze.laut()
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>Katze(Tier)</code> — erbt von Tier.</li><li>eigenes <code>def laut(self):</code> in Katze überschreibt die geerbte Version.</li><li><code>katze.laut()</code> ruft die Katze-eigene Version auf, nicht die von Tier.</li></ul>`,
  successCriteria: `Die Variable ergebnis muss "Miau" sein (die überschriebene Version), nicht "..." (die geerbte), und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "ergebnis" — wurde katze.laut() aufgerufen und das Ergebnis gespeichert?' };
    }
    if (ergebnis !== 'Miau') {
      return { ok: false, message: `ergebnis ist "${ergebnis}", erwartet wird "Miau" — hat Katze eine eigene laut()-Methode?` };
    }
    if (!lastResult.stdout.includes('Miau')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Katze.laut() überschreibt die geerbte Version von Tier.' };
  },
  distractors: [
    {
      code: `class Tier:
    def laut(self):
        return "..."

class Katze(Tier):
    pass

katze = Katze()
ergebnis = katze.laut()
print(ergebnis)`,
      reason: 'überschreibt laut() gar nicht (nur pass) — katze.laut() nutzt dann die geerbte Version von Tier und liefert "...", nicht das erwartete "Miau"',
    },
  ],
};
