import type { SqlChallenge } from '../../../types';

export const challenge5_1: SqlChallenge = {
  num: '5.1',
  title: 'Spalten benennen mit AS (Aliase)',
  tutorial: `Mit <code>AS</code> gibst du einer Spalte im Ergebnis einen anderen Namen — der Inhalt bleibt gleich, nur die Überschrift ändert sich: <pre>SELECT name AS kundenname FROM users;</pre>Das ist mehr als Kosmetik: Sobald du gleich mit mehreren Tabellen arbeitest, brauchst du Aliase, um Spalten eindeutig zu benennen. Auch Tabellen selbst können ein Kürzel bekommen: <code>FROM users u</code> — danach schreibst du <code>u.name</code> statt <code>users.name</code>.`,
  task: `Vorbereitung auf Kapitel 6: Sobald zwei Tabellen kombiniert werden, wird eindeutige Benennung wichtig. Hier übst du Aliase erstmal an einer einzigen Tabelle.<br><br><b>Deine Aufgabe:</b> Gib aus <b>users</b> die Spalten name und signup_date aus, benannt als <b>kundenname</b> und <b>anmeldung</b>.`,
  prereqNums: ['01'],
  prereqNote: `Setzt voraus, dass du Challenge 1 (Tabelle users) bereits ausgeführt hast.`,
  hints: [
    `AS steht direkt hinter der Spalte, die umbenannt werden soll: <code>SELECT spalte AS neuer_name</code>.`,
    `Beide Spalten bekommen ihr eigenes AS, getrennt durch ein Komma.`,
    `So sieht die Lösung aus:<pre>SELECT name AS kundenname, signup_date AS anmeldung FROM users;</pre>`,
  ] as const,
  solution: `SELECT name AS kundenname, signup_date AS anmeldung FROM users;`,
  syntaxExplanation: `<ul><li><code>name AS kundenname</code> — die Ergebnisspalte heißt kundenname statt name.</li><li><code>signup_date AS anmeldung</code> — zweite Umbenennung, per Komma angehängt.</li></ul>`,
  successCriteria: `Das Ergebnis muss genau die zwei Spalten <b>kundenname</b> und <b>anmeldung</b> heißen und mindestens 5 Zeilen enthalten.`,
  extra: {
    pg: `Identisch in Postgres — AS ist Standard-SQL und dort sogar optional (users u funktioniert wie users AS u).`,
  },
  validate: (_engine, lastResult) => {
    if (!lastResult || !lastResult.columns) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = lastResult.columns.map((c) => c.toLowerCase());
    if (cols.length !== 2 || !cols.includes('kundenname') || !cols.includes('anmeldung')) {
      return { ok: false, message: `Spalten sind ${cols.join(', ')} — erwartet werden kundenname und anmeldung.` };
    }
    if (lastResult.values.length < 5) return { ok: false, message: `Nur ${lastResult.values.length} Zeile(n) — erwartet mindestens 5.` };
    return { ok: true, message: `${lastResult.values.length} Zeilen mit umbenannten Spalten.` };
  },
};
