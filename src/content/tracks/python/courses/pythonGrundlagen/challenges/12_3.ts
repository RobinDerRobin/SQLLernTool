import type { PythonChallenge } from '../../../types';

export const challenge12_3: PythonChallenge = {
  num: '12.3',
  title: 'Lokale und globale Variablen',
  tutorial: `Eine Variable, die du <b>innerhalb</b> einer Funktion neu zuweist, ist <b>lokal</b> — sie existiert nur während dieses Funktionsaufrufs und ist danach wieder weg. Wichtig: Gibt es außerhalb der Funktion schon eine Variable mit demselben Namen, wird sie durch die lokale Zuweisung <b>nicht verändert</b> — Python legt innerhalb der Funktion einfach eine eigene, getrennte Variable mit demselben Namen an: <pre>x = 100

def f():
    x = 5   # das ist eine NEUE, lokale Variable x
    return x

f()
print(x)  # immer noch 100 — die äußere Variable blieb unberührt</pre>Nur mit dem Schlüsselwort <code>global x</code> könntest du eine Funktion ausdrücklich anweisen, die äußere Variable zu verändern statt eine eigene lokale anzulegen — das ist aber die Ausnahme, nicht der Normalfall, und macht Code schwerer nachzuvollziehen.`,
  task: `Eine der häufigsten Anfänger-Überraschungen: eine Variable in einer Funktion zu ändern und zu erwarten, dass sich dieselbe Variable auch außerhalb ändert. Hier siehst du live, dass das nicht passiert — Funktionen sind isoliert.<br><br><b>Deine Aufgabe:</b> Setze <code>temp = 100</code>. Schreibe eine Funktion <code>verdreifachen(zahl)</code>, die intern eine lokale Variable <code>temp</code> auf <code>zahl * 3</code> setzt und zurückgibt. Rufe die Funktion mit <code>5</code> auf, speichere das Ergebnis in <code>ergebnis</code>. Gib danach sowohl die äußere Variable <code>temp</code> als auch <code>ergebnis</code> aus.`,
  hints: [
    `Innerhalb der Funktion ist <code>temp = zahl * 3</code> eine ganz normale lokale Zuweisung — sie sieht genauso aus wie außerhalb, betrifft aber eine andere Variable.`,
    `Nach dem Funktionsaufruf bleibt die äußere Variable temp unverändert bei 100 — nur ergebnis trägt den neuen Wert.`,
    `So sieht die Lösung aus:<pre>temp = 100

def verdreifachen(zahl):
    temp = zahl * 3
    return temp

ergebnis = verdreifachen(5)
print(temp)
print(ergebnis)</pre>`,
  ] as const,
  solution: `temp = 100

def verdreifachen(zahl):
    temp = zahl * 3
    return temp

ergebnis = verdreifachen(5)
print(temp)
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>temp = zahl * 3</code> innerhalb der Funktion — legt eine eigene, lokale Variable temp an, unabhängig von der äußeren.</li><li>Nach <code>verdreifachen(5)</code> ist die äußere temp weiterhin 100 — die lokale Version existiert nur während des Funktionsaufrufs.</li><li><code>ergebnis</code> trägt den per return herausgegebenen Wert 15.</li></ul>`,
  successCriteria: `Die äußere Variable temp muss weiterhin 100 sein, ergebnis muss 15 sein, beide ausgegeben.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { temp, ergebnis } = lastResult.variables;
    if (typeof temp !== 'number' || typeof ergebnis !== 'number') {
      return { ok: false, message: 'Es fehlen die Zahl-Variablen "temp" und/oder "ergebnis".' };
    }
    if (temp !== 100) {
      return { ok: false, message: `Die äußere Variable temp ist ${temp}, erwartet wird weiterhin 100 — die Funktion darf sie nicht verändert haben.` };
    }
    if (ergebnis !== 15) {
      return { ok: false, message: `ergebnis ist ${ergebnis}, erwartet wird 15 (5 * 3).` };
    }
    if (!lastResult.stdout.includes('100') || !lastResult.stdout.includes('15')) {
      return { ok: false, message: 'Beide Werte müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: temp blieb unverändert bei 100, ergebnis ist 15.' };
  },
  distractors: [
    {
      code: `temp = 100

def verdreifachen(zahl):
    global temp
    temp = zahl * 3
    return temp

ergebnis = verdreifachen(5)
print(temp)
print(ergebnis)`,
      reason: 'benutzt "global temp" — dadurch verändert die Funktion tatsächlich die äußere Variable (temp wird 15 statt bei 100 zu bleiben), genau das Verhalten, das die Aufgabe widerlegen soll',
    },
  ],
};
