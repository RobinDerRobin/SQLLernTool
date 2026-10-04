import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { MemoryStorage, SAVE_KEY, loadProgress, sanitizeProgress } from '../src/game/save.js';
import { NODES } from '../src/data/world.js';
import { ITEMS } from '../src/data/items.js';
import { E, N, S, W } from '../src/core/math.js';
import { successors, maskOf } from '../src/game/solver.js';
import { press, closeDialogs, chooseMenu, planToGoal, plan, doStep, flyLevel, turnAndLaunch, turnTo, flyOut, useReturn } from './helpers/driver.mjs';
import { SPOTS } from '../src/game/arena.js';

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
  assert.equal(game.screen, 'arena');
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

test('Drehen in der Arena: Drehscheibe durchfliegen dreht 90° rechts', () => {
  const { game } = newGame();
  assert.equal(game.heading, E);
  turnTo(game, S);
  assert.equal(game.heading, S, 'Toastständer hat eine Drehscheibe');
  assert.ok(game.sfxQueue.includes('turn'));
});

test('Drehen in der Arena: ohne Drehscheibe nur mit Drehwurm (POWER-Taste)', () => {
  const { game } = newGame();
  game.placeAt('tasse', E);
  press(game, { power: true });
  assert.equal(game.heading, E, 'Untertasse hat keine Drehscheibe');
  assert.ok(game.arena.nudgeT > 0, 'Ablehnung wird gezeigt (ohne Text)');
  assert.ok(game.sfxQueue.includes('nope'));
  press(game, {});
  game.items.add('DREHWURM');
  press(game, { power: true });
  assert.equal(game.heading, S);
});

test('Wendehals erlaubt in jeder Arena die 180°-Wende', () => {
  const { game } = newGame();
  game.placeAt('tasse', E);
  game.items.add('WENDEHALS');
  press(game, { wende: true });
  assert.equal(game.heading, W);
});

test('Arena: Ausgänge sind nur in Blickrichtung offen, Wände halten fest', () => {
  const { game } = newGame();
  // Toastständer, Blick nach Norden: dort gibt es keinen Ausgang
  game.heading = N;
  for (let i = 0; i < 120; i++) press(game, { mx: 0, my: -1 });
  assert.equal(game.screen, 'arena');
  assert.ok(game.arena.y > 0);
  // Blick nach Osten, aber nach Süden fliegen: Süd-Ausgang (Kellertreppe? nein, keiner) bleibt zu
  game.placeAt('eier', E);
  game.arena.x = 240;
  for (let i = 0; i < 200; i++) press(game, { mx: 0, my: 1 });
  assert.equal(game.screen, 'arena', 'Klappe nach Süden ist zu');
  assert.ok(game.arena.nudgeT > 0 || game.arena.bumpExit, 'Klappe wackelt');
  // Einbahnstraße gegen die Richtung: auch mit Blick dorthin zu
  game.heading = S;
  for (let i = 0; i < 200; i++) press(game, { mx: 0, my: 1 });
  assert.equal(game.screen, 'arena', 'Kartoffelschacht ist Einbahn');
  // Blick nach Osten und hinaus: Etappe startet
  game.heading = E;
  game.arena.y = 135;
  for (let i = 0; i < 300 && game.screen === 'arena'; i++) press(game, { mx: 1, my: 0 });
  assert.equal(game.screen, 'level');
  assert.equal(game.level.edge.id, 'kruemelmauer');
});

test('Arena: bei mehreren Ausgängen an einer Seite entscheidet die Position', () => {
  const { game } = newGame();
  game.items.add('GUMMIHAUT');
  game.placeAt('sockenschublade', W);
  flyOut(game, 'ueberlauf');
  assert.equal(game.level.edge.id, 'ueberlauf');
  game.placeAt('sockenschublade', W);
  flyOut(game, 'flusensieb');
  assert.equal(game.level.edge.id, 'flusensieb');
  assert.equal(game.level.forward, false);
});

test('Rückholstation bringt aus der Sackgasse zurück', () => {
  const { game } = newGame();
  game.placeAt('butter', S);
  useReturn(game);
  assert.equal(game.node, 'marmelade');
  assert.equal(game.screen, 'arena');
  assert.equal(game.heading, S);
});

