// Prototyp P3 „45°-Kreuzung“ (Wegwerf-Prototyp, Brief: docs/prototypen/P3-45grad.md): die Kreuzung als Achteck mit 8 Armen,
// LT/RT (J/K) drehen das Fenster ±45°, LB/RB (U/O) ±90°, Y kehrt um. Alle Fenster-Regeln (Kamera, Schwenk, Tod, Zielknochen)
// kommen unverändert von FensterScene (P1 „Kreuzung“); hier steht nur, was die Achteck-Geometrie anders macht:
//   • Drehen in 45°-Schritten (Paritätsregel: nach 45° wechselt die Klasse Kreuz ↔ Diagonale, nach 90°/180° nicht),
//   • eine einzige Kreuzung (das Achteck), von der in jede der 8 Richtungen ein Arm wegführt,
//   • der Scroll-Behälter der Kamera ist für alle Arme gleich (alle Mittellinien laufen durch (0,0)),
//   • Neustart in der Mitte des Achtecks.
// Keine Minimap (Robin: „Nimm die Minimaps erstmal nicht mit rein.“).
//
// Eingabe-Schemata (M / Tab / Back wechselt; Robin, 11.10.2026):
//   'akkord'     Shift+A/D = 90° links/rechts, Shift+W+A/D = 45° links/rechts; solange Shift gehalten wird, bewegt sich die Figur
//                nicht (WASD wählen nur die Drehung). Controller: LB halten = Shift, Stick/Steuerkreuz = WASD.
//   'gang'       links/rechts drehen zum nächsten Gang in dieser Richtung (U/O, LB/RB, J/K, LT/RT).
//   'klassisch'  LT/RT (J/K) ±45°, LB/RB (U/O) ±90° (Stand nach dem ersten Bau).
// Speicher-Modus (B / L3 wechselt): Ein Druck, der im Schwenk kommt, wird gespeichert (ein Speicherplatz, der letzte gewinnt, wie der
// Eingabe-Puffer in Dark Souls) und
//   'getrennt'   läuft nach dem Schwenk als eigener zweiter Schwenk (0,5 s + 0,5 s),
//   'schneller'  verlängert den laufenden Schwenk; jeder weitere Druck verkürzt die Dauer (SPEEDUP).

import { turnBy, headingAngle, rotationSteps } from '../core/math.js';
import { FensterScene, TURN_AHEAD, DOG_R, SWING_TIME } from './fenster.js';
import { ACHTECK_MAP } from './achteck-map.js';
import { Rng } from '../core/rng.js';

export { SWING_TIME };

const STEP = headingAngle(turnBy(0, 1)); // ein 45°-Schritt im Bogenmaß
export const SCHEMES = ['akkord', 'gang', 'klassisch'];
export const BUF_MODES = ['getrennt', 'schneller'];
export const CHORD_FRAMES = 4; // Toleranz beim gleichzeitigen Drücken (Frames bei 60 Hz, ≈ 67 ms); Hypothese, der Spieltest entscheidet
export const SPEEDUP = 0.7; // 'schneller': jeder weitere Druck im Schwenk erhöht die Drehgeschwindigkeit auf das 1/SPEEDUP-fache
export const OMEGA_MAX = 4; // höchste Drehgeschwindigkeit (rad/s): hält die Drehrate unter 0,1 rad/Frame (Spitze der Glättung = 1,5 · ω)
/** Drehgeschwindigkeit (rad/s) beim n-ten Druck der Kette: n = 1 entspricht dem Grundschwenk (45° in SWING_TIME). */
export const omegaFor = (n) => Math.min(OMEGA_MAX, STEP / SWING_TIME / SPEEDUP ** (n - 1));

export class AchteckScene extends FensterScene {
  constructor({ rng = new Rng(0xf1e57e4), map = ACHTECK_MAP, scheme = 'akkord', bufMode = 'getrennt' } = {}) {
    super({ rng, map });
    this.minimap = false; // game.js: keine Minimap-Zeile und kein Minimap-Zeichnen für diese Szene
    this.scheme = scheme;
    this.bufMode = bufMode;
    this.buffer = null; // gespeicherte Drehung { side, steps|null } (steps null = „nächster Gang“, erst beim Ausführen aufgelöst)
    this.cmdNow = null;
    this.frame = 0;
    this.lastW = -1e9; // Frame des letzten frischen W-Drucks
    this.pending = null; // frischer A/D-Druck ohne Shift (Shift darf bis CHORD_FRAMES später kommen)
    this.fired = null; // zuletzt ausgelöster Akkord (für die Umwandlung 90° → 45°, wenn W nachkommt)
  }

