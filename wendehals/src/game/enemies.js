// Gegnerverhalten. Alle Koordinaten im lokalen Level-System:
// a = Flugrichtung (der Spieler fliegt Richtung +a), c = Querachse (periodisch).
// Gegner kommen von vorne (großes a) und bewegen sich meist Richtung -a.

const TAU = Math.PI * 2;

/** Hält den Gegner an einer festen Bildschirmposition (Anteil der Sichtlänge). */
function holdAt(e, lv, frac, dt, speed = 140) {
  const target = lv.camA + lv.va * frac;
  if (e.a > target) e.a = Math.max(target, e.a - speed * dt);
  else e.a = target;
}

function aimShot(e, lv, speed, kind, spread = 0, count = 1) {
  const [ua, uc] = lv.aim(e.a, e.c);
  const base = Math.atan2(uc, ua);
  for (let i = 0; i < count; i++) {
    const ang = base + (count > 1 ? (i - (count - 1) / 2) * spread : 0);
    lv.bullet(e.a, e.c, Math.cos(ang) * speed, Math.sin(ang) * speed, { kind });
  }
}

function radial(e, lv, n, speed, kind, offset = 0) {
  for (let i = 0; i < n; i++) {
    const ang = offset + (i / n) * TAU;
    lv.bullet(e.a, e.c, Math.cos(ang) * speed, Math.sin(ang) * speed, { kind });
  }
}

