// Weltregeln der v0.3-Welt (docs/welt.json, docs/WELT-DESIGN.md Kap. 2, 7, 8): wohin man fliegen
// kann, wie man wo drehen darf, welche Hindernisse gelten. Spiel UND Löser (solver3.js) benutzen
// genau diese Funktionen – Regeln stehen nur hier. Referenz für den Port: tools/pruefe-welt.mjs.
//
// Alles ist an eine übersetzte Welt gebunden (compileWorld3), nichts läuft beim Import: So können
// Tests veränderte Welten prüfen, und die v0.2-Welt (worldgraph.js) bleibt unberührt.
//
// Zustand: { p, h, m, f }
//   p = Punkt: Arena (Knoten-ID) oder Weichenraum mitten in einer Etappe ("<kante>#<i>")
//   h = Blickrichtung 0..7 (core/math.js), m = Item-Maske (nur regelrelevante Items), f = Flags
//   (Trommel-Stellung, geöffnete Abkürzungsklappen)

import { HEADING_CODES, DIR_VEC, turnBy, isDiagonal } from '../core/math.js';

/** Fähigkeiten, die Drehregeln bestimmen (dazu kommt alles aus gateTypes[].solvedBy). */
export const TURN_ABILITIES = ['ROLLLEINE', 'DREHWURM', 'WASSERWAAGE', 'WENDEHALS', 'KREISELKOMPASS', 'WIRBELWIND'];

/** Mindestabstand zwischen Entscheidungspunkten in Einheiten (Drehzahl-Invariante R9). */
export const MIN_DECISION_GAP = 480;

/** "NE" → 7 usw. Wirft bei unbekanntem Kürzel. */
export function headingOf(code) {
  const h = HEADING_CODES.indexOf(code);
  if (h < 0) throw new Error('Unbekannte Richtung: ' + code);
  return h;
}

/**
 * Übersetzt die Weltdaten in Punkte, Teilstrecken und Ausgänge.
 * - Jede midStation teilt ihre Kante; am Stationspunkt liegt ein Weichenraum ("<kante>#<i>",
 *   nach `at` sortiert). Gegenstände, Hindernisse und Richtung der Kante gelten auf jeder
 *   Teilstrecke, Boss und Belohnung nur auf der letzten.
 * - Ein Abzweig ist eine eigene Teilstrecke vom Weichenraum zu branchTo.
 */
export function compileWorld3(data) {
  const node = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  const gate = Object.fromEntries(data.gateTypes.map((g) => [g.id, g]));
  const relevant = [...new Set([...TURN_ABILITIES, ...data.gateTypes.flatMap((g) => g.solvedBy)])];
  const bit = Object.fromEntries(relevant.map((id, i) => [id, 2 ** i]));

  const flag = { trommel: 1 };
  data.edges.filter((e) => e.opensAfterPass).forEach((e, i) => (flag['pass:' + e.id] = 2 << i));

  const points = {};
  for (const n of data.nodes) points[n.id] = { id: n.id, x: n.x, y: n.y, arena: true, node: n, type: n.station?.type ?? null };
  const segs = [];
  for (const e of data.edges) {
    const a = node[e.from];
    const b = node[e.to];
    const h = headingOf(e.heading);
    const mids = [...e.midStations].sort((x, y) => x.at - y.at);
    const chain = [e.from];
    mids.forEach((m, i) => {
      const pid = `${e.id}#${i}`;
      const x = m.point ? m.point.x : a.x + (b.x - a.x) * m.at;
      const y = m.point ? m.point.y : a.y + (b.y - a.y) * m.at;
      points[pid] = { id: pid, x, y, arena: false, type: m.type, mid: m, edge: e };
      chain.push(pid);
      if (m.branchTo) {
        segs.push({
          id: m.branchId || pid + '>', a: pid, b: m.branchTo, h: headingOf(m.branchHeading), gates: m.branchGates || [], current: null,
          oneWay: false, shortcut: null, boss: m.branchBoss ?? null, reward: m.branchReward ?? null, edge: e, branch: true,
        });
      }
    });
    chain.push(e.to);
    for (let i = 0; i + 1 < chain.length; i++) {
      const last = i + 1 === chain.length - 1;
      segs.push({
        id: chain.length > 2 ? `${e.id}[${i}]` : e.id, a: chain[i], b: chain[i + 1], h, gates: e.gates, current: e.current,
        oneWay: e.oneWay, shortcut: e.opensAfterPass ? 'pass:' + e.id : null, boss: last ? e.boss : null, reward: last ? e.reward : null,
        edge: e, branch: false,
      });
    }
  }

  // Ausgänge je Punkt und Blickrichtung: vorwärts am Anfang, rückwärts am Ende (Gegenrichtung)
  const exits = {};
  for (const pid of Object.keys(points)) exits[pid] = HEADING_CODES.map(() => []);
  for (const s of segs) {
    exits[s.a][s.h].push({ seg: s, fwd: true });
    exits[s.b][turnBy(s.h, 4)].push({ seg: s, fwd: false });
  }

  const s0 = node[data.start.node];
  const start = { p: s0.id, h: headingOf(data.start.heading), m: s0.item && bit[s0.item] ? bit[s0.item] : 0, f: 0 };
  return { data, node, gate, relevant, bit, flag, points, segs, exits, start };
}

