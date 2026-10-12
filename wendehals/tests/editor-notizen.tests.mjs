// Tests Stufe 8 „Notizen und Stempel“ (Paket 13): Notizen setzen/ändern/wählen/kopieren/löschen, Ebene „Notizen“, Stempel anlegen,
// speichern (Format, verlustfrei), laden (ungültig → Meldung), einsetzen (neue IDs, Gänge folgen den neuen Knoten, Vorlage bleibt unverändert).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kopie, pruefeFormat, ladeGebiet, formatiere } from '../src/editor/daten.js';
import { notizSetzen, teilBei, setzeTeil, teilFinden, loescheTeil } from '../src/editor/teile.js';
import { alleDinge, inRahmen, merkeDinge, fuegeDingeAn, verschiebeDinge, loescheDinge, dingFinden } from '../src/editor/mehrfach.js';
import { ebeneVon, EBENEN, WERKZEUG_EBENEN } from '../src/editor/ebenen.js';
import { levelInhalt } from '../src/editor/level.js';
import { GEBIETE, STEMPEL } from '../src/editor/startdaten.js';
import { NOTIZ_STANDARD, NOTIZ_MAX, RASTER } from '../src/editor/konstanten.js';
import { WERKZEUGE } from '../src/editor/werkzeuge/index.js';
import { KUERZEL } from '../src/editor/konstanten.js';
import { leereStempel, pruefeStempel, ladeStempel, formatiereStempel, stempelAnlegen, stempelLoeschen, stempelUmbenennen, stempelClip, stempelInhalt, neueStempelId } from '../src/editor/stempel.js';

const beispiel = () => kopie(GEBIETE.beispiel);
const gueltig = (g) => assert.deepEqual(pruefeFormat(g), [], 'Format gültig');

test('Notiz setzen: Lage rastet auf 20 E, Standardtext, neue ID, Datei bleibt gültig', () => {
  const g = beispiel();
  const n = notizSetzen(g, 413, -207);
  assert.equal(n.art, 'notiz');
  const o = teilFinden(g, 'notiz', n.id);
  assert.deepEqual([o.x, o.y, o.text], [420, -200, NOTIZ_STANDARD]);
  assert.ok(!['n1'].includes(n.id), 'n1 ist schon vergeben');
  gueltig(g);
});

test('Notiztext ändern: gekürzt auf eine Zeile, leer und zu lang werden abgelehnt (nichts geändert), Zahlenfelder gehen auch', () => {
  const g = beispiel();
  assert.equal(setzeTeil(g, 'notiz', 'n1', 'text', '  hier\n  wird   es  eng '), null);
  assert.equal(teilFinden(g, 'notiz', 'n1').text, 'hier wird es eng');
  const vor = JSON.stringify(g);
  assert.match(setzeTeil(g, 'notiz', 'n1', 'text', '   '), /braucht einen Text/);
  assert.match(setzeTeil(g, 'notiz', 'n1', 'text', 'x'.repeat(NOTIZ_MAX + 1)), /höchstens/);
  assert.match(setzeTeil(g, 'objekt', 'o1', 'text', 'x'), /keinen Text/);
  assert.equal(JSON.stringify(g), vor, 'Fehler ändern nichts');
  assert.equal(setzeTeil(g, 'notiz', 'n1', 'x', 1000), null);
  assert.equal(teilFinden(g, 'notiz', 'n1').x, 1000);
  assert.match(setzeTeil(g, 'notiz', 'n1', 'laenge', 100), /keine Länge/);
  gueltig(g);
});

test('Notiz wählen: liegt über allen anderen Teilen, gesperrte Ebene „Notizen“ ist nicht wählbar', () => {
  const g = beispiel();
  const n = g.notizen[0];
  assert.deepEqual(teilBei(g, n.x, n.y, 0), { art: 'notiz', id: n.id });
  g.objekte.push({ id: 'o9', typ: 'wand', x: n.x, y: n.y, laenge: 200, breite: 200, winkel: 0 });
  assert.deepEqual(teilBei(g, n.x, n.y, 0), { art: 'notiz', id: n.id }, 'Notiz obenauf');
  assert.equal(teilBei(g, n.x, n.y, 0, (art) => art !== 'notiz').art, 'objekt', 'gesperrt: Wand darunter');
  assert.equal(ebeneVon('notiz'), 'notizen');
  assert.ok(EBENEN.some((e) => e.id === 'notizen'));
  assert.deepEqual(WERKZEUG_EBENEN.notiz, ['notizen']);
  assert.ok(!alleDinge(g, new Set(['notizen'])).some((d) => d.art === 'notiz'));
  assert.ok(alleDinge(g).some((d) => d.art === 'notiz' && d.id === n.id));
});

