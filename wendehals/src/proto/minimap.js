// P2 „Minimap“ (Wegwerf-Prototyp, Brief: docs/prototypen/P2-minimap.md): drei Minimap-Versionen für das Netz, Umschalten mit M.
//   V1 „wie die Kamera“ (verkleinerte Kopie des Kamerabilds), V2 „Plan“ (Norden oben), V3 „Gang-Balken“ (aktueller Gang).
//
// Die Minimap hängt nur lesend an Szene und Karte (cam, ang, theta, s, K, dog, swing, turnJunction, map.*) und schreibt nie in
// die Szene: eigener Zustand je Szene (WeakMap). Keine Schrift: Buchstaben und Ziffern sind Striche (Steam Deck, Regel 8).
// Alle Zahlen sind Hypothesen (Regel 5) und stehen oben als Konstanten.
//
// Aufbau: `layoutMinimap` berechnet alle Stellen (Minimap-Pixel) aus Szene und Zustand; `drawMinimap` zeichnet genau diese
// Stellen. Tests prüfen das Layout gegen die Szene und die Zeichnung gegen das Layout.

import { DIR_VEC, DIR_SHORT, E, S, W, N, turnCW, turnCCW, opposite, isHorizontal, SCREEN_W, SCREEN_H, clamp } from '../core/math.js';
import { SWING_TIME } from './fenster.js';

export const MINIMAP_SPAN = 1440; // sichtbare Breite von V1/V2 in Karteneinheiten (3 Bildschirme); je Karte: map.minimapSpan
export const FRAME_W = 120;
export const FRAME_H = 60;
export const FRAME_TOP = 4;
export const FRAME_X = (SCREEN_W - FRAME_W) / 2;
export const FRAME_CX = FRAME_X + FRAME_W / 2;
export const FRAME_CY = FRAME_TOP + FRAME_H / 2;
export const BAR_W = 100; // V3: Balkenbreite (Brief ~110; 10 px je Seite bleiben für die Buchstaben der Gangenden)
export const BAR_H = 6;
export const STUB_LEN = 10; // V3: Länge der Abzweig-Stummel
export const STUB_W = 4;
export const ARM_GLOW_LEN = 160; // V1/V2: so weit (ab dem Kreuzungsrand) leuchtet ein Arm
export const LETTER_INSET = 6; // V1: Abstand der Himmelsrichtungs-Buchstaben vom Rahmenrand
export const JUMP = 30; // Lagesprung (Karteneinheiten) zwischen zwei Frames = Versetzen (Tests, Start), kein Drehen/Umkehren
export const VERSIONS = [1, 2, 3, 0]; // M: V1 → V2 → V3 → aus → V1

const COL = {
  back: 'rgba(12,10,18,0.74)',
  rim: 'rgba(255,255,255,0.45)',
  floor: 'rgba(196,182,160,0.9)',
  glow: [255, 214, 90],
  bar: '#4a4238',
  grey: '#8f8f95',
  fill: '#58c4ff',
  stub: '#b9ab9a',
  dot: '#ffffff',
  dotRim: '#1a1620',
};

const letterOf = (dir) => DIR_SHORT[dir]; // N, S, W, O (nur Kreuz-Richtungen)
const vecOf = (dir) => DIR_VEC[dir];

// ------------------------------------------------------------------ Zustand
const states = new WeakMap();

export function newMinimapState(version = 1) {
  return { version, cur: null, grey: {}, fade: null, prevPos: null, last: null };
}

/** Zustand der Minimap einer Szene (lazy). Das Netz startet mit V1, P1 „Kreuzung“ mit „aus“ (Brief Abschnitt 4). */
export function minimapFor(sc) {
  let st = states.get(sc);
  if (!st) {
    st = newMinimapState(sc.map?.def?.name === 'kreuz' ? 0 : 1);
    states.set(sc, st);
  }
  return st;
}

/** Wo der Dackel gezeichnet wird, als Kartenstelle (auch mitten im Schwenk richtig). Nur lesend. */
export function drawnDogMap(sc) {
  const ox = sc.dog.x - SCREEN_W / 2;
  const oy = sc.dog.y - SCREEN_H / 2;
  const c = Math.cos(sc.ang);
  const s = Math.sin(sc.ang);
  return { x: sc.cam.x + ox * c - oy * s, y: sc.cam.y + ox * s + oy * c };
}

