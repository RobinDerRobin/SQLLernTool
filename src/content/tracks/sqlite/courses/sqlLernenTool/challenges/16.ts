import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge16: SqlChallenge = {
  num: '16',
  title: 'Mehrere Änderungen zusammenfassen: Transaktionen',
  tutorial: `Manchmal gehören mehrere Änderungen untrennbar zusammen: Bei einer Überweisung muss Geld von einem Konto <i>abgebucht</i> und einem anderen <i>gutgeschrieben</i> werden — beides zusammen, nie nur eines von beiden. Eine <b>Transaktion</b> fasst mehrere Anweisungen zu einem einzigen, geschlossenen Block zusammen: <pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
COMMIT;</pre><code>BEGIN</code> startet die Transaktion, <code>COMMIT</code> schließt sie ab und macht alle Änderungen dazwischen endgültig. Wichtig: <code>BEGIN</code> lässt sich nicht ein zweites Mal starten, während schon eine Transaktion läuft — SQLite kennt kein "Verschachteln" von Transaktionen (dafür gibt es <code>SAVEPOINT</code>, das lernst du später).`,
  task: `<b>Hinweis:</b> Die Tabelle <b>konten</b> (id, name, saldo) mit Anna (500) und Ben (300) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Überweise 200 von Annas Konto (id 1) auf Bens Konto (id 2) — beide <code>UPDATE</code>-Anweisungen zusammen in einer Transaktion mit <code>BEGIN</code> und <code>COMMIT</code>.`,
  setup: `CREATE TABLE konten (id INTEGER, name TEXT, saldo INTEGER);
INSERT INTO konten VALUES (1,'Anna',500),(2,'Ben',300);`,
  hints: [
    `<code>BEGIN;</code> ganz am Anfang, <code>COMMIT;</code> ganz am Ende — dazwischen beide UPDATE-Anweisungen.`,
    `Annas Saldo sinkt um 200 (<code>saldo - 200</code>), Bens Saldo steigt um 200 (<code>saldo + 200</code>) — die Gesamtsumme bleibt gleich.`,
    `So sieht die Lösung aus:<pre>BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
COMMIT;

SELECT * FROM konten;</pre>`,
  ] as const,
  solution: `BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
COMMIT;

SELECT * FROM konten;`,
  syntaxExplanation: `<ul><li><code>BEGIN;</code> — startet die Transaktion.</li><li>Beide <code>UPDATE</code>s dazwischen gehören zusammen.</li><li><code>COMMIT;</code> — macht beide Änderungen endgültig.</li></ul>`,
  successCriteria: `Anna muss 300 haben, Ben muss 500 haben — die Gesamtsumme (800) bleibt unverändert.`,
  extra: {
    pg: `Identisch in Postgres — BEGIN/COMMIT sind Standard-SQL für Transaktionen.`,
  },
  validate: (engine) => {
    try {
      const rows = engine.exec('SELECT id, saldo FROM konten ORDER BY id')[0]?.values ?? [];
      const byId = new Map(rows.map((row) => [Number(row?.[0]), Number(row?.[1])]));
      if (byId.get(1) !== 300) {
        return { ok: false, message: `Annas Saldo ist ${String(byId.get(1))}, erwartet werden 300 (500 - 200).` };
      }
      if (byId.get(2) !== 500) {
        return { ok: false, message: `Bens Saldo ist ${String(byId.get(2))}, erwartet werden 500 (300 + 200).` };
      }
      return { ok: true, message: 'Korrekt: 200 wurden erfolgreich von Anna zu Ben überwiesen.' };
    } catch (e) {
      if (!tableExists(engine, 'konten')) return { ok: false, message: 'Tabelle konten wurde noch nicht angelegt.' };
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
  },
  distractors: [
    {
      code: `BEGIN;
UPDATE konten SET saldo = saldo - 200 WHERE id = 1;
BEGIN;
UPDATE konten SET saldo = saldo + 200 WHERE id = 2;
COMMIT;

SELECT * FROM konten;`,
      reason: 'startet aus Versehen ein zweites BEGIN, während die erste Transaktion noch läuft — SQLite lässt keine verschachtelten Transaktionen zu, das löst den echten Fehler "cannot start a transaction within a transaction" aus',
    },
  ],
};
