// Tests der Bedienung (Paket 13, Stufe 7b): stufenloser Zoom (A2), Levelansicht (A3), Auswahl (A4), Rückgängig (A5), „Spielen ab hier“
// für einen geraden Gang neben einer Diagonale. Reine Logik, läuft unter Node; die Maus-Tests stehen in e2e/editor-bedienung.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ansicht, radFaktor } from '../src/editor/ansicht.js';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_RAD_FAKTOR } from '../src/editor/konstanten.js';
import { ausdehnung, Verlauf, formatiere, ladeGebiet, pruefeFormat } from '../src/editor/daten.js';
import { setze } from '../src/editor/befehle.js';
import { ebeneVon, EBENEN, WERKZEUG_EBENEN } from '../src/editor/ebenen.js';
import { teilBei } from '../src/editor/teile.js';
import { WERKZEUGE } from '../src/editor/werkzeuge/index.js';
import { spielbarkeit, erzeugeSzene } from '../src/editor/spielen.js';
import { levelInhalt, spielGebiet } from '../src/editor/level.js';
import { GEBIETE } from '../src/editor/startdaten.js';
import { HEADINGS } from '../src/core/math.js';

const kopie = (g) => JSON.parse(JSON.stringify(g));
const ids = (g) => ({ k: g.knoten.map((x) => x.id), g: g.gaenge.map((x) => x.id), f: g.formteile.map((x) => x.id), o: g.objekte.map((x) => x.id), n: g.notizen.map((x) => x.id) });

// ------------------------------------------------------------------ A2 Zoom
test('A2 Zoom: eine Mausrad-Raste (deltaY 100) ändert den Maßstab um 15 %, Touchpad-Kleinstschritte anteilig', () => {
  assert.ok(Math.abs(radFaktor(-100) - ZOOM_RAD_FAKTOR) < 1e-12, 'Raste nach oben = hineinzoomen um 15 %');
  assert.ok(Math.abs(radFaktor(100) - 1 / ZOOM_RAD_FAKTOR) < 1e-12, 'Raste nach unten = herauszoomen');
  assert.ok(Math.abs(radFaktor(100) * radFaktor(-100) - 1) < 1e-12);
  const klein = radFaktor(-10);
  assert.ok(klein > 1 && klein < 1.02, 'deltaY 10 zoomt nur wenig: ' + klein);
  assert.ok(Math.abs(radFaktor(-3) ** 10 / radFaktor(-30) - 1) < 1e-9, 'Schritte setzen sich anteilig zusammen');
  assert.ok(radFaktor(-100, 1) > radFaktor(-100, 0), 'Zeilenmodus zählt stärker als Pixel');
  assert.ok(radFaktor(-1e6) < ZOOM_RAD_FAKTOR ** 4.01, 'ein einzelnes Ereignis ist begrenzt');
  assert.equal(radFaktor(0), 1);
});

test('A2 Zoom: stufenlos, der Punkt unter dem Mauszeiger bleibt stehen, Grenzen gelten', () => {
  const a = new Ansicht(1000, 600);
  a.zentrieren(123, -77);
  for (const f of [1.15, 1 / 1.15, 1.03, 0.97, 2, 0.5]) {
    const vor = a.bildZuWelt(731, 214);
    a.zoomen(f, 731, 214);
    const nach = a.bildZuWelt(731, 214);
    assert.ok(Math.hypot(vor[0] - nach[0], vor[1] - nach[1]) < 1e-9, 'Ankerpunkt bleibt bei Faktor ' + f);
  }
  a.bildschirme = 2.2;
  a.zoomen(1.15);
  assert.ok(Math.abs(a.bildschirme - 2.2 / 1.15) < 1e-12);
  a.setzeBildschirme(1e-9);
  assert.equal(a.bildschirme, ZOOM_MIN);
  a.setzeBildschirme(1e9);
  assert.equal(a.bildschirme, ZOOM_MAX);
  a.setzeBildschirme(3.7, 100, 100);
  assert.equal(a.bildschirme, 3.7, 'beliebige Werte, keine Stufen');
});

test('A2 Zoom: „Alles“ passt ohne Stufen ein – mindestens 90 % der Breite oder Höhe, in jeder Drehung', () => {
  for (const [w, h] of [[990, 600], [1280, 600], [500, 700]]) {
    const a = new Ansicht(w, h);
    for (const g of Object.values(GEBIETE)) {
      const r = ausdehnung(g);
      for (const blick of HEADINGS) {
        a.blick = blick;
        a.einpassen(r);
        const px = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].map(([x, y]) => a.weltZuBild(x, y));
        const bw = Math.max(...px.map((p) => p[0])) - Math.min(...px.map((p) => p[0]));
        const bh = Math.max(...px.map((p) => p[1])) - Math.min(...px.map((p) => p[1]));
        assert.ok(Math.max(bw / w, bh / h) >= 0.9, `${g.id} Blick ${blick} ${w}×${h}: nur ${(Math.max(bw / w, bh / h) * 100).toFixed(0)} % genutzt`);
        assert.ok(bw <= w && bh <= h, 'passt ins Bild');
      }
    }
  }
});

