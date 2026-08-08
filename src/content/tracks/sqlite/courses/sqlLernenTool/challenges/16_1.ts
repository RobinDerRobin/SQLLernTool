import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge16_1: SqlChallenge = {
  num: '16.1',
  title: 'Änderungen verwerfen: ROLLBACK',
  tutorial: `<code>COMMIT</code> ist nicht die einzige Möglichkeit, eine Transaktion zu beenden — <code>ROLLBACK</code> verwirft stattdessen <b>alle</b> Änderungen seit dem letzten <code>BEGIN</code>, als wären sie nie passiert: <pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
ROLLBACK;</pre>Nach diesem Block sind <b>beide</b> Konten wieder genau auf dem Stand von vor dem <code>BEGIN</code> — so, als hättest du die beiden <code>UPDATE</code>s nie ausgeführt. Das ist der ganze Sinn einer Transaktion: Entweder passiert alles zusammen (<code>COMMIT</code>), oder gar nichts davon (<code>ROLLBACK</code>) — nie nur ein Teil.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>konten</b> (id, name, saldo) mit Anna (500), Ben (300) und Clara (100) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Beginne eine Transaktion und überweise 200 von Anna (id 1) zu Ben (id 2) — mach die Überweisung dann aber mit <code>ROLLBACK</code> wieder rückgängig, sodass am Ende beide Konten unverändert ihren ursprünglichen Saldo haben.`,
  setup: `CREATE TABLE konten (id INTEGER, name TEXT, saldo INTEGER);
INSERT INTO konten VALUES (1,'Anna',500),(2,'Ben',300),(3,'Clara',100);`,
  hints: [
    `Der Aufbau ist wie bei einer normalen Transaktion — nur dass am Ende <code>ROLLBACK;</code> statt <code>COMMIT;</code> steht.`,
    `<code>ROLLBACK</code> verwirft die beiden UPDATE-Anweisungen komplett — Anna bleibt bei 500, Ben bleibt bei 300.`,
    `So sieht die Lösung aus:<pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
ROLLBACK;

SELECT * FROM konten;</pre>`,
  ] as const,
  solution: `BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
ROLLBACK;

SELECT * FROM konten;`,
  syntaxExplanation: `<ul><li>Beide <code>UPDATE</code>s laufen innerhalb der Transaktion.</li><li><code>ROLLBACK;</code> — verwirft beide Änderungen komplett, keine wird übernommen.</li><li>Anna bleibt bei 500, Ben bleibt bei 300 — unverändert.</li></ul>`,
  successCriteria: `Anna muss weiterhin 500 haben, Ben muss weiterhin 300 haben — beide Konten unverändert.`,
  extra: {
    pg: `Identisch in Postgres — ROLLBACK ist Standard-SQL.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT id, saldo FROM konten ORDER BY id')[0]?.values ?? [];
      const byId = new Map(rows.map((row) => [Number(row?.[0]), Number(row?.[1])]));
      if (byId.get(1) !== 500) {
        return { ok: false, message: `Annas Saldo ist ${String(byId.get(1))}, erwartet werden weiterhin 500 (unverändert).` };
      }
      if (byId.get(2) !== 300) {
        return { ok: false, message: `Bens Saldo ist ${String(byId.get(2))}, erwartet werden weiterhin 300 (unverändert).` };
      }
      return { ok: true, message: 'Korrekt: ROLLBACK hat die Überweisung vollständig rückgängig gemacht.' };
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
COMMIT;

SELECT * FROM konten;`,
      reason: 'verwechselt COMMIT mit ROLLBACK — die Überweisung wird dadurch endgültig gemacht statt verworfen, Anna landet bei 300 und Ben bei 500 statt unverändert zu bleiben',
    },
  ],
};
