import type { PythonChallenge } from '../../../types';

export const challenge03: PythonChallenge = {
  num: '03',
  title: 'Rechnen mit Zahlen',
  tutorial: `Python kennt die üblichen Rechenoperatoren: <code>+</code> (Addition), <code>-</code> (Subtraktion), <code>*</code> (Multiplikation), <code>/</code> (Division) sowie zwei weniger bekannte: <code>//</code> (ganzzahlige Division, rundet immer ab) und <code>%</code> (Modulo, der Rest einer Division). Wichtig: <code>/</code> liefert in Python <i>immer</i> eine Kommazahl (<b>float</b>) zurück, auch wenn das Ergebnis glatt aufgeht — <code>10 / 2</code> ergibt <code>5.0</code>, nicht <code>5</code>. <code>//</code> dagegen bleibt bei zwei Ganzzahlen eine Ganzzahl. Wie in der Mathematik gilt Punkt-vor-Strich, und Klammern <code>(...)</code> erzwingen eine bestimmte Reihenfolge:<pre>print(2 + 3 * 4)    # 14 (zuerst *, dann +)\nprint((2 + 3) * 4)  # 20 (Klammer zuerst)</pre>`,
  task: `Rechnen ist neben Ausgeben und Speichern der dritte Grundbaustein: Ohne Berechnungen bleiben Variablen nur Rohdaten. Hier verbindest du Variablen (wie in Challenge 02) mit einer echten Rechenoperation.<br><br><b>Deine Aufgabe:</b> Speichere <code>geburtsjahr</code> und <code>aktuelles_jahr = 2025</code> in Variablen, berechne daraus das Alter in einer Variable <code>alter</code> und gib es aus.`,
  hints: [
    `Das Alter ist die Differenz aus <code>aktuelles_jahr</code> und <code>geburtsjahr</code> — subtrahieren mit <code>-</code>.`,
    `Speichere das Ergebnis der Rechnung in einer neuen Variable, bevor du sie ausgibst: <code>alter = aktuelles_jahr - geburtsjahr</code>.`,
    `So sieht die Lösung aus:<pre>geburtsjahr = 2001\naktuelles_jahr = 2025\nalter = aktuelles_jahr - geburtsjahr\nprint(alter)</pre>`,
  ] as const,
  solution: `geburtsjahr = 2001
aktuelles_jahr = 2025
alter = aktuelles_jahr - geburtsjahr
print(alter)`,
  syntaxExplanation: `<ul><li><code>aktuelles_jahr - geburtsjahr</code> — eine ganz normale Subtraktion zweier Variablen.</li><li><code>alter = ...</code> — das Ergebnis wird in einer neuen Variable gespeichert, nicht nur direkt ausgegeben.</li><li><code>print(alter)</code> — gibt das gespeicherte Ergebnis aus.</li></ul>`,
  successCriteria: `Es muss eine Variable <code>alter</code> existieren, deren Wert genau der Differenz aus <code>aktuelles_jahr</code> und <code>geburtsjahr</code> entspricht.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { geburtsjahr, aktuelles_jahr: aktuellesJahr, alter } = lastResult.variables;
    if (typeof geburtsjahr !== 'number' || typeof aktuellesJahr !== 'number') {
      return { ok: false, message: 'Es fehlen die Variablen "geburtsjahr" und/oder "aktuelles_jahr".' };
    }
    if (typeof alter !== 'number') {
      return { ok: false, message: 'Es fehlt eine Variable "alter" mit dem berechneten Alter.' };
    }
    const expected = aktuellesJahr - geburtsjahr;
    if (alter !== expected) {
      return { ok: false, message: `alter ist ${alter}, erwartet wird ${aktuellesJahr} - ${geburtsjahr} = ${expected}.` };
    }
    return { ok: true, message: `Alter korrekt berechnet: ${alter}.` };
  },
};
