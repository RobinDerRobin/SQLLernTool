import type { PythonChallenge } from '../../../types';

export const challenge02: PythonChallenge = {
  num: '02',
  title: 'Variablen: Werte merken',
  tutorial: `Eine <b>Variable</b> ist ein benannter Speicherplatz für einen Wert — wie eine beschriftete Box, in die du etwas hineinlegst. Mit <code>=</code> weist du einer Variable einen Wert zu: <code>alter = 25</code> legt eine Variable namens <code>alter</code> an und speichert die Zahl 25 darin. Text-Werte (<b>str</b>, für 'string') brauchen Anführungszeichen, Ganzzahlen (<b>int</b>, für 'integer') nicht: <code>name = "Anna"</code> gegenüber <code>alter = 25</code>. Eine Variable kannst du danach überall verwenden, wo sonst ihr Wert stünde — auch in <code>print(...)</code>. Trennst du mehrere Werte in einem <code>print()</code>-Aufruf mit Komma, fügt Python automatisch ein Leerzeichen dazwischen ein:<pre>name = "Anna"\nalter = 25\nprint(name, alter)  # gibt aus: Anna 25</pre>`,
  task: `Variablen sind das Gedächtnis eines Programms — ohne sie könntest du keinen Wert über mehr als eine Zeile hinweg benutzen. Fast jedes Programm, das du je schreiben wirst, beginnt damit, Eingaben oder Zwischenergebnisse in Variablen zu speichern.<br><br><b>Deine Aufgabe:</b> Speichere einen (auch erfundenen) Namen in einer Variable <code>name</code> und ein Geburtsjahr in einer Variable <code>geburtsjahr</code>, und gib beide mit einem einzigen <code>print(...)</code>-Aufruf aus.`,
  hints: [
    `Zuweisung funktioniert immer als <code>variablenname = wert</code> — der Name links, der Wert rechts vom Gleichheitszeichen.`,
    `Text braucht Anführungszeichen (<code>name = "Anna"</code>), eine Ganzzahl nicht (<code>geburtsjahr = 2001</code>).`,
    `So sieht die Lösung aus:<pre>name = "Anna"\ngeburtsjahr = 2001\nprint(name, geburtsjahr)</pre>`,
  ] as const,
  solution: `name = "Anna"
geburtsjahr = 2001
print(name, geburtsjahr)`,
  syntaxExplanation: `<ul><li><code>name = "Anna"</code> — legt eine Textvariable an (str).</li><li><code>geburtsjahr = 2001</code> — legt eine Ganzzahl-Variable an (int), ohne Anführungszeichen.</li><li><code>print(name, geburtsjahr)</code> — gibt beide Werte in einer Zeile aus, durch ein automatisches Leerzeichen getrennt.</li></ul>`,
  successCriteria: `Es müssen zwei Variablen <code>name</code> (Text) und <code>geburtsjahr</code> (Ganzzahl) existieren, und beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { name, geburtsjahr } = lastResult.variables;
    if (typeof name !== 'string' || !name.trim()) {
      return { ok: false, message: 'Es fehlt eine Textvariable namens "name" mit einem nicht-leeren Wert.' };
    }
    if (typeof geburtsjahr !== 'number' || !Number.isInteger(geburtsjahr)) {
      return { ok: false, message: 'Es fehlt eine Ganzzahl-Variable namens "geburtsjahr".' };
    }
    if (!lastResult.stdout.includes(name) || !lastResult.stdout.includes(String(geburtsjahr))) {
      return { ok: false, message: 'Beide Variablen müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: `name="${name}", geburtsjahr=${geburtsjahr} korrekt gespeichert und ausgegeben.` };
  },
};