  /** Nächster Gang in Drehrichtung side (±1): kleinste Zahl 45°-Schritte, nach der in der neuen Blickrichtung ein Arm wegführt. */
  gangSteps(side) {
    for (let k = 1; k <= 4; k++) {
      const d = turnBy(this.h, side * k);
      if (this.map.arms.some((a) => a.dir === d)) return side * k;
    }
    return side * 2;
  }

  /** Aus der Eingabe dieses Frames die neue Drehung lesen: { side, steps|null } oder null. Hält den Akkord-Zustand. */
  readCommand(input) {
    const f = this.frame;
    if (input.up) this.lastW = f;
    if (this.scheme === 'klassisch') {
      const k = input.rot45Left ? -1 : input.rot45Right ? 1 : input.rotLeft ? -2 : input.rotRight || input.espressoPressed ? 2 : 0;
      return k ? { side: Math.sign(k), steps: k } : null;
    }
    if (this.scheme === 'gang') {
      const side = input.rot45Left || input.rotLeft ? -1 : input.rot45Right || input.rotRight || input.espressoPressed ? 1 : 0;
      return side ? { side, steps: null } : null;
    }
    // Akkord: ausgelöst nur durch den frischen Druck auf A/D (nicht durch Halten); Shift darf bis CHORD_FRAMES danach kommen
    let cmd = null;
    const fresh = input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
    if (fresh) this.pending = { side: fresh, frame: f };
    if (this.pending && f - this.pending.frame > CHORD_FRAMES) this.pending = null;
    if (this.pending && input.shift) {
      const w = f - this.lastW <= CHORD_FRAMES; // W frisch gedrückt (schon vor A/D) → 45°
      cmd = { side: this.pending.side, steps: this.pending.side * (w ? 1 : 2), chord: true };
      this.pending = null;
    } else if (this.fired && input.up && input.shift && f - this.fired.frame <= CHORD_FRAMES) {
      this.convertFired(); // W kam kurz nach A/D: aus 90° wird 45°
    }
    return cmd;
  }

  /** W kommt innerhalb der Toleranz nach A/D: die ausgelöste (noch nicht fertige) 90°-Drehung wird zu 45° (ein Schritt weniger). */
  convertFired() {
    const fr = this.fired;
    if (!fr || fr.steps !== fr.side * 2 || fr.converted) return;
    fr.converted = true;
    if (this.buffer && fr.kind === 'buffer') this.buffer.steps = fr.side;
    else if (this.swing) {
      this.theta = turnBy(this.theta, -fr.side);
      this.swing.a1 -= fr.side * STEP;
      this.reanchor(this.swing);
    }
  }

  /** Den laufenden Schwenk vom aktuellen Bildwinkel aus zum (geänderten) Ziel neu starten, ohne Sprung im Bild. */
  reanchor(sw) {
    sw.a0 = this.ang;
    sw.t = 0;
    sw.dur = Math.max(0.08, Math.abs(sw.a1 - sw.a0) / omegaFor(sw.n || 1));
  }

