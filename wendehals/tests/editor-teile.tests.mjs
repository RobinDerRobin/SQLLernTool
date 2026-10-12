// Tests der Teile im Gang (Paket 13, Stufe 2b): Formteil, Wand, Hindernis – setzen, ziehen, verschieben, drehen, kopieren, löschen,
// Eigenschaften, Rückgängig, Boden/Wand in den Polygonen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatiere, ladeGebiet, pruefeFormat, bodenPolygone, wandPolygone, istBoden, kopie, Verlauf, punktInPolygon } from '../src/editor/daten.js';
import { gangZiehen } from '../src/editor/befehle.js';
import { teilSetzen, teilEntwurf, teilBei, teilVerschieben, teilDrehen, teilMerken, teilEinfuegen, teilKopieren, loescheTeil, setzeTeil, teilFinden, teilEcken } from '../src/editor/teile.js';
import { GEBIETE } from '../src/editor/startdaten.js';
import { RASTER, TEIL_STANDARD, KOPIE_VERSATZ, MIN_TEIL, MAX_KOORD } from '../src/editor/konstanten.js';

const leer = () => ({ format: 1, id: 'test', name: 'Test', tileset: 'bad', bereich: { x0: -500, y0: -500, x1: 500, y1: 500 }, knoten: [], gaenge: [], formteile: [], objekte: [], notizen: [] });
const gueltig = (g) => assert.deepEqual(pruefeFormat(g), [], 'Format gültig');

test('Teil setzen per Klick: Standardmaße, Mitte im Raster, Winkel 0', () => {
  for (const sorte of ['formteil', 'wand', 'hindernis']) {
    const g = leer();
    const t = teilSetzen(g, sorte, 413, -207);
    const o = teilFinden(g, t.art, t.id);
    assert.equal(t.art, sorte === 'formteil' ? 'formteil' : 'objekt');
    assert.deepEqual([o.x, o.y], [420, -200], 'Mitte auf 20 E');
    assert.equal(o.laenge, TEIL_STANDARD[sorte].laenge);
    assert.equal(o.breite, TEIL_STANDARD[sorte].breite);
    assert.equal(o.winkel, 0);
    if (sorte !== 'formteil') assert.equal(o.typ, sorte);
    gueltig(g);
  }
});

test('Teil ziehen: rastet auf 8 Richtungen und 20 E, Teil liegt zwischen Anfang und Ende', () => {
  const g = leer();
  const a = teilFinden(g, ...Object.values(teilSetzen(g, 'wand', 0, 0, 213, 7)));
  assert.deepEqual([a.x, a.y, a.laenge, a.winkel], [110, 0, 220, 0]);
  const b = teilFinden(g, ...Object.values(teilSetzen(g, 'wand', 0, 100, 4, 400)));
  assert.deepEqual([b.x, b.y, b.laenge, b.winkel], [0, 250, 300, 90], 'nach Süden: 90°');
  const c = teilFinden(g, ...Object.values(teilSetzen(g, 'formteil', 0, 0, 200, 205)));
  assert.equal(c.winkel, 45, 'Diagonale SO: 45°');
  assert.equal(c.x, c.y);
  assert.equal(c.laenge, 282.843, '10 Rasterschritte diagonal = 200·√2');
  assert.deepEqual([c.x, c.y], [100, 100]);
  const d = teilFinden(g, ...Object.values(teilSetzen(g, 'wand', 0, 0, -300, 0)));
  assert.equal(d.winkel, 0, 'nach Westen = gleiches Rechteck wie nach Osten (Winkel mod 180)');
  assert.equal(d.x, -150);
  const e = teilFinden(g, ...Object.values(teilSetzen(g, 'wand', 0, 0, -200, -205)));
  assert.equal(e.winkel, 45, 'nach Nordwesten: 225° ≙ 45°');
  gueltig(g);
});

test('teilEntwurf = was teilSetzen anlegt (Vorschau stimmt mit Ergebnis)', () => {
  const g = leer();
  for (const [sx, sy, ex, ey] of [[3, 4, 9, 11], [0, 0, 380, 15], [100, 100, 100, -260], [0, 0, 190, 205]]) {
    const e = teilEntwurf('hindernis', sx, sy, ex, ey);
    const t = teilSetzen(g, 'hindernis', sx, sy, ex, ey);
    const o = teilFinden(g, t.art, t.id);
    assert.deepEqual({ x: o.x, y: o.y, laenge: o.laenge, breite: o.breite, winkel: o.winkel }, e);
  }
});

