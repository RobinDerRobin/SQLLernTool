import type { PythonChallenge } from '../../../types';

export const challenge20_2: PythonChallenge = {
  num: '20.2',
  title: 'Direkt in der Bedingung: if my_liste:',
  tutorial: `Weil jeder Wert einen Wahrheitswert hat (siehe letztes Kapitel), kannst du ihn direkt in einer <code>if</code>-Bedingung verwenden — ganz ohne <code>bool(...)</code> oder einen Vergleich zu schreiben: <pre>einkaufsliste = []
if einkaufsliste:
    print("hat Einträge")
else:
    print("ist leer")</pre><code>if einkaufsliste:</code> prüft dabei <b>nicht</b>, ob <code>einkaufsliste</code> gleich <code>True</code> ist — Listen sind nie gleich <code>True</code> — sondern nutzt die Truthiness des Werts selbst: eine leere Liste ist falsy, geht also in den <code>else</code>-Zweig. Das ist der übliche, "pythonische" Weg, auf einen leeren Container zu prüfen — kürzer als <code>if len(einkaufsliste) > 0:</code>.`,
  task: `<b>Deine Aufgabe:</b> Gegeben sind zwei Listen: <code>einkaufsliste = []</code> (leer) und <code>warenkorb = ["Apfel", "Brot"]</code> (nicht leer). Prüfe für jede Liste direkt mit <code>if liste:</code> (ohne <code>len()</code> oder Vergleich mit <code>True</code>), ob sie Einträge hat. Speichere für <code>einkaufsliste</code> das Ergebnis ("hat Einträge" oder "ist leer") in <code>status1</code>, für <code>warenkorb</code> in <code>status2</code>. Gib beide aus.`,
  hints: [
    `<code>if einkaufsliste:</code> reicht — eine leere Liste ist falsy und geht automatisch in den else-Zweig.`,
    `Kein <code>len(einkaufsliste) > 0</code> und kein <code>einkaufsliste == True</code> nötig — beides wäre unnötig umständlich (und der Vergleich mit True liefert bei einer Liste sogar immer False).`,
    `So sieht die Lösung aus:<pre>einkaufsliste = []
warenkorb = ["Apfel", "Brot"]

if einkaufsliste:
    status1 = "hat Einträge"
else:
    status1 = "ist leer"

if warenkorb:
    status2 = "hat Einträge"
else:
    status2 = "ist leer"

print(status1, status2)</pre>`,
  ] as const,
  solution: `einkaufsliste = []
warenkorb = ["Apfel", "Brot"]

if einkaufsliste:
    status1 = "hat Einträge"
else:
    status1 = "ist leer"

if warenkorb:
    status2 = "hat Einträge"
else:
    status2 = "ist leer"

print(status1, status2)`,
  syntaxExplanation: `<ul><li><code>if einkaufsliste:</code> — eine leere Liste ist falsy, der else-Zweig läuft.</li><li><code>if warenkorb:</code> — eine nicht-leere Liste ist truthy, der if-Zweig läuft.</li></ul>`,
  successCriteria: `status1 muss "ist leer" sein (leere Liste), status2 muss "hat Einträge" sein (nicht-leere Liste) — beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { status1, status2 } = lastResult.variables;
    if (typeof status1 !== 'string' || typeof status2 !== 'string') {
      return { ok: false, message: 'Es fehlen die Text-Variablen "status1" und/oder "status2".' };
    }
    if (status1 !== 'ist leer' || status2 !== 'hat Einträge') {
      return {
        ok: false,
        message: `status1 ist "${status1}", status2 ist "${status2}" — erwartet wird "ist leer" (leere Liste) und "hat Einträge" (nicht-leere Liste).`,
      };
    }
    return { ok: true, message: 'Korrekt: Truthiness direkt in der Bedingung genutzt, ohne bool() oder Vergleich.' };
  },
  distractors: [
    {
      code: `einkaufsliste = []
warenkorb = ["Apfel", "Brot"]

if einkaufsliste == True:
    status1 = "hat Einträge"
else:
    status1 = "ist leer"

if warenkorb == True:
    status2 = "hat Einträge"
else:
    status2 = "ist leer"

print(status1, status2)`,
      reason: 'vergleicht die Liste direkt mit True statt ihre Truthiness zu nutzen — eine Liste ist niemals gleich True (auch eine nicht-leere nicht), beide Bedingungen sind deshalb immer False, status2 wird fälschlich "ist leer" statt "hat Einträge"',
    },
  ],
};
