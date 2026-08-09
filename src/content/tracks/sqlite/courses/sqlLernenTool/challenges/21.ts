import type { SqlChallenge } from '../../../types';

export const challenge21: SqlChallenge = {
  num: '21',
  title: 'Eine Tabelle mit sich selbst verknüpfen: SELF JOIN',
  tutorial: `Ein <code>JOIN</code> muss nicht zwei verschiedene Tabellen verbinden — eine Tabelle kann sich auch mit sich <b>selbst</b> verknüpfen, wenn eine Spalte auf eine andere Zeile derselben Tabelle verweist. Ein Organigramm mit <code>manager_id</code> ist das klassische Beispiel: Jeder Mitarbeiter zeigt über <code>manager_id</code> auf einen <b>anderen</b> Mitarbeiter. Um Name und Manager-Name nebeneinander zu sehen, brauchst du zwei <b>Aliasse</b> für dieselbe Tabelle: <pre>SELECT e.name AS mitarbeiter, m.name AS manager
FROM mitarbeiter e
JOIN mitarbeiter m ON e.manager_id = m.id;</pre><code>e</code> und <code>m</code> sind hier dieselbe Tabelle, aber SQLite behandelt sie durch die Aliasse wie zwei unabhängige Tabellen. Anders als bei der rekursiven CTE aus Kapitel 19.1 geht es hier nur um <b>eine</b> Ebene — direkter Manager, nicht die ganze Kette nach oben.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, manager_id) ist bereits angelegt. Anna (id 1) hat keinen Manager (manager_id ist NULL).<br><br><b>Deine Aufgabe:</b> Zeige für jeden Mitarbeiter, der einen Manager hat, seinen Namen und den Namen seines direkten Managers — mit den Spalten <code>mitarbeiter</code> und <code>manager</code>, sortiert nach <code>mitarbeiter</code>. Anna selbst darf nicht erscheinen, da sie keinen Manager hat.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, manager_id INTEGER);
INSERT INTO mitarbeiter VALUES (1,'Anna',NULL),(2,'Ben',1),(3,'Clara',1),(4,'David',2);`,
  hints: [
    `Du brauchst zwei Aliasse für dieselbe Tabelle: <code>FROM mitarbeiter e JOIN mitarbeiter m ON ...</code> — einen für den Mitarbeiter selbst (<code>e</code>), einen für seinen Manager (<code>m</code>).`,
    `Die Verknüpfungsbedingung ist <code>e.manager_id = m.id</code> — die manager_id des einen muss auf die id des anderen zeigen.`,
    `So sieht die Lösung aus:<pre>SELECT e.name AS mitarbeiter, m.name AS manager
FROM mitarbeiter e
JOIN mitarbeiter m ON e.manager_id = m.id
ORDER BY e.name;</pre>`,
  ] as const,
  solution: `SELECT e.name AS mitarbeiter, m.name AS manager
FROM mitarbeiter e
JOIN mitarbeiter m ON e.manager_id = m.id
ORDER BY e.name;`,
  syntaxExplanation: `<ul><li><code>FROM mitarbeiter e JOIN mitarbeiter m</code> — dieselbe Tabelle zweimal, mit unterschiedlichen Aliassen.</li><li><code>ON e.manager_id = m.id</code> — verbindet jeden Mitarbeiter mit der Zeile seines Managers.</li><li>Ein normaler (INNER) JOIN lässt Anna automatisch weg, da <code>manager_id</code> bei ihr NULL ist und mit nichts übereinstimmt.</li></ul>`,
  successCriteria: `Das Ergebnis muss für jeden Mitarbeiter mit Manager genau ein Zeilenpaar (mitarbeiter, manager) enthalten, korrekt nach dem echten manager_id-Verweis zugeordnet — Anna darf nicht erscheinen.`,
  extra: {
    pg: `Identisch in Postgres — SELF JOIN ist keine eigene Syntax, nur ein normaler JOIN einer Tabelle mit sich selbst über zwei Aliasse.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let rows: unknown[][];
    try {
      rows = engine.exec(`SELECT id, name, manager_id FROM mitarbeiter`)[0]?.values ?? [];
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const nameById = new Map<number, string>();
    for (const row of rows) {
      nameById.set(Number(row[0]), String(row[1]));
    }
    const expected: [string, string][] = [];
    for (const row of rows) {
      const managerId = row[2] === null ? null : Number(row[2]);
      if (managerId === null) continue;
      const managerName = nameById.get(managerId);
      if (managerName !== undefined) expected.push([String(row[1]), managerName]);
    }
    expected.sort((a, b) => a[0].localeCompare(b[0]));

    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const mitarbeiterIdx = cols.indexOf('mitarbeiter');
    const managerIdx = cols.indexOf('manager');
    if (mitarbeiterIdx === -1 || managerIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet werden mitarbeiter und manager.` };
    }
    const actual = lastResult.values.map((row) => [String(row[mitarbeiterIdx]), String(row[managerIdx])] as [string, string]);
    if (
      actual.length !== expected.length ||
      actual.some((row, i) => row[0] !== expected[i]?.[0] || row[1] !== expected[i]?.[1])
    ) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die Mitarbeiter-Manager-Paare ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: ${expected.length} Mitarbeiter-Manager-Paare, Anna (ohne Manager) zu Recht ausgeschlossen.` };
  },
  distractors: [
    {
      code: `SELECT e.name AS mitarbeiter, m.name AS manager
FROM mitarbeiter e
JOIN mitarbeiter m ON e.id = m.id
ORDER BY e.name;`,
      reason: 'verknüpft jede Zeile mit sich selbst (e.id = m.id statt e.manager_id = m.id) — jeder Mitarbeiter erscheint als sein eigener "Manager", inklusive Anna, die eigentlich gar keinen Manager hat',
    },
  ],
};
