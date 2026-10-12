// Werkzeug „Gegner“ (X): Klick setzt einen Gegner-Platzhalter der gewählten Art (Palette rechts oder Liste). Lage rastet auf 20 E.
import { neueId } from '../befehle.js';
import { GEGNER } from '../katalog.js';
import { FARBEN, RASTER, MAX_KOORD, GEGNER_RADIUS } from '../konstanten.js';

const rund = (v) => Math.round(v / RASTER) * RASTER + 0;
let schwebe = null;

export default {
  id: 'gegner',
  name: 'Gegner',
  hinweis: 'Klick setzt einen Gegner-Platzhalter (Art in der Palette rechts wählen). Sein Verhalten im Fenster ist ungeprüft.',
  down: () => false,
  klick(k, p) {
    const art = GEGNER.includes(k.state.gegnerArt) ? k.state.gegnerArt : GEGNER[0];
    const x = rund(p.x);
    const y = rund(p.y);
    if (Math.abs(x) > MAX_KOORD || Math.abs(y) > MAX_KOORD) return k.hinweis('Zu weit draußen.');
    const neu = k.aendere('Gegner setzen', (g) => {
      const o = { id: neueId(g, 'o'), typ: 'gegner', art, x, y, platzhalter: true };
      g.objekte.push(o);
      return o;
    });
    if (neu) k.waehle({ art: 'objekt', id: neu.id });
  },
  schweben(k, p) {
    schwebe = { x: rund(p.x), y: rund(p.y) };
    k.zeichnen();
  },
  abbruch() {
    schwebe = null;
  },
  vorschau(ctx, k) {
    if (!schwebe) return;
    const s = k.ansicht.masstab;
    ctx.save();
    ctx.lineWidth = 2 / s;
    ctx.setLineDash([6 / s, 5 / s]);
    ctx.strokeStyle = FARBEN.vorschau;
    ctx.beginPath();
    ctx.arc(schwebe.x, schwebe.y, GEGNER_RADIUS + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};
