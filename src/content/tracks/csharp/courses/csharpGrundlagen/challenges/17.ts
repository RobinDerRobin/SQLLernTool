import type { CSharpChallenge } from '../../../types';

export const challenge17: CSharpChallenge = {
  num: '17',
  title: 'Generics: Box<T>, generische Methoden, Einschränkungen (where)',
  tutorial: `Eine <b>generische Klasse</b> arbeitet mit einem Platzhalter-Typ statt einem festen Typ: <code>class Box&lt;T&gt; { public T Inhalt; }</code> — beim Verwenden legst du den echten Typ fest, <code>Box&lt;string&gt;</code> oder <code>Box&lt;int&gt;</code>, jeweils eine eigene, aber wiederverwendete Klasse. Genauso kann eine einzelne <b>Methode</b> generisch sein, unabhängig von der umgebenden Klasse: <code>T Groesser&lt;T&gt;(T a, T b) { ... }</code> — <code>&lt;T&gt;</code> direkt nach dem Methodennamen. Beim Aufruf <code>Groesser(3, 9)</code> erkennt der Compiler <code>T</code> automatisch aus den Argumenten, ganz ohne <code>&lt;int&gt;</code> explizit hinzuschreiben. Ein generischer Typ-Parameter kennt von sich aus <b>keine</b> Methoden außer den ganz allgemeinen von <code>object</code> — willst du zum Beispiel zwei Werte vom Typ <code>T</code> vergleichen, brauchst du eine <b>Einschränkung</b>: <code>where T : IComparable&lt;T&gt;</code> hinter der Parameterliste sorgt dafür, dass nur Typen erlaubt sind, die <code>CompareTo(...)</code> bereitstellen — <code>int</code> und <code>string</code> tun das beide bereits eingebaut.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine generische Klasse <code>Box&lt;T&gt;</code> mit Feld <code>Inhalt</code> (Typ <code>T</code>) und einem Konstruktor, der es setzt.<br><br>Definiere eine generische Methode <code>T Groesser&lt;T&gt;(T a, T b)</code> mit der Einschränkung <code>where T : IComparable&lt;T&gt;</code>, die den größeren der beiden Werte zurückgibt (per <code>a.CompareTo(b) &gt; 0</code>).<br><br>Erzeuge <code>Box&lt;string&gt; textBox = new Box&lt;string&gt;("Hallo");</code> und <code>Box&lt;int&gt; zahlBox = new Box&lt;int&gt;(42);</code>. Rufe <code>Groesser(3, 9)</code> und <code>Groesser("Apfel", "Birne")</code> auf. Gib <code>textBox.Inhalt</code>, <code>zahlBox.Inhalt</code>, das Ergebnis von <code>Groesser(3, 9)</code> und das Ergebnis von <code>Groesser("Apfel", "Birne")</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Generische Klasse: <code>class Box&lt;T&gt; { public T Inhalt; public Box(T inhalt) { Inhalt = inhalt; } }</code>. Verwendung mit zwei verschiedenen Typen: <code>Box&lt;string&gt; textBox = new Box&lt;string&gt;("Hallo"); Box&lt;int&gt; zahlBox = new Box&lt;int&gt;(42);</code> — jede Instanz bekommt ihren eigenen konkreten Typ.`,
    `Generische Methode mit Einschränkung: <code>T Groesser&lt;T&gt;(T a, T b) where T : IComparable&lt;T&gt;</code> — die Einschränkung steht hinter der Parameterliste, vor der öffnenden geschweiften Klammer. Im Rumpf: <code>if (a.CompareTo(b) &gt; 0) { return a; } return b;</code>. Aufruf ohne <code>&lt;...&gt;</code>: <code>Groesser(3, 9)</code>, der Compiler erkennt <code>T</code> automatisch.`,
    `So sieht die Lösung aus:<pre>Box&lt;string&gt; textBox = new Box&lt;string&gt;("Hallo");
Box&lt;int&gt; zahlBox = new Box&lt;int&gt;(42);

int maxZahl = Groesser(3, 9);
string maxWort = Groesser("Apfel", "Birne");

Console.WriteLine(textBox.Inhalt);
Console.WriteLine(zahlBox.Inhalt);
Console.WriteLine(maxZahl);
Console.WriteLine(maxWort);

T Groesser&lt;T&gt;(T a, T b) where T : IComparable&lt;T&gt;
{
    if (a.CompareTo(b) &gt; 0)
    {
        return a;
    }
    return b;
}

class Box&lt;T&gt;
{
    public T Inhalt;

    public Box(T inhalt)
    {
        Inhalt = inhalt;
    }
}</pre>`,
  ] as const,
  solution: `Box<string> textBox = new Box<string>("Hallo");
Box<int> zahlBox = new Box<int>(42);

int maxZahl = Groesser(3, 9);
string maxWort = Groesser("Apfel", "Birne");

Console.WriteLine(textBox.Inhalt);
Console.WriteLine(zahlBox.Inhalt);
Console.WriteLine(maxZahl);
Console.WriteLine(maxWort);

T Groesser<T>(T a, T b) where T : IComparable<T>
{
    if (a.CompareTo(b) > 0)
    {
        return a;
    }
    return b;
}

class Box<T>
{
    public T Inhalt;

    public Box(T inhalt)
    {
        Inhalt = inhalt;
    }
}`,
  syntaxExplanation: `<ul><li><code>Box&lt;string&gt;</code> und <code>Box&lt;int&gt;</code> sind dieselbe Klassen-Definition, jeweils mit einem anderen konkreten Typ für <code>T</code> — kein Code doppelt geschrieben.</li><li><code>Groesser(3, 9)</code> — der Compiler erkennt <code>T = int</code> aus den Argumenten, <code>3.CompareTo(9)</code> ist negativ, also liefert die Methode <code>b</code>: 9.</li><li><code>Groesser("Apfel", "Birne")</code> — <code>T = string</code>, <code>"Apfel".CompareTo("Birne")</code> ist alphabetisch negativ (A vor B), also liefert die Methode <code>b</code>: "Birne".</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau vier Zeilen bestehen: "Hallo", "42", "9" und "Birne", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Hallo', '42', '9', 'Birne'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Generische Klasse, generische Methode und Einschränkung korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `Box<string> textBox = new Box<string>("Hallo");
