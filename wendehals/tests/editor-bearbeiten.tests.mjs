// Tests des Editor-Bearbeitens (Paket 13, Stufe 2a): Gang ziehen, Knoten setzen/teilen, löschen, Eigenschaften, Rückgängig, Speicher.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { formatiere, kopie, pruefeFormat, ladeGebiet, gangMasse, richtungVon, Verlauf, formatiereWelt } from '../src/editor/daten.js';
import { gaengeImRaster, gangZiehen, gangZiel, rasterEnde, knotenSetzen, gangTeilen, loesche, setze, knotenVerschieben, neueId, anfangPunkt, knotenPunkt } from '../src/editor/befehle.js';
import { erzeugeSpeicher } from '../src/editor/speicher.js';
import { WELT, GEBIETE } from '../src/editor/startdaten.js';
import { RASTER, KNOTENRASTER, GANG_BREITE, SCREEN_W, SPEED } from '../src/editor/konstanten.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TOL = 12;
const leer = () => ({ format: 1, id: 'test', name: 'Test', tileset: 'bad', bereich: { x0: -500, y0: -500, x1: 500, y1: 500 }, knoten: [], gaenge: [], formteile: [], objekte: [], notizen: [] });
const gueltig = (g) => assert.deepEqual(pruefeFormat(g), [], 'Format gültig');
const alleImRaster = (g) => {
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang);
    assert.ok(m && m.richtung >= 0, `Gang ${gang.id} liegt im 45°-Raster`);
    assert.ok(m.laenge >= RASTER - 1e-6, `Gang ${gang.id} nicht kürzer als ein Rasterschritt`);
  }
};

test('rasterEnde: 8 Richtungen, Länge auf 20 E', () => {
  const s = { x: 0, y: 0 };
  assert.deepEqual(rasterEnde(s, 213, 7), { x: 220, y: 0, richtung: 0, schritte: 11 });
  assert.equal(rasterEnde(s, 7, 301).richtung, 2);
  assert.equal(rasterEnde(s, -300, 9).richtung, 4);
  assert.equal(rasterEnde(s, 4, -300).richtung, 6);
  const d = rasterEnde(s, 190, 205);
  assert.equal(d.richtung, 1);
  assert.equal(d.x, d.y, 'Diagonale: gleiche Schritte je Achse');
  assert.equal(d.x % RASTER, 0);
  assert.equal(rasterEnde(s, 3, 2).schritte, 0, 'zu kurz');
  assert.equal(rasterEnde(s, -190, -205).richtung, 5);
});

test('Gang ziehen im Leeren: zwei neue Knoten, Gang im Raster, Standardbreite', () => {
  const g = leer();
  const r = gangZiehen(g, 3, -2, 413, 9, TOL);
  assert.ok(r);
  assert.equal(g.knoten.length, 2);
  assert.equal(g.gaenge.length, 1);
  assert.deepEqual(g.knoten.map((k) => k.typ), ['ende', 'ende']);
  assert.deepEqual([g.knoten[0].x, g.knoten[0].y], [0, 0], 'Anfang auf Knotenraster');
  const m = gangMasse(g, g.gaenge[0]);
  assert.equal(m.richtung, 0);
  assert.equal(m.laenge % RASTER, 0);
  assert.equal(g.gaenge[0].breite, GANG_BREITE);
  assert.equal(m.bildschirme, m.laenge / SCREEN_W);
  assert.equal(m.sekunden, m.laenge / SPEED);
  gueltig(g);
});

test('Gang ziehen: zu kurz oder ohne Wirkung ändert nichts', () => {
  const g = leer();
  const vorher = JSON.stringify(g);
  assert.equal(gangZiehen(g, 0, 0, 5, 3, TOL), null);
  assert.equal(JSON.stringify(g), vorher);
  gangZiehen(g, 0, 0, 400, 0, TOL);
  const nachEins = JSON.stringify(g);
  assert.equal(gangZiehen(g, 0, 0, 400, 0, TOL), null, 'derselbe Gang noch einmal');
  assert.equal(JSON.stringify(g), nachEins);
});

