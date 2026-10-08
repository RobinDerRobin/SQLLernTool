// Spieler-Bot für P1c „Netz“: fliegt nur mit dem, was ein Spieler hat (Stick, Drehen links/rechts, Umkehr) und liest nur,
// was ein Spieler sieht (Position des Dackels, Flugrichtung, ob Drehen geht). Weg: Breitensuche auf einem Raster über der
// Karte (nur zur Wegfindung), dann Stick in Wegrichtung, an Kreuzungen drehen, bei Gegenrichtung umkehren.

import { DIR_VEC, turnCW, SCREEN_W } from '../../src/core/math.js';

const STEP = 20;
const CLEAR = 30; // Abstand zur Wand beim Planen (deutlich größer als der Dackelradius: das Scrollen trägt den Dackel mit)

export class NavBot {
  constructor(map) {
    this.map = map;
    const b = map.bounds;
    this.x0 = Math.ceil(b.x0 / STEP) * STEP;
    this.y0 = Math.ceil(b.y0 / STEP) * STEP;
    this.nx = Math.floor((b.x1 - this.x0) / STEP) + 1;
    this.ny = Math.floor((b.y1 - this.y0) / STEP) + 1;
    this.ok = new Uint8Array(this.nx * this.ny);
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) this.ok[j * this.nx + i] = map.walkable(this.x0 + i * STEP, this.y0 + j * STEP, CLEAR) ? 1 : 0;
    this.fields = new Map();
    this.cool = 0;
  }

  cell(x, y) {
    const i = Math.max(0, Math.min(this.nx - 1, Math.round((x - this.x0) / STEP)));
    const j = Math.max(0, Math.min(this.ny - 1, Math.round((y - this.y0) / STEP)));
    return [i, j];
  }

  /** Entfernungsfeld zum Ziel (Breitensuche, 8 Nachbarn ohne Ecken schneiden). */
  field(tx, ty) {
    const key = tx + ',' + ty;
    if (this.fields.has(key)) return this.fields.get(key);
    const dist = new Float32Array(this.nx * this.ny).fill(Infinity);
    let [ti, tj] = this.cell(tx, ty);
    // nächste begehbare Zelle zum Ziel
    if (!this.ok[tj * this.nx + ti]) {
      let best = Infinity;
      for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
        if (!this.ok[j * this.nx + i]) continue;
        const d = Math.hypot(this.x0 + i * STEP - tx, this.y0 + j * STEP - ty);
        if (d < best) { best = d; ti = i; tj = j; }
      }
    }
    const q = [[ti, tj]];
    dist[tj * this.nx + ti] = 0;
    for (let k = 0; k < q.length; k++) {
      const [i, j] = q[k];
      const d0 = dist[j * this.nx + i];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.ny || !this.ok[b * this.nx + a]) continue;
        if (di && dj && (!this.ok[j * this.nx + a] || !this.ok[b * this.nx + i])) continue;
        const nd = d0 + (di && dj ? 1.4142 : 1);
        if (nd < dist[b * this.nx + a]) { dist[b * this.nx + a] = nd; q.push([a, b]); }
      }
    }
    this.fields.set(key, dist);
    return dist;
  }

  /** Nächster Wegpunkt (Kartenkoordinaten) ab Punkt p: nach `look` Zellen dem Gefälle folgen. */
  waypoint(dist, p, look = 3) {
    let [i, j] = this.cell(p.x, p.y);
    for (let n = 0; n < look; n++) {
      let best = dist[j * this.nx + i];
      let bi = i;
      let bj = j;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.ny) continue;
        if (di && dj && (!this.ok[j * this.nx + a] || !this.ok[b * this.nx + i])) continue;
        const d = dist[b * this.nx + a];
        if (d < best) { best = d; bi = a; bj = b; }
      }
      if (bi === i && bj === j) break;
      i = bi;
      j = bj;
    }
    return { x: this.x0 + i * STEP, y: this.y0 + j * STEP };
  }

  /** Eingabe für diesen Frame, um (tx,ty) zu erreichen. Der Dackel hängt am Scrollen: vorwärts trägt ihn die Kamera, der Stick
   *  korrigiert nur quer zum Weg und hält ihn in der Bildmitte; gedreht wird erst im Kreuzungsquadrat; ist der Weg
   *  hinter dem Dackel, kehrt der Bot um. */
  control(sc, tx, ty, dt = 1 / 60) {
    this.cool = Math.max(0, this.cool - dt);
    if (sc.swing || sc.respawn) return {};
    const m = sc.dogMap();
    const dist = this.field(tx, ty);
    const w = this.waypoint(dist, m);
    const ex = w.x - m.x;
    const ey = w.y - m.y;
    const hv = DIR_VEC[sc.h];
    const lv = DIR_VEC[turnCW(sc.h)];
    const eF = ex * hv[0] + ey * hv[1]; // Weg voraus (+) oder hinter dem Dackel (−)
    const eL = ex * lv[0] + ey * lv[1]; // Weg seitlich
    // Für die Entscheidung zu drehen schaut der Bot weiter voraus (6 Zellen = 120 Einheiten)
    // (Richtung des Wegs vorn, nicht der Abstand des Dackels zur Mitte)
    const w8 = this.waypoint(dist, m, 8);
    const fx = w8.x - w.x;
    const fy = w8.y - w.y;
    const fF = fx * hv[0] + fy * hv[1];
    const fL = fx * lv[0] + fy * lv[1];
    const input = {};
    const turnNeeded = Math.hypot(fx, fy) >= 20 && Math.abs(fL) >= 0.7 * Math.abs(fF);
    if (this.cool <= 0 && Math.hypot(fx, fy) > 1e-6) {
      if (!turnNeeded) {
        if (Math.hypot(fx, fy) >= 20 && fF < 0 && Math.abs(fL) < Math.abs(fF)) {
          input.wende = true;
          this.cool = 0.6;
        }
      } else {
        // quer zur Flugrichtung: dorthin drehen – im Kreuzungsquadrat (dort steht der Dackel schon im neuen Gang)
        const k = fL > 0 ? 1 : -1;
        const j = sc.turnJunction(k);
        const r = 8;
        if (j && m.x >= j.x0 + r && m.x <= j.x1 - r && m.y >= j.y0 + r && m.y <= j.y1 - r) {
          if (k > 0) input.rotRight = true;
          else input.rotLeft = true;
          this.cool = 0.7;
        }
      }
    }
    // Stick: in der Gangmitte bleiben (quer, Karten-Richtung → Bildschirm), längs nur die Bildmitte halten (Bildschirm)
    const K = sc.K;
    const latAxis = K.axis === 'h' ? [0, 1] : [1, 0];
    const centerErr = K.c - (m.x * latAxis[0] + m.y * latAxis[1]);
    const sideCmd = Math.abs(centerErr) < 3 ? 0 : Math.max(-1, Math.min(1, centerErr / 24));
    const r = DIR_VEC[sc.theta];
    const d = DIR_VEC[turnCW(sc.theta)];
    input.mx = (latAxis[0] * r[0] + latAxis[1] * r[1]) * sideCmd + Math.max(-0.5, Math.min(0.5, (SCREEN_W / 2 - sc.dog.x) / 60));
    input.my = (latAxis[0] * d[0] + latAxis[1] * d[1]) * sideCmd;
    return input;
  }
}
