// Reine Logik der Weltkarte: wer darf wohin fliegen, wie wird gedreht, was passiert bei Ankunft.
// Diese Funktionen werden vom Spiel UND vom Softlock-Löser in den Tests verwendet,
// damit beide garantiert dieselben Regeln haben.

import { NODES, EDGES } from '../data/world.js';
import { GATES } from '../data/items.js';
import { dirBetween, opposite, turnCW } from '../core/math.js';

export function edgeDir(edge) {
  if (edge.dir !== undefined) return edge.dir;
  const a = NODES[edge.from];
  const b = NODES[edge.to];
  return dirBetween(a.x, a.y, b.x, b.y);
}

/** Mindestabstand zweier Ausgänge an derselben Seite (Anteil der Seitenlänge). */
export const MIN_EXIT_GAP = 0.25;

// nodeId -> [dir] -> [{ edge, forward, pos }] (nach pos sortiert)
const LINKS = buildLinks();

function buildLinks() {
  const links = {};
  for (const id of Object.keys(NODES)) links[id] = [[], [], [], []];
  for (const edge of EDGES) {
    const d = edgeDir(edge);
    if (d < 0) throw new Error(`Kante ${edge.id} hat keine Richtung`);
    links[edge.from][d].push({ edge, forward: true, pos: edge.fromPos ?? 0.5 });
    links[edge.to][opposite(d)].push({ edge, forward: false, pos: edge.toPos ?? 0.5 });
  }
  for (const [id, sides] of Object.entries(links)) {
    sides.forEach((list, d) => {
      list.sort((x, y) => x.pos - y.pos);
      for (let i = 1; i < list.length; i++) {
        if (list[i].pos - list[i - 1].pos < MIN_EXIT_GAP - 1e-9) throw new Error(`Knoten ${id}: Ausgänge nach ${d} liegen zu dicht`);
      }
    });
  }
  return links;
}

/** Alle Ausgänge eines Knotens an einer Seite. */
export function linksAt(nodeId, dir) {
  return LINKS[nodeId][dir];
}

/** Erster Ausgang an einer Seite (bzw. null). */
export function linkAt(nodeId, dir) {
  return LINKS[nodeId][dir][0] || null;
}

/** Darf man die Kante in dieser Richtung überhaupt befliegen (Einbahnstraßen)? */
export function directionAllowed(link) {
  return link.forward || !link.edge.oneWay;
}

/** Hindernisse in Flugrichtung (Positionen bei Rückwärtsflug gespiegelt). */
export function gatesFor(edge, forward) {
  const gates = edge.gates || [];
  if (forward) return gates.map((g) => ({ ...g }));
  return gates
    .map((g) => ({ ...g, at: 1 - g.at - (g.len || 0) / edge.length }))
    .sort((x, y) => x.at - y.at);
}

/** Items, die zum Durchfliegen nötig sind. skill=true: weiche Hindernisse zählen nicht. */
export function requiredItems(edge, skill = false) {
  const req = new Set();
  for (const gate of edge.gates || []) {
    const info = GATES[gate.type];
    if (!info) throw new Error('Unbekanntes Hindernis ' + gate.type);
    if (info.soft && skill) continue;
    req.add(info.item);
  }
  return req;
}

export function canPassEdge(edge, items, skill = false) {
  for (const it of requiredItems(edge, skill)) if (!items.has(it)) return false;
  return true;
}

export function canTurnAt(nodeId, items) {
  return !!NODES[nodeId].turntable || items.has('DREHWURM');
}

/**
 * Ergebnis der Ankunft an einem Knoten: neue Blickrichtung und aufgesammelte Items.
 * Gibt eine neue Item-Menge zurück (die alte bleibt unverändert).
 */
export function arrive(nodeId, heading, items, rewards = []) {
  const node = NODES[nodeId];
  const next = new Set(items);
  for (const r of rewards) if (r && r !== 'GOAL') next.add(r);
  if (node.item) next.add(node.item);
  const h = node.autoTurn !== undefined ? node.autoTurn : heading;
  return { node: nodeId, heading: h, items: next };
}

/**
 * Was passiert, wenn man an "nodeId" in Richtung "heading" abfliegt und das Level schafft.
 * link: welcher Ausgang (Standard: der erste an dieser Seite).
 */
export function traverse(nodeId, heading, items, skill = false, link = linkAt(nodeId, heading)) {
  if (!link || !directionAllowed(link)) return null;
  if (!canPassEdge(link.edge, items, skill)) return null;
  const target = link.forward ? link.edge.to : link.edge.from;
  // Der Boss wartet immer am "to"-Ende: Belohnung gibt es nur beim Vorwärtsflug.
  const rewards = link.forward && link.edge.reward ? [link.edge.reward] : [];
  const result = arrive(target, heading, items, rewards);
  result.goal = link.forward && link.edge.reward === 'GOAL';
  result.edge = link.edge;
  return result;
}

/** Rückholstation: wohin sie bringt (oder null). */
export function returnTarget(nodeId, items) {
  const ret = NODES[nodeId].ret;
  if (!ret) return null;
  return arrive(ret.to, ret.heading, items);
}

/** Mögliche Drehungen an einem Knoten (für Löser und Karten-UI). */
export function turnOptions(nodeId, heading, items) {
  const out = [];
  if (canTurnAt(nodeId, items)) out.push(turnCW(heading));
  if (items.has('WENDEHALS')) out.push(opposite(heading));
  return out;
}

export { LINKS };
