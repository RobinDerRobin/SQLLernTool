// Kamera des Plans: Mitte (cx, cy) in E, Zoom (stufenlos, in Bildschirmen Breite), Drehung in 45°-Schritten. Reine Rechnung, ändert nie Daten.
// Drehung `blick` ist eine Richtung aus math.js: der Plan wird so gedreht, dass diese Richtung auf dem Bildschirm nach rechts zeigt
// (E = Norden oben; ein Gang in Richtung h erscheint „wie im Spiel“, wenn blick = h).
import { E, turnBy, headingAngle } from '../core/math.js';
import { SCREEN_W, ZOOM_MIN, ZOOM_MAX, ZOOM_START, ZOOM_RAD_FAKTOR, ZOOM_RAD_MAX, EINPASS_RAND } from './konstanten.js';

const klemme = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Zoomfaktor (> 1 = hineinzoomen) für ein Mausrad-/Touchpad-Ereignis: ZOOM_RAD_FAKTOR je 100 Einheiten deltaY, anteilig für kleine
 * Schritte. `deltaMode` wie bei WheelEvent (0 Pixel, 1 Zeilen, 2 Seiten); Strg (Touchpad-Kneifen) wirkt stärker.
 */
export function radFaktor(deltaY, deltaMode = 0, strg = false) {
  const px = deltaY * (deltaMode === 1 ? 40 : deltaMode === 2 ? 800 : 1) * (strg ? 4 : 1);
  return Math.pow(ZOOM_RAD_FAKTOR, -klemme(px, -ZOOM_RAD_MAX, ZOOM_RAD_MAX) / 100);
}

export class Ansicht {
  constructor(w = 1280, h = 720) {
    this.w = w; // Größe der Zeichenfläche in Bildschirmpixeln
    this.h = h;
    this.cx = 0;
    this.cy = 0;
    this.bildschirme = ZOOM_START; // so viele Bildschirme (480 E) passen in die Breite des Plans
    this.blick = E;
  }

  /** Bildschirmpixel je E. */
  get masstab() {
    return this.w / (this.bildschirme * SCREEN_W);
  }

  get winkel() {
    return headingAngle(this.blick);
  }

  /** Welt (E) → Bildschirmpixel der Zeichenfläche. */
  weltZuBild(x, y) {
    const a = -this.winkel;
    const dx = x - this.cx;
    const dy = y - this.cy;
    const s = this.masstab;
    return [this.w / 2 + s * (dx * Math.cos(a) - dy * Math.sin(a)), this.h / 2 + s * (dx * Math.sin(a) + dy * Math.cos(a))];
  }

  bildZuWelt(px, py) {
    const a = this.winkel;
    const s = this.masstab;
    const dx = (px - this.w / 2) / s;
    const dy = (py - this.h / 2) / s;
    return [this.cx + dx * Math.cos(a) - dy * Math.sin(a), this.cy + dx * Math.sin(a) + dy * Math.cos(a)];
  }

  /** Setzt die Transformation so, dass danach in Weltkoordinaten (E) gezeichnet wird. `dpr` = Pixeldichte des Canvas. */
  anwenden(ctx, dpr = 1) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(this.w / 2, this.h / 2);
    ctx.rotate(-this.winkel);
    ctx.scale(this.masstab, this.masstab);
    ctx.translate(-this.cx, -this.cy);
  }

  /** Sichtbarer Weltbereich (achsenparalleles Rechteck um die gedrehte Zeichenfläche). */
  sichtbar() {
    const ecken = [[0, 0], [this.w, 0], [this.w, this.h], [0, this.h]].map(([px, py]) => this.bildZuWelt(px, py));
    return {
      x0: Math.min(...ecken.map((p) => p[0])),
      y0: Math.min(...ecken.map((p) => p[1])),
      x1: Math.max(...ecken.map((p) => p[0])),
      y1: Math.max(...ecken.map((p) => p[1])),
    };
  }

  drehen(schritte) {
    this.blick = turnBy(this.blick, schritte);
  }

  /** Norden oben. */
  norden() {
    this.blick = E;
  }

  /** „Wie im Spiel“: Flugrichtung h zeigt nach rechts. */
  wieImSpiel(h) {
    this.blick = h;
  }

  /** Zoom auf `b` Bildschirme Breite setzen (begrenzt), der Weltpunkt unter (px, py) bleibt an seiner Stelle. */
  setzeBildschirme(b, px = this.w / 2, py = this.h / 2) {
    const neu = klemme(b, ZOOM_MIN, ZOOM_MAX);
    if (neu === this.bildschirme) return;
    const [wx, wy] = this.bildZuWelt(px, py);
    this.bildschirme = neu;
    const [vx, vy] = this.bildZuWelt(px, py);
    this.cx += wx - vx;
    this.cy += wy - vy;
  }

  /** Um `faktor` vergrößern (> 1) oder verkleinern (< 1), um den Punkt (px, py) herum. */
  zoomen(faktor, px = this.w / 2, py = this.h / 2) {
    this.setzeBildschirme(this.bildschirme / faktor, px, py);
  }

  /** Plan um (dpx, dpy) Bildschirmpixel mitziehen (Inhalt folgt der Maus). */
  verschieben(dpx, dpy) {
    const [ax, ay] = this.bildZuWelt(0, 0);
    const [bx, by] = this.bildZuWelt(dpx, dpy);
    this.cx -= bx - ax;
    this.cy -= by - ay;
  }

  zentrieren(x, y) {
    this.cx = x;
    this.cy = y;
  }

  /** Passt ein Weltrechteck ein: stufenlos, mit EINPASS_RAND Rand (die Ausdehnung zählt im gedrehten Bild). */
  einpassen(r) {
    this.zentrieren((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
    // Ausdehnung des Rechtecks im gedrehten Bild (die Ecken drehen mit)
    const a = -this.winkel;
    const ecken = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].map(([x, y]) => {
      const dx = x - this.cx;
      const dy = y - this.cy;
      return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    });
    const breite = Math.max(Math.max(...ecken.map((p) => p[0])) - Math.min(...ecken.map((p) => p[0])), 1);
    const hoehe = Math.max(Math.max(...ecken.map((p) => p[1])) - Math.min(...ecken.map((p) => p[1])), 1);
    const nachBreite = (breite * EINPASS_RAND) / SCREEN_W;
    const nachHoehe = (hoehe * EINPASS_RAND * this.w) / (this.h * SCREEN_W);
    this.bildschirme = klemme(Math.max(nachBreite, nachHoehe), ZOOM_MIN, ZOOM_MAX);
  }
}
