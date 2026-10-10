// Spieler-Bot für P3 „45°-Kreuzung“: fliegt nur mit dem, was ein Spieler hat (Stick, LT/RT/LB/RB, Y) und liest nur, was ein Spieler
// sieht (Position des Dackels, Flugrichtung, ob Drehen geht). Weg: Breitensuche auf einem Raster (NavBot, nur zur Wegfindung), der Stick
// folgt dem Weg in der Karte (Wunschgeschwindigkeit minus Scrollen), gedreht wird erst im Achteck, bei Gegenrichtung wird umgekehrt.

import { NavBot } from './netz-bot.mjs';
import { HEADINGS, turnCW, opposite, rotationSteps, SCREEN_W } from '../../src/core/math.js';
import { unitVec, SPEED, DOG_SPEED, DOG_R } from '../../src/proto/fenster.js';
import { ARMS8 } from '../../src/proto/achteck-map.js';

/** Stick (Bildschirm, Betrag ≤ 1) für eine gewünschte Kartengeschwindigkeit des Dackels: Wunsch minus Scrollen. */
export function steer(sc, vx, vy) {
  const r = unitVec(sc.theta);
  const d = unitVec(turnCW(sc.theta));
  const sign = sc.dir >= 0 ? 1 : -1;
  const sx = vx - r[0] * sign * SPEED * Math.abs(sc.dir);
  const sy = vy - r[1] * sign * SPEED * Math.abs(sc.dir);
  let mx = (sx * r[0] + sy * r[1]) / DOG_SPEED;
  let my = (sx * d[0] + sy * d[1]) / DOG_SPEED;
  mx += Math.max(-0.5, Math.min(0.5, (SCREEN_W / 2 - sc.dog.x) / 60)); // Bildmitte halten
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  return { mx, my };
}

/** Nächste der 8 Richtungen zu einem Kartenvektor. */
export function nearestHeading(vx, vy) {
  let best = HEADINGS[0];
  let bd = -Infinity;
  for (const h of HEADINGS) {
    const u = unitVec(h);
    const d = u[0] * vx + u[1] * vy;
    if (d > bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}

/** Wie viele 45°-Schritte (−3..4) von der Blickrichtung h nach hNew. */
export const stepsTo = (h, hNew) => {
  const k = rotationSteps(h, hNew);
  return k > 4 ? k - 8 : k;
};

/** Der Arm, in dem der Dackel gerade (außerhalb des Achtecks) fliegt, sonst null. */
export function armOfDog(map, m) {
  let best = null;
  let bd = 0;
  for (const a of ARMS8) {
    const along = m.x * a.u[0] + m.y * a.u[1];
    if (along > bd && map.inArm(a, m.x, m.y, 0)) {
      best = a;
      bd = along;
    }
  }
  return map.inOctagon(m.x, m.y, 0) ? null : best;
}

export class AchteckBot extends NavBot {
  constructor(map) {
    super(map);
    this.cool = 0;
    this.log = [];
  }

  /** Punkt auf dem Planungsraster (Zelle mit endlichem Abstand) nahe p; liegt p selbst darauf, p. */
  nearestOk(dist, p) {
    const [i0, j0] = this.cell(p.x, p.y);
    if (Number.isFinite(dist[j0 * this.nx + i0])) return p;
    for (let r = 1; r <= 6; r++) {
      let best = null;
      let bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const a = i0 + di;
        const b = j0 + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.ny || !Number.isFinite(dist[b * this.nx + a])) continue;
        const x = this.x0 + a * 20;
        const y = this.y0 + b * 20;
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bd) { bd = d; best = { x, y }; }
      }
      if (best) return best;
    }
    return p;
  }

  /** Eingabe für diesen Frame, um den Knochen an (tx,ty) mit Armrichtung tArm zu erreichen. */
  control(sc, tx, ty, tArm, dt = 1 / 60) {
    this.cool = Math.max(0, this.cool - dt);
    if (sc.swing || sc.respawn) return {};
    const map = this.map;
    const m = sc.dogMap();
    const dist = this.field(tx, ty);
    const q = this.nearestOk(dist, m); // steht der Dackel dicht an der Wand (außerhalb des Planungsrasters), erst zum Raster zurück
    const w = this.waypoint(dist, q, 3);
    const w8 = this.waypoint(dist, q, 8);
    const input = {};
    let hWant = null;
    if (map.inOctagon(m.x, m.y, DOG_R) && Math.hypot(m.x, m.y) <= 90) {
      // im Achteck, nahe der Mitte: in Wegrichtung (Lage des Arms) drehen
      hWant = nearestHeading(w8.x - m.x, w8.y - m.y);
      if (Math.hypot(w8.x - m.x, w8.y - m.y) < 1e-6) hWant = null;
    } else if (!map.inOctagon(m.x, m.y, DOG_R)) {
      const arm = armOfDog(map, m);
      if (arm) hWant = arm.dir === tArm ? arm.dir : opposite(arm.dir);
      // in einem anderen als dem Zielarm: nach innen; im Zielarm: nach außen
    }
    if (hWant !== null && this.cool <= 0) {
      const k = stepsTo(sc.h, hWant);
      if (k !== 0) {
        if (Math.abs(k) >= 3) input.wende = true;
        else if (!sc.canTurn) {
          /* außerhalb der Dreh-Zone: nicht möglich – weiterfliegen */
        } else if (k === -1) input.rot45Left = true;
        else if (k === 1) input.rot45Right = true;
        else if (k === -2) input.rotLeft = true;
        else input.rotRight = true;
        this.cool = 0.7;
      }
    }
    // Stick: dem Weg folgen (Wunschgeschwindigkeit = Scroll-Tempo in Wegrichtung)
    let ex = w.x - m.x;
    let ey = w.y - m.y;
    const len = Math.hypot(ex, ey) || 1;
    ex /= len;
    ey /= len;
    Object.assign(input, steer(sc, ex * SPEED, ey * SPEED));
    return input;
  }
}
