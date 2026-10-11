// Tests des Editor-Datenmodells (Paket 13, Stufe 1): Dateiformat, Startgebiete gegen die Prototyp-Karten, Geometrie, Ansicht.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  formatiere, kopie, pruefeFormat, ladeGebiet, richtungVon, gangMasse, rechteck, achteck, bodenPolygone, istBoden, punktInPolygon, rahmenEcken, bezeichnung, ausdehnung,
} from '../src/editor/daten.js';
import { Ansicht } from '../src/editor/ansicht.js';
import { SCREEN_W, SCREEN_H, SPEED, ZOOM_BILDSCHIRME, FLOOR, FLOOR2, WALL } from '../src/editor/konstanten.js';
import { KNOTENTYPEN, OBJEKTTYPEN, TILESETS } from '../src/editor/katalog.js';
import { WELT, GEBIETE } from '../src/editor/startdaten.js';
import { NETZ_MAP } from '../src/proto/netz-map.js';
import { ACHTECK_MAP } from '../src/proto/achteck-map.js';
import { HEADINGS, DIR_VEC, headingAngle } from '../src/core/math.js';
import { schachbrettHell } from '../src/editor/zeichnen.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dateien = readdirSync(path.join(root, 'levels/gebiete')).filter((f) => f.endsWith('.json'));
const lies = (f) => readFileSync(path.join(root, 'levels/gebiete', f), 'utf8');

test('Editor: Konstanten – Bildschirm 480 × 270 E, Flugtempo 70 E/s, Zoomstufen aufsteigend', () => {
  assert.equal(SCREEN_W, 480);
  assert.equal(SCREEN_H, 270);
  assert.equal(SPEED, 70);
  assert.deepEqual([...ZOOM_BILDSCHIRME].sort((a, b) => a - b), ZOOM_BILDSCHIRME);
  assert.ok(ZOOM_BILDSCHIRME.includes(2.2), 'Normalansicht ≈ 2,2 Bildschirme');
  assert.deepEqual([FLOOR, FLOOR2, WALL], ['#6a5f55', '#756a5f', '#1c1822'], 'Farben wie im Prototyp');
});

test('Editor: Laden → Speichern ist verlustfrei (Byte-Vergleich nach Formatierung)', () => {
  assert.ok(dateien.length >= 3);
  for (const f of dateien) {
    const text = lies(f);
    const g = ladeGebiet(text);
    assert.equal(formatiere(g), text, f + ' ist nicht im Standardformat');
    assert.deepEqual(JSON.parse(formatiere(g)), g);
    assert.equal(formatiere(ladeGebiet(formatiere(g))), text, 'zweites Mal gleich');
  }
});

test('Editor: Startdaten im Build entsprechen den Dateien; welt.json verweist auf vorhandene Dateien', () => {
  assert.deepEqual(WELT.gebiete.map((g) => g.id).sort(), Object.keys(GEBIETE).sort());
  for (const w of WELT.gebiete) {
    const text = readFileSync(path.join(root, 'levels', w.datei), 'utf8');
    assert.deepEqual(GEBIETE[w.id], JSON.parse(text));
    assert.equal(GEBIETE[w.id].id, w.id);
  }
  for (const g of Object.values(GEBIETE)) assert.ok(TILESETS[g.tileset], 'Tileset ' + g.tileset);
});

test('Editor: Format – ungültige Dateien werden mit verständlicher Meldung abgelehnt', () => {
  const gut = kopie(GEBIETE.beispiel);
  assert.deepEqual(pruefeFormat(gut), []);
  const mit = (f) => {
    const g = kopie(gut);
    f(g);
    return pruefeFormat(g).join(' | ');
  };
  assert.match(mit((g) => (g.format = 2)), /Format 2 wird nicht unterstützt/);
  assert.match(mit((g) => delete g.knoten), /Liste „knoten“ fehlt/);
  assert.match(mit((g) => (g.knoten[1].id = 'K1')), /ID „K1“ kommt doppelt vor/);
  assert.match(mit((g) => (g.knoten[0].typ = 'quatsch')), /unbekannter Knotentyp/);
  assert.match(mit((g) => (g.gaenge[0].nach = 'K99')), /Knoten „K99“ gibt es nicht/);
  assert.match(mit((g) => (g.objekte[0].winkel = 30)), /45°-Raster/);
  assert.match(mit((g) => (g.knoten[0].x = 'a')), /„x“ ist keine Zahl/);
  assert.match(pruefeFormat(null).join(), /kein Gebiet/);
  assert.throws(() => ladeGebiet('{ kaputt'), /kein gültiges JSON/);
  assert.throws(() => ladeGebiet('{"format":1}'), /passt nicht zum Format/);
});

