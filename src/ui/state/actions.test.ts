import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../chat/claudeChatClient';
import { sqlLernenToolCourse } from '../../content/tracks/sqlite/courses/sqlLernenTool/course';
import {
  createDefaultProgressState,
  getChallengeProgress,
  getCourseSettings,
  withChallengeProgress,
  withCourseSettings,
  type ProgressState,
} from '../../domain/progress/progressModel';
import { stripHtml } from '../../domain/text/stripHtml';
import type { ProgressStore } from '../../persistence/ProgressStore';
import { TRACKS } from '../../content/registry';
import type { EngineFactory } from '../context';
import { createAppContext, type AppContext } from '../context';
import {
  compareToSolution,
  markSolutionViewed,
  playChallenge,
  resetSchema,
  revealHint,
  runQuery,
  saveDraft,
  selectChallenge,
  sendChatMessage,
  sendPgAskMessage,
  setMode,
  setTheme,
  switchTab,
  toggleSidebar,
  toggleThemePicker,
} from './actions';

const c01 = sqlLernenToolCourse.challenges.find((c) => c.num === '01')!;
const c1_1 = sqlLernenToolCourse.challenges.find((c) => c.num === '1.1')!;

function createTestEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return {
    getMain: () => main,
    setMainFromSqlJs: () => {},
    createDisposable: () => createNodeSqliteEngine(),
    getMainPython: () => null,
    ensurePythonEngine: () => Promise.reject(new Error('python engine not available in this test fixture')),
  };
}

function makeCtx(initialProgress: ProgressState = createDefaultProgressState()) {
  const savedStates: ProgressState[] = [];
  const progressStore: ProgressStore = {
    load: () => initialProgress,
    save: (s) => {
      savedStates.push(s);
    },
  };
  const sendMessage = vi.fn().mockResolvedValue('Hier ist die Antwort.');
  const chatClient: ClaudeChatClient = { sendMessage };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = createTestEngineFactory();
  return { ctx, savedStates, sendMessage };
}

function tableNames(ctx: AppContext): string[] {
  return ctx.engines.getMain()!.getTablesInfo().map((t) => t.name);
}

describe('selectChallenge', () => {
  it('materializes a challenge\'s own setup tables when opened (never its own solution)', () => {
    const { ctx } = makeCtx();
    // '5.2' declares a `setup` (zutaten/saucen) but no prereqs — its own solution
    // (which the user is supposed to write) must NOT be auto-run.
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '5.2');
    expect(tableNames(ctx)).toEqual(expect.arrayContaining(['zutaten', 'saucen']));
  });

  it('updates the session selection', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(ctx.store.getState().session.selection).toEqual({
      trackId: 'sqlite',
      courseId: 'sqlLernenTool',
      challengeNum: '01',
    });
  });

  it("replays a prerequisite's setup+solution before opening a challenge that depends on it (the prereq-chain bug fix)", () => {
    const { ctx } = makeCtx();
    // '1.1' depends on '01' (the users table) — opened directly, without ever visiting '01' first.
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '1.1');
    expect(tableNames(ctx)).toContain('users');
  });

  it('resets the active tab to "task" when opening a challenge', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    switchTab(ctx, 'editor');
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '02');
    expect(ctx.store.getState().session.activeTab).toBe('task');
  });

  it("flushes the outgoing challenge's draft when a currentDraftValue is passed", () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '02', 'SELECT 42;');
    const progress = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.draftSql).toBe('SELECT 42;');
  });

  it('records the opened challenge as lastChallenge and persists', () => {
    const { ctx, savedStates } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(ctx.store.getState().progress.app.lastChallenge).toEqual({
      trackId: 'sqlite',
      courseId: 'sqlLernenTool',
      num: '01',
    });
    expect(savedStates.length).toBeGreaterThan(0);
  });

  it('does nothing when the engine has not loaded yet', () => {
    const { ctx } = makeCtx();
    ctx.engines = {
      getMain: () => null,
      setMainFromSqlJs: () => {},
      createDisposable: () => createNodeSqliteEngine(),
      getMainPython: () => null,
      ensurePythonEngine: () => Promise.reject(new Error('python engine not available in this test fixture')),
    };
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(ctx.store.getState().session.selection).toBeNull();
  });
});

