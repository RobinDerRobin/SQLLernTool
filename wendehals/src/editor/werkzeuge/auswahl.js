// Linke Maustaste im Plan (immer, A1): Linksklick wählt, Strg+Klick ergänzt/entfernt, Ziehen (ab 8 px) auf einem Ding verschiebt die ganze
// Auswahl, Ziehen im Leeren zieht einen Auswahlrahmen (was ganz drin liegt; Alt beim Loslassen: auch was berührt). Unter der Maus wird das
// Ding hervorgehoben. Das Werkzeug setzt nie etwas; „Auswahl“ ist auch der Eintrag „kein Element“ für den Rechtsklick.
import { knotenVerschieben } from '../befehle.js';
import { teilFinden, teilVerschieben, teilName } from '../teile.js';
import { verschiebeDinge, gleichesDing } from '../mehrfach.js';
import { zeichneUmriss } from '../zeichnen.js';
import { FARBEN, KNOTENRASTER, RASTER, KLICK_TOLERANZ_PX } from '../konstanten.js';

let zug = null; // { modus: 'schieben' | 'rahmen' | 'strg', start: [px, py], startWelt: [x, y], ding, dinge, einzel, strg, x, y, dx, dy, ende: [x, y], bewegt }
let schwebt = null; // Ding unter der Maus (Hervorhebung)
const gerastert = (v) => Math.round(v / KNOTENRASTER) * KNOTENRASTER + 0;

/** Rahmen als { x0, y0, x1, y1 } aus Anfang und Ende. */
const rahmenVon = (z) => ({ x0: Math.min(z.startWelt[0], z.ende[0]), y0: Math.min(z.startWelt[1], z.ende[1]), x1: Math.max(z.startWelt[0], z.ende[0]), y1: Math.max(z.startWelt[1], z.ende[1]) });

