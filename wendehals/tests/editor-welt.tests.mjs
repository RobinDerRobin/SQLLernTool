// Tests Stufe 5 „Gebiete und Übergänge“: Bereich, Lage der Gebiete, Übergänge, Welt-Datei, Welt-Prüfer (je Regel gutes und schlechtes Beispiel).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { kopie, pruefeFormat, formatiere } from '../src/editor/daten.js';
import {
  lagenFestschreiben, bereichSetzen, bereichFeld, bereichAnInhalt, bereichAnpassen, ausserhalb, weltLagen, weltBereich, weltAusdehnung, lageSetzen, uebergangAnlegen, uebergangLoeschen,
  uebergaengeAn, andereSeite, teileEnde, uebergangPunkte, pruefeWelt, pruefeWeltFormat, ladeWelt, formatiereWelt,
} from '../src/editor/welt.js';
import { MIN_BEREICH_W, MIN_BEREICH_H, BEREICH_RASTER, LAGE_RASTER, WELT_LUECKE } from '../src/editor/konstanten.js';
import { WELT, GEBIETE } from '../src/editor/startdaten.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gebiet = (id = 'a') => ({
  format: 1, id, name: id.toUpperCase(), tileset: 'bad', bereich: { x0: -200, y0: -400, x1: 1400, y1: 400 },
  knoten: [{ id: 'K1', typ: 'speicher', x: 0, y: 0 }, { id: 'K2', typ: 'ende', x: 1000, y: 0 }],
  gaenge: [{ id: 'g1', name: 'Gang', von: 'K1', nach: 'K2', breite: 200 }], formteile: [], objekte: [], notizen: [],
});
const welt2 = () => ({ format: 1, gebiete: [{ id: 'a', name: 'A', datei: 'gebiete/a.json' }, { id: 'b', name: 'B', datei: 'gebiete/b.json' }] });
const zwei = () => ({ a: gebiet('a'), b: gebiet('b') });

test('Bereich setzen: rastet auf 100 E, vertauschte Ecken sind egal, Mindestgröße ein Bildschirm', () => {
  const g = gebiet();
  assert.equal(bereichSetzen(g, 1349, 620, -151, -380), null);
  assert.deepEqual(g.bereich, { x0: -200, y0: -400, x1: 1300, y1: 600 });
  assert.ok(Object.values(g.bereich).every((v) => v % BEREICH_RASTER === 0));
  const vorher = kopie(g.bereich);
  assert.match(bereichSetzen(g, 0, 0, MIN_BEREICH_W - 120, 800), /mindestens/, 'zu schmal');
  assert.match(bereichSetzen(g, 0, 0, 2000, MIN_BEREICH_H - 120), /mindestens/, 'zu niedrig');
  assert.match(bereichSetzen(g, 0, 0, 999999, 800), /nicht erlaubt/);
  assert.match(bereichSetzen(g, NaN, 0, 800, 800), /Zahlen/);
  assert.deepEqual(g.bereich, vorher, 'abgelehnt heißt: nichts geändert');
});

test('Bereich-Feld: ändert eine Seite, lehnt Unsinn mit Meldung ab', () => {
  const g = gebiet();
  assert.equal(bereichFeld(g, 'x1', '2000'), null);
  assert.equal(g.bereich.x1, 2000);
  assert.equal(bereichFeld(g, 'y0', '-500,4'), null);
  assert.equal(g.bereich.y0, -500);
  assert.match(bereichFeld(g, 'x1', 'abc'), /Zahl/);
  assert.match(bereichFeld(g, 'x1', ''), /Zahl/);
  assert.match(bereichFeld(g, 'x1', '-300'), /mindestens/);
  assert.match(bereichFeld(g, 'z9', '1'), /gibt es beim Bereich nicht/);
  assert.equal(g.bereich.x1, 2000);
});

