#!/usr/bin/env python3
"""Unabhängige Gegenprüfung von welt.json (Leitung, nicht vom Designer).

Eigene Implementierung der Regeln aus welt.json (turnRules, stationTypes, gateTypes),
ohne Code aus pruefe-welt.mjs. Bewusst STRENG ausgelegt, wo die Daten mehrdeutig sind:
  - Hindernisse einer Kante mit Weichen gelten auf JEDER Teilstrecke der Kante.
  - Rückzug/Abbruch nur, wenn in Blickrichtung ein befliegbarer Ausgang liegt.
  - Kein Respawn, keine Rohrpost (Notnetz wird nicht mitgezählt).

Aufruf: python3 tools/gegenpruefung.py [docs/welt.json]
"""
import json, sys
from collections import deque, defaultdict

import os
W = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'welt.json')))
H = W['headings']                         # E SE S SW W NW N NE
hi = {h: i for i, h in enumerate(H)}
VEC = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
opp = lambda h: (h + 4) % 8
NODE = {n['id']: n for n in W['nodes']}
GATE = {g['id']: g for g in W['gateTypes']}
REQUIRED = [a['id'] for a in W['abilities'] if a['required']]
OPTIONAL_AB = [a['id'] for a in W['abilities'] if not a['required']]
RELEVANT = ['ROLLLEINE', 'ESPRESSO', 'DREHWURM', 'FOEHN', 'LAMPE', 'BOHRER', 'WASSERWAAGE', 'WENDEHALS',
            'PILZ', 'KREISELKOMPASS', 'STOEPSEL', 'GUMMIHAUT', 'WIRBELWIND',
            'MINUTENZEIGER', 'STUNDENZEIGER', 'SEKUNDENZEIGER']
BIT = {a: 1 << i for i, a in enumerate(RELEVANT)}
problems, notes = [], []

# ---------------------------------------------------------------- Punkte & Teilstrecken
POINT = {}   # id -> dict(x, y, arena, station, soft, node)
for n in W['nodes']:
    POINT[n['id']] = dict(x=n['x'], y=n['y'], arena=True, station=(n.get('station') or {}).get('type'),
                          soft=(n.get('softStation') or {}).get('type') if n.get('softStation') else None, node=n)
SEG = []     # dict(a, b, h, gates, edge, kind, oneWay, oap, current, boss, reward)
for e in W['edges']:
    a, b = NODE[e['from']], NODE[e['to']]
    h = hi[e['heading']]
    # Geometrie: Kantenrichtung muss zur Koordinatenrichtung passen
    dx, dy = b['x'] - a['x'], b['y'] - a['y']
    sx, sy = (dx > 0) - (dx < 0), (dy > 0) - (dy < 0)
    if (sx, sy) != VEC[h] or (sx and sy and abs(dx) != abs(dy)):
        problems.append(f"Geometrie: Kante {e['id']} {e['heading']} passt nicht zu ({dx},{dy})")
    chain = [e['from']]
    for i, m in enumerate(sorted(e.get('midStations') or [], key=lambda m: m['at'])):
        pid = f"{e['id']}#{i}"
        px = m.get('point', {}).get('x', a['x'] + dx * m['at']) if m.get('point') else a['x'] + dx * m['at']
        py = m.get('point', {}).get('y', a['y'] + dy * m['at']) if m.get('point') else a['y'] + dy * m['at']
        POINT[pid] = dict(x=px, y=py, arena=False, station=m['type'], soft=None, mid=m, edge=e)
        chain.append(pid)
        if m.get('branchTo'):
            bh = hi[m['branchHeading']]
            t = NODE[m['branchTo']]
            bdx, bdy = t['x'] - px, t['y'] - py
            bsx, bsy = (bdx > 0) - (bdx < 0), (bdy > 0) - (bdy < 0)
            if (bsx, bsy) != VEC[bh] or (bsx and bsy and abs(bdx) != abs(bdy)):
                problems.append(f"Geometrie: Abzweig {pid}->{m['branchTo']} {m['branchHeading']} passt nicht zu ({bdx},{bdy})")
            SEG.append(dict(a=pid, b=m['branchTo'], h=bh, gates=m.get('branchGates') or [], edge=e, kind='branch',
                            oneWay=False, oap=False, current=None, boss=m.get('branchBoss'),
                            reward=m.get('branchReward'), id=m.get('branchId') or pid + '>'))
    chain.append(e['to'])
    for k in range(len(chain) - 1):
        last = k == len(chain) - 2
        SEG.append(dict(a=chain[k], b=chain[k + 1], h=h, gates=e['gates'], edge=e, kind='main',
                        oneWay=e.get('oneWay', False), oap=e.get('opensAfterPass', False),
                        current=e.get('current'), boss=e.get('boss') if last else None,
                        reward=e.get('reward') if last else None, id=f"{e['id']}[{k}]"))

