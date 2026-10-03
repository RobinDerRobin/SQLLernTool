import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/input.js';

function fakeTarget() {
  const handlers = {};
  return {
    addEventListener: (type, fn) => ((handlers[type] ||= []).push(fn)),
    fire: (type, code, repeat = false) => (handlers[type] || []).forEach((fn) => fn({ code, repeat, preventDefault() {} })),
  };
}

test('zwei Tasten für dieselbe Aktion: eine loslassen beendet die Aktion nicht', () => {
  const t = fakeTarget();
  const inp = new Input(t);
  t.fire('keydown', 'ArrowUp');
  t.fire('keydown', 'KeyW');
  inp.poll();
  t.fire('keyup', 'KeyW');
  const p = inp.poll();
  assert.equal(p.my, -1, 'hoch muss weiter gehalten sein');
});

test('kurzer Tastendruck zwischen zwei Frames geht nicht verloren', () => {
  const t = fakeTarget();
  const inp = new Input(t);
  t.fire('keydown', 'Space');
  t.fire('keyup', 'Space');
  const p = inp.poll();
  assert.equal(p.confirm, true);
  assert.equal(inp.poll().confirm, false);
});

test('Stick-Drift um 0,6 erzeugt keine Flut von Menüschritten (Hysterese)', () => {
  const t = fakeTarget();
  const inp = new Input(t);
  const pad = { connected: true, buttons: [], axes: [0, 0] };
  const orig = navigator.getGamepads;
  navigator.getGamepads = () => [pad];
  try {
    let presses = 0;
    for (let i = 0; i < 60; i++) {
      pad.axes[1] = i % 2 ? 0.62 : 0.55; // zittert um die Schwelle
      if (inp.poll().down) presses++;
    }
    assert.equal(presses, 1);
    pad.axes[1] = 0;
    inp.poll();
    pad.axes[1] = 0.9;
    assert.equal(inp.poll().down, true, 'nach echtem Loslassen wieder auslösbar');
  } finally {
    navigator.getGamepads = orig;
  }
});