test('Gang ziehen: an Knoten anschließen verbindet, aus ende wird kreuzung', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL); // K1 (0,0) – K2 (400,0)
  const r = gangZiehen(g, 400, 0, 402, 300, TOL); // von K2 nach Süden
  assert.equal(r.von, 'K2');
  assert.equal(g.knoten.length, 3);
  assert.equal(g.knoten.find((k) => k.id === 'K2').typ, 'kreuzung', 'zwei Gänge machen aus dem Gangende eine Kreuzung');
  // Schleife schließen: von K3 (400, 300) nach K1 (0,0) wäre diagonal nicht möglich → kein Knoten-Anschluss, freies Ende
  const k3 = g.knoten.find((k) => k.id === 'K3');
  const vorher = g.gaenge.length;
  gangZiehen(g, k3.x, k3.y, 0, 300, TOL); // nach Westen, frei
  assert.equal(g.gaenge.length, vorher + 1);
  alleImRaster(g);
  gueltig(g);
});

test('Gang ziehen: Knoten außerhalb des 45°-Rasters wird nicht verbunden (Gang bleibt im Raster)', () => {
  const g = leer();
  g.knoten.push({ id: 'K1', typ: 'ende', x: 0, y: 0 }, { id: 'K2', typ: 'ende', x: 300, y: 100 });
  const r = gangZiehen(g, 0, 0, 300, 100, TOL);
  assert.ok(r);
  assert.notEqual(r.nach, 'K2', 'K2 liegt nicht auf einer der 8 Richtungen');
  alleImRaster(g);
});

test('Gang auf Gang: T-Kreuzung – alte Daten bleiben, Teilung am Rasterpunkt', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 800, 0, TOL);
  g.gaenge[0].name = 'Hauptgang';
  g.gaenge[0].breite = 160;
  const r = gangZiehen(g, 400, 200, 402, 3, TOL); // von unten auf den Gang zu
  assert.ok(r);
  assert.equal(g.gaenge.length, 3, 'Gang geteilt + neuer Gang');
  const [a, b] = g.gaenge;
  assert.equal(a.id, 'gang1');
  assert.equal(b.id, 'gang1-1');
  assert.equal(a.name, 'Hauptgang');
  assert.equal(b.name, 'Hauptgang');
  assert.equal(a.breite, 160);
  assert.equal(b.breite, 160);
  assert.equal(a.nach, b.von, 'beide Teile treffen sich im neuen Knoten');
  assert.equal(b.nach, 'K2');
  const neu = g.knoten.find((k) => k.id === a.nach);
  assert.deepEqual([neu.x, neu.y], [400, 0]);
  assert.equal(neu.typ, 'kreuzung');
  assert.equal(grad(g, neu.id), 3);
  alleImRaster(g);
  gueltig(g);
});
const grad = (g, id) => g.gaenge.filter((x) => x.von === id || x.nach === id).length;

test('Gang endet mitten auf einem anderen Gang (Schnitt der Rasterrichtung)', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 800, 0, TOL); // waagerecht
  // diagonal von (100, 400) nach oben rechts bis zum Gang: trifft ihn bei (500, 0)
  const r = gangZiehen(g, 100, 400, 500, 0, TOL);
  assert.ok(r);
  const knoten = g.knoten.find((k) => k.x === 500 && k.y === 0);
  assert.ok(knoten, 'T-Knoten bei (500, 0)');
  assert.equal(g.gaenge.length, 3);
  alleImRaster(g);
  gueltig(g);
});

test('Knoten setzen: Raster 100, Raum bekommt Maße, auf Gang = Teilung', () => {
  const g = leer();
  const k = knotenSetzen(g, 'raum', 137, -52);
  assert.deepEqual([k.x, k.y, k.typ, k.w, k.h], [100, -100, 'raum', 520, 400]);
  assert.equal(knotenSetzen(g, 'raum', 140, -60), null, 'dort steht schon einer');
  gangZiehen(g, 300, 300, 900, 300, TOL);
  g.gaenge[0].name = 'Quergang';
  const t = knotenSetzen(g, 'speicher', 612, 296, 40);
  assert.equal(t.typ, 'speicher');
  assert.equal(t.y, 300);
  assert.equal(t.x % RASTER, 0);
  assert.equal(g.gaenge.length, 2);
  assert.equal(g.gaenge[1].name, 'Quergang');
  gueltig(g);
  assert.equal(knotenSetzen(g, 'kreuzung', 305, 300, 40), null, 'zu nah am Gangende');
});