test('Bereich an Inhalt anpassen: schließt Boden, Teile, Gegner und Notizen ein, danach ist nichts mehr außerhalb', () => {
  const g = gebiet();
  g.bereich = { x0: 0, y0: 0, x1: 600, y1: 300 };
  g.objekte.push({ id: 'o1', typ: 'gegner', art: 'ente', x: 2500, y: -900, platzhalter: true });
  g.notizen.push({ id: 'n1', x: -700, y: 1000, text: 'weit weg' });
  g.formteile.push({ id: 'f1', x: 500, y: 700, laenge: 400, breite: 200, winkel: 0 });
  assert.deepEqual(ausserhalb(g).map((d) => d.id).sort(), ['K2', 'f1', 'n1', 'o1'].sort(), 'Knoten K2 (Boden), Formteil, Notiz und Gegner liegen draußen');
  assert.equal(bereichAnpassen(g), true);
  assert.deepEqual(ausserhalb(g), []);
  assert.ok(Object.values(g.bereich).every((v) => v % BEREICH_RASTER === 0));
  assert.ok(g.bereich.x0 <= -700 && g.bereich.x1 >= 2500 && g.bereich.y0 <= -900 && g.bereich.y1 >= 1000);
  assert.equal(bereichAnpassen(g), false, 'zweites Mal: nichts zu tun');
});

test('Bereich: Randfall – kleines Gebiet bekommt mindestens einen Bildschirm; leeres Gebiet behält den Bereich', () => {
  const g = { ...gebiet(), knoten: [], gaenge: [] };
  assert.deepEqual(bereichAnInhalt(g), g.bereich);
  const k = gebiet();
  k.knoten = [{ id: 'K1', typ: 'ende', x: 0, y: 0 }];
  k.gaenge = [];
  const b = bereichAnInhalt(k, 10);
  assert.ok(b.x1 - b.x0 >= MIN_BEREICH_W && b.y1 - b.y0 >= MIN_BEREICH_H);
});

test('Format: ein leerer oder umgedrehter Bereich ist eine verständliche Fehlermeldung', () => {
  const g = gebiet();
  assert.deepEqual(pruefeFormat(g), []);
  g.bereich = { x0: 5, y0: 0, x1: 5, y1: 10 };
  assert.match(pruefeFormat(g).join(' '), /Bereich ist leer/);
});

test('Lage: ohne Eintrag werden Gebiete automatisch nebeneinander gelegt (keine Überlappung, Lücke), mit Eintrag gilt dieser', () => {
  const w = welt2();
  const gs = zwei();
  const l = weltLagen(w, gs);
  assert.equal(l.get('a').auto, true);
  const ra = weltBereich(gs.a, l.get('a'));
  const rb = weltBereich(gs.b, l.get('b'));
  assert.ok(rb.x0 - ra.x1 >= WELT_LUECKE - LAGE_RASTER, `Lücke ${rb.x0 - ra.x1}`);
  assert.ok(lageSetzen(w, 'b', 123, -4040), 'Lage setzen ändert etwas');
  assert.deepEqual(w.gebiete[1].lage, { x: 100, y: -4000 }, 'rastet auf 100 E');
  assert.equal(lageSetzen(w, 'b', 100, -4000), false, 'gleiche Lage: nichts geändert');
  assert.equal(lageSetzen(w, 'x', 1, 1), false, 'unbekanntes Gebiet');
  const l2 = weltLagen(w, gs);
  assert.deepEqual([l2.get('b').x, l2.get('b').y, l2.get('b').auto], [100, -4000, false]);
  const e = weltAusdehnung(w, gs);
  assert.ok(e.x0 <= ra.x0 && e.y0 <= -4400 && e.x1 >= 100 + gs.b.bereich.x1);
});

test('Lage: ungeladene Gebiete werden übersprungen', () => {
  const w = welt2();
  assert.deepEqual([...weltLagen(w, { a: gebiet('a') }).keys()], ['a']);
});

