import type { CSharpChallenge } from '../../../types';

export const challenge09: CSharpChallenge = {
  num: '09',
  title: 'Arrays, List<T> und Dictionary<TKey, TValue>',
  tutorial: `Ein <b>Array</b> hat eine feste Größe und wird mit <code>{ ... }</code> befüllt: <code>int[] zahlen = { 10, 20, 30 };</code>. Zugriff auf ein Element erfolgt über den <b>Index</b> in eckigen Klammern, beginnend bei <code>0</code> — <code>zahlen[0]</code> ist das erste Element. <code>.Length</code> liefert die Anzahl der Elemente. Mit <code>foreach (int x in zahlen) { }</code> gehst du der Reihe nach über jedes Element, ohne dich selbst um einen Zähler kümmern zu müssen. Eine <code>List&lt;T&gt;</code> ist wie ein Array, kann aber <b>wachsen und schrumpfen</b> — die spitzen Klammern geben den Elementtyp an: <code>List&lt;string&gt; namen = new List&lt;string&gt; { "Anna" };</code>. <code>.Add(...)</code> fügt hinzu, <code>.Remove(...)</code> entfernt das erste passende Element, <code>.Count</code> liefert die aktuelle Anzahl. Ein <code>Dictionary&lt;TKey, TValue&gt;</code> speichert <b>Schlüssel-Wert-Paare</b>: <code>preise["Brot"] = 2.50;</code> legt an oder überschreibt. Wichtig: der direkte Zugriff <code>preise["Butter"]</code> auf einen <b>nicht vorhandenen</b> Schlüssel wirft eine Exception — <code>.ContainsKey(...)</code> prüft vorher sicher, ob der Schlüssel überhaupt existiert.`,
  task: `<b>Szenario:</b> Eine Punktzahl-Liste, eine Einkaufsliste und eine Preisliste.<br><br><b>Deine Aufgabe:</b><br>• <code>punkte</code>: das Array <code>{ 10, 20, 30, 15 }</code><br>• <code>ersterWert</code>: das erste Element von <code>punkte</code> per Index<br>• <code>summe</code>: die Summe aller Elemente von <code>punkte</code>, per <code>foreach</code> aufaddiert<br>• <code>einkaufsliste</code>: eine <code>List&lt;string&gt;</code> mit <code>"Brot"</code>, <code>"Milch"</code>, <code>"Eier"</code> — danach <code>"Butter"</code> hinzufügen und <code>"Milch"</code> wieder entfernen<br>• <code>preise</code>: ein <code>Dictionary&lt;string, double&gt;</code> mit <code>"Brot"</code> → <code>2.50</code> und <code>"Eier"</code> → <code>3.20</code><br>• <code>hatButter</code>: ob <code>preise</code> den Schlüssel <code>"Butter"</code> enthält (sicher per <code>.ContainsKey(...)</code>, ohne dass <code>"Butter"</code> je in <code>preise</code> eingetragen wurde)<br>Gib <code>punkte.Length</code>, <code>ersterWert</code>, <code>summe</code>, <code>einkaufsliste.Count</code> und <code>hatButter</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Array-Deklaration und Index: <code>int[] punkte = { 10, 20, 30, 15 };</code>, <code>int ersterWert = punkte[0];</code> (Index 0 ist das erste Element). <code>foreach (int p in punkte) { summe += p; }</code> läuft über alle vier Werte.`,
    `<code>List&lt;string&gt; einkaufsliste = new List&lt;string&gt; { "Brot", "Milch", "Eier" };</code>, danach <code>einkaufsliste.Add("Butter");</code> und <code>einkaufsliste.Remove("Milch");</code> — Reihenfolge beachten. Für <code>preise</code>: <code>Dictionary&lt;string, double&gt; preise = new Dictionary&lt;string, double&gt;();</code>, dann <code>preise["Brot"] = 2.50;</code>. <code>hatButter</code> nutzt <code>preise.ContainsKey("Butter")</code> — <b>nicht</b> <code>preise["Butter"]</code>, das würde abstürzen, weil der Schlüssel nie eingetragen wurde.`,
    `So sieht die Lösung aus:<pre>int[] punkte = { 10, 20, 30, 15 };
int ersterWert = punkte[0];
int summe = 0;
foreach (int p in punkte)
{
    summe += p;
}

List<string> einkaufsliste = new List<string> { "Brot", "Milch", "Eier" };
einkaufsliste.Add("Butter");
einkaufsliste.Remove("Milch");

Dictionary<string, double> preise = new Dictionary<string, double>();
preise["Brot"] = 2.50;
preise["Eier"] = 3.20;
bool hatButter = preise.ContainsKey("Butter");

Console.WriteLine(punkte.Length);
Console.WriteLine(ersterWert);
Console.WriteLine(summe);
Console.WriteLine(einkaufsliste.Count);
Console.WriteLine(hatButter);</pre>`,
  ] as const,
  solution: `int[] punkte = { 10, 20, 30, 15 };
int ersterWert = punkte[0];
int summe = 0;
foreach (int p in punkte)
{
    summe += p;
}

List<string> einkaufsliste = new List<string> { "Brot", "Milch", "Eier" };
einkaufsliste.Add("Butter");
einkaufsliste.Remove("Milch");

Dictionary<string, double> preise = new Dictionary<string, double>();
preise["Brot"] = 2.50;
preise["Eier"] = 3.20;
bool hatButter = preise.ContainsKey("Butter");

Console.WriteLine(punkte.Length);
Console.WriteLine(ersterWert);
Console.WriteLine(summe);
Console.WriteLine(einkaufsliste.Count);
Console.WriteLine(hatButter);`,
  syntaxExplanation: `<ul><li><code>punkte[0]</code> — Index-Zugriff, liefert 10, das erste Element.</li><li><code>foreach (int p in punkte) { summe += p; }</code> — 10+20+30+15 = 75.</li><li><code>einkaufsliste.Add("Butter"); einkaufsliste.Remove("Milch");</code> — aus 3 wird über 4 wieder 3 Einträge (Brot, Eier, Butter).</li><li><code>preise.ContainsKey("Butter")</code> — liefert sicher <code>false</code>, weil <code>"Butter"</code> nie in <code>preise</code> eingetragen wurde, ohne Exception.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau fünf Zeilen bestehen: "4", "10", "75", "3" und "False", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['4', '10', '75', '3', 'False'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den fünf Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Array, List<T> und Dictionary<TKey, TValue> korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int[] punkte = { 10, 20, 30, 15 };
int ersterWert = punkte[0];
int summe = 0;
foreach (int p in punkte)
{
    summe += p;
}

List<string> einkaufsliste = new List<string> { "Brot", "Milch", "Eier" };
einkaufsliste.Add("Butter");

Dictionary<string, double> preise = new Dictionary<string, double>();
preise["Brot"] = 2.50;
preise["Eier"] = 3.20;
bool hatButter = preise.ContainsKey("Butter");

Console.WriteLine(punkte.Length);
Console.WriteLine(ersterWert);
Console.WriteLine(summe);
Console.WriteLine(einkaufsliste.Count);
Console.WriteLine(hatButter);`,
      reason: 'vergisst einkaufsliste.Remove("Milch") — die Liste behält alle vier Einträge (Brot, Milch, Eier, Butter), einkaufsliste.Count wird fälschlich 4 statt 3',
    },
    {
      code: `int[] punkte = { 10, 20, 30, 15 };
int ersterWert = punkte[0];
int summe = 0;
foreach (int p in punkte)
{
    summe += p;
}

List<string> einkaufsliste = new List<string> { "Brot", "Milch", "Eier" };
einkaufsliste.Add("Butter");
einkaufsliste.Remove("Milch");

Dictionary<string, double> preise = new Dictionary<string, double>();
preise["Brot"] = 2.50;
preise["Eier"] = 3.20;
bool hatButter = preise["Butter"] != null;

Console.WriteLine(punkte.Length);
Console.WriteLine(ersterWert);
Console.WriteLine(summe);
Console.WriteLine(einkaufsliste.Count);
Console.WriteLine(hatButter);`,
      reason: 'nutzt den direkten Indexer preise["Butter"] statt .ContainsKey("Butter") — weil "Butter" nie in preise eingetragen wurde, stürzt das zur Laufzeit mit einer KeyNotFoundException ab, statt sicher false zu liefern',
    },
    {
      code: `int[] punkte = { 10, 20, 30, 15 };
int ersterWert = punkte[1];
int summe = 0;
foreach (int p in punkte)
{
    summe += p;
}

List<string> einkaufsliste = new List<string> { "Brot", "Milch", "Eier" };
einkaufsliste.Add("Butter");
einkaufsliste.Remove("Milch");

Dictionary<string, double> preise = new Dictionary<string, double>();
preise["Brot"] = 2.50;
preise["Eier"] = 3.20;
bool hatButter = preise.ContainsKey("Butter");

Console.WriteLine(punkte.Length);
Console.WriteLine(ersterWert);
Console.WriteLine(summe);
Console.WriteLine(einkaufsliste.Count);
Console.WriteLine(hatButter);`,
      reason: 'greift mit punkte[1] statt punkte[0] zu — Array-Indizes beginnen bei 0, also ist punkte[1] bereits das zweite Element (20), ersterWert wird fälschlich 20 statt 10',
    },
  ],
};
