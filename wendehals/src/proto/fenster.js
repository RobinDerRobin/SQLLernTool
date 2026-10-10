// Prototyp P1 „Kreuzung“ und P1c „Netz“ – das drehende Fenster (Wegwerf-Prototyp, Briefe: docs/prototypen/P1-kreuzung.md,
// docs/prototypen/P1c-netz.md). Die Szene bekommt ihre Karte als Parameter (karte.js): P1 = Kreuz, P1c = Netz.
//
// Geparkt, nicht vergessen (bewusst NICHT hier): Schleife/Landmarken/„wo ist zuhause“ (P2),
// 45°-Drehungen und Diagonalen (P3), Gegner und Schießen (P4), Minimap oder Kompass, Halt-Zonen,
// Protokolle und Messungen, Festhalten der Stick-Bedeutung, Speichern, Fähigkeiten/Drehzahl,
// jede Änderung an worldgraph*/Löser/welt.json/Level/Arena, Tester-Agenten.
//
// Modell: Der Plan ist ein Grundriss (Karte, y nach unten, Norden oben). Der Bildschirm ist ein Fenster.
// theta = Kartenrichtung, in die das rechte Fensterende zeigt; s = 'R'|'L' = Seite, zu der gescrollt wird.
// Blickrichtung h = theta (s = R) bzw. opposite(theta) (s = L).
//
// Kamera (Hypothesen, der Spieltest entscheidet): Das Fenster scrollt in Blickrichtung mit SPEED und hält nirgends an (nicht an
// Wänden, nicht an Gangenden). Der Dackel hängt immer und ausnahmslos am Fenster (feste Bildschirmstelle plus Stick). Berührt der
// Kreis des Dackels eine Wand oder den Bildrand, stirbt er und beginnt kurz darauf an der letzten Kreuzung neu (keine Strafe).
// Quer folgt die Kamera dem Dackel im Scroll-Behälter des Gangs K; K ist der dem Dackel nächste Gang in Flugrichtung.

import { E, S, W, N, DIR_VEC, turnCW, turnCCW, opposite, headingAngle, SCREEN_W, SCREEN_H, approach, clamp } from '../core/math.js';
import { Rng } from '../core/rng.js';
import { compileMap } from './karte.js';

export const SPEED = 70; // Scrollgeschwindigkeit (Einheiten/s)
export const ARM = 720; // Länge eines Arms (ab Kreuzungsrand) – P1
export const WIDTH = 200; // Gangbreite
export const HALF = WIDTH / 2;
export const END = HALF + ARM; // Ende der Arme (Mittelpunkt der Kreuzung = 0,0) – P1
export const CAM_END = END - 60; // so weit scrollt das Fenster höchstens – P1
export const BONE_AT = END - 30;
export const BONE_R = 24;
export const DOG_SPEED = 120;
export const DOG_R = 8;
export const DOG_MARGIN = 14;
export const CAMW = 40; // Scroll-Behälter: so weit darf die Fenstermitte quer von der Gangmitte abweichen (Gang 200)
export const TURN_AHEAD = 160; // Toleranz: so weit vor/hinter der Kreuzung (im Gang) darf schon gedreht werden
export const DENY_TIME = 0.45; // Dauer der Ablehnungs-Anzeige (Tastensymbol wackelt rot)
export const FOLLOW_MAX = 140; // höchstes Nachzieh-Tempo der Kamera quer (Einheiten/s)
export const FOLLOW_TAIL = 5; // letzte Einheiten vor dem Ziel: Geschwindigkeit 5/s · Abstand (weiches Ausklingen)
export const FOLLOW_ACC = 250; // höchste Beschleunigung des Quer-Folgens (Einheiten/s²): kein Richtungsknick
export const COMFORT = 95; // so weit darf der Dackel (quer) von der Bildmitte abweichen, bevor die Kamera nachzieht (Bildrand: 121)
export const K_HYST = 40; // Kamera-Gang: so viel näher muss der Dackel am anderen Gang sein, bevor die Kamera umschaltet
export const RESPAWN_TIME = 0.7; // kurzer Neustart nach dem Tod (Sekunden, ohne Strafe)
export const SWING_TIME = 0.5;
export const TURN_RATE = 5; // Umkehr: 1/0,4 s * 2 (von -1 nach 1 in 0,4 s)

