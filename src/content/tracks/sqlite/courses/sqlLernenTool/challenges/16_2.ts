import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge16_2: SqlChallenge = {
  num: '16.2',
  title: 'Nur einen Teil zurücknehmen: SAVEPOINT',
  tutorial: `<code>ROLLBACK</code> verwirft <b>immer alles</b> seit dem letzten <code>BEGIN</code> — aber manchmal willst du mitten in einer laufenden Transaktion nur den <i>letzten</i> Schritt zurücknehmen, ohne die vorherigen zu verlieren. Genau dafür gibt es <code>SAVEPOINT</code>: einen benannten Markierungspunkt <i>innerhalb</i> einer Transaktion. <pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
SAVEPOINT sp1;
UPDATE konten SET saldo = saldo - 100 WHERE id = 2;
UPDATE konten SET saldo = saldo + 100 WHERE id = 3;
ROLLBACK TO sp1;
COMMIT;</pre><code>ROLLBACK TO sp1</code> macht nur die Änderungen <i>nach</i> dem Savepoint rückgängig — die beiden UPDATEs davor bleiben erhalten. Das abschließende <code>COMMIT</code> übernimmt dann genau das: die erste Überweisung ja, die zweite nein.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>konten</b> (id, name, saldo) mit Anna (500), Ben (300) und Clara (100) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Überweise zuerst 200 von Anna (id 1) zu Ben (id 2) — das soll bestehen bleiben. Setze danach einen <code>SAVEPOINT</code> und überweise testweise 100 von Ben (id 2) zu Clara (id 3) — diese zweite Überweisung sollst du mit <code>ROLLBACK TO</code> wieder verwerfen, bevor du die Transaktion mit <code>COMMIT</code> abschließt.`,
  setup: `CREATE TABLE konten (id INTEGER, name TEXT, saldo INTEGER);
INSERT INTO konten VALUES (1,'Anna',500),(2,'Ben',300),(3,'Clara',100);`,
  hints: [
    `<code>SAVEPOINT sp1;</code> setzt die Markierung — <code>ROLLBACK TO sp1;</code> verwirft alles danach, aber nicht das, was davor war.`,
    `Nach <code>ROLLBACK TO sp1</code> läuft die Transaktion weiter — erst das abschließende <code>COMMIT</code> macht die erste Überweisung endgültig.`,
    `So sieht die Lösung aus:<pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
SAVEPOINT sp1;
UPDATE konten SET saldo = saldo - 100 WHERE id = 2;
UPDATE konten SET saldo = saldo + 100 WHERE id = 3;
ROLLBACK TO sp1;
COMMIT;

SELECT * FROM konten;</pre>`,
  ] as const,
  solution: `BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
SAVEPOINT sp1;
UPDATE konten SET saldo = saldo - 100 WHERE id = 2;
UPDATE konten SET saldo = saldo + 100 WHERE id = 3;
ROLLBACK TO sp1;
COMMIT;

SELECT * FROM konten;`,
  syntaxExplanation: `<ul><li>Erste Überweisung (Anna → Ben) läuft vor dem Savepoint.</li><li><code>SAVEPOINT sp1;</code> markiert diesen Punkt.</li><li><code>ROLLBACK TO sp1;</code> verwirft nur die zweite Überweisung (Ben → Clara).</li><li>Ergebnis nach <code>COMMIT</code>: Anna 300, Ben 500, Clara 100.</li></ul>`,
  successCriteria: `Anna muss 300 haben, Ben muss 500 haben, Clara muss weiterhin 100 haben.`,
  extra: {
    pg: `Identisch in Postgres — SAVEPOINT/ROLLBACK TO sind Standard-SQL.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT id, saldo FROM konten ORDER BY id')[0]?.values ?? [];
      const byId = new Map(rows.map((row) => [Number(row?.[0]), Number(row?.[1])]));
      if (byId.get(1) !== 300) {
        return { ok: false, message: `Annas Saldo ist ${String(byId.get(1))}, erwartet werden 300 (500 - 200).` };
      }
      if (byId.get(2) !== 500) {
        return { ok: false, message: `Bens Saldo ist ${String(byId.get(2))}, erwartet werden 500 — die zweite Überweisung sollte per ROLLBACK TO verworfen worden sein.` };
      }
      if (byId.get(3) !== 100) {
        return { ok: false, message: `Claras Saldo ist ${String(byId.get(3))}, erwartet werden weiterhin 100 — die zweite Überweisung sollte per ROLLBACK TO verworfen worden sein.` };
      }
      return { ok: true, message: 'Korrekt: Die erste Überweisung blieb erhalten, die zweite wurde per SAVEPOINT gezielt verworfen.' };
    } catch (e) {
      if (!tableExists(engine, 'konten')) return { ok: false, message: 'Tabelle konten wurde noch nicht angelegt.' };
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
SAVEPOINT sp1;
UPDATE konten SET saldo = saldo - 100 WHERE id = 2;
UPDATE konten SET saldo = saldo + 100 WHERE id = 3;
COMMIT;

SELECT * FROM konten;`,
      reason: 'vergisst ROLLBACK TO sp1 komplett — beide Überweisungen werden übernommen, Ben landet bei 400 und Clara bei 200 statt bei 500 bzw. 100',
    },
  ],
};
