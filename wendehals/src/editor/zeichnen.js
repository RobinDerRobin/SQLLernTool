// Zeichnet den Plan im Spielbild: Boden und Wand mit den Farben des Prototyps (fenster-draw.js), darüber Bedienhilfen
// (Knoten, Beschriftung, Auswahl, Bildschirmrahmen mit Dackel, Maßstab). Nur Zeichnen – ändert keine Daten.
import { drawDackel } from '../render/sprites.js';
import { FLOOR, FLOOR2, WALL, GRID, SCREEN_W, SCREEN_H, FARBEN, KNOTEN_RADIUS_PX } from './konstanten.js';
import { bodenPolygone, wandPolygone, knotenMap, gangMasse, gangPolygon, rahmenEcken, rechteck } from './daten.js';
import { KNOTENTYPEN } from './katalog.js';
import { teilFinden, hatMasse, teilEcken } from './teile.js';

const MAX_ZELLEN = 40000; // Schachbrett nur zeichnen, wenn es nicht Zehntausende Felder werden

function pfad(ctx, polys) {
  ctx.beginPath();
  for (const p of polys) {
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }
}

const farbeVon = (pfadName) => pfadName.split('.').reduce((o, k) => o[k], FARBEN);

/** Ist die Schachbrett-Zelle (i, j) hell? Dieselbe Regel wie der Prototyp (fenster-draw.js: (i + j) ungerade → FLOOR2). */
export const schachbrettHell = (x, y) => Math.abs(Math.floor(x / GRID) + Math.floor(y / GRID)) % 2 === 1;

function text(ctx, t, x, y, farbe = '#fff', ausrichtung = 'center') {
  ctx.font = '12px sans-serif';
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = farbe;
  ctx.fillText(t, x, y);
}

/**
 * z: { uebergaenge: [{ knoten, text }] (Ringe an Knoten mit Übergang), auswahl: {art:'gang'|'knoten'|'objekt'|'notiz'|'formteil', id} | null, fahrt: {gang, s} | null, zeit, beschriftung }
 * (beschriftung: false blendet Knoten, Namen, Notizen und Maßstab aus – dann sieht man nur das Spielbild)
 * Gibt zurück, wie viele Schachbrettfelder gezeichnet wurden (für Tests).
 */
