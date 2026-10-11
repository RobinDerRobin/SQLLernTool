// Datenmodell des Editors: Gebiet laden/prüfen/formatieren, Geometrie von Gängen, Knoten und Formteilen.
// Reine Daten und Geometrie – kein DOM, läuft auch unter Node (Tests). Einheiten E, x nach Osten, y nach Süden, Winkel in Grad.
import { HEADINGS, DIR_VEC, headingAngle, HEADING_CODES, DIR_NAMES } from '../core/math.js';
import { FORMAT, SCREEN_W, SCREEN_H, SPEED, WINKEL_SCHRITT, VERLAUF_MAX } from './konstanten.js';
import { KNOTENTYPEN, OBJEKTTYPEN, TILESETS } from './katalog.js';

export const GEBIET_ID = /^(?!(?:con|prn|aux|nul|com\d|lpt\d)$)[a-z0-9][a-z0-9_-]*$/; // gültiger Dateiname (auch unter Windows)
const EPS = 1e-6;
const RAD = Math.PI / 180;

/** Feste Schlüsselreihenfolge je Teil – damit Diffs der Leveldateien lesbar bleiben. Unbekannte Schlüssel kommen danach, sortiert. */
export const SCHLUESSEL = {
  gebiet: ['format', 'id', 'name', 'tileset', 'bereich', 'knoten', 'gaenge', 'formteile', 'objekte', 'notizen'],
  bereich: ['x0', 'y0', 'x1', 'y1'],
  knoten: ['id', 'typ', 'form', 'x', 'y', 'w', 'h', 'seite'],
  gang: ['id', 'name', 'von', 'nach', 'breite'],
  formteil: ['id', 'x', 'y', 'laenge', 'breite', 'winkel'],
  objekt: ['id', 'typ', 'art', 'x', 'y', 'laenge', 'breite', 'winkel', 'platzhalter'],
  notiz: ['id', 'x', 'y', 'text'],
};
const LISTEN = { knoten: 'knoten', gaenge: 'gang', formteile: 'formteil', objekte: 'objekt', notizen: 'notiz' };

const ordne = (obj, reihenfolge) => {
  const out = {};
  for (const k of reihenfolge) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj).sort()) if (!(k in out)) out[k] = obj[k];
  return out;
};
const einzeilig = (obj) => '{ ' + Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }';

/** Gebiet als Text: 2 Leerzeichen, feste Schlüsselreihenfolge, jedes Listenelement in einer Zeile. */
export function formatiere(gebiet) {
  const g = ordne(gebiet, SCHLUESSEL.gebiet);
  const zeilen = [];
  for (const [k, v] of Object.entries(g)) {
    if (LISTEN[k]) {
      const items = v.map((o) => '    ' + einzeilig(ordne(o, SCHLUESSEL[LISTEN[k]])));
      zeilen.push(items.length ? `  ${JSON.stringify(k)}: [\n${items.join(',\n')}\n  ]` : `  ${JSON.stringify(k)}: []`);
    } else if (k === 'bereich') zeilen.push(`  "bereich": ${einzeilig(ordne(v, SCHLUESSEL.bereich))}`);
    else zeilen.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  }
  return `{\n${zeilen.join(',\n')}\n}\n`;
}

export const kopie = (g) => JSON.parse(JSON.stringify(g));

