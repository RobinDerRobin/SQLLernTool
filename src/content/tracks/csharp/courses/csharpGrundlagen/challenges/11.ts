import type { CSharpChallenge } from '../../../types';

export const challenge11: CSharpChallenge = {
  num: '11',
  title: 'Methoden: Optionale Parameter, ref/out, params-Array',
  tutorial: `Ein Parameter kann einen <b>Standardwert</b> bekommen: <code>int Steigern(int zahl, int schritt = 1) { return zahl + schritt; }</code> — wird <code>schritt</code> beim Aufruf weggelassen, gilt <code>1</code>, sonst der übergebene Wert. Normalerweise bekommt eine Methode nur eine <b>Kopie</b> eines Werts — Änderungen daran wirken sich nicht auf die Variable der Aufrufstelle aus. Mit <code>ref</code> vor Parameter <b>und</b> Argument (<code>void Verdoppeln(ref int zahl) { zahl = zahl * 2; }</code>, aufgerufen mit <code>Verdoppeln(ref wert);</code>) arbeitet die Methode direkt auf der Original-Variable. <code>out</code> ist ähnlich, aber für <b>Rückgabewerte</b> gedacht: eine Methode kann so mehr als einen Wert zurückgeben, typischerweise kombiniert mit einem <code>bool</code>-Erfolgs-Rückgabewert — <code>bool TryDurchTeilen(int zahl, int teiler, out int ergebnis) { ... }</code>, aufgerufen mit <code>TryDurchTeilen(20, 4, out int ergebnis)</code>. Mit <code>params</code> vor dem letzten Parameter (als Array-Typ) kann eine Methode <b>beliebig viele</b> Argumente entgegennehmen: <code>int Summiere(params int[] zahlen) { ... }</code> lässt sich mit <code>Summiere(1, 2, 3)</code> oder <code>Summiere(1, 2, 3, 4, 5)</code> aufrufen.`,
  task: `<b>Deine Aufgabe:</b> Definiere vier Methoden und rufe sie auf:<br>• <code>Steigern(int zahl, int schritt = 1)</code>: gibt <code>zahl + schritt</code> zurück, <code>schritt</code> optional mit Standardwert <code>1</code><br>• <code>Verdoppeln(ref int zahl)</code>: verdoppelt <code>zahl</code> direkt an der Aufrufstelle<br>• <code>TryDurchTeilen(int zahl, int teiler, out int ergebnis)</code>: bei <code>teiler == 0</code> setzt <code>ergebnis</code> auf <code>0</code> und gibt <code>false</code> zurück, sonst <code>ergebnis = zahl / teiler</code> und <code>true</code><br>• <code>Summiere(params int[] zahlen)</code>: gibt die Summe aller übergebenen Zahlen zurück<br><br>Rufe auf: <code>Steigern(5)</code> (ohne zweites Argument), <code>Steigern(5, 3)</code>, <code>Verdoppeln(ref wert)</code> mit <code>wert = 7</code>, <code>TryDurchTeilen(20, 4, out int ergebnis)</code>, <code>Summiere(1, 2, 3, 4)</code>. Gib die Ergebnisse (in dieser Reihenfolge: <code>ohneSchritt</code>, <code>mitSchritt</code>, <code>wert</code> nach dem Verdoppeln, <code>erfolg</code>, <code>ergebnis</code>, <code>gesamt</code>) mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Optionaler Parameter: <code>int Steigern(int zahl, int schritt = 1) { return zahl + schritt; }</code> — der Standardwert steht direkt in der Parameterliste. <code>Steigern(5)</code> nutzt ihn, <code>Steigern(5, 3)</code> überschreibt ihn.`,
    `<code>ref</code> steht sowohl in der Methoden-Signatur (<code>ref int zahl</code>) als auch beim Aufruf (<code>Verdoppeln(ref wert);</code>) — fehlt es an einer der beiden Stellen, lehnt der Compiler das ab. Bei <code>out</code> genauso: <code>out int ergebnis</code> in der Signatur, <code>out int ergebnis</code> (oder <code>out ergebnis</code>, falls schon deklariert) beim Aufruf. <code>params int[] zahlen</code> sammelt beliebig viele Argumente automatisch in einem Array — im Rumpf reicht ein normales <code>foreach</code> darüber.`,
    `So sieht die Lösung aus:<pre>int Steigern(int zahl, int schritt = 1)
{
    return zahl + schritt;
}

void Verdoppeln(ref int zahl)
{
    zahl = zahl * 2;
}

bool TryDurchTeilen(int zahl, int teiler, out int ergebnis)
{
    if (teiler == 0)
    {
        ergebnis = 0;
        return false;
    }
    ergebnis = zahl / teiler;
    return true;
}

int Summiere(params int[] zahlen)
{
    int summe = 0;
    foreach (int z in zahlen)
    {
        summe += z;
    }
    return summe;
}

int ohneSchritt = Steigern(5);
int mitSchritt = Steigern(5, 3);

int wert = 7;
Verdoppeln(ref wert);

bool erfolg = TryDurchTeilen(20, 4, out int ergebnis);

int gesamt = Summiere(1, 2, 3, 4);

Console.WriteLine(ohneSchritt);
Console.WriteLine(mitSchritt);
Console.WriteLine(wert);
Console.WriteLine(erfolg);
Console.WriteLine(ergebnis);
Console.WriteLine(gesamt);</pre>`,
  ] as const,
  solution: `int Steigern(int zahl, int schritt = 1)
{
    return zahl + schritt;
}

void Verdoppeln(ref int zahl)
{
    zahl = zahl * 2;
}

bool TryDurchTeilen(int zahl, int teiler, out int ergebnis)
{
    if (teiler == 0)
    {
        ergebnis = 0;
        return false;
    }
    ergebnis = zahl / teiler;
    return true;
}

int Summiere(params int[] zahlen)
{
    int summe = 0;
    foreach (int z in zahlen)
    {
        summe += z;
    }
    return summe;
}

int ohneSchritt = Steigern(5);
int mitSchritt = Steigern(5, 3);

int wert = 7;
Verdoppeln(ref wert);

bool erfolg = TryDurchTeilen(20, 4, out int ergebnis);

int gesamt = Summiere(1, 2, 3, 4);

Console.WriteLine(ohneSchritt);
Console.WriteLine(mitSchritt);
Console.WriteLine(wert);
Console.WriteLine(erfolg);
Console.WriteLine(ergebnis);
Console.WriteLine(gesamt);`,
  syntaxExplanation: `<ul><li><code>Steigern(5)</code> nutzt den Standardwert <code>schritt = 1</code>: 5 + 1 = 6. <code>Steigern(5, 3)</code> überschreibt ihn: 5 + 3 = 8.</li><li><code>Verdoppeln(ref wert)</code> ändert <code>wert</code> direkt an der Aufrufstelle: 7 wird zu 14.</li><li><code>TryDurchTeilen(20, 4, out int ergebnis)</code>: 4 ist nicht 0, also <code>ergebnis = 20 / 4 = 5</code> und <code>erfolg = true</code>.</li><li><code>Summiere(1, 2, 3, 4)</code> sammelt alle vier Argumente automatisch in einem <code>int[]</code>: 1+2+3+4 = 10.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau sechs Zeilen bestehen: "6", "8", "14", "True", "5" und "10", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['6', '8', '14', 'True', '5', '10'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den sechs Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Optionale Parameter, ref/out und params-Array korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int Steigern(int zahl, int schritt)
{
    return zahl + schritt;
}

void Verdoppeln(ref int zahl)
{
    zahl = zahl * 2;
}

bool TryDurchTeilen(int zahl, int teiler, out int ergebnis)
{
    if (teiler == 0)
    {
        ergebnis = 0;
        return false;
    }
    ergebnis = zahl / teiler;
    return true;
}

int Summiere(params int[] zahlen)
{
    int summe = 0;
    foreach (int z in zahlen)
    {
        summe += z;
    }
    return summe;
}

int ohneSchritt = Steigern(5);
int mitSchritt = Steigern(5, 3);

int wert = 7;
Verdoppeln(ref wert);

bool erfolg = TryDurchTeilen(20, 4, out int ergebnis);

int gesamt = Summiere(1, 2, 3, 4);

Console.WriteLine(ohneSchritt);
Console.WriteLine(mitSchritt);
Console.WriteLine(wert);
Console.WriteLine(erfolg);
Console.WriteLine(ergebnis);
Console.WriteLine(gesamt);`,
      reason: 'vergisst den Standardwert = 1 bei schritt — Steigern(5) mit nur einem Argument hat dann keinen passenden Aufruf mehr und lehnt mit einem Compilerfehler ab (CS7036: kein Argument für den erforderlichen Parameter schritt)',
    },
    {
      code: `int Steigern(int zahl, int schritt = 1)
{
    return zahl + schritt;
}

void Verdoppeln(ref int zahl)
{
    zahl = zahl * 2;
}

bool TryDurchTeilen(int zahl, int teiler, out int ergebnis)
{
    if (teiler == 0)
    {
        ergebnis = 0;
        return false;
    }
    ergebnis = zahl / teiler;
    return true;
}

int Summiere(params int[] zahlen)
{
    int summe = 0;
    foreach (int z in zahlen)
    {
        summe += z;
    }
    return summe;
}

int ohneSchritt = Steigern(5);
int mitSchritt = Steigern(5, 3);

int wert = 7;
Verdoppeln(wert);

bool erfolg = TryDurchTeilen(20, 4, out int ergebnis);

int gesamt = Summiere(1, 2, 3, 4);

Console.WriteLine(ohneSchritt);
Console.WriteLine(mitSchritt);
Console.WriteLine(wert);
Console.WriteLine(erfolg);
Console.WriteLine(ergebnis);
Console.WriteLine(gesamt);`,
      reason: 'ruft Verdoppeln(wert) ohne das ref-Schlüsselwort beim Aufruf auf, obwohl die Methode ref int zahl erwartet — der Compiler lehnt das ab (CS1620: Argument muss mit dem Schlüsselwort ref übergeben werden)',
    },
    {
      code: `int Steigern(int zahl, int schritt = 1)
{
    return zahl + schritt;
}

void Verdoppeln(ref int zahl)
{
    zahl = zahl * 2;
}

bool TryDurchTeilen(int zahl, int teiler, out int ergebnis)
{
    if (teiler == 0)
    {
        ergebnis = 0;
        return false;
    }
    ergebnis = zahl / teiler;
    return true;
}

int Summiere(params int[] zahlen)
{
    return zahlen.Length;
}

int ohneSchritt = Steigern(5);
int mitSchritt = Steigern(5, 3);

int wert = 7;
Verdoppeln(ref wert);

bool erfolg = TryDurchTeilen(20, 4, out int ergebnis);

int gesamt = Summiere(1, 2, 3, 4);

Console.WriteLine(ohneSchritt);
Console.WriteLine(mitSchritt);
Console.WriteLine(wert);
Console.WriteLine(erfolg);
Console.WriteLine(ergebnis);
Console.WriteLine(gesamt);`,
      reason: 'gibt in Summiere zahlen.Length statt der aufsummierten Werte zurück — verwechselt die Anzahl der Argumente mit ihrer Summe, gesamt wird fälschlich 4 statt 10',
    },
  ],
};