export const ARMS = [
  { dir: N, name: 'Norden', color: '#e0443a' },
  { dir: E, name: 'Osten', color: '#3f7be0' },
  { dir: S, name: 'Süden', color: '#3fb04a' },
  { dir: W, name: 'Westen', color: '#e8c63a' },
];
export const armIndex = (dir) => ARMS.findIndex((a) => a.dir === dir);

/** P1-Karte: ein Kreuz mit vier Sackgassen-Armen, Knochen am Ende jedes Arms, Start am Ende des Westarms. */
export const KREUZ_MAP = compileMap({
  name: 'kreuz',
  corridors: [
    { id: 'west-ost', axis: 'h', c: 0, a0: -END, a1: END, w: WIDTH },
    { id: 'nord-sued', axis: 'v', c: 0, a0: -END, a1: END, w: WIDTH },
  ],
  bones: ARMS.map((arm) => ({ x: DIR_VEC[arm.dir][0] * BONE_AT, y: DIR_VEC[arm.dir][1] * BONE_AT, color: arm.color, name: arm.name })),
  start: { corridor: 'west-ost', cam: { x: -CAM_END, y: 0 }, dog: { x: 120, y: SCREEN_H / 2 }, theta: E, s: 'R', notTarget: armIndex(W) },
});

/** Fenstermitte auf den Scroll-Behälter des Kreuzes begrenzen: zwei Balken der Breite 2*CAMW, Länge CAM_END. */
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
// Einheitsvektoren: gerade Richtungen unverändert, Diagonalen auf Länge 1 normiert (Tempo in allen 8 Richtungen gleich, P3).
const UNIT = DIR_VEC.map(([x, y]) => (x && y ? [x * Math.SQRT1_2, y * Math.SQRT1_2] : [x, y]));
const vec = (d) => UNIT[d];
export const unitVec = vec;

export class FensterScene {
  constructor({ rng = new Rng(0xf1e57e4), map = KREUZ_MAP } = {}) {
    this.map = map;
    this.rng = rng;
    this.time = 0;
    const st = map.start;
    this.theta = st.theta;
    this.s = st.s;
    this.ang = headingAngle(this.theta); // Anzeigewinkel (fortlaufend); Plan wird um -ang gedreht
    this.dir = this.s === 'R' ? 1 : -1; // weiche Scrollrichtung: +1 = R, -1 = L (Dackel-Spiegelung)
    this.cam = { ...st.cam };
    this.dog = { ...st.dog }; // Bildschirmkoordinaten
    this.K = map.byId[st.corridor]; // der Gang, durch den das Fenster gerade scrollt
    this.vc = 0; // Quer-Geschwindigkeit der Kamera (Einheiten/s)
    this.deaths = 0;
    this.respawn = null; // { t } – kurzer Neustart nach dem Tod
    this.deadFx = 0; // Anzeige: roter Blitz nach dem Tod (Sekunden)
    this.swing = null; // { t, a0, a1, pivot } – Drehpunkt = Kartenposition des Dackels
    this.score = 0;
    this.denied = null; // { side: 'L'|'R', t } – Drehen abgelehnt
    this.sfx = []; // Töne für das Spiel (wird von game.js geleert)
    this.target = 0;
    this.hint = 8; // Sekunden Starthinweis
    this.pickTarget(st.notTarget ?? -1);
    this.fixDog(); // Startlage in den Boden setzen
    this.checkpoint = { ...this.dogMap(), theta: this.theta, s: this.s };
    this.trackJunction();
  }

  get h() {
    return this.s === 'R' ? this.theta : opposite(this.theta);
  }

