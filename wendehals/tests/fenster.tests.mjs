import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, W, N, opposite, turnCW, turnCCW, CARDINALS, DIR_VEC } from '../src/core/math.js';
import { FensterScene, ARMS, doorOpen, SWING_TIME, BONE_POS, CAM_END, BONE_AT, clampCam, CAMW, HALF } from '../src/proto/fenster.js';
import { Rng } from '../src/core/rng.js';

const DT = 1 / 60;
const run = (sc, sec, input = {}) => {
  for (let i = 0; i < Math.round(sec / DT); i++) sc.update(DT, input);
};
const finishSwing = (sc) => run(sc, SWING_TIME + 0.05);
/** Fenster und Dackel mitten auf die Kreuzung setzen (nur dort darf gedreht werden). */
const toJunction = (sc) => {
  sc.cam = { x: 0, y: 0 };
  sc.dog = { x: 240, y: 135 };
  return sc;
};

test('Fenster: Drehen ändert theta um ±90°, s bleibt (Skizze: Osten, rechts → R-Ende nach Süden)', () => {
  const sc = toJunction(new FensterScene());
  assert.equal(sc.theta, E);
  sc.update(DT, { rotRight: true });
  assert.equal(sc.theta, S);
  assert.equal(sc.s, 'R');
  finishSwing(sc);
  sc.update(DT, { rotLeft: true });
  assert.equal(sc.theta, E);
  finishSwing(sc);
  sc.update(DT, { rotLeft: true });
  assert.equal(sc.theta, N);
  assert.equal(sc.s, 'R');
  finishSwing(sc);
  sc.update(DT, { espressoPressed: true }); // RB = rechts drehen
  assert.equal(sc.theta, E);
});

test('Fenster: Y ändert nur s, Blickrichtung +180°, theta bleibt', () => {
  const sc = new FensterScene();
  const h0 = sc.h;
  sc.update(DT, { wende: true });
  assert.equal(sc.s, 'L');
  assert.equal(sc.theta, E);
  assert.equal(sc.h, opposite(h0));
  assert.ok(!sc.swing, 'keine Pause bei der Umkehr');
  run(sc, 0.5);
  assert.equal(sc.dir, -1);
});

test('Fenster: Tür offen genau dann, wenn h oder h+180° die Armrichtung ist', () => {
  for (const h of CARDINALS) {
    for (const arm of ARMS) {
      const expected = h === arm.dir || h === opposite(arm.dir);
      assert.equal(doorOpen(arm.dir, h), expected);
    }
  }
  const sc = toJunction(new FensterScene());
  // Osten/Westen offen, wenn waagerecht gescrollt wird; nach Rechtsdrehung Norden/Süden
  assert.deepEqual(ARMS.filter((a) => doorOpen(a.dir, sc.h)).map((a) => a.dir).sort(), [E, W].sort());
  sc.update(DT, { rotRight: true });
  assert.deepEqual(ARMS.filter((a) => doorOpen(a.dir, sc.h)).map((a) => a.dir).sort(), [N, S].sort());
});

test('Fenster: Schwenk pausiert und ignoriert Eingabe; danach wirkt „rechts“ bildschirmbezogen', () => {
  const sc = toJunction(new FensterScene());
  sc.update(DT, { rotRight: true });
  const dog = { ...sc.dog };
  run(sc, SWING_TIME / 2, { mx: 1, rotLeft: true, wende: true });
  assert.ok(sc.swing, 'Schwenk läuft');
  assert.equal(sc.theta, S, 'rotLeft im Schwenk ignoriert');
  assert.equal(sc.s, 'R');
  assert.deepEqual(sc.dog, dog);
  assert.ok(sc.ang > 0 && sc.ang < Math.PI / 2 + 1e-9);
  finishSwing(sc);
  assert.ok(!sc.swing);
  // Nach der Drehung: Stick nach rechts bewegt den Dackel auf dem Bildschirm nach rechts
  const x0 = sc.dog.x;
  run(sc, 0.3, { mx: 1 });
  assert.ok(sc.dog.x > x0, 'rechts bleibt rechts');
});

