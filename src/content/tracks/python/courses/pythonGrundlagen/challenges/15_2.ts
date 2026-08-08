import type { PythonChallenge } from '../../../types';

export const challenge15_2: PythonChallenge = {
  num: '15.2',
  title: 'Immer ausführen: finally, und nur bei Erfolg: else',
  tutorial: `Ein <code>try</code> kann noch zwei weitere Blöcke haben: <pre>try:
    zahl = int(zahl_text)
except ValueError:
    ergebnis = -1
else:
    ergebnis = zahl * 2
finally:
    versuche = 1</pre><code>else</code> läuft nur, wenn der <code>try</code>-Block <b>ohne</b> Fehler durchgelaufen ist — bei einem abgefangenen Fehler wird er übersprungen. <code>finally</code> läuft dagegen <b>immer</b>, egal ob ein Fehler auftrat oder nicht — typisch für Aufräumarbeiten (z. B. "Anzahl Versuche" mitzählen), die in jedem Fall passieren sollen.`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>zahl_text = "abc"</code> (kein gültiger Zahlentext). Versuche <code>zahl = int(zahl_text)</code> in einem <code>try</code>-Block. Fange <code>ValueError</code> ab und setze dabei <code>ergebnis = -1</code>. Setze in einem <code>else</code>-Block <code>ergebnis = zahl * 2</code> (läuft hier nicht, da der Fehler auftritt). Setze in einem <code>finally</code>-Block <code>versuche = 1</code>. Gib <code>ergebnis</code> und <code>versuche</code> aus.`,
  hints: [
    `<code>except</code>, <code>else</code> und <code>finally</code> stehen alle auf derselben Einrückungsebene wie <code>try</code>, direkt hintereinander.`,
    `Da <code>"abc"</code> ungültig ist, läuft der except-Block (ergebnis = -1) und der else-Block wird übersprungen — finally läuft trotzdem.`,
    `So sieht die Lösung aus:<pre>zahl_text = "abc"
try:
    zahl = int(zahl_text)
except ValueError:
    ergebnis = -1
else:
    ergebnis = zahl * 2
finally:
    versuche = 1
print(ergebnis, versuche)</pre>`,
  ] as const,
  solution: `zahl_text = "abc"
try:
    zahl = int(zahl_text)
except ValueError:
    ergebnis = -1
else:
    ergebnis = zahl * 2
finally:
    versuche = 1
print(ergebnis, versuche)`,
  syntaxExplanation: `<ul><li><code>int("abc")</code> löst <code>ValueError</code> aus → <code>except</code> läuft, <code>ergebnis = -1</code>.</li><li><code>else</code> wird übersprungen, weil ein Fehler auftrat.</li><li><code>finally</code> läuft in jedem Fall: <code>versuche = 1</code>.</li></ul>`,
  successCriteria: `ergebnis muss -1 sein, versuche muss 1 sein, beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis, versuche } = lastResult.variables;
    if (ergebnis !== -1) {
      return { ok: false, message: `ergebnis ist ${JSON.stringify(ergebnis)}, erwartet wird -1.` };
    }
    if (versuche !== 1) {
      return { ok: false, message: `versuche ist ${JSON.stringify(versuche)}, erwartet wird 1 — wurde der finally-Block gesetzt?` };
    }
    if (!lastResult.stdout.includes('-1') || !lastResult.stdout.includes('1')) {
      return { ok: false, message: 'ergebnis und versuche müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: except setzt ergebnis auf -1, finally setzt versuche auf 1.' };
  },
  distractors: [
    {
      code: `zahl_text = "abc"
try:
    zahl = int(zahl_text)
except ValueError:
    ergebnis = -1
else:
    ergebnis = zahl * 2
print(ergebnis, versuche)`,
      reason: 'lässt den finally-Block komplett weg — versuche wird nirgendwo mehr gesetzt, das print() am Ende löst deshalb einen echten NameError aus',
    },
  ],
};
