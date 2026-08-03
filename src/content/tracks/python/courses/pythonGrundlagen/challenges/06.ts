import type { PythonChallenge } from '../../../types';

export const challenge06: PythonChallenge = {
  num: '06',
  title: 'Logik verknüpfen: and / or / not',
  tutorial: `Bedingungen lassen sich kombinieren. <code>and</code> ergibt <code>True</code> nur, wenn <i>beide</i> Seiten <code>True</code> sind. <code>or</code> ergibt <code>True</code>, wenn <i>mindestens eine</i> Seite <code>True</code> ist. <code>not</code> dreht einen Wahrheitswert um — aus <code>True</code> wird <code>False</code> und umgekehrt. Diese drei lassen sich beliebig kombinieren:<pre>hat_ticket = True
ist_gesperrt = False
darf_rein = hat_ticket and not ist_gesperrt
print(darf_rein)  # True</pre>Genau wie bei Rechenoperatoren gibt es hier eine Reihenfolge (<code>not</code> vor <code>and</code> vor <code>or</code>), aber im Zweifel helfen Klammern <code>(...)</code>, um die Absicht klar zu machen.`,
  task: `Echte Bedingungen bestehen selten aus nur einem Vergleich — meistens müssen mehrere Dinge gleichzeitig zutreffen (oder eines von mehreren). <code>and</code>/<code>or</code>/<code>not</code> sind das Werkzeug dafür.<br><br><b>Deine Aufgabe:</b> Speichere <code>hat_ticket = True</code> und <code>ist_gesperrt = False</code>. Berechne <code>darf_rein</code> als <code>hat_ticket and not ist_gesperrt</code> und gib das Ergebnis aus.`,
  hints: [
    `<code>and</code> verlangt, dass beide Seiten <code>True</code> sind. <code>not</code> steht direkt vor dem Wert, den es umdreht.`,
    `Die Variable <code>darf_rein</code> speichert das Ergebnis des kompletten Ausdrucks — nicht nur einen der beiden Werte.`,
    `So sieht die Lösung aus:<pre>hat_ticket = True
ist_gesperrt = False
darf_rein = hat_ticket and not ist_gesperrt
print(darf_rein)</pre>`,
  ] as const,
  solution: `hat_ticket = True
ist_gesperrt = False
darf_rein = hat_ticket and not ist_gesperrt
print(darf_rein)`,
  syntaxExplanation: `<ul><li><code>not ist_gesperrt</code> — dreht <code>False</code> zu <code>True</code> um.</li><li><code>hat_ticket and (not ist_gesperrt)</code> — beide Seiten müssen <code>True</code> sein, damit <code>darf_rein</code> es auch ist.</li></ul>`,
  successCriteria: `Es muss eine Variable <code>darf_rein</code> mit dem Wert <code>True</code> existieren, berechnet aus <code>hat_ticket and not ist_gesperrt</code>, und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { hat_ticket: hatTicket, ist_gesperrt: istGesperrt, darf_rein: darfRein } = lastResult.variables;
    if (typeof hatTicket !== 'boolean' || typeof istGesperrt !== 'boolean') {
      return { ok: false, message: 'Es fehlen "hat_ticket" und/oder "ist_gesperrt" als True/False-Variablen.' };
    }
    if (typeof darfRein !== 'boolean') {
      return { ok: false, message: 'Es fehlt eine Variable "darf_rein" mit einem True/False-Wert.' };
    }
    const expected = hatTicket && !istGesperrt;
    if (darfRein !== expected) {
      return { ok: false, message: `darf_rein ist ${String(darfRein)}, erwartet wird ${String(expected)}.` };
    }
    // Python's print() renders a bool as "True"/"False" (capitalized), unlike JS's "true"/"false".
    const expectedPythonText = expected ? 'True' : 'False';
    if (!lastResult.stdout.includes(expectedPythonText)) {
      return { ok: false, message: 'darf_rein muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: `darf_rein korrekt: ${expectedPythonText}.` };
  },
};