const alongOf = (K, p) => (K.axis === 'h' ? p.x : p.y);
/** +1: wachsende Achsenkoordinate liegt im Bild rechts, −1: links (Balken immer waagerecht wie die Kamera). */
const signOf = (K, theta) => (K.axis === 'h' ? vecOf(theta)[0] : vecOf(theta)[1]) || 1;

function mergeSpans(spans) {
  const s = spans.slice().sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [lo, hi] of s) {
    const last = out[out.length - 1];
    if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
    else out.push([lo, hi]);
  }
  return out;
}

function archive(st) {
  const f = st.cur;
  if (!f || f.hi - f.lo <= 0) return;
  st.grey[f.K.id] = mergeSpans([...(st.grey[f.K.id] || []), [f.lo, f.hi]]);
}

const startFill = (K, theta, p) => {
  const a = clamp(alongOf(K, p), K.a0, K.a1);
  return { K, theta, lo: a, hi: a };
};

/** Nach jedem Szenen-Update aufrufen (60 Hz). Schaltet mit der Aktion `map` um und führt die V3-Füllung nach. */
export function updateMinimap(st, sc, input = {}, dt = 1 / 60) {
  if (input.map) st.version = VERSIONS[(VERSIONS.indexOf(st.version) + 1) % VERSIONS.length];
  const pos = drawnDogMap(sc);
  const f = st.cur;
  if (!f) {
    st.cur = startFill(sc.K, sc.theta, pos);
  } else if (sc.K !== f.K || sc.theta !== f.theta || st.curS !== sc.s || (st.prevPos && Math.hypot(pos.x - st.prevPos.x, pos.y - st.prevPos.y) > JUMP)) {
    // Drehung (90°) oder Umkehr (180°): bisherige Füllung wird grau, die neue beginnt dort, wo der Dackel in diesem Moment war
    // (Stelle am Ende des vorigen Frames; wurde er versetzt – Neustart nach dem Tod –, gilt die neue Stelle). Ein Gangwechsel ohne
    // Drehung (die Kamera wählt den Gang laufend, siehe FensterScene.selectK) beginnt ebenfalls eine neue Füllung im neuen Gang.
    const from = st.prevPos && Math.hypot(pos.x - st.prevPos.x, pos.y - st.prevPos.y) <= JUMP ? st.prevPos : pos;
    archive(st);
    st.fade = sc.K !== f.K ? { from: { K: f.K, theta: f.theta }, t: 0 } : null;
    st.cur = startFill(sc.K, sc.theta, from);
  }
  st.curS = sc.s;
  const cur = st.cur;
  const a = clamp(alongOf(cur.K, pos), cur.K.a0, cur.K.a1);
  cur.lo = Math.min(cur.lo, a);
  cur.hi = Math.max(cur.hi, a);
  if (st.fade && (st.fade.t += dt) >= SWING_TIME) st.fade = null;
  st.prevPos = pos;
}

// ------------------------------------------------------------------ Layout
/** Arme, in die gerade gedreht werden darf (canTurnBy): Kreuzung und Richtung. Im Schwenk keine (wie das Dreh-Symbol). */
export function glowingArms(sc) {
  if (sc.swing) return [];
  const arms = [];
  for (const k of [-1, 1]) {
    const j = sc.turnJunction(k);
    if (j) arms.push({ j, dir: k > 0 ? turnCW(sc.h) : turnCCW(sc.h) });
  }
  return arms;
}

const rotate = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });

/** Karteneinheiten pro Minimap-Pixel dieser Karte. */
export const mapPerPx = (map) => (map.minimapSpan ?? map.def?.minimapSpan ?? MINIMAP_SPAN) / FRAME_W;

/** Fläche eines leuchtenden Arms in Kartenkoordinaten: vom Kreuzungsrand in Richtung dir, höchstens ARM_GLOW_LEN. */
export function armRect(sc, j, dir) {
  const C = sc.map.corridorFor(j, dir);
  const L = ARM_GLOW_LEN;
  if (dir === E) return { x0: j.x1, x1: Math.min(j.x1 + L, C.x1), y0: C.y0, y1: C.y1 };
  if (dir === W) return { x0: Math.max(j.x0 - L, C.x0), x1: j.x0, y0: C.y0, y1: C.y1 };
  if (dir === S) return { x0: C.x0, x1: C.x1, y0: j.y1, y1: Math.min(j.y1 + L, C.y1) };
  return { x0: C.x0, x1: C.x1, y0: Math.max(j.y0 - L, C.y0), y1: j.y0 };
}

