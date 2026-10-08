// Abnahme-Checkliste P2 „Minimap“ (docs/prototypen/P2-minimap.md, Abschnitt 2) als Tests aus Spielersicht.
// Gemessen werden die Stellen auf der Minimap gegen Kartenposition und Bildschirmstelle des Dackels (unabhängig vom Minimap-Code
// gerechnet) und die Aufrufe einer aufzeichnenden Canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, W, N, CARDINALS, DIR_VEC, DIR_SHORT, turnCW, turnCCW, opposite, headingAngle, SCREEN_W, SCREEN_H, HEADING_CODES } from '../src/core/math.js';
import { Rng } from '../src/core/rng.js';
import { FensterScene, SWING_TIME, DOG_R } from '../src/proto/fenster.js';
import { compileMap } from '../src/proto/karte.js';
import { NETZ_MAP, STELLEN, RING } from '../src/proto/netz-map.js';
import { KREUZ_MAP } from '../src/proto/fenster.js';
import { drawFenster } from '../src/proto/fenster-draw.js';
import {
  minimapFor, updateMinimap, layoutMinimap, drawMinimap, drawnDogMap, newMinimapState, mapPerPx, GLYPHS, GLYPH_STYLE,
  MINIMAP_SPAN, FRAME_X, FRAME_W, FRAME_H, FRAME_TOP, FRAME_CX, FRAME_CY, BAR_W, VERSIONS,
} from '../src/proto/minimap.js';

const DT = 1 / 60;
const COMBOS = CARDINALS.flatMap((theta) => ['R', 'L'].map((s) => ({ theta, s })));
const hOf = (theta, s) => (s === 'R' ? theta : opposite(theta));
const name = (c) => `θ=${HEADING_CODES[c.theta]} s=${c.s}`;
const letter = (dir) => DIR_SHORT[dir];
const TAU = 2 * Math.PI;

