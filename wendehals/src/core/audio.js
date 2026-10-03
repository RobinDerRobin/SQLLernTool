// Synthetische Soundeffekte und Chiptune-Musik mit WebAudio – keine Audiodateien nötig.
// Startet erst nach der ersten Benutzereingabe (Browser-Autoplay-Regeln).

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(tok) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
  if (!m) return null;
  let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (Number(m[3]) + 1) * 12;
}

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Jede Spur: tempo (Achtel pro Minute), lead/bass als Tokenfolgen (je Token eine Achtel, '.' = Pause),
// drums: k = Kick, s = Snare, h = Hi-Hat, '.' = nichts.
const TRACKS = {
  title: {
    tempo: 300,
    wave: 'square',
    lead: 'C5 E5 G5 C6 B5 G5 E5 G5 A5 . F5 A5 C6 . A5 F5 G5 . E5 G5 C6 . G5 E5 D5 F5 A5 B5 C6 . . .',
    bass: 'C3 . G3 . C3 . G3 . F3 . C4 . F3 . C4 . C3 . G3 . C3 . G3 . G2 . D3 . G2 . B2 .',
    drums: 'k.h.s.h.k.h.s.h.k.h.s.h.k.h.s.hs',
  },
  map: {
    tempo: 220,
    wave: 'triangle',
    lead: 'E5 . G5 . A5 . G5 E5 D5 . E5 . C5 . . . E5 . G5 . A5 . C6 A5 G5 . E5 . D5 . . .',
    bass: 'C3 . . . G2 . . . A2 . . . E2 . . . F2 . . . C3 . . . G2 . . . G2 . . .',
    drums: 'k...h...k...h...k...h...k...h.h.',
  },
  fruehstueck: {
    tempo: 320,
    wave: 'square',
    lead: 'G5 . E5 . G5 . E5 . F5 G5 A5 G5 F5 . D5 . F5 . D5 . F5 . D5 . E5 F5 G5 F5 E5 . C5 .',
    bass: 'C3 G3 C3 G3 C3 G3 C3 G3 G2 D3 G2 D3 G2 D3 G2 D3 G2 D3 G2 D3 G2 D3 G2 D3 C3 G3 C3 G3 C3 G3 C3 G3',
    drums: 'k.s.k.s.k.s.k.s.k.s.k.s.k.s.kss.',
  },
  bad: {
    tempo: 260,
    wave: 'triangle',
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 D4 F4 A4 D5 C5 A4 F4 A4 E4 G#4 B4 E5 D5 B4 G#4 B4',
    bass: 'A2 . . . A2 . . . F2 . . . F2 . . . D2 . . . D2 . . . E2 . . . E2 . . .',
    drums: 'k..hs..hk..hs..hk..hs..hk..hs.hh',
  },
  keller: {
    tempo: 200,
    wave: 'sawtooth',
    lead: 'D5 . . F5 E5 . . D5 C#5 . . E5 D5 . . . D5 . . F5 E5 . . G5 F5 . E5 . D5 . . .',
    bass: 'D2 . D2 . D2 . D2 . A1 . A1 . D2 . D2 . Bb1 . Bb1 . G1 . G1 . A1 . A1 . D2 . . .',
    drums: 'k.......s.......k.......s...s...',
  },
  disco: {
    tempo: 340,
    wave: 'square',
    lead: 'E5 E5 . E5 G5 . E5 . D5 D5 . D5 F#5 . D5 . C#5 C#5 . C#5 E5 . C#5 . B4 . D5 . E5 . F#5 .',
    bass: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 C#2 C#3 C#2 C#3 C#2 C#3 C#2 C#3 B1 B2 B1 B2 B1 B2 B1 B2',
    drums: 'khshkhshkhshkhshkhshkhshkhshkhss',
  },
  uhrwerk: {
    tempo: 280,
    wave: 'triangle',
    lead: 'B5 . G5 . B5 . G5 . A5 B5 A5 G5 F#5 . D5 . G5 . E5 . G5 . E5 . F#5 G5 F#5 E5 D5 . . .',
    bass: 'G2 . D3 . G2 . D3 . D2 . A2 . D2 . A2 . E2 . B2 . C3 . G2 . D2 . A2 . D2 . . .',
    drums: 'h.h.k.h.h.h.k.h.h.h.k.h.h.h.kkh.',
  },
  boss: {
    tempo: 360,
    wave: 'sawtooth',
    lead: 'E5 . E5 F5 E5 . D5 . E5 . E5 F5 G5 . F5 . E5 . E5 F5 E5 . D5 . C5 . D5 . B4 . . .',
    bass: 'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 C2 C2 C3 C2 C2 C2 C3 C2 B1 B1 B2 B1 B1 B1 B2 B1',
    drums: 'kshskshskshskshskshskshskshsksss',
  },
  ending: {
    tempo: 180,
    wave: 'triangle',
    lead: 'C5 . E5 . G5 . . . F5 . A5 . C6 . . . B5 . G5 . E5 . D5 . C5 . . . . . . .',
    bass: 'C3 . . . . . . . F2 . . . . . . . G2 . . . . . . . C3 . . . . . . .',
    drums: 'k.......h.......k.......h.......',
  },
};

