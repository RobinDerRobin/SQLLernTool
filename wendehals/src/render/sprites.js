// Prozedurale Vektorgrafiken. Gezeichnet wird im lokalen Level-System:
// +x = Flugrichtung des Spielers, +y = Querachse. Gegner schauen nach -x.
// Weil der Renderer die ganze Welt dreht, drehen sich alle Figuren automatisch mit.

const TAU = Math.PI * 2;
const DISCO5 = ['#ff4fb0', '#4fd0ff', '#ffe14d', '#ffffff', '#b04fff'];

export function circle(ctx, x, y, r, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, fill, stroke, lw = 1, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function rrect(ctx, x, y, w, h, r, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function eye(ctx, x, y, r = 2, look = -1) {
  circle(ctx, x, y, r, '#ffffff', '#222', 0.6);
  circle(ctx, x + look * r * 0.35, y, r * 0.5, '#111');
}

function flame(ctx, x, y, t, len = 8) {
  const f = len * (0.7 + 0.3 * Math.sin(t * 40));
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.quadraticCurveTo(x - f, y, x, y + 3);
  ctx.fillStyle = '#ff9a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - 1.5);
  ctx.quadraticCurveTo(x - f * 0.55, y, x, y + 1.5);
  ctx.fillStyle = '#fff3a0';
  ctx.fill();
}

// ------------------------------------------------------------- Spieler
export function drawPlayer(ctx, charId, t, small, inv) {
  if (inv > 0 && Math.floor(t * 20) % 2 === 0) return;
  ctx.save();
  if (small) ctx.scale(0.5, 0.5);
  if (charId === 'oma') drawOma(ctx, t);
  else if (charId === 'toaster') drawToaster(ctx, t);
  else drawDackel(ctx, t);
  ctx.restore();
}

export function drawDackel(ctx, t) {
  flame(ctx, -11, 2, t, 9);
  rrect(ctx, -11, -2, 7, 8, 2, '#8d96a3', '#4a505a', 0.8); // Raketenrucksack
  ellipse(ctx, 0, 2, 11, 5, '#b8692b', '#6b3812', 0.8); // Körper
  ctx.strokeStyle = '#6b3812';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-14, -5 + Math.sin(t * 12) * 2, -16, -4); // Schwanz
  ctx.stroke();
  ellipse(ctx, 10, -2, 6, 4.5, '#c57a35', '#6b3812', 0.8); // Kopf
  ellipse(ctx, 15, -1, 3.5, 2.5, '#c57a35', '#6b3812', 0.8); // Schnauze
  circle(ctx, 18, -1.5, 1.2, '#1a1a1a');
  ellipse(ctx, 8, 1, 2.5, 5, '#7a3f15', null, 0, 0.3 + Math.sin(t * 10) * 0.2); // Ohr
  eye(ctx, 12, -3.5, 1.6, 1);
  // Beinchen
  ctx.strokeStyle = '#6b3812';
  ctx.lineWidth = 1.5;
  for (const lx of [-6, 6]) {
    ctx.beginPath();
    ctx.moveTo(lx, 6);
    ctx.lineTo(lx + Math.sin(t * 15 + lx) * 1.5, 9);
    ctx.stroke();
  }
  // Fliegerbrille
  rrect(ctx, 9, -6.5, 5, 2.5, 1, 'rgba(120,200,255,0.8)', '#333', 0.6);
}

export function drawOma(ctx, t) {
  flame(ctx, -12, 3, t, 10);
  rrect(ctx, -12, -6, 6, 16, 3, '#7c3b8f', '#3d1a47', 0.8); // Lehne
  rrect(ctx, -8, 3, 18, 7, 3, '#9d4fb3', '#3d1a47', 0.8); // Sitz
  rrect(ctx, 6, 0, 5, 9, 2, '#7c3b8f', '#3d1a47', 0.8); // Armlehne
  ellipse(ctx, 0, -1, 5, 6, '#4f7ad1', '#222', 0.6); // Kleid
  circle(ctx, 1, -9, 4.5, '#f4c9a8', '#7a5a45', 0.6); // Kopf
  circle(ctx, -2.5, -12, 3, '#e8e8e8', '#aaa', 0.6); // Dutt
  circle(ctx, 3, -9.5, 1.6, null, '#333', 0.6); // Brille
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); // Stricknadeln
  ctx.moveTo(4, -2);
  ctx.lineTo(13, -6 + Math.sin(t * 9) * 2);
  ctx.moveTo(4, -1);
  ctx.lineTo(13, 2 - Math.sin(t * 9) * 2);
  ctx.stroke();
  circle(ctx, 6, 0, 2, '#e8574a');
}