test('Notiz im Auswahlrahmen, verschieben (20 E), kopieren/einfügen (neue ID n…), löschen', () => {
  const g = beispiel();
  const n = g.notizen[0];
  const drin = inRahmen(g, { x0: n.x - 50, y0: n.y - 50, x1: n.x + 50, y1: n.y + 50 });
  assert.deepEqual(drin.filter((d) => d.art === 'notiz'), [{ art: 'notiz', id: n.id }]);
  assert.equal(verschiebeDinge(g, [{ art: 'notiz', id: n.id }], 40, -20), null);
  assert.deepEqual([n.x, n.y], [1940, -20]);
  const clip = merkeDinge(g, [{ art: 'notiz', id: n.id }]);
  const r = fuegeDingeAn(g, clip, 600, 300);
  assert.deepEqual(r.dinge.map((d) => d.art), ['notiz']);
  assert.match(r.dinge[0].id, /^n\d+$/);
  const kopieN = dingFinden(g, r.dinge[0]);
  assert.deepEqual([kopieN.x, kopieN.y, kopieN.text], [600, 300, n.text]);
  gueltig(g);
  assert.equal(loescheDinge(g, [{ art: 'notiz', id: n.id }, r.dinge[0]]), 2);
  assert.equal(g.notizen.length, 0);
  assert.deepEqual(loescheTeil(g, 'notiz', 'gibt-es-nicht'), []);
});

test('Level-Ansicht zeigt die Notizen auf dem Level, nicht die anderswo', () => {
  const g = beispiel();
  g.notizen.push({ id: 'n7', x: 600, y: 0, text: 'im Gang' }, { id: 'n8', x: 9000, y: 9000, text: 'weit weg' });
  const sicht = levelInhalt(g, 'schleuse');
  assert.ok(sicht.notizen.some((n) => n.id === 'n7'));
  assert.ok(!sicht.notizen.some((n) => n.id === 'n8'));
});

test('Werkzeuge Notiz (M) und Stempel (U) sind in der Liste und haben Kürzel', () => {
  for (const id of ['notiz', 'stempel']) {
    assert.ok(WERKZEUGE.some((w) => w.id === id), id);
    assert.ok(KUERZEL.werkzeug[id], 'Kürzel für ' + id);
  }
  const kuerzel = Object.values(KUERZEL.werkzeug);
  assert.equal(new Set(kuerzel).size, kuerzel.length, 'kein Kürzel doppelt');
});

// ------------------------------------------------------------------ Stempel
const auswahlStueck = (g) => merkeDinge(g, [{ art: 'gang', id: 'schleuse' }, { art: 'formteil', id: 'f1' }, { art: 'objekt', id: 'o1' }, { art: 'notiz', id: 'n1' }]);

test('Stempel anlegen: Name, Inhalt, Bezug; leere Auswahl und zu viele werden abgelehnt', () => {
  const g = beispiel();
  const d = leereStempel();
  assert.match(stempelAnlegen(d, null, 'x').fehler, /leer/);
  const r = stempelAnlegen(d, auswahlStueck(g), '  Enge Schleuse ');
  assert.equal(r.stempel.name, 'Enge Schleuse');
  assert.equal(r.stempel.id, 's1');
  assert.equal(r.stempel.knoten.length, 2);
  assert.equal(r.stempel.gaenge.length, 1);
  assert.equal(r.stempel.teile.length, 3);
  assert.match(stempelInhalt(r.stempel), /2 Knoten, 1 Gang, 2 Teile, 1 Notiz/);
  assert.equal(stempelAnlegen(d, auswahlStueck(g), '').stempel.name, 'Stempel 2', 'ohne Namen: „Stempel <Nr>“');
  assert.equal(neueStempelId(d), 's3');
  assert.deepEqual(pruefeStempel(d), []);
});

test('Stempel speichern ist verlustfrei: formatieren → laden → formatieren gibt denselben Text', () => {
  const g = beispiel();
  const d = leereStempel();
  stempelAnlegen(d, auswahlStueck(g), 'A');
  stempelAnlegen(d, merkeDinge(g, [{ art: 'objekt', id: 'o2' }]), 'Gegner');
  const text = formatiereStempel(d);
  assert.ok(text.endsWith('\n') && text.includes('\n  '), 'eingerückt, Zeilenende');
  assert.equal(formatiereStempel(ladeStempel(text)), text);
  assert.equal(formatiereStempel(STEMPEL), formatiereStempel(ladeStempel(JSON.stringify(STEMPEL))), 'mitgelieferte Datei ist gültig');
});

