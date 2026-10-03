// Einfacher Autopilot für Tests: weicht Wänden aus, zielt auf Lücken und Gegner.
import { localToScreenVec, screenToLocalVec, clamp } from '../../src/core/math.js';
import { ENEMIES } from '../../src/game/enemies.js';
import { findPath, TILE, isSolid } from '../../src/game/terrain.js';
import { dynState } from '../../src/game/dynamics.js';

/** Weg durchs Terrain (eine Zeile pro Spalte), zwischengespeichert pro Level und Spiegelzustand. */
function navPath(lv) {
  const m = lv.map;
  const key = m.flipA + ':' + m.flipC + ':' + lv.small;
  if (lv._nav && lv._nav.key === key) return lv._nav;
  const path = findPath(m, { size: lv.small ? 1 : 2, drill: true, rubber: lv.items.has('GUMMIHAUT') });
  lv._nav = { key, path, half: lv.small ? TILE / 2 : TILE };
  return lv._nav;
}

export function botInput(lv, opts = {}) {
  const p = lv.player;
  const { hc } = lv.playerHalf;
  let targetC = null;
  let targetA = lv.camA + lv.va * (opts.forwardBias ?? 0.3);
  let fire = true;

  const solid = lv.gates
    .filter((g) => (g.type === 'rock' || g.type === 'narrow' || (g.type === 'clock' && g.closed)) && g.a1 + 4 > p.a && g.a0 - p.a < 320)
    .sort((x, y) => x.a0 - y.a0)[0];
  // Zeitschranke voraus: Espresso halten und ganz vorn fliegen
  const clock = lv.gates.find((g) => g.type === 'clock' && !g.closed && g.a1 + 30 > p.a && g.a0 - p.a < 700);
  const espresso = !!clock && lv.items.has('ESPRESSO');
  const spikes = lv.gates.find((g) => g.type === 'spikes' && p.a > g.a0 - lv.va * 0.8 && p.a < g.a1 + 10);

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
  } else if (solid && solid.type === 'clock') {
    targetA = solid.a0 - 40;
  } else if (spikes && !opts.ignoreSpikes) {
    // Eine Reihe gilt erst als passiert, wenn die Figur sie ganz hinter sich hat
    const col = spikes.cols.find((c) => c.a > p.a - (lv.playerHalf.ha + 8));
    if (col) {
      // Lücke etwas vorausberechnen
      const dt = Math.max(0, (col.a - p.a) / 120);
      const gap = col.base + col.amp * Math.sin((lv.time + dt) * col.speed + col.phase);
      targetC = gap;
      const aligned = Math.abs(lv.dc(gap, p.c)) < Math.min(10, spikes.gap / 2 - hc - 14);
      targetA = aligned ? col.a + 30 : col.a - 30;
    }
  } else if (lv.boss && lv.boss.enter <= 0) {
    // In der Arena zählt der Boss (Wände hält die Wandvorschau fern)
    targetC = lv.boss.c + (lv.boss.kind === 'walross' ? -22 : 0);
    targetA = lv.boss.a - 140;
  } else if (terrainAhead(lv)) {
    // Terrain voraus: dem geplanten Weg folgen
    const nav = navPath(lv);
    const ix = Math.min(lv.map.cols - 1, Math.floor((p.a + 40) / TILE));
    if (nav.path && nav.path[ix] >= 0) targetC = nav.path[ix] * TILE + nav.half;
  } else {
    let best = null;
    for (const e of lv.enemies) {
      if (ENEMIES[e.kind].invulnerable || e.a < p.a) continue;
      const d = Math.abs(lv.dc(e.c, p.c)) + (e.a - p.a) * 0.3;
      if (!best || d < best.d) best = { d, e };
    }
    if (best) targetC = best.e.c;
  }

  if (espresso && !solid) targetA = Math.max(targetA, lv.camA + lv.va);
  let da = clamp((targetA - p.a) / 20, -1, 1);
  let dc = targetC === null ? 0 : clamp(lv.dc(targetC, p.c) / 8, -1, 1);
  const [mx, my] = localToScreenVec(lv.heading, da, dc);
  return safeInput(lv, { mx, my, fire, espresso, power: lv.powers.cursor >= 0 && opts.buyPowers !== false });
}