test('neue IDs sind eindeutig; gelöschte werden wieder vergeben', () => {
  const g = leer();
  const ids = [teilSetzen(g, 'formteil', 0, 0), teilSetzen(g, 'wand', 0, 0), teilSetzen(g, 'wand', 0, 0), teilSetzen(g, 'hindernis', 0, 0)].map((t) => t.id);
  assert.deepEqual(ids, ['f1', 'o1', 'o2', 'o3']);
  loescheTeil(g, 'objekt', 'o2');
  assert.equal(teilSetzen(g, 'wand', 0, 0).id, 'o2');
  gueltig(g);
});

test('Formteil ist Boden, Wand schneidet aus – im Datenmodell', () => {
  const g = leer();
  teilSetzen(g, 'formteil', 0, 0, 400, 0); // Boden von x 0..400, y ±60
  assert.ok(istBoden(200, 0, bodenPolygone(g)));
  assert.ok(!istBoden(200, 100, bodenPolygone(g)));
  teilSetzen(g, 'wand', 200, 0); // 240 × 60 Wand um (200, 0)
  assert.equal(wandPolygone(g).length, 1);
  assert.ok(punktInPolygon(200, 0, wandPolygone(g)[0]));
  assert.ok(!istBoden(200, 0, bodenPolygone(g).filter((p) => !wandPolygone(g).some((w) => punktInPolygon(200, 0, w)))), 'unter der Wand kein Boden');
});

test('teilBei trifft das oberste Teil, Objekte vor Formteilen, mit Zuschlag für dünne Teile', () => {
  const g = leer();
  teilSetzen(g, 'formteil', 0, 0); // f1: 260 × 120 um (0, 0)
  teilSetzen(g, 'wand', 0, 0); // o1: 240 × 60 um (0, 0)
  assert.deepEqual(teilBei(g, 0, 0), { art: 'objekt', id: 'o1' });
  assert.deepEqual(teilBei(g, 0, 50), { art: 'formteil', id: 'f1' });
  assert.equal(teilBei(g, 0, 200), null);
  assert.deepEqual(teilBei(g, 0, 33), { art: 'formteil', id: 'f1' }, 'knapp neben der Wand: Formteil');
  assert.deepEqual(teilBei(g, 0, 36, 10), { art: 'objekt', id: 'o1' }, 'mit Zuschlag 10 E trifft die Wand (Rand bei 30)');
  teilSetzen(g, 'hindernis', 0, 0); // o2 liegt über o1
  assert.deepEqual(teilBei(g, 0, 0), { art: 'objekt', id: 'o2' });
  g.objekte.push({ id: 'o9', typ: 'gegner', art: 'ente', x: 500, y: 0, platzhalter: true });
  assert.deepEqual(teilBei(g, 505, 3), { art: 'objekt', id: 'o9' }, 'Gegner-Platzhalter wird getroffen');
});

test('verschieben rastet auf 20 E, lehnt Gleiches und Unsinn ab', () => {
  const g = leer();
  const t = teilSetzen(g, 'wand', 0, 0);
  assert.equal(teilVerschieben(g, t.art, t.id, 0, 0), false, 'gleiche Stelle');
  assert.equal(teilVerschieben(g, t.art, t.id, 413, -97), true);
  assert.deepEqual([teilFinden(g, t.art, t.id).x, teilFinden(g, t.art, t.id).y], [420, -100]);
  assert.equal(teilVerschieben(g, t.art, t.id, MAX_KOORD * 2, 0), false);
  assert.equal(teilVerschieben(g, t.art, 'gibtsnicht', 0, 0), false);
  gueltig(g);
});

