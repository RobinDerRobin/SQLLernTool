// Bot-Spieltest (Stufe 9): fliegt jedes Level (jeden Gang) eines Gebiets im Fenster-Prototyp ab – nur mit dem, was ein Spieler hat
// (Stick, Drehen, Umkehr) – und meldet Tod, Steckenbleiben und Zeitüberschreitung mit der Bezeichnung der Stelle.
// Reine Rechnung (kein DOM), läuft unter Node und im Browser. Der Wegfinder `NavBot` ist der aus tests/helpers/netz-bot.mjs
// (dort getestet), hier als Quelltext-Modul, weil der Build nichts aus tests/ einbinden soll.
import { DIR_VEC, turnCW, SCREEN_W } from '../core/math.js';
import { erzeugeSzene, spielbarkeit, DACKEL_BILD } from './spielen.js';
import { gangMasse, gangPunkt, bezeichnung, knotenMap } from './daten.js';
import { BONE_R } from '../proto/fenster.js';

const DT = 1 / 60;
const STEP = 20;
const CLEAR = 30; // Abstand zur Wand beim Planen (deutlich größer als der Dackelradius: das Scrollen trägt den Dackel mit)
const CLEAR_ENG = 16; // Notlösung für Engstellen, durch die der Plan mit CLEAR nicht kommt (Dackelradius 8)
const VORAUS_QUER = 10; // so viele Zellen (×20 E) schaut der Bot für die Quersteuerung voraus (Hindernisse umfliegen)
const ZIEL_VOR_ENDE = 30; // Ziel liegt so weit vor dem Gangende (wie der Knochen am Gangende)
const STECKEN_ZEIT = 8; // so lange darf der Bot sich dem Ziel nicht um STECKEN_FORTSCHRITT nähern
const STECKEN_FORTSCHRITT = 10;
const ZEIT_FAKTOR = 2; // Zeitgrenze = Faktor × (Länge / Scrolltempo) + Zuschlag
const ZEIT_ZUSCHLAG = 30;
const SCROLL = 70;