test('Fenster: Dackel erreicht Knochen, Ziel wechselt und ist nie der alte Arm', () => {
  const sc = new FensterScene();
  const t0 = sc.target;
  assert.notEqual(t0, 3, 'erstes Ziel nicht Gelb');
  const b = BONE_POS(t0);
  // Dackel direkt auf den Knochen setzen (Kartenkoordinaten -> Bildschirm über Kamera/theta)
  // Das Fenster scrollt höchstens bis CAM_END (30 vor dem Knochen); theta = Osten: Bildschirm-x = Karte-x, -y = Karte-y
  sc.cam = { x: (b.x * CAM_END) / BONE_AT, y: (b.y * CAM_END) / BONE_AT };
  sc.dog = { x: 240 + (b.x - sc.cam.x), y: 135 + (b.y - sc.cam.y) };
  sc.update(DT, {});
  assert.equal(sc.score, 1);
  assert.notEqual(sc.target, t0);
});

test('Fenster: 3 Minuten Zufallseingabe – kein Fehler, Dackel bleibt auf dem Boden', () => {
  const sc = new FensterScene();
  const rng = new Rng(4242);
  let input = {};
  for (let i = 0; i < 3 * 60 * 60; i++) {
    if (i % 20 === 0) {
      const r = rng.next();
      input = { mx: rng.range(-1, 1), my: rng.range(-1, 1) };
      if (r < 0.04) input.rotLeft = true;
      else if (r < 0.08) input.rotRight = true;
      else if (r < 0.12) input.wende = true;
    }
    sc.update(DT, i % 20 === 0 ? input : { mx: input.mx, my: input.my });
    const m = sc.dogMap();
    assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y));
    if (!sc.swing) assert.ok(sc.walkable(m.x, m.y, 0), `Dackel auf Boden bei Schritt ${i} (${m.x.toFixed(1)}, ${m.y.toFixed(1)})`);
  }
});

test('Fenster: Scroll-Behälter – Drehen im Gang und zurück verschiebt das Bild nicht, Kamera bleibt im Behälter', () => {
  const sc = new FensterScene();
  for (let i = 0; i < 260; i++) sc.update(DT, {});
  for (let i = 0; i < 60; i++) sc.update(DT, { my: 1 }); // Dackel nach unten, Kamera folgt
  const turn = (input) => {
    sc.update(DT, input);
    for (let i = 0; i < 400; i++) sc.update(DT, {});
  };
  turn({ rotRight: true });
  turn({ rotLeft: true });
  assert.equal(sc.theta, E);
  const c = clampCam(sc.cam.x, sc.cam.y);
  assert.ok(Math.hypot(c.x - sc.cam.x, c.y - sc.cam.y) < 1e-6, 'Kamera im Behälter');
  let prev = sc.dogMap();
  for (let i = 0; i < 600; i++) {
    sc.update(DT, { mx: Math.sin(i / 30), my: Math.cos(i / 20) });
    const m = sc.dogMap();
    assert.ok(Math.hypot(m.x - prev.x, m.y - prev.y) < 5, 'kein Sprung');
    prev = m;
  }
});

test('Fenster: nach 90°-Drehung nahe der Kreuzungsecke bleibt das Fenster nicht stecken', () => {
  for (const [cx, cy] of [[-20, -60], [-20, 0], [20, 60]]) {
    for (const dx of [-60, 0, 60]) {
      for (const dy of [-80, -40, 40, 80]) {
        for (const rot of ['rotLeft', 'rotRight']) {
          const sc = new FensterScene();
          sc.hint = 0;
          sc.cam = { x: cx, y: cy };
          sc.dog = { x: 240 + dx, y: 135 + dy };
          const m = sc.dogMap();
          if (!sc.walkable(m.x, m.y) || !sc.canTurn) continue;
          sc.update(DT, { [rot]: true });
          for (let i = 0; i < 100; i++) sc.update(DT, {});
          const c0 = { ...sc.cam };
          for (let i = 0; i < 120; i++) sc.update(DT, {});
          const v = DIR_VEC[sc.theta];
          const across = Math.abs(sc.cam.x * v[1]) + Math.abs(sc.cam.y * v[0]);
          const pos = (sc.cam.x * v[0] + sc.cam.y * v[1]) * (sc.s === 'R' ? 1 : -1);
          if (across <= CAMW + 1 && pos < CAM_END - 2) {
            assert.ok(Math.hypot(sc.cam.x - c0.x, sc.cam.y - c0.y) >= 1, `steckt: cam ${cx},${cy} dog ${dx},${dy} ${rot}`);
          }
        }
      }
    }
  }
});

