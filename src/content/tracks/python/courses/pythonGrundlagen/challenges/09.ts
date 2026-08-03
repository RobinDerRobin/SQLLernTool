import type { PythonChallenge } from '../../../types';

export const challenge09: PythonChallenge = {
  num: '09',
  title: 'Typumwandlung: int(), float(), str()',
  tutorial: `Nicht jeder Text sieht nur wie eine Zahl aus — Python behandelt <code>"17"</code> (Text) und <code>17</code> (Zahl) grundsätzlich unterschiedlich, auch wenn sie beim Ausgeben gleich aussehen. Mit <code>int(...)</code> wandelst du einen Text in eine Ganzzahl um, mit <code>float(...)</code> in eine Kommazahl, mit <code>str(...)</code> umgekehrt eine Zahl in Text. Ohne diese Umwandlung lässt sich mit einem Text-'17' nicht rechnen:<pre>alter_text = "17"
# alter_text + 1  --> Fehler! Text und Zahl kann man nicht addieren
alter = int(alter_text)
print(alter + 1)  # 18</pre>Enthält der Text keine gültige Zahl (z. B. <code>int("abc")</code>), meldet Python einen Fehler — die Umwandlung funktioniert nur bei tatsächlich zahlenförmigem Text.`,
  task: `Daten kommen oft als Text an, auch wenn es eigentlich Zahlen sind — aus einer Datei, einer Eingabe, einer Webseite. Um damit zu rechnen, musst du sie zuerst gezielt umwandeln.<br><br><b>Deine Aufgabe:</b> Die Variable <code>alter_text = "17"</code> ist vorgegeben (ein Text!). Wandle sie in eine Zahl <code>alter</code> um, berechne <code>alter_naechstes_jahr</code> (alter + 1), und gib mit einem f-String einen vollständigen Satz mit beiden Werten aus.`,
  hints: [
    `<code>int(alter_text)</code> wandelt den Text in eine Ganzzahl um — erst danach kannst du damit rechnen.`,
    `<code>alter_naechstes_jahr = alter + 1</code> funktioniert nur, wenn <code>alter</code> bereits eine Zahl ist, kein Text mehr.`,
    `So sieht die Lösung aus:<pre>alter_text = "17"
alter = int(alter_text)
alter_naechstes_jahr = alter + 1
print(f"Nächstes Jahr bist du {alter_naechstes_jahr}.")</pre>`,
  ] as const,
  solution: `alter_text = "17"
alter = int(alter_text)
alter_naechstes_jahr = alter + 1
print(f"Nächstes Jahr bist du {alter_naechstes_jahr}.")`,
  syntaxExplanation: `<ul><li><code>int(alter_text)</code> — wandelt den Text "17" in die Zahl 17 um.</li><li><code>alter + 1</code> — funktioniert jetzt, weil alter eine echte Zahl ist, kein Text mehr.</li><li>Der f-String am Ende setzt das berechnete Ergebnis in einen lesbaren Satz ein.</li></ul>`,
  successCriteria: `alter muss die Zahl 17 sein (nicht der Text "17"), alter_naechstes_jahr muss 18 sein, und beides muss in der Ausgabe erscheinen.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { alter_text: alterText, alter, alter_naechstes_jahr: alterNaechstesJahr } = lastResult.variables;
    if (alterText !== '17') {
      return { ok: false, message: 'Die Variable "alter_text" sollte unverändert der Text "17" bleiben.' };
    }
    if (typeof alter !== 'number') {
      return { ok: false, message: '"alter" muss eine echte Zahl sein (mit int() umgewandelt), kein Text.' };
    }
    if (alter !== 17) {
      return { ok: false, message: `alter ist ${alter}, erwartet wird 17.` };
    }
    if (typeof alterNaechstesJahr !== 'number' || alterNaechstesJahr !== 18) {
      return { ok: false, message: `alter_naechstes_jahr ist ${String(alterNaechstesJahr)}, erwartet wird 18.` };
    }
    if (!lastResult.stdout.includes('18')) {
      return { ok: false, message: 'Die Ausgabe muss den berechneten Wert 18 enthalten.' };
    }
    return { ok: true, message: 'Umwandlung und Berechnung korrekt.' };
  },
};