  update(dt, input = {}) {
    this.frame++;
    if (input.map) this.scheme = SCHEMES[(SCHEMES.indexOf(this.scheme) + 1) % SCHEMES.length];
    if (input.bufMode) this.bufMode = BUF_MODES[(BUF_MODES.indexOf(this.bufMode) + 1) % BUF_MODES.length];
    let inp = input;
    if (this.scheme === 'akkord' && input.shift) inp = { ...input, mx: 0, my: 0 }; // Shift gehalten: die Figur bewegt sich nicht
    let cmd = this.readCommand(input);
    if (this.swing && this.scheme === 'klassisch') cmd = null; // 'klassisch': Drücke im Schwenk werden wie im ersten Bau ignoriert
    this.cmdNow = null;
    if (!this.swing && this.buffer && !this.respawn) {
      // gespeicherte Drehung: sofort nach dem Schwenk (kein Scrollen dazwischen, die Drehung läuft vor moveCam)
      this.cmdNow = this.buffer.steps ?? this.gangSteps(this.buffer.side);
      this.buffer = null;
      if (cmd) this.buffer = { side: cmd.side, steps: cmd.steps };
    } else if (cmd) {
      if (this.swing) {
        if (this.bufMode === 'schneller') {
          this.chain(cmd);
          this.fired = cmd.chord ? { ...cmd, frame: this.frame, kind: 'swing' } : null;
        } else {
          this.buffer = { side: cmd.side, steps: cmd.steps };
          this.fired = cmd.chord ? { ...cmd, frame: this.frame, kind: 'buffer' } : null;
        }
      } else {
        this.cmdNow = cmd.steps ?? this.gangSteps(cmd.side);
        this.fired = cmd.chord ? { ...cmd, frame: this.frame, kind: 'now' } : null;
      }
    }
    super.update(dt, inp);
    if (this.fired && this.fired.kind === 'now') this.fired.kind = 'swing';
    if (!this.swing && this.fired && this.fired.kind === 'swing' && this.frame - this.fired.frame > CHORD_FRAMES) this.fired = null;
  }

  /** FensterScene.update liest die Drehung hier (45°-Schritte), nicht aus der Eingabe. */
  rotInput() {
    return this.cmdNow ?? 0;
  }

  /** 'schneller': der Druck im Schwenk verlängert den laufenden Schwenk um einen weiteren Schritt, jeder Druck verkürzt die Dauer. */
  chain(cmd) {
    const sw = this.swing;
    const k = cmd.steps ?? this.gangSteps(cmd.side);
    sw.n = (sw.n || 1) + 1;
    this.theta = turnBy(this.theta, k);
    sw.a1 += k * STEP;
    sw.omega = omegaFor(sw.n);
    this.reanchor(sw);
  }

  /** Das Achteck, wenn in dieser Lage um k 45°-Schritte gedreht werden darf (Dreh-Zone; in jede der 8 Richtungen führt ein Arm
   *  weg, die neue Flugrichtung ist also immer frei) – sonst null. Die Drehung ändert die Position des Dackels nie. */
  turnJunction(k) {
    const m = this.dogMap();
    return this.map.inZone(m.x, m.y, DOG_R, TURN_AHEAD) ? this.map : null;
  }

  canTurnBy(k) {
    return !!this.turnJunction(k);
  }

  get canTurn() {
    return this.canTurnBy(1);
  }

  /** Fenster drehen: k = ∓1 (45° links/rechts), ∓2 (90°). s bleibt. */
  rotate(k) {
    if (this.swing || !k) return false;
    if (!this.turnJunction(k)) return false;
    const a0 = this.ang;
    const pivot = this.dogMap();
    this.theta = turnBy(this.theta, k);
    this.vc = 0;
    // Das Fenster dreht sich um den Dackel: seine Kartenposition und Bildschirmstelle bleiben fest.
    this.swing = { t: 0, a0, a1: a0 + k * STEP, pivot };
    return true;
  }

  /** Nur die Achteck-Mitte ist Kreuzung: der Neustart-Punkt wird gemerkt, solange der Dackel im Achteck ist. */
  trackJunction() {
    const m = this.dogMap();
    if (this.map.inOctagon(m.x, m.y, DOG_R)) this.checkpoint = { x: 0, y: 0, theta: this.theta, s: this.s };
  }

  warp(...a) {
    this.buffer = null;
    this.pending = null;
    this.fired = null;
    return super.warp(...a);
  }

  /** Alle Arme teilen denselben Scroll-Behälter: es gibt nichts umzuschalten. */
  selectK() {}
}

/** Wie viele 45°-Schritte (−3..4) sind es von der Blickrichtung h zur Richtung hNew? */
export const stepsBetween = (h, hNew) => {
  const k = rotationSteps(h, hNew);
  return k > 4 ? k - 8 : k;
};
export { headingAngle };
