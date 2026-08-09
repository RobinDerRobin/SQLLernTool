import type { PythonChallenge } from '../../../types';

export const challenge12_4: PythonChallenge = {
  num: '12.4',
  title: 'Funktionen dokumentieren: Docstrings',
  tutorial: `Direkt nach der <code>def</code>-Zeile kannst du einen <b>Docstring</b> einfügen — einen Text in dreifachen Anführungszeichen, der beschreibt, was die Funktion tut: <pre>def ist_gerade(zahl):
    """Prüft, ob eine Zahl gerade ist, und gibt True oder False zurück."""
    return zahl % 2 == 0</pre>Anders als ein <code>#</code>-Kommentar ist ein Docstring nicht nur für Menschen, die den Quelltext lesen — Python speichert ihn am Funktionsobjekt selbst, abrufbar über <code>funktionsname.__doc__</code>. Werkzeuge wie <code>help()</code> zeigen ihn automatisch an, wenn jemand deine Funktion benutzen will, ohne den Code lesen zu müssen.`,
  task: `Bei eigenen Funktionen kommt irgendwann die Frage "was macht das hier eigentlich?" — ein Docstring beantwortet sie direkt an der Quelle, abrufbar auch ohne die Implementierung zu lesen.<br><br><b>Deine Aufgabe:</b> Schreibe eine Funktion <code>ist_gerade(zahl)</code>, die <code>True</code> zurückgibt, wenn <code>zahl</code> gerade ist, sonst <code>False</code>. Versieh sie mit einem Docstring, der beschreibt, was sie tut. Speichere den Docstring in einer Variable <code>dokumentation</code> (über <code>ist_gerade.__doc__</code>) und gib ihn aus.`,
  hints: [
    `Der Docstring steht in dreifachen Anführungszeichen direkt als erste Zeile im Funktionskörper, vor dem eigentlichen Code.`,
    `Zugriff auf den Docstring geht über <code>funktionsname.__doc__</code> — mit doppeltem Unterstrich vor und nach <code>doc</code>.`,
    `So sieht die Lösung aus:<pre>def ist_gerade(zahl):
    """Prüft, ob eine Zahl gerade ist, und gibt True oder False zurück."""
    return zahl % 2 == 0

dokumentation = ist_gerade.__doc__
print(dokumentation)</pre>`,
  ] as const,
  solution: `def ist_gerade(zahl):
    """Prüft, ob eine Zahl gerade ist, und gibt True oder False zurück."""
    return zahl % 2 == 0

dokumentation = ist_gerade.__doc__
print(dokumentation)`,
  syntaxExplanation: `<ul><li><code>"""..."""</code> direkt nach der def-Zeile — wird von Python automatisch als Docstring der Funktion erkannt, nicht als gewöhnlicher Code.</li><li><code>ist_gerade.__doc__</code> — liest den Docstring vom Funktionsobjekt aus, wie eine Art eingebautes Attribut.</li></ul>`,
  successCriteria: `Die Variable dokumentation muss den nicht-leeren Text des Docstrings enthalten und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { dokumentation } = lastResult.variables;
    if (typeof dokumentation !== 'string' || dokumentation.trim().length === 0) {
      return { ok: false, message: 'dokumentation ist kein nicht-leerer Text — hat ist_gerade wirklich einen Docstring (""" """) statt nur eines # Kommentars?' };
    }
    if (!lastResult.stdout.includes(dokumentation.trim())) {
      return { ok: false, message: 'dokumentation muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Docstring gesetzt und ausgelesen.' };
  },
  distractors: [
    {
      code: `def ist_gerade(zahl):
    # Prüft, ob eine Zahl gerade ist
    return zahl % 2 == 0

dokumentation = ist_gerade.__doc__
print(dokumentation)`,
      reason: 'benutzt einen normalen # Kommentar statt eines """ """-Docstrings — __doc__ bleibt dadurch None, weil # Kommentare am Funktionsobjekt gar nicht gespeichert werden',
    },
  ],
};
