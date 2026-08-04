import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge14_5: SqlChallenge = {
  num: '14.5',
  title: 'Pro Zeile neu berechnet: Correlated Subquery',
  tutorial: `EXISTS in 14.4 war bereits ein Beispiel dafür, aber das Prinzip verdient einen eigenen Namen: Eine <b>Correlated Subquery</b> ('korrelierte Subquery') ist eine Subquery, die auf eine Spalte der <b>äußeren</b> Zeile verweist — sie kann deshalb nicht einmal isoliert ausgeführt werden, sondern wird für <b>jede</b> äußere Zeile neu berechnet, mit jeweils anderem Bezug: <pre>SELECT p.name,
  (SELECT COUNT(*) FROM bestellungen b WHERE b.produkt_id = p.id) AS anzahl_bestellungen
FROM produkte p;</pre>Anders als die Scalar Subquery aus Challenge 14.1 (die überall denselben Wert liefert) liefert diese Subquery bei <b>jeder</b> Zeile ein potenziell anderes Ergebnis, weil <code>p.id</code> sich von Zeile zu Zeile ändert.`,
  task: `In 14.1 war der Subquery-Wert bei jeder Zeile identisch, weil die Subquery nicht von der Zeile abhing. Jetzt willst du pro Produkt einen individuellen Wert — wie viele Bestellungen genau dieses Produkt hat. Das geht nur, wenn sich die Subquery auf die gerade aktuelle äußere Zeile bezieht.<br><br><b>Hinweis:</b> <b>produkte</b> (inkl. Webcam ohne Bestellung) und <b>bestellungen</b> aus den vorherigen Challenges werden automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Produkt Name und die Anzahl seiner Bestellungen aus (Spalte <b>anzahl_bestellungen</b>). Produkte ohne Bestellung sollen 0 zeigen, nicht fehlen.`,
  prereqNums: ['14', '14.3', '14.4'],
  prereqNote: `Setzt voraus, dass du die Challenges 14, 14.3 und 14.4 bereits ausgeführt hast.`,
  hints: [
    `Die Subquery bekommt eine WHERE-Bedingung, die sich auf die äußere Tabelle bezieht: <code>WHERE b.produkt_id = p.id</code> — dafür brauchst du für beide Tabellen einen Alias.`,
    `COUNT(*) über eine leere Trefferliste ergibt automatisch 0 (nicht NULL) — das reicht schon, damit Webcam korrekt 0 zeigt.`,
    `So sieht die Lösung aus:<pre>SELECT p.name,
  (SELECT COUNT(*) FROM bestellungen b WHERE b.produkt_id = p.id) AS anzahl_bestellungen
FROM produkte p;</pre>`,
  ] as const,
  solution: `SELECT p.name,
  (SELECT COUNT(*) FROM bestellungen b WHERE b.produkt_id = p.id) AS anzahl_bestellungen
FROM produkte p;`,
  syntaxExplanation: `<ul><li><code>FROM produkte p</code> — die äußere Abfrage läuft über alle Produkte, mit Alias p.</li><li><code>(SELECT COUNT(*) FROM bestellungen b WHERE b.produkt_id = p.id)</code> — für jede äußere Zeile neu ausgewertet, weil p.id sich ändert.</li><li>Da COUNT(*) auf einer leeren Ergebnismenge 0 liefert, erscheint Webcam mit anzahl_bestellungen = 0, statt ganz zu fehlen.</li></ul>`,
  successCriteria: `Das Ergebnis muss alle Produkte enthalten, jeweils mit der tatsächlichen Anzahl ihrer Bestellungen (0 für Produkte ohne Bestellung, nicht fehlend).`,
  extra: {
    pg: `Identisch in Postgres — correlated Subqueries sind Standard-SQL. Für größere Datenmengen wird dort (und in SQLite) oft ein LEFT JOIN + GROUP BY bevorzugt, weil es meist effizienter ist — inhaltlich liefern beide Wege dasselbe.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const anzahlIdx = cols.findIndex((c) => c.includes('anzahl'));
    if (nameIdx === -1 || anzahlIdx === -1) {
      return { ok: false, message: 'Es werden eine Namensspalte und eine Spalte anzahl_bestellungen erwartet.' };
    }
    let expected: Map<string, number>;
    try {
      expected = new Map(
        (
          engine.exec(
            'SELECT p.name, (SELECT COUNT(*) FROM bestellungen b WHERE b.produkt_id = p.id) FROM produkte p',
          )[0]?.values ?? []
        ).map((r) => [String(r[0]), Number(r[1])]),
      );
    } catch (e) {
      if (!tableExists(engine, 'bestellungen')) return { ok: false, message: 'Tabelle bestellungen wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    if (lastResult.values.length !== expected.size) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet werden alle ${expected.size} Produkte.` };
    }
    for (const row of lastResult.values) {
      const name = String(row[nameIdx]);
      const anzahl = Number(row[anzahlIdx]);
      if (!expected.has(name)) {
        return { ok: false, message: `"${name}" ist kein bekanntes Produkt.` };
      }
      if (expected.get(name) !== anzahl) {
        return { ok: false, message: `"${name}" zeigt anzahl_bestellungen = ${anzahl}, erwartet wird ${expected.get(name)}.` };
      }
    }
    return { ok: true, message: 'Alle Produkte korrekt mit ihrer tatsächlichen Bestellanzahl versehen.' };
  },
  distractors: [
    {
      code: `SELECT p.name,
  (SELECT COUNT(*) FROM bestellungen) AS anzahl_bestellungen
FROM produkte p;`,
      reason: 'die innere Subquery bezieht sich nicht auf p.id — sie ist nicht korreliert und liefert deshalb bei jedem Produkt dieselbe Gesamtanzahl aller Bestellungen',
    },
  ],
};
