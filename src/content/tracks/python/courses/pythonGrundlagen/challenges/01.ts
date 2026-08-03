import type { PythonChallenge } from '../../../types';

export const challenge01: PythonChallenge = {
  num: '01',
  title: 'Dein erstes Programm: print()',
  tutorial: `Ein Computerprogramm ist nichts anderes als eine Liste von Anweisungen, die der Computer der Reihe nach ausführt — von oben nach unten, eine Zeile nach der anderen. Die einfachste und wichtigste Anweisung in Python ist <code>print(...)</code>: Sie gibt etwas aus, das du dann siehst. Text (in der Programmierung <b>String</b> genannt) muss dabei in Anführungszeichen stehen, egal ob einfache <code>'so'</code> oder doppelte <code>"so"</code> — Python behandelt beide gleich. Eine Zeile, die mit <code>#</code> beginnt, ist ein <b>Kommentar</b>: Python führt sie nicht aus, sie ist nur eine Notiz für Menschen.<pre>print("Hallo!")  # gibt Hallo! aus\n# Diese Zeile passiert nichts.</pre>`,
  task: `Jedes Programm beginnt mit dem einfachsten Baustein überhaupt: etwas auszugeben. Das ist die Grundlage für alles Weitere — jedes Ergebnis, jede Fehlermeldung, jede Rückmeldung deines Programms an dich läuft am Ende über genau diesen Befehl.<br><br><b>Deine Aufgabe:</b> Schreibe zwei <code>print(...)</code>-Anweisungen, die genau diese zwei Zeilen ausgeben:<br><code>Hallo, Python!</code><br><code>Das ist meine erste Codezeile.</code>`,
  hints: [
    `Jede Textausgabe braucht <code>print(...)</code> mit dem Text in Anführungszeichen dazwischen.`,
    `Für zwei Ausgabezeilen brauchst du auch zwei <code>print(...)</code>-Aufrufe, jeweils in einer eigenen Zeile.`,
    `So sieht die Lösung aus:<pre>print("Hallo, Python!")\nprint("Das ist meine erste Codezeile.")</pre>`,
  ] as const,
  solution: `print("Hallo, Python!")
print("Das ist meine erste Codezeile.")`,
  syntaxExplanation: `<ul><li><code>print(...)</code> — gibt den Text zwischen den Klammern aus.</li><li>Jeder <code>print()</code>-Aufruf erzeugt automatisch eine neue Zeile in der Ausgabe.</li><li>Text steht in Anführungszeichen — ohne sie würde Python versuchen, <code>Hallo</code> als Namen (Variable) zu verstehen, den es nicht gibt.</li></ul>`,
  successCriteria: `Die Ausgabe muss die Zeilen 'Hallo, Python!' und 'Das ist meine erste Codezeile.' enthalten (jede auf einer eigenen Zeile).`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const hasFirst = lastResult.stdout.includes('Hallo, Python!');
    const hasSecond = lastResult.stdout.includes('Das ist meine erste Codezeile.');
    if (!hasFirst || !hasSecond) {
      return {
        ok: false,
        message: `Die Ausgabe muss beide vorgegebenen Zeilen enthalten. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Beide Zeilen korrekt ausgegeben.' };
  },
};
