// Alle Upgrades. "short" ist das Kürzel für die Itemleiste auf der Karte.
// GATES: welches Item welches Hindernis öffnet (soft = mit Können auch ohne Item schaffbar).

export const ITEMS = {
  DREHWURM: {
    short: 'DW',
    name: 'Drehwurm',
    desc: 'Du kannst dich an jedem Knoten um 90° nach rechts drehen. Dreimal rechts ist auch links!',
    kind: 'ability',
    required: true,
  },
  GUMMIHAUT: {
    short: 'QH',
    name: 'Quietscheentenhaut',
    desc: 'Stacheln quietschen nur noch. Stachelfelder tun dir nichts mehr.',
    kind: 'ability',
    required: false,
  },
  LAMPE: {
    short: 'GL',
    name: 'Opas Grubenlampe',
    desc: 'Erhellt dunkle Zonen. Riecht leicht nach Kohle und Pfefferminz.',
    kind: 'ability',
    required: false,
  },
  BOHRER: {
    short: 'ZB',
    name: 'Zahnarztbohrer',
    desc: 'Deine Schüsse bohren sich durch Felsen. Bitte weit öffnen!',
    kind: 'ability',
    required: true,
  },
  PILZ: {
    short: 'SP',
    name: 'Schrumpfpilz',
    desc: 'Du bist jetzt winzig und passt durch enge Spalten.',
    kind: 'ability',
    required: true,
  },
  WENDEHALS: {
    short: 'WH',
    name: 'Wendehals',
    desc: 'Drücke WENDEN für eine 180°-Kehrtwende – auch mitten im Level.',
    kind: 'ability',
    required: false,
  },
  OMA: {
    short: 'OT',
    name: 'Oma Turbo',
    desc: 'Neue Pilotin! Fliegt im Ohrensessel und strickt Doppelnadeln. Wechsel an jeder Station.',
    kind: 'character',
    required: false,
  },
  TOASTER: {
    short: 'TT',
    name: 'Toaster Tim',
    desc: 'Neuer Pilot! Schnell, heiß und immer knusprig. Wechsel an jeder Station.',
    kind: 'character',
    required: false,
  },
  WURST1: { short: 'W+', name: 'Extrawürstchen', desc: 'Maximale Energie +1.', kind: 'health', required: false },
  WURST2: { short: 'W+', name: 'Extrawürstchen', desc: 'Maximale Energie +1.', kind: 'health', required: false },
  WURST3: { short: 'W+', name: 'Extrawürstchen', desc: 'Maximale Energie +1.', kind: 'health', required: false },
};

export const ITEM_IDS = Object.keys(ITEMS);

/** Hindernistypen in Leveln und welches Item sie öffnet. */
export const GATES = {
  rock: { item: 'BOHRER', soft: false, name: 'Felswand' },
  narrow: { item: 'PILZ', soft: false, name: 'Enge Spalte' },
  spikes: { item: 'GUMMIHAUT', soft: true, name: 'Stachelfeld' },
  dark: { item: 'LAMPE', soft: true, name: 'Dunkelzone' },
};

export const BASE_HP = 3;

export function maxHpFor(items) {
  let hp = BASE_HP;
  for (const id of ['WURST1', 'WURST2', 'WURST3']) if (items.has(id)) hp++;
  return hp;
}