function layoutPlan(st, sc, version) {
  const map = sc.map;
  const k = 1 / mapPerPx(map);
  const rot = version === 1 ? -sc.ang : 0;
  const toMM = (m) => {
    const r = rotate(m.x - sc.cam.x, m.y - sc.cam.y, rot);
    return { x: FRAME_CX + r.x * k, y: FRAME_CY + r.y * k };
  };
  const L = { version, frame: { x: FRAME_X, y: FRAME_TOP, w: FRAME_W, h: FRAME_H }, k, rot, cam: { ...sc.cam } };
  L.dot = toMM(drawnDogMap(sc));
  // Fenster-Rechteck: V1 waagerecht (Größe des sichtbaren Bereichs), V2 um ang gedreht (so, wie das Fenster auf dem Plan liegt)
  const hw = (SCREEN_W / 2) * k;
  const hh = (SCREEN_H / 2) * k;
  const wr = version === 1 ? 0 : sc.ang;
  L.window = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => {
    const r = rotate(x, y, wr);
    return { x: FRAME_CX + r.x, y: FRAME_CY + r.y };
  });
  // Himmelsrichtungen: V2 fest an den Rändern, V1 auf dem Rand in Richtung der Himmelsrichtung (immer aufrecht)
  L.letters = [N, S, W, E].map((dir) => {
    let p;
    if (version === 2) {
      const v = vecOf(dir);
      p = { x: FRAME_CX + v[0] * (FRAME_W / 2 - LETTER_INSET), y: FRAME_CY + v[1] * (FRAME_H / 2 - LETTER_INSET) };
    } else {
      const v = vecOf(dir);
      const s = rotate(v[0], v[1], -sc.ang);
      const t = Math.min((FRAME_W / 2 - LETTER_INSET) / Math.max(Math.abs(s.x), 1e-9), (FRAME_H / 2 - LETTER_INSET) / Math.max(Math.abs(s.y), 1e-9));
      p = { x: FRAME_CX + s.x * t, y: FRAME_CY + s.y * t };
    }
    return { ch: letterOf(dir), dir, x: p.x, y: p.y };
  });
  L.arms = glowingArms(sc).map(({ j, dir }) => ({ j: j.id, dir, rect: armRect(sc, j, dir) }));
  // Ziel-Knochen: Punkt in Zielfarbe, außerhalb des Ausschnitts ein Randpfeil in seine Richtung
  const b = map.bones[sc.target];
  const bp = toMM(b);
  const dx = bp.x - FRAME_CX;
  const dy = bp.y - FRAME_CY;
  const inside = Math.abs(dx) <= FRAME_W / 2 - 2 && Math.abs(dy) <= FRAME_H / 2 - 2;
  if (inside) L.bone = { x: bp.x, y: bp.y, color: b.color, arrow: false };
  else {
    const t = Math.min((FRAME_W / 2 - 4) / Math.max(Math.abs(dx), 1e-9), (FRAME_H / 2 - 4) / Math.max(Math.abs(dy), 1e-9));
    L.bone = { x: FRAME_CX + dx * t, y: FRAME_CY + dy * t, color: b.color, arrow: true, ax: dx / Math.hypot(dx, dy), ay: dy / Math.hypot(dx, dy) };
  }
  return L;
}

