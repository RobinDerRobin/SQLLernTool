import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge14_4: SqlChallenge = {
  num: '14.4',
  title: 'Gibt es das? EXISTS',
  tutorial: `<code>EXISTS (Subquery)</code> fragt nur: Liefert diese Subquery <b>mindestens eine</b> Zeile? Der Inhalt der Zeilen spielt keine Rolle, nur ob es überhaupt welche gibt — das macht EXISTS oft schneller als IN, weil SQL abbrechen kann, sobald die erste Treffer-Zeile gefunden ist: <pre>SELECT name FROM produkte p
WHERE EXISTS (
  SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id
);</pre>Wichtig ist der Bezug <code>b.produkt_id = p.id</code>: Die innere Abfrage bezieht sich auf <code>p</code>, die Tabelle der äußeren Abfrage — sie wird also für <b>jede</b> äußere Zeile neu ausgewertet, mit einem jeweils anderen <code>p.id</code>.`,
  task: `In Challenge 14.3 hast du geprüft, ob ein Produkt teuer genug ist. Jetzt willst du stattdessen prüfen, ob zu einem Produkt überhaupt schon eine Bestellung existiert — ohne die Bestellungen selbst zu brauchen, nur die Ja/Nein-Frage.<br><br><b>Hinweis:</b> <b>produkte</b> und <b>bestellungen</b> aus den vorherigen Challenges werden automatisch bereitgestellt. Zusätzlich fügt diese Challenge ein sechstes Produkt (Webcam) hinzu, für das es keine Bestellung gibt.<br><br><b>Deine Aufgabe:</b> Gib die Namen aller Produkte aus, für die mindestens eine Bestellung existiert.`,
  prereqNums: ['14', '14.3'],
  prereqNote: `Setzt voraus, dass du Challenge 14 (produkte) und 14.3 (bestellungen) bereits ausgeführt hast.`,
  setup: `INSERT INTO produkte VALUES (6,'Webcam',60);`,
  hints: [
    `Die innere Abfrage muss sich nicht um konkrete Spalten kümmern — <code>SELECT 1 FROM bestellungen ...</code> reicht, EXISTS interessiert nur, ob überhaupt eine Zeile kommt.`,
    `Verbinde innere und äußere Zeile über <code>b.produkt_id = p.id</code> — sonst prüfst du nicht "für dieses Produkt", sondern nur "gibt es überhaupt irgendeine Bestellung".`,
    `So sieht die Lösung aus:<pre>SELECT name FROM produkte p
WHERE EXISTS (
  SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id
);</pre>`,
  ] as const,
  solution: `SELECT name FROM produkte p
WHERE EXISTS (
  SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id
);`,
  syntaxExplanation: `<ul><li><code>EXISTS (SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id)</code> — true, sobald mindestens eine passende Bestellung existiert.</li><li><code>b.produkt_id = p.id</code> — die Verbindung zur jeweils aktuellen äußeren Zeile p; ohne sie würde EXISTS für alle Produkte gleich ausfallen.</li><li>Webcam (id 6) hat keine Bestellung, taucht also nicht im Ergebnis auf.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Produkte enthalten, für die mindestens eine Bestellung existiert — Webcam darf nicht dabei sein.`,
  extra: {
    pg: `Identisch in Postgres — EXISTS ist Standard-SQL und dort ebenso die übliche Wahl für reine Ja/Nein-Prüfungen.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    if (nameIdx === -1) {
      return { ok: false, message: 'Es wird eine Namensspalte erwartet.' };
    }
    let expectedNames: string[];
    try {
      expectedNames = (
        engine.exec(
          'SELECT name FROM produkte p WHERE EXISTS (SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id) ORDER BY name',
        )[0]?.values ?? []
      ).map((r) => String(r[0]));
    } catch (e) {
      if (!tableExists(engine, 'bestellungen')) return { ok: false, message: 'Tabelle bestellungen wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    const gotNames = lastResult.values.map((r) => String(r[nameIdx])).sort((a, b) => a.localeCompare(b));
    const matches =
      gotNames.length === expectedNames.length && gotNames.every((n, i) => n === expectedNames[i]);
    if (!matches) {
      return {
        ok: false,
        message: `Ergebnis enthält [${gotNames.join(', ')}], erwartet werden genau [${expectedNames.join(', ')}].`,
      };
    }
    return { ok: true, message: `Korrekt: ${gotNames.length} Produkt(e) mit mindestens einer Bestellung.` };
  },
  distractors: [
    {
      code: `SELECT name FROM produkte p
WHERE NOT EXISTS (
  SELECT 1 FROM bestellungen b WHERE b.produkt_id = p.id
);`,
      reason: 'benutzt NOT EXISTS statt EXISTS und dreht das Ergebnis dadurch um — liefert genau die Produkte OHNE Bestellung',
    },
  ],
};