  /** Kreuzung, an der in dieser Lage in Richtung k (−1 links, +1 rechts) gedreht werden darf – sonst null. Drehen geht nur
   *  in der Dreh-Zone einer Kreuzung (Quadrat plus TURN_AHEAD davor/dahinter) und nur, wenn in der neuen Flugrichtung ein
   *  Gang von dieser Kreuzung wegführt. Die Drehung ändert die Position des Dackels nie. */
  turnJunction(k) {
    const m = this.dogMap();
    const hNew = k > 0 ? turnCW(this.h) : turnCCW(this.h);
    return this.map.turnJunction(m.x, m.y, hNew, DOG_R, TURN_AHEAD);
  }

  canTurnBy(k) {
    return !!this.turnJunction(k);
  }

  /** Das Dreh-Symbol leuchtet, sobald mindestens eine Drehung möglich ist. */
  get canTurn() {
    return this.canTurnBy(-1) || this.canTurnBy(1);
  }

  pickTarget(not) {
    let t;
    do t = this.rng.int(0, this.map.bones.length - 1);
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

  /** Gänge sind eckig; Kreis mit Radius r. Türen gibt es nicht (Robin, nach Spieltest P1). */
  walkable(x, y, r = DOG_R) {
    return this.map.walkable(x, y, r);
  }

  dogMap() {
    return this.toMap(this.dog.x, this.dog.y);
  }

  /** Nur für Tests und Screenshots: Lage setzen (Karte, Ausrichtung, Seite, Bildschirmstelle des Dackels). */
  warp(mx, my, theta, s, dogScreen = { x: SCREEN_W / 2, y: SCREEN_H / 2 }) {
    this.theta = theta;
    this.s = s;
    this.ang = headingAngle(theta);
    this.dir = s === 'R' ? 1 : -1;
    this.swing = null;
    this.vc = 0;
    this.respawn = null;
    this.dog = { ...dogScreen };
    const r = vec(theta);
    const d = vec(turnCW(theta));
    const ox = dogScreen.x - SCREEN_W / 2;
    const oy = dogScreen.y - SCREEN_H / 2;
    this.cam = { x: mx - ox * r[0] - oy * d[0], y: my - ox * r[1] - oy * d[1] };
    this.K = this.map.corridorAt(mx, my, this.h);
    this.checkpoint = { x: mx, y: my, theta, s };
    this.trackJunction();
    return this;
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

  /** Startlage: liegt der Dackel beim Anlegen der Szene nicht auf Boden, kommt er auf den nächsten begehbaren Punkt. */
  fixDog() {
    const m = this.dogMap();
    if (this.walkable(m.x, m.y, DOG_R)) return;
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
    const j = this.turnJunction(k);
    if (!j) return false;
    const a0 = this.ang;
    const pivot = this.dogMap();
    this.theta = k > 0 ? turnCW(this.theta) : turnCCW(this.theta);
    this.K = this.map.corridorFor(j, this.h);
    this.vc = 0;
    // Das Fenster dreht sich um den Dackel: seine Kartenposition und Bildschirmstelle bleiben fest.
    this.swing = { t: 0, a0, a1: a0 + (k > 0 ? Math.PI / 2 : -Math.PI / 2), pivot };
    return true;
  }

  /** Gewünschte Drehung aus der Eingabe (Vorzeichen = Seite; P3 „45°-Kreuzung“ überschreibt das mit 45°-Schritten). */
  rotInput(input) {
    return input.rotLeft ? -1 : input.rotRight || input.espressoPressed ? 1 : 0;
  }

  /** 180°: nur s wechselt. */
  flip() {
    this.s = this.s === 'R' ? 'L' : 'R';
  }

  // --------------------------------------------------------- Update
  update(dt, input = {}) {
    this.time += dt;
    if (this.hint > 0) this.hint -= dt;
    if (this.denied && (this.denied.t -= dt) <= 0) this.denied = null;
    if (this.deadFx > 0) this.deadFx = Math.max(0, this.deadFx - dt);

    if (this.swing) {
      const sw = this.swing;
      sw.t = Math.min(SWING_TIME, sw.t + dt);
      const k = smooth(sw.t / SWING_TIME);
      this.ang = sw.a0 + (sw.a1 - sw.a0) * k;
      const px = sw.pivot.x;
      const py = sw.pivot.y;
      const ox = this.dog.x - SCREEN_W / 2;
      const oy = this.dog.y - SCREEN_H / 2;
      const c = Math.cos(this.ang);
      const sn = Math.sin(this.ang);
      this.cam.x = px - (ox * c - oy * sn);
      this.cam.y = py - (ox * sn + oy * c);
      if (sw.t >= SWING_TIME) {
        this.ang = sw.a1;
        this.swing = null;
      }
      return; // Die Drehung pausiert das Spiel; Eingaben werden ignoriert.
    }

    if (this.respawn) {
      if ((this.respawn.t -= dt) <= 0) this.respawn = null;
      return; // kurzer Neustart: nichts bewegt sich
    }

    const rotK = this.rotInput(input);
    if (rotK && this.rotate(rotK)) return;
    if (rotK) {
      this.denied = { side: rotK < 0 ? 'L' : 'R', t: DENY_TIME };
      this.sfx.push('nope');
    }
    if (input.wende) this.flip();

    // Umkehr: Scrollrichtung läuft weich durch null
    this.dir = approach(this.dir, this.s === 'R' ? 1 : -1, TURN_RATE * dt);
    this.moveCam(dt);
    this.moveDog(dt, input);
    this.selectK();
    this.followCam(dt);
    if (this.touchesDanger()) {
      this.die();
      return;
    }
    this.trackJunction();

    const b = this.map.bones[this.target];
    const m = this.dogMap();
    if (Math.hypot(m.x - b.x, m.y - b.y) < BONE_R) {
      this.score++;
      this.pickTarget(this.target);
    }
  }

  /** Wand oder Bildrand berührt (Kreis des Dackels, Radius DOG_R)? */
  touchesDanger() {
    const { x, y } = this.dog;
    if (x < DOG_R || x > SCREEN_W - DOG_R || y < DOG_R || y > SCREEN_H - DOG_R) return true;
    const m = this.dogMap();
    return !this.walkable(m.x, m.y, DOG_R);
  }

  /** Letzte Kreuzung merken, in deren Quadrat der Dackel war (samt Ausrichtung, mit der er dort flog). */
  trackJunction() {
    const m = this.dogMap();
    const r = DOG_R;
    let best = null;
    let bd = Infinity;
    for (const j of this.map.junctions) {
      if (m.x < j.x0 + r || m.x > j.x1 - r || m.y < j.y0 + r || m.y > j.y1 - r) continue;
      const d = Math.hypot(m.x - j.cx, m.y - j.cy);
      if (d < bd) {
        best = j;
        bd = d;
      }
    }
    if (best) this.checkpoint = { x: best.cx, y: best.cy, theta: this.theta, s: this.s };
  }

  /** Tod: kurzer Neustart ohne Strafe an der letzten Kreuzung (Zielfarbe und Punkte bleiben). */
  die() {
    const c = this.checkpoint;
    this.deaths++;
    this.sfx.push('death');
    this.warp(c.x, c.y, c.theta, c.s);
    this.respawn = { t: RESPAWN_TIME };
    this.deadFx = RESPAWN_TIME;
  }

  /** Kamera-Gang K laufend wählen: der Gang in Flugrichtung, in dem der Dackel steht; sonst der ihm nächste Gang der
   *  Kreuzungen, in deren Dreh-Zone er steht. Der alte Gang bleibt, solange der neue nicht deutlich (K_HYST) näher liegt. */
  selectK() {
    const m = this.dogMap();
    const map = this.map;
    const hv = this.h;
    const dist = (c) => Math.hypot(Math.max(c.x0 - m.x, 0, m.x - c.x1), Math.max(c.y0 - m.y, 0, m.y - c.y1));
    const cand = new Set();
    for (const j of map.zonesAt(m.x, m.y, DOG_R, TURN_AHEAD)) if (j.ports.includes(hv)) cand.add(map.corridorFor(j, hv));
    for (const c of map.corridors) if (c.axis === this.K.axis && this.inGang(m, c)) cand.add(c);
    if (!cand.size) return;
    let best = null;
    let bd = Infinity;
    for (const c of cand) {
      const d = dist(c);
      if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && best && c.hw < best.hw)) {
        best = c;
        bd = d;
      }
    }
    if (best === this.K) return;
    const curIn = this.inGang(m, this.K);
    const bestIn = this.inGang(m, best);
    if ((bestIn && !curIn) || dist(this.K) > bd + K_HYST) this.K = best;
  }

