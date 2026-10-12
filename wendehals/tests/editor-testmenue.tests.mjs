// Tests des Testmenüs (Paket 13, Stufe 7): jeder Gang und jeder Knoten der Leveldateien ist ein Eintrag; spielbare starten eine Szene
// des Fenster-Prototyps, nicht spielbare melden „noch nicht spielbar“ statt still falsch zu laufen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eintraege, szeneFuer } from '../src/editor/testmenue.js';
import { GEBIETE, WELT } from '../src/editor/startdaten.js';
import { spielbarkeit } from '../src/editor/spielen.js';

test('Testmenü: jeder Gang jedes Gebiets ist ein Eintrag mit Bezeichnung', () => {
  const liste = eintraege();
  for (const wg of WELT.gebiete) {
    const g = GEBIETE[wg.id];
    for (const gang of g.gaenge) {
      const e = liste.find((x) => x.gebiet === g.id && x.art === 'gang' && x.id === gang.id);
      assert.ok(e, `Gang ${g.id}/${gang.id} fehlt im Testmenü`);
      assert.match(e.bezeichnung, new RegExp(`^Wendehals-Level ${g.id}/${gang.id}@`));
    }
    for (const k of g.knoten.filter((k) => g.gaenge.some((x) => x.von === k.id || x.nach === k.id))) {
      assert.ok(liste.find((x) => x.gebiet === g.id && x.art === 'knoten' && x.id === k.id), `Knoten ${g.id}/${k.id} fehlt`);
    }
  }
});

test('Testmenü: spielbare Einträge starten eine Szene, nicht spielbare melden den Grund', () => {
  let spielbar = 0;
  let gesperrt = 0;
  for (const e of eintraege()) {
    const geht = spielbarkeit(GEBIETE[e.gebiet]).probleme.length === 0;
    if (geht) {
      assert.equal(e.grund, null);
      const sc = szeneFuer(e);
      for (let i = 0; i < 30; i++) sc.update(1 / 60, { mx: 0, my: 0 });
      assert.ok(Number.isFinite(sc.x ?? sc.dog?.x ?? 0), `${e.titel}: Szene läuft`);
      spielbar++;
    } else {
      assert.match(e.grund, /^noch nicht spielbar: /);
      assert.throws(() => szeneFuer(e), /noch nicht spielbar/);
      gesperrt++;
    }
  }
  assert.ok(spielbar > 0, 'mindestens ein Gebiet ist spielbar');
  assert.ok(spielbar + gesperrt === eintraege().length);
});
