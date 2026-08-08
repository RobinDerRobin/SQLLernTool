import type { PythonChallenge } from '../../../types';

export const challenge17: PythonChallenge = {
  num: '17',
  title: 'In eine Datei schreiben und wieder lesen',
  tutorial: `Mit <code>open(...)</code> öffnest du eine Datei — als zweites Argument gibst du den <b>Modus</b> an: <code>"w"</code> zum Schreiben (write), ohne Angabe wird standardmäßig zum Lesen (read) geöffnet. Der saubere Weg, eine Datei zu öffnen, ist mit <code>with</code>: <pre>with open("notizen.txt", "w") as f:
    f.write("Hallo Welt")</pre><code>with</code> ist ein <b>Context Manager</b> — er schließt die Datei automatisch, sobald der eingerückte Block endet, auch wenn währenddessen ein Fehler auftritt. Ohne <code>with</code> müsstest du <code>f.close()</code> selbst und zuverlässig aufrufen, was leicht vergessen wird. Lesen funktioniert genauso: <pre>with open("notizen.txt") as f:
    inhalt = f.read()</pre>`,
  task: `<b>Deine Aufgabe:</b> Schreibe mit <code>with open("notizen.txt", "w") as f:</code> den Text <code>"Hallo Welt"</code> in eine Datei. Öffne die Datei danach erneut mit <code>with open("notizen.txt") as f:</code> zum Lesen und speichere den Inhalt in <code>inhalt</code>. Gib <code>inhalt</code> aus.`,
  hints: [
    `Zwei getrennte <code>with</code>-Blöcke: einer zum Schreiben (Modus <code>"w"</code>), einer zum Lesen (ohne Modus-Angabe).`,
    `<code>f.write("Hallo Welt")</code> im ersten Block, <code>inhalt = f.read()</code> im zweiten.`,
    `So sieht die Lösung aus:<pre>with open("notizen.txt", "w") as f:
    f.write("Hallo Welt")

with open("notizen.txt") as f:
    inhalt = f.read()

print(inhalt)</pre>`,
  ] as const,
  solution: `with open("notizen.txt", "w") as f:
    f.write("Hallo Welt")

with open("notizen.txt") as f:
    inhalt = f.read()

print(inhalt)`,
  syntaxExplanation: `<ul><li><code>open("notizen.txt", "w")</code> — öffnet zum Schreiben, erstellt die Datei falls nötig.</li><li><code>with ... as f:</code> — schließt die Datei automatisch am Blockende.</li><li><code>f.read()</code> — liest den kompletten Inhalt als String: <code>"Hallo Welt"</code>.</li></ul>`,
  successCriteria: `Die Variable inhalt muss "Hallo Welt" sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { inhalt } = lastResult.variables;
    if (typeof inhalt !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "inhalt" — wurde die Datei geschrieben und wieder gelesen?' };
    }
    if (inhalt !== 'Hallo Welt') {
      return { ok: false, message: `inhalt ist "${inhalt}", erwartet wird "Hallo Welt".` };
    }
    if (!lastResult.stdout.includes('Hallo Welt')) {
      return { ok: false, message: 'inhalt muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "Hallo Welt" wurde geschrieben und wieder eingelesen.' };
  },
  distractors: [
    {
      code: `with open("diese_datei_gibt_es_nicht.txt") as f:
    inhalt = f.read()

print(inhalt)`,
      reason: 'versucht eine Datei zu lesen, die nie geschrieben wurde — das löst einen echten FileNotFoundError aus',
    },
  ],
};