Box<int> zahlBox = new Box<int>(42);

int maxZahl = Groesser(3, 9);
string maxWort = Groesser("Apfel", "Birne");

Console.WriteLine(textBox.Inhalt);
Console.WriteLine(zahlBox.Inhalt);
Console.WriteLine(maxZahl);
Console.WriteLine(maxWort);

T Groesser<T>(T a, T b)
{
    if (a.CompareTo(b) > 0)
    {
        return a;
    }
    return b;
}

class Box<T>
{
    public T Inhalt;

    public Box(T inhalt)
    {
        Inhalt = inhalt;
    }
}`,
      reason: 'lässt die Einschränkung where T : IComparable<T> bei Groesser<T> weg — ein uneingeschränktes T kennt keine CompareTo-Methode, a.CompareTo(b) lässt sich nicht mehr sinnvoll auflösen und der Compiler lehnt den Aufruf ab (Compilerfehler)',
    },
    {
      code: `Box<string> textBox = new Box<string>("Hallo");
Box<int> zahlBox = new Box<int>(42);

int maxZahl = Groesser(3, 9);
string maxWort = Groesser("Apfel", "Birne");

Console.WriteLine(textBox.Inhalt);
Console.WriteLine(zahlBox.Inhalt);
Console.WriteLine(maxZahl);
Console.WriteLine(maxWort);

T Groesser<T>(T a, T b) where T : IComparable<T>
{
    if (a.CompareTo(b) > 0)
    {
        return a;
    }
    return b;
}

class Box
{
    public string Inhalt;

    public Box(string inhalt)
    {
        Inhalt = inhalt;
    }
}`,
      reason: 'macht Box nicht generisch, sondern fest auf string zugeschnitten — Box<string> textBox = ... und erst recht Box<int> zahlBox = ... lassen sich dann nicht mehr kompilieren (CS0308: der nicht-generische Typ Box kann nicht mit Typargumenten verwendet werden)',
    },
    {
      code: `Box<string> textBox = new Box<string>("Hallo");
Box<int> zahlBox = new Box<int>(42);

int maxZahl = Groesser(3, 9);
string maxWort = Groesser("Apfel", "Birne");

Console.WriteLine(textBox.Inhalt);
Console.WriteLine(zahlBox.Inhalt);
Console.WriteLine(maxZahl);
Console.WriteLine(maxWort);

int Groesser(int a, int b)
{
    if (a.CompareTo(b) > 0)
    {
        return a;
    }
    return b;
}

class Box<T>
{
    public T Inhalt;

    public Box(T inhalt)
    {
        Inhalt = inhalt;
    }
}`,
      reason: 'macht Groesser nicht generisch, sondern fest auf int zugeschnitten — Groesser("Apfel", "Birne") mit zwei string-Argumenten passt dann zu keiner Methode mehr (CS1503: Argument lässt sich nicht von string in int umwandeln)',
    },
  ],
};