// ------------------------------------------------------------------ Items
export const hasItem = (world, m, id) => world.bit[id] !== undefined && Math.floor(m / world.bit[id]) % 2 === 1;

/** Item-Menge (Set/Array von IDs) → Maske. Nicht regelrelevante Items zählen nicht. */
export function maskOf(world, items) {
  let m = 0;
  for (const id of new Set(items)) if (world.bit[id] !== undefined) m += world.bit[id];
  return m;
}

export const itemsOf = (world, m) => world.relevant.filter((id) => hasItem(world, m, id));

/**
 * Item aufnehmen. allowed (Set) begrenzt, was genommen werden darf (Phasentest); touched (Set)
 * sammelt alles, was erreicht wurde – auch Erweiterungen und noch nicht erlaubte Items.
 */
export function gain(world, m, id, allowed = null, touched = null) {
  if (!id || id === 'GOAL') return m;
  touched?.add(id);
  if (world.bit[id] === undefined || (allowed && !allowed.has(id)) || hasItem(world, m, id)) return m;
  return m + world.bit[id];
}

// ----------------------------------------------------------------- Drehen
/**
 * Drehungen, die eine Station erlaubt (WELT-DESIGN.md 2.3), als Menge neuer Blickrichtungen.
 * Einzelschritte – mehrfach anwenden ergibt den Rest (z. B. zweimal 90° = 180°).
 */
export function stationTurns(world, type, h, m, out = new Set()) {
  const add = (k) => out.add(turnBy(h, k));
  const has = (id) => hasItem(world, m, id);
  switch (type) {
    case 'ring90':
      add(2);
      add(-2);
      break;
    case 'ring45':
      add(1);
      add(-1);
      break;
    case 'wender180':
      add(4);
      break;
    case 'ratsche': // nur im Uhrzeigersinn
      add(2);
      break;
    case 'kompass': // jede Richtung der eigenen Klasse, mit Wasserwaage alle 8
      for (let k = 0; k < 8; k++) if (k % 2 === 0 || has('WASSERWAAGE')) add(k);
      break;
    case 'kreisel':
    case 'klappe':
      if (type === 'kreisel') add(4); // ohne Fähigkeit: schubst zurück (R5)
      if (type === 'klappe' && !has('WIRBELWIND')) break;
      if (has('DREHWURM')) {
        add(2);
        add(-2);
      }
      if (has('WASSERWAAGE')) {
        add(1);
        add(-1);
      }
      break;
    default: // stille Arena (null): keine Station
      break;
  }
  return out;
}

/**
 * Alle Blickrichtungen, auf die man am Punkt des Zustands drehen kann (ohne die aktuelle):
 * Station, weiche Station (nur mit Können), Kehrschleife im Weichenraum, Wendehals überall,
 * Kreiselkompass/Wirbelwind frei in Arenen.
 */
