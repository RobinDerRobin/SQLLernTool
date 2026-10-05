import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WELT3 } from '../src/data/welt3.js';
import { compileWorld3, validateWorld3, stationTurns, turnOptions, successors, maskOf, headingOf } from '../src/game/worldgraph3.js';
import { checkWorld3, phaseRow } from '../src/game/solver3.js';
import { E, SE, S, W, N, HEADINGS, turnBy, isDiagonal } from '../src/core/math.js';

// Weltmodell v0.3 (docs/welt.json, docs/WELT-DESIGN.md Kap. 7): Invarianten I1–I8, Pflichtreihenfolge,
// Sequence Breaks, Mutationstests – und der Abgleich mit dem Referenz-Löser tools/pruefe-welt.mjs.

// Der Referenz-Löser läuft parallel als eigener Prozess, während hier der Port rechnet.
const root = fileURLToPath(new URL('..', import.meta.url));
const reference = new Promise((resolve, reject) => {
  execFile(process.execPath, ['tools/pruefe-welt.mjs'], { cwd: root, maxBuffer: 1 << 24 }, (err, stdout) => {
    if (err && !stdout) reject(err);
    else resolve(stdout);
  });
});

let full = null;
const result = () => (full ??= checkWorld3(WELT3));
const clone = (fn) => {
  const d = structuredClone(WELT3);
  fn(d);
  return d;
};
const node = (d, id) => d.nodes.find((n) => n.id === id);
const edge = (d, id) => d.edges.find((e) => e.id === id);

test('Daten: src/data/welt3.js ist aktuell aus docs/welt.json erzeugt (sonst: npm run gen:welt3)', () => {
  const json = JSON.parse(readFileSync(new URL('../docs/welt.json', import.meta.url), 'utf8'));
  assert.deepEqual(WELT3, json);
  assert.ok(Object.isFrozen(WELT3.nodes[0]), 'Weltdaten sind schreibgeschützt');
});

test('I6–I8: Geometrie, Hindernistypen, Drehzahl-Abstand R9, keine Kartenkreuzungen', () => {
  const { problems, warnings } = validateWorld3(WELT3);
  assert.deepEqual(problems, []);
  assert.deepEqual(warnings, [], 'Kartenkreuzungen');
});

for (const skill of [false, true]) {
  for (const respawn of [false, true]) {
    const name = `${skill ? 'mit' : 'ohne'} Können${respawn ? ', mit Respawn (Notnetz)' : ''}`;
    test(`I1–I3: Ziel erreichbar und keine Sackgasse (${name})`, () => {
      const run = result().runs.find((r) => r.skill === skill && r.respawn === respawn);
      assert.ok(run.goal, 'Ziel nicht erreichbar');
      assert.equal(run.deadEnds, 0, run.examples.join('\n'));
    });
  }
}

test('I4: 100 % – alle Arenen und alle 36 Fundstücke ohne Können wirklich aufnehmbar', () => {
  const { complete, problems } = result();
  assert.deepEqual(problems.filter((p) => p.startsWith('I4')), []);
  assert.deepEqual(complete, { finds: 36, of: 36, arenas: 71, arenaCount: 71 });
});

// Erwartete Phasentabelle (WELT-DESIGN.md 4.6 und Kap. 7): [neue Pflicht-Ziele ohne Können,
// mit Können zusätzlich, erreichbare Arenen, erreichbare optionale Fundstücke]
const PHASES = [
  [['ROLLLEINE'], [], 7, 1],
  [['ESPRESSO'], [], 8, 1],
  [['DREHWURM'], ['WENDEHALS'], 16, 3],
  [['FOEHN'], ['WENDEHALS'], 17, 3],
  [['BOHRER'], ['WENDEHALS', 'PILZ'], 25, 5],
  [['WASSERWAAGE'], ['WENDEHALS', 'PILZ'], 27, 6],
  [['WENDEHALS', 'PILZ', 'KREISELKOMPASS', 'STOEPSEL'], [], 49, 14],
  [['PILZ', 'KREISELKOMPASS', 'STOEPSEL'], [], 49, 14],
  [['KREISELKOMPASS', 'STOEPSEL'], [], 50, 14],
  [['STOEPSEL', 'WIRBELWIND'], [], 56, 17],
  [['WIRBELWIND'], [], 58, 19],
  [['MINUTENZEIGER', 'STUNDENZEIGER', 'SEKUNDENZEIGER'], [], 63, 21],
  [['STUNDENZEIGER', 'SEKUNDENZEIGER'], [], 63, 21],
  [['SEKUNDENZEIGER'], [], 63, 21],
  [[], [], 70, 22],
];