test('Gang teilen: erhält alle Felder, Endknoten bei zu kurzer Stelle', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 600, 0, TOL);
  g.gaenge[0].extra = 'bleibt';
  const vorher = kopie(g);
  assert.equal(gangTeilen(g, 'gang1', 5).id, 'K1', 'am Anfang kein neuer Knoten');
  assert.deepEqual(g, vorher);
  const k = gangTeilen(g, 'gang1', 300);
  assert.equal(g.gaenge[1].extra, 'bleibt');
  assert.deepEqual([k.x, k.y], [300, 0]);
  const m1 = gangMasse(g, g.gaenge[0]);
  const m2 = gangMasse(g, g.gaenge[1]);
  assert.equal(m1.laenge + m2.laenge, 600, 'Gesamtlänge bleibt');
});

test('Diagonale Gänge: Teilen und T-Kreuzung bleiben im Raster', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 400, TOL);
  assert.equal(gangMasse(g, g.gaenge[0]).richtung, 1);
  const k = knotenSetzen(g, 'kreuzung', 203, 197, 40);
  assert.ok(k);
  assert.equal(k.x, k.y);
  assert.equal(k.x % RASTER, 0);
  gangZiehen(g, 200 + 300, 200 - 300, 195, 205, TOL); // von Nordosten auf die Diagonale zu
  alleImRaster(g);
  gueltig(g);
});

test('Löschen: Gang entfernt freie Gangenden mit, Knoten nimmt seine Gänge mit', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL);
  gangZiehen(g, 400, 0, 400, 300, TOL);
  assert.deepEqual(loesche(g, 'gang', 'gang2').sort(), ['K3', 'gang2']);
  assert.equal(g.knoten.length, 2);
  gangZiehen(g, 400, 0, 400, 300, TOL);
  const weg = loesche(g, 'knoten', 'K2');
  assert.ok(weg.includes('gang1') && weg.includes('gang2'));
  assert.equal(g.gaenge.length, 0);
  gueltig(g);
  assert.deepEqual(loesche(g, 'knoten', 'gibtsnicht'), []);
});

test('Eigenschaften: Breite, Name, Typ, Raumgröße mit Prüfung', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL);
  assert.equal(setze(g, 'gang', 'gang1', 'breite', '240'), null);
  assert.equal(g.gaenge[0].breite, 240);
  assert.match(setze(g, 'gang', 'gang1', 'breite', '30'), /mindestens 60/);
  assert.equal(g.gaenge[0].breite, 240, 'ungültiger Wert ändert nichts');
  assert.match(setze(g, 'gang', 'gang1', 'breite', 'abc'), /mindestens/);
  assert.match(setze(g, 'gang', 'gang1', 'name', '  '), /leer/);
  assert.equal(setze(g, 'gang', 'gang1', 'name', ' Neu '), null);
  assert.equal(g.gaenge[0].name, 'Neu');
  assert.match(setze(g, 'knoten', 'K1', 'w', 300), /keine Maße/);
  assert.equal(setze(g, 'knoten', 'K1', 'typ', 'raum'), null);
  assert.deepEqual([g.knoten[0].w, g.knoten[0].h], [520, 400]);
  assert.equal(setze(g, 'knoten', 'K1', 'w', '700,5'), null);
  assert.equal(g.knoten[0].w, 701);
  assert.match(setze(g, 'knoten', 'K1', 'h', 20), /mindestens/);
  assert.match(setze(g, 'knoten', 'K1', 'typ', 'blubb'), /Unbekannt/);
  assert.match(setze(g, 'knoten', 'K9', 'x', 1), /gibt es nicht/);
  gueltig(g);
});

