import type { PythonChallenge } from '../../../types';

export const challenge13_9: PythonChallenge = {
  num: '13.9',
  title: 'Eine Funktion für alle: len()',
  tutorial: `<code>len(...)</code> funktioniert nicht nur bei Strings, sondern einheitlich bei so gut wie jeder Sammlung von Werten — Listen, Dictionaries und Sets eingeschlossen: <pre>len("Katze")                    # 5 — Anzahl Zeichen
len([1, 2, 3, 4])               # 4 — Anzahl Listenelemente
len({"a": 1, "b": 2})           # 2 — Anzahl Schlüssel im Dict
len({"rot", "blau", "gruen"})   # 3 — Anzahl Set-Elemente</pre>Das ist einer der Gründe, warum sich Python-Code über ganz unterschiedliche Datentypen hinweg oft sehr ähnlich liest: Ein und dieselbe Funktion beantwortet für jeden von ihnen dieselbe Frage — "wie viele Elemente sind hier drin?"`,
  task: `<b>Deine Aufgabe:</b> Gegeben sind <code>text = "Katze"</code>, <code>liste = [1, 2, 3, 4]</code> und <code>daten = {"a": 1, "b": 2}</code>. Berechne mit <code>len(...)</code> jeweils die Länge und speichere sie in <code>laenge_text</code>, <code>laenge_liste</code> und <code>laenge_daten</code>. Gib alle drei aus.`,
  hints: [
    `<code>len(...)</code> funktioniert bei Strings, Listen und Dicts genau gleich — einfach den Wert übergeben.`,
    `<code>len(text)</code> zählt Zeichen, <code>len(liste)</code> zählt Elemente, <code>len(daten)</code> zählt Schlüssel (nicht Schlüssel-Wert-Paare separat gezählt).`,
    `So sieht die Lösung aus:<pre>text = "Katze"
liste = [1, 2, 3, 4]
daten = {"a": 1, "b": 2}
laenge_text = len(text)
laenge_liste = len(liste)
laenge_daten = len(daten)
print(laenge_text, laenge_liste, laenge_daten)</pre>`,
  ] as const,
  solution: `text = "Katze"
liste = [1, 2, 3, 4]
daten = {"a": 1, "b": 2}
laenge_text = len(text)
laenge_liste = len(liste)
laenge_daten = len(daten)
print(laenge_text, laenge_liste, laenge_daten)`,
  syntaxExplanation: `<ul><li><code>len(text)</code> — 5 Zeichen.</li><li><code>len(liste)</code> — 4 Elemente.</li><li><code>len(daten)</code> — 2 Schlüssel.</li></ul>`,
  successCriteria: `laenge_text muss 5 sein, laenge_liste muss 4 sein, laenge_daten muss 2 sein, alle drei müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { laenge_text, laenge_liste, laenge_daten } = lastResult.variables;
    if (laenge_text !== 5) {
      return { ok: false, message: `laenge_text ist ${JSON.stringify(laenge_text)}, erwartet wird 5.` };
    }
    if (laenge_liste !== 4) {
      return { ok: false, message: `laenge_liste ist ${JSON.stringify(laenge_liste)}, erwartet wird 4.` };
    }
    if (laenge_daten !== 2) {
      return { ok: false, message: `laenge_daten ist ${JSON.stringify(laenge_daten)}, erwartet wird 2.` };
    }
    if (!lastResult.stdout.includes('5') || !lastResult.stdout.includes('4') || !lastResult.stdout.includes('2')) {
      return { ok: false, message: 'Alle drei Längen müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: len() liefert 5, 4 und 2 für text, liste und daten.' };
  },
  distractors: [
    {
      code: `text = "Katze"
liste = [1, 2, 3, 4]
daten = {"a": 1, "b": 2}
laenge_text = len(text)
laenge_liste = len(daten)
laenge_daten = len(liste)
print(laenge_text, laenge_liste, laenge_daten)`,
      reason: 'vertauscht liste und daten bei der Zuweisung — laenge_liste bekommt die Länge von daten (2) statt liste (4), und umgekehrt',
    },
  ],
};
