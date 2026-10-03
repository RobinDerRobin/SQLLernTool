// Spielstand: lesen, prüfen, schreiben. Speicher ist austauschbar (localStorage im Browser,
// ein einfaches Objekt in Tests). Kaputte Spielstände führen nie zum Absturz.

import { NODES, EDGE_BY_ID, START_NODE, START_HEADING } from '../data/world.js';
import { ITEMS } from '../data/items.js';
import { CHARACTERS } from '../data/characters.js';

export const SAVE_KEY = 'wendehals.save.v1';
export const SETTINGS_KEY = 'wendehals.settings.v1';
export const SAVE_VERSION = 1;

export function newProgress() {
  return {
    version: SAVE_VERSION,
    saveNode: START_NODE,
    saveHeading: START_HEADING,
    items: [],
    visited: [START_NODE],
    knownEdges: [],
    character: 'dackel',
    score: 0,
    playTime: 0,
    deaths: 0,
    finished: false,
  };
}

const isDir = (d) => Number.isInteger(d) && d >= 0 && d <= 3;
// Nur eigene Schlüssel zählen ("constructor", "__proto__" usw. sind keine Items/Knoten).
const has = (obj, k) => typeof k === 'string' && Object.hasOwn(obj, k);

/** Macht aus beliebigen Daten einen gültigen Spielstand (oder null, wenn nichts zu retten ist). */
export function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = newProgress();
  if (has(NODES, raw.saveNode) && NODES[raw.saveNode].save) p.saveNode = raw.saveNode;
  if (isDir(raw.saveHeading)) p.saveHeading = raw.saveHeading;
  if (Array.isArray(raw.items)) p.items = [...new Set(raw.items.filter((i) => has(ITEMS, i)))];
  if (Array.isArray(raw.visited)) {
    p.visited = [...new Set([START_NODE, ...raw.visited.filter((n) => has(NODES, n))])];
  }
  if (!p.visited.includes(p.saveNode)) p.visited.push(p.saveNode);
  if (Array.isArray(raw.knownEdges)) p.knownEdges = [...new Set(raw.knownEdges.filter((e) => has(EDGE_BY_ID, e)))];
  if (has(CHARACTERS, raw.character)) {
    const unlock = CHARACTERS[raw.character].unlock;
    if (!unlock || p.items.includes(unlock)) p.character = raw.character;
  }
  for (const k of ['score', 'playTime', 'deaths']) {
    if (Number.isFinite(raw[k]) && raw[k] >= 0) p[k] = raw[k];
  }
  p.finished = raw.finished === true;
  return p;
}

export function loadProgress(storage) {
  try {
    const txt = storage.getItem(SAVE_KEY);
    if (!txt) return null;
    return sanitizeProgress(JSON.parse(txt));
  } catch {
    return null;
  }
}

export function storeProgress(storage, progress) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* egal */
  }
}

export const DEFAULT_SETTINGS = { music: 0.6, sfx: 0.8, shake: true, fullscreen: false, reducedEffects: false };

export function loadSettings(storage) {
  const s = { ...DEFAULT_SETTINGS };
  try {
    const raw = JSON.parse(storage.getItem(SETTINGS_KEY) || '{}');
    if (Number.isFinite(raw.music)) s.music = Math.max(0, Math.min(1, raw.music));
    if (Number.isFinite(raw.sfx)) s.sfx = Math.max(0, Math.min(1, raw.sfx));
    if (typeof raw.shake === 'boolean') s.shake = raw.shake;
    if (typeof raw.fullscreen === 'boolean') s.fullscreen = raw.fullscreen;
    if (typeof raw.reducedEffects === 'boolean') s.reducedEffects = raw.reducedEffects;
  } catch {
    /* Standardwerte */
  }
  return s;
}

export function storeSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* egal */
  }
}

/** Speicher-Ersatz für Tests und für Umgebungen ohne localStorage. */
export class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(k) {
    return this.data.has(k) ? this.data.get(k) : null;
  }
  setItem(k, v) {
    this.data.set(k, String(v));
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
