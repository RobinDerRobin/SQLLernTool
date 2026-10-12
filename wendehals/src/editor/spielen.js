// „Spielen ab hier“ (Stufe 3): Editor-Daten → Karte für den Fenster-Prototyp (src/proto/fenster.js), Startlage an der Rahmenstelle.
// Reine Daten und Geometrie – kein DOM, läuft auch unter Node (Tests). Die Fenster-Regeln (Kamera, Drehen, Tod) kommen unverändert
// von FensterScene; hier steht nur, was die Editor-Karte daraus macht und was der Prototyp (noch) nicht spielen kann.
import { E, S, W, N, isHorizontal } from '../core/math.js';
import { FensterScene } from '../proto/fenster.js';
import { compileEditorMap } from '../proto/editor-karte.js';
import { WALL } from '../proto/fenster-draw.js';
import { knotenMap, gangMasse, gangPunkt } from './daten.js';
import { FARBEN, SCREEN_W, SCREEN_H } from './konstanten.js';

const EPS = 1e-6;
const KNOCHEN_FARBEN = ['#e0443a', '#3f7be0', '#3fb04a', '#e8c63a', '#b060e0', '#f08a30'];
const KNOCHEN_ABSTAND = 30; // Knochen am Gangende sitzen so weit vor der Wand (wie BONE_AT = END − 30)
export const DACKEL_BILD = { x: SCREEN_W / 4, y: SCREEN_H / 2 }; // Bildschirmstelle des Dackels = wie im Rahmen des Editors
const RECHTWINKLIG = 90;

const recht90 = (winkel) => Math.abs(winkel / RECHTWINKLIG - Math.round(winkel / RECHTWINKLIG)) < EPS;
const kardinal = (richtung) => richtung === E || richtung === S || richtung === W || richtung === N;

/** Achsenparalleles Rechteck eines Teils (Winkel Vielfache von 90°). */
function teilRechteck(t) {
  const quer = Math.round(t.winkel / RECHTWINKLIG) % 2 !== 0;
  const w = quer ? t.breite : t.laenge;
  const h = quer ? t.laenge : t.breite;
  return { x0: t.x - w / 2, x1: t.x + w / 2, y0: t.y - h / 2, y1: t.y + h / 2 };
}

/**
 * Was der Fenster-Prototyp in diesem Gebiet (noch) nicht spielen kann – leer = spielbar. `hinweise` sind Dinge, die der Prototyp
 * zwar spielt, aber anders als gezeichnet (Gegner). Der Prüfer (Regel M7) ruft dasselbe auf. Texte beginnen nicht mit
 * „noch nicht spielbar“; das setzt die Oberfläche davor.
 */
export function spielbarkeit(g) {
  const probleme = [];
  const hinweise = [];
  const km = knotenMap(g);
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang, km);
    if (!m) probleme.push(`Gang „${gang.name || gang.id}“ hat einen Knoten, den es nicht gibt.`);
    else if (m.laenge < EPS) probleme.push(`Gang „${gang.name || gang.id}“ hat die Länge 0.`);
    else if (!kardinal(m.richtung)) probleme.push(`Gang „${gang.name || gang.id}“ liegt nicht in Ost-West- oder Nord-Süd-Richtung (${m.richtungName ?? 'kein 45°-Raster'}); die Karte des Fenster-Prototyps kennt nur gerade Gänge.`);
  }
  for (const k of g.knoten) if (k.form === 'achteck') probleme.push(`Knoten ${k.id} ist ein Achteck; die Karte des Fenster-Prototyps kennt nur Rechtecke.`);
  for (const f of g.formteile) if (!recht90(f.winkel)) probleme.push(`Formteil ${f.id} steht im Winkel ${f.winkel}°; nur 0° und 90° sind spielbar.`);
  for (const o of g.objekte) {
    if (o.typ === 'gegner') hinweise.push(`Gegner ${o.id} (${o.art}) wird im Fenster-Prototyp nicht gespielt.`);
    else if (!recht90(o.winkel)) probleme.push(`${o.typ === 'wand' ? 'Wand' : 'Hindernis'} ${o.id} steht im Winkel ${o.winkel}°; nur 0° und 90° sind spielbar.`);
  }
  if (!g.gaenge.length) probleme.push('Das Gebiet hat keinen Gang.');
  return { probleme, hinweise };
}

