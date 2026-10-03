import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGES, EDGE_BY_ID } from '../src/data/world.js';
import { ITEM_IDS, GATES } from '../src/data/items.js';
import { Level } from '../src/game/level.js';
import { edgeDir } from '../src/game/worldgraph.js';
import { opposite, headingAngle } from '../src/core/math.js';
import { freshPowers } from '../src/game/powerups.js';
import { runLevel, botInput } from './helpers/bot.mjs';

const ALL = new Set(ITEM_IDS);
const withAll = (except = []) => {
  const s = new Set(ALL);
  for (const x of except) s.delete(x);
  return s;
};

function checkInvariants(lv) {
  const p = lv.player;
  assert.ok(Number.isFinite(p.a) && Number.isFinite(p.c), 'Spielerposition ungültig');
  assert.ok(p.c >= 0 && p.c < lv.H, 'Querposition nicht normalisiert');
  assert.ok(p.a >= lv.camA + lv.margins()[0] - 0.01 || lv.state === 'clear', 'Spieler hinter der Kamera');
  assert.ok(Number.isFinite(lv.camA) && Number.isFinite(lv.camC));
  for (const e of lv.enemies) assert.ok(Number.isFinite(e.a) && Number.isFinite(e.c), 'Gegner ' + e.kind + ' NaN');
  for (const b of lv.bullets) assert.ok(Number.isFinite(b.a) && Number.isFinite(b.c));
  assert.ok(lv.bullets.length <= 220);
  // Spieler steckt nie in einer Wand
  const { ha, hc } = lv.playerHalf;
  assert.equal(lv.wallHit(p.a, p.c, ha, hc), null, 'Spieler steckt in einer Wand');
}

for (const edge of EDGES) {
  for (const forward of [true, false]) {
    if (!forward && edge.oneWay) continue;
    test(`Level ${edge.id} (${forward ? 'vorwärts' : 'rückwärts'}) ist mit allen Items schaffbar`, () => {
      const items = forward && edge.reward ? withAll([edge.reward]) : withAll();
      const lv = new Level({ edge, forward, items, invincible: true, seed: 7 });
      const limit = edge.length / 42 + (edge.boss ? 120 : 30);
      const { result } = runLevel(lv, limit, { check: checkInvariants });
      assert.ok(result, `kein Ergebnis nach ${limit.toFixed(0)} s`);
      assert.equal(result.type, 'arrive');
      assert.equal(result.node, forward ? edge.to : edge.from);
      const dir = edgeDir(edge);
      assert.equal(result.heading, forward ? dir : opposite(dir));
      if (forward && edge.boss) assert.deepEqual(result.rewards, [edge.reward]);
      else assert.deepEqual(result.rewards, []);
      assert.equal(result.goal, forward && edge.reward === 'GOAL');
    });
  }
}

for (const edge of EDGES.filter((e) => (e.gates || []).some((g) => !GATES[g.type].soft))) {
  test(`Level ${edge.id}: ohne Pflicht-Item kommt man nicht durch`, () => {
    const hard = [...new Set(edge.gates.filter((g) => !GATES[g.type].soft).map((g) => GATES[g.type].item))];
    for (const missing of hard) {
      const lv = new Level({ edge, forward: true, items: withAll([missing, edge.reward]), invincible: true, seed: 3 });
      runLevel(lv, edge.length / 42 + 40, { check: checkInvariants });
      assert.equal(lv.result, null, `ohne ${missing} trotzdem geschafft`);
      assert.ok(lv.camA < edge.length - lv.va - 50, 'Kamera hätte vor der Wand anhalten müssen');
    }
  });
}

test('weiche Hindernisse: Stachelfeld ist mit Können ohne Treffer passierbar', () => {
  for (const edge of EDGES.filter((e) => (e.gates || []).some((g) => g.type === 'spikes'))) {
    for (const forward of [true, false]) {
      // Nur Stacheln zählen: Gegner entfernen, damit nur das Ausweichen geprüft wird.
      const lv = new Level({ edge, forward, items: new Set(['BOHRER', 'PILZ', 'LAMPE']), seed: 11 });
      lv.events = [];
      runLevel(lv, edge.length / 42 + 20, { check: checkInvariants });
      assert.equal(lv.state === 'dead', false, `${edge.id}: am Stachelfeld gestorben`);
      assert.equal(lv.player.hp, lv.player.maxHp, `${edge.id} ${forward}: Stacheln getroffen`);
      assert.ok(lv.result, `${edge.id}: nicht angekommen`);
    }
  }
});

test('Stacheln verletzen ohne Quietscheentenhaut, mit ihr nicht', () => {
  const edge = EDGE_BY_ID.butterberg;
  const sit = (items) => {
    const lv = new Level({ edge, forward: true, items, seed: 1 });
    lv.events = [];
    // Spieler gerade durch das Stachelfeld steuern, ohne auszuweichen
    runLevel(lv, edge.length / 42 + 10, { input: () => ({ mx: 0.4, my: 0, fire: false }) });
    return lv;
  };
  const hurt = sit(new Set());
  assert.ok(hurt.player.hp < hurt.player.maxHp || hurt.state === 'dead');
  const safe = sit(new Set(['GUMMIHAUT']));
  assert.equal(safe.player.hp, safe.player.maxHp);
});

