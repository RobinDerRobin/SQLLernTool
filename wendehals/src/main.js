// Einstiegspunkt im Browser / in Electron: Canvas, Spielschleife, Eingabe, Audio.

import { Game } from './game/game.js';
import { Renderer } from './render/renderer.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { MemoryStorage } from './game/save.js';
import { SCREEN_W, SCREEN_H } from './core/math.js';

const STEP = 1 / 60;

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
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const game = new Game({ storage: pickStorage(), platform: makePlatform(), invincible: params.has('unverwundbar') });
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
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    scale = Math.min(w / SCREEN_W, h / SCREEN_H) * dpr;
    offX = (canvas.width - SCREEN_W * scale) / 2;
    offY = (canvas.height - SCREEN_H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let acc = 0;
  let errors = 0;
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    try {
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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offX, offY);
      renderer.draw(game);
    } catch (err) {
      // Fehler protokollieren, aber das Spiel nicht einfrieren lassen
      errors++;
      console.error(err);
      if (errors > 100) throw err;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Für automatische Tests
  window.__wendehals = { game, input, audio };
  return game;
}

boot();
