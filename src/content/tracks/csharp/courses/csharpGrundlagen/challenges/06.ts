import type { CSharpChallenge } from '../../../types';

export const challenge06: CSharpChallenge = {
  num: '06',
  title: 'Typumwandlung und Nullability',
  tutorial: `Mit einer <b>expliziten Typumwandlung</b> (Cast) erzwingst du eine Umwandlung, die C# nicht automatisch vornimmt — <code>(int)meineDouble</code> setzt den Zieltyp in Klammern direkt vor den Ausdruck. Wichtig: das <b>schneidet den Nachkommateil einfach ab</b>, es rundet nicht — <code>(int)87.6</code> ergibt <code>87</code>, nicht 88. Normalerweise kann ein <b>Werttyp</b> wie <code>int</code> nie <code>null</code> sein — mit einem <code>?</code> hinter dem Typ machst du ihn <b>nullable</b>: <code>int? x = null;</code> ist erlaubt, <code>int x = null;</code> nicht. Für nullable Werte gibt es zwei nützliche Operatoren: <code>??</code> (<b>null-coalescing</b>) liefert einen Ersatzwert, falls links davon <code>null</code> steht — <code>x ?? 0</code>. Und <code>?.</code> (<b>null-conditional</b>) greift nur dann auf ein Mitglied zu, wenn das Objekt links davon nicht <code>null</code> ist — bei <code>null</code> liefert der ganze Ausdruck einfach <code>null</code>, statt (wie bei normalem <code>.</code>) mit einer <code>NullReferenceException</code> abzustürzen.`,
  task: `<b>Szenario:</b> Eine Testauswertung mit einer rohen Punktzahl und einem optionalen Spitznamen, der (noch) nicht gesetzt ist.<br><br><b>Deine Aufgabe:</b><br>• <code>gerundet</code>: <code>double rohpunktzahl = 87.6;</code> per explizitem Cast nach <code>int</code> umgewandelt<br>• <code>bonuspunkte</code>: eine <code>int?</code>-Variable mit Wert <code>null</code><br>• <code>bonusAnzeige</code>: <code>bonuspunkte</code>, per <code>??</code> mit Ersatzwert <code>0</code><br>• <code>spitzname</code>: eine <code>string?</code>-Variable mit Wert <code>null</code><br>• <code>spitznameLaenge</code>: die Länge von <code>spitzname</code> per <code>?.</code> ermittelt (<code>int?</code>)<br>Gib <code>gerundet</code>, <code>bonusAnzeige</code> und <code>spitznameLaenge</code> mit je einem <code>Console.WriteLine(...)</code> aus.`,
  hints: [
    `Der Cast steht in eigenen Klammern direkt vor dem Ausdruck: <code>int gerundet = (int)rohpunktzahl;</code>. Ohne diese Klammern lässt sich ein <code>double</code> nicht in eine <code>int</code>-Variable schreiben.`,
    `Nullable-Deklarationen brauchen ein <code>?</code> direkt hinter dem Typ: <code>int? bonuspunkte = null;</code>, <code>string? spitzname = null;</code>. <code>??</code> und <code>?.</code> stehen jeweils direkt zwischen den beiden Operanden, ohne Leerzeichen dazwischen: <code>bonuspunkte ?? 0</code>, <code>spitzname?.Length</code>.`,
    `So sieht die Lösung aus:<pre>double rohpunktzahl = 87.6;
int gerundet = (int)rohpunktzahl;
int? bonuspunkte = null;
int bonusAnzeige = bonuspunkte ?? 0;
string? spitzname = null;
int? spitznameLaenge = spitzname?.Length;
Console.WriteLine(gerundet);
Console.WriteLine(bonusAnzeige);
Console.WriteLine(spitznameLaenge);</pre>`,
  ] as const,
  solution: `double rohpunktzahl = 87.6;
int gerundet = (int)rohpunktzahl;
int? bonuspunkte = null;
int bonusAnzeige = bonuspunkte ?? 0;
string? spitzname = null;
int? spitznameLaenge = spitzname?.Length;
Console.WriteLine(gerundet);
Console.WriteLine(bonusAnzeige);
Console.WriteLine(spitznameLaenge);`,
  syntaxExplanation: `<ul><li><code>(int)rohpunktzahl</code> — expliziter Cast, schneidet den Nachkommateil ab: 87.6 wird 87.</li><li><code>int? bonuspunkte = null;</code> — nullable <code>int</code>, sonst wäre <code>= null;</code> ein Compilerfehler.</li><li><code>bonuspunkte ?? 0</code> — liefert 0, weil <code>bonuspunkte</code> <code>null</code> ist.</li><li><code>spitzname?.Length</code> — greift nur auf <code>.Length</code> zu, wenn <code>spitzname</code> nicht <code>null</code> ist; hier ist es <code>null</code>, also ist das Ergebnis ebenfalls <code>null</code> (ausgegeben als leere Zeile) statt einer <code>NullReferenceException</code>.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau drei Zeilen bestehen: "87", "0" und einer leeren dritten Zeile (weil spitznameLaenge null ist), in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const rawLines = lastResult.stdout.split('\n');
    const lines = rawLines.slice(0, -1);
    const expected = ['87', '0', ''];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den drei Zeilen ${JSON.stringify(expected)} bestehen (die dritte Zeile bleibt leer). Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Cast, Nullable-Deklaration, ?? und ?. korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `double rohpunktzahl = 87.6;
int gerundet = rohpunktzahl;
int? bonuspunkte = null;
int bonusAnzeige = bonuspunkte ?? 0;
string? spitzname = null;
int? spitznameLaenge = spitzname?.Length;
Console.WriteLine(gerundet);
Console.WriteLine(bonusAnzeige);
Console.WriteLine(spitznameLaenge);`,
      reason: 'vergisst den expliziten Cast (int) — ein double lässt sich nicht ohne ausdrückliche Umwandlung einer int-Variable zuweisen, Compilerfehler CS0266',
    },
    {
      code: `double rohpunktzahl = 87.6;
int gerundet = (int)rohpunktzahl;
int? bonuspunkte = null;
int bonusAnzeige = bonuspunkte ?? 0;
string? spitzname = null;
int? spitznameLaenge = spitzname.Length;
Console.WriteLine(gerundet);
Console.WriteLine(bonusAnzeige);
Console.WriteLine(spitznameLaenge);`,
      reason: 'nutzt . statt ?. beim Zugriff auf spitzname.Length — weil spitzname tatsächlich null ist, stürzt das zur Laufzeit mit einer NullReferenceException ab, statt wie mit ?. einfach null zu liefern',
    },
    {
      code: `double rohpunktzahl = 87.6;
int gerundet = (int)rohpunktzahl;
int bonuspunkte = null;
int bonusAnzeige = bonuspunkte ?? 0;
string? spitzname = null;
int? spitznameLaenge = spitzname?.Length;
Console.WriteLine(gerundet);
Console.WriteLine(bonusAnzeige);
Console.WriteLine(spitznameLaenge);`,
      reason: 'vergisst das ? bei der bonuspunkte-Deklaration — int (ohne ?) ist nicht nullable, weder die Zuweisung von null noch die anschließende ??-Verknüpfung kompilieren dann (CS0037, CS0019)',
    },
  ],
};
