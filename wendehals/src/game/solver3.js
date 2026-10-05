// Löser für die v0.3-Welt: durchsucht alle erreichbaren Zustände (Punkt, Blick 0–7, Items, Flags)
// mit den Regeln aus worldgraph3.js und prüft die Invarianten aus docs/WELT-DESIGN.md Kap. 7:
// Ziel erreichbar (I1), keine Sackgasse ohne/mit Respawn (I2/I3), 100 % (I4), Pflichtreihenfolge
// (I5), Geometrie und Hindernistypen (I6–I8, über validateWorld3).
// Port von tools/pruefe-welt.mjs; tests/world3-reference.tests.mjs prüft, dass beide gleich zählen.

import { HEADING_CODES } from '../core/math.js';
import { compileWorld3, successors, hasItem, itemsOf, validateWorld3 } from './worldgraph3.js';

const RESPAWN = '#respawn';
export const GOAL = -1;

/** Zahl-Schlüssel eines Zustands: ((m · Flags + f) · 8 + h) · Punkte + p. */
function codec(world) {
  if (world._codec) return world._codec;
  const pids = [...Object.keys(world.points), RESPAWN];
  const pidx = Object.fromEntries(pids.map((p, i) => [p, i]));
  const PN = pids.length;
  const FN = 2 * Math.max(...Object.values(world.flag));
  const enc = (p, h, f, m) => ((m * FN + f) * 8 + h) * PN + pidx[p];
  const dec = (k) => ({ p: pids[k % PN], h: Math.floor(k / PN) % 8, f: Math.floor(k / (PN * 8)) % FN, m: Math.floor(k / (PN * 8 * FN)) });
  world._codec = { enc, dec };
  return world._codec;
}

/**
 * Breitensuche ab dem Start. Optionen:
 * - skill: weiche Hindernisse und weiche Stationen gelten als lösbar ("Können")
 * - allowed: Set erlaubter Items (Phasentest); null = alle
 * - respawn: Notnetz – von jedem Zustand zu jeder Speicherstation, die der Lauf ohne Respawn mit
 *   einer Teilmenge der Items erreicht hat (Blick frei in der Klasse, mit Wasserwaage alle 8)
 * - base: schon berechneter Lauf ohne Respawn mit denselben Optionen (spart die Wiederholung)
 * Liefert { seen: Set<key>, edges: Map<key, key[]>, goal, touched: Set<itemId> }.
 */
export function explore(world, { skill = false, allowed = null, respawn = false, base = null } = {}) {
  const { enc, dec } = codec(world);
  const touched = new Set();
  const startItem = world.node[world.start.p].item;
  if (startItem) touched.add(startItem);
  const saves = world.data.nodes.filter((n) => n.save).map((n) => n.id);
  const reachedWith = new Map(saves.map((s) => [s, new Set()]));
  if (respawn) {
    for (const k of (base || explore(world, { skill, allowed })).seen) {
      const st = dec(k);
      if (reachedWith.has(st.p)) reachedWith.get(st.p).add(st.m);
    }
  }
  const s0 = world.start;
  const k0 = enc(s0.p, s0.h, s0.f, s0.m);
  const seen = new Set([k0]);
  const edges = new Map();
  const queue = [k0];
  let goal = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi];
    const st = dec(k);
    const succ = [];
    const push = (nk) => {
      succ.push(nk);
      if (!seen.has(nk)) {
        seen.add(nk);
        queue.push(nk);
      }
    };
    if (st.p === RESPAWN) {
      for (const sv of saves) {
        if (![...reachedWith.get(sv)].some((mm) => (mm & st.m) === mm)) continue;
        for (let h = 0; h < 8; h++) if (h % 2 === 0 || hasItem(world, st.m, 'WASSERWAAGE')) push(enc(sv, h, st.f, st.m));
      }
      edges.set(k, succ);
      continue;
    }
    for (const n of successors(world, st, skill, { allowed, touched })) {
      if (n.goal) {
        goal = true;
        succ.push(GOAL);
        continue;
      }
      push(enc(n.p, n.h, n.f, n.m));
    }
    if (respawn) push(enc(RESPAWN, 0, st.f, st.m));
    edges.set(k, succ);
  }
  return { seen, edges, goal, touched };
}

/** Erreichbare Zustände, von denen aus das Ziel nicht mehr erreichbar ist (Rückwärtssuche). */
export function deadEnds(world, g) {
  const { dec } = codec(world);
  const rev = new Map();
  for (const [k, succ] of g.edges) {
    for (const s of succ) {
      let l = rev.get(s);
      if (!l) rev.set(s, (l = []));
      l.push(k);
    }
  }
  const good = new Set([GOAL]);
  const q = [GOAL];
  for (let i = 0; i < q.length; i++) {
    for (const p of rev.get(q[i]) || []) {
      if (good.has(p)) continue;
      good.add(p);
      q.push(p);
    }
  }
  return [...g.seen].filter((k) => !good.has(k)).map(dec).filter((s) => s.p !== RESPAWN);
}

