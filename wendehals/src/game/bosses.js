// Bossgegner. Jeder Boss sitzt am Ende seines Levels in einer Arena.
// Die Arena hält die Kamera fest; b.homeA ist die Ruheposition vorne im Bild,
// lv.arenaC die Mitte der Querachse.

import { dist2 } from '../core/math.js';

const TAU = Math.PI * 2;

function aim(b, lv, ox = 0, oc = 0) {
  const [ua, uc] = lv.aim(b.a + ox, b.c + oc);
  return Math.atan2(uc, ua);
}

function fan(lv, a, c, base, n, spread, speed, kind) {
  for (let i = 0; i < n; i++) {
    const ang = base + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
    lv.bullet(a, c, Math.cos(ang) * speed, Math.sin(ang) * speed, { kind });
  }
}

function ring(lv, a, c, n, speed, kind, off = 0) {
  for (let i = 0; i < n; i++) {
    const ang = off + (i / n) * TAU;
    lv.bullet(a, c, Math.cos(ang) * speed, Math.sin(ang) * speed, { kind });
  }
}

/** Zyklischer Angriffsplan: ruft der Reihe nach die Attacken auf. */
function schedule(b, dt, interval, attacks) {
  b.cool = (b.cool ?? 1.5) - dt;
  if (b.cool <= 0) {
    b.cool = interval;
    const atk = attacks[b.step % attacks.length];
    b.step = (b.step || 0) + 1;
    atk();
  }
}

