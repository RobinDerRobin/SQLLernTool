import type { PythonChallenge } from '../../../types';

export const challenge07: PythonChallenge = {
  num: '07',
  title: 'Mehrere Fälle: längere elif-Ketten',
  tutorial: `In Challenge 05 hattest du genau zwei Fälle (<code>if</code> / <code>else</code>). <code>elif</code> lässt sich beliebig oft wiederholen, um mehr als zwei Fälle zu unterscheiden — Python prüft sie der Reihe nach von oben nach unten und nimmt den <i>ersten</i> zutreffenden:<pre>punkte = 78
if punkte >= 90:
    note = "A"
elif punkte >= 80:
    note = "B"
elif punkte >= 70:
    note = "C"
else:
    note = "F"</pre>Wichtig: Weil von oben nach unten geprüft wird und der erste Treffer gewinnt, muss jede Bedingung nur noch den Bereich abdecken, der von den Bedingungen <i>darüber</i> noch nicht abgedeckt wurde.`,
  task: `Zwei Fälle reichen selten — Schulnoten, Versandstatus, Preisstufen: die meisten echten Kategorisierungen haben mehr als zwei Stufen. Hier übst du eine längere <code>elif</code>-Kette.<br><br><b>Deine Aufgabe:</b> Die Variable <code>punkte</code> ist mit dem Wert <code>78</code> vorgegeben. Berechne <code>note</code>: 'A' ab 90 Punkten, 'B' ab 80, 'C' ab 70, sonst 'F'. Gib <code>note</code> aus.`,
  hints: [
    `Jede weitere Stufe ist ein zusätzliches <code>elif bedingung:</code> zwischen dem ersten <code>if</code> und dem abschließenden <code>else</code>.`,
    `Die Reihenfolge muss von der höchsten zur niedrigsten Grenze gehen — sonst würde z. B. <code>&gt;= 70</code> schon zuschlagen, bevor <code>&gt;= 90</code> geprüft wird.`,
    `So sieht die Lösung aus:<pre>punkte = 78
if punkte >= 90:
    note = "A"
elif punkte >= 80:
    note = "B"
elif punkte >= 70:
    note = "C"
else:
    note = "F"
print(note)</pre>`,
  ] as const,
  solution: `punkte = 78
if punkte >= 90:
    note = "A"
elif punkte >= 80:
    note = "B"
elif punkte >= 70:
    note = "C"
else:
    note = "F"
print(note)`,
  syntaxExplanation: `<ul><li>Mehrere <code>elif</code>-Zweige hintereinander decken mehr als zwei Fälle ab.</li><li>Die Bedingungen stehen absteigend (90, dann 80, dann 70) — der erste Treffer gewinnt, spätere Zweige werden dann gar nicht mehr geprüft.</li><li><code>else</code> fängt alles ab, was in keiner der vorigen Bedingungen zutraf (hier: unter 70).</li></ul>`,
  successCriteria: `Bei punkte = 78 muss note den Wert 'C' haben und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { punkte, note } = lastResult.variables;
    if (typeof punkte !== 'number') {
      return { ok: false, message: 'Die Variable "punkte" fehlt oder wurde überschrieben.' };
    }
    const expected = punkte >= 90 ? 'A' : punkte >= 80 ? 'B' : punkte >= 70 ? 'C' : 'F';
    if (note !== expected) {
      return { ok: false, message: `note ist "${String(note)}", erwartet wird "${expected}" (bei punkte=${punkte}).` };
    }
    if (!lastResult.stdout.includes(expected)) {
      return { ok: false, message: 'note muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: `note korrekt: "${expected}".` };
  },
};
