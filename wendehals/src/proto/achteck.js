// Prototyp P3 „45°-Kreuzung“ (Wegwerf-Prototyp, Brief: docs/prototypen/P3-45grad.md): die Kreuzung als Achteck mit 8 Armen,
// LT/RT (J/K) drehen das Fenster ±45°, LB/RB (U/O) ±90°, Y kehrt um. Alle Fenster-Regeln (Kamera, Schwenk, Tod, Zielknochen)
// kommen unverändert von FensterScene (P1 „Kreuzung“); hier steht nur, was die Achteck-Geometrie anders macht:
//   • Drehen in 45°-Schritten (Paritätsregel: nach 45° wechselt die Klasse Kreuz ↔ Diagonale, nach 90°/180° nicht),
//   • eine einzige Kreuzung (das Achteck), von der in jede der 8 Richtungen ein Arm wegführt,
//   • der Scroll-Behälter der Kamera ist für alle Arme gleich (alle Mittellinien laufen durch (0,0)),
//   • Neustart in der Mitte des Achtecks.
// Keine Minimap (Robin: „Nimm die Minimaps erstmal nicht mit rein.“).

import { turnBy, headingAngle, rotationSteps } from '../core/math.js';
import { FensterScene, TURN_AHEAD, DOG_R, SWING_TIME } from './fenster.js';
import { ACHTECK_MAP } from './achteck-map.js';
import { Rng } from '../core/rng.js';

export { SWING_TIME };

export class AchteckScene extends FensterScene {
  constructor({ rng = new Rng(0xf1e57e4), map = ACHTECK_MAP } = {}) {
    super({ rng, map });
    this.minimap = false; // game.js: keine Minimap-Zeile und kein Minimap-Zeichnen für diese Szene
  }

  /** Gewünschte Drehung in 45°-Schritten (−2..2): LT/RT = ∓/±1, LB/RB (U/O, Espresso-Taste) = ∓/±2. */
  rotInput(input) {
    if (input.rot45Left) return -1;
    if (input.rot45Right) return 1;
    if (input.rotLeft) return -2;
    if (input.rotRight || input.espressoPressed) return 2;
    return 0;
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
    this.swing = { t: 0, a0, a1: a0 + (k * Math.PI) / 4, pivot };
    return true;
  }

  /** Nur die Achteck-Mitte ist Kreuzung: der Neustart-Punkt wird gemerkt, solange der Dackel im Achteck ist. */
  trackJunction() {
    const m = this.dogMap();
    if (this.map.inOctagon(m.x, m.y, DOG_R)) this.checkpoint = { x: 0, y: 0, theta: this.theta, s: this.s };
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