test('Editor: Startgebiete haben dieselbe Bodenfläche wie die Prototyp-Karten (Netz, 45°-Kreuzung)', () => {
  for (const [id, map] of [['proto-netz', NETZ_MAP], ['proto-achteck', ACHTECK_MAP]]) {
    const polys = bodenPolygone(GEBIETE[id]);
    let n = 0;
    for (let x = -1100.37; x < 1000; x += 7.13) {
      for (let y = -900.11; y < 900; y += 7.13) {
        n++;
        if (istBoden(x, y, polys) !== map.walkable(x, y, 0)) assert.fail(`${id}: Abweichung bei ${x.toFixed(1)}, ${y.toFixed(1)}`);
      }
    }
    assert.ok(n > 50000);
  }
});

test('Editor: Richtungen im 45°-Raster, Gangmaße (Länge, Bildschirme, Sekunden)', () => {
  for (const h of HEADINGS) assert.equal(richtungVon(...DIR_VEC[h].map((v) => v * 137)), h);
  assert.equal(richtungVon(100, 30), -1, 'nicht im Raster');
  assert.equal(richtungVon(0, 0), -1);
  const g = GEBIETE.beispiel;
  const m = gangMasse(g, g.gaenge.find((x) => x.id === 'schleuse'));
  assert.equal(m.laenge, 1200);
  assert.equal(m.bildschirme, 1200 / 480);
  assert.equal(m.sekunden, 1200 / 70);
  assert.equal(m.code, 'E');
  const d = gangMasse(g, g.gaenge.find((x) => x.id === 'diagonale'));
  assert.equal(d.code, 'SE');
  assert.ok(Math.abs(d.laenge - Math.hypot(600, 600)) < 1e-9);
});

test('Editor: Rahmen 480 × 270 E in Flugrichtung des Gangs, Mitte auf der Stelle', () => {
  const g = GEBIETE.beispiel;
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang);
    const c = rahmenEcken(m, m.laenge / 3);
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    assert.ok(Math.abs(d(c[0], c[1]) - 480) < 1e-9 && Math.abs(d(c[1], c[2]) - 270) < 1e-9, gang.id);
    const mitte = [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2];
    assert.ok(Math.abs(mitte[0] - (m.a.x + m.ux * (m.laenge / 3))) < 1e-9 && Math.abs(mitte[1] - (m.a.y + m.uy * (m.laenge / 3))) < 1e-9);
    // lange Kante läuft in Flugrichtung
    const k = [c[1][0] - c[0][0], c[1][1] - c[0][1]];
    assert.ok(Math.abs(k[0] / 480 - m.ux) < 1e-9 && Math.abs(k[1] / 480 - m.uy) < 1e-9);
  }
});

test('Editor: Rechteck und Achteck – Fläche und Umlaufsinn', () => {
  const flaeche = (p) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
  assert.ok(Math.abs(flaeche(rechteck(10, 20, 300, 80, 45)) - 24000) < 1e-6);
  assert.ok(Math.abs(flaeche(achteck(0, 0, 200)) - 2 * (1 + Math.SQRT2) * 200 * 200) < 1e-6);
  assert.ok(punktInPolygon(0, 0, achteck(0, 0, 200)));
  assert.ok(!punktInPolygon(300, 0, achteck(0, 0, 200)));
  // Alle Boden-Polygone laufen gleich herum (sonst heben sich überlappende Flächen beim Füllen auf)
  for (const g of Object.values(GEBIETE)) {
    for (const p of bodenPolygone(g)) {
      const a = p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0);
      assert.ok(a > 0);
    }
  }
});

