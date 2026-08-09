import type { PythonChallenge } from '../../../types';

export const challenge15_1: PythonChallenge = {
  num: '15.1',
  title: 'Verschiedene Fehler gezielt abfangen',
  tutorial: `Ein <code>try</code> kann mehrere <code>except</code>-Blöcke haben — für jeden Fehlertyp, den du unterschiedlich behandeln willst: <pre>try:
    ...
except KeyError:
    ...
except ValueError:
    ...</pre>Python prüft die <code>except</code>-Blöcke der Reihe nach und springt in den ersten, dessen Fehlertyp passt. Wichtige eingebaute Fehlertypen: <code>ValueError</code> (ein Wert hat die falsche Form, z. B. <code>int("abc")</code>), <code>TypeError</code> (falscher Datentyp für eine Operation), <code>KeyError</code> (Dict-Schlüssel existiert nicht) und <code>ZeroDivisionError</code> (Division durch 0). Gezielt nach Typ zu unterscheiden ist genauer als ein einzelnes <code>except</code>, das alles abfängt — du kannst auf jeden Fehler passend reagieren, statt sie alle gleich zu behandeln.`,
  task: `<b>Deine Aufgabe:</b> Gegeben sind <code>eintraege = {"a": "1", "b": "zwei"}</code> und <code>schluessel_liste = ["a", "b", "x"]</code>. Gehe mit einer Schleife über <code>schluessel_liste</code>, lies für jeden Schlüssel den Wert aus <code>eintraege</code> und wandle ihn mit <code>int(...)</code> in eine Zahl um. Fange <code>KeyError</code> ab (Schlüssel fehlt in <code>eintraege</code>) und hänge in diesem Fall <code>-1</code> an eine Liste <code>ergebnisse</code> an. Fange <code>ValueError</code> ab (Wert lässt sich nicht in eine Zahl umwandeln) und hänge dann <code>-2</code> an. Bei Erfolg hänge die umgewandelte Zahl an. Gib <code>ergebnisse</code> aus.`,
  hints: [
    `Zwei <code>except</code>-Blöcke hintereinander: <code>except KeyError:</code> und <code>except ValueError:</code>, jeweils mit eigenem Fallback-Wert.`,
    `<code>eintraege[schluessel]</code> löst <code>KeyError</code> für <code>"x"</code> aus; <code>int(eintraege[schluessel])</code> löst <code>ValueError</code> für <code>"zwei"</code> aus.`,
    `So sieht die Lösung aus:<pre>eintraege = {"a": "1", "b": "zwei"}
schluessel_liste = ["a", "b", "x"]
ergebnisse = []
for schluessel in schluessel_liste:
    try:
        wert = eintraege[schluessel]
        zahl = int(wert)
        ergebnisse.append(zahl)
    except KeyError:
        ergebnisse.append(-1)
    except ValueError:
        ergebnisse.append(-2)
print(ergebnisse)</pre>`,
  ] as const,
  solution: `eintraege = {"a": "1", "b": "zwei"}
schluessel_liste = ["a", "b", "x"]
ergebnisse = []
for schluessel in schluessel_liste:
    try:
        wert = eintraege[schluessel]
        zahl = int(wert)
        ergebnisse.append(zahl)
    except KeyError:
        ergebnisse.append(-1)
    except ValueError:
        ergebnisse.append(-2)
print(ergebnisse)`,
  syntaxExplanation: `<ul><li><code>"a"</code>: Wert "1" existiert und ist gültig → <code>1</code>.</li><li><code>"b"</code>: Wert "zwei" existiert, aber <code>int("zwei")</code> schlägt fehl → <code>ValueError</code> → <code>-2</code>.</li><li><code>"x"</code>: kein Eintrag in <code>eintraege</code> → <code>KeyError</code> → <code>-1</code>.</li></ul>`,
  successCriteria: `ergebnisse muss [1, -2, -1] sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnisse } = lastResult.variables;
    if (!Array.isArray(ergebnisse)) {
      return { ok: false, message: 'Es fehlt eine Listen-Variable "ergebnisse".' };
    }
    const expected = [1, -2, -1];
    const matches = ergebnisse.length === expected.length && expected.every((v, i) => ergebnisse[i] === v);
    if (!matches) {
      return { ok: false, message: `ergebnisse ist ${JSON.stringify(ergebnisse)}, erwartet wird [1, -2, -1].` };
    }
    if (!lastResult.stdout.includes('-1') || !lastResult.stdout.includes('-2')) {
      return { ok: false, message: 'ergebnisse muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: "a" gelingt (1), "b" scheitert an int() (-2), "x" fehlt im Dict (-1).' };
  },
  distractors: [
    {
      code: `eintraege = {"a": "1", "b": "zwei"}
schluessel_liste = ["a", "b", "x"]
ergebnisse = []
for schluessel in schluessel_liste:
    try:
        wert = eintraege[schluessel]
        zahl = int(wert)
        ergebnisse.append(zahl)
    except KeyError:
        ergebnisse.append(-1)
print(ergebnisse)`,
      reason: 'vergisst den except ValueError-Block — bei Schlüssel "b" schlägt int("zwei") fehl, der Fehler wird nicht abgefangen und beendet das Programm, bevor ergebnisse fertig aufgebaut und ausgegeben ist',
    },
  ],
};
