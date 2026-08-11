import type { CSharpChallenge } from '../../../types';

export const challenge05: CSharpChallenge = {
  num: '05',
  title: 'Strings: Verketten, Interpolation, Methoden',
  tutorial: `Zwei Strings verbindest du mit <code>+</code> — genau wie bei Zahlen, nur dass hier Text angehängt wird: <code>"Anna" + " " + "Schmidt"</code> ergibt <code>"Anna Schmidt"</code> (das Leerzeichen dazwischen musst du selbst einfügen, C# tut das nicht automatisch). Bequemer ist <b>String-Interpolation</b>: ein <code>$</code> vor dem String erlaubt <code>{ausdruck}</code>-Platzhalter mitten im Text, die zur Laufzeit eingesetzt werden — <code>$"Hallo, {name}!"</code> statt <code>"Hallo, " + name + "!"</code>. Strings haben außerdem eingebaute <b>Methoden</b> (Dot-Syntax, wie <code>Console.WriteLine</code>): <code>.Length</code> ist eine <b>Eigenschaft</b> (kein <code>()</code> nötig) für die Zeichenanzahl, <code>.ToUpper()</code> und <code>.ToLower()</code> liefern eine komplett groß- bzw. kleingeschriebene Kopie zurück — der ursprüngliche String selbst ändert sich nie, Strings sind in C# unveränderlich (<b>immutable</b>).`,
  task: `<b>Szenario:</b> Vor- und Nachname sollen zu einem vollen Namen zusammengesetzt und begrüßt werden.<br><br><b>Deine Aufgabe:</b> Lege <code>string vorname = "Anna";</code> und <code>string nachname = "Schmidt";</code> an, dann:<br>• <code>vollerName</code>: <code>vorname</code> und <code>nachname</code> mit <code>+</code> verkettet, mit einem Leerzeichen dazwischen<br>• <code>begruessung</code>: per String-Interpolation zusammengesetzt: <code>"Hallo, {vollerName}! Du hast {Zeichenanzahl von vollerName} Zeichen im Namen."</code><br>• <code>grossgeschrieben</code>: <code>vollerName</code> komplett großgeschrieben<br>Gib alle drei mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Verkettung: <code>string vollerName = vorname + " " + nachname;</code> — ohne das <code>" "</code> dazwischen fehlt das Leerzeichen im Ergebnis.`,
    `Interpolation braucht ein <code>$</code> direkt vor dem öffnenden Anführungszeichen, Platzhalter in <code>{...}</code>: <code>$"Hallo, {vollerName}! Du hast {vollerName.Length} Zeichen im Namen."</code>. Für die Großschreibung gibt es <code>.ToUpper()</code> — mit Klammern, weil es eine Methode ist, anders als <code>.Length</code>.`,
    `So sieht die Lösung aus:<pre>string vorname = "Anna";
string nachname = "Schmidt";
string vollerName = vorname + " " + nachname;
string begruessung = $"Hallo, {vollerName}! Du hast {vollerName.Length} Zeichen im Namen.";
string grossgeschrieben = vollerName.ToUpper();
Console.WriteLine(vollerName);
Console.WriteLine(begruessung);
Console.WriteLine(grossgeschrieben);</pre>`,
  ] as const,
  solution: `string vorname = "Anna";
string nachname = "Schmidt";
string vollerName = vorname + " " + nachname;
string begruessung = $"Hallo, {vollerName}! Du hast {vollerName.Length} Zeichen im Namen.";
string grossgeschrieben = vollerName.ToUpper();
Console.WriteLine(vollerName);
Console.WriteLine(begruessung);
Console.WriteLine(grossgeschrieben);`,
  syntaxExplanation: `<ul><li><code>vorname + " " + nachname</code> — Verkettung mit <code>+</code>, das Leerzeichen dazwischen ist ein eigenes String-Literal.</li><li><code>$"...{vollerName}...{vollerName.Length}..."</code> — String-Interpolation: das <code>$</code> aktiviert <code>{...}</code>-Platzhalter, die zur Laufzeit ausgewertet werden.</li><li><code>vollerName.Length</code> — eine Eigenschaft (kein <code>()</code>), liefert die Zeichenanzahl: 12.</li><li><code>vollerName.ToUpper()</code> — eine Methode (mit <code>()</code>), liefert eine neue, komplett großgeschriebene Kopie zurück.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "Anna Schmidt", "Hallo, Anna Schmidt! Du hast 12 Zeichen im Namen." und "ANNA SCHMIDT", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').filter((line) => line.length > 0);
    const expected = ['Anna Schmidt', 'Hallo, Anna Schmidt! Du hast 12 Zeichen im Namen.', 'ANNA SCHMIDT'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Verkettung, Interpolation und String-Methoden korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `string vorname = "Anna";
string nachname = "Schmidt";
string vollerName = vorname + nachname;
string begruessung = $"Hallo, {vollerName}! Du hast {vollerName.Length} Zeichen im Namen.";
string grossgeschrieben = vollerName.ToUpper();
Console.WriteLine(vollerName);
Console.WriteLine(begruessung);
Console.WriteLine(grossgeschrieben);`,
      reason: 'vergisst das Leerzeichen bei der Verkettung — vollerName wird "AnnaSchmidt" statt "Anna Schmidt", wodurch sich alle drei Ausgabezeilen falsch berechnen (u. a. Length 11 statt 12)',
    },
    {
      code: `string vorname = "Anna";
string nachname = "Schmidt";
string vollerName = vorname + " " + nachname;
string begruessung = $"Hallo, {vollerName}! Du hast {vollerName.Length} Zeichen im Namen.";
string grossgeschrieben = vollerName.ToLower();
Console.WriteLine(vollerName);
Console.WriteLine(begruessung);
Console.WriteLine(grossgeschrieben);`,
      reason: 'nutzt ToLower() statt ToUpper() — grossgeschrieben wird fälschlich "anna schmidt" statt "ANNA SCHMIDT"',
    },
  ],
};
