// Bedienung der Welt-Ansicht (Taste T): Klick wählt ein Gebiet oder einen Übergang, Ziehen eines Gebiets verschiebt seine Lage im
// Welt-Plan (rastet auf 100 E), Ziehen im Leeren verschiebt den Plan, Doppelklick (oder Enter) öffnet das Gebiet.
// Kein Eintrag in WERKZEUGE: die Ansicht schaltet main.js um; das Objekt hat dieselbe Form wie ein Werkzeug (down/move/up/klick …).
import { weltLagen, weltBereich, uebergaengeVon, uebergangPunkte } from '../welt.js';
import { abstandZuStrecke } from '../zeichnen-welt.js';
import { KLICK_TOLERANZ_PX, LAGE_RASTER } from '../konstanten.js';

const UEBERGANG_FANG_PX = 7; // Klickabstand zu einer Übergangslinie (Bildschirmpixel)

/** Was liegt unter dem Bildschirmpunkt? Übergang vor Gebiet; Gebiete von hinten (zuletzt gezeichnet = oben). */
export function weltTreffer(k, px, py) {
  const { welt, gebiete } = k.state;
  const lagen = weltLagen(welt, gebiete);
  for (const u of uebergaengeVon(welt)) {
    const p = uebergangPunkte(u, gebiete, lagen);
    if (!p) continue;
    const [ax, ay] = k.ansicht.weltZuBild(p[0].x, p[0].y);
    const [bx, by] = k.ansicht.weltZuBild(p[1].x, p[1].y);
    if (abstandZuStrecke(px, py, ax, ay, bx, by) <= UEBERGANG_FANG_PX) return { art: 'uebergang', id: u.id };
  }
  const [x, y] = k.ansicht.bildZuWelt(px, py);
  for (const e of [...welt.gebiete].reverse()) {
    const g = gebiete[e.id];
    const l = lagen.get(e.id);
    if (!g || !l) continue;
    const r = weltBereich(g, l);
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return { art: 'gebiet', id: e.id };
  }
  return null;
}

let zug = null; // { id, start: [px, py], welt0, lage0: {x, y}, vorher, bewegt }

export default {
  id: 'welt',
  name: 'Welt',
  hinweis: 'Klick wählt ein Gebiet oder einen Übergang, Ziehen verschiebt das Gebiet im Plan (100 E), Doppelklick (oder Enter) öffnet es, T geht zurück ins Gebiet.',
  down(k, p) {
    const t = weltTreffer(k, p.px, p.py);
    if (t?.art !== 'gebiet') return false;
    const lagen = weltLagen(k.state.welt, k.state.gebiete);
    zug = { id: t.id, start: [p.px, p.py], welt0: [p.x, p.y], lage0: { ...lagen.get(t.id) }, vorher: JSON.stringify(k.state.welt), bewegt: false };
    return true;
  },
  move(k, p) {
    if (!zug) return;
    if (!zug.bewegt && Math.hypot(p.px - zug.start[0], p.py - zug.start[1]) < KLICK_TOLERANZ_PX) return;
    zug.bewegt = true;
    k.weltLive(zug.id, zug.lage0.x + (p.x - zug.welt0[0]), zug.lage0.y + (p.y - zug.welt0[1]));
    k.hinweis(`Lage ${Math.round(k.state.welt.gebiete.find((e) => e.id === zug.id).lage.x)} | ${Math.round(k.state.welt.gebiete.find((e) => e.id === zug.id).lage.y)} E (Raster ${LAGE_RASTER} E)`);
  },
  up(k) {
    const z = zug;
    zug = null;
    k.hinweis('');
    if (!z) return;
    if (!z.bewegt) return k.weltWaehle({ art: 'gebiet', id: z.id });
    k.weltFertig(z.vorher, 'Gebiet verschieben');
    k.weltWaehle({ art: 'gebiet', id: z.id });
  },
  klick(k, p) {
    k.weltWaehle(weltTreffer(k, p.px, p.py));
  },
  abbruch(k) {
    if (zug) {
      const z = zug;
      zug = null;
      k?.weltZurueck(z.vorher);
    }
    k?.hinweis('');
  },
};
