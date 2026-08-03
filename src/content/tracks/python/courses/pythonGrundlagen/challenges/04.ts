import type { PythonChallenge } from '../../../types';

export const challenge04: PythonChallenge = {
  num: '04',
  title: 'Text und Zahlen kombinieren: f-Strings',
  tutorial: `Versuchst du, Text und eine Zahl direkt mit <code>+</code> zu verbinden — <code>"Alter: " + 24</code> — meldet Python einen Fehler: <code>+</code> weiß bei einem String und einer Zahl nicht, was gemeint ist. Die Lösung dafür sind <b>f-Strings</b>: ein String mit einem <code>f</code> davor, in dem <code>{...}</code> eine Variable direkt einsetzt — Python kümmert sich automatisch um die Umwandlung in Text:<pre>alter = 24\nprint(f"Ich bin {alter} Jahre alt.")  # Ich bin 24 Jahre alt.</pre>Willst du die Umwandlung stattdessen selbst in der Hand haben, geht das auch explizit mit <code>str(...)</code> (Zahl → Text) bzw. <code>int(...)</code> (Text → Zahl).`,
  task: `Reine Zahlen und einzelne Wörter sind selten das, was am Ende gebraucht wird — meistens willst du einen ganzen, lesbaren Satz ausgeben, der mehrere Werte kombiniert. f-Strings sind dafür das Standardwerkzeug in Python.<br><br><b>Deine Aufgabe:</b> Baue mit den Variablen <code>name</code>, <code>geburtsjahr</code> und <code>alter</code> (wie in 02/03) einen vollständigen Satz mit einem f-String, z. B. 'Anna wurde 2001 geboren und ist 24 Jahre alt.', und gib ihn aus.`,
  hints: [
    `Ein f-String beginnt mit einem <code>f</code> direkt vor den Anführungszeichen: <code>f"..."</code>.`,
    `Innerhalb der Anführungszeichen setzt <code>{variable}</code> den Wert direkt ein, ganz ohne <code>+</code> oder Umwandlung.`,
    `So sieht die Lösung aus:<pre>name = "Anna"\ngeburtsjahr = 2001\nalter = 2025 - geburtsjahr\nprint(f"{name} wurde {geburtsjahr} geboren und ist {alter} Jahre alt.")</pre>`,
  ] as const,
  solution: `name = "Anna"
geburtsjahr = 2001
alter = 2025 - geburtsjahr
print(f"{name} wurde {geburtsjahr} geboren und ist {alter} Jahre alt.")`,
  syntaxExplanation: `<ul><li><code>f"..."</code> — ein f-String; das <code>f</code> vor den Anführungszeichen aktiviert die <code>{...}</code>-Einsetzung.</li><li><code>{name}</code>, <code>{geburtsjahr}</code>, <code>{alter}</code> — jede geschweifte Klammer wird durch den aktuellen Wert der Variable ersetzt.</li><li>Keine manuelle Umwandlung mit <code>str()</code> nötig — der f-String erledigt das automatisch, auch für Zahlen.</li></ul>`,
  successCriteria: `Die Ausgabe muss Name, Geburtsjahr und Alter als Teil eines zusammenhängenden Satzes enthalten (über einen f-String erzeugt).`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { name, geburtsjahr, alter } = lastResult.variables;
    if (typeof name !== 'string' || typeof geburtsjahr !== 'number' || typeof alter !== 'number') {
      return { ok: false, message: 'Es fehlen "name" (Text), "geburtsjahr" und/oder "alter" (Zahlen) als Variablen.' };
    }
    const stdout = lastResult.stdout;
    if (!stdout.includes(name) || !stdout.includes(String(geburtsjahr)) || !stdout.includes(String(alter))) {
      return {
        ok: false,
        message: `Die Ausgabe muss Name, Geburtsjahr und Alter enthalten. Bisherige Ausgabe: ${stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Satz enthält Name, Geburtsjahr und Alter.' };
  },
};
