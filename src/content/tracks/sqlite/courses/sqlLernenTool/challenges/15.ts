import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge15: SqlChallenge = {
  num: '15',
  title: 'Rechnen über mehrere Zeilen: Fensterfunktionen',
  tutorial: `Du kennst <code>AVG(...)</code> schon aus <code>GROUP BY</code> — dort fasst es viele Zeilen zu <b>einer</b> zusammen. Eine <b>Fensterfunktion</b> macht fast das Gegenteil: Sie rechnet ebenfalls über mehrere Zeilen, aber jede einzelne Zeile bleibt erhalten. Das Schlüsselwort dafür ist <code>OVER (...)</code> direkt hinter der Funktion: <pre>SELECT name, gehalt,
  AVG(gehalt) OVER () AS durchschnitt
FROM mitarbeiter;</pre>Ohne <code>GROUP BY</code> würde <code>AVG(gehalt)</code> allein alle Zeilen zu einer einzigen zusammenfassen. Mit <code>OVER ()</code> dahinter bleiben alle Zeilen erhalten — jede bekommt nur zusätzlich den Durchschnitt <i>aller</i> Zeilen als eigene Spalte dazu, das "Fenster" ist hier einfach die ganze Tabelle.`,
  task: `Du hast Subqueries schon genutzt (Challenge 14.1), um einen Durchschnitt neben jede Zeile zu stellen. Fensterfunktionen sind der modernere, oft klarere Weg dafür — und sie können, wie du in den nächsten Challenges siehst, noch viel mehr als das.<br><br><b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, abteilung, gehalt) mit 6 Zeilen ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Mitarbeiter Name, Gehalt und eine Spalte <b>durchschnitt</b> mit dem Durchschnittsgehalt aller Mitarbeiter aus.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, abteilung TEXT, gehalt INTEGER);
INSERT INTO mitarbeiter VALUES
  (1,'Anna','Vertrieb',3000),
  (2,'Ben','Vertrieb',4500),
  (3,'Clara','Vertrieb',4000),
  (4,'David','IT',4500),
  (5,'Emma','IT',5000),
  (6,'Finn','IT',3500);`,
  hints: [
    `Die Funktion selbst kennst du schon (<code>AVG(gehalt)</code>) — neu ist nur <code>OVER (...)</code> direkt danach.`,
    `Für "über alle Zeilen hinweg, ohne Gruppierung" bleiben die Klammern hinter <code>OVER</code> leer: <code>OVER ()</code>.`,
    `So sieht die Lösung aus:<pre>SELECT name, gehalt,
  AVG(gehalt) OVER () AS durchschnitt
FROM mitarbeiter;</pre>`,
  ] as const,
  solution: `SELECT name, gehalt,
  AVG(gehalt) OVER () AS durchschnitt
FROM mitarbeiter;`,
  syntaxExplanation: `<ul><li><code>AVG(gehalt) OVER ()</code> — berechnet den Durchschnitt über alle Zeilen, aber jede Zeile bleibt einzeln erhalten (anders als bei <code>GROUP BY</code>).</li><li>Die leeren Klammern hinter <code>OVER</code> bedeuten "das Fenster ist die gesamte Ergebnismenge".</li></ul>`,
  successCriteria: `Das Ergebnis muss alle 6 Mitarbeiter enthalten, jeweils mit name, gehalt und einer Spalte durchschnitt, die überall denselben echten Durchschnittswert zeigt.`,
  extra: {
    pg: `Identisch in Postgres — Fensterfunktionen mit OVER() sind Standard-SQL, dort teilweise noch mächtiger (z. B. FILTER-Klausel).`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const gehaltIdx = cols.findIndex((c) => c.includes('gehalt'));
    const avgIdx = cols.findIndex((c) => c.includes('durchschnitt'));
    if (nameIdx === -1 || gehaltIdx === -1 || avgIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, gehalt und durchschnitt erwartet.' };
    }
    let trueAvg: number;
    let trueRows: Map<string, number>;
    try {
      trueAvg = Number(engine.exec('SELECT AVG(gehalt) FROM mitarbeiter')[0]?.values[0]?.[0]);
      trueRows = new Map(
        (engine.exec('SELECT name, gehalt FROM mitarbeiter')[0]?.values ?? []).map((r) => [String(r[0]), Number(r[1])]),
      );
    } catch (e) {
      if (!tableExists(engine, 'mitarbeiter')) return { ok: false, message: 'Tabelle mitarbeiter wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    if (lastResult.values.length !== trueRows.size) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet werden alle ${trueRows.size} Mitarbeiter.` };
    }
    for (const row of lastResult.values) {
      const name = String(row[nameIdx]);
      const gehalt = Number(row[gehaltIdx]);
      const avg = Number(row[avgIdx]);
      if (!trueRows.has(name) || trueRows.get(name) !== gehalt) {
        return { ok: false, message: `"${name}" mit Gehalt ${gehalt} stimmt nicht mit den echten Mitarbeiterdaten überein.` };
      }
      if (Math.abs(avg - trueAvg) > 0.001) {
        return { ok: false, message: `Spalte durchschnitt zeigt ${avg} bei "${name}", erwartet wird der echte Durchschnitt ${trueAvg}.` };
      }
    }
    return { ok: true, message: `Alle Mitarbeiter korrekt mit Durchschnittsgehalt ${trueAvg} versehen.` };
  },
  distractors: [
    {
      code: `SELECT name, gehalt, AVG(gehalt) AS durchschnitt FROM mitarbeiter;`,
      reason: 'lässt OVER() komplett weg — ohne Fensterfunktion fasst AVG() alle Zeilen zu einer einzigen zusammen, statt sie einzeln zu erhalten',
    },
  ],
};
