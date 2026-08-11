import type { SqlChallenge } from '../../../types';

export const challenge25: SqlChallenge = {
  num: '25',
  title: 'Einfügen oder aktualisieren: INSERT ... ON CONFLICT',
  tutorial: `Ein normales <code>INSERT</code> scheitert, sobald es gegen ein <code>UNIQUE</code>- oder <code>PRIMARY KEY</code>-Constraint verstößt — auch dann, wenn das eigentlich gar kein Fehler ist, sondern eine erwartbare Situation: eine neue Lieferung desselben Artikels trifft ein, und statt einer zweiten Zeile soll einfach der bestehende Bestand erhöht werden. Genau dafür gibt es <b>UPSERT</b> (<code>INSERT ... ON CONFLICT ... DO UPDATE</code>): <pre>INSERT INTO lager (sku, menge) VALUES ('X1', 5)
ON CONFLICT(sku) DO UPDATE SET menge = menge + excluded.menge;</pre>Gibt es die <code>sku</code> schon, wird statt eines Fehlers ein <code>UPDATE</code> ausgeführt. <code>excluded.menge</code> ist dabei der Wert, der eigentlich eingefügt worden wäre — die "ausgeschlossene" (durch den Konflikt verhinderte) neue Zeile bleibt über diesen Namen erreichbar, auch im <code>SET</code>.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>lagerbestand</b> (sku, name, menge) ist bereits angelegt — <code>sku</code> ist <code>PRIMARY KEY</code>. Aktuell enthält sie eine Zeile: <code>('A100', 'Schraube', 20)</code>.<br><br><b>Deine Aufgabe:</b> Eine neue Lieferung trifft ein: 15 weitere Schrauben (sku <code>A100</code>) und 10 Muttern, ein neuer Artikel (sku <code>B200</code>, name <code>'Mutter'</code>). Füge beide in <b>einem</b> <code>INSERT</code> ein. Bei <code>A100</code> gibt es bereits eine Zeile — statt eines Fehlers soll die <code>menge</code> um die gelieferte Menge <b>erhöht</b> werden (nicht überschrieben). <code>B200</code> ist neu und wird ganz normal eingefügt.`,
  setup: `CREATE TABLE lagerbestand (sku TEXT PRIMARY KEY, name TEXT, menge INTEGER);
INSERT INTO lagerbestand VALUES ('A100', 'Schraube', 20);`,
  hints: [
    `<code>ON CONFLICT(sku) DO UPDATE SET ...</code> hinter dem <code>INSERT</code> fängt den Konflikt ab, statt ihn als Fehler zu werfen.`,
    `Wichtig: <code>menge = menge + excluded.menge</code> (addieren), nicht <code>menge = excluded.menge</code> (überschreiben) — sonst geht der alte Bestand verloren.`,
    `So sieht die Lösung aus:<pre>INSERT INTO lagerbestand (sku, name, menge) VALUES
  ('A100', 'Schraube', 15),
  ('B200', 'Mutter', 10)
ON CONFLICT(sku) DO UPDATE SET menge = menge + excluded.menge;</pre>`,
  ] as const,
  solution: `INSERT INTO lagerbestand (sku, name, menge) VALUES
  ('A100', 'Schraube', 15),
  ('B200', 'Mutter', 10)
ON CONFLICT(sku) DO UPDATE SET menge = menge + excluded.menge;`,
  syntaxExplanation: `<ul><li><code>VALUES (...), (...)</code> — zwei Zeilen in einem INSERT, eine pro Artikel.</li><li><code>ON CONFLICT(sku) DO UPDATE SET menge = menge + excluded.menge</code> — bei A100 (Konflikt) wird die Menge addiert statt eine zweite Zeile anzulegen; B200 hat keinen Konflikt und wird normal eingefügt.</li><li><code>excluded.menge</code> — die Menge, die eigentlich eingefügt worden wäre (hier: 15 für A100).</li></ul>`,
  successCriteria: `lagerbestand muss genau 2 Zeilen enthalten: A100 mit menge=35 (20+15, nicht überschrieben) und B200 mit menge=10.`,
  extra: {
    pg: `Postgres unterstützt dieselbe Syntax seit Version 9.5 — dort meist "upsert" genannt. excluded.spalte funktioniert identisch.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT sku, name, menge FROM lagerbestand ORDER BY sku')[0]?.values ?? [];
      if (rows.length !== 2) {
        return { ok: false, message: `lagerbestand hat ${rows.length} Zeile(n), erwartet werden genau 2 (A100 und B200).` };
      }
      const [a100, b200] = rows;
      if (String(a100?.[0]) !== 'A100' || Number(a100?.[2]) !== 35) {
        return {
          ok: false,
          message: `A100 hat menge=${String(a100?.[2])}, erwartet wird 35 (20 vorhandene + 15 neue, addiert statt überschrieben).`,
        };
      }
      if (String(b200?.[0]) !== 'B200' || String(b200?.[1]) !== 'Mutter' || Number(b200?.[2]) !== 10) {
        return {
          ok: false,
          message: `B200 ist nicht korrekt angelegt (name/menge: ${String(b200?.[1])}/${String(b200?.[2])}), erwartet wird "Mutter"/10.`,
        };
      }
      return { ok: true, message: 'Korrekt: A100 wurde per ON CONFLICT aktualisiert (35), B200 normal eingefügt (10).' };
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `INSERT INTO lagerbestand (sku, name, menge) VALUES
  ('A100', 'Schraube', 15),
  ('B200', 'Mutter', 10);`,
      reason: 'kein ON CONFLICT — die zweite Zeile mit sku A100 verletzt den PRIMARY KEY und wirft einen echten UNIQUE-Constraint-Fehler, statt den Bestand zu aktualisieren',
    },
    {
      code: `INSERT INTO lagerbestand (sku, name, menge) VALUES
  ('A100', 'Schraube', 15),
  ('B200', 'Mutter', 10)
ON CONFLICT(sku) DO UPDATE SET menge = excluded.menge;`,
      reason: 'überschreibt die Menge bei einem Konflikt statt sie zu addieren — A100 wird fälschlich 15 (die neue Lieferung) statt 35 (alter Bestand + neue Lieferung), der ursprüngliche Bestand geht verloren',
    },
  ],
};