test('Übergang anlegen: gutes Beispiel, dann jeder Fehlerfall mit Meldung und ohne Änderung', () => {
  const w = welt2();
  const gs = zwei();
  const r = uebergangAnlegen(w, gs, { gebiet: 'a', knoten: 'K2' }, { gebiet: 'b', knoten: 'K1' });
  assert.deepEqual(r.uebergang, { id: 'u1', von: 'a/K2', nach: 'b/K1' });
  assert.deepEqual(w.uebergaenge, [r.uebergang]);
  const stand = JSON.stringify(w);
  const schlecht = (von, nach, muster) => {
    const e = uebergangAnlegen(w, gs, von, nach);
    assert.match(e.fehler ?? '', muster);
    assert.equal(JSON.stringify(w), stand, 'nichts geändert');
  };
  schlecht({ gebiet: 'a', knoten: 'K1' }, { gebiet: 'a', knoten: 'K2' }, /zwei verschiedene Gebiete/);
  schlecht({ gebiet: 'a', knoten: 'K9' }, { gebiet: 'b', knoten: 'K1' }, /Knoten „K9“/);
  schlecht({ gebiet: 'a', knoten: 'K1' }, { gebiet: 'zz', knoten: 'K1' }, /Gebiet „zz“/);
  schlecht({ gebiet: 'b', knoten: 'K1' }, { gebiet: 'a', knoten: 'K2' }, /schon verbunden/);
  schlecht({ gebiet: 'a', knoten: 'K2' }, { gebiet: 'b', knoten: 'K1' }, /schon verbunden/);
  schlecht({ gebiet: 'a' }, { gebiet: 'b', knoten: 'K1' }, /Gebiet und einen Knoten/);
  const zweiter = uebergangAnlegen(w, gs, { gebiet: 'a', knoten: 'K1' }, { gebiet: 'b', knoten: 'K2' });
  assert.equal(zweiter.uebergang.id, 'u2');
  assert.equal(uebergangLoeschen(w, 'u1'), true);
  assert.equal(uebergangAnlegen(w, gs, { gebiet: 'a', knoten: 'K2' }, { gebiet: 'b', knoten: 'K1' }).uebergang.id, 'u1', 'freie ID wird wieder vergeben');
  assert.equal(uebergangLoeschen(w, 'nix'), false);
});

test('Übergang: Enden, Gegenseite und Weltpunkte', () => {
  const w = welt2();
  const gs = zwei();
  const { uebergang: u } = uebergangAnlegen(w, gs, { gebiet: 'a', knoten: 'K2' }, { gebiet: 'b', knoten: 'K1' });
  assert.deepEqual(teileEnde('a/K2'), { gebiet: 'a', knoten: 'K2' });
  assert.equal(teileEnde('a'), null);
  assert.equal(teileEnde('a/b/c'), null);
  assert.equal(uebergaengeAn(w, 'a', 'K2').length, 1);
  assert.equal(uebergaengeAn(w, 'a', 'K1').length, 0);
  assert.deepEqual(andereSeite(u, 'a', 'K2'), { gebiet: 'b', knoten: 'K1' });
  assert.deepEqual(andereSeite(u, 'b', 'K1'), { gebiet: 'a', knoten: 'K2' });
  const lagen = weltLagen(w, gs);
  const p = uebergangPunkte(u, gs, lagen);
  assert.deepEqual([p[0].x, p[0].y], [1000 + lagen.get('a').x, lagen.get('a').y]);
  assert.deepEqual([p[1].x, p[1].y], [lagen.get('b').x, lagen.get('b').y]);
  assert.equal(uebergangPunkte(u, { a: gs.a }, lagen), null, 'ein Ende fehlt');
});

