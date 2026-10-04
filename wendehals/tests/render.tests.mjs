import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Renderer } from '../src/render/renderer.js';
import { drawEnemy, drawBullet, drawBoss } from '../src/render/sprites.js';
import { Game } from '../src/game/game.js';
import { Level } from '../src/game/level.js';
import { MemoryStorage } from '../src/game/save.js';
import { EDGES, NODES } from '../src/data/world.js';
import { ITEM_IDS } from '../src/data/items.js';
import { ENEMIES } from '../src/game/enemies.js';
import { BOSSES } from '../src/game/bosses.js';
import { TRACKS, parse } from '../src/core/audio.js';
import { runLevel } from './helpers/bot.mjs';

/** Canvas-Attrappe: nimmt alle Aufrufe an und prüft Zahlenargumente auf NaN. */
function fakeCtx() {
  const bad = [];
  const gradient = { addColorStop() {} };
  const target = {
    calls: 0,
    bad,
    measureText: (s) => ({ width: String(s).length * 5 }),
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    getTransform: () => ({}),
  };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => {
        t.calls++;
        for (const a of args) if (typeof a === 'number' && !Number.isFinite(a)) bad.push(String(k));
      };
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
}

test('alle Gegner, Kugeln und Bosse lassen sich zeichnen', () => {
  const ctx = fakeCtx();
  for (const kind of Object.keys(ENEMIES)) drawEnemy(ctx, { kind, idx: 1, t: 1, r: 8, flash: 0.1, ang: 1 }, 1.5);
  for (const kind of ['kugel', 'blase', 'zucker', 'kaffee', 'dampf', 'tropfen', 'pommes', 'note', 'muetze', 'glocke']) {
    drawBullet(ctx, { kind, r: 3, va: 10, vc: 5 }, 1);
  }
  for (const kind of Object.keys(BOSSES)) drawBoss(ctx, { kind, flash: 0.05, angry: true, phase: 3 }, 2);
  assert.deepEqual(ctx.bad, []);
  assert.ok(ctx.calls > 100);
});

test('jedes Level lässt sich in jeder Flugrichtung und im Bosskampf zeichnen', () => {
  const ctx = fakeCtx();
  const r = new Renderer(ctx);
  const game = new Game({ storage: new MemoryStorage() });
  game.startNewGame();
  game.overlay = null;
  game.screen = 'level';
  for (const edge of EDGES) {
    for (const forward of [true, false]) {
      if (!forward && edge.oneWay) continue;
      const items = new Set(ITEM_IDS);
      if (forward && edge.reward) items.delete(edge.reward);
      const lv = new Level({ edge, forward, items, invincible: true, seed: 4 });
      game.level = lv;
      for (let i = 0; i < 6; i++) {
        runLevel(lv, edge.length / 42 / 6 + (edge.boss ? 10 : 0));
        r.draw(game);
        if (lv.result) break;
      }
    }
  }
  assert.deepEqual([...new Set(ctx.bad)], []);
});

test('Karte, Titel, Menüs, Dialoge und Abspann lassen sich zeichnen', () => {
  const ctx = fakeCtx();
  const r = new Renderer(ctx);
  const game = new Game({ storage: new MemoryStorage(), platform: { quit() {}, setFullscreen() {} } });
  r.draw(game);
  game.startNewGame();
  r.draw(game);
  game.overlay = null;
  game.items = new Set(ITEM_IDS);
  game.progress.visited = EDGES.flatMap((e) => [e.from, e.to]);
  game.progress.knownEdges = EDGES.map((e) => e.id);
  // Jede Arena in jeder Blickrichtung, dazu die Kartenansicht
  for (const id of Object.keys(NODES)) {
    if (NODES[id].goal) continue;
    for (let h = 0; h < 4; h++) {
      game.placeAt(id, h);
      game.update(1 / 60, { mx: 1, my: 0.5 });
      r.draw(game, 0.5);
    }
  }
  game.openMap();
  r.draw(game);
  game.overlay = null;
  game.placeAt('toast', 0);
  game.openStation();
  r.draw(game);
  game.openCharacters();
  r.draw(game);
  game.openOptions(() => {});
  r.draw(game);
  game.showControls(() => {});
  r.draw(game);
  game.toast('Hallo');
  game.startEnding();
  for (let i = 0; i < 12; i++) {
    game.ending.line = i;
    game.ending.done = i >= 9;
    r.draw(game);
  }
  assert.deepEqual(ctx.bad, []);
});

