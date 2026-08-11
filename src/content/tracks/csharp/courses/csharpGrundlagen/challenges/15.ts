import type { CSharpChallenge } from '../../../types';

export const challenge15: CSharpChallenge = {
  num: '15',
  title: 'Vererbung: inheritance, override, base, abstract',
  tutorial: `Eine Klasse kann von einer anderen <b>erben</b>: <code>class Hund : Tier { }</code> — <code>Hund</code> bekommt automatisch alle Felder und Methoden von <code>Tier</code> dazu. Der Konstruktor der abgeleiteten Klasse muss den Konstruktor der Basisklasse explizit aufrufen, wenn dieser Parameter braucht: <code>public Hund(string name) : base(name) { }</code> — das <code>base(...)</code> läuft <b>vor</b> dem eigenen Konstruktor-Rumpf. Eine Methode der Basisklasse mit <code>virtual</code> davor darf in einer abgeleiteten Klasse mit <code>override</code> <b>neu implementiert</b> werden — ruft man sie über eine Variable vom Basis-Typ auf, läuft trotzdem die überschriebene Version (Polymorphie). Eine <code>abstract class</code> kann nicht direkt mit <code>new</code> erzeugt werden, nur über eine abgeleitete Klasse — eine <code>abstract</code>-Methode hat <b>gar keine Implementierung</b> in der Basisklasse, jede nicht-abstrakte abgeleitete Klasse <b>muss</b> sie mit <code>override</code> bereitstellen, sonst lehnt der Compiler das ab.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine <code>abstract class Tier</code> mit Feld <code>Name</code> (<code>string</code>), einem Konstruktor <code>Tier(string name)</code>, einer <code>abstract</code>-Methode <code>string GeraeuschMachen()</code> (ohne Rumpf) und einer <code>virtual</code>-Methode <code>string Beschreibung()</code>, die <code>Name + " macht: " + GeraeuschMachen()</code> zurückgibt.<br><br>Definiere zwei abgeleitete Klassen:<br>• <code>Hund : Tier</code> — Konstruktor ruft <code>base(name)</code> auf, <code>GeraeuschMachen()</code> gibt <code>"Wuff"</code> zurück (überschreibt nur die abstrakte Methode, <code>Beschreibung()</code> bleibt geerbt)<br>• <code>Katze : Tier</code> — Konstruktor ruft <code>base(name)</code> auf, <code>GeraeuschMachen()</code> gibt <code>"Miau"</code> zurück, <b>und</b> überschreibt zusätzlich <code>Beschreibung()</code> mit <code>"Die Katze " + Name + " sagt " + GeraeuschMachen()</code><br><br>Erzeuge <code>Tier hund = new Hund("Rex");</code> und <code>Tier katze = new Katze("Whiskers");</code>, gib <code>hund.Beschreibung()</code> und <code>katze.Beschreibung()</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `<code>abstract class Tier { public string Name; public Tier(string name) { this.Name = name; } public abstract string GeraeuschMachen(); public virtual string Beschreibung() { return Name + " macht: " + GeraeuschMachen(); } }</code> — die abstrakte Methode hat keine geschweiften Klammern, nur ein Semikolon.`,
    `Abgeleitete Klasse: <code>class Hund : Tier { public Hund(string name) : base(name) { } public override string GeraeuschMachen() { return "Wuff"; } }</code> — <code>: base(name)</code> gehört direkt an die Konstruktor-Signatur, nicht in den Rumpf. <code>Katze</code> überschreibt zusätzlich <code>Beschreibung()</code> mit <code>override</code>.`,
    `So sieht die Lösung aus:<pre>Tier hund = new Hund("Rex");
Tier katze = new Katze("Whiskers");

Console.WriteLine(hund.Beschreibung());
Console.WriteLine(katze.Beschreibung());

abstract class Tier
{
    public string Name;

    public Tier(string name)
    {
        this.Name = name;
    }

    public abstract string GeraeuschMachen();

    public virtual string Beschreibung()
    {
        return Name + " macht: " + GeraeuschMachen();
    }
}

class Hund : Tier
{
    public Hund(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Wuff";
    }
}

class Katze : Tier
{
    public Katze(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Miau";
    }

    public override string Beschreibung()
    {
        return "Die Katze " + Name + " sagt " + GeraeuschMachen();
    }
}</pre>`,
  ] as const,
  solution: `Tier hund = new Hund("Rex");
Tier katze = new Katze("Whiskers");

Console.WriteLine(hund.Beschreibung());
Console.WriteLine(katze.Beschreibung());

abstract class Tier
{
    public string Name;

    public Tier(string name)
    {
        this.Name = name;
    }

    public abstract string GeraeuschMachen();

    public virtual string Beschreibung()
    {
        return Name + " macht: " + GeraeuschMachen();
    }
}

class Hund : Tier
{
    public Hund(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Wuff";
    }
}

class Katze : Tier
{
    public Katze(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Miau";
    }

    public override string Beschreibung()
    {
        return "Die Katze " + Name + " sagt " + GeraeuschMachen();
    }
}`,
  syntaxExplanation: `<ul><li><code>Tier hund = new Hund("Rex");</code> — die Variable hat den Basis-Typ, das Objekt ist aber ein <code>Hund</code>.</li><li><code>hund.Beschreibung()</code> — <code>Hund</code> überschreibt <code>Beschreibung()</code> nicht, also läuft die geerbte Version aus <code>Tier</code>, die wiederum <code>Hund</code>s überschriebenes <code>GeraeuschMachen()</code> aufruft: "Rex macht: Wuff".</li><li><code>katze.Beschreibung()</code> — <code>Katze</code> überschreibt <code>Beschreibung()</code> zusätzlich selbst: "Die Katze Whiskers sagt Miau".</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau zwei Zeilen bestehen: "Rex macht: Wuff" und "Die Katze Whiskers sagt Miau", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Rex macht: Wuff', 'Die Katze Whiskers sagt Miau'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den zwei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Vererbung, override, base und abstract korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `Tier hund = new Hund("Rex");
Tier katze = new Katze("Whiskers");

Console.WriteLine(hund.Beschreibung());
Console.WriteLine(katze.Beschreibung());

abstract class Tier
{
    public string Name;

    public Tier(string name)
    {
        this.Name = name;
    }

    public abstract string GeraeuschMachen();

    public virtual string Beschreibung()
    {
        return Name + " macht: " + GeraeuschMachen();
    }
}

class Hund : Tier
{
    public Hund(string name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Wuff";
    }
}

class Katze : Tier
{
    public Katze(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Miau";
    }

    public override string Beschreibung()
    {
        return "Die Katze " + Name + " sagt " + GeraeuschMachen();
    }
}`,
      reason: 'lässt : base(name) beim Hund-Konstruktor weg — Tier hat keinen parameterlosen Konstruktor, der Compiler lehnt das ab (CS7036: kein Argument für den erforderlichen Parameter name)',
    },
    {
      code: `Tier hund = new Hund("Rex");
Tier katze = new Katze("Whiskers");

Console.WriteLine(hund.Beschreibung());
Console.WriteLine(katze.Beschreibung());

abstract class Tier
{
    public string Name;

    public Tier(string name)
    {
        this.Name = name;
    }

    public abstract string GeraeuschMachen();

    public virtual string Beschreibung()
    {
        return Name + " macht: " + GeraeuschMachen();
    }
}

class Hund : Tier
{
    public Hund(string name) : base(name)
    {
    }

    public string GeraeuschMachen()
    {
        return "Wuff";
    }
}

class Katze : Tier
{
    public Katze(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Miau";
    }

    public override string Beschreibung()
    {
        return "Die Katze " + Name + " sagt " + GeraeuschMachen();
    }
}`,
      reason: 'vergisst override bei Hunds GeraeuschMachen() — eine abstrakte Methode muss zwingend überschrieben werden, ohne override bleibt Hund unvollständig implementiert (CS0534: Hund implementiert das geerbte abstrakte Mitglied Tier.GeraeuschMachen() nicht)',
    },
    {
      code: `Tier hund = new Hund("Rex");
Tier katze = new Katze("Whiskers");

Console.WriteLine(hund.Beschreibung());
Console.WriteLine(katze.Beschreibung());

abstract class Tier
{
    public string Name;

    public Tier(string name)
    {
        this.Name = name;
    }

    public abstract string GeraeuschMachen();

    public virtual string Beschreibung()
    {
        return Name + " macht: " + GeraeuschMachen();
    }
}

class Hund : Tier
{
    public Hund(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Wuff";
    }
}

class Katze : Tier
{
    public Katze(string name) : base(name)
    {
    }

    public override string GeraeuschMachen()
    {
        return "Miau";
    }
}`,
      reason: 'vergisst, Beschreibung() in Katze zu überschreiben — anders als bei der abstrakten Methode erzwingt der Compiler das bei virtual nicht, katze.Beschreibung() läuft dadurch stillschweigend mit der geerbten Standardversion aus Tier und liefert fälschlich "Whiskers macht: Miau" statt "Die Katze Whiskers sagt Miau"',
    },
  ],
};