test('enge Spalte: normal zu groß, mit Schrumpfpilz passt man durch', () => {
  const edge = EDGE_BY_ID.kohlenrutsche;
  const big = new Level({ edge, forward: true, items: new Set(), invincible: true });
  const g = big.gates.find((x) => x.type === 'narrow');
  const { ha, hc } = big.playerHalf;
  assert.ok(big.wallHit(g.a0 + 5, g.gapC, ha, hc), 'großer Spieler passt fälschlich');
  const small = new Level({ edge, forward: true, items: new Set(['PILZ']), invincible: true });
  const h2 = small.playerHalf;
  assert.equal(small.wallHit(g.a0 + 5, g.gapC, h2.ha, h2.hc), null, 'kleiner Spieler passt nicht');
});

test('Felswand: normale Schüsse prallen ab, Bohrer zerstört Blöcke', () => {
  const edge = EDGE_BY_ID.gurkengasse;
  for (const drill of [false, true]) {
    const lv = new Level({ edge, forward: true, items: drill ? new Set(['BOHRER']) : new Set(), invincible: true });
    lv.events = [];
    runLevel(lv, 40, { input: () => ({ mx: 0.3, my: 0, fire: true }) });
    const g = lv.gates.find((x) => x.type === 'rock');
    const broken = g.blocks.filter((b) => b.hp <= 0).length;
    if (drill) assert.ok(broken > 0);
    else assert.equal(broken, 0);
  }
});

test('Wendehals: Kehrtwende mitten im Level führt zurück zum Startknoten', () => {
  const edge = EDGE_BY_ID.schaumbad;
  const lv = new Level({ edge, forward: true, items: new Set(['WENDEHALS']), invincible: true });
  runLevel(lv, 15);
  const before = { a: lv.player.a, cam: lv.camA };
  lv.update(1 / 60, { wende: true });
  runLevel(lv, 1, { input: () => ({}) });
  assert.equal(lv.forward, false);
  assert.ok(Math.abs(lv.player.a - (edge.length - before.a)) < 40);
  const { result } = runLevel(lv, edge.length / 42 + 30, { check: checkInvariants });
  assert.equal(result.node, edge.from);
  assert.equal(result.heading, opposite(edgeDir(edge)));
});

test('Wendehals: Bildschirmposition bleibt bei der Kehrtwende erhalten', () => {
  const edge = EDGE_BY_ID.kruemelmauer;
  const lv = new Level({ edge, forward: true, items: new Set(['WENDEHALS', 'BOHRER']), invincible: true });
  runLevel(lv, 12);
  const relA = lv.player.a - lv.camA;
  const relC = lv.dc(lv.player.c, lv.camC);
  lv.update(1 / 60, { wende: true });
  while (lv.turnAnim) lv.update(1 / 60, {});
  // Nach der Wende bleibt der Abstand zur Hinterkante gleich (Kamera gleitet hinterher),
  // quer bleibt die Figur an derselben Bildschirmstelle (Querachse gespiegelt).
  assert.ok(Math.abs(lv.player.a - lv.camA - relA) < 1);
  assert.ok(Math.abs(lv.dc(lv.player.c, lv.camC) - (lv.vc - relC)) < 1.5);
  assert.equal(lv.viewAngle(), headingAngle(lv.heading), 'die Welt dreht sich nicht mit');
  // Wände wurden mitgespiegelt und bleiben zerstört/intakt
  for (const g of lv.gates) assert.ok(g.a0 < g.a1);
});

test('ohne Wendehals passiert bei WENDEN nichts', () => {
  const lv = new Level({ edge: EDGE_BY_ID.schaumbad, forward: true, items: new Set(), invincible: true });
  lv.update(1 / 60, { wende: true });
  assert.equal(lv.turnAnim, null);
  assert.equal(lv.forward, true);
});

test('Tod: Energie 0 führt zum Ergebnis "dead"', () => {
  const lv = new Level({ edge: EDGE_BY_ID.kaffeekraenzchen, forward: true, items: new Set(), seed: 5 });
  const { result } = runLevel(lv, 200, { input: () => ({}) });
  assert.ok(result);
  assert.equal(result.type, 'dead');
});

test('Schild fängt Treffer ab, bevor Energie verloren geht', () => {
  const powers = freshPowers();
  powers.shield = 3;
  const lv = new Level({ edge: EDGE_BY_ID.schaumbad, forward: true, items: new Set(), powers });
  lv.player.inv = 0;
  lv.damage();
  assert.equal(lv.player.hp, lv.player.maxHp);
  assert.equal(powers.shield, 2);
});

test('Simulation ist deterministisch', () => {
  const run = () => {
    const lv = new Level({ edge: EDGE_BY_ID.entenrennen, forward: true, items: new Set(), invincible: true, seed: 99 });
    runLevel(lv, 30);
    return [lv.score, lv.stats.kills, lv.player.a.toFixed(3), lv.player.c.toFixed(3)].join('|');
  };
  assert.equal(run(), run());
});