export function drawToaster(ctx, t) {
  flame(ctx, -11, 2, t, 9);
  rrect(ctx, -10, -6, 20, 14, 4, '#c3ccd8', '#5a6472', 1);
  rrect(ctx, -6, -8, 5, 3, 1, '#333');
  rrect(ctx, 1, -8, 5, 3, 1, '#333');
  const pop = 3 + Math.sin(t * 6) * 2;
  rrect(ctx, -5.5, -8 - pop, 4, pop + 1, 1, '#e5b46a', '#9b6a2a', 0.6);
  eye(ctx, 4, -1, 2, 1);
  eye(ctx, 8, -1, 2, 1);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(6, 3, 2.5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  rrect(ctx, -12, 0, 3, 2, 1, '#555'); // Kabel
}

export function drawOption(ctx, charId, t) {
  const glow = 5 + Math.sin(t * 8);
  circle(ctx, 0, 0, glow, 'rgba(255,200,80,0.35)');
  if (charId === 'oma') {
    circle(ctx, 0, 0, 4, '#e8574a', '#8a2a20', 0.8);
    ctx.strokeStyle = '#ffb0a0';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, t * 4, t * 4 + 3);
    ctx.stroke();
  } else if (charId === 'toaster') {
    rrect(ctx, -3.5, -3.5, 7, 7, 2, '#e5b46a', '#9b6a2a', 0.8);
  } else {
    circle(ctx, 0, 0, 3.5, '#f2e6c8', '#9b8a6a', 0.8);
  }
}

// --------------------------------------------------------------- Schüsse
export function drawShot(ctx, s, charId) {
  if (s.kind === 'laser') {
    ctx.strokeStyle = 'rgba(80,240,255,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-s.len, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.strokeStyle = '#e8ffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  if (s.kind === 'missile') {
    ctx.rotate(Math.atan2(s.vc, s.va));
    rrect(ctx, -5, -2, 9, 4, 2, '#e04848', '#701818', 0.6);
    circle(ctx, -6, 0, 1.5 + Math.random(), '#ffcc44');
    return;
  }
  ctx.rotate(Math.atan2(s.vc, s.va));
  if (s.drill) circle(ctx, 0, 0, 4.5, 'rgba(255,240,150,0.35)');
  if (charId === 'oma') {
    ctx.strokeStyle = '#d8d8e8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(5, 0);
    ctx.stroke();
    circle(ctx, -6, 0, 1.6, '#e8574a');
  } else if (charId === 'toaster') {
    rrect(ctx, -3.5, -3.5, 7, 7, 2, '#e5b46a', '#9b6a2a', 0.7);
  } else {
    ctx.rotate(s.t * 18);
    // Knochen mit dunklem Rand, damit er auch auf hellem Hintergrund sichtbar bleibt
    rrect(ctx, -4.8, -2, 9.6, 4, 1.5, '#5a3a20');
    for (const x of [-4, 4]) for (const y of [-1.5, 1.5]) circle(ctx, x, y, 2.2, '#5a3a20');
    rrect(ctx, -4, -1.2, 8, 2.4, 1, '#fbf6e8');
    for (const x of [-4, 4]) for (const y of [-1.5, 1.5]) circle(ctx, x, y, 1.4, '#fbf6e8');
  }
}