function layoutLayer(st, sc, K, theta, alpha, isCur) {
  const sign = signOf(K, theta);
  const x0 = FRAME_CX - BAR_W / 2;
  const y = FRAME_CY;
  const len = K.a1 - K.a0;
  const px = (a) => {
    const u = clamp((a - K.a0) / len, 0, 1);
    return x0 + (sign > 0 ? u : 1 - u) * BAR_W;
  };
  const span = ([lo, hi]) => {
    const xa = px(lo);
    const xb = px(hi);
    return { x0: Math.min(xa, xb), x1: Math.max(xa, xb) };
  };
  const layer = { id: K.id, alpha, x0, x1: x0 + BAR_W, y, sign, theta };
  layer.dot = { x: px(alongOf(K, drawnDogMap(sc))), y };
  layer.grey = (st.grey[K.id] || []).map(span);
  layer.fill = isCur && st.cur ? span([st.cur.lo, st.cur.hi]) : null;
  const glow = isCur ? glowingArms(sc) : [];
  const d = vecOf(turnCW(theta));
  layer.stubs = [];
  for (const j of sc.map.junctions) {
    if (j.h !== K && j.v !== K) continue;
    const a = K.axis === 'h' ? j.cx : j.cy;
    for (const p of j.ports) {
      if (isHorizontal(p) === (K.axis === 'h')) continue; // nur Abzweige quer zum Gang
      const down = vecOf(p)[0] * d[0] + vecOf(p)[1] * d[1] > 0;
      const sx = px(a);
      const end = down ? y + BAR_H / 2 + STUB_LEN : y - BAR_H / 2 - STUB_LEN;
      layer.stubs.push({ j: j.id, dir: p, x: sx, y0: down ? y + BAR_H / 2 : end, y1: down ? end : y - BAR_H / 2, glow: glow.some((g) => g.j.id === j.id && g.dir === p), letter: { ch: letterOf(p), dir: p, x: sx, y: end + (down ? 5 : -5) } });
    }
  }
  // Eine Drehung kann auch durch die Zone einer Kreuzung erlaubt sein, die nicht an diesem Gang liegt (Zone davor/dahinter):
  // der Arm leuchtet dann als Stummel an der Stelle, wo die Kreuzung quer zum Gang liegt.
  for (const g of glow) {
    if (layer.stubs.some((q) => q.j === g.j.id && q.dir === g.dir)) continue;
    const down = vecOf(g.dir)[0] * d[0] + vecOf(g.dir)[1] * d[1] > 0;
    const sx = px(K.axis === 'h' ? g.j.cx : g.j.cy);
    const end = down ? y + BAR_H / 2 + STUB_LEN : y - BAR_H / 2 - STUB_LEN;
    layer.stubs.push({ j: g.j.id, dir: g.dir, x: sx, y0: down ? y + BAR_H / 2 : end, y1: down ? end : y - BAR_H / 2, glow: true, extra: true, letter: { ch: letterOf(g.dir), dir: g.dir, x: sx, y: end + (down ? 5 : -5) } });
  }
  // Dicht beieinander liegende Stummel derselben Richtung teilen sich einen Buchstaben (sonst überlappen die Striche)
  const shownAt = { up: [], down: [] };
  for (const st2 of layer.stubs) {
    const side = st2.y0 > y ? 'down' : 'up';
    st2.letter.shown = !shownAt[side].some((q) => q.dir === st2.dir && Math.abs(q.x - st2.x) < 6);
    if (st2.letter.shown) shownAt[side].push({ dir: st2.dir, x: st2.x });
  }
  layer.letters = [
    { ch: letterOf(opposite(theta)), dir: opposite(theta), x: x0 - 6, y },
    { ch: letterOf(theta), dir: theta, x: x0 + BAR_W + 6, y },
  ];
  // Ziel-Knochen nur, wenn er im aktuellen Gang liegt
  const b = sc.map.bones[sc.target];
  layer.bone = isCur && b.x >= K.x0 && b.x <= K.x1 && b.y >= K.y0 && b.y <= K.y1 ? { x: px(alongOf(K, b)), y, color: b.color } : null;
  return layer;
}

function layoutBars(st, sc) {
  const L = { version: 3, frame: { x: FRAME_X, y: FRAME_TOP, w: FRAME_W, h: FRAME_H }, layers: [] };
  const f = st.fade;
  const t = f ? clamp(f.t / SWING_TIME, 0, 1) : 1;
  if (f) L.layers.push(layoutLayer(st, sc, f.from.K, f.from.theta, 1 - t, false));
  L.layers.push(layoutLayer(st, sc, sc.K, sc.theta, t, true));
  L.dot = L.layers[L.layers.length - 1].dot;
  return L;
}

/** Alle Stellen der Minimap in Minimap-Pixeln (null bei „aus“). */
export function layoutMinimap(st, sc) {
  if (!st.version) return null;
  return st.version === 3 ? layoutBars(st, sc) : layoutPlan(st, sc, st.version);
}

// ------------------------------------------------------------------ Zeichnen (keine Schrift)
// Strichzeichen auf einem 4 × 6-Raster.
export const GLYPHS = {
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  S: [[[4, 0], [0, 0], [0, 3], [4, 3], [4, 6], [0, 6]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  O: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]]],
  1: [[[1, 1], [2, 0], [2, 6]], [[0, 6], [4, 6]]],
  2: [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 6], [4, 6]]],
  3: [[[0, 0], [4, 0], [4, 6], [0, 6]], [[1, 3], [4, 3]]],
};

