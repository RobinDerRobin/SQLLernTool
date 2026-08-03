import type { PythonChallenge } from '../../../types';

export const challenge05: PythonChallenge = {
  num: '05',
  title: 'Entscheidungen treffen: if / elif / else',
  tutorial: `Mit <code>if</code> lässt du Python eine Bedingung prüfen und nur dann bestimmten Code ausführen, wenn sie zutrifft (<code>True</code>) — sonst nicht (<code>False</code>). Vergleichsoperatoren wie <code>==</code> (gleich), <code>!=</code> (ungleich), <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code> erzeugen genau so eine Bedingung. <code>elif</code> ('else if') prüft eine weitere Bedingung, falls die vorige nicht zutraf, und <code>else</code> fängt alles Übrige ab:<pre>punkte = 87\nif punkte >= 90:\n    kategorie = "sehr gut"\nelif punkte >= 50:\n    kategorie = "bestanden"\nelse:\n    kategorie = "nicht bestanden"</pre><b>Wichtig, und typisch für Python:</b> Der Code innerhalb eines <code>if</code>/<code>elif</code>/<code>else</code>-Blocks muss eingerückt sein (meist mit 4 Leerzeichen oder einem Tab) — die Einrückung ist hier kein Stilmittel wie in anderen Sprachen, sondern legt fest, welcher Code zu welchem Block gehört. Fehlt sie oder ist sie uneinheitlich, meldet Python einen Fehler. Kennst du <code>CASE WHEN</code> aus SQL: <code>if</code>/<code>elif</code>/<code>else</code> ist genau dieselbe Idee — nur als Programmablauf statt als Teil einer Abfrage.`,
  task: `Kaum ein Programm läuft ohne Entscheidungen: Ist eine Eingabe gültig? Hat jemand bestanden? Ist ein Konto leer? All das sind <code>if</code>-Bedingungen. Hier verzweigst du zum ersten Mal den Ablauf deines Programms, statt ihn einfach nur von oben nach unten abzuarbeiten.<br><br><b>Deine Aufgabe:</b> Die Variable <code>punkte</code> ist bereits mit dem Wert <code>72</code> vorgegeben. Speichere in einer Variable <code>kategorie</code>: 'bestanden', wenn <code>punkte</code> mindestens 50 sind, sonst 'nicht bestanden'. Gib <code>kategorie</code> danach aus.`,
  hints: [
    `Die Struktur ist immer: <code>if bedingung:</code>, dann eingerückt der Code für den zutreffenden Fall, dann <code>else:</code> für alles andere.`,
    `Die Bedingung 'mindestens 50' schreibst du als <code>punkte >= 50</code>. Vergiss den Doppelpunkt <code>:</code> am Ende von <code>if</code>/<code>else</code>-Zeilen nicht.`,
    `So sieht die Lösung aus:<pre>punkte = 72\nif punkte >= 50:\n    kategorie = "bestanden"\nelse:\n    kategorie = "nicht bestanden"\nprint(kategorie)</pre>`,
  ] as const,
  solution: `punkte = 72
if punkte >= 50:
    kategorie = "bestanden"
else:
    kategorie = "nicht bestanden"
print(kategorie)`,
  syntaxExplanation: `<ul><li><code>if punkte >= 50:</code> — die Bedingung; der Doppelpunkt leitet den folgenden, eingerückten Block ein.</li><li>Eingerückte Zeilen darunter gehören zum <code>if</code>, die eingerückten Zeilen nach <code>else:</code> zum Gegenfall.</li><li>Nur einer der beiden Blöcke wird tatsächlich ausgeführt — nie beide.</li></ul>`,
  successCriteria: `Bei punkte = 72 muss kategorie den Wert 'bestanden' haben und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { punkte, kategorie } = lastResult.variables;
    if (typeof punkte !== 'number') {
      return { ok: false, message: 'Die Variable "punkte" fehlt oder wurde überschrieben.' };
    }
    const expected = punkte >= 50 ? 'bestanden' : 'nicht bestanden';
    if (kategorie !== expected) {
      return { ok: false, message: `kategorie ist "${String(kategorie)}", erwartet wird "${expected}" (bei punkte=${punkte}).` };
    }
    if (!lastResult.stdout.includes(expected)) {
      return { ok: false, message: 'kategorie muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: `kategorie korrekt: "${expected}".` };
  },
};