export function turnOptions(world, st, skill = false) {
  const P = world.points[st.p];
  const out = stationTurns(world, P.type, st.h, st.m);
  const has = (id) => hasItem(world, st.m, id);
  if (P.arena && skill && P.node.softStation) stationTurns(world, P.node.softStation.type, st.h, st.m, out);
  if (!P.arena) out.add(turnBy(st.h, 4)); // Weichenraum: Kehrschleife, Umkehren geht immer (R4)
  if (has('WENDEHALS')) out.add(turnBy(st.h, 4));
  if (P.arena && (has('KREISELKOMPASS') || has('WIRBELWIND'))) {
    if (has('DREHWURM')) {
      out.add(turnBy(st.h, 2));
      out.add(turnBy(st.h, -2));
    }
    if (has('WASSERWAAGE')) {
      out.add(turnBy(st.h, 1));
      out.add(turnBy(st.h, -1));
    }
  }
  out.delete(st.h);
  return out;
}

// ------------------------------------------------------------- Hindernisse
/** Gilt Hindernis g auf Teilstrecke s in dieser Flugrichtung, und ist es mit Maske/Flags passierbar? */
export function gateOk(world, g, s, fwd, m, f, skill = false) {
  const gt = world.gate[g];
  if (!gt) return false; // unbekannte Typen meldet validateWorld3
  let applies = true;
  if (gt.appliesTo === 'forward') applies = fwd;
  else if (gt.appliesTo === 'backward') applies = !fwd;
  else if (gt.appliesTo === 'against-current') applies = s.current === 'forward' ? !fwd : fwd;
  if (!applies) return true;
  if (gt.state) return ((f & world.flag[gt.state.flag]) !== 0) === gt.state.value;
  if (gt.soft && skill) return true;
  return gt.solvedBy.every((id) => hasItem(world, m, id));
}

/** Darf man die Teilstrecke in dieser Richtung überhaupt befliegen (Einbahn, geöffnete Abkürzung)? */
export const directionOk = (world, s, fwd, f) => fwd || !s.oneWay || (!!s.shortcut && (f & world.flag[s.shortcut]) !== 0);

// -------------------------------------------------------------- Übergänge
/**
 * Alle direkten Nachfolger eines Zustands. { goal: true } markiert das Spielende.
 * via: 'drehen' | 'abbruch' | 'flug:<teilstrecke>' | 'rueckhol' | 'hebel'
 * opts.allowed / opts.touched: siehe gain().
 */
export function successors(world, st, skill = false, opts = {}) {
  const { allowed = null, touched = null } = opts;
  const out = [];
  for (const h of turnOptions(world, st, skill)) out.push({ p: st.p, h, m: st.m, f: st.f, via: 'drehen' });
  for (const { seg: s, fwd } of world.exits[st.p][st.h]) {
    if (!directionOk(world, s, fwd, st.f)) continue;
    // Abbruch, Rückzug vor einer Wand, Wende in der Etappe: zurück zum Ausgangspunkt, umgekehrt (R6)
    out.push({ p: st.p, h: turnBy(st.h, 4), m: st.m, f: st.f, via: 'abbruch' });
    if (!s.gates.every((g) => gateOk(world, g, s, fwd, st.m, st.f, skill))) continue;
    const q = fwd ? s.b : s.a;
    let m = st.m;
    let f = st.f;
    if (fwd && s.reward === 'GOAL') {
      out.push({ goal: true, via: 'flug:' + s.id });
      continue;
    }
    if (fwd && s.reward) m = gain(world, m, s.reward, allowed, touched); // Boss-Belohnung nur vorwärts
    const P = world.points[q];
    if (P.arena && P.node.item) m = gain(world, m, P.node.item, allowed, touched);
    if (fwd && s.shortcut) f |= world.flag[s.shortcut];
    out.push({ p: q, h: st.h, m, f, via: 'flug:' + s.id });
  }
  const P = world.points[st.p];
  if (P.arena && P.node.ret) out.push({ p: P.node.ret.to, h: headingOf(P.node.ret.heading), m: st.m, f: st.f, via: 'rueckhol' });
  if (P.arena && P.node.toggles && hasItem(world, st.m, 'ROLLLEINE')) {
    out.push({ p: st.p, h: st.h, m: st.m, f: st.f ^ world.flag[P.node.toggles], via: 'hebel' });
  }
  return out;
}

// ------------------------------------------------------------- Geometrie
/**
 * Statische Prüfung der Weltdaten (I6 Geometrie, I7 Hindernistypen, I8 Kreuzungen, R9, R14).
 * Liefert { problems, warnings } – wirft nie.
 */
