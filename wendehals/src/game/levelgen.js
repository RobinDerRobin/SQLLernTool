// Erzeugt den Inhalt eines Levels deterministisch aus der Kantenbeschreibung der Weltkarte.
// Alle Positionen gelten für den Vorwärtsflug (from -> to); beim Rückwärtsflug wird gespiegelt.

import { Rng } from '../core/rng.js';
import { THEMES } from '../data/themes.js';
import { FORMATION_KINDS } from './enemies.js';
import { LEVELS, PIECES } from '../data/levels.js';
import { TileMap, TILE, T, findPath } from './terrain.js';
import { buildDynamics, corridorAt, mirrorDyn } from './dynamics.js';

export const ROCK_THICK = 26;
export const NARROW_THICK = 34;
export const NARROW_GAP = 11;
export const SPIKE_GAP = 76; // Stacheln sind tödlich: Lücke großzügig, Bewegung gemächlich
export const SPIKE_SPACING = 120;
export const START_CLEAR = 380;

/** Hindernisse als Weltobjekte mit absoluten Positionen (vorwärts). */
export function buildGates(edge, rng, H, L = edge.length) {
  const out = [];
  for (const g of edge.gates || []) {
    const a0 = Math.round(g.at * L);
    if (g.type === 'rock') {
      const n = Math.round(H / 27);
      const h = H / n;
      const blocks = [];
      for (let i = 0; i < n; i++) blocks.push({ c0: i * h, c1: (i + 1) * h, hp: 3 });
      out.push({ type: 'rock', a0, a1: a0 + ROCK_THICK, blocks });
    } else if (g.type === 'narrow') {
      out.push({ type: 'narrow', a0, a1: a0 + NARROW_THICK, gapC: Math.round(rng.range(0, H)), gapW: NARROW_GAP });
    } else if (g.type === 'spikes') {
      const cols = [];
      let base = rng.range(0, H);
      for (let a = a0 + 30; a < a0 + g.len - 10; a += SPIKE_SPACING) {
        cols.push({ a, base, phase: rng.range(0, Math.PI * 2), amp: rng.range(20, 50), speed: rng.range(0.4, 0.75) });
        base += rng.range(-80, 80);
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
export function buildEvents(edge, rng, gates, withHints = true, L = edge.length) {
  const theme = THEMES[edge.theme];
  const diff = edge.difficulty || 1;
  const pool = edge.tutorial ? ['toast', 'brezel', 'toast', 'ei'] : theme.pool;
  const events = [];
  const blocked = solidZones(gates);
  const spikeZones = gates.filter((g) => g.type === 'spikes').map((g) => [g.a0 - 100, g.a1]);
  const end = L - (edge.boss ? 520 : 200);
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

export const BOSS_CLEAR = 620; // Arena am Ende bleibt frei von Set-Pieces

/** Bereiche, in denen keine Set-Pieces stehen dürfen (Start, Hindernisse, Arena). */
function keepClear(gates, L, edge) {
  const z = [[0, START_CLEAR + 80]];
  // Dunkelzonen dürfen Terrain haben (gruselig!), feste Hindernisse und Stacheln brauchen Platz
  for (const g of gates) if (g.type !== 'dark') z.push([g.a0 - 64, g.a1 + 64]);
  z.push([L - (edge.boss ? BOSS_CLEAR : 220), L]);
  return z;
}

/**
 * Baut das Kachel-Terrain einer Etappe (vorwärts): Boden/Decke als Zufallsprofil, dazu
 * Set-Pieces. Jedes Set-Piece wird nur behalten, wenn die Etappe danach noch durchfliegbar ist.
 */
export function buildTerrain(edge, H, L, gates, rng) {
  const spec = LEVELS[edge.id] || { wrap: true, density: 0, pieces: [] };
  const cols = Math.round(L / TILE);
  const rows = Math.round(H / TILE);
  const map = new TileMap(cols, rows, !!spec.wrap);
  const clear = keepClear(gates, L, edge);
  const inClear = (a0, a1) => clear.some(([x0, x1]) => a1 > x0 && a0 < x1);
  // Wanddicken sind für 34 Zeilen angegeben; schmalere/breitere Etappen werden umgerechnet
  const scale = rows / 34;
  const floorAt = new Int16Array(cols);
  const ceilAt = new Int16Array(cols);
  if (!spec.wrap) {
    const walk = (range) => {
      const lo = Math.round(range[0] * scale);
      const hi = Math.max(lo, Math.round(range[1] * scale));
      const arr = new Int16Array(cols);
      let v = rng.int(lo, hi);
      for (let ix = 0; ix < cols; ix++) {
        if (ix % 5 === 0) v = Math.max(lo, Math.min(hi, v + rng.int(-1, 1)));
        arr[ix] = v;
      }
      return arr;
    };
    floorAt.set(walk(spec.floor));
    ceilAt.set(walk(spec.ceil));
    // In der Boss-Arena und am Start flach und dünn
    for (let ix = 0; ix < cols; ix++) {
      const a = ix * TILE;
      if (a < START_CLEAR || (edge.boss && a > L - BOSS_CLEAR)) {
        floorAt[ix] = Math.min(floorAt[ix], Math.round(spec.floor[0] * scale));
        ceilAt[ix] = Math.min(ceilAt[ix], Math.round(spec.ceil[0] * scale));
      }
      for (let iy = 0; iy < ceilAt[ix]; iy++) map.set(ix, iy, T.SOLID);
      for (let iy = rows - floorAt[ix]; iy < rows; iy++) map.set(ix, iy, T.SOLID);
    }
  }
  // Set-Pieces
  const pieces = spec.pieces || [];
  const count = Math.round(((L - START_CLEAR) / 1000) * (spec.density || 0) * 2.5);
  const placed = [];
  const okPath = () => findPath(map, { size: 2, drill: false, rubber: false }) !== null;
  for (let i = 0; i < count && pieces.length; i++) {
    const name = pieces[i % pieces.length];
    const pc = PIECES[name];
    if (!pc) throw new Error('Unbekanntes Set-Piece ' + name);
    const w = pc.rows[0].length;
    const h = pc.rows.length;
    const a = START_CLEAR + 120 + ((i + rng.range(0.1, 0.9)) / count) * (L - START_CLEAR - 400);
    const ix0 = Math.floor(a / TILE);
    if (inClear(ix0 * TILE - 32, (ix0 + w) * TILE + 32)) continue;
    let iy0;
    if (spec.wrap) iy0 = rng.int(0, rows - 1);
    else if (pc.anchor === 'floor') iy0 = rows - Math.max(...Array.from({ length: w }, (_, k) => floorAt[ix0 + k] || 0)) - h;
    else if (pc.anchor === 'ceil') iy0 = Math.max(...Array.from({ length: w }, (_, k) => ceilAt[ix0 + k] || 0));
    else iy0 = Math.round(rows / 2 - h / 2 + rng.range(-rows * 0.2, rows * 0.2));
    // Probehalber setzen; wenn danach kein Weg mehr existiert, zurücknehmen
    const backup = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) backup.push(map.cell(ix0 + dx, iy0 + dy));
    map.stamp(pc.rows, ix0, iy0);
    if (!okPath()) {
      let k = 0;
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) map.set(ix0 + dx, iy0 + dy, backup[k++]);
    } else placed.push({ name, ix: ix0, iy: iy0 });
  }
  map.version = 0;
  return { map, spec, placed, floorAt, ceilAt };
}

/** Hindernisse an den Korridor anpassen: Spaltenlücken und Stachel-Lücken müssen erreichbar sein. */
function fitGatesToTerrain(gates, map) {
  if (map.wrap) return;
  for (const g of gates) {
    if (g.type === 'narrow') {
      const [lo, hi] = corridorAt(map, Math.floor(g.a0 / TILE) - 2);
      g.gapC = Math.round((lo + hi) / 2);
    } else if (g.type === 'spikes') {
      for (const col of g.cols) {
        const [lo, hi] = corridorAt(map, Math.floor(col.a / TILE));
        const half = (hi - lo) / 2;
        col.amp = Math.max(0, Math.min(col.amp, half - g.gap / 2 - 12));
        const min = lo + g.gap / 2 + col.amp + 10;
        const max = hi - g.gap / 2 - col.amp - 10;
        col.base = min <= max ? Math.max(min, Math.min(max, col.base)) : (lo + hi) / 2;
      }
    }
  }
}

/**
 * Komplettes Level für eine Flugrichtung. Rückwärts wird alles (Terrain, Hindernisse,
 * bewegliche Teile) gespiegelt; die Gegnerwellen werden passend neu verteilt.
 */
/** Nur die Ereignisse (Wellen, Hinweise) einer Richtung – ohne Terrain, für die Kehrtwende. */
export function generateEvents(edge, forward = true, H = 544, L = edge.length) {
  const gatesFwd = buildGates(edge, new Rng('gates:' + edge.id), H, L);
  const gates = forward ? gatesFwd : mirrorGates(gatesFwd, L);
  return buildEvents(edge, new Rng('level:' + edge.id + (forward ? '' : ':rev')), gates, forward, L);
}

export function generateLevel(edge, forward = true, H = 544, L = edge.length) {
  const gatesFwd = buildGates(edge, new Rng('gates:' + edge.id), H, L);
  const terrain = buildTerrain(edge, H, L, gatesFwd, new Rng('terrain:' + edge.id));
  fitGatesToTerrain(gatesFwd, terrain.map);
  const dynFwd = buildDynamics(terrain.spec, terrain.map, L, H, edge.id, keepClear(gatesFwd, L, edge));
  const gates = forward ? gatesFwd : mirrorGates(gatesFwd, L);
  const map = forward ? terrain.map : terrain.map.mirroredA();
  const dyn = forward ? dynFwd : dynFwd.map((o) => mirrorDyn(o, L, H, false));
  const events = buildEvents(edge, new Rng('level:' + edge.id + (forward ? '' : ':rev')), gates, forward, L);
  return { gates, events, map, dyn, placed: terrain.placed };
}
