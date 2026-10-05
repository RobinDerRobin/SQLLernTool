// Grundlegende Mathe- und Richtungshilfen.
// Acht Blickrichtungen im 45°-Raster, im Uhrzeigersinn nummeriert, damit "+1" eine Rechtsdrehung
// um 45° ist. Gerade Zahlen = Kreuz (O, S, W, N), ungerade = Diagonalen. 90° und 180° bleiben in
// der Klasse, nur 45° wechselt sie (Paritätsregel, docs/WELT-DESIGN.md 2.1).
// Außerhalb dieser Datei rechnet niemand mit Richtungszahlen (Prüfung: tests/directions.tests.mjs).

export const E = 0;
export const SE = 1;
export const S = 2;
export const SW = 3;
export const W = 4;
export const NW = 5;
export const N = 6;
export const NE = 7;

/** Alle 8 Blickrichtungen und ihre Kürzel wie in docs/welt.json ("headings"). */
export const HEADINGS = [E, SE, S, SW, W, NW, N, NE];
export const HEADING_CODES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
export const DIR_NAMES = ['Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten', 'Norden', 'Nordosten'];
export const DIR_SHORT = ['O', 'SO', 'S', 'SW', 'W', 'NW', 'N', 'NO'];
/** Rasterschritt je Richtung (Diagonalen nicht normiert: ein Feld schräg). */
export const DIR_VEC = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** Die vier Haupt-Blickrichtungen (Kreuz), in Uhrzeigerfolge. */
export const CARDINALS = [E, S, W, N];

/** Um k Achtel (45°-Schritte) im Uhrzeigersinn drehen; negative k drehen links herum. */
export const turnBy = (h, k) => (((h + k) % 8) + 8) % 8;
export const turnCW = (d) => turnBy(d, 2); // 90° rechts
export const turnCCW = (d) => turnBy(d, -2); // 90° links
export const opposite = (d) => turnBy(d, 4); // 180°
/** Wie viele 45°-Schritte im Uhrzeigersinn von a nach b (0..7). */
export const rotationSteps = (a, b) => turnBy(b, -a);

export const isHorizontal = (h) => h === E || h === W;
export const isVertical = (h) => h === S || h === N;
export const isDiagonal = (h) => h === SE || h === SW || h === NW || h === NE;
/** Blickrichtung als Anzahl Vierteldrehungen im Uhrzeigersinn ab Osten (O=0, S=1, W=2, N=3; Diagonalen x,5). */
export const quarterTurns = (h) => h / 2;

/** Kreuz-Richtung von Punkt a nach Punkt b, wenn beide auf einer Achse liegen, sonst -1 (v0.2-Welt). */
export function dirBetween(ax, ay, bx, by) {
  if (ay === by && bx > ax) return E;
  if (ay === by && bx < ax) return W;
  if (ax === bx && by > ay) return S;
  if (ax === bx && by < ay) return N;
  return -1;
}

export function wrap(v, m) {
  return ((v % m) + m) % m;
}

/** Kürzeste vorzeichenbehaftete Differenz in einem periodischen Raum der Länge m. */
export function wrapDelta(d, m) {
  return wrap(d + m / 2, m) - m / 2;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function approach(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  return Math.max(target, v - step);
}

// --- Bildschirm und gedrehte Spielwelt -----------------------------------
// Interne Auflösung. Alles wird in diesen Koordinaten simuliert und gezeichnet,
// der Renderer skaliert auf die echte Fenstergröße.
export const SCREEN_W = 480;
export const SCREEN_H = 270;

/**
 * Sichtfeld im lokalen Level-Koordinatensystem.
 * a = Flugrichtung ("along"), c = Querachse ("cross", periodisch).
 * Fliegt man nach Osten/Westen, ist die Flugachse die Bildschirmbreite,
 * fliegt man nach Norden/Süden, ist sie die Bildschirmhöhe.
 */
export function viewDims(heading) {
  // Die sichtbare Strecke in Flugrichtung ist immer 480 Einheiten – auch in vertikalen Leveln.
  // Dort wird rausgezoomt (zoom < 1), damit man gleich viel Reaktionszeit hat.
  if (isHorizontal(heading)) return { va: SCREEN_W, vc: SCREEN_H, zoom: 1 };
  if (!isVertical(heading)) throw new Error('Keine Etappen-Richtung: ' + heading);
  const zoom = SCREEN_H / SCREEN_W;
  return { va: SCREEN_W, vc: SCREEN_W / zoom, zoom };
}

/**
 * Höhe der Querachse. Vertikal 960 (60 Kacheln, > Sichtbreite 853). Horizontal mit Wrap 544
 * (34 Kacheln), mit Boden und Decke nur 288 – dann sieht man beide fast immer (wie bei Parodius).
 */
export function crossPeriod(heading, wrap = true) {
  if (isVertical(heading)) return 960;
  if (!isHorizontal(heading)) throw new Error('Keine Etappen-Richtung: ' + heading);
  return wrap ? 544 : 288;
}

/** Drehwinkel der Welt auf dem Bildschirm für eine Flugrichtung. */
export function headingAngle(heading) {
  return (heading * Math.PI) / 4;
}

/** Lokale Sichtfeld-Koordinate (a, c) -> Bildschirmkoordinate. */
export function localToScreen(heading, a, c) {
  switch (heading) {
    case E:
      return [a, c];
    case W:
      return [SCREEN_W - a, SCREEN_H - c];
    case N:
      return [c, SCREEN_H - a];
    case S:
      return [SCREEN_W - c, a];
    default:
      throw new Error('Ungültige Richtung ' + heading);
  }
}

/** Bildschirm-Eingaberichtung (sx, sy) -> lokale Richtung (da, dc). */
export function screenToLocalVec(heading, sx, sy) {
  switch (heading) {
    case E:
      return [sx, sy];
    case W:
      return [-sx, -sy];
    case N:
      return [-sy, sx];
    case S:
      return [sy, -sx];
    default:
      throw new Error('Ungültige Richtung ' + heading);
  }
}

/** Lokale Richtung (da, dc) -> Bildschirm-Eingaberichtung (Umkehrung von screenToLocalVec). */
export function localToScreenVec(heading, da, dc) {
  switch (heading) {
    case E:
      return [da, dc];
    case W:
      return [-da, -dc];
    case N:
      return [dc, -da];
    case S:
      return [-dc, da];
    default:
      throw new Error('Ungültige Richtung ' + heading);
  }
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Abstand zum Quadrat von Punkt p zur Strecke a-b. */
export function segPointDist2(ax, ay, bx, by, px, py) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / len2 : 0;
  t = clamp(t, 0, 1);
  return dist2(ax + vx * t, ay + vy * t, px, py);
}
