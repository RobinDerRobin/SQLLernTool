// Einfacher Autopilot für Tests: weicht Wänden aus, zielt auf Lücken und Gegner.
import { localToScreenVec, screenToLocalVec, clamp } from '../../src/core/math.js';
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
      const aligned = Math.abs(lv.dc(gap, p.c)) < Math.min(10, spikes.gap / 2 - hc - 14);
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
  return safeInput(lv, { mx, my, fire, power: lv.powers.cursor >= 0 && opts.buyPowers !== false });
}

/**
 * Wandvorschau: Bewegungsanteile, die in den nächsten Momenten in festes Terrain führen
 * würden, werden gestrichen (Terrain ist tödlich).
 */
export function safeInput(lv, inp) {
  const p = lv.player;
  const { ha, hc } = lv.playerHalf;
  let [da, dc] = screenToLocalVec(lv.heading, inp.mx || 0, inp.my || 0);
  const look = 0.18 * 110 * (1 + 0.22 * lv.powers.speed) * (lv.char ? lv.char.speed : 1);
  if (da !== 0 && lv.wallHit(p.a + da * look + Math.sign(da) * 2, p.c, ha + 1, hc + 1)) da = 0;
  if (dc !== 0 && (lv.wallHit(p.a, p.c + dc * look, ha + 1, hc + 1) || lv.wallHit(p.a + da * look, p.c + dc * look, ha + 1, hc + 1))) dc = 0;
  const [mx, my] = localToScreenVec(lv.heading, da, dc);
  return { ...inp, mx, my };
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

/**
 * Autopilot, der zusätzlich Kugeln, Gegnern und Laserlinien ausweicht – ein grobes Modell
 * eines geübten Spielers. Damit prüfen die Tests, dass jedes Level fair schaffbar ist.
 */
export function dodgeInput(lv) {
  const base = botInput(lv);
  const p = lv.player;
  let fa = 0;
  let fc = 0;
  const threats = [
    ...lv.bullets.map((b) => ({ a: b.a, c: b.c, va: b.va, vc: b.vc, r: b.r })),
    ...lv.enemies.map((e) => ({ a: e.a, c: e.c, va: -60, vc: 0, r: e.r })),
  ];
  for (const t of threats) {
    for (const T of [0.1, 0.25, 0.4]) {
      const da = t.a + t.va * T - p.a;
      const dc = lv.dc(t.c + t.vc * T, p.c);
      const d = Math.hypot(da, dc);
      if (d < t.r + 16) {
        fa -= (da / (d + 1)) * (1 / T);
        fc -= (dc / (d + 1)) * (1 / T);
      }
    }
  }
  for (const h of lv.hazards) {
    if (h.warn) continue;
    const pc = h.c + lv.dc(p.c, h.c);
    let d = Math.atan2(pc - h.c, p.a - h.a) - h.ang;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) < 0.5 && Math.hypot(p.a - h.a, pc - h.c) < h.len + 10) {
      fc += Math.sign(d) * 3;
      fa -= 1;
    }
  }
  if (Math.hypot(fa, fc) > 0.5) {
    const [mx, my] = localToScreenVec(lv.heading, clamp(fa, -1, 1), clamp(fc, -1, 1));
    return safeInput(lv, { ...base, mx, my });
  }
  return base;
}
