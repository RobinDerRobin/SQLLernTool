// Tests der Varianten (Paket 13, Stufe 10): Dateien laden, Unterschied zum aktuellen Gebiet, Übernehmen behält ID und Namen, ungültige Dateien
// ändern nichts, höchstens MAX_VARIANTEN. Gemessen werden die Daten, nicht der Code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kennzahlen, ladeVariante, nimmAuf, unterschied, unterschiedText, uebernehmeVariante } from '../src/editor/varianten.js';
import { formatiere, kopie, pruefeFormat, Verlauf } from '../src/editor/daten.js';
import { MAX_VARIANTEN } from '../src/editor/konstanten.js';
import { GEBIETE } from '../src/editor/startdaten.js';

const basis = () => kopie(GEBIETE['proto-netz']);
const mitTeil = (g) => {
  g.objekte.push({ id: 'oZ', typ: 'wand', x: 40, y: 0, laenge: 60, breite: 20, winkel: 0 });
  return g;
};

test('Varianten: gleiche Datei = identisch, Kennzahlen stimmen mit den Daten', () => {
  const g = basis();
  const v = ladeVariante(formatiere(g), 'netz.json', 1);
  assert.equal(v.id, 'v1');
  assert.equal(v.name, 'netz');
  assert.equal(unterschied(g, v.gebiet).gleich, true);
  assert.equal(unterschiedText(unterschied(g, v.gebiet)), 'identisch');
  assert.equal(v.kennzahlen.knoten, g.knoten.length);
  assert.equal(v.kennzahlen.gaenge, g.gaenge.length);
  assert.equal(v.kennzahlen.gegner, g.objekte.filter((o) => o.typ === 'gegner').length);
});

test('Varianten: Unterschied nennt neu, weg und geändert nach ID', () => {
  const g = basis();
  const v = kopie(g);
  v.gaenge.pop(); // weg
  v.objekte.push({ id: 'oNeu', typ: 'wand', x: 0, y: 0, laenge: 40, breite: 20, winkel: 0 }); // neu
  v.knoten[0].typ = v.knoten[0].typ === 'raum' ? 'kreuzung' : 'raum'; // anders
  const u = unterschied(g, v);
  assert.equal(u.gleich, false);
  assert.deepEqual(u.arten.objekte.neu, ['oNeu']);
  assert.equal(u.arten.gaenge.weg.length, 1);
  assert.equal(u.arten.knoten.anders.length, 1);
  const t = unterschiedText(u);
  assert.match(t, /\+1 Objekte/);
  assert.match(t, /−1 Gänge/);
  assert.match(t, /1 geändert/);
});

test('Varianten: Übernehmen gibt dem aktuellen Gebiet den Inhalt, ID und Name bleiben, ungültig ändert nichts', () => {
  const g = basis();
  const andere = mitTeil(kopie(GEBIETE.beispiel));
  uebernehmeVariante(g, andere);
  assert.equal(g.id, 'proto-netz');
  assert.equal(g.name, GEBIETE['proto-netz'].name);
  assert.deepEqual(g.knoten, andere.knoten);
  assert.deepEqual(g.objekte, andere.objekte);
  assert.deepEqual(pruefeFormat(g), []);
  // kaputte Variante (Gang zeigt auf fehlenden Knoten): Fehler, g bleibt wie es war
  const vorher = JSON.stringify(g);
  const kaputt = kopie(andere);
  kaputt.gaenge[0].nach = 'K999';
  assert.throws(() => uebernehmeVariante(g, kaputt), /gültiges Gebiet/);
  assert.equal(JSON.stringify(g), vorher);
});

test('Varianten: Übernehmen ist mit dem Verlauf rückgängig zu machen (Zustand wie vorher)', () => {
  const g = basis();
  const vorher = JSON.stringify(g);
  const verlauf = new Verlauf();
  verlauf.merke(vorher, 'Variante übernehmen');
  uebernehmeVariante(g, mitTeil(kopie(g)));
  assert.notEqual(JSON.stringify(g), vorher);
  assert.equal(verlauf.rueckgaengig(JSON.stringify(g)), vorher);
});

test('Varianten: ungültige Datei wirft verständlich und nimmt nichts auf; Obergrenze', () => {
  assert.throws(() => nimmAuf([], '{ kaputt', 'k.json', 1), /JSON/);
  assert.throws(() => nimmAuf([], JSON.stringify({ ...basis(), format: 2 }), 'f.json', 1), /Format 2/);
  let liste = [];
  const text = formatiere(basis());
  for (let i = 1; i <= MAX_VARIANTEN; i++) liste = nimmAuf(liste, text, `v${i}.json`, i);
  assert.equal(liste.length, MAX_VARIANTEN);
  assert.throws(() => nimmAuf(liste, text, 'zuviel.json', 99), /Höchstens/);
  assert.equal(liste.length, MAX_VARIANTEN);
});

test('Varianten: Kennzahlen zählen Prüfer-Meldungen der Variante', () => {
  const g = basis();
  const schlecht = kopie(g);
  schlecht.gaenge = []; // Knoten ohne Gang → MUSS M5
  assert.ok(kennzahlen(schlecht).muss > kennzahlen(g).muss);
});

test('Varianten: andere Reihenfolge, unbekannte Felder und Schlüsselreihenfolge', () => {
  const g = basis();
  const umgekehrt = kopie(g);
  umgekehrt.gaenge.reverse();
  const u = unterschied(g, umgekehrt);
  assert.equal(u.gleich, false, 'andere Gangreihenfolge ist ein Unterschied (Levelreihenfolge)');
  assert.match(unterschiedText(u), /andere Reihenfolge der Gänge/);
  const fremd = { ...kopie(g), foo: 1 };
  assert.equal(unterschied(g, fremd).gleich, false, 'unbekanntes Feld wird beim Übernehmen mitkommen, also zählt es');
  // Schlüssel in anderer Reihenfolge: kein Unterschied
  const umsortiert = kopie(g);
  umsortiert.knoten = umsortiert.knoten.map((k) => Object.fromEntries(Object.entries(k).reverse()));
  const u2 = unterschied(g, umsortiert);
  assert.equal(u2.gleich, true);
  assert.equal(unterschiedText(u2), 'identisch');
});
