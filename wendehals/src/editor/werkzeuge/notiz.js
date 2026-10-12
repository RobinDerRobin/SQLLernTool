// Werkzeug „Notiz“ (M): Rechtsklick setzt eine Notiz (Absicht an einer Stelle, Stufe 8); den Text schreibt man danach rechts ins Feld.
// Die Notiz ist nur für Menschen und die KI – sie ändert nichts am Spiel. Lage rastet auf 20 E.
import { notizSetzen } from '../teile.js';
import { FARBEN, RASTER, MAX_KOORD } from '../konstanten.js';

const rund = (v) => Math.round(v / RASTER) * RASTER + 0;
let schwebe = null;

export default {
  id: 'notiz',
  name: 'Notiz',
  hinweis: 'Rechtsklick setzt eine Notiz; den Text schreibst du danach rechts ins Feld. Notizen ändern nichts am Spiel, sie halten fest, was an der Stelle werden soll.',
  down: () => false,
  klick(k, p) {
    if (Math.abs(rund(p.x)) > MAX_KOORD || Math.abs(rund(p.y)) > MAX_KOORD) return k.hinweis('Zu weit draußen.');
    const neu = k.aendere('Notiz setzen', (g) => notizSetzen(g, p.x, p.y));
    if (neu) {
      k.state.notizFokus = neu.id; // main.js setzt den Cursor ins Textfeld, sobald es da ist
      k.waehle(neu);
    }
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
    ctx.strokeStyle = FARBEN.vorschau;
    ctx.strokeRect(schwebe.x - 5 / s, schwebe.y - 5 / s, 10 / s, 10 / s);
    ctx.restore();
  },
};
