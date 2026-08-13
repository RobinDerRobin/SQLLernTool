import { describe, expect, it } from 'vitest';
import {
  createDefaultChallengeProgress,
  createDefaultProgressState,
  getChallengeProgress,
  getCourseSettings,
  mergeLoadedState,
  withChallengeProgress,
  withCourseSettings,
  withAppSettings,
} from './progressModel';

describe('createDefaultProgressState', () => {
  it('starts empty, versioned, with default app settings', () => {
    const state = createDefaultProgressState();
    expect(state.version).toBe(1);
    expect(state.tracks).toEqual({});
    expect(state.app).toEqual({ theme: 'default', sidebarCollapsed: false });
  });
});

describe('getChallengeProgress', () => {
  it('returns a default entry for a challenge with no saved progress, without mutating the state', () => {
    const state = createDefaultProgressState();
    const progress = getChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01');
    expect(progress).toEqual(createDefaultChallengeProgress());
    expect(state.tracks).toEqual({});
  });
});

describe('getCourseSettings', () => {
  it('returns default study mode and 3 exam tips for an unseen course', () => {
    const state = createDefaultProgressState();
    expect(getCourseSettings(state, 'sqlite', 'sqlLernenTool')).toEqual({
      mode: 'study',
      examTipsRemaining: 3,
    });
  });
});

describe('withChallengeProgress', () => {
  it('creates the nested track/course/challenge structure on first write', () => {
    const state = createDefaultProgressState();
    const next = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 1 });
    expect(getChallengeProgress(next, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(1);
  });

  it('does not mutate the input state (immutable update)', () => {
    const state = createDefaultProgressState();
    withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 1 });
    expect(state.tracks).toEqual({});
  });

  it('isolates updates to a different challenge num within the same course', () => {
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2 });
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '02', { hintsUsed: 1 });
    expect(getChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(2);
    expect(getChallengeProgress(state, 'sqlite', 'sqlLernenTool', '02').hintsUsed).toBe(1);
  });

  it('isolates updates to the same num across different courses', () => {
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'courseA', '01', { hintsUsed: 2 });
    state = withChallengeProgress(state, 'sqlite', 'courseB', '01', { hintsUsed: 1 });
    expect(getChallengeProgress(state, 'sqlite', 'courseA', '01').hintsUsed).toBe(2);
    expect(getChallengeProgress(state, 'sqlite', 'courseB', '01').hintsUsed).toBe(1);
  });

  it('isolates updates to the same course+num across different tracks', () => {
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2 });
    state = withChallengeProgress(state, 'postgres', 'sqlLernenTool', '01', { hintsUsed: 1 });
    expect(getChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(2);
    expect(getChallengeProgress(state, 'postgres', 'sqlLernenTool', '01').hintsUsed).toBe(1);
  });

  it('merges a patch onto existing progress rather than replacing it', () => {
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 1 });
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { bestStars: 2 });
    const progress = getChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.hintsUsed).toBe(1);
    expect(progress.bestStars).toBe(2);
  });
});

describe('withCourseSettings', () => {
  it('sets mode/examTipsRemaining for a course without affecting another course', () => {
    let state = createDefaultProgressState();
    state = withCourseSettings(state, 'sqlite', 'courseA', { mode: 'exam', examTipsRemaining: 1 });
    expect(getCourseSettings(state, 'sqlite', 'courseA')).toEqual({ mode: 'exam', examTipsRemaining: 1 });
    expect(getCourseSettings(state, 'sqlite', 'courseB')).toEqual({ mode: 'study', examTipsRemaining: 3 });
  });
});

describe('withAppSettings', () => {
  it('patches app-global settings like theme', () => {
    let state = createDefaultProgressState();
    state = withAppSettings(state, { theme: 'midnight-neon' });
    expect(state.app.theme).toBe('midnight-neon');
    expect(state.app.sidebarCollapsed).toBe(false);
  });

  it('has no lastChallenge by default', () => {
    expect(createDefaultProgressState().app.lastChallenge).toBeUndefined();
  });

  it('can record which challenge was last open, so the app can resume there', () => {
    let state = createDefaultProgressState();
    state = withAppSettings(state, { lastChallenge: { trackId: 'sqlite', courseId: 'sqlLernenTool', num: '02' } });
    expect(state.app.lastChallenge).toEqual({ trackId: 'sqlite', courseId: 'sqlLernenTool', num: '02' });
  });
});

describe('mergeLoadedState', () => {
  it('fills in every default field when loading an empty object', () => {
    const merged = mergeLoadedState({});
    expect(merged).toEqual(createDefaultProgressState());
  });

  it('falls back to defaults entirely for non-object input (corrupt storage)', () => {
    expect(mergeLoadedState(null)).toEqual(createDefaultProgressState());
    expect(mergeLoadedState('not json')).toEqual(createDefaultProgressState());
    expect(mergeLoadedState(42)).toEqual(createDefaultProgressState());
  });

  it('preserves a fully-populated valid state as-is', () => {
    let state = createDefaultProgressState();
    state = withChallengeProgress(state, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2, bestStars: 1 });
    state = withAppSettings(state, { theme: 'forest-terminal', sidebarCollapsed: true });
    const merged = mergeLoadedState(state);
    expect(merged).toEqual(state);
  });

  it('fills missing challenge fields with defaults while keeping present ones', () => {
    const merged = mergeLoadedState({
      version: 1,
      tracks: { sqlite: { sqlLernenTool: { challenges: { '01': { hintsUsed: 2 } } } } },
    });
    const progress = getChallengeProgress(merged, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.hintsUsed).toBe(2);
    expect(progress.bestStars).toBe(createDefaultChallengeProgress().bestStars);
    expect(progress.chatHistory).toEqual([]);
  });

  it('preserves a valid lastChallenge through a round trip', () => {
    const merged = mergeLoadedState({
      app: { theme: 'default', sidebarCollapsed: false, lastChallenge: { trackId: 'sqlite', courseId: 'sqlLernenTool', num: '05' } },
    });
    expect(merged.app.lastChallenge).toEqual({ trackId: 'sqlite', courseId: 'sqlLernenTool', num: '05' });
  });

  it('drops a malformed lastChallenge instead of throwing', () => {
    const merged = mergeLoadedState({ app: { lastChallenge: { trackId: 'sqlite' } } });
    expect(merged.app.lastChallenge).toBeUndefined();
    const mergedNonObject = mergeLoadedState({ app: { lastChallenge: 'nope' } });
    expect(mergedNonObject.app.lastChallenge).toBeUndefined();
  });

  it('drops individual malformed chat messages instead of discarding the whole history or throwing', () => {
    const merged = mergeLoadedState({
      tracks: {
        sqlite: {
          sqlLernenTool: {
            challenges: {
              '01': {
                chatHistory: [
                  { role: 'user', content: 'echte Frage' },
                  { role: 'assistant', content: 42 }, // content not a string
                  { role: 'admin', content: 'unbekannte Rolle' }, // invalid role
                  { content: 'fehlende role' }, // missing role
                  'not even an object',
                  null,
                ],
              },
            },
          },
        },
      },
    });
    const progress = getChallengeProgress(merged, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.chatHistory).toEqual([{ role: 'user', content: 'echte Frage' }]);
  });
});