OUT = defaultdict(list)  # point -> [(heading, seg, forward)]
for s in SEG:
    OUT[s['a']].append((s['h'], s, True))
    OUT[s['b']].append((opp(s['h']), s, False))
for p, lst in OUT.items():
    seen = defaultdict(int)
    for h, s, f in lst:
        if h % 2 == 1:
            seen[h] += 1
    for h, c in seen.items():
        if c > 1 and POINT[p]['arena']:
            problems.append(f"R14: Arena {p} hat {c} Ausgänge nach {H[h]}")
for p in POINT:
    if POINT[p]['arena'] and not OUT[p]:
        problems.append(f"Arena ohne Ausgang: {p}")

# R9: zwischen zwei Entscheidungspunkten mindestens 480 E (Drehzahl-Invariante)
for e in W['edges']:
    ats = [0.0] + sorted(m['at'] for m in (e.get('midStations') or [])) + [1.0]
    for i in range(1, len(ats)):
        d = (ats[i] - ats[i - 1]) * e['length']
        if d < 480:
            problems.append(f"R9: {e['id']} Teilstrecke {i} nur {d:.0f} E")

OAP_IDS = sorted({s['edge']['id'] for s in SEG if s['oap']})
FLAGBIT = {'trommel': 1, **{'pass:' + eid: 2 << i for i, eid in enumerate(OAP_IDS)}}


def has(mask, a):
    return bool(mask & BIT.get(a, 0))


# ---------------------------------------------------------------- Regeln
def closure(h0, steps):
    out, q = {h0}, [h0]
    while q:
        h = q.pop()
        for d in steps:
            n = (h + d) % 8
            if n not in out:
                out.add(n); q.append(n)
    return out


def kreisel_steps(mask):
    st = [4]                             # mechanisch 180°
    if has(mask, 'DREHWURM'): st += [2, -2]
    if has(mask, 'WASSERWAAGE'): st += [1, -1]
    return st


def station_headings(stype, h, mask):
    if stype == 'ring90': return closure(h, [2, -2])
    if stype == 'ring45': return closure(h, [1, -1])
    if stype == 'wender180': return {h, opp(h)}
    if stype == 'ratsche': return closure(h, [2])
    if stype == 'kompass': return set(range(8)) if has(mask, 'WASSERWAAGE') else {x for x in range(8) if x % 2 == h % 2}
    if stype == 'kreisel': return closure(h, kreisel_steps(mask))
    if stype == 'klappe': return set(range(8)) if has(mask, 'WIRBELWIND') else {h}
    return {h}


def turn_options(p, h, mask, skill):
    P = POINT[p]
    res = set(station_headings(P['station'], h, mask))
    if skill and P['soft']:
        res |= station_headings(P['soft'], h, mask)
    if P['arena']:
        if has(mask, 'KREISELKOMPASS') or has(mask, 'WIRBELWIND'):
            res |= closure(h, kreisel_steps(mask))
        if has(mask, 'WIRBELWIND'):
            res |= set(range(8))
    else:
        res.add(opp(h))                     # Kehrschleife im Weichenraum
    if has(mask, 'WENDEHALS'):
        res |= {x for r in list(res) for x in (r, opp(r))}
    # Abschluss: weitere Drehungen auf den neuen Richtungen (Stationen sind wiederholbar)
    changed = True
    while changed:
        changed = False
        for r in list(res):
            more = station_headings(P['station'], r, mask)
            if skill and P['soft']:
                more |= station_headings(P['soft'], r, mask)
            if has(mask, 'WENDEHALS') or not P['arena']:
                more |= {opp(r)}
            if P['arena'] and (has(mask, 'KREISELKOMPASS') or has(mask, 'WIRBELWIND')):
                more |= closure(r, kreisel_steps(mask))
            if not more <= res:
                res |= more; changed = True
    return res


