import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, EDGES, START_NODE } from '../src/data/world.js';
import { ITEMS, GATES } from '../src/data/items.js';
import { edgeDir, linkAt, linksAt, gatesFor, traverse, MIN_EXIT_GAP } from '../src/game/worldgraph.js';
import { analyze, analyzeWithRespawn } from '../src/game/solver.js';
import { E, N, S, W, opposite } from '../src/core/math.js';

test('alle Kanten haben eine Richtung und verweisen auf gültige Knoten', () => {
  for (const e of EDGES) {
    assert.ok(NODES[e.from], `${e.id}: from fehlt`);
    assert.ok(NODES[e.to], `${e.id}: to fehlt`);
    assert.ok(edgeDir(e) >= 0, `${e.id} ohne Richtung`);
    for (const k of ['fromPos', 'toPos']) if (e[k] !== undefined) assert.ok(e[k] >= 0.15 && e[k] <= 0.85, `${e.id}: ${k} zu nah an der Ecke`);
    assert.ok(e.length >= 1200, `${e.id} zu kurz`);
    for (const g of e.gates || []) {
      assert.ok(GATES[g.type], `${e.id}: Hindernis ${g.type} unbekannt`);
      assert.ok(g.at > 0.05 && g.at + g.len / e.length < 0.95, `${e.id}: Hindernis ragt an den Rand`);
    }
    if (e.reward) assert.ok(e.reward === 'GOAL' || ITEMS[e.reward], `${e.id}: Belohnung unbekannt`);
  }
});

test('keine zwei Knoten auf demselben Feld, keine Kante läuft durch einen Knoten', () => {
  const pos = new Map();
  for (const [id, n] of Object.entries(NODES)) {
    const k = n.x + ',' + n.y;
    assert.ok(!pos.has(k), `${id} und ${pos.get(k)} überlappen`);
    pos.set(k, id);
  }
  for (const e of EDGES) {
    if (e.dir !== undefined) continue; // frei geführte Kante (nur Kartenlinie)
    const a = NODES[e.from];
    const b = NODES[e.to];
    for (const [id, n] of Object.entries(NODES)) {
      if (id === e.from || id === e.to) continue;
      const between =
        (a.y === b.y && n.y === a.y && n.x > Math.min(a.x, b.x) && n.x < Math.max(a.x, b.x)) ||
        (a.x === b.x && n.x === a.x && n.y > Math.min(a.y, b.y) && n.y < Math.max(a.y, b.y));
      assert.ok(!between, `${e.id} läuft durch ${id}`);
    }
  }
});

test('jedes Item liegt genau einmal in der Welt', () => {
  const placed = [];
  for (const n of Object.values(NODES)) if (n.item) placed.push(n.item);
  for (const e of EDGES) if (e.reward && e.reward !== 'GOAL') placed.push(e.reward);
  assert.deepEqual([...placed].sort(), Object.keys(ITEMS).sort());
});

test('jede Speicherstation hat eine Drehscheibe und keinen Zwangswender', () => {
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.save) continue;
    assert.ok(n.turntable, `${id} braucht eine Drehscheibe`);
    assert.equal(n.autoTurn, undefined, `${id} darf nicht automatisch drehen`);
  }
  assert.ok(NODES[START_NODE].save);
});

test('Hindernisse werden beim Rückwärtsflug gespiegelt', () => {
  const e = EDGES.find((x) => x.id === 'konfettiregen');
  const back = gatesFor(e, false);
  assert.equal(back.length, 2);
  assert.equal(back[0].type, 'dark');
  assert.ok(Math.abs(back[0].at - (1 - 0.55 - 700 / e.length)) < 1e-9);
  assert.ok(back[0].at < back[1].at);
});

test('Einbahnstraßen lassen sich nicht rückwärts befliegen', () => {
  assert.equal(linkAt('eier', S).edge.id, 'kartoffelschacht');
  assert.equal(traverse('eier', S, new Set(['BOHRER', 'DREHWURM'])), null);
  assert.ok(traverse('kartoffelkiste', N, new Set()));
});

test('Wender drehen bei Ankunft automatisch', () => {
  const r = traverse('marmelade', N, new Set(['GUMMIHAUT']));
  assert.equal(r.node, 'butter');
  assert.equal(r.heading, S);
  assert.ok(r.items.has('WURST1'));
});

test('Boss-Belohnung wird bei Ankunft vergeben', () => {
  const r = traverse('marmelade', E, new Set());
  assert.equal(r.node, 'tasse');
  assert.ok(r.items.has('DREHWURM'));
});

