// Einstiegspunkt im Browser / in Electron: Canvas, Spielschleife, Eingabe, Audio.

import { Game } from './game/game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { MemoryStorage } from './game/save.js';
import { SCREEN_W, SCREEN_H } from './core/math.js';

const STEP = 1 / 60;
// Höchstens so viele echte Pixel pro interner Einheit (480x270). Schützt vor riesigen
// Backbuffern auf 4K-Bildschirmen; darüber skaliert der Browser per CSS.
const MAX_PIXEL_SCALE = 3;

/** Ringpuffer mit Frame-Messwerten für Performance-Tests (window.__wendehals.perf). */
export class PerfStats {
  constructor(size = 600) {
    this.size = size;
    this.frame = new Float32Array(size);
    this.update = new Float32Array(size);
    this.draw = new Float32Array(size);
    this.count = 0;
  }
  push(frameMs, updateMs, drawMs) {
    const i = this.count % this.size;
    this.frame[i] = frameMs;
    this.update[i] = updateMs;
    this.draw[i] = drawMs;
    this.count++;
  }
  reset() {
    this.count = 0;
  }
  summary() {
    const n = Math.min(this.count, this.size);
    const pick = (arr) => Array.from(arr.subarray(0, n)).sort((a, b) => a - b);
    const q = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0);
    const work = pick(this.update.map((u, i) => u + this.draw[i]));
    const frames = pick(this.frame);
    return {
      n,
      workP50: q(work, 0.5),
      workP95: q(work, 0.95),
      workMax: q(work, 1),
      frameP50: q(frames, 0.5),
      frameP95: q(frames, 0.95),
      frameMax: q(frames, 1),
      frames50: frames.filter((f) => f > 50).length,
    };
  }
}

function pickStorage() {
  try {
    const k = '__wendehals_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

function makePlatform() {
  const native = window.wendehalsNative; // aus electron/preload.cjs
  const platform = {};
  if (native && native.quit) platform.quit = () => native.quit();
  platform.setFullscreen = (on) => {
    if (native && native.setFullscreen) return native.setFullscreen(on);
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.();
      if (!on && document.fullscreenElement) document.exitFullscreen?.();
    } catch {
      /* Vollbild nicht erlaubt */
    }
  };
  return platform;
}

export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const game = new Game({ storage: pickStorage(), platform: makePlatform(), invincible: params.has('unverwundbar') });
  // P1-Build: Start direkt im Prototyp. `?spiel` öffnet das alte v0.2-Spiel (Titelmenü) direkt.
  // Vor dem Übernehmen eines späteren Prototyps oder zurück zu v0.2 wird das wieder umgestellt.
  if (!params.has('spiel')) game.startProto('fenster');
  const renderer = new Renderer(ctx);
  const input = new Input(window);
  const audio = new Audio();
  audio.applySettings(game.settings);

  const unlock = () => audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('gamepadconnected', unlock);

  let scale = 1;
  let offX = 0;
  let offY = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const fit = Math.min(w / SCREEN_W, h / SCREEN_H) * dpr;
    // Backbuffer begrenzen: bei sehr hoher Auflösung wird mit weniger Pixeln gerendert.
    const limit = fit > MAX_PIXEL_SCALE ? MAX_PIXEL_SCALE / fit : 1;
    canvas.width = Math.round(w * dpr * limit);
    canvas.height = Math.round(h * dpr * limit);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    scale = fit * limit;
    offX = (canvas.width - SCREEN_W * scale) / 2;
    offY = (canvas.height - SCREEN_H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  const perf = new PerfStats();
  let last = performance.now();
  let acc = 0;
  let errors = 0;
  function frame(now) {
    const frameMs = now - last;
    acc += Math.min(0.25, frameMs / 1000);
    last = now;
    try {
      const t0 = performance.now();
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        const inp = input.poll();
        if (inp.confirm || inp.firePressed) unlock();
        game.update(STEP, inp);
        for (const s of game.sfxQueue) audio.play(s);
        game.sfxQueue.length = 0;
        acc -= STEP;
        steps++;
      }
      if (steps === 5) acc = 0;
      audio.applySettings(game.settings);
      audio.setTrack(game.musicTrack);
      audio.update();
      const t1 = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offX, offY);
      // alpha: Anteil bis zum nächsten Simulationsschritt – für flüssige Darstellung auf 90/120/144 Hz
      // Bei offenem Menü steht die Simulation: nicht interpolieren (sonst zittert das Bild)
      renderer.draw(game, game.overlay ? 1 : acc / STEP);
      perf.push(frameMs, t1 - t0, performance.now() - t1);
      errors = 0;
    } catch (err) {
      // Fehler protokollieren, aber die Schleife nie abbrechen (sonst friert das Spiel ein).
      // Wiederholte Fehler nur gedrosselt ausgeben.
      if (errors++ % 300 === 0) console.error(err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Für automatische Tests
  window.__wendehals = { game, input, audio, perf, renderer };
  return game;
}

boot();
