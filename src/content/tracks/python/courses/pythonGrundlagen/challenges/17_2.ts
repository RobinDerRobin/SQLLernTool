import type { PythonChallenge } from '../../../types';

export const challenge17_2: PythonChallenge = {
  num: '17.2',
  title: 'Überschreiben oder anhängen: Dateimodi',
  tutorial: `Der zweite Parameter von <code>open(...)</code> steuert, was beim Öffnen mit vorhandenem Inhalt passiert: <ul><li><code>"w"</code> (write) — <b>löscht</b> den bisherigen Inhalt komplett und beginnt leer.</li><li><code>"a"</code> (append) — <b>hängt</b> neuen Inhalt ans Ende an, der alte bleibt erhalten.</li><li><code>"r"</code> (read) — nur lesen, das ist der Standard ohne Angabe.</li><li><code>"r+"</code> — lesen und schreiben in derselben Datei.</li></ul>Der Unterschied zwischen <code>"w"</code> und <code>"a"</code> ist der häufigste Stolperstein: <pre>with open("log.txt", "w") as f:
    f.write("Start\\n")

with open("log.txt", "a") as f:
    f.write("Weiter\\n")</pre>Nach diesen zwei Blöcken enthält <code>log.txt</code> <b>beide</b> Zeilen — hätte der zweite Block ebenfalls <code>"w"</code> verwendet, wäre <code>"Start\\n"</code> beim zweiten Öffnen sofort gelöscht worden, bevor überhaupt etwas geschrieben wird.`,
  task: `<b>Deine Aufgabe:</b> Öffne <code>"log.txt"</code> im Modus <code>"w"</code> und schreibe <code>"Start\\n"</code> hinein. Öffne die Datei danach im Modus <code>"a"</code> und schreibe <code>"Weiter\\n"</code> hinzu (ohne den ersten Eintrag zu löschen). Lies die Datei ein und speichere in <code>zeilen</code>, wie viele Zeilenumbrüche sie enthält. Gib <code>zeilen</code> aus.`,
  hints: [
    `Der erste <code>open(...)</code>-Aufruf braucht den Modus <code>"w"</code>, der zweite <code>"a"</code> — nicht beide <code>"w"</code>.`,
    `<code>"a"</code> hängt an, statt zu löschen — nach beiden Blöcken stehen "Start" und "Weiter" beide in der Datei.`,
    `So sieht die Lösung aus:<pre>with open("log.txt", "w") as f:
    f.write("Start\\n")

with open("log.txt", "a") as f:
    f.write("Weiter\\n")

with open("log.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)</pre>`,
  ] as const,
  solution: `with open("log.txt", "w") as f:
    f.write("Start\\n")

with open("log.txt", "a") as f:
    f.write("Weiter\\n")

with open("log.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)`,
  syntaxExplanation: `<ul><li><code>"w"</code> — schreibt "Start\\n" in eine (zunächst) leere Datei.</li><li><code>"a"</code> — hängt "Weiter\\n" an, ohne "Start\\n" zu löschen.</li><li>Ergebnis: 2 Zeilenumbrüche.</li></ul>`,
  successCriteria: `Die Variable zeilen muss 2 sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { zeilen } = lastResult.variables;
    if (typeof zeilen !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "zeilen".' };
    }
    if (zeilen !== 2) {
      return { ok: false, message: `zeilen ist ${zeilen}, erwartet werden 2 Zeilenumbrüche (Start + Weiter).` };
    }
    if (!lastResult.stdout.includes('2')) {
      return { ok: false, message: 'zeilen muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "w" schreibt Start, "a" hängt Weiter an — macht zusammen 2 Zeilen.' };
  },
  distractors: [
    {
      code: `with open("log.txt", "w") as f:
    f.write("Start\\n")

with open("log.txt", "w") as f:
    f.write("Weiter\\n")

with open("log.txt") as f:
    inhalt = f.read()

zeilen = inhalt.count("\\n")
print(zeilen)`,
      reason: 'verwendet beim zweiten open() ebenfalls "w" statt "a" — das löscht "Start\\n" komplett, bevor "Weiter\\n" geschrieben wird, zeilen wird 1 statt 2',
    },
  ],
};
