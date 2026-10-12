// Auswahl mehrerer Dinge (A4): Rahmen, alles wählen, gemeinsam verschieben, kopieren/einfügen, löschen, drehen. Reine Datenänderung auf dem
// übergebenen Gebiet (kein DOM, läuft auch unter Node) – Rückgängig macht main.js über den Verlauf. Ein Ding ist { art, id } mit
// art 'knoten' | 'gang' | 'formteil' | 'objekt' (Wand, Hindernis, Gegner) | 'notiz'.
import { MAX_KOORD, RASTER, KNOTENRASTER, GEGNER_RADIUS, KOPIE_VERSATZ, MIN_GANG_LAENGE } from './konstanten.js';
import { knotenMap, gangMasse, gangPolygon, knotenPolygon, rechteck } from './daten.js';
import { ueberlappen } from './level.js';
import { ebeneVon } from './ebenen.js';
import { liste as teilListe, teilFinden, hatMasse, teilEcken, teilDrehen, loescheTeil, praefixVon } from './teile.js';
import { neueId, loesche } from './befehle.js';

const rund = (v, r) => Math.round(v / r) * r + 0;
const sauber = (v) => Math.round(v * 1000) / 1000 + 0;
const kopieVon = (o) => JSON.parse(JSON.stringify(o));

export const gleichesDing = (a, b) => a.art === b.art && a.id === b.id;
export const istTeil = (d) => d.art === 'formteil' || d.art === 'objekt' || d.art === 'notiz';

/** Das Ding im Gebiet (oder undefined). */
export function dingFinden(g, d) {
  if (d.art === 'knoten') return g.knoten.find((x) => x.id === d.id);
  if (d.art === 'gang') return g.gaenge.find((x) => x.id === d.id);
  return teilFinden(g, d.art, d.id);
}

/** Ebene eines Dings (für gesperrte Ebenen). */
const ebeneDes = (g, d) => ebeneVon(d.art, d.art === 'objekt' ? dingFinden(g, d) : null);

/** Umriss als Polygon (Gegner: Quadrat um den Trefferradius); Knoten ohne Fläche: null. */
export function polygonVon(g, d) {
  const o = dingFinden(g, d);
  if (!o) return null;
  if (d.art === 'knoten') return knotenPolygon(o);
  if (d.art === 'gang') return gangPolygon(g, o);
  if (hatMasse(d.art, o)) return teilEcken(o);
  return rechteck(o.x, o.y, 2 * GEGNER_RADIUS, 2 * GEGNER_RADIUS, 0);
}

/** Alle Dinge des Gebiets, außer denen in gesperrten Ebenen (`gesperrt` = Set von Ebenen-IDs). */
export function alleDinge(g, gesperrt = new Set()) {
  const out = [];
  for (const k of g.knoten) out.push({ art: 'knoten', id: k.id });
  for (const x of g.gaenge) out.push({ art: 'gang', id: x.id });
  for (const f of g.formteile) out.push({ art: 'formteil', id: f.id });
  for (const o of g.objekte) out.push({ art: 'objekt', id: o.id });
  for (const n of g.notizen) out.push({ art: 'notiz', id: n.id });
  return out.filter((d) => !gesperrt.has(ebeneDes(g, d)));
}

/**
 * Welche Dinge liegen im Rahmen `r` ({x0, y0, x1, y1} in E)? Standard: nur was ganz drin liegt; `beruehren`: auch was nur hineinragt.
 * Ein Gang liegt „ganz“ drin, wenn beide Knoten drin liegen. Gesperrte Ebenen zählen nicht.
 */
export function inRahmen(g, r, { beruehren = false, gesperrt = new Set() } = {}) {
  const rahmen = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]];
  const drin = ([x, y]) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  const km = knotenMap(g);
  return alleDinge(g, gesperrt).filter((d) => {
    const o = dingFinden(g, d);
    const poly = polygonVon(g, d);
    if (d.art === 'gang') {
      const a = km.get(o.von);
      const b = km.get(o.nach);
      if (!a || !b) return false;
      return beruehren ? !!poly && ueberlappen(rahmen, poly) : drin([a.x, a.y]) && drin([b.x, b.y]);
    }
    if (!poly) return drin([o.x, o.y]); // Knoten ohne Fläche: nur der Punkt
    if (d.art === 'knoten' && !beruehren) return poly.every(drin);
    return beruehren ? ueberlappen(rahmen, poly) : poly.every(drin);
  });
}

/** Raster der Auswahl beim Verschieben: Knoten und Gänge rasten auf 100 E, reine Teile auf 20 E. */
export const schrittFuer = (g, dinge) => (dinge.some((d) => d.art === 'knoten' || d.art === 'gang') ? KNOTENRASTER : RASTER);

