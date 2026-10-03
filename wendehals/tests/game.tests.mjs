import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { MemoryStorage, SAVE_KEY, loadProgress, sanitizeProgress } from '../src/game/save.js';
import { NODES } from '../src/data/world.js';
import { ITEMS } from '../src/data/items.js';
import { E, N, S, W } from '../src/core/math.js';
import { successors, maskOf } from '../src/game/solver.js';
import { press, closeDialogs, chooseMenu, planToGoal, flyLevel, turnAndLaunch } from './helpers/driver.mjs';

function newGame(opts = {}) {
  const storage = opts.storage || new MemoryStorage();
  const game = new Game({ storage, invincible: opts.invincible ?? true, platform: opts.platform });
  chooseMenu(game, 'Neues Spiel');
  closeDialogs(game);
  return { game, storage };
}

test('Titelmenü: ohne Spielstand kein "Weiterspielen"', () => {
  const g = new Game({ storage: new MemoryStorage() });
  assert.equal(g.screen, 'title');
  assert.ok(!g.overlay.items.some((i) => i.label === 'Weiterspielen'));
});

test('Neues Spiel startet am Toastständer mit Blick nach Osten und speichert', () => {
  const { game, storage } = newGame();
  assert.equal(game.screen, 'map');
  assert.equal(game.node, 'toast');
  assert.equal(game.heading, E);
  assert.ok(storage.getItem(SAVE_KEY));
});

test('Neues Spiel bei vorhandenem Spielstand fragt nach', () => {
  const { storage } = newGame();
  const g = new Game({ storage });
  assert.equal(g.overlay.items[0].label, 'Weiterspielen');
  chooseMenu(g, 'Neues Spiel');
  assert.match(g.overlay.title, /überschrieben/);
  chooseMenu(g, 'Nein');
  assert.equal(g.screen, 'title');
});

test('Drehen auf der Karte nur an Drehscheiben oder mit Drehwurm', () => {
  const { game } = newGame();
  press(game, { up: true });
  assert.equal(game.heading, N, 'Toastständer hat eine Drehscheibe');
  game.node = 'tasse';
  game.heading = E;
  press(game, { down: true });
  assert.equal(game.heading, E, 'Untertasse hat keine Drehscheibe');
  assert.ok(game.nudgeT > 0, 'Ablehnung wird gezeigt (ohne Text)');
  assert.ok(game.sfxQueue.includes('nope'));
  game.items.add('DREHWURM');
  press(game, { down: true });
  assert.equal(game.heading, S);
});

test('Wendehals erlaubt an jedem Knoten nur die 180°-Wende', () => {
  const { game } = newGame();
  game.node = 'tasse';
  game.heading = E;
  game.items.add('WENDEHALS');
  press(game, { up: true });
  assert.equal(game.heading, E);
  press(game, { left: true });
  assert.equal(game.heading, W);
});

test('Abflug ins Leere oder gegen die Einbahnstraße wird abgelehnt', () => {
  const { game } = newGame();
  press(game, { up: true }); // Toastständer: nach Norden gibt es nichts
  press(game, { confirm: true });
  assert.equal(game.screen, 'map');
  game.node = 'eier';
  game.heading = S;
  press(game, { confirm: true });
  assert.equal(game.screen, 'map');
  assert.ok(game.nudgeT > 0);
});

test('Erstes Level fliegen: Ankunft am Eierbecher', () => {
  const { game } = newGame();
  press(game, { confirm: true });
  assert.equal(game.screen, 'level');
  flyLevel(game);
  closeDialogs(game);
  assert.equal(game.screen, 'map');
  assert.equal(game.node, 'eier');
  assert.ok(game.progress.visited.includes('eier'));
  assert.ok(game.progress.knownEdges.includes('kruemelstrasse'));
});

test('Etappe abbrechen stellt den Zustand vor dem Abflug wieder her', () => {
  const { game } = newGame();
  press(game, { confirm: true });
  for (let i = 0; i < 300; i++) press(game, { fire: true });
  press(game, { pause: true });
  chooseMenu(game, 'Etappe abbrechen');
  assert.equal(game.screen, 'map');
  assert.equal(game.node, 'toast');
  assert.equal(game.heading, E);
});

