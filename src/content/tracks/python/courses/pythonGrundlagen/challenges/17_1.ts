import type { PythonChallenge } from '../../../types';

export const challenge17_1: PythonChallenge = {
  num: '17.1',
  title: 'Mehrfach in dieselbe Datei schreiben',
  tutorial: `<code>f.write(...)</code> lässt sich innerhalb desselben <code>with</code>-Blocks mehrfach aufrufen — jeder Aufruf hängt weiteren Text an das Ende dessen an, was bisher in diesem Block geschrieben wurde: <pre>with open("liste.txt", "w") as f:
    f.write("Milch\\n")
    f.write("Eier\\n")
    f.write("Brot\\n")</pre>Anders als <code>print(...)</code> fügt <code>f.write(...)</code> <b>keinen</b> automatischen Zeilenumbruch hinzu — willst du, dass jeder Eintrag in einer eigenen Zeile steht, musst du <code>"\\n"</code> selbst ans Ende jedes Textes schreiben. Ohne <code>\\n</code> würden alle drei Wörter direkt aneinandergeklebt in einer einzigen Zeile landen.`,
  task: `<b>Deine Aufgabe:</b> Schreibe mit drei aufeinanderfolgenden <code>f.write(...)</code>-Aufrufen (innerhalb desselben <code>with</code>-Blocks) die drei Zeilen <code>"Milch"</code>, <code>"Eier"</code> und <code>"Brot"</code> in eine Datei <code>"liste.txt"</code> — jede mit einem <code>\\n</code> am Ende. Lies die Datei danach wieder ein und speichere in <code>zeilen</code>, wie viele Zeilenumbrüche der Inhalt enthält (<code>inhalt.count("\\n")</code>). Gib <code>zeilen</code> aus.`,
  hints: [
    `Jeder <code>f.write(...)</code>-Aufruf braucht sein eigenes <code>"\\n"</code> am Ende, sonst kleben die Wörter aneinander.`,
    `<code>inhalt.count("\\n")</code> zählt, wie oft der Zeilenumbruch im gelesenen Text vorkommt.`,
    `So sieht die Lösung aus:<pre>with open("liste.txt", "w") as f:
    f.write("Milch\\n")
    f.write("Eier\\n")
    f.write("Brot\\n")

with open("liste.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)</pre>`,
  ] as const,
  solution: `with open("liste.txt", "w") as f:
    f.write("Milch\\n")
    f.write("Eier\\n")
    f.write("Brot\\n")

with open("liste.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)`,
  syntaxExplanation: `<ul><li>Drei <code>f.write(...)</code>-Aufrufe hängen nacheinander an dieselbe Datei an.</li><li><code>"\\n"</code> markiert jeweils das Zeilenende.</li><li><code>inhalt.count("\\n")</code> — 3 Zeilenumbrüche.</li></ul>`,
  successCriteria: `Die Variable zeilen muss 3 sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { zeilen } = lastResult.variables;
    if (typeof zeilen !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "zeilen".' };
    }
    if (zeilen !== 3) {
      return { ok: false, message: `zeilen ist ${zeilen}, erwartet werden 3 Zeilenumbrüche.` };
    }
    if (!lastResult.stdout.includes('3')) {
      return { ok: false, message: 'zeilen muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Drei write()-Aufrufe mit \\n ergeben 3 Zeilenumbrüche.' };
  },
  distractors: [
    {
      code: `with open("liste.txt", "w") as f:
    f.write("Milch")
    f.write("Eier")
    f.write("Brot")

with open("liste.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)`,
      reason: 'vergisst "\\n" bei jedem write()-Aufruf — die drei Wörter kleben zu "MilchEierBrot" zusammen, zeilen wird 0 statt 3',
    },
  ],
};