/** Prüft die Form einer Gebietsdatei (nicht die Spielregeln – das macht regeln.js). Gibt verständliche Meldungen zurück. */
export function pruefeFormat(g) {
  const fehler = [];
  const f = (t) => fehler.push(t);
  if (!g || typeof g !== 'object' || Array.isArray(g)) return ['Die Datei enthält kein Gebiet (Objekt erwartet).'];
  if (g.format !== FORMAT) f(`Format ${JSON.stringify(g.format)} wird nicht unterstützt (erwartet: ${FORMAT}).`);
  for (const k of ['id', 'name', 'tileset']) if (typeof g[k] !== 'string' || !g[k]) f(`Feld „${k}“ fehlt oder ist kein Text.`);
  if (typeof g.id === 'string' && g.id && !GEBIET_ID.test(g.id)) f(`Die Gebiets-ID „${g.id}“ darf nur Kleinbuchstaben, Ziffern, „-“ und „_“ enthalten (sie ist der Dateiname).`);
  for (const k of Object.keys(LISTEN)) if (!Array.isArray(g[k])) f(`Liste „${k}“ fehlt.`);
  const zahl0 = (v) => typeof v === 'number' && Number.isFinite(v);
  const b = g.bereich;
  if (!b || typeof b !== 'object' || !['x0', 'y0', 'x1', 'y1'].every((k) => zahl0(b[k]))) f('Feld „bereich“ braucht x0, y0, x1, y1 als Zahlen.');
  if (typeof g.tileset === 'string' && !Object.hasOwn(TILESETS, g.tileset)) f(`Unbekanntes Tileset „${g.tileset}“.`);
  if (fehler.length) return fehler;
  const zahl = (v) => typeof v === 'number' && Number.isFinite(v);
  const ids = new Set();
  for (const [liste, art] of Object.entries(LISTEN)) {
    g[liste].forEach((o, i) => {
      const wo = `${liste}[${i}]`;
      if (!o || typeof o !== 'object') return f(`${wo} ist kein Objekt.`);
      if (typeof o.id !== 'string' || !o.id) f(`${wo}: Feld „id“ fehlt.`);
      else if (ids.has(o.id)) f(`${wo}: ID „${o.id}“ kommt doppelt vor.`);
      else ids.add(o.id);
      const zahlen = { knoten: ['x', 'y'], gang: ['breite'], formteil: ['x', 'y', 'laenge', 'breite', 'winkel'], objekt: ['x', 'y'], notiz: ['x', 'y'] }[art];
      for (const k of zahlen) if (!zahl(o[k])) f(`${wo} (${o.id}): „${k}“ ist keine Zahl.`);
      if (art === 'knoten' && !Object.hasOwn(KNOTENTYPEN, o.typ)) f(`${wo} (${o.id}): unbekannter Knotentyp „${o.typ}“.`);
      if (art === 'knoten' && KNOTENTYPEN[o.typ]?.hatMasse && !(o.w > 0 && o.h > 0)) f(`${wo} (${o.id}): ${KNOTENTYPEN[o.typ].name} braucht Maße w und h (> 0).`);
      if (art === 'knoten' && o.form === 'achteck' && !(o.seite > 0)) f(`${wo} (${o.id}): Achteck braucht „seite“ (> 0).`);
      if (art === 'gang' && !(o.breite > 0)) f(`${wo} (${o.id}): Breite muss größer als 0 sein.`);
      if (art === 'notiz' && typeof o.text !== 'string') f(`${wo} (${o.id}): „text“ muss Text sein.`);
      if (art === 'objekt' && !Object.hasOwn(OBJEKTTYPEN, o.typ)) f(`${wo} (${o.id}): unbekannter Objekttyp „${o.typ}“.`);
      if (art === 'objekt' && OBJEKTTYPEN[o.typ]?.hatMasse) for (const k of ['laenge', 'breite', 'winkel']) if (!zahl(o[k])) f(`${wo} (${o.id}): „${k}“ ist keine Zahl.`);
      if (art === 'gang') for (const k of ['von', 'nach']) if (typeof o[k] !== 'string') f(`${wo} (${o.id}): „${k}“ fehlt.`);
      if ((art === 'formteil' || (art === 'objekt' && OBJEKTTYPEN[o.typ]?.hatMasse)) && zahl(o.winkel) && Math.abs(o.winkel / WINKEL_SCHRITT - Math.round(o.winkel / WINKEL_SCHRITT)) > EPS) {
        f(`${wo} (${o.id}): Winkel ${o.winkel}° liegt nicht im ${WINKEL_SCHRITT}°-Raster.`);
      }
    });
  }
  const knoten = new Set(g.knoten.map((k) => k.id));
  for (const gg of g.gaenge) if (gg.von === gg.nach) f(`Gang ${gg.id}: Anfang und Ende sind derselbe Knoten.`);
  for (const gg of g.gaenge) for (const k of ['von', 'nach']) if (typeof gg[k] === 'string' && !knoten.has(gg[k])) f(`Gang ${gg.id}: Knoten „${gg[k]}“ gibt es nicht.`);
  return fehler;
}

/** Text → Gebiet. Wirft einen Error mit verständlicher Meldung (die Oberfläche zeigt sie an, der alte Stand bleibt). */
export function ladeGebiet(text) {
  let g;
  try {
    g = JSON.parse(text);
  } catch (e) {
    throw new Error('Die Datei ist kein gültiges JSON: ' + e.message);
  }
  const fehler = pruefeFormat(g);
  if (fehler.length) throw new Error('Die Datei passt nicht zum Format:\n- ' + fehler.join('\n- '));
  return g;
}

