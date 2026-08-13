export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChallengeProgress {
  hintsUsed: number;
  bestStars: number;
  solutionViewed: boolean;
  draftSql: string;
  chatHistory: ChatMessage[];
}

export interface CourseSettings {
  mode: 'study' | 'exam';
  examTipsRemaining: number;
}

interface CourseProgress extends CourseSettings {
  challenges: Record<string, ChallengeProgress>;
}

interface ChallengeRef {
  trackId: string;
  courseId: string;
  num: string;
}

export interface AppSettings {
  theme: string;
  sidebarCollapsed: boolean;
  /** So the app can resume where the user left off across page loads. */
  lastChallenge?: ChallengeRef;
}

export interface ProgressState {
  version: 1;
  tracks: Record<string, Record<string, CourseProgress>>;
  app: AppSettings;
}

const DEFAULT_MODE: CourseSettings['mode'] = 'study';
const DEFAULT_EXAM_TIPS = 3;

export function createDefaultChallengeProgress(): ChallengeProgress {
  return { hintsUsed: 0, bestStars: 0, solutionViewed: false, draftSql: '', chatHistory: [] };
}

function createDefaultCourseSettings(): CourseSettings {
  return { mode: DEFAULT_MODE, examTipsRemaining: DEFAULT_EXAM_TIPS };
}

function createDefaultCourseProgress(): CourseProgress {
  return { ...createDefaultCourseSettings(), challenges: {} };
}

function createDefaultAppSettings(): AppSettings {
  return { theme: 'default', sidebarCollapsed: false };
}

export function createDefaultProgressState(): ProgressState {
  return { version: 1, tracks: {}, app: createDefaultAppSettings() };
}

export function getChallengeProgress(
  state: ProgressState,
  trackId: string,
  courseId: string,
  num: string,
): ChallengeProgress {
  const existing = state.tracks[trackId]?.[courseId]?.challenges[num];
  return existing ? { ...existing } : createDefaultChallengeProgress();
}

export function getCourseSettings(state: ProgressState, trackId: string, courseId: string): CourseSettings {
  const course = state.tracks[trackId]?.[courseId];
  return course ? { mode: course.mode, examTipsRemaining: course.examTipsRemaining } : createDefaultCourseSettings();
}

function getOrCreateCourseProgress(state: ProgressState, trackId: string, courseId: string): CourseProgress {
  return state.tracks[trackId]?.[courseId] ?? createDefaultCourseProgress();
}

export function withChallengeProgress(
  state: ProgressState,
  trackId: string,
  courseId: string,
  num: string,
  patch: Partial<ChallengeProgress>,
): ProgressState {
  const course = getOrCreateCourseProgress(state, trackId, courseId);
  const currentChallenge = course.challenges[num] ?? createDefaultChallengeProgress();
  const nextChallenge: ChallengeProgress = { ...currentChallenge, ...patch };
  const nextCourse: CourseProgress = {
    ...course,
    challenges: { ...course.challenges, [num]: nextChallenge },
  };
  return {
    ...state,
    tracks: {
      ...state.tracks,
      [trackId]: {
        ...state.tracks[trackId],
        [courseId]: nextCourse,
      },
    },
  };
}

export function withCourseSettings(
  state: ProgressState,
  trackId: string,
  courseId: string,
  patch: Partial<CourseSettings>,
): ProgressState {
  const course = getOrCreateCourseProgress(state, trackId, courseId);
  const nextCourse: CourseProgress = { ...course, ...patch };
  return {
    ...state,
    tracks: {
      ...state.tracks,
      [trackId]: {
        ...state.tracks[trackId],
        [courseId]: nextCourse,
      },
    },
  };
}

export function withAppSettings(state: ProgressState, patch: Partial<AppSettings>): ProgressState {
  return { ...state, app: { ...state.app, ...patch } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value) && (value.role === 'user' || value.role === 'assistant') && typeof value.content === 'string';
}

/** Drops individual malformed entries rather than discarding the whole history — one corrupted message shouldn't erase an otherwise-intact chat thread. */
function mergeChatHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isChatMessage);
}

function mergeChallengeProgress(raw: unknown): ChallengeProgress {
  const defaults = createDefaultChallengeProgress();
  if (!isRecord(raw)) return defaults;
  return {
    hintsUsed: typeof raw.hintsUsed === 'number' ? raw.hintsUsed : defaults.hintsUsed,
    bestStars: typeof raw.bestStars === 'number' ? raw.bestStars : defaults.bestStars,
    solutionViewed: typeof raw.solutionViewed === 'boolean' ? raw.solutionViewed : defaults.solutionViewed,
    draftSql: typeof raw.draftSql === 'string' ? raw.draftSql : defaults.draftSql,
    chatHistory: Array.isArray(raw.chatHistory) ? mergeChatHistory(raw.chatHistory) : defaults.chatHistory,
  };
}

function mergeChallengeRef(raw: unknown): ChallengeRef | undefined {
  if (!isRecord(raw)) return undefined;
  if (typeof raw.trackId !== 'string' || typeof raw.courseId !== 'string' || typeof raw.num !== 'string') {
    return undefined;
  }
  return { trackId: raw.trackId, courseId: raw.courseId, num: raw.num };
}

function mergeCourseProgress(raw: unknown): CourseProgress {
  const defaults = createDefaultCourseProgress();
  if (!isRecord(raw)) return defaults;
  const challenges: Record<string, ChallengeProgress> = {};
  if (isRecord(raw.challenges)) {
    for (const [num, value] of Object.entries(raw.challenges)) {
      challenges[num] = mergeChallengeProgress(value);
    }
  }
  return {
    mode: raw.mode === 'exam' ? 'exam' : defaults.mode,
    examTipsRemaining: typeof raw.examTipsRemaining === 'number' ? raw.examTipsRemaining : defaults.examTipsRemaining,
    challenges,
  };
}

/**
 * Defensive load-time parser: any missing/malformed field falls back to its
 * default rather than throwing, so a future format change or corrupted
 * localStorage value degrades gracefully instead of breaking the app.
 */
export function mergeLoadedState(raw: unknown): ProgressState {
  const defaults = createDefaultProgressState();
  if (!isRecord(raw)) return defaults;

  const tracks: ProgressState['tracks'] = {};
  if (isRecord(raw.tracks)) {
    for (const [trackId, coursesRaw] of Object.entries(raw.tracks)) {
      if (!isRecord(coursesRaw)) continue;
      const courses: Record<string, CourseProgress> = {};
      for (const [courseId, courseRaw] of Object.entries(coursesRaw)) {
        courses[courseId] = mergeCourseProgress(courseRaw);
      }
      tracks[trackId] = courses;
    }
  }

  const app: AppSettings = isRecord(raw.app)
    ? {
        theme: typeof raw.app.theme === 'string' ? raw.app.theme : defaults.app.theme,
        sidebarCollapsed:
          typeof raw.app.sidebarCollapsed === 'boolean' ? raw.app.sidebarCollapsed : defaults.app.sidebarCollapsed,
        lastChallenge: mergeChallengeRef(raw.app.lastChallenge),
      }
    : defaults.app;

  return { version: 1, tracks, app };
}