function parse(seq) {
  return seq.split(/\s+/).filter(Boolean).map((t) => (t === '.' ? null : midi(t)));
}

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.track = null;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.lastSfx = {};
    this.settings = { music: 0.6, sfx: 0.8 };
  }

  /** Muss aus einem Eingabe-Ereignis heraus aufgerufen werden. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      this.ctx = null;
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.applySettings(this.settings);
  }

  applySettings(s) {
    this.settings = { music: s.music, sfx: s.sfx };
    if (!this.ctx) return;
    this.musicGain.gain.value = s.music * 0.35;
    this.sfxGain.gain.value = s.sfx * 0.6;
  }

  tone(type, f0, f1, dur, vol = 0.3, when = 0, dest = this.sfxGain) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.3, filterFreq = 2000, when = 0, dest = this.sfxGain) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.settings.sfx <= 0) return;
    // Gleiche Effekte nicht öfter als alle 40 ms
    const now = this.ctx.currentTime;
    if (this.lastSfx[name] && now - this.lastSfx[name] < 0.04) return;
    this.lastSfx[name] = now;
    switch (name) {
      case 'shoot':
        this.tone('square', 900, 500, 0.06, 0.08);
        break;
      case 'laser':
        this.tone('sawtooth', 1400, 300, 0.12, 0.08);
        break;
      case 'pop':
        this.noise(0.12, 0.25, 1800);
        this.tone('square', 300, 80, 0.1, 0.12);
        break;
      case 'boom':
        this.noise(0.4, 0.4, 900);
        break;
      case 'hit':
        this.tone('square', 220, 180, 0.04, 0.1);
        break;
      case 'pling':
        this.tone('triangle', 2400, 2200, 0.08, 0.1);
        break;
      case 'drill':
        this.noise(0.05, 0.15, 4000);
        break;
      case 'crack':
        this.noise(0.25, 0.35, 1200);
        this.tone('square', 150, 60, 0.2, 0.15);
        break;
      case 'capsule':
        this.tone('square', 660, 660, 0.06, 0.12);
        this.tone('square', 990, 990, 0.08, 0.12, 0.06);
        break;
      case 'power':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.08, 0.12, i * 0.05));
        break;
      case 'nope':
        this.tone('square', 200, 150, 0.12, 0.1);
        break;
      case 'hurt':
        this.tone('sawtooth', 400, 80, 0.3, 0.25);
        break;
      case 'shield':
        this.tone('triangle', 1200, 400, 0.2, 0.2);
        break;
      case 'death':
        this.tone('sawtooth', 600, 40, 1.0, 0.3);
        this.noise(0.8, 0.3, 700);
        break;
      case 'quietsch':
        this.tone('square', 1500, 2400, 0.08, 0.1);
        this.tone('square', 2400, 1500, 0.08, 0.1, 0.08);
        break;
      case 'item':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.2, i * 0.09));
        break;
      case 'clear':
        [392, 523, 659, 784].forEach((f, i) => this.tone('square', f, f, 0.12, 0.12, i * 0.08));
        break;
      case 'bossalarm':
        for (let i = 0; i < 4; i++) this.tone('square', 880, 440, 0.2, 0.12, i * 0.25);
        break;
      case 'bossdown':
        this.noise(1.6, 0.45, 600);
        this.tone('sawtooth', 300, 30, 1.6, 0.2);
        break;
      case 'ring':
        for (let i = 0; i < 8; i++) this.tone('square', 1800, 1700, 0.04, 0.08, i * 0.05);
        break;
      case 'gluck':
        this.tone('sine', 300, 600, 0.12, 0.2);
        break;
      case 'quak':
        this.tone('sawtooth', 500, 350, 0.15, 0.15);
        break;
      case 'warn':
        this.tone('square', 700, 700, 0.1, 0.1);
        this.tone('square', 500, 500, 0.1, 0.1, 0.12);
        break;
      case 'wende':
      case 'turn':
        this.tone('triangle', 300, 900, 0.18, 0.15);
        break;
      case 'warp':
        this.tone('sine', 200, 1600, 0.4, 0.2);
        break;
      case 'launch':
        this.tone('sawtooth', 150, 600, 0.35, 0.15);
        break;
      case 'tick':
        this.tone('square', 1000, 1000, 0.025, 0.06);
        break;
      case 'confirm':
        this.tone('square', 700, 1100, 0.07, 0.1);
        break;
      case 'back':
        this.tone('square', 600, 400, 0.07, 0.1);
        break;
      case 'pause':
        this.tone('triangle', 800, 400, 0.1, 0.1);
        break;
    }
  }

  setTrack(name) {
    if (name === this.trackName) return;
    this.trackName = name;
    const tr = TRACKS[name];
    if (!tr) {
      this.track = null;
      return;
    }
    this.track = { ...tr, lead: parse(tr.lead), bass: parse(tr.bass), drums: tr.drums.split('') };
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05;
  }

  /** Plant Noten im Voraus (Lookahead-Scheduler). Einmal pro Frame aufrufen. */
  update() {
    if (!this.ctx || !this.track || this.settings.music <= 0) return;
    const tr = this.track;
    const stepDur = 60 / tr.tempo;
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const when = this.nextTime - this.ctx.currentTime;
      const i = this.step;
      const n = tr.lead[i % tr.lead.length];
      if (n) this.tone(tr.wave, freq(n), freq(n), stepDur * 0.9, 0.16, when, this.musicGain);
      const b = tr.bass[i % tr.bass.length];
      if (b) this.tone('triangle', freq(b), freq(b), stepDur * 0.95, 0.3, when, this.musicGain);
      const d = tr.drums[i % tr.drums.length];
      if (d === 'k') this.tone('sine', 150, 40, 0.12, 0.5, when, this.musicGain);
      else if (d === 's') this.noise(0.1, 0.25, 3000, when, this.musicGain);
      else if (d === 'h') this.noise(0.03, 0.12, 8000, when, this.musicGain);
      this.step++;
      this.nextTime += stepDur;
    }
  }
}

export { TRACKS, parse };
