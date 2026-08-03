import { makeProgressKey } from '../../domain/progress/progressKey';
import {
  getChallengeProgress,
  getCourseSettings,
  type ChallengeProgress,
  type CourseSettings,
  type ProgressState,
} from '../../domain/progress/progressModel';
import { createDefaultSessionState, type SessionState } from './sessionState';

export interface AppState {
  progress: ProgressState;
  session: SessionState;
}

export function createDefaultAppState(progress: ProgressState): AppState {
  return { progress, session: createDefaultSessionState() };
}

export function selectChallengeProgress(state: AppState): ChallengeProgress | null {
  const { selection } = state.session;
  if (!selection) return null;
  return getChallengeProgress(state.progress, selection.trackId, selection.courseId, selection.challengeNum);
}

export function selectCourseSettings(state: AppState): CourseSettings | null {
  const { selection } = state.session;
  if (!selection) return null;
  return getCourseSettings(state.progress, selection.trackId, selection.courseId);
}

export function selectProgressKey(state: AppState): string | null {
  const { selection } = state.session;
  if (!selection) return null;
  return makeProgressKey(selection.trackId, selection.courseId, selection.challengeNum);
}