// ------------------------------------------------------------------ Geometrie

/** Richtung (Index 0..7 aus math.js) eines Vektors, wenn er im 45°-Raster liegt, sonst -1. */
export function richtungVon(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len < EPS) return -1;
  for (const h of HEADINGS) {
    const [vx, vy] = DIR_VEC[h];
    const l = Math.hypot(vx, vy);
    if (Math.abs((dx * vy - dy * vx) / (len * l)) < 1e-6 && dx * vx + dy * vy > 0) return h;
  }
  return -1;
}

export const knotenMap = (g) => new Map(g.knoten.map((k) => [k.id, k]));

/** Maße eines Gangs: Anfang, Ende, Länge, Einheitsvektor, Richtung (0..7 oder -1), Bildschirme und Sekunden Flug. */
export function gangMasse(g, gang, km = knotenMap(g)) {
  const a = km.get(gang.von);
  const b = km.get(gang.nach);
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const laenge = Math.hypot(dx, dy);
  const richtung = richtungVon(dx, dy);
  return {
    a: { x: a.x, y: a.y },
    b: { x: b.x, y: b.y },
    laenge,
    ux: laenge ? dx / laenge : 1,
    uy: laenge ? dy / laenge : 0,
    richtung,
    richtungName: richtung >= 0 ? DIR_NAMES[richtung] : null,
    code: richtung >= 0 ? HEADING_CODES[richtung] : null,
    bildschirme: laenge / SCREEN_W,
    sekunden: laenge / SPEED,
  };
}

/** Punkt auf dem Gang bei Stelle s (E ab Gang-Anfang). */
export const gangPunkt = (m, s) => ({ x: m.a.x + m.ux * s, y: m.a.y + m.uy * s });

/** Drehbares Rechteck (Mitte x,y; laenge entlang winkel, breite quer) als Eckpunkte. */
export function rechteck(x, y, laenge, breite, winkelGrad = 0) {
  const w = winkelGrad * RAD;
  const c = Math.cos(w);
  const s = Math.sin(w);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => {
    const lx = (i * laenge) / 2;
    const ly = (j * breite) / 2;
    return [x + lx * c - ly * s, y + lx * s + ly * c];
  });
}

/** Regelmäßiges Achteck mit Seitenlänge `seite` um (x,y); Seiten stehen senkrecht zu den 8 Richtungen. */
export function achteck(x, y, seite) {
  const apo = (seite / 2) * (1 + Math.SQRT2);
  const r = apo / Math.cos(Math.PI / 8);
  return HEADINGS.map((h) => {
    const w = headingAngle(h) + Math.PI / 8;
    return [x + r * Math.cos(w), y + r * Math.sin(w)];
  });
}

/** Eckpunkte des Gangbodens (Rechteck von Knoten zu Knoten, volle Breite). */
export function gangPolygon(g, gang, km = knotenMap(g)) {
  const m = gangMasse(g, gang, km);
  if (!m || m.laenge < EPS) return null;
  const nx = -m.uy * (gang.breite / 2);
  const ny = m.ux * (gang.breite / 2);
  return [[m.a.x + nx, m.a.y + ny], [m.b.x + nx, m.b.y + ny], [m.b.x - nx, m.b.y - ny], [m.a.x - nx, m.a.y - ny]];
}

/** Boden eines Knotens: mit Maßen (Raum, Boss, Kreuzungsquadrat) ein achsenparalleles Rechteck, `form: "achteck"` ein Achteck, sonst nichts. */
export function knotenPolygon(k) {
  if (k.w && k.h) return rechteck(k.x, k.y, k.w, k.h, 0);
  if (k.form === 'achteck') return achteck(k.x, k.y, k.seite);
  return null;
}

/** Gleicher Umlaufsinn für alle Polygone: Beim Füllen vieler sich überlappender Flächen in einem Pfad würden sich sonst
 *  gegenläufige Umrisse aufheben (Loch im Boden, Nullregel). */
export function ausrichten(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a < 0 ? poly.slice().reverse() : poly;
}

