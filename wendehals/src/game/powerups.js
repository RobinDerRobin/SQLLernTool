// Gradius/Parodius-artige Power-Leiste: Bonbons schieben den Cursor weiter,
// die POWER-Taste kauft das markierte Upgrade.

export const POWER_LABELS = ['TEMPO', 'RAKETE', 'DOPPEL', 'LASER', 'BEGLEITER', 'SCHILD'];
export const MAX_SPEED = 4;
export const MAX_OPTIONS = 2;
export const SHIELD_HITS = 3;

export function freshPowers() {
  // order: Reihenfolge der Käufe (Slot-Nummern) – für "Omas Sparstrumpf" nach dem Tod
  return { speed: 0, missile: false, double: false, laser: false, options: 0, shield: 0, cursor: -1, order: [] };
}

export function slotAvailable(p, i) {
  switch (i) {
    case 0:
      return p.speed < MAX_SPEED;
    case 1:
      return !p.missile;
    case 2:
      return !p.double;
    case 3:
      return !p.laser;
    case 4:
      return p.options < MAX_OPTIONS;
    case 5:
      return p.shield <= 0;
    default:
      return false;
  }
}

export function addCapsule(p) {
  p.cursor = (p.cursor + 1) % POWER_LABELS.length;
}

/** Kauft das markierte Upgrade. Gibt das Label zurück oder null, wenn nichts passiert ist. */
export function activate(p) {
  const i = p.cursor;
  if (i < 0 || !slotAvailable(p, i)) return null;
  switch (i) {
    case 0:
      p.speed++;
      break;
    case 1:
      p.missile = true;
      break;
    case 2:
      p.double = true;
      p.laser = false;
      break;
    case 3:
      p.laser = true;
      p.double = false;
      break;
    case 4:
      p.options++;
      break;
    case 5:
      p.shield = SHIELD_HITS;
      break;
  }
  p.cursor = -1;
  p.order ||= [];
  // Doppel und Laser schließen sich aus: der Wechsel ersetzt den alten Eintrag
  if (i === 2 || i === 3) p.order = p.order.filter((x) => x !== 2 && x !== 3);
  p.order.push(i);
  return POWER_LABELS[i];
}

/** Wendet einen Kauf an, ohne die Leiste zu verändern (für den Wiederaufbau). */
function apply(p, i) {
  p.cursor = i;
  activate(p);
}

/**
 * Power-Ups nach dem Tod. Wie bei Parodius ist alles weg – mit "Omas Sparstrumpf" bleibt die
 * erste Hälfte der gekauften Power-Ups erhalten (abgerundet). Der Schild zählt nie mit.
 */
export function powerupsAfterDeath(p, hasSparstrumpf) {
  const fresh = freshPowers();
  if (!hasSparstrumpf || !p || !Array.isArray(p.order)) return fresh;
  const buys = p.order.filter((i) => i !== 5); // Schild zählt nie mit
  const keep = buys.slice(0, Math.floor(buys.length / 2));
  for (const i of keep) if (slotAvailable(fresh, i)) apply(fresh, i);
  fresh.cursor = -1;
  return fresh;
}

/** Sichert ab, dass ein geladener/übergebener Zustand gültig ist. */
export function sanitizePowers(p) {
  const f = freshPowers();
  if (!p || typeof p !== 'object') return f;
  return {
    speed: Math.max(0, Math.min(MAX_SPEED, p.speed | 0)),
    missile: !!p.missile,
    double: !!p.double && !p.laser,
    laser: !!p.laser,
    options: Math.max(0, Math.min(MAX_OPTIONS, p.options | 0)),
    shield: Math.max(0, Math.min(SHIELD_HITS, p.shield | 0)),
    cursor: Math.max(-1, Math.min(POWER_LABELS.length - 1, Number.isInteger(p.cursor) ? p.cursor : -1)),
    order: Array.isArray(p.order) ? p.order.filter((i) => Number.isInteger(i) && i >= 0 && i < POWER_LABELS.length) : [],
  };
}
