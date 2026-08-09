import type { PythonChallenge } from '../../../types';

export const challenge13_4: PythonChallenge = {
  num: '13.4',
  title: 'Werte über Schlüssel statt Index: Dictionaries',
  tutorial: `Ein <b>Dictionary</b> (kurz "Dict") speichert Werte nicht über einen numerischen Index, sondern über einen frei wählbaren <b>Schlüssel</b> — geschrieben als <code>{schlüssel: wert, ...}</code>: <pre>preise = {"Apfel": 2, "Birne": 3}
preise["Apfel"]          # 2 — Zugriff über den Schlüssel
preise["Kiwi"] = 4        # neuer Schlüssel wird hinzugefügt
preise["Apfel"] = 2.5     # bestehender Schlüssel wird überschrieben</pre>Ein Zugriff auf einen nicht existierenden Schlüssel (<code>preise["Mango"]</code>, falls "Mango" nie gesetzt wurde) löst einen <code>KeyError</code> aus — Schlüssel sind außerdem exakt (Groß-/Kleinschreibung zählt: <code>"Apfel"</code> und <code>"apfel"</code> sind zwei verschiedene Schlüssel).`,
  task: `<b>Deine Aufgabe:</b> Beginne mit <code>preise = {"Apfel": 2, "Birne": 3}</code>. Füge einen neuen Schlüssel <code>"Kiwi"</code> mit Wert <code>4</code> hinzu. Aktualisiere den Wert von <code>"Apfel"</code> auf <code>2.5</code>. Berechne <code>gesamt</code> als Summe aller drei Preise und gib <code>gesamt</code> aus.`,
  hints: [
    `Ein neuer Schlüssel wird einfach per Zuweisung hinzugefügt: <code>preise["Kiwi"] = 4</code>. Ein bestehender wird genauso überschrieben.`,
    `Nach den Änderungen: Apfel=2.5, Birne=3, Kiwi=4 — <code>gesamt = preise["Apfel"] + preise["Birne"] + preise["Kiwi"]</code>.`,
    `So sieht die Lösung aus:<pre>preise = {"Apfel": 2, "Birne": 3}
preise["Kiwi"] = 4
preise["Apfel"] = 2.5
gesamt = preise["Apfel"] + preise["Birne"] + preise["Kiwi"]
print(gesamt)</pre>`,
  ] as const,
  solution: `preise = {"Apfel": 2, "Birne": 3}
preise["Kiwi"] = 4
preise["Apfel"] = 2.5
gesamt = preise["Apfel"] + preise["Birne"] + preise["Kiwi"]
print(gesamt)`,
  syntaxExplanation: `<ul><li><code>preise["Kiwi"] = 4</code> — neuer Schlüssel, wird hinzugefügt.</li><li><code>preise["Apfel"] = 2.5</code> — bestehender Schlüssel, wird überschrieben (nicht dupliziert).</li><li>2.5 + 3 + 4 = <code>9.5</code>.</li></ul>`,
  successCriteria: `Die Variable gesamt muss 9.5 sein (2.5 + 3 + 4) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gesamt } = lastResult.variables;
    if (typeof gesamt !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "gesamt".' };
    }
    if (gesamt !== 9.5) {
      return { ok: false, message: `gesamt ist ${gesamt}, erwartet wird 9.5 (2.5 + 3 + 4).` };
    }
    if (!lastResult.stdout.includes('9.5')) {
      return { ok: false, message: 'gesamt muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 2.5 (Apfel) + 3 (Birne) + 4 (Kiwi) = 9.5.' };
  },
  distractors: [
    {
      code: `preise = {"Apfel": 2, "Birne": 3}
preise["Kiwi"] = 4
preise["apfel"] = 2.5
gesamt = preise["Apfel"] + preise["Birne"] + preise["Kiwi"]
print(gesamt)`,
      reason: 'schreibt beim Aktualisieren "apfel" klein statt "Apfel" — das legt versehentlich einen ganz neuen, vierten Schlüssel an, "Apfel" bleibt bei 2, gesamt wird 9 statt 9.5',
    },
  ],
};
