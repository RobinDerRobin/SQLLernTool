import type { PythonChallenge } from '../../../types';

export const challenge13: PythonChallenge = {
  num: '13',
  title: 'Mehrere Werte in einer Variable: Listen',
  tutorial: `Bisher konnte jede Variable nur einen Wert speichern. Eine <b>Liste</b> speichert mehrere Werte in einer bestimmten Reihenfolge, geschrieben mit eckigen Klammern: <pre>obst = ["Apfel", "Banane", "Kiwi"]</pre>Auf ein einzelnes Element greift man über seinen <b>Index</b> zu — beginnend bei <code>0</code> für das erste Element: <pre>obst[0]   # "Apfel" (erstes Element)
obst[1]   # "Banane" (zweites Element)</pre><code>len(liste)</code> liefert die Anzahl der Elemente — bei <code>obst</code> also <code>3</code>. Der Index des letzten Elements ist deshalb immer <code>len(liste) - 1</code>, nicht <code>len(liste)</code> selbst (das wäre bereits außerhalb der Liste und würde einen <code>IndexError</code> auslösen).`,
  task: `<b>Deine Aufgabe:</b> Erstelle eine Liste <code>obst</code> mit den drei Einträgen <code>"Apfel"</code>, <code>"Banane"</code> und <code>"Kiwi"</code> (in dieser Reihenfolge). Speichere das <b>zweite</b> Element (Index <code>1</code>) in einer Variable <code>zweites</code> und die <b>Anzahl</b> der Elemente in einer Variable <code>anzahl</code>. Gib beide aus.`,
  hints: [
    `Eine Liste wird mit eckigen Klammern erstellt: <code>obst = ["Apfel", "Banane", "Kiwi"]</code>.`,
    `Der Index startet bei <code>0</code> — das zweite Element hat also Index <code>1</code>: <code>obst[1]</code>. <code>len(obst)</code> liefert die Gesamtzahl der Elemente.`,
    `So sieht die Lösung aus:<pre>obst = ["Apfel", "Banane", "Kiwi"]
zweites = obst[1]
anzahl = len(obst)
print(zweites, anzahl)</pre>`,
  ] as const,
  solution: `obst = ["Apfel", "Banane", "Kiwi"]
zweites = obst[1]
anzahl = len(obst)
print(zweites, anzahl)`,
  syntaxExplanation: `<ul><li><code>["Apfel", "Banane", "Kiwi"]</code> — eine Liste mit drei Einträgen in fester Reihenfolge.</li><li><code>obst[1]</code> — Index-Zugriff auf das zweite Element (Zählung beginnt bei 0).</li><li><code>len(obst)</code> — liefert die Anzahl der Elemente, hier <code>3</code>.</li></ul>`,
  successCriteria: `zweites muss "Banane" sein, anzahl muss 3 sein, beide müssen ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { zweites, anzahl } = lastResult.variables;
    if (zweites !== 'Banane') {
      return { ok: false, message: `zweites ist ${JSON.stringify(zweites)}, erwartet wird "Banane" (Index 1).` };
    }
    if (anzahl !== 3) {
      return { ok: false, message: `anzahl ist ${JSON.stringify(anzahl)}, erwartet werden 3 Elemente.` };
    }
    if (!lastResult.stdout.includes('Banane') || !lastResult.stdout.includes('3')) {
      return { ok: false, message: 'zweites und anzahl müssen auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: obst[1] ist "Banane", die Liste hat 3 Elemente.' };
  },
  distractors: [
    {
      code: `obst = ["Apfel", "Banane", "Kiwi"]
zweites = obst[2]
anzahl = len(obst)
print(zweites, anzahl)`,
      reason: 'verwechselt Index 2 (drittes Element, "Kiwi") mit dem zweiten Element — ein klassischer Off-by-one-Fehler, weil die Zählung bei 0 statt bei 1 beginnt',
    },
  ],
};
