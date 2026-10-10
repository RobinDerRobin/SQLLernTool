// Abnahme-Checkliste P3 „45°-Kreuzung“ (docs/prototypen/P3-45grad.md, Abschnitt 2) als Tests aus Spielersicht:
// gemessen werden Kartenposition und Bildschirmstelle des Dackels (und die Kamera), nicht nur Kamerawerte (Regel 3).
// Die Drehregeln prüft ein Orakel, das unabhängig vom Spielcode rechnet (Trigonometrie statt Einheitsvektor-Tabellen).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  E, S, W, N, HEADINGS, HEADING_CODES, DIR_NAMES, turnBy, turnCW, opposite, isDiagonal, headingAngle, SCREEN_W, SCREEN_H,
} from '../src/core/math.js';
import { Rng } from '../src/core/rng.js';
import { Input } from '../src/core/input.js';
import { SWING_TIME, TURN_AHEAD, DOG_R, DOG_MARGIN, SPEED, DOG_SPEED, BONE_R, FensterScene, unitVec } from '../src/proto/fenster.js';
import { AchteckScene } from '../src/proto/achteck.js';
import { ACHTECK_MAP, ARMS8, APO, END, HALF, WIDTH, ARM, BONE_AT } from '../src/proto/achteck-map.js';
import { drawFenster } from '../src/proto/fenster-draw.js';
import { AchteckBot, steer } from './helpers/achteck-bot.mjs';

const DT = 1 / 60;
const COMBOS = HEADINGS.flatMap((theta) => ['R', 'L'].map((s) => ({ theta, s })));
const hOf = (theta, s) => (s === 'R' ? theta : opposite(theta));
const name = (c) => `θ=${HEADING_CODES[c.theta]} s=${c.s}`;
const nd = (x) => Number(x.toFixed(1));
const MOVING = 0.5;
const ROT = { lt: 'rot45Left', rt: 'rot45Right', lb: 'rotLeft', rb: 'rotRight' };
const KEYS = [['lt', -1], ['rt', 1], ['lb', -2], ['rb', 2]]; // Taste, Drehung in 45°-Schritten (Vorzeichen: links −, rechts +)
const press = (key) => ({ [ROT[key]]: true });

const mk = () => {
  const sc = new AchteckScene();
  sc.hint = 0;
  return sc;
};
const warp = (mx, my, c, dogScreen) => mk().warp(mx, my, c.theta, c.s, dogScreen);
const rVec = (sc) => unitVec(sc.theta);
const dVec = (sc) => unitVec(turnCW(sc.theta));

// ------------------------------------------------------------------ Messgerät
/** Kartenstelle unter einem Bildschirmpunkt, wie sie gezeichnet wird (Plan um −ang gedreht): auch mitten im Schwenk richtig. */
const mapAt = (sc, sx, sy) => {
  const ox = sx - SCREEN_W / 2;
  const oy = sy - SCREEN_H / 2;
  const c = Math.cos(sc.ang);
  const sn = Math.sin(sc.ang);
  return { x: sc.cam.x + ox * c - oy * sn, y: sc.cam.y + ox * sn + oy * c };
};
/** Bildschirmstelle eines Kartenpunkts (Gegenstück zu mapAt). */
const screenOf = (sc, p) => {
  const c = Math.cos(sc.ang);
  const sn = Math.sin(sc.ang);
  const dx = p.x - sc.cam.x;
  const dy = p.y - sc.cam.y;
  return { x: SCREEN_W / 2 + dx * c + dy * sn, y: SCREEN_H / 2 - dx * sn + dy * c };
};