export const BOSSES = {
  kaffeekanne: {
    name: 'Graf Kaffeekanne',
    title: 'Der Graf ist übergekocht!',
    hp: 55,
    r: 30,
    update(b, lv, dt) {
      b.a = b.homeA + 10 * Math.sin(b.t * 1.3);
      b.c = lv.arenaC + lv.swing * 0.3 * Math.sin(b.t * 0.8);
      const angry = b.hp < b.maxHp * 0.5;
      b.angry = angry;
      // Kaffeestrahl: kurze Salve aus der Tülle
      if (b.stream > 0) {
        b.stream -= dt;
        b.streamCool = (b.streamCool || 0) - dt;
        if (b.streamCool <= 0) {
          b.streamCool = 0.09;
          fan(lv, b.a - 30, b.c - 8, b.streamAng, 1, 0, lv.bulletSpeed(150), 'kaffee');
        }
      }
      schedule(b, dt, angry ? 1.5 : 2.2, [
        () => {
          b.stream = 0.7;
          b.streamAng = aim(b, lv, -30, -8);
          lv.sfx('gluck');
        },
        () => fan(lv, b.a - 10, b.c, Math.PI, 5, 0.32, lv.bulletSpeed(80), 'zucker'),
        () => {
          if (angry) {
            for (let i = 0; i < 3; i++) {
              lv.bullet(b.a, b.c - 20, -45 - i * 10, (i - 1) * 35, { kind: 'dampf', r: 9 });
            }
          } else {
            fan(lv, b.a - 10, b.c, aim(b, lv), 3, 0.2, lv.bulletSpeed(110), 'zucker');
          }
        },
      ]);
    },
  },

  walross: {
    name: 'Admiral Walross',
    title: 'Ahoi, du Landratte!',
    hp: 62,
    r: 34,
    update(b, lv, dt) {
      b.a = b.homeA;
      b.c = lv.arenaC + lv.swing * 0.28 * Math.sin(b.t * 0.6);
      const angry = b.hp < b.maxHp * 0.5;
      b.angry = angry;
      schedule(b, dt, angry ? 1.4 : 2.0, [
        () => fan(lv, b.a - 20, b.c - 18, aim(b, lv, -20, -18), 5, 0.22, lv.bulletSpeed(80), 'blase'),
        () => {
          lv.spawn('torpedo', b.a - 30, b.c + 20, {});
          if (angry) lv.spawn('torpedo', b.a - 30, b.c - 30, {});
          lv.sfx('quak');
        },
        () => ring(lv, b.a, b.c, angry ? 14 : 10, lv.bulletSpeed(65), 'tropfen', b.t),
      ]);
    },
    /** Nur der Kopf ist verwundbar, die Wanne schluckt Schüsse. */
    hitTest(b, s) {
      if (dist2(b.a - 12, b.c - 22, s.a, s.c) < (19 + s.r) ** 2) return 'hit';
      if (dist2(b.a, b.c, s.a, s.c) < (b.r + s.r) ** 2) return 'block';
      return null;
    },
  },

  kartoffel: {
    name: 'Kaiser Kartoffel',
    title: 'Ich bin hier der Knollenkaiser!',
    hp: 85,
    r: 30,
    update(b, lv, dt) {
      b.a = b.homeA + 18 * Math.sin(b.t * 0.9);
      b.vcc = b.vcc ?? 70;
      b.c += b.vcc * dt;
      const lim = lv.swing * 0.26;
      const off = lv.dc(b.c, lv.arenaC);
      if (off > lim) b.vcc = -Math.abs(b.vcc);
      if (off < -lim) b.vcc = Math.abs(b.vcc);
      const angry = b.hp < b.maxHp * 0.5;
      b.angry = angry;
      // Pommes-Wand wandert in Richtung Spieler, mit einer Lücke
      if (b.wall) {
        b.wall.t -= dt;
        if (b.wall.t <= 0) {
          const gap = b.wall.gap;
          const top = lv.arenaC - lv.vc / 2;
          for (let c = top + 6; c < top + lv.vc; c += 14) {
            if (Math.abs(c - gap) < 30) continue;
            lv.bullet(lv.camA + lv.va - 4, c, -lv.bulletSpeed(70), 0, { kind: 'pommes' });
          }
          b.wall = null;
        }
      }
      schedule(b, dt, angry ? 1.5 : 2.1, [
        () => {
          const ang = aim(b, lv);
          for (let i = 0; i < 3; i++) {
            const sp = lv.bulletSpeed(150) - i * 18;
            lv.bullet(b.a - 20, b.c, Math.cos(ang) * sp, Math.sin(ang) * sp, { kind: 'pommes' });
          }
        },
        () => {
          lv.spawn('knolle', b.a - 20, b.c - 20, {});
          lv.spawn('knolle', b.a - 20, b.c + 20, {});
        },
        () => {
          if (angry) {
            const top = lv.arenaC - lv.vc / 2;
            b.wall = { t: 0.4, gap: top + 40 + lv.rng.next() * (lv.vc - 80) };
            lv.sfx('warn');
          } else fan(lv, b.a - 20, b.c, Math.PI, 7, 0.28, lv.bulletSpeed(75), 'pommes');
        },
      ]);
    },
  },

  diva: {
    name: 'Diskokugel-Diva',
    title: 'Darling, das ist MEINE Tanzfläche!',
    hp: 92,
    r: 28,
    update(b, lv, dt) {
      b.a = b.homeA - 20 + 22 * Math.sin(b.t * 1.4);
      b.c = lv.arenaC + lv.swing * 0.25 * Math.sin(b.t * 0.7);
      const angry = b.hp < b.maxHp * 0.5;
      b.angry = angry;
      // Rotierende Laser: erst Warnlinie, dann aktiv
      b.beamT = (b.beamT ?? -2) + dt;
      const n = angry ? 3 : 2;
      const len = Math.min(lv.va * 0.75, 340);
      if (b.beamT > 0) {
        const warn = b.beamT < 1.0;
        b.beamAng = (b.beamAng ?? Math.PI * 0.75) + (warn ? 0 : dt * 0.55);
        for (let i = 0; i < n; i++) {
          lv.hazard(b.a, b.c, b.beamAng + (i / n) * TAU, len, 4, warn);
        }
        if (b.beamT > 3.6) b.beamT = -2.4;
      }
      schedule(b, dt, angry ? 1.7 : 2.3, [
        () => ring(lv, b.a, b.c, 10, lv.bulletSpeed(65), 'note', b.t),
        () => lv.spawn('gebiss', b.a - 20, b.c + (lv.rng.next() - 0.5) * 80, {}),
        () => fan(lv, b.a - 10, b.c, aim(b, lv), 3, 0.3, lv.bulletSpeed(100), 'note'),
      ]);
    },
  },

  wecker: {
    name: 'Der Große Wecker',
    title: 'Es ist höchste Zeit!',
    hp: 125,
    r: 36,
    update(b, lv, dt) {
      b.a = b.homeA - 10;
      b.c = lv.arenaC + lv.swing * 0.18 * Math.sin(b.t * 0.5);
      const ratio = b.hp / b.maxHp;
      b.phase = ratio > 0.6 ? 1 : ratio > 0.25 ? 2 : 3;
      // Uhrzeiger als rotierende Gefahrenlinien
      const sp = b.phase === 3 ? 1.6 : b.phase === 2 ? 1.25 : 1;
      b.hour = (b.hour ?? Math.PI) + dt * 0.35 * sp;
      b.minute = (b.minute ?? Math.PI * 0.5) + dt * 0.9 * sp;
      // Zeiger nie so lang, dass sie den hinteren Bildrand erreichen: dort ist immer ein sicherer Streifen.
      const lh = Math.min(lv.va * 0.26, 130);
      const lm = Math.min(lv.va * 0.34, 165);
      const warmup = b.t < 2;
      lv.hazard(b.a, b.c, b.hour, lh, 6, warmup);
      lv.hazard(b.a, b.c, b.minute, lm, 3, warmup);
      schedule(b, dt, b.phase === 3 ? 1.3 : 1.9, [
        () => {
          // aus beiden Glocken (oben links/rechts der Uhr)
          fan(lv, b.a - 20, b.c - 34, aim(b, lv, -20, -34), 2, 0.2, lv.bulletSpeed(105), 'glocke');
          fan(lv, b.a + 20, b.c - 34, aim(b, lv, 20, -34), 2, 0.2, lv.bulletSpeed(105), 'glocke');
        },
        () => {
          if (b.phase >= 2) {
            ring(lv, b.a, b.c, 16, lv.bulletSpeed(60), 'glocke', b.t);
            lv.shake(6);
            lv.sfx('ring');
          } else fan(lv, b.a - 20, b.c, aim(b, lv), 5, 0.18, lv.bulletSpeed(90), 'kugel');
        },
        () => {
          if (b.phase === 3) lv.spawn('wecker', b.a - 30, b.c + (lv.rng.next() - 0.5) * 100, {});
          else fan(lv, b.a - 20, b.c, Math.PI, 9, 0.2, lv.bulletSpeed(70), 'kugel');
        },
      ]);
    },
  },
};

export function defaultHitTest(b, s) {
  return dist2(b.a, b.c, s.a, s.c) < (b.r + s.r) ** 2 ? 'hit' : null;
}
