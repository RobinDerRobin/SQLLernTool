import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGES, EDGE_BY_ID } from '../src/data/world.js';
import { ITEM_IDS } from '../src/data/items.js';
import { LEVELS, PIECES } from '../src/data/levels.js';
import { Level } from '../src/game/level.js';
import { TileMap, T, TILE, findPath, CHAR_TO_TILE } from '../src/game/terrain.js';
import { corridorAt, dynState } from '../src/game/dynamics.js';
import { runLevel } from './helpers/bot.mjs';

const ALL = new Set(ITEM_IDS);

test('jede Etappe hat ein Profil, alle Set-Pieces existieren und sind gültig', () => {
  for (const e of EDGES) assert.ok(LEVELS[e.id], e.id + ' ohne Profil');
  for (const [name, pc] of Object.entries(PIECES)) {
    assert.ok(['floor', 'ceil', 'mid'].includes(pc.anchor), name);
    const w = pc.rows[0].length;
    for (const r of pc.rows) {
      assert.equal(r.length, w, name + ': ungleich lange Zeilen');
      for (const ch of r) assert.ok(ch in CHAR_TO_TILE, name + ': Zeichen ' + ch);
    }
  }
  for (const spec of Object.values(LEVELS)) for (const p of spec.pieces) assert.ok(PIECES[p], p);
});

test('jede Etappe ist in beide Richtungen durchfliegbar (Wegsuche, normale Größe)', () => {
  for (const edge of EDGES) {
    for (const forward of [true, false]) {
      if (!forward && edge.oneWay) continue;
      const lv = new Level({ edge, forward, items: ALL, invincible: true });
      assert.ok(findPath(lv.map, { size: 2 }), `${edge.id} ${forward ? 'vorwärts' : 'rückwärts'} nicht durchfliegbar`);
    }
  }
});

test('Etappen haben echtes Terrain (Identität statt leerer Fläche)', () => {
  let walled = 0;
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: ALL, invincible: true });
    let solid = 0;
    for (let i = 0; i < lv.map.data.length; i++) if (lv.map.data[i]) solid++;
    assert.ok(solid > 20, `${edge.id}: kaum Terrain (${solid} Kacheln)`);
    if (!lv.wrap) walled++;
  }
  assert.ok(walled >= 20, 'die meisten Etappen haben Boden und Decke');
  assert.ok(walled < EDGES.length, 'einige Etappen bleiben offen (Wrap)');
});

test('Rückwärts-Etappe ist das gespiegelte Vorwärts-Terrain', () => {
  const edge = EDGE_BY_ID.kaffeekraenzchen;
  const f = new Level({ edge, forward: true, items: ALL });
  const b = new Level({ edge, forward: false, items: ALL });
  for (let ix = 0; ix < f.map.cols; ix += 3) {
    for (let iy = 0; iy < f.map.rows; iy++) assert.equal(b.map.cell(f.map.cols - 1 - ix, iy), f.map.cell(ix, iy));
  }
});

test('Kehrtwende spiegelt das Terrain in beiden Achsen (die Welt bleibt, wo sie ist)', () => {
  const edge = EDGE_BY_ID.kruemelmauer;
  const lv = new Level({ edge, forward: true, items: new Set(['WENDEHALS', 'BOHRER']), invincible: true });
  const before = [];
  for (let ix = 0; ix < lv.map.cols; ix += 4) for (let iy = 0; iy < lv.map.rows; iy += 2) before.push([ix, iy, lv.map.cell(ix, iy)]);
  runLevel(lv, 5);
  lv.update(1 / 60, { wende: true });
  while (lv.turnAnim) lv.update(1 / 60, {});
  for (const [ix, iy, t] of before) assert.equal(lv.map.cell(lv.map.cols - 1 - ix, lv.map.rows - 1 - iy), t);
});

