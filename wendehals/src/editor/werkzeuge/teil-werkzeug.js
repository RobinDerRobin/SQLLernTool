// Gemeinsamer Bau für die Werkzeuge Formteil (B), Wand (W) und Hindernis (H): Klick setzt ein Teil in Standardgröße,
// Ziehen setzt es zwischen Anfang und Ende (rastet auf 8 Richtungen und 20 E). Das neue Teil ist danach gewählt.
import { teilSetzen, teilEntwurf, TEILSORTEN } from '../teile.js';
import { rechteck } from '../daten.js';
import { FARBEN, KLICK_TOLERANZ_PX } from '../konstanten.js';

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

export function teilWerkzeug(sorte, hinweisText) {
  let zug = null; // { start: {x, y}, ende: {x, y}, px: [px, py], bewegt }
  return {
    id: sorte,
    name: TEILSORTEN[sorte].name,
    hinweis: hinweisText,
    down(k, p) {
      zug = { start: { x: p.x, y: p.y }, ende: { x: p.x, y: p.y }, px: [p.px, p.py], bewegt: false };
      return true;
    },
    move(k, p) {
      if (!zug) return;
      zug.ende = { x: p.x, y: p.y };
      zug.bewegt = zug.bewegt || Math.hypot(p.px - zug.px[0], p.py - zug.px[1]) >= KLICK_TOLERANZ_PX;
      const e = teilEntwurf(sorte, zug.start.x, zug.start.y, zug.bewegt ? p.x : zug.start.x, zug.bewegt ? p.y : zug.start.y);
      k.hinweis(`${TEILSORTEN[sorte].name} ${fmt(e.laenge)} × ${fmt(e.breite)} E · ${e.winkel}°`);
      k.zeichnen();
    },
    up(k, p) {
      const z = zug;
      zug = null;
      k.hinweis('');
      if (!z) return;
      const bewegt = z.bewegt || Math.hypot(p.px - z.px[0], p.py - z.px[1]) >= KLICK_TOLERANZ_PX;
      const neu = k.aendere(`${TEILSORTEN[sorte].name} setzen`, (g) => teilSetzen(g, sorte, z.start.x, z.start.y, bewegt ? p.x : z.start.x, bewegt ? p.y : z.start.y));
      if (neu) k.waehle(neu);
    },
    schweben(k, p) {
      zug = null;
      this.cursor = { x: p.x, y: p.y };
      k.zeichnen();
    },
    abbruch(k) {
      zug = null;
      this.cursor = null;
      k?.hinweis('');
    },
    cursor: null,
    vorschau(ctx, k) {
      const quelle = zug ?? (this.cursor && { start: this.cursor, ende: this.cursor, bewegt: false });
      if (!quelle) return;
      const e = teilEntwurf(sorte, quelle.start.x, quelle.start.y, quelle.bewegt ? quelle.ende.x : quelle.start.x, quelle.bewegt ? quelle.ende.y : quelle.start.y);
      const s = k.ansicht.masstab;
      ctx.save();
      ctx.beginPath();
      const ecken = rechteck(e.x, e.y, e.laenge, e.breite, e.winkel);
      ctx.moveTo(ecken[0][0], ecken[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(ecken[i][0], ecken[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(141,255,176,0.22)';
      ctx.fill();
      ctx.lineWidth = 2 / s;
      ctx.setLineDash([8 / s, 6 / s]);
      ctx.strokeStyle = FARBEN.vorschau;
      ctx.stroke();
      ctx.restore();
    },
  };
}
