// Steuert ein komplettes Game-Objekt wie ein Mensch: Menüs, Karte, Level.
import { successors, maskOf } from '../../src/game/solver.js';
import { botInput } from './bot.mjs';

export const DT = 1 / 60;
const DIR_KEY = ['right', 'down', 'left', 'up'];

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

/** Kürzester Plan (Liste von Zuständen) vom aktuellen Spielzustand zum Ziel – ohne Wendehals-Tricks. */
export function planToGoal(game, skill = false) {
  const start = { node: game.node, heading: game.heading, mask: maskOf(game.items) };
  const key = (s) => `${s.node}|${s.heading}|${s.mask}`;
  const prev = new Map([[key(start), null]]);
  const queue = [start];
  while (queue.length) {
    const s = queue.shift();
    for (const n of successors(s, skill)) {
      if (n.via === 'wendehals') continue;
      if (n.goal) {
        const path = [{ ...s, launch: true }];
        let k = key(s);
        while (prev.get(k)) {
          const p = prev.get(k);
          path.unshift(p.state);
          k = key(p.state);
        }
        return path;
      }
      const k = key(n);
      if (!prev.has(k)) {
        prev.set(k, { state: s });
        queue.push(n);
      }
    }
  }
  return null;
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

/** Bringt das Spiel per Tastendruck in die gewünschte Blickrichtung und fliegt los. */
export function turnAndLaunch(game, heading) {
  if (game.heading !== heading) press(game, { [DIR_KEY[heading]]: true });
  if (game.heading !== heading) throw new Error(`Drehen nach ${heading} an ${game.node} nicht möglich`);
  press(game, { confirm: true });
}
