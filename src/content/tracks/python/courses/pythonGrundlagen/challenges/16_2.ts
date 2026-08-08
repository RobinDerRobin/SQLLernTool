import type { PythonChallenge } from '../../../types';

export const challenge16_2: PythonChallenge = {
  num: '16.2',
  title: 'Was Python schon mitbringt: die Standardbibliothek',
  tutorial: `Python wird mit einer riesigen <b>Standardbibliothek</b> ausgeliefert — fertigen Modulen für alltägliche Aufgaben, die einfach schon da sind, sobald Python installiert ist (kein zusätzliches Herunterladen nötig). Ein paar der wichtigsten: <code>math</code> (mathematische Funktionen, schon bekannt), <code>random</code> (Zufallszahlen, z. B. <code>random.randint(1, 6)</code> für einen Würfelwurf), und <code>datetime</code> (Datum und Uhrzeit). <code>datetime</code> bietet unter anderem die Klasse <code>date</code>: <pre>from datetime import date

d1 = date(2010, 6, 15)
d2 = date(2026, 8, 8)
differenz = d2 - d1
differenz.days   # Anzahl Tage dazwischen, als ganze Zahl</pre>Die Subtraktion zweier <code>date</code>-Objekte liefert kein einfaches Ergebnis, sondern ein <code>timedelta</code>-Objekt, dessen <code>.days</code>-Attribut die Differenz in Tagen als Zahl liefert.`,
  task: `<b>Deine Aufgabe:</b> Importiere <code>date</code> aus dem <code>datetime</code>-Modul. Erzeuge <code>d1 = date(2010, 6, 15)</code> und <code>d2 = date(2026, 8, 8)</code>. Berechne die Anzahl Tage zwischen beiden Daten und speichere sie in <code>tage</code>. Gib <code>tage</code> aus.`,
  hints: [
    `<code>from datetime import date</code> holt die Klasse <code>date</code> direkt.`,
    `<code>(d2 - d1).days</code> — die Differenz zweier date-Objekte liefert ein timedelta, dessen .days-Attribut die Tage als Zahl liefert.`,
    `So sieht die Lösung aus:<pre>from datetime import date

d1 = date(2010, 6, 15)
d2 = date(2026, 8, 8)
tage = (d2 - d1).days
print(tage)</pre>`,
  ] as const,
  solution: `from datetime import date

d1 = date(2010, 6, 15)
d2 = date(2026, 8, 8)
tage = (d2 - d1).days
print(tage)`,
  syntaxExplanation: `<ul><li><code>date(2010, 6, 15)</code> — ein konkretes Datum (Jahr, Monat, Tag).</li><li><code>d2 - d1</code> — liefert ein timedelta-Objekt, die Zeitspanne zwischen beiden Daten.</li><li><code>.days</code> — liest daraus die Anzahl ganzer Tage aus: <code>5898</code>.</li></ul>`,
  successCriteria: `Die Variable tage muss 5898 sein (Tage zwischen dem 15.06.2010 und dem 08.08.2026) und ausgegeben werden.`,
  extra: {},
  validate: (_engine, lastResult) => {
    if (!lastResult) return { ok: false, message: 'Es gibt noch keine Ausgabe.' };
    const { tage } = lastResult.variables;
    if (typeof tage !== 'number') {
      return { ok: false, message: 'Es fehlt eine Zahl-Variable "tage" — wurde date aus datetime importiert und die Differenz berechnet?' };
    }
    if (tage !== 5898) {
      return { ok: false, message: `tage ist ${tage}, erwartet werden 5898.` };
    }
    if (!lastResult.stdout.includes('5898')) {
      return { ok: false, message: 'tage muss auch tatsächlich ausgegeben werden (print).' };
    }
    return { ok: true, message: 'Korrekt: Zwischen dem 15.06.2010 und dem 08.08.2026 liegen 5898 Tage.' };
  },
  distractors: [
    {
      code: `from datetime import date

d1 = date(2010, 6, 15)
d2 = date(2026, 8, 8)
tage = d1 - d2
print(tage)`,
      reason: 'vergisst .days — tage bleibt ein timedelta-Objekt statt einer Zahl (und durch das vertauschte d1 - d2 wäre die Zeitspanne obendrein negativ)',
    },
  ],
};
