// Karte von P3 „45°-Kreuzung“ (Brief: docs/prototypen/P3-45grad.md, Abschnitte 3–5): ein regelmäßiges Achteck in der Mitte (0,0)
// mit 8 Sackgassen-Armen, je einer pro Richtung (N, NO, O, SO, S, SW, W, NW). Eigene Karte statt Erweiterung von karte.js,
// damit Kreuzung und Netz bitgleich bleiben. Reine Daten und Geometrie, kein Spielzustand; alle Werte sind Hypothesen (Regel 5).
//
// Jede Seite des Achtecks hat die Länge WIDTH (= Gangbreite), dort beginnt ein Arm der Länge ARM und der Breite WIDTH quer zur
// Gangachse. Zwischen zwei Armen steht ein Wandkeil, der an der Achteckecke beginnt. Alle Mittellinien laufen durch (0,0).

import { HEADING_CODES, DIR_NAMES, DIR_VEC, E, S, W, N, SE, SW, NW, NE, isDiagonal, turnCW } from '../core/math.js';

export const WIDTH = 200; // Gangbreite = Seitenlänge des Achtecks
export const HALF = WIDTH / 2;
export const ARM = 720; // Länge eines Arms (ab Achteckseite)
export const APO = HALF * (1 + Math.SQRT2); // Abstand Mitte–Seite des Achtecks (≈ 241,4)
export const END = APO + ARM; // Ende der Arme (Abstand von der Mitte)
export const CAM_END = END - 60; // Startlage des Fensters: so weit außen im Westarm
export const BONE_AT = END - 30;
export const CAMW = 40; // Scroll-Behälter quer: ±40 von der Gangmitte (wie in der Kreuzung)
export const STRIPE_GAP = 40; // Streifenmuster der Diagonal-Arme (Abstand der Streifen am Boden)

/** Einheitsvektor einer Richtung (Diagonalen normiert). */
export const unit = (d) => {
  const [x, y] = DIR_VEC[d];
  return x && y ? [x * Math.SQRT1_2, y * Math.SQRT1_2] : [x, y];
};

/** Die 8 Arme: Richtung, Name, Farbe (N rot, O blau, S grün, W gelb wie in der Kreuzung; Diagonalen orange, türkis, violett, rosa). */
export const ARMS8 = [
  { dir: E, name: 'Osten', color: '#3f7be0' },
  { dir: SE, name: 'Südosten', color: '#22c1b5' },
  { dir: S, name: 'Süden', color: '#3fb04a' },
  { dir: SW, name: 'Südwesten', color: '#9b5de5' },
  { dir: W, name: 'Westen', color: '#e8c63a' },
  { dir: NW, name: 'Nordwesten', color: '#f06fa8' },
  { dir: N, name: 'Norden', color: '#e0443a' },
  { dir: NE, name: 'Nordosten', color: '#f08a30' },
].map((a, i) => ({ ...a, i, code: HEADING_CODES[a.dir], striped: isDiagonal(a.dir), u: unit(a.dir), v: unit(turnCW(a.dir)) }));
export const armOf = (dir) => ARMS8.find((a) => a.dir === dir);
export const armIndex = (dir) => armOf(dir).i;

const EPS = 1e-9;

export function compileAchteck() {
  /** Kreis mit Radius r liegt ganz im Achteck (konvex: Abstand zu allen 8 Seiten ≥ r). */
  function inOctagon(x, y, r = 0) {
    for (const a of ARMS8) if (x * a.u[0] + y * a.u[1] > APO - r + EPS) return false;
    return true;
  }

  /** Kreis liegt ganz im Rechteck des Arms a (von der Mitte bis zum Ende, Breite WIDTH). */
  function inArm(a, x, y, r) {
    const along = x * a.u[0] + y * a.u[1];
    const across = x * a.v[0] + y * a.v[1];
    return along >= r - EPS && along <= END - r + EPS && Math.abs(across) <= HALF - r + EPS;
  }

  /** Kreis mit Radius r liegt ganz auf begehbarem Boden (Achteck plus Arme, Wandkeile dazwischen). */
  function walkable(x, y, r = 0) {
    if (inOctagon(x, y, r)) return true;
    for (const a of ARMS8) if (inArm(a, x, y, r)) return true;
    return false;
  }

  /** Freie Strecke ab (x,y) in Richtung (vx,vy) (Einheitsvektor), höchstens max; Schritt 1. */
  function freeDistance(x, y, vx, vy, max, r) {
    let d = 0;
    while (d < max && walkable(x + vx * (d + 1), y + vy * (d + 1), r)) d++;
    return d >= max ? max : d;
  }

  /** Dreh-Zone (Brief Abschnitt 2): das Achteck (um den Dackelradius verkleinert) plus `ahead` in jedem Arm, gemessen ab der
   *  verkleinerten Achteckseite – wie die Quadrat-Zone der Kreuzung. */
  function inZone(mx, my, r, ahead) {
    if (inOctagon(mx, my, r)) return true;
    for (const a of ARMS8) {
      const along = mx * a.u[0] + my * a.u[1];
      const across = mx * a.v[0] + my * a.v[1];
      if (Math.abs(across) <= HALF - r + EPS && along > APO - r && along <= APO - r + ahead) return true;
    }
    return false;
  }

  // Der Scroll-Behälter ist für alle Arme gleich: Mittellinie durch (0,0), ±CAMW. Ein „Gang“ ist deshalb nur die Achse.
  const lane = { id: 'achse', axis: 'h', c: 0, hw: HALF, w: WIDTH, a0: -END, a1: END, x0: -END, x1: END, y0: -HALF, y1: HALF, i: 0 };

  return {
    def: { name: 'achteck' },
    kind: 'achteck',
    arms: ARMS8,
    corridors: [lane],
    byId: { [lane.id]: lane },
    junctions: [],
    bounds: { x0: -END, x1: END, y0: -END, y1: END },
    bones: ARMS8.map((a) => ({ x: a.u[0] * BONE_AT, y: a.u[1] * BONE_AT, color: a.color, name: a.name })),
    start: { corridor: 'achse', cam: { x: -CAM_END, y: 0 }, dog: { x: 120, y: 135 }, theta: E, s: 'R', notTarget: armIndex(W) },
    lane,
    walkable,
    freeDistance,
    inOctagon,
    inArm,
    inZone,
    camHalfWidth: () => CAMW,
    corridorAt: () => lane,
    nameOf: (dir) => DIR_NAMES[dir],
  };
}

export const ACHTECK_MAP = compileAchteck();