// ------------------------------------------------------------------ Hilfen
const mk = (map = NETZ_MAP) => {
  const sc = new FensterScene({ map });
  sc.hint = 0;
  return sc;
};
/** Szene + Minimap-Zustand an einer Stelle (Karte, Ausrichtung, Seite). */
const at = (x, y, c, version = 1, map = NETZ_MAP, dogScreen) => {
  const sc = mk(map).warp(x, y, c.theta, c.s, dogScreen);
  const st = minimapFor(sc);
  st.version = version;
  updateMinimap(st, sc, {}, DT);
  return { sc, st };
};
/** Ein Frame wie im Spiel: Szene, dann Minimap. */
const step = (sc, st, input = {}) => {
  sc.update(DT, input);
  updateMinimap(st, sc, input, DT);
};
/** Wahre Kartenstelle des Dackels, unabhängig vom Minimap-Code (im Schwenk: der Drehpunkt, der sich nie ändert). */
const truth = (sc) => (sc.swing ? sc.swing.pivot : sc.dogMap());
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (Toleranz ${tol})`);
const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

/** Aufzeichnende Canvas: Pfade/Striche/Bögen/Flächen in Bildkoordinaten (mit mitgeführter Transformation); Schrift wird gezählt. */
function recCtx() {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const log = { strokes: [], arcs: [], rects: [], fills: [], text: 0, calls: 0 };
  let path = [];
  const mul = (n) => {
    const [a, b, c, d, e, f] = m;
    m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
  };
  const tp = (x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const base = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, lineJoin: '', shadowBlur: 0, shadowColor: '', font: '', textAlign: '', textBaseline: '',
    save() { stack.push({ m: m.slice(), a: this.globalAlpha }); log.calls++; },
    restore() { const t = stack.pop(); if (t) { m = t.m; this.globalAlpha = t.a; } },
    translate(x, y) { mul([1, 0, 0, 1, x, y]); },
    scale(x, y) { mul([x, 0, 0, y, 0, 0]); },
    rotate(a) { mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    beginPath() { path = []; },
    closePath() {},
    moveTo(x, y) { path.push(tp(x, y)); log.calls++; },
    lineTo(x, y) { path.push(tp(x, y)); log.calls++; },
    rect() {},
    clip() {},
    stroke() { log.strokes.push({ pts: path.slice(), style: this.strokeStyle, lw: this.lineWidth, alpha: this.globalAlpha }); },
    fill() { log.fills.push({ style: this.fillStyle, alpha: this.globalAlpha, pts: path.slice() }); },
    arc(x, y, r) { const p = tp(x, y); log.arcs.push({ x: p.x, y: p.y, r, style: this.fillStyle, alpha: this.globalAlpha }); log.calls++; },
    fillRect(x, y, w, h) { log.rects.push({ x0: x, y0: y, x1: x + w, y1: y + h, c: [tp(x, y), tp(x + w, y + h)], style: this.fillStyle, alpha: this.globalAlpha }); log.calls++; },
    strokeRect() { log.calls++; },
    fillText() { log.text++; },
    strokeText() { log.text++; },
    measureText() { log.text++; return { width: 0 }; },
  };
  const ctx = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
  ctx.log = log;
  return Object.assign(ctx, { log });
}
const draw = (sc, st) => {
  const ctx = recCtx();
  drawMinimap(ctx, st, sc);
  return ctx.log;
};

// ------------------------------------------------------------------ 1. Die Minimap ändert das Spiel nicht
const snap = (sc) => JSON.stringify(sc, (k, v) => (k === 'map' ? undefined : k === 'K' ? v.id : v));
test('Minimap: Zufallsspiel (≥ 100.000 Frames, fester Startwert, M zufällig) ist mit und ohne Minimap Frame für Frame identisch', () => {
  const rng = new Rng(20261008);
  const a = mk(); // mit Minimap
  const b = mk(); // ohne
  const st = minimapFor(a);
  const nullCtx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
  let input = {};
  const FRAMES = 120000;
  const seen = new Set();
  for (let i = 0; i < FRAMES; i++) {
    if (i % 24 === 0) {
      const r = rng.next();
      input = { mx: rng.next() < 0.3 ? 0 : rng.range(-1, 1), my: rng.next() < 0.3 ? 0 : rng.range(-1, 1) };
      if (r < 0.07) input.rotLeft = true;
      else if (r < 0.14) input.rotRight = true;
      else if (r < 0.17) input.wende = true;
      if (rng.next() < 0.12) input.map = true; // M (auch mitten im Schwenk)
    }
    const inp = i % 24 === 0 ? input : { mx: input.mx, my: input.my };
    a.update(DT, inp);
    updateMinimap(st, a, inp, DT);
    b.update(DT, inp);
    seen.add(st.version);
    if (i % 5 === 0) {
      const before = snap(a);
      drawMinimap(nullCtx, st, a);
      layoutMinimap(st, a);
      assert.equal(snap(a), before, 'Zeichnen liest nur: Szene unverändert, Frame ' + i);
    }
    // Kartenposition und Bildschirmstelle des Dackels und Kamerabild: in jedem Frame gleich
    assert.deepEqual([a.theta, a.s, a.ang, a.cam.x, a.cam.y, a.dog.x, a.dog.y, a.K.id, a.score, a.shoves], [b.theta, b.s, b.ang, b.cam.x, b.cam.y, b.dog.x, b.dog.y, b.K.id, b.score, b.shoves], 'Frame ' + i);
  }
  assert.equal(snap(a), snap(b), 'am Ende dieselbe Szene');
  assert.deepEqual([...seen].sort(), [...VERSIONS].sort(), 'alle Versionen und „aus“ wurden durchlaufen');
});

// ------------------------------------------------------------------ 2. Punkt stimmt
test('Minimap: Der Dackel ist ein Punkt, an der Stelle seiner Kartenposition – V1/V2 ≤ 1 px, in jeder Lage (auch kopfüber)', () => {
  const places = [STELLEN.A, STELLEN.B, STELLEN.C, STELLEN.F, STELLEN.G, STELLEN.H, { x: -300, y: -500 }];
  for (const c of COMBOS) for (const p of places) for (const v of [1, 2]) {
    const { sc, st } = at(p.x, p.y, c, v);
    const L = layoutMinimap(st, sc);
    const mpp = (MINIMAP_SPAN) / FRAME_W;
    const m = truth(sc);
    // V1: Abstand vom Fenstermittelpunkt im Bild; V2: Abstand in der Karte (Norden oben)
    const exp = v === 1 ? { x: FRAME_CX + (sc.dog.x - SCREEN_W / 2) / mpp, y: FRAME_CY + (sc.dog.y - SCREEN_H / 2) / mpp } : { x: FRAME_CX + (m.x - sc.cam.x) / mpp, y: FRAME_CY + (m.y - sc.cam.y) / mpp };
    near(L.dot.x, exp.x, 1, `V${v} ${name(c)} @${p.x},${p.y} x`);
    near(L.dot.y, exp.y, 1, `V${v} ${name(c)} @${p.x},${p.y} y`);
    // gezeichnet: genau ein weißer Punkt (Bogen), keine Pfeil-Form
    const lg = draw(sc, st);
    const dots = lg.arcs.filter((a) => a.style === '#ffffff');
    assert.equal(dots.length, 1, 'ein Punkt');
    near(dots[0].x, exp.x, 1, 'gezeichneter Punkt x');
    near(dots[0].y, exp.y, 1, 'gezeichneter Punkt y');
  }
});

test('Minimap: Punkt stimmt auch während des Schwenks (V1, V2, V3) – der Drehpunkt bleibt, wo er ist', () => {
  for (const c of COMBOS) for (const v of [1, 2, 3]) {
    const { sc, st } = at(-60, -500, c, v); // B: T-Kreuzung
    const rotates = [-1, 1].find((k) => sc.canTurnBy(k));
    if (!rotates) continue;
    const p0 = truth(sc);
    step(sc, st, rotates > 0 ? { rotRight: true } : { rotLeft: true });
    assert.ok(sc.swing, 'Schwenk läuft');
    let frames = 0;
    while (sc.swing) {
      const L = layoutMinimap(st, sc);
      const m = truth(sc);
      assert.deepEqual(m, p0, 'Kartenposition fest im Schwenk');
      if (v === 1) {
        near(L.dot.x, FRAME_CX + (sc.dog.x - SCREEN_W / 2) / (MINIMAP_SPAN / FRAME_W), 1, `V1 Schwenk ${name(c)} x`);
        near(L.dot.y, FRAME_CY + (sc.dog.y - SCREEN_H / 2) / (MINIMAP_SPAN / FRAME_W), 1, `V1 Schwenk ${name(c)} y`);
      } else if (v === 2) {
        near(L.dot.x, FRAME_CX + (m.x - sc.cam.x) / (MINIMAP_SPAN / FRAME_W), 1, `V2 Schwenk ${name(c)} x`);
        near(L.dot.y, FRAME_CY + (m.y - sc.cam.y) / (MINIMAP_SPAN / FRAME_W), 1, `V2 Schwenk ${name(c)} y`);
      } else {
        const l = L.layers[L.layers.length - 1];
        const a = sc.K.axis === 'h' ? m.x : m.y;
        const u = (a - sc.K.a0) / (sc.K.a1 - sc.K.a0);
        const sign = sc.K.axis === 'h' ? DIR_VEC[sc.theta][0] : DIR_VEC[sc.theta][1];
        near(l.dot.x, FRAME_CX - BAR_W / 2 + (sign > 0 ? u : 1 - u) * BAR_W, 1, `V3 Schwenk ${name(c)}`);
      }
      step(sc, st);
      frames++;
    }
    assert.ok(frames >= 25, 'Schwenk dauerte');
  }
});

test('Minimap V3: Der Punkt liegt entlang des Gangs an der Stelle des Dackels (≤ 1 px), in jeder Lage', () => {
  for (const c of COMBOS) for (const p of [STELLEN.A, STELLEN.F, STELLEN.G, STELLEN.H, { x: -300, y: -500 }, { x: 600, y: -500 }]) {
    const { sc, st } = at(p.x, p.y, c, 3);
    const L = layoutMinimap(st, sc);
    assert.equal(L.layers.length, 1);
    const l = L.layers[0];
    const m = truth(sc);
    const K = sc.K;
    const u = ((K.axis === 'h' ? m.x : m.y) - K.a0) / (K.a1 - K.a0);
    const sign = K.axis === 'h' ? DIR_VEC[c.theta][0] : DIR_VEC[c.theta][1];
    near(l.dot.x, FRAME_CX - BAR_W / 2 + (sign > 0 ? u : 1 - u) * BAR_W, 1, `V3 ${name(c)} @${p.x},${p.y}`);
    near(l.dot.y, FRAME_CY, 0.01, 'Balkenmitte');
    const lg = draw(sc, st);
    const dots = lg.arcs.filter((a) => a.style === '#ffffff');
    assert.equal(dots.length, 1);
    near(dots[0].x, l.dot.x, 1, 'gezeichnet');
  }
});

// ------------------------------------------------------------------ 3. V1 „wie die Kamera“
test('Minimap V1: verkleinerte Kopie des Kamerabilds – Fenster-Rechteck waagerecht, gleiche Drehung, rechts = rechts', () => {
  const mpp = MINIMAP_SPAN / FRAME_W;
  for (const c of COMBOS) for (const p of [STELLEN.A, STELLEN.F, { x: -300, y: -500 }]) {
    const { sc, st } = at(p.x, p.y, c, 1, NETZ_MAP, { x: 150, y: 90 });
    const L = layoutMinimap(st, sc);
    // Fenster-Rechteck: waagerecht, Größe = sichtbarer Bereich / Maßstab, Mitte = Rahmenmitte
    const [a, b, , d] = L.window;
    near(a.y, b.y, 1e-9, 'oben waagerecht');
    near(a.x, d.x, 1e-9, 'links senkrecht');
    near(b.x - a.x, SCREEN_W / mpp, 1e-9, 'Breite');
    near(d.y - a.y, SCREEN_H / mpp, 1e-9, 'Höhe');
    near((a.x + b.x) / 2, FRAME_CX, 1e-9, 'Mitte x');
    near((a.y + d.y) / 2, FRAME_CY, 1e-9, 'Mitte y');
    // Ecken der Gänge: Minimap-Punkt = Rahmenmitte + (Bildschirmpunkt − Bildschirmmitte) / Maßstab, mit dem wirklich gezeichneten Bild
    const toScreen = (m) => {
      const r = rot(m.x - sc.cam.x, m.y - sc.cam.y, -sc.ang);
      return { x: SCREEN_W / 2 + r.x, y: SCREEN_H / 2 + r.y };
    };
    const lg = draw(sc, st);
    const floor = lg.rects.filter((r) => r.style === 'rgba(196,182,160,0.9)');
    assert.equal(floor.length, NETZ_MAP.corridors.length);
    floor.forEach((r, i) => {
      const cor = NETZ_MAP.corridors[i];
      for (const [mx, my, q] of [[cor.x0, cor.y0, r.c[0]], [cor.x1, cor.y1, r.c[1]]]) {
        const s = toScreen({ x: mx, y: my });
        near(q.x, FRAME_CX + (s.x - SCREEN_W / 2) / mpp, 0.01, `Gang ${cor.id} x ${name(c)}`);
        near(q.y, FRAME_CY + (s.y - SCREEN_H / 2) / mpp, 0.01, `Gang ${cor.id} y ${name(c)}`);
      }
    });
    // N/S/W/O am Rand, an der richtigen Stelle: Richtung im Bild = gedrehte Himmelsrichtung
    assert.equal(L.letters.length, 4);
    for (const t of L.letters) {
      const s = rot(DIR_VEC[t.dir][0], DIR_VEC[t.dir][1], -sc.ang);
      const ox = t.x - FRAME_CX;
      const oy = t.y - FRAME_CY;
      assert.ok(Math.abs(ox * s.y - oy * s.x) < 1e-6, `Buchstabe ${t.ch} liegt in Bildrichtung (${name(c)})`);
      assert.ok(ox * s.x + oy * s.y > 0, 'nicht auf der Gegenseite');
      assert.ok(Math.abs(ox) <= FRAME_W / 2 && Math.abs(oy) <= FRAME_H / 2, 'im Rahmen');
      assert.equal(t.ch, letter(t.dir));
    }
    // Der Buchstabe der Flugrichtung steht auf der Seite, zu der man fliegt (rechts bei s=R, links bei s=L)
    const flight = L.letters.find((t) => t.dir === hOf(c.theta, c.s));
    assert.ok(c.s === 'R' ? flight.x > FRAME_CX + 20 : flight.x < FRAME_CX - 20, `Flugrichtung ${name(c)}`);
    near(flight.y, FRAME_CY, 1e-6, 'auf Höhe der Mitte');
  }
});

// ------------------------------------------------------------------ 4. V2 „Plan“
test('Minimap V2: Norden immer oben, N/S/W/O fest; das Fenster-Rechteck liegt, wie das Fenster liegt (Winkel = θ)', () => {
  const mpp = MINIMAP_SPAN / FRAME_W;
  const fixed = {};
  for (const c of COMBOS) for (const p of [STELLEN.A, STELLEN.F, { x: -300, y: -500 }]) {
    const { sc, st } = at(p.x, p.y, c, 2);
    const L = layoutMinimap(st, sc);
    for (const t of L.letters) {
      const key = t.ch;
      fixed[key] ??= `${t.x},${t.y}`;
      assert.equal(`${t.x},${t.y}`, fixed[key], `Buchstabe ${key} fest (${name(c)})`);
    }
    const byCh = Object.fromEntries(L.letters.map((t) => [t.ch, t]));
    assert.ok(byCh.N.y < FRAME_CY && byCh.S.y > FRAME_CY && byCh.W.x < FRAME_CX && byCh.O.x > FRAME_CX, 'N oben, S unten, W links, O rechts');
    // Rechteck: obere Kante zeigt in Richtung θ (die Richtung des rechten Fensterendes)
    const [a, b] = L.window;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const want = headingAngle(c.theta);
    near(Math.cos(ang), Math.cos(want), 1e-9, `Winkel cos ${name(c)}`);
    near(Math.sin(ang), Math.sin(want), 1e-9, `Winkel sin ${name(c)}`);
    near(Math.hypot(b.x - a.x, b.y - a.y), SCREEN_W / mpp, 1e-9, 'Breite');
    // Gänge liegen ohne Drehung: Eckpunkt = Rahmenmitte + (Karte − Kamera) / Maßstab
    const lg = draw(sc, st);
    const floor = lg.rects.filter((r) => r.style === 'rgba(196,182,160,0.9)');
    floor.forEach((r, i) => {
      const cor = NETZ_MAP.corridors[i];
      near(r.c[0].x, FRAME_CX + (cor.x0 - sc.cam.x) / mpp, 1e-6, 'Gang x0');
      near(r.c[1].y, FRAME_CY + (cor.y1 - sc.cam.y) / mpp, 1e-6, 'Gang y1');
    });
  }
});

// ------------------------------------------------------------------ 5. V3 „Gang-Balken“
test('Minimap V3: zeigt nur den aktuellen Gang, waagerecht wie die Kamera, N/S/W/O an Balkenenden und Stummeln stimmen mit der Karte', () => {
  for (const c of COMBOS) for (const p of [STELLEN.A, STELLEN.D, STELLEN.E, STELLEN.F, STELLEN.H, { x: -300, y: -500 }, { x: RING.RX1, y: 0 }]) {
    const { sc, st } = at(p.x, p.y, c, 3);
    const L = layoutMinimap(st, sc);
    assert.equal(L.layers.length, 1, 'nur der aktuelle Gang');
    const l = L.layers[0];
    const K = sc.K;
    assert.equal(l.id, K.id);
    // Bildschirm-links = Balken-links: Buchstabe links = Richtung, in die das linke Fensterende zeigt
    const [left, right] = l.letters;
    assert.ok(left.x < l.x0 && right.x > l.x1, 'Buchstaben neben dem Balken');
    assert.equal(left.ch, letter(opposite(c.theta)));
    assert.equal(right.ch, letter(c.theta));
    // Bildschirm-links = Balken-links: ein Schritt zum linken Fensterende (Richtung opposite(θ)) verschiebt den Punkt nach links
    const lv = DIR_VEC[opposite(c.theta)];
    const q = { x: p.x + lv[0] * 40, y: p.y + lv[1] * 40 };
    if (NETZ_MAP.walkable(q.x, q.y, DOG_R)) {
      const o = at(q.x, q.y, c, 3);
      if (o.sc.K.id === K.id) assert.ok(layoutMinimap(o.st, o.sc).layers[0].dot.x < l.dot.x, `Bildschirm-links = Balken-links (${name(c)} @${p.x},${p.y})`);
    }
    // Stummel: genau die Abzweige quer zum Gang, an ihrer Stelle, zur richtigen Bildseite, mit dem Buchstaben ihrer Richtung
    const want = [];
    for (const j of NETZ_MAP.junctions) {
      if (j.h !== K && j.v !== K) continue;
      for (const pr of j.ports) {
        const along = K.axis === 'h' ? pr === E || pr === W : pr === S || pr === N;
        if (!along) want.push({ j: j.id, dir: pr });
      }
    }
    assert.equal(l.stubs.length, want.length, `Stummel von ${K.id} (${name(c)})`);
    for (const w of want) {
      const s = l.stubs.find((q) => q.j === w.j && q.dir === w.dir);
      assert.ok(s, `Stummel ${w.j} ${HEADING_CODES[w.dir]}`);
      assert.equal(s.letter.ch, letter(w.dir));
      // Bildschirm-unten = Richtung turnCW(θ): geht der Abzweig dorthin, zeigt der Stummel nach unten
      const dn = DIR_VEC[turnCW(c.theta)];
      const down = DIR_VEC[w.dir][0] * dn[0] + DIR_VEC[w.dir][1] * dn[1] > 0;
      assert.equal(s.y0 > l.y, down, 'Stummel auf der richtigen Bildseite');
      // Stelle entlang des Gangs = Kreuzungsmitte
      const jn = NETZ_MAP.junctions.find((q) => q.id === w.j);
      const a = K.axis === 'h' ? jn.cx : jn.cy;
      const u = (a - K.a0) / (K.a1 - K.a0);
      const sign = K.axis === 'h' ? DIR_VEC[c.theta][0] : DIR_VEC[c.theta][1];
      near(s.x, l.x0 + (sign > 0 ? u : 1 - u) * BAR_W, 0.01, 'Stummel entlang des Gangs');
    }
  }
});

// ------------------------------------------------------------------ 6. V3-Füllung
const merge = (spans) => {
  const out = [];
  for (const [lo, hi] of spans.slice().sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && lo <= last[1] + 1e-9) last[1] = Math.max(last[1], hi);
    else out.push([lo, hi]);
  }
  return out;
};
test('Minimap V3: Füllung – nach jeder Drehung und Umkehr wird sie grau, die neue beginnt am Dackel in diesem Moment, sie wandert nie; Grau bleibt je Gang', () => {
  const { sc, st } = at(-300, -500, { theta: E, s: 'R' }, 3, NETZ_MAP, { x: 120, y: 135 });
  const alongOf = (K, p) => (K.axis === 'h' ? p.x : p.y);
  // Erwartung, unabhängig vom Minimap-Code mitgeführt
  const grey = {};
  let exp = { K: sc.K, lo: alongOf(sc.K, truth(sc)), hi: alongOf(sc.K, truth(sc)) };
  const pxOf = (K, theta, a) => {
    const u = (a - K.a0) / (K.a1 - K.a0);
    const sign = K.axis === 'h' ? DIR_VEC[theta][0] : DIR_VEC[theta][1];
    return FRAME_CX - BAR_W / 2 + (sign > 0 ? u : 1 - u) * BAR_W;
  };
  const events = [];
  let prevFill = null;
  const act = (input, event) => {
    const pre = truth(sc);
    const oldK = sc.K;
    const d0 = sc.deaths;
    step(sc, st, input);
    const died = sc.deaths !== d0; // Tod: Neustart an der letzten Kreuzung, neue Füllung dort
    if (event || died || sc.K !== oldK) {
      if (exp.hi - exp.lo > 0) grey[oldK.id] = [...(grey[oldK.id] || []), [exp.lo, exp.hi]];
      const a = alongOf(sc.K, died ? truth(sc) : pre);
      exp = { K: sc.K, lo: a, hi: a };
      events.push(sc.K.id);
      prevFill = null;
    }
    const a = alongOf(sc.K, truth(sc));
    exp.lo = Math.min(exp.lo, a);
    exp.hi = Math.max(exp.hi, a);
    const L = layoutMinimap(st, sc);
    const l = L.layers[L.layers.length - 1];
    assert.equal(l.id, sc.K.id);
    // farbige Füllung = min..max seit dem Ereignis (≤ 1 px)
    const x0 = Math.min(pxOf(sc.K, sc.theta, exp.lo), pxOf(sc.K, sc.theta, exp.hi));
    const x1 = Math.max(pxOf(sc.K, sc.theta, exp.lo), pxOf(sc.K, sc.theta, exp.hi));
    near(l.fill.x0, x0, 1, 'Füllung links');
    near(l.fill.x1, x1, 1, 'Füllung rechts');
    // sie wandert nie: ohne Ereignis wächst sie nur
    if (prevFill) {
      assert.ok(l.fill.x0 <= prevFill.x0 + 1e-9 && l.fill.x1 >= prevFill.x1 - 1e-9, 'Füllung schrumpft/wandert nicht');
    }
    prevFill = { ...l.fill };
    // Grau: genau die früheren Strecken dieses Gangs (verschmolzen), ≤ 1 px
    const wantGrey = merge((grey[sc.K.id] || []).map(([lo, hi]) => [Math.min(pxOf(sc.K, sc.theta, lo), pxOf(sc.K, sc.theta, hi)), Math.max(pxOf(sc.K, sc.theta, lo), pxOf(sc.K, sc.theta, hi))]));
    const gotGrey = merge(l.grey.map((g) => [g.x0, g.x1]));
    assert.equal(gotGrey.length, wantGrey.length, 'graue Stücke ' + JSON.stringify({ gotGrey, wantGrey }));
    gotGrey.forEach((g, i) => {
      near(g[0], wantGrey[i][0], 1, 'grau links');
      near(g[1], wantGrey[i][1], 1, 'grau rechts');
    });
  };
  const until = (cond, input, max = 3000) => {
    let n = 0;
    while (!cond() && n++ < max) act(input, false);
    assert.ok(n < max, 'Bedingung erreicht');
  };
  // a) nach Osten fliegen
  for (let i = 0; i < 100; i++) act({}, false);
  assert.ok(sc.K.id === 'nord');
  // b) mit dem Stick zurückfliegen: die Füllung wächst nicht zurück
  const fill0 = layoutMinimap(st, sc).layers[0].fill;
  for (let i = 0; i < 40; i++) act({ mx: -1 }, false);
  // c) Umkehr: grau, neue Füllung ab hier; nach Westen, dann wieder Umkehr nach Osten
  act({ wende: true }, true);
  for (let i = 0; i < 60; i++) act({}, false);
  act({ wende: true }, true);
  assert.ok(layoutMinimap(st, sc).layers[0].grey.length >= 1);
  // d) bis zur T-Kreuzung B, rechts drehen (nach Süden): grau, neuer Gang
  until(() => truth(sc).x > -40 && sc.canTurnBy(1), {}); // mitten in der Kreuzung B (nicht zu früh: Tod an der Wand)
  act({ rotRight: true }, true);
  assert.equal(sc.K.id, 'mitte-v');
  let faded = layoutMinimap(st, sc);
  assert.equal(faded.layers.length, 2, 'Überblendung: alter und neuer Balken');
  while (sc.swing) act({}, false);
  for (let i = 0; i < 120; i++) act({}, false);
  // e) Umkehr nach Norden, zurück zum Nord-Ring, dort rechts (Osten): derselbe Gang wie am Anfang
  act({ wende: true }, true);
  until(() => truth(sc).y < -420 && sc.canTurnBy(1), {});
  act({ rotRight: true }, true);
  assert.equal(sc.K.id, 'nord');
  while (sc.swing) act({}, false);
  for (let i = 0; i < 30; i++) act({}, false);
  // Die grauen Stücke des ersten Besuchs sind noch da
  const L = layoutMinimap(st, sc);
  assert.ok(L.layers[0].grey.length >= 1, 'graue Stücke früherer Besuche bleiben');
  assert.ok(grey.nord.length >= 2, 'Test hat mehrere frühere Strecken im Nord-Gang: ' + JSON.stringify(grey.nord));
  assert.ok(events.length >= 4);
  assert.ok(fill0.x1 > fill0.x0);
});

// ------------------------------------------------------------------ 7. Drehen
test('Minimap: V1 dreht im Schwenk synchron mit der Welt, V2 nur das Rechteck; danach steht alles still; die 180°-Umkehr dreht nichts', () => {
  for (const c of COMBOS) {
    for (const v of [1, 2]) {
      const { sc, st } = at(-60, -500, c, v);
      const k = [-1, 1].find((q) => sc.canTurnBy(q));
      if (!k) continue;
      step(sc, st, k > 0 ? { rotRight: true } : { rotLeft: true });
      let n = 0;
      while (sc.swing) {
        const L = layoutMinimap(st, sc);
        if (v === 1) {
          near(L.rot, -sc.ang, 1e-12, `V1 dreht mit der Welt (Frame ${n})`);
          // Fenster-Rechteck bleibt waagerecht
          near(L.window[0].y, L.window[1].y, 1e-9, 'V1 Rechteck waagerecht');
        } else {
          near(L.rot, 0, 1e-12, 'V2 Plan steht');
          const ang = Math.atan2(L.window[1].y - L.window[0].y, L.window[1].x - L.window[0].x);
          near(Math.cos(ang), Math.cos(sc.ang), 1e-9, 'V2 Rechteck dreht synchron');
          near(Math.sin(ang), Math.sin(sc.ang), 1e-9, 'V2 Rechteck dreht synchron');
        }
        step(sc, st);
        n++;
      }
      // danach still
      const L1 = layoutMinimap(st, sc);
      for (let i = 0; i < 5; i++) step(sc, st);
      const L2 = layoutMinimap(st, sc);
      near(L1.rot, L2.rot, 0, 'danach still');
      assert.deepEqual(L1.window.map((p) => [Math.round(p.x * 100), Math.round(p.y * 100)]).length, 4);
    }
  }
  // 180°-Umkehr: nichts dreht (V1: Drehwinkel und Buchstaben; V2: Rechteck-Winkel), auch nicht in den Frames danach
  for (const c of COMBOS) for (const v of [1, 2]) {
    const { sc, st } = at(-300, -500, c, v);
    const L0 = layoutMinimap(st, sc);
    const ang0 = Math.atan2(L0.window[1].y - L0.window[0].y, L0.window[1].x - L0.window[0].x);
    step(sc, st, { wende: true });
    for (let i = 0; i < 60; i++) {
      const L = layoutMinimap(st, sc);
      near(L.rot, L0.rot, 0, 'Umkehr dreht V1 nicht');
      const ang = Math.atan2(L.window[1].y - L.window[0].y, L.window[1].x - L.window[0].x);
      near(ang, ang0, 1e-9, 'Umkehr dreht das V2-Rechteck nicht');
      L.letters.forEach((t, j) => {
        near(t.x, L0.letters[j].x, 1e-9, 'Buchstabe x unverändert');
        near(t.y, L0.letters[j].y, 1e-9, 'Buchstabe y unverändert');
      });
      step(sc, st);
    }
  }
});

// ------------------------------------------------------------------ 8. Leuchtende Arme
test('Minimap: Es leuchten genau die Arme/Stummel, in die gedreht werden darf (canTurnBy); das Dreh-Symbol leuchtet genau dann, wenn einer leuchtet', () => {
  let checked = 0;
  let withArms = 0;
  const hud = recCtx();
  const iconOn = (sc) => {
    hud.log.arcs.length = 0;
    drawFenster(hud, sc);
    const icon = hud.log.arcs.find((a) => a.r === 13);
    return /^rgba\(255,214,90/.test(String(icon.style));
  };
  for (const c of COMBOS) for (let x = -960; x <= 760; x += 40) for (let y = -560; y <= 560; y += 40) {
    if (!NETZ_MAP.walkable(x, y, DOG_R)) continue;
    const sc = mk().warp(x, y, c.theta, c.s);
    const st = minimapFor(sc);
    const exp = [-1, 1].filter((k) => sc.canTurnBy(k)).map((k) => (k > 0 ? turnCW(sc.h) : turnCCW(sc.h))).sort();
    for (const v of [1, 2, 3]) {
      st.version = v;
      updateMinimap(st, sc, {}, DT);
      const L = layoutMinimap(st, sc);
      const got = v === 3 ? L.layers[0].stubs.filter((s) => s.glow).map((s) => s.dir).sort() : L.arms.map((a) => a.dir).sort();
      assert.deepEqual(got, exp, `V${v} ${name(c)} @${x},${y}`);
      if (v !== 3) for (const a of L.arms) assert.ok(a.rect.x1 > a.rect.x0 && a.rect.y1 > a.rect.y0 && NETZ_MAP.walkable((a.rect.x0 + a.rect.x1) / 2, (a.rect.y0 + a.rect.y1) / 2, 0), 'Arm liegt auf Boden');
      if (checked % 7 === 0) assert.equal(iconOn(sc), got.length > 0, `Symbol ${name(c)} @${x},${y}`);
    }
    checked++;
    if (exp.length) withArms++;
  }
  assert.ok(checked > 1000 && withArms > 100, `Stichprobe ${checked}/${withArms}`);
  // im Schwenk leuchtet nichts (das Dreh-Symbol auch nicht)
  const { sc, st } = at(-60, -500, { theta: E, s: 'R' }, 1);
  step(sc, st, { rotRight: true });
  assert.ok(sc.swing);
  assert.equal(layoutMinimap(st, sc).arms.length, 0);
  assert.equal(iconOn(sc), false);
});

test('Minimap: leuchtende Arme sind gelb und pulsieren wie das Dreh-Symbol', () => {
  const { sc, st } = at(-60, -500, { theta: E, s: 'R' }, 1);
  const styles = new Set();
  for (let i = 0; i < 30; i++) {
    step(sc, st);
    const lg = draw(sc, st);
    for (const r of lg.rects) if (/^rgba\(255,214,90/.test(r.style)) styles.add(r.style);
  }
  assert.ok(styles.size > 5, 'pulsiert');
});

// ------------------------------------------------------------------ 9. Ziel-Knochen
test('Minimap: Ziel-Knochen in Zielfarbe; außerhalb des Ausschnitts (V1/V2) ein Randpfeil in seine Richtung; V3 nur im aktuellen Gang', () => {
  const mpp = MINIMAP_SPAN / FRAME_W;
  NETZ_MAP.bones.forEach((b, i) => {
    for (const c of COMBOS) for (const v of [1, 2]) {
      // nah: Dackel steht auf dem Knochen -> Punkt in Zielfarbe
      const near1 = at(b.x, b.y, c, v);
      near1.sc.target = i;
      const Ln = layoutMinimap(near1.st, near1.sc);
      assert.equal(Ln.bone.arrow, false);
      assert.equal(Ln.bone.color, b.color);
      near(Ln.bone.x, Ln.dot.x, 1, 'Knochen am Dackel');
      const lg = draw(near1.sc, near1.st);
      assert.ok(lg.arcs.some((a) => a.style === b.color && Math.abs(a.x - Ln.bone.x) < 0.01), 'gezeichnet in Zielfarbe');
      // fern: vom Start-/Gegenpunkt aus ein Pfeil, der zum Knochen zeigt
      const far = at(-780, -500, c, v);
      far.sc.target = i;
      const Lf = layoutMinimap(far.st, far.sc);
      const r = v === 1 ? rot(b.x - far.sc.cam.x, b.y - far.sc.cam.y, -far.sc.ang) : { x: b.x - far.sc.cam.x, y: b.y - far.sc.cam.y };
      const outside = Math.abs(r.x / mpp) > FRAME_W / 2 - 2 || Math.abs(r.y / mpp) > FRAME_H / 2 - 2;
      assert.equal(Lf.bone.arrow, outside, `Pfeil ${b.name} ${name(c)} V${v}`);
      if (outside) {
        const len = Math.hypot(r.x, r.y);
        near(Lf.bone.ax, r.x / len, 1e-9, 'Pfeilrichtung x');
        near(Lf.bone.ay, r.y / len, 1e-9, 'Pfeilrichtung y');
        assert.ok(Math.abs(Lf.bone.x - FRAME_CX) <= FRAME_W / 2 && Math.abs(Lf.bone.y - FRAME_CY) <= FRAME_H / 2, 'Pfeil am Rand, im Rahmen');
      }
    }
  });
  // V3: nur wenn der Knochen im aktuellen Gang liegt
  for (const [i, b] of NETZ_MAP.bones.entries()) {
    const { sc, st } = at(-300, -500, { theta: E, s: 'R' }, 3);
    sc.target = i;
    const l = layoutMinimap(st, sc).layers[0];
    const K = sc.K;
    const inK = b.x >= K.x0 && b.x <= K.x1 && b.y >= K.y0 && b.y <= K.y1;
    assert.equal(!!l.bone, inK, `V3 Knochen ${b.name} im Gang ${K.id}: ${inK}`);
    if (l.bone) assert.equal(l.bone.color, b.color);
  }
});

// ------------------------------------------------------------------ 10. Flüssig
test('Minimap: beim Scrollen kein Sprung > 1 px/Frame (außer der Drehung im Schwenk); V3-Wechsel ist eine Überblendung', () => {
  const rng = new Rng(8102026);
  for (const v of [1, 2, 3]) {
    const sc = mk();
    const st = minimapFor(sc);
    st.version = v;
    let input = {};
    let prev = null;
    let prevKey = '';
    let maxJ = 0;
    let fadeFrames = 0;
    for (let i = 0; i < 25000; i++) {
      if (i % 24 === 0) {
        const r = rng.next();
        input = { mx: rng.next() < 0.3 ? 0 : rng.range(-1, 1), my: rng.next() < 0.3 ? 0 : rng.range(-1, 1) };
        if (r < 0.07) input.rotLeft = true;
        else if (r < 0.14) input.rotRight = true;
        else if (r < 0.17) input.wende = true;
      }
      const inp = i % 24 === 0 ? input : { mx: input.mx, my: input.my };
      const wasSwing = !!sc.swing;
      const deaths = sc.deaths;
      step(sc, st, inp);
      const respawned = sc.deaths !== deaths; // Tod/Neustart versetzt den Dackel (Netz-Regel) – kein Scrollen
      const key = sc.theta + sc.s + sc.K.id;
      const event = key !== prevKey; // Drehung/Umkehr: die Füllung wird grau, die neue beginnt (kein Sprung der Füllung, sondern ein Wechsel)
      prevKey = key;
      const L = layoutMinimap(st, sc);
      let cur;
      if (v === 3) {
        const l = L.layers[L.layers.length - 1];
        cur = { id: l.id, dot: l.dot.x, fill: l.fill && [l.fill.x0, l.fill.x1], x0: l.x0, alphaSum: L.layers.reduce((s, q) => s + q.alpha, 0), n: L.layers.length, alpha: l.alpha, ev: false };
        if (L.layers.length === 2) {
          fadeFrames++;
          near(cur.alphaSum, 1, 1e-9, 'Überblendung: Summe der Deckkraft 1');
        }
      } else {
        const corner = rot(0 - sc.cam.x, 0 - sc.cam.y, L.rot); // Kartenursprung auf der Minimap
        cur = { px: FRAME_CX + corner.x * L.k, py: FRAME_CY + corner.y * L.k, dot: L.dot, win: L.window };
      }
      if (prev && !(wasSwing || sc.swing || respawned)) {
        if (v === 3) {
          if (prev.id === cur.id) {
            const jump = Math.abs(cur.dot - prev.dot);
            maxJ = Math.max(maxJ, jump);
            assert.ok(jump <= 1, `V3 Punkt springt um ${jump} px (Frame ${i})`);
            if (!event && cur.fill && prev.fill && prev.fill[1] - prev.fill[0] > 0) assert.ok(Math.abs(cur.fill[1] - prev.fill[1]) <= 1.01 && Math.abs(cur.fill[0] - prev.fill[0]) <= 1.01, 'Füllung springt nicht');
          } else {
            // Wechsel des Balkens: die neue Deckkraft beginnt bei 0 (Überblendung), kein Sprung
            assert.ok(cur.alpha <= 1 / 15 + 1e-9, 'neuer Balken blendet ein, springt nicht ' + cur.alpha);
          }
        } else {
          const j = Math.max(Math.hypot(cur.px - prev.px, cur.py - prev.py), Math.hypot(cur.dot.x - prev.dot.x, cur.dot.y - prev.dot.y), ...cur.win.map((p, q) => Math.hypot(p.x - prev.win[q].x, p.y - prev.win[q].y)));
          maxJ = Math.max(maxJ, j);
          assert.ok(j <= 1, `V${v} Inhalt springt um ${j} px (Frame ${i})`);
        }
      }
      prev = cur;
    }
    if (v === 3) assert.ok(fadeFrames > 30, 'Überblendungen kamen vor: ' + fadeFrames);
    console.log(`# V${v}: größter Sprung ${maxJ.toFixed(3)} px/Frame`);
  }
  // Überblendung im Einzelnen: neue Deckkraft wächst gleichmäßig von 0 auf 1, die alte fällt auf 0, dann nur noch ein Balken
  const { sc, st } = at(-60, -500, { theta: E, s: 'R' }, 3);
  step(sc, st, { rotRight: true });
  let last = -1;
  let frames = 0;
  while (layoutMinimap(st, sc).layers.length === 2) {
    const L = layoutMinimap(st, sc);
    const a = L.layers[1].alpha;
    assert.ok(a > last - 1e-9 && a - Math.max(last, 0) <= 1 / 30 + 1e-9, 'gleichmäßig');
    near(L.layers[0].alpha, 1 - a, 1e-9, 'alter Balken blendet aus');
    last = a;
    step(sc, st);
    frames++;
  }
  near(frames * DT, SWING_TIME, 2 * DT, 'Dauer = Schwenk');
});

