import test from 'node:test';
import assert from 'node:assert/strict';
import { TILESETS, GEGNER, tilesetFarben, gegnerFuer, KNOTENTYPEN } from '../src/editor/katalog.js';
import { THEMES } from '../src/data/themes.js';
import { GEBIETE } from '../src/editor/startdaten.js';
import { pruefeFormat } from '../src/editor/daten.js';
import { KUERZEL } from '../src/editor/konstanten.js';
import { WERKZEUGE } from '../src/editor/werkzeuge/index.js';
import { neueId } from '../src/editor/befehle.js';

test('Tileset-Farben: jedes Thema liefert Boden, Schachbrett, Wand und Hindernis als Farbe', () => {
  for (const id of Object.keys(TILESETS)) {
    const f = tilesetFarben(id);
    assert.deepEqual(Object.keys(f), ['boden', 'boden2', 'wand', 'hindernis']);
    for (const v of Object.values(f)) assert.match(v, /^#[0-9a-f]{6}$/i, id);
    assert.equal(f.boden, THEMES[id].terrain.solid);
    assert.notEqual(f.boden, f.boden2, 'Schachbrett muss sichtbar sein: ' + id);
    assert.notEqual(f.boden, f.wand);
  }
  assert.equal(tilesetFarben('gibtsnicht'), null);
});

test('Gegnerliste je Tileset: zuerst der Pool des Themas, danach alle übrigen, nichts doppelt', () => {
  for (const id of Object.keys(TILESETS)) {
    const l = gegnerFuer(id);
    assert.equal(new Set(l).size, l.length);
    assert.deepEqual([...l].sort(), [...GEGNER].sort());
    const pool = TILESETS[id].pool.filter((a) => GEGNER.includes(a));
    assert.deepEqual(l.slice(0, pool.length), pool, id);
  }
  assert.deepEqual(gegnerFuer('gibtsnicht'), GEGNER);
});

test('Gegner-Werkzeug ist in der Liste, hat ein Kürzel und kollidiert mit keinem anderen', () => {
  assert.ok(WERKZEUGE.some((w) => w.id === 'gegner'));
  const codes = Object.values(KUERZEL.werkzeug);
  assert.equal(new Set(codes).size, codes.length);
  for (const w of WERKZEUGE) assert.ok(KUERZEL.werkzeug[w.id], 'Kürzel für ' + w.id);
  assert.ok(![KUERZEL.look, ...codes].some((c, i, a) => a.indexOf(c) !== i), 'Look-Kürzel ist frei');
});

test('Gegner-Werkzeug setzt einen gültigen Platzhalter im Raster; Format bleibt gültig', () => {
  const g = JSON.parse(JSON.stringify(GEBIETE['proto-netz']));
  const w = WERKZEUGE.find((x) => x.id === 'gegner');
  let gewaehlt = null;
  const k = {
    state: { gegnerArt: 'toast' },
    aendere: (_l, fn) => fn(g),
    waehle: (a) => (gewaehlt = a),
    hinweis: () => {},
  };
  w.klick(k, { x: 413, y: -87 });
  const o = g.objekte[g.objekte.length - 1];
  assert.deepEqual({ typ: o.typ, art: o.art, x: o.x, y: o.y, platzhalter: o.platzhalter }, { typ: 'gegner', art: 'toast', x: 420, y: -80, platzhalter: true });
  assert.deepEqual(gewaehlt, { art: 'objekt', id: o.id });
  assert.deepEqual(pruefeFormat(g), []);
  k.state.gegnerArt = 'quatsch';
  w.klick(k, { x: 0, y: 0 });
  assert.equal(g.objekte[g.objekte.length - 1].art, GEGNER[0], 'unbekannte Art fällt auf die erste zurück');
  assert.equal(new Set(g.objekte.map((x) => x.id)).size, g.objekte.length);
  assert.ok(KNOTENTYPEN && neueId);
});
