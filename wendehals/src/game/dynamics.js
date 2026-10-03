// Bewegliches Terrain. Die Position hängt nur von der Zeit ab (deterministisch, leicht zu
// spiegeln). Alles außer Strömungen ist tödlich bei Berührung.
//
//   mover     Block, der quer pendelt
//   piston    Kolben, der aus Boden oder Decke stößt
//   gear      rotierendes Zahnrad (Kreis)
//   pendulum  Pendel an der Decke, schwingt in Flugrichtung
//   current   Strömung, die quer schiebt (nicht tödlich)

import { Rng } from '../core/rng.js';
import { TILE, isSolid } from './terrain.js';

export function dynState(o, t) {
  const s = o.sign || 1;
  switch (o.type) {
    case 'mover': {
      const c = o.c + s * o.amp * Math.sin(t * o.speed + o.phase);
      return { kind: 'rect', a: o.a, c, ha: o.w / 2, hc: o.h / 2 };
    }
    case 'piston': {
      const k = 0.5 + 0.5 * Math.sin(t * o.speed + o.phase);
      const len = 8 + (o.len - 8) * k;
      // dir = +1: wächst in +c-Richtung (aus der "Decke"), -1: aus dem "Boden"
      const dir = o.dir * s;
      const c = o.c + (dir * len) / 2;
      return { kind: 'rect', a: o.a, c, ha: o.w / 2, hc: len / 2, base: o.c, dir, len };
    }
    case 'gear':
      return { kind: 'circle', a: o.a, c: o.c + s * o.amp * Math.sin(t * o.speed + o.phase), r: o.r, rot: s * t * 1.5 };
    case 'pendulum': {
      const th = o.maxAng * Math.sin(t * o.speed + o.phase);
      const a = o.a + Math.sin(th) * o.len * (o.flipA ? -1 : 1);
      const c = o.c + s * Math.cos(th) * o.len;
      return { kind: 'circle', a, c, r: o.r, pivotA: o.a, pivotC: o.c };
    }
    case 'current':
      return { kind: 'zone', a: o.a, c: o.c, ha: o.w / 2, hc: o.h / 2, push: s * o.push };
    default:
      return null;
  }
}

/** Freie Kachelzeilen (Korridor) in einer Spalte: [von, bis) in Einheiten, größter Abschnitt. */
export function corridorAt(map, ix) {
  let best = null;
  let start = -1;
  for (let iy = 0; iy <= map.rows; iy++) {
    const free = iy < map.rows && !isSolid(map.cell(ix, iy));
    if (free && start < 0) start = iy;
    if (!free && start >= 0) {
      if (!best || iy - start > best[1] - best[0]) best = [start, iy];
      start = -1;
    }
  }
  return best ? [best[0] * TILE, best[1] * TILE] : [0, map.rows * TILE];
}

/**
 * Erzeugt dynamisches Terrain für eine Etappe (vorwärts). zones = Bereiche, die frei bleiben
 * (Start, Hindernisse, Boss-Arena).
 */
export function buildDynamics(spec, map, L, H, edgeId, blocked) {
  const out = [];
  const rng = new Rng('dyn:' + edgeId);
  for (const d of spec.dyn || []) {
    for (let a = 520 + rng.range(0, d.every * 0.5); a < L - 560; a += d.every * rng.range(0.85, 1.2)) {
      if (blocked.some(([x0, x1]) => a > x0 - 80 && a < x1 + 80)) continue;
      const ix = Math.floor(a / TILE);
      const [lo, hi] = map.wrap ? [0, H] : corridorAt(map, ix);
      const span = hi - lo;
      if (span < 160) continue;
      const mid = (lo + hi) / 2;
      const base = { a, sign: 1, phase: rng.range(0, Math.PI * 2) };
      switch (d.type) {
        case 'mover':
          out.push({ ...base, type: 'mover', c: map.wrap ? rng.range(0, H) : mid, w: 32, h: 40, amp: Math.min(110, span / 2 - 50), speed: rng.range(0.6, 1.0) });
          break;
        case 'piston': {
          const fromTop = rng.chance(0.5);
          out.push({ ...base, type: 'piston', c: fromTop ? lo : hi, dir: fromTop ? 1 : -1, w: 26, len: span * 0.5, speed: rng.range(0.9, 1.4) });
          break;
        }
        case 'gear':
          out.push({ ...base, type: 'gear', c: map.wrap ? rng.range(0, H) : lo + span * rng.range(0.3, 0.7), r: 26, amp: Math.min(60, span / 2 - 80), speed: rng.range(0.4, 0.8) });
          break;
        case 'pendulum':
          out.push({ ...base, type: 'pendulum', c: lo, len: Math.min(span * 0.55, 150), r: 16, maxAng: 0.9, speed: rng.range(1.0, 1.5) });
          break;
        case 'current':
          out.push({ ...base, type: 'current', c: mid, w: 160, h: span * 0.8, push: rng.chance(0.5) ? 45 : -45 });
          break;
      }
    }
  }
  return out;
}

/** Spiegelung für Rückwärtsflüge (nur Flugrichtung) bzw. Kehrtwende (beide Achsen). */
export function mirrorDyn(o, L, H, alsoC) {
  const m = { ...o, a: L - o.a };
  if (o.type === 'pendulum') m.flipA = !o.flipA;
  if (alsoC) {
    m.c = H - o.c;
    m.sign = -(o.sign || 1);
  }
  return m;
}

/** Trifft eine Box (Spieler) ein tödliches dynamisches Objekt? */
export function dynHitsBox(st, a, c, ha, hc, dc) {
  if (!st || st.kind === 'zone') return false;
  const d = dc(c, st.c);
  if (st.kind === 'rect') return Math.abs(a - st.a) < ha + st.ha && Math.abs(d) < hc + st.hc;
  const r = st.r + Math.min(ha, hc);
  return (a - st.a) ** 2 + d ** 2 < r * r;
}
