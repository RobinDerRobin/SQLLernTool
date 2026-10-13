// Tests des Bot-Spieltests (Paket 13, Stufe 9): der Bot fliegt Gänge im Fenster-Prototyp ab und meldet Tod, Steckenbleiben und
// „noch nicht spielbar“ mit der Bezeichnung der Stelle. Gemessen wird das Ergebnis, nicht der Code: ein offener Gang geht, ein
// zugemauerter nicht, und die gemeldete Stelle liegt bei der Wand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fliegeGang, fliegeGebiet, STATUS_TEXT } from '../src/editor/bot.js';
import { GEBIETE } from '../src/editor/startdaten.js';

const leer = () => ({ format: 1, id: 'test', name: 'Test', tileset: 'bad', bereich: { x0: -500, y0: -500, x1: 3500, y1: 1500 }, knoten: [], gaenge: [], formteile: [], objekte: [], notizen: [] });
/** Gang nach Osten (0,0)→(2400,0), am Ende ein Gang nach Süden (2400,0)→(2400,800). */
function ell() {
  const g = leer();
  g.knoten = [
    { id: 'K1', typ: 'speicher', x: 0, y: 0 },
    { id: 'K2', typ: 'kreuzung', x: 2400, y: 0, w: 200, h: 200 },
    { id: 'K3', typ: 'ende', x: 2400, y: 800 },
  ];
  g.gaenge = [
    { id: 'a', name: 'A', von: 'K1', nach: 'K2', breite: 200 },
    { id: 'b', name: 'B', von: 'K2', nach: 'K3', breite: 200 },
  ];
  return g;
}
const wand = (g, id, x, y, laenge, breite) => g.objekte.push({ id, typ: 'wand', x, y, laenge, breite, winkel: 0 });

test('Bot: offener Gang wird bis zum Ende geflogen', () => {
  const r = fliegeGang(ell(), 'a');
  assert.equal(r.status, 'ok', r.text);
  assert.ok(r.sekunden > 15 && r.sekunden < 90, `Flugzeit passt zur Länge (hier ${r.sekunden.toFixed(1)} s)`);
  assert.equal(r.bezeichnung, 'Wendehals-Level test/a@0');
});

test('Bot: Gang mit Knick (Südgang hinter der Kreuzung) wird geflogen', () => {
  assert.equal(fliegeGang(ell(), 'b').status, 'ok');
});

test('Bot: zugemauerter Gang → Tod oder Steckenbleiben, Stelle liegt an der Wand, Bezeichnung nennt sie', () => {
  const g = ell();
  wand(g, 'w1', 1200, 0, 60, 200); // ganze Gangbreite zu
  const r = fliegeGang(g, 'a');
  assert.ok(r.status === 'tod' || r.status === 'stecken', `gemeldet: ${r.status}`);
  assert.ok(Math.abs(r.stelle - 1200) < 300, `Stelle ${Math.round(r.stelle)} nahe der Wand bei 1200`);
  assert.match(r.bezeichnung, /^Wendehals-Level test\/a@\d+$/);
  assert.equal(Number(r.bezeichnung.split('@')[1]), Math.round(r.stelle));
});

test('Bot: Hindernis in der Gangmitte wird umflogen (Lücke ≥ 60 E)', () => {
  const g = ell();
  wand(g, 'w1', 1200, 0, 60, 80); // lässt je 60 E Rand (Mindestmaß M2)
  assert.equal(fliegeGang(g, 'a').status, 'ok');
});

test('Bot: nicht spielbare Gänge werden gemeldet, nicht still falsch geflogen', () => {
  const r = fliegeGang(GEBIETE.beispiel, 'diagonale');
  assert.equal(r.status, 'nicht-spielbar');
  assert.match(r.text, /^noch nicht spielbar:/);
  assert.equal(fliegeGang(ell(), 'gibtsnicht').status, 'nicht-spielbar');
});

test('Bot: Ergebnis ist bei gleichem Gebiet gleich (deterministisch)', () => {
  const g = ell();
  wand(g, 'w1', 1200, 0, 60, 80);
  const a = fliegeGang(g, 'a');
  const b = fliegeGang(g, 'a');
  assert.deepEqual(a, b);
});

test('Bot: Startgebiet „Netz“ – jeder Gang wird geflogen, „Beispiel“ bis auf die Diagonale auch', () => {
  const netz = fliegeGebiet(GEBIETE['proto-netz']);
  assert.equal(netz.length, GEBIETE['proto-netz'].gaenge.length);
  for (const r of netz) assert.equal(r.status, 'ok', `${r.bezeichnung}: ${r.text}`);
  const bsp = fliegeGebiet(GEBIETE.beispiel);
  assert.deepEqual(bsp.filter((r) => r.status === 'nicht-spielbar').map((r) => r.gang), ['diagonale']);
  for (const r of bsp.filter((x) => x.status !== 'nicht-spielbar')) assert.equal(r.status, 'ok', `${r.bezeichnung}: ${r.text}`);
  assert.ok(Object.keys(STATUS_TEXT).every((k) => STATUS_TEXT[k]));
});

test('Einzelner Knochen: Einsammeln hängt nicht (früher Endlosschleife in pickTarget)', async () => {
  const { erzeugeSzene } = await import('../src/editor/spielen.js');
  const g = ell();
  const sc = erzeugeSzene(g, 'b', 120);
  assert.equal(sc.map.bones.length, 1);
  const b = sc.map.bones[0];
  sc.warp(b.x, b.y - 100, sc.theta, sc.s);
  for (let i = 0; i < 600 && !sc.score; i++) sc.update(1 / 60, {});
  assert.equal(sc.score, 1, 'Knochen eingesammelt');
  assert.equal(sc.target, 0);
});
