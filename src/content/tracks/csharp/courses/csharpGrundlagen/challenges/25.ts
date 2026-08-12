import type { CSharpChallenge } from '../../../types';

export const challenge25: CSharpChallenge = {
  num: '25',
  title: 'LINQ: Sortieren und Gruppieren mit OrderBy(), OrderByDescending() und GroupBy()',
  tutorial: `Zwei weitere LINQ-Grundoperationen: <code>.OrderBy(x =&gt; schlüssel)</code> sortiert aufsteigend nach dem angegebenen Schlüssel, <code>.OrderByDescending(x =&gt; schlüssel)</code> absteigend — bei einfachen Zahlen reicht meist <code>x =&gt; x</code> als Schlüssel, also "sortiere nach dem Wert selbst". <code>.GroupBy(x =&gt; schlüssel)</code> teilt eine Sammlung in Gruppen auf, eine pro unterschiedlichem Schlüsselwert. Jede Gruppe ist ein <code>IGrouping&lt;TKey, TElement&gt;</code> — das klingt kompliziert, ist aber einfach eine <code>IEnumerable&lt;TElement&gt;</code> (du kannst normal darüber iterieren oder mit <code>string.Join(...)</code> zusammenfassen) mit einer zusätzlichen <code>.Key</code>-Property, die den Gruppen-Schlüssel enthält. Beim Durchlaufen der Gruppen mit <code>foreach (var gruppe in gruppen)</code> bekommst du also pro Gruppe sowohl <code>gruppe.Key</code> (welcher Schlüssel) als auch die Elemente selbst.`,
  task: `<b>Deine Aufgabe:</b> Lege <code>List&lt;int&gt; zahlen = new List&lt;int&gt; { 42, 17, 8, 23, 4, 16 };</code> an.<br><br>Sortiere mit <code>.OrderBy(z =&gt; z).ToList()</code> aufsteigend in <code>aufsteigend</code> und mit <code>.OrderByDescending(z =&gt; z).ToList()</code> absteigend in <code>absteigend</code>. Gib beide mit <code>Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));</code> bzw. entsprechend für <code>absteigend</code> aus.<br><br>Gruppiere mit <code>.GroupBy(z =&gt; z % 2 == 0 ? "Gerade" : "Ungerade")</code> in <code>gruppen</code>. Gib mit <code>foreach (var gruppe in gruppen)</code> pro Gruppe eine Zeile <code>gruppe.Key + ": " + string.Join(", ", gruppe)</code> aus.`,
  hints: [
    `<code>.OrderBy(z =&gt; z)</code> sortiert aufsteigend, <code>.OrderByDescending(z =&gt; z)</code> absteigend — beide geben ein neues <code>IEnumerable&lt;int&gt;</code> zurück, mit <code>.ToList()</code> materialisiert. <code>string.Join(", ", liste)</code> verbindet alle Elemente zu einem einzigen Text, getrennt durch <code>", "</code>.`,
    `<code>.GroupBy(z =&gt; z % 2 == 0 ? "Gerade" : "Ungerade")</code> erzeugt für jeden vorkommenden Schlüssel ("Gerade" oder "Ungerade") eine eigene Gruppe. Jede Gruppe hat eine <code>.Key</code>-Property (der Schlüssel) und lässt sich selbst wie eine Liste durchlaufen oder mit <code>string.Join(...)</code> zusammenfassen.`,
    `So sieht die Lösung aus:<pre>List&lt;int&gt; zahlen = new List&lt;int&gt; { 42, 17, 8, 23, 4, 16 };

var aufsteigend = zahlen.OrderBy(z =&gt; z).ToList();
var absteigend = zahlen.OrderByDescending(z =&gt; z).ToList();

Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));
Console.WriteLine("Absteigend: " + string.Join(", ", absteigend));

var gruppen = zahlen.GroupBy(z =&gt; z % 2 == 0 ? "Gerade" : "Ungerade");
foreach (var gruppe in gruppen)
{
    Console.WriteLine(gruppe.Key + ": " + string.Join(", ", gruppe));
}</pre>`,
  ] as const,
  solution: `List<int> zahlen = new List<int> { 42, 17, 8, 23, 4, 16 };

var aufsteigend = zahlen.OrderBy(z => z).ToList();
var absteigend = zahlen.OrderByDescending(z => z).ToList();

Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));
Console.WriteLine("Absteigend: " + string.Join(", ", absteigend));

var gruppen = zahlen.GroupBy(z => z % 2 == 0 ? "Gerade" : "Ungerade");
foreach (var gruppe in gruppen)
{
    Console.WriteLine(gruppe.Key + ": " + string.Join(", ", gruppe));
}`,
  syntaxExplanation: `<ul><li><code>zahlen.OrderBy(z =&gt; z)</code> — aufsteigend sortiert: 4, 8, 16, 17, 23, 42.</li><li><code>zahlen.OrderByDescending(z =&gt; z)</code> — absteigend sortiert: 42, 23, 17, 16, 8, 4.</li><li><code>zahlen.GroupBy(z =&gt; z % 2 == 0 ? "Gerade" : "Ungerade")</code> — bildet zwei Gruppen; die Reihenfolge folgt dem ersten Vorkommen jedes Schlüssels: zuerst "Gerade" (42 ist die erste gerade Zahl), dann "Ungerade" (17 ist die erste ungerade Zahl).</li><li><code>gruppe.Key</code> — der Gruppen-Schlüssel ("Gerade"/"Ungerade"); <code>string.Join(", ", gruppe)</code> — die Elemente der Gruppe selbst, in ihrer ursprünglichen Reihenfolge.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den vier Zeilen "Aufsteigend: 4, 8, 16, 17, 23, 42", "Absteigend: 42, 23, 17, 16, 8, 4", "Gerade: 42, 8, 4, 16" und "Ungerade: 17, 23" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Aufsteigend: 4, 8, 16, 17, 23, 42', 'Absteigend: 42, 23, 17, 16, 8, 4', 'Gerade: 42, 8, 4, 16', 'Ungerade: 17, 23'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'OrderBy(), OrderByDescending() und GroupBy() korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `List<int> zahlen = new List<int> { 42, 17, 8, 23, 4, 16 };

var aufsteigend = zahlen.OrderByDescending(z => z).ToList();
var absteigend = zahlen.OrderBy(z => z).ToList();

Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));
Console.WriteLine("Absteigend: " + string.Join(", ", absteigend));

