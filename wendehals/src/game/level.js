// Laufzeit eines Levels (Sidescroller-Teil). Komplett ohne DOM, damit es in Tests
// beschleunigt simuliert werden kann. Der Renderer liest nur den Zustand aus.
//
// Koordinaten: a = Flugrichtung (vorwärts = +a), c = Querachse (periodisch mit H).
// camA ist die Hinterkante des Sichtfelds, camC die "obere" Kante quer.

import { Rng } from '../core/rng.js';
import {
  N,
  S,
  wrap,
  wrapDelta,
  clamp,
  opposite,
  viewDims,
  crossPeriod,
  headingAngle,
  screenToLocalVec,
  segPointDist2,
  dist2,
} from '../core/math.js';
import { CHARACTERS } from '../data/characters.js';
import { maxHpFor } from '../data/items.js';
import { HINTS } from '../data/text.js';
import { edgeDir } from './worldgraph.js';
import { generateLevel } from './levelgen.js';
import { LEVELS } from '../data/levels.js';
import { TILE, isSolid } from './terrain.js';
import { dynState, dynHitsBox, mirrorDyn, corridorAt } from './dynamics.js';
import { ENEMIES, FORMATION_KINDS } from './enemies.js';
import { BOSSES, defaultHitTest } from './bosses.js';
import { addCapsule, activate, freshPowers } from './powerups.js';

export const SCROLL_SPEED = 42;

/** Entfernt Elemente in place (ohne neues Array pro Frame). Reihenfolge bleibt erhalten. */
export function compact(arr, keep) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i];
  arr.length = j;
  return arr;
}

// Wiederverwendete Partikel-Objekte (vermeidet Garbage-Collection-Ruckler)
const PARTICLE_POOL = [];
export const BASE_SPEED = 105;
const WALL_HOLD = 0.72;
export const FUNNEL = 30; // Einzugsbereich vor engen Spalten (quer, in Einheiten) // Wand steht beim Anhalten bei 72 % des Sichtfelds
const MAX_ENEMY_BULLETS = 220;

export class Level {
  /**
   * @param {object} o
   * @param {object} o.edge          Kante aus world.js
   * @param {boolean} o.forward      Flugrichtung from->to
   * @param {Set<string>} o.items    Items des Spielers
   * @param {string} o.character     Figuren-ID
   * @param {object} o.powers        Power-Up-Zustand (wird verändert)
   * @param {boolean} [o.invincible] Testmodus
   * @param {number} [o.seed]
   */
  constructor(o) {
    this.edge = o.edge;
    this.forward = o.forward;
    this.startForward = o.forward;
    this.items = o.items;
    this.charId = o.character || 'dackel';
    this.char = CHARACTERS[this.charId];
    this.powers = o.powers || freshPowers();
    this.invincible = !!o.invincible;
    this.rng = new Rng(o.seed ?? 12345);
    this.L = Math.ceil(this.edge.length / TILE) * TILE; // ganze Kacheln (für saubere Spiegelung)
    this.diff = this.edge.difficulty || 1;
    this.heading = this.forward ? edgeDir(this.edge) : opposite(edgeDir(this.edge));
    this.H = crossPeriod(this.heading, (LEVELS[this.edge.id] || { wrap: true }).wrap);
    const dims = viewDims(this.heading);
    this.zoom = dims.zoom;
    // Bewegungsweite der Bosse quer: wie in einer horizontalen Arena (sonst rasen sie im Zoom hin und her)
    this.swing = Math.min(dims.vc, 300);
    this.va = dims.va;
    this.vc = dims.vc;

    const gen = generateLevel(this.edge, this.forward, this.H, this.L);
    this.gates = gen.gates;
    this.events = gen.events;
    this.evIdx = 0;
    this.map = gen.map;
    this.wrap = this.map.wrap;
    this.dyn = gen.dyn;
    this.dynStates = [];

    this.small = this.items.has('PILZ');
    this.player = {
      a: 70,
      c: this.startC(),
      hp: maxHpFor(this.items),
      maxHp: maxHpFor(this.items),
      inv: 1.2,
      fireCool: 0,
      missileCool: 0,
      missileSide: 1,
      squeak: 0,
      history: [],
    };
    this.camA = 0;
    this.camC = this.clampCam(this.player.c - this.vc / 2);
    this.time = 0;
    this.state = 'play'; // play | boss | bossdown | clear | dead
    this.timer = 0;
    this.result = null;
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.pickups = [];
    this.particles = [];
    this.popups = [];
    this.hazards = [];
    this.messages = [];
    this.sfxQueue = [];
    this.waves = new Map();
    this.boss = null;
    this.arena = false;
    this.arenaC = 0;
    this.rewards = [];
    this.score = 0;
    this.shakeAmt = 0;
    this.turnAnim = null;
    this.stats = { hits: 0, kills: 0, shots: 0, maxBullets: 0 };
    this.hasBoss = this.bossPending();
    this.say(this.edge.name, 2.2, 'title');
  }

  bossPending() {
    // Der Boss wartet am "to"-Ende und nur für Spieler, die die Etappe vorwärts begonnen haben.
    // (Rückwärts starten und sofort wenden darf keinen Boss "von hinten" auslösen.)
    if (!this.forward || !this.startForward || !this.edge.boss) return false;
    return this.edge.reward === 'GOAL' || !this.items.has(this.edge.reward);
  }

