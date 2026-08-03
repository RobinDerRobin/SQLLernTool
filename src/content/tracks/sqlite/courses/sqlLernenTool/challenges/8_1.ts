import type { SqlChallenge } from '../../../types';

export const challenge8_1: SqlChallenge = {
  num: '8.1',
  title: 'Zeilen zählen und gruppieren (GROUP BY)',
  tutorial: `<code>COUNT(*)</code> zählt Zeilen. Kombiniert mit <code>GROUP BY spalte</code> wird nicht mehr alles zusammen gezählt, sondern pro Gruppe getrennt: <pre>SELECT art, COUNT(*) AS anzahl\nFROM tiere\nGROUP BY art;</pre>Für jeden unterschiedlichen Wert in <code>art</code> entsteht genau eine Ergebniszeile mit der zugehörigen Anzahl. Alles, was neben einer Zählfunktion im SELECT steht, gehört in der Regel auch ins GROUP BY.`,
  task: `Vorbereitung auf Kapitel 9: Dort prüfst du am Ende, wie sich 1000 zufällige Bestellungen auf verschiedene Status verteilen — dafür brauchst du GROUP BY und COUNT.<br><br><b>Hinweis:</b> Die Tabelle <b>tiere</b> mit 7 Zeilen ist bereits automatisch angelegt.<br><br><b>Deine Aufgabe:</b> Zähle, wie viele Zeilen es je Tierart gibt — das Ergebnis soll die Spalten art und anzahl haben.`,
  setup: `CREATE TABLE tiere (art TEXT);
INSERT INTO tiere VALUES ('Katze'),('Hund'),('Katze'),('Vogel'),('Hund'),('Katze'),('Vogel');`,
  hints: [
    `<code>COUNT(*)</code> zählt die Zeilen innerhalb jeder Gruppe.`,
    `<code>GROUP BY art</code> legt fest, wonach gruppiert wird — die Spalte art darf deshalb auch im SELECT stehen.`,
    `So sieht die Lösung aus:<pre>SELECT art, COUNT(*) AS anzahl FROM tiere GROUP BY art;</pre>`,
  ] as const,
  solution: `SELECT art, COUNT(*) AS anzahl FROM tiere GROUP BY art;`,
  syntaxExplanation: `<ul><li><code>COUNT(*)</code> — zählt die Zeilen je Gruppe statt insgesamt.</li><li><code>GROUP BY art</code> — bildet je unterschiedlichem Wert in art genau eine Ergebniszeile.</li><li><code>AS anzahl</code> — benennt die Zählspalte.</li></ul>`,
  successCriteria: `Das Ergebnis muss 3 Zeilen liefern: Katze mit 3, Hund mit 2 und Vogel mit 2.`,
  extra: {
    pg: `Identisch in Postgres — GROUP BY und COUNT sind Standard-SQL.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const map: Record<string, number> = {};
    lastResult.values.forEach((r) => {
      map[String(r[0])] = Number(r[1]);
    });
    const expected: Record<string, number> = { Katze: 3, Hund: 2, Vogel: 2 };
    const keys = Object.keys(map);
    if (keys.length !== 3) return { ok: false, message: `Es sind ${keys.length} Gruppe(n) — erwartet werden genau 3.` };
    for (const k of Object.keys(expected)) {
      if (map[k] !== expected[k]) return { ok: false, message: `Für "${k}" steht ${map[k]}, erwartet wird ${expected[k]}.` };
    }
    return { ok: true, message: 'Gruppierung und Zählung korrekt.' };
  },
};