/** Liegt Terrain in der eigenen Flugbahn (±3 Kacheln quer) in den nächsten Spalten? */
function terrainAhead(lv) {
  const p = lv.player;
  const ix0 = Math.floor(p.a / TILE);
  const iy0 = Math.floor(p.c / TILE);
  for (let ix = ix0; ix < ix0 + 16; ix++) {
    for (let iy = iy0 - 3; iy <= iy0 + 3; iy++) if (isSolid(lv.map.cell(ix, iy))) return true;
  }
  return false;
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
  // Quer ausrichten hat Vorrang: wenn nur die Kombination mit Vorwärts kollidiert, Vorwärts streichen
  if (dc !== 0) {
    const lc = Math.min(look, 6); // quer nur kurz vorausschauen (sonst blockiert die Vorschau das Feinjustieren)
    if (lv.wallHit(p.a, p.c + dc * lc, ha + 1, hc + 1)) dc = 0;
    else if (lv.wallHit(p.a + da * look, p.c + dc * lc, ha + 1, hc + 1)) da = 0;
  }
  // Stachelreihen: nicht hineinfliegen, solange man nicht in der Lücke ist, und darin nicht quer abdriften
  for (const g of lv.gates) {
    if (g.type !== 'spikes' || lv.items.has('GUMMIHAUT')) continue;
    for (const col of g.cols) {
      const d = col.a - p.a;
      if (d < -(ha + 20) || d > ha + 14) continue;
      const off = lv.dc(p.c, lv.spikeGapAt(col));
      const safe = g.gap / 2 - hc - 6;
      if (Math.abs(off) > safe && da > 0 && d > 0) da = 0; // nicht vorwärts in die Reihe
      if (Math.abs(off) > safe && da < 0 && d < 0) da = 0; // und nicht rückwärts zurück hinein
      if (Math.abs(off + dc * 4) > safe && Math.sign(dc) === Math.sign(off)) dc = 0;
    }
  }
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
    // echte Geschwindigkeit aus dem letzten Schritt (z. B. zustoßende Gebisse)
    ...lv.enemies.map((e) => ({
      a: e.a,
      c: e.c,
      va: e.pa === undefined ? -60 : (e.a - e.pa) * 60,
      vc: e.pc === undefined ? 0 : lv.dc(e.c, e.pc) * 60,
      r: e.r,
    })),
  ];
  for (const o of lv.dyn) {
    const st = dynState(o, lv.time);
    const nx = dynState(o, lv.time + 0.1);
    if (!st || st.kind === 'zone') continue;
    const r = st.kind === 'circle' ? st.r : Math.max(st.ha, st.hc);
    threats.push({ a: st.a, c: st.c, va: (nx.a - st.a) * 10, vc: lv.dc(nx.c, st.c) * 10, r });
  }
  for (const t of threats) {
    for (const T of [0.1, 0.25, 0.4, 0.6]) {
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
  // Terrain direkt voraus hat Vorrang vor dem Ausweichen (Terrain ist tödlich, Kugeln nur Schaden)
  const { ha, hc } = lv.playerHalf;
  const wallSoon = lv.staticWallHit(p.a + 56, p.c, ha + 2, hc + 2) || lv.staticWallHit(p.a + 28, p.c, ha + 2, hc + 2);
  if (Math.hypot(fa, fc) > 0.5 && !wallSoon) {
    const [mx, my] = localToScreenVec(lv.heading, clamp(fa, -1, 1), clamp(fc, -1, 1));
    return safeInput(lv, { ...base, mx, my });
  }
  return base;
}
