// Alle Upgrades. "short" ist das Kürzel für die Itemleiste auf der Karte.
// GATES: welches Item welches Hindernis öffnet (soft = mit Können auch ohne Item schaffbar).

export const ITEMS = {
  DREHWURM: {
    short: 'DW',
    name: 'Drehwurm',
    desc: 'K / B: Drehen (an Kreuzungen)',
    kind: 'ability',
    required: true,
  },
  GUMMIHAUT: {
    short: 'QH',
    name: 'Quietscheentenhaut',
    desc: '',
    kind: 'ability',
    required: false,
  },
  LAMPE: {
    short: 'GL',
    name: 'Opas Grubenlampe',
    desc: '',
    kind: 'ability',
    required: false,
  },
  BOHRER: {
    short: 'ZB',
    name: 'Zahnarztbohrer',
    desc: '',
    kind: 'ability',
    required: true,
  },
  PILZ: {
    short: 'SP',
    name: 'Schrumpfpilz',
    desc: '',
    kind: 'ability',
    required: true,
  },
  WENDEHALS: {
    short: 'WH',
    name: 'Wendehals',
    desc: 'L / Y: Wenden',
    kind: 'ability',
    required: false,
  },
  OMA: {
    short: 'OT',
    name: 'Oma Turbo',
    desc: 'An Stationen: Pilot wechseln (X).',
    kind: 'character',
    required: false,
  },
  TOASTER: {
    short: 'TT',
    name: 'Toaster Tim',
    desc: 'An Stationen: Pilot wechseln (X).',
    kind: 'character',
    required: false,
  },
  ESPRESSO: {
    short: 'EX',
    name: 'Doppelter Espresso',
    desc: 'E / RB halten: Turbo',
    kind: 'ability',
    required: false,
  },
  SPARSTRUMPF: {
    short: 'SS',
    name: 'Omas Sparstrumpf',
    desc: '',
    kind: 'ability',
    required: false,
  },
  WURST1: { short: 'W+', name: 'Extrawürstchen', desc: '', kind: 'health', required: false },
  WURST2: { short: 'W+', name: 'Extrawürstchen', desc: '', kind: 'health', required: false },
  WURST3: { short: 'W+', name: 'Extrawürstchen', desc: '', kind: 'health', required: false },
};

export const ITEM_IDS = Object.keys(ITEMS);

/** Hindernistypen in Leveln und welches Item sie öffnet. */
export const GATES = {
  rock: { item: 'BOHRER', soft: false, name: 'Felswand' },
  narrow: { item: 'PILZ', soft: false, name: 'Enge Spalte' },
  spikes: { item: 'GUMMIHAUT', soft: true, name: 'Stachelfeld' },
  dark: { item: 'LAMPE', soft: true, name: 'Dunkelzone' },
  clock: { item: 'ESPRESSO', soft: false, name: 'Zeitschranke' },
};

export const BASE_HP = 3;

export function maxHpFor(items) {
  let hp = BASE_HP;
  for (const id of ['WURST1', 'WURST2', 'WURST3']) if (items.has(id)) hp++;
  return hp;
}