/** Gänge zu Gang-Rechtecken der Karte: jedes Ende reicht bis an den Rand seiner Knotenfläche; gleiche Achse/Linie/Breite verschmilzt. */
function gangRechtecke(g) {
  const km = knotenMap(g);
  const gruppen = new Map();
  for (const gang of g.gaenge) {
    const m = gangMasse(g, gang, km);
    const waagrecht = isHorizontal(m.richtung);
    const a = km.get(gang.von);
    const b = km.get(gang.nach);
    const reicht = (k) => (k.w && k.h ? (waagrecht ? k.w : k.h) / 2 : 0);
    const [pa, pb] = waagrecht ? [a.x, b.x] : [a.y, b.y];
    const lo = Math.min(pa - reicht(a), pb - reicht(b));
    const hi = Math.max(pa + reicht(a), pb + reicht(b));
    const achse = waagrecht ? 'h' : 'v';
    const c = waagrecht ? a.y : a.x;
    const schluessel = `${achse}|${c}|${gang.breite}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, { axis: achse, c, w: gang.breite, teile: [] });
    gruppen.get(schluessel).teile.push([lo, hi]);
  }
  const out = [];
  for (const gr of gruppen.values()) {
    gr.teile.sort((p, q) => p[0] - q[0]);
    let cur = null;
    for (const [lo, hi] of gr.teile) {
      if (cur && lo <= cur.a1 + EPS) cur.a1 = Math.max(cur.a1, hi);
      else {
        cur = { axis: gr.axis, c: gr.c, w: gr.w, a0: lo, a1: hi };
        out.push(cur);
      }
    }
  }
  out.forEach((c, i) => (c.id = `${c.axis}${i}`));
  return out;
}

/** Editor-Gebiet → Karte (compileEditorMap) samt Knochen. Nur aufrufen, wenn spielbarkeit() keine Probleme meldet. */
export function baueKarte(g) {
  const km = knotenMap(g);
  const corridors = gangRechtecke(g);
  const extraFloor = [];
  for (const k of g.knoten) if (k.w && k.h) extraFloor.push({ x0: k.x - k.w / 2, x1: k.x + k.w / 2, y0: k.y - k.h / 2, y1: k.y + k.h / 2 });
  for (const f of g.formteile) extraFloor.push(teilRechteck(f));
  const blocks = [];
  for (const o of g.objekte) {
    if (o.typ === 'wand') blocks.push({ ...teilRechteck(o), farbe: WALL });
    else if (o.typ === 'hindernis') blocks.push({ ...teilRechteck(o), farbe: FARBEN.hindernis });
  }
  // Knochen (Spielziel des Prototyps): Enden und Räume; Gangende liegt „vor der Wand“ im Gang
  const bones = [];
  const neu = (x, y, name) => bones.push({ x, y, name, color: KNOCHEN_FARBEN[bones.length % KNOCHEN_FARBEN.length] });
  for (const k of g.knoten) {
    if (k.typ === 'ende') {
      const gang = g.gaenge.find((x) => x.von === k.id || x.nach === k.id);
      const m = gang && gangMasse(g, gang, km);
      if (m) {
        const hinein = gang.von === k.id ? 1 : -1; // vom Knoten in den Gang hinein
        neu(k.x + m.ux * hinein * KNOCHEN_ABSTAND, k.y + m.uy * hinein * KNOCHEN_ABSTAND, k.id);
        continue;
      }
    }
    if (k.typ === 'raum' || k.typ === 'boss') neu(k.x, k.y, k.id);
  }
  if (!bones.length) {
    const m = gangMasse(g, g.gaenge[0], km);
    neu(m.b.x - m.ux * KNOCHEN_ABSTAND, m.b.y - m.uy * KNOCHEN_ABSTAND, g.gaenge[0].nach);
  }
  const a0 = corridors[0];
  return compileEditorMap({ name: g.id, corridors, extraFloor, blocks, bones, start: { corridor: a0.id, cam: { x: 0, y: 0 }, dog: { ...DACKEL_BILD }, theta: E, s: 'R', notTarget: -1 } });
}

/**
 * Startlage an der Rahmenstelle: der Rahmen (480 × 270 E) liegt mit seiner Mitte bei Stelle `s` auf dem Gang, der Dackel steht
 * im Bild bei (120, 135), also 120 E hinter der Rahmenmitte – genau wie ihn der Editor im Rahmen zeichnet.
 */
export function startLage(g, gangId, s) {
  const gang = g.gaenge.find((x) => x.id === gangId);
  const m = gang && gangMasse(g, gang);
  if (!m) return null;
  const p = gangPunkt(m, s - (SCREEN_W / 2 - DACKEL_BILD.x));
  return { x: p.x, y: p.y, theta: m.richtung };
}

/** Szene für den Fenster-Prototyp an der Rahmenstelle des Gangs (Fehler als Error mit verständlichem Text). */
export function erzeugeSzene(g, gangId, s) {
  const { probleme } = spielbarkeit(g);
  if (probleme.length) throw new Error('noch nicht spielbar: ' + probleme.join(' · '));
  const lage = startLage(g, gangId, s);
  if (!lage) throw new Error(`Gang ${gangId} gibt es nicht.`);
  const karte = baueKarte(g);
  const sc = new FensterScene({ map: karte });
  sc.minimap = false; // Minimap (P2) gehört nicht zu dieser Szene
  sc.hint = 0;
  sc.warp(lage.x, lage.y, lage.theta, 'R', { ...DACKEL_BILD });
  sc.fixDog(); // steht die Startstelle nicht auf Boden (z. B. Stelle nahe dem Gangende), kommt der Dackel auf den nächsten Boden
  return sc;
}
