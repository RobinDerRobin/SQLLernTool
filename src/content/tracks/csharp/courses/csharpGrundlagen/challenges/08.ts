import type { CSharpChallenge } from '../../../types';

export const challenge08: CSharpChallenge = {
  num: '08',
  title: 'Schleifen: while, for, do-while, break/continue, verschachtelt',
  tutorial: `Eine <code>while</code>-Schleife wiederholt ihren Rumpf, solange die Bedingung <code>true</code> ist — sie prüft <b>vor</b> jedem Durchlauf, kann also auch <b>null Mal</b> laufen. Eine <code>for</code>-Schleife bündelt Start, Bedingung und Schritt in einer Kopfzeile: <code>for (int i = 0; i &lt; 5; i++) { }</code>. Eine <code>do</code>-<code>while</code>-Schleife prüft die Bedingung erst <b>nach</b> dem Rumpf — der Rumpf läuft deshalb <b>garantiert mindestens einmal</b>, selbst wenn die Bedingung von Anfang an <code>false</code> wäre. Mit <code>break;</code> verlässt du eine Schleife sofort komplett, mit <code>continue;</code> überspringst du nur den Rest des aktuellen Durchlaufs und machst mit dem nächsten weiter. Schleifen lassen sich <b>verschachteln</b> (eine Schleife im Rumpf einer anderen) — dabei braucht jede Schleifenvariable ihren <b>eigenen</b> Namen: derselbe Name in innerer und äußerer Schleife ist ein Compilerfehler, kein stilles Überschreiben.`,
  task: `<b>Deine Aufgabe:</b> Berechne fünf Werte mit je einer anderen Schleifenform und gib sie mit <code>Console.WriteLine(...)</code> aus:<br>• <code>quadratsumme</code>: mit einer <code>for</code>-Schleife die Summe von 1² bis 5² (<code>1+4+9+16+25</code>)<br>• <code>summe</code>: mit einer <code>while</code>-Schleife die Summe <code>1+2+3+...</code>, solange <code>summe &lt; 20</code> ist (danach abbrechen)<br>• <code>laeufe</code>: mit einer <code>do</code>-<code>while</code>-Schleife, die einmal hochzählt, mit der (von Anfang an falschen) Bedingung <code>versuch &lt; 5</code> bei <code>int versuch = 10;</code><br>• <code>ungeradeSumme</code>: mit einer <code>for</code>-Schleife über 1 bis 10 — gerade Zahlen per <code>continue</code> überspringen, bei Zahlen über 7 per <code>break</code> abbrechen, alle anderen aufsummieren<br>• <code>zellenAnzahl</code>: mit zwei verschachtelten <code>for</code>-Schleifen (3 Zeilen × 4 Spalten) die Anzahl der Zellen zählen`,
  hints: [
    `<code>for</code>: <code>for (int i = 1; i &lt;= 5; i++) { quadratsumme += i * i; }</code>. <code>while</code>: die Bedingung <code>summe &lt; 20</code> steht direkt hinter <code>while</code>, der Rumpf zählt <code>summe</code> und die nächste Zahl gleichzeitig hoch.`,
    `<code>do</code> { ... } <code>while</code> (bedingung); — mit Semikolon am Ende. Bei <code>continue;</code>/<code>break;</code>: erst mit <code>if</code> die geraden Zahlen abfangen und überspringen, <b>danach</b> erst mit einem zweiten <code>if</code> auf zu große Zahlen prüfen und abbrechen — die Reihenfolge der beiden <code>if</code>s ist wichtig.`,
    `So sieht die Lösung aus:<pre>int quadratsumme = 0;
for (int i = 1; i <= 5; i++)
{
    quadratsumme += i * i;
}

int summe = 0;
int zahl = 1;
while (summe < 20)
{
    summe += zahl;
    zahl++;
}

int versuch = 10;
int laeufe = 0;
do
{
    laeufe++;
} while (versuch < 5);

int ungeradeSumme = 0;
for (int i = 1; i <= 10; i++)
{
    if (i % 2 == 0)
    {
        continue;
    }
    if (i > 7)
    {
        break;
    }
    ungeradeSumme += i;
}

int zellenAnzahl = 0;
for (int zeile = 1; zeile <= 3; zeile++)
{
    for (int spalte = 1; spalte <= 4; spalte++)
    {
        zellenAnzahl++;
    }
}

Console.WriteLine(quadratsumme);
Console.WriteLine(summe);
Console.WriteLine(laeufe);
Console.WriteLine(ungeradeSumme);
Console.WriteLine(zellenAnzahl);</pre>`,
  ] as const,
  solution: `int quadratsumme = 0;
for (int i = 1; i <= 5; i++)
{
    quadratsumme += i * i;
}

int summe = 0;
int zahl = 1;
while (summe < 20)
{
    summe += zahl;
    zahl++;
}

int versuch = 10;
int laeufe = 0;
do
{
    laeufe++;
} while (versuch < 5);

int ungeradeSumme = 0;
for (int i = 1; i <= 10; i++)
{
    if (i % 2 == 0)
    {
        continue;
    }
    if (i > 7)
    {
        break;
    }
    ungeradeSumme += i;
}

int zellenAnzahl = 0;
for (int zeile = 1; zeile <= 3; zeile++)
{
    for (int spalte = 1; spalte <= 4; spalte++)
    {
        zellenAnzahl++;
    }
}

Console.WriteLine(quadratsumme);
Console.WriteLine(summe);
Console.WriteLine(laeufe);
Console.WriteLine(ungeradeSumme);
Console.WriteLine(zellenAnzahl);`,
  syntaxExplanation: `<ul><li><code>for (int i = 1; i &lt;= 5; i++) quadratsumme += i * i;</code> — 1+4+9+16+25 = 55.</li><li><code>while (summe &lt; 20) { summe += zahl; zahl++; }</code> — läuft bis summe 21 erreicht (1+2+3+4+5+6), dann ist 21 &lt; 20 falsch.</li><li><code>do { laeufe++; } while (versuch &lt; 5);</code> — versuch ist 10, die Bedingung ist von Anfang an falsch, trotzdem läuft der Rumpf einmal: laeufe = 1.</li><li>Bei <code>ungeradeSumme</code> überspringt <code>continue</code> die geraden Zahlen (2,4,6,8,10), <code>break</code> stoppt bei 9 (weil 9 &gt; 7) — aufsummiert werden nur 1, 3, 5, 7 = 16.</li><li>Zwei verschachtelte <code>for</code>-Schleifen mit eigenen Variablen <code>zeile</code>/<code>spalte</code> zählen 3 × 4 = 12 Zellen.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau fünf Zeilen bestehen: "55", "21", "1", "16" und "12", in dieser Reihenfolge.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').slice(0, -1);
    const expected = ['55', '21', '1', '16', '12'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den fünf Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Alle fünf Schleifenformen korrekt eingesetzt.' };
  },
  distractors: [
    {
      code: `int quadratsumme = 0;
for (int i = 1; i <= 5; i++)
{
    quadratsumme += i * i;
}

int summe = 0;
int zahl = 1;
while (summe < 20)
{
    summe += zahl;
    zahl++;
}

int versuch = 10;
int laeufe = 0;
while (versuch < 5)
{
    laeufe++;
}

int ungeradeSumme = 0;
for (int i = 1; i <= 10; i++)
{
    if (i % 2 == 0)
    {
        continue;
    }
    if (i > 7)
    {
        break;
    }
    ungeradeSumme += i;
}

int zellenAnzahl = 0;
for (int zeile = 1; zeile <= 3; zeile++)
{
    for (int spalte = 1; spalte <= 4; spalte++)
    {
        zellenAnzahl++;
    }
}

Console.WriteLine(quadratsumme);
Console.WriteLine(summe);
Console.WriteLine(laeufe);
Console.WriteLine(ungeradeSumme);
Console.WriteLine(zellenAnzahl);`,
      reason: 'nutzt eine normale while-Schleife statt do-while für laeufe — da versuch (10) die Bedingung versuch < 5 von Anfang an nicht erfüllt, läuft der Rumpf gar nicht, laeufe bleibt 0 statt 1 (der ganze Sinn von do-while, den Rumpf mindestens einmal laufen zu lassen, geht verloren)',
    },
    {
      code: `int quadratsumme = 0;
for (int i = 1; i <= 5; i++)
{
    quadratsumme += i * i;
}

int summe = 0;
int zahl = 1;
while (summe < 20)
{
    summe += zahl;
    zahl++;
}

int versuch = 10;
int laeufe = 0;
do
{
    laeufe++;
} while (versuch < 5);

int ungeradeSumme = 0;
for (int i = 1; i <= 10; i++)
{
    if (i > 7)
    {
        break;
    }
    ungeradeSumme += i;
}

int zellenAnzahl = 0;
for (int zeile = 1; zeile <= 3; zeile++)
{
    for (int spalte = 1; spalte <= 4; spalte++)
    {
        zellenAnzahl++;
    }
}

Console.WriteLine(quadratsumme);
Console.WriteLine(summe);
Console.WriteLine(laeufe);
Console.WriteLine(ungeradeSumme);
Console.WriteLine(zellenAnzahl);`,
      reason: 'vergisst das continue für gerade Zahlen komplett — dadurch werden 1 bis 7 (statt nur den ungeraden Zahlen darunter) aufsummiert, ungeradeSumme wird fälschlich 28 statt 16',
    },
    {
      code: `int quadratsumme = 0;
for (int i = 1; i <= 5; i++)
{
    quadratsumme += i * i;
}

int summe = 0;
int zahl = 1;
while (summe < 20)
{
    summe += zahl;
    zahl++;
}

int versuch = 10;
int laeufe = 0;
do
{
    laeufe++;
} while (versuch < 5);

int ungeradeSumme = 0;
for (int i = 1; i <= 10; i++)
{
    if (i % 2 == 0)
    {
        continue;
    }
    if (i > 7)
    {
        break;
    }
    ungeradeSumme += i;
}

int zellenAnzahl = 0;
for (int zeile = 1; zeile <= 3; zeile++)
{
    for (int zeile = 1; zeile <= 4; zeile++)
    {
        zellenAnzahl++;
    }
}

Console.WriteLine(quadratsumme);
Console.WriteLine(summe);
Console.WriteLine(laeufe);
Console.WriteLine(ungeradeSumme);
Console.WriteLine(zellenAnzahl);`,
      reason: 'verwendet in der inneren Schleife denselben Variablennamen zeile wie in der äußeren — in C# ist das kein stilles Überschreiben wie in mancher anderen Sprache, sondern ein Compilerfehler (CS0136), weil der Name schon im umschließenden Gültigkeitsbereich vergeben ist',
    },
  ],
};