test('drehen: 45°-Schritte, acht Schritte (360°) ergeben denselben Zustand, Winkel bleibt im Raster', () => {
  const g = leer();
  const t = teilSetzen(g, 'wand', 0, 0, 200, 0);
  const vorher = JSON.stringify(g);
  const winkel = [];
  for (let i = 0; i < 4; i++) {
    assert.equal(teilDrehen(g, t.art, t.id, 1), true);
    winkel.push(teilFinden(g, t.art, t.id).winkel);
    gueltig(g);
  }
  assert.deepEqual(winkel, [45, 90, 135, 0], 'rechtsherum, nach 180° wieder gleich (Rechteck)');
  assert.equal(JSON.stringify(g), vorher, 'vier Schritte = 180° = derselbe Zustand');
  teilDrehen(g, t.art, t.id, -1);
  assert.equal(teilFinden(g, t.art, t.id).winkel, 135, 'linksherum von 0° → 135°');
  g.objekte.push({ id: 'o9', typ: 'gegner', art: 'ente', x: 0, y: 0, platzhalter: true });
  assert.equal(teilDrehen(g, 'objekt', 'o9', 1), false, 'Gegner hat keinen Winkel');
});

test('Drehen ändert die Ecken wie erwartet (Wand 200 × 60 auf 90°: hochkant)', () => {
  const g = leer();
  const t = teilSetzen(g, 'wand', 0, 0, 200, 0);
  teilDrehen(g, t.art, t.id, 2);
  const xs = teilEcken(teilFinden(g, t.art, t.id)).map((p) => p[0]);
  assert.ok(Math.max(...xs) - Math.min(...xs) < 61 && Math.max(...xs) - Math.min(...xs) > 59);
});

test('kopieren/einfügen: neue ID, gleiche Daten, Versatz oder Zielstelle; Original bleibt', () => {
  const g = leer();
  const t = teilSetzen(g, 'hindernis', 100, 100);
  const o = teilFinden(g, t.art, t.id);
  const kopieVon = teilKopieren(g, t.art, t.id);
  const k = teilFinden(g, kopieVon.art, kopieVon.id);
  assert.notEqual(k.id, o.id);
  assert.deepEqual([k.x, k.y], [o.x + KOPIE_VERSATZ, o.y + KOPIE_VERSATZ]);
  assert.deepEqual([k.typ, k.laenge, k.breite, k.winkel], [o.typ, o.laenge, o.breite, o.winkel]);
  const gemerkt = teilMerken(g, t.art, t.id);
  const e = teilFinden(g, ...Object.values(teilEinfuegen(g, gemerkt, 613, 47)));
  assert.deepEqual([e.x, e.y], [620, 40]);
  assert.equal(teilMerken(g, 'objekt', 'nix'), null);
  assert.equal(teilEinfuegen(g, null), null);
  // Das Gemerkte ist unabhängig: Original später ändern, Einfügen bringt den alten Stand
  setzeTeil(g, t.art, t.id, 'laenge', 300);
  assert.equal(teilFinden(g, ...Object.values(teilEinfuegen(g, gemerkt, 0, 0))).laenge, TEIL_STANDARD.hindernis.laenge, 'das Gemerkte ist ein Abbild von damals');
  gueltig(g);
});

test('löschen entfernt nur das Teil', () => {
  const g = leer();
  teilSetzen(g, 'formteil', 0, 0);
  teilSetzen(g, 'wand', 0, 0);
  assert.deepEqual(loescheTeil(g, 'objekt', 'o1'), ['o1']);
  assert.equal(g.objekte.length, 0);
  assert.equal(g.formteile.length, 1);
  assert.deepEqual(loescheTeil(g, 'objekt', 'o1'), [], 'gibt es nicht mehr');
});

test('Eigenschaften setzen: Zahlen, Raster-Winkel, Mindestmaße, Fehlermeldungen ändern nichts', () => {
  const g = leer();
  const t = teilSetzen(g, 'wand', 0, 0);
  const o = () => teilFinden(g, t.art, t.id);
  assert.equal(setzeTeil(g, t.art, t.id, 'laenge', '300,4'), null);
  assert.equal(o().laenge, 300, 'Komma erlaubt, auf ganze E gerundet');
  assert.equal(setzeTeil(g, t.art, t.id, 'winkel', 90), null);
  assert.equal(o().winkel, 90);
  assert.equal(setzeTeil(g, t.art, t.id, 'winkel', -45), null);
  assert.equal(o().winkel, 135, '−45° ≙ 135° (Rechteck, mod 180)');
  const vorher = JSON.stringify(g);
  for (const [feld, wert, muster] of [
    ['winkel', 30, /45/],
    ['laenge', MIN_TEIL - 1, /mindestens/],
    ['breite', 0, /mindestens/],
    ['laenge', '', /Zahl/],
    ['x', 'abc', /Zahl/],
    ['x', MAX_KOORD + 1, /über/],
    ['farbe', 1, /lässt sich nicht ändern/],
  ]) {
    const r = setzeTeil(g, t.art, t.id, feld, wert);
    assert.match(r ?? '', muster, `${feld}=${wert}`);
    assert.equal(JSON.stringify(g), vorher, `${feld}=${wert}: nichts geändert`);
  }
  assert.match(setzeTeil(g, 'objekt', 'nix', 'x', 1), /gibt es nicht/);
  g.objekte.push({ id: 'o9', typ: 'gegner', art: 'ente', x: 0, y: 0, platzhalter: true });
  assert.match(setzeTeil(g, 'objekt', 'o9', 'laenge', 100), /keine Länge/);
  assert.equal(setzeTeil(g, 'objekt', 'o9', 'x', 40), null, 'Gegner lässt sich verschieben');
});

