// Zeichnen für P1 „Kreuzung“ (Wegwerf-Prototyp). Plan wird um -ang gedreht, HUD nie.
import { SCREEN_W, SCREEN_H, DIR_VEC } from '../core/math.js';
import { drawDackel } from '../render/sprites.js';
import { ARMS, END, HALF, RC, DOOR_T, BONE_POS, doorOpen } from './fenster.js';

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

/** Abgerundete Innenecken: Quadrat HALF..HALF+RC minus Kreis, an allen vier Ecken der Kreuzung. */
function fillets(ctx) {
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.save();
    ctx.scale(sx, sy);
    ctx.moveTo(HALF - 1, HALF - 1);
    ctx.lineTo(HALF + RC, HALF - 1);
    ctx.lineTo(HALF + RC, HALF);
    ctx.arc(HALF + RC, HALF + RC, RC, -Math.PI / 2, -Math.PI, true);
    ctx.lineTo(HALF - 1, HALF + RC);
    ctx.closePath();
    ctx.restore();
  }
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
  ctx.beginPath();
  fillets(ctx);
  ctx.fill();
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
  // Türen und Knochen
  const h = sc.h;
  ARMS.forEach((arm, i) => {
    const v = DIR_VEC[arm.dir];
    const open = doorOpen(arm.dir, h);
    ctx.save();
    ctx.translate(v[0] * (HALF + DOOR_T / 2), v[1] * (HALF + DOOR_T / 2));
    const w = v[0] ? DOOR_T : 2 * HALF;
    const hh = v[0] ? 2 * HALF : DOOR_T;
    ctx.fillStyle = arm.color;
    if (open) {
      ctx.strokeStyle = arm.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -hh / 2, w, hh);
    } else ctx.fillRect(-w / 2, -hh / 2, w, hh);
    ctx.restore();
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
  if (sc.hint > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(SCREEN_W / 2 - 110, SCREEN_H - 26, 220, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LB/RB drehen · Y umkehren', SCREEN_W / 2, SCREEN_H - 16);
  }
}
