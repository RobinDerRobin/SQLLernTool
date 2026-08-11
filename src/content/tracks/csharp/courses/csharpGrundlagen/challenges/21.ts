import type { CSharpChallenge } from '../../../types';

export const challenge21: CSharpChallenge = {
  num: '21',
  title: 'Events: das event-Schlüsselwort und eingeschränkter Zugriff',
  tutorial: `Ein <b>Event</b> ist ein Delegate-Feld mit einer wichtigen Einschränkung: Code <b>außerhalb</b> der Klasse darf sich nur an- und abmelden (<code>+=</code>/<code>-=</code>), aber nicht direkt aufrufen oder überschreiben. Deklariert wird es mit dem Schlüsselwort <code>event</code> vor einem Delegate-Typ, oft dem eingebauten <code>Action&lt;T&gt;</code>: <code>public event Action&lt;int&gt;? SaldoNiedrig;</code> — ohne <code>event</code> wäre das nur ein ganz normales öffentliches Feld, das jeder von außen beliebig aufrufen oder mit <code>=</code> komplett überschreiben (und damit alle bisherigen Abonnenten verlieren) könnte. <b>Innerhalb</b> der Klasse, die das Event deklariert, darfst du es dagegen ganz normal aufrufen — typischerweise mit dem <b>Null-conditional-Operator</b> <code>?.</code>: <code>SaldoNiedrig?.Invoke(saldo);</code> — das <code>?.</code> verhindert eine <code>NullReferenceException</code>, falls sich noch niemand angemeldet hat (das Event ist dann <code>null</code>). Von außen meldet man sich mit einem Lambda-Ausdruck oder einer Methode an: <code>konto.SaldoNiedrig += meldung =&gt; { ... };</code> — genau dieselbe <code>+=</code>-Syntax, die du schon von Delegates kennst.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Kontostand</code> mit einem Event <code>public event Action&lt;int&gt;? SaldoNiedrig;</code>, einem privaten Feld <code>saldo</code> und einem Konstruktor <code>Kontostand(int startSaldo)</code>, der es setzt.<br><br>Definiere eine Methode <code>void Abheben(int betrag)</code>, die <code>saldo</code> um <code>betrag</code> verringert und danach, falls <code>saldo &lt; 50</code> ist, das Event per <code>SaldoNiedrig?.Invoke(saldo);</code> auslöst.<br><br>Erzeuge im Hauptprogramm eine Instanz <code>new Kontostand(100)</code>, melde dich mit <code>+=</code> an einem Lambda an, das eine Variable <code>status</code> auf <code>"Warnung ausgelöst"</code> und eine Variable <code>letzterSaldo</code> auf den übergebenen Saldo setzt (Startwerte: <code>status = "unverändert"</code>, <code>letzterSaldo = -1</code>).<br><br>Rufe <code>Abheben(30)</code> auf und gib <code>"Nach erster Abhebung: " + status</code> aus. Rufe danach <code>Abheben(30)</code> erneut auf und gib <code>"Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo</code> aus.`,
  hints: [
    `Die Event-Deklaration braucht das Schlüsselwort <code>event</code> direkt vor dem Delegate-Typ: <code>public event Action&lt;int&gt;? SaldoNiedrig;</code> — das <code>?</code> macht den Typ nullable, weil vor der ersten Anmeldung niemand zuhört.`,
    `Innerhalb von <code>Abheben</code> löst du das Event mit <code>SaldoNiedrig?.Invoke(saldo);</code> aus — das <code>?.</code> ist Pflicht, sonst würde ein Aufruf ohne Abonnenten mit einer <code>NullReferenceException</code> abstürzen. Von außen meldest du dich mit <code>konto.SaldoNiedrig += saldo => { ... };</code> an, genau wie bei einem normalen Delegate.`,
    `So sieht die Lösung aus:<pre>string status = "unverändert";
int letzterSaldo = -1;

Kontostand konto = new Kontostand(100);
konto.SaldoNiedrig += saldo =>
{
    status = "Warnung ausgelöst";
    letzterSaldo = saldo;
};

konto.Abheben(30);
Console.WriteLine("Nach erster Abhebung: " + status);

konto.Abheben(30);
Console.WriteLine("Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo);

class Kontostand
{
    public event Action<int>? SaldoNiedrig;
    private int saldo;

    public Kontostand(int startSaldo)
    {
        saldo = startSaldo;
    }

    public void Abheben(int betrag)
    {
        saldo -= betrag;
        if (saldo < 50)
        {
            SaldoNiedrig?.Invoke(saldo);
        }
    }
}</pre>`,
  ] as const,
  solution: `string status = "unverändert";
int letzterSaldo = -1;

Kontostand konto = new Kontostand(100);
konto.SaldoNiedrig += saldo =>
{
    status = "Warnung ausgelöst";
    letzterSaldo = saldo;
};

konto.Abheben(30);
Console.WriteLine("Nach erster Abhebung: " + status);

konto.Abheben(30);
Console.WriteLine("Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo);

class Kontostand
{
    public event Action<int>? SaldoNiedrig;
    private int saldo;

    public Kontostand(int startSaldo)
    {
        saldo = startSaldo;
    }

    public void Abheben(int betrag)
    {
        saldo -= betrag;
        if (saldo < 50)
        {
            SaldoNiedrig?.Invoke(saldo);
        }
    }
}`,
  syntaxExplanation: `<ul><li><code>public event Action&lt;int&gt;? SaldoNiedrig;</code> — ein Event auf Basis des eingebauten <code>Action&lt;int&gt;</code>-Delegate-Typs, nullable bis zur ersten Anmeldung.</li><li><code>konto.SaldoNiedrig += saldo =&gt; { ... };</code> — Anmeldung von außen per Lambda-Ausdruck, dieselbe Syntax wie bei einem normalen Delegate.</li><li><code>SaldoNiedrig?.Invoke(saldo);</code> — Auslösen von <b>innerhalb</b> der Klasse; das <code>?.</code> verhindert eine <code>NullReferenceException</code>, falls niemand angemeldet ist.</li><li>Erste <code>Abheben(30)</code>: <code>saldo</code> sinkt von 100 auf 70, <code>70 &lt; 50</code> ist falsch, kein Event, <code>status</code> bleibt <code>"unverändert"</code>.</li><li>Zweite <code>Abheben(30)</code>: <code>saldo</code> sinkt auf 40, <code>40 &lt; 50</code> ist wahr, das Event feuert, <code>status</code> wird <code>"Warnung ausgelöst"</code>, <code>letzterSaldo</code> wird 40.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau zwei Zeilen bestehen: "Nach erster Abhebung: unverändert" und "Nach zweiter Abhebung: Warnung ausgelöst, Saldo: 40", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Nach erster Abhebung: unverändert', 'Nach zweiter Abhebung: Warnung ausgelöst, Saldo: 40'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den zwei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Event mit event-Schlüsselwort, Anmeldung per += und Auslösen per ?.Invoke korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `string status = "unverändert";
int letzterSaldo = -1;

Kontostand konto = new Kontostand(100);
konto.SaldoNiedrig += saldo =>
{
    status = "Warnung ausgelöst";
    letzterSaldo = saldo;
};

konto.Abheben(30);
Console.WriteLine("Nach erster Abhebung: " + status);

konto.Abheben(30);
konto.SaldoNiedrig(letzterSaldo);
Console.WriteLine("Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo);

class Kontostand
{
    public event Action<int>? SaldoNiedrig;
    private int saldo;

    public Kontostand(int startSaldo)
    {
        saldo = startSaldo;
    }

    public void Abheben(int betrag)
    {
        saldo -= betrag;
        if (saldo < 50)
        {
            SaldoNiedrig?.Invoke(saldo);
        }
    }
}`,
      reason: 'versucht das Event direkt von außen aufzurufen (konto.SaldoNiedrig(letzterSaldo);) statt nur per += anzumelden — genau das verhindert das event-Schlüsselwort: der Compiler lehnt jeden Aufruf/jede Zuweisung eines Events von außerhalb der deklarierenden Klasse ab (CS0070: das Event kann nur auf der linken Seite von += oder -= stehen, außer innerhalb des deklarierenden Typs)',
    },
    {
      code: `string status = "unverändert";
int letzterSaldo = -1;

Kontostand konto = new Kontostand(100);
konto.SaldoNiedrig += saldo =>
{
    status = "Warnung ausgelöst";
    letzterSaldo = saldo;
};
konto.SaldoNiedrig?.Invoke(999);

konto.Abheben(30);
Console.WriteLine("Nach erster Abhebung: " + status);

konto.Abheben(30);
Console.WriteLine("Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo);

class Kontostand
{
    public Action<int>? SaldoNiedrig;
    private int saldo;

    public Kontostand(int startSaldo)
    {
        saldo = startSaldo;
    }

    public void Abheben(int betrag)
    {
        saldo -= betrag;
        if (saldo < 50)
        {
            SaldoNiedrig?.Invoke(saldo);
        }
    }
}`,
      reason: 'lässt das event-Schlüsselwort bei der Deklaration weg (nur public Action<int>? SaldoNiedrig; statt public event Action<int>? SaldoNiedrig;) — dadurch kompiliert ein direkter Aufruf von außen (konto.SaldoNiedrig?.Invoke(999);) klaglos, statt vom Compiler abgelehnt zu werden, und löst die Warnung schon vor der ersten Abhebung fälschlich aus: "Nach erster Abhebung: Warnung ausgelöst" statt "Nach erster Abhebung: unverändert"',
    },
    {
      code: `string status = "unverändert";
int letzterSaldo = -1;

Kontostand konto = new Kontostand(100);
konto.SaldoNiedrig += saldo =>
{
    status = "Warnung ausgelöst";
    letzterSaldo = saldo;
};

konto.Abheben(30);
Console.WriteLine("Nach erster Abhebung: " + status);

konto.Abheben(30);
Console.WriteLine("Nach zweiter Abhebung: " + status + ", Saldo: " + letzterSaldo);

class Kontostand
{
    public event Action<int>? SaldoNiedrig;
    private int saldo;

    public Kontostand(int startSaldo)
    {
        saldo = startSaldo;
    }

    public void Abheben(int betrag)
    {
        saldo -= betrag;
        if (saldo < 40)
        {
            SaldoNiedrig?.Invoke(saldo);
        }
    }
}`,
      reason: 'ändert die Auslöse-Bedingung von saldo < 50 auf saldo < 40 — nach der zweiten Abhebung steht saldo genau bei 40, 40 < 40 ist falsch, das Event feuert nie, die Ausgabe bleibt fälschlich bei "Nach zweiter Abhebung: unverändert, Saldo: -1" statt der erwarteten Warnung',
    },
  ],
};