var gruppen = zahlen.GroupBy(z => z % 2 == 0 ? "Gerade" : "Ungerade");
foreach (var gruppe in gruppen)
{
    Console.WriteLine(gruppe.Key + ": " + string.Join(", ", gruppe));
}`,
      reason: 'vertauscht OrderBy() und OrderByDescending() bei der Zuweisung — aufsteigend bekommt die absteigend sortierte Liste und umgekehrt, die ersten beiden Ausgabezeilen zeigen die Werte in vertauschter Reihenfolge',
    },
    {
      code: `List<int> zahlen = new List<int> { 42, 17, 8, 23, 4, 16 };

var aufsteigend = zahlen.OrderBy(z => z).ToList();
var absteigend = zahlen.OrderByDescending(z => z).ToList();

Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));
Console.WriteLine("Absteigend: " + string.Join(", ", absteigend));

var gruppen = zahlen.GroupBy(z => z % 2 == 0 ? "Ungerade" : "Gerade");
foreach (var gruppe in gruppen)
{
    Console.WriteLine(gruppe.Key + ": " + string.Join(", ", gruppe));
}`,
      reason: 'vertauscht die beiden Ternär-Zweige im GroupBy()-Schlüssel ("Ungerade" für gerade Zahlen, "Gerade" für ungerade) — die letzten beiden Ausgabezeilen zeigen die falschen Beschriftungen, "Ungerade: 42, 8, 4, 16" statt "Gerade: 42, 8, 4, 16"',
    },
    {
      code: `List<int> zahlen = new List<int> { 42, 17, 8, 23, 4, 16 };

var aufsteigend = zahlen.OrderBy(z => z).ToList();
var absteigend = zahlen.OrderByDescending(z => z).ToList();

Console.WriteLine("Aufsteigend: " + string.Join(", ", aufsteigend));
Console.WriteLine("Absteigend: " + string.Join(", ", absteigend));

var gruppen = zahlen.GroupBy(z => z % 2 == 0 ? "Gerade" : "Ungerade");
foreach (var gruppe in gruppen)
{
    Console.WriteLine(gruppe.Count() + ": " + string.Join(", ", gruppe));
}`,
      reason: 'verwendet gruppe.Count() statt gruppe.Key für die Beschriftung — verwechselt die Gruppengröße mit dem Gruppenschlüssel, die letzten beiden Zeilen zeigen "4: 42, 8, 4, 16" und "2: 17, 23" statt "Gerade: ..." und "Ungerade: ..."',
    },
  ],
};
