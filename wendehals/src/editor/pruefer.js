// Prüfer: führt die Regeln aus regeln.js auf einem Gebiet aus und ordnet die Meldungen (MUSS vor SOLL, dann nach Regel).
// Reine Rechnung – kein DOM. Die Leiste und der Sprung zur Stelle stehen in main.js.
import { REGELN } from './regeln.js';

/** → { meldungen: [{ regel, art, text, ort }], muss, soll }. Fehler in einer Regel werden als MUSS-Meldung gezeigt, nie verschluckt. */
export function pruefeGebiet(g, regeln = REGELN) {
  const meldungen = [];
  for (const r of regeln) {
    let liste;
    try {
      liste = r.pruefe(g);
    } catch (e) {
      liste = [{ text: `Regel ${r.id} konnte nicht geprüft werden: ${e.message}` }];
      meldungen.push({ regel: r.id, art: 'MUSS', text: liste[0].text, ort: null });
      continue;
    }
    for (const m of liste) meldungen.push({ regel: r.id, art: r.art, text: m.text, ort: m.ort ?? null });
  }
  const rang = (m) => (m.art === 'MUSS' ? 0 : 1);
  meldungen.sort((a, b) => rang(a) - rang(b) || regeln.findIndex((r) => r.id === a.regel) - regeln.findIndex((r) => r.id === b.regel));
  return { meldungen, muss: meldungen.filter((m) => m.art === 'MUSS').length, soll: meldungen.filter((m) => m.art === 'SOLL').length };
}

/** Kurztext für die Leiste: „Prüfer: 2 MUSS · 1 SOLL“ bzw. „Prüfer: ✓ in Ordnung“. */
export const zusammenfassung = (r) => (r.muss || r.soll ? `Prüfer: ${r.muss} MUSS · ${r.soll} SOLL` : 'Prüfer: ✓ in Ordnung');