def direction_allowed(s, forward, flags):
    if forward or not s['oneWay']:
        return True
    return s['oap'] and bool(flags & FLAGBIT['pass:' + s['edge']['id']])


def gates_ok(s, forward, mask, flags, skill):
    for gid in s['gates']:
        g = GATE.get(gid)
        if g is None:
            problems.append(f"unbekanntes Hindernis {gid} in {s['id']}"); return False
        ap = g.get('appliesTo', 'both')
        if ap == 'forward' and not forward: continue
        if ap == 'backward' and forward: continue
        if ap == 'against-current':
            cur = s['current']
            if cur is None:
                problems.append(f"gegenstrom ohne current in {s['id']}"); return False
            against = (cur == 'forward' and not forward) or (cur == 'backward' and forward)
            if not against: continue
        if 'state' in g:
            if bool(flags & FLAGBIT[g['state']['flag']]) != g['state']['value']:
                return False
            continue
        if all(has(mask, a) for a in g['solvedBy']):
            continue
        if g.get('soft') and skill:
            continue
        return False
    return True


GOAL = 'GOAL'


def successors(st, skill):
    p, h, mask, flags = st
    P = POINT[p]
    out = []
    for nh in turn_options(p, h, mask, skill):
        if nh != h:
            out.append(((p, nh, mask, flags), 'drehen'))
    exits = [(s, f) for (eh, s, f) in OUT[p] if eh == h]
    flyable = [(s, f) for s, f in exits if direction_allowed(s, f, flags)]
    if flyable:   # Rückzug / Abbruch zum Entscheidungspunkt
        out.append(((p, opp(h), mask, flags), 'rueckzug'))
    for s, f in flyable:
        if not gates_ok(s, f, mask, flags, skill):
            continue
        target = s['b'] if f else s['a']
        nmask, nflags = mask, flags
        if f and s['oap']:
            nflags |= FLAGBIT['pass:' + s['edge']['id']]
        if f and s['reward']:
            if s['reward'] == 'GOAL':
                out.append((GOAL, 'ziel')); continue
            nmask |= BIT.get(s['reward'], 0)
        T = POINT[target]
        if T['arena'] and T['node'].get('item'):
            nmask |= BIT.get(T['node']['item'], 0)
        out.append(((target, h, nmask, nflags), 'flug ' + s['id']))
    if P['arena']:
        n = P['node']
        if n.get('ret'):
            out.append(((n['ret']['to'], hi[n['ret']['heading']], mask, flags), 'rueckhol'))
        if n.get('toggles') and has(mask, 'ROLLLEINE'):
            out.append(((p, h, mask, flags ^ FLAGBIT[n['toggles']]), 'hebel'))
    return out


def explore(skill, cap=None):
    """cap: Menge erlaubter Pflichtfähigkeiten; andere werden registriert, aber nicht genommen."""
    allowed_mask = None
    if cap is not None:
        allowed_mask = sum(BIT[a] for a in RELEVANT if a in cap or a not in REQUIRED)
    start = (W['start']['node'], hi[W['start']['heading']], 0, 0)
    sn = NODE[start[0]]
    seen = {start}
    q = deque([start])
    edges = {}
    found = set()     # erreichte Fundstücke (alle IDs)
    goal = False
    while q:
        st = q.popleft()
        succ = []
        p = st[0]
        if POINT[p]['arena'] and POINT[p]['node'].get('item'):
            found.add(POINT[p]['node']['item'])
        for nst, how in successors(st, skill):
            if nst == GOAL:
                goal = True; succ.append(GOAL); found.add('GOAL'); continue
            if how.startswith('flug'):
                seg_id = how[5:]
                s = next(x for x in SEG if x['id'] == seg_id)
                if s['reward'] and s['reward'] != 'GOAL':
                    fwd = (s['b'] == nst[0])
                    if fwd: found.add(s['reward'])
            if allowed_mask is not None:
                nst = (nst[0], nst[1], nst[2] & allowed_mask, nst[3])
            succ.append(nst)
            if nst not in seen:
                seen.add(nst); q.append(nst)
        edges[st] = succ
    return seen, edges, goal, found


