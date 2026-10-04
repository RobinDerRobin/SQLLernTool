// Knoten als Arena: ein bildschirmgroßer Raum, den man frei durchfliegt (kein Zwangsscrollen).
// Ausgänge liegen in den Wänden – mehrere pro Seite möglich. Offen ist nur, was in Blickrichtung
// liegt; alle anderen Klappen sind zu. Dazu Objekte: Drehscheibe (Ring zum Durchfliegen,
// dreht 90° in Umlaufrichtung), Speicherstation (Berühren speichert, X öffnet das Menü) und
// Rückholstation (X bringt zurück zu einer Kreuzung mit Ausweg).
//
// Koordinaten wie die Karte: x nach Osten, y nach Süden, Norden ist oben.

import { NODES } from '../data/world.js';
import { DIR_VEC, E, S, W, N, turnCW, turnCCW, clamp } from '../core/math.js';
import { linksAt, directionAllowed } from './worldgraph.js';

export const ARENA_W = 480;
export const ARENA_H = 270;
export const WALL = 16;
export const EXIT_HALF = 26; // halbe Breite einer Ausgangsöffnung
export const PLAYER_R = 8;
export const ARENA_SPEED = 150;

// Objekte liegen in den Ecken, abseits aller Wege zwischen Mitte und Ausgängen. Die Drehscheibe
// sitzt neben der Ecke: weder die Diagonale Mitte→Ecke noch das Entlanggleiten an der Wand führt
// durch ihre Mitte (beides per Test geprüft).
export const SPOTS = {
  turntable: { x: 130, y: 228, r: 26, trigger: 14 },
  save: { x: 402, y: 230, r: 20 },
  ret: { x: 78, y: 42, r: 20 },
  item: { x: 402, y: 42, r: 14 },
};

/** Punkt in der Mitte der Öffnung eines Ausgangs, auf der Innenkante der Wand. */
export function exitPoint(side, pos) {
  switch (side) {
    case E:
      return [ARENA_W - WALL, ARENA_H * pos];
    case W:
      return [WALL, ARENA_H * pos];
    case S:
      return [ARENA_W * pos, ARENA_H - WALL];
    case N:
      return [ARENA_W * pos, WALL];
    default:
      throw new Error('Ungültige Seite ' + side);
  }
}

/** Startpunkt ein Stück vor einem Ausgang (nach innen). */
export function insideOf(side, pos, depth = 44) {
  const [x, y] = exitPoint(side, pos);
  const [dx, dy] = DIR_VEC[side];
  return [x - dx * depth, y - dy * depth];
}

export class Arena {
  /**
   * @param {object} o
   * @param {string} o.node Knoten-ID
   * @param {number} o.heading Blickrichtung
   * @param {Set<string>} o.items
   * @param {{side:number,pos:number}|null} o.entry Ankunft durch diesen Ausgang (null: an der Station)
   */
  constructor({ node, heading, items, entry = null }) {
    this.node = node;
    this.def = NODES[node];
    this.heading = heading;
    this.items = items;
    this.time = 0;
    this.shipAngle = heading;
    this.exits = [];
    for (let side = 0; side < 4; side++) {
      for (const link of linksAt(node, side)) {
        const [x, y] = exitPoint(side, link.pos);
        this.exits.push({ side, pos: link.pos, link, x, y, open: 0 });
      }
    }
    let x;
    let y;
    if (entry) [x, y] = insideOf(entry.side, entry.pos, entry.depth ?? 44);
    else if (this.def.save) [x, y] = [SPOTS.save.x - 44, SPOTS.save.y - 20];
    else [x, y] = [ARENA_W / 2, ARENA_H / 2];
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = 0;
    this.vy = 0;
    // scharf erst außerhalb des Rings (wer im Ring startet, muss erst hinaus)
    this.ringArmed = !this.def.turntable || Math.hypot(this.x - SPOTS.turntable.x, this.y - SPOTS.turntable.y) >= SPOTS.turntable.r;
    this.ringPass = null;
    this.nudgeT = 0;
    this.bumpExit = null;
    this.turnFx = 0;
    this.confusedT = 0;
    // Ausgang, durch den man gerade zurückgekommen ist und auf den man schon schaut: bleibt zu,
    // bis man die Richtungstaste einmal loslässt (sonst fliegt man aus Versehen gleich wieder hinein)
    this.lockedExit = null;
    if (entry && entry.side === heading) {
      this.lockedExit = this.exits.find((e) => e.side === entry.side && Math.abs(e.pos - entry.pos) < 1e-9) || null;
    }
    this.lockRelease = 0;
    this.result = null;
    this.sfxQueue = [];
    this.events = [];
  }

  sfx(n) {
    this.sfxQueue.push(n);
  }

  has(kind) {
    if (kind === 'turntable') return !!this.def.turntable;
    if (kind === 'save') return !!this.def.save;
    if (kind === 'ret') return !!this.def.ret;
    if (kind === 'item') return !!this.def.item;
    return false;
  }

  near(kind, extra = 10) {
    if (!this.has(kind)) return false;
    const s = SPOTS[kind];
    return Math.hypot(this.x - s.x, this.y - s.y) < s.r + PLAYER_R + extra;
  }

  inRing() {
    if (!this.def.turntable) return false;
    const s = SPOTS.turntable;
    return Math.hypot(this.x - s.x, this.y - s.y) < s.trigger;
  }

  /** Ausgang offen? Nur in Blickrichtung und nur, wenn die Kante in diese Richtung befliegbar ist. */
  isOpen(ex) {
    return ex.side === this.heading && directionAllowed(ex.link) && ex !== this.lockedExit;
  }

