// Werkzeug „Gang“ (G): von einem Punkt zum anderen ziehen. Rastet auf 8 Richtungen und 20 E. Beginnt oder endet der Zug an einem
// Knoten, wird verbunden; mitten auf einem Gang entsteht eine T-Kreuzung; im Leeren entsteht ein Gangende (Knoten).
import { anfangPunkt, gangZiel, gangZiehen } from '../befehle.js';
import { FARBEN, GANG_BREITE, SCREEN_W, SPEED } from '../konstanten.js';
import { DIR_NAMES } from '../../core/math.js';

let entwurf = null; // { start: {x, y} (roh), von: anfangPunkt, ziel: gangZiel | null }
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

function berechne(k, p) {
  const g = k.gebiet();
  entwurf.von = anfangPunkt(g, entwurf.start.x, entwurf.start.y, k.tolE());
  entwurf.ziel = gangZiel(g, entwurf.von, p.x, p.y, k.tolE());
  if (entwurf.ziel) {
    const z = entwurf.ziel;
    k.hinweis(
      `Gang ${fmt(z.laenge, 0)} E = ${fmt(z.laenge / SCREEN_W)} Bildschirme = ${fmt(z.laenge / SPEED)} s · ${DIR_NAMES[z.richtung]}` +
        (z.knoten ? ` · verbindet mit ${z.knoten}` : z.gang ? ` · T-Kreuzung auf ${z.gang}` : ''),
    );
  } else k.hinweis('Zu kurz – weiter ziehen (mindestens 20 E).');
  k.zeichnen();
}

export default {
  id: 'gang',
  name: 'Gang',
  hinweis: 'Rechts ziehen: Gang zeichnen (rastet auf 8 Richtungen und 20 E). Anfang/Ende an einem Knoten oder Gang verbindet. Linksklick wählt, mittlere Taste verschiebt den Plan.',
  down(k, p) {
    entwurf = { start: { x: p.x, y: p.y }, von: null, ziel: null };
    berechne(k, p);
    return true;
  },
  move(k, p) {
    if (entwurf) berechne(k, p);
  },
  up(k, p) {
    const e = entwurf;
    entwurf = null;
    k.hinweis('');
    if (!e) return;
    const erg = k.aendere('Gang ziehen', (g) => gangZiehen(g, e.start.x, e.start.y, p.x, p.y, k.tolE()));
    if (erg) k.waehle({ art: 'gang', id: erg.gang.id });
    else {
      k.zeichnen();
      k.hinweis('Gang nicht angelegt: zu kurz, schon vorhanden oder deckungsgleich mit einem Gang.');
    }
  },
  abbruch(k) {
    entwurf = null;
    k?.hinweis('');
  },
  vorschau(ctx, k) {
    if (!entwurf?.von) return;
    const s = k.ansicht.masstab;
    const { von, ziel } = entwurf;
    ctx.save();
    if (ziel) {
      const dx = ziel.x - von.x;
      const dy = ziel.y - von.y;
      const l = Math.hypot(dx, dy);
      const nx = (-dy / l) * (GANG_BREITE / 2);
      const ny = (dx / l) * (GANG_BREITE / 2);
      ctx.beginPath();
      ctx.moveTo(von.x + nx, von.y + ny);
      ctx.lineTo(ziel.x + nx, ziel.y + ny);
      ctx.lineTo(ziel.x - nx, ziel.y - ny);
      ctx.lineTo(von.x - nx, von.y - ny);
      ctx.closePath();
      ctx.fillStyle = 'rgba(141,255,176,0.22)';
      ctx.fill();
      ctx.setLineDash([8 / s, 6 / s]);
      ctx.lineWidth = 2 / s;
      ctx.strokeStyle = FARBEN.vorschau;
      ctx.beginPath();
      ctx.moveTo(von.x, von.y);
      ctx.lineTo(ziel.x, ziel.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(ziel.x, ziel.y, 6 / s, 0, Math.PI * 2);
      ctx.fillStyle = FARBEN.vorschau;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(von.x, von.y, 6 / s, 0, Math.PI * 2);
    ctx.fillStyle = ziel ? FARBEN.vorschau : FARBEN.vorschauFalsch;
    ctx.fill();
    ctx.restore();
  },
};
