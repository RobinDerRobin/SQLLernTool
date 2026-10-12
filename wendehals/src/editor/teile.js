// Teile im Gang: Formteile (Boden), Wände und Hindernisse (Objekte mit Maßen). Setzen, Ziehen, Verschieben, Drehen, Kopieren,
// Löschen, Eigenschaften. Reine Datenänderung auf dem übergebenen Gebiet (kein DOM, läuft auch unter Node) – Rückgängig macht main.js.
// Alles rastet: Lage auf RASTER (20 E), Winkel auf 45°. Ein Teil ist { art: 'formteil'|'objekt', id }.
import { MAX_KOORD, RASTER, MIN_TEIL, WINKEL_SCHRITT, TEIL_STANDARD, KOPIE_VERSATZ } from './konstanten.js';
import { OBJEKTTYPEN } from './katalog.js';
import { rechteck, punktInPolygon } from './daten.js';
import { neueId, rasterEnde } from './befehle.js';
import { headingAngle } from '../core/math.js';

const GEGNER_RADIUS = 14; // Trefferradius eines Gegner-Platzhalters (E), wie in zeichnen.js
const rund = (v, r = 1) => Math.round(v / r) * r + 0; // + 0 macht aus -0 eine 0
/** Winkel einer Richtung (0..7 aus math.js) in ganzen Grad. */
const grad = (richtung) => Math.round(headingAngle(richtung) * (180 / Math.PI));
const sauber = (v) => Math.round(v * 1000) / 1000 + 0;

/** Sorten, die das Editor-Werkzeug setzen kann (Schlüssel = Werkzeug-ID). */
export const TEILSORTEN = {
  formteil: { art: 'formteil', name: 'Formteil', praefix: 'f' },
  wand: { art: 'objekt', typ: 'wand', name: 'Wand', praefix: 'o' },
  hindernis: { art: 'objekt', typ: 'hindernis', name: 'Hindernis', praefix: 'o' },
};

export const istTeilArt = (art) => art === 'formteil' || art === 'objekt';
export const liste = (g, art) => (art === 'formteil' ? g.formteile : g.objekte);
export const teilFinden = (g, art, id) => liste(g, art).find((o) => o.id === id);
/** Hat das Teil Länge, Breite und Winkel (alles außer Gegner-Platzhaltern)? */
export const hatMasse = (art, o) => art === 'formteil' || !!OBJEKTTYPEN[o.typ]?.hatMasse;
/** Name für Meldungen und die Eigenschaftenliste. */
export const teilName = (art, o) => (art === 'formteil' ? 'Formteil' : OBJEKTTYPEN[o.typ]?.name ?? 'Objekt');

/** Winkel auf [0, 180): ein Rechteck sieht nach 180° wieder gleich aus. */
const winkelNorm = (w) => (((w % 180) + 180) % 180) + 0;

/** Eckpunkte des Teils (nur mit Maßen). */
export const teilEcken = (o) => rechteck(o.x, o.y, o.laenge, o.breite, o.winkel);

/**
 * Oberstes Teil unter dem Weltpunkt (x, y), `tol` E Zuschlag rundum (für dünne Wände). Objekte liegen über Formteilen, später
 * Gesetztes über früher Gesetztem. Gibt { art, id } oder null.
 */
export function teilBei(g, x, y, tol = 0) {
  for (let i = g.objekte.length - 1; i >= 0; i--) {
    const o = g.objekte[i];
    if (hatMasse('objekt', o)) {
      if (punktInPolygon(x, y, rechteck(o.x, o.y, o.laenge + 2 * tol, o.breite + 2 * tol, o.winkel))) return { art: 'objekt', id: o.id };
    } else if (Math.hypot(x - o.x, y - o.y) <= GEGNER_RADIUS + tol) return { art: 'objekt', id: o.id };
  }
  for (let i = g.formteile.length - 1; i >= 0; i--) {
    const f = g.formteile[i];
    if (punktInPolygon(x, y, rechteck(f.x, f.y, f.laenge, f.breite, f.winkel))) return { art: 'formteil', id: f.id };
  }
  return null;
}

function anlegen(g, sorte, x, y, laenge, breite, winkel) {
  const s = TEILSORTEN[sorte];
  const o = { id: neueId(g, s.praefix), ...(s.typ ? { typ: s.typ } : {}), x: sauber(x), y: sauber(y), laenge, breite, winkel: winkelNorm(winkel) };
  liste(g, s.art).push(o);
  return { art: s.art, id: o.id };
}

/**
 * Setzt ein Teil der Sorte `sorte` ('formteil'|'wand'|'hindernis'). Zug von (sx, sy) nach (ex, ey): rastet auf 8 Richtungen und
 * 20 E, das Teil liegt zwischen Anfang und Ende. Ohne nennenswerten Zug (Klick) entsteht ein Teil in Standardgröße um den Punkt.
 * Gibt { art, id } zurück.
 */
export function teilSetzen(g, sorte, sx, sy, ex = sx, ey = sy) {
  const std = TEIL_STANDARD[sorte];
  const a = { x: rund(sx, RASTER), y: rund(sy, RASTER) };
  const z = rasterEnde(a, ex, ey);
  if (z.schritte < 1) return anlegen(g, sorte, a.x, a.y, std.laenge, std.breite, 0);
  const laenge = Math.hypot(z.x - a.x, z.y - a.y);
  return anlegen(g, sorte, (a.x + z.x) / 2, (a.y + z.y) / 2, sauber(laenge), std.breite, grad(z.richtung));
}