// ------------------------------------------------------------------ Fehler „Spielen ab hier“ neben einer Diagonale
test('Spielen ab hier: ein gerader Gang startet auch, wenn ein anderer Gang im Gebiet diagonal ist; die Diagonale selbst nicht', () => {
  const g = GEBIETE.beispiel;
  assert.ok(spielbarkeit(g).probleme.length > 0, 'das ganze Gebiet bleibt „noch nicht spielbar“ (Prüfer M7 unverändert)');
  for (const id of ['schleuse', 'nordgang', 'ostgang']) {
    const r = spielbarkeit(g, id);
    assert.deepEqual(r.probleme, [], id + ' ist spielbar');
    assert.ok(r.hinweise.some((h) => /Diagonale/.test(h)), 'Hinweis nennt den ausgelassenen diagonalen Gang');
    const sc = erzeugeSzene(g, id, 400);
    assert.ok(sc.dogMap(), id + ': Szene steht');
  }
  const d = spielbarkeit(g, 'diagonale');
  assert.equal(d.probleme.length, 1);
  assert.match(d.probleme[0], /Diagonale.*Südosten/);
  assert.throws(() => erzeugeSzene(g, 'diagonale', 300), /noch nicht spielbar/);
  assert.throws(() => erzeugeSzene(g, 'gibtsnicht', 300), /gibt es nicht/);
});

test('Spielen ab hier: ist das ganze Gebiet spielbar, bleibt alles wie vorher (ganzes Netz)', () => {
  const g = GEBIETE['proto-netz'];
  assert.deepEqual(spielbarkeit(g, g.gaenge[0].id), spielbarkeit(g));
  const sub = spielGebiet(g, g.gaenge[0].id);
  assert.equal(sub.gebiet.gaenge.length, g.gaenge.length, 'alle Gänge des Netzes hängen über gerade Gänge zusammen');
  assert.equal(sub.ausgelassen.length, 0);
});

test('Spielen ab hier: Teile weit weg von der gespielten Karte stören nicht, Teile an ihr zählen', () => {
  const g = kopie(GEBIETE.beispiel);
  g.objekte.push({ id: 'oweg', typ: 'wand', x: 1800, y: 600, laenge: 100, breite: 40, winkel: 45 }); // schief, aber nur an der Diagonale
  assert.deepEqual(spielbarkeit(g, 'schleuse').probleme, [], 'schräge Wand an der Diagonale stört die Schleuse nicht');
  g.objekte.push({ id: 'oda', typ: 'wand', x: 300, y: 0, laenge: 100, breite: 40, winkel: 45 });
  assert.match(spielbarkeit(g, 'schleuse').probleme.join('|'), /Wand oda/, 'schräge Wand mitten im Gang stört');
});

// ------------------------------------------------------------------ A3 Levelinhalt
test('A3 Levelinhalt: nur der Gang, seine zwei Knoten und die Teile, die ihn berühren', () => {
  const g = kopie(GEBIETE.beispiel);
  const sch = levelInhalt(g, 'schleuse');
  assert.deepEqual(ids(sch).g, ['schleuse']);
  assert.deepEqual(ids(sch).k.sort(), ['K1', 'K2']);
  assert.ok(ids(sch).f.length >= 1, 'das Formteil (Nische) an der Schleuse gehört dazu');
  const nord = levelInhalt(g, 'nordgang');
  assert.deepEqual(ids(nord).g, ['nordgang']);
  assert.deepEqual(ids(nord).k.sort(), ['K2', 'K3']);
  // gleiche Objekte, keine Kopien; das Gebiet selbst bleibt unverändert
  assert.equal(sch.knoten[0], g.knoten.find((k) => k.id === sch.knoten[0].id));
  assert.equal(g.gaenge.length, 4);
  // extra: Gewähltes bleibt sichtbar
  const mit = levelInhalt(g, 'schleuse', ['ostgang', 'K5']);
  assert.deepEqual(ids(mit).g.sort(), ['ostgang', 'schleuse']);
  assert.ok(ids(mit).k.includes('K5'));
  // unbekannter Gang: leer
  const leer = levelInhalt(g, 'gibtsnicht');
  assert.deepEqual([leer.knoten.length, leer.gaenge.length], [0, 0]);
});

