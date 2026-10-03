// Erzeugt den Inhalt eines Levels deterministisch aus der Kantenbeschreibung der Weltkarte.
// Alle Positionen gelten für den Vorwärtsflug (from -> to); beim Rückwärtsflug wird gespiegelt.

import { Rng } from '../core/rng.js';
import { THEMES } from '../data/themes.js';
import { FORMATION_KINDS } from './enemies.js';

export const CROSS = 540; // Periode der Querachse (die Welt "wiederholt" sich quer zur Flugrichtung)
export const ROCK_THICK = 26;
export const NARROW_THICK = 34;
export const NARROW_GAP = 11;
export const SPIKE_GAP = 70;
export const SPIKE_SPACING = 120;
export const START_CLEAR = 380;

/** Hindernisse als Weltobjekte mit absoluten Positionen (vorwärts). */
export function buildGates(edge, rng) {
  const out = [];
  for (const g of edge.gates || []) {
    const a0 = Math.round(g.at * edge.length);
    if (g.type === 'rock') {
      const n = 20;
      const h = CROSS / n;
      const blocks = [];
      for (let i = 0; i < n; i++) blocks.push({ c0: i * h, c1: (i + 1) * h, hp: 3 });
      out.push({ type: 'rock', a0, a1: a0 + ROCK_THICK, blocks });
    } else if (g.type === 'narrow') {
      out.push({ type: 'narrow', a0, a1: a0 + NARROW_THICK, gapC: Math.round(rng.range(0, CROSS)), gapW: NARROW_GAP });
    } else if (g.type === 'spikes') {
      const cols = [];
      let base = rng.range(0, CROSS);
      for (let a = a0 + 30; a < a0 + g.len - 10; a += SPIKE_SPACING) {
        cols.push({ a, base, phase: rng.range(0, Math.PI * 2), amp: rng.range(30, 70), speed: rng.range(0.5, 0.9) });
        base += rng.range(-90, 90);
      }
      out.push({ type: 'spikes', a0, a1: a0 + g.len, cols, gap: SPIKE_GAP });
    } else if (g.type === 'dark') {
      out.push({ type: 'dark', a0, a1: a0 + g.len });
    }
  }
  return out;
}

function solidZones(gates) {
  return gates.filter((g) => g.type === 'rock' || g.type === 'narrow').map((g) => [g.a0 - 260, g.a1 + 60]);
}

/**
 * Gegnerwellen. "at" ist die Position der Vorderkante des Sichtfelds, an der die Welle erscheint.
 * cf = Anteil der Querachse im Sichtfeld (0..1), wird beim Erscheinen in absolute Werte umgerechnet.
 */
export function buildEvents(edge, rng, gates, withHints = true) {
  const theme = THEMES[edge.theme];
  const diff = edge.difficulty || 1;
  const pool = edge.tutorial ? ['toast', 'brezel', 'toast', 'ei'] : theme.pool;
  const events = [];
  const blocked = solidZones(gates);
  const spikeZones = gates.filter((g) => g.type === 'spikes').map((g) => [g.a0 - 100, g.a1]);
  const end = edge.length - (edge.boss ? 520 : 200);
  let a = START_CLEAR + 100;
  let waveId = 0;
  const baseGap = edge.tutorial ? 300 : 236 - diff * 24;
  while (a < end) {
    const inBlocked = blocked.some(([x0, x1]) => a > x0 && a < x1);
    const inSpikes = spikeZones.some(([x0, x1]) => a > x0 && a < x1);
    if (!inBlocked && (!inSpikes || rng.chance(0.35))) {
      let kind = rng.pick(pool);
      if (kind === 'zahnrad' && rng.chance(0.5)) kind = 'wecker';
      const formation = FORMATION_KINDS.has(kind);
      const count = formation ? rng.int(4, 5 + Math.min(diff, 2)) : kind === 'zahnrad' ? 1 : rng.int(1, diff >= 3 ? 3 : 2);
      events.push({
        at: a,
        type: 'wave',
        kind,
        count,
        wave: waveId++,
        cf: rng.range(0.2, 0.8),
        spread: formation ? 0 : rng.range(0.15, 0.3),
        spacing: formation ? 26 : 40,
      });
    }
    a += baseGap + rng.range(-40, 70);
  }
  if (edge.tutorial && withHints) {
    events.push({ at: 300, type: 'hint', text: 'hint_move' });
    events.push({ at: 700, type: 'hint', text: 'hint_fire' });
    events.push({ at: 1150, type: 'hint', text: 'hint_power' });
  }
  return events.sort((x, y) => x.at - y.at);
}

export function mirrorGates(gates, length) {
  return gates.map((g) => mirrorGate(g, length)).sort((x, y) => x.a0 - y.a0);
}

export function mirrorGate(g, length) {
  const m = { ...g, a0: length - g.a1, a1: length - g.a0 };
  if (g.cols) m.cols = g.cols.map((c) => ({ ...c, a: length - c.a })).sort((x, y) => x.a - y.a);
  if (g.blocks) m.blocks = g.blocks; // Blöcke teilen ihren Zustand (zerstört bleibt zerstört)
  return m;
}

/**
 * Komplettes Level für eine Flugrichtung. Rückwärts werden die Hindernisse gespiegelt und
 * die Gegnerwellen passend dazu neu verteilt (deterministisch).
 */
export function generateLevel(edge, forward = true) {
  const base = buildGates(edge, new Rng('gates:' + edge.id));
  const gates = forward ? base : mirrorGates(base, edge.length);
  const events = buildEvents(edge, new Rng('level:' + edge.id + (forward ? '' : ':rev')), gates, forward);
  return { gates, events };
}
