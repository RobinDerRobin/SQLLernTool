// Zentrale Spielsteuerung: Titelbild, Weltkarte, Level, Menüs, Speichern, Abspann.
// Ohne DOM – Eingaben kommen als Objekt herein, Ausgaben (Töne, Musik) liegen in Warteschlangen.

import { NODES, START_NODE, START_HEADING } from '../data/world.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS, availableCharacters } from '../data/characters.js';
import { THEMES } from '../data/themes.js';
import { NODE_HINTS, ENDING_LINES } from '../data/text.js';
import { DIR_NAMES, opposite } from '../core/math.js';
import { linkAt, directionAllowed, canTurnAt, arrive } from './worldgraph.js';
import { Level } from './level.js';
import { freshPowers } from './powerups.js';
import {
  newProgress,
  loadProgress,
  storeProgress,
  loadSettings,
  storeSettings,
  clearProgress,
} from './save.js';

export const CONTROLS_TEXT = [
  'TASTATUR',
  'Pfeiltasten / WASD ...... fliegen, Menü, Richtung wählen',
  'Leertaste / J ........... Feuer, Abflug, Bestätigen',
  'K / Umschalt ............ POWER kaufen, Stationsmenü',
  'L / Q ................... Wenden (180°, braucht Wendehals)',
  'Esc / P ................. Pause, Zurück',
  'F11 ..................... Vollbild',
  '',
  'CONTROLLER (Xbox / Steam Deck)',
  'Stick / Steuerkreuz ..... fliegen, Menü',
  'A ....................... Feuer, Abflug, Bestätigen',
  'B ....................... POWER, Zurück',
  'X ....................... Stationsmenü',
  'Y ....................... Wenden',
  'Start / Menü ............ Pause',
];

const DIR_KEYS = [
  ['right', 0],
  ['down', 1],
  ['left', 2],
  ['up', 3],
];

export class Game {
  constructor({ storage, platform = {}, invincible = false } = {}) {
    this.storage = storage;
    this.platform = platform;
    this.invincible = invincible;
    this.settings = loadSettings(storage);
    this.screen = 'title';
    this.overlay = null;
    this.dialogQueue = [];
    this.toasts = [];
    this.sfxQueue = [];
    this.time = 0;
    this.screenTime = 0;
    this.level = null;
    this.progress = null;
    this.items = new Set();
    this.node = START_NODE;
    this.heading = START_HEADING;
    this.shipAngle = 0;
    this.powers = freshPowers();
    this.ending = null;
    this.openTitleMenu();
  }

  // ------------------------------------------------------------- Zustand
  get musicTrack() {
    if (this.screen === 'title') return 'title';
    if (this.screen === 'ending') return 'ending';
    if (this.screen === 'level' && this.level) {
      if (this.level.state === 'boss') return 'boss';
      return THEMES[this.level.edge.theme].music;
    }
    return 'map';
  }

  sfx(name) {
    this.sfxQueue.push(name);
  }

  toast(text, dur = 2.6) {
    this.toasts = this.toasts.filter((t) => t.text !== text);
    this.toasts.push({ text, t: 0, dur });
  }

  hasSave() {
    return !!loadProgress(this.storage);
  }

  // --------------------------------------------------------------- Menüs
  menu(title, items, opts = {}) {
    return { type: 'menu', title, items, index: 0, onBack: opts.onBack || null, footer: opts.footer || '' };
  }

  openTitleMenu() {
    const items = [];
    if (this.hasSave()) items.push({ label: 'Weiterspielen', action: () => this.continueGame() });
    items.push({ label: 'Neues Spiel', action: () => this.askNewGame() });
    items.push({ label: 'Optionen', action: () => this.openOptions(() => this.openTitleMenu()) });
    items.push({ label: 'Steuerung', action: () => this.showControls(() => this.openTitleMenu()) });
    if (this.platform.quit) items.push({ label: 'Beenden', action: () => this.platform.quit() });
    this.overlay = this.menu(null, items);
  }

  askNewGame() {
    if (!this.hasSave()) return this.startNewGame();
    this.overlay = this.menu(
      'Neues Spiel? Der alte Spielstand wird überschrieben.',
      [
        { label: 'Nein', action: () => this.openTitleMenu() },
        { label: 'Ja, neu anfangen', action: () => this.startNewGame() },
      ],
      { onBack: () => this.openTitleMenu() },
    );
  }

