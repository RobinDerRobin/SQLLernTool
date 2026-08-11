import type { CSharpChallenge } from '../../../types';

export const challenge26: CSharpChallenge = {
  num: '26',
  title: 'LINQ: Deferred Execution — wann wird eine Query wirklich ausgewertet?',
  tutorial: `Ein LINQ-Aufruf wie <code>zahlen.Where(z =&gt; z &gt; 3)</code> führt die Filterung <b>nicht sofort</b> aus — er liefert nur ein "Rezept", eine <code>IEnumerable&lt;int&gt;</code>, die beschreibt, wie gefiltert werden soll. Ausgewertet wird das Rezept erst, wenn du wirklich darüber iterierst, z. B. mit <code>foreach</code>. Das nennt man <b>deferred execution</b> (verzögerte Ausführung). Die praktische Folge: Änderst du die Quellsammlung (<code>zahlen</code>) <i>nachdem</i> du die Query erstellt hast, aber <i>bevor</i> du sie durchläufst, sieht die Query trotzdem den neuesten Stand — sie merkt sich kein "Schnappschuss"-Ergebnis. Iterierst du dieselbe Query-Variable ein zweites Mal, wird sie erneut komplett neu ausgewertet, wieder mit dem dann aktuellen Stand von <code>zahlen</code>. Erst <code>.ToList()</code> oder <code>.ToArray()</code> erzwingt eine sofortige Auswertung und "friert" das Ergebnis zu diesem Zeitpunkt ein — spätere Änderungen an der Quelle wirken sich dann nicht mehr aus.`,
  task: `<b>Deine Aufgabe:</b> Lege <code>List&lt;int&gt; zahlen = new List&lt;int&gt; { 2, 5, 8 };</code> an und erstelle <code>var query = zahlen.Where(z =&gt; z &gt; 3);</code> (<b>ohne</b> <code>.ToList()</code>!).<br><br>Füge danach mit <code>zahlen.Add(10);</code> eine weitere Zahl hinzu. Gib <code>Console.WriteLine("Erster Durchlauf:");</code> aus, dann jede Zahl aus <code>query</code> einzeln per <code>foreach (var z in query) Console.WriteLine(z);</code>.<br><br>Füge danach mit <code>zahlen.Add(1);</code> und <code>zahlen.Add(20);</code> zwei weitere Zahlen hinzu. Gib <code>Console.WriteLine("Zweiter Durchlauf:");</code> aus, dann erneut jede Zahl aus <b>derselben</b> <code>query</code>-Variable per <code>foreach</code>.`,
  hints: [
    `<code>zahlen.Where(z =&gt; z &gt; 3)</code> ohne <code>.ToList()</code> wertet noch nichts aus — <code>query</code> ist nur ein Bauplan. Erst das <code>foreach</code> führt die Filterung wirklich durch, und zwar mit dem Stand von <code>zahlen</code>, der zu diesem Zeitpunkt gilt (also inklusive aller vorherigen <code>.Add()</code>-Aufrufe).`,
    `Das zweite <code>foreach</code> über dieselbe <code>query</code>-Variable wertet die Filterung <b>erneut</b> aus — mit dem dann aktuellen Stand von <code>zahlen</code>, der inzwischen zwei weitere Zahlen enthält. Deshalb unterscheiden sich die Ausgaben des ersten und zweiten Durchlaufs.`,
    `So sieht die Lösung aus:<pre>List<int> zahlen = new List<int> { 2, 5, 8 };
var query = zahlen.Where(z => z > 3);

zahlen.Add(10);

Console.WriteLine("Erster Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}

zahlen.Add(1);
zahlen.Add(20);

Console.WriteLine("Zweiter Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}</pre>`,
  ] as const,
  solution: `List<int> zahlen = new List<int> { 2, 5, 8 };
var query = zahlen.Where(z => z > 3);

zahlen.Add(10);

Console.WriteLine("Erster Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}

zahlen.Add(1);
zahlen.Add(20);

Console.WriteLine("Zweiter Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}`,
  syntaxExplanation: `<ul><li><code>zahlen.Where(z =&gt; z &gt; 3)</code> — erstellt nur die Query, wertet noch nichts aus (deferred execution).</li><li>Erster <code>foreach</code>: <code>zahlen</code> ist zu diesem Zeitpunkt <code>{2, 5, 8, 10}</code> (nach dem ersten <code>Add(10)</code>) — gefiltert &gt; 3 ergibt 5, 8, 10.</li><li>Zweiter <code>foreach</code> über dieselbe <code>query</code>: <code>zahlen</code> ist inzwischen <code>{2, 5, 8, 10, 1, 20}</code> — dieselbe Filterung erneut ausgewertet ergibt 5, 8, 10, 20 (die 1 fällt raus, sie ist nicht &gt; 3).</li><li>Ohne <code>.ToList()</code> gibt es kein festes Ergebnis, das sich <code>query</code> "merkt" — jede Iteration wertet neu aus.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den neun Zeilen "Erster Durchlauf:", "5", "8", "10", "Zweiter Durchlauf:", "5", "8", "10", "20" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Erster Durchlauf:', '5', '8', '10', 'Zweiter Durchlauf:', '5', '8', '10', '20'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return {
      ok: true,
      message: 'Deferred Execution korrekt demonstriert: query wird erst beim Iterieren ausgewertet, nicht beim Aufruf von Where().',
    };
  },
  distractors: [
    {
      code: `List<int> zahlen = new List<int> { 2, 5, 8 };
var query = zahlen.Where(z => z > 3).ToList();

zahlen.Add(10);

Console.WriteLine("Erster Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}

zahlen.Add(1);
zahlen.Add(20);

Console.WriteLine("Zweiter Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}`,
      reason: 'hängt fälschlich .ToList() an Where() an — dadurch wird die Query sofort ausgewertet, solange zahlen noch { 2, 5, 8 } ist (nur 5 und 8 sind > 3), und query wird zu einer festen Liste. Beide spätere Add()-Aufrufe wirken sich nicht mehr aus, beide Durchläufe zeigen identisch nur "5" und "8" statt der erwarteten unterschiedlichen Ausgaben mit 10 bzw. 10 und 20',
    },
    {
      code: `List<int> zahlen = new List<int> { 2, 5, 8 };
var query = zahlen.Where(z => z > 5);

zahlen.Add(10);

Console.WriteLine("Erster Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}

zahlen.Add(1);
zahlen.Add(20);

Console.WriteLine("Zweiter Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}`,
      reason: 'verwendet in der Bedingung fälschlich z > 5 statt z > 3 — die 5 fällt dadurch aus beiden Durchläufen raus, die Ausgabe zeigt "8", "10" im ersten und "8", "10", "20" im zweiten Durchlauf statt der erwarteten Zeilen mit der 5',
    },
    {
      code: `List<int> zahlen = new List<int> { 2, 5, 8 };
var query = zahlen.Where(z => z > 3);

zahlen.Add(10);
zahlen.Add(1);
zahlen.Add(20);

Console.WriteLine("Erster Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}

Console.WriteLine("Zweiter Durchlauf:");
foreach (var z in query)
{
    Console.WriteLine(z);
}`,
      reason: 'führt alle drei Add()-Aufrufe vor dem ersten foreach statt zwischen den beiden Durchläufen aus — dadurch sieht die Query bei beiden Iterationen denselben, bereits vollständigen Stand von zahlen, beide Durchläufe zeigen identisch "5", "8", "10", "20" statt der erwarteten unterschiedlichen Ausgaben (erster Durchlauf ohne die 20)',
    },
  ],
};
