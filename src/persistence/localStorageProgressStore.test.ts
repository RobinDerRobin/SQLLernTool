import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProgressState, withAppSettings, withChallengeProgress } from '../domain/progress/progressModel';
import { createLocalStorageProgressStore } from './localStorageProgressStore';

describe('createLocalStorageProgressStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('load() returns the default state when nothing has been saved yet', () => {
    const store = createLocalStorageProgressStore();
    expect(store.load()).toEqual(createDefaultProgressState());
  });

  it('round-trips a populated state through save() and load()', () => {
    const store = createLocalStorageProgressStore();
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2, bestStars: 1 });
    state = withAppSettings(state, { theme: 'ocean-depth', sidebarCollapsed: true });

    store.save(state);

    expect(store.load()).toEqual(state);
  });

  it('isolates progress for different courses/tracks across a round trip', () => {
    const store = createLocalStorageProgressStore();
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'courseA', '01', { hintsUsed: 1 });
    state = withChallengeProgress(state, 'sqlite', 'courseB', '01', { hintsUsed: 3 });
    store.save(state);

    const loaded = store.load();
    expect(loaded.tracks.sqlite?.courseA?.challenges['01']?.hintsUsed).toBe(1);
    expect(loaded.tracks.sqlite?.courseB?.challenges['01']?.hintsUsed).toBe(3);
  });

  it('falls back to defaults when the stored value is corrupted JSON', () => {
    window.localStorage.setItem('sqlLernenTool:progress:v1', '{not valid json');
    const store = createLocalStorageProgressStore();
    expect(store.load()).toEqual(createDefaultProgressState());
  });

  it('two independently created stores see the same persisted data (same storage key)', () => {
    const storeA = createLocalStorageProgressStore();
    const storeB = createLocalStorageProgressStore();
    const state = withChallengeProgress(createDefaultProgressState(), 'sqlite', 'sqlLernenTool', '02', {
      solutionViewed: true,
    });
    storeA.save(state);
    expect(storeB.load()).toEqual(state);
  });
});
