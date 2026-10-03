// Durchsucht alle erreichbaren Spielzustände (Knoten, Blickrichtung, Items) und prüft,
// ob man von jedem davon noch das Spielende erreichen kann. Wird in den Tests genutzt,
// um Sackgassen im Weltdesign auszuschließen.

import { NODES, START_NODE, START_HEADING } from '../data/world.js';
import { ITEM_IDS } from '../data/items.js';
import { traverse, turnOptions, linkAt, directionAllowed, arrive } from './worldgraph.js';
import { opposite } from '../core/math.js';

const BIT = Object.fromEntries(ITEM_IDS.map((id, i) => [id, 1 << i]));

export function maskOf(items) {
  let m = 0;
  for (const it of items) if (BIT[it]) m |= BIT[it];
  return m;
}

export function itemsOf(mask) {
  const s = new Set();
  for (const id of ITEM_IDS) if (mask & BIT[id]) s.add(id);
  return s;
}

const key = (node, heading, mask) => `${node}|${heading}|${mask}`;

/** Alle direkten Nachfolgezustände. "GOAL" markiert das Spielende. */
export function successors(state, skill) {
  const items = itemsOf(state.mask);
  const out = [];
  for (const h of turnOptions(state.node, state.heading, items)) {
    out.push({ node: state.node, heading: h, mask: state.mask, via: 'drehen' });
  }
  const t = traverse(state.node, state.heading, items, skill);
  if (t) {
    if (t.goal) out.push({ goal: true });
    else out.push({ node: t.node, heading: t.heading, mask: maskOf(t.items), via: 'flug:' + t.edge.id });
  }
  // Wendehals mitten im Level: zurück zum Startknoten mit umgekehrter Blickrichtung.
  const link = linkAt(state.node, state.heading);
  if (link && directionAllowed(link) && items.has('WENDEHALS')) {
    const r = arrive(state.node, opposite(state.heading), items);
    out.push({ node: r.node, heading: r.heading, mask: maskOf(r.items), via: 'wendehals' });
  }
  return out;
}

export function explore(start, skill) {
  const seen = new Map();
  const queue = [start];
  seen.set(key(start.node, start.heading, start.mask), start);
  let goalReachable = false;
  const edges = new Map(); // key -> [succKeys]
  while (queue.length) {
    const s = queue.shift();
    const k = key(s.node, s.heading, s.mask);
    const succ = [];
    for (const n of successors(s, skill)) {
      if (n.goal) {
        goalReachable = true;
        succ.push('GOAL');
        continue;
      }
      const nk = key(n.node, n.heading, n.mask);
      succ.push(nk);
      if (!seen.has(nk)) {
        seen.set(nk, n);
        queue.push(n);
      }
    }
    edges.set(k, succ);
  }
  return { seen, edges, goalReachable };
}

/** Menge der Zustände, von denen aus das Ziel erreichbar ist (Rückwärtssuche). */
export function canReachGoal(graph) {
  const rev = new Map();
  for (const [k, succ] of graph.edges) {
    for (const s of succ) {
      if (!rev.has(s)) rev.set(s, []);
      rev.get(s).push(k);
    }
  }
  const good = new Set(['GOAL']);
  const queue = ['GOAL'];
  while (queue.length) {
    const k = queue.shift();
    for (const p of rev.get(k) || []) {
      if (!good.has(p)) {
        good.add(p);
        queue.push(p);
      }
    }
  }
  good.delete('GOAL');
  return good;
}

export function startState() {
  const r = arrive(START_NODE, START_HEADING, new Set());
  return { node: r.node, heading: r.heading, mask: maskOf(r.items) };
}

/**
 * Vollständige Analyse. Liefert u. a. die Sackgassen (erreichbare Zustände ohne Weg zum Ziel)
 * und welche Items/Knoten überhaupt erreichbar sind.
 */
export function analyze(skill = false) {
  const graph = explore(startState(), skill);
  const good = canReachGoal(graph);
  const deadEnds = [];
  const reachableNodes = new Set();
  let allItemsMask = 0;
  for (const [k, s] of graph.seen) {
    reachableNodes.add(s.node);
    allItemsMask |= s.mask;
    if (!good.has(k)) deadEnds.push(s);
  }
  return {
    graph,
    good,
    deadEnds,
    goalReachable: graph.goalReachable,
    reachableNodes,
    reachableItems: itemsOf(allItemsMask),
  };
}

/**
 * Wie analyze(), aber zusätzlich mit Respawn/Rohrpost: Von jedem Zustand aus kann man zu jeder
 * Speicherstation zurück, die man (mit einer Teilmenge der aktuellen Items) schon erreicht hat –
 * und zwar mit beliebiger Blickrichtung, weil jede Station eine Drehscheibe hat.
 */
export function analyzeWithRespawn(skill = false) {
  const base = explore(startState(), skill);
  const saves = Object.keys(NODES).filter((id) => NODES[id].save);
  const reachedWith = new Map(saves.map((s) => [s, []]));
  for (const s of base.seen.values()) if (NODES[s.node].save) reachedWith.get(s.node).push(s.mask);

  const extra = (state) => {
    const out = [];
    for (const save of saves) {
      if (!reachedWith.get(save).some((m) => (m & state.mask) === m)) continue;
      for (let h = 0; h < 4; h++) out.push({ node: save, heading: h, mask: state.mask });
    }
    return out;
  };

  const start = startState();
  const seen = new Map([[key(start.node, start.heading, start.mask), start]]);
  const edges = new Map();
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    const succ = [];
    for (const n of [...successors(s, skill), ...extra(s)]) {
      if (n.goal) {
        succ.push('GOAL');
        continue;
      }
      const nk = key(n.node, n.heading, n.mask);
      succ.push(nk);
      if (!seen.has(nk)) {
        seen.set(nk, n);
        queue.push(n);
      }
    }
    edges.set(key(s.node, s.heading, s.mask), succ);
  }
  const good = canReachGoal({ edges });
  const deadEnds = [...seen.entries()].filter(([k]) => !good.has(k)).map(([, v]) => v);
  return { states: seen.size, deadEnds };
}
