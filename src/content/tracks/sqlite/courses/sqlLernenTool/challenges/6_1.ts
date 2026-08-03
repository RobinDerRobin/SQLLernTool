import type { SqlChallenge } from '../../../types';

export const challenge6_1: SqlChallenge = {
  num: '6.1',
  title: 'Zwei Tabellen sinnvoll filtern (Verknüpfung ohne JOIN-Wort)',
  tutorial: `In 5.2 hast du gesehen, dass <code>FROM a, b</code> jede Zeile mit jeder kombiniert. Das ist selten das, was man will — meist sollen nur die <i>zusammengehörenden</i> Zeilen übrig bleiben. Genau das leistet eine WHERE-Bedingung, die zwei Spalten vergleicht: <pre>SELECT * FROM kunden, bestellungen\nWHERE bestellungen.kunde_id = kunden.id;</pre>Aus dem kartesischen Produkt (3 × 5 = 15 Zeilen) bleiben so nur die 5 Paare übrig, bei denen die IDs zusammenpassen. Diese Spalte, die auf die ID einer anderen Tabelle zeigt, heißt <b>Fremdschlüssel</b>.`,
  task: `Erster Baustein vor Kapitel 7, in dem du dieselbe Verknüpfung mit der ausdrücklichen JOIN-Schreibweise machst. Hier siehst du zuerst, was dabei inhaltlich überhaupt passiert: aus 'alles mit allem' wird 'nur was zusammengehört'.<br><br><b>Hinweis:</b> <b>kunden</b> (3 Zeilen) und <b>bestellungen</b> (5 Zeilen) sind bereits angelegt.<br><br><b>Deine Aufgabe:</b> Gib nur die zusammengehörenden Paare aus — erwartet werden 5 Zeilen statt der 15 des vollen kartesischen Produkts.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT);
INSERT INTO kunden VALUES (1,'Anna'),(2,'Ben'),(3,'Clara');

CREATE TABLE bestellungen (id INTEGER, kunde_id INTEGER);
INSERT INTO bestellungen VALUES (1,1),(2,1),(3,2),(4,3),(5,1);`,
  hints: [
    `Beide Tabellen stehen wie in 5.2 nach FROM, getrennt durch ein Komma.`,
    `Die WHERE-Bedingung vergleicht den Fremdschlüssel mit der ID: <code>bestellungen.kunde_id = kunden.id</code>.`,
    `So sieht die Lösung aus:<pre>SELECT kunden.name, bestellungen.id\nFROM kunden, bestellungen\nWHERE bestellungen.kunde_id = kunden.id;</pre>`,
  ] as const,
  solution: `SELECT kunden.name, bestellungen.id
FROM kunden, bestellungen
WHERE bestellungen.kunde_id = kunden.id;`,
  syntaxExplanation: `<ul><li><code>FROM kunden, bestellungen</code> — erzeugt zunächst alle 15 Kombinationen.</li><li><code>WHERE bestellungen.kunde_id = kunden.id</code> — behält nur die 5 Paare, deren IDs zusammenpassen.</li><li><code>kunden.name</code> / <code>bestellungen.id</code> — bei zwei Tabellen wird die Spalte mit dem Tabellennamen davor eindeutig gemacht.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau 5 Zeilen enthalten — eine je Bestellung, nicht die 15 des vollen kartesischen Produkts.`,
  extra: {
    pg: `Funktioniert in Postgres identisch. Guter Stil ist dort aber die JOIN-Schreibweise aus Kapitel 7, weil Verknüpfungs- und Filterbedingungen dann klar getrennt sind.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const n = lastResult.values.length;
    if (n === 15) return { ok: false, message: 'Es sind 15 Zeilen — die WHERE-Bedingung zum Verknüpfen fehlt noch.' };
    if (n !== 5) return { ok: false, message: `Es sind ${n} Zeile(n) — erwartet werden genau 5.` };
    return { ok: true, message: 'Nur die zusammengehörenden 5 Paare bleiben übrig.' };
  },
};