test('Knoten verschieben rastet und lässt Doppelbelegung nicht zu', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL);
  assert.equal(knotenVerschieben(g, 'K2', 530, 40), true);
  assert.deepEqual([g.knoten[1].x, g.knoten[1].y], [500, 0]);
  assert.equal(knotenVerschieben(g, 'K2', 10, 10), false, 'K1 steht schon bei (0, 0)');
  assert.equal(knotenVerschieben(g, 'K2', 500, 0), false, 'gleiche Stelle');
});

test('Verlauf: Rückgängig/Wiederholen stellen den Zustand exakt her', () => {
  const g = leer();
  const v = new Verlauf(5);
  const stand = [JSON.stringify(g)];
  for (const x of [400, 500, 600]) {
    v.merke(JSON.stringify(g));
    gangZiehen(g, 0, x, 300, x, TOL);
    stand.push(JSON.stringify(g));
  }
  let aktuell = JSON.stringify(g);
  for (let i = 2; i >= 0; i--) {
    aktuell = v.rueckgaengig(aktuell);
    assert.equal(aktuell, stand[i]);
  }
  assert.equal(v.rueckgaengig(aktuell), null);
  for (let i = 1; i <= 3; i++) {
    aktuell = v.wiederholen(aktuell);
    assert.equal(aktuell, stand[i]);
  }
  assert.equal(v.wiederholen(aktuell), null);
  v.rueckgaengig(aktuell);
  v.merke('neu');
  assert.equal(v.kannVor, false, 'neue Änderung löscht Wiederholen');
  for (let i = 0; i < 10; i++) v.merke('x' + i);
  assert.equal(v.zurueck.length, 5, 'Verlauf ist begrenzt');
});

test('Zufallsfolge von Bearbeitungen: immer gültig, immer im Raster, alles rückgängig machbar', () => {
  let seed = 7;
  const zufall = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const g = leer();
  const v = new Verlauf(1000);
  const start = JSON.stringify(g);
  for (let i = 0; i < 400; i++) {
    const vorher = JSON.stringify(g);
    const art = zufall();
    const px = Math.round((zufall() - 0.5) * 3000);
    const py = Math.round((zufall() - 0.5) * 3000);
    if (art < 0.5) gangZiehen(g, px, py, px + (zufall() - 0.5) * 1500, py + (zufall() - 0.5) * 1500, TOL);
    else if (art < 0.65) knotenSetzen(g, ['kreuzung', 'raum', 'speicher', 'ende', 'boss'][Math.floor(zufall() * 5)], px, py, 40);
    else if (art < 0.8 && g.gaenge.length) loesche(g, 'gang', g.gaenge[Math.floor(zufall() * g.gaenge.length)].id);
    else if (art < 0.9 && g.knoten.length) loesche(g, 'knoten', g.knoten[Math.floor(zufall() * g.knoten.length)].id);
    else if (art < 0.95 && g.knoten.length) {
      const k = g.knoten[Math.floor(zufall() * g.knoten.length)];
      if (zufall() < 0.5) knotenVerschieben(g, k.id, px, py);
      else setze(g, 'knoten', k.id, zufall() < 0.5 ? 'x' : 'y', Math.round(px / 20) * 20);
    } else if (g.gaenge.length) gangTeilen(g, g.gaenge[Math.floor(zufall() * g.gaenge.length)].id, zufall() * 800);
    if (JSON.stringify(g) !== vorher) v.merke(vorher);
    gueltig(g);
    alleImRaster(g);
    const ids = new Set();
    for (const o of [...g.knoten, ...g.gaenge]) {
      assert.ok(!ids.has(o.id), 'IDs eindeutig: ' + o.id);
      ids.add(o.id);
    }
    assert.ok(formatiere(ladeGebiet(formatiere(g))) === formatiere(g), 'Formatieren ist stabil');
  }
  assert.ok(g.gaenge.length > 5, 'die Folge hat etwas gebaut');
  let aktuell = JSON.stringify(g);
  let t;
  while ((t = v.rueckgaengig(aktuell)) != null) aktuell = t;
  assert.equal(aktuell, start, 'alles rückgängig = Ausgangszustand');
});

