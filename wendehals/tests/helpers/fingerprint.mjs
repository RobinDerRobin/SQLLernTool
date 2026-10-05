// Golden Master der v0.2-Welt: ein Fingerabdruck von Logik, Etappen und Zeichnung, der nicht von der
// Zahlenkodierung der Richtungen abhängt (Richtungen werden als Buchstaben E/S/W/N festgehalten).
// Zweck: Umbauten wie 4 → 8 Richtungen dürfen am v0.2-Spiel nichts ändern. Jede Abweichung zeigt
// sich als benannter Abschnitt (z. B. "render:arena:stoepsel:W").
// Aktualisieren nur bei beabsichtigter Änderung: npm run golden:update (Grund in die Commit-Nachricht).

import { createHash } from 'node:crypto';
import { Game } from '../../src/game/game.js';
import { Level } from '../../src/game/level.js';
import { Renderer } from '../../src/render/renderer.js';
import { MemoryStorage } from '../../src/game/save.js';
import { analyze } from '../../src/game/solver.js';
import { EDGES } from '../../src/data/world.js';
import { ITEM_IDS } from '../../src/data/items.js';
import { E, S, W, N } from '../../src/core/math.js';
import { chooseMenu, closeDialogs, doStep, planToGoal, press } from './driver.mjs';
import { runLevel } from './bot.mjs';

const LETTER = { [E]: 'E', [S]: 'S', [W]: 'W', [N]: 'N' };
/** Richtung als Buchstabe – unabhängig davon, welche Zahl gerade für "Westen" steht. */
export const L = (h) => LETTER[h] ?? '?' + h;
const CARDINALS = [E, S, W, N];

const num = (v) => {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v * 1e6) / 1e6;
  return String(Object.is(r, -0) ? 0 : r);
};

/**
 * Stabile Textform beliebiger Daten. Felder, die eine Richtung tragen, werden als Buchstabe
 * geschrieben, Zahlen auf 1e-6 gerundet, Mengen sortiert.
 */
export function stable(v, seen = new WeakSet()) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'number') return num(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'function') return 'fn';
  if (typeof v !== 'object') return String(v);
  if (seen.has(v)) return '[zyklus]';
  seen.add(v);
  if (ArrayBuffer.isView(v)) return '[' + Array.from(v, num).join(',') + ']';
  if (Array.isArray(v)) return '[' + v.map((x) => stable(x, seen)).join(',') + ']';
  if (v instanceof Set) return 'Set[' + [...v].map((x) => stable(x, seen)).sort().join(',') + ']';
  if (v instanceof Map) return 'Map[' + [...v].map(([k, x]) => stable(k, seen) + ':' + stable(x, seen)).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => k + ':' + (HEADING_KEYS.has(k) && typeof v[k] === 'number' ? L(v[k]) : stable(v[k], seen))).join(',') + '}';
}
// Nicht 'dir': das ist bei Kolben ±1 (wächst aus Decke/Boden), keine Blickrichtung.
const HEADING_KEYS = new Set(['heading', 'side', 'autoTurn', 'saveHeading', 'entry']);

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20);

// ------------------------------------------------------------ Zufall
// Der Renderer nutzt Math.random für Wackeln und Funken. Für den Fingerabdruck wird er pro
// Szene durch einen festen Generator ersetzt.
const realRandom = Math.random;
function seedRandom(seed) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const restoreRandom = () => (Math.random = realRandom);

// ------------------------------------------------- Aufzeichnende Canvas
/**
 * Canvas-2D-Attrappe, die jeden Aufruf und jede gesetzte Eigenschaft in einen Hash schreibt und
 * die Transformationsmatrix mitführt (damit getTransform echte Werte liefert und auch die
 * vorgedrehten Hintergrundkacheln gezeichnet werden).
 */
class Recorder {
  constructor() {
    this.h = createHash('sha256');
    this.n = 0;
    this.lines = null; // bei --dump: alle Zeilen
  }
  write(s) {
    this.h.update(s + '\n');
    this.n++;
    if (this.lines) this.lines.push(s);
  }
  digest() {
    return this.h.digest('hex').slice(0, 20) + ':' + this.n;
  }
}

let rec = null; // aktive Aufzeichnung (eine pro Szene)
let canvasIds = 0;

function fmt(a) {
  if (typeof a === 'number') return num(a);
  if (typeof a === 'string') return JSON.stringify(a);
  if (a && a.__fpCanvas) return `canvas(${a.width}x${a.height})`;
  if (a && a.__fpTag) return a.__fpTag;
  if (a && typeof a === 'object' && 'a' in a && 'f' in a) return `matrix(${['a', 'b', 'c', 'd', 'e', 'f'].map((k) => num(a[k])).join(',')})`;
  return typeof a;
}

