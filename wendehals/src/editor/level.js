// Ausschnitte eines Gebiets: „Level“ = ein Gang mit seinen zwei Knoten und den Teilen, die ihn berühren (Levelansicht, A3), und die
// spielbare Karte um einen Gang („Spielen ab hier“). Reine Geometrie auf den Daten – kein DOM, läuft auch unter Node.
// Das Datenformat kennt kein „Level“-Objekt: die Zuordnung wird immer aus der Geometrie berechnet. Die Ausschnitte teilen sich die
// Objekte mit dem Gebiet (keine Kopien), sind aber selbst neue Gebiets-Objekte: nur zum Zeichnen, Treffen und Prüfen, nie zum Ändern.
import { E, S, W, N } from '../core/math.js';
import { GEGNER_RADIUS } from './konstanten.js';
import { knotenMap, gangMasse, gangPolygon, knotenPolygon, rechteck, punktInPolygon } from './daten.js';
import { hatMasse, teilEcken } from './teile.js';

const kardinal = (r) => r === E || r === S || r === W || r === N;

/** Überlappen sich zwei konvexe Polygone (getrennte Achsen: Kanten beider)? Berührung zählt als Überlappung. */
export function ueberlappen(p, q) {
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const nx = ay - by;
      const ny = bx - ax;
      const bereich = (pts) => {
        let lo = Infinity;
        let hi = -Infinity;
        for (const [x, y] of pts) {
          const d = x * nx + y * ny;
          if (d < lo) lo = d;
          if (d > hi) hi = d;
        }
        return [lo, hi];
      };
      const [l1, h1] = bereich(p);
      const [l2, h2] = bereich(q);
      if (h1 < l2 - 1e-9 || h2 < l1 - 1e-9) return false;
    }
  }
  return true;
}

/** Umriss eines Objekts oder Formteils als Polygon (Gegner: Quadrat um den Trefferradius). */
function teilPolygon(art, o) {
  if (hatMasse(art, o)) return teilEcken(o);
  return rechteck(o.x, o.y, 2 * GEGNER_RADIUS, 2 * GEGNER_RADIUS, 0);
}

/** Boden-Flächen eines Knotens: seine Form, sonst ein Quadrat der größten Gangbreite an ihm (damit auch Ecken und T-Stücke zählen). */
function knotenFlaeche(g, k) {
  const poly = knotenPolygon(k);
  if (poly) return poly;
  const breite = Math.max(0, ...g.gaenge.filter((x) => x.von === k.id || x.nach === k.id).map((x) => x.breite));
  return breite ? rechteck(k.x, k.y, breite, breite, 0) : null;
}

/** Neues Gebiet-Objekt mit den gegebenen Gängen/Knoten und allen Teilen, die eine der Flächen berühren (oder in `extra` stehen). */
function ausschnitt(g, gaenge, knoten, extra = new Set()) {
  const flaechen = [];
  const km = knotenMap(g);
  for (const gang of gaenge) {
    const p = gangPolygon(g, gang, km);
    if (p) flaechen.push(p);
  }
  for (const k of knoten) {
    const p = knotenFlaeche(g, k);
    if (p) flaechen.push(p);
  }
  const beruehrt = (poly) => flaechen.some((f) => ueberlappen(f, poly));
  return {
    ...g,
    bereich: null, // der Bereichsrahmen gehört zum ganzen Gebiet, nicht zum Level
    knoten: g.knoten.filter((k) => knoten.includes(k) || extra.has(k.id)),
    gaenge: g.gaenge.filter((x) => gaenge.includes(x) || extra.has(x.id)),
    formteile: g.formteile.filter((f) => extra.has(f.id) || beruehrt(teilPolygon('formteil', f))),
    objekte: g.objekte.filter((o) => extra.has(o.id) || beruehrt(teilPolygon('objekt', o))),
    notizen: g.notizen.filter((n) => extra.has(n.id) || flaechen.some((f) => punktInPolygon(n.x, n.y, f))),
  };
}

/**
 * Das Level eines Gangs: der Gang, seine beiden Knoten und alle Formteile, Wände, Hindernisse, Gegner und Notizen, die diese Flächen
 * berühren. `extra` = IDs, die zusätzlich gezeigt werden (z. B. das gerade Gewählte, damit ein neu gesetztes Ding nicht verschwindet).
 * Gibt es den Gang nicht, ist das Ergebnis leer.
 */
export function levelInhalt(g, gangId, extra = []) {
  const gang = g.gaenge.find((x) => x.id === gangId);
  const km = knotenMap(g);
  const knoten = gang ? [km.get(gang.von), km.get(gang.nach)].filter(Boolean) : [];
  return ausschnitt(g, gang ? [gang] : [], knoten, new Set(extra));
}

/**
 * Die Karte, die der Fenster-Prototyp um einen Gang spielen kann: der Gang und alles, was von ihm aus über gerade Gänge (Ost-West,
 * Nord-Süd) zu erreichen ist, samt den Teilen, die diese Flächen berühren. Diagonale Gänge gehören nicht dazu (der Prototyp kennt
 * sie nicht); ein diagonaler Start-Gang bleibt allein und wird von `spielbarkeit` als nicht spielbar gemeldet.
 * Gibt { gebiet, ausgelassen: [Gänge, die nicht dazugehören] } zurück.
 */
export function spielGebiet(g, gangId) {
  const start = g.gaenge.find((x) => x.id === gangId);
  const km = knotenMap(g);
  const gaenge = start ? [start] : [];
  const knoten = new Set(start ? [start.von, start.nach] : []);
  if (start && kardinal(gangMasse(g, start, km)?.richtung)) {
    let neu = true;
    while (neu) {
      neu = false;
      for (const gang of g.gaenge) {
        if (gaenge.includes(gang) || !(knoten.has(gang.von) || knoten.has(gang.nach))) continue;
        const m = gangMasse(g, gang, km);
        if (!m || !kardinal(m.richtung)) continue;
        gaenge.push(gang);
        knoten.add(gang.von).add(gang.nach);
        neu = true;
      }
    }
  }
  const sub = ausschnitt(g, gaenge, [...knoten].map((id) => km.get(id)).filter(Boolean));
  return { gebiet: sub, ausgelassen: g.gaenge.filter((x) => !gaenge.includes(x)) };
}