  // ---------------------------------------------------------------- Hilfen
  /** Querabstand c1 - c2 (bei Wrap der kürzere Weg über die Naht). */
  dc(c1, c2) {
    return this.wrap ? wrapDelta(c1 - c2, this.H) : c1 - c2;
  }

  /** Querposition normalisieren: periodisch oder auf die Levelbreite begrenzt. */
  nc(c) {
    return this.wrap ? wrap(c, this.H) : clamp(c, 0, this.H);
  }

  clampCam(camC) {
    return this.wrap ? wrap(camC, this.H) : clamp(camC, 0, Math.max(0, this.H - this.vc));
  }

  /** Startposition quer: Mitte des freien Korridors am Levelanfang. */
  startC() {
    if (this.wrap) return this.H / 2;
    const [lo, hi] = corridorAt(this.map, Math.floor(70 / TILE));
    return (lo + hi) / 2;
  }

  /** Nächste freie Querposition in einer Spalte (für Gegner, die sonst im Terrain erscheinen). */
  freeC(a, c) {
    if (!isSolid(this.map.at(a, c))) return c;
    for (let d = TILE; d < this.H; d += TILE) {
      for (const cc of [c - d, c + d]) {
        const n = this.nc(cc);
        if (!isSolid(this.map.at(a, n))) return n;
      }
    }
    return c;
  }

  aim(a, c) {
    const da = this.player.a - a;
    const dc = this.dc(this.player.c, c);
    const len = Math.hypot(da, dc) || 1;
    return [da / len, dc / len];
  }

  bulletSpeed(base) {
    return base * (1 + (this.diff - 1) * 0.08);
  }

  bullet(a, c, va, vc, o = {}) {
    if (this.bullets.length >= MAX_ENEMY_BULLETS) return;
    this.bullets.push({ a, c: this.nc(c), va, vc, r: o.r || 3, kind: o.kind || 'kugel', t: 0 });
  }

  spawn(kind, a, c, params = {}) {
    const def = ENEMIES[kind];
    if (!def) throw new Error('Unbekannter Gegner ' + kind);
    const e = { kind, a, c: this.nc(c), c0: c, a0: a, hp: def.hp, maxHp: def.hp, r: def.r, t: 0, idx: 0, wave: -1, ...params };
    if (def.init) def.init(e, this);
    this.enemies.push(e);
    return e;
  }

  hazard(a, c, ang, len, width, warn) {
    this.hazards.push({ a, c, ang, len, width, warn });
  }

  shake(n) {
    this.shakeAmt = Math.max(this.shakeAmt, n);
  }

  sfx(name) {
    this.sfxQueue.push(name);
  }

  say(text, dur = 3, style = 'hint') {
    this.messages.push({ text, t: 0, dur, style });
  }

  popup(a, c, text) {
    this.popups.push({ a, c, text, t: 0 });
  }

  burst(a, c, color, n = 10, speed = 80, size = 3) {
    for (let i = 0; i < n; i++) {
      const ang = this.rng.next() * Math.PI * 2;
      const sp = speed * (0.4 + this.rng.next() * 0.8);
      const pt = PARTICLE_POOL.pop() || {};
      pt.a = pt.pa = a;
      pt.c = pt.pc = c;
      pt.va = Math.cos(ang) * sp;
      pt.vc = Math.sin(ang) * sp;
      pt.t = 0;
      pt.life = 0.4 + this.rng.next() * 0.5;
      pt.color = color;
      pt.size = size;
      this.particles.push(pt);
    }
  }

  get playerHalf() {
    return this.small ? { ha: 4, hc: 3, r: 2 } : { ha: 8, hc: 7, r: 3.5 };
  }

  /** Anteil der Etappe, der geschafft ist (0..1), in aktueller Flugrichtung. */
  progress() {
    const k = clamp(this.camA / Math.max(1, this.L - this.va), 0, 1);
    // Nach einer Kehrtwende läuft die Leiste zurück zum Start (statt zu springen)
    return this.forward === this.startForward ? k : 1 - k;
  }

  /** Winkel, um den der Renderer die Welt dreht (inkl. Wende-Animation). */
  viewAngle() {
    // Die Welt bleibt bei der 180°-Kehrtwende stehen (Himmelsrichtungen bleiben, wo sie sind);
    // nur die Figur dreht sich um – siehe playerSpin().
    return headingAngle(this.heading);
  }

  /** Zusätzliche Drehung der Spielfigur während der Kehrtwende (stetig über den Wechsel hinweg). */
  playerSpin() {
    if (!this.turnAnim) return 0;
    const p = this.turnAnim.t / this.turnAnim.dur;
    return this.turnAnim.swapped ? -Math.PI * (1 - p) : Math.PI * p;
  }

  /** Kameraposition für die Anzeige: gleitet nach der Kehrtwende sanft an ihre neue Stelle. */
  displayCamA() {
    const pan = this.turnAnim && this.turnAnim.pan;
    if (!pan) return this.camA;
    const k = Math.min(1, Math.max(0, (this.turnAnim.t / this.turnAnim.dur - 0.5) * 2));
    const e = k * k * (3 - 2 * k);
    return pan.from + (pan.to - pan.from) * e;
  }

