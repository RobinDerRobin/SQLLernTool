import type { CSharpChallenge } from '../../../types';

export const challenge14: CSharpChallenge = {
  num: '14',
  title: 'Methoden-Überladung (Overloading)',
  tutorial: `Mehrere Methoden können denselben Namen tragen, solange sich ihre <b>Signatur</b> unterscheidet — entweder in der <b>Anzahl</b> oder im <b>Typ</b> der Parameter. Das nennt sich <b>Überladung</b> (Overloading): <code>static int Addiere(int a, int b) { ... }</code> und <code>static int Addiere(int a, int b, int c) { ... }</code> sind zwei verschiedene Methoden mit demselben Namen — der Compiler wählt beim Aufruf anhand der übergebenen Argumente automatisch die passende aus. Genauso kann sich eine Überladung nur im <b>Typ</b> unterscheiden: <code>static double Addiere(double a, double b) { ... }</code> neben der <code>int</code>-Version. Wichtig: Überladung funktioniert nur bei <b>Methoden innerhalb einer Klasse</b> — die lokalen Funktionen aus früheren Challenges (direkt in den Top-Level-Statements) lassen sich <b>nicht</b> überladen, weil sie technisch lokale Funktionen der generierten <code>Main</code>-Methode sind, keine echten Klassenmethoden.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Rechner</code> mit drei überladenen <code>static</code>-Methoden namens <code>Addiere</code>:<br>• <code>Addiere(int a, int b)</code>: gibt <code>a + b</code> zurück<br>• <code>Addiere(int a, int b, int c)</code>: gibt <code>a + b + c</code> zurück<br>• <code>Addiere(double a, double b)</code>: gibt <code>a + b</code> zurück<br><br>Rufe auf: <code>Rechner.Addiere(3, 4)</code>, <code>Rechner.Addiere(3, 4, 5)</code> und <code>Rechner.Addiere(2.5, 1.5)</code>, speichere die drei Ergebnisse in Variablen und gib sie mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Drei Methoden, alle <code>public static</code> und alle <code>Addiere</code> genannt, aber mit unterschiedlicher Signatur: <code>static int Addiere(int a, int b) { return a + b; }</code>, <code>static int Addiere(int a, int b, int c) { return a + b + c; }</code>, <code>static double Addiere(double a, double b) { return a + b; }</code>.`,
    `Aufruf über den Klassennamen, wie bei jedem <code>static</code>-Member: <code>Rechner.Addiere(3, 4)</code> ruft automatisch die passende Überladung auf — der Compiler entscheidet anhand von Anzahl und Typ der Argumente, welche der drei Methoden gemeint ist.`,
    `So sieht die Lösung aus:<pre>int summeZwei = Rechner.Addiere(3, 4);
int summeDrei = Rechner.Addiere(3, 4, 5);
double summeDouble = Rechner.Addiere(2.5, 1.5);

Console.WriteLine(summeZwei);
Console.WriteLine(summeDrei);
Console.WriteLine(summeDouble);

class Rechner
{
    public static int Addiere(int a, int b)
    {
        return a + b;
    }

    public static int Addiere(int a, int b, int c)
    {
        return a + b + c;
    }

    public static double Addiere(double a, double b)
    {
        return a + b;
    }
}</pre>`,
  ] as const,
  solution: `int summeZwei = Rechner.Addiere(3, 4);
int summeDrei = Rechner.Addiere(3, 4, 5);
double summeDouble = Rechner.Addiere(2.5, 1.5);

Console.WriteLine(summeZwei);
Console.WriteLine(summeDrei);
Console.WriteLine(summeDouble);

class Rechner
{
    public static int Addiere(int a, int b)
    {
        return a + b;
    }

    public static int Addiere(int a, int b, int c)
    {
        return a + b + c;
    }

    public static double Addiere(double a, double b)
    {
        return a + b;
    }
}`,
  syntaxExplanation: `<ul><li><code>Rechner.Addiere(3, 4)</code> — zwei <code>int</code>-Argumente passen zur ersten Überladung: 3 + 4 = 7.</li><li><code>Rechner.Addiere(3, 4, 5)</code> — drei Argumente passen nur zur zweiten Überladung: 3 + 4 + 5 = 12.</li><li><code>Rechner.Addiere(2.5, 1.5)</code> — zwei <code>double</code>-Argumente passen zur dritten Überladung: 2.5 + 1.5 = 4.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "7", "12" und "4", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['7', '12', '4'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Methoden-Überladung korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int summeZwei = Rechner.Addiere(3, 4);
int summeDrei = Rechner.Addiere(3, 4, 5);
double summeDouble = Rechner.Addiere(2.5, 1.5);

Console.WriteLine(summeZwei);
Console.WriteLine(summeDrei);
Console.WriteLine(summeDouble);

class Rechner
{
    public static int Addiere(int a, int b)
    {
        return a + b;
    }

    public static double Addiere(double a, double b)
    {
        return a + b;
    }
}`,
      reason: 'vergisst die dreistellige Überladung Addiere(int a, int b, int c) — Rechner.Addiere(3, 4, 5) hat dann keine passende Methode mehr (Compilerfehler CS1501: keine Überladung nimmt 3 Argumente)',
    },
    {
      code: `int summeZwei = Rechner.Addiere(3, 4);
int summeDrei = Rechner.Addiere(3, 4, 5);
double summeDouble = Rechner.Addiere(2.5, 1.5);

Console.WriteLine(summeZwei);
Console.WriteLine(summeDrei);
Console.WriteLine(summeDouble);

class Rechner
{
    public static int Addiere(int a, int b, int c)
    {
        return a + b + c;
    }

    public static double Addiere(double a, double b)
    {
        return a + b;
    }
}`,
      reason: 'vergisst die zweistellige int-Überladung Addiere(int a, int b) — Rechner.Addiere(3, 4) passt dann nur noch über eine implizite int-zu-double-Umwandlung zur double-Überladung, deren double-Rückgabewert sich nicht ohne Cast in int summeZwei speichern lässt (Compilerfehler CS0266)',
    },
    {
      code: `int summeZwei = Rechner.Addiere(3, 4);
int summeDrei = Rechner.Addiere(3, 4, 5);
double summeDouble = Rechner.Addiere(2.5, 1.5);

Console.WriteLine(summeZwei);
Console.WriteLine(summeDrei);
Console.WriteLine(summeDouble);

class Rechner
{
    public static int Addiere(int a, int b)
    {
        return a + b;
    }

    public static int Addiere(int a, int b, int c)
    {
        return a + b;
    }

    public static double Addiere(double a, double b)
    {
        return a + b;
    }
}`,
      reason: 'vergisst + c im Rumpf der dreistelligen Überladung — Rechner.Addiere(3, 4, 5) liefert dadurch fälschlich 7 statt 12, das dritte Argument wird stillschweigend ignoriert',
    },
  ],
};
