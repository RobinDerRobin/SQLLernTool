import { tableExists } from '../../../challengeHelpers';
import type { SqlChallenge } from '../../../types';

export const challenge15_1: SqlChallenge = {
  num: '15.1',
  title: 'Das Fenster eingrenzen: PARTITION BY',
  tutorial: `<code>OVER ()</code> rechnet über die gesamte Tabelle. Mit <code>PARTITION BY spalte</code> innerhalb der Klammern grenzt du das Fenster stattdessen auf Gruppen ein — die Fensterfunktion wird dann für jede Gruppe <b>separat</b> berechnet: <pre>SELECT name, abteilung, gehalt,
  AVG(gehalt) OVER (PARTITION BY abteilung) AS abt_durchschnitt
FROM mitarbeiter;</pre>Das klingt wie <code>GROUP BY</code> — der entscheidende Unterschied bleibt aber: Jede Zeile bleibt einzeln erhalten, nur der berechnete Wert bezieht sich auf die Gruppe der jeweiligen Zeile, nicht auf die ganze Tabelle.`,
  task: `In Challenge 15 hast du den Durchschnitt über <i>alle</i> Mitarbeiter berechnet. Meistens willst du aber pro Gruppe vergleichen — z. B. "verdient diese Person mehr als der Durchschnitt <i>ihrer eigenen Abteilung</i>?". Dafür grenzt PARTITION BY das Fenster ein.<br><br><b>Hinweis:</b> Die Tabelle <b>mitarbeiter</b> aus Challenge 15 wird automatisch bereitgestellt.<br><br><b>Deine Aufgabe:</b> Gib zu jedem Mitarbeiter Name, Abteilung, Gehalt und eine Spalte <b>abt_durchschnitt</b> mit dem Durchschnittsgehalt <i>seiner eigenen Abteilung</i> aus.`,
  prereqNums: ['15'],
  prereqNote: `Setzt voraus, dass du Challenge 15 (Tabelle mitarbeiter) bereits ausgeführt hast.`,
  hints: [
    `<code>PARTITION BY abteilung</code> kommt direkt in die Klammern hinter <code>OVER</code>, anstelle von <code>OVER ()</code>.`,
    `Jede Zeile bekommt den Durchschnitt <i>ihrer</i> Abteilung, nicht den Gesamtdurchschnitt — Vertrieb- und IT-Zeilen zeigen also unterschiedliche Werte in abt_durchschnitt.`,
    `So sieht die Lösung aus:<pre>SELECT name, abteilung, gehalt,
  AVG(gehalt) OVER (PARTITION BY abteilung) AS abt_durchschnitt
FROM mitarbeiter;</pre>`,
  ] as const,
  solution: `SELECT name, abteilung, gehalt,
  AVG(gehalt) OVER (PARTITION BY abteilung) AS abt_durchschnitt
FROM mitarbeiter;`,
  syntaxExplanation: `<ul><li><code>PARTITION BY abteilung</code> — teilt die Tabelle in Gruppen (hier: Vertrieb, IT), bevor die Fensterfunktion rechnet.</li><li><code>AVG(gehalt) OVER (PARTITION BY abteilung)</code> — berechnet den Durchschnitt separat je Gruppe, aber alle 6 Zeilen bleiben im Ergebnis.</li></ul>`,
  successCriteria: `Das Ergebnis muss alle 6 Mitarbeiter enthalten, mit abt_durchschnitt = echtem Durchschnittsgehalt der jeweils eigenen Abteilung (nicht dem Gesamtdurchschnitt).`,
  extra: {
    pg: `Identisch in Postgres — PARTITION BY ist Standard-SQL.`,
  },
  validate: (engine, lastResult) => {
    if (!lastResult || !lastResult.values) return { ok: false, message: 'Es gibt noch kein SELECT-Ergebnis.' };
    const cols = (lastResult.columns ?? []).map((c) => c.toLowerCase());
    const nameIdx = cols.findIndex((c) => c.includes('name'));
    const abtIdx = cols.findIndex((c) => c.includes('abteilung'));
    const gehaltIdx = cols.findIndex((c) => c.includes('gehalt') && !c.includes('durchschnitt'));
    const avgIdx = cols.findIndex((c) => c.includes('durchschnitt'));
    if (nameIdx === -1 || abtIdx === -1 || gehaltIdx === -1 || avgIdx === -1) {
      return { ok: false, message: 'Es werden die Spalten name, abteilung, gehalt und abt_durchschnitt erwartet.' };
    }
    let expected: Map<string, { abteilung: string; gehalt: number; avg: number }>;
    try {
      expected = new Map(
        (
          engine.exec(
            `SELECT name, abteilung, gehalt, AVG(gehalt) OVER (PARTITION BY abteilung) FROM mitarbeiter`,
          )[0]?.values ?? []
        ).map((r) => [String(r[0]), { abteilung: String(r[1]), gehalt: Number(r[2]), avg: Number(r[3]) }]),
      );
    } catch (e) {
      if (!tableExists(engine, 'mitarbeiter')) return { ok: false, message: 'Tabelle mitarbeiter wurde noch nicht angelegt.' };
      return { ok: false, message: `Vergleichsabfrage schlug fehl: ${(e as Error).message}` };
    }
    if (lastResult.values.length !== expected.size) {
      return { ok: false, message: `Ergebnis hat ${lastResult.values.length} Zeile(n), erwartet werden alle ${expected.size} Mitarbeiter.` };
    }
    for (const row of lastResult.values) {
      const name = String(row[nameIdx]);
      const exp = expected.get(name);
      if (!exp) return { ok: false, message: `"${name}" ist kein bekannter Mitarbeiter.` };
      if (String(row[abtIdx]) !== exp.abteilung || Number(row[gehaltIdx]) !== exp.gehalt) {
        return { ok: false, message: `"${name}" hat falsche abteilung/gehalt-Werte.` };
      }
      if (Math.abs(Number(row[avgIdx]) - exp.avg) > 0.001) {
        return {
          ok: false,
          message: `"${name}" zeigt abt_durchschnitt = ${Number(row[avgIdx])}, erwartet wird der echte Durchschnitt der Abteilung ${exp.abteilung} (${exp.avg}).`,
        };
      }
    }
    return { ok: true, message: 'Alle Mitarbeiter korrekt mit dem Durchschnitt ihrer eigenen Abteilung versehen.' };
  },
  distractors: [
    {
      code: `SELECT name, abteilung, gehalt,
  AVG(gehalt) OVER () AS abt_durchschnitt
FROM mitarbeiter;`,
      reason: 'vergisst PARTITION BY — zeigt bei jedem Mitarbeiter den Gesamtdurchschnitt über alle Abteilungen statt den Durchschnitt der eigenen Abteilung',
    },
  ],
};