/** Punkte (Arenen und Weichenräume), die in einem Suchlauf vorkommen. */
export function pointsSeen(world, g) {
  const { dec } = codec(world);
  return new Set([...g.seen].map((k) => dec(k).p));
}

/**
 * Pflichtreihenfolge (I5): Zeile k = was mit den Pflicht-Items vor Phase k plus allem Optionalen
 * erreichbar ist. Spalten wie in tools/pruefe-welt.mjs.
 */
export function phaseRow(world, k) {
  const order = world.data.intendedOrder;
  const optional = world.data.abilities.filter((a) => !a.required).map((a) => a.id);
  const allowed = new Set([...optional, ...order.slice(0, k)]);
  const g0 = explore(world, { skill: false, allowed });
  const g1 = explore(world, { skill: true, allowed });
  const next0 = order.slice(k).filter((id) => g0.touched.has(id));
  const next1 = order.slice(k).filter((id) => g1.touched.has(id) && !g0.touched.has(id));
  const arenas = new Set([...pointsSeen(world, g0)].filter((p) => world.points[p]?.arena));
  const optItems =
    world.data.nodes.filter((n) => n.item && arenas.has(n.id) && !order.includes(n.item)).length +
    world.data.edges.filter((e) => e.reward && !order.includes(e.reward) && e.reward !== 'GOAL' && arenas.has(e.to)).length;
  return { k, allowedUpTo: order[k - 1] || 'Start', next0, next1, goal0: g0.goal, arenas: arenas.size, optItems };
}

export const phaseTable = (world) => world.data.intendedOrder.map((_, i) => i).concat(world.data.intendedOrder.length).map((k) => phaseRow(world, k));

const fmtState = (world, s) => `${s.p} Blick ${HEADING_CODES[s.h]} Items [${itemsOf(world, s.m).join(',')}] Flags ${s.f}`;

/**
 * Alle Invarianten auf einmal. Liefert { problems, warnings, runs, complete, phases }.
 * opts.respawn / opts.phases / opts.skill schalten teure Teile ab (Mutationstests).
 */
export function checkWorld3(data, { respawn = true, phases = true, skill = [false, true] } = {}) {
  const { problems, warnings } = validateWorld3(data);
  if (problems.some((p) => p.startsWith('Übersetzen'))) return { problems, warnings, runs: [], complete: null, phases: [] };
  const world = compileWorld3(data);
  const runs = [];
  let complete = null;
  for (const sk of skill) {
    let base = null;
    for (const rs of respawn ? [false, true] : [false]) {
      const g = explore(world, { skill: sk, respawn: rs, base });
      if (!rs) base = g;
      const de = deadEnds(world, g);
      runs.push({ skill: sk, respawn: rs, states: g.seen.size, goal: g.goal, deadEnds: de.length, examples: de.slice(0, 6).map((s) => fmtState(world, s)) });
      const tag = `${sk ? 'mit' : 'ohne'} Können${rs ? ', Respawn' : ''}`;
      if (!g.goal) problems.push(`I1: Ziel nicht erreichbar (${tag})`);
      if (de.length) problems.push(`I${rs ? 3 : 2}: ${de.length} Sackgassen-Zustände (${tag}), z. B. ${fmtState(world, de[0])}`);
      if (!sk && !rs) {
        // I4 genau: jede Arena betreten, jedes Fundstück wirklich aufgenommen (nicht nur platziert)
        const reached = pointsSeen(world, g);
        const all = [...data.abilities.map((a) => a.id), ...data.expansions.map((x) => x.id)];
        const missingArenas = data.nodes.filter((n) => !n.goal && !reached.has(n.id)).map((n) => n.id);
        const missingFinds = all.filter((id) => !g.touched.has(id));
        for (const id of missingArenas) problems.push('I4: Arena nicht erreichbar: ' + id);
        for (const id of missingFinds) problems.push('I4: Fundstück nicht erreichbar: ' + id);
        complete = { finds: all.length - missingFinds.length, of: all.length, arenas: data.nodes.length - missingArenas.length, arenaCount: data.nodes.length };
      }
    }
  }
  const table = phases ? phaseTable(world) : [];
  for (const row of table) {
    const want = data.intendedOrder[row.k];
    if (want && !row.next0.includes(want)) problems.push(`I5: ${want} in Phase ${row.k} nicht erreichbar`);
  }
  return { problems, warnings, runs, complete, phases: table };
}