  openOptions(back) {
    const s = this.settings;
    const items = [
      { label: 'Musik', kind: 'slider', get: () => s.music, set: (v) => (s.music = v) },
      { label: 'Effekte', kind: 'slider', get: () => s.sfx, set: (v) => (s.sfx = v) },
      { label: 'Bildschirmwackeln', kind: 'toggle', get: () => s.shake, set: (v) => (s.shake = v) },
    ];
    if (this.platform.setFullscreen) {
      items.push({
        label: 'Vollbild',
        kind: 'toggle',
        get: () => s.fullscreen,
        set: (v) => {
          s.fullscreen = v;
          this.platform.setFullscreen(v);
        },
      });
    }
    items.push({ label: 'Zurück', action: back });
    this.overlay = this.menu('Optionen', items, {
      onBack: () => {
        storeSettings(this.storage, s);
        back();
      },
    });
    const orig = items[items.length - 1].action;
    items[items.length - 1].action = () => {
      storeSettings(this.storage, s);
      orig();
    };
  }

  showControls(back) {
    this.overlay = { type: 'dialog', title: 'Steuerung', lines: CONTROLS_TEXT, onClose: back, wide: true };
  }

  openPause() {
    this.sfx('pause');
    const resume = () => (this.overlay = null);
    const back = () => this.openPause();
    const items = [{ label: 'Weiter', action: resume }];
    if (this.screen === 'level') {
      items.push({ label: 'Etappe abbrechen', action: () => this.abortLevel() });
      items.push({ label: 'Zur letzten Station', action: () => this.returnToStation(false) });
    } else {
      items.push({ label: 'Zur letzten Station', action: () => this.returnToStation(false) });
    }
    items.push({ label: 'Optionen', action: () => this.openOptions(back) });
    items.push({ label: 'Steuerung', action: () => this.showControls(back) });
    items.push({ label: 'Zum Hauptmenü', action: () => this.toTitle() });
    this.overlay = this.menu('Pause', items, { onBack: resume });
  }

  openStation() {
    const node = NODES[this.node];
    const items = [];
    const others = this.progress.visited.filter((id) => NODES[id].save && id !== this.node);
    if (others.length) items.push({ label: 'Rohrpost (Schnellreise)', action: () => this.openWarp() });
    const chars = availableCharacters(this.items);
    if (chars.length > 1) items.push({ label: 'Pilot wechseln', action: () => this.openCharacters() });
    items.push({ label: 'Weiter', action: () => (this.overlay = null) });
    this.overlay = this.menu('Station ' + node.name, items, {
      onBack: () => (this.overlay = null),
      footer: 'Gespeichert. Du kannst dich hier frei drehen.',
    });
  }

  openWarp() {
    const others = this.progress.visited.filter((id) => NODES[id].save && id !== this.node);
    const items = others.map((id) => ({ label: NODES[id].name, action: () => this.warpTo(id) }));
    items.push({ label: 'Zurück', action: () => this.openStation() });
    this.overlay = this.menu('Rohrpost – wohin?', items, { onBack: () => this.openStation() });
  }

  openCharacters() {
    const items = availableCharacters(this.items).map((id) => ({
      label: CHARACTERS[id].name + (id === this.progress.character ? '  ✓' : ''),
      desc: CHARACTERS[id].desc,
      action: () => {
        this.progress.character = id;
        this.save();
        this.sfx('power');
        this.openStation();
      },
    }));
    items.push({ label: 'Zurück', action: () => this.openStation() });
    this.overlay = this.menu('Pilot wechseln', items, { onBack: () => this.openStation() });
  }

  updateMenu(input) {
    const m = this.overlay;
    if (input.up) m.index = (m.index + m.items.length - 1) % m.items.length;
    if (input.down) m.index = (m.index + 1) % m.items.length;
    if (input.up || input.down) this.sfx('tick');
    const it = m.items[m.index];
    if (it.kind === 'slider' && (input.left || input.right)) {
      const v = Math.round((it.get() + (input.right ? 0.1 : -0.1)) * 10) / 10;
      it.set(Math.max(0, Math.min(1, v)));
      this.sfx('tick');
    }
    if (it.kind === 'toggle' && (input.left || input.right || input.confirm)) {
      it.set(!it.get());
      this.sfx('tick');
      return;
    }
    if (input.confirm && it.action) {
      this.sfx('confirm');
      it.action();
      return;
    }
    if ((input.back || input.pause) && m.onBack) {
      this.sfx('back');
      m.onBack();
    }
  }