test('Stempel laden: ungültige Dateien geben eine verständliche Meldung, nichts wird übernommen', () => {
  assert.throws(() => ladeStempel('{kaputt'), /kein gültiges JSON/);
  assert.throws(() => ladeStempel('[]'), /muss ein Objekt sein/);
  assert.throws(() => ladeStempel(JSON.stringify({ format: 9, stempel: [] })), /„format“ muss 1 sein/);
  const d = leereStempel();
  stempelAnlegen(d, auswahlStueck(beispiel()), 'A');
  const kaputt = kopie(d);
  kaputt.stempel[0].gaenge[0].nach = 'K99';
  assert.match(pruefeStempel(kaputt).join('\n'), /Gang verweist auf einen Knoten/);
  const doppelt = kopie(d);
  doppelt.stempel.push(kopie(doppelt.stempel[0]));
  assert.match(pruefeStempel(doppelt).join('\n'), /ID doppelt/);
  const leer = kopie(d);
  leer.stempel[0].knoten = [];
  leer.stempel[0].gaenge = [];
  leer.stempel[0].teile = [];
  assert.match(pruefeStempel(leer).join('\n'), /enthält nichts/);
  const art = kopie(d);
  art.stempel[0].teile[0].art = 'tuer';
  assert.match(pruefeStempel(art).join('\n'), /unbekannte Art/);
  const ohneText = kopie(d);
  ohneText.stempel[0].teile.find((t) => t.art === 'notiz').teil.text = 5;
  assert.match(pruefeStempel(ohneText).join('\n'), /Notiz hat keinen Text/);
});

test('Stempel einsetzen: neue IDs, Gang folgt den neuen Knoten, Notiz kommt mit, Vorlage bleibt unverändert, Format gültig', () => {
  const quelle = beispiel();
  const d = leereStempel();
  const s = stempelAnlegen(d, auswahlStueck(quelle), 'Enge Schleuse').stempel;
  const vorlage = JSON.stringify(d);
  const ziel = beispiel();
  const knotenVor = ziel.knoten.length;
  const r = fuegeDingeAn(ziel, stempelClip(s), 400, 1000);
  assert.ok(!r.fehler, r.fehler);
  assert.equal(ziel.knoten.length, knotenVor + 2);
  const neuerGang = ziel.gaenge.find((x) => x.id === r.dinge.find((y) => y.art === 'gang').id);
  const knotenNeu = new Set(r.dinge.filter((x) => x.art === 'knoten').map((x) => x.id));
  assert.ok(knotenNeu.has(neuerGang.von) && knotenNeu.has(neuerGang.nach), 'der neue Gang hängt an den neuen Knoten');
  assert.ok(ziel.notizen.some((n) => n.text === quelle.notizen[0].text && n.id !== 'n1'), 'Notiz mitgekommen');
  assert.equal(JSON.stringify(d), vorlage, 'Vorlage unverändert');
  gueltig(ziel);
  // zweimal an dieselbe Stelle: dort stehen schon Knoten → abgelehnt, Gebiet unverändert
  const vor = JSON.stringify(ziel);
  assert.ok(fuegeDingeAn(ziel, stempelClip(s), 400, 1000).fehler);
  assert.equal(JSON.stringify(ziel), vor);
});

test('Stempel einzeln: eine Notiz als Stempel setzt sich mit der Mitte auf die Mausstelle (20 E)', () => {
  const g = beispiel();
  const d = leereStempel();
  const s = stempelAnlegen(d, merkeDinge(g, [{ art: 'notiz', id: 'n1' }]), 'Hinweis').stempel;
  const r = fuegeDingeAn(g, stempelClip(s), 413, 207);
  const n = dingFinden(g, r.dinge[0]);
  assert.deepEqual([n.x, n.y], [420, 200]);
  assert.equal(n.x % RASTER, 0);
});

test('Stempel löschen und umbenennen', () => {
  const d = leereStempel();
  const s = stempelAnlegen(d, auswahlStueck(beispiel()), 'A').stempel;
  assert.equal(stempelUmbenennen(d, s.id, ' B '), null);
  assert.equal(d.stempel[0].name, 'B');
  assert.match(stempelUmbenennen(d, s.id, '  '), /nicht leer/);
  assert.match(stempelUmbenennen(d, 'zz', 'x'), /gibt es nicht/);
  assert.equal(stempelLoeschen(d, s.id), true);
  assert.equal(stempelLoeschen(d, s.id), false);
  assert.equal(d.stempel.length, 0);
});

test('Gebiet mit Notizen wird verlustfrei gespeichert und geladen', () => {
  const g = beispiel();
  notizSetzen(g, 100, 100, 'Zwei Zeilen? Nein – eine.');
  const text = formatiere(g);
  assert.equal(formatiere(ladeGebiet(text)), text);
});