test('Editor: Ansicht – Drehen in 45°-Schritten, Hin- und Rückrechnung, Zoom hält den Ankerpunkt', () => {
  const a = new Ansicht(990, 600);
  a.zentrieren(123, -45);
  for (const blick of HEADINGS) {
    a.blick = blick;
    for (const [x, y] of [[0, 0], [333, -77], [-1200, 800]]) {
      const [px, py] = a.weltZuBild(x, y);
      const [rx, ry] = a.bildZuWelt(px, py);
      assert.ok(Math.abs(rx - x) < 1e-9 && Math.abs(ry - y) < 1e-9);
    }
    // Der Blick zeigt „nach rechts“: ein Schritt in Blickrichtung geht auf dem Bildschirm nach rechts
    const [vx, vy] = DIR_VEC[blick];
    const [p0x, p0y] = a.weltZuBild(a.cx, a.cy);
    const [p1x, p1y] = a.weltZuBild(a.cx + vx * 100, a.cy + vy * 100);
    assert.ok(p1x > p0x && Math.abs(p1y - p0y) < 1e-6, 'Blick ' + blick);
    assert.ok(Math.abs(a.winkel - headingAngle(blick)) < 1e-12);
  }
  a.blick = 0;
  a.drehen(1);
  a.drehen(-1);
  assert.equal(a.blick, 0);
  for (let i = 0; i < 8; i++) a.drehen(1);
  assert.equal(a.blick, 0);
  const vor = a.bildZuWelt(300, 200);
  a.zoomen(2, 300, 200);
  const nach = a.bildZuWelt(300, 200);
  assert.ok(Math.abs(vor[0] - nach[0]) < 1e-9 && Math.abs(vor[1] - nach[1]) < 1e-9, 'Ankerpunkt bleibt');
  a.zoomen(100);
  assert.equal(a.stufe, ZOOM_BILDSCHIRME.length - 1);
  a.zoomen(-100);
  assert.equal(a.stufe, 0);
  a.stufe = 2;
  assert.ok(Math.abs(a.masstab * 2.2 * SCREEN_W - a.w) < 1e-9, 'Normalansicht: 2,2 Bildschirme breit');
});

test('Editor: Ansicht einpassen zeigt das ganze Gebiet in der stärksten passenden Zoomstufe', () => {
  const a = new Ansicht(990, 600);
  for (const g of Object.values(GEBIETE)) {
    const r = ausdehnung(g);
    a.einpassen(r);
    const sicht = a.sichtbar();
    assert.ok(sicht.x0 <= r.x0 && sicht.x1 >= r.x1 && sicht.y0 <= r.y0 && sicht.y1 >= r.y1, g.id + ' vollständig sichtbar');
    if (a.stufe > 0) {
      const b = new Ansicht(990, 600);
      b.zentrieren(a.cx, a.cy);
      b.stufe = a.stufe - 1;
      const s2 = b.sichtbar();
      assert.ok(!(s2.x0 <= r.x0 * 1.05 && s2.x1 >= r.x1 * 1.05 && s2.y0 <= r.y0 * 1.05 && s2.y1 >= r.y1 * 1.05), g.id + ': eine Stufe näher würde nicht mehr passen');
    }
  }
});

test('Editor: Schachbrett wie im Prototyp, Katalog vollständig, Bezeichnung im richtigen Format', () => {
  assert.equal(schachbrettHell(10, 10), false);
  assert.equal(schachbrettHell(90, 10), true);
  assert.equal(schachbrettHell(-10, 10), true);
  for (const t of Object.values(KNOTENTYPEN)) assert.ok(t.name && t.farbe);
  for (const t of Object.values(OBJEKTTYPEN)) assert.ok(t.name);
  const g = GEBIETE.beispiel;
  assert.equal(bezeichnung(g, { art: 'gang', id: 'schleuse' }, 560), 'Wendehals-Level beispiel/schleuse@560');
  assert.equal(bezeichnung(g, { art: 'knoten', id: 'K2' }), 'Wendehals-Level beispiel/K2');
});

test('Editor: Boden des Beispiels – Wand schneidet aus, Formteil zählt als Boden', () => {
  const g = GEBIETE.beispiel;
  const polys = bodenPolygone(g);
  assert.ok(istBoden(300, 0, polys), 'Schleuse');
  assert.ok(istBoden(600, 170, polys), 'Formteil (Nische) südlich der Schleuse');
  assert.ok(!istBoden(600, 260, polys), 'außerhalb');
  assert.ok(!istBoden(1200, 700, polys));
});
