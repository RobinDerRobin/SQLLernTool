import type { PythonChallenge } from '../../../types';

export const challenge20: PythonChallenge = {
  num: '20',
  title: 'Der Typ folgt dem Wert: dynamische Typisierung',
  tutorial: `Du hast schon <code>int</code>, <code>str</code>, <code>float</code> und <code>bool</code> genutzt, aber nie einen Typ <b>deklariert</b> — kein <code>int wert = 5</code> wie in anderen Sprachen. In Python bekommt eine Variable nie einen festen Typ zugewiesen: der Typ folgt einfach dem aktuellen Wert. Weist du derselben Variable später einen anderen Werttyp zu, ändert sich ihr Typ einfach mit — ohne Fehler, ohne Umweg: <pre>wert = 5          # wert ist jetzt ein int
wert = "fünf"     # dieselbe Variable, jetzt ein str</pre>Mit <code>type(x).__name__</code> kannst du den aktuellen Typ eines Werts als Text abfragen (z. B. <code>"int"</code> oder <code>"str"</code>).`,
  task: `<b>Deine Aufgabe:</b> Weise der Variable <code>wert</code> zuerst die Zahl <code>5</code> zu und speichere ihren Typnamen in <code>erster_typ</code> (mit <code>type(wert).__name__</code>). Weise <code>wert</code> danach den Text <code>"fünf"</code> zu (derselbe Variablenname!) und speichere den neuen Typnamen in <code>zweiter_typ</code>. Gib beide Typnamen aus.`,
  hints: [
    `<code>type(wert).__name__</code> liefert den aktuellen Typ von <code>wert</code> als Text, z. B. <code>"int"</code>.`,
    `Wichtig: Es muss dieselbe Variable <code>wert</code> sein, die zuerst eine Zahl und danach einen Text bekommt — nicht zwei verschiedene Variablen.`,
    `So sieht die Lösung aus:<pre>wert = 5
erster_typ = type(wert).__name__
wert = "fünf"
zweiter_typ = type(wert).__name__
print(erster_typ, zweiter_typ)</pre>`,
  ] as const,
  solution: `wert = 5
erster_typ = type(wert).__name__
wert = "fünf"
zweiter_typ = type(wert).__name__
print(erster_typ, zweiter_typ)`,
  syntaxExplanation: `<ul><li><code>wert = 5</code> — wert ist jetzt vom Typ int.</li><li><code>type(wert).__name__</code> — liefert den aktuellen Typnamen als String ("int").</li><li><code>wert = "fünf"</code> — dieselbe Variable bekommt einen neuen Wert mit anderem Typ — kein Fehler, keine Deklaration nötig.</li></ul>`,
  successCriteria: `erster_typ muss "int" sein, zweiter_typ muss "str" sein — beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { erster_typ, zweiter_typ } = lastResult.variables;
    if (typeof erster_typ !== 'string' || typeof zweiter_typ !== 'string') {
      return { ok: false, message: 'Es fehlen die Text-Variablen "erster_typ" und/oder "zweiter_typ".' };
    }
    if (erster_typ !== 'int' || zweiter_typ !== 'str') {
      return {
        ok: false,
        message: `erster_typ ist "${erster_typ}", zweiter_typ ist "${zweiter_typ}" — erwartet wird "int" und "str".`,
      };
    }
    if (!lastResult.stdout.includes('int') || !lastResult.stdout.includes('str')) {
      return { ok: false, message: 'Beide Typnamen müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: dieselbe Variable wechselt einfach den Typ, sobald sie einen neuen Wert bekommt.' };
  },
  distractors: [
    {
      code: `wert = 5
erster_typ = type(wert).__name__
wert2 = "fünf"
zweiter_typ = type(wert).__name__
print(erster_typ, zweiter_typ)`,
      reason: 'legt für den Text eine NEUE Variable wert2 an statt wert wiederzuverwenden — zweiter_typ fragt weiterhin type(wert) ab, das immer noch ein int ist, also "int" statt des erwarteten "str"',
    },
  ],
};
