// Ebenen, die sich sperren lassen (A5): gesperrte Ebenen lassen sich nicht wählen, nicht verschieben und nicht per Rechtsklick
// bestücken. Zuordnung der Dinge des Gebiets zu Ebenen und der Werkzeuge zu den Ebenen, in die sie schreiben – alles an einer Stelle.

/** Reihenfolge und Namen in der Leiste. */
export const EBENEN = [
  { id: 'knoten', name: 'Knoten' },
  { id: 'gaenge', name: 'Gänge' },
  { id: 'formteile', name: 'Formteile' },
  { id: 'waende', name: 'Wände/Hindernisse' },
  { id: 'gegner', name: 'Gegner' },
];

/** Ebene eines Dings: art 'knoten' | 'gang' | 'formteil' | 'objekt' (Wand, Hindernis, Gegner), `o` = das Objekt (nur für 'objekt' nötig). */
export function ebeneVon(art, o = null) {
  if (art === 'knoten') return 'knoten';
  if (art === 'gang') return 'gaenge';
  if (art === 'formteil') return 'formteile';
  return o?.typ === 'gegner' ? 'gegner' : 'waende';
}

/** In welche Ebenen schreibt ein Werkzeug (Rechtsklick)? Ein Gang oder Knoten kann den anderen Teil anlegen oder teilen. */
export const WERKZEUG_EBENEN = {
  gang: ['gaenge', 'knoten'],
  knoten: ['knoten', 'gaenge'],
  formteil: ['formteile'],
  wand: ['waende'],
  hindernis: ['waende'],
  gegner: ['gegner'],
  bereich: [],
};