  inDark(a) {
    return this.gates.some((g) => g.type === 'dark' && a >= g.a0 && a <= g.a1);
  }

  spikeGapAt(col) {
    return col.base + col.amp * Math.sin(this.time * col.speed + col.phase);
  }

  // ------------------------------------------------------------- Kollision
  /** Prüft, ob eine Spielerbox an (a, c) eine feste Wand berührt. */
  /** Berührt die Box festes Terrain oder ein bewegliches Teil? */
  wallHit(a, c, ha, hc) {
    for (const st of this.dynStates) if (dynHitsBox(st, a, c, ha, hc, (x, y) => this.dc(x, y))) return st;
    return this.staticWallHit(a, c, ha, hc);
  }

  /** Nur unbewegliches: Kacheln und Hindernis-Wände. */
  staticWallHit(a, c, ha, hc) {
    if (this.map.touch(a, c, ha, hc) & 1) return this.map;
    for (const g of this.gates) {
      if (g.type !== 'rock' && g.type !== 'narrow') continue;
      if (a + ha <= g.a0 || a - ha >= g.a1) continue;
      if (g.type === 'rock') {
        for (const b of g.blocks) {
          if (b.hp <= 0) continue;
          const mid = (b.c0 + b.c1) / 2;
          if (Math.abs(this.dc(c, mid)) < hc + (b.c1 - b.c0) / 2) return g;
        }
      } else if (Math.abs(this.dc(c, g.gapC)) + hc > g.gapW / 2) {
        return g;
      }
    }
    return null;
  }

  // --------------------------------------------------------------- Update
  /**
   * Merkt sich die Positionen vor dem Simulationsschritt. Der Renderer interpoliert damit
   * zwischen zwei Schritten (flüssig auf Bildschirmen mit 90/120/144 Hz).
   */
  snapshot() {
    this.pCamA = this.camA;
    this.pCamC = this.camC;
    const p = this.player;
    p.pa = p.a;
    p.pc = p.c;
    for (const list of [this.enemies, this.bullets, this.shots, this.particles]) {
      for (const o of list) {
        o.pa = o.a;
        o.pc = o.c;
      }
    }
    if (this.boss) {
      this.boss.pa = this.boss.a;
      this.boss.pc = this.boss.c;
    }
  }

  update(dt, input = {}) {
    if (this.result) return;
    this.snapshot();
    this.sfxQueue.length = 0;
    this.time += dt;
    for (const m of this.messages) m.t += dt;
    compact(this.messages, (m) => m.t < m.dur);
    this.shakeAmt = Math.max(0, this.shakeAmt - 30 * dt);

    this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt);
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    if (this.turnAnim) {
      this.turnAnim.t += dt;
      if (!this.turnAnim.swapped && this.turnAnim.t >= this.turnAnim.dur / 2) this.reverse();
      if (this.turnAnim.t >= this.turnAnim.dur) this.turnAnim = null;
      return;
    }

    this.updateParticles(dt);

    if (this.state === 'dead') {
      this.timer -= dt;
      if (this.timer <= 0) this.result = { type: 'dead' };
      return;
    }
    if (this.state === 'retreat') {
      this.timer -= dt;
      if (this.timer <= 0) this.result = { type: 'retreat' };
      return;
    }
    if (this.state === 'clear') {
      this.player.a += 190 * dt;
      this.camA += SCROLL_SPEED * dt;
      this.timer -= dt;
      if (this.timer <= 0) this.finish();
      return;
    }
    if (this.state === 'bossdown') {
      this.timer -= dt;
      if (this.rng.chance(dt * 12) && this.boss) {
        const b = this.boss;
        this.burst(b.a + (this.rng.next() - 0.5) * 60, b.c + (this.rng.next() - 0.5) * 60, '#ffd34d', 12, 120, 4);
        this.sfx('boom');
      }
      this.moveShotsAndBullets(dt);
      this.updatePlayer(dt, input, false);
      if (this.timer <= 0) {
        this.boss = null;
        this.state = 'clear';
        this.timer = 3.0;
        this.announceReward();
      }
      return;
    }

    this.updateCamera(dt);
    this.checkStuck(dt);
    this.updateDynamics();
    this.updatePlayer(dt, input, true);
    if (input.power) this.tryPower();
    if (input.wende) this.tryWende();
    this.spawnEvents();

    this.hazards.length = 0;
    for (const g of this.gates) if (g.blocks) for (const b of g.blocks) if (b.flash) b.flash = Math.max(0, b.flash - dt);
    for (const e of this.enemies) {
      e.t += dt;
      if (e.flash) e.flash = Math.max(0, e.flash - dt);
      ENEMIES[e.kind].update(e, this, dt);
      e.c = this.nc(e.c);
      if (e.shootAt && e.t >= e.shootAt) {
        e.shootAt = 0;
        const [ua, uc] = this.aim(e.a, e.c);
        const sp = this.bulletSpeed(90);
        this.bullet(e.a, e.c, ua * sp, uc * sp, { kind: 'kugel' });
      }
    }
    if (this.boss) this.updateBoss(dt);

