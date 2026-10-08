// Abnahme-Checkliste P1c „Netz“ (docs/prototypen/P1c-netz.md, Abschnitt 2) als Tests aus Spielersicht:
// gemessen werden Kartenposition und Bildschirmstelle des Dackels (und die Kamera), nicht nur Kamerawerte.
// Stellen A–I: siehe STELLEN in src/proto/netz-map.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, W, N, CARDINALS, DIR_VEC, turnCW, turnCCW, opposite, headingAngle, SCREEN_W, SCREEN_H, HEADING_CODES } from '../src/core/math.js';
import { Rng } from '../src/core/rng.js';
import { FensterScene, SWING_TIME, TURN_AHEAD, DOG_R, DOG_MARGIN, SPEED, DOG_SPEED, BONE_R } from '../src/proto/fenster.js';
import { NETZ_DEF, NETZ_MAP, STELLEN, RING } from '../src/proto/netz-map.js';
import { drawFenster } from '../src/proto/fenster-draw.js';
import { NavBot } from './helpers/netz-bot.mjs';

const DT = 1 / 60;
const COMBOS = CARDINALS.flatMap((theta) => ['R', 'L'].map((s) => ({ theta, s })));
const hOf = (theta, s) => (s === 'R' ? theta : opposite(theta));
const name = (c) => `θ=${HEADING_CODES[c.theta]} s=${c.s}`;
const nd = (x) => Number(x.toFixed(1));
const MOVING = 0.5; // Richtungsknick zählt nur bei sichtbarer Bewegung (≥ 0,5 E/Frame = 30 E/s, wie im P1-Test)

const mk = () => {
  const sc = new FensterScene({ map: NETZ_MAP });
  sc.hint = 0;
  return sc;
};
const warp = (mx, my, c, dogScreen) => mk().warp(mx, my, c.theta, c.s, dogScreen);
const rVec = (sc) => DIR_VEC[sc.theta];
const dVec = (sc) => DIR_VEC[turnCW(sc.theta)];
/** Karten-Wunschrichtung (Vektor) -> Stickwerte in Bildschirmkoordinaten */
const stick = (sc, vx, vy) => {
  const r = rVec(sc);
  const d = dVec(sc);
  const len = Math.hypot(vx, vy) || 1;
  return { mx: (vx * r[0] + vy * r[1]) / len, my: (vx * d[0] + vy * d[1]) / len };
};

// ------------------------------------------------------------------ Messgerät
/** Misst pro Frame, was der Spieler sieht: Dackel (Karte + Bildschirm) und Kamera. Sammelt Verstöße gegen die Checkliste. */
class Monitor {
  constructor(sc, label = '') {
    this.sc = sc;
    this.label = label;
    this.prev = this.snap();
    this.pd = null;
    this.maxJump = 0;
    this.maxKink = 0;
    this.maxSwingRate = 0;
    this.deaths = 0;
    this.frames = 0;
    this.sinceSwing = 1e9;
    this.hist = [];
    this.sideDrift = 0; // größte seitliche Verschiebung des Dackels in der Karte ohne Eingabe
    this.swingDrift = 0;
  }
  snap() {
    const sc = this.sc;
    // Kartenstelle unter dem Dackel, wie sie gezeichnet wird (Plan um −ang gedreht): auch mitten im Schwenk richtig
    const ox = sc.dog.x - SCREEN_W / 2;
    const oy = sc.dog.y - SCREEN_H / 2;
    const c = Math.cos(sc.ang);
    const sn = Math.sin(sc.ang);
    const m = { x: sc.cam.x + ox * c - oy * sn, y: sc.cam.y + ox * sn + oy * c };
    return { m, cam: { ...sc.cam }, dog: { ...sc.dog }, theta: sc.theta, swing: !!sc.swing, dir: sc.dir, ang: sc.ang, deaths: sc.deaths };
  }
  /** nach sc.update(dt, input) aufrufen */
  /** Neu aufsetzen, nachdem ein Test die Lage mit warp() verändert hat (kein Kamera-Sprung für den Spieler). */
  reset() {
    this.prev = this.snap();
    this.pd = null;
  }
  step(input = {}) {
    const sc = this.sc;
    const cur = this.snap();
    const p = this.prev;
    const at = `${this.label} Frame ${this.frames}`;
    this.sinceSwing = cur.ang !== p.ang || cur.swing ? 0 : this.sinceSwing + 1;
    assert.ok(Number.isFinite(cur.m.x) && Number.isFinite(cur.m.y) && Number.isFinite(cur.cam.x) && Number.isFinite(cur.cam.y), 'endlich ' + at);
    if (!cur.swing) assert.ok(sc.map.walkable(cur.m.x, cur.m.y, 0), `Dackel auf dem Boden ${at} (${nd(cur.m.x)}, ${nd(cur.m.y)})`);
    // lebendig heißt: Kreis des Dackels berührt weder Wand noch Bildrand
    assert.ok(cur.dog.x >= DOG_R && cur.dog.x <= SCREEN_W - DOG_R && cur.dog.y >= DOG_R && cur.dog.y <= SCREEN_H - DOG_R, `Dackel im Bild ${at}: ${nd(cur.dog.x)},${nd(cur.dog.y)}`);
    if (cur.deaths !== p.deaths) {
      // Tod und Neustart an der letzten Kreuzung (Robin 08.10.2026): gewollter Sprung, kein Messwert für Kamera/Dackel
      this.deaths += cur.deaths - p.deaths;
      this.prev = cur;
      this.pd = null;
      this.frames++;
      return;
    }
    const b = sc.map.bounds;
    // Levelbereich: Das Fenster scrollt ungebremst weiter, aber der Dackel lebt nur auf der Karte und die Fenstermitte liegt höchstens
    // eine halbe Bildbreite (240, im Schwenk um den Dackel am Bildrand) neben ihm.
    const slack = 260;
    assert.ok(cur.cam.x >= b.x0 - slack && cur.cam.x <= b.x1 + slack && cur.cam.y >= b.y0 - slack && cur.cam.y <= b.y1 + slack, `Kamera im Levelbereich ${at}: ${nd(cur.cam.x)},${nd(cur.cam.y)} θ=${HEADING_CODES[sc.theta]} K=${sc.K.id}`);
    // Kamera: Sprung und Richtungsknick. Im Schwenk kreist die Fenstermitte um den Dackel (das Bild dreht sich um ihn):
    // dort zählt statt des Wegs der Drehwinkel pro Frame (≤ 0,1 rad).
    const dv = { x: cur.cam.x - p.cam.x, y: cur.cam.y - p.cam.y };
    const jump = Math.hypot(dv.x, dv.y);
    this.hist.push(`  f${this.frames} d=(${dv.x.toFixed(3)},${dv.y.toFixed(3)}) vc=${sc.vc.toFixed(1)} dog=(${nd(sc.dog.x)},${nd(sc.dog.y)}) dir=${sc.dir.toFixed(2)} in=${JSON.stringify(input)}`);
    if (this.hist.length > 6) this.hist.shift();
    const swinging = cur.ang !== p.ang;
    if (swinging) {
      this.maxSwingRate = Math.max(this.maxSwingRate, Math.abs(cur.ang - p.ang));
      assert.ok(Math.abs(cur.ang - p.ang) <= 0.1, `Schwenk dreht ${Math.abs(cur.ang - p.ang).toFixed(3)} rad/Frame ${at}`);
    } else {
      this.maxJump = Math.max(this.maxJump, jump);
      assert.ok(jump <= 4, `Kamera springt ${jump.toFixed(2)} ${at}`);
    }
    const steady = Math.abs(cur.dir) > 0.999 && Math.abs(p.dir) > 0.999 && !swinging; // ohne 180°-Umkehr
    if (jump >= MOVING && steady) {
      if (this.pd) {
        const a = Math.abs(Math.atan2(dv.x * this.pd.y - dv.y * this.pd.x, dv.x * this.pd.x + dv.y * this.pd.y));
        this.maxKink = Math.max(this.maxKink, a);
        assert.ok(a <= 0.1, `Kamera knickt ${a.toFixed(3)} rad ${at}\n${this.hist.join('\n')}`);
      }
      this.pd = dv;
    } else this.pd = null;
    // Kartenposition des Dackels: nur in Scrollrichtung, im Schwenk gar nicht
    const dm = { x: cur.m.x - p.m.x, y: cur.m.y - p.m.y };
    if (p.swing || cur.swing) {
      this.swingDrift = Math.max(this.swingDrift, Math.hypot(dm.x, dm.y));
      if (p.swing && cur.swing) assert.ok(Math.hypot(dm.x, dm.y) < 1e-6, `Dackel bewegt sich im Schwenk ${at}`);
    } else if (!(input.mx || input.my)) {
      const r = DIR_VEC[cur.theta];
      const side = Math.abs(dm.x * r[1] - dm.y * r[0]);
      this.sideDrift = Math.max(this.sideDrift, side);
      assert.ok(side < 1e-6, `Dackel wird seitlich verschoben (${side.toFixed(4)}) ${at}`);
    }
    this.prev = cur;
    this.frames++;
  }
}
const play = (sc, frames, input = {}, mon = new Monitor(sc)) => {
  for (let i = 0; i < frames; i++) {
    sc.update(DT, input);
    mon.step(input);
  }
  return mon;
};
const finishSwing = (sc, mon) => {
  let n = 0;
  while (sc.swing && n++ < 100) {
    sc.update(DT, {});
    mon?.step({});
  }
};

