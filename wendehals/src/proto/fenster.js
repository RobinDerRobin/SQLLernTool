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
export const TURN_AHEAD = 160; // Toleranz: so weit vor/hinter der Kreuzung (im Gang) darf schon gedreht werden
export const LOOK = 120; // so weit schaut die Kamera voraus, um vor einer Kante rechtzeitig einzuschwenken (Kurve)
export const DENY_TIME = 0.45; // Dauer der Ablehnungs-Anzeige (Tastensymbol wackelt rot)
export const FOLLOW_MAX = 150; // höchstes Nachzieh-Tempo der Kamera quer (Einheiten/s)
export const SLIDE_MAX = 120; // so weit sucht die Kamera seitlich nach einem Weg um eine Kante
export const SLIDE_RATE = 700; // Beschleunigung des seitlichen Gleitens (Einheiten/s²)
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
    this.swing = null; // { t, a0, a1, pivot } – Drehpunkt = Kartenposition des Dackels
    this.score = 0;
    this.denied = null; // { side: 'L'|'R', t } – Drehen außerhalb der Kreuzung abgelehnt
    this.sfx = []; // Töne für das Spiel (wird von game.js geleert)
    this.slide = 0; // seitliche Gleitgeschwindigkeit der Kamera (an Kanten)
    this.target = 0;
    this.hint = 8; // Sekunden Starthinweis
    this.pickTarget(armIndex(W));
  }

  /** Drehen geht nur, wo Platz ist: auf der Kreuzung – mit Toleranz: bis TURN_AHEAD vor (oder hinter) dem
   *  Kreuzungsquadrat im Gang darf man schon drücken. Die Drehung ändert die Position des Dackels nie. */
  get canTurn() {
    const m = this.dogMap();
    const lim = HALF - DOG_R;
    const ax = Math.abs(m.x);
    const ay = Math.abs(m.y);
    if (ax <= lim && ay <= lim) return true;
    if (ay <= lim && ax - lim <= TURN_AHEAD) return true;
    return ax <= lim && ay - lim <= TURN_AHEAD;
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

  /** Kreuz aus zwei Balken minus geschlossene Türen; Kreis mit Radius r. Ecken bleiben eckig. */
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
    if (!this.canTurn) return false;
    this.slide = 0;
    const a0 = this.ang;
    const pivot = this.dogMap();
    this.theta = k > 0 ? turnCW(this.theta) : turnCCW(this.theta);
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

    const b = BONE_POS(this.target);
    const m = this.dogMap();
    if (Math.hypot(m.x - b.x, m.y - b.y) < BONE_R) {
      this.score++;
      this.pickTarget(this.target);
    }
  }

  /** Kamera-Position c gültig: nicht über die Kartenenden hinaus, und der Dackel, den das Fenster mitträgt, steht
   *  dort auf begehbarem Boden. Den Scroll-Behälter hält followCam weich ein (seit gedreht nur noch auf der Kreuzung
   *  wird, kann das Fenster nie quer in einen Gang zeigen). Die Kamera wird nur von Kanten gelenkt, nie der Dackel. */
  camOk(c) {
    if (Math.abs(c.x) > CAM_END || Math.abs(c.y) > CAM_END) return false;
    const m = this.toMap(this.dog.x, this.dog.y, c);
    return this.walkable(m.x, m.y, DOG_R - 0.05); // kleine Toleranz: Dackel darf exakt an der Wand stehen
  }

  /** Fenster scrollt in Blickrichtung (überall gleich). Liegt voraus eine Kante, schwenkt es rechtzeitig und
   *  zunehmend seitlich ein (je näher die Kante, desto stärker) – so fährt es in einer Kurve in die Gabelung statt
   *  im L erst anzuhalten und dann seitlich zu rutschen. Gesamttempo bleibt SPEED. */
  moveCam(dt) {
    const r = vec(this.theta);
    const d = vec(turnCW(this.theta));
    const sg = this.dir < 0 ? -1 : 1;
    const at = (f, l) => ({ x: this.cam.x + r[0] * f * sg + d[0] * l, y: this.cam.y + r[1] * f * sg + d[1] * l });
    // Erste blockierte Stelle voraus
    let fb = 0;
    for (let f = 2; f <= LOOK; f += 2) {
      if (!this.camOk(at(f, 0))) {
        fb = f;
        break;
      }
    }
    let target = 0;
    if (fb) {
      // Seite und kleinster Versatz, mit dem es an der blockierten Stelle weitergeht
      let side = 0;
      for (let l = 2; l <= SLIDE_MAX && !side; l += 2) {
        const okL = this.camOk(at(fb, -l)) && this.camOk(at(0, -l));
        const okR = this.camOk(at(fb, l)) && this.camOk(at(0, l));
        if (okL && okR) side = this.slide < 0 ? -1 : 1;
        else if (okL) side = -1;
        else if (okR) side = 1;
      }
      const near = 1 - (fb - 2) / LOOK; // 0 weit weg … 1 direkt davor
      target = side * SPEED * smooth(clamp(near, 0, 1));
    }
    this.slide = approach(this.slide, target, SLIDE_RATE * dt);
    const lat = this.slide * dt;
    const fwd = Math.abs(this.dir) * Math.sqrt(Math.max(0, SPEED * SPEED - this.slide * this.slide)) * dt;
    for (const [f, l] of [[fwd, lat], [0, lat], [fwd, 0]]) {
      const c = at(f, l);
      if ((f || l) && this.camOk(c)) {
        this.cam.x = c.x;
        this.cam.y = c.y;
        return;
      }
    }
  }

  /** Kamera folgt dem Dackel quer zur Scrollrichtung (innerhalb des Scroll-Behälters) und kehrt in ihn zurück.
   *  Die Kartenposition des Dackels bleibt dabei gleich: seine Bildschirmstelle gleicht die Bewegung aus. */
  followCam(dt) {
    // Nur quer zur Scrollachse: Ziel = Dackelhöhe, begrenzt auf ±CAMW um die Mittellinie der Scrollachse.
    // (Stetig – kein Umspringen zwischen den Armen, also kein Ruck.)
    const r = vec(this.theta);
    const d = vec(turnCW(this.theta));
    const cross = this.cam.x * d[0] + this.cam.y * d[1];
    const want = clamp(cross + (this.dog.y - SCREEN_H / 2), -CAMW, CAMW);
    let delta = (want - cross) * Math.min(1, FOLLOW * dt);
    delta = clamp(delta, -FOLLOW_MAX * dt, FOLLOW_MAX * dt); // Tempolimit, auch wenn die Kamera nach einem Schwenk weit draußen liegt
    const dx = d[0] * delta;
    const dy = d[1] * delta;
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
