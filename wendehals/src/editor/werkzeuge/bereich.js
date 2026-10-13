// Werkzeug „Bereich“ (A): Rechteck aufziehen setzt den Bereich des Gebiets (rastet auf 100 E). Der Bereich sagt, wo das Gebiet auf dem
// Plan liegt; er ändert weder Gänge noch Boden. Mit Rückgängig; zu kleine Bereiche werden mit Meldung abgelehnt.
import { bereichSetzen } from '../welt.js';
import { FARBEN, KLICK_TOLERANZ_PX } from '../konstanten.js';

let zug = null; // { start: {x, y}, ende: {x, y}, px: [px, py], bewegt }
const probe = (a, e) => {
  const kopie = { bereich: null };
  const fehler = bereichSetzen(kopie, a.x, a.y, e.x, e.y);
  return { fehler, bereich: kopie.bereich };
};

export default {
  id: 'bereich',
  name: 'Bereich',
  hinweis: 'Rechts ziehen zeichnet den Bereich des Gebiets (rastet auf 100 E, mindestens ein Bildschirm). Esc bricht ab. Eingabefelder und „An Inhalt anpassen“ stehen rechts.',
  down(k, p) {
    zug = { start: { x: p.x, y: p.y }, ende: { x: p.x, y: p.y }, px: [p.px, p.py], bewegt: false };
    return true;
  },
  move(k, p) {
    if (!zug) return;
    zug.ende = { x: p.x, y: p.y };
    zug.bewegt = zug.bewegt || Math.hypot(p.px - zug.px[0], p.py - zug.px[1]) >= KLICK_TOLERANZ_PX;
    const r = probe(zug.start, zug.ende);
    k.hinweis(r.fehler ? r.fehler : `Bereich ${r.bereich.x1 - r.bereich.x0} × ${r.bereich.y1 - r.bereich.y0} E`);
    k.zeichnen();
  },
  up(k, p) {
    const z = zug;
    zug = null;
    k.hinweis('');
    if (!z || !(z.bewegt || Math.hypot(p.px - z.px[0], p.py - z.px[1]) >= KLICK_TOLERANZ_PX)) return;
    const r = probe(z.start, { x: p.x, y: p.y });
    if (r.fehler) return k.melde(r.fehler, 'fehler');
    k.aendere('Bereich setzen', (g) => {
      g.bereich = r.bereich;
    });
  },
  abbruch(k) {
    zug = null;
    k?.zeichnen();
    k?.hinweis('');
  },
  vorschau(ctx, k) {
    if (!zug || !zug.bewegt) return;
    const r = probe(zug.start, zug.ende);
    const s = k.ansicht.masstab;
    const x0 = Math.min(zug.start.x, zug.ende.x);
    const y0 = Math.min(zug.start.y, zug.ende.y);
    ctx.save();
    ctx.lineWidth = 2 / s;
    ctx.setLineDash([10 / s, 6 / s]);
    ctx.strokeStyle = r.fehler ? FARBEN.vorschauFalsch : FARBEN.vorschau;
    ctx.strokeRect(x0, y0, Math.abs(zug.ende.x - zug.start.x), Math.abs(zug.ende.y - zug.start.y));
    ctx.restore();
  },
};