test('Musik: alle Noten der Spuren sind gültig', () => {
  for (const [name, tr] of Object.entries(TRACKS)) {
    for (const part of ['lead', 'bass']) {
      const toks = tr[part].split(/\s+/).filter(Boolean);
      const parsed = parse(tr[part]);
      toks.forEach((tok, i) => {
        if (tok !== '.') assert.ok(Number.isInteger(parsed[i]), `${name}.${part}: ungültige Note ${tok}`);
      });
      assert.equal(toks.length, 32, `${name}.${part} sollte 32 Achtel lang sein`);
    }
    assert.equal(tr.drums.length, 32, `${name}.drums`);
  }
});

test('jede Musikspur, die das Spiel anfordert, existiert', async () => {
  const { THEMES } = await import('../src/data/themes.js');
  for (const t of Object.values(THEMES)) assert.ok(TRACKS[t.music], t.music);
  for (const n of ['title', 'map', 'boss', 'ending']) assert.ok(TRACKS[n], n);
});

test('jeder ausgelöste Soundeffekt hat einen Klang', () => {
  const audioSrc = readFileSync(new URL('../src/core/audio.js', import.meta.url), 'utf8');
  const names = new Set();
  const dirs = ['../src/game/', '../src/core/'];
  for (const d of dirs) {
    for (const f of readdirSync(new URL(d, import.meta.url))) {
      const src = readFileSync(new URL(d + f, import.meta.url), 'utf8');
      for (const m of src.matchAll(/sfx\('([a-z]+)'\)/g)) names.add(m[1]);
    }
  }
  assert.ok(names.size > 15);
  for (const n of names) assert.ok(audioSrc.includes(`case '${n}'`), `Sound "${n}" fehlt`);
});

test('Stachelreihen: keine Zacke ragt in die Lücke (Regression Renderfehler)', async () => {
  const { drawSpikeColumn } = await import('../src/render/renderer.js');
  for (const vc of [270, 480]) {
    for (let gy = -60; gy <= vc + 60; gy += 7) {
      const half = 35;
      const ys = [];
      const rec = {
        fillRect: (x, y, w, h) => ys.push(y, y + h),
        moveTo: (x, y) => ys.push(y),
        lineTo: (x, y) => ys.push(y),
        beginPath() {},
        fill() {},
        stroke() {},
        setLineDash() {},
        fillStyle: '',
        strokeStyle: '',
      };
      // Markierungslinie in der Lücke ignorieren: nur Zacken und Balken prüfen
      rec.stroke = () => ys.splice(ys.length - 2, 2);
      drawSpikeColumn(rec, 100, gy, half, 540, vc);
      for (const y of ys) {
        for (const g of [gy - 540, gy, gy + 540]) {
          assert.ok(!(y > g - half + 0.01 && y < g + half - 0.01), `Zacke bei ${y.toFixed(1)} liegt in der Lücke um ${g}`);
        }
      }
    }
  }
});

test('Blitz-Zählung erkennt Stroboskop und lässt sanftes Pulsieren durch', async () => {
  const { countFlashes } = await import('../e2e/flashcount.mjs');
  const strobe = Array.from({ length: 60 }, (_, i) => (Math.floor(i / 5) % 2 ? 0.6 : 0.05)); // 6 Hz
  assert.ok(countFlashes(strobe) >= 5);
  const gentle = Array.from({ length: 60 }, (_, i) => 0.3 + 0.03 * Math.sin(i / 3));
  assert.equal(countFlashes(gentle), 0);
  const twoHz = Array.from({ length: 60 }, (_, i) => 0.3 + 0.2 * Math.sin((i / 60) * Math.PI * 4));
  assert.ok(countFlashes(twoHz) <= 2);
});

test('Gegner-Kugeln und gefährliche Zahnräder heben sich in jedem Gebiet deutlich vom Hintergrund ab', async () => {
  const { HAZARD_COLORS } = await import('../src/render/sprites.js');
  const { THEMES } = await import('../src/data/themes.js');
  const lum = (hex) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // Mindestens eine Farbe des Objekts (Füllung, Kontur oder Kante) erreicht 4,5:1 gegen jeden Hintergrund
  for (const [kind, c] of Object.entries(HAZARD_COLORS)) {
    for (const [id, th] of Object.entries(THEMES)) {
      for (const bg of th.bg) {
        const best = Math.max(...Object.values(c).map((col) => ratio(col, bg)));
        assert.ok(best >= 4.5, `${kind} vor ${id} (${bg}): nur ${best.toFixed(2)}:1`);
      }
    }
  }
  // Gegner-Blase ist nicht weiß-durchsichtig wie die Deko-Blasen
  assert.ok(ratio(HAZARD_COLORS.blase.fill, '#ffffff') >= 2, 'Blase zu weiß');
  // Zahnrad: Warnfarbe (rot-orange) statt Messing wie die Deko-Zahnräder
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(HAZARD_COLORS.zahnrad.fill);
  assert.ok(r > 200 && g < 140 && b < 80, 'Zahnrad nicht in Warnfarbe');
});
