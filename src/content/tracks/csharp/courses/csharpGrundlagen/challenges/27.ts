import type { CSharpChallenge } from '../../../types';

export const challenge27: CSharpChallenge = {
  num: '27',
  title: 'Eigene Namespaces: Naming-Konflikte auflösen mit using und Vollqualifizierung',
  tutorial: `Ein <code>namespace</code> ist ein benannter Container für Typen — er dient vor allem dazu, in größeren, mehrteiligen Projekten Namenskollisionen zu vermeiden. Zwei Klassen dürfen gleich heißen, solange sie in unterschiedlichen Namespaces liegen: <code>namespace Lager { class Kiste { ... } }</code> und <code>namespace Versand { class Kiste { ... } }</code> sind zwei völlig unabhängige Typen. Mit <code>using Lager;</code> importierst du einen Namespace — danach kannst du <code>Kiste</code> darin ohne Präfix ansprechen. Für einen Typ aus einem <b>nicht</b> importierten Namespace brauchst du die vollqualifizierte Schreibweise: <code>Versand.Kiste</code> statt nur <code>Kiste</code>. In einer Top-Level-Statements-Datei müssen <code>namespace</code>-Blöcke (wie alle Typ-Deklarationen) <b>nach</b> den ausführbaren Anweisungen stehen.`,
  task: `<b>Deine Aufgabe:</b> Lege zwei <code>namespace</code>-Blöcke an, jeweils mit einer Klasse <code>Kiste</code>:<br><br><code>namespace Lager</code> mit einer Klasse <code>Kiste</code>, die im Konstruktor ein <code>int menge</code> entgegennimmt und eine Methode <code>public string Beschreibung() =&gt; $"Lager-Kiste mit {menge} Stück";</code> hat.<br><br><code>namespace Versand</code> mit einer eigenen, unabhängigen Klasse <code>Kiste</code>, die im Konstruktor ein <code>int gewicht</code> entgegennimmt und <code>public string Beschreibung() =&gt; $"Versand-Kiste, {gewicht} kg";</code> hat.<br><br>Importiere <b>nur</b> <code>Lager</code> mit <code>using Lager;</code>. Erzeuge <code>var kiste = new Kiste(5);</code> (nutzt den Import) und <code>var kiste2 = new Versand.Kiste(10);</code> (vollqualifiziert, da <code>Versand</code> nicht importiert ist). Gib beide mit <code>Console.WriteLine(kiste.Beschreibung());</code> bzw. <code>Console.WriteLine(kiste2.Beschreibung());</code> aus.`,
  hints: [
    `<code>using Lager;</code> ganz am Dateianfang importiert nur den <code>Lager</code>-Namespace — danach kannst du <code>Kiste</code> ohne Präfix schreiben, aber es meint automatisch <code>Lager.Kiste</code>. Für die <code>Versand</code>-Klasse, die nicht importiert ist, brauchst du <code>new Versand.Kiste(10)</code> mit vollem Namespace-Präfix, sonst findet der Compiler den Typ nicht.`,
    `Beide <code>namespace</code>-Blöcke müssen — genau wie <code>class</code>- oder <code>delegate</code>-Deklarationen — <b>nach</b> allen ausführbaren Top-Level-Anweisungen in der Datei stehen (<code>CS8803</code>). Die beiden <code>Kiste</code>-Klassen sind völlig unabhängige Typen, obwohl sie gleich heißen — genau das ist der Sinn eigener Namespaces: Namenskollisionen in großen Projekten vermeiden.`,
    `So sieht die Lösung aus:<pre>using Lager;

var kiste = new Kiste(5);
Console.WriteLine(kiste.Beschreibung());

var kiste2 = new Versand.Kiste(10);
Console.WriteLine(kiste2.Beschreibung());

namespace Lager
{
    class Kiste
    {
        private int menge;
        public Kiste(int menge) { this.menge = menge; }
        public string Beschreibung() => $"Lager-Kiste mit {menge} Stück";
    }
}

namespace Versand
{
    class Kiste
    {
        private int gewicht;
        public Kiste(int gewicht) { this.gewicht = gewicht; }
        public string Beschreibung() => $"Versand-Kiste, {gewicht} kg";
    }
}</pre>`,
  ] as const,
  solution: `using Lager;

var kiste = new Kiste(5);
Console.WriteLine(kiste.Beschreibung());

var kiste2 = new Versand.Kiste(10);
Console.WriteLine(kiste2.Beschreibung());

namespace Lager
{
    class Kiste
    {
        private int menge;
        public Kiste(int menge) { this.menge = menge; }
        public string Beschreibung() => $"Lager-Kiste mit {menge} Stück";
    }
}

namespace Versand
{
    class Kiste
    {
        private int gewicht;
        public Kiste(int gewicht) { this.gewicht = gewicht; }
        public string Beschreibung() => $"Versand-Kiste, {gewicht} kg";
    }
}`,
  syntaxExplanation: `<ul><li><code>using Lager;</code> — importiert nur den <code>Lager</code>-Namespace; <code>Kiste</code> ohne Präfix meint danach automatisch <code>Lager.Kiste</code>.</li><li><code>new Kiste(5)</code> — löst über den Import zu <code>Lager.Kiste</code> auf, Ausgabe "Lager-Kiste mit 5 Stück".</li><li><code>new Versand.Kiste(10)</code> — vollqualifiziert, weil <code>Versand</code> nicht importiert ist; ohne das Präfix fände der Compiler den Typ nicht (<code>CS0246</code>).</li><li>Zwei gleichnamige Klassen <code>Kiste</code> in unterschiedlichen Namespaces sind unabhängige Typen — genau der Zweck eigener Namespaces in mehrteiligen Projekten.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau den zwei Zeilen "Lager-Kiste mit 5 Stück" und "Versand-Kiste, 10 kg" bestehen, in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['Lager-Kiste mit 5 Stück', 'Versand-Kiste, 10 kg'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return {
      ok: true,
      message: 'Eigene Namespaces korrekt eingesetzt: Import per using, Vollqualifizierung für den nicht importierten Namespace.',
    };
  },
  distractors: [
    {
      code: `var kiste = new Kiste(5);
Console.WriteLine(kiste.Beschreibung());

var kiste2 = new Versand.Kiste(10);
Console.WriteLine(kiste2.Beschreibung());

namespace Lager
{
    class Kiste
    {
        private int menge;
        public Kiste(int menge) { this.menge = menge; }
        public string Beschreibung() => $"Lager-Kiste mit {menge} Stück";
    }
}

namespace Versand
{
    class Kiste
    {
        private int gewicht;
        public Kiste(int gewicht) { this.gewicht = gewicht; }
        public string Beschreibung() => $"Versand-Kiste, {gewicht} kg";
    }
}`,
      reason: 'lässt das using Lager; komplett weg — ohne Import findet der Compiler die unqualifizierte Kiste nicht mehr, echter Compilerfehler CS0246 ("The type or namespace name \'Kiste\' could not be found"), empirisch gegen den echten dotnet-Treiber bestätigt',
    },
    {
      code: `using Lager;

var kiste = new Kiste(10);
Console.WriteLine(kiste.Beschreibung());

var kiste2 = new Versand.Kiste(5);
Console.WriteLine(kiste2.Beschreibung());

namespace Lager
{
    class Kiste
    {
        private int menge;
        public Kiste(int menge) { this.menge = menge; }
        public string Beschreibung() => $"Lager-Kiste mit {menge} Stück";
    }
}

namespace Versand
{
    class Kiste
    {
        private int gewicht;
        public Kiste(int gewicht) { this.gewicht = gewicht; }
        public string Beschreibung() => $"Versand-Kiste, {gewicht} kg";
    }
}`,
      reason: 'vertauscht die beiden Zahlenwerte bei der Konstruktion (10 statt 5 für kiste, 5 statt 10 für kiste2) — kompiliert einwandfrei, die Ausgabe zeigt fälschlich "Lager-Kiste mit 10 Stück" und "Versand-Kiste, 5 kg" statt umgekehrt',
    },
    {
      code: `using Lager;

var kiste = new Kiste(5);
Console.WriteLine(kiste.Beschreibung());

var kiste2 = new Versand.Kiste(10);
Console.WriteLine(kiste2.Beschreibung());

namespace Lager
{
    class Kiste
    {
        private int menge;
        public Kiste(int menge) { this.menge = menge; }
        public string Beschreibung() => $"Lager-Kiste mit {menge} Stück";
    }
}

namespace Versand2
{
    class Kiste
    {
        private int gewicht;
        public Kiste(int gewicht) { this.gewicht = gewicht; }
        public string Beschreibung() => $"Versand-Kiste, {gewicht} kg";
    }
}`,
      reason: 'tippt den zweiten Namespace-Namen bei der Deklaration versehentlich als Versand2 statt Versand — der Aufruf new Versand.Kiste(10) referenziert weiterhin den ursprünglichen Namen, der jetzt nicht mehr existiert, echter Compilerfehler CS0246 ("The type or namespace name \'Versand\' could not be found"), empirisch gegen den echten dotnet-Treiber bestätigt',
    },
  ],
};