test('Speicherstation: Berühren speichert, X öffnet das Menü', () => {
  const { game } = newGame();
  game.placeAt('marmelade', W);
  assert.equal(game.progress.saveNode, 'toast');
  game.arena.x = SPOTS.save.x - 30;
  game.arena.y = SPOTS.save.y;
  for (let i = 0; i < 12; i++) press(game, { mx: 1, my: 0 });
  assert.equal(game.progress.saveNode, 'marmelade');
  assert.equal(game.progress.saveHeading, W);
  press(game, { station: true });
  assert.equal(game.overlay?.type, 'menu');
});

test('Kartenansicht: Taste öffnet und schließt, ohne Auswahl', () => {
  const { game } = newGame();
  press(game, { map: true });
  assert.equal(game.overlay?.type, 'map');
  press(game, { right: true, confirm: false });
  assert.equal(game.node, 'toast');
  press(game, { map: true });
  assert.equal(game.overlay, null);
  game.launch();
  press(game, { map: true });
  assert.equal(game.overlay?.type, 'map', 'auch im Level');
  press(game, { back: true });
  assert.equal(game.screen, 'level');
});

test('Erstes Level fliegen: Ankunft am Eierbecher', () => {
  const { game } = newGame();
  turnAndLaunch(game, E);
  assert.equal(game.screen, 'level');
  flyLevel(game);
  closeDialogs(game);
  assert.equal(game.screen, 'arena');
  assert.equal(game.node, 'eier');
  assert.ok(game.progress.visited.includes('eier'));
  assert.ok(game.progress.knownEdges.includes('kruemelstrasse'));
});

test('Etappe abbrechen stellt den Zustand vor dem Abflug wieder her', () => {
  const { game } = newGame();
  game.launch();
  for (let i = 0; i < 300; i++) press(game, { fire: true });
  press(game, { pause: true });
  chooseMenu(game, 'Etappe abbrechen');
  assert.equal(game.screen, 'arena');
  assert.equal(game.node, 'toast');
  assert.equal(game.heading, E);
});

test('Tod: zurück zur letzten Station, Items bleiben, Power-Ups weg', () => {
  const { game } = newGame({ invincible: false });
  game.items.add('WURST1');
  game.powers.speed = 2;
  game.launch();
  game.level.player.hp = 1;
  game.level.player.inv = 0;
  game.level.damage();
  for (let i = 0; i < 400 && game.screen === 'level'; i++) press(game, {});
  assert.equal(game.screen, 'arena');
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
  game.launch();
  press(game, { pause: true });
  chooseMenu(game, 'Zur letzten Station');
  assert.equal(game.node, 'marmelade');
  assert.equal(game.screen, 'arena');
});

test('Stationsmenü: Rohrpost und Pilotenwechsel', () => {
  const { game } = newGame();
  game.progress.visited.push('marmelade', 'stoepsel');
  game.items.add('OMA');
  game.arena.x = SPOTS.save.x - 24;
  game.arena.y = SPOTS.save.y;
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
  game.placeAt('eier', E);
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
  assert.equal(game.screen, 'arena');
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
  game.placeAt('marmelade', E);
  game.launch();
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
      const steps = planToGoal(game, skill);
      assert.ok(steps && steps.length, `kein Plan von ${game.node}`);
      doStep(game, steps[0]);
      if (steps[0].via.startsWith('flug')) launches++;
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
    const steps = planToItem(game);
    assert.ok(steps, 'kein Weg zum nächsten Item von ' + game.node);
    for (const st of steps) {
      closeDialogs(game);
      doStep(game, st);
    }
  }
  closeDialogs(game);
  assert.equal(game.completion(), 100);
  for (const n of Object.keys(NODES)) if (!NODES[n].goal) assert.ok(game.progress.visited.includes(n), n + ' nicht besucht');
});

