// Werkzeug „Knoten“ (K): Klick setzt einen Knoten des gewählten Typs (Raster 100 E). Auf einem Gang teilt der Klick den Gang
// (T-Kreuzung); alle übrigen Daten bleiben erhalten.
import { knotenSetzen, knotenPunkt } from '../befehle.js';
import { FARBEN, RAUM_W, RAUM_H } from '../konstanten.js';
import { KNOTENTYPEN } from '../katalog.js';

let schwebe = null; // { x, y, gang? } oder null

export default {
  id: 'knoten',
  name: 'Knoten',
  hinweis: 'Rechtsklick setzt einen Knoten (Typ oben wählen). Auf einem Gang entsteht eine T-Kreuzung. Linksklick wählt, mittlere Taste verschiebt den Plan.',
  down: () => false,
  klick(k, p) {
    const typ = k.state.knotenTyp;
    const neu = k.aendere('Knoten setzen', (g) => knotenSetzen(g, typ, p.x, p.y, k.tolE() * 2));
    if (neu) k.waehle({ art: 'knoten', id: neu.id });
    else k.hinweis('Dort geht kein Knoten (schon einer da oder zu nah am Gangende).');
  },
  schweben(k, p) {
    schwebe = k.gebiet() && knotenPunkt(k.gebiet(), p.x, p.y, k.tolE() * 2);
    k.zeichnen();
  },
  abbruch() {
    schwebe = null;
  },
  vorschau(ctx, k) {
    if (!schwebe) return;
    const s = k.ansicht.masstab;
    const typ = KNOTENTYPEN[k.state.knotenTyp];
    ctx.save();
    ctx.lineWidth = 2 / s;
    ctx.strokeStyle = FARBEN.vorschau;
    if (typ?.hatMasse) ctx.strokeRect(schwebe.x - RAUM_W / 2, schwebe.y - RAUM_H / 2, RAUM_W, RAUM_H);
    ctx.beginPath();
    ctx.arc(schwebe.x, schwebe.y, 8 / s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};