/** Wo läge das Teil beim Setzen? Ändert keine Daten (Vorschau): { x, y, laenge, breite, winkel }. */
export function teilEntwurf(sorte, sx, sy, ex = sx, ey = sy) {
  const std = TEIL_STANDARD[sorte];
  const a = { x: rund(sx, RASTER), y: rund(sy, RASTER) };
  const z = rasterEnde(a, ex, ey);
  if (z.schritte < 1) return { x: a.x, y: a.y, laenge: std.laenge, breite: std.breite, winkel: 0 };
  return { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2, laenge: sauber(Math.hypot(z.x - a.x, z.y - a.y)), breite: std.breite, winkel: winkelNorm(grad(z.richtung)) };
}

/** Verschiebt ein Teil (Mitte rastet auf RASTER). false: nichts geändert (gleiche Stelle, unbekannt, zu weit draußen). */
export function teilVerschieben(g, art, id, x, y) {
  const o = teilFinden(g, art, id);
  if (!o) return false;
  const nx = rund(x, RASTER);
  const ny = rund(y, RASTER);
  if (Math.abs(nx) > MAX_KOORD || Math.abs(ny) > MAX_KOORD || (nx === o.x && ny === o.y)) return false;
  o.x = nx;
  o.y = ny;
  return true;
}

/** Dreht ein Teil um k·45° (k > 0 rechtsherum, wie die Uhr). false: Teil gibt es nicht oder hat keinen Winkel. */
export function teilDrehen(g, art, id, k = 1) {
  const o = teilFinden(g, art, id);
  if (!o || !hatMasse(art, o)) return false;
  o.winkel = winkelNorm(o.winkel + k * WINKEL_SCHRITT);
  return true;
}

/** Kopie eines Teils zum Einfügen (unabhängig vom Gebiet). */
export function teilMerken(g, art, id) {
  const o = teilFinden(g, art, id);
  return o ? { art, teil: JSON.parse(JSON.stringify(o)) } : null;
}

/** Fügt eine gemerkte Kopie ein: Mitte bei (x, y) im Raster, ohne Stelle um KOPIE_VERSATZ versetzt. Neue ID, sonst gleiche Daten. */
export function teilEinfuegen(g, gemerkt, x = null, y = null) {
  if (!gemerkt) return null;
  const o = JSON.parse(JSON.stringify(gemerkt.teil));
  o.id = neueId(g, gemerkt.art === 'formteil' ? 'f' : 'o');
  o.x = x == null ? sauber(o.x + KOPIE_VERSATZ) : rund(x, RASTER);
  o.y = y == null ? sauber(o.y + KOPIE_VERSATZ) : rund(y, RASTER);
  liste(g, gemerkt.art).push(o);
  return { art: gemerkt.art, id: o.id };
}

/** Kopiert ein Teil im Gebiet (Duplizieren). */
export const teilKopieren = (g, art, id) => teilEinfuegen(g, teilMerken(g, art, id));

/** Löscht ein Teil. Gibt die entfernten IDs zurück (leer: gab es nicht). */
export function loescheTeil(g, art, id) {
  const l = liste(g, art);
  const i = l.findIndex((o) => o.id === id);
  if (i < 0) return [];
  l.splice(i, 1);
  return [id];
}

/**
 * Ändert ein Feld eines Teils: x, y, laenge, breite, winkel. null = geklappt, sonst eine verständliche Meldung (nichts geändert).
 */
export function setzeTeil(g, art, id, feld, wert) {
  const o = teilFinden(g, art, id);
  if (!o) return `Teil „${id}“ gibt es nicht.`;
  const text = String(wert).trim();
  const zahl = typeof wert === 'number' ? wert : text === '' ? NaN : Number(text.replace(',', '.'));
  if (!['x', 'y', 'laenge', 'breite', 'winkel'].includes(feld)) return `Feld „${feld}“ eines Teils lässt sich nicht ändern.`;
  if (!Number.isFinite(zahl)) return 'Bitte eine Zahl eingeben.';
  if (feld !== 'winkel' && Math.abs(zahl) > MAX_KOORD) return `Zahlen über ${MAX_KOORD} E sind nicht erlaubt.`;
  if (feld !== 'x' && feld !== 'y' && !hatMasse(art, o)) return `${teilName(art, o)} hat keine Länge, Breite und keinen Winkel.`;
  if (feld === 'laenge' || feld === 'breite') {
    if (zahl < MIN_TEIL) return `${feld === 'laenge' ? 'Die Länge' : 'Die Breite'} muss mindestens ${MIN_TEIL} E sein.`;
    o[feld] = rund(zahl);
  } else if (feld === 'winkel') {
    if (Math.abs(zahl / WINKEL_SCHRITT - Math.round(zahl / WINKEL_SCHRITT)) > 1e-6) return `Der Winkel muss ein Vielfaches von ${WINKEL_SCHRITT}° sein.`;
    o.winkel = winkelNorm(Math.round(zahl));
  } else o[feld] = rund(zahl);
  return null;
}

/** Alle Teile mit Lage, für Prüfer und Zeichnen: [{ art, o }] – Formteile zuerst, dann Objekte. */
export const alleTeile = (g) => [...g.formteile.map((o) => ({ art: 'formteil', o })), ...g.objekte.map((o) => ({ art: 'objekt', o }))];
