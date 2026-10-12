// Tests von „Spielen ab hier“ und „Bezeichnung“ (Paket 13, Stufe 3): Editor-Daten → Karte des Fenster-Prototyps, Startlage an der
// Rahmenstelle, Meldung statt stillem Falschspielen, Bezeichnung im Format `Wendehals-Level <gebiet>/<level>@<stelle>`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spielbarkeit, baueKarte, startLage, erzeugeSzene, DACKEL_BILD } from '../src/editor/spielen.js';
import { bezeichnung, gangMasse, gangPunkt, rahmenEcken } from '../src/editor/daten.js';
import { GEBIETE } from '../src/editor/startdaten.js';
import { NETZ_MAP } from '../src/proto/netz-map.js';
import { E, S, W, N } from '../src/core/math.js';
import { SCREEN_W, SCREEN_H } from '../src/editor/konstanten.js';
import { FensterScene, DOG_R } from '../src/proto/fenster.js';
import { Rng } from '../src/core/rng.js';

const kopie = (g) => JSON.parse(JSON.stringify(g));
const leer = () => ({ format: 1, id: 'test', name: 'Test', tileset: 'bad', bereich: { x0: -500, y0: -500, x1: 500, y1: 500 }, knoten: [], gaenge: [], formteile: [], objekte: [], notizen: [] });
/** Einfaches Gebiet: Gang nach Osten (0,0)→(1200,0), am Ende ein Gang nach Süden (1200,0)→(1200,800). */
function ell() {
  const g = leer();
  g.knoten = [
    { id: 'K1', typ: 'speicher', x: 0, y: 0 },
    { id: 'K2', typ: 'kreuzung', x: 1200, y: 0, w: 200, h: 200 },
    { id: 'K3', typ: 'ende', x: 1200, y: 800 },
  ];
  g.gaenge = [
    { id: 'a', name: 'A', von: 'K1', nach: 'K2', breite: 200 },
    { id: 'b', name: 'B', von: 'K2', nach: 'K3', breite: 200 },
  ];
  return g;
}

test('Netz-Gebiet: dieselbe begehbare Fläche und dieselben Kreuzungen wie die Prototyp-Karte „Netz“', () => {
  const k = baueKarte(GEBIETE['proto-netz']);
  assert.equal(k.junctions.length, NETZ_MAP.junctions.length, 'gleich viele Kreuzungen');
  let abw = 0;
  let boden = 0;
  for (let x = -1100; x <= 950; x += 9) {
    for (let y = -750; y <= 850; y += 9) {
      const a = k.walkable(x, y, DOG_R);
      if (a) boden++;
      if (a !== NETZ_MAP.walkable(x, y, DOG_R)) abw++;
    }
  }
  assert.ok(boden > 3000, 'es gibt Boden');
  assert.ok(abw <= 3, `höchstens Randpunkte weichen ab (hier ${abw} von ${boden} Bodenpunkten)`); // Vereinigung statt Einzelrechteck an Nahtstellen
});

test('Spielbarkeit: Netz spielbar; Diagonalen, Achteck und schräge Teile werden vorher gemeldet', () => {
  assert.deepEqual(spielbarkeit(GEBIETE['proto-netz']).probleme, []);
  const bsp = spielbarkeit(GEBIETE.beispiel);
  assert.equal(bsp.probleme.length, 1);
  assert.match(bsp.probleme[0], /Diagonale.*Südosten/);
  assert.match(bsp.hinweise[0], /Gegner o2/, 'Gegner sind Hinweis, kein Hindernis');
  const ach = spielbarkeit(GEBIETE['proto-achteck']).probleme.join('|');
  assert.match(ach, /Achteck/);
  const g = ell();
  g.formteile.push({ id: 'f1', x: 600, y: 160, laenge: 200, breite: 100, winkel: 45 });
  g.objekte.push({ id: 'o1', typ: 'wand', x: 300, y: 0, laenge: 100, breite: 40, winkel: 135 });
  const p = spielbarkeit(g).probleme;
  assert.equal(p.length, 2);
  assert.match(p[0], /Formteil f1/);
  assert.match(p[1], /Wand o1/);
  assert.throws(() => erzeugeSzene(g, 'a', 500), /noch nicht spielbar/);
  assert.deepEqual(spielbarkeit(leer()).probleme, ['Das Gebiet hat keinen Gang.']);
});