  updateDialog(input) {
    if (input.confirm || input.back || input.pause) {
      const d = this.overlay;
      this.overlay = null;
      this.sfx('confirm');
      if (d.onClose) d.onClose();
      else this.nextDialog();
    }
  }

  nextDialog() {
    if (!this.overlay && this.dialogQueue.length) this.overlay = this.dialogQueue.shift();
  }

  // ------------------------------------------------------- Spielverlauf
  startNewGame() {
    clearProgress(this.storage);
    this.progress = newProgress();
    this.loadFromProgress();
    this.save();
    this.overlay = null;
    this.screen = 'map';
    this.screenTime = 0;
    this.dialogQueue.push({
      type: 'dialog',
      title: 'Wendehals',
      lines: [
        'Dackel Düse träumt vom Fliegen.',
        'Erkunde die Welt, finde Upgrades und dreh den Spieß um!',
        '',
        'Auf der Karte: Mit FEUER fliegst du in Blickrichtung los.',
        'An Drehscheiben (weißer Ring) wählst du mit den Pfeilen die Richtung.',
        'An Stationen (blaues Quadrat) wird gespeichert.',
      ],
    });
    this.nextDialog();
  }

  continueGame() {
    const p = loadProgress(this.storage);
    if (!p) return this.startNewGame();
    this.progress = p;
    this.loadFromProgress();
    this.overlay = null;
    this.screen = 'map';
    this.screenTime = 0;
    this.toast('Willkommen zurück an der Station ' + NODES[this.node].name + '!');
  }

  loadFromProgress() {
    const p = this.progress;
    this.items = new Set(p.items);
    this.node = p.saveNode;
    this.heading = p.saveHeading;
    this.shipAngle = this.heading;
    this.powers = freshPowers();
    this.level = null;
  }

  save() {
    const p = this.progress;
    p.items = [...this.items];
    storeProgress(this.storage, p);
  }

  toTitle() {
    if (this.progress) this.save();
    this.level = null;
    this.screen = 'title';
    this.screenTime = 0;
    this.dialogQueue = [];
    this.openTitleMenu();
  }

  warpTo(id) {
    this.node = id;
    this.heading = this.progress.saveHeading;
    this.progress.saveNode = id;
    this.save();
    this.overlay = null;
    this.sfx('warp');
    this.toast('Rohrpost nach ' + NODES[id].name + ' – zisch!');
  }

  launch() {
    const link = linkAt(this.node, this.heading);
    if (!link) {
      this.toast(NODE_HINTS.noExit);
      this.sfx('nope');
      return;
    }
    if (!directionAllowed(link)) {
      this.toast(NODE_HINTS.oneWay);
      this.sfx('nope');
      return;
    }
    this.levelOrigin = { node: this.node, heading: this.heading };
    if (!this.progress.knownEdges.includes(link.edge.id)) this.progress.knownEdges.push(link.edge.id);
    this.level = new Level({
      edge: link.edge,
      forward: link.forward,
      items: this.items,
      character: this.progress.character,
      powers: this.powers,
      invincible: this.invincible,
      seed: Math.floor(this.time * 1000) + 1,
    });
    this.screen = 'level';
    this.screenTime = 0;
    this.sfx('launch');
  }

  abortLevel() {
    this.level = null;
    this.overlay = null;
    this.node = this.levelOrigin.node;
    this.heading = this.levelOrigin.heading;
    this.screen = 'map';
    this.toast('Etappe abgebrochen.');
  }

  returnToStation(died) {
    this.level = null;
    this.overlay = null;
    this.node = this.progress.saveNode;
    this.heading = this.progress.saveHeading;
    this.shipAngle = this.heading;
    this.screen = 'map';
    if (died) {
      this.progress.deaths++;
      this.powers = freshPowers();
      this.dialogQueue.push({
        type: 'dialog',
        title: 'Autsch!',
        lines: ['Der Traum war kurz unterbrochen.', 'Zurück zur Station ' + NODES[this.node].name + '.', 'Deine Items behältst du – nur die Power-Ups sind weg.'],
      });
    } else this.toast('Zurück zur Station ' + NODES[this.node].name + '.');
    this.save();
    this.nextDialog();
  }

