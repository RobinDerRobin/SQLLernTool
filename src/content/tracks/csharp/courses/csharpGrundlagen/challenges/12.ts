import type { CSharpChallenge } from '../../../types';

export const challenge12: CSharpChallenge = {
  num: '12',
  title: 'Klassen: Definition, Felder, Konstruktor, this',
  tutorial: `Eine <b>Klasse</b> bündelt Daten und das Verhalten dazu in einem eigenen Typ: <code>class Konto { }</code>. Innerhalb stehen <b>Felder</b> — typisierte Variablen, die zu jeder <b>Instanz</b> (jedem einzelnen Objekt) der Klasse gehören: <code>public string name;</code>. Ein <b>Konstruktor</b> ist eine spezielle Methode ohne Rückgabetyp, die genauso heißt wie die Klasse und beim Erzeugen einer neuen Instanz mit <code>new</code> läuft: <code>public Konto(string name, double kontostand) { ... }</code>. Heißen Parameter und Feld gleich (ein sehr üblicher Fall), verdeckt der Parameter innerhalb des Konstruktors das Feld — <code>name = name;</code> wäre nur eine sinnlose Selbstzuweisung an den Parameter, das Feld bliebe unverändert. Das Schlüsselwort <code>this</code> verweist explizit auf die <b>aktuelle Instanz</b> und löst diese Kollision auf: <code>this.name = name;</code> weist dem <b>Feld</b> den Wert des Parameters zu. Wichtig für dieses Programm: Klassen-Definitionen müssen in einer Top-Level-Statements-Datei <b>nach</b> allen ausführbaren Anweisungen stehen — anders als bei den lokalen Methoden aus den letzten beiden Challenges.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Konto</code> mit den Feldern <code>name</code> (<code>string</code>) und <code>kontostand</code> (<code>double</code>) sowie einem Konstruktor <code>Konto(string name, double kontostand)</code>, der beide Felder per <code>this.</code> setzt.<br><br>Erzeuge <b>zwei</b> unabhängige Instanzen: <code>anna</code> mit <code>("Anna", 100.0)</code> und <code>ben</code> mit <code>("Ben", 50.0)</code>. Erhöhe <code>anna</code>s <code>kontostand</code> anschließend um <code>25.0</code>. Gib <code>anna.name</code>, <code>anna.kontostand</code>, <code>ben.name</code> und <code>ben.kontostand</code> mit je einem <code>Console.WriteLine(...)</code> aus — in dieser Reihenfolge, und <b>bevor</b> die Klassen-Definition im Code steht.`,
  hints: [
    `Klasse mit zwei Feldern: <code>class Konto { public string name; public double kontostand; }</code>. Der Konstruktor heißt genauso wie die Klasse und hat keinen Rückgabetyp: <code>public Konto(string name, double kontostand) { ... }</code>.`,
    `Im Konstruktor-Rumpf brauchst du <code>this.</code>, weil Parameter und Feld denselben Namen haben: <code>this.name = name;</code> (links das Feld über <code>this</code>, rechts der Parameter). Eine neue Instanz erzeugst du mit <code>new</code>: <code>Konto anna = new Konto("Anna", 100.0);</code>. Wichtig: die Klassen-Definition muss ganz am Ende der Datei stehen, nach allen Anweisungen.`,
    `So sieht die Lösung aus:<pre>Konto anna = new Konto("Anna", 100.0);
Konto ben = new Konto("Ben", 50.0);

anna.kontostand = anna.kontostand + 25.0;

Console.WriteLine(anna.name);
Console.WriteLine(anna.kontostand);
Console.WriteLine(ben.name);
Console.WriteLine(ben.kontostand);

class Konto
{
    public string name;
    public double kontostand;

    public Konto(string name, double kontostand)
    {
        this.name = name;
        this.kontostand = kontostand;
    }
}</pre>`,
  ] as const,
  solution: `Konto anna = new Konto("Anna", 100.0);
Konto ben = new Konto("Ben", 50.0);

anna.kontostand = anna.kontostand + 25.0;

Console.WriteLine(anna.name);
Console.WriteLine(anna.kontostand);
Console.WriteLine(ben.name);
Console.WriteLine(ben.kontostand);

class Konto
{
    public string name;
    public double kontostand;

    public Konto(string name, double kontostand)
    {
        this.name = name;
        this.kontostand = kontostand;
    }
}`,
  syntaxExplanation: `<ul><li><code>new Konto("Anna", 100.0)</code> erzeugt eine eigene Instanz mit ihren eigenen Feldern — <code>anna</code> und <code>ben</code> sind komplett unabhängig voneinander.</li><li><code>this.name = name;</code> — links das Feld der aktuellen Instanz, rechts der gleichnamige Parameter. Ohne <code>this.</code> wäre das nur eine wirkungslose Selbstzuweisung des Parameters.</li><li><code>anna.kontostand = anna.kontostand + 25.0;</code> ändert nur <code>anna</code>s Feld: 100 + 25 = 125. <code>ben.kontostand</code> bleibt unberührt bei 50.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau vier Zeilen bestehen: "Anna", "125", "Ben" und "50", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Anna', '125', 'Ben', '50'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Klasse, Felder, Konstruktor und this korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `Konto anna = new Konto("Anna", 100.0);
Konto ben = new Konto("Ben", 50.0);

anna.kontostand = anna.kontostand + 25.0;

Console.WriteLine(anna.name);
Console.WriteLine(anna.kontostand);
Console.WriteLine(ben.name);
Console.WriteLine(ben.kontostand);

class Konto
{
    public string name;
    public double kontostand;

    public Konto(string name, double kontostand)
    {
        name = name;
        kontostand = kontostand;
    }
}`,
      reason: 'vergisst this. im Konstruktor — name = name; und kontostand = kontostand; sind nur wirkungslose Selbstzuweisungen an die Parameter, die Felder bleiben bei ihrem Standardwert (null bzw. 0), anna.name und ben.name werden fälschlich leer statt "Anna"/"Ben"',
    },
    {
      code: `Konto anna = new Konto("Anna", 100.0);
Konto ben = new Konto("Ben", 50.0);

anna.kontostand = anna.kontostand + 25.0;

Console.WriteLine(anna.name);
Console.WriteLine(anna.kontostand);
Console.WriteLine(ben.name);
Console.WriteLine(ben.kontostand);

class Konto
{
    public string name;

    public Konto(string name, double kontostand)
    {
        this.name = name;
        this.kontostand = kontostand;
    }
}`,
      reason: 'vergisst das Feld kontostand komplett zu deklarieren — der Konstruktor und alle Zugriffe darauf verweisen auf ein nicht existierendes Feld, was der Compiler mit CS1061 ablehnt',
    },
    {
      code: `Konto anna = new Konto("Anna", 100.0);
Konto ben = anna;

anna.kontostand = anna.kontostand + 25.0;

Console.WriteLine(anna.name);
Console.WriteLine(anna.kontostand);
Console.WriteLine(ben.name);
Console.WriteLine(ben.kontostand);

class Konto
{
    public string name;
    public double kontostand;

    public Konto(string name, double kontostand)
    {
        this.name = name;
        this.kontostand = kontostand;
    }
}`,
      reason: 'erzeugt für ben keine eigene Instanz, sondern setzt ben = anna; — ben ist dadurch nur ein zweiter Name für dieselbe Instanz, ben.name und ben.kontostand zeigen fälschlich Annas Werte statt "Ben" und 50',
    },
  ],
};