describe('playChallenge', () => {
  it('does nothing when the challenge has no real-code draft saved', () => {
    const { ctx } = makeCtx();
    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:01']).toBeUndefined();
  });

  it("marks 'ok' and awards full stars when the saved draft passes its own validate()", () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    saveDraft(ctx, c01.solution);

    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const state = ctx.store.getState();
    expect(state.session.playResults['sqlite:sqlLernenTool:01']).toBe('ok');
    expect(getChallengeProgress(state.progress, 'sqlite', 'sqlLernenTool', '01').bestStars).toBe(3);
  });

  it("marks 'err' when the saved draft fails validation", () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    saveDraft(ctx, 'SELEKT this is not valid sql;');

    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:01']).toBe('err');
  });

  it('self-checks a challenge with a prerequisite correctly even when it was never opened first (the actual bug regression test)', () => {
    // Never call selectChallenge at all — '1.1' depends on '01', which has not run anywhere yet.
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '1.1', { draftSql: c1_1.solution });
    const { ctx } = makeCtx(progress);

    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '1.1');

    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:1.1']).toBe('ok');
  });

  it('runs on a disposable engine, never touching the main engine currently open elsewhere', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { draftSql: c01.solution });
    const { ctx } = makeCtx(progress);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '02'); // main engine replays '01' (prereq) — has 'users' only
    const mainTablesBefore = tableNames(ctx);

    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '01'); // runs on a throwaway engine

    // The main engine must be completely unaffected by the play-check.
    expect(tableNames(ctx)).toEqual(mainTablesBefore);
  });
});

describe('resetSchema', () => {
  it('clears bestStars for the whole course but leaves hintsUsed/draftSql untouched', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', {
      bestStars: 3,
      hintsUsed: 1,
      draftSql: 'my draft',
    });
    const { ctx } = makeCtx(progress);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    resetSchema(ctx);

    const after = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(after.bestStars).toBe(0);
    expect(after.hintsUsed).toBe(1);
    expect(after.draftSql).toBe('my draft');
  });

  it("re-materializes the currently open challenge's tables, including its prerequisite's, after wiping the engine", () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '1.1'); // replays '01' via prereq

    resetSchema(ctx);

    expect(tableNames(ctx)).toContain('users');
  });
});

describe('runQuery', () => {
  it('runs SQL against the main engine and awards stars on success', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const outcome = runQuery(ctx, c01.solution);
    if (outcome.kind !== 'sql') throw new Error('expected a sql outcome');

    expect(outcome.ok).toBe(true);
    expect(outcome.error).toBeNull();
    const progress = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.bestStars).toBe(3);
    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:01']).toBe('ok');
  });

  it('returns a SQL error and marks the play result "err"', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const outcome = runQuery(ctx, 'SELEKT nope;');
    if (outcome.kind !== 'sql') throw new Error('expected a sql outcome');

    expect(outcome.error).toMatch(/Zeile/);
    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:01']).toBe('err');
  });

  it('refreshes the cached tables info after running', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    runQuery(ctx, c01.solution);
    const names = ctx.store.getState().session.tablesInfo?.map((t) => t.name) ?? [];
    expect(names).toContain('users');
  });
});

describe('revealHint', () => {
  it('increments hintsUsed and sends a chat message asking for that hint level (study mode)', () => {
    const { ctx, sendMessage } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    revealHint(ctx, 0);

    const progress = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(progress.hintsUsed).toBe(1);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("grounds the chat request in the challenge's own authored hint text, not an improvised one", () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    revealHint(ctx, 0);

    const history = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory;
    const sentPrompt = history[0]?.content ?? '';
    expect(sentPrompt).toContain(stripHtml(c01.hints[0]));
    expect(sentPrompt).toContain('Der vorgesehene Tipp 1 lautet');
  });

  it('grounds each hint level in its own authored text', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    revealHint(ctx, 0);
    revealHint(ctx, 1);

    const history = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory;
    const secondPrompt = history.filter((m) => m.role === 'user')[1]?.content ?? '';
    expect(secondPrompt).toContain(stripHtml(c01.hints[1]));
    expect(secondPrompt).toContain('Der vorgesehene Tipp 2 lautet');
  });

  it('in exam mode, decrements the shared pool and still increments this challenge\'s own hintsUsed', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    setMode(ctx, 'exam');

    revealHint(ctx, 0);

    const state = ctx.store.getState();
    expect(getCourseSettings(state.progress, 'sqlite', 'sqlLernenTool').examTipsRemaining).toBe(2);
    expect(getChallengeProgress(state.progress, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(1);
  });

  it('in exam mode, refuses once the shared pool is empty', () => {
    let progress = createDefaultProgressState();
    progress = withCourseSettings(progress, 'sqlite', 'sqlLernenTool', { mode: 'exam', examTipsRemaining: 0 });
    const { ctx } = makeCtx(progress);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    revealHint(ctx, 0);

    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(0);
  });

  it('refuses to reveal a hint out of order', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    revealHint(ctx, 1); // hintsUsed is 0, so index 1 is not next

    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').hintsUsed).toBe(0);
  });
});

