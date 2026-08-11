import type { CSharpChallenge } from '../../../types';

export const challenge16: CSharpChallenge = {
  num: '16',
  title: 'Interfaces, Polymorphie über Interfaces, sealed',
  tutorial: `Ein <b>Interface</b> beschreibt nur, <b>was</b> eine Klasse können muss, nicht <b>wie</b>: <code>interface IBeschreibbar { string Beschreiben(); }</code> — nur eine Signatur, kein Rumpf. Eine Klasse <b>implementiert</b> ein Interface mit derselben Syntax wie Vererbung: <code>class Buch : IBeschreibbar { public string Beschreiben() { ... } }</code>, muss dabei aber <b>jede</b> Interface-Methode bereitstellen, sonst lehnt der Compiler das ab. Der Nutzen: eine Variable vom Interface-Typ kann Objekte <b>ganz unterschiedlicher</b> Klassen aufnehmen, solange sie alle dasselbe Interface implementieren — <code>IBeschreibbar[] medien = { neuesBuch, neueDvd };</code>. Beim Aufruf <code>medium.Beschreiben()</code> entscheidet sich erst <b>zur Laufzeit</b>, welche konkrete Implementierung tatsächlich läuft (Polymorphie) — dieselbe Idee wie bei <code>override</code>, nur über ein Interface statt über eine gemeinsame Basisklasse. Das Schlüsselwort <code>sealed</code> vor einer Klasse verbietet, weiter von ihr zu erben: <code>sealed class DVD : IBeschreibbar { }</code> — ein Versuch <code>class BluRay : DVD { }</code> lehnt der Compiler ab.`,
  task: `<b>Deine Aufgabe:</b> Definiere <code>interface IBeschreibbar</code> mit einer Methode <code>string Beschreiben();</code> (ohne Rumpf).<br><br>Definiere zwei Klassen, die es implementieren:<br>• <code>Buch : IBeschreibbar</code> mit Feld <code>Titel</code>, Konstruktor setzt es, <code>Beschreiben()</code> gibt <code>"Buch: " + Titel</code> zurück<br>• <code>sealed class DVD : IBeschreibbar</code> — genauso aufgebaut, <code>Beschreiben()</code> gibt <code>"DVD: " + Titel</code> zurück, aber als <code>sealed</code> markiert<br><br>Erzeuge <code>IBeschreibbar[] medien = new IBeschreibbar[2];</code>, setze <code>medien[0]</code> auf ein neues <code>Buch("Der Report")</code> und <code>medien[1]</code> auf eine neue <code>DVD("Der Film")</code>. Gib mit einer <code>foreach</code>-Schleife über <code>medien</code> für jedes Element <code>medium.Beschreiben()</code> mit <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `<code>interface IBeschreibbar { string Beschreiben(); }</code> — nur die Signatur mit Semikolon, kein Rumpf. Eine implementierende Klasse nutzt dieselbe <code>:</code>-Syntax wie Vererbung: <code>class Buch : IBeschreibbar { public string Beschreiben() { return "Buch: " + Titel; } }</code>.`,
    `<code>sealed</code> steht direkt vor <code>class</code>: <code>sealed class DVD : IBeschreibbar { ... }</code>. Für das Array: <code>IBeschreibbar[] medien = new IBeschreibbar[2]; medien[0] = new Buch("Der Report"); medien[1] = new DVD("Der Film");</code> — beide Elemente haben unterschiedliche konkrete Typen, aber denselben Array-Typ <code>IBeschreibbar</code>.`,
    `So sieht die Lösung aus:<pre>IBeschreibbar[] medien = new IBeschreibbar[2];
medien[0] = new Buch("Der Report");
medien[1] = new DVD("Der Film");

foreach (IBeschreibbar medium in medien)
{
    Console.WriteLine(medium.Beschreiben());
}

interface IBeschreibbar
{
    string Beschreiben();
}

class Buch : IBeschreibbar
{
    public string Titel;

    public Buch(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "Buch: " + Titel;
    }
}

sealed class DVD : IBeschreibbar
{
    public string Titel;

    public DVD(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "DVD: " + Titel;
    }
}</pre>`,
  ] as const,
  solution: `IBeschreibbar[] medien = new IBeschreibbar[2];
medien[0] = new Buch("Der Report");
medien[1] = new DVD("Der Film");

foreach (IBeschreibbar medium in medien)
{
    Console.WriteLine(medium.Beschreiben());
}

interface IBeschreibbar
{
    string Beschreiben();
}

class Buch : IBeschreibbar
{
    public string Titel;

    public Buch(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "Buch: " + Titel;
    }
}

sealed class DVD : IBeschreibbar
{
    public string Titel;

    public DVD(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "DVD: " + Titel;
    }
}`,
  syntaxExplanation: `<ul><li><code>IBeschreibbar[] medien</code> — beide Elemente haben unterschiedliche konkrete Typen (<code>Buch</code>, <code>DVD</code>), aber denselben Array-Typ, weil beide <code>IBeschreibbar</code> implementieren.</li><li><code>medium.Beschreiben()</code> in der <code>foreach</code>-Schleife ruft je nach tatsächlichem Objekt die passende Implementierung auf — bei <code>medien[0]</code> die von <code>Buch</code>, bei <code>medien[1]</code> die von <code>DVD</code>.</li><li><code>sealed</code> vor <code>DVD</code> verhindert, dass später eine weitere Klasse von <code>DVD</code> erbt.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau zwei Zeilen bestehen: "Buch: Der Report" und "DVD: Der Film", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Buch: Der Report', 'DVD: Der Film'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den zwei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Interface, Polymorphie über Interface und sealed korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `IBeschreibbar[] medien = new IBeschreibbar[2];
medien[0] = new Buch("Der Report");
medien[1] = new DVD("Der Film");

foreach (IBeschreibbar medium in medien)
{
    Console.WriteLine(medium.Beschreiben());
}

interface IBeschreibbar
{
    string Beschreiben();
}

class Buch : IBeschreibbar
{
    public string Titel;

    public Buch(string titel)
    {
        Titel = titel;
    }
}

sealed class DVD : IBeschreibbar
{
    public string Titel;

    public DVD(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "DVD: " + Titel;
    }
}`,
      reason: 'implementiert Beschreiben() in Buch nicht — jede Klasse, die ein Interface implementiert, muss zwingend alle seine Methoden bereitstellen (CS0535: Buch implementiert das Interface-Mitglied IBeschreibbar.Beschreiben() nicht)',
    },
    {
      code: `IBeschreibbar[] medien = new IBeschreibbar[2];
medien[0] = new Buch("Der Report");
medien[1] = new DVD("Der Film");

foreach (IBeschreibbar medium in medien)
{
    Console.WriteLine(medium.Beschreiben());
}

interface IBeschreibbar
{
    string Beschreiben();
}

class Buch : IBeschreibbar
{
    public string Titel;

    public Buch(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "Buch: " + Titel;
    }
}

sealed class DVD : IBeschreibbar
{
    public string Titel;

    public DVD(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "DVD: " + Titel;
    }
}

class BluRay : DVD
{
    public BluRay(string titel) : base(titel)
    {
    }
}`,
      reason: 'versucht mit class BluRay : DVD von der als sealed markierten Klasse DVD zu erben — der Compiler lehnt das ab (CS0509: BluRay kann nicht vom versiegelten Typ DVD abgeleitet werden), genau der Zweck von sealed',
    },
    {
      code: `IBeschreibbar[] medien = new IBeschreibbar[2];
medien[0] = new DVD("Der Film");
medien[1] = new Buch("Der Report");

foreach (IBeschreibbar medium in medien)
{
    Console.WriteLine(medium.Beschreiben());
}

interface IBeschreibbar
{
    string Beschreiben();
}

class Buch : IBeschreibbar
{
    public string Titel;

    public Buch(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "Buch: " + Titel;
    }
}

sealed class DVD : IBeschreibbar
{
    public string Titel;

    public DVD(string titel)
    {
        Titel = titel;
    }

    public string Beschreiben()
    {
        return "DVD: " + Titel;
    }
}`,
      reason: 'vertauscht die Reihenfolge der beiden Array-Zuweisungen (DVD zuerst, Buch danach) — kompiliert, liefert aber "DVD: Der Film" vor "Buch: Der Report" statt der erwarteten Reihenfolge',
    },
  ],
};