/** Mitte der Hüllbox aller Dinge (Gang: seine Knoten) – der Bezugspunkt beim Einfügen. */
export function mitteVon(g, dinge) {
  const pts = [];
  const km = knotenMap(g);
  for (const d of dinge) {
    const o = dingFinden(g, d);
    if (!o) continue;
    if (d.art === 'gang') for (const id of [o.von, o.nach]) km.get(id) && pts.push([km.get(id).x, km.get(id).y]);
    else pts.push([o.x, o.y]);
  }
  if (!pts.length) return null;
  return {
    x: (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2,
    y: (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2,
  };
}

/**
 * Verschiebt alle Dinge um (dx, dy) E. Knoten (auch die Enden gewählter Gänge) um ein Vielfaches von KNOTENRASTER, Teile im 20-E-Raster.
 * Gibt null zurück, wenn es geklappt hat, sonst eine verständliche Meldung – dann ist nichts geändert.
 */
export function verschiebeDinge(g, dinge, dx, dy) {
  if (!dx && !dy) return 'Keine Verschiebung.';
  const vorher = JSON.stringify(g);
  const ids = new Set();
  for (const d of dinge) {
    if (d.art === 'knoten') ids.add(d.id);
    else if (d.art === 'gang') {
      const x = g.gaenge.find((y) => y.id === d.id);
      if (x) ids.add(x.von).add(x.nach);
    }
  }
  const knoten = g.knoten.filter((k) => ids.has(k.id));
  if (knoten.length && (rund(dx, KNOTENRASTER) !== dx || rund(dy, KNOTENRASTER) !== dy)) return `Knoten und Gänge verschieben sich in Schritten von ${KNOTENRASTER} E.`;
  const zurueck = (text) => {
    const alt = JSON.parse(vorher);
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, alt);
    return text;
  };
  for (const k of knoten) {
    k.x += dx;
    k.y += dy;
    if (Math.abs(k.x) > MAX_KOORD || Math.abs(k.y) > MAX_KOORD) return zurueck('Zu weit draußen.');
  }
  for (const k of knoten) if (g.knoten.some((n) => n !== k && !ids.has(n.id) && n.x === k.x && n.y === k.y)) return zurueck('Dorthin geht es nicht: dort steht schon ein Knoten.');
  const km = knotenMap(g);
  for (const x of g.gaenge) {
    if (!ids.has(x.von) && !ids.has(x.nach)) continue;
    const m = gangMasse(g, x, km);
    if (!m || m.richtung < 0 || m.laenge < MIN_GANG_LAENGE) return zurueck('Dorthin geht es nicht: ein Gang würde aus dem 45°-Raster fallen oder zu kurz werden.');
  }
  for (const d of dinge.filter(istTeil)) {
    const o = teilFinden(g, d.art, d.id);
    if (!o) continue;
    const nx = rund(o.x + dx, RASTER);
    const ny = rund(o.y + dy, RASTER);
    if (Math.abs(nx) > MAX_KOORD || Math.abs(ny) > MAX_KOORD) return zurueck('Zu weit draußen.');
    o.x = nx;
    o.y = ny;
  }
  return JSON.stringify(g) === vorher ? 'Nichts verschoben.' : null;
}

/**
 * Merkt die Dinge zum Einfügen (unabhängig vom Gebiet). Gänge nehmen ihre zwei Knoten mit. Gibt null zurück, wenn nichts zu kopieren ist.
 */
export function merkeDinge(g, dinge) {
  const km = knotenMap(g);
  const knotenIds = new Set();
  const gaenge = [];
  const teile = [];
  for (const d of dinge) {
    const o = dingFinden(g, d);
    if (!o) continue;
    if (d.art === 'knoten') knotenIds.add(d.id);
    else if (d.art === 'gang') {
      gaenge.push(kopieVon(o));
      knotenIds.add(o.von).add(o.nach);
    } else teile.push({ art: d.art, teil: kopieVon(o) });
  }
  const knoten = [...knotenIds].map((id) => km.get(id)).filter(Boolean).map(kopieVon);
  if (!knoten.length && !teile.length) return null;
  const bezug = mitteVon(g, [...knoten.map((k) => ({ art: 'knoten', id: k.id })), ...teile.map((t) => ({ art: t.art, id: t.teil.id }))]);
  return { knoten, gaenge, teile, bezug };
}

/** Besteht die Zwischenablage nur aus einem einzelnen Teil (dann rastet dessen Mitte beim Einfügen auf die Maus)? */
const einzelTeil = (clip) => !clip.knoten.length && clip.teile.length === 1;

/** Versatz (dx, dy), der die Mitte der gemerkten Dinge auf den Zielpunkt legt, gerastert. */
export function versatzZu(clip, zielX, zielY) {
  const q = clip.knoten.length ? KNOTENRASTER : RASTER;
  return [rund(zielX - clip.bezug.x, q), rund(zielY - clip.bezug.y, q)];
}

/** Standardversatz für „Duplizieren“. */
export const duplikatVersatz = (clip) => (clip.knoten.length ? [KNOTENRASTER, KNOTENRASTER] : [KOPIE_VERSATZ, KOPIE_VERSATZ]);

/**
 * Fügt gemerkte Dinge um (dx, dy) versetzt ein; neue IDs, Gänge verweisen auf die neuen Knoten. Steht an einer Zielstelle schon ein
 * Knoten, passiert nichts und es gibt eine Meldung. Gibt { dinge: [neue Dinge] } oder { fehler } zurück. Ein einzelnes Teil rastet mit
 * `absolut: { x, y }` (Mitte) direkt auf diese Stelle.
 */
export function fuegeDingeEin(g, clip, dx, dy, absolut = null) {
  const vorher = JSON.stringify(g);
  const zurueck = (fehler) => {
    const alt = JSON.parse(vorher);
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, alt);
    return { fehler };
  };
  const neu = [];
  const abbildung = new Map();
  for (const k of clip.knoten) {
    const n = kopieVon(k);
    n.id = neueId(g, 'K');
    n.x = sauber(k.x + dx);
    n.y = sauber(k.y + dy);
    if (Math.abs(n.x) > MAX_KOORD || Math.abs(n.y) > MAX_KOORD) return zurueck('Zu weit draußen.');
    if (g.knoten.some((m) => m.x === n.x && m.y === n.y)) return zurueck('Dorthin geht das nicht: dort steht schon ein Knoten.');
    g.knoten.push(n);
    abbildung.set(k.id, n.id);
    neu.push({ art: 'knoten', id: n.id });
  }
  for (const x of clip.gaenge) {
    const n = kopieVon(x);
    n.id = neueId(g, 'gang');
    n.von = abbildung.get(x.von);
    n.nach = abbildung.get(x.nach);
    g.gaenge.push(n);
    neu.push({ art: 'gang', id: n.id });
  }
  for (const t of clip.teile) {
    const o = kopieVon(t.teil);
    o.id = neueId(g, praefixVon(t.art));
    o.x = absolut ? rund(absolut.x, RASTER) : sauber(t.teil.x + dx);
    o.y = absolut ? rund(absolut.y, RASTER) : sauber(t.teil.y + dy);
    if (Math.abs(o.x) > MAX_KOORD || Math.abs(o.y) > MAX_KOORD) return zurueck('Zu weit draußen.');
    teilListe(g, t.art).push(o);
    neu.push({ art: t.art, id: o.id });
  }
  return { dinge: neu };
}

