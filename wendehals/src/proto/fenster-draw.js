// Zeichnen für P1 „Kreuzung“ und P1c „Netz“ (Wegwerf-Prototyp), beliebige Gänge. Plan wird um -ang gedreht, HUD nie.
import { SCREEN_W, SCREEN_H } from '../core/math.js';
import { drawDackel } from '../render/sprites.js';
import { DENY_TIME } from './fenster.js';
import { drawMinimap, minimapFor } from './minimap.js';

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
  const map = sc.map;
  const b = map.bounds;
  ctx.save();
  ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
  ctx.rotate(-ang);
  ctx.translate(-cam.x, -cam.y);
  // Wand (alles) und Boden (Vereinigung der Gänge)
  ctx.fillStyle = WALL;
  ctx.fillRect(b.x0 - 700, b.y0 - 700, b.x1 - b.x0 + 1400, b.y1 - b.y0 + 1400);
  ctx.fillStyle = FLOOR;
  for (const c of map.corridors) ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  // Gitter, damit Scrollen und Drehung sichtbar sind (nur der sichtbare Teil)
  ctx.save();
  ctx.beginPath();
  for (const c of map.corridors) ctx.rect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  ctx.clip();
  ctx.fillStyle = FLOOR2;
  const R = 290;
  const gx0 = Math.floor((cam.x - R) / GRID) * GRID;
  const gy0 = Math.floor((cam.y - R) / GRID) * GRID;
  for (let gx = gx0; gx < cam.x + R; gx += GRID) {
    for (let gy = gy0; gy < cam.y + R; gy += GRID) {
      if (Math.abs(Math.round((gx + gy) / GRID)) % 2 === 1) ctx.fillRect(gx, gy, GRID, GRID);
    }
  }
  ctx.restore();
  // Kreuzungsquadrate (dünne Marke)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (const j of map.junctions) ctx.strokeRect(j.x0, j.y0, j.x1 - j.x0, j.y1 - j.y0);
  // Knochenplätze in ihrer Farbe (Landmarken) und der gesuchte Knochen
  map.bones.forEach((bone, i) => {
    ctx.fillStyle = bone.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(bone.x, bone.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (i === sc.target) drawBone(ctx, bone.x, bone.y, bone.color, sc.time);
  });
  ctx.restore();
}

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
  const arm = sc.map.bones[sc.target];
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
  drawMinimap(ctx, minimapFor(sc), sc); // P2 Minimap (liest nur die Szene)
  if (sc.hint > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(SCREEN_W / 2 - 190, SCREEN_H - 58, 380, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LB/RB drehen (nur an Kreuzungen, wo ein Gang abgeht) · Y umkehren', SCREEN_W / 2, SCREEN_H - 48);
  }
}