test('Schüsse: Zerbrechliches geht kaputt, Fels nur mit Bohrer, Metall nie', () => {
  const m = new TileMap(4, 4, false);
  m.set(0, 0, T.BREAK);
  m.set(1, 0, T.ROCK);
  m.set(2, 0, T.METAL);
  const at = (ix) => [ix * TILE + 8, 8];
  assert.equal(m.shoot(...at(0), 1, false), 'hit');
  assert.equal(m.shoot(...at(0), 1, false), 'destroy');
  assert.equal(m.cell(0, 0), T.FREE);
  assert.equal(m.shoot(...at(1), 5, false), 'block');
  assert.equal(m.shoot(...at(1), 5, true), 'destroy');
  assert.equal(m.shoot(...at(2), 99, true), 'block');
  assert.equal(m.cell(2, 0), T.METAL);
});

test('Ohne Wrap ist der Rand fest, mit Wrap läuft die Querachse durch', () => {
  const a = new TileMap(2, 4, false);
  assert.equal(a.cell(0, -1), T.SOLID);
  assert.equal(a.cell(0, 4), T.SOLID);
  const b = new TileMap(2, 4, true);
  b.set(0, 0, T.SOLID);
  assert.equal(b.cell(0, 4), T.SOLID);
  assert.equal(b.cell(0, -4), T.SOLID);
});

test('Wegsuche erkennt eine geschlossene Wand', () => {
  const m = new TileMap(10, 6, false);
  for (let iy = 0; iy < 6; iy++) m.set(5, iy, T.METAL);
  assert.equal(findPath(m, { size: 1 }), null);
  m.set(5, 3, T.FREE);
  assert.ok(findPath(m, { size: 1 }));
  assert.equal(findPath(m, { size: 2 }), null, 'Lücke von einer Kachel ist für normale Größe zu eng');
});

test('Stachel-Kacheln töten ohne Quietscheentenhaut', () => {
  const lv = new Level({ edge: EDGE_BY_ID.lavastrom, forward: true, items: new Set() });
  const p = lv.player;
  lv.map.set(Math.floor(p.a / TILE), Math.floor(p.c / TILE), T.SPIKE);
  lv.update(1 / 60, {});
  assert.equal(lv.state, 'dead');
  const lv2 = new Level({ edge: EDGE_BY_ID.lavastrom, forward: true, items: new Set(['GUMMIHAUT']) });
  lv2.map.set(Math.floor(lv2.player.a / TILE), Math.floor(lv2.player.c / TILE), T.SPIKE);
  lv2.update(1 / 60, {});
  assert.equal(lv2.state, 'play');
});

test('Spalten- und Stachellücken liegen im freien Korridor', () => {
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: ALL });
    if (lv.wrap) continue;
    for (const g of lv.gates) {
      if (g.type === 'narrow') {
        const [lo, hi] = corridorAt(lv.map, Math.floor(g.a0 / TILE) - 2);
        assert.ok(g.gapC > lo + 16 && g.gapC < hi - 16, `${edge.id}: Spalte außerhalb des Korridors`);
      }
      if (g.type === 'spikes') {
        for (const col of g.cols) {
          const [lo, hi] = corridorAt(lv.map, Math.floor(col.a / TILE));
          if (hi - lo < g.gap + 24) continue;
          assert.ok(col.base - col.amp - g.gap / 2 >= lo - 1 && col.base + col.amp + g.gap / 2 <= hi + 1, `${edge.id}: Stachellücke verlässt den Korridor`);
        }
      }
    }
  }
});

test('Bewegliches Terrain: deterministisch, nie am Start oder in der Boss-Arena', () => {
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: ALL });
    for (const o of lv.dyn) {
      assert.ok(o.a > 400, `${edge.id}: ${o.type} zu nah am Start`);
      if (edge.boss) assert.ok(o.a < lv.L - 560, `${edge.id}: ${o.type} in der Arena`);
      const s1 = dynState(o, 3.3);
      const s2 = dynState(o, 3.3);
      assert.deepEqual(s1, s2);
      assert.ok(Number.isFinite(s1.a) && Number.isFinite(s1.c));
    }
  }
});

test('Spieler bleibt ohne Wrap innerhalb der Levelbreite', () => {
  const lv = new Level({ edge: EDGE_BY_ID.kaffeekraenzchen, forward: true, items: ALL, invincible: true });
  runLevel(lv, 20, {
    input: (l, t) => ({ mx: 0, my: Math.sin(t) > 0 ? 1 : -1 }),
    check: (l) => assert.ok(l.player.c >= 0 && l.player.c <= l.H),
  });
});