export function validateWorld3(data) {
  const problems = [];
  const warnings = [];
  if (JSON.stringify(data.headings) !== JSON.stringify(HEADING_CODES)) problems.push('headings passen nicht zu core/math.js');
  let world;
  try {
    world = compileWorld3(data);
  } catch (err) {
    return { problems: [...problems, 'Übersetzen: ' + err.message], warnings };
  }
  const { points, segs, exits, gate, node } = world;

  // Verweise
  for (const e of data.edges) {
    for (const id of [e.from, e.to, ...e.midStations.map((m) => m.branchTo).filter(Boolean)]) {
      if (!node[id]) problems.push(`${e.id}: unbekannte Arena ${id}`);
    }
  }
  for (const n of data.nodes) if (n.ret && !node[n.ret.to]) problems.push(`${n.id}: Rückholziel ${n.ret.to} fehlt`);

  // I6: Richtung = Koordinatenrichtung, Diagonalen genau 45°, Weichenräume auf Rasterpunkten
  for (const s of segs) {
    const A = points[s.a];
    const B = points[s.b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const [vx, vy] = DIR_VEC[s.h];
    if (Math.sign(dx) !== vx || Math.sign(dy) !== vy) problems.push(`Richtung passt nicht: ${s.id}`);
    else if (isDiagonal(s.h) && Math.abs(dx) !== Math.abs(dy)) problems.push(`Diagonale nicht 45°: ${s.id}`);
    for (const [pid, P] of Object.entries(points)) {
      if (pid === s.a || pid === s.b) continue;
      const cross = dx * (P.y - A.y) - dy * (P.x - A.x);
      const dot = (P.x - A.x) * dx + (P.y - A.y) * dy;
      const len2 = dx * dx + dy * dy;
      if (Math.abs(cross) < 1e-9 && dot > 1e-9 && dot < len2 - 1e-9) problems.push(`${pid} liegt auf Teilstrecke ${s.id}`);
    }
  }
  for (const P of Object.values(points)) {
    if (!Number.isInteger(P.x) || !Number.isInteger(P.y)) problems.push(`${P.id} liegt nicht auf einem Rasterpunkt (${P.x}, ${P.y})`);
  }
  // R14 / I6: höchstens ein Ausgang je Diagonale; keine Arena ohne Ausgang
  for (const [pid, sides] of Object.entries(exits)) {
    sides.forEach((l, h) => {
      if (l.length > 1 && isDiagonal(h)) problems.push(`${pid}: ${l.length} Ausgänge in Diagonale ${HEADING_CODES[h]}`);
    });
    if (points[pid].arena && sides.every((l) => l.length === 0)) problems.push(`${pid}: Arena ohne Ausgang`);
  }
  // I7: nur bekannte Hindernisse; Gegenstrom braucht eine Strömungsrichtung
  for (const s of segs) {
    for (const g of s.gates) {
      if (!gate[g]) problems.push(`${s.id}: unbekanntes Hindernis ${g}`);
      else if (gate[g].appliesTo === 'against-current' && s.current !== 'forward' && s.current !== 'backward') {
        problems.push(`${s.id}: ${g} ohne current`);
      }
    }
  }
  // R9: zwischen Entscheidungspunkten einer Kante mindestens MIN_DECISION_GAP Einheiten
  for (const e of data.edges) {
    const ats = [0, ...e.midStations.map((m) => m.at).sort((a, b) => a - b), 1];
    for (let i = 1; i < ats.length; i++) {
      const d = (ats[i] - ats[i - 1]) * e.length;
      if (d < MIN_DECISION_GAP) problems.push(`R9: ${e.id} Teilstrecke ${i} nur ${Math.round(d)} E`);
    }
  }
  // I8: Kreuzungen auf der Karte (Brücken) melden
  const inter = (p1, p2, p3, p4) => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-12) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
  };
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [a, b] = [segs[i], segs[j]];
      if (inter(points[a.a], points[a.b], points[b.a], points[b.b])) warnings.push(`Kreuzung (Brücke auf der Karte): ${a.id} × ${b.id}`);
    }
  }
  return { problems, warnings };
}