test('Welt-Datei: Format, Fehlermeldungen, Laden → Formatieren verlustfrei', () => {
  const w = welt2();
  assert.deepEqual(pruefeWeltFormat(w), []);
  assert.match(pruefeWeltFormat({ format: 2, gebiete: w.gebiete }).join(' '), /Format 2/);
  assert.match(pruefeWeltFormat({ format: 1, gebiete: [] }).join(' '), /fehlt oder ist leer/);
  assert.match(pruefeWeltFormat({ format: 1, gebiete: [w.gebiete[0], w.gebiete[0]] }).join(' '), /doppelt/);
  assert.match(pruefeWeltFormat({ ...w, uebergaenge: [{ id: 'u1', von: 'a', nach: 'b/K1' }] }).join(' '), /Form „gebiet\/Knoten“/);
  assert.match(pruefeWeltFormat({ ...w, uebergaenge: 5 }).join(' '), /Liste/);
  assert.match(pruefeWeltFormat({ ...w, gebiete: [{ ...w.gebiete[0], lage: { x: 'a', y: 1 } }] }).join(' '), /lage/);
  assert.throws(() => ladeWelt('{ kaputt'), /kein gültiges JSON/);
  assert.throws(() => ladeWelt('[]'), /Objekt erwartet/);
  const voll = { ...w, gebiete: [{ ...w.gebiete[0], lage: { x: 100, y: -200 } }, w.gebiete[1]], uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] };
  const text = formatiereWelt(voll);
  assert.deepEqual(JSON.parse(text), voll);
  assert.equal(formatiereWelt(ladeWelt(text)), text, 'zweimal formatieren ändert nichts');
  assert.ok(text.includes('{ "id": "a", "name": "A", "datei": "gebiete/a.json", "lage": { "x": 100, "y": -200 } }'), 'feste Schlüsselreihenfolge, ein Gebiet je Zeile');
  assert.equal(formatiereWelt(WELT), readFileSync(path.join(root, 'levels/welt.json'), 'utf8'), 'die echte welt.json ist schon so formatiert');
  assert.equal(formatiereWelt({ ...w, extra: 1 }).includes('"extra": 1'), true, 'unbekannte Schlüssel gehen nicht verloren');
});

test('Welt-Prüfer W1: Übergänge brauchen vorhandene Knoten verschiedener Gebiete', () => {
  const gs = zwei();
  const gut = { ...welt2(), uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] };
  assert.equal(pruefeWelt(gut, gs).muss, 0);
  const regeln = (w, g = gs) => pruefeWelt(w, g).meldungen.filter((m) => m.regel === 'W1');
  assert.match(regeln({ ...gut, uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K7' }] })[0].text, /Knoten „K7“/);
  assert.match(regeln({ ...gut, uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'q/K1' }] })[0].text, /Gebiet „q“ gibt es nicht/);
  assert.match(regeln({ ...gut, uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'a/K1' }] })[0].text, /ein Übergang verbindet zwei Gebiete/);
  assert.match(regeln({ ...gut, uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }, { id: 'u1', von: 'a/K1', nach: 'b/K2' }] })[0].text, /doppelt/);
  assert.match(regeln({ ...gut, uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] }, { a: gs.a })[0].text, /nicht geladen/);
  const m = regeln({ ...gut, uebergaenge: [{ id: 'u9', von: 'a/K2', nach: 'b/K7' }] })[0];
  assert.deepEqual(m.ort, { art: 'uebergang', id: 'u9' });
  assert.equal(m.art, 'MUSS');
});

test('Welt-Prüfer W2: überlappende Bereiche im Welt-Plan', () => {
  const gs = zwei();
  const w = { ...welt2(), uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] };
  assert.equal(pruefeWelt(w, gs).meldungen.filter((m) => m.regel === 'W2').length, 0, 'automatische Anordnung überlappt nie');
  w.gebiete[0].lage = { x: 0, y: 0 };
  w.gebiete[1].lage = { x: 500, y: 100 };
  const m = pruefeWelt(w, gs).meldungen.filter((x) => x.regel === 'W2');
  assert.equal(m.length, 1);
  assert.equal(m[0].art, 'SOLL');
  w.gebiete[1].lage = { x: 1600, y: 0 }; // Bereiche berühren sich genau: zählt nicht
  assert.equal(pruefeWelt(w, gs).meldungen.filter((x) => x.regel === 'W2').length, 0);
});