// ------------------------------------------------------------------ Orakel für die Drehregeln (unabhängig vom Spielcode)
const rawRect = (c) => (c.axis === 'h' ? { x0: c.a0, x1: c.a1, y0: c.c - c.w / 2, y1: c.c + c.w / 2 } : { x0: c.c - c.w / 2, x1: c.c + c.w / 2, y0: c.a0, y1: c.a1 });
const SQUARES = [];
for (const h of NETZ_DEF.corridors.filter((c) => c.axis === 'h')) {
  for (const v of NETZ_DEF.corridors.filter((c) => c.axis === 'v')) {
    const a = rawRect(h);
    const b = rawRect(v);
    const q = { x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) };
    if (q.x1 - q.x0 > 0 && q.y1 - q.y0 > 0) SQUARES.push({ ...q, id: h.id + '×' + v.id });
  }
}
/** Ein Gang führt von der Kreuzung in Richtung dir weg ⇔ kurz hinter der Mitte der Quadratkante ist Boden. */
const leadsAway = (q, dir) => {
  const cx = (q.x0 + q.x1) / 2;
  const cy = (q.y0 + q.y1) / 2;
  const probe = { [E]: [q.x1 + 6, cy], [W]: [q.x0 - 6, cy], [S]: [cx, q.y1 + 6], [N]: [cx, q.y0 - 6] }[dir];
  return NETZ_MAP.walkable(probe[0], probe[1], 0);
};
const inBriefZone = (q, p, dir) => {
  const x0 = q.x0 + DOG_R, x1 = q.x1 - DOG_R, y0 = q.y0 + DOG_R, y1 = q.y1 - DOG_R;
  const inside = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  if (inside) return true;
  // vor/hinter dem Quadrat, bis TURN_AHEAD, nur in angeschlossenen Gängen
  for (const d of CARDINALS) {
    if (!leadsAway(q, d)) continue;
    const [vx, vy] = DIR_VEC[d];
    const along = (p.x - (vx > 0 ? x1 : x0)) * vx + (p.y - (vy > 0 ? y1 : y0)) * vy;
    const lat = vx ? p.y : p.x;
    const lo = vx ? y0 : x0, hi = vx ? y1 : x1;
    if (along > 0 && along <= TURN_AHEAD && lat >= lo && lat <= hi) return true;
  }
  return false;
};
/** Darf man aus dieser Lage in hNew drehen? (Brief, Abschnitt 3, Regeln 1 und 2) */
const oracleTurn = (p, hNew) => SQUARES.some((q) => inBriefZone(q, p, hNew) && leadsAway(q, hNew));

// ------------------------------------------------------------------ Raster um die Stellen
const gridAround = (c, R = 240, step = 80) => {
  const pts = [];
  for (let dx = -R; dx <= R; dx += step) for (let dy = -R; dy <= R; dy += step) {
    const x = c.x + dx;
    const y = c.y + dy;
    if (NETZ_MAP.walkable(x, y, DOG_R)) pts.push({ x, y });
  }
  return pts;
};
const STELLEN_RASTER = { ...STELLEN, I2: { x: RING.RX0, y: RING.RY1 } };

// ================================================================== Karte
test('Netz: Karte – Kreuzungsformen A–I wie im Brief (Ports, Überlappung, Breiten)', () => {
  const j = (id) => NETZ_MAP.junctions.find((q) => q.id === id);
  const ports = (id) => [...j(id).ports].sort((a, b) => a - b);
  const set = (...p) => p.sort((a, b) => a - b);
  assert.deepEqual(ports('mitte-h×mitte-v'), set(E, S, W, N), 'A: + Kreuzung');
  assert.deepEqual(ports('nord×mitte-v'), set(E, S, W), 'B: T-Kreuzung');
  assert.deepEqual(ports('nord×ost'), set(S, W), 'C: L-Knick Nordost');
  assert.deepEqual(ports('nord×west'), set(E, S), 'C: L-Knick Nordwest');
  assert.deepEqual(ports('sued×ost'), set(W, N), 'C: L-Knick Südost');
  assert.deepEqual(ports('sued×west'), set(E, N), 'C: L-Knick Südwest');
  assert.deepEqual(ports('mitte-h×stummel-h'), set(E, W, N), 'D/H: Kreuzung mit Stummel nach Norden');
  assert.deepEqual(ports('mitte-h×abzweig-n'), set(E, W, N), 'E: Abzweig nach Norden');
  assert.deepEqual(ports('mitte-h×abzweig-s'), set(E, S, W), 'E: Abzweig nach Süden');
  assert.equal(NETZ_MAP.junctions.length, 12);
  // D: Abstand der Kreuzungsmitten ≈ 260, die Dreh-Zonen überlappen wirklich
  const a = j('mitte-h×mitte-v');
  const d = j('mitte-h×stummel-h');
  assert.ok(Math.abs(d.cx - a.cx - 260) < 1);
  const zoneA = [a.x0 + DOG_R - TURN_AHEAD, a.x1 - DOG_R + TURN_AHEAD];
  const zoneD = [d.x0 + DOG_R - TURN_AHEAD, d.x1 - DOG_R + TURN_AHEAD];
  assert.ok(zoneA[1] > zoneD[0], 'Zonen A und D überlappen');
  // E: zwei Abzweige dicht hintereinander, einer links, einer rechts
  const e1 = j('mitte-h×abzweig-n');
  const e2 = j('mitte-h×abzweig-s');
  assert.ok(e2.x0 - e1.x1 > 0 && e2.x0 - e1.x1 < 160, 'E: Abzweige dicht hintereinander');
  // F breiter Raum 400 hoch, G schmaler Gang 120, H Stummel kürzer als ein Bildschirm
  assert.equal(NETZ_MAP.halfWidthAt(NETZ_MAP.byId.sued, 350), 200);
  assert.equal(NETZ_MAP.halfWidthAt(NETZ_MAP.byId.sued, 0), 100);
  assert.equal(NETZ_MAP.byId.west.w, 120);
  const h = NETZ_MAP.byId['stummel-h'];
  assert.ok(h.a1 - d.y0 < 480 && d.y0 - h.a0 < 480, 'Stummel kürzer als ein Bildschirm');
  // Knochen an mehreren Stellen, alle auf begehbarem Boden, mit verschiedenen Farben
  assert.ok(NETZ_MAP.bones.length >= 5);
  assert.equal(new Set(NETZ_MAP.bones.map((b) => b.color)).size, NETZ_MAP.bones.length);
  for (const b of NETZ_MAP.bones) assert.ok(NETZ_MAP.walkable(b.x, b.y, DOG_R), 'Knochen ' + b.name);
  // Start im Netz, Prototyp läuft sofort
  const sc = mk();
  assert.ok(sc.walkable(sc.dogMap().x, sc.dogMap().y));
});

