import type { PythonChallenge } from '../../../types';

export const challenge11: PythonChallenge = {
  num: '11',
  title: 'Wiederholen: die for-Schleife',
  tutorial: `Ein <b>Iterable</b> ('etwas, worüber man iterieren kann') ist alles, was aus mehreren Werten besteht, die man der Reihe nach durchgehen kann — ein Text ist zum Beispiel ein Iterable aus einzelnen Zeichen. Mit <code>for variable in iterable:</code> lässt du Python automatisch jeden dieser Werte einmal in <code>variable</code> stecken und den eingerückten Block dafür einmal ausführen: <pre>for zeichen in "abc":
    print(zeichen)
# gibt aus: a, dann b, dann c (je eine eigene Zeile)</pre>Die Schleife läuft automatisch genau so oft, wie das Iterable Werte hat — du musst nirgends selbst mitzählen, wann Schluss ist.`,
  task: `Manuell jedes Zeichen einzeln herauszupicken wäre bei einem langen Text unmöglich — die for-Schleife übernimmt das "für jeden Wert einmal" automatisch. Das ist die Grundlage für praktisch jede Verarbeitung von Texten, Listen oder anderen Wertesammlungen.<br><br><b>Deine Aufgabe:</b> Die Variable <code>wort = "ananas"</code> ist vorgegeben. Zähle mit einer for-Schleife, wie oft der Buchstabe <code>"a"</code> darin vorkommt, und speichere das Ergebnis in <code>anzahl_a</code>. Gib <code>anzahl_a</code> aus.`,
  hints: [
    `<code>for buchstabe in wort:</code> lässt dich jedes Zeichen des Texts einzeln durchgehen.`,
    `Vergleiche in der Schleife jedes Zeichen mit <code>"a"</code> und zähle bei Treffer mit <code>anzahl_a += 1</code> hoch — die Zählvariable muss vor der Schleife bei 0 starten.`,
    `So sieht die Lösung aus:<pre>wort = "ananas"
anzahl_a = 0
for buchstabe in wort:
    if buchstabe == "a":
        anzahl_a += 1
print(anzahl_a)</pre>`,
  ] as const,
  solution: `wort = "ananas"
anzahl_a = 0
for buchstabe in wort:
    if buchstabe == "a":
        anzahl_a += 1
print(anzahl_a)`,
  syntaxExplanation: `<ul><li><code>for buchstabe in wort:</code> — läuft einmal pro Zeichen in wort, mit buchstabe jeweils auf das aktuelle Zeichen gesetzt.</li><li><code>if buchstabe == "a":</code> — prüft bei jedem Durchlauf, ob genau dieses Zeichen ein "a" ist.</li><li><code>anzahl_a += 1</code> — zählt nur bei Treffer hoch, sonst bleibt anzahl_a unverändert.</li></ul>`,
  successCriteria: `Die Variable anzahl_a muss die tatsächliche Anzahl der "a" in "ananas" enthalten (3) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { anzahl_a: anzahlA } = lastResult.variables;
    if (typeof anzahlA !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "anzahl_a".' };
    }
    if (anzahlA !== 3) {
      return { ok: false, message: `anzahl_a ist ${anzahlA}, erwartet wird 3 ("ananas" enthält 3-mal "a").` };
    }
    if (!lastResult.stdout.includes('3')) {
      return { ok: false, message: 'anzahl_a muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt gezählt: 3-mal "a" in "ananas".' };
  },
  distractors: [
    {
      code: `wort = "ananas"
anzahl_a = len(wort)
print(anzahl_a)`,
      reason: 'zählt die Gesamtlänge des Texts statt der Treffer für "a" — verwechselt "wie lang" mit "wie oft"',
    },
  ],
};
