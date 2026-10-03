import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGES, EDGE_BY_ID } from '../src/data/world.js';
import { ITEM_IDS, GATES } from '../src/data/items.js';
import { Level } from '../src/game/level.js';
import { edgeDir } from '../src/game/worldgraph.js';
import { opposite, headingAngle } from '../src/core/math.js';
import { freshPowers } from '../src/game/powerups.js';
import { runLevel, botInput } from './helpers/bot.mjs';
import { TileMap, isSolid } from '../src/game/terrain.js';

/** Terrain entfernen, um ein einzelnes Hindernis isoliert zu prüfen. */
function clearTerrain(lv) {
  lv.map = new TileMap(lv.map.cols, lv.map.rows, true);
  lv.wrap = true;
  lv.dyn = [];
}

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
  // Statisches Terrain: nie drin. (Bewegliche Teile können im Testmodus in den Spieler fahren.)
  if (!lv.invincible || !lv.stats.crashes) assert.equal(lv.staticWallHit(p.a, p.c, ha, hc), null, 'Spieler steckt in einer Wand');
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
      // Man kommt nicht durch: entweder hängt man noch vor der Wand, oder der Dackel kehrt von selbst um
      assert.ok(!lv.result || lv.result.type === 'retreat', `ohne ${missing} trotzdem geschafft`);
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
    clearTerrain(lv);
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
    clearTerrain(lv);
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
    for (const seed of [1, 2, 3]) {
      // Nur die Items für harte Hindernisse – weiche (Stacheln, Dunkel) muss man können
      const hard = Object.values(GATES).filter((g) => !g.soft).map((g) => g.item);
      const lv = new Level({ edge, forward: true, items: new Set(hard), seed });
      runLevel(lv, edge.length / 42 + 150, { input: dodgeInput });
      if (!lv.result || lv.result.type !== 'arrive') deaths.push(edge.id + '#' + seed);
    }
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

test('Show don\'t tell: vor einer unüberwindbaren Wand kehrt der Dackel nach einigen Sekunden selbst um', () => {
  const lv = new Level({ edge: EDGE_BY_ID.gurkengasse, forward: true, items: new Set(), invincible: true });
  lv.events = [];
  const { result, seconds } = runLevel(lv, 120);
  assert.equal(result?.type, 'retreat');
  assert.ok(seconds < 60);
});

const idle = (lv, n) => {
  for (let i = 0; i < n; i++) lv.update(1 / 60, {});
};

test('Splitter: erst wackeln, dann platzen; Teile schlafen kurz, sind harmlos und teilen sich nicht weiter', () => {
  const edge = EDGES.find((e) => !e.boss);
  const lv = new Level({ edge, forward: true, items: withAll(), seed: 3 });
  clearTerrain(lv);
  lv.enemies.length = 0;
  for (const kind of ['seife', 'wurst', 'brezel', 'wecker']) {
    const parent = lv.spawn(kind, lv.player.a + 200, lv.player.c);
    lv.kill(parent, true);
    assert.ok(parent.splitting > 0 && !parent.dead, kind + ' wackelt erst');
    assert.equal(lv.enemies.filter((e) => e.gen === 1).length, 0, 'noch keine Teile');
    const pa = parent.a;
    idle(lv, 13);
    assert.ok(parent.dead, kind + ' ist geplatzt');
    assert.ok(Math.abs(parent.a - pa) < 1e-9, 'wackelnder Gegner bewegt sich nicht');
    const kids = lv.enemies.filter((e) => !e.dead && e.gen === 1);
    assert.equal(kids.length, 2, kind + ' teilt sich in 2');
    for (const k of kids) {
      assert.ok(k.dormant > 0.2, 'Teile schlafen zuerst');
      assert.equal(k.wave, -1, 'Teile zählen nicht zur Welle');
    }
    // Teile wandern während der Verzögerung nicht und sind unverwundbar
    const pos = kids.map((k) => [k.a, k.c]);
    lv.shots.push({ kind: 'main', a: kids[0].a, c: kids[0].c, va: 0, vc: 0, r: 3, dmg: 9, t: 0 });
    idle(lv, 1);
    kids.forEach((k, i) => {
      assert.ok(!k.dead && k.hp === k.maxHp, 'schlafendes Teil wurde getroffen');
      assert.deepEqual([k.a, k.c], pos[i]);
    });
    // Abschuss eines Teils erzeugt keine weiteren Teile
    for (const k of kids) lv.kill(k, true);
    idle(lv, 30);
    assert.equal(lv.enemies.filter((e) => e.gen === 2).length, 0, kind + ': Kettenreaktion');
    assert.ok(kids.every((k) => k.dead));
    lv.enemies.length = 0;
  }
});

test('Splitter: nach der Verzögerung werden die Teile aktiv', () => {
  const lv = new Level({ edge: EDGES.find((e) => !e.boss), forward: true, items: withAll(), seed: 3 });
  clearTerrain(lv);
  lv.enemies.length = 0;
  lv.kill(lv.spawn('seife', lv.player.a + 300, lv.player.c), true);
  idle(lv, 45);
  const kids = lv.enemies.filter((e) => e.gen === 1);
  assert.equal(kids.length, 2);
  for (const k of kids) {
    assert.ok(!(k.dormant > 0));
    assert.ok(k.t > 0, 'Teil bewegt sich');
  }
});

