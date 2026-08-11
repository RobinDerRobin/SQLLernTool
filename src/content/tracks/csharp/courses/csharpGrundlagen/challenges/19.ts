import type { CSharpChallenge } from '../../../types';

export const challenge19: CSharpChallenge = {
  num: '19',
  title: 'Eigene Exceptions: throw und custom-exception-Klassen',
  tutorial: `Mit <code>throw new Exception("...");</code> löst du selbst eine Exception aus, statt nur auf welche zu reagieren, die die Laufzeit von sich aus wirft. <code>throw</code> beendet die aktuelle Methode sofort — Code danach läuft nicht mehr, es sei denn ein umschließendes <code>catch</code> fängt sie ab. Statt der eingebauten <code>Exception</code>-Klasse kannst du eine <b>eigene</b> definieren, die von ihr erbt: <code>class UngueltigesAlterException : Exception { }</code> — dieselbe <code>:</code>-Vererbungssyntax wie bei jeder anderen Klasse. Ihr Konstruktor reicht die Fehlermeldung meist einfach an den Basis-Konstruktor weiter: <code>public UngueltigesAlterException(string nachricht) : base(nachricht) { }</code> — ohne dieses <code>base(nachricht)</code> bleibt die geerbte <code>Message</code>-Property auf ihrem generischen Standardtext stehen, statt deine eigene Nachricht zu zeigen. Ein <code>catch</code>-Block für die eigene Exception-Klasse funktioniert genau wie bei eingebauten Typen: <code>catch (UngueltigesAlterException e) { ... e.Message ... }</code>.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine eigene Exception-Klasse <code>UngueltigesAlterException : Exception</code> mit einem Konstruktor <code>UngueltigesAlterException(string nachricht)</code>, der die Nachricht per <code>: base(nachricht)</code> weiterreicht.<br><br>Definiere eine Methode <code>void PruefeAlter(int alter)</code>, die bei <code>alter &lt; 0</code> mit <code>throw new UngueltigesAlterException("Alter darf nicht negativ sein");</code> die eigene Exception auslöst.<br><br>Rufe <code>PruefeAlter(25)</code> in einem <code>try</code>/<code>catch (UngueltigesAlterException e)</code>-Block auf, setze <code>ergebnis1</code> auf <code>"OK"</code> bei Erfolg bzw. <code>"Fehler: " + e.Message</code> im <code>catch</code>. Genauso für <code>PruefeAlter(-5)</code> mit <code>ergebnis2</code>. Gib <code>ergebnis1</code> und <code>ergebnis2</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Eigene Exception-Klasse: <code>class UngueltigesAlterException : Exception { public UngueltigesAlterException(string nachricht) : base(nachricht) { } }</code> — das <code>: base(nachricht)</code> ist entscheidend, sonst zeigt <code>e.Message</code> später nur den generischen Standardtext.`,
    `<code>throw</code> steht direkt vor <code>new</code>: <code>throw new UngueltigesAlterException("Alter darf nicht negativ sein");</code> — ohne <code>throw</code> würde nur ein Exception-<b>Objekt</b> erzeugt, aber nie tatsächlich ausgelöst, und der Code danach würde ganz normal weiterlaufen.`,
    `So sieht die Lösung aus:<pre>string ergebnis1 = "";
try
{
    PruefeAlter(25);
    ergebnis1 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis1 = "Fehler: " + e.Message;
}

string ergebnis2 = "";
try
{
    PruefeAlter(-5);
    ergebnis2 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis2 = "Fehler: " + e.Message;
}

Console.WriteLine(ergebnis1);
Console.WriteLine(ergebnis2);

void PruefeAlter(int alter)
{
    if (alter < 0)
    {
        throw new UngueltigesAlterException("Alter darf nicht negativ sein");
    }
}

class UngueltigesAlterException : Exception
{
    public UngueltigesAlterException(string nachricht) : base(nachricht)
    {
    }
}</pre>`,
  ] as const,
  solution: `string ergebnis1 = "";
try
{
    PruefeAlter(25);
    ergebnis1 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis1 = "Fehler: " + e.Message;
}

string ergebnis2 = "";
try
{
    PruefeAlter(-5);
    ergebnis2 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis2 = "Fehler: " + e.Message;
}

Console.WriteLine(ergebnis1);
Console.WriteLine(ergebnis2);

void PruefeAlter(int alter)
{
    if (alter < 0)
    {
        throw new UngueltigesAlterException("Alter darf nicht negativ sein");
    }
}

class UngueltigesAlterException : Exception
{
    public UngueltigesAlterException(string nachricht) : base(nachricht)
    {
    }
}`,
  syntaxExplanation: `<ul><li><code>PruefeAlter(25)</code> — <code>25 &lt; 0</code> ist falsch, kein <code>throw</code>, <code>ergebnis1</code> wird <code>"OK"</code>.</li><li><code>PruefeAlter(-5)</code> — <code>-5 &lt; 0</code> ist wahr, <code>throw new UngueltigesAlterException(...)</code> löst die Exception aus, das umschließende <code>catch (UngueltigesAlterException e)</code> fängt sie, <code>e.Message</code> liefert die per <code>base(nachricht)</code> weitergereichte Nachricht.</li><li><code>UngueltigesAlterException : Exception</code> — dieselbe Vererbungssyntax wie bei jeder anderen Klasse, macht die eigene Klasse zu einer echten, fangbaren Exception.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau zwei Zeilen bestehen: "OK" und "Fehler: Alter darf nicht negativ sein", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['OK', 'Fehler: Alter darf nicht negativ sein'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den zwei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'throw und eine eigene Exception-Klasse korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `string ergebnis1 = "";
