// Prüft welt.json: Geometrie, Sackgassenfreiheit (mit/ohne Können, mit Respawn), 100 %,
// Pflichtreihenfolge und was in welcher Phase erreichbar ist.  Aufruf: node tools/pruefe-welt.mjs [docs/welt.json]
import { readFileSync } from 'node:fs';

const W = JSON.parse(readFileSync(process.argv[2] || new URL('../docs/welt.json', import.meta.url), 'utf8'));
const H = W.headings; // E SE S SW W NW N NE
const hi = (s) => H.indexOf(s);
const rot = (h, k) => (((h + k) % 8) + 8) % 8;
const VEC = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

const NODE = Object.fromEntries(W.nodes.map((n) => [n.id, n]));
const GATE = Object.fromEntries(W.gateTypes.map((g) => [g.id, g]));
const ABIL = W.abilities.map((a) => a.id);
const RELEVANT = new Set(['ROLLLEINE', 'DREHWURM', 'WASSERWAAGE', 'WENDEHALS', 'KREISELKOMPASS', 'WIRBELWIND', ...W.gateTypes.flatMap((g) => g.solvedBy)]);
const BIT = Object.fromEntries([...RELEVANT].map((id, i) => [id, 2 ** i]));
const has = (m, id) => BIT[id] !== undefined && Math.floor(m / BIT[id]) % 2 === 1;
const problems = [];
const warnings = [];

// ---------------- Punkte und Teilstrecken ----------------
const POINT = {}; // id -> {x,y,arena:bool,type,node?}
for (const n of W.nodes) POINT[n.id] = { x: n.x, y: n.y, arena: true, node: n, type: n.station?.type ?? null };
const SEG = [];
const shortcutEdges = W.edges.filter((e) => e.opensAfterPass).map((e) => e.id);
const FLAG = { trommel: 1 };
shortcutEdges.forEach((id, i) => (FLAG['pass:' + id] = 2 << i));

for (const e of W.edges) {
  const a = NODE[e.from], b = NODE[e.to];
  const mids = [...e.midStations].sort((x, y) => x.at - y.at);
  const chain = [e.from];
  mids.forEach((m, i) => {
    const pid = `${e.id}#${i}`;
    POINT[pid] = { x: m.point ? m.point.x : a.x + (b.x - a.x) * m.at, y: m.point ? m.point.y : a.y + (b.y - a.y) * m.at, arena: false, type: m.type, mid: m, edge: e };
    chain.push(pid);
    if (m.branchTo) {
      SEG.push({ id: m.branchId || pid + '>', a: pid, b: m.branchTo, h: hi(m.branchHeading), gates: m.branchGates || [], current: null,
        oneWay: false, shortcut: null, boss: m.branchBoss, reward: m.branchReward, edge: e });
    }
  });
  chain.push(e.to);
  for (let i = 0; i + 1 < chain.length; i++) {
    const last = i + 1 === chain.length - 1;
    SEG.push({ id: chain.length > 2 ? `${e.id}[${i}]` : e.id, a: chain[i], b: chain[i + 1], h: hi(e.heading), gates: e.gates, current: e.current,
      oneWay: e.oneWay, shortcut: e.opensAfterPass ? 'pass:' + e.id : null, boss: last ? e.boss : null, reward: last ? e.reward : null, edge: e });
  }
}

// ---------------- Geometrie ----------------
for (const s of SEG) {
  const A = POINT[s.a], B = POINT[s.b];
  const dx = Math.sign(B.x - A.x), dy = Math.sign(B.y - A.y);
  if (VEC[s.h][0] !== dx || VEC[s.h][1] !== dy) problems.push(`Richtung passt nicht: ${s.id}`);
  for (const [pid, P] of Object.entries(POINT)) {
    if (pid === s.a || pid === s.b) continue;
    const cross = (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x);
    const dot = (P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y);
    const len2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2;
    if (Math.abs(cross) < 1e-9 && dot > 1e-9 && dot < len2 - 1e-9) problems.push(`${pid} liegt auf Teilstrecke ${s.id}`);
  }
}
function segInter(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}
for (let i = 0; i < SEG.length; i++)
  for (let j = i + 1; j < SEG.length; j++)
    if (segInter(POINT[SEG[i].a], POINT[SEG[i].b], POINT[SEG[j].a], POINT[SEG[j].b])) warnings.push(`Kreuzung (Brücke auf der Karte): ${SEG[i].id} × ${SEG[j].id}`);
