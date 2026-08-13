import type { CSharpChallenge } from '../../../types';

export const challenge24: CSharpChallenge = {
  num: '24',
  title: 'LINQ: Query-Syntax mit from/where/select',
  tutorial: `Neben der <b>Method-Syntax</b> (<code>.Where(...).Select(...)</code>) bietet C# eine zweite, syntaktisch völlig andere Schreibweise für dieselbe LINQ-Semantik: die <b>Query-Syntax</b> — <code>from x in quelle where bedingung select ausdruck</code>. Auffällig: das erinnert stark an SQL (<code>SELECT ... FROM ... WHERE ...</code>), nur in umgekehrter Reihenfolge und ohne Kommas oder Semikolons zwischen den Klauseln. <code>from m in mengen</code> läuft über jedes Element von <code>mengen</code> und nennt es <code>m</code>; <code>where m &gt; 10</code> filtert wie <code>.Where()</code>; <code>select m * 3</code> transformiert wie <code>.Select()</code>. Die <code>where</code>-Klausel ist dabei <b>optional</b> — <code>from ... select ...</code> ganz ohne Filter ist gültig und wählt einfach alle Elemente aus, transformiert sie aber trotzdem. Der Compiler übersetzt eine Query-Syntax-Abfrage intern ohnehin in genau dieselben <code>.Where()</code>/<code>.Select()</code>-Aufrufe der Method-Syntax — beide erzeugen identischen Code, es ist reine Geschmackssache, welche man schreibt.`,
  task: `<b>Deine Aufgabe:</b> Lege <code>List&lt;int&gt; mengen = new List&lt;int&gt; { 12, 5, 18, 7, 24, 9, 30 };</code> an.<br><br>Schreibe eine Query-Syntax-Abfrage <code>var grosse = from m in mengen where m &gt; 10 select m * 3;</code> — sie soll nur die Mengen über 10 behalten und jede davon verdreifachen.<br><br>Gib mit <code>foreach</code> jeden Wert aus <code>grosse</code> auf einer eigenen Zeile per <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Die Query-Syntax hat eine feste Klausel-Reihenfolge: <code>from &lt;variable&gt; in &lt;quelle&gt;</code> zuerst, dann optional <code>where &lt;bedingung&gt;</code>, zuletzt <code>select &lt;ausdruck&gt;</code> — kein Semikolon zwischen den Klauseln, nur am Ende der ganzen Abfrage.`,
    `<code>where m &gt; 10</code> behält nur Elemente über 10 (aus <code>{ 12, 5, 18, 7, 24, 9, 30 }</code> bleiben <code>12, 18, 24, 30</code>), <code>select m * 3</code> verdreifacht jedes davon. Das Ergebnis ist ein <code>IEnumerable&lt;int&gt;</code>, deshalb <code>var</code> statt eines konkreten Typs für <code>grosse</code>.`,
    `So sieht die Lösung aus:<pre>List&lt;int&gt; mengen = new List&lt;int&gt; { 12, 5, 18, 7, 24, 9, 30 };

var grosse = from m in mengen
             where m &gt; 10
             select m * 3;

foreach (int m in grosse)
{
    Console.WriteLine(m);
}</pre>`,
  ] as const,
  solution: `List<int> mengen = new List<int> { 12, 5, 18, 7, 24, 9, 30 };

var grosse = from m in mengen
             where m > 10
             select m * 3;

foreach (int m in grosse)
{
    Console.WriteLine(m);
}`,
  syntaxExplanation: `<ul><li><code>from m in mengen</code> — läuft über jedes Element von <code>mengen</code>.</li><li><code>where m &gt; 10</code> — behält nur <code>12, 18, 24, 30</code>.</li><li><code>select m * 3</code> — verdreifacht jedes verbliebene Element: <code>36, 54, 72, 90</code>.</li><li>Intern übersetzt der Compiler das in <code>mengen.Where(m =&gt; m &gt; 10).Select(m =&gt; m * 3)</code> — identischer Code, andere Schreibweise.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den vier Zeilen "36", "54", "72" und "90" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['36', '54', '72', '90'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den vier Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'LINQ-Query-Syntax mit from/where/select korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `List<int> mengen = new List<int> { 12, 5, 18, 7, 24, 9, 30 };

var grosse = from m in mengen
             where m < 10
             select m * 3;

foreach (int m in grosse)
{
    Console.WriteLine(m);
}`,
      reason: 'kehrt die where-Bedingung um (m < 10 statt m > 10) — behält die kleinen Mengen (5, 7, 9) statt der großen (12, 18, 24, 30), die Ausgabe zeigt fälschlich 15, 21, 27 statt 36, 54, 72, 90',
    },
    {
      code: `List<int> mengen = new List<int> { 12, 5, 18, 7, 24, 9, 30 };

var grosse = from m in mengen
             where m > 10
             select m * 2;

foreach (int m in grosse)
{
    Console.WriteLine(m);
}`,
      reason: 'verwendet in select fälschlich m * 2 statt m * 3 — die Filterung bleibt korrekt (12, 18, 24, 30), aber die Transformation verdoppelt statt zu verdreifachen: 24, 36, 48, 60 statt der erwarteten 36, 54, 72, 90',
    },
    {
      code: `List<int> mengen = new List<int> { 12, 5, 18, 7, 24, 9, 30 };

var grosse = from m in mengen
             select m * 3;

foreach (int m in grosse)
{
    Console.WriteLine(m);
}`,
      reason: 'lässt die where-Klausel komplett weg — where ist in der Query-Syntax optional, from...select ohne Filter ist gültiges C# und wählt alle 7 Elemente statt nur der 4 über 10 aus, die Ausgabe zeigt fälschlich alle sieben verdreifachten Werte (36, 15, 54, 21, 72, 27, 90) statt nur der vier erwarteten',
    },
  ],
};
