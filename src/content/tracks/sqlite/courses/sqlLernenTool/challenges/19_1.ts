import type { SqlChallenge } from '../../../types';

export const challenge19_1: SqlChallenge = {
  num: '19.1',
  title: 'Rekursion über echte Hierarchien: das Organigramm',
  tutorial: `Bisher hat <code>WITH RECURSIVE</code> immer nur Zahlen oder Datumsreihen erzeugt — der rekursive Teil kann aber genauso gut eine <b>bestehende hierarchische Tabelle</b> durchlaufen, statt neue Werte zu erfinden. Ein Organigramm ist das klassische Beispiel: Jeder Mitarbeiter hat eine <code>manager_id</code>, die auf einen anderen Mitarbeiter zeigt. Um <i>alle</i> — auch indirekt — Unterstellten einer Person zu finden, reicht ein einzelner Join nicht: Der Anker findet nur die direkten Unterstellten, der rekursive Teil joint dann immer wieder gegen das bisherige Ergebnis, bis keine neuen Zeilen mehr dazukommen: <pre>WITH RECURSIVE unterstellte(id, name, tiefe) AS (
  SELECT id, name, 1 FROM mitarbeiter WHERE manager_id = 1
  UNION ALL
  SELECT m.id, m.name, u.tiefe + 1
  FROM mitarbeiter m
  JOIN unterstellte u ON m.manager_id = u.id
  WHERE u.tiefe < 10
)
SELECT name FROM unterstellte;</pre>Die mitgezählte <code>tiefe</code> ist hier nicht nur Beiwerk: Bei echten, fremd gepflegten Daten kann eine Hierarchie versehentlich einen Zyklus enthalten (A meldet an B, B versehentlich wieder an A) — ohne eine Bedingung wie <code>WHERE u.tiefe < 10</code> würde eine solche Schleife die Rekursion nie beenden. Ein Tiefen-Limit ist deshalb gängige Praxis, nicht nur eine Formalität.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, manager_id) ist bereits angelegt. Anna (id 1) ist die Chefin, alle anderen berichten direkt oder indirekt an sie.<br><br><b>Deine Aufgabe:</b> Finde <b>alle</b> Mitarbeiter, die (direkt oder indirekt über mehrere Ebenen) Anna unterstellt sind — also alle außer Anna selbst. Gib nur die Spalte <code>name</code> aus, sortiert nach <code>name</code>. Zähle dabei die Hierarchie-Tiefe mit und begrenze die Rekursion darüber (z. B. <code>WHERE tiefe &lt; 10</code>), statt sie unbegrenzt laufen zu lassen.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, manager_id INTEGER);
INSERT INTO mitarbeiter VALUES
  (1,'Anna',NULL),
  (2,'Ben',1),
  (3,'Clara',1),
  (4,'David',2),
  (5,'Eva',2),
  (6,'Frank',3);`,
  hints: [
    `Der Anker holt die direkten Unterstellten von Anna und startet die Tiefe bei 1: <code>SELECT id, name, 1 FROM mitarbeiter WHERE manager_id = 1</code>.`,
    `Der rekursive Teil joint <code>mitarbeiter</code> gegen die CTE selbst (nicht gegen Anna direkt) und erhöht die Tiefe um 1: <code>JOIN unterstellte u ON m.manager_id = u.id</code>, dazu eine Abbruchbedingung wie <code>WHERE u.tiefe &lt; 10</code>.`,
    `So sieht die Lösung aus:<pre>WITH RECURSIVE unterstellte(id, name, tiefe) AS (
  SELECT id, name, 1 FROM mitarbeiter WHERE manager_id = 1
  UNION ALL
  SELECT m.id, m.name, u.tiefe + 1
  FROM mitarbeiter m
  JOIN unterstellte u ON m.manager_id = u.id
  WHERE u.tiefe < 10
)
SELECT name FROM unterstellte ORDER BY name;</pre>`,
  ] as const,
  solution: `WITH RECURSIVE unterstellte(id, name, tiefe) AS (
  SELECT id, name, 1 FROM mitarbeiter WHERE manager_id = 1
  UNION ALL
  SELECT m.id, m.name, u.tiefe + 1
  FROM mitarbeiter m
  JOIN unterstellte u ON m.manager_id = u.id
  WHERE u.tiefe < 10
)
SELECT name FROM unterstellte ORDER BY name;`,
  syntaxExplanation: `<ul><li><code>WITH RECURSIVE unterstellte(id, name, tiefe) AS (Anker UNION ALL rekursiver Teil)</code> — der Anker startet bei Annas direkten Unterstellten, mit Tiefe 1.</li><li><code>JOIN unterstellte u ON m.manager_id = u.id</code> — der rekursive Teil hängt sich an die zuletzt gefundenen IDs, nicht an eine feste ID, und findet so beliebig tiefe Hierarchie-Ebenen.</li><li><code>WHERE u.tiefe &lt; 10</code> — begrenzt die maximale Tiefe und schützt so vor einer versehentlichen Endlosschleife bei zyklischen Daten.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau alle Mitarbeiter enthalten, die direkt oder indirekt an Anna berichten (also alle außer Anna) — nicht nur die direkten Unterstellten der ersten Ebene.`,
  extra: {
    pg: `Identisch in Postgres — WITH RECURSIVE über eine selbstreferenzierende Tabelle ist Standard-SQL und wird dort ebenso häufig für Organigramme/Kategoriebäume verwendet, oft ebenfalls mit einer mitgezählten Tiefe als Sicherheitsnetz gegen zyklische Daten.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let allRows: unknown[][];
    try {
      allRows = engine.exec(`SELECT id, name, manager_id FROM mitarbeiter`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const childrenOf = new Map<number, { id: number; name: string }[]>();
    for (const row of allRows) {
      const id = Number(row[0]);
      const name = String(row[1]);
      const managerId = row[2] === null ? null : Number(row[2]);
      if (managerId === null) continue;
      if (!childrenOf.has(managerId)) childrenOf.set(managerId, []);
      childrenOf.get(managerId)!.push({ id, name });
    }
    const expected: string[] = [];
    const queue = [1];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of childrenOf.get(current) ?? []) {
        expected.push(child.name);
        queue.push(child.id);
      }
    }
    expected.sort();

    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const nameIdx = cols.indexOf('name');
    if (nameIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet wird eine Spalte "name".` };
    }
    const actual = lastResult.values.map((row) => String(row[nameIdx])).sort();
    if (actual.length !== expected.length || actual.some((name, i) => name !== expected[i])) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden alle (auch indirekt) Unterstellten von Anna: ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: alle ${expected.length} direkt und indirekt Unterstellten von Anna gefunden.` };
  },
  distractors: [
    {
      code: `SELECT name FROM mitarbeiter WHERE manager_id = 1 ORDER BY name;`,
      reason: 'findet nur die direkten Unterstellten von Anna (Ben, Clara) — David, Eva und Frank, die indirekt über Ben bzw. Clara an Anna berichten, fehlen komplett, weil gar keine Rekursion stattfindet',
    },
  ],
};