// --------------------------------------------------------------- Kugeln
export function drawBullet(ctx, b, t) {
  switch (b.kind) {
    case 'blase':
      circle(ctx, 0, 0, b.r + 1, 'rgba(200,240,255,0.35)', '#e8fbff', 1);
      circle(ctx, -1, -1, 1, '#ffffff');
      break;
    case 'zucker':
      ctx.rotate(t * 5);
      rrect(ctx, -3, -3, 6, 6, 1, '#ffffff', '#b8b8b8', 0.7);
      break;
    case 'kaffee':
      circle(ctx, 0, 0, b.r, '#6b3a1f', '#3a1a08', 0.6);
      circle(ctx, -1, -1, 0.8, '#c08a60');
      break;
    case 'dampf':
      circle(ctx, 0, 0, b.r, 'rgba(235,235,235,0.75)');
      circle(ctx, 4, -3, b.r * 0.6, 'rgba(250,250,250,0.7)');
      break;
    case 'tropfen':
      circle(ctx, 0, 0, b.r, '#5ec8ff', '#1e6a9a', 0.7);
      break;
    case 'pommes':
      ctx.rotate(Math.atan2(b.vc, b.va));
      rrect(ctx, -5, -1.5, 10, 3, 1, '#ffd84a', '#b58a10', 0.6);
      break;
    case 'note':
      ctx.fillStyle = '#ff7ad9';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 2.6, 2, -0.4, 0, TAU);
      ctx.fill();
      ctx.fillRect(1.6, -5, 1.2, 6.5);
      break;
    case 'muetze':
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.lineTo(0, -4);
      ctx.closePath();
      ctx.fill();
      break;
    case 'glocke':
      circle(ctx, 0, 0, b.r + 0.5, '#ffd34d', '#9a7400', 0.7);
      break;
    default:
      circle(ctx, 0, 0, b.r + 1, '#ff4fa0', '#ffffff', 1);
  }
}