describe('markSolutionViewed', () => {
  it('sets solutionViewed and zeroes bestStars the first time', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { bestStars: 3 });
    const { ctx } = makeCtx(progress);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    markSolutionViewed(ctx);

    const after = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01');
    expect(after.solutionViewed).toBe(true);
    expect(after.bestStars).toBe(0);
  });

  it('is a no-op once already viewed', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    markSolutionViewed(ctx);
    const stateAfterFirst = ctx.store.getState();

    markSolutionViewed(ctx);

    expect(ctx.store.getState()).toBe(stateAfterFirst);
  });
});

describe('compareToSolution', () => {
  it('prefills the chat draft with a prompt mentioning the challenge title', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    compareToSolution(ctx);

    expect(ctx.store.getState().session.chatDraftPrefill).toContain(c01.title);
  });
});

describe('simple settings actions', () => {
  it('setMode sets the current course mode', () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    setMode(ctx, 'exam');
    expect(getCourseSettings(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool').mode).toBe('exam');
  });

  it('switchTab sets the active tab and clears chatUnread when switching to chat', () => {
    const { ctx } = makeCtx();
    ctx.store.update((s) => ({ ...s, session: { ...s.session, chatUnread: true } }));
    switchTab(ctx, 'chat');
    expect(ctx.store.getState().session.activeTab).toBe('chat');
    expect(ctx.store.getState().session.chatUnread).toBe(false);
  });

  it('toggleSidebar flips sidebarCollapsed', () => {
    const { ctx } = makeCtx();
    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(false);
    toggleSidebar(ctx);
    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(true);
    toggleSidebar(ctx);
    expect(ctx.store.getState().progress.app.sidebarCollapsed).toBe(false);
  });

  it('setTheme sets the app theme', () => {
    const { ctx } = makeCtx();
    setTheme(ctx, 'midnight-neon');
    expect(ctx.store.getState().progress.app.theme).toBe('midnight-neon');
  });

  it('toggleThemePicker opens/closes the theme picker (ephemeral, not persisted)', () => {
    const { ctx, savedStates } = makeCtx();
    toggleThemePicker(ctx, true);
    expect(ctx.store.getState().session.themePickerOpen).toBe(true);
    toggleThemePicker(ctx, false);
    expect(ctx.store.getState().session.themePickerOpen).toBe(false);
    expect(savedStates).toHaveLength(0);
  });
});

describe('sendChatMessage', () => {
  it('appends the user message immediately, then the assistant reply once it resolves', async () => {
    const { ctx, sendMessage } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    await sendChatMessage(ctx, 'Wie geht das?');

    const history = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory;
    expect(history).toEqual([
      { role: 'user', content: 'Wie geht das?' },
      { role: 'assistant', content: 'Hier ist die Antwort.' },
    ]);
    const params = sendMessage.mock.calls[0]![0];
    expect(params.system).toContain(c01.title);
    expect(params.userText).toContain('Wie geht das?');
  });

  it('sets chatUnread when the reply arrives while a different tab is active', async () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    switchTab(ctx, 'editor');

    await sendChatMessage(ctx, 'Hallo');

    expect(ctx.store.getState().session.chatUnread).toBe(true);
  });

  it('does not set chatUnread when already viewing the chat tab', async () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    switchTab(ctx, 'chat');

    await sendChatMessage(ctx, 'Hallo');

    expect(ctx.store.getState().session.chatUnread).toBe(false);
  });

  it('stores a German error message in chat history when the API call rejects', async () => {
    const { ctx } = makeCtx();
    ctx.chatClient.sendMessage = vi.fn().mockRejectedValue(new Error('network down'));
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    await sendChatMessage(ctx, 'Hallo');

    const history = getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory;
    expect(history.at(-1)?.role).toBe('assistant');
    expect(history.at(-1)?.content).toContain('Fehler');
  });

  it('does nothing for blank input', async () => {
    const { ctx, sendMessage } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    await sendChatMessage(ctx, '   ');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('sendPgAskMessage', () => {
  it('returns the answer text without touching the shared chat history', async () => {
    const { ctx } = makeCtx();
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const answer = await sendPgAskMessage(ctx, 'Warum ist das in Postgres anders?');

    expect(answer).toBe('Hier ist die Antwort.');
    expect(getChallengeProgress(ctx.store.getState().progress, 'sqlite', 'sqlLernenTool', '01').chatHistory).toEqual([]);
  });
});
