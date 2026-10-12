// Karte für „Spielen ab hier“ im Level-Editor (Paket 13, Stufe 3): derselbe Aufbau wie karte.js (Gänge als Rechtecke mit Achse,
// Kreuzungen = Überschneidungen), dazu Boden ohne Kreuzungswirkung (`extraFloor`: Knotenflächen, Formteile) und feste Blöcke
// (`blocks`: Wände, Hindernisse). Die Fenster-Regeln bleiben unverändert in FensterScene; hier ändert sich nur, was als Boden zählt.
// Reine Daten und Geometrie. Alles achsenparallel (Diagonalen kann der Fenster-Prototyp mit dieser Karte nicht).

import { compileMap } from './karte.js';

const inRect = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const PROBEN = 16; // Randpunkte der Kreisprobe in der Vereinigung mehrerer Rechtecke

/** `def` wie bei compileMap, plus `extraFloor` und `blocks` (Rechtecke {x0,y0,x1,y1}; Blöcke mit `farbe`). */
export function compileEditorMap(def) {
  const base = compileMap(def);
  const extraFloor = def.extraFloor ?? [];
  const blocks = def.blocks ?? [];
  const floors = [...base.corridors, ...extraFloor];

  const boden = (x, y) => floors.some((r) => inRect(r, x, y));
  const imBlock = (x, y, r) => blocks.some((b) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1)) < (r > 0 ? r : 1e-9));

  /** Kreis mit Radius r liegt ganz auf Boden (Vereinigung aller Rechtecke) und berührt keinen Block. */
  function walkable(x, y, r = 0) {
    if (imBlock(x, y, r)) return false;
    if (!extraFloor.length && base.walkable(x, y, r)) return true;
    if (!boden(x, y)) return false;
    if (r <= 0) return true;
    for (let i = 0; i < PROBEN; i++) {
      const a = (i / PROBEN) * Math.PI * 2;
      if (!boden(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
    }
    return true;
  }

  function freeDistance(x, y, vx, vy, max, r) {
    let d = 0;
    while (d < max && walkable(x + vx * (d + 1), y + vy * (d + 1), r)) d++;
    return d >= max ? max : d;
  }

  const alle = [...floors, ...blocks];
  return {
    ...base,
    kind: 'editor',
    extraFloor,
    blocks,
    bounds: {
      x0: Math.min(...alle.map((r) => r.x0)),
      x1: Math.max(...alle.map((r) => r.x1)),
      y0: Math.min(...alle.map((r) => r.y0)),
      y1: Math.max(...alle.map((r) => r.y1)),
    },
    walkable,
    freeDistance,
  };
}
