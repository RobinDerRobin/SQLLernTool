// Katalog: Objekttypen, Knotentypen, Tilesets, Gegner-Platzhalter, Schloss-Platz. Neue Typen kommen hierher (Brief Abschnitt 3);
// Zeichnen und Prüfen lesen nur aus dieser Tabelle.
import { THEMES } from '../data/themes.js';

/** Knotentypen. `ende` (Sackgasse) ist eine Ergänzung des Editors, damit jeder Gangabschnitt zwei Knoten hat. */
export const KNOTENTYPEN = {
  speicher: { name: 'Speicherort', farbe: 'knoten.speicher' },
  kreuzung: { name: 'Kreuzung', farbe: 'knoten.kreuzung' },
  raum: { name: 'Raum / Arena', farbe: 'knoten.raum', hatMasse: true },
  boss: { name: 'Boss', farbe: 'knoten.boss', hatMasse: true },
  ende: { name: 'Gangende', farbe: 'knoten.ende' },
};

/** Objekttypen im Gang. `boden: false` = schneidet den Boden aus (Wand), `true` = Boden (Formteil läuft getrennt). */
export const OBJEKTTYPEN = {
  wand: { name: 'Wand', hatMasse: true },
  hindernis: { name: 'Hindernis', hatMasse: true },
  gegner: { name: 'Gegner (Platzhalter)', platzhalter: true },
};

/** Gegner-Platzhalter aus den v0.2-Gegnern (Verhalten im Fenster ungeprüft, Paket 10 „Druck“). */
export const GEGNER = ['ente', 'seife', 'nilpferd', 'socke', 'toast', 'brezel', 'ei', 'bohne', 'zwerg', 'gebiss', 'glas'];

/** Tilesets = Aussehen eines Gebiets; Platzhalter aus den v0.2-Themen, bis das Setting steht. */
export const TILESETS = Object.fromEntries(Object.entries(THEMES).map(([id, t]) => [id, { name: t.name, pool: t.pool, theme: t }]));

/** Farben des Spielbilds je Tileset (Look „Tileset“): Boden, Schachbrett, Wand, Hindernis. Quelle: Terrainfarben des v0.2-Themas. */
export function tilesetFarben(id) {
  const t = TILESETS[id]?.theme?.terrain;
  if (!t) return null;
  return { boden: t.solid, boden2: t.light, wand: t.edge, hindernis: t.brk };
}

/** Gegner, die ein Tileset „mitbringt“ (Pool des Themas), zuerst; danach alle übrigen. */
export function gegnerFuer(tilesetId) {
  const pool = TILESETS[tilesetId]?.pool ?? [];
  return [...pool.filter((a) => GEGNER.includes(a)), ...GEGNER.filter((a) => !pool.includes(a))];
}

/** Schlösser: allgemeiner Platz an Arm/Übergang. Typen kommen je Feature; bis dahin nur ausgegraut (Brief Abschnitt 1). */
export const SCHLOSSTYPEN = [{ id: 'platz', name: 'Schloss (Typ folgt je Feature)', aktiv: false }];
