import type { PythonChallenge } from '../../../types';

export const challenge12_2: PythonChallenge = {
  num: '12.2',
  title: 'Standardwerte für Parameter',
  tutorial: `Ein Parameter kann einen <b>Standardwert</b> ("default") bekommen, der gilt, wenn beim Aufruf kein Wert dafür übergeben wird: <pre>def begruessung(name, sprache="de"):
    ...</pre>Rufst du <code>begruessung("Anna")</code> auf, wird <code>sprache</code> automatisch <code>"de"</code>. Rufst du stattdessen <code>begruessung("Tom", "en")</code> auf, überschreibt der übergebene Wert den Standard. Das erspart dir, den häufigsten Fall bei jedem Aufruf immer wieder ausschreiben zu müssen.`,
  task: `Viele Funktionen haben einen "üblichen" Fall und seltenere Ausnahmen — z. B. eine Begrüßung, die meistens auf Deutsch sein soll, aber gelegentlich auch auf Englisch. Ein Standardwert erspart dir, den häufigen Fall jedes Mal explizit anzugeben.<br><br><b>Deine Aufgabe:</b> Schreibe eine Funktion <code>begruessung(name, sprache="de")</code>. Bei <code>sprache == "de"</code> gibt sie <code>f"Hallo, {name}!"</code> zurück, sonst <code>f"Hello, {name}!"</code>. Rufe sie zweimal auf: einmal nur mit <code>"Anna"</code> (Ergebnis in <code>satz1</code>), einmal mit <code>"Tom"</code> und <code>"en"</code> (Ergebnis in <code>satz2</code>). Gib beide aus.`,
  hints: [
    `Der Standardwert steht direkt in der Parameterliste: <code>def begruessung(name, sprache="de"):</code>.`,
    `Ein Aufruf ohne zweites Argument (<code>begruessung("Anna")</code>) nutzt automatisch <code>sprache="de"</code> — du musst es nicht extra angeben.`,
    `So sieht die Lösung aus:<pre>def begruessung(name, sprache="de"):
    if sprache == "de":
        return f"Hallo, {name}!"
    else:
        return f"Hello, {name}!"

satz1 = begruessung("Anna")
satz2 = begruessung("Tom", "en")
print(satz1)
print(satz2)</pre>`,
  ] as const,
  solution: `def begruessung(name, sprache="de"):
    if sprache == "de":
        return f"Hallo, {name}!"
    else:
        return f"Hello, {name}!"

satz1 = begruessung("Anna")
satz2 = begruessung("Tom", "en")
print(satz1)
print(satz2)`,
  syntaxExplanation: `<ul><li><code>sprache="de"</code> — der Standardwert, falls beim Aufruf nichts angegeben wird.</li><li><code>begruessung("Anna")</code> — nutzt den Standard, ergibt "Hallo, Anna!".</li><li><code>begruessung("Tom", "en")</code> — überschreibt den Standard explizit, ergibt "Hello, Tom!".</li></ul>`,
  successCriteria: `satz1 muss "Hallo, Anna!" sein, satz2 muss "Hello, Tom!" sein, beide ausgegeben.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { satz1, satz2 } = lastResult.variables;
    if (typeof satz1 !== 'string' || typeof satz2 !== 'string') {
      return { ok: false, message: 'Es fehlen die Text-Variablen "satz1" und/oder "satz2".' };
    }
    if (satz1 !== 'Hallo, Anna!') {
      return { ok: false, message: `satz1 ist "${satz1}", erwartet wird "Hallo, Anna!" (Standardsprache de).` };
    }
    if (satz2 !== 'Hello, Tom!') {
      return { ok: false, message: `satz2 ist "${satz2}", erwartet wird "Hello, Tom!" (explizit en).` };
    }
    if (!lastResult.stdout.includes('Hallo, Anna!') || !lastResult.stdout.includes('Hello, Tom!')) {
      return { ok: false, message: 'Beide Sätze müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Standardwert und explizite Sprache funktionieren beide.' };
  },
  distractors: [
    {
      code: `def begruessung(name, sprache):
    if sprache == "de":
        return f"Hallo, {name}!"
    else:
        return f"Hello, {name}!"

satz1 = begruessung("Anna")
satz2 = begruessung("Tom", "en")
print(satz1)
print(satz2)`,
      reason: 'vergisst den Standardwert "de" für sprache — der Aufruf begruessung("Anna") ohne zweites Argument bricht dann mit einem Fehler ab (fehlendes Pflichtargument)',
    },
  ],
};
