// Prototyp P1 „Kreuzung“ – das drehende Fenster (Wegwerf-Prototyp, Brief: docs/prototypen/P1-kreuzung.md).
//
// Geparkt, nicht vergessen (bewusst NICHT in P1): Schleife/Landmarken/„wo ist zuhause“ (P2),
// 45°-Drehungen und Diagonalen (P3), Gegner und Schießen (P4), Minimap oder Kompass, Halt-Zonen,
// Protokolle und Messungen, Festhalten der Stick-Bedeutung, Speichern, Fähigkeiten/Drehzahl,
// jede Änderung an worldgraph*/Löser/welt.json/Level/Arena, Bot- und Render-Tests,
// Perf-/Flacker-Szenen, Tester-Agenten.
//
// Modell: Der Plan ist ein Grundriss (Karte, y nach unten, Norden oben). Der Bildschirm ist ein Fenster.
// theta = Kartenrichtung, in die das rechte Fensterende zeigt; s = 'R'|'L' = Seite, zu der gescrollt wird.
// Blickrichtung h = theta (s = R) bzw. opposite(theta) (s = L).

import { E, S, W, N, DIR_VEC, turnCW, turnCCW, opposite, headingAngle, SCREEN_W, SCREEN_H, approach, clamp } from '../core/math.js';
import { Rng } from '../core/rng.js';

export const SPEED = 90; // Scrollgeschwindigkeit (Einheiten/s)
export const ARM = 720; // Länge eines Arms (ab Kreuzungsrand)
export const WIDTH = 200; // Gangbreite
export const HALF = WIDTH / 2;
export const END = HALF + ARM; // Ende der Arme (Mittelpunkt der Kreuzung = 0,0)
export const CAM_END = END - 60; // so weit scrollt das Fenster höchstens
export const BONE_AT = END - 30;
export const BONE_R = 24;
export const DOOR_T = 10; // Dicke der Türbalken
export const DOG_SPEED = 120;
export const DOG_R = 8;
export const DOG_MARGIN = 14;
export const CAMW = 40; // Scroll-Behälter: so weit darf die Fenstermitte quer von der Gangmitte abweichen
export const FOLLOW = 5; // Folgegeschwindigkeit der Kamera quer zur Scrollrichtung (1/s)
export const SWING_TIME = 0.5;
export const TURN_RATE = 5; // Umkehr: 1/0,4 s * 2 (von -1 nach 1 in 0,4 s)

export const ARMS = [
  { dir: N, name: 'Norden', color: '#e0443a' },
  { dir: E, name: 'Osten', color: '#3f7be0' },
  { dir: S, name: 'Süden', color: '#3fb04a' },
  { dir: W, name: 'Westen', color: '#e8c63a' },
];
export const armIndex = (dir) => ARMS.findIndex((a) => a.dir === dir);

/** Tür eines Arms offen: das Fenster scrollt entlang der Kartenachse dieses Arms (E9). */
export const doorOpen = (armDir, h) => h === armDir || h === opposite(armDir);

/** Fenstermitte auf den Scroll-Behälter begrenzen: Kreuz aus zwei Balken der Breite 2*CAMW, Länge CAM_END. */
export function clampCam(x, y) {
  x = clamp(x, -CAM_END, CAM_END);
  y = clamp(y, -CAM_END, CAM_END);
  if (Math.abs(x) > CAMW && Math.abs(y) > CAMW) {
    if (Math.abs(x) >= Math.abs(y)) y = clamp(y, -CAMW, CAMW);
    else x = clamp(x, -CAMW, CAMW);
  }
  return { x, y };
}

const smooth = (t) => t * t * (3 - 2 * t);
const vec = (d) => DIR_VEC[d];

export class FensterScene {
  constructor({ rng = new Rng(0xf1e57e4) } = {}) {
    this.rng = rng;
    this.time = 0;
    this.theta = E;
    this.s = 'R';
    this.ang = headingAngle(E); // Anzeigewinkel (fortlaufend); Plan wird um -ang gedreht
    this.dir = 1; // weiche Scrollrichtung: +1 = R, -1 = L (Dackel-Spiegelung)
    this.cam = { x: -CAM_END, y: 0 };
    this.dog = { x: 120, y: SCREEN_H / 2 }; // Bildschirmkoordinaten
    this.swing = null; // { t, a0, a1, pivot }
    this.score = 0;
    this.target = 0;
    this.hint = 8; // Sekunden Starthinweis
    this.pickTarget(armIndex(W));
  }

