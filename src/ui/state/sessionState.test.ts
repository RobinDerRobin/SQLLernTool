import { describe, expect, it } from 'vitest';
import {
  createDefaultSessionState,
  withActiveTab,
  withChatDraftPrefill,
  withChatUnread,
  withInitStatus,
  withPlayResult,
  withSelection,
  withTablesInfo,
  withThemePickerOpen,
} from './sessionState';

describe('createDefaultSessionState', () => {
  it('starts with no selection, loading, and empty ephemeral state', () => {
    const state = createDefaultSessionState();
    expect(state).toEqual({
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
    });
  });
});

describe('withThemePickerOpen', () => {
  it('opens and closes the theme picker immutably', () => {
    const state = createDefaultSessionState();
    const opened = withThemePickerOpen(state, true);
    expect(opened.themePickerOpen).toBe(true);
    expect(state.themePickerOpen).toBe(false);
    expect(withThemePickerOpen(opened, false).themePickerOpen).toBe(false);
  });
});

describe('withSelection', () => {
  it('sets the current track/course/challenge selection immutably', () => {
    const state = createDefaultSessionState();
    const next = withSelection(state, { trackId: 'sqlite', courseId: 'sqlLernenTool', challengeNum: '01' });
    expect(next.selection).toEqual({ trackId: 'sqlite', courseId: 'sqlLernenTool', challengeNum: '01' });
    expect(state.selection).toBeNull();
  });
});

describe('withActiveTab', () => {
  it('switches the active tab immutably', () => {
    const state = createDefaultSessionState();
    const next = withActiveTab(state, 'editor');
    expect(next.activeTab).toBe('editor');
    expect(state.activeTab).toBe('task');
  });
});

describe('withInitStatus', () => {
  it('transitions loading -> ready', () => {
    const next = withInitStatus(createDefaultSessionState(), 'ready');
    expect(next.initStatus).toBe('ready');
  });

  it('transitions loading -> an error state', () => {
    const next = withInitStatus(createDefaultSessionState(), { error: 'boom' });
    expect(next.initStatus).toEqual({ error: 'boom' });
  });
});

describe('withPlayResult', () => {
  it('records a play result for one challenge key without affecting others', () => {
    let state = createDefaultSessionState();
    state = withPlayResult(state, 'sqlite:sqlLernenTool:01', 'ok');
    state = withPlayResult(state, 'sqlite:sqlLernenTool:02', 'err');
    expect(state.playResults).toEqual({
      'sqlite:sqlLernenTool:01': 'ok',
      'sqlite:sqlLernenTool:02': 'err',
    });
  });

  it('does not mutate the input state', () => {
    const state = createDefaultSessionState();
    withPlayResult(state, 'sqlite:sqlLernenTool:01', 'ok');
    expect(state.playResults).toEqual({});
  });
});

describe('withChatUnread', () => {
  it('sets the chat-unread flag immutably', () => {
    const next = withChatUnread(createDefaultSessionState(), true);
    expect(next.chatUnread).toBe(true);
  });
});

describe('withTablesInfo', () => {
  it('sets the cached tables info immutably', () => {
    const info = [{ name: 't', columns: [{ name: 'id', type: 'INTEGER' }], rowCount: 0 }];
    const next = withTablesInfo(createDefaultSessionState(), info);
    expect(next.tablesInfo).toBe(info);
  });

  it('can be cleared back to null', () => {
    const withInfo = withTablesInfo(createDefaultSessionState(), []);
    const cleared = withTablesInfo(withInfo, null);
    expect(cleared.tablesInfo).toBeNull();
  });
});

describe('withChatDraftPrefill', () => {
  it('sets and clears the cross-module chat prefill handoff', () => {
    const withDraft = withChatDraftPrefill(createDefaultSessionState(), 'compare this');
    expect(withDraft.chatDraftPrefill).toBe('compare this');
    const cleared = withChatDraftPrefill(withDraft, null);
    expect(cleared.chatDraftPrefill).toBeNull();
  });
});