function makeCtx(name, width, height) {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const log = (s) => rec && rec.write(name + '.' + s);
  const mul = (n) => {
    const [a, b, c, d, e, f] = m;
    m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f];
  };
  const props = {
    canvas: { width, height, __fpCanvas: true },
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: true,
  };
  let grads = 0;
  const own = {
    save() {
      log('save()');
      stack.push({ m: m.slice(), props: { ...props } });
    },
    restore() {
      log('restore()');
      const top = stack.pop();
      if (top) {
        m = top.m;
        Object.assign(props, top.props);
      }
    },
    translate(x, y) {
      log(`translate(${num(x)},${num(y)})`);
      mul([1, 0, 0, 1, x, y]);
    },
    scale(x, y) {
      log(`scale(${num(x)},${num(y)})`);
      mul([x, 0, 0, y, 0, 0]);
    },
    rotate(r) {
      log(`rotate(${num(r)})`);
      const c = Math.cos(r);
      const s = Math.sin(r);
      mul([c, s, -s, c, 0, 0]);
    },
    transform(a, b, c, d, e, f) {
      log(`transform(${[a, b, c, d, e, f].map(num).join(',')})`);
      mul([a, b, c, d, e, f]);
    },
    setTransform(a, b, c, d, e, f) {
      if (typeof a === 'object' && a) ({ a, b, c, d, e, f } = a);
      if (a === undefined) [a, b, c, d, e, f] = [1, 0, 0, 1, 0, 0];
      log(`setTransform(${[a, b, c, d, e, f].map(num).join(',')})`);
      m = [a, b, c, d, e, f];
    },
    resetTransform() {
      log('resetTransform()');
      m = [1, 0, 0, 1, 0, 0];
    },
    getTransform() {
      return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] };
    },
    measureText(s) {
      return { width: String(s).length * 5 };
    },
    createLinearGradient(...args) {
      const tag = `grad${++grads}`;
      log(`createLinearGradient(${args.map(fmt).join(',')})=${tag}`);
      return { __fpTag: tag, addColorStop: (o, c) => log(`${tag}.addColorStop(${fmt(o)},${fmt(c)})`) };
    },
    createRadialGradient(...args) {
      const tag = `grad${++grads}`;
      log(`createRadialGradient(${args.map(fmt).join(',')})=${tag}`);
      return { __fpTag: tag, addColorStop: (o, c) => log(`${tag}.addColorStop(${fmt(o)},${fmt(c)})`) };
    },
    createPattern(img, rep) {
      log(`createPattern(${fmt(img)},${fmt(rep)})`);
      return { __fpTag: `pattern(${fmt(img)})` };
    },
  };
  return new Proxy(props, {
    get(t, k) {
      if (k in own) return own[k];
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      return (...args) => log(`${String(k)}(${args.map(fmt).join(',')})`);
    },
    set(t, k, v) {
      log(`${String(k)}=${fmt(v)}`);
      t[k] = v;
      return true;
    },
  });
}

class FakeOffscreenCanvas {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.__fpCanvas = true;
    this.id = ++canvasIds;
  }
  getContext() {
    return makeCtx('off' + this.id, this.width, this.height);
  }
}

/** Führt fn als eigene Szene aus und liefert den Hash aller Zeichenaufrufe. */
function scene(out, key, seed, fn, dump) {
  rec = new Recorder();
  if (dump) rec.lines = [];
  seedRandom(seed);
  try {
    fn();
  } finally {
    restoreRandom();
  }
  out[key] = rec.digest();
  if (dump) dump[key] = rec.lines;
  rec = null;
}

// -------------------------------------------------------------- Logik
function newGame() {
  const storage = new MemoryStorage();
  const game = new Game({ storage, invincible: true });
  chooseMenu(game, 'Neues Spiel');
  closeDialogs(game);
  return { game, storage };
}