test('Splitter entstehen nie in festem Terrain, Gegner fliegen nicht durch Wände (Befund Software-Tester)', () => {
  let checked = 0;
  for (const edge of EDGES) {
    const lv = new Level({ edge, forward: true, items: withAll(), invincible: true, seed: 2 });
    for (let i = 0; i < 60 * 40 && !lv.result; i++) {
      lv.update(1 / 60, botInput(lv));
      if (i % 10) continue;
      for (const e of lv.enemies) {
        if (e.dead || e.a > lv.camA + lv.va || e.a < lv.camA) continue;
        checked++;
        assert.ok(!isSolid(lv.map.at(e.a, e.c)), `${edge.id}: ${e.kind} steckt in der Wand`);
      }
    }
  }
  assert.ok(checked > 500);
});

test('Kehrtwende baut kein Terrain neu: Wellen sind dieselben wie bei generateLevel (Befund Software-Tester)', async () => {
  const { generateLevel, generateEvents } = await import('../src/game/levelgen.js');
  for (const edge of EDGES) {
    for (const fwd of [true, false]) {
      const L = Math.ceil(edge.length / 16) * 16;
      assert.deepEqual(generateEvents(edge, fwd, 288, L), generateLevel(edge, fwd, 288, L).events, edge.id);
    }
  }
  const lv = new Level({ edge: EDGE_BY_ID.spinnweben, forward: true, items: withAll(), invincible: true, seed: 1 });
  for (let i = 0; i < 600; i++) lv.update(1 / 60, { fire: true });
  lv.turnAnim = { t: 0, dur: 0.8, swapped: false };
  const t0 = performance.now();
  lv.reverse();
  assert.ok(performance.now() - t0 < 8, 'Kehrtwende zu teuer');
});

test('Zahnräder: Drehsinn bleibt bei der Kehrtwende, kehrt sich im Spiegelbild um (Befund Software-Tester)', async () => {
  const { dynState, mirrorDyn } = await import('../src/game/dynamics.js');
  const g = { type: 'gear', a: 100, c: 100, r: 26, amp: 20, speed: 1, phase: 0 };
  const rot = (o) => dynState(o, 1).rot;
  assert.ok(rot(g) > 0);
  assert.ok(rot(mirrorDyn(g, 1000, 288, true)) > 0, '180°-Drehung');
  assert.ok(rot(mirrorDyn(g, 1000, 288, false)) < 0, 'Spiegelung');
});

test('Zeitschranke: ohne Espresso fällt sie vor der Nase zu, mit Espresso (gehalten) kommt man durch', () => {
  const edge = EDGE_BY_ID.flusensieb;
  for (const forward of [true, false]) {
    for (const withEspresso of [false, true]) {
      const items = withAll(withEspresso ? [] : ['ESPRESSO']);
      const lv = new Level({ edge, forward, items, invincible: true, seed: 4 });
      const { result } = runLevel(lv, edge.length / 42 + 40);
      const g = lv.gates.find((x) => x.type === 'clock');
      if (withEspresso) assert.equal(result?.type, 'arrive', `${forward}: mit Espresso nicht durch`);
      else {
        assert.ok(g.closed, 'Schranke ist zu');
        assert.ok(!result || result.type === 'retreat', `${forward}: ohne Espresso trotzdem durch`);
      }
    }
  }
});

test('Espresso: Taste halten verdoppelt das Scrolltempo, ohne Item passiert nichts', () => {
  const edge = EDGES.find((e) => !e.boss && !(e.gates || []).length);
  const run = (items, espresso) => {
    const lv = new Level({ edge, forward: true, items, invincible: true, seed: 1 });
    clearTerrain(lv);
    lv.events = [];
    for (let i = 0; i < 120; i++) lv.update(1 / 60, { espresso });
    return lv.camA;
  };
  const normal = run(new Set(), false);
  assert.ok(Math.abs(run(new Set(), true) - normal) < 1e-6, 'ohne Item kein Turbo');
  const fast = run(new Set(['ESPRESSO']), true);
  assert.ok(Math.abs(fast - 2 * normal) < 1, `Turbo: ${fast} vs ${normal}`);
});

test('Zeitschranke: Uhr startet erst im Level, mit Espresso bleibt Luft für Menschen (≥ 1,2 s)', async () => {
  const { CLOCK_RUN } = await import('../src/game/levelgen.js');
  for (const edge of EDGES.filter((e) => (e.gates || []).some((g) => g.type === 'clock'))) {
    for (const forward of [true, false]) {
      const lv = new Level({ edge, forward, items: withAll(), invincible: true, seed: 4 });
      const g = lv.gates.find((x) => x.type === 'clock');
      assert.ok(g.a0 - CLOCK_RUN - lv.va > 400, `${edge.id}: Uhr liefe schon am Start`);
      let rest = null;
      for (let i = 0; i < 60 * 120 && !lv.result; i++) {
        lv.update(1 / 60, botInput(lv));
        if (rest === null && lv.player.a - lv.playerHalf.ha > g.a1) rest = g.timer;
      }
      assert.ok(rest !== null && rest >= 1.2, `${edge.id} ${forward}: Restzeit ${rest}`);
    }
  }
});
