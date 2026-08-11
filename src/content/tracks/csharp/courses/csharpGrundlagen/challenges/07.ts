import type { CSharpChallenge } from '../../../types';

export const challenge07: CSharpChallenge = {
  num: '07',
  title: 'Kontrollfluss: if/else, switch, Ternär, Pattern-Matching',
  tutorial: `Mit <code>if</code>/<code>else</code> verzweigst du basierend auf einer Bedingung — der Block danach steht in geschweiften Klammern <code>{ }</code>. Zwischen <code>if</code> und <code>else</code> kannst du beliebig viele <code>else if</code> einschieben, die der Reihe nach geprüft werden; die <b>erste</b> zutreffende gewinnt, alle danach werden übersprungen — die Reihenfolge ist deshalb wichtig, besonders bei sich überschneidenden Bereichen. Der <b>Ternär-Operator</b> <code>bedingung ? a : b</code> ist ein kompakter <code>if</code>/<code>else</code> als <b>Ausdruck</b>, der direkt einen Wert liefert. Ein klassisches <code>switch</code>/<code>case</code> prüft einen Wert gegen mehrere feste Fälle — jeder nicht-leere <code>case</code>-Block braucht ein <code>break;</code> (oder <code>return</code>/<code>throw</code>) am Ende, sonst lehnt der Compiler das Fallthrough zum nächsten <code>case</code> ab (anders als in C/C++, wo es stillschweigend durchläuft). Ein <b>leerer</b> <code>case</code> darf direkt in den nächsten fallen, das ist erlaubt und nützlich, um mehrere Werte demselben Ergebnis zuzuordnen. Moderne C#-<b>Pattern-Matching-<code>switch</code>-Ausdrücke</b> sind kompakter: <code>wert switch { muster1 =&gt; ergebnis1, muster2 =&gt; ergebnis2, _ =&gt; standard }</code> liefert direkt einen Wert, inklusive <b>relationaler Muster</b> wie <code>&gt;= 90</code>.`,
  task: `<b>Szenario:</b> Ein Notenrechner für <code>int punkte = 78;</code> (0–100 Punkte).<br><br><b>Deine Aufgabe:</b><br>• <code>kategorie</code>: per <code>if</code>/<code>else if</code>/<code>else</code>-Kette — <code>"Ausgezeichnet"</code> ab 90, <code>"Gut"</code> ab 75, <code>"Bestanden"</code> ab 50, sonst <code>"Nicht bestanden"</code> (in dieser Reihenfolge geprüft!)<br>• <code>bestanden</code>: per Ternär-Operator — <code>true</code>, wenn <code>punkte &gt;= 50</code>, sonst <code>false</code><br>• <code>stufeText</code>: klassisches <code>switch</code> auf <code>int stufe = punkte / 10;</code> — <code>"Spitzenklasse"</code> bei 9 oder 10, <code>"Obere Mittelklasse"</code> bei 7 oder 8, sonst <code>"Unterdurchschnitt"</code><br>• <code>buchstabenNote</code>: per Pattern-Matching-<code>switch</code>-Ausdruck auf <code>punkte</code> mit denselben Grenzen wie <code>kategorie</code> — <code>"A"</code>, <code>"B"</code>, <code>"C"</code>, sonst <code>"D"</code><br>Gib alle vier mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Die <code>if</code>/<code>else if</code>-Kette muss von der <b>höchsten</b> Grenze zur niedrigsten prüfen (<code>&gt;= 90</code> zuerst, dann <code>&gt;= 75</code>, dann <code>&gt;= 50</code>) — sonst würde z. B. 78 schon bei der ersten, zu großzügigen Bedingung landen.`,
    `Klassisches <code>switch</code>: <code>case 10: case 9: ...; break;</code> lässt einen leeren <code>case 10</code> in den <code>case 9</code>-Block fallen — aber jeder Block mit eigenem Code (wie <code>case 9</code> selbst) braucht sein eigenes <code>break;</code>. Pattern-Matching-<code>switch</code>: <code>punkte switch { &gt;= 90 =&gt; "A", ... , _ =&gt; "D" }</code>, ohne <code>case</code>-Wort und ohne <code>break</code>.`,
    `So sieht die Lösung aus:<pre>int punkte = 78;
string kategorie;
if (punkte >= 90)
{
    kategorie = "Ausgezeichnet";
}
else if (punkte >= 75)
{
    kategorie = "Gut";
}
else if (punkte >= 50)
{
    kategorie = "Bestanden";
}
else
{
    kategorie = "Nicht bestanden";
}
bool bestanden = punkte >= 50 ? true : false;
int stufe = punkte / 10;
string stufeText;
switch (stufe)
{
    case 10:
    case 9:
        stufeText = "Spitzenklasse";
        break;
    case 8:
    case 7:
        stufeText = "Obere Mittelklasse";
        break;
    default:
        stufeText = "Unterdurchschnitt";
        break;
}
string buchstabenNote = punkte switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "D"
};
Console.WriteLine(kategorie);
Console.WriteLine(bestanden);
Console.WriteLine(stufeText);
Console.WriteLine(buchstabenNote);</pre>`,
  ] as const,
  solution: `int punkte = 78;
string kategorie;
if (punkte >= 90)
{
    kategorie = "Ausgezeichnet";
}
else if (punkte >= 75)
{
    kategorie = "Gut";
}
else if (punkte >= 50)
{
    kategorie = "Bestanden";
}
else
{
    kategorie = "Nicht bestanden";
}
bool bestanden = punkte >= 50 ? true : false;
int stufe = punkte / 10;
string stufeText;
switch (stufe)
{
    case 10:
    case 9:
        stufeText = "Spitzenklasse";
        break;
    case 8:
    case 7:
        stufeText = "Obere Mittelklasse";
        break;
    default:
        stufeText = "Unterdurchschnitt";
        break;
}
string buchstabenNote = punkte switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "D"
};
Console.WriteLine(kategorie);
Console.WriteLine(bestanden);
Console.WriteLine(stufeText);
Console.WriteLine(buchstabenNote);`,
  syntaxExplanation: `<ul><li><code>if (punkte >= 90) {...} else if (punkte >= 75) {...} ...</code> — geprüft von oben nach unten, die erste zutreffende Bedingung gewinnt: bei 78 ist das <code>&gt;= 75</code>, also "Gut".</li><li><code>punkte >= 50 ? true : false</code> — Ternär-Operator, liefert direkt einen <code>bool</code>-Wert als Ausdruck.</li><li><code>switch (stufe) { case 10: case 9: ...; break; ... }</code> — stufe ist 7 (78/10, int-Division schneidet ab), trifft <code>case 7</code> im <code>"Obere Mittelklasse"</code>-Block.</li><li><code>punkte switch { >= 90 => "A", ... }</code> — moderner Pattern-Matching-Ausdruck mit relationalen Mustern, liefert direkt "B".</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau vier Zeilen bestehen: "Gut", "True", "Obere Mittelklasse" und "B", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Gut', 'True', 'Obere Mittelklasse', 'B'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'if/else-Kette, Ternär-Operator, switch und Pattern-Matching-switch korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int punkte = 78;
string kategorie;
if (punkte >= 50)
{
    kategorie = "Bestanden";
}
else if (punkte >= 75)
{
    kategorie = "Gut";
}
else if (punkte >= 90)
{
    kategorie = "Ausgezeichnet";
}
else
{
    kategorie = "Nicht bestanden";
}
bool bestanden = punkte >= 50 ? true : false;
int stufe = punkte / 10;
string stufeText;
switch (stufe)
{
    case 10:
    case 9:
        stufeText = "Spitzenklasse";
        break;
    case 8:
    case 7:
        stufeText = "Obere Mittelklasse";
        break;
    default:
        stufeText = "Unterdurchschnitt";
        break;
}
string buchstabenNote = punkte switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "D"
};
Console.WriteLine(kategorie);
Console.WriteLine(bestanden);
Console.WriteLine(stufeText);
Console.WriteLine(buchstabenNote);`,
      reason: 'prüft die Bedingungen in aufsteigender statt absteigender Reihenfolge (>= 50 zuerst) — 78 erfüllt sofort die erste, zu großzügige Bedingung, kategorie wird fälschlich "Bestanden" statt "Gut"',
    },
    {
      code: `int punkte = 78;
string kategorie;
if (punkte >= 90)
{
    kategorie = "Ausgezeichnet";
}
else if (punkte >= 75)
{
    kategorie = "Gut";
}
else if (punkte >= 50)
{
    kategorie = "Bestanden";
}
else
{
    kategorie = "Nicht bestanden";
}
bool bestanden = punkte >= 50 ? true : false;
int stufe = punkte / 10;
string stufeText;
switch (stufe)
{
    case 10:
    case 9:
        stufeText = "Spitzenklasse";
        break;
    case 8:
    case 7:
        stufeText = "Obere Mittelklasse";
    default:
        stufeText = "Unterdurchschnitt";
        break;
}
string buchstabenNote = punkte switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "D"
};
Console.WriteLine(kategorie);
Console.WriteLine(bestanden);
Console.WriteLine(stufeText);
Console.WriteLine(buchstabenNote);`,
      reason: 'vergisst das break; nach dem "Obere Mittelklasse"-Block — der Compiler lehnt dieses Fallthrough zum nächsten case ab (CS0163), anders als in C/C++ ist das in C# kein stillschweigender Laufzeitfehler',
    },
    {
      code: `int punkte = 78;
string kategorie;
if (punkte >= 90)
{
    kategorie = "Ausgezeichnet";
}
else if (punkte >= 75)
{
    kategorie = "Gut";
}
else if (punkte >= 50)
{
    kategorie = "Bestanden";
}
else
{
    kategorie = "Nicht bestanden";
}
bool bestanden = punkte >= 50 ? false : true;
int stufe = punkte / 10;
string stufeText;
switch (stufe)
{
    case 10:
    case 9:
        stufeText = "Spitzenklasse";
        break;
    case 8:
    case 7:
        stufeText = "Obere Mittelklasse";
        break;
    default:
        stufeText = "Unterdurchschnitt";
        break;
}
string buchstabenNote = punkte switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "D"
};
Console.WriteLine(kategorie);
Console.WriteLine(bestanden);
Console.WriteLine(stufeText);
Console.WriteLine(buchstabenNote);`,
      reason: 'vertauscht die beiden Zweige des Ternär-Operators (false : true statt true : false) — bestanden wird fälschlich False statt True, obwohl 78 >= 50 zutrifft',
    },
  ],
};
