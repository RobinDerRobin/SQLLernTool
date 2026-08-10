import type { CSharpChallenge } from '../../../types';

export const challenge13: CSharpChallenge = {
  num: '13',
  title: 'Klassen: Zugriffsmodifikatoren, Properties, static, Werttyp vs. Referenztyp',
  tutorial: `<b>Zugriffsmodifikatoren</b> steuern explizit, von wo ein Feld erreichbar ist — <code>private</code> nur innerhalb der eigenen Klasse, <code>public</code> von überall. Ein rohes <code>public</code>-Feld lässt sich von außen unkontrolliert überschreiben; üblich ist deshalb, das Feld <code>private</code> zu machen und stattdessen eine <b>Property</b> anzubieten: <code>public string Name { get { return name; } set { name = value; } }</code> — von außen sieht das wie ein normales Feld aus (<code>anna.Name</code>), tatsächlich laufen aber <code>get</code>/<code>set</code>-Blöcke im Hintergrund. Ein <code>static</code>-Feld oder eine <code>static</code>-Methode gehört nicht zu einer einzelnen Instanz, sondern zur <b>Klasse selbst</b> — es gibt nur eine gemeinsame Kopie, erreichbar über den Klassennamen (<code>Person.anzahlPersonen</code>), nicht über eine Instanz. Der wichtigste Unterschied zwischen <code>struct</code> (Werttyp) und <code>class</code> (Referenztyp): Eine <code>class</code>-Variable ist ein <b>Verweis</b> — <code>Punkt p2 = p1;</code> würde beide Variablen auf dieselbe Instanz zeigen lassen, Änderungen über <code>p2</code> wären auch über <code>p1</code> sichtbar (wie schon bei <code>Konto ben = anna;</code> in der letzten Challenge). Eine <code>struct</code>-Variable dagegen wird bei jeder Zuweisung <b>kopiert</b> — <code>p2</code> ist danach komplett unabhängig von <code>p1</code>.`,
  task: `<b>Deine Aufgabe, Teil 1 — Klasse mit Property und static:</b><br>Definiere eine Klasse <code>Person</code> mit einem <code>private</code> Feld <code>name</code> (<code>string</code>), einer Property <code>Name</code> (mit <code>get</code>/<code>set</code>, die auf <code>name</code> zugreift), einem <code>public static int anzahlPersonen = 0;</code>, und einem Konstruktor <code>Person(string name)</code>, der <code>this.name</code> setzt und <code>anzahlPersonen</code> um eins erhöht. Erzeuge zwei Instanzen (<code>anna</code>, <code>ben</code>). Gib <code>anna.Name</code> (über die Property) und <code>Person.anzahlPersonen</code> (über den Klassennamen) aus.<br><br><b>Teil 2 — struct vs. class:</b> Definiere <code>struct Punkt { public int X; public int Y; }</code>. Erzeuge <code>p1</code> mit <code>X = 5, Y = 10</code>, weise <code>Punkt p2 = p1;</code> zu und ändere danach nur <code>p2.X = 99;</code>. Gib <code>p1.X</code> und <code>p2.X</code> aus. Insgesamt vier <code>Console.WriteLine(...)</code>-Aufrufe in dieser Reihenfolge: <code>anna.Name</code>, <code>Person.anzahlPersonen</code>, <code>p1.X</code>, <code>p2.X</code>.`,
  hints: [
    `Property mit privatem Feld: <code>private string name; public string Name { get { return name; } set { name = value; } }</code>. Statisches Feld: <code>public static int anzahlPersonen = 0;</code> — im Konstruktor einfach <code>anzahlPersonen++;</code>, ohne <code>this.</code> davor (static gehört nicht zur Instanz).`,
    `Zugriff auf ein statisches Feld läuft immer über den <b>Klassennamen</b>, nie über eine Instanz: <code>Person.anzahlPersonen</code>, nicht <code>anna.anzahlPersonen</code>. Bei <code>struct Punkt { public int X; public int Y; }</code> kopiert <code>Punkt p2 = p1;</code> die Werte — <code>p2.X = 99;</code> ändert danach nur <code>p2</code>, <code>p1.X</code> bleibt unverändert bei 5.`,
    `So sieht die Lösung aus:<pre>Person anna = new Person("Anna");
Person ben = new Person("Ben");

Console.WriteLine(anna.Name);
Console.WriteLine(Person.anzahlPersonen);

Punkt p1 = new Punkt();
p1.X = 5;
p1.Y = 10;

Punkt p2 = p1;
p2.X = 99;

Console.WriteLine(p1.X);
Console.WriteLine(p2.X);

class Person
{
    private string name;
    public string Name
    {
        get { return name; }
        set { name = value; }
    }

    public static int anzahlPersonen = 0;

    public Person(string name)
    {
        this.name = name;
        anzahlPersonen++;
    }
}

struct Punkt
{
    public int X;
    public int Y;
}</pre>`,
  ] as const,
  solution: `Person anna = new Person("Anna");
Person ben = new Person("Ben");

Console.WriteLine(anna.Name);
Console.WriteLine(Person.anzahlPersonen);

Punkt p1 = new Punkt();
p1.X = 5;
p1.Y = 10;

Punkt p2 = p1;
p2.X = 99;

Console.WriteLine(p1.X);
Console.WriteLine(p2.X);

class Person
{
    private string name;
    public string Name
    {
        get { return name; }
        set { name = value; }
    }

    public static int anzahlPersonen = 0;

    public Person(string name)
    {
        this.name = name;
        anzahlPersonen++;
    }
}

struct Punkt
{
    public int X;
    public int Y;
}`,
  syntaxExplanation: `<ul><li><code>anna.Name</code> ruft die Property auf, die intern den privaten Feld-Wert <code>name</code> zurückgibt — von außen nicht direkt erreichbar.</li><li><code>Person.anzahlPersonen</code> — zwei Instanzen wurden erzeugt (<code>anna</code>, <code>ben</code>), der Konstruktor hat <code>anzahlPersonen</code> beide Male erhöht: 2.</li><li><code>Punkt p2 = p1;</code> kopiert die Werte (Werttyp) — <code>p2.X = 99;</code> ändert nur die Kopie, <code>p1.X</code> bleibt bei 5.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau vier Zeilen bestehen: "Anna", "2", "5" und "99", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Anna', '2', '5', '99'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Zugriffsmodifikatoren, Properties, static und der Werttyp/Referenztyp-Unterschied korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `Person anna = new Person("Anna");
Person ben = new Person("Ben");

Console.WriteLine(anna.name);
Console.WriteLine(Person.anzahlPersonen);

Punkt p1 = new Punkt();
p1.X = 5;
p1.Y = 10;

Punkt p2 = p1;
p2.X = 99;

Console.WriteLine(p1.X);
Console.WriteLine(p2.X);

class Person
{
    private string name;
    public string Name
    {
        get { return name; }
        set { name = value; }
    }

    public static int anzahlPersonen = 0;

    public Person(string name)
    {
        this.name = name;
        anzahlPersonen++;
    }
}

struct Punkt
{
    public int X;
    public int Y;
}`,
      reason: 'greift von außen direkt auf das private Feld anna.name statt auf die Property anna.Name zu — der Compiler lehnt das ab (CS0122: Person.name ist wegen seines Schutzgrads unzugänglich)',
    },
    {
      code: `Person anna = new Person("Anna");
Person ben = new Person("Ben");

Console.WriteLine(anna.Name);
Console.WriteLine(Person.anzahlPersonen);

Punkt p1 = new Punkt();
p1.X = 5;
p1.Y = 10;

Punkt p2 = p1;
p2.X = 99;

Console.WriteLine(p1.X);
Console.WriteLine(p2.X);

class Person
{
    private string name;
    public string Name
    {
        get { return name; }
        set { name = value; }
    }

    public int anzahlPersonen = 0;

    public Person(string name)
    {
        this.name = name;
        anzahlPersonen++;
    }
}

struct Punkt
{
    public int X;
    public int Y;
}`,
      reason: 'vergisst static bei anzahlPersonen — dadurch gehört das Feld zu jeder einzelnen Instanz statt zur Klasse, der Zugriff Person.anzahlPersonen über den Klassennamen wird vom Compiler abgelehnt (CS0120: für das nicht-statische Feld wird eine Objektreferenz benötigt)',
    },
    {
      code: `Person anna = new Person("Anna");
Person ben = new Person("Ben");

Console.WriteLine(anna.Name);
Console.WriteLine(Person.anzahlPersonen);

Punkt p1 = new Punkt();
p1.X = 5;
p1.Y = 10;

Punkt p2 = p1;
p2.X = 99;

Console.WriteLine(p1.X);
Console.WriteLine(p2.X);

class Person
{
    private string name;
    public string Name
    {
        get { return name; }
        set { name = value; }
    }

    public static int anzahlPersonen = 0;

    public Person(string name)
    {
        this.name = name;
        anzahlPersonen++;
    }
}

class Punkt
{
    public int X;
    public int Y;
}`,
      reason: 'macht Punkt zu einer class statt einer struct — dadurch ist Punkt p2 = p1; keine Kopie mehr, sondern ein zweiter Verweis auf dieselbe Instanz, p2.X = 99; ändert dadurch auch p1.X, das fälschlich ebenfalls 99 statt 5 wird',
    },
  ],
};
