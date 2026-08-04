import type { PythonChallenge } from '../../../types';

export const challenge11_5: PythonChallenge = {
  num: '11.5',
  title: 'Eine Python-Eigenheit: else nach einer Schleife',
  tutorial: `Eine Besonderheit, die es so nur in Python gibt: <code>for</code> und <code>while</code> können einen eigenen <code>else</code>-Block haben. Der läuft aber nicht "sonst" im üblichen Sinn — er läuft genau dann, wenn die Schleife <b>ganz normal zu Ende</b> gelaufen ist, <b>ohne</b> durch <code>break</code> unterbrochen worden zu sein: <pre>for i in range(2, 6):
    if i == 10:
        break
else:
    print("nie durch break verlassen")
# gibt aus: "nie durch break verlassen", weil 10 nie vorkam</pre>Das ist besonders nützlich für Suchen: Läuft die Schleife komplett durch, ohne dass der gesuchte Fall per break gefunden wurde, weißt du im else-Block sicher: "nicht gefunden".`,
  task: `Ein klassischer Einsatz für <code>else</code> nach einer Schleife: prüfen, ob eine Zahl eine Primzahl ist (durch keine Zahl außer sich selbst und 1 teilbar). Findest du einen Teiler, brichst du sofort mit break ab. Findest du <b>keinen</b>, läuft die Schleife komplett durch — genau das ist der Fall für das else.<br><br><b>Deine Aufgabe:</b> Die Variable <code>zahl = 15</code> ist vorgegeben. Prüfe mit einer for-Schleife (Teiler von 2 bis <code>zahl - 1</code>) und einem <code>else</code>-Block, ob <code>zahl</code> eine Primzahl ist. Speichere <code>True</code>/<code>False</code> in <code>ist_prim</code> und gib es aus.`,
  hints: [
    `Die Schleife läuft über <code>range(2, zahl)</code> — findest du einen Teiler (<code>zahl % teiler == 0</code>), setze <code>ist_prim = False</code> und brich mit <code>break</code> sofort ab.`,
    `Der <code>else</code>-Block gehört zur Schleife (gleiche Einrückung wie <code>for</code>), nicht zum <code>if</code> darin — er läuft nur, wenn kein break passiert ist, und setzt dann <code>ist_prim = True</code>.`,
    `So sieht die Lösung aus:<pre>zahl = 15
ist_prim = None
for teiler in range(2, zahl):
    if zahl % teiler == 0:
        ist_prim = False
        break
else:
    ist_prim = True
print(ist_prim)</pre>`,
  ] as const,
  solution: `zahl = 15
ist_prim = None
for teiler in range(2, zahl):
    if zahl % teiler == 0:
        ist_prim = False
        break
else:
    ist_prim = True
print(ist_prim)`,
  syntaxExplanation: `<ul><li><code>for teiler in range(2, zahl):</code> — probiert jeden möglichen Teiler von 2 bis zahl - 1.</li><li><code>ist_prim = False; break</code> — sobald ein Teiler passt, steht fest: keine Primzahl, weiteres Suchen ist unnötig.</li><li><code>else: ist_prim = True</code> — läuft nur, wenn die Schleife nie per break verlassen wurde, also kein Teiler gefunden wurde.</li><li>15 = 3 * 5, also wird bei teiler = 3 abgebrochen: ist_prim wird False, der else-Block läuft nicht.</li></ul>`,
  successCriteria: `Die Variable ist_prim muss am Ende False sein (15 ist keine Primzahl, da 3 * 5 = 15) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ist_prim: istPrim } = lastResult.variables;
    if (typeof istPrim !== 'boolean') {
      return { ok: false, message: 'Es fehlt eine True/False-Variable "ist_prim".' };
    }
    if (istPrim !== false) {
      return { ok: false, message: `ist_prim ist ${String(istPrim)}, erwartet wird False (15 = 3 * 5 ist keine Primzahl).` };
    }
    if (!lastResult.stdout.includes('False')) {
      return { ok: false, message: 'ist_prim muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 15 ist keine Primzahl, ist_prim ist False.' };
  },
  distractors: [
    {
      code: `zahl = 15
ist_prim = None
for teiler in range(2, zahl):
    if zahl % teiler == 0:
        ist_prim = False
else:
    ist_prim = True
print(ist_prim)`,
      reason: 'vergisst das break nach dem Finden eines Teilers — die Schleife läuft trotzdem komplett durch, deshalb feuert der else-Block danach immer und überschreibt ist_prim fälschlich auf True',
    },
  ],
};