function planToItem(game) {
  const startMask = maskOf(game.items);
  const unvisited = (n) => !game.progress.visited.includes(n);
  return plan(game, { accept: (n) => n.mask !== startMask || (n.via.startsWith('flug') && unvisited(n.node)) });
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
    game.launch();
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
  game.launch();
  flyLevel(game);
  closeDialogs(game);
  assert.equal(game.node, 'eier');
  turnAndLaunch(game, N);
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
  game.launch();
  game.level.player.hp = 1;
  game.level.player.inv = 0;
  game.level.damage();
  for (let i = 0; i < 400 && game.screen === 'level'; i++) press(game, {});
  assert.equal(game.powers.missile, true);
  assert.equal(game.powers.double, false);
});

test('Sparstrumpf: Schild und Doppel/Laser-Wechsel verfälschen die Hälfte nicht (Befund Software-Tester)', async () => {
  const { freshPowers, activate, powerupsAfterDeath } = await import('../src/game/powerups.js');
  const buyAll = (seq) => {
    const p = freshPowers();
    for (const i of seq) {
      p.cursor = i;
      activate(p);
    }
    return p;
  };
  // [Schild, Tempo, Rakete]: Hälfte von 2 echten Käufen = Tempo
  let k = powerupsAfterDeath(buyAll([5, 0, 1]), true);
  assert.equal(k.speed, 1);
  // Viele Doppel/Laser-Wechsel zählen nur einmal
  const p = buyAll([2, 3, 2, 3, 2, 3, 0, 0, 1, 4]);
  assert.deepEqual(p.order, [3, 0, 0, 1, 4]);
  k = powerupsAfterDeath(p, true);
  assert.equal(k.laser, true);
  assert.equal(k.speed, 1);
});

test('Rückzug vor der Wand: zurück an den Startknoten, ohne Strafe', () => {
  const { game } = newGame();
  game.placeAt('kartoffelkiste', W);
  game.powers.speed = 2;
  game.launch();
  assert.equal(game.screen, 'level');
  game.level.events = [];
  for (let i = 0; i < 60 * 90 && game.screen === 'level'; i++) press(game, {});
  assert.equal(game.screen, 'arena');
  assert.equal(game.node, 'kartoffelkiste');
  assert.equal(game.heading, W);
  assert.equal(game.powers.speed, 2);
  assert.equal(game.progress.deaths, 0);
});

test('Nach dem Rückzug fliegt gehaltenes "vorwärts" nicht gleich wieder hinein (Befund Spieletester)', () => {
  const { game } = newGame();
  game.placeAt('kartoffelkiste', W);
  game.launch();
  game.level.events = [];
  for (let i = 0; i < 60 * 90 && game.screen === 'level'; i++) press(game, { mx: -1, my: 0 });
  assert.equal(game.screen, 'arena');
  for (let i = 0; i < 120; i++) press(game, { mx: -1, my: 0 }); // weiter nach Westen halten
  assert.equal(game.screen, 'arena', 'Ausgang bleibt zu, solange man hält');
  for (let i = 0; i < 20; i++) press(game, {}); // loslassen
  for (let i = 0; i < 120 && game.screen === 'arena'; i++) press(game, { mx: -1, my: 0 });
  assert.equal(game.screen, 'level', 'nach dem Loslassen geht es wieder');
});

test('Karte merkt sich versperrte Etappen, bis man durchkommt', () => {
  const { game } = newGame();
  game.placeAt('kartoffelkiste', W);
  game.launch();
  game.level.events = [];
  for (let i = 0; i < 60 * 90 && game.screen === 'level'; i++) press(game, {});
  assert.deepEqual(game.progress.blockedEdges, ['gurkengasse']);
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(game.progress))).blockedEdges, ['gurkengasse']);
  game.items.add('BOHRER');
  game.placeAt('kartoffelkiste', W);
  game.launch();
  flyLevel(game);
  assert.deepEqual(game.progress.blockedEdges, []);
});

test('Drehscheibe: rechts herum durchflogen dreht rechts, links herum links (Befund Spieletester)', () => {
  for (const [fromSide, expect] of [[-1, S], [1, N]]) {
    const { game } = newGame();
    const s = SPOTS.turntable;
    game.arena.x = s.x + fromSide * 50;
    game.arena.y = s.y - 8;
    game.arena.ringArmed = true;
    for (let i = 0; i < 40 && game.heading === E; i++) press(game, { mx: -fromSide, my: 0 });
    assert.equal(game.heading, expect, fromSide < 0 ? 'von links: rechts herum' : 'von rechts: links herum');
  }
});

