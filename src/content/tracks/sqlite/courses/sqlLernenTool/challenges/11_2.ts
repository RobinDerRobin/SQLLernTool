import type { SqlChallenge } from '../../../types';

export const challenge11_2: SqlChallenge = {
  num: '11.2',
  title: 'Daten entfernen: DELETE',
  tutorial: `<code>DELETE FROM tabelle WHERE bedingung</code> entfernt alle Zeilen, auf die die Bedingung zutrifft — dauerhaft: <pre>DELETE FROM lagerbestand
WHERE menge = 0;</pre>Genau wie bei UPDATE gilt: <b>ohne WHERE werden alle Zeilen der Tabelle gelöscht</b>, nicht nur ein Teil. Die Tabelle selbst bleibt dabei bestehen (nur leer) — das ist etwas anderes als <code>DROP TABLE</code>, das die ganze Tabelle inklusive Struktur entfernt.`,
  task: `Nicht jede Zeile soll für immer bleiben — abgelaufene Sessions, stornierte Bestellungen, ausverkaufte Artikel. DELETE ist das Werkzeug, um gezielt Zeilen wieder loszuwerden.<br><br><b>Hinweis:</b> Die Tabelle <b>lagerbestand</b> ist bereits angelegt, mit genau 4 Zeilen: Tastatur (menge 5), Maus (menge 0), Monitor (menge 2) und Kabel (menge 0).<br><br><b>Deine Aufgabe:</b> Lösche alle ausverkauften Artikel (<code>menge = 0</code>, also Maus und Kabel) aus <b>lagerbestand</b> — Tastatur und Monitor müssen erhalten bleiben.`,
  setup: `CREATE TABLE lagerbestand (id INTEGER, artikel TEXT, menge INTEGER);
INSERT INTO lagerbestand VALUES (1,'Tastatur',5),(2,'Maus',0),(3,'Monitor',2),(4,'Kabel',0);`,
  hints: [
    `Der Aufbau ist: <code>DELETE FROM tabelle WHERE bedingung;</code> — kein SET, keine Spaltenliste, nur die Bedingung.`,
    `Die Bedingung ist dieselbe wie bei einem SELECT-Filter: <code>WHERE menge = 0</code>.`,
    `So sieht die Lösung aus:<pre>DELETE FROM lagerbestand
WHERE menge = 0;</pre>`,
  ] as const,
  solution: `DELETE FROM lagerbestand
WHERE menge = 0;

SELECT * FROM lagerbestand;`,
  syntaxExplanation: `<ul><li><code>DELETE FROM lagerbestand WHERE menge = 0;</code> — entfernt jede Zeile, deren menge 0 ist.</li><li>Ohne WHERE wäre die komplette Tabelle geleert worden.</li><li>Die Tabelle selbst bleibt bestehen, nur mit weniger Zeilen.</li></ul>`,
  successCriteria: `Nach dem DELETE dürfen nur noch Tastatur und Monitor in lagerbestand stehen (2 Zeilen, keine mit menge = 0).`,
  extra: {
    pg: `Identisch in Postgres — DELETE FROM ... WHERE ist Standard-SQL.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT artikel, menge FROM lagerbestand ORDER BY artikel')[0]?.values ?? [];
      if (rows.length !== 2) {
        return { ok: false, message: `lagerbestand hat noch ${rows.length} Zeile(n) — erwartet werden genau 2 (die mit Bestand).` };
      }
      if (rows.some((row) => Number(row?.[1]) === 0)) {
        return { ok: false, message: 'Es sind noch Artikel mit menge = 0 vorhanden — die sollten gelöscht sein.' };
      }
      const names = rows.map((row) => String(row?.[0]));
      if (JSON.stringify(names) !== JSON.stringify(['Monitor', 'Tastatur'])) {
        return { ok: false, message: `Übrig sind ${names.join(', ')} — erwartet werden Monitor und Tastatur.` };
      }
      return { ok: true, message: 'DELETE korrekt: nur die ausverkauften Artikel wurden entfernt.' };
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
};