export const ENEMIES = {
  // --- Frühstückstisch ---
  toast: {
    name: 'Fliegender Toast',
    hp: 1,
    r: 8,
    score: 100,
    update(e, lv, dt) {
      e.a -= 70 * dt;
      e.c = e.c0 + 10 * Math.sin(e.t * 4 + e.idx);
    },
  },
  brezel: {
    name: 'Brezel',
    split: { into: 'brezelhaelfte', spread: [-55, 55] },
    hp: 1,
    r: 8,
    score: 100,
    update(e, lv, dt) {
      e.a -= 85 * dt;
      e.c = e.c0 + 50 * Math.sin(e.t * 2.4 + e.idx * 0.6);
    },
  },
  ei: {
    name: 'Spiegelei-UFO',
    hp: 2,
    r: 10,
    score: 200,
    update(e, lv, dt) {
      if (e.t < 1.6) {
        holdAt(e, lv, 0.72 - 0.06 * (e.idx % 3), dt, 160);
      } else if (!e.fired) {
        e.fired = true;
        aimShot(e, lv, lv.bulletSpeed(95), 'kugel', 0.25, lv.diff >= 3 ? 3 : 1);
      } else if (e.t < 2.3) {
        holdAt(e, lv, 0.72 - 0.06 * (e.idx % 3), dt);
      } else {
        e.a -= 170 * dt;
      }
    },
  },
  bohne: {
    name: 'Kaffeebohne',
    hp: 1,
    r: 6,
    score: 150,
    init(e) {
      e.ang = Math.PI;
    },
    update(e, lv, dt) {
      const [ua, uc] = lv.aim(e.a, e.c);
      const want = Math.atan2(uc, ua);
      let d = want - e.ang;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const turn = 1.4 * dt;
      e.ang += Math.max(-turn, Math.min(turn, d));
      const sp = 60 + lv.diff * 5;
      e.a += Math.cos(e.ang) * sp * dt;
      e.c += Math.sin(e.ang) * sp * dt;
      if (e.t > 9) e.gone = true;
    },
  },
  // --- Badewannen-Ozean ---
  ente: {
    name: 'Gummiente',
    hp: 1,
    r: 8,
    score: 100,
    update(e, lv, dt) {
      e.a -= 75 * dt;
      e.c = e.c0 + 14 * Math.sin(e.t * 5 + e.idx);
    },
  },
  seife: {
    name: 'Seifenblase',
    hp: 3,
    r: 12,
    score: 200,
    update(e, lv, dt) {
      e.a -= 30 * dt;
      e.c = e.c0 + 30 * Math.sin(e.t * 1.3 + e.idx);
    },
    split: { into: 'miniseife', spread: [-60, 60] },
  },
  miniseife: {
    name: 'Bläschen',
    hp: 1,
    r: 6,
    score: 50,
    update(e, lv, dt) {
      e.a -= 50 * dt;
      e.c += (e.vc || 0) * dt;
      e.vc *= 1 - 0.8 * dt;
    },
  },
  nilpferd: {
    name: 'Nilpferd im Schwimmring',
    hp: 7,
    r: 14,
    score: 500,
    update(e, lv, dt) {
      if (e.t < 7) {
        holdAt(e, lv, 0.8, dt, 90);
        e.c += Math.sin(e.t * 0.9) * 20 * dt;
        e.cool = (e.cool ?? 1.2) - dt;
        if (e.cool <= 0) {
          e.cool = 2.1 - lv.diff * 0.12;
          aimShot(e, lv, lv.bulletSpeed(70), 'blase', 0.35, 3);
        }
      } else {
        e.a -= 120 * dt;
      }
    },
  },
  socke: {
    name: 'Sockenschwarm',
    hp: 1,
    r: 7,
    score: 100,
    update(e, lv, dt) {
      e.a = e.a0 - 70 * e.t + 28 * Math.cos(e.t * 3 + e.idx);
      e.c = e.c0 + 36 * Math.sin(e.t * 3 + e.idx);
    },
  },
  // --- Omas Keller ---
  zwerg: {
    name: 'Gartenzwerg im UFO',
    hp: 3,
    r: 10,
    score: 300,
    update(e, lv, dt) {
      if (e.t < 7) {
        holdAt(e, lv, 0.74, dt);
        const dc = lv.dc(lv.player.c, e.c);
        e.c += Math.sign(dc) * Math.min(Math.abs(dc), 30 * dt);
        e.cool = (e.cool ?? 1.0) - dt;
        if (e.cool <= 0) {
          e.cool = 1.6 - lv.diff * 0.1;
          aimShot(e, lv, lv.bulletSpeed(90), 'muetze');
        }
      } else {
        e.a -= 140 * dt;
      }
    },
  },
  gebiss: {
    name: 'Klappergebiss',
    hp: 2,
    r: 9,
    score: 200,
    update(e, lv, dt) {
      if (e.t < 0.9) {
        holdAt(e, lv, 0.7, dt, 200);
      } else if (e.t < 1.5) {
        holdAt(e, lv, 0.7, dt);
        e.chatter = true;
      } else {
        if (!e.dash) {
          e.chatter = false;
          const [ua, uc] = lv.aim(e.a, e.c);
          e.dash = [ua * 210, uc * 210];
        }
        e.a += e.dash[0] * dt;
        e.c += e.dash[1] * dt;
        if (e.t > 6) e.gone = true;
      }
    },
  },
  glas: {
    name: 'Einmachglas',
    hp: 4,
    r: 11,
    score: 300,
    update(e, lv, dt) {
      e.a -= 25 * dt;
      if (e.a - lv.camA < lv.va * 0.5 && !e.popped) {
        e.popped = true;
        e.hp = 0;
        lv.kill(e, false);
      }
    },
    split: { into: 'gurke', spread: [-70, 0, 70], always: true },
  },
  gurke: {
    name: 'Gewürzgurke',
    hp: 1,
    r: 6,
    score: 50,
    update(e, lv, dt) {
      e.a -= 95 * dt;
      e.c += (e.vc || 0) * dt;
    },
  },
  // --- Disco-Vulkan ---
  discokugel: {
    name: 'Mini-Discokugel',
    hp: 6,
    r: 12,
    score: 400,
    update(e, lv, dt) {
      e.a -= 18 * dt;
      e.c = e.c0 + 25 * Math.sin(e.t);
      e.cool = (e.cool ?? 0.8) - dt;
      if (e.cool <= 0) {
        e.cool = 1.5 - lv.diff * 0.08;
        radial(e, lv, 4, lv.bulletSpeed(70), 'note', e.t);
      }
    },
  },
  wurst: {
    name: 'Tanzwurst',
    hp: 3,
    r: 11,
    score: 250,
    update(e, lv, dt) {
      e.a -= 55 * dt;
      e.c = e.c0 + 20 * Math.sin(e.t * 3);
    },
    split: { into: 'miniwurst', spread: [-50, 50] },
  },
  miniwurst: {
    name: 'Cocktailwürstchen',
    hp: 1,
    r: 6,
    score: 50,
    update(e, lv, dt) {
      const [ua, uc] = lv.aim(e.a, e.c);
      e.a += (-40 + ua * 50) * dt;
      e.c += ((e.vc || 0) * Math.max(0, 1 - e.t) + uc * 50) * dt;
      if (e.t > 8) e.gone = true;
    },
  },
  vinyl: {
    name: 'Schallplatte',
    hp: 2,
    r: 9,
    score: 150,
    update(e, lv, dt) {
      e.a -= 115 * dt;
      e.c = e.c0 + 60 * Math.sin(e.t * 2 + e.idx * 0.5);
    },
  },
  // --- Uhrwerk-Himmel ---
  zahnrad: {
    name: 'Zahnrad',
    hp: 1,
    r: 15,
    score: 0,
    invulnerable: true,
    update(e, lv, dt) {
      e.a -= 12 * dt;
      e.c = e.c0 + 30 * Math.sin(e.t * 0.7);
    },
  },
  wecker: {
    name: 'Wecker',
    split: { into: 'feder', spread: [-60, 60] },
    hp: 4,
    r: 10,
    score: 300,
    update(e, lv, dt) {
      if (e.t < 2.6) holdAt(e, lv, 0.75 - 0.05 * (e.idx % 2), dt);
      else if (!e.rang) {
        e.rang = true;
        lv.sfx('ring');
        radial(e, lv, 8, lv.bulletSpeed(75), 'glocke', 0.2);
      } else e.a -= 150 * dt;
    },
  },
  kuckuck: {
    name: 'Kuckuck',
    hp: 3,
    r: 10,
    score: 300,
    update(e, lv, dt) {
      if (e.t < 6) {
        holdAt(e, lv, 0.78, dt);
        e.cool = (e.cool ?? 1.0) - dt;
        if (e.cool <= 0) {
          e.cool = 1.5 - lv.diff * 0.06;
          aimShot(e, lv, lv.bulletSpeed(100), 'kugel', 0.18, 2);
        }
      } else e.a -= 150 * dt;
    },
  },
  brezelhaelfte: {
    name: 'Brezelhälfte',
    hp: 1,
    r: 5,
    score: 40,
    update(e, lv, dt) {
      e.a -= 70 * dt;
      e.c += (e.vc || 0) * dt;
      e.vc *= 1 - 0.6 * dt;
    },
  },
  feder: {
    name: 'Uhrfeder',
    hp: 1,
    r: 5,
    score: 40,
    update(e, lv, dt) {
      e.a -= 60 * dt;
      e.c += (e.vc || 0) * Math.cos(e.t * 6) * dt;
    },
  },
  // --- Boss-Helfer ---
  torpedo: {
    name: 'Torpedo-Ente',
    hp: 1,
    r: 7,
    score: 100,
    init(e) {
      e.ang = Math.PI;
    },
    update(e, lv, dt) {
      // Nur kurz zielsuchend, danach geradeaus – ausweichbar statt klebrig
      if (e.t < 2.2) ENEMIES.bohne.update(e, lv, dt);
      else {
        e.a += Math.cos(e.ang) * 80 * dt;
        e.c += Math.sin(e.ang) * 80 * dt;
        if (e.t > 8) e.gone = true;
      }
    },
  },
  knolle: {
    name: 'Kartöffelchen',
    hp: 2,
    r: 7,
    score: 100,
    init(e) {
      e.ang = Math.PI;
    },
    update(e, lv, dt) {
      ENEMIES.bohne.update(e, lv, dt);
    },
  },
};

/**
 * Teilen: Gegner mit "split" zerfallen beim Abschuss in kleinere – aber erst nach SPLIT_DELAY
 * (sichtbares Wackeln), und die Teile teilen sich nie weiter (keine Kettenreaktion).
 */
export const SPLIT_WOBBLE = 0.2; // Elternteil wackelt, bevor er platzt
export const SPLIT_DELAY = 0.3; // Teile wachsen, bevor sie loslegen
export const MAX_SPLIT_GENERATION = 1;

/** Gegner, die in Formationen auftreten (mehrere hintereinander). */
export const FORMATION_KINDS = new Set(['toast', 'brezel', 'ente', 'socke', 'vinyl']);