// --------------------------------------------------------------- Gegner
export function drawEnemy(ctx, e, t) {
  ctx.save();
  if (e.dormant > 0) {
    // frisch geteilt: klein, wackelnd, halb durchsichtig – wächst in die volle Größe
    const k = 1 - e.dormant / 0.35;
    ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);
    ctx.rotate(Math.sin(t * 40) * 0.3);
  }
  switch (e.kind) {
    case 'toast':
      ctx.rotate(Math.sin(t * 6 + e.idx) * 0.2);
      rrect(ctx, -8, -8, 16, 16, 5, '#e5b46a', '#9b6a2a', 1);
      rrect(ctx, -5.5, -5.5, 11, 11, 3, '#f7dca5');
      eye(ctx, -3, -1, 2);
      eye(ctx, 2, -1, 2);
      ctx.strokeStyle = '#7a4a1a';
      ctx.beginPath();
      ctx.arc(-0.5, 3, 2, 0, Math.PI);
      ctx.stroke();
      break;
    case 'brezel':
      ctx.rotate(t * 3);
      ctx.strokeStyle = '#a0561f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-3, -2, 4, 0, TAU);
      ctx.arc(3, -2, 4, 0, TAU);
      ctx.moveTo(-6, 4);
      ctx.quadraticCurveTo(0, -4, 6, 4);
      ctx.stroke();
      for (const [x, y] of [[-4, -5], [4, -4], [0, 2]]) circle(ctx, x, y, 0.7, '#ffffff');
      break;
    case 'ei':
      ellipse(ctx, 0, 2, 12, 5, '#b9c3cf', '#555', 0.8); // UFO
      ellipse(ctx, 0, -1, 9, 6, '#ffffff', '#ccc', 0.8);
      circle(ctx, 0, -2, 4, '#ffc21a', '#c48a00', 0.8);
      eye(ctx, -1, -2.5, 1.2);
      eye(ctx, 2, -2.5, 1.2);
      for (let i = 0; i < 4; i++) circle(ctx, -8 + i * 5.3, 3, 1, Math.floor(t * 6 + i) % 2 ? '#ff4040' : '#40ff80');
      break;
    case 'bohne':
      ctx.rotate(e.ang || 0);
      ellipse(ctx, 0, 0, 7, 4.5, '#5a321c', '#2a1408', 0.8);
      ctx.strokeStyle = '#2a1408';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(0, 2, 6, 0);
      ctx.stroke();
      eye(ctx, 3, -2, 1.3, 1);
      break;
    case 'ente':
    case 'torpedo':
      ctx.scale(e.kind === 'torpedo' ? 0.9 : 1, 1);
      if (e.kind === 'torpedo') ctx.rotate((e.ang || Math.PI) - Math.PI);
      ellipse(ctx, 1, 2, 8, 5.5, '#ffd84a', '#c49a00', 0.8);
      circle(ctx, -4, -4, 4.5, '#ffd84a', '#c49a00', 0.8);
      ellipse(ctx, -9, -3.5, 3, 1.5, '#ff8a1a');
      eye(ctx, -5, -5, 1.4);
      if (e.kind === 'torpedo') rrect(ctx, 4, -1, 6, 3, 1, '#555');
      break;
    case 'seife':
    case 'miniseife': {
      const r = e.kind === 'seife' ? 12 : 6;
      circle(ctx, 0, 0, r, 'rgba(180,230,255,0.25)', 'rgba(255,255,255,0.9)', 1.2);
      ctx.strokeStyle = 'rgba(255,120,220,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, t * 2, t * 2 + 1.5);
      ctx.stroke();
      circle(ctx, -r * 0.35, -r * 0.35, r * 0.18, '#ffffff');
      break;
    }
    case 'nilpferd':
      ellipse(ctx, 0, 6, 15, 6, '#ff6a6a', '#a03030', 1); // Schwimmring
      ellipse(ctx, 0, 6, 8, 2.5, '#7fd3ff');
      ellipse(ctx, -2, -4, 10, 9, '#9b8ab8', '#4a3a66', 1);
      ellipse(ctx, -9, -2, 6, 5, '#b3a3cf', '#4a3a66', 0.8);
      circle(ctx, -12, -3, 1, '#4a3a66');
      circle(ctx, -12, 0, 1, '#4a3a66');
      eye(ctx, -5, -10, 2);
      eye(ctx, 0, -11, 2);
      circle(ctx, 4, -12, 2, '#9b8ab8', '#4a3a66', 0.6);
      break;
    case 'socke':
      ctx.rotate(Math.sin(t * 8 + e.idx) * 0.5);
      rrect(ctx, -3, -8, 6, 11, 2, e.idx % 2 ? '#e84a4a' : '#4a8ae8', '#222', 0.6);
      rrect(ctx, -8, 1, 11, 6, 3, e.idx % 2 ? '#e84a4a' : '#4a8ae8', '#222', 0.6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -5, 6, 2);
      eye(ctx, -4, 3, 1.3);
      break;
    case 'zwerg':
      ellipse(ctx, 0, 5, 12, 4, '#b9c3cf', '#555', 0.8);
      ellipse(ctx, 0, 4, 6, 2.2, 'rgba(160,255,255,0.4)');
      circle(ctx, 0, -1, 4.5, '#f4c9a8', '#7a5a45', 0.6);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.lineTo(1, -14);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 0, 2.5, 4, 3, '#ffffff'); // Bart
      eye(ctx, -1.5, -1.5, 1.1);
      eye(ctx, 1.5, -1.5, 1.1);
      break;
    case 'gebiss': {
      const open = e.chatter ? Math.abs(Math.sin(t * 30)) * 4 : 2 + Math.sin(t * 6);
      rrect(ctx, -9, -open - 6, 18, 6, 3, '#ff7a8a', '#a03040', 0.8);
      rrect(ctx, -9, open, 18, 6, 3, '#ff7a8a', '#a03040', 0.8);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-8 + i * 3.4, -open - 1, 2.8, 2.5);
        ctx.fillRect(-8 + i * 3.4, open - 1.5, 2.8, 2.5);
      }
      break;
    }
    case 'glas':
      rrect(ctx, -8, -9, 16, 19, 4, 'rgba(190,230,200,0.55)', '#e8fff0', 1);
      rrect(ctx, -9, -12, 18, 4, 1, '#d8a030', '#7a5a10', 0.6);
      for (const [x, y] of [[-3, -2], [3, 3], [-2, 5]]) ellipse(ctx, x, y, 2, 4, '#4f8a2a', null, 0, 0.4);
      break;
    case 'gurke':
      ctx.rotate(t * 6);
      ellipse(ctx, 0, 0, 6, 3, '#4f8a2a', '#2a4a10', 0.6);
      circle(ctx, -2, -1, 0.6, '#a8e080');
      circle(ctx, 2, 1, 0.6, '#a8e080');
      break;
    case 'discokugel':
      circle(ctx, 0, 0, 12, '#c0c8d8', '#555', 0.8);
      DISCO5.slice(0, 4).forEach((col, k) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = k; i < 12; i += 4) {
          const a = i * 0.52 + t;
          ctx.rect(Math.cos(a) * 7 - 1.5, Math.sin(a * 1.3) * 7 - 1.5, 3, 3);
        }
        ctx.fill();
      });
      rrect(ctx, -8, -4, 16, 4, 2, '#111'); // Sonnenbrille
      break;
    case 'wurst':
    case 'miniwurst': {
      const s = e.kind === 'wurst' ? 1 : 0.55;
      ctx.scale(s, s);
      ctx.rotate(Math.sin(t * 5) * 0.4);
      rrect(ctx, -12, -5, 24, 10, 5, '#d8584a', '#7a2018', 1);
      ctx.strokeStyle = '#ffb0a0';
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(8, -2);
      ctx.stroke();
      eye(ctx, -6, 0, 1.8);
      eye(ctx, -1, 0, 1.8);
      break;
    }
    case 'vinyl':
      ctx.rotate(t * 10);
      circle(ctx, 0, 0, 9, '#111', '#444', 0.8);
      circle(ctx, 0, 0, 3, '#ff4fb0');
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();
      break;
    case 'zahnrad':
      drawGear(ctx, 15, 10, t * 1.5, '#8a7a5a', '#4a3a20');
      break;
    case 'wecker': {
      const shake = e.t > 1.8 && !e.rang ? Math.sin(t * 60) * 1.5 : 0;
      ctx.translate(shake, 0);
      circle(ctx, -5, -9, 3.5, '#ffd34d', '#9a7400', 0.6);
      circle(ctx, 5, -9, 3.5, '#ffd34d', '#9a7400', 0.6);
      circle(ctx, 0, 0, 9, '#e84a4a', '#7a1a1a', 1);
      circle(ctx, 0, 0, 6.5, '#ffffff');
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(t * 4) * 5, Math.sin(t * 4) * 5);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -4);
      ctx.stroke();
      break;
    }
    case 'kuckuck':
      rrect(ctx, -9, -9, 18, 18, 2, '#8a5a2a', '#4a2a10', 1);
      ctx.fillStyle = '#4a2a10';
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(0, -16);
      ctx.lineTo(11, -9);
      ctx.closePath();
      ctx.fill();
      circle(ctx, -4 - Math.max(0, Math.sin(t * 4)) * 4, -1, 4, '#e8d84a', '#7a6a10', 0.6);
      ellipse(ctx, -9 - Math.max(0, Math.sin(t * 4)) * 4, -1, 2, 1, '#ff8a1a');
      break;
    case 'brezelhaelfte':
      ctx.rotate(t * 4);
      ctx.strokeStyle = '#a0561f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0.3, Math.PI * 1.4);
      ctx.stroke();
      circle(ctx, 1, -2, 0.6, '#ffffff');
      break;
    case 'feder':
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const y = -5 + (i / 12) * 10;
        const x = Math.sin(i * 1.6 + t * 10) * 3;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    case 'knolle':
      ctx.rotate(t * 2);
      ellipse(ctx, 0, 0, 8, 6, '#c8a060', '#6a4a20', 0.8);
      circle(ctx, 2, 2, 0.8, '#6a4a20');
      eye(ctx, -3, -1, 1.5);
      break;
    default:
      circle(ctx, 0, 0, e.r, '#ff00ff');
  }
  ctx.restore();
}

