import type { CSharpChallenge } from '../../../types';

export const challenge23: CSharpChallenge = {
  num: '23',
  title: 'LINQ: Aggregation mit Sum(), Count(), Average(), Max() und Min()',
  tutorial: `LINQ bringt neben <code>.Where()</code>/<code>.Select()</code> auch <b>Aggregations-Methoden</b> mit, die eine ganze <code>IEnumerable&lt;T&gt;</code> zu einem einzigen Wert zusammenfassen. <code>.Sum()</code> addiert alle Elemente, <code>.Count()</code> zählt sie, <code>.Average()</code> berechnet den Durchschnitt (gibt immer ein <code>double</code> zurück, auch bei einer <code>List&lt;int&gt;</code>), <code>.Max()</code>/<code>.Min()</code> liefern das größte/kleinste Element. Alle fünf brauchen keine Klammer-Argumente für den einfachen Fall — sie werten die Liste direkt aus. Wichtig: <code>List&lt;T&gt;</code> hat zwar auch eine <code>.Count</code>-<b>Property</b> (ohne Klammern, wie bei <code>.Length</code> bei Arrays), aber <code>.Length</code> selbst gibt es bei <code>List&lt;T&gt;</code> <b>nicht</b> — das ist ausschließlich eine Array-Eigenschaft.`,
  task: `<b>Deine Aufgabe:</b> Lege <code>List&lt;int&gt; punkte = new List&lt;int&gt; { 80, 90, 70, 60, 100 };</code> an.<br><br>Berechne mit LINQ-Aggregation: <code>int summe = punkte.Sum();</code>, <code>int anzahl = punkte.Count();</code>, <code>double durchschnitt = punkte.Average();</code>, <code>int maximum = punkte.Max();</code>, <code>int minimum = punkte.Min();</code>.<br><br>Gib mit fünf <code>Console.WriteLine(...)</code> genau diese fünf Zeilen aus: <code>"Summe: " + summe</code>, <code>"Anzahl: " + anzahl</code>, <code>"Durchschnitt: " + durchschnitt</code>, <code>"Maximum: " + maximum</code>, <code>"Minimum: " + minimum</code>.`,
  hints: [
    `<code>punkte.Sum()</code> addiert alle Elemente (80+90+70+60+100 = 400), <code>punkte.Count()</code> zählt sie (5 Elemente). Beide geben ein <code>int</code> zurück, wenn die Liste <code>int</code>-Elemente enthält.`,
    `<code>punkte.Average()</code> gibt immer ein <code>double</code> zurück (hier 400 / 5 = 80). <code>punkte.Max()</code> und <code>punkte.Min()</code> geben das größte bzw. kleinste Element zurück — bei der Zuweisung nicht vertauschen, sonst landet das Maximum in der Minimum-Variable und umgekehrt.`,
    `So sieht die Lösung aus:<pre>List<int> punkte = new List<int> { 80, 90, 70, 60, 100 };

int summe = punkte.Sum();
int anzahl = punkte.Count();
double durchschnitt = punkte.Average();
int maximum = punkte.Max();
int minimum = punkte.Min();

Console.WriteLine("Summe: " + summe);
Console.WriteLine("Anzahl: " + anzahl);
Console.WriteLine("Durchschnitt: " + durchschnitt);
Console.WriteLine("Maximum: " + maximum);
Console.WriteLine("Minimum: " + minimum);</pre>`,
  ] as const,
  solution: `List<int> punkte = new List<int> { 80, 90, 70, 60, 100 };

int summe = punkte.Sum();
int anzahl = punkte.Count();
double durchschnitt = punkte.Average();
int maximum = punkte.Max();
int minimum = punkte.Min();

Console.WriteLine("Summe: " + summe);
Console.WriteLine("Anzahl: " + anzahl);
Console.WriteLine("Durchschnitt: " + durchschnitt);
Console.WriteLine("Maximum: " + maximum);
Console.WriteLine("Minimum: " + minimum);`,
  syntaxExplanation: `<ul><li><code>punkte.Sum()</code> — 80+90+70+60+100 = 400.</li><li><code>punkte.Count()</code> — 5 Elemente.</li><li><code>punkte.Average()</code> — 400 / 5 = 80 (als <code>double</code>).</li><li><code>punkte.Max()</code> — größtes Element, 100.</li><li><code>punkte.Min()</code> — kleinstes Element, 60.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den fünf Zeilen "Summe: 400", "Anzahl: 5", "Durchschnitt: 80", "Maximum: 100" und "Minimum: 60" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Summe: 400', 'Anzahl: 5', 'Durchschnitt: 80', 'Maximum: 100', 'Minimum: 60'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den fünf Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'LINQ-Aggregation (Sum, Count, Average, Max, Min) korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `List<int> punkte = new List<int> { 80, 90, 70, 60, 100 };

int summe = punkte.Sum();
int anzahl = punkte.Count();
double durchschnitt = punkte.Average();
int maximum = punkte.Min();
int minimum = punkte.Max();

Console.WriteLine("Summe: " + summe);
Console.WriteLine("Anzahl: " + anzahl);
Console.WriteLine("Durchschnitt: " + durchschnitt);
Console.WriteLine("Maximum: " + maximum);
Console.WriteLine("Minimum: " + minimum);`,
      reason: 'vertauscht Max() und Min() bei der Zuweisung — maximum bekommt punkte.Min() (60) und minimum bekommt punkte.Max() (100), die Ausgabe zeigt fälschlich "Maximum: 60" und "Minimum: 100" statt umgekehrt',
    },
    {
      code: `List<int> punkte = new List<int> { 80, 90, 70, 60, 100 };

int summe = punkte.Sum();
int anzahl = punkte.Length;
double durchschnitt = punkte.Average();
int maximum = punkte.Max();
int minimum = punkte.Min();

Console.WriteLine("Summe: " + summe);
Console.WriteLine("Anzahl: " + anzahl);
Console.WriteLine("Durchschnitt: " + durchschnitt);
Console.WriteLine("Maximum: " + maximum);
Console.WriteLine("Minimum: " + minimum);`,
      reason: 'verwendet punkte.Length statt punkte.Count() — Length ist eine reine Array-Eigenschaft, List<T> hat sie nicht (Compilerfehler CS1061: List<int> enthält keine Definition für Length)',
    },
    {
      code: `List<int> punkte = new List<int> { 80, 90, 70, 60 };

int summe = punkte.Sum();
int anzahl = punkte.Count();
double durchschnitt = punkte.Average();
int maximum = punkte.Max();
int minimum = punkte.Min();

Console.WriteLine("Summe: " + summe);
Console.WriteLine("Anzahl: " + anzahl);
Console.WriteLine("Durchschnitt: " + durchschnitt);
Console.WriteLine("Maximum: " + maximum);
Console.WriteLine("Minimum: " + minimum);`,
      reason: 'vergisst die 100 beim Anlegen der Liste (nur vier statt fünf Zahlen) — Summe, Anzahl, Durchschnitt und Maximum werden dadurch alle falsch berechnet (300 statt 400, 4 statt 5, 75 statt 80, 90 statt 100), nur Minimum bleibt zufällig korrekt bei 60',
    },
  ],
};
