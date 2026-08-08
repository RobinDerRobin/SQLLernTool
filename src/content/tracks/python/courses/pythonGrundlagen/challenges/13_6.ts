import type { PythonChallenge } from '../../../types';

export const challenge13_6: PythonChallenge = {
  num: '13.6',
  title: 'Nur eindeutige Werte: Sets',
  tutorial: `Ein <b>Set</b> sieht aus wie ein Dict ohne Werte — geschweifte Klammern, aber nur einzelne Elemente statt Schlüssel-Wert-Paaren: <pre>farben = {"rot", "blau", "rot", "gruen"}</pre>Der entscheidende Unterschied zu einer Liste: Ein Set enthält jeden Wert nur <b>einmal</b>. Duplikate werden beim Erstellen automatisch entfernt — aus den vier geschriebenen Werten oben werden nur drei tatsächlich gespeichert, weil <code>"rot"</code> doppelt vorkam. Ein Set hat außerdem keine feste Reihenfolge (anders als eine Liste). <code>len(...)</code> funktioniert wie bei Listen und Dicts auch bei Sets.`,
  task: `<b>Deine Aufgabe:</b> Erstelle ein Set <code>farben = {"rot", "blau", "rot", "gruen"}</code> (bewusst mit "rot" doppelt geschrieben). Speichere in <code>anzahl</code>, wie viele <b>eindeutige</b> Farben tatsächlich im Set landen, und gib <code>anzahl</code> aus.`,
  hints: [
    `Ein Set wird mit geschweiften Klammern geschrieben: <code>farben = {"rot", "blau", "rot", "gruen"}</code>.`,
    `Duplikate zählen nur einmal — <code>len(farben)</code> gibt dir die Anzahl der tatsächlich gespeicherten, eindeutigen Werte.`,
    `So sieht die Lösung aus:<pre>farben = {"rot", "blau", "rot", "gruen"}
anzahl = len(farben)
print(anzahl)</pre>`,
  ] as const,
  solution: `farben = {"rot", "blau", "rot", "gruen"}
anzahl = len(farben)
print(anzahl)`,
  syntaxExplanation: `<ul><li><code>{"rot", "blau", "rot", "gruen"}</code> — ein Set, "rot" wird trotz doppelter Nennung nur einmal gespeichert.</li><li><code>len(farben)</code> — zählt die eindeutigen Elemente: "rot", "blau", "gruen" — also <code>3</code>, nicht 4.</li></ul>`,
  successCriteria: `Die Variable anzahl muss 3 sein (nicht 4 — Duplikate zählen nur einmal) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { anzahl } = lastResult.variables;
    if (typeof anzahl !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "anzahl".' };
    }
    if (anzahl !== 3) {
      return { ok: false, message: `anzahl ist ${anzahl}, erwartet werden 3 eindeutige Farben.` };
    }
    if (!lastResult.stdout.includes('3')) {
      return { ok: false, message: 'anzahl muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "rot" wird trotz doppelter Nennung nur einmal gezählt, macht 3 eindeutige Farben.' };
  },
  distractors: [
    {
      code: `farben = ["rot", "blau", "rot", "gruen"]
anzahl = len(farben)
print(anzahl)`,
      reason: 'verwendet eckige Klammern statt geschweifter — das ist eine Liste, keine Menge, Duplikate bleiben also erhalten und anzahl wird 4 statt 3',
    },
  ],
};
