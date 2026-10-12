// Zeichnet die Welt-Ansicht (Stufe 5): alle Gebiete als Boden im Spielbild-Farbton, ihr Bereich als Rahmen mit Namen,
// die Übergänge als Linien zwischen den Knoten. Nur Zeichnen – ändert keine Daten.
import { FLOOR, WALL, FARBEN, KNOTEN_RADIUS_PX } from './konstanten.js';
import { bodenPolygone, wandPolygone } from './daten.js';
import { weltLagen, weltBereich, uebergaengeVon, uebergangPunkte } from './welt.js';
import { KNOTENTYPEN } from './katalog.js';

function pfad(ctx, polys, dx, dy) {
  ctx.beginPath();
  for (const p of polys) {
    ctx.moveTo(p[0][0] + dx, p[0][1] + dy);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0] + dx, p[i][1] + dy);
    ctx.closePath();
  }
}

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

/** Distanz eines Bildschirmpunkts zu einer Strecke (für Klicks auf Übergänge). */
export function abstandZuStrecke(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * w: { beschriftung, welt, gebiete, auswahl: {art:'gebiet'|'uebergang', id} | null, aktuell: Gebiets-ID, marken: Meldungen | null }
 * (die Lagen kommen aus weltLagen; das gerade gezogene Gebiet hat seine Lage schon in `welt`).
 */
export function zeichneWelt(ctx, w, ansicht, dpr = 1) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, ansicht.w, ansicht.h);
  const s = ansicht.masstab;
  const lagen = weltLagen(w.welt, w.gebiete);
  ansicht.anwenden(ctx, dpr);

  // Bereiche (Fläche leicht aufgehellt) und Boden
  for (const e of w.welt.gebiete) {
    const g = w.gebiete[e.id];
    const l = lagen.get(e.id);
    if (!g || !l) continue;
    const r = weltBereich(g, l);
    ctx.fillStyle = 'rgba(127,179,255,0.07)';
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    pfad(ctx, bodenPolygone(g), l.x, l.y);
    ctx.fillStyle = FLOOR;
    ctx.fill();
    const waende = wandPolygone(g);
    if (waende.length) {
      pfad(ctx, waende, l.x, l.y);
      ctx.fillStyle = WALL;
      ctx.fill();
    }
  }
  // Rahmen der Bereiche
  for (const e of w.welt.gebiete) {
    const g = w.gebiete[e.id];
    const l = lagen.get(e.id);
    if (!g || !l) continue;
    const r = weltBereich(g, l);
    const gewaehlt = w.auswahl?.art === 'gebiet' && w.auswahl.id === e.id;
    ctx.lineWidth = (gewaehlt ? 3 : 2) / s;
    ctx.setLineDash(gewaehlt ? [] : [14 / s, 8 / s]);
    ctx.strokeStyle = gewaehlt ? FARBEN.auswahl : FARBEN.bereich;
    ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
  }
  ctx.setLineDash([]);
  // Übergänge
  for (const u of uebergaengeVon(w.welt)) {
    const p = uebergangPunkte(u, w.gebiete, lagen);
    if (!p) continue;
    const gewaehlt = w.auswahl?.art === 'uebergang' && w.auswahl.id === u.id;
    ctx.lineWidth = (gewaehlt ? 5 : 3) / s;
    ctx.strokeStyle = gewaehlt ? FARBEN.auswahl : FARBEN.uebergang;
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    ctx.lineTo(p[1].x, p[1].y);
    ctx.stroke();
  }
  // Prüfer-Marken (Welt-Regeln)
  for (const m of w.marken || []) {
    const o = m.ort;
    if (o?.art !== 'gebiet') continue;
    const g = w.gebiete[o.id];
    const l = lagen.get(o.id);
    if (!g || !l) continue;
    const r = weltBereich(g, l);
    ctx.strokeStyle = m.art === 'MUSS' ? FARBEN.pruefMuss : FARBEN.pruefSoll;
    ctx.lineWidth = 6 / s;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    ctx.globalAlpha = 1;
  }

  // Beschriftung in Bildschirmkoordinaten
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (w.beschriftung === false) return; // L blendet Namen, Knoten und Übergangstexte aus (nur das Bild)
  for (const e of w.welt.gebiete) {
    const g = w.gebiete[e.id];
    const l = lagen.get(e.id);
    if (!g || !l) continue;
    const r = weltBereich(g, l);
    // Name an der obersten Ecke des Bereichs (wie in der Gebiet-Ansicht), damit er den Boden nicht verdeckt
    const ecken = [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].map(([x, y]) => ansicht.weltZuBild(x, y));
    const [px, py] = ecken.reduce((best, c) => (c[1] < best[1] || (c[1] === best[1] && c[0] < best[0]) ? c : best), ecken[0]);
    const aktuell = e.id === w.aktuell;
    text(ctx, e.name + (aktuell ? ' (geöffnet)' : ''), px + 8, py + 12, aktuell ? FARBEN.rahmen : '#fff', 'left');
    for (const k of g.knoten) {
      const [kx, ky] = ansicht.weltZuBild(k.x + l.x, k.y + l.y);
      if (kx < -20 || ky < -20 || kx > ansicht.w + 20 || ky > ansicht.h + 20) continue;
      const typ = KNOTENTYPEN[k.typ];
      ctx.beginPath();
      ctx.arc(kx, ky, Math.max(3, KNOTEN_RADIUS_PX - 2), 0, Math.PI * 2);
      ctx.fillStyle = typ ? typ.farbe.split('.').reduce((o, n) => o[n], FARBEN) : '#f0f';
      ctx.fill();
    }
  }
  for (const u of uebergaengeVon(w.welt)) {
    const p = uebergangPunkte(u, w.gebiete, lagen);
    if (!p) continue;
    const [mx, my] = ansicht.weltZuBild((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
    text(ctx, `${u.id}: ${u.von} ↔ ${u.nach}`, mx, my - 10, FARBEN.uebergang);
  }
}
