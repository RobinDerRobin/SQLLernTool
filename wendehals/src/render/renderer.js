// Zeichnet den Spielzustand. Alle Koordinaten in der internen Auflösung 480x270.

import { SCREEN_W, SCREEN_H, wrapDelta, DIR_NAMES, DIR_VEC } from '../core/math.js';
import { NODES, EDGES, AREAS } from '../data/world.js';
import { ITEMS, GATES } from '../data/items.js';
import { THEMES } from '../data/themes.js';
import { CHARACTERS } from '../data/characters.js';
import { ENDING_LINES } from '../data/text.js';
import { POWER_LABELS, slotAvailable } from '../game/powerups.js';
import { linkAt, directionAllowed, requiredItems } from '../game/worldgraph.js';
import { BOSSES } from '../game/bosses.js';
import {
  circle,
  rrect,
  ellipse,
  drawPlayer,
  drawOption,
  drawShot,
  drawBullet,
  drawEnemy,
  drawBoss,
  drawHazard,
  drawCapsule,
  drawGear,
  drawDackel,
} from './sprites.js';
import { cached, fillTiled, fillTiledScreen, drawWithFlash } from './canvas.js';

const FONT = "'Trebuchet MS', 'Segoe UI', 'DejaVu Sans', Verdana, sans-serif";
const W = SCREEN_W;
const H = SCREEN_H;

function font(size, bold = true) {
  return `${bold ? 'bold ' : ''}${size}px ${FONT}`;
}

function text(ctx, str, x, y, size, color, align = 'center', outline = '#1a1020', bold = true) {
  ctx.font = font(size, bold);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2, size / 4);
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Bricht Text in Zeilen um, die in maxW passen. */
function wrapLines(ctx, str, maxW, size) {
  ctx.font = font(size, false);
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur || !lines.length) lines.push(cur);
  return lines;
}

function panel(ctx, x, y, w, h, alpha = 0.88) {
  rrect(ctx, x, y, w, h, 8, `rgba(28,18,44,${alpha})`, '#ffd34d', 1.5);
}

/**
 * Eine Stachelreihe quer zur Flugrichtung mit einer Lücke bei gy (periodisch mit H).
 * Die Zacken sind an den Lückenkanten verankert und füllen jedes Stück exakt aus –
 * so ragt nichts in die Lücke, und Optik und Kollision stimmen überein.
 */
