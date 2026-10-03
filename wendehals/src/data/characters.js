// Spielbare Figuren. "unlock" ist das Item, das die Figur freischaltet (null = von Anfang an).

export const CHARACTERS = {
  dackel: {
    name: 'Dackel Düse',
    desc: 'Ein Dackel mit Raketenrucksack. Wirft Knochen.',
    unlock: null,
    speed: 1.0,
    shotSpeed: 330,
    shotDamage: 1,
    mainShots: 1, // Knochen pro Salve
    double: 'diagonal', // Schussrichtung des DOPPEL-Upgrades
    color: '#c8742f',
  },
  oma: {
    name: 'Oma Turbo',
    desc: 'Ohrensessel mit Düsenantrieb. Zwei Stricknadeln pro Schuss, DOPPEL schießt nach hinten.',
    unlock: 'OMA',
    speed: 0.88,
    shotSpeed: 300,
    shotDamage: 1,
    mainShots: 2,
    double: 'back',
    color: '#b05fc4',
  },
  toaster: {
    name: 'Toaster Tim',
    desc: 'Flinker Toaster. DOPPEL streut drei Toastscheiben.',
    unlock: 'TOASTER',
    speed: 1.18,
    shotSpeed: 360,
    shotDamage: 1,
    mainShots: 1,
    double: 'spread',
    color: '#9aa7b8',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);

export function availableCharacters(items) {
  return CHARACTER_IDS.filter((id) => !CHARACTERS[id].unlock || items.has(CHARACTERS[id].unlock));
}
