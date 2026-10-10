// Zeichnen für P1 „Kreuzung“ und P1c „Netz“ (Wegwerf-Prototyp), beliebige Gänge. Plan wird um -ang gedreht, HUD nie.
import { SCREEN_W, SCREEN_H, headingAngle } from '../core/math.js';
import { drawDackel } from '../render/sprites.js';
import { DENY_TIME } from './fenster.js';
import { drawMinimap, minimapFor } from './minimap.js';
import { ARMS8, APO, END, HALF, WIDTH, STRIPE_GAP } from './achteck-map.js';

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

/** Pfad der begehbaren Fläche des Achtecks: Achteck plus 8 Arme (Wandkeile bleiben ausgespart). */
function achteckPath(ctx) {
  ctx.beginPath();
  ARMS8.forEach((a, i) => {
    // Achteckseite i: Eckpunkte bei APO·u ± HALF·v
    const x0 = a.u[0] * APO - a.v[0] * HALF;
    const y0 = a.u[1] * APO - a.v[1] * HALF;
    const x1 = a.u[0] * APO + a.v[0] * HALF;
    const y1 = a.u[1] * APO + a.v[1] * HALF;
    if (i) ctx.lineTo(x0, y0);
    else ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  });
  ctx.closePath();
  for (const a of ARMS8) {
    ctx.moveTo(a.u[0] * APO - a.v[0] * HALF, a.u[1] * APO - a.v[1] * HALF);
    ctx.lineTo(a.u[0] * END - a.v[0] * HALF, a.u[1] * END - a.v[1] * HALF);
    ctx.lineTo(a.u[0] * END + a.v[0] * HALF, a.u[1] * END + a.v[1] * HALF);
    ctx.lineTo(a.u[0] * APO + a.v[0] * HALF, a.u[1] * APO + a.v[1] * HALF);
    ctx.closePath();
  }
}

/** Boden eines Arms in seinem Rechteck (x = Strecke ab der Mitte, y = quer) – im Arm-Koordinatensystem gezeichnet. */
function inArmFrame(ctx, a, fn) {
  ctx.save();
  ctx.rotate(headingAngle(a.dir));
  fn();
  ctx.restore();
}

