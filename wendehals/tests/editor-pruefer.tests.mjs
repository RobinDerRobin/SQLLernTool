// Tests des Prüfers (Paket 13, Stufe 4): je Regel (Brief Abschnitt 5) ein gutes und ein schlechtes Beispiel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGELN, ueberlappen } from '../src/editor/regeln.js';
import { pruefeGebiet, zusammenfassung } from '../src/editor/pruefer.js';
import { GEBIETE } from '../src/editor/startdaten.js';

const kopie = (g) => JSON.parse(JSON.stringify(g));
const leer = () => ({ format: 1, id: 'test', name: 'Test', tileset: 'bad', bereich: { x0: -500, y0: -500, x1: 500, y1: 500 }, knoten: [], gaenge: [], formteile: [], objekte: [], notizen: [] });
/** Gang nach Osten (0,0)→(1200,0), am Ende Kreuzung (1200,0), dann ein Gang nach Süden zum Ende (1200,800). */
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
const von = (g, id) => pruefeGebiet(g).meldungen.filter((m) => m.regel === id);
const wand = (id, x, y, laenge, breite, winkel = 0) => ({ id, typ: 'wand', x, y, laenge, breite, winkel });

test('Grundlage: das gute Gebiet hat keine MUSS-Meldung', () => {
  const r = pruefeGebiet(ell());
  assert.deepEqual(r.meldungen.filter((m) => m.art === 'MUSS'), []);
  assert.equal(zusammenfassung(r), 'Prüfer: ✓ in Ordnung');
});

test('Regelliste: IDs wie im Brief, MUSS vor SOLL, jede Regel hat Text und pruefe()', () => {
  assert.deepEqual(REGELN.map((r) => r.id), ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'S1', 'S2']);
  for (const r of REGELN) {
    assert.ok(['MUSS', 'SOLL'].includes(r.art));
    assert.ok(r.text.length > 10);
    assert.equal(typeof r.pruefe, 'function');
  }
});

test('M1: Gang im 45°-Raster gut, schief schlecht', () => {
  const g = ell();
  assert.equal(von(g, 'M1').length, 0);
  g.knoten[2].x = 1300; // (100, 800) vom Anfang: kein 45°-Winkel
  const m = von(g, 'M1');
  assert.equal(m.length, 1);
  assert.equal(m[0].ort.id, 'b');
  assert.equal(m[0].art, 'MUSS');
});

test('M2: freier Querweg – gut, Engstelle durch Wände schlecht (mit Stelle), Formteil als Boden hilft', () => {
  const g = ell();
  assert.equal(von(g, 'M2').length, 0);
  // Gang a ist 200 breit; zwei Wände lassen in der Mitte 40 E frei
  g.objekte.push(wand('o1', 600, -60, 200, 80), wand('o2', 600, 60, 200, 80));
  const m = von(g, 'M2');
  assert.equal(m.length, 1);
  assert.equal(m[0].ort.id, 'a');
  assert.ok(m[0].ort.s > 500 && m[0].ort.s < 700, 'Stelle liegt bei den Wänden: ' + m[0].ort.s);
  assert.match(m[0].text, /40 E freier Querweg/);
  // genau 60 E frei ist erlaubt
  const g2 = ell();
  g2.objekte.push(wand('o1', 600, -65, 200, 70), wand('o2', 600, 65, 200, 70));
  assert.equal(von(g2, 'M2').length, 0);
  // zu schmaler Gang: überall Engstelle, eine Meldung
  const g3 = ell();
  g3.gaenge[0].breite = 40;
  assert.equal(von(g3, 'M2').length, 1);
  // Formteil verbreitert den Gang und gleicht die Wand aus
  const g4 = ell();
  g4.objekte.push(wand('o1', 600, -60, 200, 80), wand('o2', 600, 60, 200, 80));
  g4.formteile.push({ id: 'f1', x: 600, y: 0, laenge: 300, breite: 200, winkel: 90 }); // ändert nichts am Mittelstreifen
  assert.equal(von(g4, 'M2').length, 1, 'Formteil im selben Bereich schafft keinen freien Querweg');
});

test('M3: Drehzone frei – Wand 400 E vor der Kreuzung gut, 100 E davor schlecht', () => {
  const g = ell();
  g.objekte.push(wand('o1', 700, 0, 40, 40)); // Gang a endet bei x=1200: 500 E davor
  assert.equal(von(g, 'M3').length, 0);
  g.objekte.push(wand('o2', 1100, -70, 40, 40)); // 100 E vor der Kreuzung
  const m = von(g, 'M3');
  assert.equal(m.length, 1);
  assert.equal(m[0].ort.id, 'o2');
  // Gegner stören die Drehzone nicht
  const g2 = ell();
  g2.objekte.push({ id: 'o3', typ: 'gegner', art: 'ente', x: 1100, y: 0, platzhalter: true });
  assert.equal(von(g2, 'M3').length, 0);
  // am Gangende ohne Kreuzung gilt die Regel nicht
  const g3 = ell();
  g3.objekte.push(wand('o4', 1200, 740, 40, 40)); // Ende K3 (typ ende)
  assert.equal(von(g3, 'M3').length, 0);
});

