// Zeichnen für P1 „Kreuzung“ (Wegwerf-Prototyp). Plan wird um -ang gedreht, HUD nie.
import { SCREEN_W, SCREEN_H, DIR_VEC } from '../core/math.js';
import { drawDackel } from '../render/sprites.js';
import { ARMS, END, HALF, DENY_TIME, BONE_POS } from './fenster.js';

const FLOOR = '#6a5f55';
const FLOOR2 = '#756a5f';
const WALL = '#1c1822';
const GRID = 80;

function drawBone(ctx, x, y, color, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2) * 0.2);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(-12, -3, 24, 6);
  ctx.arc(-12, -4, 4.5, 0, Math.PI * 2);
  ctx.arc(-12, 4, 4.5, 0, Math.PI * 2);
  ctx.arc(12, -4, 4.5, 0, Math.PI * 2);
  ctx.arc(12, 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPlan(ctx, sc, cam, ang) {
  ctx.save();
  ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
  ctx.rotate(-ang);
  ctx.translate(-cam.x, -cam.y);
  // Wand (alles) und Boden (Kreuz aus zwei Balken)
  ctx.fillStyle = WALL;
  ctx.fillRect(-END - 600, -END - 600, 2 * END + 1200, 2 * END + 1200);
  ctx.fillStyle = FLOOR;
  ctx.fillRect(-END, -HALF, 2 * END, 2 * HALF);
  ctx.fillRect(-HALF, -END, 2 * HALF, 2 * END);
  // Gitter, damit Scrollen und Drehung sichtbar sind
  ctx.save();
  ctx.beginPath();
  ctx.rect(-END, -HALF, 2 * END, 2 * HALF);
  ctx.rect(-HALF, -END, 2 * HALF, 2 * END);
  ctx.clip();
  ctx.fillStyle = FLOOR2;
  const dark = (gx, gy) => Math.abs(Math.round((gx + gy) / GRID)) % 2 === 1;
  for (let gx = -END; gx < END; gx += GRID) {
    for (let gy = -HALF; gy < HALF; gy += GRID) if (dark(gx, gy)) ctx.fillRect(gx, gy, GRID, GRID);
  }
  for (let gy = -END; gy < END; gy += GRID) {
    for (let gx = -HALF; gx < HALF; gx += GRID) if (dark(gx, gy) && Math.abs(gy) >= HALF) ctx.fillRect(gx, gy, GRID, GRID);
  }
  ctx.restore();
  // Mittelmarke
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-HALF, -HALF, WIDTH2, WIDTH2);
  // Armfarbe am Ende des Arms und Knochen
  ARMS.forEach((arm, i) => {
    const v = DIR_VEC[arm.dir];
    // Armfarbe als Streifen am Ende des Arms
    ctx.fillStyle = arm.color;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(v[0] ? (v[0] > 0 ? END - 8 : -END) : -HALF, v[1] ? (v[1] > 0 ? END - 8 : -END) : -HALF, v[0] ? 8 : 2 * HALF, v[1] ? 8 : 2 * HALF);
    ctx.globalAlpha = 1;
    if (i === sc.target) {
      const b = BONE_POS(i);
      drawBone(ctx, b.x, b.y, arm.color, sc.time);
    }
  });
  ctx.restore();
}
const WIDTH2 = 2 * HALF;

/** Ein Dreh-Symbol unten in der Mitte (für beide Richtungen): leuchtet und pulsiert, wenn Drehen geht (Kreuzung),
 *  sonst grau. Abgelehnter Druck: wackelt kurz und blinkt rot. Selbst gezeichnet (keine Schriftzeichen nötig). */
function drawTurnIcon(ctx, sc) {
  const on = sc.canTurn && !sc.swing;
  const deny = sc.denied ? sc.denied.t / DENY_TIME : 0;
  const pulse = 0.5 + 0.5 * Math.sin(sc.time * 6);
  const R = 13;
  const x = SCREEN_W / 2 + (deny ? Math.sin(deny * 40) * 4 * deny : 0);
  const y = SCREEN_H - 6 - R;
  ctx.save();
  ctx.globalAlpha = on || deny ? 1 : 0.45;
  if (on && !deny) {
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = 6 + 8 * pulse;
  }
  ctx.fillStyle = deny ? `rgba(220,50,50,${0.5 + 0.5 * deny})` : on ? `rgba(255,214,90,${0.75 + 0.25 * pulse})` : '#3a3640';
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Bogen mit Pfeilspitzen an beiden Enden (links/rechts drehen)
  const col = on && !deny ? '#2a2010' : '#ddd';
  const r = 7;
  const a0 = Math.PI * 0.85;
  const a1 = Math.PI * 2.15;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 1, r, a0, a1);
  ctx.stroke();
  for (const [a, dirSign] of [[a0, -1], [a1, 1]]) {
    const px = x + Math.cos(a) * r;
    const py = y + 1 + Math.sin(a) * r;
    const tx = -Math.sin(a) * dirSign; // Tangente in Laufrichtung des Bogens nach außen
    const ty = Math.cos(a) * dirSign;
    ctx.beginPath();
    ctx.moveTo(px + tx * 4, py + ty * 4);
    ctx.lineTo(px - ty * 3.5, py + tx * 3.5);
    ctx.lineTo(px + ty * 3.5, py - tx * 3.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawFenster(ctx, sc) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawPlan(ctx, sc, sc.cam, sc.ang);
  // Dackel im Bildschirmraum; Spiegelung folgt der weichen Scrollrichtung (Umkehr sichtbar)
  ctx.save();
  ctx.translate(sc.dog.x, sc.dog.y);
  ctx.scale(Math.abs(sc.dir) < 0.05 ? 0.05 : sc.dir, 1);
  drawDackel(ctx, sc.time);
  ctx.restore();
  // HUD (nie mitgedreht)
  const arm = ARMS[sc.target];
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(6, 6, 118, 22);
  ctx.fillStyle = arm.color;
  ctx.fillRect(10, 10, 14, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('Knochen: ' + sc.score, 30, 17);
  drawTurnIcon(ctx, sc);
  if (sc.hint > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(SCREEN_W / 2 - 150, SCREEN_H - 58, 300, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LB/RB drehen (nur auf der Kreuzung) · Y umkehren', SCREEN_W / 2, SCREEN_H - 48);
  }
}