    this.moveShotsAndBullets(dt);
    this.collideShots();
    this.collidePlayer(dt);
    this.updatePickups(dt);
    this.cleanup();
    this.stats.maxBullets = Math.max(this.stats.maxBullets, this.bullets.length);
  }

  /**
   * Show don't tell: Steht man lange vor einer Wand, die man (noch) nicht überwinden kann,
   * schüttelt der Dackel den Kopf und kehrt um – ohne Strafe, zurück zum Startknoten.
   */
  checkStuck(dt) {
    const p = this.player;
    const g = this.gates.find(
      (x) =>
        ((x.type === 'rock' && !this.items.has('BOHRER')) || (x.type === 'narrow' && !this.small)) &&
        x.a0 > p.a &&
        x.a0 - this.camA < this.va,
    );
    const held = g && this.camA >= g.a0 - this.va * WALL_HOLD - 1;
    this.stuckT = held ? (this.stuckT || 0) + dt : 0;
    if (this.stuckT > 6) {
      this.state = 'retreat';
      this.timer = 1.6;
      this.sfx('nope');
    }
  }

  updateCamera(dt) {
    if (this.arena) return;
    const maxA = this.L - this.va;
    let target = this.camA + SCROLL_SPEED * dt;
    for (const g of this.gates) {
      if (g.type !== 'rock' && g.type !== 'narrow') continue;
      if (g.a1 <= this.camA) continue;
      if (this.player.a < g.a1 + 4) target = Math.min(target, Math.max(this.camA, g.a0 - this.va * WALL_HOLD));
    }
    this.camA = Math.min(target, maxA);
    const p = this.player;
    const desired = p.c - this.vc / 2;
    if (this.wrap) this.camC += wrapDelta(desired - this.camC, this.H) * Math.min(1, 6 * dt);
    else this.camC += (this.clampCam(desired) - this.camC) * Math.min(1, 6 * dt);
    this.camC = this.clampCam(this.camC);

    if (this.camA >= maxA - 0.001) {
      if (this.hasBoss && !this.boss) this.startBoss();
      else if (!this.hasBoss) {
        this.state = 'clear';
        this.timer = 1.6;
        this.sfx('clear');
        this.say('Etappe geschafft!', 1.6, 'big');
      }
    }
  }

  updateDynamics() {
    const st = this.dynStates;
    st.length = this.dyn.length;
    for (let i = 0; i < this.dyn.length; i++) st[i] = dynState(this.dyn[i], this.time);
  }

  updatePlayer(dt, input, canFire) {
    const p = this.player;
    const { ha, hc } = this.playerHalf;
    p.inv = Math.max(0, p.inv - dt);
    let mx = input.mx || 0;
    let my = input.my || 0;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const [da, dcv] = screenToLocalVec(this.heading, mx, my);
    const speed = BASE_SPEED * this.char.speed * (1 + 0.22 * this.powers.speed) * (p.slow ? 0.55 : 1);

    // Trichter vor engen Spalten: wer winzig ist und ungefähr trifft, wird sanft eingelenkt.
    if (this.small) this.funnel(p, dt, ha, hc);

    // Längs bewegen, dann quer. Festes Terrain ist tödlich (wie bei Gradius/Parodius);
    // die Bewegung in die Wand hinein wird trotzdem nicht ausgeführt.
    const na = p.a + da * speed * dt;
    if (this.wallHit(na, p.c, ha, hc)) this.instantDeath();
    else p.a = na;
    const nc = p.c + dcv * speed * dt;
    if (this.wallHit(p.a, nc, ha, hc)) this.instantDeath();
    else p.c = nc;

    const [back, front] = this.margins();
    const pushed = p.a < this.camA + back;
    p.a = clamp(p.a, this.camA + back, this.camA + this.va - front);
    if (this.arena) {
      const rel = clamp(this.dc(p.c, this.camC + this.vc / 2), -this.vc / 2 + 10, this.vc / 2 - 10);
      p.c = this.camC + this.vc / 2 + rel;
    }
    if (!this.wrap) p.c = clamp(p.c, hc + 1, this.H - hc - 1);
    p.c = this.nc(p.c);
    // Vom Bildrand gegen Terrain gedrückt: zerquetscht (wie bei Gradius)
    if (pushed && this.wallHit(p.a, p.c, ha, hc)) this.instantDeath();
    // Zähe Zonen bremsen, Strömungen schieben
    const touch = this.map.touch(p.a, p.c, ha, hc);
    p.slow = (touch & 4) !== 0;
    if (touch & 2 && !this.items.has('GUMMIHAUT')) this.instantDeath();
    for (const st of this.dynStates) {
      if (st && st.kind === 'zone' && Math.abs(p.a - st.a) < st.ha && Math.abs(this.dc(p.c, st.c)) < st.hc) {
        const nc2 = p.c + st.push * dt;
        if (!this.wallHit(p.a, nc2, ha, hc)) p.c = this.nc(nc2);
      }
    }

    p.history.unshift([p.a, p.c]);
    if (p.history.length > 40) p.history.length = 40;

    if (canFire) this.fireWeapons(dt, input);
  }

  /** Abstand zu Hinter- und Vorderkante, damit die Figur nicht unter der Anzeige verschwindet. */
  margins() {
    // Werte in Bildschirmpixeln (480x270), umgerechnet in lokale Einheiten (Zoom!)
    const z = this.zoom || 1;
    switch (this.heading) {
      case N:
        return [30 / z, 22 / z];
      case S:
        return [26 / z, 30 / z];
      default:
        return [18, 12];
    }
  }

  funnel(p, dt, ha, hc) {
    for (const g of this.gates) {
      if (g.type !== 'narrow') continue;
      const ahead = g.a0 - (p.a + ha);
      if (ahead > 70 || p.a - ha > g.a1) continue;
      const d = this.dc(g.gapC, p.c);
      // Trichter: wer winzig ist und ungefähr trifft, wird sanft in die Spalte gelenkt.
      if (Math.abs(d) < FUNNEL && hc <= g.gapW / 2) {
        const step = Math.sign(d) * Math.min(Math.abs(d), 90 * dt);
        if (!this.wallHit(p.a, p.c + step, ha, hc)) p.c = this.nc(p.c + step);
      }
    }
  }

  optionPositions() {
    const out = [];
    const h = this.player.history;
    for (let i = 0; i < this.powers.options; i++) {
      const idx = Math.min(h.length - 1, (i + 1) * 14);
      if (idx >= 0) out.push(h[idx]);
    }
    return out;
  }

  fireWeapons(dt, input) {
    const p = this.player;
    p.fireCool -= dt;
    p.missileCool -= dt;
    if (!input.fire) return;
    const drill = this.items.has('BOHRER');
    const emitters = [[p.a, p.c], ...this.optionPositions()];
    if (p.fireCool <= 0) {
      const lasers = this.powers.laser;
      const limit = 5 * emitters.length;
      let mine = 0;
      for (const s of this.shots) if (s.kind !== 'missile') mine++;
      if (mine < limit) {
        p.fireCool = lasers ? 0.2 : 0.12;
        const sp = this.char.shotSpeed;
        for (const [ea, ec] of emitters) {
          if (lasers) {
            this.shots.push({ kind: 'laser', a: ea + 10, c: ec, va: 520, vc: 0, r: 3, len: 34, dmg: 1, pierce: true, hit: new Set(), drill, t: 0 });
          } else {
            const n = this.char.mainShots;
            for (let i = 0; i < n; i++) {
              const off = n > 1 ? (i - (n - 1) / 2) * 8 : 0;
              this.shots.push({ kind: 'main', a: ea + 8, c: ec + off, va: sp, vc: 0, r: 3, dmg: this.char.shotDamage, drill, t: 0 });
            }
          }
          if (this.powers.double) {
            const d = this.char.double;
            if (d === 'diagonal') {
              this.shots.push({ kind: 'double', a: ea + 4, c: ec, va: sp * 0.71, vc: -sp * 0.71, r: 3, dmg: 1, drill, t: 0 });
            } else if (d === 'back') {
              this.shots.push({ kind: 'double', a: ea - 6, c: ec, va: -sp, vc: 0, r: 3, dmg: 1, drill, t: 0 });
            } else {
              for (const s of [-1, 1]) {
                this.shots.push({ kind: 'double', a: ea + 4, c: ec, va: sp * 0.93, vc: s * sp * 0.37, r: 3, dmg: 1, drill, t: 0 });
              }
            }
          }
        }
        this.stats.shots++;
        this.sfx(lasers ? 'laser' : 'shoot');
      }
    }
    if (this.powers.missile && p.missileCool <= 0) {
      p.missileCool = 0.7;
      p.missileSide = -p.missileSide;
      this.shots.push({ kind: 'missile', a: p.a, c: p.c, va: 150, vc: 150 * p.missileSide, r: 4, dmg: 2, drill, t: 0 });
    }
  }

  tryPower() {
    const label = activate(this.powers);
    if (label) {
      this.sfx('power');
      this.popup(this.player.a, this.player.c - 14, label + '!');
    } else {
      this.sfx('nope');
    }
  }

  tryWende() {
    if (!this.items.has('WENDEHALS') || this.state !== 'play' || this.arena) return;
    this.turnAnim = { t: 0, dur: 0.8, swapped: false };
    this.sfx('wende');
  }

  /** Wendehals: Welt um 180° drehen. Positionen werden in das neue Bezugssystem gespiegelt. */
  reverse() {
    this.turnAnim.swapped = true;
    const L = this.L;
    const H = this.H;
    const ma = (a) => L - a;
    const mc = (c) => this.nc(H - c);
    this.forward = !this.forward;
    this.heading = opposite(this.heading);
    const p = this.player;
    const rel = p.a - this.camA; // Abstand zur Hinterkante – bleibt nach der Wende gleich
    p.a = ma(p.a);
    p.c = mc(p.c);
    p.history = p.history.map(([a, c]) => [ma(a), mc(c)]);
    const mirroredCam = L - this.camA - this.va;
    this.camA = clamp(p.a - rel, 0, L - this.va);
    // Die Figur stünde sonst plötzlich an der Vorderkante; die Kamera gleitet hinterher.
    this.turnAnim.pan = { from: mirroredCam, to: this.camA };
    this.camC = this.clampCam(H - this.camC - this.vc);
    this.map.mirror();
    this.dyn = this.dyn.map((o) => mirrorDyn(o, L, H, true));
    this.dynStates = this.dyn.map((o) => dynState(o, this.time));
    for (const g of this.gates) {
      const a0 = ma(g.a1);
      g.a1 = ma(g.a0);
      g.a0 = a0;
      if (g.blocks) for (const b of g.blocks) [b.c0, b.c1] = [H - b.c1, H - b.c0];
      if (g.gapC !== undefined) g.gapC = mc(g.gapC);
      if (g.cols) {
        for (const col of g.cols) {
          col.a = ma(col.a);
          col.base = H - col.base;
          col.amp = -col.amp;
        }
        g.cols.sort((x, y) => x.a - y.a);
      }
    }
    this.gates.sort((x, y) => x.a0 - y.a0);
    // Gegner werden schwindelig und purzeln aus dem Bild.
    for (const e of this.enemies) this.burst(ma(e.a), mc(e.c), '#ffffff', 4, 60, 2);
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    for (const pk of this.pickups) {
      pk.a = ma(pk.a);
      pk.c = mc(pk.c);
    }
    for (const pt of this.particles) {
      pt.a = ma(pt.a);
      pt.c = mc(pt.c);
      pt.va = -pt.va;
      pt.vc = -pt.vc;
    }
    this.popups = [];
    const front = this.camA + this.va + 40;
    this.events = generateLevel(this.edge, this.forward, this.H).events.filter((ev) => ev.type === 'wave' && ev.at > front);
    this.evIdx = 0;
    this.waves.clear();
    this.hasBoss = this.bossPending();
    this.say('Kehrtwende!', 1.2, 'big');
    this.snapshot(); // kein Interpolieren über den Sprung hinweg
  }

  spawnEvents() {
    const front = this.camA + this.va;
    while (this.evIdx < this.events.length && this.events[this.evIdx].at <= front) {
      const ev = this.events[this.evIdx++];
      if (ev.type === 'hint') {
        this.say(HINTS[ev.text] || ev.text, 4);
        continue;
      }
      const formation = FORMATION_KINDS.has(ev.kind);
      this.waves.set(ev.wave, { total: ev.count, killed: 0 });
      for (let i = 0; i < ev.count; i++) {
        const a = front + 20 + (formation ? i * ev.spacing : i * 8);
        const cf = clamp(ev.cf + (formation ? 0 : (i - (ev.count - 1) / 2) * ev.spread), 0.08, 0.92);
        const c = this.freeC(a, this.nc(this.camC + this.vc * cf));
        const e = this.spawn(ev.kind, a, c, { idx: i, wave: ev.wave, c0: c });
        // Einige Formationsgegner schießen einmal gezielt ("Popcorn mit Biss").
        if (formation && this.diff >= 2 && this.rng.chance(0.08 + 0.06 * this.diff)) e.shootAt = 0.7 + this.rng.next() * 1.2;
      }
    }
  }

  startBoss() {
    const def = BOSSES[this.edge.boss];
    this.arena = true;
    this.arenaC = this.nc(this.camC + this.vc / 2);
    this.state = 'boss';
    this.boss = {
      kind: this.edge.boss,
      a: this.L + 80,
      c: this.arenaC,
      homeA: this.L - 80 / this.zoom, // im Zoom gleich weit vom Rand (nicht unter der Anzeige)
      hp: def.hp,
      maxHp: def.hp,
      r: def.r,
      t: 0,
      enter: 2.2,
      flash: 0,
      step: 0,
    };
    this.say(def.name, 2.5, 'boss');
    this.say(def.title, 2.5, 'hint');
    this.sfx('bossalarm');
  }

  updateBoss(dt) {
    const b = this.boss;
    b.flash = Math.max(0, b.flash - dt);
    if (b.enter > 0) {
      b.enter -= dt;
      b.a += (b.homeA - b.a) * Math.min(1, 2.5 * dt);
      b.c += this.dc(this.arenaC, b.c) * Math.min(1, 2.5 * dt);
      return;
    }
    b.t += dt;
    BOSSES[b.kind].update(b, this, dt);
    b.c = this.nc(b.c);
  }

  bossHit(s) {
    const b = this.boss;
    if (!b || b.enter > 0 || this.state !== 'boss') return null;
    const def = BOSSES[b.kind];
    return (def.hitTest || defaultHitTest)(b, { a: s.a, c: b.c + this.dc(s.c, b.c), r: s.r });
  }

  damageBoss(dmg) {
    const b = this.boss;
    b.hp -= dmg;
    b.flash = 0.06;
    if (b.hp <= 0) {
      b.hp = 0;
      this.state = 'bossdown';
      this.timer = 2.6;
      this.score += 5000;
      this.bullets = [];
      this.hazards.length = 0;
      for (const e of this.enemies) this.burst(e.a, e.c, '#ffffff', 5, 60, 2);
      this.enemies = [];
      this.shake(10);
      this.sfx('bossdown');
      if (this.edge.reward) this.rewards.push(this.edge.reward);
    }
  }

  announceReward() {
    const r = this.edge.reward;
    if (r && r !== 'GOAL') this.say('Neues Item erhalten!', 3, 'big');
  }

  moveShotsAndBullets(dt) {
    for (const s of this.shots) {
      s.t += dt;
      s.a += s.va * dt;
      s.c = this.nc(s.c + s.vc * dt);
    }
    for (const b of this.bullets) {
      b.t += dt;
      b.a += b.va * dt;
      b.c = this.nc(b.c + b.vc * dt);
      if (isSolid(this.map.at(b.a, b.c))) b.dead = true; // Kugeln zerschellen am Terrain
    }
  }

  collideShots() {
    const camMid = this.camC + this.vc / 2;
    for (const s of this.shots) {
      if (s.dead) continue;
      // Terrain: zerbrechliche Blöcke gehen kaputt, Fels nur mit Bohrer, der Rest schluckt den Schuss
      const res = this.map.shoot(s.a, s.c, s.dmg, s.drill);
      if (res) {
        s.dead = true;
        if (res === 'destroy') {
          this.burst(s.a, s.c, '#c9a86a', 8, 80, 3);
          this.sfx('crack');
          this.score += 10;
        } else if (res === 'hit') {
          this.burst(s.a, s.c, '#e8d8b0', 3, 50, 2);
          this.sfx('drill');
        } else this.burst(s.a, s.c, '#cccccc', 2, 40, 2);
        continue;
      }
      if (this.dynStates.some((st) => dynHitsBox(st, s.a, s.c, s.r, s.r, (x, y) => this.dc(x, y)))) {
        s.dead = true;
        this.burst(s.a, s.c, '#cccccc', 2, 40, 2);
        continue;
      }
      // Wände
      for (const g of this.gates) {
        if (s.dead) break;
        if (g.type === 'rock' && s.a + s.r > g.a0 && s.a - s.r < g.a1) {
          for (const b of g.blocks) {
            if (b.hp <= 0) continue;
            const mid = (b.c0 + b.c1) / 2;
            if (Math.abs(this.dc(s.c, mid)) < (b.c1 - b.c0) / 2 + s.r) {
              s.dead = true;
              if (s.drill) {
                b.hp -= s.dmg;
                b.flash = 0.08;
                if (b.hp <= 0) {
                  this.burst((g.a0 + g.a1) / 2, mid, '#8a6a4a', 10, 90, 4);
                  this.sfx('crack');
                  this.score += 20;
                } else this.sfx('drill');
              } else {
                this.burst(g.a0, s.c, '#cccccc', 3, 50, 2);
                this.sfx('pling');
              }
              break;
            }
          }
        } else if (g.type === 'narrow' && s.a + s.r > g.a0 && s.a - s.r < g.a1) {
          if (Math.abs(this.dc(s.c, g.gapC)) + s.r > g.gapW / 2) {
            s.dead = true;
            this.burst(g.a0, s.c, '#cccccc', 3, 50, 2);
          }
        }
      }
      if (s.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (s.hit && s.hit.has(e)) continue;
        const rr = e.r + s.r + (s.kind === 'laser' ? 6 : 0);
        if (Math.abs(s.a - e.a) > rr + (s.len || 0) || Math.abs(this.dc(s.c, e.c)) > rr) continue;
        const hitA = s.kind === 'laser' ? clamp(e.a, s.a - s.len, s.a) : s.a;
        if (dist2(hitA, 0, e.a, this.dc(e.c, s.c)) > rr * rr) continue;
        const def = ENEMIES[e.kind];
        if (def.invulnerable) {
          s.dead = true;
          this.sfx('pling');
          break;
        }
        e.hp -= s.dmg;
        e.flash = 0.06;
        if (s.pierce) s.hit.add(e);
        else s.dead = true;
        if (e.hp <= 0) this.kill(e, true);
        if (s.dead) break;
      }
      if (s.dead) continue;
      if (this.boss) {
        const res = this.bossHit(s);
        if (res === 'hit') {
          if (!s.pierce || !s.hit.has(this.boss)) {
            this.damageBoss(s.dmg);
            this.sfx('hit');
          }
          if (s.pierce) s.hit.add(this.boss);
          else s.dead = true;
        } else if (res === 'block') {
          s.dead = true;
          this.sfx('pling');
        }
      }
      // Außerhalb des Sichtfelds?
      if (s.a > this.camA + this.va + 30 || s.a < this.camA - 30 || s.t > 2.5) s.dead = true;
      if (Math.abs(this.dc(s.c, camMid)) > this.vc / 2 + 30) s.dead = true;
    }
  }

  kill(e, byPlayer) {
    if (e.dead) return;
    e.dead = true;
    const def = ENEMIES[e.kind];
    this.burst(e.a, e.c, '#ffffff', 8, 90, 3);
    this.sfx('pop');
    if (byPlayer) {
      this.score += def.score;
      this.stats.kills++;
      const w = this.waves.get(e.wave);
      if (w) {
        w.killed++;
        if (w.killed === w.total && (w.total > 1 || e.maxHp >= 3)) this.dropCapsule(e.a, e.c);
      }
    }
    if (def.onDeath) def.onDeath(e, this);
  }

  dropCapsule(a, c) {
    this.pickups.push({ kind: 'capsule', a, c, t: 0 });
  }

  collidePlayer(dt) {
    const p = this.player;
    const { ha, hc, r } = this.playerHalf;
    p.squeak = Math.max(0, p.squeak - dt);
    // Stacheln
    for (const g of this.gates) {
      if (g.type !== 'spikes' || p.a + ha < g.a0 - 10 || p.a - ha > g.a1 + 10) continue;
      for (const col of g.cols) {
        if (Math.abs(p.a - col.a) > 5 + ha) continue;
        const gap = this.spikeGapAt(col);
        if (Math.abs(this.dc(p.c, gap)) > g.gap / 2 - hc) {
          if (this.items.has('GUMMIHAUT')) {
            if (p.squeak <= 0) {
              this.sfx('quietsch');
              p.squeak = 0.5;
            }
          } else this.instantDeath();
        }
      }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist2(p.a, 0, e.a, this.dc(e.c, p.c)) < (e.r + r) ** 2) {
        // Unzerstörbares (Zahnräder) ist ein fester Gegenstand: sofort tödlich.
        if (ENEMIES[e.kind].invulnerable) this.instantDeath();
        else this.damage();
        if (!ENEMIES[e.kind].invulnerable) {
          e.hp -= 2;
          if (e.hp <= 0) this.kill(e, true);
        }
      }
    }
    for (const b of this.bullets) {
      if (b.dead) continue;
      if (dist2(p.a, 0, b.a, this.dc(b.c, p.c)) < (b.r + r) ** 2) {
        b.dead = true;
        this.damage();
      }
    }
    for (const h of this.hazards) {
      if (h.warn) continue;
      const pc = h.c + this.dc(p.c, h.c);
      const ea = h.a + Math.cos(h.ang) * h.len;
      const ec = h.c + Math.sin(h.ang) * h.len;
      if (segPointDist2(h.a, h.c, ea, ec, p.a, pc) < (h.width + r) ** 2) this.damage();
    }
    const b = this.boss;
    if (b && b.enter <= 0 && this.state === 'boss') {
      if (dist2(p.a, 0, b.a, this.dc(b.c, p.c)) < (b.r * 0.8 + r) ** 2) this.damage();
    }
  }

  /** Berührung mit festem Terrain, Stacheln oder Unzerstörbarem: sofort vorbei (kein Schild, keine Energie). */
  instantDeath() {
    const p = this.player;
    if (this.state === 'dead' || this.state === 'clear' || this.state === 'bossdown') return;
    if (this.invincible) {
      if (p.inv <= 0) {
        this.stats.hits++;
        this.stats.crashes = (this.stats.crashes || 0) + 1;
        p.inv = 0.5;
      }
      return;
    }
    p.hp = 0;
    this.stats.hits++;
    this.stats.crashes = (this.stats.crashes || 0) + 1;
    this.die();
  }

  die() {
    const p = this.player;
    this.state = 'dead';
    this.timer = 2.2;
    this.burst(p.a, p.c, '#ffcc66', 30, 140, 4);
    this.sfx('death');
    this.shake(8);
    this.hurtFlash = 0.45;
    this.say('Autsch!', 2, 'big');
  }

  damage() {
    const p = this.player;
    if (p.inv > 0 || this.state === 'dead') return;
    if (this.invincible) {
      this.stats.hits++;
      p.inv = 0.5;
      return;
    }
    p.inv = 1.4;
    this.shake(5);
    if (this.powers.shield > 0) {
      this.powers.shield--;
      this.sfx('shield');
      return;
    }
    p.hp--;
    this.stats.hits++;
    this.sfx('hurt');
    // Treffer spürbar machen: kurzer Stillstand (Hit-Stop) und rote Vignette im Renderer
    this.hitStop = 0.08;
    this.hurtFlash = 0.45;
    if (p.hp <= 0) this.die();
  }

  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      pk.t += dt;
      if (dist2(p.a, 0, pk.a, this.dc(pk.c, p.c)) < 14 * 14) {
        pk.dead = true;
        addCapsule(this.powers);
        this.score += 50;
        this.sfx('capsule');
      }
    }
  }

  updateParticles(dt) {
    const ps = this.particles;
    let j = 0;
    for (let i = 0; i < ps.length; i++) {
      const pt = ps[i];
      pt.t += dt;
      if (pt.t >= pt.life) {
        PARTICLE_POOL.push(pt);
        continue;
      }
      pt.a += pt.va * dt;
      pt.c += pt.vc * dt;
      pt.va *= 1 - 2 * dt;
      pt.vc *= 1 - 2 * dt;
      ps[j++] = pt;
    }
    ps.length = j;
    for (const pp of this.popups) pp.t += dt;
    compact(this.popups, (pp) => pp.t < 1.2);
  }

  cleanup() {
    const camA = this.camA;
    const front = camA + this.va;
    const camMid = this.camC + this.vc / 2;
    const halfC = this.vc / 2 + 40;
    compact(this.enemies, (e) => !e.dead && !e.gone && e.a >= camA - 50 && e.a <= front + 420 && e.t <= 40);
    compact(this.shots, (s) => !s.dead);
    compact(
      this.bullets,
      (b) => !b.dead && b.t < 12 && b.a > camA - 30 && b.a < front + 60 && Math.abs(this.dc(b.c, camMid)) < halfC,
    );
    compact(this.pickups, (pk) => !pk.dead && pk.a > camA - 20);
  }

  finish() {
    const node = this.forward ? this.edge.to : this.edge.from;
    this.result = {
      type: 'arrive',
      node,
      heading: this.heading,
      rewards: [...this.rewards],
      goal: this.rewards.includes('GOAL'),
      score: this.score,
    };
  }
}