// ------------------------------------------------------------------ A5 Rückgängig mit Namen, gesperrte Ebenen
test('A5 Verlauf: jeder Schritt hat einen Namen, Rückgängig und Wiederholen zeigen ihn', () => {
  const v = new Verlauf();
  assert.equal(v.letzteAktion, null);
  assert.equal(v.naechsteAktion, null);
  v.merke('a', 'Wand setzen');
  v.merke('b', 'Knoten verschieben');
  assert.equal(v.letzteAktion, 'Knoten verschieben');
  assert.equal(v.rueckgaengig('c'), 'b');
  assert.equal(v.letzteAktion, 'Wand setzen');
  assert.equal(v.naechsteAktion, 'Knoten verschieben');
  assert.equal(v.rueckgaengig('b'), 'a');
  assert.equal(v.letzteAktion, null);
  assert.equal(v.wiederholen('a'), 'b');
  assert.equal(v.letzteAktion, 'Wand setzen');
  assert.equal(v.naechsteAktion, 'Knoten verschieben');
  v.merke('x', 'Löschen');
  assert.equal(v.naechsteAktion, null, 'eine neue Aktion leert die Wiederholen-Liste samt Namen');
  const klein = new Verlauf(2);
  klein.merke('1', 'eins');
  klein.merke('2', 'zwei');
  klein.merke('3', 'drei');
  assert.deepEqual([klein.zurueck.length, klein.letzteAktion], [2, 'drei']);
  assert.equal(klein.rueckgaengig('4'), '3');
  assert.equal(klein.rueckgaengig('3'), '2');
  assert.equal(klein.rueckgaengig('2'), null, 'der älteste Schritt ist verfallen');
});

test('A5 Ebenen: jedes Ding gehört zu einer Ebene, jedes Werkzeug schreibt in bekannte Ebenen, gesperrte Teile sind nicht zu treffen', () => {
  const namen = EBENEN.map((e) => e.id);
  assert.equal(ebeneVon('knoten'), 'knoten');
  assert.equal(ebeneVon('gang'), 'gaenge');
  assert.equal(ebeneVon('formteil'), 'formteile');
  assert.equal(ebeneVon('objekt', { typ: 'wand' }), 'waende');
  assert.equal(ebeneVon('objekt', { typ: 'hindernis' }), 'waende');
  assert.equal(ebeneVon('objekt', { typ: 'gegner' }), 'gegner');
  for (const w of WERKZEUGE.filter((x) => x.id !== 'auswahl')) {
    assert.ok(w.id in WERKZEUG_EBENEN, 'Werkzeug ' + w.id + ' ist einer Ebene zugeordnet');
    for (const eb of WERKZEUG_EBENEN[w.id]) assert.ok(namen.includes(eb));
  }
  const g = GEBIETE.beispiel;
  const gegner = g.objekte.find((o) => o.typ === 'gegner');
  assert.deepEqual(teilBei(g, gegner.x, gegner.y, 0), { art: 'objekt', id: gegner.id });
  assert.equal(teilBei(g, gegner.x, gegner.y, 0, (art, o) => ebeneVon(art, o) !== 'gegner'), null, 'gesperrter Gegner ist nicht zu treffen');
});

// ------------------------------------------------------------------ A3 Ausgangsperspektive im Datenformat
test('A3 Ausgangsperspektive: Feld „ansicht“ am Gang – speichern, laden, prüfen, ändern; alte Dateien ohne das Feld laden fehlerfrei', () => {
  const g = kopie(GEBIETE.beispiel);
  assert.ok(g.gaenge.every((x) => !('ansicht' in x)), 'die vorhandenen Dateien haben das Feld nicht');
  assert.deepEqual(pruefeFormat(g), [], 'ohne Feld gültig (Norden oben)');
  assert.equal(setze(g, 'gang', 'schleuse', 'ansicht', 'SE'), null);
  assert.equal(g.gaenge.find((x) => x.id === 'schleuse').ansicht, 'SE');
  const text = formatiere(g);
  assert.match(text, /"id": "schleuse", "name": "Schleuse", "von": "K1", "nach": "K2", "breite": 200, "ansicht": "SE"/, 'Schlüssel steht hinter „breite“');
  assert.equal(formatiere(ladeGebiet(text)), text, 'Laden → Speichern ist verlustfrei');
  assert.equal(setze(g, 'gang', 'schleuse', 'ansicht', 'E'), null);
  assert.ok(!('ansicht' in g.gaenge.find((x) => x.id === 'schleuse')), 'Norden oben (E) ist der Standard und wird nicht gespeichert');
  assert.equal(setze(g, 'gang', 'schleuse', 'ansicht', 'SO'), 'Die Ansicht muss eine der acht Richtungen sein (E, SE, S, SW, W, NW, N, NE).', 'ungültige Richtung wird abgewiesen');
  const kaputt = kopie(GEBIETE.beispiel);
  kaputt.gaenge[0].ansicht = 'quer';
  assert.match(pruefeFormat(kaputt).join('|'), /ansicht/);
  assert.throws(() => ladeGebiet(JSON.stringify(kaputt)), /ansicht/);
});
