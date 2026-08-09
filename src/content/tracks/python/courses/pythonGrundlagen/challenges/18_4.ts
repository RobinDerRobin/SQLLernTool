import type { PythonChallenge } from '../../../types';

export const challenge18_4: PythonChallenge = {
  num: '18.4',
  title: 'Eine Klasse auf einer anderen aufbauen: Vererbung',
  tutorial: `Statt eine ähnliche Klasse komplett neu zu schreiben, kann eine Klasse von einer anderen <b>erben</b> — sie bekommt automatisch alle Methoden und das Verhalten der Basisklasse: <pre>class Tier:
    def __init__(self, name):
        self.name = name
    def laut(self):
        return "..."

class Hund(Tier):
    pass</pre><code>class Hund(Tier):</code> bedeutet: <code>Hund</code> erbt von <code>Tier</code>. <code>pass</code> heißt "hier kommt nichts Eigenes hinzu" — <code>Hund</code> bekommt trotzdem automatisch <code>__init__</code> und <code>laut</code> von <code>Tier</code> mit. <code>Hund("Bello")</code> funktioniert also, obwohl <code>Hund</code> selbst gar kein <code>__init__</code> definiert.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Tier</code> mit <code>__init__(self, name)</code> (setzt <code>self.name</code>) und einer Methode <code>laut(self)</code>, die <code>"..."</code> zurückgibt. Definiere <code>Hund(Tier)</code>, die nichts Eigenes hinzufügt (<code>pass</code>). Erzeuge <code>hund = Hund("Bello")</code>, lies <code>hund.name</code> in <code>name</code> und das Ergebnis von <code>hund.laut()</code> in <code>laut</code> aus. Gib beide aus.`,
  hints: [
    `<code>class Hund(Tier):</code> — der Klassenname in Klammern hinter dem neuen Klassennamen bedeutet Vererbung.`,
    `<code>pass</code> als einziger Inhalt von <code>Hund</code> reicht — <code>__init__</code> und <code>laut</code> kommen automatisch von <code>Tier</code>.`,
    `So sieht die Lösung aus:<pre>class Tier:
    def __init__(self, name):
        self.name = name
    def laut(self):
        return "..."

class Hund(Tier):
    pass

hund = Hund("Bello")
name = hund.name
laut = hund.laut()
print(name, laut)</pre>`,
  ] as const,
  solution: `class Tier:
    def __init__(self, name):
        self.name = name
    def laut(self):
        return "..."

class Hund(Tier):
    pass

hund = Hund("Bello")
name = hund.name
laut = hund.laut()
print(name, laut)`,
  syntaxExplanation: `<ul><li><code>class Hund(Tier):</code> — Hund erbt von Tier.</li><li><code>pass</code> — Hund fügt nichts Eigenes hinzu.</li><li><code>hund.name</code>/<code>hund.laut()</code> funktionieren trotzdem, weil sie von Tier geerbt sind.</li></ul>`,
  successCriteria: `name muss "Bello" sein, laut muss "..." sein (geerbt von Tier), beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { name, laut } = lastResult.variables;
    if (typeof name !== 'string' || typeof laut !== 'string') {
      return { ok: false, message: 'Es fehlen die Text-Variablen "name" und "laut".' };
    }
    if (name !== 'Bello' || laut !== '...') {
      return { ok: false, message: `name/laut sind "${name}"/"${laut}", erwartet werden "Bello"/"...".` };
    }
    if (!lastResult.stdout.includes('Bello')) {
      return { ok: false, message: 'name und laut müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Hund erbt __init__ und laut() von Tier.' };
  },
  distractors: [
    {
      code: `class Tier:
    def __init__(self, name):
        self.name = name
    def laut(self):
        return "..."

class Hund:
    pass

hund = Hund("Bello")
name = hund.name
laut = hund.laut()
print(name, laut)`,
      reason: 'vergisst (Tier) hinter class Hund — ohne Vererbung hat Hund kein eigenes __init__ und bekommt keins von Tier, Hund("Bello") löst den echten Fehler "Hund() takes no arguments" aus',
    },
  ],
};