// Ausgänge je Richtung
const EXITS = {}; // pid -> [[{seg,forward}] je Richtung]
for (const pid of Object.keys(POINT)) EXITS[pid] = H.map(() => []);
for (const s of SEG) {
  EXITS[s.a][s.h].push({ seg: s, fwd: true });
  EXITS[s.b][rot(s.h, 4)].push({ seg: s, fwd: false });
}
for (const [pid, sides] of Object.entries(EXITS)) {
  sides.forEach((l, h) => { if (l.length > 1 && h % 2 === 1) problems.push(`${pid}: ${l.length} Ausgänge in Diagonale ${H[h]}`); });
  if (POINT[pid].arena && sides.every((l) => l.length === 0)) problems.push(`${pid}: Arena ohne Ausgang`);
}

// ---------------- Regeln ----------------
function stationTurns(type, h, m, out) {
  const add = (k) => out.add(rot(h, k));
  switch (type) {
    case 'ring90': add(2); add(-2); break;
    case 'ring45': add(1); add(-1); break;
    case 'wender180': add(4); break;
    case 'ratsche': add(2); break;
    case 'kompass': for (let k = 0; k < 8; k++) if (k % 2 === 0 || has(m, 'WASSERWAAGE')) add(k); break;
    case 'kreisel': case 'klappe':
      if (type === 'kreisel') add(4); // ohne Fähigkeit: schubst zurück (180°)
      if (type === 'klappe' && !has(m, 'WIRBELWIND')) break;
      if (has(m, 'DREHWURM')) { add(2); add(-2); }
      if (has(m, 'WASSERWAAGE')) { add(1); add(-1); }
      break;
    default: break;
  }
}
function turns(st, skill) {
  const P = POINT[st.p], out = new Set();
  stationTurns(P.type, st.h, st.m, out);
  if (P.arena && skill && P.node.softStation) stationTurns(P.node.softStation.type, st.h, st.m, out);
  if (!P.arena) out.add(rot(st.h, 4)); // Weichenraum: Kehrschleife, Umkehren geht immer
  if (has(st.m, 'WENDEHALS')) out.add(rot(st.h, 4));
  if (P.arena && (has(st.m, 'KREISELKOMPASS') || has(st.m, 'WIRBELWIND'))) {
    if (has(st.m, 'DREHWURM')) { out.add(rot(st.h, 2)); out.add(rot(st.h, -2)); }
    if (has(st.m, 'WASSERWAAGE')) { out.add(rot(st.h, 1)); out.add(rot(st.h, -1)); }
  }
  out.delete(st.h);
  return out;
}
function gateOk(g, s, fwd, m, f, skill) {
  const gt = GATE[g];
  if (!gt) { problems.push('Unbekanntes Hindernis ' + g); return false; }
  let applies = true;
  if (gt.appliesTo === 'forward') applies = fwd;
  else if (gt.appliesTo === 'backward') applies = !fwd;
  else if (gt.appliesTo === 'against-current') {
    if (!s.current) problems.push(`${s.id}: gegenstrom ohne current`);
    applies = s.current === 'forward' ? !fwd : fwd;
  }
  if (!applies) return true;
  if (gt.state) return ((f & FLAG[gt.state.flag]) !== 0) === gt.state.value;
  if (gt.soft && skill) return true;
  return gt.solvedBy.every((id) => has(m, id));
}
function gain(m, id, allowed, touched) {
  if (!id || id === 'GOAL') return m;
  touched?.add(id);
  if (BIT[id] === undefined || (allowed && !allowed.has(id)) || has(m, id)) return m;
  return m + BIT[id];
}
const key = (s) => `${s.p}|${s.h}|${s.m}|${s.f}`;
function successors(st, skill, allowed, touched) {
  const out = [];
  for (const h of turns(st, skill)) out.push({ ...st, h });
  for (const { seg: s, fwd } of EXITS[st.p][st.h]) {
    const dirOk = fwd || !s.oneWay || (s.shortcut && st.f & FLAG[s.shortcut]);
    if (!dirOk) continue;
    out.push({ ...st, h: rot(st.h, 4), via: 'abbruch' }); // Abbruch/Rückzug/Wende in der Etappe
    if (!s.gates.every((g) => gateOk(g, s, fwd, st.m, st.f, skill))) continue;
    const q = fwd ? s.b : s.a;
    let m = st.m, f = st.f;
    if (fwd && s.reward === 'GOAL') { out.push({ goal: true }); continue; }
    if (fwd && s.reward) m = gain(m, s.reward, allowed, touched);
    if (POINT[q].arena && POINT[q].node.item) m = gain(m, POINT[q].node.item, allowed, touched);
    if (fwd && s.shortcut) f |= FLAG[s.shortcut];
    out.push({ p: q, h: st.h, m, f });
  }
  const P = POINT[st.p];
  if (P.arena && P.node.ret) out.push({ ...st, p: P.node.ret.to, h: hi(P.node.ret.heading) });
  if (P.arena && P.node.toggles && has(st.m, 'ROLLLEINE')) out.push({ ...st, f: st.f ^ FLAG[P.node.toggles] });
  return out;
}
function startState() {
  const n = NODE[W.start.node];
  return { p: n.id, h: hi(W.start.heading), m: n.item && RELEVANT.has(n.item) ? BIT[n.item] : 0, f: 0 };
}
// Zahl-Schlüssel: Punkt-Index (8 Bit), Blick (3), Flags (4), Items (Rest)
const PIDS = [...Object.keys(POINT), '#respawn'];
const PIDX = Object.fromEntries(PIDS.map((p, i) => [p, i]));
const HUB = PIDX['#respawn'];
const enc = (p, h, f, m) => ((m * 16 + f) * 8 + h) * 256 + p;
const dec = (k) => ({ p: PIDS[k % 256], h: Math.floor(k / 256) % 8, f: Math.floor(k / 2048) % 16, m: Math.floor(k / 32768) });
const GOALK = -1;
function explore(skill, { allowed = null, respawn = false } = {}) {
  const touched = new Set();
  const saves = W.nodes.filter((n) => n.save).map((n) => n.id);
  // Respawn/Rohrpost: zu jeder Station, die der Basislauf mit einer Teilmenge der Items erreicht hat
  const reachedWith = new Map(saves.map((s) => [s, new Set()]));
  if (respawn) {
    const base = explore(skill, { allowed });
    for (const k of base.seen) { const st = dec(k); if (reachedWith.has(st.p)) reachedWith.get(st.p).add(st.m); }
  }
  const s0 = startState();
  const k0 = enc(PIDX[s0.p], s0.h, s0.f, s0.m);
  const seen = new Set([k0]);
  const edges = new Map();
  const queue = [k0];
  let goal = false;
  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi];
    const st = dec(k);
    const succ = [];
    const push = (nk) => { succ.push(nk); if (!seen.has(nk)) { seen.add(nk); queue.push(nk); } };
    if (st.p === '#respawn') {
      for (const sv of saves) {
        if (![...reachedWith.get(sv)].some((mm) => (mm & st.m) === mm)) continue;
        for (let h = 0; h < 8; h++) if (h % 2 === 0 || has(st.m, 'WASSERWAAGE')) push(enc(PIDX[sv], h, st.f, st.m));
      }
      edges.set(k, succ);
      continue;
    }
    for (const n of successors(st, skill, allowed, touched)) {
      if (n.goal) { goal = true; succ.push(GOALK); continue; }
      push(enc(PIDX[n.p], n.h, n.f, n.m));
    }
    if (respawn) push(enc(HUB, 0, st.f, st.m));
    edges.set(k, succ);
  }
  return { seen, edges, goal, touched };
}
function deadEnds(g) {
  const rev = new Map();
  for (const [k, succ] of g.edges) for (const s of succ) { let l = rev.get(s); if (!l) rev.set(s, (l = [])); l.push(k); }
  const good = new Set([GOALK]);
  const q = [GOALK];
  for (let i = 0; i < q.length; i++) for (const p of rev.get(q[i]) || []) if (!good.has(p)) { good.add(p); q.push(p); }
  return [...g.seen].filter((k) => !good.has(k)).map(dec).filter((s) => s.p !== '#respawn');
}
const itemsOf = (m) => [...RELEVANT].filter((id) => has(m, id));

