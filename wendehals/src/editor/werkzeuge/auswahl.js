// Werkzeug „Auswahl“ (V): Klick wählt Gang, Knoten, Formteil, Wand oder Hindernis. Ziehen eines Knotens verschiebt ihn
// (Raster KNOTENRASTER), Ziehen eines Teils verschiebt es (Raster RASTER), Ziehen im Leeren verschiebt den Plan (macht main.js).
import { knotenVerschieben } from '../befehle.js';
import { teilFinden, teilVerschieben, teilName, hatMasse } from '../teile.js';
import { rechteck } from '../daten.js';
import { FARBEN, KNOTENRASTER, RASTER, KLICK_TOLERANZ_PX } from '../konstanten.js';

let zug = null; // { art, id, start: [px, py], versatz: [dx, dy] (nur Teile), x, y, bewegt }
const gerastert = (v) => Math.round(v / KNOTENRASTER) * KNOTENRASTER + 0;

export default {
  id: 'auswahl',
  name: 'Auswahl',
  hinweis: 'Klick wählt, Knoten und Teile ziehen verschiebt sie, Ziehen im Leeren (oder mit der mittleren/rechten Maustaste) verschiebt den Plan. Entf löscht.',
  down(k, p) {
    const t = k.treffer(p.px, p.py);
    if (t?.art === 'knoten') {
      zug = { art: 'knoten', id: t.id, start: [p.px, p.py], x: null, y: null, bewegt: false };
      return true;
    }
    if (t && (t.art === 'formteil' || t.art === 'objekt')) {
      const o = teilFinden(k.gebiet(), t.art, t.id);
      zug = { art: t.art, id: t.id, start: [p.px, p.py], versatz: [o.x - p.x, o.y - p.y], x: null, y: null, bewegt: false };
      return true;
    }
    return false;
  },
  move(k, p) {
    if (!zug) return;
    if (!zug.bewegt && Math.hypot(p.px - zug.start[0], p.py - zug.start[1]) < KLICK_TOLERANZ_PX) return;
    zug.bewegt = true;
    if (zug.art === 'knoten') {
      zug.x = gerastert(p.x);
      zug.y = gerastert(p.y);
    } else {
      zug.x = Math.round((p.x + zug.versatz[0]) / RASTER) * RASTER + 0;
      zug.y = Math.round((p.y + zug.versatz[1]) / RASTER) * RASTER + 0;
    }
    k.zeichnen();
  },
  up(k, p) {
    const z = zug;
    zug = null;
    if (!z) return;
    if (!z.bewegt) return k.waehle({ art: z.art, id: z.id });
    if (z.art !== 'knoten') {
      const g = k.gebiet();
      const o = teilFinden(g, z.art, z.id);
      const name = teilName(z.art, o);
      if (!k.aendere(`${name} verschieben`, (gg) => teilVerschieben(gg, z.art, z.id, z.x, z.y))) k.hinweis('');
      return k.waehle({ art: z.art, id: z.id });
    }
    const ok = k.aendere('Knoten verschieben', (g) => knotenVerschieben(g, z.id, z.x, z.y));
    if (!ok) k.hinweis('Dorthin geht der Knoten nicht: seine Gänge würden aus dem 45°-Raster fallen, zu kurz werden, oder dort steht schon ein Knoten.');
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
    ctx.lineWidth = 2 / k.ansicht.masstab;
    ctx.strokeStyle = FARBEN.vorschau;
    ctx.beginPath();
    if (zug.art === 'knoten') ctx.arc(zug.x, zug.y, 9 / k.ansicht.masstab, 0, Math.PI * 2);
    else {
      const o = teilFinden(k.gebiet(), zug.art, zug.id);
      if (o && hatMasse(zug.art, o)) {
        const e = rechteck(zug.x, zug.y, o.laenge, o.breite, o.winkel);
        ctx.moveTo(e[0][0], e[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(e[i][0], e[i][1]);
        ctx.closePath();
      } else ctx.arc(zug.x, zug.y, 14, 0, Math.PI * 2);
    }
    ctx.stroke();
  },
};