test('Stationsmenü per X speichert auch ohne vorherige Berührung (Befund Software-Tester)', () => {
  const { game, storage } = newGame();
  game.placeAt('marmelade', W);
  game.arena.x = SPOTS.save.x - 34;
  game.arena.y = SPOTS.save.y;
  press(game, { station: true });
  assert.equal(game.overlay?.type, 'menu');
  assert.equal(loadProgress(storage).saveNode, 'marmelade');
});

test('Nach dem Bosssieg keine Pause/Abbruch mehr – die Belohnung kann nicht verloren gehen (Befund Software-Tester)', () => {
  const { game } = newGame();
  game.placeAt('marmelade', E);
  game.launch();
  const lv = game.level;
  lv.camA = lv.L - lv.va - 1;
  lv.player.a = lv.camA + 80;
  for (let i = 0; i < 60 * 60 && lv.state !== 'bossdown'; i++) {
    if (lv.boss && lv.boss.enter <= 0) lv.damageBoss(lv.boss.hp);
    press(game, { fire: true });
  }
  assert.equal(lv.state, 'bossdown');
  press(game, { pause: true });
  press(game, { map: true });
  assert.equal(game.overlay, null);
  for (let i = 0; i < 60 * 20 && game.screen === 'level'; i++) press(game, { pause: i % 2 === 0 });
  closeDialogs(game);
  assert.ok(game.items.has('DREHWURM'));
});

test('Drehscheibe: fast genau auf die Mitte gezielt dreht immer rechts (Befund Software-Tester)', () => {
  for (const dy of [-0.5, -0.2, 0, 0.2, 0.5]) {
    const { game } = newGame();
    const s = SPOTS.turntable;
    game.arena.x = s.x - 50;
    game.arena.y = s.y + dy;
    game.arena.ringArmed = true;
    for (let i = 0; i < 40 && game.heading === E; i++) press(game, { mx: 1, my: 0 });
    assert.equal(game.heading, S, 'dy ' + dy);
  }
});

test('Drehscheibe: nur echtes Durchfliegen dreht – Streifen oder in die Ecke drücken nicht (Wunsch Robin)', () => {
  const s = SPOTS.turntable;
  // schräg nach links unten in die Ecke fliegen und dort hängen bleiben
  let { game } = newGame();
  game.arena.x = 240;
  game.arena.y = 135;
  for (let i = 0; i < 240; i++) press(game, { mx: -0.89, my: 0.457 });
  assert.equal(game.heading, E, 'Mitte → Ecke und an der Wand entlang: keine Drehung');
  ({ game } = newGame());
  game.arena.x = 400;
  game.arena.y = 200;
  for (let i = 0; i < 240; i++) press(game, { mx: -1, my: 0.3 });
  assert.equal(game.heading, E, 'an der Bodenwand nach links gleiten: keine Drehung');
  // knapp am Ring vorbei (streifen, Mitte weit weg)
  ({ game } = newGame());
  game.arena.x = s.x - 50;
  game.arena.y = s.y - 20;
  for (let i = 0; i < 50; i++) press(game, { mx: 1, my: 0 });
  assert.equal(game.heading, E, 'Streifen: keine Drehung');
  // hinein und auf derselben Seite wieder hinaus: keine Drehung
  ({ game } = newGame());
  game.arena.x = s.x - 50;
  game.arena.y = s.y - 4;
  for (let i = 0; i < 20; i++) press(game, { mx: 1, my: 0 });
  for (let i = 0; i < 30; i++) press(game, { mx: -1, my: 0 });
  assert.equal(game.heading, E, 'umgekehrt: keine Drehung');
  // richtig durch: Drehung erst beim Hinausfliegen
  ({ game } = newGame());
  game.arena.x = s.x - 50;
  game.arena.y = s.y - 2;
  for (let i = 0; i < 25; i++) press(game, { mx: 1, my: 0 });
  assert.equal(game.heading, E, 'noch im Ring');
  for (let i = 0; i < 25; i++) press(game, { mx: 1, my: 0 });
  assert.equal(game.heading, S, 'durchflogen: rechts herum');
});