// ---------------- Prüfungen ----------------
const report = [];
for (const skill of [false, true]) {
  for (const respawn of [false, true]) {
    const g = explore(skill, { respawn });
    const de = deadEnds(g);
    report.push(`${skill ? 'mit Können ' : 'ohne Können'} ${respawn ? '+Respawn' : '        '}: ${g.seen.size} Zustände, Ziel ${g.goal ? 'erreichbar' : 'NICHT erreichbar'}, Sackgassen ${de.length}`);
    if (!g.goal) problems.push('Ziel nicht erreichbar' + (skill ? ' (Können)' : ''));
    if (de.length) {
      problems.push(`${de.length} Sackgassen-Zustände (${skill ? 'Können' : 'ohne'}${respawn ? ', Respawn' : ''})`);
      for (const d of de.slice(0, 6)) report.push(`   Sackgasse: ${d.p} Blick ${H[d.h]} Items [${itemsOf(d.m).join(',')}] Flags ${d.f}`);
    }
    if (!skill && !respawn) {
      const nodesReached = new Set([...g.seen].map((k) => dec(k).p));
      for (const n of W.nodes) if (!nodesReached.has(n.id) && !n.goal) problems.push('Arena nicht erreichbar: ' + n.id);
      const all = [...W.abilities.map((a) => a.id), ...W.expansions.map((x) => x.id)];
      const placed = new Set([...W.nodes.map((n) => n.item), ...W.edges.map((e) => e.reward), ...W.edges.flatMap((e) => e.midStations.map((m) => m.branchReward))].filter((x) => x && x !== 'GOAL'));
      for (const id of all) if (!placed.has(id)) problems.push('Nicht platziert: ' + id);
      const unreached = W.nodes.filter((n) => n.item && !nodesReached.has(n.id)).map((n) => n.item);
      report.push(`   100 %: ${placed.size - unreached.length}/${placed.size} Fundstücke ohne Können erreichbar`);
    }
  }
}