export class NavBot {
  constructor(map, clear = CLEAR) {
    this.map = map;
    const b = map.bounds;
    this.x0 = Math.ceil(b.x0 / STEP) * STEP;
    this.y0 = Math.ceil(b.y0 / STEP) * STEP;
    this.nx = Math.floor((b.x1 - this.x0) / STEP) + 1;
    this.ny = Math.floor((b.y1 - this.y0) / STEP) + 1;
    this.ok = new Uint8Array(this.nx * this.ny);
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) this.ok[j * this.nx + i] = map.walkable(this.x0 + i * STEP, this.y0 + j * STEP, clear) ? 1 : 0;
    this.fields = new Map();
    this.cool = 0;
  }

  cell(x, y) {
    const i = Math.max(0, Math.min(this.nx - 1, Math.round((x - this.x0) / STEP)));
    const j = Math.max(0, Math.min(this.ny - 1, Math.round((y - this.y0) / STEP)));
    return [i, j];
  }

  /** Entfernungsfeld zum Ziel (Breitensuche, 8 Nachbarn ohne Ecken schneiden). */
  field(tx, ty) {
    const key = tx + ',' + ty;
    if (this.fields.has(key)) return this.fields.get(key);
    const dist = new Float32Array(this.nx * this.ny).fill(Infinity);
    let [ti, tj] = this.cell(tx, ty);
    if (!this.ok[tj * this.nx + ti]) {
      let best = Infinity;
      for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
        if (!this.ok[j * this.nx + i]) continue;
        const d = Math.hypot(this.x0 + i * STEP - tx, this.y0 + j * STEP - ty);
        if (d < best) { best = d; ti = i; tj = j; }
      }
    }
    const q = [[ti, tj]];
    dist[tj * this.nx + ti] = 0;
    for (let k = 0; k < q.length; k++) {
      const [i, j] = q[k];
      const d0 = dist[j * this.nx + i];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.ny || !this.ok[b * this.nx + a]) continue;
        if (di && dj && (!this.ok[j * this.nx + a] || !this.ok[b * this.nx + i])) continue;
        const nd = d0 + (di && dj ? 1.4142 : 1);
        if (nd < dist[b * this.nx + a]) { dist[b * this.nx + a] = nd; q.push([a, b]); }
      }
    }
    this.fields.set(key, dist);
    return dist;
  }

  /** Führt der Plan von p zum Ziel? */
  erreichbar(p, ziel) {
    const [i, j] = this.cell(p.x, p.y);
    return Number.isFinite(this.field(ziel.x, ziel.y)[j * this.nx + i]);
  }

  /** Von p aus erreichbare Zelle, die dem Ziel am nächsten liegt (wenn der Weg zugebaut ist: die Stelle vor dem Hindernis). */
  naechsteErreichbare(p, ziel) {
    const [si, sj] = this.cell(p.x, p.y);
    const gesehen = new Uint8Array(this.nx * this.ny);
    const q = [[si, sj]];
    gesehen[sj * this.nx + si] = 1;
    let best = { d: Infinity, x: p.x, y: p.y };
    for (let k = 0; k < q.length; k++) {
      const [i, j] = q[k];
      const x = this.x0 + i * STEP;
      const y = this.y0 + j * STEP;
      const d = Math.hypot(x - ziel.x, y - ziel.y);
      if (d < best.d) best = { d, x, y };
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di;
        const b = j + dj;
        if ((!di && !dj) || a < 0 || b < 0 || a >= this.nx || b >= this.ny || gesehen[b * this.nx + a] || !this.ok[b * this.nx + a]) continue;
        if (di && dj && (!this.ok[j * this.nx + a] || !this.ok[b * this.nx + i])) continue;
        gesehen[b * this.nx + a] = 1;
        q.push([a, b]);
      }
    }
    return best;
  }

  /** Nächster Wegpunkt (Kartenkoordinaten) ab Punkt p: nach `look` Zellen dem Gefälle folgen. */
  waypoint(dist, p, look = 3) {
    let [i, j] = this.cell(p.x, p.y);
    for (let n = 0; n < look; n++) {
      let best = dist[j * this.nx + i];
      let bi = i;
      let bj = j;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.ny) continue;
        if (di && dj && (!this.ok[j * this.nx + a] || !this.ok[b * this.nx + i])) continue;
        const d = dist[b * this.nx + a];
        if (d < best) { best = d; bi = a; bj = b; }
      }
      if (bi === i && bj === j) break;
      i = bi;
      j = bj;
    }
    return { x: this.x0 + i * STEP, y: this.y0 + j * STEP };
  }

  /** Eingabe für diesen Frame, um (tx,ty) zu erreichen (Stick in Gangmitte, gedreht wird im Kreuzungsquadrat, bei Gegenrichtung Umkehr). */
  control(sc, tx, ty, dt = DT) {
    this.cool = Math.max(0, this.cool - dt);
    if (sc.swing || sc.respawn) return {};
    const m = sc.dogMap();
    const dist = this.field(tx, ty);
    const w = this.waypoint(dist, m);
    const hv = DIR_VEC[sc.h];
    const lv = DIR_VEC[turnCW(sc.h)];
    const w8 = this.waypoint(dist, m, 8);
    const fx = w8.x - w.x;
    const fy = w8.y - w.y;
    const fF = fx * hv[0] + fy * hv[1];
    const fL = fx * lv[0] + fy * lv[1];
    const input = {};
    const turnNeeded = Math.hypot(fx, fy) >= 20 && Math.abs(fL) >= 0.7 * Math.abs(fF);
    if (this.cool <= 0 && Math.hypot(fx, fy) > 1e-6) {
      if (!turnNeeded) {
        if (Math.hypot(fx, fy) >= 20 && fF < 0 && Math.abs(fL) < Math.abs(fF)) {
          input.wende = true;
          this.cool = 0.6;
        }
      } else {
        const k = fL > 0 ? 1 : -1;
        const j = sc.turnJunction(k);
        const r = 8;
        if (j && m.x >= j.x0 + r && m.x <= j.x1 - r && m.y >= j.y0 + r && m.y <= j.y1 - r) {
          if (k > 0) input.rotRight = true;
          else input.rotLeft = true;
          this.cool = 0.7;
        }
      }
    }
    const K = sc.K;
    const latAxis = K.axis === 'h' ? [0, 1] : [1, 0];
    // Quer: die Linie bestimmt der Weg voraus. Der Bot hält die stärkste Abweichung von der Gangmitte auf den nächsten VORAUS_QUER
    // Zellen, bis das Hindernis hinter ihm liegt; verlässt der Weg den Gang (Kreuzung), gilt die Gangmitte.
    let lat = K.c;
    for (let n = 1; n <= VORAUS_QUER; n++) {
      const wv = this.waypoint(dist, m, n);
      const wLat = wv.x * latAxis[0] + wv.y * latAxis[1];
      if (Math.abs(wLat - K.c) <= K.hw && Math.abs(wLat - K.c) > Math.abs(lat - K.c)) lat = wLat;
    }
    const centerErr = lat - (m.x * latAxis[0] + m.y * latAxis[1]);
    const sideCmd = Math.abs(centerErr) < 3 ? 0 : Math.max(-1, Math.min(1, centerErr / 24));
    const r = DIR_VEC[sc.theta];
    const d = DIR_VEC[turnCW(sc.theta)];
    input.mx = (latAxis[0] * r[0] + latAxis[1] * r[1]) * sideCmd + Math.max(-0.5, Math.min(0.5, (SCREEN_W / 2 - sc.dog.x) / 60));
    input.my = (latAxis[0] * d[0] + latAxis[1] * d[1]) * sideCmd;
    return input;
  }
}

