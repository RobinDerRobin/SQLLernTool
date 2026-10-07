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
// Kamera (Hypothesen, der Spieltest entscheidet): Das Fenster scrollt in Blickrichtung durch den Gang K (Kamerabereich =
// Gang minus Rand). Der Dackel hängt am Fenster (feste Bildschirmstelle), solange vor ihm Platz ist; sonst hält das Fenster.
// Wurde „zu früh“ gedreht (der Dackel steht noch im alten Gang), gleitet nur die Kamera in den neuen Gang und scrollt weiter
// („Gleiten“): der Dackel bleibt an seiner Kartenstelle und wandert im Bild zur Seite; am Bildrand wartet die Kamera.

import { E, S, W, N, DIR_VEC, turnCW, turnCCW, opposite, headingAngle, SCREEN_W, SCREEN_H, approach, clamp } from '../core/math.js';
import { Rng } from '../core/rng.js';
import { compileMap } from './karte.js';

export const SPEED = 90; // Scrollgeschwindigkeit (Einheiten/s)
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
export const FOLLOW_MAX = 120; // höchstes Nachzieh-Tempo der Kamera quer (Einheiten/s)
export const FOLLOW_TAIL = 5; // letzte Einheiten vor dem Ziel: Geschwindigkeit 5/s · Abstand (weiches Ausklingen)
export const FOLLOW_ACC = 90; // höchste Beschleunigung des Quer-Folgens (Einheiten/s²): kein Richtungsknick
export const SCROLL_RAMP = 1; // Anfahren: so schnell darf das Scrolltempo (Anteil von SPEED) pro Sekunde wachsen – kein Ruck nach Halt oder Schwenk
export const SCROLL_DECEL = 1.5; // Bremsen: so schnell darf das Scrolltempo (Anteil von SPEED) pro Sekunde fallen, solange der Platz reicht
export const COMFORT = 95; // so weit darf der Dackel (quer) von der Bildmitte abweichen, bevor die Kamera nachzieht (Bildrand: 121)
export const EASE = 100; // Auslauf: so weit vor einer Grenze (Wand, Gangende, Bildrand) bremst das Scrollen weich ab
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
const vec = (d) => DIR_VEC[d];

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
    this.glide = false; // true: zu früh gedreht, Kamera gleitet in den neuen Gang, der Dackel wird nicht mitgetragen
    this.vc = 0; // Quer-Geschwindigkeit der Kamera (Einheiten/s)
    this.sp = 1; // Scrolltempo als Anteil von SPEED (läuft nach Halt und Schwenk weich an)
    this.hardStop = false;
    this.shoves = 0; // Zähler Sicherheitsnetz: so oft wurde der Dackel versetzt (muss 0 bleiben)
    this.swing = null; // { t, a0, a1, pivot } – Drehpunkt = Kartenposition des Dackels
    this.score = 0;
    this.denied = null; // { side: 'L'|'R', t } – Drehen abgelehnt
    this.sfx = []; // Töne für das Spiel (wird von game.js geleert)
    this.target = 0;
    this.hint = 8; // Sekunden Starthinweis
    this.pickTarget(st.notTarget ?? -1);
    this.fixDog(true); // Startlage in den Boden setzen (zählt nicht)
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
    this.glide = false;
    this.vc = 0;
    this.sp = 1;
    this.dog = { ...dogScreen };
    const r = vec(theta);
    const d = vec(turnCW(theta));
    const ox = dogScreen.x - SCREEN_W / 2;
    const oy = dogScreen.y - SCREEN_H / 2;
    this.cam = { x: mx - ox * r[0] - oy * d[0], y: my - ox * r[1] - oy * d[1] };
    this.K = this.map.corridorAt(mx, my, theta);
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

  /** Dackel (Bildschirm) zurück auf begehbaren Boden setzen. Sicherheitsnetz: Tests verlangen shoves === 0. */
  fixDog(initial = false) {
    const m = this.dogMap();
    if (this.walkable(m.x, m.y, DOG_R - 0.1)) return; // Toleranz größer als beim Mitnehmen: Scrollen bis an die Wand löst nie ein Versetzen aus
    if (!initial) this.shoves++;
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
    this.sp = 0;
    // Steht der Dackel schon im neuen Gang (Kreuzungsquadrat), trägt die Kamera ihn wie gewohnt mit; sonst („zu früh
    // gedreht“, er steht noch im alten Gang) gleitet nur die Kamera in den neuen Gang.
    this.glide = !this.inGang(pivot);
    // Das Fenster dreht sich um den Dackel: seine Kartenposition und Bildschirmstelle bleiben fest.
    this.swing = { t: 0, a0, a1: a0 + (k > 0 ? Math.PI / 2 : -Math.PI / 2), pivot };
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
    if (this.denied && (this.denied.t -= dt) <= 0) this.denied = null;

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
        this.fixDog();
      }
      return; // Die Drehung pausiert das Spiel; Eingaben werden ignoriert.
    }

    const rotK = input.rotLeft ? -1 : input.rotRight || input.espressoPressed ? 1 : 0;
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
    this.followCam(dt);
    if (this.glide && this.inGang(this.dogMap())) this.glide = false; // der Dackel ist im neuen Gang angekommen

    const b = this.map.bones[this.target];
    const m = this.dogMap();
    if (Math.hypot(m.x - b.x, m.y - b.y) < BONE_R) {
      this.score++;
      this.pickTarget(this.target);
    }
  }

  /** Der Dackel steht im Gang K (dem Gang der Flugrichtung): dort darf ihn die Kamera mitnehmen. */
  inGang(m, K = this.K) {
    const r = DOG_R - 0.05;
    return m.x >= K.x0 + r && m.x <= K.x1 - r && m.y >= K.y0 + r && m.y <= K.y1 - r;
  }

  /** Freie Scrollstrecke in Richtung sign*r: Ende des Kamerabereichs im Gang K; im Gleiten der Bildrand hinter dem Dackel
   *  (die Kamera wartet am Rand), sonst der Platz vor dem mitgetragenen Dackel (Wand). */
  scrollLimit(sign, r) {
    const [lo, hi] = this.map.camRange(this.K);
    const along = this.K.axis === 'h' ? r[0] : r[1]; // ±1: Scrollachse liegt auf der Achse des Gangs
    const a = this.cam.x * r[0] + this.cam.y * r[1];
    const rLo = along > 0 ? lo : -hi;
    const rHi = along > 0 ? hi : -lo;
    let lim = sign > 0 ? rHi - a : a - rLo;
    if (this.glide) {
      lim = Math.min(lim, sign > 0 ? this.dog.x - DOG_MARGIN : SCREEN_W - DOG_MARGIN - this.dog.x);
    } else {
      const m = this.dogMap();
      lim = Math.min(lim, this.map.freeDistance(m.x, m.y, r[0] * sign, r[1] * sign, EASE, DOG_R - 0.05));
    }
    return Math.max(0, lim);
  }

  /** Fenster scrollt in Blickrichtung (überall gleich), bremst vor Grenzen weich ab und hält dort an. Es schiebt den Dackel
   *  nie: seine Kartenposition ändert sich nur durch das Scrollen in Blickrichtung und durch den Stick. */
  moveCam(dt) {
    const sign = this.dir >= 0 ? 1 : -1;
    const r = vec(this.theta);
    const lim = this.scrollLimit(sign, r);
    const want = Math.abs(this.dir) * Math.min(1, lim / EASE);
    this.sp = want < this.sp ? Math.max(want, this.sp - SCROLL_DECEL * dt) : Math.min(want, this.sp + SCROLL_RAMP * dt);
    const nominal = SPEED * this.sp * dt;
    const step = Math.min(nominal, lim); // nie weiter, als Platz ist (die Kamera schiebt den Dackel nie in eine Wand)
    this.hardStop = step < nominal - 1e-9; // Messhilfe: die Wand hat die Kamera angehalten (der Spieler steuerte den Dackel davor)
    this.sp = Math.min(this.sp, step / (SPEED * dt)); // hielt die Wand sie an, fährt sie danach von null an (kein Ruck beim Lösen)
    if (step > 0) {
      this.cam.x += r[0] * sign * step;
      this.cam.y += r[1] * sign * step;
      if (this.glide) this.dog.x -= sign * step; // Dackel bleibt an seiner Kartenstelle, wandert im Bild zurück
    }
    this.pullBack(sign, r, dt);
  }

  /** Liegt die Fenstermitte außerhalb des Kamerabereichs (z. B. nach einem Schwenk um einen Dackel am Bildrand) und zeigt die
   *  Flugrichtung vom Bereich weg, kehrt sie weich zurück. Der Dackel bleibt dabei an seiner Kartenstelle. */
  pullBack(sign, r, dt) {
    const [lo, hi] = this.map.camRange(this.K);
    const along = this.K.axis === 'h' ? r[0] : r[1];
    const a = this.cam.x * r[0] + this.cam.y * r[1];
    const rLo = along > 0 ? lo : -hi;
    const rHi = along > 0 ? hi : -lo;
    const out = a < rLo ? a - rLo : a > rHi ? a - rHi : 0;
    if (out === 0 || out < 0 !== sign < 0) return; // drin, oder die Flugrichtung führt in den Bereich hinein
    const toward = out < 0 ? 1 : -1;
    const room = toward > 0 ? this.dog.x - DOG_MARGIN : SCREEN_W - DOG_MARGIN - this.dog.x;
    const dlt = Math.min(Math.abs(out), room, Math.min(SPEED * 0.7, Math.abs(out) * 2 + 3) * dt);
    if (dlt <= 0) return;
    this.cam.x += r[0] * toward * dlt;
    this.cam.y += r[1] * toward * dlt;
    this.dog.x -= toward * dlt;
  }

  /** Kamera folgt dem Dackel quer zur Scrollrichtung (innerhalb des Scroll-Behälters des Gangs K) und kehrt in ihn zurück.
   *  Die Kartenposition des Dackels bleibt dabei gleich: seine Bildschirmstelle gleicht die Bewegung aus. Die Quer-
   *  Geschwindigkeit ändert sich nur begrenzt (FOLLOW_ACC): keine Richtungsknicke. */
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
    // Nur so weit, dass der Dackel im Bild bleibt – sonst würde der Bildrand ihn in der Karte verschieben.
    const lo = this.dog.y - (SCREEN_H - DOG_MARGIN);
    const hi = this.dog.y - DOG_MARGIN;
    const err = clamp(want - cross, lo, hi);
    // Zielgeschwindigkeit: so schnell, dass die Kamera mit höchstens FOLLOW_ACC noch rechtzeitig am Ziel zum Stehen kommt
    // (weiches Anfahren und Bremsen, kein Überschwingen, keine Richtungsknicke).
    const vt = Math.sign(err) * Math.min(FOLLOW_MAX, Math.sqrt(0.5 * FOLLOW_ACC * Math.abs(err)), FOLLOW_TAIL * Math.abs(err));
    this.vc += clamp(vt - this.vc, -FOLLOW_ACC * dt, FOLLOW_ACC * dt);
    let delta = this.vc * dt;
    if (Math.abs(err) < 0.02 && Math.abs(this.vc) < 4) delta = err; // am Ziel einrasten (nur noch Rest-Zittern)
    delta = clamp(delta, lo, hi);
    this.vc = delta / dt;
    this.cam.x += d[0] * delta;
    this.cam.y += d[1] * delta;
    this.dog.y -= delta; // Kartenposition des Dackels bleibt gleich
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
    this.fixDog();
  }
}

export function BONE_POS(armI) {
  const v = vec(ARMS[armI].dir);
  return { x: v[0] * BONE_AT, y: v[1] * BONE_AT };
}