export function zeichnePlan(ctx, g, ansicht, z = {}, dpr = 1) {
  const zeit = z.zeit || 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, ansicht.w, ansicht.h);
  if (!g) return 0;

  const s = ansicht.masstab;
  const boden = bodenPolygone(g);
  ansicht.anwenden(ctx, dpr);

  // Boden, darauf das Schachbrett (nur im Boden, nur der sichtbare Teil)
  pfad(ctx, boden);
  ctx.fillStyle = FLOOR;
  ctx.fill();
  let zellen = 0;
  const sicht = ansicht.sichtbar();
  const i0 = Math.floor(sicht.x0 / GRID);
  const i1 = Math.floor(sicht.x1 / GRID);
  const j0 = Math.floor(sicht.y0 / GRID);
  const j1 = Math.floor(sicht.y1 / GRID);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) <= MAX_ZELLEN) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = FLOOR2;
    ctx.beginPath();
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        if (Math.abs(i + j) % 2 === 1) {
          ctx.rect(i * GRID, j * GRID, GRID, GRID);
          zellen++;
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  // Wände schneiden den Boden aus
  const waende = wandPolygone(g);
  if (waende.length) {
    pfad(ctx, waende);
    ctx.fillStyle = WALL;
    ctx.fill();
  }

  // Hindernisse: Platzhalterbild (Spielgrafik folgt mit Stufe 6), kenntlich an Farbe und Kreuz
  for (const o of g.objekte) {
    if (o.typ !== 'hindernis') continue;
    const e = teilEcken(o);
    pfad(ctx, [e]);
    ctx.fillStyle = FARBEN.hindernis;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2 / s;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e[0][0], e[0][1]);
    ctx.lineTo(e[2][0], e[2][1]);
    ctx.moveTo(e[1][0], e[1][1]);
    ctx.lineTo(e[3][0], e[3][1]);
    ctx.stroke();
  }

  const km = knotenMap(g);
  const au = z.auswahl;

  // Auswahl: Umriss
  if (au) {
    ctx.lineWidth = 3 / s;
    ctx.strokeStyle = FARBEN.auswahl;
    if (au.art === 'gang') {
      const gang = g.gaenge.find((x) => x.id === au.id);
      const p = gang && gangPolygon(g, gang, km);
      if (p) {
        pfad(ctx, [p]);
        ctx.stroke();
      }
    } else if (au.art === 'knoten') {
      const k = km.get(au.id);
      if (k && k.w && k.h) {
        pfad(ctx, [rechteck(k.x, k.y, k.w, k.h, 0)]);
        ctx.stroke();
      }
    } else if (au.art === 'formteil' || au.art === 'objekt') {
      const o = teilFinden(g, au.art, au.id);
      if (o && hatMasse(au.art, o)) {
        pfad(ctx, [teilEcken(o)]);
        ctx.stroke();
      } else if (o) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Gegner-Platzhalter (Spielgrafik folgt mit Stufe 6)
  for (const o of g.objekte) {
    if (o.typ !== 'gegner') continue;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,154,60,0.55)';
    ctx.fill();
    ctx.lineWidth = 2 / s;
    ctx.strokeStyle = FARBEN.platzhalter;
    ctx.stroke();
  }

  // Bildschirmrahmen mit Dackel
  let rahmen = null;
  if (z.fahrt) {
    const gang = g.gaenge.find((x) => x.id === z.fahrt.gang);
    const m = gang && gangMasse(g, gang, km);
    if (m && m.laenge > 0) {
      rahmen = rahmenEcken(m, z.fahrt.s);
      const gross = Math.max(sicht.x1 - sicht.x0, sicht.y1 - sicht.y0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(sicht.x0 - gross, sicht.y0 - gross, 3 * gross, 3 * gross);
      ctx.moveTo(rahmen[0][0], rahmen[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(rahmen[i][0], rahmen[i][1]);
      ctx.closePath();
      ctx.fillStyle = FARBEN.rahmenAussen;
      ctx.fill('evenodd');
      ctx.restore();
      pfad(ctx, [rahmen]);
      ctx.lineWidth = 2 / s;
      ctx.strokeStyle = FARBEN.rahmen;
      ctx.stroke();
      if (s > 0.12) {
        const mitte = [(rahmen[0][0] + rahmen[2][0]) / 2, (rahmen[0][1] + rahmen[2][1]) / 2];
        ctx.save();
        ctx.translate(mitte[0], mitte[1]);
        ctx.rotate(Math.atan2(m.uy, m.ux));
        ctx.translate(-SCREEN_W / 4, 0); // der Dackel steht im Bild links der Mitte (wie im Prototyp: dog.x = 120 von 480)
        drawDackel(ctx, zeit);
        ctx.restore();
      }
    }
  }

  // Prüfer-Marken: Engstellen als Streifen, andere Fundstellen als Ring (nur wenn die Prüferliste offen ist)
  for (const m of z.marken || []) {
    const o = m.ort;
    if (!o) continue;
    const farbe = m.art === 'MUSS' ? FARBEN.pruefMuss : FARBEN.pruefSoll;
    ctx.strokeStyle = farbe;
    ctx.fillStyle = farbe;
    if (o.x1 != null) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(20, 14 / s);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(o.x1, o.y1);
      ctx.lineTo(o.x2, o.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 3 / s;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 12 / s + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vorschau des aktiven Werkzeugs (in Weltkoordinaten)
  z.vorschau?.(ctx);

  // Überlagerung in Bildschirmkoordinaten: Knoten, Beschriftung, Maßstab
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (z.beschriftung === false) return zellen;
  const sichtbarPx = (px, py) => px > -40 && py > -40 && px < ansicht.w + 40 && py < ansicht.h + 40;
  // Bereich des Gebiets: gestrichelter Rahmen mit Namen (er sagt, wo das Gebiet auf dem Plan liegt)
  if (g.bereich) {
    const b = g.bereich;
    const ecken = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => ansicht.weltZuBild(x, y));
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = FARBEN.bereich;
    ctx.beginPath();
    ctx.moveTo(ecken[0][0], ecken[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(ecken[i][0], ecken[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    const [lx, ly] = ecken.reduce((best, e) => (e[1] < best[1] || (e[1] === best[1] && e[0] < best[0]) ? e : best), ecken[0]);
    if (sichtbarPx(lx, ly)) text(ctx, `Bereich „${g.name}“`, lx + 8, ly + 12, FARBEN.bereich, 'left');
  }
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang, km);
    if (!m) continue;
    const [px, py] = ansicht.weltZuBild((m.a.x + m.b.x) / 2, (m.a.y + m.b.y) / 2);
    if (sichtbarPx(px, py) && m.laenge * s > 60) text(ctx, gang.name || gang.id, px, py, z.auswahl?.art === 'gang' && z.auswahl.id === gang.id ? FARBEN.auswahl : '#fff');
  }
  for (const k of g.knoten) {
    const [px, py] = ansicht.weltZuBild(k.x, k.y);
    if (!sichtbarPx(px, py)) continue;
    const typ = KNOTENTYPEN[k.typ];
    ctx.beginPath();
    ctx.arc(px, py, KNOTEN_RADIUS_PX, 0, Math.PI * 2);
    ctx.fillStyle = typ ? farbeVon(typ.farbe) : '#f0f';
    ctx.fill();
    ctx.lineWidth = z.auswahl?.art === 'knoten' && z.auswahl.id === k.id ? 3 : 1.5;
    ctx.strokeStyle = z.auswahl?.art === 'knoten' && z.auswahl.id === k.id ? FARBEN.auswahl : '#000';
    ctx.stroke();
    text(ctx, k.id, px, py - KNOTEN_RADIUS_PX - 8);
  }
  for (const m of z.uebergaenge || []) {
    const k = km.get(m.knoten);
    if (!k) continue;
    const [px, py] = ansicht.weltZuBild(k.x, k.y);
    if (!sichtbarPx(px, py)) continue;
    ctx.beginPath();
    ctx.arc(px, py, KNOTEN_RADIUS_PX + 5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = FARBEN.uebergang;
    ctx.stroke();
    text(ctx, m.text, px, py + KNOTEN_RADIUS_PX + 16, FARBEN.uebergang);
  }
  for (const o of g.objekte) {
    if (o.typ !== 'gegner') continue;
    const [px, py] = ansicht.weltZuBild(o.x, o.y);
    if (sichtbarPx(px, py)) text(ctx, `Platzhalter: ${o.art}`, px, py + 26, FARBEN.platzhalter);
  }
  for (const o of g.objekte) {
    if (o.typ !== 'hindernis') continue;
    const [px, py] = ansicht.weltZuBild(o.x, o.y);
    if (sichtbarPx(px, py) && o.laenge * s > 40) text(ctx, 'Hindernis (Platzhalter)', px, py, '#fff');
  }
  for (const n of g.notizen) {
    const [px, py] = ansicht.weltZuBild(n.x, n.y);
    if (!sichtbarPx(px, py)) continue;
    ctx.fillStyle = FARBEN.notiz;
    ctx.fillRect(px - 5, py - 5, 10, 10);
    text(ctx, n.text, px + 10, py, FARBEN.notiz, 'left');
  }

  // Maßstab: größte „runde“ Länge, die höchstens ein Drittel der Breite einnimmt
  const runde = [20, 100, 480, 960, 1920, 4800, 9600];
  let laenge = runde[0];
  for (const l of runde) if (l * s <= ansicht.w / 3) laenge = l;
  const x0 = 16;
  const y0 = ansicht.h - 18;
  ctx.strokeStyle = FARBEN.massstab;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 5);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + laenge * s, y0);
  ctx.lineTo(x0 + laenge * s, y0 - 5);
  ctx.stroke();
  text(ctx, laenge === SCREEN_W ? '480 E = 1 Bildschirm' : `${laenge} E`, x0, y0 - 14, '#fff', 'left');
  return zellen;
}