test('Tod: zurück zur letzten Station, Items bleiben, Power-Ups weg', () => {
  const { game } = newGame({ invincible: false });
  game.items.add('WURST1');
  game.powers.speed = 2;
  press(game, { confirm: true });
  game.level.player.hp = 1;
  game.level.player.inv = 0;
  game.level.damage();
  for (let i = 0; i < 400 && game.screen === 'level'; i++) press(game, {});
  assert.equal(game.screen, 'map');
  assert.equal(game.node, 'toast');
  assert.ok(game.items.has('WURST1'));
  assert.equal(game.powers.speed, 0);
  assert.equal(game.progress.deaths, 1);
  assert.equal(game.overlay?.title, 'Autsch!');
});

test('Pause → Zur letzten Station funktioniert auch im Level', () => {
  const { game } = newGame();
  game.progress.saveNode = 'marmelade';
  game.progress.saveHeading = N;
  press(game, { confirm: true });
  press(game, { pause: true });
  chooseMenu(game, 'Zur letzten Station');
  assert.equal(game.node, 'marmelade');
  assert.equal(game.screen, 'map');
});

test('Stationsmenü: Rohrpost und Pilotenwechsel', () => {
  const { game } = newGame();
  game.progress.visited.push('marmelade', 'stoepsel');
  game.items.add('OMA');
  press(game, { station: true });
  assert.equal(game.overlay.type, 'menu');
  chooseMenu(game, 'Pilot wechseln');
  chooseMenu(game, 'Oma Turbo');
  assert.equal(game.progress.character, 'oma');
  chooseMenu(game, 'Rohrpost');
  chooseMenu(game, 'Stöpsel');
  assert.equal(game.node, 'stoepsel');
  assert.equal(game.progress.saveNode, 'stoepsel');
});

test('Stationsmenü gibt es nicht an normalen Knoten', () => {
  const { game } = newGame();
  game.node = 'eier';
  press(game, { station: true });
  assert.equal(game.overlay, null);
});

test('Spielstand: Speichern und Laden ergibt denselben Zustand', () => {
  const { game, storage } = newGame();
  game.items.add('DREHWURM');
  game.progress.visited.push('marmelade');
  game.progress.saveNode = 'marmelade';
  game.progress.saveHeading = W;
  game.save();
  const g2 = new Game({ storage });
  chooseMenu(g2, 'Weiterspielen');
  assert.equal(g2.node, 'marmelade');
  assert.equal(g2.heading, W);
  assert.ok(g2.items.has('DREHWURM'));
});

test('kaputte Spielstände stürzen nicht ab', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, '{kaputt');
  assert.equal(loadProgress(storage), null);
  const g = new Game({ storage });
  assert.ok(!g.overlay.items.some((i) => i.label === 'Weiterspielen'));
  const p = sanitizeProgress({ saveNode: 'gibtsnicht', saveHeading: 9, items: ['DREHWURM', 'QUATSCH', 5], visited: 'x', character: 'oma', score: -5 });
  assert.equal(p.saveNode, 'toast');
  assert.equal(p.saveHeading, E);
  assert.deepEqual(p.items, ['DREHWURM']);
  assert.equal(p.character, 'dackel', 'Oma ist nicht freigeschaltet');
  assert.equal(p.score, 0);
  // Station nur, wenn es eine Speicherstation ist
  assert.equal(sanitizeProgress({ saveNode: 'tasse' }).saveNode, 'toast');
});

test('Speicher voll / gesperrt: Spiel läuft trotzdem weiter', () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error('voll'); }, removeItem: () => { throw new Error('nein'); } };
  const game = new Game({ storage: broken, invincible: true });
  chooseMenu(game, 'Neues Spiel');
  closeDialogs(game);
  assert.equal(game.screen, 'map');
});

