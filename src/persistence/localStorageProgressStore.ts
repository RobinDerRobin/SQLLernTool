import { createDefaultProgressState, mergeLoadedState, type ProgressState } from '../domain/progress/progressModel';
import type { ProgressStore } from './ProgressStore';

const STORAGE_KEY = 'sqlLernenTool:progress:v1';

/**
 * Replaces the prototype's claude.ai-only `window.storage` with plain
 * browser localStorage. Defensive on load: missing key, corrupted JSON, or a
 * malformed/partial shape all fall back to `createDefaultProgressState()`
 * rather than throwing (see progressModel.mergeLoadedState).
 */
export function createLocalStorageProgressStore(storage: Storage = window.localStorage): ProgressStore {
  function load(): ProgressState {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgressState();
    try {
      return mergeLoadedState(JSON.parse(raw));
    } catch {
      return createDefaultProgressState();
    }
  }

  function save(state: ProgressState): void {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Best-effort: e.g. storage full or unavailable — losing progress
      // persistence should never crash the app.
    }
  }

  return { load, save };
}
