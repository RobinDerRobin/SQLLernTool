import type { CSharpChallenge } from '../../../types';

export const challenge02: CSharpChallenge = {
  num: '02',
  title: 'Typisierte Variablen: int, double, string, bool',
  tutorial: `Anders als in manchen anderen Sprachen musst du in C# bei jeder Variable ihren <b>Typ</b> mit angeben — er steht danach für immer fest (<b>statische Typisierung</b>): <pre>int alter = 25;
double preis = 19.99;
string name = "Anna";
bool istAktiv = true;</pre><code>int</code> ist für Ganzzahlen, <code>double</code> für Kommazahlen, <code>string</code> für Text (in doppelten Anführungszeichen), <code>bool</code> für <code>true</code>/<code>false</code>. Wichtig bei <code>int</code>: Division zwischen zwei <code>int</code>-Werten <b>rundet immer ab</b>, egal was danach mit dem Ergebnis passiert — <code>7 / 2</code> ergibt <code>3</code>, nicht 3.5. Willst du das genaue Ergebnis, muss mindestens einer der beiden Werte ein <code>double</code> sein: <code>7.0 / 2</code> ergibt <code>3.5</code>.`,
  task: `<b>Szenario:</b> 7 Äpfel sollen unter 2 Personen aufgeteilt werden.<br><br><b>Deine Aufgabe:</b> Lege vier Variablen an und gib sie mit je einem <code>Console.WriteLine(...)</code> aus:<br>• <code>proPersonGanzzahl</code> (<code>int</code>): wie viele <b>ganze</b> Äpfel jede Person bekommt (<code>7 / 2</code>)<br>• <code>proPersonGenau</code> (<code>double</code>): der genaue, rechnerische Anteil pro Person (<code>7.0 / 2.0</code>)<br>• <code>beschreibung</code> (<code>string</code>): der Text <code>"Apfelverteilung"</code><br>• <code>bleibtApfelUebrig</code> (<code>bool</code>): <code>true</code>, weil sich 7 Äpfel nicht ohne Rest auf 2 Personen aufteilen lassen`,
  hints: [
    `Jede Variable braucht ihren Typ vor dem Namen: <code>int proPersonGanzzahl = 7 / 2;</code>.`,
    `Für die genaue Division brauchst du mindestens einen <code>double</code>-Operanden — <code>7.0 / 2.0</code>, nicht <code>7 / 2</code> (das würde bei einer int-Division bleiben und zu 3 statt 3.5 abrunden, selbst wenn du das Ergebnis in eine double-Variable schreibst).`,
    `So sieht die Lösung aus:<pre>int proPersonGanzzahl = 7 / 2;
double proPersonGenau = 7.0 / 2.0;
string beschreibung = "Apfelverteilung";
bool bleibtApfelUebrig = true;
Console.WriteLine(proPersonGanzzahl);
Console.WriteLine(proPersonGenau);
Console.WriteLine(beschreibung);
Console.WriteLine(bleibtApfelUebrig);</pre>`,
  ] as const,
  solution: `int proPersonGanzzahl = 7 / 2;
double proPersonGenau = 7.0 / 2.0;
string beschreibung = "Apfelverteilung";
bool bleibtApfelUebrig = true;
Console.WriteLine(proPersonGanzzahl);
Console.WriteLine(proPersonGenau);
Console.WriteLine(beschreibung);
Console.WriteLine(bleibtApfelUebrig);`,
  syntaxExplanation: `<ul><li><code>int proPersonGanzzahl = 7 / 2;</code> — int-Division rundet ab: 3, nicht 3.5.</li><li><code>double proPersonGenau = 7.0 / 2.0;</code> — mit <code>.0</code> wird daraus eine echte Kommazahl-Division: 3.5.</li><li><code>string beschreibung = "Apfelverteilung";</code> — Text in doppelten Anführungszeichen.</li><li><code>bool bleibtApfelUebrig = true;</code> — 7 ist ungerade, also bleibt bei 2 Personen ein Apfel übrig.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau vier Zeilen bestehen, in dieser Reihenfolge: "3", "3.5", "Apfelverteilung", "True".`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').filter((line) => line.length > 0);
    const expected = ['3', '3.5', 'Apfelverteilung', 'True'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Alle vier Variablen korrekt typisiert, berechnet und ausgegeben.' };
  },
  distractors: [
    {
      code: `int proPersonGanzzahl = 7 / 2;
double proPersonGenau = 7 / 2;
string beschreibung = "Apfelverteilung";
bool bleibtApfelUebrig = true;
Console.WriteLine(proPersonGanzzahl);
Console.WriteLine(proPersonGenau);
Console.WriteLine(beschreibung);
Console.WriteLine(bleibtApfelUebrig);`,
      reason: 'vergisst .0 bei der genauen Division — 7 / 2 bleibt eine int-Division (rundet zu 3 ab), bevor das Ergebnis erst danach in die double-Variable proPersonGenau geschrieben wird, also 3 statt der erwarteten 3.5',
    },
    {
      code: `int proPersonGanzzahl = 7 / 2;
double proPersonGenau = 7.0 / 2.0;
string beschreibung = "Apfelverteilung";
bool bleibtApfelUebrig = false;
Console.WriteLine(proPersonGanzzahl);
Console.WriteLine(proPersonGenau);
Console.WriteLine(beschreibung);
Console.WriteLine(bleibtApfelUebrig);`,
      reason: 'setzt bleibtApfelUebrig fälschlich auf false — 7 Äpfel lassen sich nicht ohne Rest auf 2 Personen aufteilen (7 ist ungerade), der korrekte Wert ist true',
    },
  ],
};