/** Stelle s (E ab Gang-Anfang) des Punkts p, auf den Gang projiziert und auf [0, Länge] begrenzt. */
const stelleVon = (m, p) => Math.max(0, Math.min(m.laenge, (p.x - m.a.x) * m.ux + (p.y - m.a.y) * m.uy));

/**
 * Fliegt einen Gang vom Anfang bis kurz vor sein Ende ab.
 * → { gebiet, gang, name, status: 'ok'|'tod'|'stecken'|'zeit'|'nicht-spielbar', stelle, sekunden, bezeichnung, text }
 * `bezeichnung` gilt der Stelle, an der etwas schiefging (Format wie „Bezeichnung kopieren“); bei 'ok' dem Gang-Anfang.
 */
export function fliegeGang(g, gangId, { dt = DT } = {}) {
  const gang = g.gaenge.find((x) => x.id === gangId);
  const m = gang && gangMasse(g, gang, knotenMap(g));
  const kopf = { gebiet: g.id, gang: gangId, name: gang?.name || gangId };
  if (!m) return { ...kopf, status: 'nicht-spielbar', stelle: 0, sekunden: 0, bezeichnung: '', text: `Gang ${gangId} gibt es nicht.` };
  const bez = (s) => bezeichnung(g, { art: 'gang', id: gangId }, Math.round(s));
  const { probleme } = spielbarkeit(g, gangId);
  if (probleme.length) return { ...kopf, status: 'nicht-spielbar', stelle: 0, sekunden: 0, bezeichnung: bez(0), text: 'noch nicht spielbar: ' + probleme.join(' · ') };
  const vorn = SCREEN_W / 2 - DACKEL_BILD.x;
  const sc = erzeugeSzene(g, gangId, vorn);
  const ziel = gangPunkt(m, Math.max(0, m.laenge - ZIEL_VOR_ENDE));
  let bot = new NavBot(sc.map);
  if (!bot.erreichbar(sc.dogMap(), ziel)) bot = new NavBot(sc.map, CLEAR_ENG); // Engstelle: mit weniger Wandabstand planen
  // Ist der Weg ganz zugebaut, fliegt der Bot an die Stelle davor (und stirbt oder bleibt dort hängen: das ist die Meldung)
  const plan = bot.erreichbar(sc.dogMap(), ziel) ? ziel : bot.naechsteErreichbare(sc.dogMap(), ziel);
  const grenze = ZEIT_FAKTOR * (m.laenge / SCROLL) + ZEIT_ZUSCHLAG;
  let t = 0;
  let vorher = sc.dogMap();
  let beste = Infinity;
  let besteZeit = 0;
  while (t < grenze) {
    const inp = bot.control(sc, plan.x, plan.y, dt);
    sc.update(dt, inp);
    t += dt;
    const p = sc.dogMap();
    if (sc.deaths) return { ...kopf, status: 'tod', stelle: stelleVon(m, vorher), sekunden: t, bezeichnung: bez(stelleVon(m, vorher)), text: `Der Bot ist gestorben (${t.toFixed(1).replace('.', ',')} s nach dem Start).` };
    const d = Math.hypot(p.x - ziel.x, p.y - ziel.y);
    vorher = p; // beim Tod springt der Dackel zurück: gemeldet wird die Stelle des Frames davor
    if (d <= BONE_R - 4) return { ...kopf, status: 'ok', stelle: 0, sekunden: t, bezeichnung: bez(0), text: `Angekommen nach ${t.toFixed(1).replace('.', ',')} s.` };
    if (d < beste - STECKEN_FORTSCHRITT) { beste = d; besteZeit = t; }
    else if (t - besteZeit > STECKEN_ZEIT) return { ...kopf, status: 'stecken', stelle: stelleVon(m, p), sekunden: t, bezeichnung: bez(stelleVon(m, p)), text: `Der Bot kommt seit ${STECKEN_ZEIT} s nicht weiter.` };
  }
  const p = sc.dogMap();
  return { ...kopf, status: 'zeit', stelle: stelleVon(m, p), sekunden: t, bezeichnung: bez(stelleVon(m, p)), text: `Zeitgrenze von ${Math.round(grenze)} s überschritten.` };
}

/** Alle Gänge eines Gebiets abfliegen → Liste der Ergebnisse (Reihenfolge der Gänge). */
export const fliegeGebiet = (g, opt) => g.gaenge.map((gang) => fliegeGang(g, gang.id, opt));

export const STATUS_TEXT = { ok: '✓ angekommen', tod: '✗ gestorben', stecken: '✗ steckengeblieben', zeit: '✗ zu langsam', 'nicht-spielbar': '–' };