export function drawSpikeColumn(ctx, x, gy, half, H, vc) {
  const lo = -20;
  const hi = vc + 20;
  for (let k = -1; k <= 0; k++) {
    const start = gy + k * H + half; // Ende einer Lücke
    const end = gy + (k + 1) * H - half; // Anfang der nächsten Lücke
    const s0 = Math.max(start, lo);
    const s1 = Math.min(end, hi);
    if (s1 <= s0) continue;
    const n = Math.max(1, Math.round((end - start) / 8));
    const step = (end - start) / n;
    ctx.fillStyle = '#5a4a6a';
    ctx.fillRect(x - 2, s0, 4, s1 - s0);
    ctx.fillStyle = '#dfe6f0';
    ctx.beginPath();
    const first = Math.max(0, Math.floor((s0 - start) / step));
    for (let i = first; i < n; i++) {
      const y = start + i * step;
      if (y > s1) break;
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x - 8, y + step / 2);
      ctx.lineTo(x - 2, y + step);
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + 8, y + step / 2);
      ctx.lineTo(x + 2, y + step);
    }
    ctx.fill();
  }
  // Lücke dezent markieren
  ctx.strokeStyle = 'rgba(120,255,140,0.6)';
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x, gy - half + 2);
  ctx.lineTo(x, gy + half - 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Kugeln als vorgerenderte Bilder: viele gleiche, kleine Objekte – drawImage ist deutlich
 * günstiger als Kreise mit Transparenz. Drehung (Zucker, Pommes) per Transformation.
 */
const ROTATING_BULLETS = { zucker: 'spin', pommes: 'velocity' };
function drawBulletCached(ctx, b, t) {
  const r = b.r || 3;
  const size = Math.ceil(r * 2 + 12);
  const img = cached('bullet:' + b.kind + ':' + r, size, size, 3, (c) => {
    c.translate(size / 2, size / 2);
    // Dunkler Hof: Gegnerkugeln heben sich auf jedem Hintergrund ab (auch auf hellem Karo)
    c.fillStyle = 'rgba(30,10,40,0.55)';
    c.beginPath();
    c.arc(0, 0, r + 3.5, 0, Math.PI * 2);
    c.fill();
    drawBullet(c, { kind: b.kind, r, va: 1, vc: 0 }, 0);
  });
  if (!img) return drawBullet(ctx, b, t);
  const rot = ROTATING_BULLETS[b.kind];
  // Runde Kugeln aufrecht (achsenparallel) zeichnen: gedrehte Bilder sind teuer zu rastern.
  if (!rot && typeof ctx.getTransform === 'function') {
    const m = ctx.getTransform();
    const sc = Math.hypot(m.a, m.b);
    ctx.setTransform(sc, 0, 0, sc, m.e, m.f);
  } else if (rot === 'spin') ctx.rotate(t * 5);
  else if (rot === 'velocity') ctx.rotate(Math.atan2(b.vc, b.va));
  ctx.drawImage(img.canvas, -size / 2, -size / 2, size, size);
}

/** Vorgerenderte, kachelbare Grundmuster der Gebiete. */
function backgroundTile(pattern) {
  switch (pattern) {
    case 'tischdecke': {
      const e = cached('bg:tischdecke', 64, 64, 2, (c) => {
        c.fillStyle = 'rgba(208,69,58,0.22)';
        c.fillRect(0, 0, 32, 32);
        c.fillRect(32, 32, 32, 32);
      });
      if (e) e.parallax = 0.5;
      return e;
    }
    case 'fliesen': {
      const e = cached('bg:fliesen', 28, 28, 2, (c) => {
        c.strokeStyle = 'rgba(255,255,255,0.45)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0.75, 0);
        c.lineTo(0.75, 28);
        c.moveTo(0, 0.75);
        c.lineTo(28, 0.75);
        c.stroke();
      });
      if (e) e.parallax = 0.5;
      return e;
    }
    case 'ziegel': {
      const e = cached('bg:ziegel', 34, 28, 2, (c) => {
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.lineWidth = 1;
        c.fillStyle = 'rgba(120,80,90,0.25)';
        for (const [x, y] of [[0, 0], [-17, 14], [17, 14]]) {
          c.fillRect(x + 1, y + 1, 32, 12);
          c.strokeRect(x + 1, y + 1, 32, 12);
        }
      });
      if (e) e.parallax = 0.5;
      return e;
    }
    case 'tanzboden': {
      const e = cached('bg:tanzboden', 40, 40, 2, (c) => {
        c.fillStyle = 'rgba(255,255,255,0.04)';
        c.fillRect(2, 2, 36, 36);
      });
      if (e) e.parallax = 0.6;
      return e;
    }
    default:
      return null;
  }
}

/** Dunkelmaske: einmal gerendert, danach nur noch verschoben (statt Verlauf in jedem Frame). */
function darknessMask(radius) {
  const r = Math.round(radius / 10) * 10;
  const w = W * 2 + r * 2;
  const h = H * 2 + r * 2;
  return cached('dark' + r, w, h, 0.5, (c) => {
    const g = c.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
    g.addColorStop(0, 'rgba(5,3,10,0)');
    g.addColorStop(1, 'rgba(5,3,10,0.96)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(game, alpha = 1) {
    const ctx = this.ctx;
    this.alpha = alpha;
    this.devW = ctx.canvas ? ctx.canvas.width : 2000;
    this.devH = ctx.canvas ? ctx.canvas.height : 2000;
    this.reducedEffects = !!game.settings.reducedEffects;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    switch (game.screen) {
      case 'title':
        this.drawTitle(game);
        break;
      case 'map':
        this.drawMap(game);
        break;
      case 'level':
        this.drawLevel(game, game.level);
        break;
      case 'ending':
        this.drawEnding(game);
        break;
    }
    this.drawToasts(game);
    if (game.overlay) {
      ctx.fillStyle = 'rgba(10,5,20,0.45)';
      ctx.fillRect(0, 0, W, H);
      if (game.overlay.type === 'menu') this.drawMenu(game, game.overlay);
      else this.drawDialog(game.overlay, game.time);
    }
    ctx.restore();
  }

  // ============================================================== LEVEL
  drawLevel(game, lv) {
    const ctx = this.ctx;
    const t = lv.time;
    const theme = THEMES[lv.edge.theme];
    ctx.fillStyle = theme.bg[1];
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    const shake = game.settings.shake ? lv.shakeAmt : 0;
    if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const ang = lv.viewAngle();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(ang);
    ctx.translate(-lv.va / 2, -lv.vc / 2);
    this.lv = lv;
    this.setCamera(lv);
    // Etwas größer zeichnen, damit bei der Drehanimation keine Ränder sichtbar werden
    const pad = lv.turnAnim ? 140 : 0;
    this.drawBackground(theme, lv, t, pad);
    this.drawGates(lv, t);
    for (const pk of lv.pickups) this.at(pk.a, pk.c, () => drawCapsule(ctx, pk.t));
    for (const e of lv.enemies) {
      this.atObj(e, () => {
        if (e.flash > 0) drawWithFlash(ctx, e.r + 6, 0.8, (c) => drawEnemy(c, e, t));
        else drawEnemy(ctx, e, t);
      });
    }
    if (lv.boss) {
      const kind = lv.boss.kind;
      for (const h of lv.hazards) this.at(h.a, h.c, () => drawHazard(ctx, h, t, kind));
      const b = lv.boss;
      this.atObj(b, () => {
        if (b.flash > 0) drawWithFlash(ctx, b.r + 24, 0.6, (c) => drawBoss(c, b, t));
        else drawBoss(ctx, b, t);
      });
    }
    for (const s of lv.shots) this.atObj(s, () => drawShot(ctx, s, lv.charId));
    for (const b of lv.bullets) this.atObj(b, () => drawBulletCached(ctx, b, t));
    const p = lv.player;
    if (lv.state !== 'dead') {
      for (const [oa, oc] of lv.optionPositions()) this.at(oa, oc, () => drawOption(ctx, lv.charId, t));
      this.atObj(p, () => {
        if (lv.powers.shield > 0) {
          circle(ctx, 0, 0, lv.small ? 9 : 16, `rgba(90,200,255,${0.15 + 0.08 * lv.powers.shield})`, 'rgba(160,230,255,0.8)', 1);
        }
        const spin = lv.playerSpin();
        if (spin) ctx.rotate(spin);
        drawPlayer(ctx, lv.charId, t, lv.small, p.inv);
      });
    }
    for (const pt of lv.particles) {
      const k = 1 - pt.t / pt.life;
      this.atObj(pt, () => {
        ctx.globalAlpha = Math.max(0, k);
        ctx.fillStyle = pt.color;
        ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
        ctx.globalAlpha = 1;
      });
    }
    this.drawNarrowArrows(lv, t);
    ctx.restore();

    this.drawDarkness(game, lv);
    if (lv.hurtFlash > 0) this.drawHurtVignette(lv.hurtFlash / 0.45);
    for (const pp of lv.popups) {
      const [sx, sy] = this.toScreen(lv, pp.a, pp.c);
      text(ctx, pp.text, sx, sy - pp.t * 20, 9, '#fff3a0');
    }
    this.drawHud(game, lv);
  }

  /** Kamera zwischen zwei Simulationsschritten interpolieren. */
  setCamera(lv) {
    const k = this.alpha;
    this.camA = lv.turnAnim ? lv.displayCamA() : lv.pCamA === undefined ? lv.camA : lv.pCamA + (lv.camA - lv.pCamA) * k;
    this.camC = lv.pCamC === undefined ? lv.camC : lv.pCamC + wrapDelta(lv.camC - lv.pCamC, lv.H) * k;
  }

  viewPos(lv, a, c) {
    return [a - this.camA, wrapDelta(c - this.camC - lv.vc / 2, lv.H) + lv.vc / 2];
  }

  /** Interpolierte Position eines Objekts mit a/c (und optional pa/pc vom letzten Schritt). */
  ipos(o) {
    if (o.pa === undefined) return [o.a, o.c];
    const k = this.alpha;
    return [o.pa + (o.a - o.pa) * k, o.pc + wrapDelta(o.c - o.pc, this.lv.H) * k];
  }

  atObj(o, fn) {
    const [a, c] = this.ipos(o);
    this.at(a, c, fn);
  }

  at(a, c, fn) {
    const [x, y] = this.viewPos(this.lv, a, c);
    if (x < -80 || x > this.lv.va + 80) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    fn();
    ctx.restore();
  }

  toScreen(lv, a, c) {
    const [x, y] = this.viewPos(lv, a, c);
    const ang = lv.viewAngle();
    const dx = x - lv.va / 2;
    const dy = y - lv.vc / 2;
    return [W / 2 + Math.cos(ang) * dx - Math.sin(ang) * dy, H / 2 + Math.sin(ang) * dx + Math.cos(ang) * dy];
  }

  drawBackground(theme, lv, t, pad) {
    const ctx = this.ctx;
    const va = lv.va;
    const vc = lv.vc;
    const x0 = -pad;
    const y0 = -pad;
    const x1 = va + pad;
    const y1 = vc + pad;
    ctx.fillStyle = theme.bg[0];
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const mod = (v, m) => ((v % m) + m) % m;
    // Grundmuster als vorgerenderte Kachel (eine Füllung statt hunderter Einzelrechtecke)
    const tile = backgroundTile(theme.pattern);
    if (tile) {
      const ox = this.camA * tile.parallax;
      const oy = this.camC * tile.parallax;
      const quarter = lv.turnAnim ? -1 : lv.heading;
      // Achsenparallel füllen, wenn die Welt genau um 0/90/180/270° gedreht ist
      const ok =
        quarter >= 0 &&
        fillTiledScreen(ctx, tile, quarter, -(((ox % tile.w) + tile.w) % tile.w), -(((oy % tile.h) + tile.h) % tile.h), this.devW, this.devH);
      if (!ok) fillTiled(ctx, tile, ox, oy, x0, y0, x1, y1);
    }
    switch (theme.pattern) {
      case 'tischdecke': {
        // Krümel im Vordergrund
        ctx.fillStyle = 'rgba(160,100,40,0.5)';
        for (let i = 0; i < 40; i++) {
          const x = mod(i * 97 - this.camA, va + 200) - 100;
          const y = mod(i * 61 - this.camC, vc + 100) - 50;
          ctx.fillRect(x, y, 2 + (i % 3), 2);
        }
        break;
      }
      case 'fliesen': {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 18; i++) {
          const x = mod(i * 131 - this.camA * 0.8, va + 100) - 50;
          const y = mod(i * 47 - this.camC * 0.8 - t * (10 + (i % 4) * 6), vc + 60) - 30;
          const r = 2 + (i % 4);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'ziegel': {
        ctx.strokeStyle = 'rgba(220,220,230,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = mod(i * 173 - this.camA * 0.9, va + 120) - 60;
          const y = mod(i * 89 - this.camC * 0.9, vc + 80) - 40;
          for (let k = 0; k < 6; k++) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(k) * 22, y + Math.sin(k) * 22);
          }
          ctx.moveTo(x + 10, y);
          ctx.arc(x, y, 10, 0, Math.PI * 2);
        }
        ctx.stroke();
        break;
      }
      case 'tanzboden': {
        // Dezent: wenige Felder, sanftes Ein- und Ausblenden, höchstens 2 Wechsel pro Sekunde.
        if (this.reducedEffects) break;
        const s = 40;
        const ox = this.camA * 0.6;
        const oy = this.camC * 0.6;
        const cols = ['#ff4fb0', '#4fd0ff', '#ffe14d', '#b04fff'];
        const beat = Math.floor(t * 2);
        const fade = 0.5 - 0.5 * Math.cos((t * 2 - beat) * Math.PI * 2);
        for (let x = -mod(ox, s) - s; x < x1; x += s) {
          for (let y = -mod(oy, s) - s; y < y1; y += s) {
            const ix = Math.round((x + ox) / s);
            const iy = Math.round((y + oy) / s);
            if ((((ix * 7 + iy * 13 + beat) % 9) + 9) % 9 !== 0) continue;
            ctx.globalAlpha = 0.14 * fade;
            ctx.fillStyle = cols[(ix + iy) & 3];
            ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
          }
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'zahnraeder': {
        ctx.fillStyle = 'rgba(255,255,220,0.6)';
        for (let i = 0; i < 50; i++) {
          const x = mod(i * 113 - this.camA * 0.2, va + 40) - 20;
          const y = mod(i * 71 - this.camC * 0.2, vc + 40) - 20;
          ctx.fillRect(x, y, i % 3 ? 1.5 : 2, i % 3 ? 1.5 : 2);
        }
        for (let i = 0; i < 5; i++) {
          const x = mod(i * 211 - this.camA * 0.45, va + 240) - 120;
          const y = mod(i * 157 - this.camC * 0.45, vc + 200) - 100;
          const r = 40 + (i % 3) * 15;
          const gear = cached('bggear' + r, r * 2 + 4, r * 2 + 4, 2, (c) => {
            c.translate(r + 2, r + 2);
            c.globalAlpha = 0.25;
            drawGear(c, r, 12, 0, '#c9a85a', '#7a6a3a');
          });
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * (i % 2 ? 0.3 : -0.3));
          if (gear) ctx.drawImage(gear.canvas, -r - 2, -r - 2, r * 2 + 4, r * 2 + 4);
          ctx.restore();
        }
        break;
      }
    }
  }

  drawGates(lv, t) {
    const ctx = this.ctx;
    for (const g of lv.gates) {
      const x0 = g.a0 - this.camA;
      const x1 = g.a1 - this.camA;
      if (x1 < -60 || x0 > lv.va + 60) continue;
      if (g.type === 'rock') {
        for (const b of g.blocks) {
          if (b.hp <= 0) continue;
          const mid = (b.c0 + b.c1) / 2;
          const [, y] = this.viewPos(lv, g.a0, mid);
          const h = b.c1 - b.c0;
          if (y < -h || y > lv.vc + h) continue;
          ctx.save();
          rrect(ctx, x0, y - h / 2 + 0.5, x1 - x0, h - 1, 4, b.flash > 0 ? '#d8b896' : '#8a6a4a', '#4a3420', 1.2);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x0 + 3, y - h / 2 + 3, x1 - x0 - 6, 3);
          ctx.strokeStyle = '#3a2410';
          ctx.lineWidth = 1;
          if (b.hp < 3) {
            ctx.beginPath();
            ctx.moveTo(x0 + 5, y - 6);
            ctx.lineTo(x0 + 12, y);
            ctx.lineTo(x0 + 8, y + 7);
            if (b.hp < 2) {
              ctx.moveTo(x1 - 4, y - 8);
              ctx.lineTo(x1 - 12, y + 2);
              ctx.lineTo(x1 - 6, y + 9);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (g.type === 'narrow') {
        const [, gy] = this.viewPos(lv, g.a0, g.gapC);
        const half = g.gapW / 2;
        // Zwei Metallplatten links und rechts der Lücke über die ganze Periode
        for (const [ya, yb] of [
          [gy - lv.H + half, gy - half],
          [gy + half, gy + lv.H - half],
        ]) {
          const top = Math.max(ya, -20);
          const bot = Math.min(yb, lv.vc + 20);
          if (bot <= top) continue;
          ctx.fillStyle = '#7d8794';
          ctx.fillRect(x0, top, x1 - x0, bot - top);
          ctx.fillStyle = '#5a636e';
          for (let y = Math.ceil(top / 16) * 16; y < bot; y += 16) ctx.fillRect(x0 + 2, y, x1 - x0 - 4, 2);
          for (let y = Math.ceil(top / 16) * 16 + 8; y < bot; y += 16) {
            circle(ctx, x0 + 5, y, 1.3, '#c0c8d0');
            circle(ctx, x1 - 5, y, 1.3, '#c0c8d0');
          }
        }
        // Warnstreifen an der Lücke und ein sichtbarer Einlauf (Trichter) davor
        const glow = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255,220,60,${0.6 + 0.4 * glow})`;
        ctx.fillRect(x0, gy - half - 3, x1 - x0, 3);
        ctx.fillRect(x0, gy + half, x1 - x0, 3);
        ctx.strokeStyle = 'rgba(255,220,60,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 - 26, gy - 30);
        ctx.lineTo(x0, gy - half);
        ctx.moveTo(x0 - 26, gy + 30);
        ctx.lineTo(x0, gy + half);
        ctx.stroke();
      } else if (g.type === 'spikes') {
        for (const col of g.cols) {
          const x = col.a - this.camA;
          if (x < -20 || x > lv.va + 20) continue;
          const [, gy] = this.viewPos(lv, col.a, lv.spikeGapAt(col));
          drawSpikeColumn(ctx, x, gy, g.gap / 2, lv.H, lv.vc);
        }
      }
    }
  }

  /** Pfeile zeigen auf eine enge Spalte, die gerade nicht im Bild ist. */
  drawNarrowArrows(lv, t) {
    const ctx = this.ctx;
    for (const g of lv.gates) {
      if (g.type !== 'narrow' || g.a1 < lv.player.a || g.a0 - this.camA > lv.va + 40) continue;
      const [, gy] = this.viewPos(lv, g.a0, g.gapC);
      // Pfeil bleibt innerhalb der sicheren Zone (nicht unter Anzeigen am Bildrand)
      const m = 34;
      if (gy > m && gy < lv.vc - m) continue;
      const up = gy <= m;
      const x = Math.min(lv.va - 40, g.a0 - this.camA - 14);
      const y = up ? m + Math.sin(t * 8) * 3 : lv.vc - m - Math.sin(t * 8) * 3;
      ctx.fillStyle = '#ffe14d';
      ctx.strokeStyle = '#1a1020';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + (up ? -8 : 8));
      ctx.lineTo(x - 7, y + (up ? 3 : -3));
      ctx.lineTo(x + 7, y + (up ? 3 : -3));
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
  }

  /** Rote Vignette bei einem Treffer: zeigt deutlich, dass man getroffen wurde. */
  drawHurtVignette(k) {
    const ctx = this.ctx;
    const img = cached('hurt', W, H, 0.5, (c) => {
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      g.addColorStop(0, 'rgba(255,40,60,0)');
      g.addColorStop(1, 'rgba(255,40,60,0.75)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    });
    if (!img) return;
    ctx.globalAlpha = Math.min(1, k);
    ctx.drawImage(img.canvas, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  drawDarkness(game, lv) {
    const p = lv.player;
    let k = 0;
    for (const g of lv.gates) {
      if (g.type !== 'dark') continue;
      const inside = Math.min(p.a - g.a0, g.a1 - p.a);
      k = Math.max(k, Math.max(0, Math.min(1, (inside + 60) / 120)));
    }
    if (k <= 0) return;
    const ctx = this.ctx;
    const [ia, ic] = this.ipos(p);
    const [sx, sy] = this.toScreen(lv, ia, ic);
    const lamp = lv.items.has('LAMPE');
    const flicker = this.reducedEffects ? 0 : lamp ? Math.sin(lv.time * 9) * 4 : Math.sin(lv.time * 3) * 3;
    const r = (lamp ? 190 : 46) + flicker;
    const mask = darknessMask(lamp ? 190 : 46);
    if (mask) {
      const s2 = r / Math.round((lamp ? 190 : 46) / 10) / 10;
      ctx.globalAlpha = k;
      ctx.drawImage(mask.canvas, sx - (mask.w / 2) * s2, sy - (mask.h / 2) * s2, mask.w * s2, mask.h * s2);
      ctx.globalAlpha = 1;
    } else {
      const grad = ctx.createRadialGradient(sx, sy, r * 0.45, sx, sy, r);
      grad.addColorStop(0, 'rgba(5,3,10,0)');
      grad.addColorStop(1, `rgba(5,3,10,${0.96 * k})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    // Leuchtende Augen der Gegner im Dunkeln
    if (!lamp) {
      for (const e of lv.enemies) {
        const [ex, ey] = this.toScreen(lv, e.a, e.c);
        circle(ctx, ex - 2, ey - 2, 1.2, `rgba(255,240,120,${0.8 * k})`);
        circle(ctx, ex + 2, ey - 2, 1.2, `rgba(255,240,120,${0.8 * k})`);
      }
      for (const b of lv.bullets) {
        const [bx, by] = this.toScreen(lv, b.a, b.c);
        circle(ctx, bx, by, 1.5, `rgba(255,120,200,${0.7 * k})`);
      }
    }
  }

  drawHud(game, lv) {
    const ctx = this.ctx;
    const p = lv.player;
    // Energie als Würstchen
    for (let i = 0; i < p.maxHp; i++) {
      const x = 10 + i * 17;
      const full = i < p.hp;
      rrect(ctx, x, 6, 14, 7, 3.5, full ? '#d8584a' : 'rgba(0,0,0,0.35)', full ? '#7a2018' : '#ffffff', 1);
    }
    for (let i = 0; i < lv.powers.shield; i++) circle(ctx, 14 + i * 10, 21, 3.5, 'rgba(90,200,255,0.8)', '#ffffff', 0.8);
    text(ctx, String(game.progress.score + lv.score).padStart(7, '0'), W - 8, 11, 10, '#ffffff', 'right');
    text(ctx, lv.edge.name, W / 2, 10, 8, '#ffe9b0');

    // Power-Leiste
    const bw = 62;
    const x0 = W / 2 - (bw * POWER_LABELS.length) / 2;
    const y0 = H - 17;
    for (let i = 0; i < POWER_LABELS.length; i++) {
      const x = x0 + i * bw;
      const sel = lv.powers.cursor === i;
      const avail = slotAvailable(lv.powers, i);
      rrect(ctx, x + 1, y0, bw - 2, 13, 3, sel ? 'rgba(255,211,77,0.85)' : 'rgba(20,10,40,0.45)', sel ? '#ffffff' : 'rgba(122,106,160,0.7)', 1);
      let label = POWER_LABELS[i];
      if (i === 0 && lv.powers.speed) label += ' ' + lv.powers.speed;
      if (i === 4 && lv.powers.options) label += ' ' + lv.powers.options;
      text(ctx, label, x + bw / 2, y0 + 7, 7, sel ? '#2a1040' : avail ? '#ffffff' : '#7a6aa0', 'center', null);
    }

    if (lv.boss && lv.state === 'boss') {
      const b = lv.boss;
      const w = 200;
      rrect(ctx, W / 2 - w / 2, 22, w, 7, 3, 'rgba(0,0,0,0.5)', '#ffffff', 1);
      rrect(ctx, W / 2 - w / 2 + 1, 23, (w - 2) * (b.hp / b.maxHp), 5, 2, '#ff4f6a');
      text(ctx, BOSSES[b.kind].name, W / 2, 36, 8, '#ffd0d8');
    }

    // Meldungen
    let y = 60;
    for (const m of lv.messages) {
      const fade = Math.min(1, (m.dur - m.t) * 3, m.t * 6);
      ctx.globalAlpha = Math.max(0, fade);
      if (m.style === 'title') {
        text(ctx, m.text, W / 2, 110, 22, '#ffe14d');
        text(ctx, THEMES[lv.edge.theme].name, W / 2, 132, 9, '#ffffff');
      } else if (m.style === 'big') {
        text(ctx, m.text, W / 2, 100, 18, '#ffffff');
      } else if (m.style === 'boss') {
        text(ctx, m.text, W / 2, 90, 20, '#ff5f7a');
      } else {
        const lines = wrapLines(ctx, m.text, 380, 9);
        for (const line of lines) {
          text(ctx, line, W / 2, y, 9, m.style === 'warn' ? '#ff9a7a' : '#ffffff');
          y += 12;
        }
        y += 4;
      }
      ctx.globalAlpha = 1;
    }
  }

  // ================================================================ KARTE
  mapPos(n) {
    return [54 + n.x * 62, 24 + n.y * 44];
  }

  nodeVisible(game, id) {
    if (game.progress.visited.includes(id)) return 'visited';
    for (const e of EDGES) {
      const other = e.from === id ? e.to : e.to === id ? e.from : null;
      if (other && game.progress.visited.includes(other)) return 'seen';
    }
    return null;
  }

  drawMap(game) {
    const ctx = this.ctx;
    const t = game.time;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a1f4a');
    grad.addColorStop(1, '#14102a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Gebietsflächen
    for (const [id, n] of Object.entries(NODES)) {
      if (!this.nodeVisible(game, id)) continue;
      const [x, y] = this.mapPos(n);
      ctx.fillStyle = AREAS[n.area].color;
      ctx.globalAlpha = 0.09;
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Kanten
    const link = linkAt(game.node, game.heading);
    for (const e of EDGES) {
      const va = this.nodeVisible(game, e.from);
      const vb = this.nodeVisible(game, e.to);
      if (va !== 'visited' && vb !== 'visited') continue;
      const [x1, y1] = this.mapPos(NODES[e.from]);
      const [x2, y2] = this.mapPos(NODES[e.to]);
      const known = game.progress.knownEdges.includes(e.id);
      const active = link && link.edge === e;
      ctx.lineCap = 'round';
      if (active) {
        ctx.strokeStyle = `rgba(255,225,77,${0.5 + 0.5 * Math.sin(t * 6)})`;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.strokeStyle = known ? THEMES[e.theme].accent : 'rgba(200,200,220,0.45)';
      ctx.lineWidth = known ? 3.5 : 2;
      if (!known) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      if (e.oneWay) {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.save();
        ctx.translate(mx + Math.cos(ang) * 10, my + Math.sin(ang) * 10);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-4, 4);
        ctx.fill();
        ctx.restore();
      }
      if (known && e.gates) {
        e.gates.forEach((g, i) => this.gateIcon(g.type, mx + (i - (e.gates.length - 1) / 2) * 11, my, game));
      }
      if (known && e.boss && !(e.reward === 'GOAL' ? false : game.items.has(e.reward))) {
        text(ctx, '☠', mx, my - 9, 9, '#ff6a8a');
      }
    }
    // Knoten
    for (const [id, n] of Object.entries(NODES)) {
      const vis = this.nodeVisible(game, id);
      if (!vis) continue;
      const [x, y] = this.mapPos(n);
      if (vis === 'seen') {
        circle(ctx, x, y, 7, 'rgba(60,50,90,0.9)', 'rgba(200,200,220,0.6)', 1.2);
        text(ctx, '?', x, y + 0.5, 8, '#c8c8dc', 'center', null);
        continue;
      }
      circle(ctx, x, y, 9, AREAS[n.area].color, '#ffffff', 1.5);
      if (n.turntable) circle(ctx, x, y, 12, null, 'rgba(255,255,255,0.7)', 1);
      if (n.save) rrect(ctx, x - 4, y - 4, 8, 8, 1.5, '#2a3a7a', '#ffffff', 0.8);
      if (n.item && !game.items.has(n.item)) {
        const s = 2.5 + Math.sin(t * 5);
        ctx.fillStyle = '#fff6a0';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t;
          const r = i % 2 ? s : s * 2.2;
          ctx.lineTo(x + 9 + Math.cos(a) * r, y - 9 + Math.sin(a) * r);
        }
        ctx.fill();
      }
      if (n.autoTurn !== undefined) {
        const [dx, dy] = DIR_VEC[n.autoTurn];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - dx * 4, y - dy * 4);
        ctx.lineTo(x + dx * 5, y + dy * 5);
        ctx.stroke();
      }
      if (n.goal) {
        circle(ctx, x, y, 5.5, '#fffdf0', '#7a1a1a', 1);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 3, y);
        ctx.stroke();
      }
    }
    // Spieler
    const cur = NODES[game.node];
    const [px, py] = this.mapPos(cur);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((game.shipAngle * Math.PI) / 2);
    ctx.translate(14, 0);
    ctx.scale(0.65, 0.65);
    drawPlayer(ctx, game.progress.character, t, false, 0);
    ctx.restore();

    this.drawItemBar(game);
    this.drawMapPanel(game, link);
  }

  gateIcon(type, x, y, game) {
    const ctx = this.ctx;
    const have = game.items.has(GATES[type].item);
    rrect(ctx, x - 5, y - 5, 10, 10, 2, have ? '#2a6a3a' : '#6a2a3a', '#ffffff', 0.8);
    const sym = { rock: '▦', narrow: '⇔', spikes: '▲', dark: '☾' }[type];
    text(ctx, sym, x, y + 0.5, 7, '#ffffff', 'center', null);
  }

  drawItemBar(game) {
    const ctx = this.ctx;
    const ids = Object.keys(ITEMS);
    let x = W - 12;
    const owned = ids.filter((id) => game.items.has(id));
    text(ctx, `${game.completion()} %`, x, 10, 9, '#ffe14d', 'right');
    x -= 34;
    for (const id of owned.slice().reverse()) {
      const info = ITEMS[id];
      const col = info.kind === 'character' ? '#b05fc4' : info.kind === 'health' ? '#d8584a' : '#4ab3e8';
      circle(ctx, x, 10, 7, col, '#ffffff', 1);
      text(ctx, info.short, x, 10.5, 6, '#ffffff', 'center', null);
      x -= 16;
    }
  }

  drawMapPanel(game, link) {
    const ctx = this.ctx;
    const n = NODES[game.node];
    const y = H - 52;
    panel(ctx, 6, y, W - 12, 46, 0.9);
    const flags = [];
    if (n.save) flags.push('Station');
    if (n.turntable) flags.push('Drehscheibe');
    text(ctx, n.name, 16, y + 11, 11, '#ffe14d', 'left');
    text(ctx, AREAS[n.area].name + (flags.length ? ' · ' + flags.join(' · ') : ''), 16, y + 24, 7, '#d8d0f0', 'left', null, false);
    let info = 'Blick nach ' + DIR_NAMES[game.heading] + ': ';
    let col = '#ffffff';
    if (!link) {
      info += 'keine Etappe';
      col = '#a8a0c0';
    } else if (!directionAllowed(link)) {
      info += 'Einbahnstraße';
      col = '#ff9a7a';
    } else {
      const known = game.progress.knownEdges.includes(link.edge.id);
      info += known ? link.edge.name : 'unbekannte Etappe';
      if (known) {
        const missing = [...requiredItems(link.edge)].filter((it) => !game.items.has(it));
        if (missing.length) {
          info += ' (fehlt: ' + missing.map((m) => ITEMS[m].name).join(', ') + ')';
          col = '#ffcf7a';
        }
      }
    }
    text(ctx, info, 16, y + 37, 8, col, 'left', null);
    const canTurn = n.turntable || game.items.has('DREHWURM');
    const keys = ['FEUER: Abflug'];
    if (canTurn) keys.push('Pfeile: Richtung');
    else if (game.items.has('WENDEHALS')) keys.push('Pfeil zurück: Wenden');
    if (n.save) keys.push('POWER/X: Station');
    keys.push('ESC: Pause');
    ctx.font = font(7, false);
    text(ctx, keys.join('   '), W - 16, y + 11, 7, '#c8c0e8', 'right', null, false);
    text(ctx, 'Pilot: ' + CHARACTERS[game.progress.character].name, W - 16, y + 24, 7, '#c8c0e8', 'right', null, false);
  }

  // ================================================================ TITEL
  drawTitle(game) {
    const ctx = this.ctx;
    const t = game.time;
    ctx.fillStyle = '#1c1036';
    ctx.fillRect(0, 0, W, H);
    // Drehende Spirale
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(t * 0.25);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#2a1a52' : '#24164a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 400, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Fliegender Dackel auf Kreisbahn – die Welt dreht sich mit
    ctx.save();
    ctx.translate(W / 2, 150);
    const a = t * 0.9;
    ctx.translate(Math.cos(a) * 150, Math.sin(a) * 50);
    ctx.rotate(a + Math.PI / 2);
    ctx.scale(1.6, 1.6);
    drawDackel(ctx, t);
    ctx.restore();
    const title = 'WENDEHALS';
    for (let i = 0; i < title.length; i++) {
      const x = W / 2 + (i - (title.length - 1) / 2) * 34;
      const y = 52 + Math.sin(t * 3 + i * 0.6) * 5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 2 + i) * 0.15);
      text(ctx, title[i], 0, 0, 38, ['#ffe14d', '#ff7ad9', '#4fd0ff'][i % 3], 'center', '#1a0a2a');
      ctx.restore();
    }
    text(ctx, 'Ein Dackel dreht durch', W / 2, 86, 11, '#ffffff');
    text(ctx, 'v0.1 · offline · Tastatur oder Controller', W / 2, H - 8, 7, 'rgba(255,255,255,0.5)', 'center', null, false);
  }

  // ================================================================ ENDE
  drawEnding(game) {
    const ctx = this.ctx;
    const e = game.ending;
    const t = game.time;
    const line = Math.min(e.line, ENDING_LINES.length - 1);
    if (e.line <= 1) {
      // Kein Vollbild-Blitzen mehr: ruhiger Hintergrund, das Klingeln zeigen Wackeln und Schallringe.
      ctx.fillStyle = '#2a1838';
      ctx.fillRect(0, 0, W, H);
      if (e.line === 0 && !this.reducedEffects) {
        ctx.strokeStyle = 'rgba(255,230,150,0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const rr = 60 + ((t * 80 + i * 40) % 120);
          ctx.beginPath();
          ctx.arc(W / 2, 140, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.save();
      ctx.translate(W / 2 + (this.reducedEffects ? 0 : Math.sin(t * 40) * 3), 140);
      ctx.scale(1.6, 1.6);
      drawBoss(ctx, { kind: 'wecker', phase: 3, angry: true, flash: 0 }, t);
      ctx.restore();
    } else {
      // Schlafzimmer bei Nacht, später Morgen
      const morning = e.line >= 5;
      ctx.fillStyle = morning ? '#f6d9a8' : '#1d2340';
      ctx.fillRect(0, 0, W, H);
      rrect(ctx, 330, 30, 90, 70, 4, morning ? '#bfe8ff' : '#0c1028', '#6a4a2a', 4); // Fenster
      if (!morning) circle(ctx, 395, 55, 10, '#fff6c8');
      else circle(ctx, 360, 75, 14, '#ffe14d');
      ctx.fillStyle = morning ? '#c8a070' : '#3a2a3a';
      ctx.fillRect(0, 200, W, 70);
      ellipse(ctx, 200, 205, 80, 22, '#b07040', '#6a4020', 2); // Körbchen
      ellipse(ctx, 200, 198, 66, 14, '#e86a6a');
      ctx.save();
      ctx.translate(200, 190);
      ctx.scale(2, 2);
      if (e.line < 3) ctx.rotate(Math.sin(t) * 0.03);
      drawDackel(ctx, e.line >= 3 ? t : 0);
      ctx.restore();
      if (e.line < 3) text(ctx, 'z Z z', 250 + Math.sin(t) * 4, 150 - ((t * 10) % 20), 12, '#ffffff', 'center', null);
      rrect(ctx, 320, 170, 60, 34, 2, '#7a5030', '#4a2a10', 2); // Nachttisch
      ctx.save();
      ctx.translate(350, 154);
      ctx.scale(0.35, 0.35);
      drawBoss(ctx, { kind: 'wecker', phase: 1, flash: 0 }, t);
      ctx.restore();
      if (e.line >= 7 && Math.floor(t * 2) % 2 === 0) text(ctx, ';)', 245, 160, 14, '#1a1020', 'center', null);
    }
    if (!e.done) {
      const str = ENDING_LINES[line];
      const shown = str.slice(0, Math.floor(e.t * 30));
      panel(ctx, 30, 14, W - 60, 30, 0.8);
      text(ctx, shown, W / 2, 29, line === 0 ? 14 : 10, '#ffffff');
    } else {
      panel(ctx, 90, 30, W - 180, 150, 0.9);
      text(ctx, 'ENDE?', W / 2, 52, 24, '#ffe14d');
      const p = game.progress;
      const mins = Math.floor(p.playTime / 60);
      const secs = String(Math.floor(p.playTime % 60)).padStart(2, '0');
      const rows = [
        ['Spielzeit', `${mins}:${secs}`],
        ['Items', `${game.completion()} %`],
        ['Punkte', String(p.score)],
        ['Bruchlandungen', String(p.deaths)],
      ];
      rows.forEach(([k, v], i) => {
        text(ctx, k, 130, 82 + i * 16, 10, '#d8d0f0', 'left', null);
        text(ctx, v, W - 130, 82 + i * 16, 10, '#ffffff', 'right', null);
      });
      text(ctx, 'Danke fürs Spielen!', W / 2, 155, 11, '#ff7ad9');
      if (e.t > 1) text(ctx, 'FEUER: zum Titelbild', W / 2, 170, 8, '#c8c0e8', 'center', null);
    }
  }

  // ============================================================ OVERLAYS
  drawMenu(game, m) {
    const ctx = this.ctx;
    const titleScreen = game.screen === 'title';
    const lineH = 18;
    const w = 250;
    const titleLines = m.title ? wrapLines(ctx, m.title, w - 30, 11) : [];
    const h = m.items.length * lineH + 12 + (titleLines.length ? titleLines.length * 15 + 4 : 0) + (m.footer ? 18 : 0);
    const x = W / 2 - w / 2;
    const y = titleScreen ? 108 : Math.max(10, H / 2 - h / 2);
    panel(ctx, x, y, w, h);
    let cy = y + 16;
    for (const line of titleLines) {
      text(ctx, line, W / 2, cy, 11, '#ffe14d');
      cy += 15;
    }
    if (titleLines.length) cy += 4;
    m.items.forEach((it, i) => {
      const sel = i === m.index;
      if (sel) rrect(ctx, x + 10, cy - 8, w - 20, 16, 4, 'rgba(255,211,77,0.22)', '#ffd34d', 1);
      let label = it.label;
      if (it.kind === 'toggle') label += ':  ' + (it.get() ? 'AN' : 'AUS');
      text(ctx, (sel ? '▶ ' : '') + label, it.kind === 'slider' ? x + 24 : W / 2, cy, 10, sel ? '#ffffff' : '#c8c0e8', it.kind === 'slider' ? 'left' : 'center', null);
      if (it.kind === 'slider') {
        const bx = x + w - 110;
        rrect(ctx, bx, cy - 3, 80, 6, 3, 'rgba(0,0,0,0.5)', '#7a6aa0', 1);
        rrect(ctx, bx, cy - 3, 80 * it.get(), 6, 3, '#ffd34d');
        text(ctx, Math.round(it.get() * 100) + '%', bx + 96, cy, 7, '#ffffff', 'center', null);
      }
      cy += lineH;
    });
    const cur = m.items[m.index];
    if (cur && cur.desc) {
      const lines = wrapLines(ctx, cur.desc, w + 40, 8);
      lines.forEach((l, i) => text(ctx, l, W / 2, y + h + 12 + i * 11, 8, '#ffffff'));
    }
    if (m.footer) text(ctx, m.footer, W / 2, y + h - 10, 7, '#a8a0c8', 'center', null, false);
  }

  drawDialog(d, t) {
    const ctx = this.ctx;
    const w = d.wide ? 430 : 340;
    const lines = [];
    for (const l of d.lines) {
      if (d.wide) lines.push(l);
      else lines.push(...wrapLines(ctx, l, w - 40, 9));
    }
    const lh = d.wide ? 11 : 13;
    const h = 46 + lines.length * lh + 14;
    const x = W / 2 - w / 2;
    const y = H / 2 - h / 2;
    panel(ctx, x, y, w, h, 0.94);
    text(ctx, d.title, W / 2, y + 16, 13, '#ffe14d');
    lines.forEach((l, i) => {
      if (d.wide) {
        ctx.font = `${d.lines[i] && d.lines[i] === d.lines[i].toUpperCase() && l ? 'bold ' : ''}8px monospace`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(l, x + 22, y + 38 + i * lh);
      } else text(ctx, l, W / 2, y + 38 + i * lh, 9, '#ffffff', 'center', null, false);
    });
    const blink = Math.floor(t * 2) % 2 === 0;
    if (blink) text(ctx, '▶ FEUER', x + w - 40, y + h - 10, 8, '#ffd34d', 'center', null);
  }

  drawToasts(game) {
    let y = game.screen === 'map' ? H - 64 : H - 34;
    for (const toast of [...game.toasts].reverse()) {
      const a = Math.min(1, (toast.dur - toast.t) * 3, toast.t * 8);
      this.ctx.globalAlpha = Math.max(0, a);
      const ctx = this.ctx;
      ctx.font = font(9);
      const w = ctx.measureText(toast.text).width + 24;
      rrect(ctx, W / 2 - w / 2, y - 9, w, 18, 6, 'rgba(28,18,44,0.92)', '#ffd34d', 1);
      text(ctx, toast.text, W / 2, y, 9, '#ffffff', 'center', null);
      this.ctx.globalAlpha = 1;
      y -= 22;
    }
  }
}
