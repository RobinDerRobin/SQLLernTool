import type { CSharpChallenge } from '../../../types';

export const challenge10: CSharpChallenge = {
  num: '10',
  title: 'Methoden: Definition, Parameter, Rückgabewert, Rekursion',
  tutorial: `Eine <b>Methode</b> bündelt einen Namen, eine <b>Rückgabetyp</b>-Angabe und einen Rumpf: <code>int Quadrieren(int zahl) { return zahl * zahl; }</code>. <code>return wert;</code> beendet die Methode sofort und liefert <code>wert</code> an die Aufrufstelle zurück — jeder Codepfad einer Methode mit Rückgabetyp <b>muss</b> irgendwann ein <code>return</code> erreichen, sonst meldet der Compiler einen Fehler. Eine Methode kann <b>mehrere typisierte Parameter</b> haben, durch Komma getrennt: <code>int Rechteckflaeche(int breite, int hoehe) { return breite * hoehe; }</code> — beim Aufruf <code>Rechteckflaeche(4, 6)</code> landet <code>4</code> in <code>breite</code> und <code>6</code> in <code>hoehe</code>, in genau dieser Reihenfolge. Eine Methode darf sich auch <b>selbst aufrufen</b> — das nennt sich <b>Rekursion</b>. Damit das nicht endlos weiterläuft, braucht jede Rekursion einen <b>Basisfall</b>, der ohne weiteren Aufruf direkt zurückgibt: <code>if (n &lt;= 1) { return 1; }</code>, davor abgesichert durch ein <code>if</code> aus B6.`,
  task: `<b>Deine Aufgabe:</b> Definiere drei Methoden und rufe sie auf:<br>• <code>Quadrieren(int zahl)</code>: gibt <code>zahl * zahl</code> zurück<br>• <code>Rechteckflaeche(int breite, int hoehe)</code>: gibt <code>breite * hoehe</code> zurück<br>• <code>Fakultaet(int n)</code>: rekursiv — Basisfall <code>n &lt;= 1</code> gibt <code>1</code> zurück, sonst <code>n * Fakultaet(n - 1)</code><br><br>Rufe sie mit <code>Quadrieren(5)</code>, <code>Rechteckflaeche(4, 6)</code> und <code>Fakultaet(5)</code> auf, speichere die drei Ergebnisse in Variablen und gib sie mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Eine Methode mit Rückgabewert: <code>int Quadrieren(int zahl) { return zahl * zahl; }</code> — der Rückgabetyp (<code>int</code>) steht vor dem Namen, <code>return</code> beendet die Methode und liefert den Wert zurück. Mehrere Parameter werden durch Komma getrennt: <code>int Rechteckflaeche(int breite, int hoehe) { return breite * hoehe; }</code>.`,
    `Rekursion braucht immer zuerst den Basisfall, <b>bevor</b> der rekursive Aufruf kommt: <code>if (n &lt;= 1) { return 1; }</code> — erst danach <code>return n * Fakultaet(n - 1);</code>. Ohne diese Reihenfolge (oder ohne Basisfall) würde die Methode sich unendlich oft selbst aufrufen.`,
    `So sieht die Lösung aus:<pre>int Quadrieren(int zahl)
{
    return zahl * zahl;
}

int Rechteckflaeche(int breite, int hoehe)
{
    return breite * hoehe;
}

int Fakultaet(int n)
{
    if (n <= 1)
    {
        return 1;
    }
    return n * Fakultaet(n - 1);
}

int quadrat = Quadrieren(5);
int flaeche = Rechteckflaeche(4, 6);
int fakultaet = Fakultaet(5);

Console.WriteLine(quadrat);
Console.WriteLine(flaeche);
Console.WriteLine(fakultaet);</pre>`,
  ] as const,
  solution: `int Quadrieren(int zahl)
{
    return zahl * zahl;
}

int Rechteckflaeche(int breite, int hoehe)
{
    return breite * hoehe;
}

int Fakultaet(int n)
{
    if (n <= 1)
    {
        return 1;
    }
    return n * Fakultaet(n - 1);
}

int quadrat = Quadrieren(5);
int flaeche = Rechteckflaeche(4, 6);
int fakultaet = Fakultaet(5);

Console.WriteLine(quadrat);
Console.WriteLine(flaeche);
Console.WriteLine(fakultaet);`,
  syntaxExplanation: `<ul><li><code>int Quadrieren(int zahl) { return zahl * zahl; }</code> — Quadrieren(5) liefert 25.</li><li><code>int Rechteckflaeche(int breite, int hoehe) { return breite * hoehe; }</code> — zwei typisierte Parameter, Rechteckflaeche(4, 6) liefert 24.</li><li><code>Fakultaet(5)</code> ruft sich rekursiv auf: 5 * Fakultaet(4) = 5 * 4 * Fakultaet(3) = ... = 5 * 4 * 3 * 2 * 1 = 120, bis der Basisfall <code>n &lt;= 1</code> die Kette mit <code>1</code> beendet.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "25", "24" und "120", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['25', '24', '120'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Methoden mit Parametern, Rückgabewert und Rekursion korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int Quadrieren(int zahl)
{
    int ergebnis = zahl * zahl;
}

int Rechteckflaeche(int breite, int hoehe)
{
    return breite * hoehe;
}

int Fakultaet(int n)
{
    if (n <= 1)
    {
        return 1;
    }
    return n * Fakultaet(n - 1);
}

int quadrat = Quadrieren(5);
int flaeche = Rechteckflaeche(4, 6);
int fakultaet = Fakultaet(5);

Console.WriteLine(quadrat);
Console.WriteLine(flaeche);
Console.WriteLine(fakultaet);`,
      reason: 'vergisst das return in Quadrieren — die Methode berechnet das Ergebnis zwar, gibt es aber nie zurück, was der Compiler ablehnt (CS0161: nicht alle Codepfade liefern einen Wert)',
    },
    {
      code: `int Quadrieren(int zahl)
{
    return zahl * zahl;
}

int Rechteckflaeche(int breite, int hoehe)
{
    return breite + hoehe;
}

int Fakultaet(int n)
{
    if (n <= 1)
    {
        return 1;
    }
    return n * Fakultaet(n - 1);
}

int quadrat = Quadrieren(5);
int flaeche = Rechteckflaeche(4, 6);
int fakultaet = Fakultaet(5);

Console.WriteLine(quadrat);
Console.WriteLine(flaeche);
Console.WriteLine(fakultaet);`,
      reason: 'nutzt in Rechteckflaeche breite + hoehe statt breite * hoehe — kompiliert, liefert aber 10 statt 24',
    },
    {
      code: `int Quadrieren(int zahl)
{
    return zahl * zahl;
}

int Rechteckflaeche(int breite, int hoehe)
{
    return breite * hoehe;
}

int Fakultaet(int n)
{
    if (n <= 1)
    {
        return 0;
    }
    return n * Fakultaet(n - 1);
}

int quadrat = Quadrieren(5);
int flaeche = Rechteckflaeche(4, 6);
int fakultaet = Fakultaet(5);

Console.WriteLine(quadrat);
Console.WriteLine(flaeche);
Console.WriteLine(fakultaet);`,
      reason: 'Basisfall der Rekursion gibt 0 statt 1 zurück — dadurch wird die ganze Multiplikationskette mit 0 durchmultipliziert, Fakultaet(5) liefert fälschlich 0 statt 120',
    },
  ],
};