// ================================================================== Drehregeln (Brief Abschnitt 3)
test('Netz: Drehen nur in der Dreh-Zone und nur, wenn in der neuen Flugrichtung ein Gang wegführt – an allen Stellen A–I', () => {
  let checked = 0;
  let allowed = 0;
  for (const st of Object.values(STELLEN_RASTER)) {
    for (const p of gridAround(st, 260, 65)) {
      for (const c of COMBOS) {
        const h = hOf(c.theta, c.s);
        for (const k of [-1, 1]) {
          const hNew = k > 0 ? turnCW(h) : turnCCW(h);
          const want = oracleTurn(p, hNew);
          const sc = warp(p.x, p.y, c);
          assert.equal(sc.canTurnBy(k), want, `canTurnBy(${k}) bei (${p.x},${p.y}) ${name(c)}`);
          sc.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
          assert.equal(!!sc.swing, want, `Drehung angenommen bei (${p.x},${p.y}) ${name(c)} k=${k}`);
          if (!want) {
            assert.equal(sc.theta, c.theta, 'abgelehnt: Ausrichtung bleibt');
            assert.equal(sc.denied?.side, k > 0 ? 'R' : 'L');
            assert.deepEqual(sc.sfx, ['nope']);
          } else {
            assert.equal(sc.theta, k > 0 ? turnCW(c.theta) : turnCCW(c.theta));
            assert.equal(sc.s, c.s, 's bleibt');
            allowed++;
          }
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 1000 && allowed > 200, `genug Lagen geprüft: ${checked}, davon erlaubt ${allowed}`);
});

test('Netz: Drehregeln an den Grenzfällen – L-Knick eine, T-Kreuzung je nach Richtung eine oder zwei, + Kreuzung beide', () => {
  const can = (x, y, theta, s = 'R') => {
    const sc = warp(x, y, { theta, s });
    return [sc.canTurnBy(-1), sc.canTurnBy(1)];
  };
  // C: Nordost-Ecke. Flug nach Osten: links (Norden) gibt es nicht, rechts (Süden) schon.
  assert.deepEqual(can(700, -500, E), [false, true]);
  assert.deepEqual(can(560, -500, E), [false, true], 'schon in der Toleranz vor dem Knick');
  assert.deepEqual(can(700, -420, S), [false, true], 'Flug nach Süden in der Ecke: links wäre Osten (gibt es nicht), rechts Westen');
  // Flug nach Westen in die Ecke hinein (s = L, Plan kopfüber): in der Ecke geht es nur nach Süden
  assert.deepEqual(can(700, -500, W, 'L'), can(700, -500, E), 'gleiche Blickrichtung E → gleiche Regel');
  // B: Nord-T. Flug nach Osten: Norden gibt es nicht, Süden schon. Flug nach Süden aus dem Mittelgang: Westen und Osten.
  assert.deepEqual(can(0, -500, E), [false, true]);
  assert.deepEqual(can(0, -500, W), [true, false]);
  assert.deepEqual(can(0, -500, S), [true, true], 'von Norden in die T-Kreuzung: beide Seiten');
  assert.deepEqual(can(0, -500, N), [true, true], 'Flug nach Norden in die Wand: links und rechts geht der Ring weiter');
  // A: + Kreuzung, beide Drehungen in jeder Richtung
  for (const t of CARDINALS) assert.deepEqual(can(0, 0, t), [true, true]);
  // mitten im Gang: nicht
  assert.deepEqual(can(-420, -500, E), [false, false]);
  // zwischen den Zonen von E1 und E2 (Westgang): nicht – der Platz zwischen den Abzweigen liegt in beiden Zonen, davor/dahinter nicht
  assert.deepEqual(can(-790, 0, E), [true, true], 'T-Kreuzung West: Zone');
  assert.deepEqual(can(-430, -500, W), [false, false], 'Nord-Ring zwischen den Zonen');
});

test('Netz: überlappende Dreh-Zonen (Stelle D) wirken wie eine – das Symbol erlischt zwischen A und D nie', () => {
  for (const c of [{ theta: E, s: 'R' }, { theta: W, s: 'L' }, { theta: E, s: 'L' }, { theta: W, s: 'R' }]) {
    const sc = warp(-260, 0, c);
    const h = hOf(c.theta, c.s);
    const east = h === E;
    // in Flugrichtung von x = −560 (E2/A) bis +500 (D) fliegen – oder rückwärts
    sc.warp(east ? -560 : 500, 0, c.theta, c.s);
    let lit = 0;
    let frames = 0;
    let prevLit = null;
    let flips = 0;
    const mon = new Monitor(sc, 'D ' + name(c));
    for (let i = 0; i < 60 * 12; i++) {
      const m = sc.dogMap();
      if (east ? m.x > 500 : m.x < -560) break;
      const on = sc.canTurn;
      if (prevLit !== null && on !== prevLit) flips++;
      prevLit = on;
      assert.ok(on, `Symbol leuchtet bei x=${nd(m.x)} ${name(c)}`);
      lit++;
      sc.update(DT, { mx: 0, my: 0 });
      mon.step();
      frames++;
    }
    assert.ok(frames > 300, 'Strecke durchflogen: ' + frames);
    assert.equal(flips, 0, 'kein Flackern');
    assert.equal(lit, frames);
  }
  // Zwischen A und D (x = 130) beide Zonen: links (Norden) geht (beide), rechts (Süden) nur wegen A; bei x = 300 nur noch links.
  const mid = warp(130, 0, { theta: E, s: 'R' });
  assert.deepEqual([mid.canTurnBy(-1), mid.canTurnBy(1)], [true, true]);
  const far = warp(330, 0, { theta: E, s: 'R' });
  assert.deepEqual([far.canTurnBy(-1), far.canTurnBy(1)], [true, false], 'hinter A nur noch D: Stummel nach Norden');
});

// ================================================================== Rückmeldung, Schwenk, Eingabe
test('Netz: Schwenk dauert 0,5 s, pausiert das Spiel, ignoriert Eingaben; „rechts“ bleibt rechts', () => {
  for (const c of COMBOS) {
    const sc = warp(0, 0, c);
    const dog0 = { ...sc.dog };
    const m0 = sc.dogMap();
    sc.update(DT, { rotRight: true });
    assert.ok(sc.swing, 'Schwenk läuft ' + name(c));
    const theta1 = sc.theta;
    let frames = 0;
    const camStart = { ...sc.cam };
    const dirStart = sc.dir;
    while (sc.swing && frames < 100) {
      sc.update(DT, { mx: 1, my: -1, rotLeft: true, wende: true, rotRight: true });
      const m = sc.dogMap();
      assert.ok(Math.hypot(m.x - m0.x, m.y - m0.y) < 1e-6, 'Dackel bleibt an seiner Kartenstelle');
      assert.deepEqual(sc.dog, dog0, 'und an seiner Bildschirmstelle');
      frames++;
    }
    assert.ok(frames >= 29 && frames <= 31, `0,5 s = 30 Frames, war ${frames}`);
    assert.equal(sc.theta, theta1, 'Drücke im Schwenk ignoriert');
    assert.equal(sc.s, c.s);
    assert.equal(sc.dir, dirStart);
    assert.ok(Math.hypot(sc.cam.x - camStart.x, sc.cam.y - camStart.y) < 1e-6, 'Dackel im Bildmittelpunkt: die Kamera bewegt sich im Schwenk nicht');
    // danach wirkt „rechts“ bildschirmbezogen
    const x0 = sc.dog.x;
    play(sc, 15, { mx: 1 });
    assert.ok(sc.dog.x > x0 + 5, 'rechts bleibt rechts ' + name(c));
    const y0 = sc.dog.y;
    play(sc, 5, { my: 1 });
    assert.ok(sc.dog.y >= y0, 'unten bleibt unten');
  }
});

test('Netz: Rückmeldung – Symbol leuchtet, wenn mindestens eine Drehung geht; abgelehnter Druck wackelt rot mit Ton; HUD dreht nie mit', () => {
  const calls = [];
  const rot = (ctx) => ctx.stack[ctx.stack.length - 1].rot;
  const base = {
    stack: [{ rot: 0 }],
    save() { this.stack.push({ ...this.stack[this.stack.length - 1] }); },
    restore() { this.stack.pop(); },
    translate() {}, scale() {},
    rotate(a) { this.stack[this.stack.length - 1].rot += a; },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, clip() {}, stroke() {},
    fillRect() { calls.push(['fillRect', rot(this), this.fillStyle]); },
    strokeRect() {}, rect() {},
    arc(x, y, r) { calls.push(['arc', rot(this), r, this.fillStyle]); },
    fill() { calls.push(['fill', rot(this), this.fillStyle]); },
    fillText() { calls.push(['text', rot(this)]); },
    createLinearGradient() { return { addColorStop() {} }; },
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, shadowBlur: 0, shadowColor: '', font: '', textAlign: '', textBaseline: '',
  };
  // alles, was nicht aufgezeichnet wird (Kurven, Verläufe …), ist ein leerer Aufruf
  const ctx = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
  const norm = (a) => Math.abs(((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  for (const theta of CARDINALS) {
    const sc = warp(0, -500, { theta, s: 'R' }); // B: T-Kreuzung
    sc.hint = 5;
    sc.ang = headingAngle(theta);
    // an der Kreuzung: Symbol an (mindestens eine Drehung geht)
    calls.length = 0;
    drawFenster(ctx, sc);
    const iconOn = calls.find((c) => c[0] === 'arc' && c[2] === 13);
    assert.ok(iconOn, 'Symbol gezeichnet');
    assert.match(String(iconOn[3]), /^rgba\(255,214,90/, 'leuchtet (gelb) an der Kreuzung ' + HEADING_CODES[theta]);
    // alles, was der HUD zeichnet (Text, Symbol), steht ohne Drehung
    for (const c of calls.filter((c) => c[0] === 'text')) assert.ok(norm(c[1]) < 1e-9, 'Text dreht nicht mit');
    assert.ok(norm(iconOn[1]) < 1e-9, 'Symbol dreht nicht mit');
    // im Gang: grau
    const gang = warp(-300, -500, { theta, s: 'R' });
    calls.length = 0;
    drawFenster(ctx, gang);
    const iconOff = calls.find((c) => c[0] === 'arc' && c[2] === 13);
    assert.equal(iconOff[3], '#3a3640', 'grau im Gang');
  }
  // abgelehnt: wackelt rot mit Ton
  const sc = warp(-300, -500, { theta: E, s: 'R' });
  sc.update(DT, { rotLeft: true });
  assert.equal(sc.denied.side, 'L');
  assert.deepEqual(sc.sfx, ['nope']);
  calls.length = 0;
  drawFenster(ctx, sc);
  assert.match(String(calls.find((c) => c[0] === 'arc' && c[2] === 13)[3]), /^rgba\(220,50,50/, 'rot');
  play(sc, 40);
  assert.equal(sc.denied, null);
});

// ================================================================== Hin- und Zurückdrehen, viele Drehungen (Ring I)
const picture = (sc) => ({ theta: sc.theta, s: sc.s, ang: ((sc.ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), cam: { ...sc.cam }, dog: { ...sc.dog }, m: sc.dogMap() });
const samePicture = (a, b, label) => {
  assert.equal(a.theta, b.theta, label + ' θ');
  assert.equal(a.s, b.s, label + ' s');
  const da = Math.abs(a.ang - b.ang);
  assert.ok(da < 1e-6 || Math.abs(da - 2 * Math.PI) < 1e-6, label + ' Bildwinkel');
  for (const k of ['x', 'y']) {
    assert.ok(Math.abs(a.cam[k] - b.cam[k]) < 1e-6, `${label} Kamera ${k}: ${a.cam[k]} vs ${b.cam[k]}`);
    assert.ok(Math.abs(a.dog[k] - b.dog[k]) < 1e-6, `${label} Dackel (Bild) ${k}`);
    assert.ok(Math.abs(a.m[k] - b.m[k]) < 1e-6, `${label} Dackel (Karte) ${k}`);
  }
};

test('Netz: Hin- und Zurückdrehen ergibt dasselbe Bild – auch zu früh gedreht, an allen Stellen', () => {
  let n = 0;
  for (const st of Object.values(STELLEN_RASTER)) {
    for (const p of gridAround(st, 240, 120)) {
      for (const c of COMBOS) {
        const h = hOf(c.theta, c.s);
        for (const k of [-1, 1]) {
          if (!oracleTurn(p, k > 0 ? turnCW(h) : turnCCW(h))) continue;
          const sc = warp(p.x, p.y, c, { x: 200, y: 150 });
          const before = picture(sc);
          sc.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
          finishSwing(sc);
          // zurück: wieder drehen (Gegenrichtung); an dieser Stelle ist die Drehung zurück immer erlaubt (gleiche Zone, alter Gang)
          if (!sc.canTurnBy(-k)) continue; // zu früh gedreht in einen Gang, aus dem man nicht zurückdrehen darf – dann gibt es kein „Zurück“
          sc.update(DT, k > 0 ? { rotLeft: true } : { rotRight: true });
          finishSwing(sc);
          samePicture(picture(sc), before, `(${p.x},${p.y}) ${name(c)} k=${k}`);
          n++;
        }
      }
    }
  }
  assert.ok(n > 300, 'geprüfte Paare: ' + n);
});

test('Netz: viele Drehungen hintereinander (Ring I, auch kopfüber) zurück zur Ausgangsrichtung ergeben wieder dasselbe Bild', () => {
  const folgen = [[1, 1, 1, 1], [-1, -1, -1, -1], [1, 1, -1, -1], [1, -1, 1, -1, 1, 1, 1, 1, -1, -1, -1, -1, 1, -1]];
  for (const c of COMBOS) {
    for (const ort of [STELLEN.A, { x: 130, y: 0 }, { x: -120, y: 0 }]) {
      for (const seq of folgen) {
        const sc = warp(ort.x, ort.y, c);
        if (!sc.canTurnBy(1) || !sc.canTurnBy(-1)) continue; // nur dort, wo beide Richtungen gehen (A, D)
        const before = picture(sc);
        for (const k of seq) {
          sc.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
          finishSwing(sc);
        }
        samePicture(picture(sc), before, `Ring ${name(c)} ${seq.join('')}`);
      }
    }
  }
  // Ring I: einmal rechtsherum (Uhrzeigersinn) und einmal linksherum, jeweils vier Ecken, Ausgangsrichtung wieder erreicht
  const bot = new NavBot(NETZ_MAP);
  const ecken = [[RING.RX1, RING.RY0], [RING.RX1, RING.RY1], [RING.RX0, RING.RY1], [RING.RX0, RING.RY0]];
  for (const richtung of ['rechtsherum', 'linksherum', 'kopfüber']) {
    const sc = warp(RING.RX0 + 20, RING.RY0, { theta: richtung === 'kopfüber' ? W : E, s: richtung === 'kopfüber' ? 'L' : 'R' });
    const mon = new Monitor(sc, 'Ring ' + richtung);
    const theta0 = sc.theta;
    const folge = richtung === 'linksherum' ? [...ecken].reverse() : ecken;
    let turns = 0;
    const start = sc.theta;
    for (const [ex, ey] of [...folge, folge[folge.length - 1]]) {
      let t = 0;
      while (Math.hypot(sc.dogMap().x - ex, sc.dogMap().y - ey) > 30 && t++ < 60 * 40) {
        const inp = bot.control(sc, ex, ey);
        if (inp.rotLeft || inp.rotRight) turns++;
        sc.update(DT, inp);
        mon.step(inp);
      }
      assert.ok(t < 60 * 40, `Ecke (${ex},${ey}) erreicht (${richtung})`);
    }
    assert.ok(turns >= 3, `Drehungen im Ring ${richtung}: ${turns}`);
    finishSwing(sc, mon);
    assert.ok(sc.theta === start || turns > 0);
    assert.equal(sc.deaths, 0, 'der Bot fliegt die Runde ohne Tod');
    assert.ok(mon.maxKink <= 0.1 && mon.maxJump <= 4);
    void theta0;
  }
});

// ================================================================== Zu früh gedreht (Brief Regel 3)
/** Spieler lenkt nach einer Drehung in den neuen Gang K: quer zur Gangmitte, solange er noch draußen steht auch gegen das Scrollen. */
const steerIntoGang = (sc, brake = 0.5) => {
  const K = sc.K;
  const hv = DIR_VEC[sc.h];
  const lat = K.axis === 'h' ? [0, 1] : [1, 0];
  const m = sc.dogMap();
  const err = K.c - (m.x * lat[0] + m.y * lat[1]);
  const lc = Math.max(-1, Math.min(1, err / 10));
  const draussen = !sc.inGang(m);
  const f = draussen ? -brake : 0;
  return stick(sc, lat[0] * lc * 0.85 + hv[0] * f, lat[1] * lc * 0.85 + hv[1] * f);
};

test('Netz: zu früh gedreht – die Kamera trägt den Dackel in Flugrichtung weiter; wer nicht lenkt, stirbt und beginnt an der letzten Kreuzung neu', () => {
  // C: Nordost-Ecke, 40 vor dem Knick (Dackel x = 560) Richtung Osten, rechts (Süden) drehen
  const c = { theta: E, s: 'R' };
  const sc = warp(560, -500, c);
  const m0 = sc.dogMap();
  const mon = new Monitor(sc, 'früh');
  assert.ok(sc.canTurnBy(1));
  sc.update(DT, { rotRight: true });
  mon.step({ rotRight: true });
  assert.equal(sc.h, S);
  finishSwing(sc, mon);
  const m1 = sc.dogMap();
  assert.ok(Math.hypot(m1.x - m0.x, m1.y - m0.y) < 1e-6, 'die Drehung ändert die Kartenposition nie');
  // ohne Eingabe trägt das Scrollen den Dackel mit SPEED nach Süden – in die Wand des alten Gangs
  play(sc, 30, {}, mon);
  const m2 = sc.dogMap();
  assert.ok(Math.abs(m2.x - m0.x) < 1e-6 && Math.abs(m2.y - m0.y - SPEED * 0.5) < 1.5, 'Dackel wird mit SPEED in Flugrichtung getragen: ' + nd(m2.y - m0.y));
  assert.equal(sc.dog.x, SCREEN_W / 2, 'er bleibt längs der Flugrichtung an seiner Bildschirmstelle (quer gleicht die Kamera nur aus)');
  assert.equal(sc.deaths, 0);
  play(sc, 90, {}, mon);
  assert.equal(sc.deaths, 1, 'die Wand tötet ihn');
  assert.ok(sc.respawn, 'kurzer Neustart');
  const cp = sc.dogMap();
  assert.ok(sc.map.walkable(cp.x, cp.y, DOG_R), 'Neustart auf Boden');
  play(sc, 60, {}, mon);
  assert.ok(!sc.respawn, 'Neustart ist nach kurzer Zeit vorbei');
  assert.equal(sc.score, 0, 'ohne Strafe');

  // Wer rechtzeitig lenkt, kommt in den Gang (Gang Ost: Süden = Bild rechts) und wird dort weiter getragen
  const ok = warp(560, -500, c);
  const mon2 = new Monitor(ok, 'früh gelenkt');
  ok.update(DT, { rotRight: true });
  mon2.step({ rotRight: true });
  finishSwing(ok, mon2);
  let inGang = -1;
  for (let i = 0; i < 60 * 3 && inGang < 0; i++) {
    const inp = steerIntoGang(ok);
    ok.update(DT, inp);
    mon2.step(inp);
    if (ok.inGang(ok.dogMap())) inGang = i;
  }
  assert.ok(inGang >= 0 && ok.deaths === 0, `lenkt in den Gang (Frame ${inGang}, Tode ${ok.deaths})`);
  assert.equal(ok.K.id, 'ost');
  const y3 = ok.dogMap().y;
  play(ok, 30, { my: 0, mx: 0 }, mon2);
  assert.ok(ok.dogMap().y > y3 + 25, 'Kamera trägt den Dackel mit');
  assert.ok(mon2.maxKink <= 0.1 && mon2.maxJump <= 4, `Kamera flüssig (Knick ${mon2.maxKink.toFixed(3)}, Sprung ${mon2.maxJump.toFixed(2)})`);
});

test('Netz: Neustart an der letzten Kreuzung – mit der Ausrichtung, mit der der Dackel sie verließ; Zielfarbe und Punkte bleiben', () => {
  const sc = warp(0, 0, { theta: E, s: 'R' });
  sc.score = 3;
  const target = sc.target;
  // ostwärts aus A heraus und weiter bis zu den Kreuzungen D: letzte Kreuzung = D, danach in die Ostwand tragen lassen
  let n = 0;
  while (!sc.deaths && n++ < 60 * 40) sc.update(DT, {});
  assert.equal(sc.deaths, 1, 'stirbt an der Ostwand');
  const p = sc.dogMap();
  const ost = NETZ_MAP.junctions.find((j) => j.id === 'mitte-h×ost');
  assert.ok(Math.hypot(p.x - ost.cx, p.y - ost.cy) < 1, 'Neustart in der Mitte der letzten Kreuzung (T am Ost-Ring)');
  assert.equal(sc.theta, E);
  assert.equal(sc.score, 3);
  assert.equal(sc.target, target);
  // Neustart ist spielbar: nach der kurzen Pause lenkt der Spieler nach Norden, überlebt
  play(sc, 60);
  assert.ok(sc.canTurnBy(-1));
  sc.update(DT, { rotLeft: true });
  finishSwing(sc);
  play(sc, 60 * 3);
  assert.equal(sc.deaths, 1);
});

test('Netz: zwei nahe Gänge in Flugrichtung (A/D): die Kamera folgt dem Dackel in den Gang, in den er fliegt', () => {
  const faelle = [
    { c: { theta: E, s: 'R' }, k: -1, name: 'nach Norden aus E-Flug' },
    { c: { theta: W, s: 'L' }, k: -1, name: 'nach Norden, Plan kopfüber (θ=W, s=L)' },
  ];
  for (const f of faelle) {
    for (const [zielId, zielX] of [['stummel-h', 260], ['mitte-v', 0]]) {
      const sc = warp(130, 0, f.c);
      const mon = new Monitor(sc, `${f.name} → ${zielId}`);
      assert.equal(sc.h === E || sc.h === W, true);
      sc.update(DT, f.k > 0 ? { rotRight: true } : { rotLeft: true });
      finishSwing(sc, mon);
      assert.equal(sc.h, N);
      // beide Gänge liegen in der Zone: Kamera-Gang ist einer von beiden
      assert.ok(['stummel-h', 'mitte-v'].includes(sc.K.id), 'K zunächst einer der beiden: ' + sc.K.id);
      // der Spieler fliegt in den gewünschten Gang
      let drin = -1;
      for (let i = 0; i < 60 * 2 && drin < 0; i++) {
        const m = sc.dogMap();
        const inp = stick(sc, Math.max(-1, Math.min(1, (zielX - m.x) / 10)) * 0.9, -0.4 * (sc.inGang(m, NETZ_MAP.byId[zielId]) ? 0 : 1));
        sc.update(DT, inp);
        mon.step(inp);
        if (sc.inGang(sc.dogMap(), NETZ_MAP.byId[zielId])) drin = i;
      }
      assert.ok(drin >= 0 && sc.deaths === 0, `Dackel erreicht ${zielId} (Frame ${drin}, Tode ${sc.deaths})`);
      // danach Gang gewählt, Kamera quer in dessen Behälter, Dackel wird getragen
      for (let i = 0; i < 60 * 2; i++) {
        const m = sc.dogMap();
        const inp = stick(sc, Math.max(-1, Math.min(1, (zielX - m.x) / 10)) * 0.9, 0);
        sc.update(DT, inp);
        mon.step(inp);
      }
      play(sc, 30, {}, mon);
      assert.equal(sc.K.id, zielId, 'Kamera-Gang folgt dem Dackel');
      const half = NETZ_MAP.camHalfWidth(sc.K, sc.cam.y, DOG_R, DOG_MARGIN);
      assert.ok(Math.abs(sc.cam.x - zielX) <= half + 1, `Kamera quer im Behälter von ${zielId}: ${nd(sc.cam.x)}`);
      const y0 = sc.dogMap().y;
      play(sc, 30, {}, mon);
      assert.ok(y0 - sc.dogMap().y > 25, 'Dackel wird getragen');
      assert.ok(mon.maxKink <= 0.1 && mon.maxJump <= 4, `Kamera flüssig (Knick ${mon.maxKink.toFixed(3)})`);
    }
  }
});

test('Netz: nach dem Drehen im Kreuzungsquadrat trägt die Kamera den Dackel sofort mit', () => {
  for (const c of COMBOS) {
    for (const k of [-1, 1]) {
      const s2 = warp(0, 0, c);
      s2.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
      finishSwing(s2);
      const m0 = s2.dogMap();
      play(s2, 30);
      const m1 = s2.dogMap();
      const hv = DIR_VEC[s2.h];
      assert.ok((m1.x - m0.x) * hv[0] + (m1.y - m0.y) * hv[1] > 25, 'mitgetragen in Flugrichtung');
    }
  }
});

// ================================================================== Gitter um die Stellen A–I
test('Netz: Gitter von Startlagen um jede Stelle A–I – nach erlaubten Drehungen: Dackel bleibt stehen, Kamera flüssig und mit SPEED, im Quadrat gelenkt immer überlebt', () => {
  let states = 0;
  let turns = 0;
  const stats = { squareOk: 0, early: 0, earlySurvived: 0 };
  const maxima = { kink: 0, jump: 0 };
  for (const [stName, st] of Object.entries(STELLEN_RASTER)) {
    for (const p of gridAround(st, 240, 80)) {
      for (const c of COMBOS) {
        const label = `${stName} (${p.x},${p.y}) ${name(c)}`;
        // (a) ohne Eingabe: nur in Scrollrichtung
        {
          const sc = warp(p.x, p.y, c);
          const mon = play(sc, 60, {}, new Monitor(sc, label));
          maxima.kink = Math.max(maxima.kink, mon.maxKink);
          maxima.jump = Math.max(maxima.jump, mon.maxJump);
        }
        // (b) jede erlaubte Drehung
        const h = hOf(c.theta, c.s);
        for (const k of [-1, 1]) {
          const hNew = k > 0 ? turnCW(h) : turnCCW(h);
          if (!oracleTurn(p, hNew)) continue;
          const sc = warp(p.x, p.y, c);
          const mon = new Monitor(sc, label + ` k=${k}`);
          const m0 = sc.dogMap();
          sc.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
          mon.step();
          finishSwing(sc, mon);
          // ohne Eingabe weiter: der Dackel wird nur in Flugrichtung getragen (Monitor), Tod und Neustart sind erlaubt
          const hv = DIR_VEC[sc.h];
          const K = sc.K;
          const m1 = sc.dogMap();
          const inSquare = sc.inGang(m1);
          const camA = { ...sc.cam };
          const d0 = sc.deaths;
          play(sc, 60, {}, mon);
          if (sc.deaths === d0) {
            const adv = (sc.cam.x - camA.x) * hv[0] + (sc.cam.y - camA.y) * hv[1];
            assert.ok(Math.abs(adv - SPEED) < 3, `Kamera scrollt immer mit SPEED (${adv.toFixed(1)}): ${label} k=${k}`);
          }
          // (c) Spieler lenkt in den neuen Gang und fliegt weiter. Steht er schon im Kreuzungsquadrat, überlebt er immer;
          // wer zu früh gedreht hat, wird gezählt (Rohdaten für den Formel-Prototyp).
          const sc2 = warp(p.x, p.y, c);
          const mon2 = new Monitor(sc2, label + ` k=${k} gelenkt`);
          sc2.update(DT, k > 0 ? { rotRight: true } : { rotLeft: true });
          mon2.step();
          finishSwing(sc2, mon2);
          const a1 = K.axis === 'h' ? m1.x : m1.y;
          const sgn = (K.axis === 'h' ? hv[0] : hv[1]) > 0 ? 1 : -1;
          const dEnd = sgn > 0 ? K.a1 - a1 : a1 - K.a0;
          const frames = Math.max(0, Math.min(150, Math.floor(((dEnd - 30) / SPEED) * 60)));
          for (let i = 0; i < frames && !sc2.deaths; i++) {
            const inp = steerIntoGang(sc2);
            sc2.update(DT, inp);
            mon2.step(inp);
          }
          if (inSquare) {
            assert.equal(sc2.deaths, 0, `stirbt im Kreuzungsquadrat trotz Lenken: ${label} k=${k}`);
            stats.squareOk++;
          } else {
            stats.early++;
            if (!sc2.deaths) stats.earlySurvived++;
          }
          maxima.kink = Math.max(maxima.kink, mon.maxKink);
          maxima.jump = Math.max(maxima.jump, mon.maxJump);
          turns++;
        }
        states++;
      }
    }
  }
  assert.ok(states > 1000 && turns > 300, `Lagen ${states}, Drehungen ${turns}`);
  console.log(`# Gitter: ${states} Lagen, ${turns} Drehungen, größter Kamera-Knick ${maxima.kink.toFixed(3)} rad/Frame, größter Sprung ${maxima.jump.toFixed(2)} E/Frame; im Quadrat gedreht und überlebt ${stats.squareOk}, zu früh gedreht ${stats.early} davon mit Lenken überlebt ${stats.earlySurvived}`);
});

// ================================================================== Nie festsitzen / alle Knochen erreichbar
test('Netz: Bot kommt von Lagen rund um jede Stelle zu jedem Knochen – ohne zu sterben', () => {
  const bot = new NavBot(NETZ_MAP);
  const starts = [];
  let i = 0;
  for (const st of Object.values(STELLEN_RASTER)) {
    for (const p of gridAround(st, 240, 160)) {
      for (const c of COMBOS) {
        const probe = warp(p.x, p.y, c);
        const pm = probe.dogMap();
        const hv = DIR_VEC[probe.h];
        // nur Lagen, in denen der Dackel im Gang der Flugrichtung steht und die Wand voraus nicht schon fast erreicht ist
        if (!probe.inGang(pm) || NETZ_MAP.freeDistance(pm.x, pm.y, hv[0], hv[1], 100, DOG_R) < 100) continue;
        if ((i++ % 3) === 0) starts.push({ p, c });
      }
    }
  }
  let ok = 0;
  let worst = 0;
  for (const { p, c } of starts) {
    for (const b of NETZ_MAP.bones) {
      const sc = warp(p.x, p.y, c);
      const mon = new Monitor(sc, `Bot (${p.x},${p.y}) ${name(c)} → ${b.name}`);
      let t = 0;
      while (Math.hypot(sc.dogMap().x - b.x, sc.dogMap().y - b.y) > BONE_R - 4 && t < 60 * 90 && !sc.deaths) {
        const inp = bot.control(sc, b.x, b.y);
        sc.update(DT, inp);
        mon.step(inp);
        t++;
      }
      assert.equal(sc.deaths, 0, `Bot stirbt von (${p.x},${p.y}) ${name(c)} → ${b.name} bei (${nd(sc.dogMap().x)},${nd(sc.dogMap().y)}) θ=${HEADING_CODES[sc.theta]}`);
      assert.ok(t < 60 * 90, `Bot erreicht ${b.name} nicht von (${p.x},${p.y}) ${name(c)} – Dackel bei (${nd(sc.dogMap().x)},${nd(sc.dogMap().y)}) θ=${HEADING_CODES[sc.theta]}`);
      worst = Math.max(worst, t / 60);
      ok++;
    }
  }
  assert.ok(ok > 200);
  console.log(`# Bot: ${ok} Wege zu Knochen ohne Tod, längster ${worst.toFixed(1)} s`);
});

test('Netz: Knochen werden eingesammelt, die Zielfarbe wechselt (fester Startwert)', () => {
  const sc = mk();
  const bot = new NavBot(NETZ_MAP);
  const seen = new Set();
  const mon = new Monitor(sc, 'Knochen');
  for (let i = 0; i < 60 * 600 && sc.score < 12; i++) {
    const b = NETZ_MAP.bones[sc.target];
    seen.add(sc.target);
    const inp = bot.control(sc, b.x, b.y);
    sc.update(DT, inp);
    mon.step(inp);
  }
  assert.equal(sc.deaths, 0, 'ohne Tod');
  assert.ok(sc.score >= 12, 'Knochen geholt: ' + sc.score);
  assert.ok(seen.size >= 5, 'verschiedene Ziele: ' + seen.size);
  const again = new FensterScene({ map: NETZ_MAP });
  assert.equal(again.target, mk().target, 'fester Startwert');
});

// ================================================================== Breiter Raum F, schmaler Gang G
test('Netz: breiter Raum (F) – die Kamera folgt quer bis an die Raumwände, ohne Ruck; der Dackel erreicht beide Wände', () => {
  for (const c of [{ theta: E, s: 'R' }, { theta: W, s: 'L' }, { theta: W, s: 'R' }, { theta: E, s: 'L' }]) {
    for (const richtung of [-1, 1]) {
      // am Raumanfang starten (in Flugrichtung gesehen), damit der Raum lang genug im Bild bleibt
      const h = hOf(c.theta, c.s);
      const sc = warp(h === E ? 190 : 510, 500, c);
      const mon = new Monitor(sc, `F ${name(c)} ${richtung}`);
      let best = 500;
      let camMax = 0;
      for (let i = 0; i < 60 * 3 && !sc.deaths; i++) {
        const inp = stick(sc, 0, richtung);
        sc.update(DT, inp);
        mon.step(inp);
        if (sc.deaths) break;
        const y = sc.dogMap().y;
        best = richtung < 0 ? Math.min(best, y) : Math.max(best, y);
        camMax = Math.max(camMax, Math.abs(sc.cam.y - 500));
      }
      // an der Raumwand stirbt der Dackel, sobald er sie berührt; vorher kommt er bis auf einen Stick-Schritt heran
      const wand = 500 + richtung * (200 - DOG_R);
      assert.ok(Math.abs(best - wand) < 2.5, `Raumwand erreicht (${richtung < 0 ? 'Nord' : 'Süd'}): ${nd(best)} von ${wand}`);
      assert.equal(sc.deaths, 1, 'die Wand tötet ihn');
      assert.ok(camMax > 60, 'Kamera folgt quer weit über den Behälter eines normalen Gangs hinaus: ' + nd(camMax));
      assert.ok(mon.maxKink <= 0.1 && mon.maxJump <= 4);
    }
  }
  // Verengung am Raumende: wer in der Mitte bleibt, wird ohne Tod durchgetragen; die Kamera kehrt weich in den engen Behälter zurück
  const sc = warp(250, 500, { theta: E, s: 'R' });
  const mon = new Monitor(sc, 'F→Gang');
  for (let i = 0; i < 60 * 5; i++) {
    const m = sc.dogMap();
    const inp = stick(sc, 0, Math.max(-1, Math.min(1, (500 - m.y) / 30)));
    sc.update(DT, inp);
    mon.step(inp);
  }
  assert.equal(sc.deaths, 0);
  assert.ok(sc.dogMap().x > 560, 'Dackel ist durch die Verengung gekommen: ' + nd(sc.dogMap().x));
});

test('Netz: schmaler Gang (G) – kein Zittern der Kamera', () => {
  for (const c of [{ theta: S, s: 'R' }, { theta: N, s: 'L' }, { theta: N, s: 'R' }, { theta: S, s: 'L' }]) {
    // ohne Eingabe: die Kamera steht quer still
    const sc = warp(RING.RX0, hOf(c.theta, c.s) === S ? -250 : 250, c, { x: 240, y: 180 });
    const mon = new Monitor(sc, 'G ' + name(c));
    const d = dVec(sc);
    const cross = () => sc.cam.x * d[0] + sc.cam.y * d[1];
    // Einschwingen ohne Eingabe: die Quer-Geschwindigkeit der Kamera wechselt nie das Vorzeichen und klingt ab
    let vPrev = 0;
    let crossPrev = cross();
    let flips0 = 0;
    for (let i = 0; i < 60 * 3; i++) {
      sc.update(DT, {});
      mon.step();
      const v = cross() - crossPrev;
      crossPrev = cross();
      if (Math.abs(v) > 0.01 && vPrev && Math.sign(v) !== Math.sign(vPrev)) flips0++;
      if (Math.abs(v) > 0.01) vPrev = v;
    }
    assert.equal(flips0, 0, 'kein Hin und Her beim Einschwingen');
    const c0 = cross();
    play(sc, 60, {}, mon);
    assert.ok(Math.abs(cross() - c0) < 1.5, 'Kamera ruht quer');
    // mit sanftem Wackeln des Sticks: die Quer-Geschwindigkeit der Kamera wechselt höchstens so oft das Vorzeichen wie der Stick
    let flips = 0;
    let stickFlips = 0;
    let lastV = 0;
    let lastW = 0;
    let prev = cross();
    for (let i = 0; i < 60 * 3; i++) {
      const wob = Math.sin((i * 2 * Math.PI) / 60) * 0.6; // 1 Hz
      if (lastW && Math.sign(wob) !== Math.sign(lastW)) stickFlips++;
      lastW = wob;
      const inp2 = { mx: 0, my: wob };
      sc.update(DT, inp2);
      mon.step(inp2);
      const v = cross() - prev;
      prev = cross();
      if (Math.abs(v) > 0.02) {
        if (lastV && Math.sign(v) !== Math.sign(lastV)) flips++;
        lastV = v;
      }
    }
    assert.ok(flips <= stickFlips + 2, `Kamera zittert nicht: ${flips} Richtungswechsel bei ${stickFlips} Stick-Wechseln (Tode ${sc.deaths})`);
    assert.ok(mon.maxKink <= 0.1 && mon.maxJump <= 4);
  }
});

// ================================================================== Zufallsspiel
test('Netz: Zufallsspiel (≥ 100.000 Frames, fester Startwert) – alle Invarianten aus Spielersicht', () => {
  const rng = new Rng(20261007);
  const sc = mk();
  const mon = new Monitor(sc, 'Zufall');
  let input = {};
  const stat = { turns: 0, denied: 0, flips: 0, deaths: 0, bones: 0 };
  const FRAMES = 120000;
  for (let i = 0; i < FRAMES; i++) {
    if (i % 24 === 0) {
      const r = rng.next();
      input = { mx: rng.next() < 0.3 ? 0 : rng.range(-1, 1), my: rng.next() < 0.3 ? 0 : rng.range(-1, 1) };
      if (r < 0.07) input.rotLeft = true;
      else if (r < 0.14) input.rotRight = true;
      else if (r < 0.17) input.wende = true;
    }
    const inp = i % 24 === 0 ? input : { mx: input.mx, my: input.my };
    const th0 = sc.theta;
    const s0 = sc.s;
    const score0 = sc.score;
    const deniedBefore = !!sc.denied;
    sc.update(DT, inp);
    mon.step(inp);
    if (sc.theta !== th0) stat.turns++;
    if (sc.s !== s0) stat.flips++;
    if (sc.denied && !deniedBefore) stat.denied++;
    if (sc.score > score0) stat.bones++;
  }
  console.log(`# Zufallsspiel: ${FRAMES} Frames, Drehungen ${stat.turns}, abgelehnt ${stat.denied}, Umkehr ${stat.flips}, Tode ${mon.deaths}, Knochen ${stat.bones}, größter Kamera-Knick ${mon.maxKink.toFixed(3)} rad/Frame, Sprung ${mon.maxJump.toFixed(2)}`);
  assert.ok(stat.turns > 100 && stat.denied > 50 && stat.flips > 50 && mon.deaths > 20, JSON.stringify({ ...stat, deaths: mon.deaths }));
});

test('Netz: Spieler-Bot fliegt Dauerläufe durchs Netz – keine Verstöße', () => {
  const sc = mk();
  const bot = new NavBot(NETZ_MAP);
  const mon = new Monitor(sc, 'Dauerlauf');
  const rng = new Rng(77);
  let ziel = rng.int(0, NETZ_MAP.bones.length - 1);
  let n = 0;
  for (let i = 0; i < 60 * 60 * 25; i++) {
    const b = NETZ_MAP.bones[ziel];
    if (Math.hypot(sc.dogMap().x - b.x, sc.dogMap().y - b.y) < BONE_R) {
      ziel = rng.int(0, NETZ_MAP.bones.length - 1);
      n++;
    }
    const inp = bot.control(sc, b.x, b.y);
    sc.update(DT, inp);
    mon.step(inp);
  }
  assert.equal(sc.deaths, 0, 'ohne Tod');
  assert.ok(n >= 25, 'Ziele erreicht: ' + n);
});

// ================================================================== P1-Anbindung
test('Netz: Anbindung – Direktstart im Netz, P1 und v0.2 erreichbar, SPEED/DOG_SPEED unverändert', async () => {
  assert.equal(SPEED, 70);
  assert.equal(DOG_SPEED, 120);
  const { Game } = await import('../src/game/game.js');
  const { MemoryStorage } = await import('../src/game/save.js');
  const g = new Game({ storage: new MemoryStorage(), platform: {} });
  g.startProto('netz');
  assert.equal(g.screen, 'proto');
  assert.equal(g.proto.map, NETZ_MAP);
  g.startProto('fenster');
  assert.notEqual(g.proto.map, NETZ_MAP);
  assert.equal(g.proto.map.corridors.length, 2, 'P1 bleibt das Kreuz');
});
