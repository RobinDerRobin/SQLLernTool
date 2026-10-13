// Varianten (Stufe 10): mehrere Fassungen eines Gebiets (Dateien, z. B. von der KI erzeugt) nebeneinander ansehen und eine übernehmen.
// Reine Rechnung – kein DOM, läuft auch unter Node. Varianten sind nur Ansicht: sie liegen nicht in state.gebiete und nicht in welt.json,
// ändern also nie Daten, bis „Übernehmen“ gedrückt wird (das ist ein normaler, rückgängig zu machender Schritt).
import { ladeGebiet, pruefeFormat, kopie, ausdehnung } from './daten.js';
import { pruefeGebiet } from './pruefer.js';
import { MAX_VARIANTEN } from './konstanten.js';

/** JSON mit sortierten Schlüsseln: Schlüsselreihenfolge in der Datei zählt nicht als Unterschied. */
const stabil = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));

const ARTEN = [
  ['knoten', 'Knoten'],
  ['gaenge', 'Gänge'],
  ['formteile', 'Formteile'],
  ['objekte', 'Objekte'],
  ['notizen', 'Notizen'],
];

/** Zählung und Prüferstand eines Gebiets für die Kachel: { knoten, gaenge, formteile, objekte, gegner, notizen, muss, soll }. */
export function kennzahlen(g) {
  const p = pruefeGebiet(g);
  return {
    knoten: g.knoten.length,
    gaenge: g.gaenge.length,
    formteile: g.formteile.length,
    objekte: g.objekte.filter((o) => o.typ !== 'gegner').length,
    gegner: g.objekte.filter((o) => o.typ === 'gegner').length,
    notizen: g.notizen.length,
    muss: p.muss,
    soll: p.soll,
  };
}

/** Eine Variante aus Dateitext laden: { id, name, datei, gebiet, kennzahlen }. Wirft bei ungültiger Datei einen Error mit verständlicher Meldung. */
export function ladeVariante(text, datei, nummer) {
  const gebiet = ladeGebiet(text);
  return { id: `v${nummer}`, name: datei.replace(/\.json$/i, ''), datei, gebiet, kennzahlen: kennzahlen(gebiet) };
}

/**
 * Was ist anders als im aktuellen Gebiet? Je Art (Knoten, Gänge, Formteile, Objekte, Notizen) nach ID: neu (nur in der Variante),
 * weg (nur im aktuellen), anders (gleiche ID, andere Daten). Dazu `gleich` = nichts unterscheidet sich (Name, ID und Tileset zählen mit,
 * außer ID und Name: die behält das aktuelle Gebiet beim Übernehmen).
 */
export function unterschied(aktuell, variante) {
  const u = { arten: {}, tileset: aktuell.tileset !== variante.tileset, bereich: stabil(aktuell.bereich) !== stabil(variante.bereich), reihenfolge: [], gleich: true };
  for (const [feld, name] of ARTEN) {
    const a = new Map(aktuell[feld].map((d) => [d.id, stabil(d)]));
    const b = new Map(variante[feld].map((d) => [d.id, stabil(d)]));
    const neu = [...b.keys()].filter((id) => !a.has(id));
    const weg = [...a.keys()].filter((id) => !b.has(id));
    const anders = [...b.keys()].filter((id) => a.has(id) && a.get(id) !== b.get(id));
    u.arten[feld] = { neu, weg, anders };
    // gleiche Dinge in anderer Reihenfolge: die Reihenfolge der Gänge ist die Levelreihenfolge
    if (!neu.length && !weg.length && [...a.keys()].join('\u0000') !== [...b.keys()].join('\u0000')) u.reihenfolge.push(name);
  }
  // alles, was beim Übernehmen mitkäme (auch unbekannte Felder), muss „gleich“ mitbestimmen – id und name behält das aktuelle Gebiet
  const ohne = (g) => stabil({ ...g, id: null, name: null });
  u.gleich = ohne(aktuell) === ohne(variante);
  return u;
}

/** Kurztext zum Unterschied, z. B. „+2 Gänge, −1 Knoten, 3 geändert“ oder „identisch“. */
export function unterschiedText(u) {
  const teile = [];
  let anders = 0;
  for (const [feld, name] of ARTEN) {
    const x = u.arten[feld];
    if (x.neu.length) teile.push(`+${x.neu.length} ${name}`);
    if (x.weg.length) teile.push(`−${x.weg.length} ${name}`);
    anders += x.anders.length;
  }
  if (anders) teile.push(`${anders} geändert`);
  for (const n of u.reihenfolge) teile.push(`andere Reihenfolge der ${n}`);
  if (u.tileset) teile.push('anderes Tileset');
  if (u.bereich) teile.push('anderer Bereich');
  return teile.length ? teile.join(', ') : u.gleich ? 'identisch' : 'weitere Felder anders';
}

/**
 * Das aktuelle Gebiet wird zum Inhalt der Variante. ID und Name des aktuellen Gebiets bleiben (die Datei und die Bezeichnungen hängen daran).
 * Ändert `g` an Ort und Stelle; wirft einen Error, wenn das Ergebnis kein gültiges Gebiet wäre (dann ist `g` unverändert).
 */
export function uebernehmeVariante(g, variante) {
  const neu = { ...kopie(variante), id: g.id, name: g.name };
  const fehler = pruefeFormat(neu);
  if (fehler.length) throw new Error('Die Variante ergäbe kein gültiges Gebiet:\n- ' + fehler.join('\n- '));
  for (const k of Object.keys(g)) delete g[k];
  Object.assign(g, neu);
  return true;
}

/** Variante in die Liste aufnehmen (höchstens MAX_VARIANTEN). Gibt die neue Liste zurück oder wirft einen Error. */
export function nimmAuf(liste, text, datei, zaehler) {
  if (liste.length >= MAX_VARIANTEN) throw new Error(`Höchstens ${MAX_VARIANTEN} Varianten nebeneinander – erst eine entfernen.`);
  return [...liste, ladeVariante(text, datei, zaehler)];
}

/** Ausdehnung zum Einpassen der Kachelvorschau (leeres Gebiet: kleiner Standardausschnitt). */
export const vorschauRahmen = (g) => ausdehnung(g);
