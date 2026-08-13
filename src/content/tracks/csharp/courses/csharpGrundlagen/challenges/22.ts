import type { CSharpChallenge } from '../../../types';

export const challenge22: CSharpChallenge = {
  num: '22',
  title: 'LINQ: Method-Syntax mit Where() und Select()',
  tutorial: `<b>LINQ</b> (Language Integrated Query) bringt Abfrage-Operationen als Methoden direkt auf jede <code>IEnumerable&lt;T&gt;</code> — also auf jede <code>List&lt;T&gt;</code>, jedes Array und mehr. Zwei Grundbausteine: <code>.Where(x =&gt; bedingung)</code> filtert — behält nur die Elemente, für die das Lambda <code>true</code> liefert, genau wie <code>WHERE</code> in SQL. <code>.Select(x =&gt; ausdruck)</code> transformiert — wandelt jedes Element in etwas Neues um, genau wie <code>SELECT</code> in SQL. Beide geben ein neues <code>IEnumerable&lt;T&gt;</code> zurück, lassen sich also verketten: <code>liste.Where(x =&gt; x &gt; 0).Select(x =&gt; x * 2)</code> filtert zuerst, transformiert danach nur noch die übrig gebliebenen Elemente. Die <b>Reihenfolge</b> der Verkettung ist entscheidend — <code>.Select().Where()</code> prüft die Bedingung erst <b>nach</b> der Transformation und kann dadurch ein ganz anderes Ergebnis liefern als <code>.Where().Select()</code>. Um das Ergebnis als <code>List&lt;T&gt;</code> weiterzuverwenden (z. B. für <code>foreach</code>), hängst du <code>.ToList()</code> an.`,
  task: `<b>Deine Aufgabe:</b> Lege <code>List&lt;int&gt; zahlen = new List&lt;int&gt; { 3, 8, 15, 22, 4, 30, 11 };</code> an.<br><br>Filtere mit <code>.Where(z =&gt; z % 2 == 0)</code> nur die <b>geraden</b> Zahlen heraus und speichere das Ergebnis (mit <code>.ToList()</code>) in <code>List&lt;int&gt; gerade</code>.<br><br>Verdopple mit <code>.Select(z =&gt; z * 2)</code> jede Zahl in <code>gerade</code> und speichere das Ergebnis (mit <code>.ToList()</code>) in <code>List&lt;int&gt; verdoppelt</code>.<br><br>Gib mit <code>foreach</code> jede Zahl aus <code>verdoppelt</code> auf einer eigenen Zeile per <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `<code>.Where(z =&gt; z % 2 == 0)</code> behält nur Elemente, für die das Lambda <code>true</code> liefert — hier alle geraden Zahlen aus <code>zahlen</code>. Ohne <code>.ToList()</code> am Ende bleibt das Ergebnis ein <code>IEnumerable&lt;int&gt;</code> statt einer <code>List&lt;int&gt;</code>.`,
    `<code>.Select(z =&gt; z * 2)</code> wendet das Lambda auf <b>jedes</b> Element an und ersetzt es durch den Rückgabewert — hier wird jede (bereits gefilterte) Zahl verdoppelt. Wichtig: zuerst <code>.Where()</code>, dann <code>.Select()</code> — <code>zahlen.Where(...).Select(...)</code>, nicht umgekehrt, sonst filterst du auf den schon verdoppelten Werten statt auf den Originalen.`,
    `So sieht die Lösung aus:<pre>List&lt;int&gt; zahlen = new List&lt;int&gt; { 3, 8, 15, 22, 4, 30, 11 };

List&lt;int&gt; gerade = zahlen.Where(z =&gt; z % 2 == 0).ToList();
List&lt;int&gt; verdoppelt = gerade.Select(z =&gt; z * 2).ToList();

foreach (int z in verdoppelt)
{
    Console.WriteLine(z);
}</pre>`,
  ] as const,
  solution: `List<int> zahlen = new List<int> { 3, 8, 15, 22, 4, 30, 11 };

List<int> gerade = zahlen.Where(z => z % 2 == 0).ToList();
List<int> verdoppelt = gerade.Select(z => z * 2).ToList();

foreach (int z in verdoppelt)
{
    Console.WriteLine(z);
}`,
  syntaxExplanation: `<ul><li><code>zahlen.Where(z =&gt; z % 2 == 0)</code> — behält nur die geraden Zahlen aus <code>{ 3, 8, 15, 22, 4, 30, 11 }</code>: <code>8, 22, 4, 30</code>.</li><li><code>.ToList()</code> — materialisiert das Ergebnis als echte <code>List&lt;int&gt;</code>.</li><li><code>gerade.Select(z =&gt; z * 2)</code> — verdoppelt jede der vier gefilterten Zahlen: <code>16, 44, 8, 60</code>.</li><li><code>foreach</code> gibt die vier verdoppelten Werte in ihrer ursprünglichen Reihenfolge aus.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den vier Zeilen "16", "44", "8" und "60" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['16', '44', '8', '60'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Where() und Select() korrekt verkettet.' };
  },
  distractors: [
    {
      code: `List<int> zahlen = new List<int> { 3, 8, 15, 22, 4, 30, 11 };

List<int> gerade = zahlen.Where(z => z % 2 != 0).ToList();
List<int> verdoppelt = gerade.Select(z => z * 2).ToList();

foreach (int z in verdoppelt)
{
    Console.WriteLine(z);
}`,
      reason: 'kehrt die Filter-Bedingung um (z % 2 != 0 statt == 0) — filtert die ungeraden statt der geraden Zahlen heraus (3, 15, 11 statt 8, 22, 4, 30), verdoppelt liefert dadurch 6, 30, 22 statt der erwarteten 16, 44, 8, 60',
    },
    {
      code: `List<int> zahlen = new List<int> { 3, 8, 15, 22, 4, 30, 11 };

List<int> gerade = zahlen.Where(z => z % 2 == 0).ToList();
List<int> verdoppelt = gerade.Select(z => z + 2).ToList();

foreach (int z in verdoppelt)
{
    Console.WriteLine(z);
}`,
      reason: 'verwendet im Select() fälschlich z + 2 statt z * 2 — die Filterung bleibt korrekt (8, 22, 4, 30), aber die Transformation liefert 10, 24, 6, 32 statt der erwarteten verdoppelten Werte 16, 44, 8, 60',
    },
    {
      code: `List<int> zahlen = new List<int> { 3, 8, 15, 22, 4, 30, 11 };

List<int> verdoppelt = zahlen.Select(z => z * 2).Where(z => z % 2 == 0).ToList();

foreach (int z in verdoppelt)
{
    Console.WriteLine(z);
}`,
      reason: 'vertauscht die Reihenfolge zu Select() vor Where() — da jede verdoppelte Zahl automatisch gerade ist, lässt der Filter danach alle 7 Elemente durch (6, 16, 30, 44, 8, 60, 22) statt nur die 4 aus den ursprünglich geraden Zahlen entstandenen (16, 44, 8, 60), zeigt empirisch, dass die Verkettungsreihenfolge bei LINQ das Ergebnis verändert',
    },
  ],
};