/** Um wie viel verschiebt `fuegeDingeAn` die gemerkten Dinge für die Zielstelle? (Vorschau des Stempels.) */
export function einfuegeVersatz(clip, zielX, zielY) {
  if (einzelTeil(clip)) return [rund(zielX, RASTER) - clip.teile[0].teil.x, rund(zielY, RASTER) - clip.teile[0].teil.y];
  return versatzZu(clip, zielX, zielY);
}

/** Fügt an einer Zielstelle ein: ein einzelnes Teil mit der Mitte auf der Stelle (gerastert), sonst die Mitte der Gruppe, gerastert. */
export function fuegeDingeAn(g, clip, zielX, zielY) {
  if (einzelTeil(clip)) return fuegeDingeEin(g, clip, 0, 0, { x: zielX, y: zielY });
  const [dx, dy] = versatzZu(clip, zielX, zielY);
  return fuegeDingeEin(g, clip, dx, dy);
}

/** Löscht alle Dinge (Gänge, Knoten samt ihren Gängen, Teile). Gibt zurück, wie viele es waren. */
export function loescheDinge(g, dinge) {
  let n = 0;
  for (const d of dinge.filter((x) => x.art === 'gang')) n += loesche(g, 'gang', d.id).length ? 1 : 0;
  for (const d of dinge.filter((x) => x.art === 'knoten')) n += loesche(g, 'knoten', d.id).length ? 1 : 0;
  for (const d of dinge.filter(istTeil)) n += loescheTeil(g, d.art, d.id).length;
  return n;
}

/** Dreht alle gewählten Teile mit Maßen um k·45° (jedes um seine eigene Mitte). Gibt zurück, wie viele sich gedreht haben. */
export function dreheDinge(g, dinge, k = 1) {
  let n = 0;
  for (const d of dinge.filter(istTeil)) if (teilDrehen(g, d.art, d.id, k)) n++;
  return n;
}
