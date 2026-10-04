// Steuert ein komplettes Game-Objekt wie ein Mensch: Menüs, Arenen, Level.
import { successors, maskOf } from '../../src/game/solver.js';
import { linksAt } from '../../src/game/worldgraph.js';
import { SPOTS, insideOf, exitPoint, ARENA_W, ARENA_H } from '../../src/game/arena.js';
import { DIR_VEC, opposite, segPointDist2 } from '../../src/core/math.js';
import { botInput } from './bot.mjs';

export const DT = 1 / 60;

export function press(game, keys = {}) {
  game.update(DT, keys);
}

export function closeDialogs(game, max = 20) {
  for (let i = 0; i < max && game.overlay && game.overlay.type === 'dialog'; i++) press(game, { confirm: true });
}

export function chooseMenu(game, label) {
  const m = game.overlay;
  if (!m || m.type !== 'menu') throw new Error('Kein Menü offen');
  const idx = m.items.findIndex((it) => it.label.startsWith(label));
  if (idx < 0) throw new Error('Menüpunkt fehlt: ' + label + ' in ' + m.items.map((i) => i.label).join(', '));
  while (m.index !== idx) press(game, { down: true });
  press(game, { confirm: true });
}

const key = (s) => `${s.node}|${s.heading}|${s.mask}`;

/**
 * Kürzester Plan vom aktuellen Spielzustand bis zu einem Ziel (Standard: Spielende), ohne
 * Wendehals-Tricks im Level. Liefert die Schritte [{ via, node, heading, ... }].
 * accept(n, s): optional, beendet die Suche bei diesem Nachfolger.
 */
export function plan(game, { skill = false, accept = null } = {}) {
  const start = { node: game.node, heading: game.heading, mask: maskOf(game.items) };
  const prev = new Map([[key(start), null]]);
  const queue = [start];
  const build = (s, last) => {
    const steps = last ? [last] : [];
    let k = key(s);
    while (prev.get(k)) {
      const p = prev.get(k);
      steps.unshift(p.step);
      k = key(p.from);
    }
    return steps;
  };
  while (queue.length) {
    const s = queue.shift();
    for (const n of successors(s, skill)) {
      if (n.via === 'wendehals') continue;
      if (n.goal) {
        if (!accept) return build(s, { ...n, node: s.node, heading: s.heading });
        continue;
      }
      const k = key(n);
      if (prev.has(k)) continue;
      prev.set(k, { from: s, step: n });
      if (accept && accept(n, s)) return build(n, null);
      queue.push(n);
    }
  }
  return null;
}

export const planToGoal = (game, skill = false) => plan(game, { skill });

/** Eingabe, die das Schiff in der Arena zum Punkt (tx, ty) fliegt. */
function steer(ar, tx, ty) {
  const dx = tx - ar.x;
  const dy = ty - ar.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return { mx: 0, my: 0 };
  const k = Math.min(1, d / 6);
  return { mx: (dx / d) * k, my: (dy / d) * k };
}

/** Weg zu (tx, ty), der die Drehscheibe nicht versehentlich berührt. */
function route(ar, tx, ty) {
  if (ar.def.turntable) {
    const s = SPOTS.turntable;
    if (segPointDist2(ar.x, ar.y, tx, ty, s.x, s.y) < 26 * 26 && Math.hypot(ar.x - ARENA_W / 2, ar.y - ARENA_H / 2) > 8) {
      return steer(ar, ARENA_W / 2, ARENA_H / 2);
    }
  }
  return steer(ar, tx, ty);
}

function requireArena(game) {
  closeDialogs(game);
  if (game.screen !== 'arena' || !game.arena) throw new Error('nicht in einer Arena (' + game.screen + ')');
  return game.arena;
}