// Pflichtreihenfolge: Welche Pflicht-Fähigkeiten sind in Phase k (nur Vorgänger + Optionales) schon erreichbar?
const optional = W.abilities.filter((a) => !a.required).map((a) => a.id);
const order = W.intendedOrder;
report.push('', 'Phase | erlaubt bis | erreichbare neue Pflicht-Ziele (ohne Können) | mit Können zusätzlich | erreichbare Arenen | optionale Fundstücke erreichbar');
for (let k = 0; k <= order.length; k++) {
  const allowed = new Set([...optional, ...order.slice(0, k)]);
  const g0 = explore(false, { allowed });
  const g1 = explore(true, { allowed });
  const next0 = order.slice(k).filter((id) => g0.touched.has(id));
  const next1 = order.slice(k).filter((id) => g1.touched.has(id) && !g0.touched.has(id));
  const arenas = new Set([...g0.seen].map((k) => dec(k).p).filter((p) => POINT[p]?.arena));
  const optItems = W.nodes.filter((n) => n.item && arenas.has(n.id) && !order.includes(n.item)).length
    + W.edges.filter((e) => e.reward && !order.includes(e.reward) && e.reward !== 'GOAL' && arenas.has(e.to)).length;
  report.push(`${String(k).padStart(2)} | ${(order[k - 1] || 'Start').padEnd(15)} | ${next0.join(', ') || (g0.goal ? 'ZIEL' : '–')} | ${next1.join(', ') || '–'} | ${arenas.size} | ${optItems}`);
  if (k < order.length && !next0.includes(order[k])) problems.push(`Reihenfolge: ${order[k]} in Phase ${k} nicht erreichbar`);
}

console.log(report.join('\n'));
if (warnings.length) console.log('\nHinweise:\n- ' + warnings.join('\n- '));
console.log(problems.length ? '\nPROBLEME:\n- ' + [...new Set(problems)].join('\n- ') : '\nKeine Probleme gefunden.');
process.exitCode = problems.length ? 1 : 0;