test('Vorschau-Funktionen ändern nichts und stimmen mit den Befehlen überein', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 800, 0, TOL);
  const vorher = JSON.stringify(g);
  const von = anfangPunkt(g, 396, 6, TOL);
  assert.deepEqual([von.x, von.y, von.gang], [400, 0, 'gang1']);
  const z = gangZiel(g, von, 405, 305, TOL);
  assert.deepEqual([z.x, z.y, z.richtung], [400, 300, 2]);
  assert.deepEqual(knotenPunkt(g, 612, 10, 40)?.gang, 'gang1');
  assert.equal(JSON.stringify(g), vorher);
  gangZiehen(g, 396, 6, 405, 305, TOL);
  assert.ok(g.knoten.some((k) => k.x === 400 && k.y === 300));
});

test('Startgebiete: Bearbeiten ändert nur die Kopie, die Ausgangsdaten bleiben unberührt', () => {
  for (const [id, g0] of Object.entries(GEBIETE)) {
    const g = kopie(g0);
    const vorher = formatiere(g);
    assert.equal(setze(g, 'gang', g.gaenge[0].id, 'breite', g.gaenge[0].breite + 40), null);
    assert.ok(loesche(g, 'gang', g.gaenge[1].id).length);
    gueltig(g);
    assert.notEqual(formatiere(g), vorher, id);
    assert.equal(formatiere(g0), vorher, 'Original unberührt');
  }
});

// ------------------------------------------------------------------ Speicher
const dateiFeld = () => {
  const gesichert = [];
  return { gesichert, nativ: { schreibe: async (p, t) => gesichert.push([p, t]), alle: async () => ({ welt: formatiereWelt(WELT), gebiete: Object.fromEntries(Object.entries(GEBIETE).map(([i, g]) => [i, formatiere(g)])) }) } };
};

test('Speicher (Electron-Adapter): schreibt Pfad und Text unverändert, ladeAlle liefert die Dateien', async () => {
  const { gesichert, nativ } = dateiFeld();
  const s = erzeugeSpeicher({ nativ, fenster: {} });
  assert.equal(s.art, 'nativ');
  const text = formatiere(GEBIETE.beispiel);
  assert.deepEqual(await s.sichere('gebiete/beispiel.json', text), { wo: 'levels/gebiete/beispiel.json' });
  assert.deepEqual(gesichert, [['gebiete/beispiel.json', text]]);
  const alle = await s.ladeAlle();
  assert.equal(alle.gebiete.beispiel, text);
  assert.equal(ladeGebiet(alle.gebiete['proto-netz']).id, 'proto-netz');
});

test('Speicher (File System Access): schreibt in dieselbe Datei, Abbruch gibt null', async () => {
  const geschrieben = [];
  let dialoge = 0;
  const fenster = {
    showSaveFilePicker: async ({ suggestedName }) => {
      dialoge++;
      return { name: suggestedName, createWritable: async () => ({ write: async (t) => geschrieben.push(t), close: async () => {} }) };
    },
  };
  const s = erzeugeSpeicher({ fenster, nativ: null });
  assert.equal(s.art, 'datei');
  assert.deepEqual(await s.sichere('gebiete/a.json', 'eins'), { wo: 'a.json' });
  await s.sichere('gebiete/a.json', 'zwei');
  assert.equal(dialoge, 1, 'nur beim ersten Mal ein Dialog');
  assert.deepEqual(geschrieben, ['eins', 'zwei']);
  const abbr = erzeugeSpeicher({ fenster: { showSaveFilePicker: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } }, nativ: null });
  assert.equal(await abbr.sichere('a.json', 'x'), null);
  const kaputt = erzeugeSpeicher({ fenster: { showSaveFilePicker: async () => { throw new Error('Platte voll'); } }, nativ: null });
  await assert.rejects(kaputt.sichere('a.json', 'x'), /Platte voll/);
});

test('Laden ungültiger Dateien: verständliche Meldung statt Absturz', () => {
  assert.throws(() => ladeGebiet('{ kaputt'), /kein gültiges JSON/);
  assert.throws(() => ladeGebiet('[]'), /Objekt erwartet|nicht zum Format/);
  assert.throws(() => ladeGebiet(JSON.stringify({ ...leer(), id: '../x' })), /Dateiname/);
  assert.throws(() => ladeGebiet(JSON.stringify({ ...leer(), format: 2 })), /Format 2/);
  assert.doesNotThrow(() => ladeGebiet(formatiere(leer())));
});

