import type { CSharpChallenge } from '../../../types';

export const challenge20: CSharpChallenge = {
  num: '20',
  title: 'Delegates: eigener Delegate-Typ, Lambda-Ausdrücke und Func<>',
  tutorial: `Ein <b>Delegate</b> ist ein Typ, der nicht einen Wert wie <code>int</code> oder <code>string</code> beschreibt, sondern eine <b>Methodensignatur</b>: <code>delegate int RechenOperation(int a, int b);</code> definiert einen Typ namens <code>RechenOperation</code> für "jede Methode, die zwei <code>int</code> nimmt und ein <code>int</code> zurückgibt". Eine Variable dieses Typs kann eine passende Methode <b>als Wert</b> speichern: <code>RechenOperation operation1 = Addieren;</code> — hier steht <code>Addieren</code> ohne Klammern, es wird nur auf die Methode verwiesen, nicht sie aufgerufen. Aufgerufen wird sie erst über die Variable: <code>operation1(3, 4)</code>. Statt einer benannten Methode kannst du auch einen <b>Lambda-Ausdruck</b> direkt zuweisen — eine anonyme Inline-Funktion: <code>RechenOperation operation2 = (a, b) => a * b;</code> — links die Parameter, <code>=&gt;</code> ("ergibt"), rechts der Ausdruck, dessen Wert automatisch zurückgegeben wird. Für den häufigen Fall "Methodensignatur mit Rückgabewert" musst du keinen eigenen <code>delegate</code>-Typ definieren — C# bringt dafür den generischen Typ <code>Func&lt;T1, T2, ..., TResult&gt;</code> mit: <code>Func&lt;int, int, int&gt;</code> steht für "nimmt zwei <code>int</code>, gibt ein <code>int</code> zurück", die letzte Typangabe ist immer der Rückgabetyp.`,
  task: `<b>Deine Aufgabe:</b> Definiere einen Delegate-Typ <code>delegate int RechenOperation(int a, int b);</code> (denk daran: die Zeile muss ans Ende der Datei, nach allen Anweisungen — C# verlangt, dass Top-Level-Anweisungen vor Typ-Deklarationen wie <code>delegate</code> oder <code>class</code> stehen).<br><br>Definiere eine Methode <code>int Addieren(int a, int b)</code>, die die Summe zurückgibt. Weise sie einer Variable <code>RechenOperation operation1</code> zu und rufe <code>operation1(3, 4)</code> auf, das Ergebnis in <code>ergebnis1</code>.<br><br>Weise einer Variable <code>RechenOperation operation2</code> direkt den Lambda-Ausdruck <code>(a, b) =&gt; a * b</code> zu und rufe <code>operation2(3, 4)</code> auf, das Ergebnis in <code>ergebnis2</code>.<br><br>Weise einer Variable <code>Func&lt;int, int, int&gt; operation3</code> den Lambda-Ausdruck <code>(a, b) =&gt; a - b</code> zu und rufe <code>operation3(10, 4)</code> auf, das Ergebnis in <code>ergebnis3</code>.<br><br>Gib mit drei <code>Console.WriteLine(...)</code> genau diese drei Zeilen aus: <code>"Addieren: " + ergebnis1</code>, <code>"Multiplizieren: " + ergebnis2</code>, <code>"Subtrahieren: " + ergebnis3</code>.`,
  hints: [
    `Der Delegate-Typ steht wie eine Methodensignatur ohne Körper: <code>delegate int RechenOperation(int a, int b);</code> — danach ist <code>RechenOperation</code> ein ganz normaler Typname, den du für Variablen benutzen kannst.`,
    `Eine Methode einer Delegate-Variable zuzuweisen sieht aus wie eine normale Zuweisung, aber <b>ohne Klammern</b> hinter dem Methodennamen: <code>RechenOperation operation1 = Addieren;</code> (nicht <code>Addieren()</code> — Klammern würden die Methode sofort aufrufen statt sie zu übergeben). Ein Lambda-Ausdruck lässt sich genauso einer Delegate- oder <code>Func&lt;&gt;</code>-Variable zuweisen: <code>RechenOperation operation2 = (a, b) =&gt; a * b;</code>. Achtung: alle Top-Level-Anweisungen müssen <b>vor</b> allen Typ-Deklarationen stehen — ein <code>delegate</code> ist genau wie <code>class</code> eine Typ-Deklaration, die <code>delegate</code>-Zeile muss also ans <b>Ende</b> der Datei, sogar nach der lokalen Methode <code>Addieren</code> (Compilerfehler sonst: <code>CS8803</code>).`,
    `So sieht die Lösung aus:<pre>RechenOperation operation1 = Addieren;
int ergebnis1 = operation1(3, 4);

RechenOperation operation2 = (a, b) =&gt; a * b;
int ergebnis2 = operation2(3, 4);

Func&lt;int, int, int&gt; operation3 = (a, b) =&gt; a - b;
int ergebnis3 = operation3(10, 4);

Console.WriteLine("Addieren: " + ergebnis1);
Console.WriteLine("Multiplizieren: " + ergebnis2);
Console.WriteLine("Subtrahieren: " + ergebnis3);

int Addieren(int a, int b)
{
    return a + b;
}

delegate int RechenOperation(int a, int b);</pre>`,
  ] as const,
  solution: `RechenOperation operation1 = Addieren;
int ergebnis1 = operation1(3, 4);

RechenOperation operation2 = (a, b) => a * b;
int ergebnis2 = operation2(3, 4);

Func<int, int, int> operation3 = (a, b) => a - b;
int ergebnis3 = operation3(10, 4);

Console.WriteLine("Addieren: " + ergebnis1);
Console.WriteLine("Multiplizieren: " + ergebnis2);
Console.WriteLine("Subtrahieren: " + ergebnis3);

int Addieren(int a, int b)
{
    return a + b;
}

delegate int RechenOperation(int a, int b);`,
  syntaxExplanation: `<ul><li><code>delegate int RechenOperation(int a, int b);</code> — definiert einen Typ für "Methode mit dieser Signatur", nicht eine Methode selbst.</li><li><code>RechenOperation operation1 = Addieren;</code> — die Methode <code>Addieren</code> wird ohne Aufruf-Klammern als Wert zugewiesen, <code>operation1</code> "zeigt" jetzt auf sie.</li><li><code>RechenOperation operation2 = (a, b) => a * b;</code> — ein Lambda-Ausdruck erfüllt dieselbe Signatur, ganz ohne eigene benannte Methode.</li><li><code>Func&lt;int, int, int&gt; operation3</code> — der eingebaute generische Delegate-Typ erspart die eigene <code>delegate</code>-Deklaration; die letzte Typangabe ist der Rückgabetyp.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "Addieren: 7", "Multiplizieren: 12" und "Subtrahieren: 6", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Addieren: 7', 'Multiplizieren: 12', 'Subtrahieren: 6'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Eigener Delegate-Typ, Lambda-Ausdrücke und Func<> korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `RechenOperation operation1 = Addieren;
int ergebnis1 = operation1(3, 4);

RechenOperation operation2 = (a, b) => a * b;
int ergebnis2 = operation2(3, 4);

Func<int, int, int> operation3 = (a, b) => a - b;
int ergebnis3 = operation3(10, 4);

Console.WriteLine("Addieren: " + ergebnis1);
Console.WriteLine("Multiplizieren: " + ergebnis2);
Console.WriteLine("Subtrahieren: " + ergebnis3);

void Addieren(int a, int b)
{
    Console.WriteLine(a + b);
}

delegate int RechenOperation(int a, int b);`,
      reason: 'macht Addieren zu einer void-Methode statt einer, die int zurückgibt — die Signatur passt dann nicht mehr zu RechenOperation (delegate int RechenOperation(int a, int b)), der Compiler lehnt die Zuweisung RechenOperation operation1 = Addieren; ab (CS0407: Methode hat die falsche Rückgabeart)',
    },
    {
      code: `RechenOperation operation1 = Addieren;
int ergebnis1 = operation1(3, 4);

RechenOperation operation2 = (a, b) => a + b;
int ergebnis2 = operation2(3, 4);

Func<int, int, int> operation3 = (a, b) => a - b;
int ergebnis3 = operation3(10, 4);

Console.WriteLine("Addieren: " + ergebnis1);
Console.WriteLine("Multiplizieren: " + ergebnis2);
Console.WriteLine("Subtrahieren: " + ergebnis3);

int Addieren(int a, int b)
{
    return a + b;
}

delegate int RechenOperation(int a, int b);`,
      reason: 'verwendet im Lambda für operation2 fälschlich a + b statt a * b — kompiliert und läuft fehlerfrei, liefert aber "Multiplizieren: 7" statt der erwarteten "Multiplizieren: 12"',
    },
    {
      code: `RechenOperation operation1 = Addieren;
int ergebnis1 = operation1(3, 4);

RechenOperation operation2 = (a, b) => a * b;
int ergebnis2 = operation2(3, 4);

Func<int, int, int> operation3 = (a, b) => a - b;
int ergebnis3 = operation3(4, 10);

Console.WriteLine("Addieren: " + ergebnis1);
Console.WriteLine("Multiplizieren: " + ergebnis2);
Console.WriteLine("Subtrahieren: " + ergebnis3);

int Addieren(int a, int b)
{
    return a + b;
}

delegate int RechenOperation(int a, int b);`,
      reason: 'vertauscht beim Aufruf von operation3 die Argumente (operation3(4, 10) statt operation3(10, 4)) — kompiliert fehlerfrei, liefert aber "Subtrahieren: -6" statt der erwarteten "Subtrahieren: 6"',
    },
  ],
};
