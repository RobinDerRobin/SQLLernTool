import type { PythonChallenge } from '../../../types';

export const challenge18_3: PythonChallenge = {
  num: '18.3',
  title: 'Klassenattribute vs. Instanzattribute',
  tutorial: `Ein Attribut direkt im Klassenrumpf (nicht in <code>__init__</code>) gehört der <b>Klasse selbst</b> und wird von <b>allen</b> Objekten geteilt — ein Instanzattribut (<code>self.x = ...</code>) gehört dagegen jedem Objekt einzeln: <pre>class Hund:
    anzahl = 0            # Klassenattribut: eine gemeinsame Zahl für alle Hunde

    def __init__(self, name):
        self.name = name   # Instanzattribut: jeder Hund hat seinen eigenen Namen
        Hund.anzahl += 1</pre>Wichtig ist der Zugriffsweg beim Ändern: <code>Hund.anzahl += 1</code> ändert das <b>gemeinsame</b> Klassenattribut. <code>self.anzahl += 1</code> sähe fast identisch aus, würde aber etwas anderes tun: Python würde ein <b>neues, objekt-eigenes</b> Attribut namens <code>anzahl</code> anlegen, das ab da das Klassenattribut für dieses eine Objekt überdeckt — die gemeinsame Zählung bliebe bei 0 stehen.`,
  task: `<b>Deine Aufgabe:</b> Definiere eine Klasse <code>Hund</code> mit einem Klassenattribut <code>anzahl = 0</code> und <code>__init__(self, name)</code>, das <code>self.name</code> setzt und <code>Hund.anzahl</code> um 1 erhöht. Erzeuge zwei Hunde, <code>h1 = Hund("Bello")</code> und <code>h2 = Hund("Rex")</code>. Speichere <code>Hund.anzahl</code> in <code>gesamt</code> und <code>h1.name != h2.name</code> in <code>namen_unterschiedlich</code>. Gib beide aus.`,
  hints: [
    `<code>anzahl = 0</code> direkt im Klassenrumpf (gleiche Einrückung wie <code>def __init__</code>), nicht in <code>__init__</code>.`,
    `In <code>__init__</code>: <code>Hund.anzahl += 1</code> — über den Klassennamen, nicht über <code>self</code>.`,
    `So sieht die Lösung aus:<pre>class Hund:
    anzahl = 0

    def __init__(self, name):
        self.name = name
        Hund.anzahl += 1

h1 = Hund("Bello")
h2 = Hund("Rex")
gesamt = Hund.anzahl
namen_unterschiedlich = h1.name != h2.name
print(gesamt, namen_unterschiedlich)</pre>`,
  ] as const,
  solution: `class Hund:
    anzahl = 0

    def __init__(self, name):
        self.name = name
        Hund.anzahl += 1

h1 = Hund("Bello")
h2 = Hund("Rex")
gesamt = Hund.anzahl
namen_unterschiedlich = h1.name != h2.name
print(gesamt, namen_unterschiedlich)`,
  syntaxExplanation: `<ul><li><code>anzahl = 0</code> im Klassenrumpf — ein Klassenattribut, geteilt von allen Hunden.</li><li><code>Hund.anzahl += 1</code> — ändert das gemeinsame Attribut, nicht ein objekt-eigenes.</li><li><code>self.name</code> — ein Instanzattribut, für jeden Hund individuell.</li></ul>`,
  successCriteria: `gesamt muss 2 sein (beide Hunde wurden über das geteilte Klassenattribut gezählt), namen_unterschiedlich muss True sein.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { gesamt, namen_unterschiedlich: namenUnterschiedlich } = lastResult.variables;
    if (typeof gesamt !== 'number' || typeof namenUnterschiedlich !== 'boolean') {
      return { ok: false, message: 'Es fehlen die Variablen "gesamt" (Zahl) und "namen_unterschiedlich" (Wahrheitswert).' };
    }
    if (gesamt !== 2) {
      return { ok: false, message: `gesamt ist ${gesamt}, erwartet werden 2 — wurde Hund.anzahl (nicht self.anzahl) erhöht?` };
    }
    if (namenUnterschiedlich !== true) {
      return { ok: false, message: `namen_unterschiedlich ist ${namenUnterschiedlich}, erwartet wird True.` };
    }
    return { ok: true, message: 'Korrekt: Hund.anzahl zählt als geteiltes Klassenattribut auf 2, name bleibt pro Hund individuell.' };
  },
  distractors: [
    {
      code: `class Hund:
    anzahl = 0

    def __init__(self, name):
        self.name = name
        self.anzahl += 1

h1 = Hund("Bello")
h2 = Hund("Rex")
gesamt = Hund.anzahl
namen_unterschiedlich = h1.name != h2.name
print(gesamt, namen_unterschiedlich)`,
      reason: 'erhöht self.anzahl statt Hund.anzahl — dadurch legt Python für jedes Objekt ein eigenes, neues Instanzattribut anzahl an statt das geteilte Klassenattribut zu ändern, Hund.anzahl bleibt bei 0 stehen statt 2 zu werden',
    },
  ],
};