test('M4: Objekt im Boden gut, daneben schlecht, halb draußen schlecht', () => {
  const g = ell();
  g.objekte.push(wand('o1', 300, 0, 40, 40), { id: 'o2', typ: 'gegner', art: 'ente', x: 600, y: 20, platzhalter: true });
  assert.equal(von(g, 'M4').length, 0);
  g.objekte.push(wand('o3', 300, 500, 40, 40), { id: 'o4', typ: 'gegner', art: 'ente', x: -500, y: 0, platzhalter: true }, wand('o5', 300, 100, 40, 100));
  assert.deepEqual(von(g, 'M4').map((m) => m.ort.id).sort(), ['o3', 'o4', 'o5']);
});

test('M5: Knoten ohne Gang und Gebiet ohne Speicherort', () => {
  const g = ell();
  assert.equal(von(g, 'M5').length, 0);
  g.knoten.push({ id: 'K9', typ: 'ende', x: 5000, y: 5000 });
  assert.equal(von(g, 'M5').length, 1);
  g.knoten[0].typ = 'ende';
  const m = von(g, 'M5');
  assert.equal(m.length, 2);
  assert.ok(m.some((x) => /Speicherort/.test(x.text)));
});

test('M6: doppelte IDs und Gang zu fehlendem Knoten', () => {
  const g = ell();
  assert.equal(von(g, 'M6').length, 0);
  g.objekte.push(wand('a', 300, 0, 40, 40)); // „a“ ist schon ein Gang
  g.gaenge[1].nach = 'K42';
  const m = von(g, 'M6');
  assert.equal(m.length, 2);
  assert.ok(m.some((x) => /mehrfach/.test(x.text)) && m.some((x) => /K42/.test(x.text)));
});

test('M7: nicht spielbar wird gemeldet (Diagonale), spielbar nicht', () => {
  const g = ell();
  assert.equal(von(g, 'M7').length, 0);
  const b = pruefeGebiet(kopie(GEBIETE.beispiel));
  assert.ok(b.meldungen.some((m) => m.regel === 'M7' && /^Noch nicht spielbar:/.test(m.text)), 'Beispiel hat eine Diagonale');
  assert.equal(pruefeGebiet(kopie(GEBIETE['proto-netz'])).meldungen.filter((m) => m.regel === 'M7').length, 0);
});

test('S1: Gang unter einem Bildschirm; S2: Gegner-Hinweis', () => {
  const g = ell();
  assert.equal(von(g, 'S1').length, 0);
  g.knoten[2].y = 300;
  assert.equal(von(g, 'S1').length, 1);
  assert.equal(von(g, 'S1')[0].art, 'SOLL');
  g.objekte.push({ id: 'o1', typ: 'gegner', art: 'ente', x: 300, y: 0, platzhalter: true });
  assert.equal(von(g, 'S2').length, 1);
  assert.equal(pruefeGebiet(g).meldungen.filter((m) => m.art === 'MUSS').length, 0);
});

test('Ordnung: MUSS vor SOLL; Zusammenfassung zählt', () => {
  const g = ell();
  g.knoten[2].y = 300; // S1
  g.knoten.push({ id: 'K9', typ: 'ende', x: 5000, y: 5000 }); // M5
  const r = pruefeGebiet(g);
  assert.equal(r.muss, 1);
  assert.ok(r.soll >= 1);
  const arten = r.meldungen.map((m) => m.art);
  assert.equal(arten.indexOf('SOLL') > arten.lastIndexOf('MUSS'), true);
  assert.match(zusammenfassung(r), /^Prüfer: 1 MUSS · \d+ SOLL$/);
});

test('Fehler in einer Regel bricht den Prüfer nicht ab', () => {
  const r = pruefeGebiet(ell(), [{ id: 'X', art: 'MUSS', text: 'kaputt', pruefe: () => { throw new Error('boom'); } }]);
  assert.equal(r.muss, 1);
  assert.match(r.meldungen[0].text, /boom/);
});

test('ueberlappen: Überschneidung ja, Berührung und Abstand nein', () => {
  const q = (x, y) => [[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]];
  assert.equal(ueberlappen(q(0, 0), q(5, 5)), true);
  assert.equal(ueberlappen(q(0, 0), q(10, 0)), false);
  assert.equal(ueberlappen(q(0, 0), q(30, 0)), false);
});

test('Startinhalt: kein Absturz, Meldungen mit Ort haben Zahlen', () => {
  for (const g of Object.values(GEBIETE)) {
    const r = pruefeGebiet(kopie(g));
    for (const m of r.meldungen) if (m.ort) assert.ok(Number.isFinite(m.ort.x) && Number.isFinite(m.ort.y), m.text);
  }
});

test('Prüfzeit: 300 Objekte auf 10 Gängen in unter 300 ms', () => {
  const g = ell();
  for (let i = 0; i < 8; i++) {
    g.knoten.push({ id: 'Z' + i, typ: 'ende', x: -3000 - 100 * i, y: 400 * i }, { id: 'Y' + i, typ: 'ende', x: 1000, y: 400 * i });
    g.gaenge.push({ id: 'g' + i, name: 'G', von: 'Z' + i, nach: 'Y' + i, breite: 200 });
  }
  for (let i = 0; i < 300; i++) g.objekte.push(wand('p' + i, (i % 30) * 40, -60 + Math.floor(i / 30) * 12, 20, 6));
  const t = performance.now();
  pruefeGebiet(g);
  assert.ok(performance.now() - t < 300, `${(performance.now() - t).toFixed(0)} ms`);
});