test('Optionen: Regler und Schalter werden gespeichert', () => {
  const storage = new MemoryStorage();
  let fs = null;
  const g = new Game({ storage, platform: { setFullscreen: (v) => (fs = v) } });
  chooseMenu(g, 'Optionen');
  press(g, { left: true }); // Musik -0.1
  press(g, { down: true });
  press(g, { down: true });
  press(g, { confirm: true }); // Wackeln aus
  press(g, { down: true });
  press(g, { confirm: true }); // Reduzierte Effekte an
  press(g, { down: true });
  press(g, { confirm: true }); // Vollbild an
  assert.equal(fs, true);
  press(g, { back: true });
  const s = JSON.parse(storage.getItem('wendehals.settings.v1'));
  assert.equal(s.music, 0.5);
  assert.equal(s.shake, false);
  assert.equal(s.reducedEffects, true);
  assert.equal(g.screen, 'title');
});

test('Item-Dialoge erscheinen nach dem Bossieg', () => {
  const { game } = newGame();
  game.node = 'marmelade';
  game.heading = E;
  press(game, { confirm: true });
  flyLevel(game);
  assert.equal(game.node, 'tasse');
  assert.ok(game.items.has('DREHWURM'));
  assert.equal(game.overlay?.title, 'Drehwurm');
});

for (const skill of [false, true]) {
  test(`Komplettes Spiel durchspielen bis zum Abspann (${skill ? 'mit Abkürzungen' : 'normaler Weg'})`, () => {
    const { game, storage } = newGame();
    let launches = 0;
    while (game.screen !== 'ending') {
      closeDialogs(game);
      const plan = planToGoal(game, skill);
      assert.ok(plan, `kein Plan von ${game.node}`);
      // Abflugrichtung = letzter Planzustand am aktuellen Knoten
      let i = 0;
      while (i + 1 < plan.length && plan[i + 1].node === game.node && !plan[i].launch) i++;
      turnAndLaunch(game, plan[i].heading);
      assert.equal(game.screen, 'level', `Abflug fehlgeschlagen an ${game.node}`);
      flyLevel(game);
      launches++;
      assert.ok(launches < 60, 'zu viele Flüge');
    }
    assert.ok(game.progress.finished);
    // Abspann durchklicken
    for (let k = 0; k < 2000 && game.screen === 'ending'; k++) press(game, { confirm: k % 30 === 0 });
    assert.equal(game.screen, 'title');
    const saved = loadProgress(storage);
    assert.equal(saved.finished, true);
    if (!skill) assert.ok(launches >= 10);
  });
}

test('100 % sammeln ist im echten Spiel möglich', () => {
  const { game } = newGame();
  // Immer zum nächsten neuen Item oder unbesuchten Knoten fliegen (Plan per Löser).
  let guard = 0;
  while (game.items.size < Object.keys(ITEMS).length && guard++ < 80) {
    closeDialogs(game);
    const plan = planToItem(game);
    assert.ok(plan, 'kein Weg zum nächsten Item von ' + game.node);
    let i = 0;
    while (i + 1 < plan.length && plan[i + 1].node === game.node) i++;
    turnAndLaunch(game, plan[i].heading);
    flyLevel(game);
  }
  closeDialogs(game);
  assert.equal(game.completion(), 100);
  for (const n of Object.keys(NODES)) if (!NODES[n].goal) assert.ok(game.progress.visited.includes(n), n + ' nicht besucht');
});