export const GLYPH_STYLE = '#fff'; // Strichfarbe des hellen Durchgangs (Tests erkennen daran die Zeichen)

function glyph(ctx, ch, x, y, h = 6) {
  const s = h / 6;
  ctx.lineJoin = 'round';
  for (const [w, col] of [[2.4, COL.dotRim], [1, GLYPH_STYLE]]) {
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    for (const path of GLYPHS[ch]) {
      ctx.beginPath();
      path.forEach(([gx, gy], i) => {
        const px = x + (gx - 2) * s;
        const py = y + (gy - 3) * s;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
  }
}

function dotAt(ctx, p, r = 2.6) {
  ctx.fillStyle = COL.dot;
  ctx.strokeStyle = COL.dotRim;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function boneAt(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (b.arrow) {
    const px = -b.ay;
    const py = b.ax;
    ctx.moveTo(b.x + b.ax * 3, b.y + b.ay * 3);
    ctx.lineTo(b.x - b.ax * 3 + px * 3, b.y - b.ay * 3 + py * 3);
    ctx.lineTo(b.x - b.ax * 3 - px * 3, b.y - b.ay * 3 - py * 3);
    ctx.closePath();
  } else ctx.arc(b.x, b.y, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

const glowColor = (sc, base = 0.55) => `rgba(${COL.glow.join(',')},${(base + (1 - base) * (0.5 + 0.5 * Math.sin(sc.time * 6))).toFixed(3)})`;

function drawPlanMap(ctx, sc, L) {
  const f = L.frame;
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.w, f.h);
  ctx.clip();
  ctx.translate(FRAME_CX, FRAME_CY);
  ctx.rotate(L.rot);
  ctx.scale(L.k, L.k);
  ctx.translate(-L.cam.x, -L.cam.y);
  ctx.fillStyle = COL.floor;
  for (const c of sc.map.corridors) ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  ctx.fillStyle = glowColor(sc);
  for (const a of L.arms) ctx.fillRect(a.rect.x0, a.rect.y0, a.rect.x1 - a.rect.x0, a.rect.y1 - a.rect.y0);
  ctx.restore();
  // Fenster-Rechteck
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  L.window.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

function drawBars(ctx, sc, L) {
  for (const l of L.layers) {
    if (l.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = l.alpha;
    for (const s of l.stubs) {
      ctx.fillStyle = s.glow ? glowColor(sc, 0.7) : COL.stub;
      ctx.fillRect(s.x - STUB_W / 2, s.y0, STUB_W, s.y1 - s.y0);
      if (s.letter.shown) glyph(ctx, s.letter.ch, s.letter.x, s.letter.y, 5);
    }
    ctx.fillStyle = COL.bar;
    ctx.fillRect(l.x0, l.y - BAR_H / 2, l.x1 - l.x0, BAR_H);
    ctx.fillStyle = COL.grey;
    for (const g of l.grey) ctx.fillRect(g.x0, l.y - BAR_H / 2, g.x1 - g.x0, BAR_H);
    if (l.fill) {
      ctx.fillStyle = COL.fill;
      ctx.fillRect(l.fill.x0, l.y - BAR_H / 2, l.fill.x1 - l.fill.x0, BAR_H);
    }
    for (const t of l.letters) glyph(ctx, t.ch, t.x, t.y, 6);
    if (l.bone) boneAt(ctx, l.bone);
    dotAt(ctx, l.dot, 2.4);
    ctx.restore();
  }
}

export function drawMinimap(ctx, st, sc) {
  const L = layoutMinimap(st, sc);
  st.last = L;
  if (!L) return;
  const f = L.frame;
  ctx.save();
  ctx.fillStyle = COL.back;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  if (L.version === 3) drawBars(ctx, sc, L);
  else {
    drawPlanMap(ctx, sc, L);
    for (const t of L.letters) glyph(ctx, t.ch, t.x, t.y, 6);
    boneAt(ctx, L.bone);
    dotAt(ctx, L.dot);
  }
  ctx.strokeStyle = COL.rim;
  ctx.lineWidth = 1;
  ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
  glyph(ctx, String(L.version), f.x + f.w - 6, f.y + 7, 6);
  ctx.restore();
}