test('I5: Pflichtreihenfolge – Phasentabelle wie im Weltdesign, Ziel erst nach dem letzten Zeiger', () => {
  const { phases, problems } = result();
  assert.deepEqual(problems.filter((p) => p.startsWith('I5')), []);
  assert.deepEqual(phases.map((r) => [r.next0, r.next1, r.arenas, r.optItems]), PHASES);
  assert.deepEqual(phases.map((r) => r.goal0), PHASES.map((_, k) => k === PHASES.length - 1));
});

test('SB1 Spiegeltür-Trick: Wendehals in Phase 2 nur mit Können – über die weiche Station am Spiegelschrank', () => {
  const row = result().phases[2];
  assert.ok(!row.next0.includes('WENDEHALS') && row.next1.includes('WENDEHALS'));
  const without = phaseRow(compileWorld3(clone((d) => (node(d, 'spiegelschrank').softStation = null))), 2);
  assert.ok(!without.next1.includes('WENDEHALS'), 'SB1 hängt an der weichen Station');
});

test('SB3 Eiszapfen-Abstieg: Schrumpfpilz in Phase 4 nur mit Können – über das weiche Eiszapfenfeld', () => {
  const row = result().phases[4];
  assert.ok(!row.next0.includes('PILZ') && row.next1.includes('PILZ'));
  const hard = phaseRow(compileWorld3(clone((d) => (d.gateTypes.find((g) => g.id === 'eiszapfen').soft = false))), 4);
  assert.ok(!hard.next1.includes('PILZ'), 'SB3 hängt an den weichen Eiszapfen');
});

test('Mutationstest: absichtlich eingebaute Softlocks machen die Prüfung rot', () => {
  const quick = { respawn: false, phases: false, skill: [false] };
  assert.deepEqual(checkWorld3(WELT3, quick).problems, [], 'Kontrolle: Original ist sauber');
  const cases = {
    // Abzweig-Sackgasse hinter der Modellbahn-Weiche ohne Wender (R3)
    'Lokschuppen ohne Wender': (d) => (node(d, 'lokschuppen').station = { type: null }),
    // Sackgasse hinter dem Kompassschloss ohne Wender (R3)
    'Tresor ohne Wender': (d) => (node(d, 'tresor').station = { type: null }),
    // Trommel-Stellung nicht mehr umschaltbar (R8)
    'Trommel ohne Hebel': (d) => {
      node(d, 'trommel').toggles = null;
      node(d, 'waeschekorb').toggles = null;
    },
  };
  for (const [name, fn] of Object.entries(cases)) {
    const { problems } = checkWorld3(clone(fn), quick);
    assert.ok(problems.some((p) => /^I[12]:/.test(p)), `${name}: nicht erkannt`);
  }
});

