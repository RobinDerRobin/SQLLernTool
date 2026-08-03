import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNodeSqliteEngine } from '../../../../test/helpers/nodeSqliteEngine';
import type { ClaudeChatClient } from '../../../chat/claudeChatClient';
import { TRACKS } from '../../../content/registry';
import { sqlLernenToolCourse } from '../../../content/tracks/sqlite/courses/sqlLernenTool/course';
import { createDefaultProgressState, withChallengeProgress, type ProgressState } from '../../../domain/progress/progressModel';
import type { ProgressStore } from '../../../persistence/ProgressStore';
import { createAppContext, type AppContext } from '../../context';
import type { EngineFactory } from '../../context';
import { playChallenge, selectChallenge } from '../../state/actions';
import { mountChallengeList } from './challengeList';

const c01 = sqlLernenToolCourse.challenges.find((c) => c.num === '01')!;

function testEngineFactory(): EngineFactory {
  const main = createNodeSqliteEngine();
  return { getMain: () => main, setMainFromSqlJs: () => {}, createDisposable: () => createNodeSqliteEngine(), getMainPython: () => null, ensurePythonEngine: () => Promise.reject(new Error("python engine not available in this test fixture")) };
}

function makeCtx(progress: ProgressState = createDefaultProgressState()): AppContext {
  const progressStore: ProgressStore = { load: () => progress, save: () => {} };
  const chatClient: ClaudeChatClient = { sendMessage: vi.fn().mockResolvedValue('ok') };
  const ctx = createAppContext({ progressStore, chatClient, registry: TRACKS });
  ctx.engines = testEngineFactory();
  return ctx;
}

describe('mountChallengeList', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('ul');
    document.body.append(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one row per challenge in the course', () => {
    const ctx = makeCtx();
    mountChallengeList(root, ctx);
    expect(root.querySelectorAll('.challenge-item')).toHaveLength(sqlLernenToolCourse.challenges.length);
  });

  it('marks the currently selected challenge active', () => {
    const ctx = makeCtx();
    mountChallengeList(root, ctx);
    selectChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');
    const item = root.querySelector('[data-num="01"]');
    expect(item?.classList.contains('active')).toBe(true);
  });

  it('disables the play button when the challenge has no real-code draft', () => {
    const ctx = makeCtx();
    mountChallengeList(root, ctx);
    const btn = root.querySelector('[data-play-num="01"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables the play button once a real-code draft exists', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { draftSql: c01.solution });
    const ctx = makeCtx(progress);
    mountChallengeList(root, ctx);
    const btn = root.querySelector('[data-play-num="01"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('clicking a row selects that challenge without needing a separate rebind', () => {
    const ctx = makeCtx();
    mountChallengeList(root, ctx);
    root.querySelector('[data-num="1.1"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ctx.store.getState().session.selection?.challengeNum).toBe('1.1');
  });

  it('clicking the play button plays that challenge without selecting/navigating to it', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { draftSql: c01.solution });
    const ctx = makeCtx(progress);
    mountChallengeList(root, ctx);

    root.querySelector('[data-play-num="01"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(ctx.store.getState().session.playResults['sqlite:sqlLernenTool:01']).toBe('ok');
    expect(ctx.store.getState().session.selection).toBeNull();
  });

  it('shows the play result glyph after a play', () => {
    let progress = createDefaultProgressState();
    progress = withChallengeProgress(progress, 'sqlite', 'sqlLernenTool', '01', { draftSql: c01.solution });
    const ctx = makeCtx(progress);
    mountChallengeList(root, ctx);

    playChallenge(ctx, 'sqlite', 'sqlLernenTool', '01');

    const glyph = root.querySelector('[data-num="01"] .run-result');
    expect(glyph?.classList.contains('ok')).toBe(true);
  });

  it('re-renders when the underlying challenge-list signature changes, not on unrelated state changes', () => {
    const ctx = makeCtx();
    mountChallengeList(root, ctx);
    const before = root.innerHTML;

    // An unrelated ephemeral change: opening the theme picker should not touch the list markup.
    ctx.store.update((s) => ({ ...s, session: { ...s.session, themePickerOpen: true } }));

    expect(root.innerHTML).toBe(before);
  });
});
