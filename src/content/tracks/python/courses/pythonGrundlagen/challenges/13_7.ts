import type { PythonChallenge } from '../../../types';

export const challenge13_7: PythonChallenge = {
  num: '13.7',
  title: 'Strukturen ineinander verschachteln',
  tutorial: `Listen und Dictionaries lassen sich beliebig ineinander verschachteln — eine Liste aus Dictionaries ist die natürliche Art, mehrere gleichartige Datensätze zu speichern: <pre>personen = [
    {"name": "Ana", "alter": 17},
    {"name": "Ben", "alter": 19},
]</pre>Der Zugriff kombiniert einfach Index- und Schlüssel-Zugriff nacheinander: <code>personen[1]</code> holt zuerst das zweite Dictionary aus der Liste (<code>{"name": "Ben", "alter": 19}</code>), <code>personen[1]["name"]</code> holt daraus dann den Wert zu <code>"name"</code> (<code>"Ben"</code>). Genauso funktioniert es umgekehrt — ein Dictionary, dessen Werte selbst Listen sind (z. B. <code>{"Ana": [17, "Berlin"]}</code>).`,
  task: `<b>Deine Aufgabe:</b> Gegeben ist <code>personen = [{"name": "Ana", "alter": 17}, {"name": "Ben", "alter": 19}]</code>. Berechne <code>alterssumme</code> als Summe der beiden <code>"alter"</code>-Werte (17 + 19). Gib <code>alterssumme</code> aus.`,
  hints: [
    `<code>personen[0]</code> ist das erste Dictionary in der Liste, <code>personen[1]</code> das zweite.`,
    `Kombiniere Index und Schlüssel direkt hintereinander: <code>personen[0]["alter"]</code> und <code>personen[1]["alter"]</code>.`,
    `So sieht die Lösung aus:<pre>personen = [{"name": "Ana", "alter": 17}, {"name": "Ben", "alter": 19}]
alterssumme = personen[0]["alter"] + personen[1]["alter"]
print(alterssumme)</pre>`,
  ] as const,
  solution: `personen = [{"name": "Ana", "alter": 17}, {"name": "Ben", "alter": 19}]
alterssumme = personen[0]["alter"] + personen[1]["alter"]
print(alterssumme)`,
  syntaxExplanation: `<ul><li><code>personen[0]</code> — Listen-Index, holt das erste Dictionary.</li><li><code>["alter"]</code> — Dict-Schlüssel, holt daraus den Wert.</li><li>17 + 19 = <code>36</code>.</li></ul>`,
  successCriteria: `Die Variable alterssumme muss 36 sein (17 + 19) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { alterssumme } = lastResult.variables;
    if (typeof alterssumme !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "alterssumme".' };
    }
    if (alterssumme !== 36) {
      return { ok: false, message: `alterssumme ist ${alterssumme}, erwartet wird 36 (17 + 19).` };
    }
    if (!lastResult.stdout.includes('36')) {
      return { ok: false, message: 'alterssumme muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: 17 + 19 = 36.' };
  },
  distractors: [
    {
      code: `personen = [{"name": "Ana", "alter": 17}, {"name": "Ben", "alter": 19}]
alterssumme = personen[0, "alter"] + personen[1, "alter"]
print(alterssumme)`,
      reason: 'versucht Index und Schlüssel in einem Zugriff zu kombinieren (personen[0, "alter"]) statt sie nacheinander zu verketten — Listen lassen sich nicht mit einem Tupel indizieren, das löst einen echten TypeError aus',
    },
  ],
};