test('Neue IDs sind frei', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL);
  assert.equal(neueId(g, 'K'), 'K3');
  assert.equal(neueId(g, 'gang'), 'gang2');
});

test('Knoten verschieben / x,y setzen: Gänge bleiben im 45°-Raster, sonst wird abgelehnt (nichts geändert)', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 400, 0, TOL);
  const vorher = JSON.stringify(g);
  assert.equal(knotenVerschieben(g, 'K2', 400, 100), false);
  assert.match(setze(g, 'knoten', 'K2', 'y', 37), /45°-Raster/);
  assert.equal(JSON.stringify(g), vorher);
  assert.equal(setze(g, 'knoten', 'K2', 'x', 600), null, 'Verlängern entlang des Gangs geht');
  assert.equal(knotenVerschieben(g, 'K2', 0, 0), false, 'auf K1 oder zu kurz');
  assert.ok(gaengeImRaster(g, 'K2'));
});

test('Gang teilen auf Diagonalen rastet entlang des Gangs (glatte Koordinaten)', () => {
  const g = leer();
  gangZiehen(g, 100, 0, 500, 400, TOL);
  const k = gangTeilen(g, 'gang1', 40);
  assert.ok(Number.isInteger(k.x) && Number.isInteger(k.y), `${k.x}, ${k.y}`);
  assert.equal(k.x % RASTER, 0);
  gueltig(g);
  alleImRaster(g);
});

test('Gang auf einen vorhandenen Gang legen (deckungsgleich) wird abgewiesen, Gebiet unverändert', () => {
  const g = leer();
  gangZiehen(g, 0, 0, 800, 0, TOL);
  const vorher = JSON.stringify(g);
  assert.equal(gangZiehen(g, 0, 0, 400, 0, TOL), null);
  assert.equal(gangZiehen(g, 200, 0, 600, 0, TOL), null);
  assert.equal(JSON.stringify(g), vorher);
});

test('Typwechsel Raum → Speicherort entfernt die Maße; Prototyp-Schlüssel sind keine Typen', () => {
  const g = leer();
  knotenSetzen(g, 'raum', 0, 0);
  assert.equal(setze(g, 'knoten', 'K1', 'typ', 'speicher'), null);
  assert.equal('w' in g.knoten[0] || 'h' in g.knoten[0], false);
  assert.match(setze(g, 'knoten', 'K1', 'typ', 'constructor'), /Unbekannt/);
  assert.ok(pruefeFormat({ ...g, tileset: 'constructor' }).length);
  assert.ok(pruefeFormat({ ...g, knoten: [{ id: 'K1', typ: 'toString', x: 0, y: 0 }] }).length);
});

test('welt.json: Formatierung ist verlustfrei, auch mit weiteren Schlüsseln; Windows-Namen sind keine Gebiets-IDs', () => {
  assert.equal(formatiereWelt(WELT), readFileSync(path.join(root, 'levels/welt.json'), 'utf8'));
  const mit = { ...WELT, lage: { beispiel: [0, 0] } };
  assert.deepEqual(JSON.parse(formatiereWelt(mit)), mit);
  for (const id of ['con', 'nul', 'aux', 'com1', 'lpt9']) assert.ok(pruefeFormat({ ...leer(), id }).length, id);
  assert.deepEqual(pruefeFormat({ ...leer(), id: 'console' }), []);
});

test('Leeres Zahlenfeld und riesige Zahlen werden abgewiesen', () => {
  const g = leer();
  knotenSetzen(g, 'raum', 0, 0);
  for (const w of ['', '  ', 'abc']) assert.ok(setze(g, 'knoten', 'K1', 'x', w), `„${w}“`);
  assert.match(setze(g, 'knoten', 'K1', 'x', 1e9), /nicht erlaubt/);
  assert.match(setze(g, 'knoten', 'K1', 'w', 99999), /nicht erlaubt/);
  assert.equal(g.knoten[0].x, 0);
});
