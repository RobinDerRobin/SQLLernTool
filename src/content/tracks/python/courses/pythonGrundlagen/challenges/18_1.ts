import type { PythonChallenge } from '../../../types';

export const challenge18_1: PythonChallenge = {
  num: '18.1',
  title: 'Objekte mit Zustand: __init__ und self',
  tutorial: `Ein Objekt ohne eigene Daten ist selten nützlich. Mit der speziellen Methode <code>__init__</code> gibst du jedem neuen Objekt sofort seine eigenen Werte mit — sie läuft automatisch beim Erzeugen: <pre>class Person:
    def __init__(self, name, alter):
        self.name = name
        self.alter = alter</pre><code>self.name = name</code> speichert das übergebene <code>name</code>-Argument <b>am Objekt selbst</b>, als <b>Instanzattribut</b>. Ohne <code>self.</code> davor wäre <code>name</code> nur eine lokale Variable, die sofort nach dem Methodenende verloren geht. Danach greifst du über die Punkt-Syntax darauf zu: <code>anna = Person("Anna", 30)</code>, <code>anna.name</code>.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Person</code> mit <code>__init__(self, name, alter)</code>, die beide Werte als Instanzattribute speichert. Erzeuge <code>anna = Person("Anna", 30)</code>, lies <code>anna.name</code> und <code>anna.alter</code> in die Variablen <code>name</code> und <code>alter</code> aus und gib beide aus.`,
  hints: [
    `<code>def __init__(self, name, alter):</code> — läuft automatisch, wenn du <code>Person("Anna", 30)</code> aufrufst.`,
    `Im Rumpf: <code>self.name = name</code> und <code>self.alter = alter</code> — ohne <code>self.</code> gehen die Werte nach dem Methodenende verloren.`,
    `So sieht die Lösung aus:<pre>class Person:
    def __init__(self, name, alter):
        self.name = name
        self.alter = alter

anna = Person("Anna", 30)
name = anna.name
alter = anna.alter
print(name, alter)</pre>`,
  ] as const,
  solution: `class Person:
    def __init__(self, name, alter):
        self.name = name
        self.alter = alter

anna = Person("Anna", 30)
name = anna.name
alter = anna.alter
print(name, alter)`,
  syntaxExplanation: `<ul><li><code>__init__(self, name, alter)</code> — läuft automatisch bei <code>Person("Anna", 30)</code>.</li><li><code>self.name = name</code> — speichert den Wert am Objekt, nicht nur lokal in der Methode.</li><li><code>anna.name</code> — liest das Instanzattribut über die Punkt-Syntax.</li></ul>`,
  successCriteria: `Die Variablen name ("Anna") und alter (30) müssen beide korrekt gesetzt und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { name, alter } = lastResult.variables;
    if (typeof name !== 'string' || typeof alter !== 'number') {
      return { ok: false, message: 'Es fehlen die Variablen "name" (Text) und "alter" (Zahl) — wurden anna.name und anna.alter ausgelesen?' };
    }
    if (name !== 'Anna' || alter !== 30) {
      return { ok: false, message: `name/alter sind "${name}"/${alter}, erwartet werden "Anna"/30.` };
    }
    if (!lastResult.stdout.includes('Anna') || !lastResult.stdout.includes('30')) {
      return { ok: false, message: 'name und alter müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Person speichert name und alter als Instanzattribute.' };
  },
  distractors: [
    {
      code: `class Person:
    def __init__(self, name, alter):
        name = name
        alter = alter

anna = Person("Anna", 30)
name = anna.name
alter = anna.alter
print(name, alter)`,
      reason: 'vergisst self. vor den Zuweisungen — name und alter werden nur lokale Variablen in __init__ und sind sofort nach dem Methodenende verloren, anna.name löst den echten Fehler "Person object has no attribute name" aus',
    },
  ],
};
