// Eingabe: Tastatur + Gamepad (Standard-Mapping, z. B. Xbox-Controller und Steam Deck).
// Liefert pro Frame ein Objekt mit Analogrichtung, gehaltenen Tasten und "gerade gedrückt"-Flanken.

const KEYMAP = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyJ: 'fire',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyK: 'power',
  ShiftLeft: 'power',
  ShiftRight: 'power',
  KeyL: 'wende',
  KeyQ: 'wende',
  Escape: 'pause',
  KeyP: 'pause',
  Backspace: 'back',
  KeyX: 'station',
  KeyC: 'station',
  KeyM: 'map',
  KeyE: 'espresso',
  KeyU: 'rotLeft',
  KeyO: 'rotRight',
  Tab: 'map',
  F11: 'fullscreen',
};

// Standard-Gamepad: 0=A 1=B 2=X 3=Y 8=Back/View (Karte) 9=Start/Menü 12-15=Steuerkreuz
const PADMAP = {
  0: 'fire',
  1: 'power',
  2: 'station',
  3: 'wende',
  4: 'rotLeft',
  5: 'espresso',
  8: 'map',
  9: 'pause',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

const ACTIONS = ['up', 'down', 'left', 'right', 'fire', 'confirm', 'power', 'wende', 'pause', 'back', 'station', 'map', 'espresso', 'rotLeft', 'rotRight', 'fullscreen'];
const DEADZONE = 0.28;

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    // Kurze Tastendrücke zwischen zwei Frames sollen nicht verloren gehen.
    this.tapped = new Set();
    this.prev = {};
    this.usingPad = false;
    this.stickLatch = { up: false, down: false, left: false, right: false };
    target.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (a) {
        e.preventDefault();
        if (!e.repeat) this.tapped.add(a);
        this.keys.add(e.code);
        this.usingPad = false;
      }
    });
    target.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.keys.delete(e.code);
    });
    target.addEventListener('blur', () => this.keys.clear());
  }

  poll() {
    const held = {};
    // Tasten werden als Codes gemerkt: Pfeil hoch halten und W loslassen beendet "hoch" nicht.
    for (const a of ACTIONS) held[a] = this.tapped.has(a);
    for (const code of this.keys) held[KEYMAP[code]] = true;
    // Jedes neue keydown (ohne Wiederholung) zählt als frischer Druck.
    for (const a of this.tapped) this.prev[a] = false;
    this.tapped.clear();
    let mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let my = (held.down ? 1 : 0) - (held.up ? 1 : 0);

    let pads = [];
    try {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) pads = navigator.getGamepads();
    } catch {
      /* Gamepad per Berechtigungsrichtlinie gesperrt (z. B. eingebettetes Fenster): nur Tastatur */
    }
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      pad.buttons.forEach((b, i) => {
        const a = PADMAP[i];
        if (a && (b.pressed || b.value > 0.5)) {
          held[a] = true;
          this.usingPad = true;
        }
      });
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      if (Math.hypot(ax, ay) > DEADZONE) {
        mx = ax;
        my = ay;
        this.usingPad = true;
      }
      // Stick auch für Menüs: als Richtungstaste werten, mit Hysterese (an ab 0,6, aus unter 0,4),
      // damit ein leicht driftender Stick (Steam Deck) keine Flut von Menüschritten erzeugt.
      const l = this.stickLatch;
      l.left = ax < -0.6 || (l.left && ax < -0.4);
      l.right = ax > 0.6 || (l.right && ax > 0.4);
      l.up = ay < -0.6 || (l.up && ay < -0.4);
      l.down = ay > 0.6 || (l.down && ay > 0.4);
      for (const d of ['left', 'right', 'up', 'down']) if (l[d]) held[d] = true;
      if (Math.hypot(ax, ay) <= DEADZONE && (held.left || held.right || held.up || held.down)) {
        mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        my = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const pressed = (a) => held[a] && !this.prev[a];
    const out = {
      mx,
      my,
      fire: held.fire,
      espresso: !!held.espresso,
      firePressed: pressed('fire'),
      confirm: pressed('confirm') || pressed('fire'),
      back: pressed('back') || pressed('power'),
      pause: pressed('pause'),
      power: pressed('power'),
      wende: pressed('wende'),
      rotLeft: pressed('rotLeft'),
      rotRight: pressed('rotRight'),
      espressoPressed: pressed('espresso'),
      station: pressed('station'),
      map: pressed('map'),
      fullscreen: pressed('fullscreen'),
      up: pressed('up'),
      down: pressed('down'),
      left: pressed('left'),
      right: pressed('right'),
    };
    this.prev = held;
    return out;
  }
}