  /** Der Dackel steht im Gang K (Kreis ganz im Rechteck des Gangs). */
  inGang(m, K = this.K) {
    const r = DOG_R - 0.05;
    return m.x >= K.x0 + r && m.x <= K.x1 - r && m.y >= K.y0 + r && m.y <= K.y1 - r;
  }

  /** Fenster scrollt in Blickrichtung mit SPEED und hält nie an; der Dackel wird immer mitgetragen (feste Bildschirmstelle). */
  moveCam(dt) {
    const sign = this.dir >= 0 ? 1 : -1;
    const r = vec(this.theta);
    const step = SPEED * Math.abs(this.dir) * dt;
    this.cam.x += r[0] * sign * step;
    this.cam.y += r[1] * sign * step;
  }

  /** Kamera folgt dem Dackel quer zur Scrollrichtung (innerhalb des Scroll-Behälters des Gangs K). Die Kartenposition des
   *  Dackels bleibt dabei gleich: seine Bildschirmstelle gleicht die Bewegung aus. Die Quer-Geschwindigkeit ändert sich
   *  nur begrenzt (FOLLOW_ACC): keine Richtungsknicke. */
  followCam(dt) {
    if (dt <= 0) return;
    const d = vec(turnCW(this.theta));
    const K = this.K;
    const lat = K.axis === 'h' ? d[1] : d[0]; // ±1: Bildschirm-unten zeigt auf der Querachse des Gangs in/gegen Koordinatenrichtung
    const centerD = K.c * lat;
    const cross = this.cam.x * d[0] + this.cam.y * d[1];
    const half = this.map.camHalfWidth(K, K.axis === 'h' ? this.cam.x : this.cam.y, DOG_R, DOG_MARGIN);
    const dogCross = cross + (this.dog.y - SCREEN_H / 2);
    let want = clamp(dogCross, centerD - half, centerD + half);
    want = clamp(want, dogCross - COMFORT, dogCross + COMFORT); // der Dackel bleibt in der Komfortzone, die Kamera zieht rechtzeitig nach
    // Nur so weit, dass der Dackel nicht über den Bildrand geschoben wird.
    const lo = Math.min(0, this.dog.y - (SCREEN_H - DOG_MARGIN));
    const hi = Math.max(0, this.dog.y - DOG_MARGIN);
    const err = clamp(want - cross, lo, hi);
    // Zielgeschwindigkeit: so schnell, dass die Kamera mit höchstens FOLLOW_ACC noch rechtzeitig am Ziel zum Stehen kommt
    // (weiches Anfahren und Bremsen, kein Überschwingen, keine Richtungsknicke).
    const vt = Math.sign(err) * Math.min(FOLLOW_MAX, Math.sqrt(0.5 * FOLLOW_ACC * Math.abs(err)), FOLLOW_TAIL * Math.abs(err));
    this.vc += clamp(vt - this.vc, -FOLLOW_ACC * dt, FOLLOW_ACC * dt);
    let delta = this.vc * dt;
    if (Math.abs(err) < 0.02 && Math.abs(this.vc) < 1) delta = err; // am Ziel einrasten (nur noch Rest-Zittern)
    delta = clamp(delta, lo, hi);
    this.vc = delta / dt;
    this.cam.x += d[0] * delta;
    this.cam.y += d[1] * delta;
    this.dog.y -= delta; // Kartenposition des Dackels bleibt gleich
  }

  /** Stick bewegt den Dackel im Bild. Wände und Bildrand halten ihn nicht auf: Berührung ist tödlich (touchesDanger). */
  moveDog(dt, input) {
    this.dog.x += (input.mx || 0) * DOG_SPEED * dt;
    this.dog.y += (input.my || 0) * DOG_SPEED * dt;
  }
}

export function BONE_POS(armI) {
  const v = vec(ARMS[armI].dir);
  return { x: v[0] * BONE_AT, y: v[1] * BONE_AT };
}