function logicSection(out, dump) {
  for (const skill of [false, true]) {
    const { game } = newGame();
    const trace = [];
    let guard = 0;
    while (game.screen !== 'ending' && guard++ < 200) {
      closeDialogs(game);
      const steps = planToGoal(game, skill);
      if (!steps || !steps.length) {
        trace.push('kein Plan ab ' + game.node);
        break;
      }
      doStep(game, steps[0]);
      trace.push([steps[0].via, game.screen, game.node, L(game.heading), [...game.items].sort().join('+')].join('|'));
    }
    // Abspann und "Weiterspielen"
    for (let k = 0; k < 2000 && game.screen === 'ending'; k++) press(game, { confirm: k % 30 === 0 });
    trace.push('ende|' + stable({ saveNode: game.progress.saveNode, saveHeading: game.progress.saveHeading, finished: game.progress.finished }));
    chooseMenu(game, 'Weiterspielen');
    closeDialogs(game);
    trace.push('weiter|' + game.screen + '|' + game.node + '|' + L(game.heading));
    const key = 'logic:' + (skill ? 'skill' : 'normal');
    out[key] = hash(trace.join('\n')) + ':' + trace.length;
    if (dump) dump[key] = trace;
  }
  for (const skill of [false, true]) {
    const a = analyze(skill);
    const v = [a.graph.seen.size, a.deadEnds.length ?? a.deadEnds.size, a.goalReachable, [...a.reachableNodes].sort().join(','), [...a.reachableItems].sort().join(',')].join('|');
    out['solver:' + (skill ? 'skill' : 'normal')] = hash(v);
    if (dump) dump['solver:' + (skill ? 'skill' : 'normal')] = [v];
  }
}

// ------------------------------------------------------------- Etappen
function stageSection(out, dump) {
  for (const edge of EDGES) {
    for (const forward of [true, false]) {
      if (!forward && edge.oneWay) continue;
      const items = new Set(ITEM_IDS);
      if (forward && edge.reward) items.delete(edge.reward);
      const lv = new Level({ edge, forward, items, invincible: true, seed: 7 });
      const head = stable({ heading: lv.heading, H: lv.H, L: lv.L, zoom: lv.zoom, va: lv.va, vc: lv.vc, swing: lv.swing, wrap: lv.wrap, camC: lv.camC, c: lv.player.c });
      const gen = stable({ gates: lv.gates, events: lv.events, map: lv.map, dyn: lv.dyn });
      runLevel(lv, 6);
      const p = lv.player;
      const after = stable({ a: p.a, c: p.c, hp: p.hp, score: lv.score, kills: lv.stats.kills, enemies: lv.enemies.length, bullets: lv.bullets.length, camA: lv.camA, camC: lv.camC, state: lv.state });
      const key = `stage:${edge.id}:${forward ? 'vor' : 'rueck'}`;
      out[key] = hash(head + '\n' + gen + '\n' + after);
      if (dump) dump[key] = [head, hash(gen), after];
    }
  }
}