  get h() {
    return this.s === 'R' ? this.theta : opposite(this.theta);
  }

  pickTarget(not) {
    let t;
    do t = this.rng.int(0, ARMS.length - 1);
    while (t === not);
    this.target = t;
  }

  // ----------------------------------------------------- Koordinaten
  /** Bildschirmpunkt -> Karte (mit der Ausrichtung theta). */
  toMap(sx, sy, cam = this.cam, theta = this.theta) {
    const r = vec(theta);
    const d = vec(turnCW(theta));
    const ox = sx - SCREEN_W / 2;
    const oy = sy - SCREEN_H / 2;
    return { x: cam.x + ox * r[0] + oy * d[0], y: cam.y + ox * r[1] + oy * d[1] };
  }

  /** Kreuz aus zwei Balken minus geschlossene Türen; Kreis mit Radius r. */
  walkable(x, y, r = DOG_R) {
    const inH = Math.abs(x) <= END - r && Math.abs(y) <= HALF - r;
    const inV = Math.abs(y) <= END - r && Math.abs(x) <= HALF - r;
    if (!inH && !inV) return false;
    const h = this.h;
    for (const arm of ARMS) {
      if (doorOpen(arm.dir, h)) continue;
      const v = vec(arm.dir);
      const along = x * v[0] + y * v[1];
      const across = Math.abs(x * v[1]) + Math.abs(y * v[0]);
      if (along > HALF - r && along < HALF + DOOR_T + r && across < HALF + r) return false;
    }
    return true;
  }

  dogMap() {
    return this.toMap(this.dog.x, this.dog.y);
  }

  /** Nächster begehbarer Punkt in Kartenkoordinaten (Raster-Suche). */
  nearestValid(p) {
    if (this.walkable(p.x, p.y)) return p;
    for (let rad = 2; rad <= 400; rad += 2) {
      let best = null;
      let bd = Infinity;
      for (let a = 0; a < 360; a += 10) {
        const x = p.x + Math.cos((a * Math.PI) / 180) * rad;
        const y = p.y + Math.sin((a * Math.PI) / 180) * rad;
        if (this.walkable(x, y) && rad < bd) {
          best = { x, y };
          bd = rad;
        }
      }
      if (best) return best;
    }
    return { x: this.cam.x, y: this.cam.y };
  }

  /** Dackel (Bildschirm) zurück auf begehbaren Boden setzen. */
  fixDog() {
    const m = this.dogMap();
    if (this.walkable(m.x, m.y)) return;
    const v = this.nearestValid(m);
    const r = vec(this.theta);
    const d = vec(turnCW(this.theta));
    const ox = (v.x - this.cam.x) * r[0] + (v.y - this.cam.y) * r[1];
    const oy = (v.x - this.cam.x) * d[0] + (v.y - this.cam.y) * d[1];
    this.dog.x = clamp(SCREEN_W / 2 + ox, DOG_MARGIN, SCREEN_W - DOG_MARGIN);
    this.dog.y = clamp(SCREEN_H / 2 + oy, DOG_MARGIN, SCREEN_H - DOG_MARGIN);
  }

  // ------------------------------------------------------- Aktionen
  /** Fenster drehen: -1 = links (−90°), +1 = rechts (+90°). s bleibt. */
  rotate(k) {
    if (this.swing) return false;
    const a0 = this.ang;
    this.theta = k > 0 ? turnCW(this.theta) : turnCCW(this.theta);
    // Das Fenster dreht sich um den Dackel: seine Kartenposition und Bildschirmstelle bleiben fest.
    this.swing = {
      t: 0,
      a0,
      a1: a0 + (k > 0 ? Math.PI / 2 : -Math.PI / 2),
      pivot: this.toMap(this.dog.x, this.dog.y, this.cam, k > 0 ? turnCCW(this.theta) : turnCW(this.theta)),
    };
    return true;
  }

  /** 180°: nur s wechselt. */
  flip() {
    this.s = this.s === 'R' ? 'L' : 'R';
  }

