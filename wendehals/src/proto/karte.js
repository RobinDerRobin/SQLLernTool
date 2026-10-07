// Karten für die Fenster-Prototypen (P1 „Kreuzung“, P1c „Netz“): Liste von Gängen statt festem Kreuz.
//
// Ein Gang ist ein Rechteck mit Achse ('h' = West–Ost, 'v' = Nord–Süd), Mittellinie c (y bei 'h', x bei 'v'),
// Ausdehnung a0..a1 entlang der Achse und Breite w. Räume sind einfach breite Gänge. Wo sich zwei Gänge
// mit verschiedener Achse überschneiden, ist eine Kreuzung: das Kreuzungsquadrat ist die Überschneidungsfläche,
// und ein Gang „führt von der Kreuzung weg“ (Port), wenn er über das Quadrat hinausreicht.
//
// Reine Daten und Geometrie, kein Spielzustand. Richtungen nur über math.js.

import { E, S, W, N, isHorizontal } from '../core/math.js';

const EPS = 1e-6;
export const CAM_INSET = 60; // so weit vor einer Gangwand endet der Kamerabereich (wie P1: CAM_END = END − 60)
export const CAMW_FRAC = 0.4; // Scroll-Behälter quer: ±40 % der halben Gangbreite … (Gang 200 → ±40, wie P1)
export const VIEW_HALF_H = 135; // halbe Bildhöhe

const rectOf = (c) =>
  c.axis === 'h'
    ? { x0: c.a0, x1: c.a1, y0: c.c - c.w / 2, y1: c.c + c.w / 2 }
    : { x0: c.c - c.w / 2, x1: c.c + c.w / 2, y0: c.a0, y1: c.a1 };