test('Welt-Prüfer W3: alle Gebiete hängen zusammen', () => {
  const gs = { ...zwei(), c: gebiet('c') };
  const w = { ...welt2(), gebiete: [...welt2().gebiete, { id: 'c', name: 'C', datei: 'gebiete/c.json' }], uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] };
  const lose = pruefeWelt(w, gs).meldungen.filter((m) => m.regel === 'W3');
  assert.equal(lose.length, 1);
  assert.deepEqual(lose[0].ort, { art: 'gebiet', id: 'c' });
  w.uebergaenge.push({ id: 'u2', von: 'b/K2', nach: 'c/K1' });
  assert.equal(pruefeWelt(w, gs).meldungen.filter((m) => m.regel === 'W3').length, 0);
  assert.equal(pruefeWelt({ ...welt2(), gebiete: [welt2().gebiete[0]] }, { a: gs.a }).meldungen.length, 0, 'ein einzelnes Gebiet braucht keine Verbindung');
});

test('Welt-Prüfer W4: Inhalt außerhalb des Bereichs', () => {
  const gs = zwei();
  const w = { ...welt2(), uebergaenge: [{ id: 'u1', von: 'a/K2', nach: 'b/K1' }] };
  assert.equal(pruefeWelt(w, gs).meldungen.length, 0);
  gs.a.notizen.push({ id: 'n1', x: 9000, y: 0, text: 'draußen' });
  const m = pruefeWelt(w, gs).meldungen;
  assert.equal(m.length, 1);
  assert.equal(m[0].regel, 'W4');
  assert.match(m[0].text, /notiz n1/);
});

test('Startinhalt: die gelieferte Welt ist gültig, verbunden und hat keine Meldung', () => {
  assert.deepEqual(pruefeWeltFormat(WELT), []);
  const r = pruefeWelt(WELT, GEBIETE);
  assert.deepEqual(r.meldungen, []);
  for (const g of Object.values(GEBIETE)) assert.deepEqual(ausserhalb(g), [], `${g.id}: alles im Bereich`);
  assert.ok(WELT.uebergaenge.length >= 2);
  // Bereiche ändern die Gebietsdatei nicht verlustfrei? – Laden → Formatieren bleibt gleich
  for (const g of Object.values(GEBIETE)) assert.equal(formatiere(JSON.parse(formatiere(g))), formatiere(g));
});

test('Lage: beim ersten Verschieben werden die automatischen Lagen festgeschrieben, damit die anderen Gebiete nicht springen', () => {
  const w = { format: 1, gebiete: [...welt2().gebiete, { id: 'c', name: 'C', datei: 'gebiete/c.json' }] };
  const gs = { ...zwei(), c: gebiet('c') };
  const vorher = weltLagen(w, gs);
  assert.equal(lageSetzen(w, 'c', 2000, 0, gs), true);
  const nachher = weltLagen(w, gs);
  for (const id of ['a', 'b']) {
    assert.deepEqual([nachher.get(id).x, nachher.get(id).y], [vorher.get(id).x, vorher.get(id).y], `${id} bleibt, wo es war`);
    assert.equal(nachher.get(id).auto, false);
  }
  assert.deepEqual([nachher.get('c').x, nachher.get('c').y], [2000, 0]);
  const frisch = welt2();
  lagenFestschreiben(frisch, zwei());
  assert.ok(frisch.gebiete.every((e) => e.lage), 'alle haben eine Lage');
  assert.equal(lageSetzen(frisch, 'a', frisch.gebiete[0].lage.x, frisch.gebiete[0].lage.y, zwei()), false, 'gleiche Lage, schon festgeschrieben: nichts geändert');
});