  // --------------------------------------------------------- Update
  update(dt, input = {}) {
    this.time += dt;
    if (this.hint > 0) this.hint -= dt;

    if (this.swing) {
      const sw = this.swing;
      sw.t = Math.min(SWING_TIME, sw.t + dt);
      const k = smooth(sw.t / SWING_TIME);
      this.ang = sw.a0 + (sw.a1 - sw.a0) * k;
      const ox = this.dog.x - SCREEN_W / 2;
      const oy = this.dog.y - SCREEN_H / 2;
      const c = Math.cos(this.ang);
      const sn = Math.sin(this.ang);
      this.cam.x = sw.pivot.x - (ox * c - oy * sn);
      this.cam.y = sw.pivot.y - (ox * sn + oy * c);
      if (sw.t >= SWING_TIME) {
        this.ang = sw.a1;
        this.swing = null;
        this.fixDog();
      }
      return; // Die Drehung pausiert das Spiel; Eingaben werden ignoriert.
    }

    if (input.rotLeft) return void this.rotate(-1);
    if (input.rotRight || input.espressoPressed) return void this.rotate(1);
    if (input.wende) this.flip();

    // Umkehr: Scrollrichtung läuft weich durch null
    this.dir = approach(this.dir, this.s === 'R' ? 1 : -1, TURN_RATE * dt);
    this.moveCam(dt);
    this.moveDog(dt, input);
    this.followCam(dt);

    const b = BONE_POS(this.target);
    const m = this.dogMap();
    if (Math.hypot(m.x - b.x, m.y - b.y) < BONE_R) {
      this.score++;
      this.pickTarget(this.target);
    }
  }

  /** Fenster scrollt in Blickrichtung (überall gleich, auch im Gang) und hält an, wenn der Dackel
   *  sonst in eine Wand/geschlossene Tür geriete oder das Ende der Karte erreicht ist. */
  moveCam(dt) {
    const r = vec(this.theta);
    const step = SPEED * this.dir * dt;
    const n = { x: this.cam.x + r[0] * step, y: this.cam.y + r[1] * step };
    // Nicht weiter aus dem Scroll-Behälter hinaus als jetzt (kein Sprung: Rückkehr macht followCam weich).
    const out = (c) => Math.hypot(c.x - clampCam(c.x, c.y).x, c.y - clampCam(c.x, c.y).y);
    if (out(n) > out(this.cam) + 1e-9) return;
    const m = this.toMap(this.dog.x, this.dog.y, n);
    if (!this.walkable(m.x, m.y)) return;
    this.cam.x = n.x;
    this.cam.y = n.y;
  }

  /** Kamera folgt dem Dackel quer zur Scrollrichtung (innerhalb des Scroll-Behälters) und kehrt in ihn zurück.
   *  Die Kartenposition des Dackels bleibt dabei gleich: seine Bildschirmstelle gleicht die Bewegung aus. */
  followCam(dt) {
    const r = vec(this.theta);
    const d = vec(turnCW(this.theta));
    const oy = this.dog.y - SCREEN_H / 2;
    const t = clampCam(this.cam.x + d[0] * oy, this.cam.y + d[1] * oy);
    const k = Math.min(1, FOLLOW * dt);
    const dx = (t.x - this.cam.x) * k;
    const dy = (t.y - this.cam.y) * k;
    this.cam.x += dx;
    this.cam.y += dy;
    this.dog.x = clamp(this.dog.x - (dx * r[0] + dy * r[1]), DOG_MARGIN, SCREEN_W - DOG_MARGIN);
    this.dog.y = clamp(this.dog.y - (dx * d[0] + dy * d[1]), DOG_MARGIN, SCREEN_H - DOG_MARGIN);
  }

  moveDog(dt, input) {
    const dx = (input.mx || 0) * DOG_SPEED * dt;
    const dy = (input.my || 0) * DOG_SPEED * dt;
    const tryMove = (nx, ny) => {
      nx = clamp(nx, DOG_MARGIN, SCREEN_W - DOG_MARGIN);
      ny = clamp(ny, DOG_MARGIN, SCREEN_H - DOG_MARGIN);
      const m = this.toMap(nx, ny);
      if (this.walkable(m.x, m.y)) {
        this.dog.x = nx;
        this.dog.y = ny;
      }
    };
    tryMove(this.dog.x + dx, this.dog.y);
    tryMove(this.dog.x, this.dog.y + dy);
    // Der Boden schiebt den Dackel mit dem Fenster mit: ist er trotzdem drin, zurücksetzen.
    this.fixDog();
  }
}

export function BONE_POS(armI) {
  const v = vec(ARMS[armI].dir);
  return { x: v[0] * BONE_AT, y: v[1] * BONE_AT };
}
