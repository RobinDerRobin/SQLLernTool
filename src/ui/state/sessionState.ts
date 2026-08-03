import type { TableInfo } from '../../runtime/sql/SqlEngine';

export interface ChallengeSelection {
  trackId: string;
  courseId: string;
  challengeNum: string;
}

export type ActiveTab = 'task' | 'tutorial' | 'editor' | 'chat';
export type InitStatus = 'loading' | 'ready' | { error: string };
export type PlayResult = 'ok' | 'err';
/** Pyodide loads lazily (only once a Python-track challenge is opened), unlike sql.js which loads at boot. */
export type PythonEngineStatus = 'idle' | 'loading' | 'ready' | { error: string };

/**
 * Ephemeral, never-persisted UI state that a *second* module needs to read,
 * or that must survive its own view never being unmounted (all tab regions
 * stay mounted; only their visibility toggles — see the plan's Q1/Q7
 * reasoning). Everything else (panel-open booleans, etc.) stays local state
 * inside the one view module that owns it, not here.
 */
export interface SessionState {
  /** null until boot resolves which challenge to open. */
  selection: ChallengeSelection | null;
  activeTab: ActiveTab;
  initStatus: InitStatus;
  /** Sidebar play-button results, keyed by progress key (trackId:courseId:num). */
  playResults: Record<string, PlayResult>;
  chatUnread: boolean;
  tablesInfo: TableInfo[] | null;
  /** Names of tables materialized by the current challenge's own prereq/setup chain — marked "vorgegeben" in the tables inspector, distinct from tables the user's solution goes on to create. */
  givenTableNames: string[];
  /** compareView -> chatTab handoff: text to prefill the chat input with. */
  chatDraftPrefill: string | null;
  /** Crosses a module boundary: the trigger button lives in sidebarShell, the panel in themePicker. */
  themePickerOpen: boolean;
  pythonStatus: PythonEngineStatus;
}

export function createDefaultSessionState(): SessionState {
  return {
    selection: null,
    activeTab: 'task',
    initStatus: 'loading',
    playResults: {},
    chatUnread: false,
    tablesInfo: null,
    givenTableNames: [],
    chatDraftPrefill: null,
    themePickerOpen: false,
    pythonStatus: 'idle',
  };
}

export function withSelection(state: SessionState, selection: ChallengeSelection): SessionState {
  return { ...state, selection };
}

export function withActiveTab(state: SessionState, activeTab: ActiveTab): SessionState {
  return { ...state, activeTab };
}

export function withInitStatus(state: SessionState, initStatus: InitStatus): SessionState {
  return { ...state, initStatus };
}

export function withPlayResult(state: SessionState, progressKey: string, result: PlayResult): SessionState {
  return { ...state, playResults: { ...state.playResults, [progressKey]: result } };
}

export function withChatUnread(state: SessionState, chatUnread: boolean): SessionState {
  return { ...state, chatUnread };
}

export function withTablesInfo(state: SessionState, tablesInfo: TableInfo[] | null): SessionState {
  return { ...state, tablesInfo };
}

export function withGivenTableNames(state: SessionState, givenTableNames: string[]): SessionState {
  return { ...state, givenTableNames };
}

export function withChatDraftPrefill(state: SessionState, chatDraftPrefill: string | null): SessionState {
  return { ...state, chatDraftPrefill };
}

export function withThemePickerOpen(state: SessionState, themePickerOpen: boolean): SessionState {
  return { ...state, themePickerOpen };
}

export function withPythonStatus(state: SessionState, pythonStatus: PythonEngineStatus): SessionState {
  return { ...state, pythonStatus };
}