  handleLevelResult(res) {
    const lv = this.level;
    this.progress.score += lv.score;
    if (res.type === 'dead') {
      this.returnToStation(true);
      return;
    }
    const before = new Set(this.items);
    const r = arrive(res.node, res.heading, this.items, res.rewards);
    this.items = r.items;
    this.node = r.node;
    this.heading = r.heading;
    this.level = null;
    if (res.goal) {
      this.save();
      this.startEnding();
      return;
    }
    this.screen = 'map';
    this.screenTime = 0;
    const node = NODES[this.node];
    if (!this.progress.visited.includes(this.node)) this.progress.visited.push(this.node);
    for (const it of this.items) {
      if (before.has(it)) continue;
      const info = ITEMS[it];
      this.sfx('item');
      this.dialogQueue.push({ type: 'dialog', title: 'Neu: ' + info.name, lines: [info.desc], item: it });
    }
    if (node.autoTurn !== undefined && res.heading !== node.autoTurn) {
      this.toast('Ein Wender dreht dich nach ' + DIR_NAMES[node.autoTurn] + '!');
    }
    if (node.save) {
      this.progress.saveNode = this.node;
      this.progress.saveHeading = this.heading;
      this.toast('Station ' + node.name + ': gespeichert!');
    }
    this.save();
    this.nextDialog();
  }

  startEnding() {
    this.progress.finished = true;
    this.progress.saveNode = 'pendel';
    this.progress.saveHeading = 3;
    this.save();
    this.screen = 'ending';
    this.screenTime = 0;
    this.ending = { line: 0, t: 0, done: false };
    this.overlay = null;
  }

  completion() {
    return Math.round((this.items.size / Object.keys(ITEMS).length) * 100);
  }

  // -------------------------------------------------------------- Update
  update(dt, input = {}) {
    this.time += dt;
    this.screenTime += dt;
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
    if (input.fullscreen && this.platform.setFullscreen) {
      this.settings.fullscreen = !this.settings.fullscreen;
      this.platform.setFullscreen(this.settings.fullscreen);
      storeSettings(this.storage, this.settings);
    }

    if (this.overlay) {
      if (this.overlay.type === 'menu') this.updateMenu(input);
      else this.updateDialog(input);
      return;
    }

    if (this.progress && (this.screen === 'map' || this.screen === 'level')) this.progress.playTime += dt;

    switch (this.screen) {
      case 'title':
        this.openTitleMenu();
        break;
      case 'map':
        this.updateMap(dt, input);
        break;
      case 'level':
        this.updateLevel(dt, input);
        break;
      case 'ending':
        this.updateEnding(dt, input);
        break;
    }
  }

  updateMap(dt, input) {
    // Schiffssymbol dreht sich weich zur Blickrichtung
    let d = this.heading - this.shipAngle;
    while (d > 2) d -= 4;
    while (d < -2) d += 4;
    this.shipAngle += d * Math.min(1, dt * 12);

    if (input.pause) return this.openPause();
    for (const [k, dir] of DIR_KEYS) {
      if (!input[k] || dir === this.heading) continue;
      if (canTurnAt(this.node, this.items) || (this.items.has('WENDEHALS') && dir === opposite(this.heading))) {
        this.heading = dir;
        this.sfx('turn');
      } else {
        this.toast(NODE_HINTS.needTurn);
        this.sfx('nope');
      }
      break;
    }
    if (input.confirm || input.firePressed) return this.launch();
    if ((input.station || input.power) && NODES[this.node].save) this.openStation();
    else if (input.station || input.power) this.toast('Stationsmenü gibt es nur an Stationen.');
  }

  updateLevel(dt, input) {
    if (input.pause) return this.openPause();
    const lv = this.level;
    lv.update(dt, { mx: input.mx, my: input.my, fire: input.fire, power: input.power, wende: input.wende });
    for (const s of lv.sfxQueue) this.sfxQueue.push(s);
    if (lv.result) this.handleLevelResult(lv.result);
  }

  updateEnding(dt, input) {
    const e = this.ending;
    e.t += dt;
    const step = e.line === 0 ? 2.6 : 3.2;
    if (!e.done && (e.t > step || input.confirm)) {
      e.line++;
      e.t = 0;
      if (e.line >= ENDING_LINES.length) e.done = true;
    } else if (e.done && e.t > 1 && input.confirm) {
      this.toTitle();
    }
  }
}

