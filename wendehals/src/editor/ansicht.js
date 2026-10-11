// Kamera des Plans: Mitte (cx, cy) in E, Zoomstufe, Drehung in 45°-Schritten. Reine Rechnung, ändert nie Daten.
// Drehung `blick` ist eine Richtung aus math.js: der Plan wird so gedreht, dass diese Richtung auf dem Bildschirm nach rechts zeigt
// (E = Norden oben; ein Gang in Richtung h erscheint „wie im Spiel“, wenn blick = h).
import { E, turnBy, headingAngle } from '../core/math.js';
import { SCREEN_W, ZOOM_BILDSCHIRME, ZOOM_START } from './konstanten.js';

export class Ansicht {
  constructor(w = 1280, h = 720) {
    this.w = w; // Größe der Zeichenfläche in Bildschirmpixeln
    this.h = h;
    this.cx = 0;
    this.cy = 0;
    this.stufe = ZOOM_START;
    this.blick = E;
  }

  /** Bildschirmpixel je E. */
  get masstab() {
    return this.w / (ZOOM_BILDSCHIRME[this.stufe] * SCREEN_W);
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

  /** Zoomstufe ändern, der Weltpunkt unter (px, py) bleibt an seiner Stelle. */
  zoomen(schritte, px = this.w / 2, py = this.h / 2) {
    const neu = Math.max(0, Math.min(ZOOM_BILDSCHIRME.length - 1, this.stufe + schritte));
    if (neu === this.stufe) return;
    const [wx, wy] = this.bildZuWelt(px, py);
    this.stufe = neu;
    const [vx, vy] = this.bildZuWelt(px, py);
    this.cx += wx - vx;
    this.cy += wy - vy;
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

  /** Passt ein Weltrechteck ein (die stärkste Zoomstufe, in der es noch ganz sichtbar ist). */
  einpassen(r) {
    this.zentrieren((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
    const breite = Math.max(r.x1 - r.x0, 1);
    const hoehe = Math.max(r.y1 - r.y0, 1);
    this.stufe = ZOOM_BILDSCHIRME.length - 1;
    for (let i = 0; i < ZOOM_BILDSCHIRME.length; i++) {
      const sichtBreite = ZOOM_BILDSCHIRME[i] * SCREEN_W;
      const sichtHoehe = (sichtBreite * this.h) / this.w;
      if (sichtBreite >= breite * 1.05 && sichtHoehe >= hoehe * 1.05) {
        this.stufe = i;
        break;
      }
    }
  }
}