test('Startlage: Dackel steht im Rahmen links der Mitte (wie gezeichnet), Blickrichtung = Richtung des Gangs', () => {
  const g = ell();
  const a = startLage(g, 'a', 600);
  assert.deepEqual([a.x, a.y, a.theta], [480, 0, E]);
  const b = startLage(g, 'b', 500);
  assert.deepEqual([b.x, b.y, b.theta], [1200, 380, S]);
  // Rahmenmitte des Editors = Mitte des Fensters: Dackel (120|135) liegt 120 E hinter der Rahmenmitte
  const m = gangMasse(g, g.gaenge[1]);
  const mitte = gangPunkt(m, 500);
  const ecken = rahmenEcken(m, 500);
  assert.ok(Math.abs((ecken[0][0] + ecken[2][0]) / 2 - mitte.x) < 1e-9 && Math.abs((ecken[0][1] + ecken[2][1]) / 2 - mitte.y) < 1e-9);
  assert.equal(startLage(g, 'gibtsnicht', 0), null);
  // West und Nord
  const w = ell();
  w.knoten[1].x = -1200;
  assert.equal(startLage(w, 'a', 600).theta, W);
  const n = ell();
  n.knoten = [{ id: 'K1', typ: 'speicher', x: 0, y: 0 }, { id: 'K2', typ: 'ende', x: 0, y: -900 }];
  n.gaenge = [{ id: 'a', name: 'A', von: 'K1', nach: 'K2', breite: 200 }];
  assert.equal(startLage(n, 'a', 300).theta, N);
});

test('Szene: Fenster zeigt die Rahmenstelle, Dackel auf (120|135) und auf Boden; Gang nach Süden ebenso', () => {
  const g = ell();
  const sc = erzeugeSzene(g, 'a', 600);
  assert.equal(sc.theta, E);
  assert.equal(sc.s, 'R');
  assert.deepEqual([sc.dog.x, sc.dog.y], [DACKEL_BILD.x, DACKEL_BILD.y]);
  assert.deepEqual([sc.cam.x, sc.cam.y], [600, 0], 'Fenstermitte = Rahmenmitte');
  assert.ok(sc.walkable(sc.dogMap().x, sc.dogMap().y), 'Dackel steht auf Boden');
  assert.equal(sc.minimap, false);
  const sn = erzeugeSzene(g, 'b', 400);
  assert.equal(sn.theta, S);
  assert.deepEqual([sn.cam.x, sn.cam.y], [1200, 400]);
  const m = sn.dogMap();
  assert.ok(Math.abs(m.x - 1200) < 1e-6 && Math.abs(m.y - 280) < 1e-6, 'Dackel 120 E hinter der Rahmenmitte');
});

test('Szene läuft: das Fenster scrollt mit 70 E/s in Flugrichtung und der Dackel überlebt im Gang; an der Wand stirbt er', () => {
  const g = ell();
  const sc = erzeugeSzene(g, 'a', 400);
  const x0 = sc.cam.x;
  for (let i = 0; i < 120; i++) sc.update(1 / 60, {});
  assert.ok(Math.abs(sc.cam.x - x0 - 140) < 1, `2 s · 70 E/s (gemessen ${(sc.cam.x - x0).toFixed(1)})`);
  assert.equal(sc.deaths, 0);
  // Kopf voraus nach Norden aus dem Gang: tot
  const sc2 = erzeugeSzene(g, 'a', 400);
  for (let i = 0; i < 200 && !sc2.deaths; i++) sc2.update(1 / 60, { mx: 0, my: -1 });
  assert.equal(sc2.deaths, 1, 'Wand berührt → Tod');
});

