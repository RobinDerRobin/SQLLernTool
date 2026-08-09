import type { CSharpChallenge } from '../../../types';

export const challenge01: CSharpChallenge = {
  num: '01',
  title: 'Dein erstes Programm: Console.WriteLine',
  tutorial: `Ein C#-Programm ist wie in jeder anderen Sprache eine Liste von Anweisungen, die der Reihe nach ausgeführt werden — jede endet mit einem Semikolon <code>;</code>. Die einfachste und wichtigste Anweisung ist <code>Console.WriteLine(...)</code>: Sie gibt Text aus und fügt danach automatisch einen Zeilenumbruch an. <code>Console</code> ist eine eingebaute Klasse, <code>.WriteLine(...)</code> einer ihrer Methodenaufrufe — der Punkt zwischen beiden heißt <b>Dot-Syntax</b> und bedeutet "rufe dieses Mitglied von jenem Objekt/Typ auf". Text (in C# <b>string</b> genannt) steht immer in doppelten Anführungszeichen: <pre>Console.WriteLine("Hallo!"); // gibt Hallo! aus, mit Zeilenumbruch danach</pre>Moderne C#-Dateien brauchen dafür keine sichtbare <code>class</code>- oder <code>Main</code>-Hülle — die Anweisungen stehen einfach direkt in der Datei (<b>Top-Level Statements</b>).`,
  task: `Jedes Programm beginnt mit dem einfachsten Baustein überhaupt: etwas auszugeben. Das ist die Grundlage für alles Weitere.<br><br><b>Deine Aufgabe:</b> Schreibe zwei <code>Console.WriteLine(...)</code>-Anweisungen, die genau diese zwei Zeilen ausgeben:<br><code>Hallo, C#!</code><br><code>Das ist meine erste Codezeile.</code>`,
  hints: [
    `Jede Textausgabe braucht <code>Console.WriteLine(...)</code> mit dem Text in doppelten Anführungszeichen dazwischen, gefolgt von einem Semikolon.`,
    `Für zwei Ausgabezeilen brauchst du auch zwei <code>Console.WriteLine(...)</code>-Aufrufe, jeweils in einer eigenen Zeile — <code>WriteLine</code> (anders als <code>Write</code>) fügt selbst schon einen Zeilenumbruch an.`,
    `So sieht die Lösung aus:<pre>Console.WriteLine("Hallo, C#!");
Console.WriteLine("Das ist meine erste Codezeile.");</pre>`,
  ] as const,
  solution: `Console.WriteLine("Hallo, C#!");
Console.WriteLine("Das ist meine erste Codezeile.");`,
  syntaxExplanation: `<ul><li><code>Console.WriteLine(...)</code> — gibt den Text zwischen den Anführungszeichen aus, gefolgt von einem Zeilenumbruch.</li><li><code>;</code> — jede Anweisung in C# endet mit einem Semikolon.</li><li>Text steht in doppelten Anführungszeichen — einfache <code>'so'</code> sind in C# nur für einzelne Zeichen (<code>char</code>) erlaubt, nicht für Text.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau zwei Zeilen bestehen: 'Hallo, C#!' und 'Das ist meine erste Codezeile.', in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').filter((line) => line.length > 0);
    if (lines.length !== 2 || lines[0] !== 'Hallo, C#!' || lines[1] !== 'Das ist meine erste Codezeile.') {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den zwei Zeilen "Hallo, C#!" und "Das ist meine erste Codezeile." bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Beide Zeilen korrekt ausgegeben.' };
  },
  distractors: [
    {
      code: `Console.Write("Hallo, C#!");
Console.Write("Das ist meine erste Codezeile.");`,
      reason: 'nutzt Write statt WriteLine — beide Texte landen ohne Zeilenumbruch dazwischen in einer einzigen Zeile ("Hallo, C#!Das ist meine erste Codezeile."), statt in zwei getrennten Zeilen',
    },
  ],
};