class Monitor {
  constructor(sc, label = '') {
    this.sc = sc;
    this.label = label;
    this.prev = this.snap();
    this.pd = null;
    this.maxJump = 0;
    this.maxKink = 0;
    this.deaths = 0;
    this.frames = 0;
    this.hist = [];
    this.sideDrift = 0;
    this.swingDrift = 0;
  }
  snap() {
    const sc = this.sc;
    return { m: mapAt(sc, sc.dog.x, sc.dog.y), cam: { ...sc.cam }, dog: { ...sc.dog }, theta: sc.theta, swing: !!sc.swing, dir: sc.dir, ang: sc.ang, deaths: sc.deaths };
  }
  reset() {
    this.prev = this.snap();
    this.pd = null;
  }
  step(input = {}) {
    const sc = this.sc;
    const cur = this.snap();
    const p = this.prev;
    const at = `${this.label} Frame ${this.frames}`;
    assert.ok(Number.isFinite(cur.m.x) && Number.isFinite(cur.m.y) && Number.isFinite(cur.cam.x) && Number.isFinite(cur.cam.y), 'endlich ' + at);
    if (!cur.swing) assert.ok(sc.map.walkable(cur.m.x, cur.m.y, 0), `Dackel auf dem Boden ${at} (${nd(cur.m.x)}, ${nd(cur.m.y)})`);
    assert.ok(cur.dog.x >= DOG_R && cur.dog.x <= SCREEN_W - DOG_R && cur.dog.y >= DOG_R && cur.dog.y <= SCREEN_H - DOG_R, `Dackel im Bild ${at}: ${nd(cur.dog.x)},${nd(cur.dog.y)}`);
    if (cur.deaths !== p.deaths) {
      this.deaths += cur.deaths - p.deaths;
      this.prev = cur;
      this.pd = null;
      this.frames++;
      return;
    }
    const b = sc.map.bounds;
    const slack = 260;
    assert.ok(cur.cam.x >= b.x0 - slack && cur.cam.x <= b.x1 + slack && cur.cam.y >= b.y0 - slack && cur.cam.y <= b.y1 + slack, `Kamera im Levelbereich ${at}: ${nd(cur.cam.x)},${nd(cur.cam.y)}`);
    const dv = { x: cur.cam.x - p.cam.x, y: cur.cam.y - p.cam.y };
    const jump = Math.hypot(dv.x, dv.y);
    this.hist.push(`  f${this.frames} d=(${dv.x.toFixed(3)},${dv.y.toFixed(3)}) vc=${sc.vc.toFixed(1)} dog=(${nd(sc.dog.x)},${nd(sc.dog.y)}) dir=${sc.dir.toFixed(2)} in=${JSON.stringify(input)}`);
    if (this.hist.length > 6) this.hist.shift();
    const swinging = cur.ang !== p.ang;
    if (swinging) {
      assert.ok(Math.abs(cur.ang - p.ang) <= 0.1, `Schwenk dreht ${Math.abs(cur.ang - p.ang).toFixed(3)} rad/Frame ${at}`);
    } else {
      this.maxJump = Math.max(this.maxJump, jump);
      assert.ok(jump <= 4, `Kamera springt ${jump.toFixed(2)} ${at}`);
    }
    const steady = Math.abs(cur.dir) > 0.999 && Math.abs(p.dir) > 0.999 && !swinging;
    if (jump >= MOVING && steady) {
      if (this.pd) {
        const a = Math.abs(Math.atan2(dv.x * this.pd.y - dv.y * this.pd.x, dv.x * this.pd.x + dv.y * this.pd.y));
        this.maxKink = Math.max(this.maxKink, a);
        assert.ok(a <= 0.1, `Kamera knickt ${a.toFixed(3)} rad ${at}\n${this.hist.join('\n')}`);
      }
      this.pd = dv;
    } else this.pd = null;
    const dm = { x: cur.m.x - p.m.x, y: cur.m.y - p.m.y };
    if (p.swing || cur.swing) {
      this.swingDrift = Math.max(this.swingDrift, Math.hypot(dm.x, dm.y));
      if (p.swing && cur.swing) assert.ok(Math.hypot(dm.x, dm.y) < 1e-6, `Dackel bewegt sich im Schwenk ${at}`);
    } else if (!(input.mx || input.my)) {
      const r = unitVec(cur.theta);
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

// ------------------------------------------------------------------ Orakel für die Dreh-Zone (unabhängig vom Spielcode)
const ANG = (h) => headingAngle(h);
const OCT_VERTS = HEADINGS.map((h) => {
  const a = ANG(h) + Math.PI / 8;
  const R = APO / Math.cos(Math.PI / 8);
  return [Math.cos(a) * R, Math.sin(a) * R];
});
/** Abstand zur nächsten Seite, innen positiv (konvexes Polygon im Uhrzeigersinn, y nach unten). */
const insideDist = (x, y) => {
  let best = Infinity;
  for (let i = 0; i < 8; i++) {
    const [ax, ay] = OCT_VERTS[i];
    const [bx, by] = OCT_VERTS[(i + 1) % OCT_VERTS.length];
    const ex = bx - ax;
    const ey = by - ay;
    best = Math.min(best, ((x - ax) * ey - (y - ay) * ex) / Math.hypot(ex, ey) * -1);
  }
  return best;
};
const oracleZone = (p) => {
  if (insideDist(p.x, p.y) >= DOG_R - 1e-9) return true;
  for (const h of HEADINGS) {
    const along = p.x * Math.cos(ANG(h)) + p.y * Math.sin(ANG(h));
    const across = -p.x * Math.sin(ANG(h)) + p.y * Math.cos(ANG(h));
    if (Math.abs(across) <= HALF - DOG_R + 1e-9 && along > APO - DOG_R && along <= APO - DOG_R + TURN_AHEAD) return true;
  }
  return false;
};

const POINTS = [];
for (let x = -980; x <= 980; x += 47) for (let y = -980; y <= 980; y += 47) if (ACHTECK_MAP.walkable(x, y, DOG_R)) POINTS.push({ x, y });

/** Ein Punkt auf dem Boden des Arms a in der Entfernung `along` von der Mitte, um `across` von der Armmitte versetzt. */
const inArm = (a, along, across = 0) => ({ x: a.u[0] * along + a.v[0] * across, y: a.u[1] * along + a.v[1] * across });
const armDir = (h) => ARMS8.find((a) => a.dir === h);
/** Kartenrichtung (Einheitsvektor) -> Stickwerte in Bildschirmkoordinaten */
const stick = (sc, vx, vy) => {
  const r = rVec(sc);
  const d = dVec(sc);
  const len = Math.hypot(vx, vy) || 1;
  return { mx: (vx * r[0] + vy * r[1]) / len, my: (vx * d[0] + vy * d[1]) / len };
};

// ================================================================== Karte
test('45°-Kreuzung: Karte – Achteck mit 8 Armen, Seitenlänge = Gangbreite, Arme 720 lang, Wandkeile dazwischen', () => {
  assert.equal(ARMS8.length, 8);
  assert.deepEqual(ARMS8.map((a) => a.dir).sort(), [...HEADINGS].sort());
  assert.ok(Math.abs(APO - 241.42) < 0.01, 'Abstand Mitte–Seite ≈ 241');
  assert.equal(ARM, 720);
  assert.equal(WIDTH, 200);
  const M = ACHTECK_MAP;
  for (const a of ARMS8) {
    // Armmitte bis zum Ende begehbar, Wand dahinter
    assert.ok(M.walkable(a.u[0] * (END - DOG_R - 0.5), a.u[1] * (END - DOG_R - 0.5), DOG_R), 'Armende ' + a.name);
    assert.ok(!M.walkable(a.u[0] * (END + 2), a.u[1] * (END + 2), 0), 'Wand hinter dem Armende ' + a.name);
    // Breite quer zur Gangachse: genau WIDTH
    const mid = APO + 300;
    const edge = inArm(a, mid, HALF - 0.01);
    assert.ok(M.walkable(edge.x, edge.y, 0), 'Gangrand ' + a.name);
    const out = inArm(a, mid, HALF + 0.5);
    assert.ok(!M.walkable(out.x, out.y, 0), 'außerhalb der Breite ' + a.name);
    // Knochen am Ende, in Armfarbe
    const b = M.bones[a.i];
    assert.ok(Math.abs(Math.hypot(b.x, b.y) - BONE_AT) < 1e-9 && b.color === a.color && M.walkable(b.x, b.y, DOG_R));
  }
  // Wandkeil zwischen benachbarten Armen beginnt an der Achteckecke
  for (const [i, v] of OCT_VERTS.entries()) {
    const out = [v[0] * 1.05, v[1] * 1.05];
    assert.ok(!M.walkable(out[0], out[1], 0), 'Keil hinter Ecke ' + i);
    assert.ok(M.walkable(v[0] * 0.98, v[1] * 0.98, 0), 'Ecke gehört zum Achteck ' + i);
  }
  // Farben: N rot, O blau, S grün, W gelb (wie die Kreuzung), vier weitere klar verschieden
  const colors = ARMS8.map((a) => a.color);
  assert.equal(new Set(colors).size, 8);
  assert.deepEqual([armDir(N).color, armDir(E).color, armDir(S).color, armDir(W).color], ['#e0443a', '#3f7be0', '#3fb04a', '#e8c63a']);
  assert.deepEqual(ARMS8.map((a) => a.striped), ARMS8.map((a) => isDiagonal(a.dir)), 'Streifen nur in Diagonal-Armen');
  // Start: Ende des Westarms, θ = Osten, s = R; Zielknochen nie der Westarm (erster Wurf)
  const sc = mk();
  assert.equal(sc.theta, E);
  assert.equal(sc.s, 'R');
  const m = sc.dogMap();
  assert.ok(m.x < -(END - 80) && Math.abs(m.y) < 1e-6, 'Start am Ende des Westarms: ' + nd(m.x));
  assert.notEqual(sc.target, armDir(W).i, 'Ziel ist ein anderer der 7 Arme');
});

test('45°-Kreuzung: Knochen holen – Zielfarbe wechselt auf einen anderen der 7 Arme (fester Startwert, reproduzierbar)', () => {
  const a = mk();
  const b = mk();
  assert.equal(a.target, b.target, 'fester Startwert');
  const seen = new Set();
  let sc = mk();
  for (let n = 0; n < 40; n++) {
    const t = sc.target;
    const bone = sc.map.bones[t];
    sc.warp(bone.x - 40 * Math.cos(headingAngle(ARMS8[t].dir)), bone.y - 40 * Math.sin(headingAngle(ARMS8[t].dir)), ARMS8[t].dir, 'R');
    const score = sc.score;
    play(sc, 90, {});
    assert.equal(sc.score, score + 1, 'Knochen geholt ' + ARMS8[t].name);
    assert.notEqual(sc.target, t, 'neues Ziel ist ein anderer Arm');
    seen.add(sc.target);
  }
  assert.ok(seen.size >= 6, 'Ziele wechseln durch die Arme: ' + seen.size);
});

// ================================================================== Dreh-Zone
test('45°-Kreuzung: Drehen nur in der Dreh-Zone (Achteck + 160 in jedem Arm); außerhalb wird jede Drehung (LT/RT/LB/RB) rot abgelehnt', () => {
  let ok = 0;
  let no = 0;
  for (const p of POINTS) {
    const zone = oracleZone(p);
    for (const c of [COMBOS[(ok + no) % 16], COMBOS[(ok + no + 5) % 16]]) {
      for (const [key, k] of KEYS) {
        const sc = warp(p.x, p.y, c);
        const th0 = sc.theta;
        const m0 = sc.dogMap();
        sc.update(DT, press(key));
        const at = `(${nd(p.x)},${nd(p.y)}) ${name(c)} ${key}`;
        if (zone) {
          assert.ok(sc.swing, 'Drehung geht in der Zone ' + at);
          assert.equal(sc.theta, turnBy(th0, k), 'θ ' + at);
          assert.equal(sc.denied, null);
          ok++;
        } else {
          assert.equal(sc.swing, null, 'keine Drehung außerhalb der Zone ' + at);
          assert.equal(sc.theta, th0);
          assert.ok(sc.denied && sc.denied.t > 0, 'abgelehnt (rot) ' + at);
          assert.ok(sc.sfx.includes('nope'), 'mit Ton ' + at);
          no++;
        }
        finishSwing(sc);
        if (zone) {
          const m1 = sc.dogMap();
          assert.ok(Math.hypot(m1.x - m0.x, m1.y - m0.y) < 1e-9, 'Position bleibt ' + at);
        }
      }
    }
  }
  assert.ok(ok > 500 && no > 500, `Zone ${ok} / außerhalb ${no}`);
  // Grenzfälle: genau 160 hinter der Achteckseite (abzüglich Dackelradius) noch drehbar, 3 Einheiten weiter nicht
  for (const a of ARMS8) {
    const edge = APO - DOG_R + TURN_AHEAD;
    const inside = inArm(a, edge - 1);
    const outside = inArm(a, edge + 3);
    assert.ok(warp(inside.x, inside.y, { theta: E, s: 'R' }).canTurn, 'Zone reicht bis ' + nd(edge) + ' ' + a.name);
    assert.ok(!warp(outside.x, outside.y, { theta: E, s: 'R' }).canTurn, 'dahinter nicht ' + a.name);
  }
});

test('45°-Kreuzung: in jede der 8 Richtungen führt vom Achteck ein Gang weg – die Drehung ist in der Zone immer erlaubt', () => {
  for (const c of COMBOS) {
    for (const [key, k] of KEYS) {
      const sc = warp(0, 0, c);
      const hNew = turnBy(sc.h, k);
      const a = armDir(hNew);
      const probe = inArm(a, APO + 100);
      assert.ok(ACHTECK_MAP.walkable(probe.x, probe.y, DOG_R), 'Gang führt in Richtung ' + DIR_NAMES[hNew]);
      sc.update(DT, press(key));
      assert.ok(sc.swing, `${name(c)} ${key}`);
    }
  }
});

// ================================================================== 45°-Prüffall, Parität
test('45°-Prüffall: θ = Osten, RT (K) → R-Ende zeigt nach Südosten; LT (J) → Nordosten; s bleibt', () => {
  const rEnd = (sc) => {
    const a = mapAt(sc, SCREEN_W / 2, SCREEN_H / 2);
    const b = mapAt(sc, SCREEN_W / 2 + 100, SCREEN_H / 2);
    return { x: (b.x - a.x) / 100, y: (b.y - a.y) / 100 };
  };
  for (const s of ['R', 'L']) {
    let sc = warp(0, 0, { theta: E, s });
    sc.update(DT, { rot45Right: true });
    finishSwing(sc);
    assert.equal(HEADING_CODES[sc.theta], 'SE');
    assert.equal(sc.s, s);
    assert.ok(Math.abs(rEnd(sc).x - Math.SQRT1_2) < 1e-9 && Math.abs(rEnd(sc).y - Math.SQRT1_2) < 1e-9, 'rechtes Fensterende zeigt nach Südosten');
    sc = warp(0, 0, { theta: E, s });
    sc.update(DT, { rot45Left: true });
    finishSwing(sc);
    assert.equal(HEADING_CODES[sc.theta], 'NE');
    assert.equal(sc.s, s);
    assert.ok(Math.abs(rEnd(sc).x - Math.SQRT1_2) < 1e-9 && Math.abs(rEnd(sc).y + Math.SQRT1_2) < 1e-9, 'rechtes Fensterende zeigt nach Nordosten');
  }
});

test('45°-Prüffall: für alle 8 θ und beide s ändern LT/RT θ um ∓/±45°, LB/RB um ∓/±90°, Y nur s', () => {
  for (const c of COMBOS) {
    for (const [key, k] of KEYS) {
      const sc = warp(10, -20, c);
      const a0 = sc.ang;
      sc.update(DT, press(key));
      finishSwing(sc);
      assert.equal(sc.theta, turnBy(c.theta, k), `θ ${name(c)} ${key}`);
      assert.equal(sc.s, c.s, 's bleibt');
      assert.ok(Math.abs(sc.ang - a0 - (k * Math.PI) / 4) < 1e-9, `Bildwinkel dreht ${k * 45}° ${name(c)} ${key}`);
      assert.equal(sc.map.walkable(sc.dogMap().x, sc.dogMap().y, DOG_R), true);
    }
    const sc = warp(10, -20, c);
    sc.update(DT, { wende: true });
    assert.equal(sc.theta, c.theta, 'Y ändert θ nicht');
    assert.equal(sc.s, c.s === 'R' ? 'L' : 'R', 'Y wechselt nur s');
    assert.equal(sc.swing, null, '180° ist kein Schwenk');
  }
});

test('Paritätsregel: nach 45° wechselt die Klasse (Kreuz ↔ Diagonale), nach 90° und 180° nicht – an der Blickrichtung h', () => {
  for (const c of COMBOS) {
    for (const [key, k] of KEYS) {
      const sc = warp(0, 30, c);
      const h0 = sc.h;
      sc.update(DT, press(key));
      finishSwing(sc);
      if (Math.abs(k) === 1) assert.notEqual(isDiagonal(sc.h), isDiagonal(h0), `45° wechselt die Klasse ${name(c)} ${key}`);
      else assert.equal(isDiagonal(sc.h), isDiagonal(h0), `90° bleibt in der Klasse ${name(c)} ${key}`);
      assert.equal(sc.h, hOf(sc.theta, sc.s), 'h passt zu θ und s');
    }
    const sc = warp(0, 30, c);
    const h0 = sc.h;
    sc.update(DT, { wende: true });
    assert.equal(sc.h, opposite(h0));
    assert.equal(isDiagonal(sc.h), isDiagonal(h0), '180° bleibt in der Klasse');
  }
});

// ================================================================== Bild-Gleichheit
const picture = (sc) => ({ theta: sc.theta, s: sc.s, ang: ((sc.ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), cam: { ...sc.cam }, dog: { ...sc.dog }, m: mapAt(sc, sc.dog.x, sc.dog.y) });
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
const SPOTS = [{ x: 0, y: 0 }, { x: 60, y: -40 }, { x: -120, y: 90 }, { x: 150, y: 30 }, { x: 0, y: -200 }];
const SCREEN_SPOTS = [{ x: SCREEN_W / 2, y: SCREEN_H / 2 }, { x: 150, y: 90 }, { x: 330, y: 200 }];

test('Zweimal 45° = einmal 90°: gleiches Bild (θ, Kamera, Bildschirmstelle und Kartenstelle des Dackels), alle θ, beide s, beide Seiten', () => {
  let n = 0;
  for (const c of COMBOS) {
    for (const p of SPOTS) {
      for (const ds of SCREEN_SPOTS) {
        for (const [k45, k90] of [[-1, 'lb'], [1, 'rb']]) {
          const a = warp(p.x, p.y, c, ds);
          const b = warp(p.x, p.y, c, ds);
          for (let i = 0; i < 2; i++) {
            a.update(DT, press(k45 < 0 ? 'lt' : 'rt'));
            finishSwing(a);
          }
          b.update(DT, press(k90));
          finishSwing(b);
          samePicture(picture(a), picture(b), `${name(c)} (${p.x},${p.y}) ${k45}`);
          n++;
        }
      }
    }
  }
  assert.ok(n > 400);
});

test('Hin und zurück / achtmal 45° in dieselbe Richtung (auch kopfüber und bei s = L): wieder dasselbe Bild', () => {
  const folgen = [[1, 1, 1, 1, 1, 1, 1, 1], [-1, -1, -1, -1, -1, -1, -1, -1], [1, -1], [-1, 1], [1, 1, -1, -1], [2, -2], [2, 2, 2, 2], [-2, -2, -2, -2], [1, 2, 1, -2, -1, -1], [1, 1, 1, 1, -2, -2]];
  const key = (k) => (k === -1 ? 'lt' : k === 1 ? 'rt' : k === -2 ? 'lb' : 'rb');
  let n = 0;
  for (const c of COMBOS) {
    for (const p of SPOTS) {
      for (const ds of SCREEN_SPOTS) {
        for (const seq of folgen) {
          const sc = warp(p.x, p.y, c, ds);
          const before = picture(sc);
          for (const k of seq) {
            sc.update(DT, press(key(k)));
            assert.ok(sc.swing, 'Drehung in der Zone geht ' + name(c));
            finishSwing(sc);
          }
          samePicture(picture(sc), before, `${name(c)} (${p.x},${p.y}) ${seq.join(',')}`);
          n++;
        }
      }
    }
  }
  assert.ok(n > 800, 'geprüfte Folgen: ' + n);
  // kopfüber (θ = Nordwesten) und s = L ausdrücklich
  for (const c of [{ theta: HEADINGS[5], s: 'R' }, { theta: HEADINGS[5], s: 'L' }]) {
    const sc = warp(40, 10, c);
    const before = picture(sc);
    for (let i = 0; i < 8; i++) {
      sc.update(DT, press('rt'));
      finishSwing(sc);
    }
    samePicture(picture(sc), before, 'kopfüber ' + name(c));
  }
});

// ================================================================== Diagonal fühlt sich nicht anders an
test('Diagonal fühlt sich nicht anders an: Scrolltempo 70 E/s in allen 8 Richtungen, Dackel-Tempo auf dem Bildschirm gleich', () => {
  assert.equal(SPEED, 70);
  assert.equal(DOG_SPEED, 120);
  for (const c of COMBOS) {
    // ohne Eingabe: das Fenster scrollt genau SPEED in Blickrichtung (Karteneinheiten pro Sekunde)
    let sc = warp(0, 0, c);
    const h = sc.h;
    const cam0 = { ...sc.cam };
    const m0 = sc.dogMap();
    play(sc, 60, {}, new Monitor(sc)); // 1 s
    const dc = { x: sc.cam.x - cam0.x, y: sc.cam.y - cam0.y };
    const hv = unitVec(h);
    assert.ok(Math.abs(Math.hypot(dc.x, dc.y) - SPEED) < 0.05, `Scrolltempo ${name(c)}: ${Math.hypot(dc.x, dc.y).toFixed(3)}`);
    assert.ok(Math.abs(dc.x - hv[0] * SPEED) < 0.05 && Math.abs(dc.y - hv[1] * SPEED) < 0.05, 'in Blickrichtung ' + name(c));
    const m1 = sc.dogMap();
    assert.ok(Math.abs(Math.hypot(m1.x - m0.x, m1.y - m0.y) - SPEED) < 0.05, 'Dackel wird genauso schnell getragen');
    // Stick rechts: Dackel bewegt sich auf dem Bildschirm mit DOG_SPEED nach rechts, in jeder Ausrichtung gleich
    sc = warp(0, 0, c);
    const x0 = sc.dog.x;
    play(sc, 30, { mx: 1 }); // 0,5 s
    assert.ok(Math.abs(sc.dog.x - x0 - DOG_SPEED * 0.5) < 0.2, `Dackel-Tempo auf dem Bildschirm ${name(c)}: ${(sc.dog.x - x0).toFixed(2)}`);
    // senkrecht (die Kamera folgt quer): gemessen an der Karte – Dackel-Weg minus Scrollen = DOG_SPEED · 0,5 s in Bildschirm-unten
    sc = warp(0, 0, c);
    const q0 = sc.dogMap();
    play(sc, 30, { my: 1 });
    const q1 = sc.dogMap();
    const dd = dVec(sc);
    const hv2 = unitVec(sc.h);
    const lat = (q1.x - q0.x - hv2[0] * SPEED * 0.5) * dd[0] + (q1.y - q0.y - hv2[1] * SPEED * 0.5) * dd[1];
    assert.ok(Math.abs(lat - DOG_SPEED * 0.5) < 0.5, `Dackel-Tempo senkrecht ${name(c)}: ${lat.toFixed(2)}`);
  }
});

test('Diagonal-Gang liegt im Bild waagerecht und gleich breit wie ein gerader Gang (gemessen an den Wänden auf dem Bildschirm)', () => {
  const widths = [];
  for (const a of ARMS8) {
    for (const s of ['R', 'L']) {
      // Fenster ausgerichtet auf den Arm: Blickrichtung nach außen, Fenstermitte im Arm
      const theta = s === 'R' ? a.dir : opposite(a.dir);
      const sc = warp(inArm(a, APO + 300).x, inArm(a, APO + 300).y, { theta, s });
      const p = inArm(a, APO + 300);
      const upper = screenOf(sc, inArm(a, APO + 300, -HALF));
      const lower = screenOf(sc, inArm(a, APO + 300, HALF));
      const far = screenOf(sc, inArm(a, APO + 400, HALF));
      const mid = screenOf(sc, p);
      assert.ok(Math.abs(mid.x - SCREEN_W / 2) < 1e-6 && Math.abs(mid.y - SCREEN_H / 2) < 1e-6);
      assert.ok(Math.abs(upper.x - lower.x) < 1e-6, `Wände übereinander (Gang liegt waagerecht) ${a.name} ${s}`);
      assert.ok(Math.abs(Math.abs(far.y - lower.y)) < 1e-6, 'Wand läuft waagerecht ' + a.name + ' ' + s);
      assert.ok(Math.abs(far.x - lower.x) > 99 && Math.abs(far.x - lower.x) < 101, 'Fortschritt im Gang geht seitwärts');
      widths.push(Math.abs(lower.y - upper.y));
    }
  }
  assert.ok(widths.every((w) => Math.abs(w - WIDTH) < 1e-6), 'Gangbreite im Bild überall ' + WIDTH + ': ' + widths.join(','));
});

// ================================================================== Schwenk
test('Schwenk: auch bei 45° um den Dackel, 0,5 s, Spiel pausiert, Eingaben im Schwenk ignoriert; danach „rechts“ = rechts', () => {
  for (const c of COMBOS) {
    for (const [key, k] of KEYS) {
      const sc = warp(30, -20, c, { x: 200, y: 150 });
      const m0 = sc.dogMap();
      const dog0 = { ...sc.dog };
      const dirStart = sc.dir;
      const camStart = { ...sc.cam };
      const sOld = sc.s;
      const mon = new Monitor(sc);
      sc.update(DT, press(key));
      mon.step();
      assert.ok(sc.swing);
      const theta1 = sc.theta;
      assert.equal(theta1, turnBy(c.theta, k));
      let frames = 0;
      while (sc.swing) {
        sc.update(DT, { mx: 1, my: -1, rotLeft: true, rot45Right: true, wende: true, rotRight: true });
        mon.step({});
        const m = mapAt(sc, sc.dog.x, sc.dog.y);
        assert.ok(Math.hypot(m.x - m0.x, m.y - m0.y) < 1e-6, 'Dackel bleibt an seiner Kartenstelle');
        assert.deepEqual(sc.dog, dog0, 'und an seiner Bildschirmstelle');
        frames++;
      }
      assert.ok(frames >= 29 && frames <= 31, `0,5 s = 30 Frames, war ${frames} (${name(c)} ${key})`);
      assert.equal(sc.theta, theta1, 'Drücke im Schwenk ignoriert');
      assert.equal(sc.s, sOld);
      assert.equal(sc.dir, dirStart);
      assert.ok(Math.hypot(sc.cam.x - camStart.x, sc.cam.y - camStart.y) > 0 || k === 0, 'Fenstermitte kreist um den Dackel');
      assert.ok(mon.swingDrift < 1e-6);
      const x0 = sc.dog.x;
      play(sc, 15, { mx: 1 });
      assert.ok(sc.dog.x > x0 + 5, 'rechts bleibt rechts ' + name(c) + ' ' + key);
      const y0 = sc.dog.y;
      play(sc, 5, { my: 1 });
      assert.ok(sc.dog.y >= y0, 'unten bleibt unten');
    }
  }
  assert.equal(SWING_TIME, 0.5);
});

// ================================================================== Kamera, Position
test('Flüssige Kamera und keine Eigenbewegung: nach jeder 45°-/90°-Drehung im Achteck und im Arm (Einfahren), mit und ohne Eingabe', () => {
  for (const c of COMBOS) {
    for (const [key] of KEYS) {
      for (const where of [{ x: 0, y: 0 }, inArm(armDir(c.theta), 330), inArm(armDir(W), 320, 0), { x: -100, y: 120 }]) {
        if (!ACHTECK_MAP.walkable(where.x, where.y, DOG_R)) continue;
        for (const withStick of [false, true]) {
          const sc = warp(where.x, where.y, c);
          if (!sc.canTurn) continue;
          const mon = new Monitor(sc);
          sc.update(DT, press(key));
          mon.step();
          finishSwing(sc, mon);
          const bot = (sc2) => {
            // Lenken: im Gang bleiben (zur Mitte des Achtecks bzw. entlang der Blickrichtung)
            const m = sc2.dogMap();
            const len = Math.hypot(m.x, m.y) || 1;
            return steer(sc2, -(m.x / len) * 40, -(m.y / len) * 40);
          };
          for (let i = 0; i < 120 && sc.deaths === 0; i++) {
            const inp = withStick ? bot(sc) : {};
            sc.update(DT, inp);
            mon.step(inp);
          }
          assert.ok(mon.maxJump <= 4 && mon.maxKink <= 0.1);
        }
      }
    }
  }
});

test('Position ändert sich nie von selbst: ohne Eingabe nur in Scrollrichtung – nie durch Drehen, Folgen, Wände oder Bildrand', () => {
  for (const c of COMBOS) {
    for (const p of [{ x: 0, y: 0 }, { x: 80, y: 60 }, inArm(armDir(E), 300, 60)]) {
      const sc = warp(p.x, p.y, c, { x: 180, y: 70 });
      const mon = new Monitor(sc);
      for (let i = 0; i < 8; i++) {
        sc.update(DT, press(['lt', 'rt', 'lb', 'rb'][i % 4]));
        mon.step();
        finishSwing(sc, mon);
        for (let f = 0; f < 20 && !sc.respawn && sc.deaths === 0; f++) {
          sc.update(DT, {});
          mon.step();
        }
        if (sc.deaths) break;
      }
      assert.ok(mon.sideDrift < 1e-6, `seitliche Verschiebung ${mon.sideDrift} ${name(c)}`);
    }
  }
});

test('Der Dackel stirbt an Wand und Bildrand (kein Schieben) und beginnt in der Mitte des Achtecks neu, mit der Ausrichtung beim Verlassen', () => {
  for (const c of COMBOS) {
    // in der Mitte starten, ein Stück in einen Arm fliegen (Blickrichtung), dann gegen die Wand lenken
    const sc = warp(0, 0, c);
    const th = sc.theta;
    const s = sc.s;
    play(sc, 10, {});
    const hv = unitVec(sc.h);
    // Seitenwand: quer zur Blickrichtung lenken, bis es kracht
    let died = false;
    for (let i = 0; i < 600 && !died; i++) {
      sc.update(DT, { my: 1 });
      if (sc.deaths) died = true;
    }
    assert.ok(died, 'Wand/Bildrand tötet ' + name(c));
    assert.ok(sc.respawn, 'kurzer Neustart');
    const m = sc.dogMap();
    assert.ok(Math.hypot(m.x, m.y) < 1e-6, 'Neustart in der Mitte des Achtecks: ' + nd(m.x) + ',' + nd(m.y));
    assert.equal(sc.theta, th);
    assert.equal(sc.s, s);
    assert.ok(hv);
  }
});

// ================================================================== Zu früh gedreht
test('Zu früh gedreht in einen Diagonal-Arm (und in jeden anderen Arm): ohne Lenken Tod und Neustart an der Kreuzung, mit Lenken überlebt', () => {
  let n = 0;
  for (const a of ARMS8) {
    for (const outward of [true, false]) {
      for (const [key, k] of KEYS) {
        // ein Stück im Arm fliegen, Zone noch offen (APO − 8 + 160): Startlage mitten im Arm, Blickrichtung nach außen oder innen
        const h = outward ? a.dir : opposite(a.dir);
        const c = { theta: h, s: 'R' };
        const start = inArm(a, APO + 40);
        const make = () => {
          const sc = warp(0, 0, c); // Kreuzung merken (Neustart)
          sc.warp(start.x, start.y, c.theta, c.s);
          sc.checkpoint = { x: 0, y: 0, theta: c.theta, s: c.s }; // der Dackel kam aus der Mitte
          return sc;
        };
        // ohne Lenken
        let sc = make();
        sc.update(DT, press(key));
        assert.ok(sc.swing, 'gedreht im Arm (in der Zone) ' + a.name);
        finishSwing(sc);
        assert.ok(sc.h !== a.dir && sc.h !== opposite(a.dir), 'nach der Drehung zeigt die Blickrichtung quer/schräg zum Arm');
        let f = 0;
        while (!sc.deaths && f++ < 60 * 5) sc.update(DT, {});
        // Ausnahme: nach innen um 45° gedreht, schräg ins Achteck hinein – dort ist Platz, ohne Lenken geht es (eine Weile) gut
        const intoOctagon = !outward && Math.abs(k) === 1;
        if (!intoOctagon) {
          assert.equal(sc.deaths, 1, `ohne Lenken Tod ${a.name} ${key} out=${outward}`);
          assert.ok(Math.hypot(sc.dogMap().x, sc.dogMap().y) < 1e-6, 'Neustart an der Kreuzung (Mitte des Achtecks)');
        }
        // mit Lenken: im Arm bleiben (der Dackel steuert gegen das Scrollen), dann zurückdrehen (die Zone reicht noch) und weiterfliegen
        sc = make();
        sc.update(DT, press(key));
        finishSwing(sc);
        const mon = new Monitor(sc);
        const lane = (hv, speed) => {
          const m = sc.dogMap();
          const across = m.x * a.v[0] + m.y * a.v[1];
          return steer(sc, hv[0] * speed - a.v[0] * across * 3, hv[1] * speed - a.v[1] * across * 3);
        };
        for (let i = 0; i < 90; i++) {
          const inp = lane(a.u, 40);
          sc.update(DT, inp);
          mon.step(inp);
        }
        assert.equal(sc.deaths, 0, `mit Lenken überlebt ${a.name} ${key} out=${outward}`);
        assert.ok(sc.canTurn, 'Zone reicht noch zum Zurückdrehen');
        const back = { lt: 'rt', rt: 'lt', lb: 'rb', rb: 'lb' }[key];
        sc.update(DT, press(back));
        assert.ok(sc.swing, 'zurückgedreht');
        finishSwing(sc, mon);
        assert.equal(sc.h, h, 'Blickrichtung wieder wie vorher');
        for (let i = 0; i < 180; i++) {
          const inp = lane(unitVec(sc.h), 70);
          sc.update(DT, inp);
          mon.step(inp);
        }
        assert.equal(sc.deaths, 0, `nach dem Zurückdrehen weiter ohne Tod ${a.name} ${key} out=${outward}`);
        n++;
      }
    }
  }
  assert.equal(n, 64);
});

test('Zu früh gedreht (Spielersicht): Neustart in der Mitte des Achtecks nach Tod im Arm, mit der Ausrichtung beim Verlassen', () => {
  for (const a of ARMS8) {
    const sc = warp(0, 0, { theta: a.dir, s: 'R' });
    // wirklich aus der Mitte in den Arm fliegen (trackJunction merkt die Kreuzung)
    for (let i = 0; i < 60 * 8 && Math.hypot(sc.dogMap().x, sc.dogMap().y) < APO + 120; i++) sc.update(DT, steer(sc, a.u[0] * 70, a.u[1] * 70));
    const m = sc.dogMap();
    assert.ok(Math.hypot(m.x, m.y) >= APO + 120 - 3);
    sc.update(DT, press('rt'));
    finishSwing(sc);
    const th = sc.theta;
    assert.equal(th, turnBy(a.dir, 1));
    for (let i = 0; i < 60 * 5 && !sc.deaths; i++) sc.update(DT, {});
    assert.equal(sc.deaths, 1, 'Tod ' + a.name);
    const r = sc.dogMap();
    assert.ok(Math.hypot(r.x, r.y) < 1e-6, 'Neustart an der Kreuzung (Mitte)');
    assert.equal(sc.theta, a.dir, 'mit der Ausrichtung, mit der der Dackel das Achteck verließ');
    assert.equal(sc.s, 'R');
  }
});

// ================================================================== Nie festsitzen
test('Nie festsitzen: ein Bot erreicht von einem Gitter von Startlagen (alle 8 Arme, beide s, nach innen und außen) aus jeden der 8 Knochen ohne Tod', () => {
  const bot = new AchteckBot(ACHTECK_MAP);
  let runs = 0;
  let reached = 0;
  for (const a of ARMS8) {
    for (const s of ['R', 'L']) {
      for (const outward of [false, true]) {
        for (const along of [APO + 120, APO + 560]) {
          const h = outward ? a.dir : opposite(a.dir);
          const theta = s === 'R' ? h : opposite(h);
          const p = inArm(a, along, (runs % 3 - 1) * 40);
          const sc = warp(p.x, p.y, { theta, s });
          sc.hint = 0;
          const mon = new Monitor(sc, `${a.name} ${s} ${outward ? 'aus' : 'ein'} ${along}`);
          let order = [...ARMS8];
          const rng = new Rng(1000 + runs);
          order = order.sort(() => rng.next() - 0.5);
          for (const t of order) {
            const b = ACHTECK_MAP.bones[t.i];
            let ok = false;
            for (let f = 0; f < 60 * 40; f++) {
              const m = sc.dogMap();
              if (Math.hypot(m.x - b.x, m.y - b.y) < BONE_R) {
                ok = true;
                break;
              }
              const inp = bot.control(sc, b.x, b.y, t.dir);
              sc.update(DT, inp);
              mon.step(inp);
              assert.equal(sc.deaths, 0, `Bot stirbt: ${mon.label} → ${t.name} (Frame ${f}) ${sc.deaths}`);
            }
            assert.ok(ok, `Bot erreicht ${t.name} nicht: ${mon.label}`);
            reached++;
          }
          runs++;
        }
      }
    }
  }
  assert.equal(runs, 64);
  assert.equal(reached, 64 * 8);
});

// ================================================================== Rückmeldung
test('Rückmeldung: Symbol leuchtet in der Dreh-Zone; abgelehnter Druck (LT/RT wie LB/RB) wackelt rot mit Ton; nichts im HUD dreht mit', () => {
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
  const ctx = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => ((t[k] = v), true) });
  const norm = (a) => Math.abs(((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  for (const theta of HEADINGS) {
    const sc = warp(0, 0, { theta, s: 'R' });
    sc.hint = 5;
    sc.ang = headingAngle(theta);
    calls.length = 0;
    drawFenster(ctx, sc);
    const iconOn = calls.find((c) => c[0] === 'arc' && c[2] === 13);
    assert.ok(iconOn, 'Symbol gezeichnet');
    assert.match(String(iconOn[3]), /^rgba\(255,214,90/, 'leuchtet (gelb) im Achteck ' + HEADING_CODES[theta]);
    for (const c of calls.filter((c) => c[0] === 'text')) assert.ok(norm(c[1]) < 1e-9, 'Text dreht nicht mit');
    assert.ok(norm(iconOn[1]) < 1e-9, 'Symbol dreht nicht mit');
    // Kurzhinweis: selbst gezeichnet (keine zusätzliche Schrift), nie gedreht
    const withHint = calls.filter((c) => c[0] === 'text').length;
    sc.hint = 0;
    calls.length = 0;
    drawFenster(ctx, sc);
    assert.equal(calls.filter((c) => c[0] === 'text').length, withHint, 'Hinweis ohne Schrift (Steam Deck)');
    // Zone gerade noch drin (Arm, 150 hinter der Seite) leuchtet; weit draußen grau
    const a = armDir(theta);
    const zone = warp(inArm(a, APO + 100).x, inArm(a, APO + 100).y, { theta, s: 'R' });
    calls.length = 0;
    drawFenster(ctx, zone);
    assert.match(String(calls.find((c) => c[0] === 'arc' && c[2] === 13)[3]), /^rgba\(255,214,90/, 'leuchtet in der Zone des Arms');
    const gang = warp(inArm(a, APO + 500).x, inArm(a, APO + 500).y, { theta, s: 'R' });
    calls.length = 0;
    drawFenster(ctx, gang);
    assert.equal(calls.find((c) => c[0] === 'arc' && c[2] === 13)[3], '#3a3640', 'grau im Arm außerhalb der Zone');
  }
  // abgelehnt: wackelt rot mit Ton – für alle vier Tasten
  for (const key of ['lt', 'rt', 'lb', 'rb']) {
    const a = armDir(E);
    const sc = warp(inArm(a, APO + 500).x, inArm(a, APO + 500).y, { theta: E, s: 'R' });
    sc.update(DT, press(key));
    assert.equal(sc.denied.side, key === 'lt' || key === 'lb' ? 'L' : 'R');
    assert.deepEqual(sc.sfx, ['nope']);
    calls.length = 0;
    drawFenster(ctx, sc);
    assert.match(String(calls.find((c) => c[0] === 'arc' && c[2] === 13)[3]), /^rgba\(220,50,50/, 'rot');
    play(sc, 40);
    assert.equal(sc.denied, null);
  }
  // keine Minimap in dieser Szene
  const sc = warp(0, 0, { theta: E, s: 'R' });
  assert.equal(sc.minimap, false);
});

// ================================================================== Steuerung
function fakeTarget() {
  const handlers = {};
  return {
    addEventListener: (type, fn) => ((handlers[type] ||= []).push(fn)),
    fire: (type, code, repeat = false) => (handlers[type] || []).forEach((fn) => fn({ code, repeat, preventDefault() {} })),
  };
}

test('Steuerung: J/K und LT/RT drehen ±45°; LB/RB und U/O ±90°; Y/L/Q kehrt um; J = Schießen und K = Power bleiben (v0.2), LT/RT tun in v0.2 nichts', () => {
  const t = fakeTarget();
  const inp = new Input(t);
  t.fire('keydown', 'KeyJ');
  let p = inp.poll();
  assert.equal(p.rot45Left, true, 'J = −45°');
  assert.equal(p.fire, true, 'J bleibt Schießen (v0.2)');
  assert.equal(p.rot45Right, false);
  t.fire('keyup', 'KeyJ');
  inp.poll();
  t.fire('keydown', 'KeyK');
  p = inp.poll();
  assert.equal(p.rot45Right, true, 'K = +45°');
  assert.equal(p.power, true, 'K bleibt Power (v0.2)');
  assert.equal(p.rot45Left, false);
  t.fire('keyup', 'KeyK');
  inp.poll();
  t.fire('keydown', 'KeyU');
  assert.equal(inp.poll().rotLeft, true);
  t.fire('keydown', 'KeyO');
  assert.equal(inp.poll().rotRight, true);
  t.fire('keydown', 'KeyL');
  assert.equal(inp.poll().wende, true);
  // Gamepad: LT/RT (Tasten 6/7, analog über value > 0,5), LB (4), RB (5), Y (3)
  const pad = { connected: true, buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), axes: [0, 0] };
  const orig = navigator.getGamepads;
  navigator.getGamepads = () => [pad];
  try {
    const i2 = new Input(fakeTarget());
    pad.buttons[6] = { pressed: false, value: 0.4 };
    assert.equal(i2.poll().rot45Left, false, 'LT unter 0,5 zählt nicht');
    pad.buttons[6] = { pressed: false, value: 0.8 };
    p = i2.poll();
    assert.equal(p.rot45Left, true, 'LT analog über 0,5');
    assert.equal(i2.poll().rot45Left, false, 'nur die Flanke zählt');
    pad.buttons[6] = { pressed: false, value: 0 };
    i2.poll();
    pad.buttons[7] = { pressed: true, value: 1 };
    assert.equal(i2.poll().rot45Right, true, 'RT');
    pad.buttons[7] = { pressed: false, value: 0 };
    i2.poll();
    pad.buttons[4] = { pressed: true, value: 1 };
    assert.equal(i2.poll().rotLeft, true, 'LB bleibt −90°');
    pad.buttons[4] = { pressed: false, value: 0 };
    i2.poll();
    pad.buttons[5] = { pressed: true, value: 1 };
    p = i2.poll();
    assert.equal(p.espressoPressed, true, 'RB bleibt (Espresso/+90°)');
    assert.equal(p.rot45Right, false);
    pad.buttons[5] = { pressed: false, value: 0 };
    i2.poll();
    pad.buttons[3] = { pressed: true, value: 1 };
    assert.equal(i2.poll().wende, true, 'Y = Umkehr');
  } finally {
    navigator.getGamepads = orig;
  }
});

test('Steuerung im Prototyp: J/K/LT/RT/U/O/LB/RB lösen die Drehungen aus (Eingabe wie vom Spieler, über Input)', () => {
  const cases = [['KeyJ', -1], ['KeyK', 1], ['KeyU', -2], ['KeyO', 2]];
  for (const [code, k] of cases) {
    const t = fakeTarget();
    const inp = new Input(t);
    const sc = warp(0, 0, { theta: E, s: 'R' });
    t.fire('keydown', code);
    sc.update(DT, inp.poll());
    assert.ok(sc.swing, code);
    assert.equal(sc.theta, turnBy(E, k), code);
  }
});

test('v0.2 bleibt unberührt: LT/RT-Aktionen ändern im Spiel nichts (Eingabe mit und ohne gleich), Kreuzung dreht weiter 90°', async () => {
  const { Game } = await import('../src/game/game.js');
  const { MemoryStorage } = await import('../src/game/save.js');
  const run = (extra) => {
    const g = new Game({ storage: new MemoryStorage(), platform: {} });
    const rng = new Rng(5);
    const out = [];
    for (let i = 0; i < 400; i++) {
      const inp = { mx: rng.range(-1, 1), my: rng.range(-1, 1), fire: rng.next() < 0.5, firePressed: i % 7 === 0, confirm: i % 11 === 0, ...extra };
      g.update(DT, inp);
      for (const s of g.sfxQueue) out.push(s);
      g.sfxQueue.length = 0;
    }
    return JSON.stringify([g.screen, g.overlay ? g.overlay.title : null, out]);
  };
  assert.equal(run({ rot45Left: true, rot45Right: true }), run({}), 'v0.2 ignoriert LT/RT');
  // Kreuzung (P1): rotate(±1) bleibt 90°
  const k = new FensterScene();
  k.hint = 0;
  k.warp(0, 0, E, 'R');
  k.rotate(1);
  assert.equal(k.theta, S, 'P1 „Kreuzung“: rotate(1) = 90° rechts');
});

// ================================================================== Zufallsspiel
test('45°-Kreuzung: Zufallsspiel (≥ 100.000 Frames, fester Startwert, LT/RT/LB/RB/Y zufällig) – alle Invarianten aus Spielersicht', () => {
  const rng = new Rng(20261010);
  const sc = mk();
  const mon = new Monitor(sc, 'Zufall');
  let input = {};
  const stat = { turns: 0, t45: 0, denied: 0, flips: 0, bones: 0 };
  const FRAMES = 120000;
  for (let i = 0; i < FRAMES; i++) {
    if (i % 24 === 0) {
      const r = rng.next();
      input = { mx: rng.next() < 0.3 ? 0 : rng.range(-1, 1), my: rng.next() < 0.3 ? 0 : rng.range(-1, 1) };
      if (r < 0.06) input.rot45Left = true;
      else if (r < 0.12) input.rot45Right = true;
      else if (r < 0.17) input.rotLeft = true;
      else if (r < 0.22) input.rotRight = true;
      else if (r < 0.25) input.wende = true;
    }
    const inp = i % 24 === 0 ? input : { mx: input.mx, my: input.my };
    const th0 = sc.theta;
    const s0 = sc.s;
    const score0 = sc.score;
    const deniedBefore = !!sc.denied;
    sc.update(DT, inp);
    mon.step(inp);
    if (sc.theta !== th0) {
      stat.turns++;
      if (isDiagonal(sc.h) !== isDiagonal(hOf(th0, s0)) && sc.s === s0) stat.t45++;
    }
    if (sc.s !== s0) stat.flips++;
    if (sc.denied && !deniedBefore) stat.denied++;
    if (sc.score > score0) stat.bones++;
  }
  console.log(`# Zufallsspiel: ${FRAMES} Frames, Drehungen ${stat.turns} (45°: ${stat.t45}), abgelehnt ${stat.denied}, Umkehr ${stat.flips}, Tode ${mon.deaths}, Knochen ${stat.bones}, größter Kamera-Knick ${mon.maxKink.toFixed(3)} rad/Frame, Sprung ${mon.maxJump.toFixed(2)}`);
  assert.ok(stat.turns > 100 && stat.t45 > 30 && stat.denied > 50 && stat.flips > 50 && mon.deaths > 20, JSON.stringify({ ...stat, deaths: mon.deaths }));
});

test('45°-Kreuzung: Spieler-Bot fliegt Dauerläufe durchs Achteck (mit Drehen in 45°- und 90°-Schritten) – keine Verstöße, kein Tod', () => {
  const sc = mk();
  const bot = new AchteckBot(ACHTECK_MAP);
  const mon = new Monitor(sc, 'Dauerlauf');
  const rng = new Rng(77);
  let ziel = rng.int(0, 7);
  let n = 0;
  for (let i = 0; i < 60 * 60 * 25; i++) {
    const b = ACHTECK_MAP.bones[ziel];
    if (Math.hypot(sc.dogMap().x - b.x, sc.dogMap().y - b.y) < BONE_R) {
      ziel = rng.int(0, 7);
      n++;
    }
    const inp = bot.control(sc, b.x, b.y, ARMS8[ziel].dir);
    sc.update(DT, inp);
    mon.step(inp);
  }
  assert.equal(sc.deaths, 0, 'ohne Tod');
  assert.ok(n >= 40, 'Ziele erreicht: ' + n);
});

// ================================================================== Anbindung
test('Anbindung: Direktstart-Szene, Netz/Kreuzung/v0.2 erreichbar, Optionen-Zeile, keine Minimap für das Achteck', async () => {
  const { Game } = await import('../src/game/game.js');
  const { MemoryStorage } = await import('../src/game/save.js');
  const { NETZ_MAP } = await import('../src/proto/netz-map.js');
  const { minimapFor } = await import('../src/proto/minimap.js');
  const g = new Game({ storage: new MemoryStorage(), platform: {} });
  g.startProto('45grad');
  assert.equal(g.screen, 'proto');
  assert.ok(g.proto instanceof AchteckScene);
  assert.equal(g.proto.map, ACHTECK_MAP);
  g.proto.warp(0, 0, E, 'R');
  const st = minimapFor(g.proto);
  const before = JSON.stringify(st);
  for (let i = 0; i < 30; i++) g.update(DT, { mx: 0, my: 0, rot45Right: i === 0 });
  assert.equal(JSON.stringify(st), before, 'Minimap-Zustand wird für das Achteck nicht angefasst');
  assert.equal(g.proto.theta, turnBy(E, 1), 'LT/RT drehen im Prototyp');
  g.startProto('netz');
  assert.equal(g.proto.map, NETZ_MAP);
  g.startProto('fenster');
  assert.equal(g.proto.map.corridors.length, 2);
  // Optionen vom Titel: Zeile „Prototyp: 45°-Kreuzung“
  const g2 = new Game({ storage: new MemoryStorage(), platform: {} });
  g2.openOptions(() => {}, { fromTitle: true });
  const labels = (g2.overlay?.items || []).map((i) => i.label);
  assert.ok(labels.includes('Prototyp: 45°-Kreuzung'), 'Optionen-Zeile: ' + labels.join('|'));
});

test('Lage-Konstanten: Arme 720 lang, Start im Westarm, Tempo/Dreh-Zone wie in der Kreuzung', () => {
  assert.equal(END, APO + 720);
  assert.equal(TURN_AHEAD, 160);
  assert.equal(DOG_MARGIN, 14);
  assert.equal(S, 2);
});
