// Einfacher Autopilot für Tests: weicht Wänden aus, zielt auf Lücken und Gegner.
import { localToScreenVec, clamp } from '../../src/core/math.js';
import { ENEMIES } from '../../src/game/enemies.js';

export function botInput(lv, opts = {}) {
  const p = lv.player;
  const { hc } = lv.playerHalf;
  let targetC = null;
  let targetA = lv.camA + lv.va * (opts.forwardBias ?? 0.3);
  let fire = true;

  const solid = lv.gates
    .filter((g) => (g.type === 'rock' || g.type === 'narrow') && g.a1 + 4 > p.a && g.a0 - p.a < 320)
    .sort((x, y) => x.a0 - y.a0)[0];
  const spikes = lv.gates.find((g) => g.type === 'spikes' && p.a > g.a0 - 120 && p.a < g.a1 + 10);

  if (solid && solid.type === 'narrow') {
    targetC = solid.gapC;
    const aligned = Math.abs(lv.dc(solid.gapC, p.c)) + hc <= solid.gapW / 2;
    targetA = aligned ? solid.a1 + 40 : solid.a0 - 30;
  } else if (solid && solid.type === 'rock') {
    const open = solid.blocks.filter((b) => b.hp <= 0);
    if (open.length) {
      const best = open
        .map((b) => (b.c0 + b.c1) / 2)
        .sort((x, y) => Math.abs(lv.dc(x, p.c)) - Math.abs(lv.dc(y, p.c)))[0];
      targetC = best;
      const aligned = Math.abs(lv.dc(best, p.c)) < 4;
      targetA = aligned ? solid.a1 + 40 : solid.a0 - 30;
    } else {
      targetA = solid.a0 - 40;
    }
  } else if (spikes && !opts.ignoreSpikes) {
    const col = spikes.cols.find((c) => c.a > p.a - 8);
    if (col) {
      // Lücke etwas vorausberechnen
      const dt = Math.max(0, (col.a - p.a) / 120);
      const gap = col.base + col.amp * Math.sin((lv.time + dt) * col.speed + col.phase);
      targetC = gap;
      const aligned = Math.abs(lv.dc(gap, p.c)) < spikes.gap / 2 - hc - 6;
      targetA = aligned ? col.a + 30 : col.a - 30;
    }
  } else if (lv.boss && lv.boss.enter <= 0) {
    targetC = lv.boss.c + (lv.boss.kind === 'walross' ? -22 : 0);
    targetA = lv.boss.a - 140;
  } else {
    let best = null;
    for (const e of lv.enemies) {
      if (ENEMIES[e.kind].invulnerable || e.a < p.a) continue;
      const d = Math.abs(lv.dc(e.c, p.c)) + (e.a - p.a) * 0.3;
      if (!best || d < best.d) best = { d, e };
    }
    if (best) targetC = best.e.c;
  }

  let da = clamp((targetA - p.a) / 20, -1, 1);
  let dc = targetC === null ? 0 : clamp(lv.dc(targetC, p.c) / 8, -1, 1);
  const [mx, my] = localToScreenVec(lv.heading, da, dc);
  return { mx, my, fire, power: lv.powers.cursor >= 0 && opts.buyPowers !== false };
}

/** Simuliert ein Level bis zum Ergebnis oder Timeout. Gibt Level und Ergebnis zurück. */
export function runLevel(lv, maxSeconds, opts = {}) {
  const dt = 1 / 60;
  let t = 0;
  while (!lv.result && t < maxSeconds) {
    const input = opts.input ? opts.input(lv, t) : botInput(lv, opts);
    lv.update(dt, input);
    if (opts.check) opts.check(lv);
    t += dt;
  }
  return { lv, result: lv.result, seconds: t };
}
