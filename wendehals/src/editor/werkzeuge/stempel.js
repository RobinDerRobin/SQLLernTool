// Werkzeug „Stempel“ (U): Rechtsklick setzt den gewählten Stempel (Vorlage aus levels/stempel.json) an die Mausstelle (Stufe 8).
// Den Stempel wählt man in der Liste „Stempel“ rechts; angelegt wird er aus der Auswahl (Knopf „Auswahl als Stempel speichern“).
import { stempelClip } from '../stempel.js';
import { einfuegeVersatz } from '../mehrfach.js';
import { teilEcken, hatMasse } from '../teile.js';
import { FARBEN, KNOTEN_RADIUS_PX, GEGNER_RADIUS } from '../konstanten.js';

let schwebe = null;

export default {
  id: 'stempel',
  name: 'Stempel',
  hinweis: 'Rechtsklick setzt den gewählten Stempel an die Mausstelle. Stempel wählst du in der Liste rechts; Strg+Z nimmt ihn zurück.',
  down: () => false,
  klick(k, p) {
    const s = k.stempelAktuell();
    if (!s) return k.hinweis('Erst rechts in der Liste einen Stempel wählen (oder aus der Auswahl einen anlegen).');
    k.setzeKopie(stempelClip(s), p.x, p.y, `Stempel „${s.name}“ setzen`);
  },
  schweben(k, p) {
    schwebe = { x: p.x, y: p.y };
    k.zeichnen();
  },
  abbruch() {
    schwebe = null;
  },
  vorschau(ctx, k) {
    const s = schwebe && k.stempelAktuell();
    if (!s) return;
    const clip = stempelClip(s);
    const [dx, dy] = einfuegeVersatz(clip, schwebe.x, schwebe.y);
    const m = k.ansicht.masstab;
    ctx.save();
    ctx.lineWidth = 2 / m;
    ctx.strokeStyle = FARBEN.vorschau;
    ctx.setLineDash([6 / m, 5 / m]);
    for (const t of clip.teile) {
      if (hatMasse(t.art, t.teil)) {
        const e = teilEcken(t.teil);
        ctx.beginPath();
        e.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(t.teil.x + dx, t.teil.y + dy, GEGNER_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const kn = new Map(clip.knoten.map((n) => [n.id, n]));
    for (const g of clip.gaenge) {
      const a = kn.get(g.von);
      const b = kn.get(g.nach);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x + dx, a.y + dy);
      ctx.lineTo(b.x + dx, b.y + dy);
      ctx.stroke();
    }
    for (const n of clip.knoten) {
      ctx.beginPath();
      ctx.arc(n.x + dx, n.y + dy, KNOTEN_RADIUS_PX / m, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};
