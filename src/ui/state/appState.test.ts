import { describe, expect, it } from 'vitest';
import { createDefaultProgressState, withChallengeProgress, withCourseSettings } from '../../domain/progress/progressModel';
import { createDefaultAppState, selectChallengeProgress, selectCourseSettings, selectProgressKey } from './appState';
import { withSelection } from './sessionState';

describe('createDefaultAppState', () => {
  it('combines the given progress state with a fresh default session', () => {
    const progress = createDefaultProgressState();
    const state = createDefaultAppState(progress);
    expect(state.progress).toBe(progress);
    expect(state.session.selection).toBeNull();
  });
});

describe('selectChallengeProgress', () => {
  it('returns null when nothing is selected yet', () => {
    const state = createDefaultAppState(createDefaultProgressState());
    expect(selectChallengeProgress(state)).toBeNull();
  });

  it('returns the progress for the currently selected challenge', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { hintsUsed: 2 });
    let state = createDefaultAppState(progress);
    state = { ...state, session: withSelection(state.session, { trackId: 'sqlite', courseId: 'sqlLernenTool', challengeNum: '01' }) };

    expect(selectChallengeProgress(state)?.hintsUsed).toBe(2);
  });
});

describe('selectCourseSettings', () => {
  it('returns null when nothing is selected yet', () => {
    const state = createDefaultAppState(createDefaultProgressState());
    expect(selectCourseSettings(state)).toBeNull();
  });

  it('returns the mode/examTipsRemaining for the currently selected course', () => {
    let progress = createDefaultProgressState();
    progress = withCourseSettings(progress, 'sqlite', 'sqlLernenTool', { mode: 'exam', examTipsRemaining: 1 });
    let state = createDefaultAppState(progress);
    state = { ...state, session: withSelection(state.session, { trackId: 'sqlite', courseId: 'sqlLernenTool', challengeNum: '01' }) };

    expect(selectCourseSettings(state)).toEqual({ mode: 'exam', examTipsRemaining: 1 });
  });
});

describe('selectProgressKey', () => {
  it('returns null when nothing is selected yet', () => {
    const state = createDefaultAppState(createDefaultProgressState());
    expect(selectProgressKey(state)).toBeNull();
  });

  it('returns the canonical progress key for the current selection', () => {
    let state = createDefaultAppState(createDefaultProgressState());
    state = { ...state, session: withSelection(state.session, { trackId: 'sqlite', courseId: 'sqlLernenTool', challengeNum: '01' }) };
    expect(selectProgressKey(state)).toBe('sqlite:sqlLernenTool:01');
  });
});
