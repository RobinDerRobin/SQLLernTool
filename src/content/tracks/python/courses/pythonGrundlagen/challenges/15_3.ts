import type { PythonChallenge } from '../../../types';

export const challenge15_3: PythonChallenge = {
  num: '15.3',
  title: 'Eigene Fehler auslösen: raise',
  tutorial: `Bisher haben eingebaute Operationen (Division, <code>int(...)</code>, Dict-Zugriff) automatisch Fehler ausgelöst. Mit <code>raise</code> löst du selbst gezielt einen Fehler aus, wenn deine eigene Funktion feststellt, dass etwas nicht stimmt: <pre>def pruefe_alter(alter):
    if alter < 0:
        raise ValueError("Alter darf nicht negativ sein")
    return alter</pre><code>raise ValueError("...")</code> erzeugt einen echten <code>ValueError</code> mit einer eigenen Nachricht und beendet die Funktion sofort an dieser Stelle — genau wie ein von Python selbst ausgelöster Fehler lässt er sich mit <code>try</code>/<code>except</code> abfangen. Mit <code>except ValueError as fehler:</code> bekommst du das Fehlerobjekt selbst in eine Variable — <code>str(fehler)</code> liefert die Nachricht als Text.`,
  task: `<b>Deine Aufgabe:</b> Schreibe eine Funktion <code>pruefe_alter(alter)</code>, die <code>raise ValueError("Alter darf nicht negativ sein")</code> auslöst, wenn <code>alter</code> kleiner als <code>0</code> ist, und sonst <code>alter</code> zurückgibt. Rufe <code>pruefe_alter(-5)</code> in einem <code>try</code>-Block auf. Fange den <code>ValueError</code> ab und speichere die Fehlermeldung (mit <code>str(...)</code>) in <code>ergebnis</code>. Gib <code>ergebnis</code> aus.`,
  hints: [
    `<code>raise ValueError("...")</code> innerhalb der Funktion, nur wenn <code>alter < 0</code>.`,
    `<code>except ValueError as fehler:</code> gibt dir das Fehlerobjekt — <code>str(fehler)</code> daraus liefert die Textnachricht.`,
    `So sieht die Lösung aus:<pre>def pruefe_alter(alter):
    if alter < 0:
        raise ValueError("Alter darf nicht negativ sein")
    return alter

try:
    ergebnis = pruefe_alter(-5)
except ValueError as fehler:
    ergebnis = str(fehler)
print(ergebnis)</pre>`,
  ] as const,
  solution: `def pruefe_alter(alter):
    if alter < 0:
        raise ValueError("Alter darf nicht negativ sein")
    return alter

try:
    ergebnis = pruefe_alter(-5)
except ValueError as fehler:
    ergebnis = str(fehler)
print(ergebnis)`,
  syntaxExplanation: `<ul><li><code>raise ValueError("...")</code> — löst einen eigenen Fehler mit eigener Nachricht aus.</li><li><code>pruefe_alter(-5)</code> — alter ist negativ, die Funktion löst den Fehler aus, statt einen Wert zurückzugeben.</li><li><code>except ValueError as fehler: ergebnis = str(fehler)</code> — fängt ihn ab und liest die Nachricht aus.</li></ul>`,
  successCriteria: `ergebnis muss der Text "Alter darf nicht negativ sein" sein und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { ergebnis } = lastResult.variables;
    if (typeof ergebnis !== 'string') {
      return { ok: false, message: 'Es fehlt eine Text-Variable "ergebnis" — wurde der ValueError wirklich ausgelöst und abgefangen?' };
    }
    if (ergebnis !== 'Alter darf nicht negativ sein') {
      return { ok: false, message: `ergebnis ist "${ergebnis}", erwartet wird "Alter darf nicht negativ sein".` };
    }
    if (!lastResult.stdout.includes('Alter darf nicht negativ sein')) {
      return { ok: false, message: 'ergebnis muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: pruefe_alter(-5) löst den ValueError aus, dessen Nachricht landet in ergebnis.' };
  },
  distractors: [
    {
      code: `def pruefe_alter(alter):
    if alter < 0:
        alter = alter
    return alter

try:
    ergebnis = pruefe_alter(-5)
except ValueError as fehler:
    ergebnis = str(fehler)
print(ergebnis)`,
      reason: 'löst bei negativem Alter nie einen Fehler aus (kein raise) — die Funktion gibt einfach -5 zurück, ergebnis wird die Zahl -5 statt der erwarteten Fehlermeldung',
    },
  ],
};
