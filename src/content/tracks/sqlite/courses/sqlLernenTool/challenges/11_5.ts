import type { SqlChallenge } from '../../../types';

export const challenge11_5: SqlChallenge = {
  num: '11.5',
  title: 'Textmuster suchen: LIKE',
  tutorial: `<code>=</code> vergleicht Text nur auf exakte Gleichheit. Für "enthält irgendwo diesen Teil" gibt es <code>LIKE</code> mit zwei Platzhaltern: <code>%</code> steht für <i>beliebig viele</i> (auch null) Zeichen, <code>_</code> für <i>genau ein</i> Zeichen: <pre>SELECT * FROM kunden WHERE email LIKE '%@gmail.com';   -- endet auf @gmail.com
SELECT * FROM kunden WHERE email LIKE 'a%';             -- beginnt mit 'a'
SELECT * FROM kunden WHERE email LIKE '%gmail%';        -- enthält 'gmail' irgendwo</pre>`,
  task: `Exakte Gleichheit reicht selten, wenn du nach Textmustern suchst — "alle E-Mails bei gmail", "alle Namen, die mit A anfangen". LIKE ist dafür das Standardwerkzeug.<br><br><b>Hinweis:</b> Die Tabelle <b>kunden</b> (5 Zeilen, verschiedene E-Mail-Anbieter) ist bereits angelegt.<br><br><b>Deine Aufgabe:</b> Finde alle Kunden, deren E-Mail-Adresse auf <code>@gmail.com</code> endet.`,
  setup: `CREATE TABLE kunden (id INTEGER, name TEXT, email TEXT);
INSERT INTO kunden VALUES
  (1,'Anna','anna@gmail.com'),
  (2,'Ben','ben@web.de'),
  (3,'Clara','clara@gmail.com'),
  (4,'David','david@outlook.com'),
  (5,'Emma','emma@gmail.com');`,
  hints: [
    `<code>LIKE</code> steht anstelle von <code>=</code> in der WHERE-Bedingung.`,
    `Für "endet auf" steht der feste Teil am Ende des Musters, davor ein <code>%</code>: <code>'%@gmail.com'</code>.`,
    `So sieht die Lösung aus:<pre>SELECT * FROM kunden WHERE email LIKE '%@gmail.com';</pre>`,
  ] as const,
  solution: `SELECT * FROM kunden WHERE email LIKE '%@gmail.com';`,
  syntaxExplanation: `<ul><li><code>LIKE '%@gmail.com'</code> — das <code>%</code> davor erlaubt beliebigen Text vor "@gmail.com", solange die E-Mail genau darauf endet.</li><li>Passt auf anna@gmail.com, clara@gmail.com, emma@gmail.com — nicht auf web.de oder outlook.com.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die 3 Kunden mit @gmail.com-Adresse enthalten (Anna, Clara, Emma) — keine anderen.`,
  extra: {
    pg: `Identisch in Postgres. Für eine Groß-/Kleinschreibungs-unabhängige Suche gibt es dort zusätzlich ILIKE — in SQLite ist LIKE bei ASCII-Text bereits von Haus aus case-insensitive.`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const rows = lastResult.values;
    if (rows.length !== 3) return { ok: false, message: `Es sind ${rows.length} Zeile(n) — erwartet werden genau 3.` };
    const emailCol = (lastResult.columns ?? []).findIndex((c) => c.toLowerCase().includes('email'));
    if (emailCol === -1) return { ok: false, message: 'Das Ergebnis muss eine email-Spalte enthalten (z. B. über SELECT *).' };
    if (rows.some((row) => !String(row[emailCol]).endsWith('@gmail.com'))) {
      return { ok: false, message: 'Es sind auch Zeilen ohne @gmail.com-Adresse im Ergebnis.' };
    }
    const seenEmails = new Set(rows.map((row) => String(row[emailCol])));
    const expectedEmails = new Set(['anna@gmail.com', 'clara@gmail.com', 'emma@gmail.com']);
    if (seenEmails.size !== 3 || ![...expectedEmails].every((e) => seenEmails.has(e))) {
      return {
        ok: false,
        message: `3 Zeilen enden auf @gmail.com, aber es sind nicht alle drei echten Kunden (Anna, Clara, Emma) dabei — gefunden: ${[...seenEmails].join(', ')}.`,
      };
    }
    return { ok: true, message: 'LIKE korrekt: nur die 3 gmail.com-Kunden gefunden.' };
  },
  distractors: [
    {
      code: `SELECT * FROM kunden WHERE email = 'anna@gmail.com'
UNION ALL SELECT * FROM kunden WHERE email = 'anna@gmail.com'
UNION ALL SELECT * FROM kunden WHERE email = 'anna@gmail.com';`,
      reason: '3 Zeilen, alle enden auf @gmail.com, aber es ist dreimal dieselbe Kundin statt der drei echten gmail-Kunden',
    },
  ],
};