def dead_ends(seen, edges):
    rev = defaultdict(list)
    for k, succ in edges.items():
        for s in succ:
            rev[s].append(k)
    good, q = {GOAL}, deque([GOAL])
    while q:
        k = q.popleft()
        for pr in rev[k]:
            if pr not in good:
                good.add(pr); q.append(pr)
    return [s for s in seen if s not in good]


def fmt(st):
    p, h, m, f = st
    return f"{p} Blick {H[h]} Items[{','.join(a for a in RELEVANT if m & BIT[a])}] Flags {f}"


# ---------------------------------------------------------------- Läufe
COLLECTIBLES = {n['item'] for n in W['nodes'] if n.get('item')} | \
    {s['reward'] for s in SEG if s['reward'] and s['reward'] != 'GOAL'}
report = {}
for skill in (False, True):
    seen, edges, goal, found = explore(skill)
    de = dead_ends(seen, edges)
    arenas = {s[0] for s in seen if POINT[s[0]]['arena']}
    label = 'mit Können ' if skill else 'ohne Können'
    print(f"{label}: {len(seen):7d} Zustände, Ziel {'erreichbar' if goal else 'NICHT erreichbar'}, "
          f"Sackgassen {len(de)}, Arenen {len(arenas)}/{sum(1 for p in POINT if POINT[p]['arena'])}, "
          f"Fundstücke {len(found & COLLECTIBLES)}/{len(COLLECTIBLES)}")
    for s in sorted(de, key=fmt)[:8]:
        print('   Sackgasse:', fmt(s))
    if not goal: problems.append(f'Ziel nicht erreichbar ({label})')
    if de: problems.append(f'{len(de)} Sackgassen ({label})')
    if not skill:
        miss = COLLECTIBLES - found
        if miss: problems.append('nicht erreichbare Fundstücke: ' + ', '.join(sorted(miss)))
        unreached = [p for p in POINT if POINT[p]['arena'] and p not in arenas and not POINT[p]['node'].get('goal')]
        if unreached: problems.append('nicht erreichbare Arenen: ' + ', '.join(unreached))

# ---------------------------------------------------------------- Phasen
order = W['intendedOrder']
print('\nPhase | Inventar bis | neue Pflicht-Fundstücke (ohne Können) | mit Können zusätzlich | Arenen')
prev_open = None
for k in range(len(order) + 1):
    cap = set(order[:k])
    _, _, g0, f0 = explore(False, cap)
    _, _, g1, f1 = explore(True, cap)
    seen0, _, _, _ = explore(False, cap)
    new0 = sorted((f0 & set(REQUIRED)) - cap) + (['ZIEL'] if g0 else [])
    new1 = sorted(((f1 & set(REQUIRED)) - cap) - set(new0)) + (['ZIEL'] if g1 and not g0 else [])
    arenas = len({s[0] for s in seen0 if POINT[s[0]]['arena']})
    print(f"{k:2d} | {order[k-1] if k else 'Start':14s} | {', '.join(new0) or '-':45s} | {', '.join(new1) or '-':22s} | {arenas}")
    if k < len(order) and order[k] not in new0:
        problems.append(f'Pflichtreihenfolge bricht: {order[k]} in Phase {k} nicht erreichbar')

print('\nPROBLEME:' if problems else '\nKeine Probleme gefunden.')
for p in dict.fromkeys(problems):
    print(' -', p)