test('Kreuzung: an der Ecke zwischen den Gängen kann nach Süden gedreht werden, mitten im Gang nicht', () => {
  const g = ell();
  const sc = erzeugeSzene(g, 'a', 1000);
  sc.warp(1200, 0, E, 'R', { x: 240, y: 135 });
  assert.equal(sc.canTurnBy(1), true, 'rechts herum (Süden) an der Ecke');
  assert.equal(sc.canTurnBy(-1), false, 'links herum (Norden): kein Gang');
  sc.warp(300, 0, E, 'R', { x: 240, y: 135 });
  assert.equal(sc.canTurn, false, 'mitten im Gang');
});

test('Wände und Hindernisse sind fest (Dackel stirbt), Formteile sind Boden', () => {
  const g = ell();
  g.objekte.push({ id: 'o1', typ: 'wand', x: 600, y: 0, laenge: 60, breite: 120, winkel: 0 }); // Pfropfen im Gang
  g.objekte.push({ id: 'o2', typ: 'hindernis', x: 900, y: 60, laenge: 60, breite: 60, winkel: 90 });
  g.formteile.push({ id: 'f1', x: 300, y: 150, laenge: 200, breite: 100, winkel: 0 }); // Nische südlich des Gangs (Gang endet bei y=100)
  const k = baueKarte(g);
  assert.equal(k.walkable(600, 0, 8), false, 'Wand');
  assert.equal(k.walkable(600, 0, 0), false);
  assert.equal(k.walkable(900, 60, 8), false, 'Hindernis');
  assert.equal(k.walkable(900, -60, 8), true, 'daneben frei');
  assert.equal(k.walkable(300, 140, 8), true, 'Formteil ist Boden');
  assert.equal(k.walkable(300, 100, 8), true, 'Naht Gang/Formteil ist Boden (Kreis über beiden)');
  assert.equal(k.walkable(300, 220, 8), false, 'hinter dem Formteil Wand');
  assert.equal(k.blocks.length, 2);
  assert.equal(k.freeDistance(400, 0, 1, 0, 400, 8) < 400, true, 'freie Strecke endet vor der Wand');
});

test('Gänge gleicher Linie verschmelzen, Knotenflächen reichen die Gänge bis zum Rand', () => {
  const g = ell();
  const k = baueKarte(g);
  const h = k.corridors.filter((c) => c.axis === 'h');
  assert.equal(h.length, 1);
  assert.deepEqual([h[0].a0, h[0].a1], [0, 1300], 'Ende reicht bis zum Rand des Kreuzungsquadrats (1200 + 100)');
  const v = k.corridors.filter((c) => c.axis === 'v');
  assert.deepEqual([v[0].a0, v[0].a1], [-100, 800]);
  assert.equal(k.junctions.length, 1);
  assert.equal(k.bones.length, 1, 'ein Knochen am Gangende');
  assert.deepEqual([k.bones[0].x, k.bones[0].y], [1200, 770]);
  // zwei Gänge auf einer Linie (Netz: nord-1, nord-2) werden zu einem
  const n = baueKarte(GEBIETE['proto-netz']);
  assert.ok(n.corridors.length < GEBIETE['proto-netz'].gaenge.length);
});

test('Bezeichnung: Format Wendehals-Level <gebiet>/<level>@<stelle> und <gebiet>/<knoten>', () => {
  const g = ell();
  assert.equal(bezeichnung(g, { art: 'gang', id: 'a' }, 560), 'Wendehals-Level test/a@560');
  assert.equal(bezeichnung(g, { art: 'gang', id: 'a' }, 560.4), 'Wendehals-Level test/a@560');
  assert.equal(bezeichnung(g, { art: 'gang', id: 'a' }), 'Wendehals-Level test/a');
  assert.equal(bezeichnung(g, { art: 'knoten', id: 'K2' }), 'Wendehals-Level test/K2');
});

test('Szene verändert das Gebiet nicht', () => {
  const g = ell();
  const vorher = JSON.stringify(g);
  const sc = erzeugeSzene(g, 'a', 300);
  for (let i = 0; i < 60; i++) sc.update(1 / 60, { rotRight: i === 5 });
  assert.equal(JSON.stringify(g), vorher);
  assert.ok(sc instanceof FensterScene && sc.rng instanceof Rng);
  assert.ok(SCREEN_W === 480 && SCREEN_H === 270);
});