test('Rückgängig stellt nach jeder Teile-Aktion exakt den vorigen Zustand her', () => {
  const g = leer();
  const v = new Verlauf();
  const stand = [];
  const schritt = (fn) => {
    const vorher = JSON.stringify(g);
    v.merke(vorher);
    stand.push(vorher);
    fn();
    assert.notEqual(JSON.stringify(g), vorher, 'Aktion hat etwas geändert');
  };
  schritt(() => teilSetzen(g, 'formteil', 0, 0, 300, 0));
  schritt(() => teilSetzen(g, 'wand', 100, 0));
  schritt(() => teilDrehen(g, 'objekt', 'o1', 1));
  schritt(() => teilVerschieben(g, 'objekt', 'o1', 300, 60));
  schritt(() => teilKopieren(g, 'objekt', 'o1'));
  schritt(() => setzeTeil(g, 'objekt', 'o1', 'breite', 120));
  schritt(() => loescheTeil(g, 'formteil', 'f1'));
  let jetzt = JSON.stringify(g);
  const endstand = jetzt;
  for (let i = stand.length - 1; i >= 0; i--) {
    const t = v.rueckgaengig(jetzt);
    assert.equal(t, stand[i], `Rückgängig Schritt ${i + 1}`);
    jetzt = t;
  }
  assert.equal(JSON.stringify(JSON.parse(jetzt)), stand[0]);
  for (let i = 1; i < stand.length; i++) jetzt = v.wiederholen(jetzt);
  jetzt = v.wiederholen(jetzt);
  assert.equal(jetzt, endstand, 'Wiederholen bis zum Ende ergibt den Endstand');
});

test('Speichern/Laden ist verlustfrei, auch mit Teilen; Datei mit Teilen im Startgebiet ist gültig', () => {
  const g = kopie(GEBIETE.beispiel);
  teilSetzen(g, 'formteil', 1000, 200, 1200, 200);
  teilSetzen(g, 'wand', 700, -60, 700, -260);
  teilSetzen(g, 'hindernis', 1500, 20);
  gueltig(g);
  const text = formatiere(g);
  assert.equal(formatiere(ladeGebiet(text)), text, 'laden → formatieren = gleiche Datei');
  assert.deepEqual(JSON.parse(text), g);
});

test('Raster: jedes gesetzte Teil hat Mitte im 10-E-Raster und Winkel im 45°-Raster', () => {
  const g = leer();
  for (let i = 0; i < 40; i++) {
    const t = teilSetzen(g, ['formteil', 'wand', 'hindernis'][i % 3], (i * 37) % 500, (i * 91) % 400 - 200, (i * 53) % 700 - 350, (i * 29) % 600 - 300);
    const o = teilFinden(g, t.art, t.id);
    assert.equal(Math.abs((o.x * 2) % RASTER), 0, 'x im Raster');
    assert.equal(Math.abs((o.y * 2) % RASTER), 0, 'y im Raster');
    assert.equal(o.winkel % 45, 0);
    assert.ok(o.winkel >= 0 && o.winkel < 180);
  }
  gueltig(g);
});

test('Teile ändern Gänge und Knoten nicht', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 600, 0, 12);
  const gaenge = JSON.stringify([g.knoten, g.gaenge]);
  teilSetzen(g, 'wand', 300, 0);
  teilSetzen(g, 'formteil', 300, 100);
  teilDrehen(g, 'objekt', 'o1', 1);
  assert.equal(JSON.stringify([g.knoten, g.gaenge]), gaenge);
});
