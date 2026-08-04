import type { PythonChallenge } from '../../../types';

export const challenge11_2: PythonChallenge = {
  num: '11.2',
  title: 'Solange eine Bedingung gilt: die while-Schleife',
  tutorial: `<code>for</code> eignet sich, wenn du im Voraus weißt, wie oft (oder worüber) eine Schleife laufen soll. Manchmal weißt du das aber nicht — die Schleife soll einfach so lange weiterlaufen, wie eine Bedingung zutrifft. Dafür gibt es <code>while bedingung:</code>: <pre>x = 8
while x > 1:
    x = x // 2
    print(x)</pre>Der Block läuft immer wieder, solange die Bedingung nach jedem Durchlauf noch <code>True</code> ist — und genau deshalb muss sich <b>innerhalb</b> des Blocks etwas ändern, das die Bedingung irgendwann <code>False</code> werden lässt. Sonst läuft die Schleife endlos weiter.`,
  task: `Bei manchen Aufgaben weißt du die Anzahl der Durchläufe nicht vorher — z. B. wie oft man eine Zahl halbieren muss, bis fast nichts mehr übrig ist. Genau dafür ist while da, nicht for.<br><br><b>Deine Aufgabe:</b> Die Variable <code>zahl = 100</code> ist vorgegeben. Zähle mit einer while-Schleife, wie oft du <code>zahl</code> mit Ganzzahldivision (<code>//</code>) durch 2 teilen musst, bis sie 0 ist. Speichere die Anzahl der Teilungen in <code>anzahl_teilungen</code> und gib sie aus.`,
  hints: [
    `Die Bedingung der Schleife ist <code>while zahl > 0:</code> — sie läuft weiter, solange noch etwas übrig ist.`,
    `In jedem Durchlauf passieren zwei Dinge: <code>zahl = zahl // 2</code> und <code>anzahl_teilungen += 1</code>.`,
    `So sieht die Lösung aus:<pre>zahl = 100
anzahl_teilungen = 0
while zahl > 0:
    zahl = zahl // 2
    anzahl_teilungen += 1
print(anzahl_teilungen)</pre>`,
  ] as const,
  solution: `zahl = 100
anzahl_teilungen = 0
while zahl > 0:
    zahl = zahl // 2
    anzahl_teilungen += 1
print(anzahl_teilungen)`,
  syntaxExplanation: `<ul><li><code>while zahl > 0:</code> — der Block läuft weiter, solange zahl noch größer als 0 ist.</li><li><code>zahl = zahl // 2</code> — verändert zahl in jedem Durchlauf, damit die Bedingung irgendwann False wird.</li><li>100 → 50 → 25 → 12 → 6 → 3 → 1 → 0 sind 7 Teilungen bis zahl bei 0 ankommt.</li></ul>`,
  successCriteria: `Die Variable anzahl_teilungen muss am Ende 7 sein (100 lässt sich 7-mal ganzzahlig durch 2 teilen, bis 0 erreicht ist) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { anzahl_teilungen: anzahlTeilungen } = lastResult.variables;
    if (typeof anzahlTeilungen !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "anzahl_teilungen".' };
    }
    if (anzahlTeilungen !== 7) {
      return { ok: false, message: `anzahl_teilungen ist ${anzahlTeilungen}, erwartet wird 7.` };
    }
    if (!lastResult.stdout.includes('7')) {
      return { ok: false, message: 'anzahl_teilungen muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 100 braucht 7 Teilungen bis 0.' };
  },
  distractors: [
    {
      code: `zahl = 100
anzahl_teilungen = 0
while zahl > 1:
    zahl = zahl // 2
    anzahl_teilungen += 1
print(anzahl_teilungen)`,
      reason: 'benutzt "zahl > 1" statt "zahl > 0" als Bedingung — die Schleife hört einen Durchlauf zu früh auf, bevor zahl wirklich bei 0 ankommt',
    },
  ],
};
