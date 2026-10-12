// Zeichnet den Plan im Spielbild: Boden und Wand mit den Farben des Prototyps (fenster-draw.js), darüber Bedienhilfen
// (Knoten, Beschriftung, Auswahl, Bildschirmrahmen mit Dackel, Maßstab). Nur Zeichnen – ändert keine Daten.
import { drawDackel, drawEnemy } from '../render/sprites.js';
import { FLOOR, FLOOR2, WALL, GRID, SCREEN_W, SCREEN_H, FARBEN, KNOTEN_RADIUS_PX, GEGNER_RADIUS, NOTIZ_ANZEIGE } from './konstanten.js';
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

/** Gegner in Spielgrafik (drawEnemy des Spiels) an der Stelle (x, y); `art` ist der Name des v0.2-Gegners. */
export function zeichneGegner(ctx, art, x, y, zeit = 0, skala = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(skala, skala);
  drawEnemy(ctx, { kind: art, idx: 0, ang: 0, r: 12, rang: 0, t: zeit, chatter: 0, splitting: 0, dormant: 0 }, zeit);
  ctx.restore();
}

/**
 * Fügt den Umriss eines Dings (Gang, Knoten, Formteil, Wand, Hindernis, Gegner) um (dx, dy) versetzt als Pfad an und zeichnet ihn mit dem
 * eingestellten Strich (der Aufrufer setzt Farbe und Breite). `s` = Maßstab (Bildschirmpixel je E) für Marken fester Pixelgröße.
 */
export function zeichneUmriss(ctx, g, ding, s, dx = 0, dy = 0, km = knotenMap(g), ring = true) {
  const versetzt = (poly) => poly.map(([x, y]) => [x + dx, y + dy]);
  if (ding.art === 'gang') {
    const gang = g.gaenge.find((x) => x.id === ding.id);
    const p = gang && gangPolygon(g, gang, km);
    if (p) {
      pfad(ctx, [versetzt(p)]);
      ctx.stroke();
    }
  } else if (ding.art === 'knoten') {
    const k = km.get(ding.id);
    if (!k) return;
    if (k.w && k.h) {
      pfad(ctx, [versetzt(rechteck(k.x, k.y, k.w, k.h, 0))]);
      ctx.stroke();
    }
    if (ring) {
      ctx.beginPath();
      ctx.arc(k.x + dx, k.y + dy, (KNOTEN_RADIUS_PX + 4) / s, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (ding.art === 'formteil' || ding.art === 'objekt' || ding.art === 'notiz') {
    const o = teilFinden(g, ding.art, ding.id);
    if (o && hatMasse(ding.art, o)) {
      pfad(ctx, [versetzt(teilEcken(o))]);
      ctx.stroke();
    } else if (o) {
      ctx.beginPath();
      ctx.arc(o.x + dx, o.y + dy, GEGNER_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * z: { uebergaenge: [{ knoten, text }] (Ringe an Knoten mit Übergang), auswahl: {art:'gang'|'knoten'|'objekt'|'notiz'|'formteil', id} | null, fahrt: {gang, s} | null, zeit, beschriftung }
 * look: { boden, boden2, wand, hindernis } (Farben des Tilesets) oder weggelassen = Prototyp-Farben
 * (beschriftung: false blendet Knoten, Namen, Notizen und Maßstab aus – dann sieht man nur das Spielbild)
 * Gibt zurück, wie viele Schachbrettfelder gezeichnet wurden (für Tests).
 */
export function zeichnePlan(ctx, g, ansicht, z = {}, dpr = 1) {
  const zeit = z.zeit || 0;
  const look = { boden: FLOOR, boden2: FLOOR2, wand: WALL, hindernis: FARBEN.hindernis, ...(z.look || {}) };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = look.wand;
  ctx.fillRect(0, 0, ansicht.w, ansicht.h);
  if (!g) return 0;

  const s = ansicht.masstab;
  const boden = bodenPolygone(g);
  ansicht.anwenden(ctx, dpr);

  // Boden, darauf das Schachbrett (nur im Boden, nur der sichtbare Teil)
  pfad(ctx, boden);
  ctx.fillStyle = look.boden;
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
    ctx.fillStyle = look.boden2;
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
    ctx.fillStyle = look.wand;
    ctx.fill();
  }

  // Hindernisse: Vollfläche in der Hindernisfarbe, wie sie der Fenster-Prototyp zeichnet (spielen.js: block.farbe)
  for (const o of g.objekte) {
    if (o.typ !== 'hindernis') continue;
    pfad(ctx, [teilEcken(o)]);
    ctx.fillStyle = look.hindernis;
    ctx.fill();
    ctx.lineWidth = 2 / s;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }

  const km = knotenMap(g);
  const au = z.auswahl;

  // Auswahl: Umriss (alle gewählten Dinge; `auswahlen` = die ganze Auswahl, `auswahl` = das zuletzt gewählte)
  const liste = z.auswahlen ?? (au ? [au] : []);
  const gewaehlt = (art, id) => liste.some((d) => d.art === art && d.id === id);
  ctx.lineWidth = 3 / s;
  ctx.strokeStyle = FARBEN.auswahl;
  for (const d of liste) zeichneUmriss(ctx, g, d, s, 0, 0, km, false); // Knoten bekommen ihren Auswahlring in der Bildschirm-Überlagerung unten

  // Gegner: Spielgrafik des v0.2-Gegners, darum ein orangefarbener Ring = Platzhalter (Verhalten im Fenster ungeprüft)
  for (const o of g.objekte) {
    if (o.typ !== 'gegner') continue;
    zeichneGegner(ctx, o.art, o.x, o.y, zeit);
    ctx.beginPath();
    ctx.arc(o.x, o.y, GEGNER_RADIUS + 4, 0, Math.PI * 2);
    ctx.lineWidth = 2 / s;
    ctx.setLineDash([5 / s, 4 / s]);
    ctx.strokeStyle = FARBEN.platzhalter;
    ctx.stroke();
    ctx.setLineDash([]);
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
    if (sichtbarPx(px, py) && m.laenge * s > 60) text(ctx, gang.name || gang.id, px, py, gewaehlt('gang', gang.id) ? FARBEN.auswahl : '#fff');
  }
  for (const k of g.knoten) {
    const [px, py] = ansicht.weltZuBild(k.x, k.y);
    if (!sichtbarPx(px, py)) continue;
    const typ = KNOTENTYPEN[k.typ];
    ctx.beginPath();
    ctx.arc(px, py, KNOTEN_RADIUS_PX, 0, Math.PI * 2);
    ctx.fillStyle = typ ? farbeVon(typ.farbe) : '#f0f';
    ctx.fill();
    ctx.lineWidth = gewaehlt('knoten', k.id) ? 3 : 1.5;
    ctx.strokeStyle = gewaehlt('knoten', k.id) ? FARBEN.auswahl : '#000';
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
    if (sichtbarPx(px, py) && o.laenge * s > 40) text(ctx, 'Hindernis', px, py, '#fff');
  }
  for (const n of g.notizen) {
    const [px, py] = ansicht.weltZuBild(n.x, n.y);
    if (!sichtbarPx(px, py)) continue;
    ctx.fillStyle = FARBEN.notiz;
    ctx.fillRect(px - 5, py - 5, 10, 10);
    const kurz = n.text.length > NOTIZ_ANZEIGE ? n.text.slice(0, NOTIZ_ANZEIGE - 1) + '…' : n.text;
    text(ctx, kurz, px + 10, py, gewaehlt('notiz', n.id) ? FARBEN.auswahl : FARBEN.notiz, 'left');
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
