import type { CSharpChallenge } from '../../../types';

export const challenge03: CSharpChallenge = {
  num: '03',
  title: 'Konstanten, var und char',
  tutorial: `Drei weitere Bausteine rund um Variablen: Mit <code>const</code> legst du eine <b>Konstante</b> an — ihr Wert steht bei der Deklaration fest und lässt sich danach nie wieder ändern, ein erneuter Zuweisungsversuch ist ein <b>Compilerfehler</b>, kein Laufzeitfehler: <pre>const int maxPunkte = 100;</pre>Mit <code>var</code> überlässt du dem Compiler, den Typ selbst aus dem zugewiesenen Wert abzuleiten (<b>Typinferenz</b>) — <code>var erreichtePunkte = 82;</code> ist danach genauso fest vom Typ <code>int</code>, als hättest du <code>int erreichtePunkte = 82;</code> geschrieben. <code>var</code> spart nur Schreibarbeit, es ist <b>kein</b> dynamischer Typ wie in manchen anderen Sprachen. Und für ein <b>einzelnes Zeichen</b> gibt es den Typ <code>char</code>, geschrieben mit <b>einfachen</b> Anführungszeichen: <code>char note = 'B';</code> — anders als <code>string</code>, das <b>jede beliebige Länge</b> Text in <b>doppelten</b> Anführungszeichen hält. <code>'B'</code> (char) und <code>"B"</code> (string mit einem Zeichen) sind für den Compiler zwei völlig verschiedene Typen, nicht austauschbar.`,
  task: `<b>Szenario:</b> Eine Prüfung mit maximal 100 Punkten, du hast 82 Punkte erreicht und dafür die Note B bekommen.<br><br><b>Deine Aufgabe:</b> Lege drei Variablen an und gib sie mit je einem <code>Console.WriteLine(...)</code> aus:<br>• <code>maxPunkte</code>: eine <b>Konstante</b> vom Typ <code>int</code> mit Wert <code>100</code><br>• <code>erreichtePunkte</code>: mit <code>var</code> angelegt, Wert <code>82</code><br>• <code>notenBuchstabe</code>: vom Typ <code>char</code>, Wert <code>'B'</code>`,
  hints: [
    `Eine Konstante bekommt das Schlüsselwort <code>const</code> vor dem Typ: <code>const int maxPunkte = 100;</code>.`,
    `Bei <code>var</code> schreibst du keinen Typ hin, der Compiler leitet ihn aus dem Wert ab: <code>var erreichtePunkte = 82;</code>. Bei <code>char</code> stehen einfache Anführungszeichen um genau ein Zeichen: <code>char notenBuchstabe = 'B';</code> — doppelte Anführungszeichen wären ein <code>string</code>, ein anderer Typ.`,
    `So sieht die Lösung aus:<pre>const int maxPunkte = 100;
var erreichtePunkte = 82;
char notenBuchstabe = 'B';
Console.WriteLine(maxPunkte);
Console.WriteLine(erreichtePunkte);
Console.WriteLine(notenBuchstabe);</pre>`,
  ] as const,
  solution: `const int maxPunkte = 100;
var erreichtePunkte = 82;
char notenBuchstabe = 'B';
Console.WriteLine(maxPunkte);
Console.WriteLine(erreichtePunkte);
Console.WriteLine(notenBuchstabe);`,
  syntaxExplanation: `<ul><li><code>const int maxPunkte = 100;</code> — eine Konstante, ihr Wert ist nach der Deklaration unveränderlich.</li><li><code>var erreichtePunkte = 82;</code> — Typinferenz, der Compiler macht daraus intern <code>int erreichtePunkte</code>.</li><li><code>char notenBuchstabe = 'B';</code> — ein einzelnes Zeichen in einfachen Anführungszeichen, kein Text (<code>string</code>) in doppelten.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen, in dieser Reihenfolge: "100", "82", "B".`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').filter((line) => line.length > 0);
    const expected = ['100', '82', 'B'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Konstante, var-Typinferenz und char korrekt angelegt und ausgegeben.' };
  },
  distractors: [
    {
      code: `const int maxPunkte = 100;
maxPunkte = 90;
var erreichtePunkte = 82;
char notenBuchstabe = 'B';
Console.WriteLine(maxPunkte);
Console.WriteLine(erreichtePunkte);
Console.WriteLine(notenBuchstabe);`,
      reason: 'versucht, die Konstante maxPunkte nach der Deklaration erneut zu beschreiben — das ist ein Compilerfehler (CS0131), weil const-Werte nach der Initialisierung unveränderlich sind',
    },
    {
      code: `const int maxPunkte = 100;
var erreichtePunkte = 82;
char notenBuchstabe = "B";
Console.WriteLine(maxPunkte);
Console.WriteLine(erreichtePunkte);
Console.WriteLine(notenBuchstabe);`,
      reason: 'schreibt notenBuchstabe in doppelten statt einfachen Anführungszeichen — "B" ist ein string, kein char, der Compiler lehnt die Zuweisung an eine char-Variable ab (CS0029)',
    },
  ],
};