export function drawGear(ctx, r, teeth, rot, fill, stroke) {
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const rr = i % 2 ? r * 0.78 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  circle(ctx, 0, 0, r * 0.3, stroke);
  ctx.restore();
}

export function drawCapsule(ctx, t) {
  ctx.rotate(Math.sin(t * 3) * 0.4);
  ctx.fillStyle = '#ff4a5a';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-10, 4);
  ctx.closePath();
  ctx.moveTo(6, 0);
  ctx.lineTo(10, -4);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  circle(ctx, 0, 0, 6, '#ff4a5a', '#ffffff', 1.2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 3, t * 4, t * 4 + 2.5);
  ctx.stroke();
}

// ---------------------------------------------------------------- Bosse
export function drawBoss(ctx, b, t) {
  ctx.save();
  const angry = !!b.angry;
  switch (b.kind) {
    case 'kaffeekanne': {
      // Tülle zeigt nach -x (zum Spieler)
      ctx.rotate(Math.sin(t * 2) * 0.08);
      ellipse(ctx, 0, 6, 26, 24, '#f5f5f5', '#3a5a9a', 2);
      ctx.strokeStyle = '#3a5a9a';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(0, 6, 14 + i * 5, 0.3, 2.6);
        ctx.stroke();
      }
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath(); // Tülle
      ctx.moveTo(-20, 0);
      ctx.quadraticCurveTo(-34, -2, -36, -10);
      ctx.lineTo(-30, -10);
      ctx.quadraticCurveTo(-28, 4, -18, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath(); // Henkel
      ctx.arc(26, 6, 10, -1.3, 1.3);
      ctx.lineWidth = 4;
      ctx.stroke();
      const lid = angry ? -8 - Math.abs(Math.sin(t * 10)) * 6 : 0;
      ellipse(ctx, 0, -18 + lid, 14, 5, '#f5f5f5', '#3a5a9a', 2);
      circle(ctx, 0, -24 + lid, 3.5, '#3a5a9a');
      // Gesicht mit Monokel und Schnurrbart
      eye(ctx, -10, -2, 4);
      eye(ctx, 2, -3, 4);
      circle(ctx, 2, -3, 5.5, null, '#c9a227', 1.5);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, 7);
      ctx.quadraticCurveTo(-7, 3, -3, 7);
      ctx.quadraticCurveTo(1, 3, 6, 7);
      ctx.stroke();
      if (angry) {
        ctx.strokeStyle = '#a02020';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, -9);
        ctx.lineTo(-6, -7);
        ctx.moveTo(-1, -9);
        ctx.lineTo(7, -10);
        ctx.stroke();
      }
      break;
    }
    case 'walross': {
      // Badewannen-Schlachtschiff, Kopf (Schwachstelle) bei (-12, -22)
      rrect(ctx, -38, -6, 76, 30, 14, '#f0f0f0', '#7a8a9a', 2);
      ctx.fillStyle = '#7a8a9a';
      for (const x of [-26, 26]) {
        ctx.beginPath();
        ctx.moveTo(x - 4, 24);
        ctx.lineTo(x + 4, 24);
        ctx.lineTo(x + 6, 30);
        ctx.lineTo(x - 6, 30);
        ctx.fill();
      }
      ellipse(ctx, 0, -6, 34, 4, '#8fd8ff');
      rrect(ctx, 18, -30, 8, 26, 2, '#8a96a8', '#4a5260', 1); // Schornstein / Duschkopf
      for (let i = 0; i < 3; i++) circle(ctx, 22 + Math.sin(t * 3 + i) * 3, -36 - i * 8 - ((t * 20) % 8), 3 + i, 'rgba(255,255,255,0.7)');
      ellipse(ctx, -12, -20, 15, 13, '#9a6a4a', '#4a2a1a', 1.5);
      circle(ctx, -20, -18, 5, '#b8886a', '#4a2a1a', 1);
      circle(ctx, -14, -16, 5, '#b8886a', '#4a2a1a', 1);
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); // Stoßzähne
      ctx.moveTo(-21, -14);
      ctx.lineTo(-19, 0);
      ctx.lineTo(-17, -14);
      ctx.moveTo(-15, -12);
      ctx.lineTo(-13, 2);
      ctx.lineTo(-11, -12);
      ctx.fill();
      eye(ctx, -18, -26, 2.5);
      eye(ctx, -9, -27, 2.5);
      rrect(ctx, -24, -38, 22, 6, 2, '#1a2a5a'); // Admiralshut
      ctx.fillStyle = '#1a2a5a';
      ctx.beginPath();
      ctx.moveTo(-28, -33);
      ctx.lineTo(-13, -46);
      ctx.lineTo(2, -33);
      ctx.fill();
      circle(ctx, -13, -38, 2, '#ffd34d');
      break;
    }
    case 'kartoffel': {
      ctx.rotate(Math.sin(t * 3) * 0.12);
      ctx.fillStyle = '#c8a060';
      ctx.strokeStyle = '#6a4a20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const r = 30 + Math.sin(i * 2.7) * 3;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const [x, y] of [[10, 12], [-14, 14], [16, -6], [-4, 18]]) circle(ctx, x, y, 1.5, '#6a4a20');
      eye(ctx, -12, -6, 5);
      eye(ctx, 2, -8, 5);
      ctx.fillStyle = '#7a1a1a';
      ctx.beginPath();
      ctx.ellipse(-8, 8, 8, angry ? 6 : 3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd34d'; // Krone
      ctx.beginPath();
      ctx.moveTo(-14, -26);
      ctx.lineTo(-14, -38);
      ctx.lineTo(-7, -31);
      ctx.lineTo(0, -42);
      ctx.lineTo(7, -31);
      ctx.lineTo(14, -38);
      ctx.lineTo(14, -26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#9a7400';
      ctx.lineWidth = 1;
      ctx.stroke();
      circle(ctx, 0, -32, 2, '#e8574a');
      break;
    }
    case 'diva': {
      circle(ctx, 0, 0, 28, '#c0c8d8', '#555', 1.5);
      // Spiegelplättchen: pro Farbe ein Pfad statt 40 Einzelrechtecke mit Farbwechsel
      DISCO5.forEach((col, k) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = k; i < 40; i += 5) {
          const a = i * 0.7 + t * 0.8;
          const rr = 6 + (i % 5) * 4.5;
          ctx.rect(Math.cos(a) * rr - 2, Math.sin(a) * rr - 2, 4, 4);
        }
        ctx.fill();
      });
      // Diva-Gesicht: Sonnenbrille, Lippenstift, Perücke
      ctx.fillStyle = '#ff4fb0';
      ctx.beginPath();
      ctx.arc(0, -16, 26, Math.PI * 1.1, Math.PI * 1.9);
      ctx.fill();
      rrect(ctx, -20, -8, 16, 8, 3, '#111');
      rrect(ctx, 4, -8, 16, 8, 3, '#111');
      ctx.fillStyle = '#e0204a';
      ctx.beginPath();
      ctx.ellipse(0, 12, 8, angry ? 5 : 3, 0, 0, TAU);
      ctx.fill();
      circle(ctx, 24, 6, 3, '#ffe14d'); // Ohrring
      break;
    }
    case 'wecker': {
      const sh = b.phase >= 2 ? Math.sin(t * 50) * 1.5 : 0;
      ctx.translate(sh, 0);
      // Zwei Glocken oben, Hammer dazwischen, Füßchen unten
      for (const x of [-20, 20]) {
        circle(ctx, x, -34, 12, '#ffd34d', '#9a7400', 2);
        circle(ctx, x, -34, 4, '#9a7400');
      }
      rrect(ctx, -3, -46, 6, 12, 2, '#9a7400');
      for (const x of [-22, 22]) rrect(ctx, x - 4, 30, 8, 10, 3, '#7a1a1a');
      circle(ctx, 0, 0, 36, '#e84a4a', '#7a1a1a', 3);
      circle(ctx, 0, 0, 30, '#fffdf0', '#7a1a1a', 1);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * TAU - Math.PI / 2;
        ctx.fillText(String(i), Math.cos(a) * 24, Math.sin(a) * 24);
      }
      eye(ctx, -9, -8, 4);
      eye(ctx, 9, -8, 4);
      ctx.strokeStyle = '#7a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 8, 8, angry || b.phase >= 2 ? Math.PI + 0.3 : 0.3, angry || b.phase >= 2 ? -0.3 : Math.PI - 0.3);
      ctx.stroke();
      circle(ctx, 0, 0, 3, '#222');
      break;
    }
  }
  ctx.restore();
}

/** Rotierende Gefahrenlinien (Laser, Uhrzeiger). Zeichnung relativ zum Startpunkt. */
export function drawHazard(ctx, h, t, kind) {
  const ex = Math.cos(h.ang) * h.len;
  const ey = Math.sin(h.ang) * h.len;
  ctx.lineCap = 'round';
  if (h.warn) {
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(255,60,60,' + (0.4 + 0.4 * Math.sin(t * 20)) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  if (kind === 'wecker') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = h.width * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = Math.max(1, h.width * 0.6);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,80,200,0.35)';
    ctx.lineWidth = h.width * 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#ffe0f6';
    ctx.lineWidth = h.width;
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