  /** "Geht nicht": Kopfschütteln mit Fragezeichen (z. B. Drehen ohne Drehwurm). */
  confused() {
    this.confusedT = 0.8;
    this.nudge();
  }

  turnTo(h) {
    if (h === this.heading) return;
    this.heading = h;
    this.turnFx = 0.4;
    this.sfx('turn');
    this.events.push('turn');
  }

  nudge() {
    if (this.nudgeT > 0.2) return;
    this.nudgeT = 0.45;
    this.sfx('nope');
  }

  /** input: { mx, my } (Bildschirmrichtung = Weltrichtung, Norden oben) */
  update(dt, input = {}) {
    if (this.result) return;
    this.time += dt;
    this.px = this.x;
    this.py = this.y;
    this.nudgeT = Math.max(0, this.nudgeT - dt);
    this.turnFx = Math.max(0, this.turnFx - dt);
    this.confusedT = Math.max(0, this.confusedT - dt);
    // Schiffssymbol dreht sich weich zur Blickrichtung
    let d = this.heading - this.shipAngle;
    while (d > 2) d -= 4;
    while (d < -2) d += 4;
    this.shipAngle += d * Math.min(1, dt * 12);
    for (const ex of this.exits) ex.open = clamp(ex.open + (this.isOpen(ex) ? dt : -dt) * 4, 0, 1);

    const mx = input.mx || 0;
    const my = input.my || 0;
    if (this.lockedExit) {
      const [dx, dy] = DIR_VEC[this.lockedExit.side];
      this.lockRelease = mx * dx + my * dy > 0.2 ? 0 : this.lockRelease + dt;
      if (this.lockRelease > 0.25 || this.heading !== this.lockedExit.side) this.lockedExit = null;
    }
    this.vx = mx * ARENA_SPEED;
    this.vy = my * ARENA_SPEED;
    let nx = this.x + this.vx * dt;
    let ny = this.y + this.vy * dt;
    [nx, ny] = this.collide(nx, ny);
    this.x = nx;
    this.y = ny;

    this.updateRing();
  }

  /**
   * Drehscheibe: dreht erst, wenn man wirklich hindurchgeflogen ist – auf einer Seite hinein, nahe
   * an der Mitte vorbei und auf der Gegenseite wieder hinaus. Streifen oder in der Ecke an den
   * Ring gedrückt hängen bleiben dreht nicht. Drehsinn = Umlaufsinn beim Durchflug (Bildschirm:
   * y nach unten, Querversatz > 0 = im Uhrzeigersinn); fast genau durch die Mitte (< 3) = rechts.
   */
  updateRing() {
    if (!this.def.turntable) return;
    const s = SPOTS.turntable;
    const rx = this.x - s.x;
    const ry = this.y - s.y;
    const d = Math.hypot(rx, ry);
    const inside = d < s.r;
    if (inside && !this.ringPass && this.ringArmed) {
      this.ringPass = { ex: rx / (d || 1), ey: ry / (d || 1), minD: d, off: 0 };
    }
    this.ringArmed = !inside;
    const pass = this.ringPass;
    if (!pass) return;
    const v = Math.hypot(this.vx, this.vy);
    if (d <= pass.minD) {
      pass.minD = d;
      if (v > 1e-6) pass.off = (rx * this.vy - ry * this.vx) / v;
    }
    if (inside) return;
    this.ringPass = null;
    const through = pass.minD < s.trigger && (rx / d) * pass.ex + (ry / d) * pass.ey < -0.3;
    if (through) this.turnTo(pass.off < -3 ? turnCCW(this.heading) : turnCW(this.heading));
  }

  /** Wände und Klappen; durch offene Ausgänge fliegt man hinaus (Ergebnis "launch"). */
  collide(nx, ny) {
    const lo = WALL + PLAYER_R;
    const hiX = ARENA_W - WALL - PLAYER_R;
    const hiY = ARENA_H - WALL - PLAYER_R;
    const sides = [
      [E, nx > hiX],
      [W, nx < lo],
      [S, ny > hiY],
      [N, ny < lo],
    ];
    for (const [side, beyond] of sides) {
      if (!beyond) continue;
      const along = side === E || side === W ? ny : nx;
      const len = side === E || side === W ? ARENA_H : ARENA_W;
      const ex = this.exits.find((e) => e.side === side && Math.abs(along - e.pos * len) < EXIT_HALF - PLAYER_R + 2);
      if (ex && this.isOpen(ex)) {
        // In der Öffnung: quer einmitten, damit man nicht an der Kante hängt
        const c = ex.pos * len;
        if (side === E || side === W) ny += clamp(c - ny, -1, 1);
        else nx += clamp(c - nx, -1, 1);
        const out = side === E ? nx > ARENA_W : side === W ? nx < 0 : side === S ? ny > ARENA_H : ny < 0;
        if (out) this.result = { type: 'launch', link: ex.link, side, pos: ex.pos };
        continue;
      }
      if (ex) {
        // geschlossene Klappe: wackeln, wenn man dagegen drückt
        this.bumpExit = ex;
        this.nudge();
      }
      if (side === E) nx = hiX;
      if (side === W) nx = lo;
      if (side === S) ny = hiY;
      if (side === N) ny = lo;
    }
    // In einer Öffnung nicht seitlich in die Wand rutschen
    const inGapX = nx > hiX || nx < lo;
    const inGapY = ny > hiY || ny < lo;
    if (inGapX) ny = clamp(ny, lo, hiY);
    if (inGapY) nx = clamp(nx, lo, hiX);
    return [nx, ny];
  }
}
