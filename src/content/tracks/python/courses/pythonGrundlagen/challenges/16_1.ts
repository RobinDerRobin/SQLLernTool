import type { PythonChallenge } from '../../../types';

export const challenge16_1: PythonChallenge = {
  num: '16.1',
  title: 'Nur das Nötige holen: from ... import',
  tutorial: `Statt ein ganzes Modul zu importieren und alles über den Modulnamen anzusprechen (<code>math.sqrt(...)</code>), kannst du mit <code>from ... import ...</code> gezielt einzelne Namen direkt herausholen: <pre>from math import sqrt

sqrt(16)   # 4.0 — kein "math." mehr nötig</pre>Der entscheidende Unterschied: Nach <code>from math import sqrt</code> ist der Name <code>math</code> selbst <b>nicht</b> verfügbar — nur <code>sqrt</code> direkt. Ein Aufruf wie <code>math.sqrt(...)</code> würde hier einen <code>NameError</code> auslösen, weil <code>math</code> gar nicht importiert wurde, nur eine einzelne Funktion daraus.`,
  task: `<b>Deine Aufgabe:</b> Importiere mit <code>from math import sqrt</code> nur die Funktion <code>sqrt</code> aus dem <code>math</code>-Modul. Berechne <code>wurzel = sqrt(25)</code> — ruf die Funktion direkt auf, ohne <code>math.</code> davor. Gib <code>wurzel</code> aus.`,
  hints: [
    `<code>from math import sqrt</code> holt nur die Funktion selbst, nicht das ganze Modul.`,
    `Danach heißt es <code>sqrt(25)</code>, nicht <code>math.sqrt(25)</code> — der Name <code>math</code> existiert in diesem Skript gar nicht.`,
    `So sieht die Lösung aus:<pre>from math import sqrt

wurzel = sqrt(25)
print(wurzel)</pre>`,
  ] as const,
  solution: `from math import sqrt

wurzel = sqrt(25)
print(wurzel)`,
  syntaxExplanation: `<ul><li><code>from math import sqrt</code> — holt nur die Funktion sqrt direkt in den eigenen Namensraum.</li><li><code>sqrt(25)</code> — direkter Aufruf ohne Modulnamen, liefert <code>5.0</code>.</li></ul>`,
  successCriteria: `Die Variable wurzel muss 5.0 sein (Quadratwurzel von 25) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { wurzel } = lastResult.variables;
    if (typeof wurzel !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "wurzel" — wurde sqrt korrekt importiert und aufgerufen?' };
    }
    if (wurzel !== 5) {
      return { ok: false, message: `wurzel ist ${wurzel}, erwartet wird 5.0 (Quadratwurzel von 25).` };
    }
    if (!lastResult.stdout.includes('5')) {
      return { ok: false, message: 'wurzel muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Die Quadratwurzel von 25 ist 5.0.' };
  },
  distractors: [
    {
      code: `from math import sqrt

wurzel = math.sqrt(25)
print(wurzel)`,
      reason: 'ruft trotz "from math import sqrt" noch math.sqrt(...) auf — der Name math selbst wurde nie importiert, nur sqrt direkt, das löst einen echten NameError aus',
    },
  ],
};
