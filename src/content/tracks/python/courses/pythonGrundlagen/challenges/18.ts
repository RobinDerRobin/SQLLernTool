import type { PythonChallenge } from '../../../types';

export const challenge18: PythonChallenge = {
  num: '18',
  title: 'Eigene Bauform: class',
  tutorial: `Bisher waren <code>int</code>, <code>str</code>, <code>list</code> usw. Typen, die Python schon mitbringt. Mit <code>class</code> definierst du deinen <b>eigenen</b> Typ: <pre>class Roboter:
    def gruss(self):
        return "Hallo!"</pre>Eine Funktion innerhalb einer Klasse heißt <b>Methode</b> — sie bekommt als erstes Argument immer automatisch das Objekt selbst, üblicherweise <code>self</code> genannt. Ein Objekt dieser Klasse erzeugst du, indem du die Klasse wie eine Funktion aufrufst: <code>r = Roboter()</code>. Danach rufst du die Methode mit der Punkt-Syntax auf: <code>r.gruss()</code> — Python reicht <code>r</code> dabei automatisch als <code>self</code> durch, du schreibst es beim Aufruf nicht selbst hin.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Roboter</code> mit einer Methode <code>gruss(self)</code>, die den String <code>"Hallo, ich bin ein Roboter!"</code> zurückgibt. Erzeuge ein Objekt <code>r = Roboter()</code>, rufe <code>r.gruss()</code> auf und speichere das Ergebnis in <code>nachricht</code>. Gib <code>nachricht</code> aus.`,
  hints: [
    `<code>class Roboter:</code> beginnt die Klassen-Definition, der Methoden-Rumpf ist eingerückt wie bei einer Funktion.`,
    `Die Methode braucht <code>self</code> als ersten Parameter, auch wenn du es beim Aufruf <code>r.gruss()</code> nicht mit angibst — Python füllt es automatisch.`,
    `So sieht die Lösung aus:<pre>class Roboter:
    def gruss(self):
        return "Hallo, ich bin ein Roboter!"

r = Roboter()
nachricht = r.gruss()
print(nachricht)</pre>`,
  ] as const,
  solution: `class Roboter:
    def gruss(self):
        return "Hallo, ich bin ein Roboter!"

r = Roboter()
nachricht = r.gruss()
print(nachricht)`,
  syntaxExplanation: `<ul><li><code>class Roboter:</code> — definiert einen neuen Typ namens Roboter.</li><li><code>def gruss(self):</code> — eine Methode; <code>self</code> ist das Objekt, auf dem sie aufgerufen wird.</li><li><code>r = Roboter()</code> — erzeugt ein Objekt (eine "Instanz") der Klasse.</li></ul>`,
  successCriteria: `Die Variable nachricht muss "Hallo, ich bin ein Roboter!" sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { nachricht } = lastResult.variables;
    if (typeof nachricht !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "nachricht" — wurde r.gruss() aufgerufen und das Ergebnis gespeichert?' };
    }
    if (nachricht !== 'Hallo, ich bin ein Roboter!') {
      return { ok: false, message: `nachricht ist "${nachricht}", erwartet wird "Hallo, ich bin ein Roboter!".` };
    }
    if (!lastResult.stdout.includes('Hallo, ich bin ein Roboter!')) {
      return { ok: false, message: 'nachricht muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Roboter.gruss() liefert die richtige Nachricht.' };
  },
  distractors: [
    {
      code: `class Roboter:
    def gruss():
        return "Hallo, ich bin ein Roboter!"

r = Roboter()
nachricht = r.gruss()
print(nachricht)`,
      reason: 'vergisst den self-Parameter in der Methode — beim Aufruf r.gruss() reicht Python automatisch r als erstes Argument durch, das löst den echten Fehler "gruss() takes 0 positional arguments but 1 was given" aus',
    },
  ],
};
