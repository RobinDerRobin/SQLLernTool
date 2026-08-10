import type { CSharpChallenge } from '../../../types';

export const challenge18: CSharpChallenge = {
  num: '18',
  title: 'Fehlerbehandlung: try/catch, spezifische Exception-Typen, finally',
  tutorial: `Manche Fehler passieren nicht beim Kompilieren, sondern erst <b>zur Laufzeit</b> — ein Array-Zugriff außerhalb der Grenzen, eine Division durch 0. Ohne Gegenmaßnahme stürzt das Programm dann komplett ab. Ein <code>try</code>-Block umschließt riskanten Code; tritt darin ein Fehler auf, springt die Ausführung sofort in den passenden <code>catch</code>-Block, statt das Programm zu beenden: <code>try { ... } catch (IndexOutOfRangeException) { ... }</code>. Wichtig: <code>catch</code> fängt nur den <b>angegebenen</b> Exception-Typ (oder dessen Unterklassen) — ein <code>catch (FormatException)</code> lässt eine <code>IndexOutOfRangeException</code> ungefangen durchlaufen, das Programm stürzt trotzdem ab. Verschiedene Fehlerarten haben eigene, spezifische Typen: <code>IndexOutOfRangeException</code> für Array-Zugriffe außerhalb der Grenzen, <code>DivideByZeroException</code> für Ganzzahl-Division durch 0. Ein <code>finally</code>-Block läuft <b>immer</b> nach <code>try</code>/<code>catch</code> — egal ob ein Fehler auftrat oder nicht, und egal ob er gefangen wurde.`,
  task: `<b>Deine Aufgabe:</b> Ein Array <code>int[] zahlen = { 10, 20, 30 };</code> ist gegeben.<br><br><b>Teil 1:</b> In einem <code>try</code>-Block: setze <code>ergebnis</code> (vorher <code>-1</code>) auf <code>zahlen[5]</code> (ein absichtlich ungültiger Index) und <code>indexStatus</code> auf <code>"Erfolg"</code>. Fange <code>IndexOutOfRangeException</code> gezielt und setze <code>indexStatus</code> auf <code>"Index ungueltig"</code>. Hänge in einem <code>finally</code>-Block <code>" (beendet)"</code> an <code>indexStatus</code> an.<br><br><b>Teil 2:</b> Mit <code>int a = 10;</code> und <code>int b = 0;</code>, in einem weiteren <code>try</code>-Block: setze <code>divisionStatus</code> auf <code>"Erfolg"</code>, nachdem <code>a / b</code> berechnet wurde. Fange <code>DivideByZeroException</code> gezielt und setze <code>divisionStatus</code> auf <code>"Division durch 0"</code>.<br><br>Gib <code>ergebnis</code>, <code>indexStatus</code> und <code>divisionStatus</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `<code>try { ergebnis = zahlen[5]; indexStatus = "Erfolg"; } catch (IndexOutOfRangeException) { indexStatus = "Index ungueltig"; } finally { indexStatus = indexStatus + " (beendet)"; }</code> — der <code>finally</code>-Block läuft in jedem Fall, egal welcher Zweig vorher lief.`,
    `Für die Division genauso aufgebaut: <code>try { int quotient = a / b; divisionStatus = "Erfolg"; } catch (DivideByZeroException) { divisionStatus = "Division durch 0"; }</code> — kein <code>finally</code> nötig, die Aufgabe verlangt hier nur <code>try</code>/<code>catch</code>. Wichtig: <code>ergebnis</code> bleibt bei seinem Startwert <code>-1</code>, weil die Zuweisung <code>ergebnis = zahlen[5];</code> abbricht, bevor sie abgeschlossen ist.`,
    `So sieht die Lösung aus:<pre>int[] zahlen = { 10, 20, 30 };
int ergebnis = -1;
string indexStatus = "";

try
{
    ergebnis = zahlen[5];
    indexStatus = "Erfolg";
}
catch (IndexOutOfRangeException)
{
    indexStatus = "Index ungueltig";
}
finally
{
    indexStatus = indexStatus + " (beendet)";
}

int a = 10;
int b = 0;
string divisionStatus = "";

try
{
    int quotient = a / b;
    divisionStatus = "Erfolg";
}
catch (DivideByZeroException)
{
    divisionStatus = "Division durch 0";
}

Console.WriteLine(ergebnis);
Console.WriteLine(indexStatus);
Console.WriteLine(divisionStatus);</pre>`,
  ] as const,
  solution: `int[] zahlen = { 10, 20, 30 };
int ergebnis = -1;
string indexStatus = "";

try
{
    ergebnis = zahlen[5];
    indexStatus = "Erfolg";
}
catch (IndexOutOfRangeException)
{
    indexStatus = "Index ungueltig";
}
finally
{
    indexStatus = indexStatus + " (beendet)";
}

int a = 10;
int b = 0;
string divisionStatus = "";

try
{
    int quotient = a / b;
    divisionStatus = "Erfolg";
}
catch (DivideByZeroException)
{
    divisionStatus = "Division durch 0";
}

Console.WriteLine(ergebnis);
Console.WriteLine(indexStatus);
Console.WriteLine(divisionStatus);`,
  syntaxExplanation: `<ul><li><code>zahlen[5]</code> — das Array hat nur die Indizes 0-2, der Zugriff wirft eine <code>IndexOutOfRangeException</code>, bevor die Zuweisung an <code>ergebnis</code> abgeschlossen wird — <code>ergebnis</code> bleibt bei <code>-1</code>.</li><li><code>finally</code> hängt <code>" (beendet)"</code> an, egal was vorher im <code>try</code>/<code>catch</code> passierte: "Index ungueltig (beendet)".</li><li><code>a / b</code> mit <code>b = 0</code> wirft eine <code>DivideByZeroException</code>, gefangen vom passenden <code>catch</code>: "Division durch 0".</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "-1", "Index ungueltig (beendet)" und "Division durch 0", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['-1', 'Index ungueltig (beendet)', 'Division durch 0'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'try/catch, spezifische Exception-Typen und finally korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int[] zahlen = { 10, 20, 30 };
int ergebnis = -1;
string indexStatus = "";

try
{
    ergebnis = zahlen[5];
    indexStatus = "Erfolg";
}
catch (IndexOutOfRangeException)
{
    indexStatus = "Index ungueltig";
}

int a = 10;
int b = 0;
string divisionStatus = "";

try
{
    int quotient = a / b;
    divisionStatus = "Erfolg";
}
catch (DivideByZeroException)
{
    divisionStatus = "Division durch 0";
}

Console.WriteLine(ergebnis);
Console.WriteLine(indexStatus);
Console.WriteLine(divisionStatus);`,
      reason: 'lässt den finally-Block komplett weg — indexStatus bleibt bei "Index ungueltig" statt zusätzlich " (beendet)" angehängt zu bekommen',
    },
    {
      code: `int[] zahlen = { 10, 20, 30 };
int ergebnis = -1;
string indexStatus = "";

try
{
    ergebnis = zahlen[5];
    indexStatus = "Erfolg";
}
catch (FormatException)
{
    indexStatus = "Index ungueltig";
}
finally
{
    indexStatus = indexStatus + " (beendet)";
}

int a = 10;
int b = 0;
string divisionStatus = "";

try
{
    int quotient = a / b;
    divisionStatus = "Erfolg";
}
catch (DivideByZeroException)
{
    divisionStatus = "Division durch 0";
}

Console.WriteLine(ergebnis);
Console.WriteLine(indexStatus);
Console.WriteLine(divisionStatus);`,
      reason: 'fängt FormatException statt der tatsächlich geworfenen IndexOutOfRangeException — der falsche Exception-Typ passt nicht, die Ausnahme bleibt ungefangen und das Programm stürzt komplett ab, noch bevor irgendeine Ausgabe erfolgt',
    },
    {
      code: `int[] zahlen = { 10, 20, 30 };
int ergebnis = -1;
string indexStatus = "";

try
{
    ergebnis = zahlen[5];
    indexStatus = "Erfolg";
}
catch (IndexOutOfRangeException)
{
    indexStatus = "Index ungueltig";
}
finally
{
    indexStatus = indexStatus + " (beendet)";
}

int a = 10;
int b = 0;
string divisionStatus = "";

try
{
    int quotient = b / a;
    divisionStatus = "Erfolg";
}
catch (DivideByZeroException)
{
    divisionStatus = "Division durch 0";
}

Console.WriteLine(ergebnis);
Console.WriteLine(indexStatus);
Console.WriteLine(divisionStatus);`,
      reason: 'vertauscht b / a statt a / b — 0 / 10 wirft keine Exception (nur eine Division durch 0 als Nenner ist das Problem), divisionStatus bleibt fälschlich "Erfolg" statt "Division durch 0"',
    },
  ],
};
