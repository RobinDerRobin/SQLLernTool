// Spieltexte (Deutsch).

export const HINTS = {
  hint_move: 'Pfeiltasten / Stick: fliegen. Oben und unten hängen zusammen!',
  hint_fire: 'FEUER halten: Dauerfeuer.',
  hint_power: 'Bonbons füllen die Power-Leiste. POWER kauft das markierte Upgrade.',
};

export const GATE_HINTS = {
  rock: {
    missing: 'Felswand! Ohne Zahnarztbohrer kein Durchkommen. (Pause → Etappe abbrechen)',
    have: 'Felswand – bohr sie weg!',
  },
  narrow: {
    missing: 'Viel zu eng! Hier passt nur etwas Winziges durch. (Pause → Etappe abbrechen)',
    have: 'Enge Spalte – folge dem Pfeil und schlüpf hindurch!',
  },
  spikes: {
    missing: 'Stachelfeld! Fliege durch die Lücken – oder komm mit dickerer Haut wieder.',
    have: 'Stachelfeld – deine Quietscheentenhaut schützt dich.',
  },
  dark: {
    missing: 'Stockdunkel hier! Mutig weiter – oder später mit Licht wiederkommen.',
    have: 'Dunkelzone – Opas Grubenlampe leuchtet!',
  },
};

export const ENDING_LINES = [
  'BRRRRRRIIIIIIIINNNNNG!!!',
  'Der Große Wecker klingelt so laut, dass die ganze Welt aufwacht.',
  'Auch der Dackel in seinem Körbchen.',
  'Er gähnt. Er streckt sich. Er schaut sich um.',
  'War das alles nur ein Traum?',
  'Auf dem Nachttisch tickt ein ganz normaler Wecker.',
  '...',
  'Er zwinkert.',
];

export const NODE_HINTS = {
  noExit: 'Hier geht es in dieser Richtung nicht weiter.',
  oneWay: 'Einbahnstraße! Von hier aus nicht befliegbar.',
  needTurn: 'Drehen geht hier nur an Drehscheiben – oder mit einem Drehwurm.',
};