/** Alle Boden-Polygone: Gänge, Knotenformen und Formteile (zählen als Boden). */
export function bodenPolygone(g) {
  const km = knotenMap(g);
  const out = [];
  for (const gang of g.gaenge) {
    const p = gangPolygon(g, gang, km);
    if (p) out.push(ausrichten(p));
  }
  for (const k of g.knoten) {
    const p = knotenPolygon(k);
    if (p) out.push(ausrichten(p));
  }
  for (const f of g.formteile) out.push(ausrichten(rechteck(f.x, f.y, f.laenge, f.breite, f.winkel)));
  return out;
}

/** Wand-Polygone (schneiden den Boden aus). */
export const wandPolygone = (g) => g.objekte.filter((o) => o.typ === 'wand').map((o) => ausrichten(rechteck(o.x, o.y, o.laenge, o.breite, o.winkel)));

export function punktInPolygon(px, py, poly) {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Ist an dieser Stelle Boden (ohne Wandobjekte)? `polys` = bodenPolygone(g), wenn mehrfach gefragt wird. */
export const istBoden = (px, py, polys) => polys.some((p) => punktInPolygon(px, py, p));

/** Gebiet-Ausdehnung (alle Boden-Polygone), für „alles zeigen“. */
export function ausdehnung(g) {
  const pts = bodenPolygone(g).flat();
  if (!pts.length) return { x0: -480, y0: -270, x1: 480, y1: 270 };
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    x1: Math.max(...pts.map((p) => p[0])),
    y1: Math.max(...pts.map((p) => p[1])),
  };
}

/** Bezeichnung für Claude Code (Brief Abschnitt 1): Gang `Wendehals-Level <gebiet>/<gang>@<stelle>`, Knoten `<gebiet>/<knoten>`. */
export const bezeichnung = (g, ziel, stelle = null) =>
  ziel.art === 'knoten' ? `Wendehals-Level ${g.id}/${ziel.id}` : `Wendehals-Level ${g.id}/${ziel.id}${stelle == null ? '' : '@' + Math.round(stelle)}`;

/** Die vier Ecken des Bildschirmrahmens (480 × 270 E) bei Stelle s auf dem Gang; der Rahmen liegt in Flugrichtung des Gangs. */
export function rahmenEcken(m, s, breite = SCREEN_W, hoehe = SCREEN_H) {
  const p = gangPunkt(m, s);
  const qx = -m.uy;
  const qy = m.ux;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [
    p.x + m.ux * (i * breite) / 2 + qx * (j * hoehe) / 2,
    p.y + m.uy * (i * breite) / 2 + qy * (j * hoehe) / 2,
  ]);
}

// ------------------------------------------------------------------ Rückgängig / Wiederholen (Schnappschüsse als Text)

/** Verlauf eines Gebiets: speichert den Zustand VOR jeder Änderung als Text. Rückgängig/Wiederholen stellen den Zustand exakt her. */
export class Verlauf {
  constructor(max = VERLAUF_MAX) {
    this.max = max;
    this.zurueck = [];
    this.vor = [];
  }

  /** Vor einer Änderung aufrufen (`vorher` = Zustand als Text). Löscht die Wiederholen-Liste. */
  merke(vorher) {
    this.zurueck.push(vorher);
    if (this.zurueck.length > this.max) this.zurueck.shift();
    this.vor = [];
  }

  /** Gibt den vorigen Zustand zurück (oder null) und merkt `aktuell` zum Wiederholen. */
  rueckgaengig(aktuell) {
    if (!this.zurueck.length) return null;
    this.vor.push(aktuell);
    return this.zurueck.pop();
  }

  wiederholen(aktuell) {
    if (!this.vor.length) return null;
    this.zurueck.push(aktuell);
    return this.vor.pop();
  }

  get kannZurueck() {
    return this.zurueck.length > 0;
  }

  get kannVor() {
    return this.vor.length > 0;
  }
}

/** Welt-Datei (Liste der Gebiete) als Text: ein Gebiet pro Zeile. */
export function formatiereWelt(welt) {
  const gebiete = welt.gebiete.map((g) => '    ' + einzeilig(ordne(g, ['id', 'name', 'datei'])));
  const andere = Object.keys(welt).filter((k) => k !== 'format' && k !== 'gebiete'); // weitere Schlüssel (später: Lage) gehen nicht verloren
  const zeilen = [`  "format": ${JSON.stringify(welt.format)}`, ...andere.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(welt[k])}`), `  "gebiete": [\n${gebiete.join(',\n')}\n  ]`];
  return `{\n${zeilen.join(',\n')}\n}\n`;
}
