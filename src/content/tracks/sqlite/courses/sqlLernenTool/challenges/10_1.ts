import type { SqlChallenge } from '../../../types';

export const challenge10_1: SqlChallenge = {
  num: '10.1',
  title: 'Nichts verlieren: LEFT JOIN',
  tutorial: `Ein normaler <code>JOIN</code> (auch <b>INNER JOIN</b> genannt) behält nur Zeilenpaare, bei denen die ON-Bedingung auf beiden Seiten einen Treffer findet — ein Kunde ganz ohne Bestellung fällt dabei komplett aus dem Ergebnis heraus. <code>LEFT JOIN</code> ändert das: Er behält <i>jede</i> Zeile der linken Tabelle, egal ob die rechte Seite etwas Passendes hat oder nicht. Gibt es keinen Treffer, werden die Spalten der rechten Tabelle einfach mit <code>NULL</code> aufgefüllt: <pre>SELECT k.name, b.id
FROM kunden k
LEFT JOIN bestellungen b ON b.kunde_id = k.id;</pre>Kombiniert mit <code>COUNT(b.id)</code> (das NULL-Werte nicht mitzählt, siehe Kapitel 12) wird daraus sogar eine Null statt eines fehlenden Kunden.`,
  task: `In Kapitel 10 kamen nur Kunden vor, die auch tatsächlich bestellt haben — ein normaler JOIN lässt Kunden ohne Bestellung nämlich einfach verschwinden. Für eine ehrliche Auswertung (z. B. "welche Kunden haben wir seit Monaten nicht gesehen?") brauchst du aber genau diese Kunden mit im Ergebnis, nicht nur die aktiven.<br><br><b>Hinweis:</b> <b>kunden</b> (4 Zeilen) und <b>bestellungen</b> (5 Zeilen, nicht für jeden Kunden) sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Zeige zu <b>jedem</b> Kunden seinen Namen und die Anzahl seiner Bestellungen — auch wenn diese Anzahl 0 ist. Sortiere nach Name.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara'),(4,'David');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER);
INSERT INTO bestellungen VALUES (1,1),(2,1),(3,2),(4,3),(5,1);`,
  hints: [
    `Ein normaler <code>JOIN</code> würde David (er hat keine Bestellung) aus dem Ergebnis werfen — genau das soll hier nicht passieren.`,
    `<code>LEFT JOIN</code> steht anstelle von <code>JOIN</code>, die ON-Bedingung bleibt identisch: <code>LEFT JOIN bestellungen b ON b.kunde_id = k.id</code>.`,
    `So sieht die Lösung aus:<pre>SELECT k.name, COUNT(b.id) AS anzahl
FROM kunden k
LEFT JOIN bestellungen b ON b.kunde_id = k.id
GROUP BY k.name
ORDER BY k.name;</pre>`,
  ] as const,
  solution: `SELECT k.name, COUNT(b.id) AS anzahl
FROM kunden k
LEFT JOIN bestellungen b ON b.kunde_id = k.id
GROUP BY k.name
ORDER BY k.name;`,
  syntaxExplanation: `<ul><li><code>LEFT JOIN bestellungen b ON b.kunde_id = k.id</code> — behält jeden Kunden aus <b>kunden</b>, auch ohne passende Bestellung.</li><li><code>COUNT(b.id)</code> — zählt nur echte Bestellungs-IDs; hat ein Kunde keine, liefert <code>b.id</code> überall NULL und COUNT ergibt 0 statt die Zeile ganz zu verlieren.</li><li><code>GROUP BY k.name</code> / <code>ORDER BY k.name</code> — eine Zeile je Kunde, alphabetisch sortiert.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 4 Zeilen enthalten (einen je Kunden), alphabetisch nach Name sortiert — David muss mit genau 0 Bestellungen dabei sein.`,
  extra: {
    pg: `Identisch in Postgres — LEFT JOIN ist Standard-SQL. Manche schreiben dort auch ausdrücklich LEFT OUTER JOIN; das ist exakt dasselbe.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const vals = lastResult.values;
    if (vals.length !== 4) return { ok: false, message: `Es sind ${vals.length} Zeile(n) — erwartet werden genau 4 (ein Kunde je Zeile).` };
    const byName = new Map(vals.map((row) => [String(row?.[0]), Number(row?.[1])]));
    const expected: Record<string, number> = { Anna: 3, Ben: 1, Clara: 1, David: 0 };
    for (const [name, count] of Object.entries(expected)) {
      if (!byName.has(name)) return { ok: false, message: `Kunde "${name}" fehlt im Ergebnis — auch Kunden ohne Bestellung müssen erscheinen.` };
      if (byName.get(name) !== count) {
        return { ok: false, message: `"${name}" hat ${byName.get(name)} Bestellungen im Ergebnis, erwartet werden ${count}.` };
      }
    }
    const names = vals.map((row) => String(row?.[0]));
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    if (JSON.stringify(names) !== JSON.stringify(sorted)) {
      return { ok: false, message: 'Die Zeilen sind nicht alphabetisch nach Name sortiert.' };
    }
    return { ok: true, message: 'LEFT JOIN korrekt: alle 4 Kunden inklusive David mit 0 Bestellungen.' };
  },
};