test('Mutationstest: Geometrie- und Datenfehler werden erkannt', () => {
  const cases = [
    [(d) => (edge(d, 'kruemelstrasse').heading = 'N'), /^Richtung passt nicht: kruemelstrasse$/],
    [(d) => (node(d, 'puppenhaus').x += 1), /^Diagonale nicht 45°: treppengelaender$/],
    [(d) => edge(d, 'kruemelstrasse').gates.push('lava'), /unbekanntes Hindernis lava/],
    [(d) => (edge(d, 'kaltluftschwall').current = null), /gegenstrom ohne current/],
    [(d) => (edge(d, 'wasserhahnkanal').midStations[0].at = 0.1), /^R9: wasserhahnkanal/],
    [(d) => (edge(d, 'wasserhahnkanal').midStations[0].point = { x: 27.5, y: 11 }), /nicht auf einem Rasterpunkt/],
    [(d) => (edge(d, 'wasserhahnkanal').midStations[0].at = 0.3), /passt nicht zu point/],
    [(d) => (edge(d, 'kruemelstrasse').to = 'gibtsnicht'), /unbekannte Arena gibtsnicht/],
    [(d) => (node(d, 'gully').ret.heading = 'X'), /unbekannte Richtung X/],
    [(d) => (node(d, 'toast').station.type = 'ring60'), /unbekannter Stationstyp ring60/],
    [(d) => (node(d, 'trommel').toggles = 'waschmaschine'), /unbekannter Hebel waschmaschine/],
    [(d) => (d.gateTypes.find((g) => g.id === 'trommel_a').state.flag = 'schleuder'), /unbekanntes Flag schleuder/],
    [(d) => delete edge(d, 'kruemelstrasse').length, /ungültige Länge/],
    [(d) => (edge(d, 'kruemelstrasse').reward = 'GOLDSTERN'), /unbekannte Belohnung GOLDSTERN/],
  ];
  for (const [fn, want] of cases) {
    const { problems } = validateWorld3(clone(fn));
    assert.ok(problems.some((p) => want.test(p)), `${want} nicht gemeldet: ${problems.join(' / ')}`);
  }
});

test('Regeln: Kreisel schubst ohne Fähigkeit zurück, Klappen brauchen den Wirbelwind', () => {
  const world = compileWorld3(WELT3);
  const m = (...ids) => maskOf(world, ids);
  const turns = (type, mask) => [...stationTurns(world, type, E, mask)].sort();
  assert.deepEqual(turns('kreisel', 0), [W]);
  assert.deepEqual(turns('kreisel', m('DREHWURM')), [S, W, N].sort());
  assert.deepEqual(turns('klappe', m('DREHWURM', 'WASSERWAAGE')), []);
  assert.equal(turns('klappe', m('WIRBELWIND', 'DREHWURM', 'WASSERWAAGE')).length, 4);
  assert.deepEqual(turns('ratsche', 0), [S], 'Ratsche nur im Uhrzeigersinn');
  assert.deepEqual(turns('kompass', 0), [E, S, W, N].sort());
  assert.equal(turns('kompass', m('WASSERWAAGE')).length, 8);
  assert.deepEqual(turns(null, m('DREHWURM', 'WASSERWAAGE')), [], 'stille Arena');
  assert.deepEqual(turns('ring45', 0), [SE, turnBy(E, -1)].sort());
});

test('Regeln: Rückholstation bringt aus jeder Blickrichtung zum Ziel, mit dessen Blickrichtung', () => {
  const world = compileWorld3(WELT3);
  const withRet = WELT3.nodes.filter((n) => n.ret);
  assert.ok(withRet.length >= 6);
  for (const n of withRet) {
    for (const h of HEADINGS) {
      const r = successors(world, { p: n.id, h, m: 0, f: 0 }).filter((x) => x.via === 'rueckhol');
      assert.deepEqual(r.map((x) => [x.p, x.h]), [[n.ret.to, headingOf(n.ret.heading)]], n.id);
    }
  }
  const plain = WELT3.nodes.find((n) => !n.ret);
  assert.ok(!successors(world, { p: plain.id, h: E, m: 0, f: 0 }).some((x) => x.via === 'rueckhol'));
});