export default {
  id: 'auswahl',
  name: 'Auswahl',
  hinweis: 'Linksklick wählt (Strg+Klick ergänzt), Ziehen verschiebt die Auswahl, Ziehen im Leeren wählt mit einem Rahmen (Alt: auch Berührtes). Mittlere Taste oder Shift+Ziehen verschiebt den Plan, Pfeile die Auswahl. Rechtsklick kopiert die Auswahl – oder setzt das Element, das du links wählst (G K B W H X A).',
  down(k, p) {
    const t = k.treffer(p.px, p.py);
    if (t && p.strg) {
      zug = { modus: 'strg', ding: t, start: [p.px, p.py], bewegt: false };
      return true;
    }
    if (t) {
      if (!k.auswahlListe().some((d) => gleichesDing(d, t))) k.setzeAuswahl([t]); // Drücken wählt, danach lässt sich ziehen
      const dinge = k.auswahlListe();
      const einzel = dinge.length === 1 && dinge[0].art !== 'gang' ? dinge[0] : null;
      let versatz = null;
      if (einzel && einzel.art !== 'knoten') {
        const o = teilFinden(k.gebiet(), einzel.art, einzel.id);
        versatz = [o.x - p.x, o.y - p.y];
      }
      zug = { modus: 'schieben', ding: t, dinge, einzel, versatz, start: [p.px, p.py], startWelt: [p.x, p.y], x: null, y: null, dx: 0, dy: 0, bewegt: false };
      return true;
    }
    zug = { modus: 'rahmen', start: [p.px, p.py], startWelt: [p.x, p.y], ende: [p.x, p.y], strg: p.strg, bewegt: false };
    return true;
  },
  move(k, p) {
    if (!zug) return;
    if (!zug.bewegt && Math.hypot(p.px - zug.start[0], p.py - zug.start[1]) < KLICK_TOLERANZ_PX) return;
    zug.bewegt = true;
    if (zug.modus === 'schieben') {
      if (zug.einzel?.art === 'knoten') {
        zug.x = gerastert(p.x);
        zug.y = gerastert(p.y);
      } else if (zug.einzel) {
        zug.x = Math.round((p.x + zug.versatz[0]) / RASTER) * RASTER + 0;
        zug.y = Math.round((p.y + zug.versatz[1]) / RASTER) * RASTER + 0;
      } else {
        const q = k.schrittFuer(zug.dinge);
        zug.dx = Math.round((p.x - zug.startWelt[0]) / q) * q + 0;
        zug.dy = Math.round((p.y - zug.startWelt[1]) / q) * q + 0;
      }
    } else if (zug.modus === 'rahmen') {
      zug.ende = [p.x, p.y];
      zug.alt = p.alt;
      const n = k.inRahmen(rahmenVon(zug), zug.alt).length;
      k.hinweis(`Auswahlrahmen: ${n} ${n === 1 ? 'Ding' : 'Dinge'}${zug.alt ? ' (auch berührte)' : ''} – Alt beim Loslassen wählt auch Berührtes, Strg ergänzt`);
    }
    k.zeichnen();
  },
  up(k, p) {
    const z = zug;
    zug = null;
    k.hinweis('');
    if (!z) return;
    if (z.modus === 'strg') {
      if (!z.bewegt) k.schalteAuswahl(z.ding);
      return;
    }
    if (z.modus === 'rahmen') {
      if (!z.bewegt) return z.strg ? undefined : k.waehle(null); // Klick ins Leere hebt die Auswahl auf
      const gefunden = k.inRahmen(rahmenVon(z), p.alt);
      const alt = z.strg ? k.auswahlListe() : [];
      k.setzeAuswahl([...alt.filter((d) => !gefunden.some((f) => gleichesDing(f, d))), ...gefunden]);
      return;
    }
    // schieben
    if (!z.bewegt) {
      if (k.auswahlListe().length > 1) k.setzeAuswahl([z.ding]); // Klick auf ein Ding einer Mehrfachauswahl wählt nur dieses
      return;
    }
    if (z.einzel) {
      const e = z.einzel;
      if (e.art === 'knoten') {
        const ok = k.aendere('Knoten verschieben', (g) => knotenVerschieben(g, e.id, z.x, z.y));
        if (!ok) k.hinweis('Dorthin geht der Knoten nicht: seine Gänge würden aus dem 45°-Raster fallen, zu kurz werden, oder dort steht schon ein Knoten.');
        return k.setzeAuswahl([e]);
      }
      const o = teilFinden(k.gebiet(), e.art, e.id);
      if (!o) return;
      const name = teilName(e.art, o);
      if (!k.aendere(`${name} verschieben`, (gg) => teilVerschieben(gg, e.art, e.id, z.x, z.y))) k.hinweis('');
      return k.setzeAuswahl([e]);
    }
    if (!z.dx && !z.dy) return;
    k.aendere('Auswahl verschieben', (g) => {
      const fehler = verschiebeDinge(g, z.dinge, z.dx, z.dy);
      if (fehler) throw new Error(fehler);
    });
  },
  /** Maus bewegt sich ohne gedrückte Taste: das Ding darunter hervorheben. */
  schweben(k, p) {
    const t = k.treffer(p.px, p.py);
    if (t?.art === schwebt?.art && t?.id === schwebt?.id) return;
    schwebt = t;
    k.zeichnen();
  },
  abbruch(k) {
    zug = null;
    if (schwebt) {
      schwebt = null;
      k?.zeichnen();
    }
    k?.hinweis('');
  },
  vorschau(ctx, k) {
    const s = k.ansicht.masstab;
    const g = k.gebiet();
    ctx.save();
    if (schwebt && !zug && !k.auswahlListe().some((d) => gleichesDing(d, schwebt))) {
      ctx.lineWidth = 2 / s;
      ctx.strokeStyle = FARBEN.hover;
      zeichneUmriss(ctx, g, schwebt, s);
    }
    if (zug?.bewegt && zug.modus === 'schieben') {
      ctx.lineWidth = 2 / s;
      ctx.strokeStyle = FARBEN.vorschau;
      if (zug.einzel?.art === 'knoten') {
        ctx.beginPath();
        ctx.arc(zug.x, zug.y, 9 / s, 0, Math.PI * 2);
        ctx.stroke();
      } else if (zug.einzel) {
        const o = teilFinden(g, zug.einzel.art, zug.einzel.id);
        if (o) zeichneUmriss(ctx, g, zug.einzel, s, zug.x - o.x, zug.y - o.y);
      } else {
        for (const d of zug.dinge) zeichneUmriss(ctx, g, d, s, zug.dx, zug.dy);
        // Gänge, deren Knoten mitwandern, aber nicht gewählt sind, folgen mit
      }
    }
    if (zug?.bewegt && zug.modus === 'rahmen') {
      const r = rahmenVon(zug);
      ctx.lineWidth = 1.5 / s;
      ctx.setLineDash(zug.alt ? [6 / s, 4 / s] : []);
      ctx.strokeStyle = FARBEN.rahmenAuswahl;
      ctx.fillStyle = 'rgba(127,212,255,0.12)';
      ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    }
    ctx.restore();
  },
};