function planToItem(game) {
  const start = { node: game.node, heading: game.heading, mask: maskOf(game.items) };
  const key = (s) => `${s.node}|${s.heading}|${s.mask}`;
  const prev = new Map([[key(start), null]]);
  const queue = [start];
  const startMask = start.mask;
  const unvisited = (n) => !game.progress.visited.includes(n);
  while (queue.length) {
    const s = queue.shift();
    for (const n of successors(s, false)) {
      if (n.goal || n.via === 'wendehals') continue;
      const k = key(n);
      if (prev.has(k)) continue;
      prev.set(k, s);
      if (n.mask !== startMask || (n.via.startsWith('flug') && unvisited(n.node))) {
        const path = [n];
        let p = s;
        while (p) {
          path.unshift(p);
          p = prev.get(key(p));
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

test('Prototyp-Schlüssel im Spielstand werden verworfen (Befund Software-Tester)', () => {
  const p = sanitizeProgress({
    saveNode: 'constructor',
    items: ['toString', 'constructor', '__proto__', 'DREHWURM'],
    visited: ['constructor', 'hasOwnProperty'],
    knownEdges: ['constructor'],
    character: 'constructor',
  });
  assert.deepEqual(p.items, ['DREHWURM']);
  assert.deepEqual(p.visited, ['toast']);
  assert.deepEqual(p.knownEdges, []);
  assert.equal(p.character, 'dackel');
  assert.equal(p.saveNode, 'toast');
});

test('Pause im Todes-Timer hebelt die Todesstrafe nicht aus (Befund Software-Tester)', () => {
  for (const choice of ['Etappe abbrechen', 'Zur letzten Station']) {
    const { game } = newGame({ invincible: false });
    game.powers.speed = 2;
    press(game, { confirm: true });
    const lv = game.level;
    lv.player.hp = 1;
    lv.player.inv = 0;
    lv.damage();
    press(game, { pause: true });
    if (game.overlay && game.overlay.type === 'menu') chooseMenu(game, choice);
    for (let i = 0; i < 400 && game.screen === 'level'; i++) press(game, {});
    assert.equal(game.progress.deaths, 1, choice);
    assert.equal(game.powers.speed, 0, choice);
    assert.equal(game.node, game.progress.saveNode, choice);
  }
});

test('Power-Ups bleiben über mehrere Etappen erhalten', () => {
  const { game } = newGame();
  game.powers.speed = 2;
  game.powers.laser = true;
  press(game, { confirm: true });
  flyLevel(game);
  closeDialogs(game);
  assert.equal(game.node, 'eier');
  press(game, { up: true });
  press(game, { confirm: true });
  // Der Autopilot kauft unterwegs weitere Upgrades – erhalten bleibt mindestens der Startstand.
  assert.equal(game.level.powers, game.powers, 'gleiches Power-Up-Objekt im nächsten Level');
  assert.ok(game.level.powers.speed >= 2);
  assert.ok(game.level.powers.laser || game.level.powers.double);
});

test('Tod: ohne Sparstrumpf ist alles weg, mit Sparstrumpf bleibt die erste Hälfte', async () => {
  const { freshPowers, activate, powerupsAfterDeath } = await import('../src/game/powerups.js');
  const buy = (p, i) => {
    p.cursor = i;
    activate(p);
  };
  const p = freshPowers();
  buy(p, 0); // Tempo
  buy(p, 3); // Laser
  buy(p, 4); // Begleiter
  buy(p, 0); // Tempo 2
  buy(p, 5); // Schild
  assert.deepEqual(powerupsAfterDeath(p, false), freshPowers());
  const kept = powerupsAfterDeath(p, true);
  assert.equal(kept.speed, 1, 'erstes Tempo bleibt');
  assert.equal(kept.laser, true, 'Laser bleibt');
  assert.equal(kept.options, 0, 'Begleiter (dritter Kauf) ist weg');
  assert.equal(kept.shield, 0, 'Schild zählt nie');
  assert.deepEqual(kept.order, [0, 3]);
});

test('Sparstrumpf wirkt im echten Spiel beim Tod', () => {
  const { game } = newGame({ invincible: false });
  game.items.add('SPARSTRUMPF');
  game.powers.order = [1, 2];
  game.powers.missile = true;
  game.powers.double = true;
  press(game, { confirm: true });
  game.level.player.hp = 1;
  game.level.player.inv = 0;
  game.level.damage();
  for (let i = 0; i < 400 && game.screen === 'level'; i++) press(game, {});
  assert.equal(game.powers.missile, true);
  assert.equal(game.powers.double, false);
});