function drawPlanAchteck(ctx, sc, cam, ang) {
  ctx.save();
  ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
  ctx.rotate(-ang);
  ctx.translate(-cam.x, -cam.y);
  const R = 300; // sichtbarer Umkreis um die Fenstermitte
  ctx.fillStyle = WALL;
  ctx.fillRect(cam.x - R - 20, cam.y - R - 20, 2 * R + 40, 2 * R + 40);
  ctx.save();
  achteckPath(ctx);
  ctx.fillStyle = FLOOR;
  ctx.fill();
  ctx.clip();
  // Schachbrett (wie in der Kreuzung), damit Scrollen und Drehung sichtbar sind
  ctx.fillStyle = FLOOR2;
  const gx0 = Math.floor((cam.x - R) / GRID) * GRID;
  const gy0 = Math.floor((cam.y - R) / GRID) * GRID;
  for (let gx = gx0; gx < cam.x + R; gx += GRID) {
    for (let gy = gy0; gy < cam.y + R; gy += GRID) {
      if (Math.abs(Math.round((gx + gy) / GRID)) % 2 === 1) ctx.fillRect(gx, gy, GRID, GRID);
    }
  }
  // Armboden in Armfarbe; Diagonal-Arme zusätzlich mit Streifen (lesbar auch ohne Farbsehen)
  for (const a of ARMS8) {
    inArmFrame(ctx, a, () => {
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(APO, -HALF, END - APO, WIDTH);
      ctx.globalAlpha = 1;
      if (a.striped) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(APO, -HALF, END - APO, WIDTH);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        for (let x = APO - WIDTH; x < END; x += STRIPE_GAP) {
          ctx.moveTo(x, HALF);
          ctx.lineTo(x + WIDTH, -HALF);
        }
        ctx.stroke();
        ctx.restore();
      }
      // Marke an der Achteckseite: Beginn des Arms (Dreh-Zone reicht noch TURN_AHEAD in den Arm)
      ctx.fillStyle = a.color;
      ctx.fillRect(APO - 3, -HALF, 6, WIDTH);
    });
  }
  ctx.restore();
  // Achteck-Umriss (dünne Marke wie das Kreuzungsquadrat)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ARMS8.forEach((a, i) => {
    const x0 = a.u[0] * APO - a.v[0] * HALF;
    const y0 = a.u[1] * APO - a.v[1] * HALF;
    const x1 = a.u[0] * APO + a.v[0] * HALF;
    const y1 = a.u[1] * APO + a.v[1] * HALF;
    if (i) ctx.lineTo(x0, y0);
    else ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  });
  ctx.closePath();
  ctx.stroke();
  // Knochenplätze in ihrer Farbe und der gesuchte Knochen
  sc.map.bones.forEach((bone, i) => {
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

/** Knopf-Symbole für den Kurzhinweis (selbst gezeichnet, keine Schrift): Schulterknopf, Auslöser, Y-Knopf, Winkelmarke. */
function hintShoulder(ctx, x, y, dirSign) {
  ctx.fillStyle = '#d8d4de';
  ctx.beginPath();
  ctx.roundRect(x - 9, y - 3, 18, 6, 3);
  ctx.fill();
  hintArrow(ctx, x, y + 9, dirSign);
}
function hintTrigger(ctx, x, y, dirSign) {
  ctx.fillStyle = '#d8d4de';
  ctx.beginPath();
  ctx.roundRect(x - 7, y - 6, 14, 12, [2, 2, 6, 6]);
  ctx.fill();
  hintArrow(ctx, x, y + 11, dirSign);
}
function hintArrow(ctx, x, y, dirSign) {
  ctx.fillStyle = '#ffe27a';
  ctx.beginPath();
  ctx.moveTo(x + 5 * dirSign, y);
  ctx.lineTo(x - 3 * dirSign, y - 3.5);
  ctx.lineTo(x - 3 * dirSign, y + 3.5);
  ctx.closePath();
  ctx.fill();
}
/** Winkelmarke: zwei Schenkel vom Scheitel; 90° mit Quadrat-Eckmarke, 45° mit Bogen. */
function hintAngle(ctx, x, y, deg) {
  const L = 12;
  const rad = (deg * Math.PI) / 180;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + L, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x + Math.cos(-rad) * L, y + Math.sin(-rad) * L);
  ctx.stroke();
  ctx.strokeStyle = '#ffe27a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (deg === 90) {
    ctx.rect(x + 2, y - 6, 4, 4);
  } else ctx.arc(x, y, 7, -rad, 0);
  ctx.stroke();
}
function hintY(ctx, x, y) {
  ctx.fillStyle = '#e8c63a';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2010';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); // Y aus drei Strichen
  ctx.moveTo(x - 3.5, y - 4);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 3.5, y - 4);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 4.5);
  ctx.stroke();
  // Umkehr-Pfeil daneben (U-Bogen mit Spitze)
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 18, y - 1, 5, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 8);
  ctx.lineTo(x + 13, y + 4);
  ctx.lineTo(x + 13, y + 12);
  ctx.closePath();
  ctx.fill();
}
function drawHint45(ctx) {
  const w = 300;
  const x0 = (SCREEN_W - w) / 2;
  const y = SCREEN_H - 58;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath();
  ctx.roundRect(x0, y - 4, w, 30, 5);
  ctx.fill();
  const cy = y + 11;
  hintShoulder(ctx, x0 + 24, cy, -1);
  hintShoulder(ctx, x0 + 50, cy, 1);
  hintAngle(ctx, x0 + 70, cy + 4, 90);
  hintTrigger(ctx, x0 + 112, cy, -1);
  hintTrigger(ctx, x0 + 136, cy, 1);
  hintAngle(ctx, x0 + 156, cy + 4, 45);
  hintY(ctx, x0 + 214, cy);
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
  if (sc.map.kind === 'achteck') drawPlanAchteck(ctx, sc, sc.cam, sc.ang);
  else drawPlan(ctx, sc, sc.cam, sc.ang);
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
  if (sc.minimap !== false) drawMinimap(ctx, minimapFor(sc), sc); // P2 Minimap (liest nur die Szene); P3 „45°-Kreuzung“: keine
  if (sc.deadFx > 0) {
    // Tod: roter Blitz mit großem X, bis der Neustart beginnt (selbst gezeichnet, keine Schrift)
    const k = Math.min(1, sc.deadFx / 0.7);
    ctx.save();
    ctx.fillStyle = `rgba(200,30,30,${0.45 * k})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * k})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(SCREEN_W / 2 - 24, SCREEN_H / 2 - 24);
    ctx.lineTo(SCREEN_W / 2 + 24, SCREEN_H / 2 + 24);
    ctx.moveTo(SCREEN_W / 2 + 24, SCREEN_H / 2 - 24);
    ctx.lineTo(SCREEN_W / 2 - 24, SCREEN_H / 2 + 24);
    ctx.stroke();
    ctx.restore();
  }
  if (sc.hint > 0 && sc.map.kind === 'achteck') drawHint45(ctx);
  else if (sc.hint > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(SCREEN_W / 2 - 190, SCREEN_H - 58, 380, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LB/RB drehen (nur an Kreuzungen, wo ein Gang abgeht) · Y umkehren', SCREEN_W / 2, SCREEN_H - 48);
  }
}