test('Regeln: Einbahn nur vorwärts; Abkürzungsklappen rückwärts erst nach dem ersten Durchflug', () => {
  const world = compileWorld3(WELT3);
  const all = maskOf(world, world.relevant);
  const flights = (st) => successors(world, st).filter((x) => x.via.startsWith('flug:') || x.via === 'abbruch');
  const oneWays = world.segs.filter((s) => s.oneWay);
  assert.ok(oneWays.some((s) => s.shortcut) && oneWays.some((s) => !s.shortcut));
  for (const s of oneWays) {
    const back = { p: s.b, h: turnBy(s.h, 4), m: all, f: 0 };
    assert.ok(!flights(back).some((x) => x.via === 'flug:' + s.id), s.id + ': rückwärts befliegbar');
    if (!s.shortcut) continue;
    const flag = world.flag[s.shortcut];
    // Vorwärts durchfliegen öffnet die Klappe …
    const fwd = successors(world, { p: s.a, h: s.h, m: all, f: 0 }).find((x) => x.via === 'flug:' + s.id);
    assert.ok(fwd && fwd.f & flag, s.id + ': Durchflug öffnet nicht');
    // … danach geht es auch rückwärts
    assert.ok(flights({ ...back, f: flag }).some((x) => x.via === 'flug:' + s.id), s.id + ': offen, aber nicht befliegbar');
  }
});

test('Regeln: Trommel-Hebel schaltet nur mit der Flexileine, die Stellung bestimmt die offenen Öffnungen', () => {
  const world = compileWorld3(WELT3);
  const levers = WELT3.nodes.filter((n) => n.toggles).map((n) => n.id);
  assert.deepEqual(levers.sort(), ['trommel', 'waeschekorb']);
  for (const p of levers) {
    assert.ok(!successors(world, { p, h: E, m: 0, f: 0 }).some((x) => x.via === 'hebel'), p + ': Hebel ohne Leine');
    const m = maskOf(world, ['ROLLLEINE']);
    const lever = successors(world, { p, h: E, m, f: 0 }).filter((x) => x.via === 'hebel');
    assert.deepEqual(lever.map((x) => x.f), [world.flag.trommel]);
  }
  // Stellung A: Bullauge (O) offen, Dampfstoß (NO) zu; Stellung B umgekehrt
  const all = maskOf(world, world.relevant);
  const out = (h, f) => successors(world, { p: 'trommel', h, m: all, f }).filter((x) => x.via.startsWith('flug:')).map((x) => x.via);
  assert.deepEqual([out(E, 0).length > 0, out(E, world.flag.trommel).length > 0], [true, false]);
  assert.deepEqual([out(turnBy(N, 1), 0).length > 0, out(turnBy(N, 1), world.flag.trommel).length > 0], [false, true]);
});

test('Paritätsregel: ohne Wasserwaage wechselt man die Klasse nur an Schrägringen', () => {
  const world = compileWorld3(WELT3);
  const all = world.relevant.filter((id) => id !== 'WASSERWAAGE');
  for (const mask of [0, maskOf(world, all)]) {
    for (const [pid, P] of Object.entries(world.points)) {
      for (const h of HEADINGS) {
        const switches = [...turnOptions(world, { p: pid, h, m: mask, f: 0 }, false)].some((t) => isDiagonal(t) !== isDiagonal(h));
        assert.equal(switches, P.type === 'ring45', `${pid} Blick ${h}`);
      }
    }
  }
});

test('Port = Referenz: tools/pruefe-welt.mjs zählt dieselben Zustände und dieselbe Phasentabelle', async () => {
  const out = await reference;
  assert.match(out, /Keine Probleme gefunden\./);
  const runs = [...out.matchAll(/^(ohne|mit) Können\s*(\+Respawn)?\s*: (\d+) Zustände, Ziel (erreichbar|NICHT erreichbar), Sackgassen (\d+)/gm)].map((x) => ({
    skill: x[1] === 'mit',
    respawn: !!x[2],
    states: Number(x[3]),
    goal: x[4] === 'erreichbar',
    deadEnds: Number(x[5]),
  }));
  assert.equal(runs.length, 4);
  assert.deepEqual(result().runs.map(({ skill, respawn, states, goal, deadEnds }) => ({ skill, respawn, states, goal, deadEnds })), runs);
  const rows = out
    .split('\n')
    .filter((l) => /^\s*\d+ \| /.test(l))
    .map((l) => l.split(' | ').map((c) => c.trim()));
  const mine = result().phases.map((r) => [String(r.k), r.allowedUpTo, r.next0.join(', ') || (r.goal0 ? 'ZIEL' : '–'), r.next1.join(', ') || '–', String(r.arenas), String(r.optItems)]);
  assert.deepEqual(mine, rows);
});