for (const skill of [false, true]) {
  const label = skill ? 'mit Können (weiche Hindernisse ohne Item)' : 'ohne Tricks';
  test(`Softlock-Analyse ${label}: Ziel von JEDEM erreichbaren Zustand erreichbar`, () => {
    const res = analyze(skill);
    assert.ok(res.goalReachable, 'Ziel nicht erreichbar');
    const sample = res.deadEnds.slice(0, 5).map((d) => `${d.node}/${d.heading}`);
    assert.equal(res.deadEnds.length, 0, 'Sackgassen: ' + sample.join(', '));
  });

  test(`Respawn/Rohrpost erzeugen keine Sackgassen ${label}`, () => {
    const res = analyzeWithRespawn(skill);
    assert.ok(res.states > 0);
    assert.equal(res.deadEnds.length, 0, JSON.stringify(res.deadEnds.slice(0, 3)));
  });
}

test('alle Knoten und alle Items sind ohne Tricks erreichbar (100 %)', () => {
  const res = analyze(false);
  assert.deepEqual([...res.reachableNodes].sort(), Object.keys(NODES).filter((n) => !NODES[n].goal).sort());
  assert.deepEqual([...res.reachableItems].sort(), Object.keys(ITEMS).sort());
});

test('Können eröffnet echte Abkürzungen (Sequence Breaks)', () => {
  // Mit Können kommt man ohne Quietscheentenhaut in die Disco und ohne Lampe in den Keller.
  const res = analyze(true);
  const states = [...res.graph.seen.values()];
  const discoWithoutRubber = states.some((s) => s.node === 'discotuer' && !(s.mask & (1 << Object.keys(ITEMS).indexOf('GUMMIHAUT'))));
  const cellarWithoutLamp = states.some((s) => s.node === 'kellertreppe' && !(s.mask & (1 << Object.keys(ITEMS).indexOf('LAMPE'))));
  assert.ok(discoWithoutRubber);
  assert.ok(cellarWithoutLamp);
});

test('ohne Tricks ist die Reihenfolge durch Hindernisse begrenzt', () => {
  const res = analyze(false);
  const idx = (id) => 1 << Object.keys(ITEMS).indexOf(id);
  for (const s of res.graph.seen.values()) {
    if (s.node === 'discotuer') assert.ok(s.mask & idx('GUMMIHAUT') || s.mask & idx('PILZ'));
  }
});

test('Löser erkennt Sackgassen (Gegenprobe mit künstlichem Zustand)', async () => {
  const { explore, canReachGoal } = await import('../src/game/solver.js');
  // Untertasse, Blick nach Süden, ohne Drehwurm und ohne Lampe: kein Weg weiter.
  const g = explore({ node: 'tasse', heading: S, mask: 0 }, false);
  assert.equal(g.goalReachable, false);
  assert.equal(canReachGoal(g).size, 0);
});

test('Arenen: mehrere Ausgänge pro Seite, mehr als vier insgesamt', () => {
  const st = [0, 1, 2, 3].map((d) => linksAt('stoepsel', d).length);
  assert.ok(st.reduce((x, y) => x + y) > 4, 'Stöpsel hat mehr als 4 Ausgänge');
  assert.equal(linksAt('stoepsel', E).length, 2);
  assert.equal(linksAt('sockenschublade', W).length, 2);
  for (const id of Object.keys(NODES)) {
    for (let d = 0; d < 4; d++) {
      const l = linksAt(id, d);
      for (let i = 1; i < l.length; i++) assert.ok(l[i].pos - l[i - 1].pos >= MIN_EXIT_GAP - 1e-9);
    }
  }
  // Jeder Ausgang führt zur Gegenseite der Zielarena
  for (const e of EDGES) {
    assert.ok(linksAt(e.from, edgeDir(e)).some((l) => l.edge === e && l.forward));
    assert.ok(linksAt(e.to, opposite(edgeDir(e))).some((l) => l.edge === e && !l.forward));
  }
});

test('Löser kennt alle Ausgänge einer Seite', async () => {
  const { successors, maskOf } = await import('../src/game/solver.js');
  const items = new Set(['GUMMIHAUT']);
  const succ = successors({ node: 'sockenschublade', heading: W, mask: maskOf(items) }, false);
  const via = succ.map((s) => s.via).sort();
  assert.deepEqual(via, ['flug:flusensieb', 'flug:ueberlauf']);
});

test('Rückholstationen: nur an Sackgassen, bringen zu einer Arena mit Ausweg', async () => {
  const { successors } = await import('../src/game/solver.js');
  const withRet = Object.entries(NODES).filter(([, n]) => n.ret);
  assert.ok(withRet.length >= 4);
  for (const [id, n] of withRet) {
    assert.ok(NODES[n.ret.to], id + ': Ziel fehlt');
    const exits = [0, 1, 2, 3].reduce((k, d) => k + linksAt(id, d).length, 0);
    assert.equal(exits, 1, id + ' ist keine Sackgasse');
    const s = successors({ node: id, heading: n.autoTurn ?? 0, mask: 0 }, false);
    assert.ok(s.some((x) => x.via === 'rueckhol' && x.node === n.ret.to));
  }
});