test('Bosse kommen nur vorwärts und nur solange die Belohnung fehlt', () => {
  const edge = EDGE_BY_ID.kaffeekraenzchen;
  assert.equal(new Level({ edge, forward: true, items: new Set() }).hasBoss, true);
  assert.equal(new Level({ edge, forward: true, items: new Set(['DREHWURM']) }).hasBoss, false);
  assert.equal(new Level({ edge, forward: false, items: new Set() }).hasBoss, false);
  // Der Endboss kommt immer
  assert.equal(new Level({ edge: EDGE_BY_ID.uhrwerk, forward: true, items: withAll() }).hasBoss, true);
});

test('Power-Ups wirken im Level (Tempo, Laser, Begleiter, Raketen)', () => {
  const powers = { ...freshPowers(), speed: 2, laser: true, options: 2, missile: true };
  const lv = new Level({ edge: EDGE_BY_ID.schaumbad, forward: true, items: new Set(), powers, invincible: true });
  lv.events = [];
  runLevel(lv, 3, { input: () => ({ mx: 0, my: 1, fire: true }) });
  assert.ok(lv.shots.some((s) => s.kind === 'laser'));
  assert.ok(lv.shots.some((s) => s.kind === 'missile'));
  assert.equal(lv.optionPositions().length, 2);
});

test('Bonbons: ganze Formation abschießen lässt ein Bonbon fallen', () => {
  const lv = new Level({ edge: EDGE_BY_ID.kruemelstrasse, forward: true, items: new Set(), invincible: true });
  runLevel(lv, 30, { input: (l) => botInput(l, { buyPowers: false }) });
  assert.ok(lv.powers.cursor >= 0 || lv.pickups.length > 0, 'kein Bonbon bekommen');
});

test('Fairness: ein ausweichender Autopilot überlebt jedes Level (ohne Unverwundbarkeit)', async () => {
  const { dodgeInput } = await import('./helpers/bot.mjs');
  const deaths = [];
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: new Set(['BOHRER', 'PILZ']), seed: 2 });
    runLevel(lv, edge.length / 42 + 150, { input: dodgeInput });
    if (!lv.result || lv.result.type !== 'arrive') deaths.push(edge.id);
  }
  assert.deepEqual(deaths, []);
});

test('Großer Wecker: Uhrzeiger lassen hinten immer einen sicheren Streifen frei', () => {
  const lv = new Level({ edge: EDGE_BY_ID.uhrwerk, forward: true, items: withAll(), invincible: true });
  lv.events = [];
  let minA = Infinity;
  runLevel(lv, 160, {
    check: (l) => {
      for (const h of l.hazards) minA = Math.min(minA, h.a + Math.cos(h.ang) * h.len - l.camA);
    },
  });
  assert.ok(minA > lv.margins()[0] + 12, 'Zeiger reicht bis ' + minA.toFixed(1));
});

test('Wende am Start einer rückwärts geflogenen Boss-Etappe startet keinen Boss (Befund Software-Tester)', () => {
  for (const edge of EDGES.filter((e) => e.boss && !e.oneWay)) {
    const lv = new Level({ edge, forward: false, items: new Set(['WENDEHALS']), invincible: true });
    lv.update(1 / 60, { wende: true });
    while (lv.turnAnim) lv.update(1 / 60, {});
    const { result } = runLevel(lv, edge.length / 42 + 20);
    assert.notEqual(lv.state, 'boss', edge.id);
    assert.ok(result, edge.id);
    assert.deepEqual(result.rewards, [], edge.id + ': keine Belohnung von hinten');
  }
});

test('Fortschritt läuft von 0 bis 1, auch rückwärts und nach einer Kehrtwende', () => {
  for (const forward of [true, false]) {
    const lv = new Level({ edge: EDGE_BY_ID.schaumbad, forward, items: new Set(), invincible: true });
    assert.equal(lv.progress(), 0);
    let last = 0;
    runLevel(lv, 200, {
      check: (l) => {
        const p = l.progress();
        assert.ok(p >= last - 1e-9 && p <= 1 + 1e-9);
        last = p;
      },
    });
    assert.ok(last > 0.999);
  }
});

test('Show don\'t tell: Level-Meldungen verraten keine Items und keine Lösungen', async () => {
  const { ITEMS } = await import('../src/data/items.js');
  const names = Object.values(ITEMS).map((i) => i.name);
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: new Set(), invincible: true });
    const seen = new Set();
    runLevel(lv, edge.length / 42 + 30, { check: (l) => l.messages.forEach((m) => seen.add(m.text)) });
    for (const t of seen) for (const n of names) assert.ok(!t.includes(n), `${edge.id}: "${t}" nennt ${n}`);
  }
  // Item-Texte enthalten höchstens eine Tastenbelegung
  for (const [id, it] of Object.entries(ITEMS)) assert.ok(it.desc === '' || /[A-Z] ?\/ ?[A-Z]|Pfeile|\(X\)/.test(it.desc), id + ': ' + it.desc);
});