/** Dreht in der Arena auf Blickrichtung h – mit Drehwurm, Wendehals oder über die Drehscheibe. */
export function turnTo(game, h) {
  for (let i = 0; i < 60 * 30; i++) {
    const ar = requireArena(game);
    if (game.heading === h) return;
    if (game.items.has('WENDEHALS') && h === opposite(game.heading)) {
      press(game, i % 2 ? {} : { wende: true });
    } else if (game.items.has('DREHWURM')) {
      press(game, i % 2 ? {} : { power: true });
    } else if (ar.def.turntable) {
      // Rechts herum (von links her waagerecht durch den Ring) oder links herum (von rechts her)
      const s = SPOTS.turntable;
      const cw = ((h - game.heading) & 3) !== 3;
      const side = cw ? -1 : 1;
      const from = [s.x + side * 50, s.y - 8];
      const to = [s.x - side * 50, s.y - 8];
      if (ar._ringPhase === undefined) ar._ringPhase = 0;
      if (ar._ringPhase === 0) {
        press(game, route(ar, from[0], from[1]));
        if (ar.ringArmed && Math.hypot(ar.x - from[0], ar.y - from[1]) < 2) ar._ringPhase = 1;
      } else {
        press(game, steer(ar, to[0], to[1]));
        if (Math.hypot(ar.x - to[0], ar.y - to[1]) < 2) ar._ringPhase = 0;
      }
    } else throw new Error(`Drehen nach ${h} an ${game.node} nicht möglich`);
  }
  throw new Error('Drehen dauert zu lange an ' + game.node);
}

/** Fliegt in der Arena durch den Ausgang der Etappe edgeId hinaus (Blickrichtung muss passen). */
export function flyOut(game, edgeId) {
  const ar = requireArena(game);
  const link = linksAt(game.node, game.heading).find((l) => l.edge.id === edgeId);
  if (!link) throw new Error(`Ausgang ${edgeId} nicht in Blickrichtung an ${game.node}`);
  const [ax, ay] = insideOf(game.heading, link.pos, 30);
  const [ex, ey] = exitPoint(game.heading, link.pos);
  const [dx, dy] = DIR_VEC[game.heading];
  let lined = false;
  for (let i = 0; i < 60 * 20 && game.screen === 'arena'; i++) {
    if (!lined && Math.hypot(ar.x - ax, ar.y - ay) < 3) lined = true;
    // Gesperrter Ausgang (gerade hereingekommen): wie ein Mensch kurz loslassen
    if (ar.lockedExit) press(game, {});
    else press(game, lined ? steer(ar, ex + dx * 60, ey + dy * 60) : route(ar, ax, ay));
    if (game.overlay) throw new Error('Unerwartetes Overlay in der Arena');
  }
  if (game.screen !== 'level') throw new Error('Abflug durch ' + edgeId + ' fehlgeschlagen');
}

/** Fliegt zur Rückholstation und benutzt sie. */
export function useReturn(game) {
  const ar = requireArena(game);
  const s = SPOTS.ret;
  for (let i = 0; i < 60 * 20 && game.arena === ar; i++) {
    press(game, ar.near('ret', 0) ? { station: true } : route(ar, s.x, s.y));
  }
  if (game.arena === ar) throw new Error('Rückholstation nicht erreicht');
}

/** Führt einen Planschritt aus. Bei Flügen wird das Level danach mit Autopilot geflogen. */
export function doStep(game, step) {
  if (step.via === 'drehen') return turnTo(game, step.heading);
  if (step.via === 'rueckhol') return useReturn(game);
  if (step.via.startsWith('flug:')) {
    flyOut(game, step.via.slice(5));
    flyLevel(game);
    return;
  }
  throw new Error('Unbekannter Schritt ' + step.via);
}

/** Fliegt das aktuelle Level mit Autopilot zu Ende. */
export function flyLevel(game, maxSeconds = 400) {
  let t = 0;
  while (game.screen === 'level' && t < maxSeconds) {
    if (game.overlay) throw new Error('Unerwartetes Overlay im Level');
    const inp = botInput(game.level);
    press(game, { ...inp, fire: true });
    t += DT;
  }
  if (game.screen === 'level') throw new Error('Level nicht beendet: ' + game.level.edge.id);
}

/** Dreht in Richtung heading und fliegt durch den ersten befliegbaren Ausgang dort hinaus. */
export function turnAndLaunch(game, heading, edgeId = null) {
  turnTo(game, heading);
  const link = edgeId ? { edge: { id: edgeId } } : linksAt(game.node, heading).find((l) => l.forward || !l.edge.oneWay);
  if (!link) throw new Error('kein Ausgang nach ' + heading + ' an ' + game.node);
  flyOut(game, link.edge.id);
}
