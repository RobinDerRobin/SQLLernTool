// Werkzeug „Auswahl“ (V): Klick wählt Gang oder Knoten, Ziehen eines Knotens verschiebt ihn (Raster KNOTENRASTER),
// Ziehen im Leeren verschiebt den Plan (macht main.js).
import { knotenVerschieben } from '../befehle.js';
import { FARBEN, KNOTENRASTER, KLICK_TOLERANZ_PX } from '../konstanten.js';

let zug = null; // { id, start: [px, py], x, y, bewegt }
const gerastert = (v) => Math.round(v / KNOTENRASTER) * KNOTENRASTER + 0;

export default {
  id: 'auswahl',
  name: 'Auswahl',
  hinweis: 'Klick wählt, Knoten ziehen verschiebt ihn, Ziehen im Leeren verschiebt den Plan. Entf löscht.',
  down(k, p) {
    const t = k.treffer(p.px, p.py);
    if (t?.art !== 'knoten') return false;
    zug = { id: t.id, start: [p.px, p.py], x: null, y: null, bewegt: false };
    return true;
  },
  move(k, p) {
    if (!zug) return;
    if (!zug.bewegt && Math.hypot(p.px - zug.start[0], p.py - zug.start[1]) < KLICK_TOLERANZ_PX) return;
    zug.bewegt = true;
    zug.x = gerastert(p.x);
    zug.y = gerastert(p.y);
    k.zeichnen();
  },
  up(k, p) {
    const z = zug;
    zug = null;
    if (!z) return;
    if (!z.bewegt) return k.waehle({ art: 'knoten', id: z.id });
    k.aendere('Knoten verschieben', (g) => knotenVerschieben(g, z.id, z.x, z.y));
    k.waehle({ art: 'knoten', id: z.id });
  },
  /** Klick ohne Zug auf nichts oder einen Gang (main.js ruft das, wenn `down` nicht erfasst hat). */
  klick(k, p) {
    k.waehle(k.treffer(p.px, p.py));
  },
  abbruch() {
    zug = null;
  },
  vorschau(ctx, k) {
    if (!zug?.bewegt) return;
    ctx.beginPath();
    ctx.arc(zug.x, zug.y, 9 / k.ansicht.masstab, 0, Math.PI * 2);
    ctx.lineWidth = 2 / k.ansicht.masstab;
    ctx.strokeStyle = FARBEN.vorschau;
    ctx.stroke();
  },
};
