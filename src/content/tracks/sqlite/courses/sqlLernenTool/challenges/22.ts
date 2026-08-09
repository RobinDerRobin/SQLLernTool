import type { SqlChallenge } from '../../../types';

export const challenge22: SqlChallenge = {
  num: '22',
  title: 'Bedingungen verknüpfen: AND, OR, NOT',
  tutorial: `Du hast <code>WHERE</code> schon oft mit mehreren Bedingungen genutzt — <code>AND</code>, <code>OR</code> und <code>NOT</code> sind die logischen Operatoren, die das erst möglich machen: <code>AND</code> verlangt, dass <b>beide</b> Seiten wahr sind, <code>OR</code> reicht <b>eine</b> von beiden, <code>NOT</code> kehrt eine Bedingung um. Wichtig ist die Reihenfolge: <code>AND</code> bindet stärker als <code>OR</code> — <code>a AND b OR c</code> bedeutet <code>(a AND b) OR c</code>, nicht <code>a AND (b OR c)</code>. Bei mehreren verschachtelten Bedingungen lohnt es sich deshalb, Klammern zu setzen, auch wenn sie nicht zwingend nötig wären: <pre>WHERE (abteilung = 'Vertrieb' AND gehalt > 3000) OR NOT (abteilung = 'Vertrieb')</pre>Das liest sich sofort richtig — ohne Klammern müsstest du die Vorrangregeln erst im Kopf durchrechnen.`,
  task: `<b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> (id, name, abteilung, gehalt) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Eine neue Bonusregel gilt: Mitarbeiter aus der Vertrieb-Abteilung bekommen den Bonus nur, wenn sie mehr als 3000 verdienen. Alle Mitarbeiter aus anderen Abteilungen bekommen ihn automatisch. Zeige die Namen aller bonusberechtigten Mitarbeiter, sortiert nach Name.`,
  setup: `CREATE TABLE mitarbeiter (id INTEGER, name TEXT, abteilung TEXT, gehalt INTEGER);
INSERT INTO mitarbeiter VALUES (1,'Anna','Vertrieb',3000),(2,'Ben','IT',4500),(3,'Clara','IT',4000),(4,'David','Vertrieb',3200),(5,'Eva','Marketing',3800),(6,'Frank','IT',3500);`,
  hints: [
    `Zwei Fälle führen zum Bonus: entweder "Vertrieb UND gehalt > 3000", oder "NICHT Vertrieb" (automatisch, egal welches Gehalt) — verknüpft mit OR.`,
    `Setze Klammern um die AND-Bedingung, damit die Vorrangregel (AND bindet stärker als OR) auch ohne Nachdenken sofort klar ist: <code>(abteilung = 'Vertrieb' AND gehalt > 3000) OR NOT (abteilung = 'Vertrieb')</code>.`,
    `So sieht die Lösung aus:<pre>SELECT name FROM mitarbeiter
WHERE (abteilung = 'Vertrieb' AND gehalt > 3000) OR NOT (abteilung = 'Vertrieb')
ORDER BY name;</pre>`,
  ] as const,
  solution: `SELECT name FROM mitarbeiter
WHERE (abteilung = 'Vertrieb' AND gehalt > 3000) OR NOT (abteilung = 'Vertrieb')
ORDER BY name;`,
  syntaxExplanation: `<ul><li><code>(abteilung = 'Vertrieb' AND gehalt &gt; 3000)</code> — beide Bedingungen müssen zutreffen.</li><li><code>OR NOT (abteilung = 'Vertrieb')</code> — oder die Abteilung ist gar nicht Vertrieb.</li><li>Ein Mitarbeiter aus Vertrieb mit gehalt = 3000 (wie Anna) erfüllt keine der beiden Seiten und fällt raus.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die Mitarbeiter enthalten, die entweder nicht in Vertrieb arbeiten, oder in Vertrieb arbeiten und mehr als 3000 verdienen — Anna (Vertrieb, genau 3000) darf nicht erscheinen.`,
  extra: {
    pg: `Identisch in Postgres — AND/OR/NOT und ihre Vorrangregeln sind Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) {
      return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    }
    let expected: string[];
    try {
      const rows =
        engine.exec(
          `SELECT name FROM mitarbeiter
           WHERE abteilung != 'Vertrieb' OR (abteilung = 'Vertrieb' AND gehalt > 3000)
           ORDER BY name`,
        )[0]?.values ?? [];
      expected = rows.map((row) => String(row?.[0]));
    } catch (e) {
      return { ok: false, message: `Prüfung schlug fehl: ${(e as Error).message}` };
    }
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    const nameIdx = cols.indexOf('name');
    if (nameIdx === -1) {
      return { ok: false, message: `Das Ergebnis hat die Spalten ${JSON.stringify(lastResult.columns)} — erwartet wird eine Spalte "name".` };
    }
    const actual = lastResult.values.map((row) => String(row[nameIdx]));
    if (actual.length !== expected.length || actual.some((name, i) => name !== expected[i])) {
      return {
        ok: false,
        message: `Das Ergebnis ist ${JSON.stringify(actual)}, erwartet werden die bonusberechtigten Mitarbeiter ${JSON.stringify(expected)}.`,
      };
    }
    return { ok: true, message: `Korrekt: ${expected.length} bonusberechtigte Mitarbeiter, Anna (Vertrieb, genau 3000) zu Recht ausgeschlossen.` };
  },
  distractors: [
    {
      code: `SELECT name FROM mitarbeiter
WHERE abteilung = 'Vertrieb' AND gehalt > 3000
ORDER BY name;`,
      reason: 'vergisst die OR NOT (abteilung = \'Vertrieb\')-Bedingung komplett — nur David (Vertrieb, über 3000) erscheint, alle Mitarbeiter aus IT und Marketing fehlen, obwohl sie automatisch bonusberechtigt sind',
    },
  ],
};