try
{
    PruefeAlter(25);
    ergebnis1 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis1 = "Fehler: " + e.Message;
}

string ergebnis2 = "";
try
{
    PruefeAlter(-5);
    ergebnis2 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis2 = "Fehler: " + e.Message;
}

Console.WriteLine(ergebnis1);
Console.WriteLine(ergebnis2);

void PruefeAlter(int alter)
{
    if (alter < 0)
    {
        new UngueltigesAlterException("Alter darf nicht negativ sein");
    }
}

class UngueltigesAlterException : Exception
{
    public UngueltigesAlterException(string nachricht) : base(nachricht)
    {
    }
}`,
      reason: 'vergisst das throw vor new UngueltigesAlterException(...) — es wird nur ein Exception-Objekt erzeugt, aber nie tatsächlich ausgelöst, PruefeAlter(-5) läuft dadurch normal durch, ergebnis2 wird fälschlich "OK" statt der Fehlermeldung',
    },
    {
      code: `string ergebnis1 = "";
try
{
    PruefeAlter(25);
    ergebnis1 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis1 = "Fehler: " + e.Message;
}

string ergebnis2 = "";
try
{
    PruefeAlter(-5);
    ergebnis2 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis2 = "Fehler: " + e.Message;
}

Console.WriteLine(ergebnis1);
Console.WriteLine(ergebnis2);

void PruefeAlter(int alter)
{
    if (alter < 0)
    {
        throw new UngueltigesAlterException("Alter darf nicht negativ sein");
    }
}

class UngueltigesAlterException : Exception
{
    public UngueltigesAlterException(string nachricht)
    {
    }
}`,
      reason: 'vergisst : base(nachricht) im Konstruktor — die eigene Nachricht wird nie an die geerbte Message-Property weitergereicht, e.Message liefert stattdessen den generischen Standardtext "Exception of type \'UngueltigesAlterException\' was thrown." statt der eigenen Nachricht',
    },
    {
      code: `string ergebnis1 = "";
try
{
    PruefeAlter(25);
    ergebnis1 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis1 = "Fehler: " + e.Message;
}

string ergebnis2 = "";
try
{
    PruefeAlter(-5);
    ergebnis2 = "OK";
}
catch (UngueltigesAlterException e)
{
    ergebnis2 = "Fehler: " + e.Message;
}

Console.WriteLine(ergebnis1);
Console.WriteLine(ergebnis2);

void PruefeAlter(int alter)
{
    if (alter < 0)
    {
        throw new UngueltigesAlterException("Alter darf nicht negativ sein");
    }
}

class UngueltigesAlterException
{
    public UngueltigesAlterException(string nachricht)
    {
    }
}`,
      reason: 'lässt : Exception bei der Klassendefinition weg — eine Klasse, die nicht von Exception erbt, lässt sich weder werfen noch fangen (CS0155: geworfene/gefangene Typen müssen von System.Exception abgeleitet sein), zusätzlich fehlt dann auch die geerbte Message-Property (CS1061)',
    },
  ],
};