test('Fenster: Drehen nur auf der Kreuzung – im Gang abgelehnt mit Anzeige und Ton', () => {
  const sc = new FensterScene(); // Start am Ende des Westarms
  assert.ok(!sc.canTurn);
  sc.update(DT, { rotRight: true });
  assert.equal(sc.theta, E, 'im Gang keine Drehung');
  assert.ok(!sc.swing);
  assert.equal(sc.denied?.side, 'R');
  assert.deepEqual(sc.sfx, ['nope']);
  sc.update(DT, { rotLeft: true });
  assert.equal(sc.denied?.side, 'L');
  run(sc, 1);
  assert.equal(sc.denied, null, 'Anzeige verschwindet wieder');
  toJunction(sc);
  assert.ok(sc.canTurn);
  sc.update(DT, { rotRight: true });
  assert.equal(sc.theta, S);
});

test('Fenster: Kamera fährt in einer Kurve in die Gabelung (kein L: seitlich und vorwärts gleichzeitig)', () => {
  // Nach Rechtsdrehung auf der Kreuzung mit der Kamera seitlich versetzt: Fenster muss in den Südarm einschwenken
  const sc = toJunction(new FensterScene());
  sc.cam = { x: 35, y: 0 };
  sc.dog = { x: 240, y: 135 - 85 }; // Dackel nahe der Ostwand des Südarms (nach der Drehung)
  sc.update(DT, { rotRight: true });
  finishSwing(sc);
  let both = 0;
  let maxTurn = 0;
  let prev = null;
  let p = { ...sc.cam };
  for (let i = 0; i < 240; i++) {
    sc.update(DT, {});
    const v = { x: sc.cam.x - p.x, y: sc.cam.y - p.y };
    if (Math.abs(v.x) > 0.05 && Math.abs(v.y) > 0.05) both++;
    if (prev && Math.hypot(v.x, v.y) > 0.5 && Math.hypot(prev.x, prev.y) > 0.5) {
      const a = Math.abs(Math.atan2(v.x * prev.y - v.y * prev.x, v.x * prev.x + v.y * prev.y));
      maxTurn = Math.max(maxTurn, a);
    }
    prev = v;
    p = { ...sc.cam };
  }
  assert.ok(sc.cam.y > 150, 'Fenster ist in den Südarm gefahren: ' + JSON.stringify(sc.cam));
  assert.ok(maxTurn < 0.35, 'keine harte Richtungsänderung (max ' + maxTurn.toFixed(2) + ' rad/Frame)');
});

test('Fenster: Toleranz – schon vor der Kreuzung drehen, Fenster samt Dackel gleitet auf die Kreuzung', () => {
  const sc = new FensterScene();
  // Dackel 120 Einheiten vor dem Kreuzungsquadrat im Westarm (Fenster scrollt nach Osten)
  sc.cam = { x: -(HALF - 8) - 120, y: 0 };
  sc.dog = { x: 240, y: 135 };
  assert.ok(sc.canTurn, 'innerhalb der Toleranz');
  const m0 = sc.dogMap();
  sc.update(DT, { rotRight: true });
  assert.equal(sc.theta, S);
  assert.ok(sc.swing.dur >= SWING_TIME);
  let prev = sc.dogMap();
  while (sc.swing) {
    sc.update(DT, { mx: 1 }); // Eingabe wird während des Schwenks ignoriert
    const m = sc.dogMap();
    if (sc.swing) assert.ok(m.x >= prev.x - 1e-6, 'gleitet stetig nach Osten');
    prev = m;
  }
  const m = sc.dogMap();
  assert.ok(Math.abs(m.x) <= HALF - 8 + 1e-6 && Math.abs(m.y) <= HALF - 8, 'Dackel steht danach auf der Kreuzung: ' + JSON.stringify(m));
  assert.ok(Math.abs(m.y - m0.y) < 1e-6, 'nur entlang des Gangs geglitten');
  assert.deepEqual({ x: sc.dog.x, y: sc.dog.y }, { x: 240, y: 135 }, 'Bildschirmstelle des Dackels bleibt');
  // Zu weit weg: abgelehnt
  const far = new FensterScene();
  far.cam = { x: -(HALF - 8) - 200, y: 0 };
  far.dog = { x: 240, y: 135 };
  assert.ok(!far.canTurn);
});
