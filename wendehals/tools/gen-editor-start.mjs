// Erzeugt die Startgebiete des Editors aus den Prototyp-Karten: levels/gebiete/proto-netz.json (P1c „Netz“) und
// proto-achteck.json (P3 „45°-Kreuzung“). Das Beispielgebiet `beispiel.json` ist von Hand geschrieben und wird nicht angefasst.
// Aufruf: node tools/gen-editor-start.mjs   (einmalig; danach sind die Dateien die Quelle der Wahrheit)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NETZ_MAP, NETZ_DEF } from '../src/proto/netz-map.js';
import { ARMS8, END, WIDTH } from '../src/proto/achteck-map.js';
import { formatiere } from '../src/editor/daten.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'levels/gebiete');
mkdirSync(out, { recursive: true });
const r = (v) => Math.round(v * 1000) / 1000;

function netz() {
  const RAEUME = new Set(['raum-f']);
  const gaenge = NETZ_MAP.corridors.filter((c) => !RAEUME.has(c.id));
  const innen = (x, y, ausser) => gaenge.some((o) => o !== ausser && x > o.x0 + 1e-6 && x < o.x1 - 1e-6 && y > o.y0 + 1e-6 && y < o.y1 - 1e-6);
  const knoten = [];
  const id = (x, y) => {
    let k = knoten.find((n) => Math.abs(n.x - x) < 1e-6 && Math.abs(n.y - y) < 1e-6);
    if (!k) {
      k = { id: 'K' + (knoten.length + 1), typ: 'kreuzung', x: r(x), y: r(y) };
      knoten.push(k);
    }
    return k.id;
  };
  const raum = NETZ_DEF.corridors.find((c) => RAEUME.has(c.id));
  const raumKnoten = { id: 'RAUM', typ: 'raum', x: (raum.a0 + raum.a1) / 2, y: raum.c, w: raum.a1 - raum.a0, h: raum.w };
  const gangListe = [];
  for (const c of gaenge) {
    const h = c.axis === 'h';
    const punkt = (a) => (h ? [a, c.c] : [c.c, a]);
    // Enden: liegt das abgeschnittene Stück ganz in einem anderen Gang, bis zur Mitte dieses Gangs kürzen (gleiche Fläche)
    const ende = (a, zu) => {
      const [x, y] = punkt(a);
      const o = gaenge.find((q) => q !== c && q.axis !== c.axis && (h ? x : y) > (h ? q.x0 : q.y0) - 1e-6 && (h ? x : y) < (h ? q.x1 : q.y1) + 1e-6 && (h ? y : x) >= (h ? q.y0 : q.x0) - 1e-6 && (h ? y : x) <= (h ? q.y1 : q.x1) + 1e-6);
      if (!o) return a;
      void zu;
      return o.c;
    };
    const stationen = new Set([ende(c.a0, 0), ende(c.a1, 1)]);
    for (const j of NETZ_MAP.junctions) {
      if (j.h === c) stationen.add(j.cx);
      if (j.v === c) stationen.add(j.cy);
    }
    if (c.id === 'sued') stationen.add(raumKnoten.x);
    const reihe = [...stationen].sort((p, q) => p - q);
    for (let i = 0; i + 1 < reihe.length; i++) {
      const [ax, ay] = punkt(reihe[i]);
      const [bx, by] = punkt(reihe[i + 1]);
      gangListe.push({ id: `${c.id}-${i + 1}`, name: c.id, von: id(ax, ay), nach: id(bx, by), breite: c.w });
    }
  }
  // Kreuzungen tragen ihr Quadrat (Überschneidung der beiden Gänge) als Maße: so bleibt die Fläche beim Kürzen der Enden gleich
  for (const j of NETZ_MAP.junctions) {
    const k = knoten.find((n) => Math.abs(n.x - j.cx) < 1e-6 && Math.abs(n.y - j.cy) < 1e-6);
    k.w = r(j.x1 - j.x0);
    k.h = r(j.y1 - j.y0);
  }
  // Raumknoten mit dem Knoten auf (350,500) gleichsetzen
  const rk = knoten.find((n) => n.x === raumKnoten.x && n.y === raumKnoten.y);
  rk.typ = 'raum';
  rk.w = raumKnoten.w;
  rk.h = raumKnoten.h;
  const grad = new Map(knoten.map((k) => [k.id, 0]));
  for (const g of gangListe) for (const k of [g.von, g.nach]) grad.set(k, grad.get(k) + 1);
  for (const k of knoten) if (k.typ === 'kreuzung' && grad.get(k.id) === 1) k.typ = 'ende';
  // Speicherort am Start des Prototyps (Nordwest-Ecke)
  const start = knoten.find((k) => k.x === -900 && k.y === -500) || knoten[0];
  start.typ = 'speicher';
  const b = NETZ_MAP.bounds;
  return {
    format: 1, id: 'proto-netz', name: 'P1c „Netz“ (Prototyp-Karte)', tileset: 'keller',
    bereich: { x0: b.x0 - 100, y0: b.y0 - 100, x1: b.x1 + 100, y1: b.y1 + 100 },
    knoten, gaenge: gangListe, formteile: [], objekte: [], notizen: [],
  };
}

function achteck() {
  const knoten = [{ id: 'K1', typ: 'kreuzung', form: 'achteck', x: 0, y: 0, seite: WIDTH }];
  const gaenge = [];
  ARMS8.forEach((a, i) => {
    const k = { id: 'K' + (i + 2), typ: a.name === 'Westen' ? 'speicher' : 'ende', x: r(a.u[0] * END), y: r(a.u[1] * END) };
    knoten.push(k);
    gaenge.push({ id: 'arm-' + a.code.toLowerCase(), name: a.name, von: 'K1', nach: k.id, breite: WIDTH });
  });
  return {
    format: 1, id: 'proto-achteck', name: 'P3 „45°-Kreuzung“ (Prototyp-Karte)', tileset: 'bad',
    bereich: { x0: -END - 100, y0: -END - 100, x1: END + 100, y1: END + 100 },
    knoten, gaenge, formteile: [], objekte: [], notizen: [],
  };
}

for (const g of [netz(), achteck()]) {
  writeFileSync(path.join(out, g.id + '.json'), formatiere(g));
  console.log(g.id, g.knoten.length, 'Knoten,', g.gaenge.length, 'Gänge');
}