// ------------------------------------------------------------------ 11. Umschalten
test('Minimap: M schaltet V1 → V2 → V3 → aus → V1, jederzeit (auch im Schwenk); eine gezeichnete Ziffer am Rahmen zeigt die Version', () => {
  assert.deepEqual(VERSIONS, [1, 2, 3, 0]);
  const { sc, st } = at(-60, -500, { theta: E, s: 'R' }, 1);
  const seq = [];
  const digit = [];
  const f = { x: FRAME_X, y: FRAME_TOP, w: FRAME_W };
  const region = (p) => Math.abs(p.x - (f.x + f.w - 6)) <= 3 && Math.abs(p.y - (f.y + 7)) <= 4;
  const signature = (lg) =>
    lg.strokes.filter((s) => s.style === GLYPH_STYLE && s.lw === 1 && s.pts.length && s.pts.every(region)).map((s) => s.pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')).join('|');
  const expected = (ch) =>
    GLYPHS[ch].map((path) => path.map(([gx, gy]) => `${(f.x + f.w - 6 + (gx - 2)).toFixed(2)},${(f.y + 7 + (gy - 3)).toFixed(2)}`).join(' ')).join('|');
  step(sc, st, { rotRight: true }); // jetzt im Schwenk
  assert.ok(sc.swing);
  for (let i = 0; i < 8; i++) {
    step(sc, st, { map: true });
    seq.push(st.version);
    const lg = draw(sc, st);
    if (st.version === 0) assert.equal(lg.calls, 0, 'aus: nichts gezeichnet');
    else digit.push([st.version, signature(lg)]);
    assert.ok(sc.swing || i >= 4, 'M im Schwenk ist erlaubt');
  }
  assert.deepEqual(seq, [2, 3, 0, 1, 2, 3, 0, 1]);
  for (const [v, sig] of digit) assert.equal(sig, expected(String(v)), `Ziffer ${v} am Rahmen`);
  assert.equal(new Set(digit.map((d) => d[1])).size, 3, 'drei verschiedene Zeichen');
  // M ändert nichts am Spiel (siehe Zufallsspiel); hier: Eingabe wird nicht verbraucht
  assert.equal(snap(sc).includes('"map"'), false);
});

test('Minimap: Taste M, Tab und die Deck-View-Taste sind die Aktion `map`', () => {
  const src = readFileSync(new URL('../src/core/input.js', import.meta.url), 'utf8');
  assert.match(src, /KeyM: 'map'/);
  assert.match(src, /Tab: 'map'/);
  assert.match(src, /8: 'map'/);
});

test('Minimap: Anbindung – das Netz startet mit V1, P1 „Kreuzung“ mit „aus“; im echten Spiel schaltet M durch', async () => {
  const { Game } = await import('../src/game/game.js');
  const { MemoryStorage } = await import('../src/game/save.js');
  const g = new Game({ storage: new MemoryStorage(), platform: {} });
  g.startProto('netz');
  assert.equal(minimapFor(g.proto).version, 1);
  const seq = [];
  for (let i = 0; i < 4; i++) {
    g.update(DT, { map: true });
    seq.push(minimapFor(g.proto).version);
  }
  assert.deepEqual(seq, [2, 3, 0, 1]);
  g.startProto('fenster');
  assert.equal(minimapFor(g.proto).version, 0);
  g.update(DT, { map: true });
  assert.equal(minimapFor(g.proto).version, 1);
});

// ------------------------------------------------------------------ 12. Keine Schrift
test('Minimap: Der Minimap-Code ruft nie fillText/strokeText auf – N/S/W/O und Ziffern sind Striche', () => {
  const src = readFileSync(new URL('../src/proto/minimap.js', import.meta.url), 'utf8');
  assert.ok(!/fillText|strokeText|measureText|\.font\b/.test(src.replace(/\/\/.*$/gm, '')), 'Quelltext enthält keine Schrift-Aufrufe');
  let strokes = 0;
  for (const v of [1, 2, 3]) for (const c of COMBOS) for (const p of [STELLEN.A, STELLEN.F, { x: -300, y: -500 }]) {
    const { sc, st } = at(p.x, p.y, c, v);
    const lg = draw(sc, st);
    assert.equal(lg.text, 0, `keine Schrift (V${v} ${name(c)})`);
    strokes += lg.strokes.length;
  }
  assert.ok(strokes > 100, 'es wird gezeichnet (Striche)');
  // Alle vier Himmelsrichtungen und die drei Ziffern haben Strichbilder
  for (const ch of ['N', 'S', 'W', 'O', '1', '2', '3']) assert.ok(GLYPHS[ch]?.length, 'Strichbild ' + ch);
});

// ------------------------------------------------------------------ 13. Jede Karte
test('Minimap: liest nur Karte und Szene – gilt für das Netz, die P1-Kreuz-Karte und eine Karte mit eigenem Ausschnitt (minimapSpan)', () => {
  const src = readFileSync(new URL('../src/proto/minimap.js', import.meta.url), 'utf8');
  assert.ok(!/netz-map|STELLEN|NETZ_/.test(src), 'keine festen Netz-Werte im Minimap-Code');
  const eng = compileMap({
    name: 'klein',
    minimapSpan: 720,
    corridors: [
      { id: 'a', axis: 'h', c: 0, a0: -400, a1: 400, w: 160 },
      { id: 'b', axis: 'v', c: 100, a0: -300, a1: 300, w: 160 },
    ],
    bones: [{ x: -350, y: 0, color: '#abcdef', name: 'x' }, { x: 100, y: 280, color: '#fedcba', name: 'y' }],
    start: { corridor: 'a', cam: { x: -300, y: 0 }, dog: { x: 120, y: 135 }, theta: E, s: 'R', notTarget: -1 },
  });
  for (const [map, spots] of [[KREUZ_MAP, [{ x: 0, y: 0 }, { x: -300, y: 0 }, { x: 0, y: 300 }]], [NETZ_MAP, [STELLEN.A, STELLEN.F]], [eng, [{ x: 0, y: 0 }, { x: 100, y: 200 }, { x: -300, y: 0 }]]]) {
    const mpp = mapPerPx(map);
    assert.equal(mpp, (map === eng ? 720 : MINIMAP_SPAN) / FRAME_W, 'Maßstab je Karte');
    for (const c of COMBOS) for (const p of spots) for (const v of [1, 2, 3]) {
      const { sc, st } = at(p.x, p.y, c, v, map);
      const L = layoutMinimap(st, sc);
      assert.ok(L, 'Layout');
      const m = truth(sc);
      if (v === 1) near(L.dot.x, FRAME_CX + (sc.dog.x - SCREEN_W / 2) / mpp, 1, `${map.def.name} V1`);
      if (v === 2) near(L.dot.x, FRAME_CX + (m.x - sc.cam.x) / mpp, 1, `${map.def.name} V2`);
      if (v === 3) {
        const l = L.layers[0];
        assert.equal(l.id, sc.K.id);
        const jn = map.junctions.filter((q) => q.h === sc.K || q.v === sc.K);
        assert.equal(l.stubs.length, jn.reduce((s, q) => s + q.ports.filter((pr) => (sc.K.axis === 'h') === (pr === S || pr === N)).length, 0));
      }
      const lg = draw(sc, st);
      assert.equal(lg.text, 0);
      assert.equal(lg.arcs.filter((a) => a.style === '#ffffff').length, 1);
    }
  }
  // map.minimapSpan hat Vorrang vor der Beschreibung, sonst Standard
  assert.equal(mapPerPx({ minimapSpan: 240, def: {} }), 2);
  assert.equal(mapPerPx({ def: {} }), MINIMAP_SPAN / FRAME_W);
});

test('Minimap: Neue Szene = neuer Zustand; ein Lagesprung (Versetzen) erzeugt keine falsche Füllung', () => {
  const sc = mk();
  const st = newMinimapState(3);
  updateMinimap(st, sc, {}, DT);
  sc.warp(0, 0, E, 'R');
  updateMinimap(st, sc, {}, DT);
  const l = layoutMinimap(st, sc).layers[layoutMinimap(st, sc).layers.length - 1];
  assert.ok(l.fill.x1 - l.fill.x0 < 1, 'neue Füllung beginnt am Dackel');
});
