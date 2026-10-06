// Zentrale Spielsteuerung: Titelbild, Arenen (Knoten), Etappen (Level), Kartenansicht, Menüs,
// Speichern, Abspann.
// Ohne DOM – Eingaben kommen als Objekt herein, Ausgaben (Töne, Musik) liegen in Warteschlangen.

import { NODES, START_NODE, START_HEADING } from '../data/world.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS, availableCharacters } from '../data/characters.js';
import { THEMES } from '../data/themes.js';
import { ENDING_LINES } from '../data/text.js';
import { N, opposite, turnCW } from '../core/math.js';
import { linksAt, directionAllowed, arrive, returnTarget } from './worldgraph.js';
import { Arena } from './arena.js';
import { FensterScene } from '../proto/fenster.js';
import { Level } from './level.js';
import { freshPowers, powerupsAfterDeath } from './powerups.js';
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
  'Pfeiltasten / WASD ...... fliegen, Menü',
  'Leertaste / J ........... Feuer, Bestätigen',
  'K / Umschalt ............ POWER kaufen, Drehen (Drehwurm)',
  'L / Q ................... Wenden (180°, braucht Wendehals)',
  'E (halten) .............. Turbo (braucht Espresso)',
  'X / C ................... Station benutzen',
  'M / Tab ................. Karte',
  'Esc / P ................. Pause, Zurück',
  'F11 ..................... Vollbild',
  '',
  'CONTROLLER (Xbox / Steam Deck)',
  'Stick / Steuerkreuz ..... fliegen, Menü',
  'A ....................... Feuer, Bestätigen',
  'B ....................... POWER, Drehen, Zurück',
  'X ....................... Station benutzen',
  'Y ....................... Wenden',
  'RB (halten) ............. Turbo',
  'View / Select ........... Karte',
  'Start / Menü ............ Pause',
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
    this.arena = null;
    this.progress = null;
    this.items = new Set();
    this.node = START_NODE;
    this._heading = START_HEADING;
    this.powers = freshPowers();
    this.ending = null;
    this.openTitleMenu();
  }

  // ------------------------------------------------------------- Zustand
  get heading() {
    return this._heading;
  }

  set heading(h) {
    this._heading = h;
    if (this.arena) this.arena.heading = h;
  }

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

  /** "Geht nicht" ohne Worte: das Schiff ruckelt kurz, dazu ein Ton. */
  nudge() {
    this.nudgeT = 0.45;
    if (this.arena) this.arena.nudge();
    else this.sfx('nope');
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
    items.push({ label: 'Optionen', action: () => this.openOptions(() => this.openTitleMenu(), { fromTitle: true }) });
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

  openOptions(back, { fromTitle = false } = {}) {
    const s = this.settings;
    const items = [
      { label: 'Musik', kind: 'slider', get: () => s.music, set: (v) => (s.music = v) },
      { label: 'Effekte', kind: 'slider', get: () => s.sfx, set: (v) => (s.sfx = v) },
      { label: 'Bildschirmwackeln', kind: 'toggle', get: () => s.shake, set: (v) => (s.shake = v) },
      {
        label: 'Reduzierte Effekte',
        kind: 'toggle',
        get: () => s.reducedEffects,
        set: (v) => {
          s.reducedEffects = v;
          if (v) s.shake = false;
        },
      },
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
    if (fromTitle) items.push({ label: 'Prototyp: Fenster', action: () => this.startProto('fenster') });
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

  /** Kartenansicht: nur zum Ansehen, keine Auswahl. */
  openMap(onClose = null) {
    this.sfx('pause');
    this.overlay = { type: 'map', onClose };
  }

  showControls(back) {
    this.overlay = { type: 'dialog', title: 'Steuerung', lines: CONTROLS_TEXT, onClose: back, wide: true };
  }

  openPause() {
    this.sfx('pause');
    const resume = () => (this.overlay = null);
    const back = () => this.openPause();
    const items = [{ label: 'Weiter', action: resume }];
    if (this.screen === 'level') items.push({ label: 'Etappe abbrechen', action: () => this.abortLevel() });
    items.push({ label: 'Karte', action: () => this.openMap(back) });
    items.push({ label: 'Zur letzten Station', action: () => this.returnToStation(false) });
    items.push({ label: 'Optionen', action: () => this.openOptions(back) });
    items.push({ label: 'Steuerung', action: () => this.showControls(back) });
    items.push({ label: 'Zum Hauptmenü', action: () => this.toTitle() });
    this.overlay = this.menu('Pause', items, { onBack: resume });
  }

  openStation() {
    const node = NODES[this.node];
    if (!node.save) return;
    const items = [];
    const others = this.progress.visited.filter((id) => NODES[id].save && id !== this.node);
    if (others.length) items.push({ label: 'Rohrpost (Schnellreise)', action: () => this.openWarp() });
    const chars = availableCharacters(this.items);
    if (chars.length > 1) items.push({ label: 'Pilot wechseln', action: () => this.openCharacters() });
    items.push({ label: 'Weiter', action: () => (this.overlay = null) });
    this.overlay = this.menu('Station ' + node.name, items, {
      onBack: () => (this.overlay = null),
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
    if (input.confirm || input.back || input.pause || (this.overlay.type === 'map' && input.map)) {
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
    this.enterArena(this.node, this.heading, null);
    this.dialogQueue.push({
      type: 'dialog',
      title: 'Wendehals',
      // Nur Steuerung erklären – wie die Welt funktioniert, findet man selbst heraus.
      lines: ['Pfeile / Stick: fliegen', 'FEUER: schießen', 'M / View: Karte', 'ESC / Start: Pause und Steuerung'],
    });
    this.nextDialog();
  }

  continueGame() {
    const p = loadProgress(this.storage);
    if (!p) return this.startNewGame();
    this.progress = p;
    this.loadFromProgress();
    this.overlay = null;
    this.enterArena(this.node, this.heading, null);
    this.toast('Willkommen zurück an der Station ' + NODES[this.node].name + '!');
  }

  loadFromProgress() {
    const p = this.progress;
    this.items = new Set(p.items);
    this.node = p.saveNode;
    this.heading = p.saveHeading;
    this.powers = freshPowers();
    this.level = null;
    this.arena = null;
  }

  /** Betritt eine Arena. entry: { side, pos } = Ankunft durch diesen Ausgang, null = an der Station. */
  enterArena(node, heading, entry) {
    this.level = null;
    this.node = node;
    this.arena = new Arena({ node, heading, items: this.items, entry });
    this.heading = heading;
    this.screen = 'arena';
    this.screenTime = 0;
    this.savedHere = false;
    if (!this.progress.visited.includes(node)) this.progress.visited.push(node);
  }

  /** Für Tests und Werkzeuge: direkt in eine Arena setzen (wie Rohrpost, aber ohne Speichern). */
  placeAt(node, heading) {
    this.enterArena(node, heading, null);
  }

  save() {
    const p = this.progress;
    p.items = [...this.items];
    storeProgress(this.storage, p);
  }

  /** Wegwerf-Prototypen (src/proto/), nur vom Titel aus erreichbar. */
  startProto(name) {
    if (name !== 'fenster') return;
    this.proto = new FensterScene();
    this.screen = 'proto';
    this.screenTime = 0;
    this.overlay = null;
    this.dialogQueue = [];
  }

  leaveProto() {
    this.proto = null;
    this.screen = 'title';
    this.screenTime = 0;
    this.openTitleMenu();
  }

  toTitle() {
    if (this.progress) this.save();
    this.level = null;
    this.arena = null;
    this.screen = 'title';
    this.screenTime = 0;
    this.dialogQueue = [];
    this.openTitleMenu();
  }

  warpTo(id) {
    this.progress.saveNode = id;
    this.enterArena(id, this.progress.saveHeading, null);
    this.save();
    this.overlay = null;
    this.sfx('warp');
    this.toast('Rohrpost nach ' + NODES[id].name + ' – zisch!');
  }

  /**
   * Startet eine Etappe durch einen Ausgang. Ohne Angabe: der erste befliegbare Ausgang in
   * Blickrichtung (für Tests/Werkzeuge; im Spiel fliegt man in der Arena hinaus).
   */
  launch(link = null) {
    if (!link) {
      const all = linksAt(this.node, this.heading);
      link = all.find(directionAllowed) || null;
      if (!link) {
        this.nudge();
        return;
      }
    }
    if (!directionAllowed(link)) {
      this.nudge();
      return;
    }
    this.levelOrigin = { node: this.node, heading: this.heading, side: this.heading, pos: link.pos };
    if (!this.progress.knownEdges.includes(link.edge.id)) this.progress.knownEdges.push(link.edge.id);
    this.arena = null;
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
    this.toasts = []; // Arena-Meldungen gehören nicht ins Level
    this.sfx('launch');
  }

  abortLevel() {
    if (this.level && this.level.state === 'dead') return this.returnToStation(true);
    const o = this.levelOrigin;
    this.overlay = null;
    // Zurück durch den Ausgang, durch den man hinausgeflogen ist – ein Stück weiter drinnen.
    this.enterArena(o.node, o.heading, { side: o.side, pos: o.pos, depth: 70 });
  }

  returnToStation(died) {
    if (!died && this.level && this.level.state === 'dead') died = true;
    this.overlay = null;
    this.enterArena(this.progress.saveNode, this.progress.saveHeading, null);
    if (died) {
      this.progress.deaths++;
      this.powers = powerupsAfterDeath(this.powers, this.items.has('SPARSTRUMPF'));
      this.dialogQueue.push({
        type: 'dialog',
        title: 'Autsch!',
        lines: ['Zurück zur Station ' + NODES[this.node].name + '.'],
      });
    } else this.toast('Zurück zur Station ' + NODES[this.node].name + '.');
    this.save();
    this.nextDialog();
  }

  handleLevelResult(res) {
    const lv = this.level;
    if (res.type === 'retreat') {
      // Umgekehrt vor einer unüberwindbaren Wand: wie "Etappe abbrechen", ohne Text.
      // Die Karte merkt sich die Kante als versperrt (Symbol des Hindernisses).
      this.progress.score += lv.score;
      if (lv.forward === lv.startForward && !this.progress.blockedEdges.includes(lv.edge.id)) this.progress.blockedEdges.push(lv.edge.id);
      this.abortLevel();
      this.nudge();
      return;
    }
    this.progress.score += lv.score;
    if (res.type === 'dead') {
      this.returnToStation(true);
      return;
    }
    const before = new Set(this.items);
    this.progress.blockedEdges = this.progress.blockedEdges.filter((id) => id !== lv.edge.id);
    const r = arrive(res.node, res.heading, this.items, res.rewards);
    this.items = r.items;
    if (res.goal) {
      this.level = null;
      this.node = r.node;
      this.save();
      this.startEnding();
      return;
    }
    // Ankunft durch den Ausgang dieser Etappe an der Gegenseite der Arena
    const side = opposite(res.heading);
    const link = linksAt(res.node, side).find((l) => l.edge === lv.edge);
    this.enterArena(r.node, r.heading, { side, pos: link ? link.pos : 0.5 });
    for (const it of this.items) {
      if (before.has(it)) continue;
      const info = ITEMS[it];
      this.sfx('item');
      // Nur Name und – falls nötig – die Taste; was das Item bewirkt, zeigt die Welt.
      this.dialogQueue.push({ type: 'dialog', title: info.name, lines: info.desc ? [info.desc] : [], item: it });
    }
    this.save();
    this.nextDialog();
  }

  /** Speicherstation berührt: Spielstand an dieser Arena. */
  saveAtStation() {
    this.progress.saveNode = this.node;
    this.progress.saveHeading = this.heading;
    this.save();
    this.sfx('power');
    this.toast('Gespeichert.', 1.6);
  }

  /** Rückholstation benutzt. */
  useReturn() {
    const r = returnTarget(this.node, this.items);
    if (!r) return;
    this.items = r.items;
    this.enterArena(r.node, r.heading, null);
    this.sfx('warp');
    this.toast('Rückholung: ' + NODES[r.node].name, 2);
  }

  startEnding() {
    this.progress.finished = true;
    this.progress.saveNode = 'pendel';
    this.progress.saveHeading = N;
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
    this.nudgeT = Math.max(0, (this.nudgeT || 0) - dt);
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

    if (this.progress && (this.screen === 'arena' || this.screen === 'level')) this.progress.playTime += dt;

    switch (this.screen) {
      case 'title':
        this.openTitleMenu();
        break;
      case 'arena':
        this.updateArena(dt, input);
        break;
      case 'level':
        this.updateLevel(dt, input);
        break;
      case 'ending':
        this.updateEnding(dt, input);
        break;
      case 'proto':
        if (input.pause) this.leaveProto();
        else {
          this.proto.update(dt, input);
          for (const name of this.proto.sfx) this.sfx(name);
          this.proto.sfx.length = 0;
        }
        break;
    }
  }

  updateArena(dt, input) {
    const ar = this.arena;
    if (input.pause) return this.openPause();
    if (input.map) return this.openMap();
    // Drehen: Drehwurm (POWER-Taste) 90° rechts, Wendehals 180° – überall in der Arena.
    if (input.power) {
      if (this.items.has('DREHWURM')) ar.turnTo(turnCW(ar.heading));
      else ar.confused();
    }
    if (input.wende) {
      if (this.items.has('WENDEHALS')) ar.turnTo(opposite(ar.heading));
      else ar.confused();
    }
    ar.update(dt, { mx: input.mx, my: input.my });
    this._heading = ar.heading;
    for (const s of ar.sfxQueue) this.sfxQueue.push(s);
    ar.sfxQueue.length = 0;
    // Speicherstation: Berühren speichert (einmal pro Besuch), X öffnet das Menü
    const atSave = ar.near('save', 0);
    if (atSave && !this.savedHere) {
      this.savedHere = true;
      this.saveAtStation();
    } else if (!ar.near('save', 30)) this.savedHere = false;
    if (input.station) {
      if (ar.near('save')) {
        if (!this.savedHere) {
          this.savedHere = true;
          this.saveAtStation();
        }
        this.openStation();
      }
      else if (ar.near('ret')) this.useReturn();
      else ar.nudge();
      return;
    }
    if (ar.result && ar.result.type === 'launch') this.launch(ar.result.link);
  }

  updateLevel(dt, input) {
    // Während des Absturzes keine Pause: sonst ließe sich die Todesstrafe per Menü umgehen.
    // Während Absturz, Boss-Explosion und Zieleinlauf keine Pause/Karte: sonst ließe sich die
    // Todesstrafe umgehen oder die schon verdiente Belohnung per "Etappe abbrechen" verwerfen.
    const locked = ['dead', 'bossdown', 'clear'].includes(this.level.state);
    if (input.pause && !locked) return this.openPause();
    if (input.map && !locked) return this.openMap();
    const lv = this.level;
    lv.update(dt, { mx: input.mx, my: input.my, fire: input.fire, power: input.power, wende: input.wende, espresso: input.espresso });
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

