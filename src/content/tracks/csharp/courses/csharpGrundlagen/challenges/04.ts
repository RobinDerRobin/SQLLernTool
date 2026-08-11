import type { CSharpChallenge } from '../../../types';

export const challenge04: CSharpChallenge = {
  num: '04',
  title: 'Operatoren: Arithmetik, Vergleich, Verknüpfung',
  tutorial: `Rechenoperatoren (<code>+ - * /</code>) funktionieren wie erwartet — mit einer wichtigen Ausnahme bei <code>int</code>: <code>/</code> zwischen zwei Ganzzahlen <b>schneidet den Nachkommateil ab</b> (rundet immer Richtung Null), <code>%</code> liefert den <b>Rest</b> dieser Division: <code>16 / 3</code> ergibt <code>5</code>, <code>16 % 3</code> ergibt <code>1</code>. Vergleichsoperatoren (<code>== != &lt; &gt; &lt;= &gt;=</code>) liefern immer einen <code>bool</code>. Mit <code>&amp;&amp;</code> (UND) und <code>||</code> (ODER) verknüpfst du mehrere <code>bool</code>-Werte — <code>a &amp;&amp; b</code> ist nur <code>true</code>, wenn <b>beide</b> Seiten <code>true</code> sind. Zwei Abkürzungen sparen Schreibarbeit: <code>x += 5;</code> ist dasselbe wie <code>x = x + 5;</code> (ebenso <code>-= *= /=</code>), und <code>x++;</code> ist dasselbe wie <code>x += 1;</code> (ebenso <code>x--;</code>).`,
  task: `<b>Szenario:</b> Ein Punktestand-Tracker in einem Spiel, Startwert 10 Punkte.<br><br><b>Deine Aufgabe:</b> Lege <code>int punkte = 10;</code> an und führe der Reihe nach aus, jeweils mit <code>Console.WriteLine(...)</code> ausgegeben:<br>• <code>punkte</code> um 5 erhöhen mit <code>+=</code><br>• <code>punkte</code> danach mit <code>++</code> um 1 erhöhen<br>• <code>bonuspunkte</code>: <code>punkte</code> verdoppelt (<code>*</code>)<br>• <code>runden</code>: <code>punkte</code> ganzzahlig durch 3 geteilt (<code>/</code>)<br>• <code>rest</code>: <code>punkte</code> modulo 3 (<code>%</code>)<br>• <code>bestanden</code>: ob <code>punkte</code> größer als 15 ist (<code>&gt;</code>)<br>• <code>bonus</code>: ob <code>bestanden</code> <b>und</b> <code>rest</code> gleich 1 ist (<code>&amp;&amp;</code>)`,
  hints: [
    `<code>punkte += 5;</code> und danach <code>punkte++;</code> — beide verändern <code>punkte</code> direkt, kein <code>punkte = ...</code> nötig.`,
    `<code>/</code> zwischen zwei <code>int</code> schneidet ab, <code>%</code> liefert den Rest davon — beide beziehen sich auf denselben aktuellen Wert von <code>punkte</code> (nach <code>+=</code> und <code>++</code>). Für <code>bonus</code> brauchst du <code>&amp;&amp;</code>, nicht <code>||</code>, weil <b>beide</b> Bedingungen gelten müssen.`,
    `So sieht die Lösung aus:<pre>int punkte = 10;
punkte += 5;
punkte++;
int bonuspunkte = punkte * 2;
int runden = punkte / 3;
int rest = punkte % 3;
bool bestanden = punkte > 15;
bool bonus = bestanden && (rest == 1);
Console.WriteLine(punkte);
Console.WriteLine(bonuspunkte);
Console.WriteLine(runden);
Console.WriteLine(rest);
Console.WriteLine(bestanden);
Console.WriteLine(bonus);</pre>`,
  ] as const,
  solution: `int punkte = 10;
punkte += 5;
punkte++;
int bonuspunkte = punkte * 2;
int runden = punkte / 3;
int rest = punkte % 3;
bool bestanden = punkte > 15;
bool bonus = bestanden && (rest == 1);
Console.WriteLine(punkte);
Console.WriteLine(bonuspunkte);
Console.WriteLine(runden);
Console.WriteLine(rest);
Console.WriteLine(bestanden);
Console.WriteLine(bonus);`,
  syntaxExplanation: `<ul><li><code>punkte += 5;</code> — Kurzform für <code>punkte = punkte + 5;</code>, ergibt 15.</li><li><code>punkte++;</code> — Kurzform für <code>punkte += 1;</code>, ergibt 16.</li><li><code>punkte * 2</code> — normale Multiplikation, ergibt 32.</li><li><code>punkte / 3</code> — int-Division schneidet ab: 16 / 3 = 5, nicht 5.33.</li><li><code>punkte % 3</code> — der Rest dieser Division: 16 % 3 = 1.</li><li><code>punkte &gt; 15</code> — Vergleich, liefert <code>bool</code>: 16 &gt; 15 ist <code>true</code>.</li><li><code>bestanden &amp;&amp; (rest == 1)</code> — beide Seiten sind <code>true</code>, also ist <code>bonus</code> auch <code>true</code>.</li></ul>`,
  successCriteria: `Die Ausgabe muss aus genau sechs Zeilen bestehen, in dieser Reihenfolge: "16", "32", "5", "1", "True", "True".`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const lines = lastResult.stdout.split('\n').filter((line) => line.length > 0);
    const expected = ['16', '32', '5', '1', 'True', 'True'];
    if (lines.length !== expected.length || expected.some((val, i) => lines[i] !== val)) {
      return {
        ok: false,
        message: `Die Ausgabe muss aus genau den sechs Zeilen ${JSON.stringify(expected)} bestehen. Bisherige Ausgabe: ${lastResult.stdout || '(leer)'}`,
      };
    }
    return { ok: true, message: 'Alle sechs Operatoren korrekt eingesetzt und berechnet.' };
  },
  distractors: [
    {
      code: `int punkte = 10;
punkte += 5;
punkte++;
int bonuspunkte = punkte * 2;
int runden = punkte % 3;
int rest = punkte / 3;
bool bestanden = punkte > 15;
bool bonus = bestanden && (rest == 1);
Console.WriteLine(punkte);
Console.WriteLine(bonuspunkte);
Console.WriteLine(runden);
Console.WriteLine(rest);
Console.WriteLine(bestanden);
Console.WriteLine(bonus);`,
      reason: 'vertauscht / und % — runden bekommt den Rest (1 statt 5), rest bekommt das ganzzahlige Ergebnis (5 statt 1), wodurch am Ende auch bonus fälschlich false statt true wird',
    },
    {
      code: `int punkte = 10;
punkte += 5;
int bonuspunkte = punkte * 2;
int runden = punkte / 3;
int rest = punkte % 3;
bool bestanden = punkte > 15;
bool bonus = bestanden && (rest == 1);
Console.WriteLine(punkte);
Console.WriteLine(bonuspunkte);
Console.WriteLine(runden);
Console.WriteLine(rest);
Console.WriteLine(bestanden);
Console.WriteLine(bonus);`,
      reason: 'vergisst punkte++ komplett — punkte bleibt bei 15 statt 16, wodurch bestanden (15 > 15) fälschlich false statt true wird und sich bonuspunkte, runden, rest und bonus ebenfalls falsch berechnen',
    },
  ],
};