// ------------------------------------------------------------ Zeichnen
function renderSection(out, dump) {
  const hadOffscreen = 'OffscreenCanvas' in globalThis;
  const prevOffscreen = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = FakeOffscreenCanvas;
  try {
    const ctx = makeCtx('ctx', 1280, 800);
    const r = new Renderer(ctx);
    const platform = { quit() {}, setFullscreen() {} };

    scene(out, 'render:titel', 1, () => {
      const g = new Game({ storage: new MemoryStorage(), platform });
      r.draw(g);
    }, dump);

    const prepared = () => {
      const g = new Game({ storage: new MemoryStorage(), platform, invincible: true });
      g.startNewGame();
      g.overlay = null;
      g.items = new Set(ITEM_IDS);
      g.progress.visited = EDGES.flatMap((e) => [e.from, e.to]);
      g.progress.knownEdges = EDGES.map((e) => e.id);
      return g;
    };

    // Arenen in allen Blickrichtungen (Ausgänge, Schiffswinkel, Drehscheibe, Rückholung)
    for (const node of ['toast', 'stoepsel', 'kohlenkeller', 'sockenschublade', 'pendel']) {
      for (const h of CARDINALS) {
        scene(out, `render:arena:${node}:${L(h)}`, 2, () => {
          const g = prepared();
          g.placeAt(node, h);
          for (let i = 0; i < 40; i++) g.update(1 / 60, { mx: 1, my: 0.5 });
          r.draw(g, 0.5);
          for (let i = 0; i < 40; i++) g.update(1 / 60, { mx: -0.7, my: -1 });
          r.draw(g, 0.25);
        }, dump);
      }
    }
    // Drehung per Drehwurm und Wendehals mitten in der Animation
    for (const [input, name] of [[{ power: true }, 'drehwurm'], [{ wende: true }, 'wendehals']]) {
      scene(out, `render:arena-drehung:${name}`, 3, () => {
        const g = prepared();
        g.placeAt('toast', E);
        g.update(1 / 60, input);
        for (let i = 0; i < 8; i++) {
          g.update(1 / 60, {});
          r.draw(g, 0.5);
        }
      }, dump);
    }
    // Schiffssymbol dreht über die Nahtstelle Nord → Ost (Umbruch des Winkels)
    scene(out, 'render:arena-drehung:nord-nach-ost', 3, () => {
      const g = prepared();
      g.placeAt('toast', N);
      g.update(1 / 60, { power: true });
      for (let i = 0; i < 10; i++) {
        g.update(1 / 60, {});
        r.draw(g, 0.5);
      }
    }, dump);
    // Karte mit Seitenleiste in jeder Blickrichtung
    for (const h of CARDINALS) {
      scene(out, `render:karte:${L(h)}`, 4, () => {
        const g = prepared();
        g.placeAt('stoepsel', h);
        g.openMap();
        r.draw(g);
      }, dump);
    }
    scene(out, 'render:menues', 5, () => {
      const g = prepared();
      g.placeAt('toast', E);
      g.openPause();
      r.draw(g);
      g.openStation();
      r.draw(g);
      g.openCharacters();
      r.draw(g);
    }, dump);

    // Jede Etappe in jeder Flugrichtung, mehrere Bilder bis zum Ende
    for (const edge of EDGES) {
      for (const forward of [true, false]) {
        if (!forward && edge.oneWay) continue;
        scene(out, `render:etappe:${edge.id}:${forward ? 'vor' : 'rueck'}`, 6, () => {
          const g = prepared();
          g.screen = 'level';
          const items = new Set(ITEM_IDS);
          if (forward && edge.reward) items.delete(edge.reward);
          const lv = new Level({ edge, forward, items, invincible: true, seed: 4 });
          g.level = lv;
          for (let i = 0; i < 6; i++) {
            runLevel(lv, edge.length / 42 / 6 + (edge.boss ? 10 : 0));
            r.draw(g, 0.5);
            if (lv.result) break;
          }
          if (lv.result) rec.write('ergebnis ' + stable(lv.result));
        }, dump);
      }
    }
    // Dunkelzonen ohne Lampe: Umrisse beweglicher Teile, leuchtende Augen. Kolben und Blöcke kommen
    // in v0.2-Dunkelzonen nicht vor – darum werden je einer eingesetzt (waagerecht und senkrecht).
    for (const id of ['treppe', 'pendelbruecke', 'blubberschacht']) {
      for (const forward of [true, false]) {
        scene(out, `render:dunkel:${id}:${forward ? 'vor' : 'rueck'}`, 9, () => {
          const g = prepared();
          g.screen = 'level';
          const edge = EDGES.find((e) => e.id === id);
          const items = new Set(ITEM_IDS);
          items.delete('LAMPE');
          if (forward && edge.reward) items.delete(edge.reward);
          const lv = new Level({ edge, forward, items, invincible: true, seed: 4 });
          g.level = lv;
          const dark = lv.gates.find((x) => x.type === 'dark');
          for (let i = 0; i < 60 * 120 && lv.player.a < dark.a0 + 60 && !lv.result; i++) runLevel(lv, 1 / 60);
          const a = lv.player.a;
          lv.dyn.push(
            { type: 'piston', a: a + 80, c: lv.camC + lv.vc * 0.3, dir: 1, w: 26, len: 120, speed: 1.1, phase: 0.4, sign: 1 },
            { type: 'mover', a: a + 160, c: lv.camC + lv.vc * 0.6, w: 32, h: 40, amp: 50, speed: 0.8, phase: 1, sign: 1 },
          );
          for (let i = 0; i < 3; i++) {
            runLevel(lv, 1 / 60, { input: () => ({}) });
            r.draw(g, 0.5);
          }
        }, dump);
      }
    }
    // Kehrtwende mitten in der Etappe (Bild dreht sich)
    scene(out, 'render:etappe-kehrtwende', 7, () => {
      const g = prepared();
      g.screen = 'level';
      const edge = EDGES.find((e) => e.id === 'schaumbad');
      const lv = new Level({ edge, forward: true, items: new Set(['WENDEHALS']), invincible: true, seed: 4 });
      g.level = lv;
      runLevel(lv, 8);
      lv.update(1 / 60, { wende: true });
      for (let i = 0; i < 6; i++) {
        runLevel(lv, 0.15, { input: () => ({}) });
        r.draw(g, 0.5);
      }
    }, dump);
    // Abspann
    scene(out, 'render:abspann', 8, () => {
      const g = prepared();
      g.startEnding();
      for (let i = 0; i < 12; i++) {
        g.ending.line = i;
        g.ending.done = i >= 9;
        r.draw(g);
      }
    }, dump);
  } finally {
    if (hadOffscreen) globalThis.OffscreenCanvas = prevOffscreen;
    else delete globalThis.OffscreenCanvas;
  }
}

/** Kompletter Fingerabdruck: { abschnitt: hash }. Mit dump = {} werden alle Rohdaten gesammelt. */
export function fingerprint(dump = null) {
  const out = {};
  logicSection(out, dump);
  stageSection(out, dump);
  renderSection(out, dump);
  return out;
}