/** Übersetzt eine Kartenbeschreibung in Gänge, Kreuzungen und Abfragen. */
export function compileMap(def) {
  const corridors = def.corridors.map((c, i) => ({ ...c, i, hw: c.w / 2, ...rectOf(c) }));
  const byId = Object.fromEntries(corridors.map((c) => [c.id, c]));

  const junctions = [];
  for (const h of corridors) {
    if (h.axis !== 'h') continue;
    for (const v of corridors) {
      if (v.axis !== 'v') continue;
      const x0 = Math.max(h.x0, v.x0);
      const x1 = Math.min(h.x1, v.x1);
      const y0 = Math.max(h.y0, v.y0);
      const y1 = Math.min(h.y1, v.y1);
      if (x1 - x0 <= EPS || y1 - y0 <= EPS) continue;
      const ports = [];
      if (h.x1 > x1 + EPS) ports.push(E);
      if (v.y1 > y1 + EPS) ports.push(S);
      if (h.x0 < x0 - EPS) ports.push(W);
      if (v.y0 < y0 - EPS) ports.push(N);
      junctions.push({ id: `${h.id}×${v.id}`, h, v, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ports });
    }
  }

  const bounds = {
    x0: Math.min(...corridors.map((c) => c.x0)),
    x1: Math.max(...corridors.map((c) => c.x1)),
    y0: Math.min(...corridors.map((c) => c.y0)),
    y1: Math.max(...corridors.map((c) => c.y1)),
  };

  /** Kreis mit Radius r liegt ganz auf begehbarem Boden (Vereinigung der Gänge, Ecken eckig). */
  function walkable(x, y, r = 0) {
    for (const c of corridors) if (x >= c.x0 + r && x <= c.x1 - r && y >= c.y0 + r && y <= c.y1 - r) return true;
    return false;
  }

  /** Freie Strecke ab (x,y) in Richtung (vx,vy) (Einheitsvektor), höchstens max; Schritt 1. */
  function freeDistance(x, y, vx, vy, max, r) {
    let d = 0;
    while (d < max && walkable(x + vx * (d + 1), y + vy * (d + 1), r)) d++;
    return d >= max ? max : d;
  }

  /** Zone einer Kreuzung (Abnahme 3, Regel 2): Quadrat plus Toleranz `ahead` davor/dahinter in jedem
   *  angeschlossenen Gang. Gemessen ab dem um den Dackelradius verkleinerten Quadrat (wie P1). */
  function inZone(j, mx, my, r, ahead) {
    const x0 = j.x0 + r;
    const x1 = j.x1 - r;
    const y0 = j.y0 + r;
    const y1 = j.y1 - r;
    const inX = mx >= x0 - EPS && mx <= x1 + EPS;
    const inY = my >= y0 - EPS && my <= y1 + EPS;
    if (inX && inY) return true;
    for (const p of j.ports) {
      if (p === E && inY && mx > x1 && mx - x1 <= ahead) return true;
      if (p === W && inY && mx < x0 && x0 - mx <= ahead) return true;
      if (p === S && inX && my > y1 && my - y1 <= ahead) return true;
      if (p === N && inX && my < y0 && y0 - my <= ahead) return true;
    }
    return false;
  }

  /** Alle Kreuzungen, in deren Dreh-Zone der Punkt liegt (überlappende Zonen: mehrere). */
  const zonesAt = (mx, my, r, ahead) => junctions.filter((j) => inZone(j, mx, my, r, ahead));

  /** Kreuzung, an der man aus dieser Lage in Richtung hNew drehen darf (ein Gang führt in hNew weg), die nächste. */
  function turnJunction(mx, my, hNew, r, ahead) {
    let best = null;
    let bd = Infinity;
    for (const j of zonesAt(mx, my, r, ahead)) {
      if (!j.ports.includes(hNew)) continue;
      const d = Math.hypot(mx - j.cx, my - j.cy);
      if (d < bd) {
        best = j;
        bd = d;
      }
    }
    return best;
  }

  /** Der Gang einer Kreuzung, der in Richtung h verläuft. */
  const corridorFor = (j, h) => (isHorizontal(h) ? j.h : j.v);

  /** Kamerabereich entlang der Achse: Gangenden minus Rand; zu kurze Gänge: Mitte. */
  function camRange(c) {
    let lo = c.a0 + CAM_INSET;
    let hi = c.a1 - CAM_INSET;
    if (lo > hi) lo = hi = (c.a0 + c.a1) / 2;
    return [lo, hi];
  }

  /** Halbe Gangbreite an der Stelle a (breitere Räume auf derselben Mittellinie zählen mit). */
  function halfWidthAt(c, a) {
    let hw = c.hw;
    for (const o of corridors) {
      if (o.axis !== c.axis || Math.abs(o.c - c.c) > EPS || a < o.a0 || a > o.a1) continue;
      hw = Math.max(hw, o.hw);
    }
    return hw;
  }

  /** Scroll-Behälter quer: so weit darf die Fenstermitte von der Gangmitte abweichen. Im breiten Raum folgt sie
   *  dem Dackel bis an die Wände (der Dackel erreicht jede Stelle), im schmalen Gang bleibt sie eng. */
  function camHalfWidth(c, a, dogR, dogMargin) {
    const hw = halfWidthAt(c, a);
    return Math.max(CAMW_FRAC * hw, hw - (VIEW_HALF_H - dogMargin) + dogR);
  }

  /** Gang mit der angegebenen Achse, durch den man an dieser Stelle gerade scrollen würde: der Gang, der den Punkt enthält;
   *  sonst (der Punkt liegt in einem Quergang) der nächste Gang dieser Achse, der den Quergang an einer Kreuzung kreuzt. */
  function corridorAt(x, y, h) {
    const wantH = isHorizontal(h);
    const dist = (c) => Math.hypot(Math.max(c.x0 - x, 0, x - c.x1), Math.max(c.y0 - y, 0, y - c.y1));
    const inside = corridors.filter((c) => (c.axis === 'h') === wantH && dist(c) === 0);
    if (inside.length) return inside.reduce((a, b) => (b.hw < a.hw ? b : a)); // bei Gleichstand der schmalere (Raum = Weitung des Gangs)
    const here = corridors.filter((c) => (c.axis === 'h') !== wantH && dist(c) === 0);
    const reach = junctions.filter((j) => here.includes(wantH ? j.v : j.h)).map((j) => (wantH ? j.h : j.v));
    const pool = reach.length ? reach : corridors.filter((c) => (c.axis === 'h') === wantH);
    return pool.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  }

  return {
    def,
    corridors,
    byId,
    junctions,
    bounds,
    bones: def.bones,
    start: def.start,
    walkable,
    freeDistance,
    inZone,
    zonesAt,
    turnJunction,
    corridorFor,
    camRange,
    halfWidthAt,
    camHalfWidth,
    corridorAt,
  };
}
